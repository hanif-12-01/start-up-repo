import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageRoot = join(__dirname, '..');
const distDir = join(packageRoot, 'node_modules', 'onnxruntime-web', 'dist');
const targetDir = join(packageRoot, 'public', 'ort-wasm');

if (!existsSync(distDir)) {
  console.warn(`[prepare-onnx-runtime] Warning: dist directory not found at ${distDir}`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

const files = readdirSync(distDir);
let copied = 0;

for (const file of files) {
  if (file.endsWith('.wasm') || file.endsWith('.mjs') || file.endsWith('.js')) {
    const src = join(distDir, file);
    const dst = join(targetDir, file);
    cpSync(src, dst);
    copied++;
  }
}

console.log(`[prepare-onnx-runtime] Successfully prepared ${copied} ONNX Runtime Web assets in ${targetDir}`);
