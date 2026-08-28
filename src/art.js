/* Product artwork.
   Each painter draws one item *standing on* the point (x, y) — its base sits
   there and it grows upward by roughly `s` pixels. Shapes are kept bold and
   few-sided so they still read at ~24px on a shelf. */
window.MSM = window.MSM || {};

(function () {
  const U = MSM.util;
  const TAU = Math.PI * 2;

  const fill = (ctx, c) => { ctx.fillStyle = c; ctx.fill(); };
  const stroke = (ctx, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); };

  function ell(ctx, x, y, rx, ry, rot, c) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); fill(ctx, c);
  }
  function rr(ctx, x, y, w, h, r, c) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    if (c) fill(ctx, c);
  }

  /* Every painter gets (ctx, x, y, s, c) — c is the product's tint. */
  const P = {
    /* ---------------------------------------------------------- grocery */
    potato(ctx, x, y, s, c) {
      ctx.save(); ctx.translate(x, y - s * 0.3); ctx.rotate(-0.28);
      ell(ctx, 0, 0, s * 0.42, s * 0.29, 0, c);
      ell(ctx, -s * 0.1, -s * 0.09, s * 0.19, s * 0.1, -0.3, U.shade(c, 0.3));
      ctx.fillStyle = U.shade(c, -0.38);
      [[-0.16, 0.05], [0.13, -0.05], [0.04, 0.11]].forEach(([a, b]) => {
        ctx.beginPath(); ctx.ellipse(a * s, b * s, s * 0.036, s * 0.026, 0.5, 0, TAU); ctx.fill();
      });
      ctx.restore();
    },

    tomato(ctx, x, y, s, c) {
      const cy = y - s * 0.36;
      ell(ctx, x, cy, s * 0.37, s * 0.34, 0, c);
      ell(ctx, x - s * 0.12, cy - s * 0.1, s * 0.13, s * 0.08, -0.5, U.shade(c, 0.42));
      // calyx
      ctx.fillStyle = '#4CAF50';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * s * 0.14, cy - s * 0.27 + Math.sin(a) * s * 0.05,
                    s * 0.11, s * 0.045, a, 0, TAU);
        ctx.fill();
      }
      rr(ctx, x - s * 0.03, cy - s * 0.42, s * 0.06, s * 0.13, s * 0.03, '#3D8B40');
    },

    /* A gable-top carton. The product tint is near-white, so this one paints
       its own greys — a white slab on a white shelf is invisible. */
    milk(ctx, x, y, s) {
      const w = s * 0.42, h = s * 0.68, roof = h * 0.24;
      const x0 = x - w / 2, top = y - h, bodyTop = top + roof, bodyH = h - roof;

      rr(ctx, x0, bodyTop, w, bodyH, s * 0.02, '#FFFFFF');
      ctx.beginPath();                                    // shaded right face
      ctx.moveTo(x + w * 0.12, bodyTop); ctx.lineTo(x0 + w, bodyTop);
      ctx.lineTo(x0 + w, y); ctx.lineTo(x + w * 0.12, y); ctx.closePath();
      fill(ctx, '#DFE7F2');

      ctx.beginPath();                                    // gable, lit side
      ctx.moveTo(x0, bodyTop); ctx.lineTo(x, top); ctx.lineTo(x0 + w, bodyTop);
      ctx.closePath(); fill(ctx, '#F4F8FC');
      ctx.beginPath();                                    // gable, shaded side
      ctx.moveTo(x, top); ctx.lineTo(x0 + w, bodyTop); ctx.lineTo(x + w * 0.12, bodyTop);
      ctx.closePath(); fill(ctx, '#D3DEEC');
      rr(ctx, x - w * 0.04, top - s * 0.015, w * 0.08, roof * 0.4, s * 0.015, '#B9C7DA');

      rr(ctx, x0, bodyTop + bodyH * 0.3, w, bodyH * 0.3, 0, '#4FB0FF');
      ell(ctx, x, bodyTop + bodyH * 0.45, s * 0.05, s * 0.065, 0, '#FFFFFF');
    },

    /* A loaf: domed crust, flat bottom, pale cut face at the near end. */
    bread(ctx, x, y, s, c) {
      const w = s * 0.62, h = s * 0.44;
      const x0 = x - w / 2, top = y - h, cut = x0 + w * 0.3;

      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0, top + h * 0.45);
      ctx.bezierCurveTo(x0, top - h * 0.2, x0 + w, top - h * 0.2, x0 + w, top + h * 0.45);
      ctx.lineTo(x0 + w, y);
      ctx.closePath();
      fill(ctx, c);

      ctx.beginPath();                                    // sliced end
      ctx.moveTo(x0, y);
      ctx.lineTo(x0, top + h * 0.45);
      ctx.bezierCurveTo(x0, top - h * 0.06, cut, top - h * 0.06, cut, top + h * 0.45);
      ctx.lineTo(cut, y);
      ctx.closePath();
      fill(ctx, '#FBECCB');

      ctx.strokeStyle = U.shade(c, -0.3);                 // scored crust
      ctx.lineWidth = s * 0.045; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const bx = cut + w * 0.16 + k * w * 0.18;
        ctx.beginPath();
        ctx.moveTo(bx - w * 0.05, top + h * 0.28);
        ctx.lineTo(bx + w * 0.04, top + h * 0.05);
        ctx.stroke();
      }
    },

    /* A tied sheaf of wheat. */
    wheat(ctx, x, y, s, c) {
      ctx.strokeStyle = c; ctx.lineWidth = s * 0.055; ctx.lineCap = 'round';
      [-0.22, -0.08, 0.08, 0.22].forEach((o, i) => {
        ctx.beginPath();
        ctx.moveTo(x + o * s * 0.5, y);
        ctx.quadraticCurveTo(x + o * s, y - s * 0.32, x + o * s * 1.5, y - s * 0.58);
        ctx.stroke();
      });
      ctx.fillStyle = U.shade(c, 0.22);
      [-0.33, -0.12, 0.12, 0.33].forEach((o) => {
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(x + o * s * 1.5, y - s * (0.4 + k * 0.09), s * 0.05, s * 0.075, o * 0.8, 0, TAU);
          ctx.fill();
        }
      });
      rr(ctx, x - s * 0.11, y - s * 0.24, s * 0.22, s * 0.08, s * 0.03, U.shade(c, -0.35));
    },

    carrot(ctx, x, y, s, c) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.17, y - s * 0.5);
      ctx.lineTo(x + s * 0.17, y - s * 0.5);
      ctx.quadraticCurveTo(x + s * 0.07, y - s * 0.18, x, y);
      ctx.quadraticCurveTo(x - s * 0.07, y - s * 0.18, x - s * 0.17, y - s * 0.5);
      ctx.closePath();
      fill(ctx, c);
      ctx.strokeStyle = U.shade(c, -0.28); ctx.lineWidth = s * 0.028;
      [0.14, 0.26, 0.38].forEach((t) => {
        const half = s * 0.15 * (1 - t * 1.4);
        ctx.beginPath();
        ctx.moveTo(x - half, y - s * (0.5 - t));
        ctx.lineTo(x + half, y - s * (0.5 - t) - s * 0.03);
        ctx.stroke();
      });
      ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
      [-0.5, 0, 0.5].forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.5);
        ctx.quadraticCurveTo(x + a * s * 0.16, y - s * 0.66, x + a * s * 0.26, y - s * 0.76);
        ctx.stroke();
      });
    },

    eggplant(ctx, x, y, s, c) {
      const cy = y - s * 0.3;
      ctx.beginPath();
      ctx.ellipse(x, cy, s * 0.25, s * 0.31, 0, 0, TAU);
      fill(ctx, c);
      ell(ctx, x - s * 0.09, cy - s * 0.09, s * 0.07, s * 0.12, -0.4, U.shade(c, 0.34));
      ctx.fillStyle = '#4C9A3F';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * s * 0.11, cy - s * 0.26 + Math.sin(a) * s * 0.04,
                    s * 0.09, s * 0.04, a, 0, TAU);
        ctx.fill();
      }
      rr(ctx, x - s * 0.03, cy - s * 0.44, s * 0.06, s * 0.14, s * 0.03, '#3B7C32');
    },

    cabbage(ctx, x, y, s, c) {
      const cy = y - s * 0.29;
      ell(ctx, x, cy + s * 0.04, s * 0.34, s * 0.27, 0, U.shade(c, -0.26));   // outer leaf
      ell(ctx, x, cy, s * 0.27, s * 0.27, 0, c);
      ctx.strokeStyle = U.shade(c, 0.42); ctx.lineWidth = s * 0.035; ctx.lineCap = 'round';
      [-1, 0, 1].forEach((k) => {
        ctx.beginPath();
        ctx.arc(x + k * s * 0.09, cy + s * 0.05, s * 0.17, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      });
      ell(ctx, x - s * 0.09, cy - s * 0.11, s * 0.08, s * 0.05, -0.5, U.shade(c, 0.3));
    },

    /* An egg — a plain oval reads as one at any size. */
    egg(ctx, x, y, s, c) {
      const cy = y - s * 0.3;
      ctx.save();
      ctx.translate(x, cy); ctx.scale(1, 1.28);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.24, s * 0.24, 0, 0, TAU);
      ctx.fillStyle = c; ctx.fill();
      ctx.restore();
      ell(ctx, x - s * 0.07, cy - s * 0.1, s * 0.07, s * 0.05, -0.5, '#FFFFFF');
    },

    watermelon(ctx, x, y, s, c) {
      const cy = y - s * 0.31;
      ell(ctx, x, cy, s * 0.36, s * 0.31, 0, c);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, cy, s * 0.36, s * 0.31, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = U.shade(c, -0.35); ctx.lineWidth = s * 0.055;
      [-0.2, 0, 0.2].forEach((o) => {
        ctx.beginPath();
        ctx.moveTo(x + o * s, cy - s * 0.34);
        ctx.quadraticCurveTo(x + o * s * 1.9, cy, x + o * s, cy + s * 0.34);
        ctx.stroke();
      });
      ctx.restore();
      ell(ctx, x - s * 0.13, cy - s * 0.13, s * 0.09, s * 0.055, -0.5, U.shade(c, 0.4));
      rr(ctx, x - s * 0.025, cy - s * 0.4, s * 0.05, s * 0.1, s * 0.025, '#3B7C32');
    },

    strawberry(ctx, x, y, s, c) {
      const cy = y - s * 0.33;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - s * 0.34, y - s * 0.22, x - s * 0.3, cy - s * 0.24, x, cy - s * 0.2);
      ctx.bezierCurveTo(x + s * 0.3, cy - s * 0.24, x + s * 0.34, y - s * 0.22, x, y);
      ctx.closePath();
      fill(ctx, c);
      ctx.fillStyle = U.shade(c, 0.55);
      [[-0.11, -0.16], [0.1, -0.14], [0, -0.03], [-0.14, 0.02], [0.13, 0.03]].forEach(([a2, b2]) => {
        ctx.beginPath();
        ctx.ellipse(x + a2 * s, cy + b2 * s, s * 0.028, s * 0.042, 0.3, 0, TAU);
        ctx.fill();
      });
      ctx.fillStyle = '#4C9A3F';
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(ang) * s * 0.13, cy - s * 0.22 + Math.sin(ang) * s * 0.05,
                    s * 0.1, s * 0.045, ang, 0, TAU);
        ctx.fill();
      }
    },

    blueberry(ctx, x, y, s, c) {
      [[-0.14, -0.19, 0.15], [0.15, -0.16, 0.14], [0, -0.36, 0.15]].forEach(([dx, dy, r], i) => {
        const bx = x + dx * s, by = y + dy * s;
        ell(ctx, bx, by, s * r, s * r, 0, i === 2 ? U.shade(c, 0.12) : c);
        ell(ctx, bx - s * r * 0.32, by - s * r * 0.36, s * r * 0.36, s * r * 0.24, -0.5,
            U.shade(c, 0.42));
        ctx.fillStyle = U.shade(c, -0.4);
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * TAU - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * s * r * 0.3, by - s * r * 0.55 + Math.sin(ang) * s * r * 0.12,
                      s * r * 0.16, s * r * 0.07, ang, 0, TAU);
          ctx.fill();
        }
      });
    },

    apple(ctx, x, y, s, c) {
      const cy = y - s * 0.32;
      ell(ctx, x, cy, s * 0.31, s * 0.30, 0, c);
      ell(ctx, x - s * 0.1, cy - s * 0.09, s * 0.1, s * 0.07, -0.5, U.shade(c, 0.45));
      rr(ctx, x - s * 0.025, cy - s * 0.42, s * 0.05, s * 0.14, s * 0.025, '#7A4A22');
      ctx.save();
      ctx.translate(x + s * 0.09, cy - s * 0.36); ctx.rotate(-0.5);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.11, s * 0.055, 0, 0, TAU);
      ctx.fillStyle = '#4CAF50'; ctx.fill();
      ctx.restore();
    },

    banana(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y - s * 0.28);
      [0.1, -0.06].forEach((off, i) => {
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.06 + off * s);
        ctx.quadraticCurveTo(0, s * 0.3 + off * s, s * 0.3, -s * 0.06 + off * s);
        ctx.quadraticCurveTo(0, s * 0.12 + off * s, -s * 0.3, -s * 0.06 + off * s);
        ctx.closePath();
        fill(ctx, i ? U.shade(c, -0.12) : c);
      });
      ctx.fillStyle = '#6B5A22';
      ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.05, s * 0.045, s * 0.035, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.3, -s * 0.05, s * 0.045, s * 0.035, 0, 0, TAU); ctx.fill();
      ctx.restore();
    },

    orange(ctx, x, y, s, c) {
      const cy = y - s * 0.3;
      ell(ctx, x, cy, s * 0.29, s * 0.29, 0, c);
      ctx.strokeStyle = U.shade(c, -0.22); ctx.lineWidth = s * 0.022;
      ctx.beginPath(); ctx.arc(x, cy, s * 0.2, -0.4, 1.4); ctx.stroke();
      ell(ctx, x - s * 0.09, cy - s * 0.1, s * 0.08, s * 0.055, -0.5, U.shade(c, 0.4));
      rr(ctx, x - s * 0.02, cy - s * 0.36, s * 0.04, s * 0.08, s * 0.02, '#6B4A1E');
      ctx.save();
      ctx.translate(x + s * 0.07, cy - s * 0.33); ctx.rotate(-0.6);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.09, s * 0.045, 0, 0, TAU);
      ctx.fillStyle = '#3F8F3B'; ctx.fill();
      ctx.restore();
    },

    /* ----------------------------------------------------------- coffee */
    /* Cup on a saucer. Like milk, it paints its own greys — a white cup on a
       white shelf was reading as a floating puddle of coffee. */
    espresso(ctx, x, y, s, c) {
      const cw = s * 0.36, ch = s * 0.32, top = y - s * 0.08 - ch;
      ell(ctx, x, y - s * 0.02, s * 0.33, s * 0.095, 0, '#CFDAEA');
      ell(ctx, x, y - s * 0.05, s * 0.26, s * 0.07, 0, '#F2F6FB');

      ctx.beginPath(); ctx.arc(x + cw * 0.52, top + ch * 0.45, s * 0.1, -1.25, 1.25);
      stroke(ctx, '#CBD8E8', s * 0.07);

      ctx.beginPath();
      ctx.moveTo(x - cw / 2, top); ctx.lineTo(x + cw / 2, top);
      ctx.lineTo(x + cw * 0.37, y - s * 0.08); ctx.lineTo(x - cw * 0.37, y - s * 0.08);
      ctx.closePath(); fill(ctx, '#FFFFFF');
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.1, top); ctx.lineTo(x + cw / 2, top);
      ctx.lineTo(x + cw * 0.37, y - s * 0.08); ctx.lineTo(x + cw * 0.08, y - s * 0.08);
      ctx.closePath(); fill(ctx, '#DFE7F2');

      ell(ctx, x, top, cw / 2, s * 0.062, 0, c);
      ell(ctx, x - cw * 0.1, top - s * 0.005, cw * 0.16, s * 0.022, 0, U.shade(c, 0.3));
    },

    latte(ctx, x, y, s, c) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.19, y - s * 0.52); ctx.lineTo(x + s * 0.19, y - s * 0.52);
      ctx.lineTo(x + s * 0.14, y); ctx.lineTo(x - s * 0.14, y);
      ctx.closePath(); fill(ctx, c);
      rr(ctx, x - s * 0.22, y - s * 0.6, s * 0.44, s * 0.11, s * 0.04, U.shade(c, -0.25));
      rr(ctx, x + s * 0.02, y - s * 0.82, s * 0.07, s * 0.24, s * 0.03, '#FF5C8A');
    },

    croissant(ctx, x, y, s, c) {
      const cy = y - s * 0.24;
      ctx.beginPath();
      ctx.arc(x, cy + s * 0.16, s * 0.34, Math.PI * 1.08, Math.PI * 1.92);
      ctx.arc(x, cy + s * 0.3, s * 0.3, Math.PI * 1.9, Math.PI * 1.1, true);
      ctx.closePath(); fill(ctx, c);
      ctx.fillStyle = U.shade(c, -0.22);
      [-0.16, 0, 0.16].forEach((o) => {
        ctx.beginPath(); ctx.ellipse(x + o * s, cy - s * 0.05, s * 0.03, s * 0.09, o, 0, TAU); ctx.fill();
      });
    },

    cake(ctx, x, y, s, c) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.26, y); ctx.lineTo(x + s * 0.26, y);
      ctx.lineTo(x + s * 0.26, y - s * 0.34); ctx.lineTo(x - s * 0.26, y - s * 0.34);
      ctx.closePath(); fill(ctx, '#F6DDBE');
      rr(ctx, x - s * 0.26, y - s * 0.46, s * 0.52, s * 0.16, s * 0.04, c);
      ell(ctx, x, y - s * 0.55, s * 0.08, s * 0.08, 0, '#FF3B5C');
    },

    /* ----------------------------------------------------------- sports */
    ball(ctx, x, y, s, c) {
      const cy = y - s * 0.34;
      ell(ctx, x, cy, s * 0.33, s * 0.33, 0, c);
      ctx.beginPath(); ctx.moveTo(x - s * 0.33, cy); ctx.lineTo(x + s * 0.33, cy);
      ctx.moveTo(x, cy - s * 0.33); ctx.lineTo(x, cy + s * 0.33);
      stroke(ctx, U.shade(c, -0.45), s * 0.045);
      ctx.beginPath(); ctx.arc(x - s * 0.42, cy, s * 0.3, -0.7, 0.7);
      stroke(ctx, U.shade(c, -0.45), s * 0.045);
    },

    /* Side-on trainer: heel, instep, toe, thick white sole. */
    shoes(ctx, x, y, s, c) {
      const w = s * 0.64, h = s * 0.36, x0 = x - w / 2, top = y - h;
      ctx.beginPath();
      ctx.moveTo(x0, y - h * 0.26);
      ctx.lineTo(x0, top + h * 0.22);
      ctx.quadraticCurveTo(x0 + w * 0.3, top - h * 0.08, x0 + w * 0.5, top + h * 0.34);
      ctx.quadraticCurveTo(x0 + w * 0.8, top + h * 0.55, x0 + w, y - h * 0.2);
      ctx.closePath(); fill(ctx, c);

      rr(ctx, x0 - w * 0.02, y - h * 0.3, w * 1.04, h * 0.3, h * 0.15, '#FFFFFF');
      rr(ctx, x0 - w * 0.02, y - h * 0.14, w * 1.04, h * 0.08, h * 0.04, U.shade(c, -0.35));

      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.22, y - h * 0.36);
      ctx.quadraticCurveTo(x0 + w * 0.46, y - h * 0.66, x0 + w * 0.74, y - h * 0.44);
      stroke(ctx, '#FFFFFF', s * 0.05);
      rr(ctx, x0 + w * 0.04, top + h * 0.24, w * 0.16, h * 0.12, h * 0.05, U.shade(c, 0.35));
    },

    /* Racket with an actual string bed — the plain oval read as a lollipop. */
    racket(ctx, x, y, s, c) {
      const hy = y - s * 0.48, rx = s * 0.2, ry = s * 0.25;
      rr(ctx, x - s * 0.045, y - s * 0.32, s * 0.09, s * 0.32, s * 0.04, U.shade(c, -0.45));
      rr(ctx, x - s * 0.052, y - s * 0.15, s * 0.104, s * 0.15, s * 0.04, '#3E4A66');

      ell(ctx, x, hy, rx * 0.88, ry * 0.88, 0, '#FFFFFF');
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, hy, rx * 0.88, ry * 0.88, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = '#B9C7DA'; ctx.lineWidth = Math.max(0.6, s * 0.018);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.05, hy - ry); ctx.lineTo(x + i * s * 0.05, hy + ry); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - rx, hy + i * s * 0.06); ctx.lineTo(x + rx, hy + i * s * 0.06); ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath(); ctx.ellipse(x, hy, rx, ry, 0, 0, TAU);
      stroke(ctx, c, s * 0.075);
    },

    shirt(ctx, x, y, s, c) {
      const w = s * 0.5, h = s * 0.46, y0 = y - h;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y0 + h * 0.16);
      ctx.lineTo(x - w * 0.28, y0);
      ctx.lineTo(x - w * 0.1, y0 + h * 0.08);
      ctx.lineTo(x + w * 0.1, y0 + h * 0.08);
      ctx.lineTo(x + w * 0.28, y0);
      ctx.lineTo(x + w / 2, y0 + h * 0.16);
      ctx.lineTo(x + w * 0.32, y0 + h * 0.32);
      ctx.lineTo(x + w * 0.32, y);
      ctx.lineTo(x - w * 0.32, y);
      ctx.lineTo(x - w * 0.32, y0 + h * 0.32);
      ctx.closePath(); fill(ctx, c);
      rr(ctx, x - w * 0.14, y0 + h * 0.34, w * 0.28, h * 0.3, s * 0.03, U.shade(c, 0.3));
    },

    dress(ctx, x, y, s, c) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.13, y - s * 0.55);
      ctx.lineTo(x + s * 0.13, y - s * 0.55);
      ctx.lineTo(x + s * 0.1, y - s * 0.3);
      ctx.lineTo(x + s * 0.3, y);
      ctx.lineTo(x - s * 0.3, y);
      ctx.lineTo(x - s * 0.1, y - s * 0.3);
      ctx.closePath(); fill(ctx, c);
      rr(ctx, x - s * 0.12, y - s * 0.34, s * 0.24, s * 0.06, s * 0.03, U.shade(c, -0.3));
    },

    bag(ctx, x, y, s, c) {
      ctx.beginPath(); ctx.arc(x, y - s * 0.4, s * 0.15, Math.PI, 0);
      stroke(ctx, U.shade(c, -0.35), s * 0.06);
      rr(ctx, x - s * 0.26, y - s * 0.4, s * 0.52, s * 0.4, s * 0.07, c);
      rr(ctx, x - s * 0.26, y - s * 0.26, s * 0.52, s * 0.07, 0, U.shade(c, -0.25));
    },

    watch(ctx, x, y, s, c) {
      rr(ctx, x - s * 0.055, y - s * 0.64, s * 0.11, s * 0.64, s * 0.035, U.shade(c, -0.42));
      rr(ctx, x - s * 0.155, y - s * 0.5, s * 0.31, s * 0.27, s * 0.07, c);
      ell(ctx, x, y - s * 0.365, s * 0.1, s * 0.1, 0, '#FFFFFF');
      ctx.strokeStyle = '#3E4A66'; ctx.lineWidth = Math.max(0.7, s * 0.022); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.365); ctx.lineTo(x, y - s * 0.43);
      ctx.moveTo(x, y - s * 0.365); ctx.lineTo(x + s * 0.05, y - s * 0.35);
      ctx.stroke();
      rr(ctx, x + s * 0.15, y - s * 0.44, s * 0.03, s * 0.06, s * 0.015, U.shade(c, -0.3));
    },

    /* ------------------------------------------------------ electronics */
    /* Open case with the two buds sitting in it. The tint is near-white, so
       the case paints its own grey. */
    buds(ctx, x, y, s) {
      rr(ctx, x - s * 0.22, y - s * 0.36, s * 0.44, s * 0.36, s * 0.11, '#C2CFE0');
      rr(ctx, x - s * 0.22, y - s * 0.36, s * 0.44, s * 0.14, s * 0.1, '#A8B7CC');
      [-1, 1].forEach((d) => {
        ell(ctx, x + d * s * 0.09, y - s * 0.17, s * 0.058, s * 0.062, 0, '#FFFFFF');
        rr(ctx, x + d * s * 0.09 - s * 0.022, y - s * 0.16, s * 0.044, s * 0.11, s * 0.02, '#FFFFFF');
      });
    },

    phone(ctx, x, y, s, c) {
      rr(ctx, x - s * 0.16, y - s * 0.58, s * 0.32, s * 0.58, s * 0.06, U.shade(c, -0.5));
      rr(ctx, x - s * 0.12, y - s * 0.53, s * 0.24, s * 0.44, s * 0.03, c);
    },

    tablet(ctx, x, y, s, c) {
      rr(ctx, x - s * 0.28, y - s * 0.5, s * 0.56, s * 0.5, s * 0.05, U.shade(c, -0.5));
      rr(ctx, x - s * 0.23, y - s * 0.45, s * 0.46, s * 0.36, s * 0.03, c);
    },

    tv(ctx, x, y, s, c) {
      rr(ctx, x - s * 0.06, y - s * 0.16, s * 0.12, s * 0.16, s * 0.02, U.shade(c, -0.5));
      rr(ctx, x - s * 0.2, y - s * 0.08, s * 0.4, s * 0.06, s * 0.03, U.shade(c, -0.5));
      rr(ctx, x - s * 0.34, y - s * 0.56, s * 0.68, s * 0.42, s * 0.04, U.shade(c, -0.5));
      rr(ctx, x - s * 0.3, y - s * 0.52, s * 0.6, s * 0.34, s * 0.02, c);
    },

    /* fallback */
    box(ctx, x, y, s, c) { rr(ctx, x - s * 0.24, y - s * 0.42, s * 0.48, s * 0.42, s * 0.05, c); },
  };

  MSM.art = {
    /** Paint one product standing on (x, y), about `s` pixels tall. */
    draw(ctx, kind, x, y, s, color) {
      (P[kind] || P.box)(ctx, x, y, s, color);
    },
    has: (kind) => !!P[kind],
  };
})();
