/* Canvas scene: the store floor, its fixtures, everyone walking around,
   the thought bubbles and the joystick. Painter's algorithm on (x + y). */
window.MSM = window.MSM || {};

(function () {
  const iso = MSM.iso, U = MSM.util, CFG = MSM.CFG, P = MSM.CFG.PLAN;

  const R = MSM.render = {
    canvas: null, ctx: null, w: 0, h: 0,
    pops: [],

    setup(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
      addEventListener('resize', () => this.resize());
    },

    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2.5);
      const r = this.canvas.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      iso.fit(this.w, this.h);
    },

    pop(x, y, z, text, color) {
      this.pops.push({ x, y, z, text, color, t: 0, dx: (Math.random() - 0.5) * 24 });
      if (this.pops.length > 40) this.pops.shift();
    },
  };

  /* ------------------------------------------------------------- helpers */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, str, x, y, size, color, align = 'center', weight = 800) {
    ctx.font = `${weight} ${size}px 'Baloo 2','Fredoka','Nunito','Segoe UI',system-ui,sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  const box = (ctx, b, z0, z1, c) => iso.box(ctx, b.x0, b.y0, b.x1, b.y1, z0, z1, c);

  function shadow(ctx, x, y, r) {
    const s = iso.s(x, y, 0);
    ctx.fillStyle = '#16295C22';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, r * iso.TW * 0.5, r * iso.TH * 0.5, 0, 0, 7);
    ctx.fill();
  }

  /** Paint one unit of a product standing at a world position. */
  function item(ctx, prod, x, y, z, scale) {
    const s = iso.s(x, y, z);
    MSM.art.draw(ctx, prod.art, s.x, s.y, iso.TW * (scale || 0.34), prod.color);
  }

  /* --------------------------------------------------------------- floor */
  function drawFloor(ctx) {
    const B = CFG.WORLD, M = 0.25, WALL = 2.2;
    const store = MSM.econ.store();

    iso.box(ctx, -M, -M, B.W + M, B.H + M, -0.5, 0, '#FFC53D');
    iso.tile(ctx, -M, -M, B.W + M, B.H + M, 0, '#EEF3FA');

    /* Three zones rather than one flat checkerboard: the green back where
       things grow, the warm sales floor, and a cool strip by the door. */
    const ZONES = [
      { y0: -M,   y1: 2.65,    a: '#A9E4A2', b: '#9FDD98' },
      { y0: 2.65, y1: 8.85,    a: '#FFD9C6', b: '#FBD1BC' },
      { y0: 8.85, y1: B.H + M, a: '#DCE4EE', b: '#D3DCE8' },
    ];
    ZONES.forEach((z) => {
      for (let x = 0; x < B.W; x++) {
        for (let y = Math.floor(z.y0); y < Math.ceil(z.y1); y++) {
          const t0 = Math.max(y, z.y0), t1 = Math.min(y + 1, z.y1);
          if (t1 <= t0) continue;
          iso.tile(ctx, x, t0, x + 1, t1, 0.004, (x + y) % 2 === 0 ? z.a : z.b);
        }
      }
      iso.tile(ctx, -M, z.y1 - 0.05, B.W + M, z.y1, 0.006, '#FFFFFF');
    });

    iso.box(ctx, -M, -M, 0, B.H + M, 0, WALL, '#F3F7FD');
    iso.box(ctx, -M, -M, B.W + M, 0, 0, WALL, '#F3F7FD');
    iso.box(ctx, -M - 0.05, -M - 0.05, 0.04, B.H + M, WALL, WALL + 0.12, '#FFC53D');
    iso.box(ctx, -M - 0.05, -M - 0.05, B.W + M, 0.04, WALL, WALL + 0.12, '#FFC53D');
    for (let y = 3; y < B.H - 1; y++) iso.faceR(ctx, 0, y + 0.25, y + 0.85, 1.35, 1.9, '#CDEEFF');

    // store name painted on the back wall
    iso.faceL(ctx, 0, 1.4, B.W - 1.4, 0.55, 1.2, U.shade(store.color, 0.1));
    const o = iso.s(1.4, 0, 1.2);
    ctx.save();
    ctx.transform((iso.TW / 2) / iso.ZH, (iso.TH / 2) / iso.ZH, 0, 1, o.x, o.y);
    text(ctx, store.name.toUpperCase(), (B.W / 2 - 1.4) * iso.ZH, 0.33 * iso.ZH, 0.26 * iso.ZH, '#FFFFFF');
    ctx.restore();

    iso.tile(ctx, 3.4, B.H - 0.9, 4.6, B.H - 0.1, 0.008, '#FFC53D');
  }

  /* ------------------------------------------------------------ fixtures */
  /* Where a product comes from: a crop bed, a fenced animal, or a machine.
     Each shows what it is holding and, for animals and machines, what it has
     left to eat — an empty trough is why the shelf ran dry. */
  function drawSource(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.crate;
    const kind = prod.source.kind;

    if (kind === 'crop') {
      iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.16, '#8A5A2B');
      iso.tile(ctx, b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1 - 0.06, 0.162, '#6B4420');
      const cols = 4, rows = 2;
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          const idx = r * cols + k;
          const gx = b.x0 + 0.2 + k * ((b.x1 - b.x0 - 0.4) / (cols - 1));
          const gy = b.y0 + 0.3 + r * 0.5;
          if (idx < ps.out) item(ctx, prod, gx, gy, 0.16, 0.28);
          else {
            const sp = iso.s(gx, gy, 0.16);
            ctx.fillStyle = '#4E9A4A';
            ctx.beginPath();
            ctx.ellipse(sp.x, sp.y - iso.TW * 0.03, iso.TW * 0.045, iso.TW * 0.07, 0, 0, 7);
            ctx.fill();
          }
        }
      }
    } else if (kind === 'cow' || kind === 'chicken') {
      iso.tile(ctx, b.x0, b.y0, b.x1, b.y1, 0.006, '#8FD48A');
      iso.tile(ctx, b.x0 + 0.25, b.y0 + 0.25, b.x1 - 0.25, b.y1 - 0.25, 0.008, '#7FC97A');
      // post-and-rail fence round the pen
      for (let f = 0; f < 2; f++) {
        const yy = f ? b.y1 - 0.08 : b.y0;
        iso.box(ctx, b.x0, yy, b.x1, yy + 0.08, 0.18, 0.3, '#D9A05A');
      }
      iso.box(ctx, b.x0, b.y0, b.x0 + 0.08, b.y1, 0.18, 0.3, '#D9A05A');
      for (let px = b.x0; px <= b.x1 - 0.05; px += 0.55) {
        iso.box(ctx, px, b.y1 - 0.1, px + 0.1, b.y1, 0, 0.42, '#C08A4E');
        iso.box(ctx, px, b.y0, px + 0.1, b.y0 + 0.1, 0, 0.42, '#C08A4E');
      }

      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      if (kind === 'cow') drawCow(ctx, cx - 0.25, cy + 0.1);
      else {
        drawHen(ctx, cx - 0.45, cy - 0.15);
        drawHen(ctx, cx + 0.25, cy + 0.35);
      }

      // trough along the front
      iso.box(ctx, b.x0 + 0.35, b.y1 - 0.55, b.x0 + 1.35, b.y1 - 0.25, 0, 0.22, '#A9743C');
      iso.tile(ctx, b.x0 + 0.42, b.y1 - 0.5, b.x0 + 1.28, b.y1 - 0.3, 0.222, '#7A5228');
      for (let k = 0; k < Math.min(ps.feed, 4); k++) {
        item(ctx, MSM.econ.prod(prod.source.inputIndex),
             b.x0 + 0.55 + k * 0.25, b.y1 - 0.4, 0.22, 0.2);
      }
    } else {
      drawOven(ctx, b, ps);
    }

    // finished goods waiting to be picked up
    if (kind === 'cow' || kind === 'chicken') {
      for (let k = 0; k < Math.min(ps.out, 6); k++) {
        item(ctx, prod, b.x0 + 0.5 + (k % 3) * 0.3, b.y1 + 0.2 + (((k / 3) | 0) * 0.2), 0, 0.3);
      }
    }

    /* One short tag, and only when it tells you something. Three layers of
       labels over every station made the floor unreadable. */
    const inp = prod.source.inputIndex;
    const hungry = inp >= 0 && ps.feed <= 1;
    if (!hungry && ps.out === 0) return;

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, kind === 'machine' ? 1.5 : 1.2);
    tag(ctx, t.x, t.y,
        hungry ? MSM.econ.prod(inp).glyph + ' ' + ps.feed : prod.glyph + ' ' + ps.out,
        hungry ? '#FFD6D6' : '#FFFFFF');
  }

  /**
   * Run `fn` in a coordinate space painted flat onto a front-facing wall
   * (the y = yw plane). Local units are screen pixels; the x axis carries the
   * wall's foreshortening, so arcs and text sit on the surface properly.
   */
  function onFace(ctx, x0, yw, ztop, fn) {
    const o = iso.s(x0, yw, ztop);
    ctx.save();
    ctx.transform((iso.TW / 2) / iso.ZH, (iso.TH / 2) / iso.ZH, 0, 1, o.x, o.y);
    fn(ctx, iso.ZH);
    ctx.restore();
  }

  /* A stone baker's oven: plinth, arched mouth with the fire showing, a
     chimney, and loaves resting on the hot top. The flat grey box with a
     slot in it read as a photocopier. */
  function drawOven(ctx, b, ps) {
    const w = b.x1 - b.x0, d = b.y1 - b.y0;

    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.22, '#6E6257');            // plinth
    iso.box(ctx, b.x0 + 0.07, b.y0 + 0.07, b.x1 - 0.07, b.y1 - 0.07, 0.22, 1.02, '#C4A98C');
    iso.tile(ctx, b.x0 + 0.12, b.y0 + 0.12, b.x1 - 0.12, b.y1 - 0.12, 1.022, '#DCC5A8');

    // brick courses on the front
    for (let k = 0; k < 3; k++) {
      const z = 0.3 + k * 0.24;
      iso.faceL(ctx, b.y1 - 0.07, b.x0 + 0.07, b.x1 - 0.07, z, z + 0.02, '#B0987C');
    }

    // arched mouth, painted onto the front face
    onFace(ctx, b.x0 + 0.07, b.y1 - 0.07, 0.92, (c, unit) => {
      const aw = (w - 0.5) * unit, ah = 0.5 * unit, ax = 0.22 * unit, ay = 0.1 * unit;
      c.beginPath();
      c.moveTo(ax, ay + ah);
      c.lineTo(ax, ay + aw * 0.28);
      c.arc(ax + aw / 2, ay + aw * 0.28, aw / 2, Math.PI, 0);
      c.lineTo(ax + aw, ay + ah);
      c.closePath();
      c.fillStyle = '#2C2620'; c.fill();

      c.save(); c.clip();
      c.fillStyle = '#FF8A2B';
      c.fillRect(ax, ay + ah * 0.45, aw, ah);
      c.fillStyle = '#FFC53D';
      c.fillRect(ax + aw * 0.12, ay + ah * 0.62, aw * 0.76, ah);
      c.restore();

      c.fillStyle = '#8B95A5';                                  // handle bar
      c.fillRect(ax - 0.04 * unit, ay + ah * 1.02, aw + 0.08 * unit, 0.06 * unit);
    });

    // chimney
    iso.box(ctx, b.x1 - 0.42, b.y0 + 0.16, b.x1 - 0.2, b.y0 + 0.38, 1.02, 1.5, '#7E7166');
    iso.box(ctx, b.x1 - 0.46, b.y0 + 0.12, b.x1 - 0.16, b.y0 + 0.42, 1.5, 1.58, '#655A50');

    // whatever it has baked, cooling on top
    for (let k = 0; k < Math.min(ps.out, 3); k++) {
      item(ctx, MSM.econ.prod(3), b.x0 + 0.35 + k * 0.32, b.y0 + 0.55, 1.02, 0.26);
    }
  }

  /* Side-on cow: barrel body, black patches, a proper head with ears, muzzle
     and horns, four legs and a tail. The old blob had none of that. */
  function drawCow(ctx, gx, gy) {
    const u = iso.TW / 64, s = iso.s(gx, gy, 0);
    const bw = 34 * u, bh = 19 * u;
    const bodyY = s.y - bh - 9 * u;
    shadow(ctx, gx, gy, 0.62);

    // back legs then front legs, so the body sits between them
    [[-11, 0], [7, 0]].forEach(([dx]) => {
      rrect(ctx, s.x + dx * u, bodyY + bh - 2 * u, 6 * u, 12 * u, 2.6 * u);
      ctx.fillStyle = '#E4E9F0'; ctx.fill();
      rrect(ctx, s.x + dx * u, bodyY + bh + 6 * u, 6 * u, 4 * u, 2 * u);
      ctx.fillStyle = '#3A3F49'; ctx.fill();
    });

    // tail
    ctx.beginPath();
    ctx.moveTo(s.x + bw / 2 - 2 * u, bodyY + 4 * u);
    ctx.quadraticCurveTo(s.x + bw / 2 + 6 * u, bodyY + 10 * u, s.x + bw / 2 + 3 * u, bodyY + 18 * u);
    ctx.strokeStyle = '#E4E9F0'; ctx.lineWidth = 2.6 * u; ctx.lineCap = 'round'; ctx.stroke();

    // barrel
    rrect(ctx, s.x - bw / 2, bodyY, bw, bh, bh * 0.46);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.save();
    rrect(ctx, s.x - bw / 2, bodyY, bw, bh, bh * 0.46);
    ctx.clip();
    ctx.fillStyle = '#3A3F49';
    [[-5, 4, 7, 5], [9, 11, 5.5, 4], [4, 2, 4, 3]].forEach(([dx, dy, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(s.x + dx * u, bodyY + dy * u, rx * u, ry * u, 0.4, 0, 7);
      ctx.fill();
    });
    ctx.restore();

    // udder
    ell2(ctx, s.x - 2 * u, bodyY + bh - 1 * u, 6 * u, 4 * u, '#FFB6C1');

    // head
    const hx = s.x - bw / 2 - 6 * u, hy2 = bodyY + 2 * u;
    ctx.fillStyle = '#3A3F49';
    [[-4, -7], [7, -8]].forEach(([dx, dy]) => {              // ears
      ctx.beginPath();
      ctx.ellipse(hx + dx * u, hy2 + dy * u, 4 * u, 2.6 * u, dx < 0 ? -0.6 : 0.6, 0, 7);
      ctx.fill();
    });
    ctx.fillStyle = '#E8E2D2';                                // horns
    [[-1, -10], [6, -11]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.arc(hx + dx * u, hy2 + dy * u, 2.2 * u, 0, 7); ctx.fill();
    });
    rrect(ctx, hx - 7 * u, hy2 - 7 * u, 17 * u, 16 * u, 6 * u);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    rrect(ctx, hx - 6 * u, hy2 + 3 * u, 13 * u, 8 * u, 4 * u);
    ctx.fillStyle = '#FFC9D4'; ctx.fill();
    ctx.fillStyle = '#3A3F49';
    [[-2.5, 7.5], [2.5, 7]].forEach(([dx, dy]) => {           // nostrils
      ctx.beginPath(); ctx.ellipse(hx + dx * u, hy2 + dy * u, 1.3 * u, 1 * u, 0, 0, 7); ctx.fill();
    });
    [[-2, 0], [7, -0.5]].forEach(([dx, dy]) => {              // eyes
      ctx.beginPath(); ctx.arc(hx + dx * u, hy2 + dy * u, 1.7 * u, 0, 7); ctx.fill();
    });
  }

  /** A hen: plump body, comb, beak, tail feathers. */
  function drawHen(ctx, gx, gy) {
    const u = iso.TW / 64, s = iso.s(gx, gy, 0);
    const by = s.y - 15 * u;
    shadow(ctx, gx, gy, 0.34);
    ctx.fillStyle = '#E8A33C';                                // legs
    [[-3, 0], [3, 0]].forEach(([dx]) => {
      rrect(ctx, s.x + dx * u - 1 * u, by + 11 * u, 2 * u, 5 * u, 1 * u); ctx.fill();
    });
    ctx.beginPath();                                          // tail
    ctx.moveTo(s.x + 7 * u, by + 6 * u);
    ctx.quadraticCurveTo(s.x + 15 * u, by - 2 * u, s.x + 11 * u, by + 9 * u);
    ctx.closePath(); ctx.fillStyle = '#E4E9F0'; ctx.fill();
    ell2(ctx, s.x, by + 5 * u, 9 * u, 7.5 * u, '#FFFFFF');     // body
    ell2(ctx, s.x - 6 * u, by - 3 * u, 5.5 * u, 5.5 * u, '#FFFFFF');  // head
    ctx.fillStyle = '#E0413C';                                // comb
    [[-7.5, -8], [-5, -9.5], [-2.5, -8.5]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.arc(s.x + dx * u, by + dy * u, 2.1 * u, 0, 7); ctx.fill();
    });
    ctx.fillStyle = '#E8A33C';                                // beak
    ctx.beginPath();
    ctx.moveTo(s.x - 11 * u, by - 3 * u);
    ctx.lineTo(s.x - 15 * u, by - 1.5 * u);
    ctx.lineTo(s.x - 11 * u, by - 0.5 * u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3A3F49';
    ctx.beginPath(); ctx.arc(s.x - 7 * u, by - 4 * u, 1.5 * u, 0, 7); ctx.fill();
  }

  const ell2 = (ctx, x, y, rx, ry, c) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fillStyle = c; ctx.fill();
  };

  /* Stand on this to pay for the next level of that product. */
  function drawLevelPad(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.pad;
    const cost = MSM.econ.upgradeCost(n, 1);
    const pct = U.clamp((ps.pay || 0) / cost, 0, 1);

    iso.tile(ctx, b.x0, b.y0, b.x1, b.y1, 0.01, '#FFFFFF');
    iso.tile(ctx, b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1 - 0.06, 0.012, '#E7EDF6');
    if (pct > 0) {
      iso.tile(ctx, b.x0 + 0.06, b.y0 + 0.06,
               b.x0 + 0.06 + (b.x1 - b.x0 - 0.12) * pct, b.y1 - 0.06, 0.014, '#5FE08D');
    }
    const c = iso.s((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0.02);
    const h = Math.max(26, iso.TW * 0.3);
    ctx.font = `800 ${h * 0.36}px 'Baloo 2','Nunito',system-ui,sans-serif`;
    const label = '$' + U.money(cost);
    const w = Math.max(ctx.measureText(label).width + h * 0.7, h * 2);
    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    rrect(ctx, c.x - w / 2, c.y - h - 4, w, h, h * 0.28);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    text(ctx, 'Lv ' + ps.level, c.x, c.y - h * 0.68 - 4, h * 0.32, '#8A95AB');
    text(ctx, label, c.x, c.y - h * 0.26 - 4, h * 0.36,
         MSM.state.cash >= cost ? '#2CA85C' : '#98A6C4');
  }

  function drawShelf(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.shelf;
    // legs, a warm timber carcass and a pale display bed
    [[b.x0 + 0.06, b.y0 + 0.06], [b.x1 - 0.14, b.y0 + 0.06],
     [b.x0 + 0.06, b.y1 - 0.14], [b.x1 - 0.14, b.y1 - 0.14]].forEach(([lx, ly]) => {
      iso.box(ctx, lx, ly, lx + 0.08, ly + 0.08, 0, 0.24, '#8A5A2B');
    });
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0.24, 0.56, '#C08A4E');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.562, '#F6E7CE');
    iso.faceL(ctx, b.y1, b.x0 + 0.08, b.x1 - 0.08, 0.3, 0.5, U.shade(prod.color, -0.05));
    iso.faceL(ctx, b.y1, b.x0 + 0.2, b.x1 - 0.2, 0.34, 0.46, '#FFFFFF');

    for (let k = 0; k < ps.shelf; k++) {
      item(ctx, prod, b.x0 + 0.3 + (k % 4) * 0.28, b.y0 + 0.24 + (((k / 4) | 0) * 0.32), 0.56, 0.3);
    }

    // shelf tag only when it is running low — a full shelf needs no label
    if (ps.shelf > CFG.SHELF_CAP * 0.5) return;
    const t = iso.s((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 1.15);
    tag(ctx, t.x, t.y, `${prod.glyph} ${ps.shelf}`, ps.shelf === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  /** Small floating label over a fixture. */
  function tag(ctx, x, y, label, bg) {
    const h = Math.max(20, iso.TW * 0.24);
    ctx.font = `800 ${h * 0.52}px 'Baloo 2','Nunito',system-ui,sans-serif`;
    const w = ctx.measureText(label).width + h * 0.8;
    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
    rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
    text(ctx, label, x, y, h * 0.52, '#16295C');
  }

  /* The doorway out: an arch against the side wall, a mat, and a sign saying
     where it goes — or what it would go to if you bought it. */
  function drawDoor(ctx) {
    const d = P.door;
    const to = MSM.game.nextStore();
    const tease = to < 0 ? MSM.game.teaseStore() : -1;
    const store = CFG.STORES[to >= 0 ? to : tease] || null;
    const open = to >= 0;

    iso.box(ctx, d.x0 - 0.12, d.y0 - 0.12, d.x1 + 0.12, d.y0 + 0.1, 0, 1.7,
            open ? '#FFC53D' : '#B9C4D6');
    iso.tile(ctx, d.x0, d.y0, d.x1, d.y1, 0.01, open ? '#FFE9AE' : '#E4E9F1');
    iso.tile(ctx, d.x0 + 0.1, d.y0 + 0.1, d.x1 - 0.1, d.y1 - 0.1, 0.012,
             open ? '#FFC53D' : '#D6DCE7');
    iso.faceL(ctx, d.y0 + 0.1, d.x0, d.x1, 0.1, 1.5, open ? '#3E4A66' : '#8E9AB2');

    // how far through the door you are
    const hold = MSM.game.doorHold || 0;
    if (open && hold > 0) {
      const pct = U.clamp(hold / CFG.DOOR_HOLD, 0, 1);
      iso.tile(ctx, d.x0 + 0.1, d.y0 + 0.1,
               d.x0 + 0.1 + (d.x1 - d.x0 - 0.2) * pct, d.y1 - 0.1, 0.014, '#5FE08D');
    }

    if (!store) return;
    const c = iso.s((d.x0 + d.x1) / 2, d.y0, 1.95);
    const w = Math.max(112, iso.TW * 1.35), h = Math.max(40, iso.TW * 0.46);
    ctx.save();
    ctx.shadowColor = '#0b1c3d40'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    rrect(ctx, c.x - w / 2, c.y - h, w, h, h * 0.3);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    text(ctx, open ? 'GO TO  →' : 'LOCKED', c.x, c.y - h * 0.68, h * 0.27, '#8A95AB');
    text(ctx, store.glyph + '  ' + store.name, c.x, c.y - h * 0.28, h * 0.3,
         open ? '#16295C' : '#98A6C4');
  }

  /* The bin: walk up to it to empty your arms. */
  function drawBin(ctx) {
    const b = P.bin, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    iso.box(ctx, b.x0 + 0.08, b.y0 + 0.08, b.x1 - 0.08, b.y1 - 0.08, 0, 0.62, '#5A6472');
    iso.tile(ctx, b.x0 + 0.12, b.y0 + 0.12, b.x1 - 0.12, b.y1 - 0.12, 0.622, '#39424F');
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0.62, 0.72, '#6E7887');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.722, '#828D9E');
    iso.faceL(ctx, b.y1 - 0.08, b.x0 + 0.2, b.x1 - 0.2, 0.16, 0.5, '#39424F');
    const t = iso.s(cx, cy, 0.95);
    text(ctx, '🗑️', t.x, t.y, iso.TW * 0.26, '#000');
  }

  /* Where you last tapped, fading out. */
  function drawWalkMark(ctx) {
    const m = MSM.game.walkTo;
    if (!m) return;
    const s = iso.s(m.x, m.y, 0.01);
    const age = U.clamp(1 - (m.t || 0) / 0.7, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.35 + age * 0.4;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, iso.TW * (0.16 + (1 - age) * 0.06), iso.TH * (0.16 + (1 - age) * 0.06), 0, 0, 7);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, iso.TW * 0.05, iso.TH * 0.05, 0, 0, 7);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
  }

  function drawTill(ctx) {
    const b = P.till;
    box(ctx, b, 0, 0.55, '#FFC53D');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.552, '#FFE9AE');
    iso.box(ctx, b.x0 + 0.15, b.y0 + 0.12, b.x0 + 0.62, b.y0 + 0.46, 0.55, 0.88, '#4E5D80');
    iso.tile(ctx, b.x0 + 0.19, b.y0 + 0.16, b.x0 + 0.58, b.y0 + 0.42, 0.882, '#8FD8FF');
  }

  /* -------------------------------------------------------------- bodies */
  /* Chunky little figures: legs, a bean body, swinging arms and a big round
     head. Staff wear a strong colour; customers are pale so the staff read
     as staff at a glance. */
  const SKIN = '#FFD9B0';

  function drawBody(ctx, e, look) {
    const u = iso.TW / 64;
    const s = iso.s(e.x, e.y, 0);
    const bw = 19 * u, bh = 20 * u, hr = 11 * u;
    const phase = e.moving ? Math.sin(e.walk * 10) : 0;
    const bob = e.moving ? Math.abs(phase) * 1.7 * u : 0;

    const feet = s.y;
    const bodyBot = feet - 2.5 * u - bob;
    const bodyTop = bodyBot - bh;
    const dark = U.shade(look.body, -0.3);

    shadow(ctx, e.x, e.y, 0.36);

    // legs — they scissor while walking
    [-1, 1].forEach((d) => {
      const lift = e.moving ? Math.max(0, phase * d) * 3 * u : 0;
      rrect(ctx, s.x + d * 4.2 * u - 2.6 * u, bodyBot - 3 * u - lift, 5.2 * u, 7 * u + lift, 2.6 * u);
      ctx.fillStyle = look.legs || dark; ctx.fill();
    });

    // far arm, behind the body
    rrect(ctx, s.x - bw / 2 - 1.5 * u, bodyTop + 5 * u - phase * 2.5 * u, 5 * u, 11 * u, 2.5 * u);
    ctx.fillStyle = dark; ctx.fill();

    // body
    rrect(ctx, s.x - bw / 2, bodyTop, bw, bh, bw * 0.44);
    ctx.fillStyle = look.body; ctx.fill();
    rrect(ctx, s.x - bw * 0.22, bodyTop + bh * 0.34, bw * 0.44, bh * 0.5, bw * 0.2);
    ctx.fillStyle = U.shade(look.body, 0.22); ctx.fill();

    // near arm, in front
    rrect(ctx, s.x + bw / 2 - 3.5 * u, bodyTop + 5 * u + phase * 2.5 * u, 5 * u, 11 * u, 2.5 * u);
    ctx.fillStyle = U.shade(look.body, -0.12); ctx.fill();

    // head
    const hy = bodyTop - hr * 0.62;
    ctx.beginPath(); ctx.arc(s.x, hy, hr, 0, 7);
    ctx.fillStyle = look.head || SKIN; ctx.fill();
    if (look.cap) {
      ctx.beginPath(); ctx.arc(s.x, hy, hr, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(s.x, hy); ctx.closePath();
      ctx.fillStyle = look.cap; ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, hy - hr * 0.06, hr * 1.02, Math.PI, 0);
      ctx.fillStyle = look.cap; ctx.fill();
    }

    // what they are carrying, stacked over the head
    const hold = e.hold || (e.carry && e.carryP >= 0 ? [e.carryP] : []);
    if (hold.length) {
      const size = iso.TW * 0.26, step = size * 0.44;
      hold.forEach((pi, k) => {
        const prod = MSM.econ.prod(pi);
        MSM.art.draw(ctx, prod.art, s.x, hy - hr * 0.95 - k * step, size, prod.color);
      });
      return { x: s.x, y: hy - hr * 0.95 - (hold.length - 1) * step - size };
    }
    return { x: s.x, y: hy - hr };
  }

  /** A customer with something in their basket. */
  function drawBasket(ctx, c) {
    if (!c.carry) return;
    const u = iso.TW / 64, s = iso.s(c.x, c.y, 0);
    const prod = MSM.econ.prod(c.carryP >= 0 ? c.carryP : c.want);
    const bx = s.x + 11 * u, by = s.y - 9 * u;
    MSM.art.draw(ctx, prod.art, bx, by - 1 * u, 13 * u, prod.color);
    rrect(ctx, bx - 8 * u, by - 5 * u, 16 * u, 9 * u, 2 * u);
    ctx.fillStyle = '#E4EBF5'; ctx.fill();
    rrect(ctx, bx - 8 * u, by - 5 * u, 16 * u, 2.6 * u, 1.3 * u);
    ctx.fillStyle = '#C2CFE0'; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by - 5 * u, 5 * u, Math.PI, 0);
    stroke2(ctx, '#C2CFE0', 1.8 * u);
  }

  const stroke2 = (ctx, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); };

  /** The whole point: what this customer came in for. */
  function drawBubble(ctx, c, head) {
    if (c.phase === 'queue' || c.phase === 'toQueue') return;
    const prod = MSM.econ.prod(c.want);
    const r = Math.max(17, iso.TW * 0.21);
    const x = head.x, y = head.y - r - 4 * (iso.TW / 64);

    // a gentle pulse while they wait, so an unserved want catches the eye
    const pulse = c.mood === 'wait' ? 1 + Math.sin(performance.now() / 260) * 0.07 : 1;
    const rp = r * pulse;

    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.arc(x, y, rp, 0, 7);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x - rp * 0.25, y + rp * 0.95, rp * 0.22, 0, 7);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();

    MSM.art.draw(ctx, prod.art, x, y + rp * 0.62, rp * 1.35, prod.color);
  }

  function drawCash(ctx, c) {
    const u = iso.TW / 64, s = iso.s(c.x, c.y, 0);
    shadow(ctx, c.x, c.y, 0.22);
    for (let k = 0; k < 3; k++) {
      rrect(ctx, s.x - 13 * u, s.y - 6 * u - k * 4 * u, 26 * u, 9 * u, 2 * u);
      ctx.fillStyle = k === 2 ? '#5FE08D' : '#41C673'; ctx.fill();
    }
    text(ctx, '$', s.x, s.y - 12 * u, 9 * u, '#0f6b3a');
  }

  function drawPops(ctx, dt) {
    for (let k = R.pops.length - 1; k >= 0; k--) {
      const p = R.pops[k];
      p.t += dt;
      if (p.t > 1.1) { R.pops.splice(k, 1); continue; }
      const s = iso.s(p.x, p.y, p.z + p.t * 0.9);
      ctx.globalAlpha = U.clamp(1.6 - p.t * 1.5, 0, 1);
      ctx.save();
      ctx.shadowColor = '#0b1c3d55'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
      text(ctx, p.text, s.x + p.dx, s.y, U.clamp(iso.TW * 0.17, 12, 24), p.color);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /* --------------------------------------------------------------- frame */
  R.frame = function (dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    drawFloor(ctx);

    const items = [];
    MSM.econ.store().products.forEach((prod, n) => {
      items.push({ d: prod.crate.x1 + prod.crate.y1, fn: () => drawSource(ctx, n) });
      items.push({ d: prod.pad.x1 + prod.pad.y1 - 0.5, fn: () => drawLevelPad(ctx, n) });
      if (prod.sell) items.push({ d: prod.shelf.x1 + prod.shelf.y1, fn: () => drawShelf(ctx, n) });
    });
    items.push({ d: P.till.x1 + P.till.y1, fn: () => drawTill(ctx) });
    items.push({ d: P.door.x1 + P.door.y1, fn: () => drawDoor(ctx) });
    items.push({ d: P.bin.x1 + P.bin.y1, fn: () => drawBin(ctx) });
    MSM.ent.cash.forEach((c) => items.push({ d: c.x + c.y, fn: () => drawCash(ctx, c) }));
    MSM.ent.customers.forEach((c) => items.push({
      d: c.x + c.y + 0.3,
      fn: () => {
        const head = drawBody(ctx, c, { body: c.shade, cap: c.color, legs: '#B9C4D6' });
        drawBasket(ctx, c);
        drawBubble(ctx, c, head);
      },
    }));
    if (MSM.ent.stocker) {
      const st = MSM.ent.stocker;
      items.push({ d: st.x + st.y + 0.3,
                   fn: () => drawBody(ctx, st, { body: '#2F80F0', cap: '#FFC53D', legs: '#1B4F9B' }) });
    }
    const p = MSM.ent.player;
    items.push({ d: p.x + p.y + 0.35,
                 fn: () => drawBody(ctx, p, { body: '#FF3D7F', cap: '#16295C', legs: '#B0264F' }) });

    items.sort((a, b) => a.d - b.d).forEach((it) => it.fn());
    drawPops(ctx, dt);
    drawWalkMark(ctx);
  };
})();
