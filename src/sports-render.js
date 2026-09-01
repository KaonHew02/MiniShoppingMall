/* The sport outlet's own fixtures.

   Kept apart from render.js for the same reason cafe-render.js is: the mini
   mart has no idea any of this exists. Everything here hangs off MSM.sports
   and borrows MSM.render.fx for the drawing primitives.

   The courts are where the art budget went, because the trial is what the
   stage is about. Each one has to say what it is from across the room: a
   treadmill, a goal, a hoop, a net. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, P = MSM.CFG.PLAN;
  const iso = MSM.iso, K = MSM.sports;
  const fx = () => MSM.render.fx;
  const TAU = Math.PI * 2;

  /* Each court gets its own line paint, so the four zones read apart even
     with the equipment out of frame. */
  const COURT = {
    run:    { floor: '#2E6FB0', line: '#BFE3FF', kit: '#3E4A66' },
    foot:   { floor: '#2E8F52', line: '#DFF3E4', kit: '#F4F8FC' },
    basket: { floor: '#C77A33', line: '#FFE0B8', kit: '#FF8A3D' },
    bad:    { floor: '#4A8F86', line: '#DFF3EF', kit: '#F4F8FC' },
  };

  /* --------------------------------------------------------- stock crates */
  /* The back room, and nothing more: a stack of taped cartons with the line's
     own goods showing on top, and a count so an empty one is obvious. */
  function drawStock(ctx, n) {
    const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n), b = prod.crate;
    const { item, tag } = fx();

    // a pallet, then the carton stack sitting on it
    iso.box(ctx, b.x0, b.y1 - 0.34, b.x1, b.y1 - 0.06, 0, 0.12, '#8A6034');
    iso.box(ctx, b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1 - 0.30, 0, 0.14, '#8A6034');
    iso.box(ctx, b.x0 + 0.10, b.y0 + 0.10, b.x1 - 0.10, b.y1 - 0.34, 0.14, 0.86, '#C79154');
    iso.tile(ctx, b.x0 + 0.14, b.y0 + 0.14, b.x1 - 0.14, b.y1 - 0.38, 0.862, '#DCA96C');
    // packing tape down the middle of the front face
    iso.faceL(ctx, b.y1 - 0.34, b.x0 + 0.10, b.x1 - 0.10, 0.44, 0.52, '#EBD3AE');
    iso.faceL(ctx, b.y1 - 0.34, (b.x0 + b.x1) / 2 - 0.06, (b.x0 + b.x1) / 2 + 0.06,
              0.14, 0.86, '#EBD3AE');
    // the line's colour on a shipping label, so a crate is findable at a glance
    iso.faceL(ctx, b.y1 - 0.34, b.x0 + 0.26, b.x0 + 0.72, 0.30, 0.66,
              U.shade(prod.color, -0.05));

    // what is in it, piled on the lid
    for (let k = 0; k < Math.min(ps.out, 6); k++) {
      item(ctx, prod, b.x0 + 0.38 + (k % 3) * 0.42, b.y0 + 0.28 + (((k / 3) | 0) * 0.34),
           0.86, 0.26);
    }

    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.2, 1.55);
    tag(ctx, t.x, t.y, prod.glyph + ' ' + ps.out, ps.out === 0 ? '#FFD6D6' : '#FFFFFF');
  }

  /* One entry point, because render.js only knows about `source.kind`. */
  K.drawSource = function (ctx, n) { drawStock(ctx, n); };

  /* ---------------------------------------------------------- the courts */
  /** A treadmill: deck, belt, side rails and a little console. */
  function propRun(ctx, b, skin) {
    const cx = (b.x0 + b.x1) / 2;
    iso.box(ctx, b.x0 + 0.1, b.y0 + 0.5, b.x1 - 0.1, b.y1, 0, 0.30, '#39424F');
    iso.tile(ctx, b.x0 + 0.22, b.y0 + 0.62, b.x1 - 0.22, b.y1 - 0.1, 0.302, '#20262F');
    // the belt's slats
    for (let y = b.y0 + 0.72; y < b.y1 - 0.16; y += 0.16) {
      iso.tile(ctx, b.x0 + 0.26, y, b.x1 - 0.26, y + 0.05, 0.304, '#39424F');
    }
    // uprights and the console panel across the front
    iso.box(ctx, b.x0 + 0.16, b.y0 + 0.36, b.x0 + 0.30, b.y0 + 0.50, 0.30, 1.30, '#5A6472');
    iso.box(ctx, b.x1 - 0.30, b.y0 + 0.36, b.x1 - 0.16, b.y0 + 0.50, 0.30, 1.30, '#5A6472');
    iso.box(ctx, b.x0 + 0.16, b.y0 + 0.30, b.x1 - 0.16, b.y0 + 0.52, 1.30, 1.62, '#C9D2DC');
    iso.faceL(ctx, b.y0 + 0.52, b.x0 + 0.34, b.x1 - 0.34, 1.38, 1.56, skin.floor);
    const c = iso.s(cx, b.y0 + 0.52, 1.47);
    fx().text(ctx, '5.0', c.x, c.y, Math.max(8, iso.TW * 0.14), '#DFF3FF');
  }

  /** A goal: posts, a crossbar, netting, and a ball waiting on the spot. */
  function propFoot(ctx, b, skin) {
    const cx = (b.x0 + b.x1) / 2;
    const post = 0.10;
    iso.box(ctx, b.x0 + 0.2, b.y0 + 0.2, b.x0 + 0.2 + post, b.y0 + 0.2 + post, 0, 1.70, '#F4F8FC');
    iso.box(ctx, b.x1 - 0.2 - post, b.y0 + 0.2, b.x1 - 0.2, b.y0 + 0.2 + post, 0, 1.70, '#F4F8FC');
    iso.box(ctx, b.x0 + 0.2, b.y0 + 0.2, b.x1 - 0.2, b.y0 + 0.2 + post, 1.70, 1.84, '#F4F8FC');

    // the net, drawn flat on the goal mouth so it reads as mesh not a slab
    const o = iso.s(b.x0 + 0.2, b.y0 + 0.26, 1.70);
    ctx.save();
    ctx.transform((iso.TW / 2) / iso.ZH, (iso.TH / 2) / iso.ZH, 0, 1, o.x, o.y);
    const w = (b.x1 - b.x0 - 0.4) * iso.ZH, h = 1.70 * iso.ZH;
    ctx.strokeStyle = '#FFFFFF66';
    ctx.lineWidth = Math.max(1, iso.TW * 0.014);
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo((w / 6) * i, 0); ctx.lineTo((w / 6) * i, h); ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath(); ctx.moveTo(0, (h / 5) * i); ctx.lineTo(w, (h / 5) * i); ctx.stroke();
    }
    ctx.restore();

    MSM.art.draw(ctx, 'football', ...ballAt(cx, b.y1 + 0.18), iso.TW * 0.30, skin.kit);
  }

  /** A hoop: post, backboard, ring — and the ball on the floor under it. */
  function propBasket(ctx, b, skin) {
    const cx = (b.x0 + b.x1) / 2;
    iso.box(ctx, cx - 0.10, b.y0 + 0.22, cx + 0.10, b.y0 + 0.42, 0, 2.05, '#5A6472');
    iso.box(ctx, cx - 0.62, b.y0 + 0.30, cx + 0.62, b.y0 + 0.40, 1.55, 2.30, '#F4F8FC');
    iso.faceL(ctx, b.y0 + 0.40, cx - 0.24, cx + 0.24, 1.70, 2.04, skin.kit);
    // the ring, hanging off the front of the board
    const r = iso.s(cx, b.y0 + 0.62, 1.66);
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, iso.TW * 0.17, iso.TH * 0.17, 0, 0, TAU);
    ctx.strokeStyle = '#FF8A3D';
    ctx.lineWidth = Math.max(2, iso.TW * 0.035);
    ctx.stroke();
    MSM.art.draw(ctx, 'ball', ...ballAt(cx + 0.7, b.y1 + 0.2), iso.TW * 0.28, '#FF8A3D');
  }

  /** A badminton net: two posts and a taped mesh strung between them. */
  function propBad(ctx, b, skin) {
    iso.box(ctx, b.x0 + 0.18, b.y0 + 0.55, b.x0 + 0.30, b.y0 + 0.67, 0, 1.35, '#5A6472');
    iso.box(ctx, b.x1 - 0.30, b.y0 + 0.55, b.x1 - 0.18, b.y0 + 0.67, 0, 1.35, '#5A6472');

    const o = iso.s(b.x0 + 0.24, b.y0 + 0.61, 1.32);
    ctx.save();
    ctx.transform((iso.TW / 2) / iso.ZH, (iso.TH / 2) / iso.ZH, 0, 1, o.x, o.y);
    const w = (b.x1 - b.x0 - 0.42) * iso.ZH, h = 0.72 * iso.ZH;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h * 0.16);
    ctx.strokeStyle = '#FFFFFF88';
    ctx.lineWidth = Math.max(1, iso.TW * 0.012);
    for (let i = 0; i <= 12; i++) {
      ctx.beginPath(); ctx.moveTo((w / 12) * i, h * 0.16); ctx.lineTo((w / 12) * i, h); ctx.stroke();
    }
    for (let i = 1; i <= 4; i++) {
      const y = h * 0.16 + ((h * 0.84) / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    MSM.art.draw(ctx, 'shuttle', ...ballAt((b.x0 + b.x1) / 2 + 0.8, b.y1 + 0.15),
                 iso.TW * 0.26, skin.kit);
  }

  /** Screen position for a loose ball resting on the court floor. */
  function ballAt(x, y) {
    const s = iso.s(x, y, 0);
    return [s.x, s.y];
  }

  const PROP = { run: propRun, foot: propFoot, basket: propBasket, bad: propBad };

  /* A court: painted floor with its markings, then the equipment on it. An
     unbuilt one is a construction plot you walk onto, like everything else. */
  function drawArea(ctx, ai) {
    const spec = P.areas[ai], as = MSM.econ.spstate().areas[ai];
    const b = spec.box;

    if (!as.built) {
      fx().buildPlot(ctx, b, as.buildPaid, spec.cost, '🧪 ' + spec.label.toUpperCase());
      return;
    }

    const skin = COURT[spec.sport] || COURT.run;
    iso.tile(ctx, b.x0, b.y0, b.x1, b.y1, 0.004, skin.floor);
    iso.tile(ctx, b.x0 + 0.18, b.y0 + 0.18, b.x1 - 0.18, b.y1 - 0.18, 0.006,
             U.shade(skin.floor, 0.12));
    // court markings: a border and a centre line
    const inset = 0.34;
    [[b.x0 + inset, b.y0 + inset, b.x1 - inset, b.y0 + inset + 0.06],
     [b.x0 + inset, b.y1 - inset - 0.06, b.x1 - inset, b.y1 - inset],
     [b.x0 + inset, b.y0 + inset, b.x0 + inset + 0.06, b.y1 - inset],
     [b.x1 - inset - 0.06, b.y0 + inset, b.x1 - inset, b.y1 - inset],
     [b.x0 + inset, (b.y0 + b.y1) / 2 - 0.03, b.x1 - inset, (b.y0 + b.y1) / 2 + 0.03],
    ].forEach((m) => iso.tile(ctx, m[0], m[1], m[2], m[3], 0.008, skin.line));

    (PROP[spec.sport] || propRun)(ctx, spec.prop, skin);

    // how many people are on it right now — an idle court is money sitting still
    const busy = MSM.ent.customers.filter((c) => c.phase === 'try' &&
      MSM.econ.prod(c.want).areaIndex === ai).length;
    const t = iso.s((b.x0 + b.x1) / 2, b.y0 + 0.08, 0.9);
    fx().tag(ctx, t.x, t.y, busy ? '🧪 ' + busy : spec.label.toUpperCase(),
             busy ? '#DFF5E6' : '#FFFFFF');
  }

  /* ---------------------------------------------------------- the frame */
  K.collect = function (items, ctx) {
    const sp = MSM.econ.spstate();
    if (!sp) return;
    P.areas.forEach((spec, ai) => {
      /* Sort the court by its FAR edge so the painted floor lands under the
         people standing on it, and the equipment behind them. */
      items.push({ d: spec.box.x0 + spec.box.y0 + 0.01, fn: () => drawArea(ctx, ai) });
    });
  };

  /* ------------------------------------------------------ over a shopper */
  /* Three things have to be readable over a customer's head: how long they
     will wait, whether they still want talking to, and — while they are on
     the court — how far through the trial they are. */
  K.overlay = function (ctx, c, head) {
    const { rrect, text } = fx();
    const u = iso.TW / 64;
    const r = Math.max(17, iso.TW * 0.21);
    const x = head.x, y = head.y - r - 4 * u;

    // the verdict, for a beat, right after they make up their mind
    if (c.verdict && c.verdictT > 0) {
      const face = c.verdict === 'buy' ? '😊' : c.verdict === 'costly' ? '😕' : '😞';
      const col = c.verdict === 'buy' ? '#2CA85C' : '#E0553F';
      const s = iso.s(c.x, c.y, 0);
      rrect(ctx, s.x - 15 * u, s.y - 58 * u, 30 * u, 22 * u, 11 * u);
      ctx.fillStyle = col; ctx.fill();
      text(ctx, face, s.x, s.y - 47 * u, 15 * u, '#FFFFFF');
    }

    // the trial itself: a bar that fills while they are using the thing
    if (c.phase === 'try' && c.tryDur > 0) {
      const w = Math.max(46, iso.TW * 0.62), h = Math.max(7, iso.TW * 0.09);
      rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      rrect(ctx, x - w / 2 + 1, y - h / 2 + 1,
            (w - 2) * U.clamp(c.tryT / c.tryDur, 0, 1), h - 2, (h - 2) / 2);
      ctx.fillStyle = '#FFC53D'; ctx.fill();
      return;
    }

    const showRing = c.phase === 'queue' ||
      (c.phase === 'browse' && MSM.econ.pstate(c.want).shelf <= 0);
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

    /* The ❓ is your to-do list on this floor: every one of them is a sale
       you can still swing by walking over and standing there. */
    if (!K.advisable(c)) return;
    const bx = x + r * 0.82, by = y - r * 0.74;
    ctx.beginPath(); ctx.arc(bx, by, r * 0.40, 0, TAU);
    ctx.fillStyle = '#4FB0FF'; ctx.fill();
    text(ctx, '?', bx, by, r * 0.56, '#FFFFFF');
  };
})();
