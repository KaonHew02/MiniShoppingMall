/* Fast food's own fixtures.

   One thing matters more than anything else on this floor: WHICH STATION IS
   HOLDING EVERYTHING UP. So every station wears its own load — the parts
   cooking on it and the parts still queued for it — and the worst one is
   marked in red. Read the three numbers and you know where your money goes.

   The rest is the chain that number sits in: freezers at the back, line bins
   the runners fill, the assembly bench, and the pickup counter. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, P = MSM.CFG.PLAN, F = MSM.CFG.FOOD;
  const iso = MSM.iso, K = MSM.food;
  const fx = () => MSM.render.fx;
  const TAU = Math.PI * 2;

  const SKIN = {
    grill:  { body: '#5A6472', trim: '#39424F', glow: '#FF6A3D' },
    fryer:  { body: '#C9D2DC', trim: '#8A95AB', glow: '#F2C23D' },
    drinks: { body: '#2F8FE8', trim: '#1F6BB0', glow: '#CDEEFF' },
  };

  /* -------------------------------------------------------- the freezers */
  function drawFreezer(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.crate;
    const { item, tag } = fx();

    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.20, '#8A95AB');
    iso.box(ctx, b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1 - 0.28, 0.20, 1.00, '#C9D2DC');
    iso.tile(ctx, b.x0 + 0.10, b.y0 + 0.10, b.x1 - 0.10, b.y1 - 0.32, 1.002, '#E7EEF7');
    // a frosted glass lid and the chill stripe
    iso.faceL(ctx, b.y1 - 0.28, b.x0 + 0.10, b.x1 - 0.10, 0.50, 0.86, '#DFF0FA');
    iso.faceL(ctx, b.y1 - 0.28, b.x0 + 0.10, b.x1 - 0.10, 0.24, 0.40,
              U.shade(prod.color, 0.05));

    for (let k = 0; k < Math.min(ps.out, 6); k++) {
      item(ctx, prod, b.x0 + 0.38 + (k % 3) * 0.42, b.y0 + 0.26 + (((k / 3) | 0) * 0.32),
           1.00, 0.24);
    }
    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 1.70);
    tag(ctx, t.x, t.y, prod.glyph + ' ' + ps.out, ps.out === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  K.drawSource = function (ctx, n) { drawFreezer(ctx, n); };

  /* ------------------------------------------------------- the line bins */
  /* Raw stock waiting at the station that cooks it. Empty means that
     station cannot start, however fast it is — the quieter of the stage's
     two failure modes, and the one a runner fixes. */
  function drawLineBin(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.shelf;
    const { item, tag } = fx();

    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.44, '#9AA5B5');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.442, '#C9D2DC');
    iso.faceL(ctx, b.y1, b.x0 + 0.08, b.x1 - 0.08, 0.06, 0.38, '#7A8494');
    iso.faceL(ctx, b.y1, b.x0 + 0.20, b.x1 - 0.20, 0.12, 0.30,
              U.shade(prod.color, 0.10));

    for (let k = 0; k < Math.min(ps.shelf, 6); k++) {
      item(ctx, prod, b.x0 + 0.30 + (k % 3) * 0.42, b.y0 + 0.24 + (((k / 3) | 0) * 0.30),
           0.44, 0.24);
    }

    if (ps.shelf > CFG.SHELF_CAP * 0.5) return;
    const t = iso.s((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 1.10);
    tag(ctx, t.x, t.y, prod.glyph + ' ' + ps.shelf, ps.shelf === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  K.drawRack = function (ctx, n) { drawLineBin(ctx, n); };

  /* -------------------------------------------------------- the stations */
  /** Which station is worst right now — the one the shop is waiting on. */
  function worstStation() {
    const fs = MSM.econ.fstate();
    let worst = -1, load = 1;
    P.machines.forEach((spec, mi) => {
      if (!fs.stations[mi].built) return;
      const n = K.load(mi);
      if (n > load) { load = n; worst = mi; }
    });
    return worst;
  }

  function drawStation(ctx, mi) {
    const spec = P.machines[mi], st = MSM.econ.fstate().stations[mi];
    const b = spec.box;
    const { rrect, tag, text } = fx();

    if (!st.built) {
      fx().buildPlot(ctx, b, st.buildPaid, spec.cost, '🔒 ' + spec.label.toUpperCase());
      return;
    }

    const s = SKIN[spec.id] || SKIN.grill;
    // a stainless counter with the appliance along it
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.66, '#8A95AB');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.662, '#D6DCE7');
    iso.box(ctx, b.x0 + 0.20, b.y0 + 0.10, b.x1 - 0.20, b.y1 - 0.46, 0.66, 1.34, s.body);
    iso.tile(ctx, b.x0 + 0.24, b.y0 + 0.14, b.x1 - 0.24, b.y1 - 0.50, 1.342, U.shade(s.body, 0.18));
    iso.faceL(ctx, b.y1 - 0.46, b.x0 + 0.26, b.x1 - 0.26, 0.76, 1.24, s.trim);

    if (spec.id === 'grill') {
      // hot bars glowing across the plate
      for (let gx = b.x0 + 0.55; gx < b.x1 - 0.5; gx += 0.42) {
        iso.tile(ctx, gx, b.y0 + 0.20, gx + 0.16, b.y1 - 0.52, 1.344, s.glow);
      }
    } else if (spec.id === 'fryer') {
      // two oil baskets side by side
      [0.32, 0.66].forEach((f) => {
        const gx = b.x0 + 0.3 + (b.x1 - b.x0 - 0.6) * f;
        iso.box(ctx, gx - 0.34, b.y0 + 0.22, gx + 0.34, b.y1 - 0.56, 1.34, 1.46, '#8A95AB');
        iso.tile(ctx, gx - 0.30, b.y0 + 0.26, gx + 0.30, b.y1 - 0.60, 1.462, s.glow);
      });
    } else {
      // a bank of nozzles over the cup rail
      for (let gx = b.x0 + 0.6; gx < b.x1 - 0.5; gx += 0.55) {
        iso.box(ctx, gx - 0.07, b.y1 - 0.56, gx + 0.07, b.y1 - 0.44, 0.90, 1.30, '#C9D2DC');
        const g = iso.s(gx, b.y1 - 0.50, 0.88);
        ctx.beginPath(); ctx.arc(g.x, g.y, iso.TW * 0.035, 0, TAU);
        ctx.fillStyle = s.glow; ctx.fill();
      }
    }

    // what is on right now, sat along the top of the appliance
    const jobs = K.jobs[mi] || [];
    jobs.forEach((job, j) => {
      const gx = b.x0 + 0.55 + j * 0.46;
      fx().item(ctx, MSM.econ.prod(job.n), gx, b.y0 + 0.26, 1.36, 0.24);
    });

    /* Cooking bars, one per part on the go. */
    const info = MSM.econ.station(mi);
    if (jobs.length) {
      const c = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.15, 2.00);
      const w = Math.max(52, iso.TW * 0.70), h = Math.max(7, iso.TW * 0.09);
      jobs.forEach((job, j) => {
        const y = c.y + j * (h + 3);
        rrect(ctx, c.x - w / 2, y, w, h, h / 2);
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
        rrect(ctx, c.x - w / 2 + 1, y + 1, (w - 2) * U.clamp(job.t / job.dur, 0, 1), h - 2, (h - 2) / 2);
        ctx.fillStyle = s.glow; ctx.fill();
      });
    }

    /* THE number: how much work this station is carrying. Red when it is the
       one everything else is waiting on. */
    const load = K.load(mi);
    const worst = worstStation();
    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.15, jobs.length ? 2.52 : 2.00);
    if (load > 0) {
      tag(ctx, t.x, t.y, spec.label + '  ' + load,
          mi === worst ? '#FFC9C0' : load > 2 ? '#FFF0C4' : '#FFFFFF');
    } else {
      tag(ctx, t.x, t.y, spec.label + ' · ' + MSM.t('world.lv') + ' ' + info.level + ' · ' +
          info.cap + '🍳', '#FFFFFF');
    }
  }

  /** A station's level pad — the way you actually relieve a bottleneck. */
  function drawStationPad(ctx, mi) {
    const spec = P.machines[mi], st = MSM.econ.fstate().stations[mi];
    if (!st.built) return;
    const b = spec.pad;
    const { rrect, text } = fx();
    const cost = MSM.econ.stationCost(mi);
    const pct = U.clamp((st.pay || 0) / cost, 0, 1);

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
    text(ctx, MSM.t('world.lv') + ' ' + st.level, c.x, c.y - h * 0.68 - 4, h * 0.32, '#8A95AB');
    text(ctx, label, c.x, c.y - h * 0.26 - 4, h * 0.36,
         MSM.state.cash >= cost ? '#2CA85C' : '#98A6C4');
  }

  /* ----------------------------------------- assembly and pickup counters */
  function drawAssembly(ctx) {
    const b = P.assembly;
    const { tag, rrect } = fx();
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.70, '#8A95AB');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.702, '#DDE4EE');
    iso.faceL(ctx, b.y1, b.x0 + 0.1, b.x1 - 0.1, 0.1, 0.60, '#7A8494');
    // wrapping paper and a stack of empty trays
    iso.box(ctx, b.x0 + 0.25, b.y0 + 0.18, b.x0 + 1.05, b.y1 - 0.20, 0.70, 0.82, '#F2C23D');
    iso.box(ctx, b.x1 - 1.05, b.y0 + 0.18, b.x1 - 0.25, b.y1 - 0.20, 0.70, 0.86, '#E8552F');

    const tk = K.nextTray();
    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.1, 1.62);
    if (tk && K.buildT > 0) {
      const w = Math.max(50, iso.TW * 0.68), h = Math.max(8, iso.TW * 0.10);
      rrect(ctx, t.x - w / 2, t.y - h / 2, w, h, h / 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      rrect(ctx, t.x - w / 2 + 1, t.y - h / 2 + 1,
            (w - 2) * U.clamp(K.buildT / F.ASSEMBLE_TIME, 0, 1), h - 2, (h - 2) / 2);
      ctx.fillStyle = '#FFC53D'; ctx.fill();
      return;
    }
    tag(ctx, t.x, t.y, tk ? MSM.t('food.assembleMe') : MSM.t('food.assembly'),
        tk ? '#FFF0C4' : '#FFFFFF');
  }

  function drawPickup(ctx) {
    const b = P.pickup;
    const { tag } = fx();
    iso.box(ctx, b.x0, b.y0, b.x1, b.y1, 0, 0.72, '#B07A4E');
    iso.tile(ctx, b.x0 + 0.05, b.y0 + 0.05, b.x1 - 0.05, b.y1 - 0.05, 0.722, '#E4C79B');
    iso.faceL(ctx, b.y1, b.x0 + 0.1, b.x1 - 0.1, 0.1, 0.62, '#8A5A2B');
    iso.faceL(ctx, b.y1, b.x0 + 0.3, b.x1 - 0.3, 0.2, 0.52, '#FFE9AE');

    // the trays, each with its number and its food on it
    K.trays.forEach((tray, k) => {
      const tx = b.x0 + 0.75 + (k % 3) * 1.20;
      const ty = b.y0 + 0.22 + (((k / 3) | 0) * 0.36);
      iso.box(ctx, tx - 0.40, ty - 0.14, tx + 0.40, ty + 0.14, 0.72, 0.76, '#E8552F');
      iso.tile(ctx, tx - 0.36, ty - 0.11, tx + 0.36, ty + 0.11, 0.762, '#F6E7CE');
      tray.items.slice(0, 3).forEach((n, j) => {
        fx().item(ctx, MSM.econ.prod(n), tx - 0.22 + j * 0.22, ty, 0.76, 0.18);
      });
      const nt = iso.s(tx, ty - 0.18, 1.06);
      fx().tag(ctx, nt.x, nt.y, '#' + tray.no, '#DFF5E6');
    });

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.1, 1.85);
    tag(ctx, t.x, t.y,
        K.trays.length ? MSM.t('food.pickup') + ' ' + K.trays.length : MSM.t('food.pickup'),
        K.trays.length ? '#DFF5E6' : '#FFFFFF');
  }

  /** ORDER HERE over the counter, so the queue makes sense on sight. */
  function drawOrderSign(ctx) {
    const b = P.till;
    if (!MSM.econ.sstate().till) return;
    const { rrect, text, late } = fx();
    /* High enough to clear the cashier's head, and queued with the other
       words so nobody standing at the counter can stand in front of it. */
    const c = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.1, 1.80);
    const w = Math.max(96, iso.TW * 1.2), h = Math.max(24, iso.TW * 0.3);
    late(() => {
      ctx.save();
      ctx.shadowColor = '#0b1c3d40'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      rrect(ctx, c.x - w / 2, c.y - h, w, h, h * 0.3);
      ctx.fillStyle = '#E8552F'; ctx.fill();
      ctx.restore();
      text(ctx, MSM.t('food.order'), c.x, c.y - h * 0.5, h * 0.46, '#FFF0C4');
    });
  }

  /* ---------------------------------------------------------- the frame */
  K.collect = function (items, ctx) {
    const fs = MSM.econ.fstate();
    if (!fs) return;
    P.machines.forEach((spec, mi) => {
      items.push({ d: spec.box.x1 + spec.box.y1, b: spec.box, fn: () => drawStation(ctx, mi) });
      items.push({ d: spec.pad.x1 + spec.pad.y1 - 0.5, fn: () => drawStationPad(ctx, mi) });
    });
    items.push({ d: P.assembly.x1 + P.assembly.y1, b: P.assembly, fn: () => drawAssembly(ctx) });
    items.push({ d: P.pickup.x1 + P.pickup.y1, b: P.pickup, fn: () => drawPickup(ctx) });
    items.push({ d: P.till.x1 + P.till.y1 + 0.01, fn: () => drawOrderSign(ctx) });
  };

  /* ------------------------------------------------------ over a customer */
  /* The ticket is the read: which parts of their order are up, and which
     one the kitchen is still chasing. */
  K.overlay = function (ctx, c, head) {
    const { rrect, text } = fx();
    const u = iso.TW / 64;
    const r = Math.max(17, iso.TW * 0.21);
    const x = head.x, y = head.y - r - 4 * u;

    // the tray in their hands on the way out
    if (c.served && c.carry && c.carryP >= 0) {
      const s = iso.s(c.x, c.y, 0);
      const prod = MSM.econ.prod(c.carryP);
      MSM.art.draw(ctx, prod.art, s.x + 12 * u, s.y - 9 * u, 14 * u, prod.color);
    }

    const tk = c.ticket;
    const showRing = c.phase === 'queue' || c.phase === 'toWait' || c.phase === 'wait' ||
                     c.phase === 'toPickup';
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

    if (!tk || c.served || c.phase === 'leave') return;

    /* The ticket itself: a numbered strip with a pip per part — filled once
       that part is cooked. Three greens and the tray is on its way. */
    const parts = tk.parts;
    const pw = Math.max(13, iso.TW * 0.19);
    const w = pw * parts.length + pw * 1.5, h = Math.max(19, iso.TW * 0.28);
    ctx.save();
    ctx.shadowColor = '#0b1c3d33'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    rrect(ctx, x - w / 2, y - h / 2, w, h, h * 0.3);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();
    text(ctx, '#' + tk.no, x - w / 2 + pw * 0.72, y, h * 0.44, '#8A95AB');
    parts.forEach((p, k2) => {
      const px = x - w / 2 + pw * 1.5 + pw * k2 + pw * 0.5;
      ctx.beginPath();
      ctx.arc(px, y, pw * 0.36, 0, TAU);
      ctx.fillStyle = p.done ? '#2CA85C' : p.cooking ? '#FFB020' : '#E4EBF5';
      ctx.fill();
    });
  };
})();
