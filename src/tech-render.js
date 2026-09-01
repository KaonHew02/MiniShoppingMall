/* The techhub's own fixtures.

   Three reads matter on this floor, and everything here serves them:

     the DISPLAY  — the product on its lit stand, its two headline specs,
                    and whether there is a sealed box left to actually sell
     the BENCH    — the hands-on counter, and how busy it is
     the SHOPPER  — what KIND of thing they want, and which spec they
                    care about, floating over their head the whole visit */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, P = MSM.CFG.PLAN, T = MSM.CFG.TECH;
  const iso = MSM.iso, K = MSM.tech;
  const fx = () => MSM.render.fx;
  const TAU = Math.PI * 2;

  const CAT = { audio: '🎧', phone: '📱', laptop: '💻', screen: '📺' };

  /* ------------------------------------------------------ the stockroom */
  /** Sealed product boxes, stacked. Dark cartons with the brand stripe. */
  function drawStock(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.crate;
    const { item, tag } = fx();

    iso.box(ctx, b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1 - 0.06, 0, 0.14, '#39424F');
    iso.box(ctx, b.x0 + 0.10, b.y0 + 0.10, b.x1 - 0.10, b.y1 - 0.30, 0.14, 0.90, '#2B3450');
    iso.tile(ctx, b.x0 + 0.14, b.y0 + 0.14, b.x1 - 0.14, b.y1 - 0.34, 0.902, '#3E4A66');
    // the brand stripe, in the line's own colour
    iso.faceL(ctx, b.y1 - 0.30, b.x0 + 0.10, b.x1 - 0.10, 0.42, 0.56,
              U.shade(prod.color, 0.1));
    iso.faceL(ctx, b.y1 - 0.30, (b.x0 + b.x1) / 2 - 0.30, (b.x0 + b.x1) / 2 + 0.30,
              0.60, 0.80, '#F4F8FC');

    for (let k = 0; k < Math.min(ps.out, 6); k++) {
      item(ctx, prod, b.x0 + 0.38 + (k % 3) * 0.42, b.y0 + 0.26 + (((k / 3) | 0) * 0.34),
           0.90, 0.26);
    }

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 1.60);
    tag(ctx, t.x, t.y, prod.glyph + ' ' + ps.out, ps.out === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  K.drawSource = function (ctx, n) { drawStock(ctx, n); };

  /* --------------------------------------------------------- the displays */
  /* A lit pedestal with the floor unit on it, the two headline specs on a
     card, and the count of sealed boxes underneath — because the display
     model is for hands, and the boxes are what actually leaves the shop. */
  function drawDisplay(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.shelf;
    const { rrect, text, tag } = fx();
    const cx = (b.x0 + b.x1) / 2;

    // the pedestal: white body, dark plinth, glowing top
    iso.box(ctx, b.x0 + 0.06, b.y0 + 0.10, b.x1 - 0.06, b.y1 - 0.06, 0, 0.16, '#2B3450');
    iso.box(ctx, b.x0 + 0.12, b.y0 + 0.16, b.x1 - 0.12, b.y1 - 0.12, 0.16, 0.78, '#F4F8FC');
    iso.tile(ctx, b.x0 + 0.14, b.y0 + 0.18, b.x1 - 0.14, b.y1 - 0.14, 0.782,
             U.shade(prod.color, 0.55));
    iso.tile(ctx, b.x0 + 0.26, b.y0 + 0.28, b.x1 - 0.26, b.y1 - 0.24, 0.784, '#FFFFFF');
    // sealed boxes tucked on the plinth shelf below the floor unit
    for (let k = 0; k < Math.min(ps.shelf, 4); k++) {
      const gx = b.x0 + 0.34 + k * 0.42;
      iso.box(ctx, gx - 0.12, b.y1 - 0.32, gx + 0.12, b.y1 - 0.10, 0.16, 0.42, '#3E4A66');
      iso.tile(ctx, gx - 0.10, b.y1 - 0.30, gx + 0.10, b.y1 - 0.12, 0.422,
               U.shade(prod.color, 0.15));
    }

    // the floor unit itself, up on the light
    const u = iso.s(cx, (b.y0 + b.y1) / 2, 0.80);
    MSM.art.draw(ctx, prod.art, u.x, u.y, iso.TW * 0.52, prod.color);

    /* The spec card: the two stats this one competes on. Reading "📷5 🔋3"
       against "📷3 🔋5" on the stand next door IS the department. */
    const specs = prod.specs || {};
    const keys = Object.keys(specs).sort((a, z) => specs[z] - specs[a]).slice(0, 2);
    const line = keys.map((s) => T.STATS[s] + specs[s]).join('  ');
    const o = iso.s(cx, b.y0 + 0.14, 1.55);
    const h = Math.max(17, iso.TW * 0.23);
    ctx.font = `800 ${h * 0.52}px 'Baloo 2','Nunito',system-ui,sans-serif`;
    const w = ctx.measureText(line).width + h * 0.9;
    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    rrect(ctx, o.x - w / 2, o.y - h / 2, w, h, h * 0.32);
    ctx.fillStyle = '#16295C'; ctx.fill();
    ctx.restore();
    text(ctx, line, o.x, o.y, h * 0.5, '#DFF0FF');

    // sealed boxes left — the number a sale actually needs
    if (ps.shelf > CFG.SHELF_CAP * 0.5) return;
    const bt = iso.s(cx, b.y1 - 0.10, 1.14);
    tag(ctx, bt.x, bt.y, '📦 ' + ps.shelf, ps.shelf === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  K.drawDisplay = function (ctx, n) { drawDisplay(ctx, n); };

  /* ---------------------------------------------------------- the benches */
  function drawBench(ctx, ai) {
    const spec = P.areas[ai], as = MSM.econ.tstate().areas[ai];
    const b = spec.box, pr = spec.prop;
    const { tag } = fx();

    if (!as.built) {
      fx().buildPlot(ctx, b, as.buildPaid, spec.cost, '🧪 ' + spec.label.toUpperCase());
      return;
    }

    // a soft mat marking the demo pitch, then the counter on it
    iso.tile(ctx, b.x0 + 0.15, b.y0 + 0.15, b.x1 - 0.15, b.y1 - 0.15, 0.004, '#8FA3D4');
    iso.tile(ctx, b.x0 + 0.30, b.y0 + 0.30, b.x1 - 0.30, b.y1 - 0.30, 0.006, '#9FB2DE');

    iso.box(ctx, pr.x0, pr.y0, pr.x1, pr.y1, 0, 0.72, '#2B3450');
    iso.tile(ctx, pr.x0 + 0.06, pr.y0 + 0.06, pr.x1 - 0.06, pr.y1 - 0.06, 0.722, '#3E4A66');
    // the glowing runway down the counter top
    iso.tile(ctx, pr.x0 + 0.16, pr.y0 + 0.42, pr.x1 - 0.16, pr.y1 - 0.42, 0.724, '#7FD4FF');
    iso.faceL(ctx, pr.y1, pr.x0 + 0.1, pr.x1 - 0.1, 0.12, 0.60, '#39424F');
    iso.faceL(ctx, pr.y1, pr.x0 + 0.28, pr.x1 - 0.28, 0.22, 0.50, '#7FD4FF');

    // the department's two floor units, out on the runway
    const store = MSM.econ.store(), ss = MSM.econ.sstate();
    let slot = 0;
    store.products.forEach((p) => {
      if (p.cat !== spec.cat || !ss.products[p.index].built) return;
      const gx = pr.x0 + 0.55 + slot * ((pr.x1 - pr.x0 - 1.1) / 1);
      fx().item(ctx, p, gx, (pr.y0 + pr.y1) / 2, 0.72, 0.30);
      slot++;
    });

    const busy = MSM.ent.customers.filter((c) =>
      (c.phase === 'demo' || c.phase === 'toBench') &&
      MSM.econ.prod(c.look).areaIndex === ai).length;
    const t = iso.s((pr.x0 + pr.x1) / 2, pr.y0 + 0.1, 1.35);
    tag(ctx, t.x, t.y, busy ? '🧪 ' + busy : spec.label.toUpperCase(),
        busy ? '#DFF5E6' : '#FFFFFF');
  }

  /* ---------------------------------------------------------- the frame */
  K.collect = function (items, ctx) {
    const ts = MSM.econ.tstate();
    if (!ts) return;
    P.areas.forEach((spec, ai) => {
      items.push({ d: spec.box.x0 + spec.box.y0 + 0.01, fn: () => drawBench(ctx, ai) });
    });
  };

  /* ------------------------------------------------------ over a shopper */
  K.overlay = function (ctx, c, head) {
    const { rrect, text } = fx();
    const u = iso.TW / 64;
    const r = Math.max(17, iso.TW * 0.21);
    const x = head.x, y = head.y - r - 4 * u;

    if (c.verdict && c.verdictT > 0) {
      const face = c.verdict === 'buy' ? '😊' : c.verdict === 'costly' ? '😕' : '😞';
      const col = c.verdict === 'buy' ? '#2CA85C' : '#E0553F';
      const s = iso.s(c.x, c.y, 0);
      rrect(ctx, s.x - 15 * u, s.y - 58 * u, 30 * u, 22 * u, 11 * u);
      ctx.fillStyle = col; ctx.fill();
      text(ctx, face, s.x, s.y - 47 * u, 15 * u, '#FFFFFF');
    }

    // hands-on: the demo's progress
    if (c.phase === 'demo' && c.demoDur > 0) {
      const w = Math.max(46, iso.TW * 0.62), h = Math.max(7, iso.TW * 0.09);
      rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      rrect(ctx, x - w / 2 + 1, y - h / 2 + 1,
            (w - 2) * U.clamp(c.demoT / c.demoDur, 0, 1), h - 2, (h - 2) / 2);
      ctx.fillStyle = '#7FD4FF'; ctx.fill();
      return;
    }

    // waiting on a box, or in the queue: the ring
    const showRing = c.phase === 'restock' || c.phase === 'queue' || c.phase === 'toQueue';
    if (showRing) {
      const pct = U.clamp(c.patience, 0, 1);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r + 3.5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * pct);
      ctx.strokeStyle = pct > 0.55 ? '#2CA85C' : pct > 0.28 ? '#FFB020' : '#E0553F';
      ctx.lineWidth = 3.2 * u;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    /* The need, up the whole visit: WHAT they came for and the spec they
       care about. It is the brief you would ask for if they could talk. */
    if (c.served || c.phase === 'leave' || c.phase === 'queue' ||
        c.phase === 'toQueue' || c.phase === 'restock') return;
    const w = Math.max(52, iso.TW * 0.80), h = Math.max(22, iso.TW * 0.34);
    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
    rrect(ctx, x - w / 2, y - h / 2, w, h, h * 0.4);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x - w * 0.14, y + h * 0.72, h * 0.14, 0, TAU);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    text(ctx, (CAT[c.cat] || '📦') + ' ' + (T.STATS[c.focus] || ''), x, y, h * 0.5, '#16295C');

    // still open to advice — the sale you can swing by walking over
    if (!K.advisable(c)) return;
    const bx = x + w * 0.56, by = y - h * 0.52;
    ctx.beginPath(); ctx.arc(bx, by, r * 0.36, 0, TAU);
    ctx.fillStyle = '#4062D8'; ctx.fill();
    text(ctx, '?', bx, by, r * 0.5, '#FFFFFF');
  };
})();
