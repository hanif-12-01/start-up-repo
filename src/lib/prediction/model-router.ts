import { PredictionEngineInput, PredictionEngineResult } from "./types";
import { buildTabularFeatures, buildLstmSequence } from "./feature-builder";
import { predictRuleBased } from "./rule-based-model";
import { predictTabularUmkm } from "./tabular-umkm-model";
import { predictLstmUmkm } from "./lstm-umkm-model";
import { calibratePrediction } from "./calibration-layer";

export function routeAndPredict(input: PredictionEngineInput): PredictionEngineResult {
  const entries = input.historicalEntries;
  if (!entries || entries.length === 0) {
    throw new Error("No historical data available for prediction.");
  }

  const dataAge = entries.length;

  if (dataAge < 3) {
    // 1. Data < 3 months -> Rule-Based
    const rbResult = predictRuleBased(input);
    return calibratePrediction(rbResult.predictedUsageKwh, "RULE_BASED", input);
  } else if (dataAge >= 3 && dataAge <= 5) {
    // 2. Data 3-5 months -> Tabular Model (Gradient Boosting)
    try {
      const features = buildTabularFeatures({
        businessType: input.businessType,
        entries,
      });
      const tabularRes = predictTabularUmkm(features);
      return calibratePrediction(tabularRes.predictedUsageKwh, "TABULAR_UMKM_V1", input);
    } catch (err) {
      console.warn(`[Model Router] Tabular prediction failed, falling back to Rule-Based:`, err);
      const rbResult = predictRuleBased(input);
      return calibratePrediction(rbResult.predictedUsageKwh, "RULE_BASED", input);
    }
  } else {
    // 3. Data >= 6 months -> LSTM Model (and optional Long-history hook if >= 24 months)
    if (dataAge >= 24) {
      // Long-history model hook (optional/batch/offline).
      // Since no offline model is loaded in this runtime, we fallback to LSTM but flag it.
      console.info(
        `[Model Router] Business ${input.businessId} has >=24 months of data (${dataAge} months). ` +
        `Eligible for offline long-history batch model. Utilizing LSTM as runtime fallback.`
      );
    }

    try {
      // LSTM always takes a sequence window of exactly 6 timesteps
      const sequence = buildLstmSequence({
        businessType: input.businessType,
        entries,
        sequenceLength: 6,
      });
      const lstmKwh = predictLstmUmkm(sequence);
      const result = calibratePrediction(lstmKwh, "LSTM_PROTOTYPE", input);
      
      if (dataAge >= 24) {
        result.modelVersion = `${result.modelVersion} (Long-History Hook)`;
      }
      return result;
    } catch (err) {
      console.warn(`[Model Router] LSTM prediction failed, falling back to Rule-Based:`, err);
      const rbResult = predictRuleBased(input);
      return calibratePrediction(rbResult.predictedUsageKwh, "RULE_BASED", input);
    }
  }
}
