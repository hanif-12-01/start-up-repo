import type { Worker } from 'tesseract.js';
import type { MeterOcrEngine } from './MeterOcrEngine';
import type { MeterOcrResult } from './MeterOcrResult';
import { parseMeterReading } from './meterReadingParser';

export const OCR_PARAMS = {
    tessedit_char_whitelist: '0123456789.,',
    tessedit_pageseg_mode: '7',
} as const;

export class BrowserMeterOcrEngine implements MeterOcrEngine {
    private worker: Worker | null = null;
    private minConfidence: number;
    private timeoutSeconds: number;

    constructor(minConfidence: number = 75, timeoutSeconds: number = 30) {
        this.minConfidence = minConfidence;
        this.timeoutSeconds = timeoutSeconds;
    }

    /**
     * Instantiates Tesseract, processes the image, parses results, and terminates the worker.
     */
    async processImage(imageSource: File | Blob): Promise<MeterOcrResult> {
        let objectUrl: string | null = null;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let isTimedOut = false;
        const startTime = Date.now();

        try {
            const { createWorker } = await import('tesseract.js');

            objectUrl = URL.createObjectURL(imageSource);

            // Create a promise for the OCR work
            const ocrPromise = (async () => {
                this.worker = await createWorker('eng', 1, {
                    workerPath: '/tesseract/v7/worker.min.js',
                    corePath: '/tesseract/v7',
                    langPath: '/tesseract/v7/tessdata',
                    logger: () => {}, // empty logger to avoid logging progress/text
                    errorHandler: () => {},
                });

                if (isTimedOut) {
                    throw new Error('TIMEOUT');
                }

                await this.worker.setParameters({
                    tessedit_char_whitelist: OCR_PARAMS.tessedit_char_whitelist,
                    tessedit_pageseg_mode: OCR_PARAMS.tessedit_pageseg_mode as any,
                });

                if (isTimedOut) {
                    throw new Error('TIMEOUT');
                }

                const { data } = await this.worker.recognize(objectUrl!);

                return data;
            })();

            // Create a timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    isTimedOut = true;
                    reject(new Error('TIMEOUT'));
                }, this.timeoutSeconds * 1000);
            });

            // Race the OCR work against the timeout
            const data = await Promise.race([ocrPromise, timeoutPromise]);

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            const rawText = data.text || '';
            const confidence = data.confidence || 0;

            const result = parseMeterReading(rawText, confidence, this.minConfidence);
            result.processingDurationMs = Date.now() - startTime;

            return result;
        } catch (error: any) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Clean up and terminate the worker immediately on timeout
            await this.terminate();

            if (error.message === 'TIMEOUT' || isTimedOut) {
                return {
                    success: false,
                    candidates: [],
                    ambiguous: false,
                    recommendedCandidate: null,
                    overallConfidence: 0,
                    warnings: ['Proses pembacaan meteran melebihi batas waktu. Harap coba lagi dengan gambar yang lebih jelas.'],
                    processingDurationMs: Date.now() - startTime,
                    engine: 'browser-tesseract',
                };
            }

            return {
                success: false,
                candidates: [],
                ambiguous: false,
                recommendedCandidate: null,
                overallConfidence: 0,
                warnings: [`Gagal memproses OCR: ${error.message || error}`],
                processingDurationMs: Date.now() - startTime,
                engine: 'browser-tesseract',
            };
        } finally {
            if (objectUrl) {
                try {
                    URL.revokeObjectURL(objectUrl);
                } catch {
                    // Ignore
                }
            }

            // Terminate worker after processing to free memory
            await this.terminate();
        }
    }

    /**
     * Terminates the WebAssembly worker to clean up active threads.
     */
    async terminate(): Promise<void> {
        if (this.worker) {
            const w = this.worker;
            this.worker = null;

            try {
                await w.terminate();
            } catch {
                // Ignore termination errors if worker already closed
            }
        }
    }
}
