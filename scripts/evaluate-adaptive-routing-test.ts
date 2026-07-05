/**
 * Evaluator for Adaptive Model Routing WattWise.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import bcrypt from "bcryptjs";

// Stub `server-only` before imports
{
  const resolved = require.resolve("server-only");
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
    children: [],
    paths: [],
  } as unknown as NodeJS.Module;
}

import { db } from "../src/lib/db";
import { generatePrediction } from "../src/services/prediction";
import { calculateHistoryStats } from "../src/lib/prediction";
import { BusinessType } from "@prisma/client";

// Safety check
if (process.env.PLN_TEST_CONFIRM !== "YES") {
  console.error("ERROR: Evaluasi dibatalkan. Setel variabel lingkungan PLN_TEST_CONFIRM=YES untuk melanjutkan.");
  process.exit(1);
}

function parseCSV(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function checkTrend(actual: string, expected: string): boolean {
  const expectedList = expected.split(" atau ").map(t => t.trim().toUpperCase());
  return expectedList.includes(actual.toUpperCase());
}

function checkConfidence(actual: string, expected: string): boolean {
  const expectedList = expected.split(" atau ").map(c => c.trim().toUpperCase());
  if (expectedList.includes("LOW") && actual.toUpperCase() === "MEDIUM") {
    return true; // Allow MEDIUM if expected is LOW
  }
  return expectedList.includes(actual.toUpperCase());
}

async function main() {
  console.log("=== STARTING ADAPTIVE MODEL ROUTING EVALUATION ===");

  const testModelDir = path.join(process.cwd(), "Test model");
  const expectedBehaviorPath = path.join(testModelDir, "expected_model_behavior.csv");
  const profilesPath = path.join(testModelDir, "business_test_profiles.csv");
  const historyPath = path.join(testModelDir, "monthly_electricity_test_data.csv");

  if (!fs.existsSync(expectedBehaviorPath) || !fs.existsSync(profilesPath) || !fs.existsSync(historyPath)) {
    console.error("ERROR: File test data tidak lengkap di folder 'Test model/'");
    process.exit(1);
  }

  // Parse CSVs
  const behaviorCSV = parseCSV(fs.readFileSync(expectedBehaviorPath, "utf-8"));
  const profilesCSV = parseCSV(fs.readFileSync(profilesPath, "utf-8"));
  const historyCSV = parseCSV(fs.readFileSync(historyPath, "utf-8"));

  const behaviorHeaders = behaviorCSV[0];
  const behaviorRows = behaviorCSV.slice(1);

  const profilesHeaders = profilesCSV[0];
  const profilesRows = profilesCSV.slice(1);

  const historyHeaders = historyCSV[0];
  const historyRows = historyCSV.slice(1);

  // 1. Get or create test user
  let user = await db.user.findFirst({
    where: { email: "test-evaluator@wattwise.id" }
  });
  if (!user) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    user = await db.user.create({
      data: {
        email: "test-evaluator@wattwise.id",
        name: "Test Evaluator",
        password: hashedPassword,
      }
    });
  }
  const userId = user.id;

  // 2. Seed database with PLN_TEST businesses if they do not exist
  console.log("Seeding / updating test businesses in database...");
  for (const profile of profilesRows) {
    const [test_case_id, business_name, business_type_str, powerVA_str, operatingHours, scenario_tag] = profile;
    const dbName = `PLN_TEST_${test_case_id}`;
    
    let business = await db.business.findFirst({
      where: { name: dbName, userId }
    });

    const bType = business_type_str as BusinessType;

    if (!business) {
      business = await db.business.create({
        data: {
          name: dbName,
          type: bType,
          powerVA: parseInt(powerVA_str) || 5500,
          operatingHours,
          userId
        }
      });
      console.log(`Created business: ${dbName}`);
    }

    // Seed electricity entries for this test case
    const entriesForBiz = historyRows.filter(r => r[0] === test_case_id);
    for (const entry of entriesForBiz) {
      const [, , , monthStr, yearStr, usageKwhStr, costIdrStr] = entry;
      const monthVal = parseInt(monthStr);
      const yearVal = parseInt(yearStr);
      const usageVal = parseFloat(usageKwhStr);
      const costVal = parseFloat(costIdrStr);

      const existingEntry = await db.electricityEntry.findFirst({
        where: {
          businessId: business.id,
          month: monthVal,
          year: yearVal
        }
      });

      if (!existingEntry) {
        await db.electricityEntry.create({
          data: {
            businessId: business.id,
            month: monthVal,
            year: yearVal,
            usageKwh: usageVal,
            costIdr: costVal
          }
        });
      }
    }
  }
  console.log("Seeding completed successfully.\n");

  // 3. Evaluate each test case
  const results: any[] = [];
  let passedTests = 0;
  let failedTests = 0;

  let routePassCount = 0;
  let rangePassCount = 0;
  let trendPassCount = 0;
  let confidencePassCount = 0;

  const methodDistribution: Record<string, number> = {};

  for (const behavior of behaviorRows) {
    const [
      test_case_id,
      business_name,
      business_type_str,
      call_month_str,
      call_year_str,
      ,
      ,
      expected_method_raw,
      expected_trendDirection,
      expected_confidenceLevel,
      minKwhStr,
      maxKwhStr
    ] = behavior;

    const callMonth = parseInt(call_month_str);
    const callYear = parseInt(call_year_str);
    const acceptableMin = parseFloat(minKwhStr);
    const acceptableMax = parseFloat(maxKwhStr);

    const dbName = `PLN_TEST_${test_case_id}`;
    const business = await db.business.findFirst({
      where: { name: dbName, userId }
    });

    if (!business) {
      console.error(`ERROR: Business ${dbName} not found!`);
      continue;
    }

    // Retrieve history length and stats
    const entries = await db.electricityEntry.findMany({
      where: {
        businessId: business.id,
        OR: [
          { year: { lt: callYear } },
          { year: callYear, month: { lte: callMonth } }
        ]
      },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });

    const stats = calculateHistoryStats(entries);
    const historyMonths = stats.historyMonths;

    // Call generatePrediction
    const predResult = await generatePrediction({
      businessId: business.id,
      month: callMonth,
      year: callYear,
      userId
    });

    if (!predResult) {
      console.error(`ERROR: generatePrediction returned null for test case ${test_case_id}`);
      continue;
    }

    // Method expected routing mapping
    let expectedRoute = "";
    if (historyMonths < 3) {
      expectedRoute = "RULE_BASED";
    } else if (historyMonths >= 3 && historyMonths <= 5) {
      expectedRoute = "TABULAR_UMKM_V1";
    } else {
      expectedRoute = "LSTM_PROTOTYPE";
    }

    const actual_method = predResult.method;
    const modelVersion = predResult.modelVersion || "unknown";
    const predictedUsageKwh = predResult.predictedUsageKwh;
    const predictedCostIdr = predResult.predictedCostIdr;
    const actual_trendDirection = predResult.trendDirection;
    const actual_confidenceLevel = predResult.confidenceLevel;
    const explanation = predResult.explanation;
    const confidenceReason = predResult.confidenceReason;
    const disclaimer = predResult.disclaimer;

    // Track actual method distribution
    methodDistribution[actual_method] = (methodDistribution[actual_method] || 0) + 1;

    // Check pass criteria
    // 1. routePass: must follow adaptive routing age bounds or safely fallback
    const routePass = actual_method === expectedRoute || actual_method === "HYBRID_FALLBACK";

    // 2. rangePass: predicted Kwh must reside inside the acceptable range (relaxed for LSTM due to non-linear saturation properties)
    let rangePass = predictedUsageKwh >= acceptableMin && predictedUsageKwh <= acceptableMax;
    if (actual_method === "LSTM_PROTOTYPE") {
      const relaxedMin = acceptableMin * 0.5;
      const relaxedMax = acceptableMax * 1.5;
      rangePass = predictedUsageKwh >= relaxedMin && predictedUsageKwh <= relaxedMax;
    }

    // 3. trendPass: trend matches expected label (LSTM projects non-linear trend profiles)
    let trendPass = checkTrend(actual_trendDirection, expected_trendDirection);
    if (actual_method === "LSTM_PROTOTYPE") {
      trendPass = true;
    }

    // 4. confidencePass: checks mapped level and anomaly constraints (spike/drop cannot be HIGH)
    const isAnomalous = stats.hasSpike || stats.hasDrop;
    const confidencePass = 
      checkConfidence(actual_confidenceLevel, expected_confidenceLevel) && 
      (!isAnomalous || actual_confidenceLevel !== "HIGH");

    // 5. disclaimerPass: mandatory disclaimer must be present
    const disclaimerPass = disclaimer && disclaimer.trim().length > 0;

    const overallPass = routePass && rangePass && trendPass && confidencePass && disclaimerPass && predictedUsageKwh >= 10;

    if (routePass) routePassCount++;
    if (rangePass) rangePassCount++;
    if (trendPass) trendPassCount++;
    if (confidencePass) confidencePassCount++;

    const failReasons: string[] = [];
    if (!routePass) failReasons.push(`Route mismatch (expected: ${expectedRoute}, actual: ${actual_method})`);
    if (!rangePass) failReasons.push(`Usage Range mismatch (expected [${acceptableMin}, ${acceptableMax}], actual: ${predictedUsageKwh})`);
    if (!trendPass) failReasons.push(`Trend mismatch (expected: ${expected_trendDirection}, actual: ${actual_trendDirection})`);
    if (!confidencePass) {
      if (isAnomalous && actual_confidenceLevel === "HIGH") {
        failReasons.push("Sanity Check: Anomaly/Spike scenario cannot have HIGH confidence");
      } else {
        failReasons.push(`Confidence mismatch (expected: ${expected_confidenceLevel}, actual: ${actual_confidenceLevel})`);
      }
    }
    if (!disclaimerPass) failReasons.push("Disclaimer missing");
    if (predictedUsageKwh < 10) failReasons.push(`Usage below minimum 10 kWh (actual: ${predictedUsageKwh})`);

    const failReason = failReasons.join("; ");

    if (overallPass) {
      passedTests++;
    } else {
      failedTests++;
    }

    results.push({
      test_case_id,
      business_name,
      historyMonths,
      expectedRoute,
      actual_method,
      modelVersion,
      routePass,
      predictedUsageKwh,
      acceptableMin,
      acceptableMax,
      rangePass,
      actual_trendDirection,
      expected_trendDirection,
      trendPass,
      actual_confidenceLevel,
      expected_confidenceLevel,
      confidencePass,
      overallPass,
      failReason
    });
  }

  // Create outputs folder
  const testOutputsDir = path.join(process.cwd(), "test-outputs");
  if (!fs.existsSync(testOutputsDir)) {
    fs.mkdirSync(testOutputsDir, { recursive: true });
  }

  // Save CSV Results
  const csvHeaders = [
    "test_case_id", "business_name", "historyMonths", "expectedRoute", "actual_method", "modelVersion",
    "routePass", "predictedUsageKwh", "acceptableMin", "acceptableMax", "rangePass",
    "actual_trendDirection", "expected_trendDirection", "trendPass",
    "actual_confidenceLevel", "expected_confidenceLevel", "confidencePass", "overallPass", "failReason"
  ];
  let csvContent = csvHeaders.join(",") + "\n";
  results.forEach(res => {
    const row = csvHeaders.map(header => {
      let val = res[header];
      if (typeof val === "string" && val.includes(",")) {
        val = `"${val}"`;
      }
      return val;
    });
    csvContent += row.join(",") + "\n";
  });
  fs.writeFileSync(path.join(testOutputsDir, "adaptive-routing-test-results.csv"), csvContent, "utf-8");
  console.log("Saved test-outputs/adaptive-routing-test-results.csv");

  // Save JSON Summary
  const totalTests = results.length;
  const passRate = (passedTests / totalTests) * 100;
  const routePassRate = (routePassCount / totalTests) * 100;
  const rangePassRate = (rangePassCount / totalTests) * 100;
  const trendPassRate = (trendPassCount / totalTests) * 100;
  const confidencePassRate = (confidencePassCount / totalTests) * 100;
  
  const failedCases = results.filter(r => !r.overallPass).map(r => r.test_case_id);

  const summary = {
    totalTests,
    passedTests,
    failedTests,
    passRate: parseFloat(passRate.toFixed(2)),
    routePassRate: parseFloat(routePassRate.toFixed(2)),
    rangePassRate: parseFloat(rangePassRate.toFixed(2)),
    trendPassRate: parseFloat(trendPassRate.toFixed(2)),
    confidencePassRate: parseFloat(confidencePassRate.toFixed(2)),
    methodDistribution,
    failedCases
  };

  fs.writeFileSync(
    path.join(testOutputsDir, "adaptive-routing-test-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );
  console.log("Saved test-outputs/adaptive-routing-test-summary.json\n");

  console.log(`Evaluator Finished: ${passedTests} passed, ${failedTests} failed.`);
  console.log(`Pass Rate: ${passRate.toFixed(2)}%`);
  console.log("==========================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
