import type { ElectricityInput } from "@/lib/validations/electricity";
import { analyzeElectricityUsage, type AIAnalysisResult } from "@/modules/ai/analysis";

export type ElectricityProcessingResult =
  | { ok: true; analysis: AIAnalysisResult; updatedAt: string }
  | { ok: false; error: string };

export async function processElectricitySubmission(
  input: ElectricityInput
): Promise<ElectricityProcessingResult> {
  try {
    // ponytail: no DB here; swap return-only flow to persistence once auth/schema land.
    const analysis = await analyzeElectricityUsage(input);

    return {
      ok: true,
      analysis,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ok: false,
      error: "Gagal memproses data pemakaian listrik.",
    };
  }
}