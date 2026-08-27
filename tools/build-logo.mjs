/**
 * Mini Shopping Mall - logo generator
 * Draws the isometric mall icon + wordmark and writes SVGs to assets/logo/.
 * Run: node tools/build-logo.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'logo');
mkdirSync(OUT, { recursive: true });

/* ---------------------------------------------------------------- palette */
const PALETTES = {
  sky: {
    name: 'sky',
    bg1: '#7CD9FF', bg2: '#2A6FD6', ray: '#FFFFFF',
    wall: ['#FFFFFF', '#EFF4FB', '#D7E2F1'],   // top, right, left
    trim: ['#FFC53D', '#F2AC28', '#DC961A'],
    tier2: ['#FF7BA6', '#F25F8F', '#D9457A'],
    glass: '#7FD4FF', glassHi: '#CDEEFF',
    door: '#2E7DE0',
    cash: ['#5FE08D', '#41C673', '#2CA85C'],
    bag: ['#FF7BA6', '#E9558A'],
    ink: '#16295C',
  },
  sunset: {
    name: 'sunset',
    bg1: '#FFC46B', bg2: '#F4633F', ray: '#FFFFFF',
    wall: ['#FFFFFF', '#FDEFE6', '#F2DBCD'],
    trim: ['#FFD84D', '#F5BE2C', '#DDA31A'],
    tier2: ['#3FD4CB', '#27BDB4', '#16A199'],
    glass: '#8FE3FF', glassHi: '#D6F5FF',
    door: '#3F63C9',
    cash: ['#5FE08D', '#41C673', '#2CA85C'],
    bag: ['#FF6E8E', '#E44B72'],
    ink: '#2A1436',
  },
};

/* ------------------------------------------------------------- iso helper */
const S = 52, SZ = 52, CX = 256, CY = 278;
const r = (n) => Math.round(n * 100) / 100;
const p = (x, y, z = 0) => [CX + (x - y) * S, CY + (x + y) * (S / 2) - z * SZ];
const pts = (...a) => a.map(([x, y]) => r(x) + ',' + r(y)).join(' ');
const poly = (points, fill, extra = '') =>
  '<polygon points="' + pts(...points) + '" fill="' + fill + '"' + extra + '/>';

/** Axis-aligned iso box -> left/right/top faces, drawn back-to-front. */
function box(x0, y0, x1, y1, z0, z1, colors) {
  const [cTop, cRight, cLeft] = colors;
  const top = [p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)];
  const left = [p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0), p(x0, y1, z0)];
  const right = [p(x1, y1, z1), p(x1, y0, z1), p(x1, y0, z0), p(x1, y1, z0)];
  return poly(left, cLeft) + poly(right, cRight) + poly(top, cTop);
}
/** Quad on the front-left wall (y = yw), spanning x0..x1 and z0..z1. */
const wallL = (yw, x0, x1, z0, z1, fill, extra = '') =>
  poly([p(x0, yw, z1), p(x1, yw, z1), p(x1, yw, z0), p(x0, yw, z0)], fill, extra);
/** Quad on the front-right wall (x = xw), spanning y0..y1 and z0..z1. */
const wallR = (xw, y0, y1, z0, z1, fill, extra = '') =>
  poly([p(xw, y1, z1), p(xw, y0, z1), p(xw, y0, z0), p(xw, y1, z0)], fill, extra);

/* ------------------------------------------------------------ icon pieces */
function building(C, detail) {
  const A = 1.7;    // tier 1 half-footprint
  const B = 1.18;   // tier 2 half-footprint
  const Z1 = 0.98, Z1L = 1.08, Z2 = 2.16, Z2L = 2.26;
  let s = '';

  s += box(-A, -A, A, A, 0, Z1, C.wall);
  if (detail) {
    for (const [a, b] of [[-1.42, -0.72], [-0.35, 0.35], [0.72, 1.42]]) {
      s += wallL(A, a, b, 0.24, 0.74, C.glass);
      s += wallL(A, a, b, 0.6, 0.74, C.glassHi);
    }
    for (let i = 0; i < 6; i++) {
      const y0 = A - (i / 6) * (2 * A), y1 = A - ((i + 1) / 6) * (2 * A);
      s += wallR(A, y1, y0, 0.74, 0.92, i % 2 ? '#FFFFFF' : C.tier2[0]);
    }
    s += wallR(A, -0.42, 0.42, 0, 0.7, C.door);
    s += wallR(A, -0.3, 0.3, 0.06, 0.6, C.glassHi, ' opacity=".5"');
  }
  s += box(-A - 0.08, -A - 0.08, A + 0.08, A + 0.08, Z1, Z1L, C.trim);

  s += box(-B, -B, B, B, Z1L, Z2, C.tier2);
  if (detail) {
    for (const [a, b] of [[-0.92, -0.2], [0.2, 0.92]]) {
      s += wallL(B, a, b, 1.34, 1.94, C.glass);
      s += wallL(B, a, b, 1.74, 1.94, C.glassHi);
    }
    s += wallR(B, -0.9, 0.9, 1.34, 1.94, C.glass);
    s += wallR(B, -0.9, 0.9, 1.74, 1.94, C.glassHi);
  }
  s += box(-B - 0.09, -B - 0.09, B + 0.09, B + 0.09, Z2, Z2L, C.wall);
  return s;
}

