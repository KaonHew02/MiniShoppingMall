/* The coffee shop's own fixtures.

   Kept apart from render.js for the same reason cafe.js is kept apart from
   entities.js: the mini mart has no idea any of this exists. Everything here
   hangs off MSM.cafe and borrows MSM.render.fx for the drawing primitives. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, P = MSM.CFG.PLAN;
  const iso = MSM.iso, K = MSM.cafe;
  const fx = () => MSM.render.fx;
  const TAU = Math.PI * 2;

  /* Machine paint. The three of them read as three different appliances at a
     glance — chrome, jade and cast iron — before you can see any detail. */
  const SKIN = {
    coffee: { body: '#C9D2DC', trim: '#4E5D80', glow: '#8C5A34' },
    bar:    { body: '#7FB93B', trim: '#3F6B22', glow: '#DFF3C6' },
    oven:   { body: '#5A6472', trim: '#39424F', glow: '#FF9A3D' },
  };

  /* -------------------------------------------------------- the back room */
  /** A supply crate: what the back room has ready for you to carry. */
  function drawSupply(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.crate;
    const { item, tag } = fx();

    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.46, '#A8763F');
    iso.tile(ctx, b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1 - 0.06, 0.462, '#C79154');
    iso.faceL(ctx, b.y1, b.x0 + 0.1, b.x1 - 0.1, 0.08, 0.38, '#8A5A2B');
    iso.faceL(ctx, b.y1, b.x0 + 0.28, b.x1 - 0.28, 0.14, 0.32, U.shade(prod.color, 0.15));

    // what is in it, piled on the lid — four is enough to read "plenty"
    for (let k = 0; k < Math.min(ps.out, 6); k++) {
      item(ctx, prod, b.x0 + 0.34 + (k % 3) * 0.5, b.y0 + 0.3 + (((k / 3) | 0) * 0.42),
           0.46, 0.28);
    }

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 1.15);
    tag(ctx, t.x, t.y, prod.glyph + ' ' + ps.out, ps.out === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  /** A recipe on the menu board: a chalk plaque you unlocked by paying for it. */
  function drawMenuBoard(ctx, n) {
    const prod = MSM.econ.prod(n), b = prod.crate;
    const { rrect, text, tag } = fx();
    const cs = MSM.econ.cstate();
    const ready = cs.machines[prod.machineIndex].built;

    // two legs and a board leaning back against the wall
    iso.box(ctx, b.x0 + 0.1, b.y1 - 0.16, b.x0 + 0.2, b.y1 - 0.06, 0, 0.34, '#7A4A22');
    iso.box(ctx, b.x1 - 0.2, b.y1 - 0.16, b.x1 - 0.1, b.y1 - 0.06, 0, 0.34, '#7A4A22');
    iso.box(ctx, b.x0, b.y0, b.x1, b.y0 + 0.16, 0, 1.5, '#4A3527');

    const o = iso.s(b.x0 + 0.08, b.y0 + 0.08, 1.42);
    ctx.save();
    ctx.transform((iso.TW / 2) / iso.ZH, (iso.TH / 2) / iso.ZH, 0, 1, o.x, o.y);
    const w = (b.x1 - b.x0 - 0.16) * iso.ZH, h = 1.2 * iso.ZH;
    rrect(ctx, 0, 0, w, h, h * 0.08);
    ctx.fillStyle = ready ? '#2E4636' : '#43484E';
    ctx.fill();
    rrect(ctx, w * 0.05, h * 0.06, w * 0.9, h * 0.88, h * 0.05);
    ctx.strokeStyle = '#FFFFFF44';
    ctx.lineWidth = Math.max(1, h * 0.02);
    ctx.stroke();
    ctx.restore();

    // the drink itself, then its name and price under it
    const c = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.08, 1.02);
    MSM.art.draw(ctx, prod.art, c.x, c.y, iso.TW * 0.42, prod.color);
    const nm = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.08, 0.44);
    const size = Math.max(8, iso.TW * 0.15);
    text(ctx, prod.name.toUpperCase(), nm.x, nm.y, size, '#F2F7F2');
    text(ctx, '$' + U.money(MSM.econ.price(prod.index)), nm.x, nm.y + size * 1.15,
         size * 0.95, ready ? '#9FE8B4' : '#B9C4D6');

    if (!ready) {
      const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.08, 1.85);
      tag(ctx, t.x, t.y, MSM.t('cafe.noMachine'), '#FFD6D6');
    }
  }

  /* One entry point, because render.js only knows about `source.kind`. */
  K.drawSource = function (ctx, n) {
    if (MSM.econ.prod(n).source.kind === 'supply') drawSupply(ctx, n);
    else drawMenuBoard(ctx, n);
  };

  /* ----------------------------------------------------- the storage unit */
  /* What the bar actually draws on. Six bins, each with its level, so an
     empty one tells you at a glance why nothing is brewing. */
  function drawStorage(ctx) {
    const b = P.storage;
    const { tag } = fx();
    const store = MSM.econ.store(), ss = MSM.econ.sstate();

    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.30, '#8A5A2B');
    iso.box(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.30, 1.02, '#C08A4E');
    iso.tile(ctx, b.x0 + 0.08, b.y0 + 0.08, b.x1 - 0.08, b.y1 - 0.08, 1.022, '#F6E7CE');

    const ing = store.products.filter((p) => p.ingredient);
    const cols = 3, w = (b.x1 - b.x0 - 0.3) / cols;
    let total = 0, cap = 0;
    ing.forEach((prod, k) => {
      const ps = ss.products[prod.index];
      if (!ps.built) return;
      total += ps.shelf; cap += CFG.SHELF_CAP;
      const gx = b.x0 + 0.15 + (k % cols) * w + w / 2;
      const gy = b.y0 + 0.34 + ((k / cols) | 0) * 0.5;
      for (let s = 0; s < Math.min(ps.shelf, 3); s++) {
        MSM.render.fx.item(ctx, prod, gx, gy, 1.03 + s * 0.10, 0.24);
      }
      if (ps.shelf > 0) return;
      const e = iso.s(gx, gy, 1.06);
      ctx.globalAlpha = 0.35;
      MSM.art.draw(ctx, prod.art, e.x, e.y, iso.TW * 0.2, '#B9C4D6');
      ctx.globalAlpha = 1;
    });

    // one honest headline number: how full the bar's larder is
    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 1.75);
    tag(ctx, t.x, t.y, '📦 ' + total + '/' + cap, total === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  /* ------------------------------------------------------------ machines */
  function drawMachine(ctx, mi) {
    const spec = P.machines[mi], ms = MSM.econ.cstate().machines[mi];
    const b = spec.box;
    const { rrect, tag } = fx();

    if (!ms.built) {
      fx().buildPlot(ctx, b, ms.buildPaid, spec.cost, '🔒 ' + spec.label.toUpperCase());
      return;
    }

    const s = SKIN[spec.id] || SKIN.coffee;
    // a counter, then the appliance sitting on it
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.62, '#8A5A2B');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.622, '#D8C0A0');
    iso.box(ctx, b.x0 + 0.18, b.y0 + 0.12, b.x1 - 0.18, b.y1 - 0.42, 0.62, 1.42, s.body);
    iso.tile(ctx, b.x0 + 0.22, b.y0 + 0.16, b.x1 - 0.22, b.y1 - 0.46, 1.422, U.shade(s.body, 0.2));
    iso.faceL(ctx, b.y1 - 0.42, b.x0 + 0.26, b.x1 - 0.26, 0.78, 1.28, U.shade(s.body, -0.18));
    iso.faceL(ctx, b.y1 - 0.42, b.x0 + 0.38, b.x1 - 0.38, 0.9, 1.16, s.trim);

    if (spec.id === 'coffee') {
      // two group heads with a portafilter under each
      [0.34, 0.66].forEach((f) => {
        const gx = b.x0 + 0.26 + (b.x1 - b.x0 - 0.52) * f;
        iso.box(ctx, gx - 0.09, b.y1 - 0.48, gx + 0.09, b.y1 - 0.4, 0.66, 0.78, '#39424F');
        const g = iso.s(gx, b.y1 - 0.44, 0.70);
        ctx.beginPath(); ctx.arc(g.x, g.y, iso.TW * 0.05, 0, TAU);
        ctx.fillStyle = s.glow; ctx.fill();
      });
    } else if (spec.id === 'bar') {
      // a whisk bowl and the ice hopper
      const g = iso.s(b.x0 + 0.55, b.y1 - 0.62, 1.45);
      ctx.beginPath(); ctx.ellipse(g.x, g.y, iso.TW * 0.13, iso.TH * 0.13, 0, 0, TAU);
      ctx.fillStyle = '#F6E7CE'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(g.x, g.y, iso.TW * 0.09, iso.TH * 0.09, 0, 0, TAU);
      ctx.fillStyle = s.glow; ctx.fill();
      iso.box(ctx, b.x1 - 0.66, b.y0 + 0.2, b.x1 - 0.28, b.y0 + 0.5, 1.42, 1.86, '#CDEEFF');
    } else {
      // an oven door with a warm window in it
      iso.faceL(ctx, b.y1 - 0.42, b.x0 + 0.42, b.x1 - 0.42, 0.94, 1.14, s.glow);
    }

    // cups waiting on top of the machine, one per cup on the go
    const jobs = K.jobs[mi] || [];
    const info = MSM.econ.machine(mi);
    jobs.forEach((job, j) => {
      const gx = b.x0 + 0.45 + j * 0.42;
      MSM.render.fx.item(ctx, MSM.econ.prod(job.n), gx, b.y0 + 0.3, 1.44, 0.24);
    });

    /* Brewing: one bar per cup, so a level-3 machine visibly runs three. */
    if (jobs.length) {
      const c = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.15, 2.05);
      const w = Math.max(52, iso.TW * 0.7), h = Math.max(7, iso.TW * 0.09);
      jobs.forEach((job, j) => {
        const y = c.y + j * (h + 3);
        rrect(ctx, c.x - w / 2, y, w, h, h / 2);
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
        rrect(ctx, c.x - w / 2 + 1, y + 1, (w - 2) * U.clamp(job.t / job.dur, 0, 1), h - 2, (h - 2) / 2);
        ctx.fillStyle = '#5FE08D'; ctx.fill();
      });
      return;
    }

    // idle: say what it is and how many cups it can hold at once
    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.15, 2.0);
    const waiting = K.orders.filter((o) => MSM.econ.prod(o.n).machineIndex === mi);
    if (waiting.length) {
      const short = !K.stocked(waiting[0].n);
      tag(ctx, t.x, t.y,
          short ? MSM.t('cafe.short') : MSM.econ.prod(waiting[0].n).glyph + ' ' + MSM.t('cafe.brewMe'),
          short ? '#FFD6D6' : '#FFF0C4');
    } else {
      tag(ctx, t.x, t.y, MSM.t('world.lv') + ' ' + info.level + ' · ' + info.cap + '☕', '#FFFFFF');
    }
  }

  /** A machine's level pad, twin of the product pads in the mini mart. */
  function drawMachinePad(ctx, mi) {
    const spec = P.machines[mi], ms = MSM.econ.cstate().machines[mi];
    if (!ms.built) return;
    const b = spec.pad;
    const { rrect, text } = fx();
    const cost = MSM.econ.machineCost(mi);
    const pct = U.clamp((ms.pay || 0) / cost, 0, 1);

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
    text(ctx, MSM.t('world.lv') + ' ' + ms.level, c.x, c.y - h * 0.68 - 4, h * 0.32, '#8A95AB');
    text(ctx, label, c.x, c.y - h * 0.26 - 4, h * 0.36,
         MSM.state.cash >= cost ? '#2CA85C' : '#98A6C4');
  }

  /* ------------------------------------------------------ pickup counter */
  function drawPickup(ctx) {
    const b = P.pickup, cs = MSM.econ.cstate();
    const { tag } = fx();

    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.66, '#B07A4E');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.662, '#E4C79B');
    iso.faceL(ctx, b.y1, b.x0 + 0.1, b.x1 - 0.1, 0.1, 0.56, '#8A5A2B');
    iso.faceL(ctx, b.y1, b.x0 + 0.3, b.x1 - 0.3, 0.2, 0.46, '#F6E7CE');

    cs.ready.forEach((r, k) => {
      MSM.render.fx.item(ctx, MSM.econ.prod(r.n),
        b.x0 + 0.32 + (k % 4) * 0.55, b.y0 + 0.26 + (((k / 4) | 0) * 0.34), 0.66, 0.28);
    });

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.1, 1.25);
    tag(ctx, t.x, t.y,
        cs.ready.length ? MSM.t('cafe.pickup') + ' ' + cs.ready.length : MSM.t('cafe.pickup'),
        cs.ready.length ? '#DFF5E6' : '#FFFFFF');
  }

  /** ORDER HERE, over the counter, so the queue makes sense on sight. */
  function drawOrderSign(ctx) {
    const b = P.till;
    if (!MSM.econ.sstate().till) return;
    const { rrect, text } = fx();
    const c = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.1, 1.45);
    const w = Math.max(96, iso.TW * 1.2), h = Math.max(24, iso.TW * 0.3);
    ctx.save();
    ctx.shadowColor = '#0b1c3d40'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    rrect(ctx, c.x - w / 2, c.y - h, w, h, h * 0.3);
    ctx.fillStyle = '#4A3527'; ctx.fill();
    ctx.restore();
    text(ctx, MSM.t('cafe.order'), c.x, c.y - h * 0.5, h * 0.46, '#FFE9AE');
  }

  /* -------------------------------------------------------------- tables */
  /* A stool. It is its own entry in the painter's sort rather than part of
     drawTable, because the seats stand 0.62 clear of the table on either
     side: drawn with the table they took the TABLE's corner as their depth,
     and anyone standing beside the near stool was painted straight over it. */
  function drawChair(ctx, sx, cy) {
    iso.box(ctx, sx - 0.2, cy - 0.2, sx + 0.2, cy + 0.2, 0, 0.4, '#A8763F');
    iso.tile(ctx, sx - 0.18, cy - 0.18, sx + 0.18, cy + 0.18, 0.402, '#C79154');
    iso.box(ctx, sx - 0.2, cy + 0.14, sx + 0.2, cy + 0.2, 0.4, 0.86, '#8A5A2B');
  }

  function drawTable(ctx, ti) {
    const spec = P.tables[ti], ts = MSM.econ.cstate().tables[ti], b = spec.box;
    const { tag, shadow } = fx();

    if (!ts.built) {
      fx().buildPlot(ctx, b, ts.buildPaid, spec.cost, '🪑 ' + MSM.t('cafe.seating'));
      return;
    }

    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    shadow(ctx, cx, cy, 0.8);

    iso.box(ctx, cx - 0.09, cy - 0.09, cx + 0.09, cy + 0.09, 0, 0.62, '#7A6A5A');
    iso.box(ctx, b.x0 + 0.1, b.y0 + 0.1, b.x1 - 0.1, b.y1 - 0.1, 0.62, 0.72,
            ts.dirty ? '#C9B79E' : '#E8D6BC');
    iso.tile(ctx, b.x0 + 0.14, b.y0 + 0.14, b.x1 - 0.14, b.y1 - 0.14, 0.722,
             ts.dirty ? '#DCCCB4' : '#F6E7CE');

    if (!ts.dirty) return;
    // what the last customer left behind
    const cup = MSM.econ.store().products.find((p) => p.art === 'espresso');
    if (cup) MSM.render.fx.item(ctx, cup, cx - 0.2, cy, 0.72, 0.24);
    const pl = iso.s(cx + 0.24, cy + 0.1, 0.74);
    ctx.beginPath(); ctx.ellipse(pl.x, pl.y, iso.TW * 0.12, iso.TH * 0.12, 0, 0, TAU);
    ctx.fillStyle = '#E4EBF5'; ctx.fill();
    const t = iso.s(cx, cy, 1.35);
    tag(ctx, t.x, t.y, '🧹 ' + MSM.t('cafe.wipe'), '#FFD6D6');
  }

  /* ---------------------------------------------------------- the frame */
  /* Everything above, handed to render.js's painter's-algorithm sort. */
  K.collect = function (items, ctx) {
    const cs = MSM.econ.cstate();
    if (!cs) return;

    const st = P.storage;
    items.push({ d: st.x1 + st.y1, fn: () => drawStorage(ctx) });
    items.push({ d: P.pickup.x1 + P.pickup.y1, fn: () => drawPickup(ctx) });
    items.push({ d: P.till.x1 + P.till.y1 + 0.01, fn: () => drawOrderSign(ctx) });

    P.machines.forEach((spec, mi) => {
      items.push({ d: spec.box.x1 + spec.box.y1, fn: () => drawMachine(ctx, mi) });
      items.push({ d: spec.pad.x1 + spec.pad.y1 - 0.5, fn: () => drawMachinePad(ctx, mi) });
    });
    P.tables.forEach((spec, ti) => {
      const b = spec.box, cy = (b.y0 + b.y1) / 2;
      items.push({ d: b.x1 + b.y1, fn: () => drawTable(ctx, ti) });
      if (!cs.tables[ti].built) return;
      [b.x0 - 0.62, b.x1 + 0.62].forEach((sx) => {
        items.push({ d: sx + cy + 0.4, fn: () => drawChair(ctx, sx, cy) });
      });
    });
  };

  /* ------------------------------------------------------ over a customer */
  /* The ring is the whole read of the stage: green means you have time,
     red means they are about to walk. */
  K.overlay = function (ctx, c, head) {
    const { rrect, text } = fx();
    const u = iso.TW / 64;
    const s = iso.s(c.x, c.y, 0);

    // the last item put in their hand, once the order is complete
    if (c.served && c.carry && c.carryP >= 0) {
      const prod = MSM.econ.prod(c.carryP);
      MSM.art.draw(ctx, prod.art, s.x + 12 * u, s.y - 9 * u, 15 * u, prod.color);
    }

    const showRing = c.phase === 'queue' || c.phase === 'toWait' || c.phase === 'wait';
    if (!showRing) return;

    const r = Math.max(17, iso.TW * 0.21);
    const x = head.x, y = head.y - r - 4 * u;
    const pct = U.clamp(c.patience, 0, 1);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 3.5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * pct);
    ctx.strokeStyle = pct > 0.55 ? '#2CA85C' : pct > 0.28 ? '#FFB020' : '#E0553F';
    ctx.lineWidth = 3.2 * u;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    /* A ticket number on the ones already waiting, so you can tell "ordered"
       from "still queueing" without reading the ring. */
    if (c.phase === 'queue') return;
    const bx = x + r * 0.78, by = y - r * 0.72;
    rrect(ctx, bx - r * 0.38, by - r * 0.3, r * 0.76, r * 0.6, r * 0.18);
    ctx.fillStyle = '#16295C'; ctx.fill();
    text(ctx, '🎫', bx, by, r * 0.42, '#FFFFFF');
  };
})();
