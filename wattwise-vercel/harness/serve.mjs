// Static file server for the Stage5G.14 harness (loopback only).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const root =
  process.env.WATTWISE_HARNESS_OUT ?? path.join(os.tmpdir(), 'wattwise-stage5g14-harness-dist');
const port = Number(process.env.WATTWISE_HARNESS_PORT ?? 4321);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const file = path.join(root, rel);
  if (!['index.html', 'harness.js', 'harness.css'].includes(rel)) {
    res.writeHead(404).end('not found');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`harness on http://127.0.0.1:${port}`));
