import type { MeterOcrResult } from './MeterOcrResult';

export interface MeterOcrEngine {
    /**
     * Processes a local image file/blob to run OCR detection.
     */
    processImage(imageSource: File | Blob): Promise<MeterOcrResult>;

    /**
     * Terminates the active worker threads and releases browser resources.
     */
    terminate(): Promise<void>;
}
