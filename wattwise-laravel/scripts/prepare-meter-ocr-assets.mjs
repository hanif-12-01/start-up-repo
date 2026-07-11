import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.resolve(__dirname, '..');
const destDir = path.resolve(baseDir, 'public/tesseract/v7');
const destTessdataDir = path.resolve(destDir, 'tessdata');

// Read installed package versions from node_modules for deterministic manifest
function readPkgVersion(pkgName) {
    const pkgPath = path.resolve(baseDir, 'node_modules', pkgName, 'package.json');

    if (!fs.existsSync(pkgPath)) {
        console.error(`Error: package.json not found for ${pkgName} at: ${pkgPath}`);
        process.exit(1);
    }

    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
}

const versions = {
    'tesseract.js': readPkgVersion('tesseract.js'),
    'tesseract.js-core': readPkgVersion('tesseract.js-core'),
    '@tesseract.js-data/eng': readPkgVersion('@tesseract.js-data/eng'),
};

console.log('--- Preparing same-origin Tesseract OCR assets ---');
console.log(`  tesseract.js: ${versions['tesseract.js']}`);
console.log(`  tesseract.js-core: ${versions['tesseract.js-core']}`);
console.log(`  @tesseract.js-data/eng: ${versions['@tesseract.js-data/eng']}`);

// Source paths in node_modules
const sources = [
    {
        pkg: 'tesseract.js',
        src: path.resolve(baseDir, 'node_modules/tesseract.js/dist/worker.min.js'),
        dest: path.resolve(destDir, 'worker.min.js')
    },
    {
        pkg: '@tesseract.js-data/eng',
        src: path.resolve(baseDir, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
        dest: path.resolve(destTessdataDir, 'eng.traineddata.gz')
    }
];

// Add tesseract.js-core files
const coreFiles = [
    'tesseract-core.js',
    'tesseract-core.wasm',
    'tesseract-core.wasm.js',
    'tesseract-core-lstm.js',
    'tesseract-core-lstm.wasm',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-simd.js',
    'tesseract-core-simd.wasm',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd-lstm.js',
    'tesseract-core-simd-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-relaxedsimd.js',
    'tesseract-core-relaxedsimd.wasm',
    'tesseract-core-relaxedsimd.wasm.js',
    'tesseract-core-relaxedsimd-lstm.js',
    'tesseract-core-relaxedsimd-lstm.wasm',
    'tesseract-core-relaxedsimd-lstm.wasm.js'
];

for (const name of coreFiles) {
    sources.push({
        pkg: 'tesseract.js-core',
        src: path.resolve(baseDir, `node_modules/tesseract.js-core/${name}`),
        dest: path.resolve(destDir, name)
    });
}

// 1. Check source files exist
for (const entry of sources) {
    if (!fs.existsSync(entry.src)) {
        console.error(`Error: Source file not found for ${entry.pkg} at: ${entry.src}`);
        console.error('Make sure you have run npm install / npm ci.');
        process.exit(1);
    }
}

// 2. Ensure destination directories exist
fs.mkdirSync(destTessdataDir, { recursive: true });

// 3. Copy files and build manifest entries
const manifest = {
    versions,
    files: []
};

for (const entry of sources) {
    const filename = path.basename(entry.dest);
    const content = fs.readFileSync(entry.src);
    
    // Copy
    fs.writeFileSync(entry.dest, content);
    
    // Calculate hash
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    manifest.files.push({
        pkg: entry.pkg,
        filename,
        size_bytes: content.length,
        sha256: hash
    });
    
    console.log(`Copied ${filename} (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
}

// Write manifest
const manifestPath = path.resolve(destDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`Manifest created at ${manifestPath}`);
console.log('✓ Tesseract OCR assets preparation successful!');
process.exit(0);
