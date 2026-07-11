import * as assert from 'assert';
import { OCR_PARAMS } from '../resources/js/services/meter-ocr/BrowserMeterOcrEngine';
import { parseMeterReading } from '../resources/js/services/meter-ocr/meterReadingParser';

console.log('Running Meter OCR Parser Tests...');

// 0. Whitelist parameter check
assert.strictEqual(OCR_PARAMS.tessedit_char_whitelist, '0123456789.,');
assert.strictEqual(OCR_PARAMS.tessedit_pageseg_mode, '7');

try {
    // 1. Integer
    const res1 = parseMeterReading('12345');
    assert.ok(res1.success);
    assert.strictEqual(res1.recommendedCandidate?.value, 12345);
    assert.strictEqual(res1.ambiguous, false);

    // 2. Spaced digits
    const res2 = parseMeterReading('1 2  3   4 5');
    assert.ok(res2.success);
    assert.strictEqual(res2.recommendedCandidate?.value, 12345);
    assert.strictEqual(res2.ambiguous, false);

    // 3. Dot decimal
    const res3 = parseMeterReading('123.45');
    assert.ok(res3.success);
    assert.strictEqual(res3.recommendedCandidate?.value, 123.45);
    assert.strictEqual(res3.ambiguous, false);

    // 4. Comma decimal
    const res4 = parseMeterReading('123,45');
    assert.ok(res4.success);
    assert.strictEqual(res4.recommendedCandidate?.value, 123.45);
    assert.strictEqual(res4.ambiguous, false);

    // 5. Alphabetic noise
    const res5 = parseMeterReading('STAND METER: 12345 kWh');
    assert.ok(res5.success);
    assert.strictEqual(res5.recommendedCandidate?.value, 12345);
    assert.strictEqual(res5.ambiguous, false);

    // 6. Negative rejection
    const res6 = parseMeterReading('-12345');
    assert.strictEqual(res6.success, false);
    assert.strictEqual(res6.recommendedCandidate, null);

    // 7. Excessive-length rejection
    const res7 = parseMeterReading('1234567'); // 7 digits
    assert.strictEqual(res7.success, false);
    assert.strictEqual(res7.recommendedCandidate, null);

    // 8. No candidate
    const res8 = parseMeterReading('no numbers here');
    assert.strictEqual(res8.success, false);
    assert.strictEqual(res8.recommendedCandidate, null);

    // 9. Duplicate candidate deduplication
    const res9 = parseMeterReading('12345 and 12345');
    assert.ok(res9.success);
    assert.strictEqual(res9.candidates.length, 1);
    assert.strictEqual(res9.recommendedCandidate?.value, 12345);

    // 10. Deterministic ordering
    const res10 = parseMeterReading('12345 and 67890');
    assert.ok(res10.success);
    assert.strictEqual(res10.candidates.length, 2);
    // Equal confidence, sorted by value ascending (12345 before 67890)
    assert.strictEqual(res10.candidates[0].value, 12345);
    assert.strictEqual(res10.candidates[1].value, 67890);

    // 11. Multiple candidates (with high confidence, which makes it ambiguous)
    const res11 = parseMeterReading('12345 and 67890', 80, 75);
    assert.ok(res11.success);
    assert.strictEqual(res11.ambiguous, true);
    assert.strictEqual(res11.recommendedCandidate, null);

    // 12. Low confidence has no recommendation
    const res12 = parseMeterReading('12345', 60, 75);
    assert.ok(res12.success);
    assert.strictEqual(res12.recommendedCandidate, null);

    // 13. Same-origin regression protection check
    const fs = await import('fs');
    const path = await import('path');
    
    const filesToCheck = [
        path.resolve('resources/js/services/meter-ocr/BrowserMeterOcrEngine.ts'),
        path.resolve('resources/js/pages/Electricity/Index.vue')
    ];
    
    const externalPatterns = [
        'unpkg.com',
        'cdn.jsdelivr.net',
        'cdnjs.cloudflare.com'
    ];
    
    for (const filePath of filesToCheck) {
        if (!fs.existsSync(filePath)) {
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        for (const pattern of externalPatterns) {
            if (content.includes(pattern)) {
                 throw new Error(`Regression Protection: Potential external CDN pattern "${pattern}" detected in ${path.basename(filePath)}! OCR assets must be loaded from local relative routes.`);
            }
        }

        // Also check if any other HTTP/HTTPS URLs are referenced
        const urls = content.match(/https?:\/\/[^\s"'`>]+/g) || [];

        for (const url of urls) {
            if (url.includes('unpkg.com') || url.includes('jsdelivr.net') || url.includes('tesseract.projectnaptha') || url.includes('cloudflare')) {
                throw new Error(`Regression Protection: External CDN link "${url}" detected in ${path.basename(filePath)}! OCR assets must be loaded from local relative routes.`);
            }
        }
    }

    console.log('✓ Same-origin regression protection checks passed!');

    console.log('✓ All Meter OCR Parser Tests Passed!');
    process.exit(0);
} catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
}
