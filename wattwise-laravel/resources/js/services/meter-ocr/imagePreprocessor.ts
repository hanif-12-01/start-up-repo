export interface PreprocessOptions {
    maxDimension: number;
    rotationDegrees: number; // 0, 90, 180, 270
    crop?: {
        x: number;      // 0 to 1 (relative to rotated width)
        y: number;      // 0 to 1 (relative to rotated height)
        width: number;  // 0 to 1 (relative to rotated width)
        height: number; // 0 to 1 (relative to rotated height)
    };
}

/**
 * Preprocesses an image file on a local canvas:
 * 1. Resizes it to respect the maxDimension while preserving aspect ratio.
 * 2. Rotates the image dynamically according to the user's settings.
 * 3. Extracts the specified crop region (when provided).
 * 4. Converts pixels to grayscale.
 * 5. Enhances contrast to improve OCR accuracy.
 * 6. Returns a promise resolving to a Blob and a local Data URL.
 */
export function preprocessImage(
    file: File,
    options: PreprocessOptions,
): Promise<{ blob: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            // Revoke object URL to prevent memory leaks
            URL.revokeObjectURL(objectUrl);

            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context tidak tersedia.'));

                    return;
                }

                let width = img.width;
                let height = img.height;

                // Scale down if dimensions exceed limit
                if (
                    width > options.maxDimension ||
                    height > options.maxDimension
                ) {
                    if (width > height) {
                        height = Math.round(
                            (height * options.maxDimension) / width,
                        );
                        width = options.maxDimension;
                    } else {
                        width = Math.round(
                            (width * options.maxDimension) / height,
                        );
                        height = options.maxDimension;
                    }
                }

                // Rotation calculation
                const is90or270 =
                    options.rotationDegrees === 90 ||
                    options.rotationDegrees === 270;
                canvas.width = is90or270 ? height : width;
                canvas.height = is90or270 ? width : height;

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((options.rotationDegrees * Math.PI) / 180);

                ctx.drawImage(img, -width / 2, -height / 2, width, height);

                // Handle cropping if requested
                let finalCanvas = canvas;
                let finalCtx = ctx;

                if (options.crop) {
                    const cropX = Math.max(0, Math.min(1, options.crop.x)) * canvas.width;
                    const cropY = Math.max(0, Math.min(1, options.crop.y)) * canvas.height;
                    const cropW = Math.max(0, Math.min(1, options.crop.width)) * canvas.width;
                    const cropH = Math.max(0, Math.min(1, options.crop.height)) * canvas.height;

                    if (cropW <= 0 || cropH <= 0) {
                        reject(new Error('Ukuran potongan gambar (crop) tidak boleh nol.'));

                        return;
                    }

                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = cropW;
                    cropCanvas.height = cropH;
                    const cropCtx = cropCanvas.getContext('2d');

                    if (!cropCtx) {
                        reject(new Error('Canvas context untuk potongan gambar tidak tersedia.'));

                        return;
                    }

                    // Copy the cropped region from the rotated canvas
                    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                    finalCanvas = cropCanvas;
                    finalCtx = cropCtx;
                }

                // Grayscale and simple threshold/contrast boost on the final canvas
                const imgData = finalCtx.getImageData(
                    0,
                    0,
                    finalCanvas.width,
                    finalCanvas.height,
                );
                const data = imgData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Luma formula for grayscale
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                    // Apply a slight contrast enhancement factor
                    const factor = 1.3;
                    const contrasted = factor * (gray - 128) + 128;
                    const finalColor = Math.min(255, Math.max(0, contrasted));

                    data[i] = finalColor; // R
                    data[i + 1] = finalColor; // G
                    data[i + 2] = finalColor; // B
                }

                finalCtx.putImageData(imgData, 0, 0);

                finalCanvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const dataUrl = finalCanvas.toDataURL(
                                'image/jpeg',
                                0.85,
                            );
                            resolve({ blob, dataUrl });
                        } else {
                            reject(
                                new Error(
                                    'Gagal mengekspor hasil olah gambar canvas ke Blob.',
                                ),
                            );
                        }

                        // Explicitly free canvas memory allocation
                        canvas.width = 0;
                        canvas.height = 0;

                        if (finalCanvas !== canvas) {
                            finalCanvas.width = 0;
                            finalCanvas.height = 0;
                        }
                    },
                    'image/jpeg',
                    0.85,
                );
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Gagal memuat gambar untuk diolah.'));
        };

        img.src = objectUrl;
    });
}