const FONT = "'Baloo 2','Fredoka','Nunito','Segoe UI',system-ui,sans-serif";

function billboard(C) {
  const [bx, by] = p(0, 0, 2.26);
  const w = 152, h = 74, x = bx - w / 2, y = by - h - 16;
  return [
    '<rect x="' + r(x + 28) + '" y="' + r(y + h - 8) + '" width="14" height="28" rx="5" fill="' + C.trim[2] + '"/>',
    '<rect x="' + r(x + w - 42) + '" y="' + r(y + h - 8) + '" width="14" height="28" rx="5" fill="' + C.trim[2] + '"/>',
    '<rect x="' + r(x) + '" y="' + r(y + 8) + '" width="' + w + '" height="' + h + '" rx="22" fill="' + C.trim[2] + '"/>',
    '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + w + '" height="' + h + '" rx="22" fill="' + C.trim[0] + '"/>',
    '<text x="' + r(bx) + '" y="' + r(y + h / 2) + '" text-anchor="middle" dominant-baseline="central"' +
      ' font-family="' + FONT + '" font-size="56" font-weight="800" fill="' + C.ink + '">M</text>',
  ].join('');
}

function cashStack(C) {
  let s = '';
  const x0 = 0.32, x1 = 1.5, y0 = 1.98, y1 = 3.16;
  for (let i = 0; i < 3; i++) {
    const z0 = i * 0.22, z1 = z0 + 0.2;
    s += box(x0, y0, x1, y1, z0, z1, C.cash);
    s += wallL(y1, x0, x1, z0 + 0.05, z1 - 0.05, '#FFFFFF', ' opacity=".85"');
  }
  const [cx, cy] = p((x0 + x1) / 2, (y0 + y1) / 2, 0.66);
  return s +
    '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="15" fill="#FFFFFF" opacity=".92"/>' +
    '<text x="' + r(cx) + '" y="' + r(cy) + '" text-anchor="middle" dominant-baseline="central"' +
    ' font-family="' + FONT + '" font-size="24" font-weight="800" fill="' + C.cash[2] + '">$</text>';
}

/** A shopper leaving the entrance, carrying a bag - adds life at large sizes. */
function customer(C) {
  const [cx, cy] = p(2.9, 0.8, 0);
  const bw = 46, bh = 62, hx = cx - bw / 2, hy = cy - bh, hr = 21, hcy = hy - 16;
  return [
    '<ellipse cx="' + r(cx) + '" cy="' + r(cy + 2) + '" rx="28" ry="10" fill="' + C.ink + '" opacity=".2"/>',
    // carried bag
    '<path d="M' + r(cx + 26) + ' ' + r(cy - 40) + ' v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke="' + C.trim[2] + '" stroke-width="6"/>',
    '<rect x="' + r(cx + 20) + '" y="' + r(cy - 43) + '" width="30" height="37" rx="8" fill="' + C.trim[0] + '"/>',
    '<rect x="' + r(cx + 35) + '" y="' + r(cy - 43) + '" width="15" height="37" rx="7" fill="' + C.trim[1] + '"/>',
    // body
    '<rect x="' + r(hx) + '" y="' + r(hy) + '" width="' + bw + '" height="' + bh + '" rx="22" fill="' + C.bag[0] + '"/>',
    '<path d="M' + r(cx) + ' ' + r(hy) + ' h1 a22 22 0 0 1 22 22 v18 a22 22 0 0 1 -22 22 h-1 z" fill="' + C.bag[1] + '"/>',
    // head
    '<circle cx="' + r(cx) + '" cy="' + r(hcy) + '" r="' + hr + '" fill="#FFD9B0"/>',
    '<path d="M' + r(cx) + ' ' + r(hcy - hr) + ' a' + hr + ' ' + hr + ' 0 0 1 0 ' + (hr * 2) + ' z" fill="#F3C08D"/>',
    '<path d="M' + r(cx - hr) + ' ' + r(hcy - 3) + ' a' + hr + ' ' + hr + ' 0 0 1 ' + (hr * 2) + ' 0 z" fill="' + C.ink + '"/>',
  ].join('');
}

