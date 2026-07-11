export interface MeterOcrCandidate {
    id: string;
    value: number;
    normalizedText: string;
    confidence: number;
    sourceStart: number;
    sourceEnd: number;
}

export interface MeterOcrResult {
    success: boolean;
    candidates: MeterOcrCandidate[];
    ambiguous: boolean;
    recommendedCandidate: MeterOcrCandidate | null;
    overallConfidence: number;
    warnings: string[];
    processingDurationMs: number;
    engine: string;
}
