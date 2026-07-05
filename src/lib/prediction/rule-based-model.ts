import { PredictionEngineInput } from "./types";

export interface RuleBasedPredictionResult {
  predictedUsageKwh: number;
  trendPercent: number;
}

export function predictRuleBased(input: PredictionEngineInput): RuleBasedPredictionResult {
  const MIN_KWH_PREDICTION = 10.0;
  const entries = input.historicalEntries;
  if (entries.length === 0) {
    return {
      trendPercent: 2.0,
      predictedUsageKwh: MIN_KWH_PREDICTION,
    };
  }

  const currentEntry = entries[0];
  const prevEntry = entries[1] || null;

  let trendPercent = 0.0;
  if (prevEntry && prevEntry.usageKwh > 0) {
    const changePct = (currentEntry.usageKwh - prevEntry.usageKwh) / prevEntry.usageKwh;
    // Clamp the percentage change between -20% and +20%
    trendPercent = parseFloat((Math.max(-0.2, Math.min(0.2, changePct)) * 100).toFixed(1));
  } else {
    // Only 1 month of data -> default assumption of 2% standard growth
    trendPercent = 2.0;
  }

  const rawKwh = currentEntry.usageKwh * (1 + trendPercent / 100);
  const predictedUsageKwh = parseFloat(Math.max(MIN_KWH_PREDICTION, rawKwh).toFixed(2));

  return {
    trendPercent,
    predictedUsageKwh,
  };
}
