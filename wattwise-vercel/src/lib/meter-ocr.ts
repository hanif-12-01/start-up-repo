export interface MeterCandidate { id: string; value: number; text: string; confidence: number }

export function parseMeterReading(rawText: string, confidence = 80, minimumConfidence = 75) {
  const normalized = rawText.replace(/\r?\n/g, ' ').trim();
  const candidates: MeterCandidate[] = [];
  const matches = normalized.match(/-?(?:\d[\s.,]*)+/g) ?? [];
  for (const raw of matches) {
    if (raw.trim().startsWith('-')) continue;
    const cleaned = raw.replace(/\s+/g, '').replaceAll(',', '.');
    if ((cleaned.match(/\./g) ?? []).length > 1) continue;
    if (!/^\d+(?:\.\d+)?$/.test(cleaned) || cleaned.replace('.', '').length > 6) continue;
    const value = Number(cleaned);
    if (Number.isFinite(value) && value >= 0) candidates.push({ id: `meter-${candidates.length + 1}`, value, text: cleaned, confidence });
  }
  const unique = [...new Map(candidates.map((item) => [item.text, item])).values()].sort((a, b) => b.confidence - a.confidence || a.value - b.value);
  const credible = unique.filter((item) => item.confidence >= minimumConfidence);
  return { success: unique.length > 0, candidates: unique, recommended: credible.length === 1 ? credible[0] : null, ambiguous: credible.length > 1, confidence: unique[0]?.confidence ?? 0 };
}
