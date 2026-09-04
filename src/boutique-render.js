/* The fashion boutique's own fixtures.

   Two things here have to be readable across the room, because they are the
   two things the stage is about:

     the RAIL   — not "how full is it" but "which sizes are left on it"
     the CUBICLE — free, or busy, and how much longer

   Everything else is dressing. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, P = MSM.CFG.PLAN, B = MSM.CFG.BOUTIQUE;
  const iso = MSM.iso, K = MSM.boutique;
  const fx = () => MSM.render.fx;
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------ the stockroom */
  /** A wardrobe box: the back room, where the sizes you fetch come from. */
  function drawWardrobe(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.crate;
    const { item, tag } = fx();

    iso.box(ctx, b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1 - 0.06, 0, 0.16, '#8A6034');
    iso.box(ctx, b.x0 + 0.10, b.y0 + 0.10, b.x1 - 0.10, b.y1 - 0.30, 0.16, 0.92, '#E7D2DA');
    iso.tile(ctx, b.x0 + 0.14, b.y0 + 0.14, b.x1 - 0.14, b.y1 - 0.34, 0.922, '#F6E7EE');
    // a ribbon down the front, the way a boutique's own boxes look
    iso.faceL(ctx, b.y1 - 0.30, (b.x0 + b.x1) / 2 - 0.08, (b.x0 + b.x1) / 2 + 0.08,
              0.16, 0.92, U.shade(prod.color, 0.18));
    iso.faceL(ctx, b.y1 - 0.30, b.x0 + 0.24, b.x1 - 0.24, 0.34, 0.44,
              U.shade(prod.color, -0.05));

    for (let k = 0; k < Math.min(ps.out, 6); k++) {
      item(ctx, prod, b.x0 + 0.38 + (k % 3) * 0.42, b.y0 + 0.26 + (((k / 3) | 0) * 0.34),
           0.92, 0.26);
    }

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 1.62);
    tag(ctx, t.x, t.y, prod.glyph + ' ' + ps.out, ps.out === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  K.drawSource = function (ctx, n) { drawWardrobe(ctx, n); };

  /* ----------------------------------------------------------- the rails */
  /* A hanging rail, and under it the only number that matters in this shop:
     what is left in each size. A rail with eight things on it and no L is
     an empty rail to the person who wears an L, and the size strip is how
     you see that from across the floor. */
  function drawRail(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.shelf;
    const { item } = fx();
    const cx = (b.x0 + b.x1) / 2;

    // two uprights on feet, and the bar between them
    [b.x0 + 0.18, b.x1 - 0.18].forEach((px) => {
      iso.box(ctx, px - 0.22, b.y1 - 0.30, px + 0.22, b.y1 - 0.18, 0, 0.07, '#9AA5B5');
      iso.box(ctx, px - 0.06, b.y1 - 0.28, px + 0.06, b.y1 - 0.20, 0.07, 1.46, '#B9C4D6');
    });
    iso.box(ctx, b.x0 + 0.12, b.y1 - 0.27, b.x1 - 0.12, b.y1 - 0.21, 1.40, 1.46, '#C9D2DC');

    // the garments, hanging off the bar
    const show = Math.min(ps.shelf, 6);
    for (let k = 0; k < show; k++) {
      const gx = b.x0 + 0.34 + k * ((b.x1 - b.x0 - 0.68) / Math.max(1, show - 1 || 1));
      const h = iso.s(gx, b.y1 - 0.24, 1.40);
      // the hanger hook
      ctx.beginPath();
      ctx.arc(h.x, h.y + iso.TW * 0.03, iso.TW * 0.035, Math.PI * 0.15, Math.PI * 0.85);
      ctx.strokeStyle = '#8A95AB';
      ctx.lineWidth = Math.max(1, iso.TW * 0.018);
      ctx.stroke();
      MSM.art.draw(ctx, prod.art, h.x, h.y + iso.TW * 0.40, iso.TW * 0.34, prod.color);
    }
    if (ps.shelf === 0) {
      const e = iso.s(cx, b.y1 - 0.24, 1.05);
      fx().text(ctx, MSM.t('fit.empty'), e.x, e.y, Math.max(9, iso.TW * 0.16), '#C08A9A');
    }

    // the base of the unit, so it has some weight on the floor
    iso.box(ctx, b.x0 + 0.06, b.y0 + 0.10, b.x1 - 0.06, b.y1 - 0.34, 0, 0.20, '#E7D2DA');
    iso.tile(ctx, b.x0 + 0.10, b.y0 + 0.14, b.x1 - 0.10, b.y1 - 0.38, 0.202,
             U.shade(prod.color, 0.55));

    if (prod.garment) drawSizeStrip(ctx, n, cx, b.y0 + 0.14);
    else {
      const t = iso.s(cx, b.y0 + 0.14, 1.90);
      fx().tag(ctx, t.x, t.y, prod.glyph + ' ' + ps.shelf,
               ps.shelf === 0 ? '#FFD6D6' : '#FFFFFF');
    }
  }

  /** S · M · L · XL, each with what is left — and a red one is a lost sale. */
  function drawSizeStrip(ctx, n, wx, wy) {
    const bs = MSM.econ.bstate();
    const sizes = bs.racks[n];
    const { rrect, text } = fx();
    const o = iso.s(wx, wy, 1.90);

    const cw = Math.max(15, iso.TW * 0.22), gap = cw * 0.16;
    const w = cw * 4 + gap * 3, h = cw * 1.05;
    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    rrect(ctx, o.x - w / 2 - gap, o.y - h / 2 - gap, w + gap * 2, h + gap * 2, h * 0.34);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();

    sizes.forEach((v, k) => {
      const x = o.x - w / 2 + k * (cw + gap);
      rrect(ctx, x, o.y - h / 2, cw, h, h * 0.26);
      ctx.fillStyle = v === 0 ? '#E0553F' : v <= 1 ? '#FFB020' : '#E7EDF6';
      ctx.fill();
      text(ctx, B.SIZES[k], x + cw / 2, o.y - h * 0.16, h * 0.34,
           v === 0 ? '#FFFFFF' : '#8A95AB');
      text(ctx, String(v), x + cw / 2, o.y + h * 0.22, h * 0.38,
           v === 0 ? '#FFFFFF' : '#16295C');
    });
  }

  K.drawRack = function (ctx, n) { drawRail(ctx, n); };

  /* -------------------------------------------------------- the cubicles */
  function drawRoom(ctx, k) {
    const spec = P.rooms[k], rs = MSM.econ.bstate().rooms[k], b = spec.box;
    const { rrect, text, tag } = fx();

    if (!rs.built) {
      fx().buildPlot(ctx, b, rs.buildPaid, spec.cost, '🚪 ' + MSM.t('fit.room').toUpperCase());
      return;
    }

    const user = MSM.ent.customers.find((c) => c.room === k && c.phase === 'fitting');
    const busy = !!user;

    // three walls and a roof panel
    iso.box(ctx, b.x0, b.y0, b.x1, b.y0 + 0.14, 0, 2.30, '#E7D2DA');       // back
    iso.box(ctx, b.x0, b.y0, b.x0 + 0.14, b.y1, 0, 2.30, '#DCC3CD');       // left
    iso.box(ctx, b.x1 - 0.14, b.y0, b.x1, b.y1, 0, 2.30, '#DCC3CD');       // right
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 2.30, 2.42, '#F3E2E9');           // lid
    iso.tile(ctx, b.x0 + 0.14, b.y0 + 0.14, b.x1 - 0.14, b.y1, 0.01, '#C9A9B6');

    // a stool and a mirror inside, visible while the curtain is open
    if (!busy) {
      const sx = b.x0 + 0.45;
      iso.box(ctx, sx, b.y0 + 0.42, sx + 0.36, b.y0 + 0.74, 0, 0.42, '#B9889A');
      iso.faceL(ctx, b.y0 + 0.15, b.x1 - 0.72, b.x1 - 0.28, 0.75, 1.85, '#DFF0FA');
      iso.faceL(ctx, b.y0 + 0.15, b.x1 - 0.66, b.x1 - 0.34, 0.85, 1.75, '#F4FAFF');
    }

    /* The curtain. Drawn shut when somebody is in there — that one change is
       the whole read of "this cubicle is not available". */
    const cw = b.x1 - b.x0 - 0.28;
    if (busy) {
      iso.faceL(ctx, b.y1 - 0.04, b.x0 + 0.14, b.x1 - 0.14, 0.05, 2.20, '#C2537F');
      // curtain folds
      for (let f = 1; f < 6; f++) {
        const fxp = b.x0 + 0.14 + (cw / 6) * f;
        iso.faceL(ctx, b.y1 - 0.03, fxp - 0.02, fxp + 0.02, 0.05, 2.20, '#A8446B');
      }
    } else {
      // pushed to one side, so the cubicle reads as open
      iso.faceL(ctx, b.y1 - 0.04, b.x0 + 0.14, b.x0 + 0.46, 0.05, 2.20, '#C2537F');
      iso.faceL(ctx, b.y1 - 0.04, b.x1 - 0.46, b.x1 - 0.14, 0.05, 2.20, '#C2537F');
    }

    // the little light over the door: green free, red in use
    const lamp = iso.s((b.x0 + b.x1) / 2, b.y1 - 0.05, 2.44);
    ctx.beginPath();
    ctx.ellipse(lamp.x, lamp.y, iso.TW * 0.07, iso.TH * 0.07, 0, 0, TAU);
    ctx.fillStyle = busy ? '#E0553F' : '#2CA85C';
    ctx.fill();

    if (!busy) {
      const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 2.75);
      tag(ctx, t.x, t.y, MSM.t('fit.free'), '#DFF5E6');
      return;
    }

    /* Somebody is in there — show how long. This is the queue's clock. */
    const c = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 2.80);
    const w = Math.max(50, iso.TW * 0.66), h = Math.max(8, iso.TW * 0.10);
    rrect(ctx, c.x - w / 2, c.y - h / 2, w, h, h / 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    rrect(ctx, c.x - w / 2 + 1, c.y - h / 2 + 1,
          (w - 2) * U.clamp(user.fitT / user.fitDur, 0, 1), h - 2, (h - 2) / 2);
    ctx.fillStyle = '#C2537F'; ctx.fill();
    text(ctx, '👗', c.x, c.y - h * 1.5, Math.max(11, iso.TW * 0.2), '#000');
  }

  /* ---------------------------------------------------------- the frame */
  K.collect = function (items, ctx) {
    const bs = MSM.econ.bstate();
    if (!bs) return;
    P.rooms.forEach((spec, k) => {
      items.push({ d: spec.box.x1 + spec.box.y1, b: spec.box, fn: () => drawRoom(ctx, k) });
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

    /* The size request. This is the loudest thing on the floor on purpose —
       it is a sale that is yours to lose, and it is asking you by name. */
    if (MSM.boutique.asking(c)) {
      const prod = MSM.econ.prod(c.need.n);
      const label = prod.garment ? B.SIZES[c.size] + '?' : '?';
      const w = Math.max(46, iso.TW * 0.68), h = Math.max(20, iso.TW * 0.30);
      ctx.save();
      ctx.shadowColor = '#0b1c3d44'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
      rrect(ctx, x - w / 2, y - h / 2, w, h, h * 0.34);
      ctx.fillStyle = c.claimed ? '#4FB0FF' : '#FFB020';
      ctx.fill();
      ctx.restore();
      MSM.art.draw(ctx, prod.art, x - w * 0.26, y + h * 0.30, h * 0.86, prod.color);
      text(ctx, label, x + w * 0.16, y, h * 0.46, '#FFFFFF');
      return;
    }

    // queueing for a cubicle, or at the till: how long they will put up with it
    const showRing = c.phase === 'wait' || c.phase === 'queue';
    if (!showRing) return;
    const pct = U.clamp(c.patience, 0, 1);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 3.5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * pct);
    ctx.strokeStyle = pct > 0.55 ? '#2CA85C' : pct > 0.28 ? '#FFB020' : '#E0553F';
    ctx.lineWidth = 3.2 * u;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    if (c.phase !== 'wait') return;
    const bx = x + r * 0.82, by = y - r * 0.74;
    ctx.beginPath(); ctx.arc(bx, by, r * 0.40, 0, TAU);
    ctx.fillStyle = '#C2537F'; ctx.fill();
    text(ctx, '🚪', bx, by, r * 0.42, '#FFFFFF');
  };
})();
