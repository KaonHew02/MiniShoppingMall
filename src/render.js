/* Canvas scene: the store floor, its fixtures, everyone walking around,
   the thought bubbles and the joystick. Painter's algorithm on (x + y). */
window.MSM = window.MSM || {};

(function () {
  const iso = MSM.iso, U = MSM.util, CFG = MSM.CFG, P = MSM.CFG.PLAN;

  const R = MSM.render = {
    canvas: null, ctx: null, w: 0, h: 0,
    pops: [],
    stick: null,                 // {ox,oy,dx,dy} while a finger is down

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
  const TAU2 = Math.PI * 2;

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

    /* Zones, then departments on top. Every store paints its own bands —
       the mini mart's growing strip and shop floor, the cafe's warm wood. */
    (P.zones || []).forEach((z) => {
      for (let x = 0; x < B.W; x++) {
        for (let y = Math.floor(z.y0); y < Math.ceil(z.y1); y++) {
          const t0 = Math.max(y, z.y0), t1 = Math.min(y + 1, z.y1);
          if (t1 <= t0) continue;
          iso.tile(ctx, x, t0, x + 1, t1, 0.004, (x + y) % 2 === 0 ? z.a : z.b);
        }
      }
      iso.tile(ctx, -M, z.y1 - 0.05, B.W + M, z.y1, 0.006, '#FFFFFF');
    });

    /* Patches on top of the bands — the mini mart's farmyard and orchard. */
    (P.patches || []).forEach((z) => {
      iso.tile(ctx, z.x0, z.y0, z.x1, z.y1, 0.005, z.c);
      if (z.line === 'x1') iso.tile(ctx, z.x1 - 0.05, z.y0, z.x1, z.y1, 0.007, '#FFFFFF');
      if (z.line === 'x0') iso.tile(ctx, z.x0, z.y0, z.x0 + 0.05, z.y1, 0.007, '#FFFFFF');
    });

    /* Departments: a tinted floor block per section with its name on it, so
       the shop reads as vegetables / fruit / dairy rather than one big room. */
    (P.sections || []).forEach((z) => {
      iso.tile(ctx, z.x0, z.y0, z.x1, z.y1, 0.009, z.tint);
      iso.tile(ctx, z.x0, z.y0, z.x1, z.y0 + 0.06, 0.011, '#FFFFFF');
      iso.tile(ctx, z.x0, z.y1 - 0.06, z.x1, z.y1, 0.011, '#FFFFFF');
      /* Centre the name in its block and shrink it to fit — anchored at a
         corner, a long name like DAIRY & BAKERY sprawled out of the box. */
      const c = iso.s((z.x0 + z.x1) / 2, z.y0 + 0.30, 0.012);
      const size = Math.max(10, iso.TW * 0.15);
      ctx.save();
      ctx.transform(1, 0.5, -1, 0.5, c.x, c.y);          // lie the text on the floor
      ctx.font = `800 ${size}px 'Baloo 2','Fredoka','Nunito','Segoe UI',system-ui,sans-serif`;
      const tw = ctx.measureText(z.name).width;
      const fit = Math.min(1, ((z.x1 - z.x0 - 0.6) * (iso.TW / 2)) / tw);
      ctx.scale(fit, fit);
      text(ctx, z.name, 0, 0, size, '#8A7566');
      ctx.restore();
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

    iso.tile(ctx, P.entrance.x - 0.7, B.H - 0.9, P.entrance.x + 0.7, B.H - 0.1, 0.008, '#FFC53D');
  }

  /* ------------------------------------------------------------ fixtures */
  /* A construction plot: hatched floor, a fill bar for what you have paid in
     so far, and a card saying what it will be and what is left to pay. Used
     by every product line, every cafe machine and every cafe table. */
  function buildPlot(ctx, b, paid, cost, title) {
    const pct = U.clamp(cost > 0 ? paid / cost : 1, 0, 1);
    iso.tile(ctx, b.x0, b.y0, b.x1, b.y1, 0.012, '#FFC53D');
    iso.tile(ctx, b.x0 + 0.08, b.y0 + 0.08, b.x1 - 0.08, b.y1 - 0.08, 0.014, '#FFF0C4');
    if (pct > 0) {
      iso.tile(ctx, b.x0 + 0.08, b.y0 + 0.08,
               b.x0 + 0.08 + (b.x1 - b.x0 - 0.16) * pct, b.y1 - 0.08, 0.016, '#5FE08D');
    }
    const c = iso.s((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0.02);
    const h = Math.max(30, iso.TW * 0.34);
    ctx.save();
    ctx.shadowColor = '#0b1c3d40'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    rrect(ctx, c.x - h * 1.9, c.y - h - 6, h * 3.8, h, h * 0.3);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    text(ctx, title, c.x, c.y - h * 0.7 - 6, h * 0.26, '#8A95AB');
    text(ctx, '$' + U.money(Math.max(0, cost - paid)), c.x, c.y - h * 0.28 - 6, h * 0.36,
         MSM.state.cash > 0 ? '#2CA85C' : '#98A6C4');
  }

  /* Where a product comes from: a crop bed, a fenced animal, or a machine.
     Each shows what it is holding and, for animals and machines, what it has
     left to eat — an empty trough is why the shelf ran dry. */
  function drawSource(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.crate;
    const kind = prod.source.kind;

    /* Not built yet: the NEXT line in the sequence is a build plot with its
       price; anything later is empty floor you have not earned yet. */
    if (!ps.built) {
      if (MSM.econ.nextBuild() !== n) return;
      buildPlot(ctx, b, ps.buildPaid, prod.buildCost,
                prod.glyph + ' ' + prod.source.label.toUpperCase());
      return;
    }

    // the coffee shop's supply crates and menu plaques paint themselves
    if (kind === 'supply' || kind === 'menu') { MSM.cafe.drawSource(ctx, n); return; }
    // and so does the sport outlet's stockroom, the boutique's, the techhub's
    if (kind === 'stock') { MSM.sports.drawSource(ctx, n); return; }
    if (kind === 'wardrobe') { MSM.boutique.drawSource(ctx, n); return; }
    if (kind === 'techstock') { MSM.tech.drawSource(ctx, n); return; }
    if (kind === 'freezer') { MSM.food.drawSource(ctx, n); return; }

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
    } else if (kind === 'cow' || kind === 'chicken' || kind === 'pig') {
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
      else if (kind === 'pig') drawPig(ctx, cx - 0.2, cy + 0.1);
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
    } else if (kind === 'tree') {
      drawTree(ctx, prod, ps, b);
    } else if (kind === 'machine') {
      drawOven(ctx, b, ps, prod);
    } else if (kind === 'vat') {
      drawVat(ctx, b, ps, prod);
    } else {
      /* Generic maker for the stores that have no farm behind them. */
      iso.box(ctx, b.x0 + 0.08, b.y0 + 0.1, b.x1 - 0.08, b.y1 - 0.1, 0, 0.72, '#7A8494');
      iso.tile(ctx, b.x0 + 0.14, b.y0 + 0.16, b.x1 - 0.14, b.y1 - 0.16, 0.722, '#9AA5B5');
      iso.faceL(ctx, b.y1 - 0.1, b.x0 + 0.18, b.x1 - 0.18, 0.14, 0.5, U.shade(prod.color, -0.1));
      iso.faceL(ctx, b.y1 - 0.1, b.x0 + 0.3, b.x1 - 0.3, 0.24, 0.42, '#CDEEFF');
      for (let k = 0; k < Math.min(ps.out, 4); k++) {
        item(ctx, prod, b.x0 + 0.35 + (k % 2) * 0.4, b.y0 + 0.3 + ((k / 2) | 0) * 0.3, 0.72, 0.28);
      }
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

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2,
                    kind === 'machine' || kind === 'vat' ? 1.5 : 1.2);
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
  /* The yogurt vat: a stainless tub with two hoop bands, a lid proud of the
     rim, and a sight glass on the front that fills with the milk it is
     holding — so you can see it is hungry without reading the tag. */
  function drawVat(ctx, b, ps, prod) {
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.18, '#6E7686');
    iso.box(ctx, b.x0 + 0.12, b.y0 + 0.12, b.x1 - 0.12, b.y1 - 0.12, 0.18, 0.92, '#C3D0E0');
    iso.tile(ctx, b.x0 + 0.16, b.y0 + 0.16, b.x1 - 0.16, b.y1 - 0.16, 0.922, '#E4EBF5');

    [0.34, 0.72].forEach((z) => {
      iso.faceL(ctx, b.y1 - 0.12, b.x0 + 0.12, b.x1 - 0.12, z, z + 0.05, '#98A7BC');
      iso.faceR(ctx, b.x1 - 0.12, b.y0 + 0.12, b.y1 - 0.12, z, z + 0.05, '#8B9AB0');
    });

    iso.box(ctx, b.x0 + 0.22, b.y0 + 0.22, b.x1 - 0.22, b.y1 - 0.22, 0.92, 1.06, '#AFBED2');
    iso.tile(ctx, b.x0 + 0.26, b.y0 + 0.26, b.x1 - 0.26, b.y1 - 0.26, 1.062, '#D7E1EE');
    const mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
    iso.box(ctx, mx - 0.1, my - 0.1, mx + 0.1, my + 0.1, 1.06, 1.18, '#7E8DA3');

    onFace(ctx, b.x0 + 0.12, b.y1 - 0.12, 0.9, (c, unit) => {
      const w = (b.x1 - b.x0 - 0.24) * unit, h = 0.72 * unit;
      const gx = w * 0.14, gw = w * 0.11, gy = h * 0.14, gh = h * 0.58;
      c.fillStyle = '#8B9AB0'; c.fillRect(gx, gy, gw, gh);
      const lvl = U.clamp(ps.feed / CFG.FEED_CAP, 0, 1);
      c.fillStyle = '#F7FAFE';
      c.fillRect(gx + gw * 0.2, gy + gh * (1 - lvl * 0.9), gw * 0.6, gh * lvl * 0.9);

      c.fillStyle = '#7E8DA3';                                   // tap
      c.fillRect(w * 0.6, h * 0.4, w * 0.2, h * 0.1);
      c.fillRect(w * 0.74, h * 0.4, w * 0.06, h * 0.3);
    });

    for (let k = 0; k < Math.min(ps.out, 3); k++) {
      item(ctx, prod, b.x0 + 0.45 + k * 0.35, b.y0 + 0.55, 1.18, 0.24);
    }
  }

  function drawOven(ctx, b, ps, prod) {
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
      item(ctx, prod, b.x0 + 0.35 + k * 0.32, b.y0 + 0.55, 1.02, 0.26);
    }
  }

  /* A fruit tree: trunk, a cluster canopy, and the crop hanging in it. */
  function drawTree(ctx, prod, ps, b) {
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    iso.tile(ctx, b.x0, b.y0, b.x1, b.y1, 0.006, '#8FD48A');
    iso.tile(ctx, cx - 0.42, cy - 0.34, cx + 0.42, cy + 0.34, 0.008, '#7A5228');

    const u = iso.TW / 64, s = iso.s(cx, cy, 0);
    shadow(ctx, cx, cy, 0.7);
    rrect(ctx, s.x - 5 * u, s.y - 34 * u, 10 * u, 34 * u, 3 * u);
    ctx.fillStyle = '#8A5A2B'; ctx.fill();

    const CANOPY = ['#3E8F3A', '#4CA544', '#57B84E'];
    [[0, -46, 20], [-15, -39, 15], [15, -39, 15], [-8, -55, 13], [9, -55, 13]]
      .forEach(([dx, dy, r], i) => {
        ctx.beginPath();
        ctx.arc(s.x + dx * u, s.y + dy * u, r * u, 0, TAU2);
        ctx.fillStyle = CANOPY[i % 3]; ctx.fill();
      });

    for (let k = 0; k < Math.min(ps.out, 6); k++) {
      const a = (k / 6) * TAU2;
      MSM.art.draw(ctx, prod.art,
        s.x + Math.cos(a) * 16 * u, s.y - 44 * u + Math.sin(a) * 11 * u,
        iso.TW * 0.22, prod.color);
    }
  }

  /* A Friesian seen from the side, facing left. Built big enough that the
     head, muzzle, ears, horns, hooves and tail tuft all actually read — the
     earlier one was a white lozenge with a lump on the end. */
  function drawCow(ctx, gx, gy) {
    const u = (iso.TW / 64) * 1.25;
    const s = iso.s(gx, gy, 0);
    const X = (n) => s.x + n * u, Y = (n) => s.y + n * u;
    const WHITE = '#FFFFFF', DARK = '#33383F', SHADE = '#DFE5EC';

    shadow(ctx, gx, gy, 0.85);

    // far pair of legs, shaded so they sit behind
    [[-11, SHADE], [10, SHADE]].forEach(([lx, col]) => {
      rrect(ctx, X(lx), Y(-15), 6.5 * u, 15 * u, 3 * u);
      ctx.fillStyle = col; ctx.fill();
      rrect(ctx, X(lx), Y(-4), 6.5 * u, 4.5 * u, 2 * u);
      ctx.fillStyle = DARK; ctx.fill();
    });

    // tail, thrown back over the rump
    ctx.beginPath();
    ctx.moveTo(X(17), Y(-33));
    ctx.quadraticCurveTo(X(26), Y(-27), X(24), Y(-13));
    ctx.strokeStyle = WHITE; ctx.lineWidth = 3.2 * u; ctx.lineCap = 'round'; ctx.stroke();
    ell2(ctx, X(24), Y(-11), 2.6 * u, 4 * u, DARK);

    // barrel
    rrect(ctx, X(-19), Y(-40), 38 * u, 24 * u, 11 * u);
    ctx.fillStyle = WHITE; ctx.fill();
    ctx.save();
    rrect(ctx, X(-19), Y(-40), 38 * u, 24 * u, 11 * u);
    ctx.clip();
    ctx.fillStyle = DARK;
    [[-8, -33, 8, 6, 0.5], [8, -25, 6.5, 5, -0.3], [2, -38, 5, 3.5, 0.2]].forEach(
      ([px, py, rx, ry, rot]) => {
        ctx.beginPath();
        ctx.ellipse(X(px), Y(py), rx * u, ry * u, rot, 0, TAU2);
        ctx.fill();
      });
    ctx.restore();
    ell2(ctx, X(9), Y(-17), 6 * u, 4.2 * u, '#FFB9C6');            // udder

    // near pair of legs, in front of the body
    [[-15], [4]].forEach(([lx]) => {
      rrect(ctx, X(lx), Y(-18), 7 * u, 18 * u, 3.2 * u);
      ctx.fillStyle = WHITE; ctx.fill();
      rrect(ctx, X(lx), Y(-4.5), 7 * u, 5 * u, 2.2 * u);
      ctx.fillStyle = DARK; ctx.fill();
    });

    // head
    const hx = -30, hy = -33;
    ctx.fillStyle = DARK;                                          // ears
    ctx.beginPath(); ctx.ellipse(X(hx - 6), Y(hy - 5), 5.5 * u, 3 * u, -0.7, 0, TAU2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(X(hx + 10), Y(hy - 7), 5.5 * u, 3 * u, 0.7, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#EDE6D4';                                     // horns
    ctx.beginPath(); ctx.arc(X(hx - 1), Y(hy - 10), 2.8 * u, 0, TAU2); ctx.fill();
    ctx.beginPath(); ctx.arc(X(hx + 6), Y(hy - 11), 2.8 * u, 0, TAU2); ctx.fill();

    rrect(ctx, X(hx - 5), Y(hy - 8), 20 * u, 19 * u, 7 * u);
    ctx.fillStyle = WHITE; ctx.fill();
    ctx.save();
    rrect(ctx, X(hx - 5), Y(hy - 8), 20 * u, 19 * u, 7 * u);
    ctx.clip();
    ctx.fillStyle = DARK;
    ctx.beginPath(); ctx.ellipse(X(hx + 11), Y(hy - 4), 6 * u, 6 * u, 0, 0, TAU2); ctx.fill();
    ctx.restore();

    rrect(ctx, X(hx - 7), Y(hy + 4), 16 * u, 9 * u, 4.5 * u);      // muzzle
    ctx.fillStyle = '#FFC2CE'; ctx.fill();
    ctx.fillStyle = '#C4808F';
    [[-2.5, 7.5], [3, 7]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.ellipse(X(hx + px), Y(hy + py), 1.6 * u, 1.2 * u, 0, 0, TAU2); ctx.fill();
    });
    ctx.fillStyle = DARK;                                          // eyes
    [[-1, -1], [8, -2]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(X(hx + px), Y(hy + py), 1.9 * u, 0, TAU2); ctx.fill();
    });
  }

  /* A pig, side on: barrel body, snout with two nostrils, a floppy ear,
     trotters and a curly tail. */
  function drawPig(ctx, gx, gy) {
    const u = (iso.TW / 64) * 1.2;
    const s = iso.s(gx, gy, 0);
    const X = (n) => s.x + n * u, Y = (n) => s.y + n * u;
    const PINK = '#F2A0B4', DARK = '#D97F97';

    shadow(ctx, gx, gy, 0.78);

    [-9, 8].forEach((lx) => {                                  // far trotters
      rrect(ctx, X(lx), Y(-13), 5.5 * u, 13 * u, 2.6 * u);
      ctx.fillStyle = DARK; ctx.fill();
    });

    ctx.beginPath();                                           // curly tail
    ctx.arc(X(15), Y(-27), 3.4 * u, Math.PI * 0.6, Math.PI * 2.1);
    ctx.strokeStyle = DARK; ctx.lineWidth = 2.4 * u; ctx.lineCap = 'round'; ctx.stroke();

    rrect(ctx, X(-16), Y(-34), 32 * u, 22 * u, 10 * u);         // barrel
    ctx.fillStyle = PINK; ctx.fill();
    ell2(ctx, X(-4), Y(-30), 9 * u, 5 * u, U.shade(PINK, 0.3));

    [-13, 5].forEach((lx) => {                                 // near trotters
      rrect(ctx, X(lx), Y(-15), 6 * u, 15 * u, 2.8 * u);
      ctx.fillStyle = PINK; ctx.fill();
      rrect(ctx, X(lx), Y(-4), 6 * u, 4 * u, 1.8 * u);
      ctx.fillStyle = '#8A5A66'; ctx.fill();
    });

    const hx = -24, hy = -29;
    ctx.beginPath();                                           // floppy ear
    ctx.moveTo(X(hx + 6), Y(hy - 7));
    ctx.lineTo(X(hx + 13), Y(hy - 11));
    ctx.lineTo(X(hx + 12), Y(hy - 1));
    ctx.closePath();
    ctx.fillStyle = DARK; ctx.fill();

    rrect(ctx, X(hx - 3), Y(hy - 7), 17 * u, 16 * u, 6 * u);    // head
    ctx.fillStyle = PINK; ctx.fill();
    ell2(ctx, X(hx - 3), Y(hy + 4), 6.5 * u, 5 * u, DARK);      // snout
    ctx.fillStyle = '#9C5E70';
    [[-5, 3], [-1, 3.4]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.ellipse(X(hx + dx), Y(hy + dy), 1.3 * u, 1.6 * u, 0, 0, TAU2);
      ctx.fill();
    });
    ctx.fillStyle = '#33383F';
    ctx.beginPath(); ctx.arc(X(hx + 4), Y(hy - 2), 1.8 * u, 0, TAU2); ctx.fill();
  }

  /* A plump hen: body, folded wing, comb, wattle, beak and tail feathers. */
  function drawHen(ctx, gx, gy) {
    const u = (iso.TW / 64) * 1.15;
    const s = iso.s(gx, gy, 0);
    const X = (n) => s.x + n * u, Y = (n) => s.y + n * u;
    const WHITE = '#FFFFFF', COMB = '#E0413C', BEAK = '#F0A32E';

    shadow(ctx, gx, gy, 0.46);

    ctx.strokeStyle = BEAK; ctx.lineWidth = 2.2 * u; ctx.lineCap = 'round';
    [[-3], [4]].forEach(([lx]) => {                                 // legs
      ctx.beginPath(); ctx.moveTo(X(lx), Y(-8)); ctx.lineTo(X(lx), Y(-1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(lx - 2.5), Y(-0.5)); ctx.lineTo(X(lx + 2.5), Y(-0.5)); ctx.stroke();
    });

    ctx.fillStyle = '#EDF1F6';                                      // tail feathers
    [[-0.5, 14], [0.1, 17], [0.7, 14]].forEach(([rot, len]) => {
      ctx.save();
      ctx.translate(X(10), Y(-17));
      ctx.rotate(rot - 0.7);
      ctx.beginPath(); ctx.ellipse(len * u * 0.5, 0, len * u * 0.5, 2.6 * u, 0, 0, TAU2);
      ctx.fill();
      ctx.restore();
    });

    ell2(ctx, X(0), Y(-14), 13 * u, 11.5 * u, WHITE);               // body
    ell2(ctx, X(2.5), Y(-13), 8 * u, 6 * u, '#E7EDF4');             // folded wing
    ell2(ctx, X(-11), Y(-25), 8.5 * u, 8.5 * u, WHITE);             // head

    ctx.fillStyle = COMB;                                           // comb
    [[-14, -33], [-10.5, -35], [-7, -33.5]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(X(px), Y(py), 3 * u, 0, TAU2); ctx.fill();
    });
    ctx.beginPath();                                                // beak
    ctx.moveTo(X(-18), Y(-25.5));
    ctx.lineTo(X(-24), Y(-23.5));
    ctx.lineTo(X(-18), Y(-21.5));
    ctx.closePath(); ctx.fillStyle = BEAK; ctx.fill();
    ell2(ctx, X(-17), Y(-19), 2.4 * u, 3.2 * u, COMB);              // wattle
    ctx.fillStyle = '#33383F';
    ctx.beginPath(); ctx.arc(X(-13), Y(-27), 1.9 * u, 0, TAU2); ctx.fill();
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
    text(ctx, MSM.t('world.lv') + ' ' + ps.level, c.x, c.y - h * 0.68 - 4, h * 0.32, '#8A95AB');
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

  /* The way out is a TWIN ESCALATOR — this is a mall, and malls run two side
     by side: one carrying people up, one bringing them down.

     The two runs TOUCH and share their middle balustrade, so the pair wears
     three rails and not four. That is what a real twin escalator looks like:
     one machine with two treads through it, rather than two machines parked
     next to each other with a gap.

     The tread is ONE continuous dark ramp with the yellow step edges
     crawling up it — separate floating step blocks read as a staircase, and
     a staircase is the one thing this must not look like.

     Nobody is painted onto it. The people you see riding are the shop's own
     CUSTOMERS, walking on under their own steam — see MSM.ent.rideStep. */
  function drawDoor(ctx) {
    const d = P.door;
    const to = MSM.game.nextStore();
    const tease = to < 0 ? MSM.game.teaseStore() : -1;
    const store = CFG.STORES[to >= 0 ? to : tease] || null;
    const open = to >= 0;

    const yF = d.y1, yB = d.y0;                    // front foot, back top
    const topZ = CFG.ESC.TOP_Z;
    const mid = (d.x0 + d.x1) / 2;

    // the plinth the pair stands on, and the landing plate at its foot
    iso.box(ctx, d.x0 - 0.12, yB - 0.10, d.x1 + 0.12, yF + 0.40, 0, 0.12,
            open ? '#C9A227' : '#9AA5B5');
    iso.tile(ctx, d.x0, yF + 0.04, d.x1, yF + 0.34, 0.124, '#E7EDF6');
    const hold = MSM.game.doorHold || 0;
    if (open && hold > 0) {
      const pct = U.clamp(hold / CFG.DOOR_HOLD, 0, 1);
      iso.tile(ctx, d.x0, yF + 0.04, d.x0 + (d.x1 - d.x0) * pct, yF + 0.34, 0.126, '#5FE08D');
    }

    /* Back to front, because larger x is nearer the eye in this projection:
       outer rail, up tread, the SHARED middle rail, down tread, outer rail.
       Interleaving them is what lets one balustrade serve both runs. */
    drawBalustrade(ctx, d.x0 + 0.05, yF, yB, topZ, open, false);
    drawTread(ctx, d.x0, mid, 1, yF, yB, topZ, open);
    drawBalustrade(ctx, mid, yF, yB, topZ, open, false);
    drawTread(ctx, mid, d.x1, -1, yF, yB, topZ, open);
    drawBalustrade(ctx, d.x1 - 0.05, yF, yB, topZ, open, true);

    // the opening they climb into — a frame, not a billboard
    iso.box(ctx, d.x0 - 0.14, yB - 0.16, d.x1 + 0.14, yB + 0.02, topZ + 0.06, topZ + 0.74,
            open ? '#FFC53D' : '#B9C4D6');
    iso.faceL(ctx, yB + 0.02, d.x0 - 0.02, d.x1 + 0.02, topZ + 0.12, topZ + 0.66,
              open ? '#16295C' : '#4E5D80');
    if (open) {
      iso.faceL(ctx, yB + 0.02, d.x0 + 0.16, d.x1 - 0.16, topZ + 0.50, topZ + 0.60, '#FFE9AE');
    }

    if (!store) return;
    const c = iso.s((d.x0 + d.x1) / 2, yB, topZ + 0.90);
    const w = Math.max(112, iso.TW * 1.35), h = Math.max(40, iso.TW * 0.46);
    ctx.save();
    ctx.shadowColor = '#0b1c3d40'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    rrect(ctx, c.x - w / 2, c.y - h, w, h, h * 0.3);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    text(ctx, MSM.t(open ? 'world.goto' : 'world.locked'), c.x, c.y - h * 0.68, h * 0.27, '#8A95AB');
    text(ctx, store.glyph + '  ' + store.name, c.x, c.y - h * 0.28, h * 0.3,
         open ? '#16295C' : '#98A6C4');
  }

  /** One solid pale side panel following the slope, capped in gold. */
  function drawBalustrade(ctx, xs, yF, yB, topZ, open, near) {
    const E = MSM.ent.escRamp(yF, yB, topZ);
    const a = E(0), b = E(1);
    iso.poly(ctx, [
      iso.s(xs, a.y, a.z), iso.s(xs, b.y, b.z),
      iso.s(xs, b.y, b.z + CFG.ESC.RAIL), iso.s(xs, a.y, a.z + CFG.ESC.RAIL),
    ], near ? '#E4EDF6' : '#CBD8E6');

    const h0 = iso.s(xs, a.y, a.z + CFG.ESC.RAIL), h1 = iso.s(xs, b.y, b.z + CFG.ESC.RAIL);
    ctx.beginPath();
    ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y);
    ctx.strokeStyle = open ? '#E3B23C' : '#B9C4D6';
    ctx.lineWidth = Math.max(4, iso.TW * 0.105);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y);
    ctx.strokeStyle = open ? '#F7D775' : '#D6DEE9';
    ctx.lineWidth = Math.max(1.5, iso.TW * 0.038);
    ctx.stroke();
  }

  /* One run's tread: the continuous ramp and the crawling step edges. `dir`
     is +1 going up and -1 coming down, which only changes the crawl. */
  function drawTread(ctx, rx0, rx1, dir, yF, yB, topZ, open) {
    const inset = 0.06;
    const x0 = rx0 + inset, x1 = rx1 - inset;
    const at = MSM.ent.escRamp(yF, yB, topZ);

    const a = at(0), b = at(1);
    iso.poly(ctx, [
      iso.s(x0, a.y, a.z), iso.s(x1, a.y, a.z),
      iso.s(x1, b.y, b.z), iso.s(x0, b.y, b.z),
    ], '#4C525A');

    /* The yellow step edges are the only thing that moves, and the whole
       reason it reads as running rather than as a fixed ramp. */
    const steps = 9;
    const phase = open ? (performance.now() / 780) % 1 : 0;
    const lip = 0.30 / steps;
    for (let i = 0; i < steps; i++) {
      const t = (i + (dir > 0 ? phase : 1 - phase)) / steps;
      if (t <= 0.01 || t >= 0.99) continue;
      const p = at(t), q = at(Math.min(0.99, t + lip));
      iso.poly(ctx, [
        iso.s(x0 + 0.05, p.y, p.z), iso.s(x1 - 0.05, p.y, p.z),
        iso.s(x1 - 0.05, q.y, q.z), iso.s(x0 + 0.05, q.y, q.z),
      ], '#F2C23D');
    }
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

  function drawStick(ctx) {
    const st = R.stick;
    if (!st) return;
    const r = 46, kr = 22;
    const d = Math.hypot(st.dx, st.dy), k = d > r ? r / d : 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(st.ox, st.oy, r, 0, 7);
    ctx.fillStyle = '#0b1c3d'; ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(st.ox + st.dx * k, st.oy + st.dy * k, kr, 0, 7);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawTill(ctx) {
    const b = P.till, ss = MSM.econ.sstate();

    if (!ss.till) {
      // a construction plot: stand on it and your money builds the counter
      const cost = CFG.TILL_COST(MSM.econ.store().unlock);
      const pct = U.clamp(ss.tillPaid / cost, 0, 1);
      iso.tile(ctx, b.x0, b.y0, b.x1, b.y1, 0.012, '#FFC53D');
      iso.tile(ctx, b.x0 + 0.08, b.y0 + 0.08, b.x1 - 0.08, b.y1 - 0.08, 0.014, '#FFF0C4');
      if (pct > 0) {
        iso.tile(ctx, b.x0 + 0.08, b.y0 + 0.08,
                 b.x0 + 0.08 + (b.x1 - b.x0 - 0.16) * pct, b.y1 - 0.08, 0.016, '#5FE08D');
      }
      const c = iso.s((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0.02);
      const h = Math.max(30, iso.TW * 0.34);
      ctx.save();
      ctx.shadowColor = '#0b1c3d40'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      rrect(ctx, c.x - h * 1.6, c.y - h - 6, h * 3.2, h, h * 0.3);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.restore();
      text(ctx, MSM.t('world.checkout'), c.x, c.y - h * 0.7 - 6, h * 0.28, '#8A95AB');
      text(ctx, '$' + U.money(Math.max(0, cost - ss.tillPaid)), c.x, c.y - h * 0.28 - 6, h * 0.36,
           MSM.state.cash > 0 ? '#2CA85C' : '#98A6C4');
      return;
    }

    box(ctx, b, 0, 0.55, '#FFC53D');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.552, '#FFE9AE');
    iso.box(ctx, b.x0 + 0.15, b.y0 + 0.12, b.x0 + 0.62, b.y0 + 0.46, 0.55, 0.88, '#4E5D80');
    iso.tile(ctx, b.x0 + 0.19, b.y0 + 0.16, b.x0 + 0.58, b.y0 + 0.42, 0.882, '#8FD8FF');

    /* Checkout in progress: a bag on the counter, and the customer's items
       hop into it one by one as they are rung up. */
    const front = MSM.ent.queue[0];
    if (front && front.phase === 'queue' && MSM.game.serveT > 0) {
      const bagAt = iso.s(b.x1 - 0.45, (b.y0 + b.y1) / 2, 0.56);
      const u = iso.TW / 64;
      const got = Math.max(1, front.got || 1);
      const pct = U.clamp(MSM.game.serveT / (MSM.game.serveDur || 1), 0, 1);
      const packed = Math.floor(pct * got);

      // the item currently in flight, arcing into the bag
      if (packed < got && front.bought && front.bought[packed] != null) {
        const t = (pct * got) - packed;
        const fx = bagAt.x + 26 * u, fy = bagAt.y - 4 * u;
        const px = fx + (bagAt.x - fx) * t;
        const py = fy + (bagAt.y - fy) * t - Math.sin(t * Math.PI) * 22 * u;
        const prod = MSM.econ.prod(front.bought[packed]);
        MSM.art.draw(ctx, prod.art, px, py, iso.TW * 0.24, prod.color);
      }

      drawPaperBag(ctx, bagAt.x, bagAt.y, 24 * u);
      text(ctx, packed + '/' + got, bagAt.x, bagAt.y - 34 * u, 11 * u, '#16295C');
    }
  }

  /** A little kraft-paper shopping bag. */
  function drawPaperBag(ctx, x, y, s) {
    rrect(ctx, x - s * 0.5, y - s * 0.95, s, s * 0.95, s * 0.1);
    ctx.fillStyle = '#D9A96B'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.08, y - s * 0.95); ctx.lineTo(x + s * 0.5, y - s * 0.95);
    ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x + s * 0.08, y); ctx.closePath();
    ctx.fillStyle = '#C08A4E'; ctx.fill();
    rrect(ctx, x - s * 0.5, y - s * 0.95, s, s * 0.16, s * 0.06);
    ctx.fillStyle = '#B07C42'; ctx.fill();
  }

  /* The OPEN/CLOSED sign: a post by the door with the state on its board. */
  function drawSign(ctx) {
    const b = P.sign, open = MSM.econ.sstate().open;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    iso.tile(ctx, b.x0, b.y0, b.x1, b.y1, 0.01, open ? '#DFF5E6' : '#FFE4E4');
    iso.box(ctx, cx - 0.06, cy - 0.06, cx + 0.06, cy + 0.06, 0, 0.95, '#8A5A2B');

    const s = iso.s(cx, cy, 1.28);
    const w = Math.max(58, iso.TW * 0.72), h = Math.max(24, iso.TW * 0.3);
    ctx.save();
    ctx.shadowColor = '#0b1c3d40'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 3;
    rrect(ctx, s.x - w / 2, s.y - h / 2, w, h, h * 0.3);
    ctx.fillStyle = open ? '#2CA85C' : '#E0553F'; ctx.fill();
    ctx.restore();
    text(ctx, MSM.t(open ? 'world.open' : 'world.closed'), s.x, s.y, h * 0.44, '#FFFFFF');
  }

  /* The tutorial's bouncing arrow over whatever you should walk to next. */
  function drawTutArrow(ctx, dt) {
    const t = MSM.game.tutTarget;
    if (!t) return;
    const s = iso.s(t.x, t.y, 0);
    const bob = Math.sin(performance.now() / 240) * iso.TW * 0.08;
    const u = iso.TW / 64;

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, iso.TW * 0.34, iso.TH * 0.34, 0, 0, 7);
    ctx.strokeStyle = '#FFC53D'; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();

    const ay = s.y - iso.TW * 0.95 + bob;
    ctx.save();
    ctx.shadowColor = '#0b1c3d55'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.moveTo(s.x, ay + 22 * u * 0.6);
    ctx.lineTo(s.x - 13 * u * 0.6, ay);
    ctx.lineTo(s.x - 5 * u * 0.6, ay);
    ctx.lineTo(s.x - 5 * u * 0.6, ay - 14 * u * 0.6);
    ctx.lineTo(s.x + 5 * u * 0.6, ay - 14 * u * 0.6);
    ctx.lineTo(s.x + 5 * u * 0.6, ay);
    ctx.lineTo(s.x + 13 * u * 0.6, ay);
    ctx.closePath();
    ctx.fillStyle = '#FFC53D'; ctx.fill();
    ctx.restore();
  }

  /* -------------------------------------------------------------- bodies */
  /* Chunky little figures: legs, a bean body, swinging arms and a big round
     head. Staff wear a strong colour; customers are pale so the staff read
     as staff at a glance. */
  const SKIN = '#FFD9B0';

  function drawBody(ctx, e, look) {
    const u = iso.TW / 64;
    /* `z` is normally 0 — the only bodies off the floor are the customers
       riding the escalator between shops, and they carry their height up
       the ramp with them. */
    const z = e.z || 0;
    const s = iso.s(e.x, e.y, z);
    const phase = e.moving ? Math.sin(e.walk * 10) : 0;
    const bob = e.moving ? Math.abs(phase) * 1.6 * u : 0;

    /* Mini-mart figure: one solid colour head to toe — a big round head on a
       small bean body — and a white cap on anyone who works here. */
    const col = look.body;
    const dark = U.shade(col, -0.18);

    if (!z) shadow(ctx, e.x, e.y, 0.36);

    const feet = s.y;
    const bw = 15 * u, bh = 16 * u;
    const hr = 12.5 * u;
    const bodyBot = feet - 2 * u - bob;
    const bodyTop = bodyBot - bh;
    const hy = bodyTop - hr * 0.68;

    // stubby legs that scissor
    [-1, 1].forEach((d) => {
      const lift = e.moving ? Math.max(0, phase * d) * 2.6 * u : 0;
      rrect(ctx, s.x + d * 3.6 * u - 2.4 * u, bodyBot - 2.5 * u - lift, 4.8 * u, 6.5 * u + lift, 2.4 * u);
      ctx.fillStyle = dark; ctx.fill();
    });

    // far arm, then torso, then near arm
    rrect(ctx, s.x - bw / 2 - 2.6 * u, bodyTop + 3 * u - phase * 2.4 * u, 4.8 * u, 10 * u, 2.4 * u);
    ctx.fillStyle = dark; ctx.fill();

    rrect(ctx, s.x - bw / 2, bodyTop, bw, bh + 2.5 * u, bw * 0.5);
    ctx.fillStyle = col; ctx.fill();

    rrect(ctx, s.x + bw / 2 - 2.2 * u, bodyTop + 3 * u + phase * 2.4 * u, 4.8 * u, 10 * u, 2.4 * u);
    ctx.fillStyle = col; ctx.fill();

    // the head IS the colour — no face, like the reference
    ctx.beginPath(); ctx.arc(s.x, hy, hr, 0, TAU2);
    ctx.fillStyle = col; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s.x - hr * 0.34, hy - hr * 0.34, hr * 0.3, hr * 0.2, -0.6, 0, TAU2);
    ctx.fillStyle = U.shade(col, 0.32); ctx.fill();

    // white cap: dome, accent band, brim off to the left
    if (look.cap) {
      ctx.beginPath();
      ctx.arc(s.x, hy - hr * 0.12, hr * 0.99, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = look.cap; ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, hy - hr * 0.12, hr * 0.86, Math.PI * 1.24, Math.PI * 1.76);
      ctx.lineWidth = hr * 0.24;
      ctx.strokeStyle = look.accent || col;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s.x - hr * 0.72, hy - hr * 0.3, hr * 0.52, hr * 0.24, -0.3, 0, TAU2);
      ctx.fillStyle = look.cap; ctx.fill();
    }

    /* Whatever they are carrying, stacked over the head — but capped. One
       sprite per item drew a twelve-high tomato skyscraper taller than the
       shop wall, on desktop and phone alike. Past SHOW the pile tightens and
       the remainder becomes a small count beside it; the HUD chip has the
       exact numbers anyway. */
    const hold = e.hold || (e.carry && e.carryP >= 0 ? [e.carryP] : []);
    if (hold.length) {
      const SHOW = 4;
      const shown = hold.slice(-SHOW);          // last picked up sits on top
      const size = iso.TW * 0.26 * (shown.length > 2 ? 0.88 : 1);
      const step = size * 0.6;
      const base = hy - hr * 1.05;
      shown.forEach((pi, k) => {
        const prod = MSM.econ.prod(pi);
        MSM.art.draw(ctx, prod.art, s.x + (k % 2 ? 1 : -1) * size * 0.06,
                     base - k * step, size, prod.color);
      });
      const top = base - (shown.length - 1) * step - size;
      if (hold.length > SHOW) {
        tag(ctx, s.x + size * 0.8, top + size * 0.62, '+' + (hold.length - SHOW), '#FFFFFF');
      }
      return { x: s.x, y: top };
    }
    return { x: s.x, y: hy - hr - (look.cap ? hr * 0.35 : 0) };
  }

  /** A customer with something in their basket — or, once they have paid,
      the packed paper bag they carry out of the store. */
  function drawBasket(ctx, c) {
    if (c.phase === 'leave' && c.got > 0) {
      const u = iso.TW / 64, s = iso.s(c.x, c.y, 0);
      drawPaperBag(ctx, s.x + 12 * u, s.y - 10 * u, 15 * u);
      return;
    }
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
    /* In the mini mart the bubble is a shopping list, so it goes away once
       they join the queue. In a cafe it is the ORDER — the one thing you
       have to read — so it stays up until everything is in their hands. */
    if (MSM.cafe.active()) {
      if (c.served || c.phase === 'leave' || c.phase === 'sit' || c.phase === 'toTable') return;
      if (c.items) return drawOrderBubble(ctx, c, head);
    } else if (c.phase === 'queue' || c.phase === 'toQueue') return;
    /* In the sport outlet the bubble is what they came in for, so it comes
       down the moment they have made their mind up either way. */
    if (MSM.sports.active() && (c.phase === 'toReturn' || c.phase === 'leave')) return;
    /* The boutique's bubble is the outfit they came in for, and it empties
       piece by piece as each one comes off a rail. */
    if (MSM.boutique.active()) {
      if (c.phase === 'leave') return;
      return drawOrderBubble(ctx, c, head);
    }
    // the techhub's overlay owns its need pill — no round bubble on top of it
    if (MSM.tech.active()) return;
    /* Fast food's bubble is the order, and it comes down the moment the
       ticket is written — after that the ticket strip is the read. */
    if (MSM.food.active()) {
      if (c.served || c.ticket || c.phase === 'leave') return;
      return drawOrderBubble(ctx, c, head);
    }
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

    // how many of it they still want, when it is more than one
    const left = (c.wantQty || 1) - (c.wantGot || 0);
    if (left > 1) {
      const bx = x + rp * 0.72, by = y + rp * 0.62;
      ctx.beginPath(); ctx.arc(bx, by, rp * 0.42, 0, TAU2);
      ctx.fillStyle = '#16295C'; ctx.fill();
      text(ctx, String(left), bx, by, rp * 0.52, '#FFFFFF');
    }
  }

  /** A cafe order: every item still owed, side by side in one bubble — the
      latte AND the cake, so both halves of the ticket read at a glance.
      Delivered items drop out, so the bubble narrows as the order lands. */
  function drawOrderBubble(ctx, c, head) {
    const items = c.items.filter((it) => !it.got);
    if (!items.length) return;
    const r = Math.max(17, iso.TW * 0.21);
    const pulse = c.mood === 'wait' ? 1 + Math.sin(performance.now() / 260) * 0.07 : 1;
    const rp = r * pulse;
    const step = rp * 1.35;
    const w = rp * 2 + step * (items.length - 1);
    const x = head.x, y = head.y - r - 4 * (iso.TW / 64);

    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
    rrect(ctx, x - w / 2, y - rp, w, rp * 2, rp);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x - rp * 0.25, y + rp * 0.95, rp * 0.22, 0, TAU2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();

    items.forEach((it, k) => {
      const prod = MSM.econ.prod(it.n);
      MSM.art.draw(ctx, prod.art, x - w / 2 + rp + k * step, y + rp * 0.62,
                   rp * 1.3, prod.color);
    });
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

  /* The painting kit src/cafe-render.js works from — the cafe draws its own
     fixtures, but there is no reason for it to reinvent a rounded rectangle. */
  R.fx = { rrect, text, tag, shadow, item, box, onFace, ell2, stroke2,
           buildPlot, drawPaperBag, drawBody };

  /* --------------------------------------------------------------- frame */
  R.frame = function (dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    drawFloor(ctx);

    const cafe = MSM.cafe.active(), sports = MSM.sports.active();
    const boutique = MSM.boutique.active(), tech = MSM.tech.active();
    const food = MSM.food.active();
    const items = [];
    MSM.econ.store().products.forEach((prod, n) => {
      const built = MSM.econ.pstate(n).built;
      items.push({ d: prod.crate.x1 + prod.crate.y1, fn: () => drawSource(ctx, n) });
      if (built) {
        items.push({ d: prod.pad.x1 + prod.pad.y1 - 0.5, fn: () => drawLevelPad(ctx, n) });
        // every cafe ingredient shares one storage unit — MSM.cafe draws it once
        if (prod.shelf && !cafe) {
          items.push({ d: prod.shelf.x1 + prod.shelf.y1,
                       fn: () => (boutique ? MSM.boutique.drawRack(ctx, n)
                                : tech ? MSM.tech.drawDisplay(ctx, n)
                                : food ? MSM.food.drawRack(ctx, n)
                                : drawShelf(ctx, n)) });
        }
      }
    });
    if (cafe) MSM.cafe.collect(items, ctx);
    if (sports) MSM.sports.collect(items, ctx);
    if (boutique) MSM.boutique.collect(items, ctx);
    if (tech) MSM.tech.collect(items, ctx);
    if (food) MSM.food.collect(items, ctx);
    items.push({ d: P.till.x1 + P.till.y1, fn: () => drawTill(ctx) });
    /* Sort the escalator by its BACK edge, not its far corner. It is a tall
       thing you stand in FRONT of to ride, and keyed on the far corner it
       painted over the player standing on its own comb plate. This way you
       walk up in front of it, and only once you are on the ramp does the
       near glass slide over you — which is what riding it should look
       like. */
    items.push({ d: P.door.x1 + P.door.y0, fn: () => drawDoor(ctx) });
    items.push({ d: P.bin.x1 + P.bin.y1, fn: () => drawBin(ctx) });
    /* Sort the sign well behind its own tile. It stands at the bottom edge of
       the room, so you always reach it from the north — which by raw depth
       puts the post and board on top of you, hiding the character. */
    items.push({ d: P.sign.x1 + P.sign.y1 - 1.6, fn: () => drawSign(ctx) });
    MSM.ent.cash.forEach((c) => items.push({ d: c.x + c.y, fn: () => drawCash(ctx, c) }));
    MSM.ent.customers.forEach((c) => items.push({
      d: c.x + c.y + 0.3,
      fn: () => {
        // behind the curtain: the cubicle draws the progress, not them
        if (c.hidden) return;
        const head = drawBody(ctx, c, { body: c.color });
        // a cafe customer holds a cup, not a shopping basket
        if (!cafe) drawBasket(ctx, c);
        drawBubble(ctx, c, head);
        if (cafe) MSM.cafe.overlay(ctx, c, head);
        if (sports) MSM.sports.overlay(ctx, c, head);
        if (boutique) MSM.boutique.overlay(ctx, c, head);
        if (tech) MSM.tech.overlay(ctx, c, head);
        if (food) MSM.food.overlay(ctx, c, head);
      },
    }));
    // staff are pink; the player is the blue one you drive
    const CREW = ['#FF2E9C', '#F2A03D', '#B45CE0', '#12B4A6'];
    if (MSM.ent.cashier) {
      const k = MSM.ent.cashier;
      items.push({ d: k.x + k.y + 0.3,
                   fn: () => drawBody(ctx, k,
                     { body: '#00B368', cap: '#FFFFFF', accent: '#00B368' }) });
    }
    MSM.ent.stockers.forEach((st, i) => {
      items.push({ d: st.x + st.y + 0.3,
                   fn: () => drawBody(ctx, st,
                     { body: CREW[i % CREW.length], cap: '#FFFFFF', accent: CREW[i % CREW.length] }) });
    });
    MSM.cafe.crew.forEach((s) => {
      items.push({ d: s.x + s.y + 0.3,
                   fn: () => drawBody(ctx, s, { body: s.color, cap: '#FFFFFF', accent: s.color }) });
    });
    MSM.sports.crew.forEach((s) => {
      items.push({ d: s.x + s.y + 0.3,
                   fn: () => drawBody(ctx, s, { body: s.color, cap: '#FFFFFF', accent: s.color }) });
    });
    MSM.boutique.crew.forEach((s) => {
      items.push({ d: s.x + s.y + 0.3,
                   fn: () => drawBody(ctx, s, { body: s.color, cap: '#FFFFFF', accent: s.color }) });
    });
    MSM.tech.crew.forEach((s) => {
      items.push({ d: s.x + s.y + 0.3,
                   fn: () => drawBody(ctx, s, { body: s.color, cap: '#FFFFFF', accent: s.color }) });
    });
    MSM.food.crew.forEach((s) => {
      items.push({ d: s.x + s.y + 0.3,
                   fn: () => drawBody(ctx, s, { body: s.color, cap: '#FFFFFF', accent: s.color }) });
    });
    const p = MSM.ent.player;
    items.push({ d: p.x + p.y + 0.35,
                 fn: () => drawBody(ctx, p, { body: '#29A9F2', cap: '#FFFFFF', accent: '#29A9F2' }) });

    items.sort((a, b) => a.d - b.d).forEach((it) => it.fn());
    drawPops(ctx, dt);
    drawTutArrow(ctx, dt);
    drawStick(ctx);
  };
})();
