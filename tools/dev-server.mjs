/**
 * Static dev server for Mini Shopping Mall.
 *   node tools/dev-server.mjs [port]
 *
 * Also accepts POST /__snap with a data: URL body and writes it to
 * tools/.snap.png — used to eyeball the canvas without a visible browser.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8787;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/__snap') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const url = Buffer.concat(chunks).toString();
    const b64 = url.slice(url.indexOf(',') + 1);
    await writeFile(join(ROOT, 'tools', '.snap.png'), Buffer.from(b64, 'base64'));
    res.writeHead(204).end();
    return;
  }

  const path = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = normalize(path === '/' ? '/index.html' : path).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

  try {
    const buf = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Mini Shopping Mall — http://127.0.0.1:${PORT}`);
});
