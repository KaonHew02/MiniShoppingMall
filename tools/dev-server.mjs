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

const handler = async (req, res) => {
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
};

/* Listen on both loopback addresses. Google treats http://localhost:PORT and
   http://127.0.0.1:PORT as different origins, so whichever one you registered
   as an authorised JavaScript origin has to be the one that answers. Binding
   only 127.0.0.1 left http://localhost:8788 refusing connections on any
   machine where localhost resolves to ::1 first. */
const HOSTS = ['127.0.0.1', '::1'];
let live = 0;
HOSTS.forEach((host) => {
  const server = createServer(handler);
  server.on('error', (err) => {
    // ::1 is absent on some machines — that is fine, 127.0.0.1 still serves
    if (err.code !== 'EADDRINUSE' && err.code !== 'EADDRNOTAVAIL') throw err;
    console.log(`  (skipped ${host}: ${err.code})`);
  });
  server.listen(PORT, host, () => {
    if (live++ === 0) {
      console.log(`Mini Shopping Mall — http://localhost:${PORT}`);
      console.log(`                     http://127.0.0.1:${PORT}`);
    }
  });
});
