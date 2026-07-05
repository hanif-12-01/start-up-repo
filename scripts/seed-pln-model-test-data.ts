/**
 * Seeder for PLN test cases.
 * Seeds businesses (PLN_TEST_T001 to PLN_TEST_T012) and their electricity entry histories.
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
import { BusinessType } from "@prisma/client";

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

async function main() {
  console.log("=== STARTING PLN MODEL TEST DATA SEED ===");

  const testModelDir = path.join(process.cwd(), "Test model");
  const profilesPath = path.join(testModelDir, "business_test_profiles.csv");
  const historyPath = path.join(testModelDir, "monthly_electricity_test_data.csv");

  if (!fs.existsSync(profilesPath) || !fs.existsSync(historyPath)) {
    console.error("ERROR: File data uji PLN tidak ditemukan di 'Test model/'");
    process.exit(1);
  }

  // Parse CSVs
  const profilesCSV = parseCSV(fs.readFileSync(profilesPath, "utf-8"));
  const historyCSV = parseCSV(fs.readFileSync(historyPath, "utf-8"));

  const profilesRows = profilesCSV.slice(1);
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

  // 2. Seed database with PLN_TEST businesses
  console.log("Seeding / updating test businesses in database...");
  for (const profile of profilesRows) {
    const [test_case_id, business_name, business_type_str, powerVA_str, operatingHours] = profile;
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
  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