/* ------------------------------------------------------------------- icon */
function icon(paletteKey, opts = {}) {
  const C = PALETTES[paletteKey || 'sky'];
  const detail = opts.detail !== false;
  const size = opts.size || 512;
  let rays = '';
  if (detail) {
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180, a2 = a + 0.14;
      rays += '<polygon points="256,256 ' +
        r(256 + Math.cos(a) * 640) + ',' + r(256 + Math.sin(a) * 640) + ' ' +
        r(256 + Math.cos(a2) * 640) + ',' + r(256 + Math.sin(a2) * 640) +
        '" fill="' + C.ray + '" opacity=".07"/>';
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="Mini Shopping Mall">
  <defs>
    <radialGradient id="bg" cx="50%" cy="34%" r="78%">
      <stop offset="0" stop-color="${C.bg1}"/><stop offset="1" stop-color="${C.bg2}"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".38"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="squircle"><rect width="512" height="512" rx="114"/></clipPath>
  </defs>
  <g clip-path="url(#squircle)">
    <rect width="512" height="512" fill="url(#bg)"/>
    ${rays}
    <circle cx="256" cy="248" r="188" fill="url(#glow)"/>
    <ellipse cx="256" cy="374" rx="178" ry="52" fill="${C.ink}" opacity=".13"/>
    ${building(C, detail)}
    ${billboard(C)}
    ${detail ? cashStack(C) + customer(C) : ''}
  </g>
</svg>
`;
}

/* --------------------------------------------------------------- wordmark */
function wordmark(C, opts = {}) {
  C = C || PALETTES.sky;
  const w = opts.w || 1080, h = opts.h || 300;
  const T = (x, y, size, fill, text, extra = '') =>
    '<text x="' + x + '" y="' + y + '" font-family="' + FONT + '" font-size="' + size +
    '" font-weight="800" fill="' + fill + '" text-anchor="middle" ' + extra + '>' + text + '</text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Mini Shopping Mall">
  <rect x="${w / 2 - 140}" y="24" width="280" height="62" rx="31" fill="${C.trim[0]}"/>
  ${T(w / 2, 68, 46, C.ink, 'MINI', 'letter-spacing="12" dominant-baseline="central"')}
  ${T(w / 2, 230, 112, C.trim[2], 'SHOPPING MALL')}
  ${T(w / 2, 214, 112, '#FFFFFF', 'SHOPPING MALL',
      'stroke="' + C.ink + '" stroke-width="16" stroke-linejoin="round" paint-order="stroke"')}
  ${T(w / 2, 272, 28, C.ink, 'IDLE TYCOON', 'letter-spacing="14" opacity=".6"')}
</svg>
`;
}

function lockup(C) {
  C = C || PALETTES.sky;
  const strip = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1520 400" width="1520" height="400" role="img" aria-label="Mini Shopping Mall">
  <g transform="translate(26,-8) scale(0.81)">${strip(icon('sky'))}</g>
  <g transform="translate(470,44) scale(0.95)">${strip(wordmark(C))}</g>
</svg>
`;
}

/* ------------------------------------------------------------------ write */
const files = {
  'icon.svg': icon('sky'),
  'icon-1024.svg': icon('sky', { size: 1024 }),
  'icon-sunset.svg': icon('sunset'),
  'icon-simple.svg': icon('sky', { detail: false }),
  'wordmark.svg': wordmark(),
  'logo-lockup.svg': lockup(),
};
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(resolve(OUT, name), svg, 'utf8');
  console.log('wrote', name);
}

/* -------- optional PNG export: node tools/build-logo.mjs --png ------------
   Needs the rasteriser:  npm i -D @resvg/resvg-js                          */
if (process.argv.includes('--png')) {
  let Resvg;
  try {
    ({ Resvg } = await import('@resvg/resvg-js'));
  } catch {
    console.error('PNG export skipped - run: npm i -D @resvg/resvg-js');
    process.exit(0);
  }
  const png = [
    ['icon.svg', 'icon-1024.png', 1024],
    ['icon.svg', 'icon-512.png', 512],
    ['icon.svg', 'icon-192.png', 192],
    ['icon.svg', 'icon-180.png', 180],
    ['icon-sunset.svg', 'icon-sunset-512.png', 512],
    ['icon-simple.svg', 'favicon-64.png', 64],
    ['icon-simple.svg', 'favicon-32.png', 32],
    ['wordmark.svg', 'wordmark.png', 1080],
    ['logo-lockup.svg', 'logo-lockup.png', 1520],
  ];
  for (const [src, out, w] of png) {
    const img = new Resvg(files[src], {
      fitTo: { mode: 'width', value: w },
      font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
    }).render().asPng();
    writeFileSync(resolve(OUT, out), img);
    console.log('wrote', out);
  }
}
