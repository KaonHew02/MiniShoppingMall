/**
 * Static dev server for Mini Shopping Mall.
 *   node tools/dev-server.mjs [port]
 *
 * Also accepts POST /__snap with a data: URL body and writes it to
 * tools/.snap.png — used to eyeball the canvas without a visible browser.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, resolve, sep } from 'node:path';
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

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/* Never served, even though they sit under ROOT: the git history, the
   installed packages, and any other dotfile. */
const HIDDEN = /(^|[/\\])(\.[^/\\]*|node_modules)([/\\]|$)/i;   // Windows paths ignore case
const SNAP_MAX = 16 * 1024 * 1024;

const handler = async (req, res) => {
  if (req.method === 'POST' && req.url === '/__snap') {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > SNAP_MAX) { res.writeHead(413).end('too large'); req.destroy(); return; }
      chunks.push(c);
    }
    const url = Buffer.concat(chunks).toString();
    const b64 = url.slice(url.indexOf(',') + 1);
    await writeFile(join(ROOT, 'tools', '.snap.png'), Buffer.from(b64, 'base64'));
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  // a malformed %-escape throws, and a throw in here took the whole server down
  let path;
  try { path = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch { res.writeHead(400).end('bad request'); return; }

  // a folder means its index.html — /dist/ previews the production build
  const rel = normalize(path.endsWith('/') ? path + 'index.html' : path).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel);
  // ROOT + sep: a bare startsWith(ROOT) also lets through a sibling folder
  // whose name merely begins the same way
  if (!file.startsWith(ROOT + sep) || HIDDEN.test(rel)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
    return;
  }

  try {
    const buf = await readFile(file);
    res.writeHead(200, {
      ...HEADERS,
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    });
    res.end(req.method === 'HEAD' ? undefined : buf);
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
  const server = createServer((req, res) => {
    handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
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
