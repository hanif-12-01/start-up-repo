import type { MeterOcrCandidate, MeterOcrResult } from './MeterOcrResult';

/**
 * Parses raw text from the OCR engine to find candidate meter readings.
 * Supports spaces between digits, comma/dot decimals, and filters out
 * negative or implausibly large readings.
 */
export function parseMeterReading(
    rawText: string,
    tesseractConfidence: number = 80,
    minConfidence: number = 75,
): MeterOcrResult {
    const startTime = Date.now();
    const candidates: MeterOcrCandidate[] = [];
    const warnings: string[] = [];
    let idCounter = 1;

    if (!rawText || rawText.trim() === '') {
        return {
            success: false,
            candidates: [],
            ambiguous: false,
            recommendedCandidate: null,
            overallConfidence: 0,
            warnings: ['Teks tidak terdeteksi dari gambar.'],
            processingDurationMs: Date.now() - startTime,
            engine: 'browser-tesseract',
        };
    }

    // Normalize spacing and newlines
    const normalized = rawText.replace(/\r?\n/g, ' ').trim();

    // 1. Regex to find sequences of digits that may contain spaces, dots, or commas, and optionally starting with a minus.
    const digitSequenceRegex = /-?(?:\d[\s\.,]*)+/g;
    let match;

    while ((match = digitSequenceRegex.exec(normalized)) !== null) {
        const matchedText = match[0];
        const sourceStart = match.index;
        const sourceEnd = digitSequenceRegex.lastIndex;

        // Clean spaces inside the match
        let cleaned = matchedText.replace(/\s+/g, '');
        const isNegative = cleaned.startsWith('-');

        if (isNegative) {
            continue; // reject negative candidates
        }

        // Clean dots/commas to count digits for implausible length check
        const digitCount = cleaned.replace(/[\.,]/g, '').length;

        if (digitCount > 6) {
            continue; // reject implausibly long candidates
        }

        // Normalize decimal separator (comma to dot)
        cleaned = cleaned.replace(/,/g, '.');

        // Check if there are multiple dots in the match (e.g. "12.34.56")
        const dotCount = (cleaned.match(/\./g) || []).length;

        if (dotCount > 1) {
            // It might be multiple separate readings. Split them.
            const parts = cleaned.split('.');
            let currentOffset = 0;

            for (const part of parts) {
                if (/^\d+$/.test(part)) {
                    const partVal = Number(part);

                    if (partVal >= 0 && part.length <= 6) {
                        const partIdx = matchedText.indexOf(part, currentOffset);
                        const partStart = sourceStart + partIdx;
                        const partEnd = partStart + part.length;
                        currentOffset = partIdx + part.length;

                        candidates.push({
                            id: `cand-${idCounter++}`,
                            value: partVal,
                            normalizedText: part,
                            confidence: tesseractConfidence,
                            sourceStart: partStart,
                            sourceEnd: partEnd,
                        });
                    }
                }
            }

            continue;
        }

        if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
            const val = Number(cleaned);

            if (val >= 0) {
                candidates.push({
                    id: `cand-${idCounter++}`,
                    value: val,
                    normalizedText: cleaned,
                    confidence: tesseractConfidence,
                    sourceStart,
                    sourceEnd,
                });
            }
        }
    }

    // 2. Try to recover numbers with common OCR letter-to-digit errors if no candidates found
    if (candidates.length === 0) {
        const recoveredText = normalized
            .replace(/([0-9])o([0-9])/gi, '$10$2')
            .replace(/([0-9])i([0-9])/gi, '$11$2')
            .replace(/([0-9])l([0-9])/gi, '$11$2')
            .replace(/([0-9])z([0-9])/gi, '$12$2')
            .replace(/([0-9])s([0-9])/gi, '$15$2')
            .replace(/([0-9])b([0-9])/gi, '$18$2')
            .replace(/([0-9])g([0-9])/gi, '$19$2');

        let recMatch;
        const recRegex = /-?(?:\d[\s\.,]*)+/g;

        while ((recMatch = recRegex.exec(recoveredText)) !== null) {
            const matchedText = recMatch[0];
            const sourceStart = recMatch.index;
            const sourceEnd = recRegex.lastIndex;

            const cleaned = matchedText.replace(/\s+/g, '').replace(/,/g, '.');
            const isNegative = cleaned.startsWith('-');

            if (isNegative) {
                continue; // reject negative
            }

            const digitCount = cleaned.replace(/[\.,]/g, '').length;

            if (digitCount > 6) {
                continue; // reject implausibly long
            }

            if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
                const val = Number(cleaned);

                if (val >= 0) {
                    candidates.push({
                        id: `cand-${idCounter++}`,
                        value: val,
                        normalizedText: cleaned,
                        confidence: Math.max(10, tesseractConfidence - 15),
                        sourceStart,
                        sourceEnd,
                    });
                }
            }
        }
    }

    // Deduplicate candidates deterministically (keep highest confidence for each unique normalizedText)
    const uniqueMap = new Map<string, MeterOcrCandidate>();

    for (const cand of candidates) {
        const existing = uniqueMap.get(cand.normalizedText);

        if (!existing || cand.confidence > existing.confidence) {
            uniqueMap.set(cand.normalizedText, cand);
        }
    }

    const deduplicated = Array.from(uniqueMap.values());

    if (deduplicated.length === 0) {
        return {
            success: false,
            candidates: [],
            ambiguous: false,
            recommendedCandidate: null,
            overallConfidence: 0,
            warnings: ['Tidak menemukan angka meteran yang valid. Pastikan foto tegak dan jelas.'],
            processingDurationMs: Date.now() - startTime,
            engine: 'browser-tesseract',
        };
    }

    // Sort: highest confidence first, then lowest value (deterministic fallback)
    deduplicated.sort(
        (a, b) => b.confidence - a.confidence || a.value - b.value,
    );

    const overallConfidence = deduplicated[0].confidence;

    // Filter credible candidates for recommendation
    const credibleCandidates = deduplicated.filter(
        (c) => c.confidence >= minConfidence,
    );

    let recommendedCandidate: MeterOcrCandidate | null = null;
    let ambiguous = false;

    if (credibleCandidates.length === 1) {
        recommendedCandidate = credibleCandidates[0];
    } else if (credibleCandidates.length > 1) {
        ambiguous = true;
        warnings.push('Terdeteksi beberapa kemungkinan angka meteran.');
    }

    if (overallConfidence < minConfidence) {
        warnings.push('Tingkat keyakinan pembacaan rendah.');
    }

    return {
        success: true,
        candidates: deduplicated,
        ambiguous,
        recommendedCandidate,
        overallConfidence,
        warnings,
        processingDurationMs: Date.now() - startTime,
        engine: 'browser-tesseract',
    };
}
