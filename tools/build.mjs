/**
 * Production build: the game as ONE minified script, sealed in a closure.
 *   node tools/build.mjs          -> dist/
 *
 * In development every file hangs its piece off window.MSM, which is handy
 * — and it means anyone can open the console and type MSM.state.cash = 1e12.
 * Here the 24 files are joined inside a single strict-mode function with
 * MSM as a local variable, then minified, and no source map is written.
 *
 * A closure alone is not enough: console code can still reach inside by
 * way of the built-ins the game shares with the page. TRUSTED below closes
 * those doors as the game loads, before anything typed in the console can
 * run. What it cannot stop is someone pausing the game in the DevTools
 * debugger and editing a variable by hand — nothing in a page can.
 *
 * dist/ keeps the no-server promise: dist/index.html opens by double-click.
 */
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const HEADER = 'window.MSM = window.MSM || {};';
const TAG = /^[ \t]*<script src="(src\/[^"]+\.js)"[^>]*><\/script>[ \t]*\r?\n/gm;

/* Shown to anyone who opens the console on the live game. Pasting code
   people send you into this box is how accounts get stolen on other sites. */
const WARNING = `console.log('%cStop!', 'color:#E0553F;font:bold 42px sans-serif');
console.log('%cThis console is a developer tool. If someone told you to paste ' +
  'code here for free cash, it will not work: the game does not take orders ' +
  'from this box, and a save edited outside the game is refused.', 'font:15px sans-serif');`;

/* Doors the console could still use to get inside the closure, closed here.

   1. Global functions the game calls. Swap requestAnimationFrame for one
      that lies about the time and every frame looks like two hours away
      (the offline catch-up pays out each time); swap JSON.stringify and the
      next autosave hands over the live game state; swap Math.random and
      every customer buys. The game keeps its own copies, taken now.

   2. Shared prototypes. Every object and array the game owns inherits from
      Object.prototype and Array.prototype, so a getter or a toJSON planted
      there — or a replaced forEach — is handed the game's own objects the
      next time it touches them. Those prototypes (and Function's, and the
      array iterators') are frozen. It is a plain freeze: making them
      getter/setter pairs instead measured 12x slower on the game's array
      code. The four names below are the exception, because libraries
      legitimately assign them on their OWN objects (Foo.prototype.constructor
      = Foo) and a frozen original would silently refuse that — which could
      break Google sign-in. Their setters allow exactly that and nothing on
      Object.prototype itself.

   3. The namespace. MSM has no prototype at all, so reading a property it
      does not have yet cannot land in someone else's getter. */
const TRUSTED = `'use strict';
const own = (ns) => window.Object.freeze(window.Object.defineProperties(
  {}, window.Object.getOwnPropertyDescriptors(ns)));
const Math = own(window.Math), JSON = own(window.JSON), Object = own(window.Object);
const Date = (() => {
  const D = window.Date, now = D.now;
  class TrustedDate extends D {}
  window.Object.defineProperty(TrustedDate, 'now', { value: () => now.call(D) });
  return window.Object.freeze(TrustedDate);
})();
const performance = window.Object.freeze({ now: window.performance.now.bind(window.performance) });
const requestAnimationFrame = window.requestAnimationFrame.bind(window);
(() => {
  const O = window.Object, OP = O.prototype;
  for (const key of ['constructor', 'toString', 'valueOf', 'toLocaleString']) {
    const value = OP[key];
    O.defineProperty(OP, key, {
      get() { return value; },
      set(v) {
        if (this === OP) throw new TypeError('Object.prototype is locked');
        O.defineProperty(this, key, { value: v, writable: true, enumerable: true, configurable: true });
      },
      enumerable: false, configurable: false,
    });
  }
  const arrayIter = O.getPrototypeOf([][Symbol.iterator]());
  [OP, window.Array.prototype, window.Function.prototype, arrayIter, O.getPrototypeOf(arrayIter)]
    .forEach((p) => O.freeze(p));
})();
const MSM = window.Object.create(null);`;

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(TAG)].map((m) => m[1]);
if (!files.length) throw new Error('no <script src="src/..."> tags found in index.html');

let body = '';
for (const f of files) {
  const src = await readFile(join(ROOT, f), 'utf8');
  if (!src.includes(HEADER)) throw new Error(`${f}: missing "${HEADER}"`);
  body += `\n/* ${f} */\n` + src.replace(HEADER, '');
}
const bundle = `(function () {\n${TRUSTED}\n${WARNING}\n${body}\n})();\n`;

const js = await transform(bundle, {
  loader: 'js',
  minify: true,
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
  drop: ['debugger'],
});
const css = await transform(await readFile(join(ROOT, 'src/styles.css'), 'utf8'), {
  loader: 'css',
  minify: true,
  legalComments: 'none',
});

// content-hashed names, so a new deploy is never served from a stale cache
const jsName = `game.${hash(js.code)}.js`;
const cssName = `styles.${hash(css.code)}.css`;

let page = html.replace(TAG, '');
page = page.replace('</body>', `<script src="${jsName}"></script>\n</body>`);
page = page.replace('href="src/styles.css"', `href="${cssName}"`);
page = page.replace(/<!--[\s\S]*?-->\s*/g, '');

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'assets/logo'), { recursive: true });
await writeFile(join(OUT, jsName), js.code);
await writeFile(join(OUT, cssName), css.code);
await writeFile(join(OUT, 'index.html'), page);
// only what the page itself links to
for (const m of page.matchAll(/href="(assets\/[^"]+)"/g)) {
  await copyFile(join(ROOT, m[1]), join(OUT, m[1]));
}

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`dist/ built from ${files.length} files`);
console.log(`  ${jsName}  ${kb(js.code)}  (sources ${kb(body)})`);
console.log(`  ${cssName}  ${kb(css.code)}`);
