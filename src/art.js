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
    /* A round tan disc with three dark dots on it is a chocolate-chip cookie,
       which is exactly what this used to look like. A potato needs a longer,
       lumpy silhouette and eyes that are dimples, not spots. */
    potato(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y - s * 0.27);
      ctx.rotate(-0.22);

      const rx = s * 0.44, ry = s * 0.25;
      ctx.beginPath();                                   // knobbly outline
      ctx.moveTo(-rx, -ry * 0.15);
      ctx.bezierCurveTo(-rx * 0.95, -ry * 1.5, -rx * 0.25, -ry * 1.25, rx * 0.1, -ry * 1.05);
      ctx.bezierCurveTo(rx * 0.62, -ry * 0.95, rx * 1.02, -ry * 0.5, rx, ry * 0.15);
      ctx.bezierCurveTo(rx * 0.98, ry * 1.15, rx * 0.3, ry * 1.3, -rx * 0.15, ry * 1.1);
      ctx.bezierCurveTo(-rx * 0.7, ry * 0.95, -rx * 1.02, ry * 0.6, -rx, -ry * 0.15);
      ctx.closePath();
      fill(ctx, c);

      ctx.beginPath();                                   // sunlit top
      ctx.ellipse(-rx * 0.16, -ry * 0.45, rx * 0.52, ry * 0.36, -0.16, 0, TAU);
      fill(ctx, U.shade(c, 0.24));
      ctx.beginPath();                                   // shaded underside
      ctx.ellipse(rx * 0.1, ry * 0.62, rx * 0.66, ry * 0.32, 0.06, 0, TAU);
      fill(ctx, U.shade(c, -0.16));

      // eyes: a short dark crease with a pale rim, not a round spot
      [[-0.42, 0.1, 0.5], [0.18, -0.3, -0.35], [0.44, 0.32, 0.25]].forEach(([a, b, rot]) => {
        const ex = a * rx, ey = b * ry * 1.6;
        ctx.beginPath();
        ctx.ellipse(ex, ey, s * 0.032, s * 0.017, rot, 0, TAU);
        fill(ctx, U.shade(c, -0.42));
        ctx.beginPath();
        ctx.ellipse(ex - s * 0.012, ey - s * 0.016, s * 0.026, s * 0.012, rot, 0, TAU);
        fill(ctx, U.shade(c, 0.3));
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

    /* A yogurt pot: a tapered tub with a flavour band round it and a foil
       lid crimped a little wider than the rim. Like the milk carton the tint
       is near-white, so the tub paints its own greys and the band carries
       the colour. */
    yogurt(ctx, x, y, s, c) {
      const wt = s * 0.42, wb = s * 0.34, h = s * 0.46, top = y - h;
      const tub = () => {
        ctx.beginPath();
        ctx.moveTo(x - wt / 2, top); ctx.lineTo(x + wt / 2, top);
        ctx.lineTo(x + wb / 2, y);   ctx.lineTo(x - wb / 2, y);
        ctx.closePath();
      };

      tub(); fill(ctx, '#FFFFFF');
      ctx.beginPath();                                    // shaded right side
      ctx.moveTo(x + wt * 0.14, top); ctx.lineTo(x + wt / 2, top);
      ctx.lineTo(x + wb / 2, y);      ctx.lineTo(x + wb * 0.14, y);
      ctx.closePath();
      fill(ctx, '#E3EAF3');

      ctx.save(); tub(); ctx.clip();
      ctx.fillStyle = c;
      ctx.fillRect(x - wt, top + h * 0.34, wt * 2, h * 0.36);
      ctx.fillStyle = U.shade(c, -0.2);
      ctx.fillRect(x - wt, top + h * 0.58, wt * 2, h * 0.12);
      ctx.restore();

      ell(ctx, x, top, wt * 0.54, s * 0.055, 0, '#C9D4E3');
      ell(ctx, x, top - s * 0.014, wt * 0.47, s * 0.045, 0, '#F4F8FC');
      ell(ctx, x - wt * 0.15, top - s * 0.026, wt * 0.15, s * 0.015, -0.3, '#FFFFFF');
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
    /* Loose sticks with blobs floating near them. A sheaf reads far better:
       three stalks rising from one point, each carrying a proper ear of
       paired grains, all tied at the waist. */
    wheat(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y);
      ctx.lineCap = 'round';

      /* Five beads floating near a stick still reads as a stick. A real ear
         is a DENSE spike — overlapping grains the whole way up, tapering to
         the tip — and it is about half the height of the whole stalk. */
      [[-1, 0.86], [0, 1], [1, 0.86]].forEach(([k, hh]) => {
        const lean = k * 0.2;
        const stemTop = -s * 0.3 * hh, ex = lean * s * 0.3;

        ctx.strokeStyle = '#B0913F'; ctx.lineWidth = s * 0.026;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.02);
        ctx.quadraticCurveTo(lean * s * 0.08, stemTop * 0.55, ex, stemTop);
        ctx.stroke();

        const earH = s * 0.32 * hh, tipX = ex + lean * s * 0.09, tipY = stemTop - earH;
        for (let i = 0; i < 7; i++) {
          const t = i / 6;
          const gx = ex + (tipX - ex) * t, gy = stemTop - earH * t;
          const gw = s * 0.058 * (1 - t * 0.42);
          [-1, 1].forEach((d) => {
            ctx.beginPath();
            ctx.ellipse(gx + d * gw * 0.66, gy, gw, gw * 1.55, d * 0.4 + lean * 0.6, 0, TAU);
            fill(ctx, d < 0 ? U.shade(c, -0.12) : c);
          });
        }
        ctx.strokeStyle = U.shade(c, 0.3); ctx.lineWidth = s * 0.013;
        [-0.55, 0, 0.55].forEach((a) => {                  // awns off the tip
          ctx.beginPath();
          ctx.moveTo(tipX, tipY + s * 0.02);
          ctx.quadraticCurveTo(tipX + a * s * 0.04, tipY - s * 0.09,
                               tipX + a * s * 0.1, tipY - s * 0.17);
          ctx.stroke();
        });
      });

      rr(ctx, -s * 0.08, -s * 0.13, s * 0.16, s * 0.055, s * 0.026, '#8A6E3A');
      ctx.restore();
    },

    /* Straight sides and a tuft make a traffic cone, which is what this was.
       A carrot is a broad rounded shoulder, a convex taper, a blunt tip, and
       a feathery top of separate fronds. */
    carrot(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.09);
      const H = s * 0.56, W = s * 0.19;

      const body = () => {
        ctx.beginPath();
        ctx.moveTo(-W, -H);
        ctx.quadraticCurveTo(0, -H * 1.22, W, -H);
        ctx.quadraticCurveTo(W * 0.8, -H * 0.4, W * 0.12, -H * 0.02);
        ctx.quadraticCurveTo(0, H * 0.03, -W * 0.13, -H * 0.06);
        ctx.quadraticCurveTo(-W * 0.8, -H * 0.4, -W, -H);
        ctx.closePath();
      };
      body(); fill(ctx, c);

      ctx.save(); body(); ctx.clip();
      ell(ctx, -W * 0.44, -H * 0.62, W * 0.32, H * 0.34, -0.08, U.shade(c, 0.32));
      ell(ctx, W * 0.62, -H * 0.5, W * 0.55, H * 0.5, 0.1, U.shade(c, -0.17));
      ctx.strokeStyle = U.shade(c, -0.3);
      ctx.lineWidth = s * 0.022; ctx.lineCap = 'round';
      [0.8, 0.6, 0.42, 0.26].forEach((t) => {
        const half = W * t * 0.9;
        ctx.beginPath();
        ctx.moveTo(-half, -H * t);
        ctx.quadraticCurveTo(0, -H * t + s * 0.028, half, -H * t - s * 0.008);
        ctx.stroke();
      });
      ctx.restore();

      ctx.lineCap = 'round';
      [[-0.6, 0.82], [0.05, 1], [0.62, 0.86]].forEach(([a, len], i) => {
        const tipX = a * s * 0.26, tipY = -H - s * 0.32 * len;
        ctx.strokeStyle = i === 1 ? '#3F9B45' : '#54BC5C';
        ctx.lineWidth = s * 0.038;
        ctx.beginPath();
        ctx.moveTo(0, -H + s * 0.02);
        ctx.quadraticCurveTo(tipX * 0.35, -H - s * 0.16 * len, tipX, tipY);
        ctx.stroke();
        ctx.lineWidth = s * 0.024;                       // leaflets off each frond
        [0.45, 0.76].forEach((f) => {
          const px = tipX * f * 0.7, py = -H + (tipY + H) * f;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + (a >= 0 ? 1 : -1) * s * 0.075, py - s * 0.045);
          ctx.stroke();
        });
      });
      ctx.restore();
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
    /* The shelf top is the same cream as an egg, so this one was a white
       smudge. It needs a rim, a shaded side and a few speckles to exist. */
    egg(ctx, x, y, s, c) {
      const cy = y - s * 0.31, rx = s * 0.21, ry = s * 0.29;
      /* Two beziers from tip to tip give a pointed almond. An egg needs four:
         a circular bottom half and a narrower, taller top half. */
      const shell = () => {
        ctx.beginPath();
        ctx.moveTo(x, cy + ry);
        ctx.bezierCurveTo(x + rx * 0.86, cy + ry, x + rx, cy + ry * 0.46, x + rx, cy + ry * 0.04);
        ctx.bezierCurveTo(x + rx, cy - ry * 0.46, x + rx * 0.6, cy - ry, x, cy - ry);
        ctx.bezierCurveTo(x - rx * 0.6, cy - ry, x - rx, cy - ry * 0.46, x - rx, cy + ry * 0.04);
        ctx.bezierCurveTo(x - rx, cy + ry * 0.46, x - rx * 0.86, cy + ry, x, cy + ry);
        ctx.closePath();
      };
      shell(); fill(ctx, c);

      ctx.save(); shell(); ctx.clip();
      ell(ctx, x + rx * 0.8, cy + ry * 0.18, rx * 0.85, ry * 0.95, 0, U.shade(c, -0.14));
      ctx.fillStyle = U.shade(c, -0.3);
      [[-0.34, 0.3], [0.24, -0.14], [0.04, 0.54], [-0.12, -0.42]].forEach(([a, b]) => {
        ctx.beginPath();
        ctx.ellipse(x + a * rx, cy + b * ry, s * 0.014, s * 0.011, 0, 0, TAU);
        ctx.fill();
      });
      ctx.restore();

      shell(); stroke(ctx, U.shade(c, -0.33), s * 0.022);
      ell(ctx, x - rx * 0.36, cy - ry * 0.4, rx * 0.3, ry * 0.16, -0.5, '#FFFFFF');
    },

    /* Pointed at both ends with long veins down it, this read as a leaf —
       and eight of them on a shelf read as a hedge. Blunt ends, a fatter
       body, warts instead of veins, and a pale belly make it a cucumber. */
    cucumber(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y - s * 0.24);
      ctx.rotate(-0.24);
      const L = s * 0.28, R = s * 0.2;

      // stroking a curve with a round cap IS the blunt capsule silhouette
      ctx.lineCap = 'round';
      const spine = (lift) => {
        ctx.beginPath();
        ctx.moveTo(-L, R * 0.2 + lift);
        ctx.quadraticCurveTo(0, -R * 0.6 + lift, L, R * 0.2 + lift);
      };
      spine(0); ctx.lineWidth = R * 2.0; ctx.strokeStyle = U.shade(c, -0.3); ctx.stroke();
      spine(0); ctx.lineWidth = R * 1.76; ctx.strokeStyle = c; ctx.stroke();
      spine(R * 0.34); ctx.lineWidth = R * 0.6; ctx.strokeStyle = U.shade(c, 0.34); ctx.stroke();
      spine(-R * 0.44); ctx.lineWidth = R * 0.26; ctx.strokeStyle = U.shade(c, 0.22); ctx.stroke();

      // warts, placed on the actual curve rather than guessed at
      const pt = (t) => ({
        x: L * (2 * t - 1),
        y: R * 0.2 * ((1 - t) * (1 - t) + t * t) - R * 1.2 * t * (1 - t),
      });
      ctx.fillStyle = U.shade(c, -0.34);
      [0.2, 0.36, 0.52, 0.68, 0.84].forEach((t, i) => {
        const p = pt(t);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + (i % 2 ? R * 0.42 : R * 0.05), s * 0.016, s * 0.013, 0, 0, TAU);
        ctx.fill();
      });
      rr(ctx, -L - R * 1.02, -R * 0.12, R * 0.4, R * 0.24, R * 0.11, U.shade(c, -0.42));
      ctx.restore();
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

    /* Two thin crescents read as a smile. A hand of bananas is three FAT
       fingers fanning out of one dark crown, each with a dried tip. */
    banana(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y - s * 0.32);
      ctx.lineCap = 'round';

      /* They have to fan wide enough to be three fingers — overlapped, the
         back two vanish and their tips read as loose dots. */
      const finger = (spread, col, w) => {
        const ex = s * 0.26 - Math.abs(spread) * 0.5, ey = -s * 0.06 + spread * 2.1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.24, -s * 0.04 + spread * 0.5);
        ctx.quadraticCurveTo(-s * 0.02, s * 0.22 + spread * 1.5, ex, ey);
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
        ctx.beginPath();                                   // dried tip
        ctx.ellipse(ex + s * 0.01, ey + s * 0.006, s * 0.021, s * 0.025, 0.5, 0, TAU);
        fill(ctx, '#6B5A22');
      };
      finger(s * 0.085, U.shade(c, -0.28), s * 0.125);     // back
      finger(0, U.shade(c, -0.06), s * 0.14);
      finger(-s * 0.085, U.shade(c, 0.16), s * 0.125);     // front

      ctx.beginPath();                                     // the highlight ridge
      ctx.moveTo(-s * 0.2, -s * 0.09);
      ctx.quadraticCurveTo(-s * 0.01, s * 0.13, s * 0.22, -s * 0.14);
      ctx.lineWidth = s * 0.026; ctx.strokeStyle = U.shade(c, 0.42); ctx.stroke();

      ctx.beginPath();                                     // crown
      ctx.ellipse(-s * 0.26, -s * 0.04, s * 0.055, s * 0.085, 0.18, 0, TAU);
      fill(ctx, U.shade(c, -0.34));
      rr(ctx, -s * 0.35, -s * 0.075, s * 0.1, s * 0.065, s * 0.03, '#6B5A22');
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

    /* Thin wavy stripes read as a ribbon or a flag. Rashers are THICK, they
       have a darker edge, and the fat runs in bands down the length of each
       one rather than across it. */
    bacon(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y - s * 0.2);
      ctx.lineCap = 'round';

      const rasher = (oy, tint) => {
        const path = (lift) => {
          ctx.beginPath();
          ctx.moveTo(-s * 0.28, oy + lift);
          ctx.bezierCurveTo(-s * 0.09, oy - s * 0.075 + lift,
                            s * 0.09, oy + s * 0.075 + lift, s * 0.28, oy + lift);
        };
        path(0);            ctx.lineWidth = s * 0.185; ctx.strokeStyle = U.shade(tint, -0.3); ctx.stroke();
        path(0);            ctx.lineWidth = s * 0.15;  ctx.strokeStyle = tint; ctx.stroke();
        path(-s * 0.043);   ctx.lineWidth = s * 0.034; ctx.strokeStyle = '#FFF1EC'; ctx.stroke();
        path(s * 0.045);    ctx.lineWidth = s * 0.028; ctx.strokeStyle = '#FCE2DB'; ctx.stroke();
      };
      rasher(-s * 0.09, U.shade(c, -0.12));
      rasher(s * 0.09, c);
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

    /* An even arc with three blobs on it is a croquet hoop. A croissant is a
       crescent that is FAT in the middle and tapers to curled horns, and the
       rolled-up dough shows as fat segments across it, not dots on top. */
    croissant(ctx, x, y, s, c) {
      /* A smooth tapered band is a pasty. A croissant is built from ROLLS:
         overlapping lobes along a crescent, biggest in the middle, shrinking
         to a point at each horn. Draw the lobes and the silhouette comes out
         right on its own. */
      ctx.save();
      ctx.translate(x, y - s * 0.03);
      const R = s * 0.3, A0 = Math.PI * 1.05, A1 = Math.PI * 1.95;
      const N = 11;
      const at = (i) => {
        const t = i / (N - 1), a = A0 + (A1 - A0) * t;
        return {
          t, a,
          x: Math.cos(a) * R,
          y: Math.sin(a) * R,
          r: s * (0.022 + 0.108 * Math.sin(Math.PI * t)),
        };
      };

      for (let i = 0; i < N; i++) {                       // bodies
        const p = at(i);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 1.16, p.r, p.a + Math.PI / 2, 0, TAU);
        fill(ctx, c);
      }
      for (let i = 0; i < N; i++) {                       // lit crown per roll
        const p = at(i);
        ctx.beginPath();
        ctx.ellipse(p.x - p.r * 0.18, p.y - p.r * 0.34, p.r * 0.78, p.r * 0.42,
                    p.a + Math.PI / 2, 0, TAU);
        fill(ctx, U.shade(c, 0.2));
      }
      for (let i = 1; i < N; i++) {                       // seams between rolls
        const p = at(i), q = at(i - 1);
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        const rr2 = Math.min(p.r, q.r) * 1.05;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(p.a) * rr2, my + Math.sin(p.a) * rr2);
        ctx.lineTo(mx - Math.cos(p.a) * rr2, my - Math.sin(p.a) * rr2);
        stroke(ctx, U.shade(c, -0.24), s * 0.016);
      }
      ctx.restore();
    },

    cake(ctx, x, y, s, c) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.26, y); ctx.lineTo(x + s * 0.26, y);
      ctx.lineTo(x + s * 0.26, y - s * 0.34); ctx.lineTo(x - s * 0.26, y - s * 0.34);
      ctx.closePath(); fill(ctx, '#F6DDBE');
      rr(ctx, x - s * 0.26, y - s * 0.46, s * 0.52, s * 0.16, s * 0.04, c);
      ell(ctx, x, y - s * 0.55, s * 0.08, s * 0.08, 0, '#FF3B5C');
    },

    /* -------------------------------------------- the coffee shop's larder */
    /* A sack of beans: hessian, a tied neck, and three beans spilled at its
       foot so the silhouette is not just "bag". */
    beans(ctx, x, y, s, c) {
      const w = s * 0.3, h = s * 0.42;
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.bezierCurveTo(x - w * 1.08, y - h * 0.66, x - w * 0.6, y - h * 0.94, x - w * 0.34, y - h);
      ctx.lineTo(x + w * 0.34, y - h);
      ctx.bezierCurveTo(x + w * 0.6, y - h * 0.94, x + w * 1.08, y - h * 0.66, x + w, y);
      ctx.closePath();
      fill(ctx, U.shade(c, 0.46));
      ctx.beginPath();
      ctx.moveTo(x + w * 0.12, y - h);
      ctx.bezierCurveTo(x + w * 0.6, y - h * 0.94, x + w * 1.08, y - h * 0.66, x + w, y);
      ctx.lineTo(x + w * 0.14, y);
      ctx.closePath();
      fill(ctx, U.shade(c, 0.24));
      rr(ctx, x - w * 0.4, y - h * 1.2, w * 0.8, h * 0.24, s * 0.03, U.shade(c, 0.12));
      [[-0.62, 0.02], [-0.06, -0.05], [0.56, 0.03]].forEach(([p, q]) => {
        const bx = x + p * w, by = y - h * 0.04 + q * h;
        ell(ctx, bx, by, s * 0.072, s * 0.048, -0.4, c);
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.055, by + s * 0.015);
        ctx.quadraticCurveTo(bx, by - s * 0.022, bx + s * 0.055, by - s * 0.028);
        stroke(ctx, U.shade(c, -0.4), s * 0.013);
      });
    },

    matchatin(ctx, x, y, s, c) {
      const w = s * 0.26, h = s * 0.34;
      rr(ctx, x - w, y - h, w * 2, h, s * 0.028, c);
      rr(ctx, x - w, y - h * 0.66, w * 2, h * 0.32, 0, '#F2F7EC');
      ell(ctx, x, y - h * 0.5, s * 0.07, s * 0.036, -0.6, U.shade(c, -0.12));
      rr(ctx, x - w * 1.08, y - h - s * 0.09, w * 2.16, s * 0.1, s * 0.03, U.shade(c, -0.22));
      ell(ctx, x, y - h - s * 0.09, w * 1.02, s * 0.055, 0, U.shade(c, 0.28));
      ell(ctx, x - w * 0.34, y - h - s * 0.1, w * 0.34, s * 0.022, 0, U.shade(c, 0.55));
    },

    cocoa(ctx, x, y, s, c) {
      ctx.save();
      ctx.translate(x, y - s * 0.17);
      ctx.rotate(-0.2);
      const w = s * 0.5, h = s * 0.3;
      rr(ctx, -w / 2, -h / 2, w, h, s * 0.022, c);
      rr(ctx, -w / 2, -h / 2, w, h * 0.28, s * 0.022, U.shade(c, 0.24));
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + (w * i) / 3, -h / 2);
        ctx.lineTo(-w / 2 + (w * i) / 3, h / 2);
        stroke(ctx, U.shade(c, -0.32), s * 0.016);
      }
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
      stroke(ctx, U.shade(c, -0.32), s * 0.016);
      ctx.restore();
    },

    ice(ctx, x, y, s, c) {
      const cube = (cx, cy, r) => {
        rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.3, c);
        rr(ctx, cx - r * 0.66, cy - r * 0.72, r * 0.8, r * 0.66, r * 0.22, U.shade(c, 0.55));
      };
      cube(x - s * 0.15, y - s * 0.14, s * 0.135);
      cube(x + s * 0.15, y - s * 0.12, s * 0.125);
      cube(x - s * 0.01, y - s * 0.34, s * 0.125);
    },

    dough(ctx, x, y, s, c) {
      rr(ctx, x - s * 0.32, y - s * 0.07, s * 0.64, s * 0.08, s * 0.035, '#C79154');
      ell(ctx, x, y - s * 0.2, s * 0.26, s * 0.16, 0, c);
      ell(ctx, x - s * 0.08, y - s * 0.27, s * 0.11, s * 0.055, -0.4, U.shade(c, 0.3));
      ell(ctx, x + s * 0.14, y - s * 0.15, s * 0.1, s * 0.06, 0.2, U.shade(c, -0.12));
    },

    /* ------------------------------------------------ the coffee shop's menu */
    /* A takeaway cup: tapered body, a sleeve in the drink's colour, a lid. */
    americano(ctx, x, y, s, c) {
      const w = s * 0.2, h = s * 0.56;
      ctx.beginPath();
      ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h);
      ctx.lineTo(x + w * 0.76, y); ctx.lineTo(x - w * 0.76, y);
      ctx.closePath(); fill(ctx, '#F2F5FA');
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y - h); ctx.lineTo(x + w, y - h);
      ctx.lineTo(x + w * 0.76, y); ctx.lineTo(x + w * 0.16, y);
      ctx.closePath(); fill(ctx, '#DFE7F2');
      rr(ctx, x - w * 1.02, y - h * 0.62, w * 2.04, h * 0.24, s * 0.02, c);
      rr(ctx, x - w * 1.12, y - h - s * 0.07, w * 2.24, s * 0.09, s * 0.035, U.shade(c, -0.28));
      ell(ctx, x + w * 0.36, y - h - s * 0.045, s * 0.032, s * 0.018, 0, '#2B2118');
    },

    cappuccino(ctx, x, y, s, c) {
      P.espresso(ctx, x, y, s, c);
      const top = y - s * 0.4;
      ell(ctx, x, top - s * 0.015, s * 0.165, s * 0.055, 0, '#FFF6E8');
      ell(ctx, x - s * 0.05, top - s * 0.03, s * 0.05, s * 0.02, 0, '#FFFFFF');
      [[-0.055, 0.004], [0.026, -0.012], [0.066, 0.014]].forEach(([p, q]) =>
        ell(ctx, x + p * s, top - s * 0.015 + q * s, s * 0.015, s * 0.009, 0, U.shade(c, -0.34)));
    },

    /* One tall glass, two drinks — the ice and the straw are the whole read. */
    iced(ctx, x, y, s, c, straw) {
      const w = s * 0.21, h = s * 0.6;
      ctx.beginPath();
      ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h);
      ctx.lineTo(x + w * 0.82, y); ctx.lineTo(x - w * 0.82, y);
      ctx.closePath(); fill(ctx, U.shade(c, 0.66));
      ctx.beginPath();
      ctx.moveTo(x - w * 0.94, y - h * 0.86); ctx.lineTo(x + w * 0.94, y - h * 0.86);
      ctx.lineTo(x + w * 0.82, y - s * 0.02); ctx.lineTo(x - w * 0.82, y - s * 0.02);
      ctx.closePath(); fill(ctx, c);
      [[-0.34, 0.7, 1], [0.32, 0.56, 0.86], [0.0, 0.34, 0.9]].forEach(([p, q, k]) =>
        rr(ctx, x + p * w - w * 0.34 * k, y - h * q, w * 0.68 * k, w * 0.68 * k,
           w * 0.16, 'rgba(255,255,255,0.55)'));
      ctx.save();
      ctx.translate(x, y); ctx.rotate(0.22);
      rr(ctx, -s * 0.03, -h * 1.12, s * 0.06, h * 1.06, s * 0.03, straw);
      ctx.restore();
      rr(ctx, x - w * 0.78, y - h * 0.78, w * 0.16, h * 0.62, w * 0.08, 'rgba(255,255,255,0.45)');
    },

    icedcoffee(ctx, x, y, s, c) { P.iced(ctx, x, y, s, c, '#FF5C8A'); },
    icedmatcha(ctx, x, y, s, c) { P.iced(ctx, x, y, s, c, '#3E8F3A'); },

    /* A glass mug, layered: chocolate at the bottom, coffee, cream, drizzle. */
    mocha(ctx, x, y, s, c) {
      const w = s * 0.22, h = s * 0.5;
      ctx.beginPath(); ctx.arc(x + w * 1.2, y - h * 0.52, s * 0.105, -1.3, 1.3);
      stroke(ctx, U.shade(c, 0.52), s * 0.05);
      ctx.beginPath();
      ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h);
      ctx.lineTo(x + w * 0.86, y); ctx.lineTo(x - w * 0.86, y);
      ctx.closePath(); fill(ctx, U.shade(c, 0.66));
      rr(ctx, x - w * 0.9, y - h * 0.36, w * 1.8, h * 0.34, 0, U.shade(c, -0.36));
      rr(ctx, x - w * 0.94, y - h * 0.72, w * 1.88, h * 0.37, 0, c);
      ell(ctx, x, y - h * 0.72, w * 0.94, s * 0.05, 0, '#FFF6E8');
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, y - h * 0.74);
      ctx.quadraticCurveTo(x, y - h * 0.66, x + w * 0.5, y - h * 0.76);
      stroke(ctx, '#6B4226', s * 0.022);
    },

    /* Matcha over milk in a straight glass — the two bands are the drink. */
    matchalatte(ctx, x, y, s, c) {
      const w = s * 0.2, h = s * 0.54;
      ctx.beginPath();
      ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h);
      ctx.lineTo(x + w * 0.84, y); ctx.lineTo(x - w * 0.84, y);
      ctx.closePath(); fill(ctx, '#EDF3F8');
      rr(ctx, x - w * 0.9, y - h * 0.44, w * 1.8, h * 0.42, 0, '#FBFDFF');
      rr(ctx, x - w * 0.94, y - h * 0.86, w * 1.88, h * 0.44, 0, c);
      ell(ctx, x, y - h * 0.86, w * 0.94, s * 0.045, 0, U.shade(c, 0.32));
      rr(ctx, x - w * 0.8, y - h * 0.76, w * 0.15, h * 0.6, w * 0.075, 'rgba(255,255,255,0.5)');
    },

    /* ----------------------------------------------------------- sports */
    /* A straight cross with one arc off to the side is a beach ball. The
       basketball pattern is a horizontal seam, a vertical seam, and two more
       curving pole to pole — and those two are one ellipse. */
    ball(ctx, x, y, s, c) {
      const R = s * 0.33, cy = y - R;
      ell(ctx, x, cy, R, R, 0, c);

      ctx.save();
      ctx.beginPath(); ctx.arc(x, cy, R, 0, TAU); ctx.clip();
      ell(ctx, x + R * 0.46, cy + R * 0.52, R * 0.92, R * 0.92, 0, U.shade(c, -0.15));
      ell(ctx, x - R * 0.38, cy - R * 0.42, R * 0.26, R * 0.17, -0.6, U.shade(c, 0.3));
      ctx.restore();

      const seam = U.shade(c, -0.55), lw = s * 0.024;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - R, cy); ctx.lineTo(x + R, cy);
      ctx.moveTo(x, cy - R); ctx.lineTo(x, cy + R);
      stroke(ctx, seam, lw);
      ctx.beginPath(); ctx.ellipse(x, cy, R * 0.62, R, 0, 0, TAU);
      stroke(ctx, seam, lw);
      ctx.beginPath(); ctx.arc(x, cy, R - lw * 0.35, 0, TAU);
      stroke(ctx, U.shade(c, -0.28), lw * 0.6);
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

    /* A football is a sphere of black pentagons on white — but the tint is
       near-white, so like the milk carton it paints its own greys and lets
       the patches carry the contrast. One centred pentagon with five round
       its equator is the whole read. */
    football(ctx, x, y, s) {
      const R = s * 0.32, cy = y - R;
      ell(ctx, x, cy, R, R, 0, '#F4F8FC');
      ctx.save();
      ctx.beginPath(); ctx.arc(x, cy, R, 0, TAU); ctx.clip();
      ell(ctx, x + R * 0.5, cy + R * 0.55, R * 0.9, R * 0.9, 0, '#DCE4EE');

      const patch = (px, py, rad, rot) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = rot + (i / 5) * TAU - Math.PI / 2;
          const vx = px + Math.cos(a) * rad, vy = py + Math.sin(a) * rad;
          if (i) ctx.lineTo(vx, vy); else ctx.moveTo(vx, vy);
        }
        ctx.closePath(); fill(ctx, '#2B3450');
      };
      patch(x - R * 0.08, cy - R * 0.1, R * 0.36, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2 + 0.35;
        patch(x - R * 0.08 + Math.cos(a) * R * 0.86,
              cy - R * 0.1 + Math.sin(a) * R * 0.86, R * 0.30, Math.PI + a);
      }
      ell(ctx, x - R * 0.4, cy - R * 0.46, R * 0.24, R * 0.15, -0.6, '#FFFFFFCC');
      ctx.restore();
      ctx.beginPath(); ctx.arc(x, cy, R - s * 0.008, 0, TAU);
      stroke(ctx, '#B9C7DA', s * 0.016);
    },

    /* A boot is a trainer with the sole spiked and the collar cut low — the
       studs are what stop it reading as the running shoe next to it. */
    boots(ctx, x, y, s, c) {
      const w = s * 0.62, h = s * 0.34, x0 = x - w / 2, sole = y - h * 0.30;
      const top = y - h;
      for (let k = 0; k < 5; k++) {                       // studs
        const sx = x0 + w * (0.12 + k * 0.19);
        rr(ctx, sx - w * 0.035, y - h * 0.1, w * 0.07, h * 0.13, w * 0.02, '#3E4A66');
      }
      ctx.beginPath();                                    // upper
      ctx.moveTo(x0, sole);
      ctx.lineTo(x0, top + h * 0.30);
      ctx.quadraticCurveTo(x0 + w * 0.26, top - h * 0.02, x0 + w * 0.46, top + h * 0.40);
      ctx.quadraticCurveTo(x0 + w * 0.78, top + h * 0.58, x0 + w, sole);
      ctx.closePath(); fill(ctx, c);
      ctx.beginPath();                                    // shadowed heel
      ctx.moveTo(x0, sole); ctx.lineTo(x0, top + h * 0.52);
      ctx.quadraticCurveTo(x0 + w * 0.2, top + h * 0.44, x0 + w * 0.26, sole);
      ctx.closePath(); fill(ctx, U.shade(c, -0.24));

      rr(ctx, x0 - w * 0.02, sole, w * 1.04, h * 0.22, h * 0.08, '#2B3450');
      // laces up the instep
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const lx = x0 + w * (0.34 + k * 0.13), ly = top + h * (0.5 + k * 0.14);
        ctx.moveTo(lx - w * 0.07, ly); ctx.lineTo(lx + w * 0.07, ly - h * 0.08);
      }
      stroke(ctx, '#FFFFFF', s * 0.028);
      rr(ctx, x0 + w * 0.04, top + h * 0.36, w * 0.14, h * 0.12, h * 0.05, U.shade(c, 0.34));
    },

    /* A shuttlecock: cork dome at the bottom, feather skirt flaring up. */
    shuttle(ctx, x, y, s) {
      const cy = y - s * 0.12, top = y - s * 0.56;
      const halfTop = s * 0.20, halfBot = s * 0.085;

      ctx.beginPath();                                    // the feather skirt
      ctx.moveTo(x - halfBot, cy);
      ctx.lineTo(x - halfTop, top);
      ctx.lineTo(x + halfTop, top);
      ctx.lineTo(x + halfBot, cy);
      ctx.closePath(); fill(ctx, '#F4F8FC');
      ctx.beginPath();                                    // shaded right half
      ctx.moveTo(x, cy); ctx.lineTo(x, top);
      ctx.lineTo(x + halfTop, top); ctx.lineTo(x + halfBot, cy);
      ctx.closePath(); fill(ctx, '#DCE4EE');
      // the feather splits, and the thread ring holding them together
      ctx.beginPath();
      for (let k = -2; k <= 2; k++) {
        ctx.moveTo(x + halfBot * (k / 2.6), cy);
        ctx.lineTo(x + halfTop * (k / 2.2), top);
      }
      stroke(ctx, '#B9C7DA', s * 0.016);
      ctx.beginPath();
      ctx.moveTo(x - halfTop * 0.72, top + s * 0.14);
      ctx.lineTo(x + halfTop * 0.72, top + s * 0.14);
      stroke(ctx, '#C2CFE0', s * 0.018);
      ell(ctx, x, top, halfTop, s * 0.045, 0, '#FFFFFF');

      ell(ctx, x, cy, s * 0.10, s * 0.10, 0, '#E8C86A');   // the cork
      ell(ctx, x, cy + s * 0.03, s * 0.10, s * 0.07, 0, U.shade('#E8C86A', -0.22));
      ell(ctx, x - s * 0.03, cy - s * 0.04, s * 0.035, s * 0.022, -0.5, '#F6E7CE');
    },

    /* A sports bottle: tapered body, a coloured band, and a flip cap. */
    bottle(ctx, x, y, s, c) {
      const w = s * 0.28, h = s * 0.60, x0 = x - w / 2, top = y - h;
      rr(ctx, x0, top + h * 0.14, w, h * 0.86, w * 0.28, c);
      rr(ctx, x + w * 0.10, top + h * 0.14, w * 0.40, h * 0.86, w * 0.24, U.shade(c, -0.20));
      rr(ctx, x0, top + h * 0.42, w, h * 0.20, 0, U.shade(c, 0.40));   // grip band
      rr(ctx, x0 + w * 0.14, top + h * 0.24, w * 0.22, h * 0.5, w * 0.1, '#FFFFFF55');
      // neck and flip cap
      rr(ctx, x - w * 0.20, top + h * 0.04, w * 0.40, h * 0.14, w * 0.08, U.shade(c, -0.34));
      rr(ctx, x - w * 0.26, top - h * 0.04, w * 0.52, h * 0.10, w * 0.06, '#3E4A66');
      rr(ctx, x - w * 0.06, top - h * 0.10, w * 0.12, h * 0.08, w * 0.04, '#5A6472');
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

    /* ---------------------------------------------------------- boutique */
    /* Jeans: two legs with a gap between them, a waistband, and the seam and
       pocket stitching that stop a blue trouser shape reading as a envelope. */
    jeans(ctx, x, y, s, c) {
      const w = s * 0.46, h = s * 0.62, top = y - h, x0 = x - w / 2;
      const gap = w * 0.10;
      ctx.beginPath();                                   // the two legs
      ctx.moveTo(x0, top);
      ctx.lineTo(x0 + w, top);
      ctx.lineTo(x0 + w, y);
      ctx.lineTo(x0 + w * 0.5 + gap / 2, y);
      ctx.lineTo(x0 + w * 0.5 + gap / 2, top + h * 0.46);
      ctx.lineTo(x0 + w * 0.5 - gap / 2, top + h * 0.46);
      ctx.lineTo(x0 + w * 0.5 - gap / 2, y);
      ctx.lineTo(x0, y);
      ctx.closePath(); fill(ctx, c);
      ctx.beginPath();                                   // the shaded right leg
      ctx.moveTo(x0 + w * 0.5 + gap / 2, top + h * 0.46);
      ctx.lineTo(x0 + w, top + h * 0.2);
      ctx.lineTo(x0 + w, y);
      ctx.lineTo(x0 + w * 0.5 + gap / 2, y);
      ctx.closePath(); fill(ctx, U.shade(c, -0.16));

      rr(ctx, x0, top, w, h * 0.14, s * 0.015, U.shade(c, -0.30));   // waistband
      rr(ctx, x0 + w * 0.44, top + h * 0.14, w * 0.04, h * 0.30, 0, U.shade(c, -0.34));
      // back pockets, in the lighter thread colour
      [[0.16, 0.20], [0.66, 0.20]].forEach(([px, py]) => {
        rr(ctx, x0 + w * px, top + h * py, w * 0.18, h * 0.13, s * 0.012, U.shade(c, 0.24));
      });
      rr(ctx, x0 + w * 0.86, top + h * 0.04, w * 0.08, h * 0.06, s * 0.01, '#E8C86A');
    },

    /* Shorts: the same trouser logic, cut off at the thigh and cuffed. */
    shorts(ctx, x, y, s, c) {
      const w = s * 0.50, h = s * 0.40, top = y - h, x0 = x - w / 2;
      const gap = w * 0.12;
      ctx.beginPath();
      ctx.moveTo(x0, top);
      ctx.lineTo(x0 + w, top);
      ctx.lineTo(x0 + w, y);
      ctx.lineTo(x0 + w * 0.5 + gap / 2, y);
      ctx.lineTo(x0 + w * 0.5 + gap / 2, top + h * 0.56);
      ctx.lineTo(x0 + w * 0.5 - gap / 2, top + h * 0.56);
      ctx.lineTo(x0 + w * 0.5 - gap / 2, y);
      ctx.lineTo(x0, y);
      ctx.closePath(); fill(ctx, c);
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.5 + gap / 2, top + h * 0.56);
      ctx.lineTo(x0 + w, top + h * 0.22);
      ctx.lineTo(x0 + w, y);
      ctx.lineTo(x0 + w * 0.5 + gap / 2, y);
      ctx.closePath(); fill(ctx, U.shade(c, -0.16));

      rr(ctx, x0, top, w, h * 0.18, s * 0.015, U.shade(c, -0.28));      // waistband
      rr(ctx, x0, y - h * 0.10, w * 0.44, h * 0.10, 0, U.shade(c, 0.26)); // cuffs
      rr(ctx, x0 + w * 0.56, y - h * 0.10, w * 0.44, h * 0.10, 0, U.shade(c, 0.14));
      // the drawstring
      ctx.beginPath();
      ctx.moveTo(x - w * 0.06, top + h * 0.14); ctx.lineTo(x - w * 0.12, top + h * 0.30);
      ctx.moveTo(x + w * 0.06, top + h * 0.14); ctx.lineTo(x + w * 0.12, top + h * 0.30);
      stroke(ctx, U.shade(c, 0.45), s * 0.022);
    },

    /* A knitted sweater: wider than a tee, ribbed hem and cuffs, and a cable
       up the middle so it reads as wool rather than cotton. */
    sweater(ctx, x, y, s, c) {
      const w = s * 0.60, h = s * 0.50, top = y - h, x0 = x - w / 2;
      ctx.beginPath();
      ctx.moveTo(x0, top + h * 0.22);
      ctx.lineTo(x - w * 0.20, top);
      ctx.quadraticCurveTo(x, top + h * 0.14, x + w * 0.20, top);
      ctx.lineTo(x0 + w, top + h * 0.22);
      ctx.lineTo(x0 + w, top + h * 0.56);
      ctx.lineTo(x + w * 0.30, top + h * 0.50);
      ctx.lineTo(x + w * 0.30, y);
      ctx.lineTo(x - w * 0.30, y);
      ctx.lineTo(x - w * 0.30, top + h * 0.50);
      ctx.lineTo(x0, top + h * 0.56);
      ctx.closePath(); fill(ctx, c);

      // ribbing at the hem and both cuffs
      rr(ctx, x - w * 0.30, y - h * 0.12, w * 0.60, h * 0.12, s * 0.012, U.shade(c, -0.22));
      rr(ctx, x0, top + h * 0.44, w * 0.14, h * 0.12, s * 0.012, U.shade(c, -0.22));
      rr(ctx, x0 + w * 0.86, top + h * 0.44, w * 0.14, h * 0.12, s * 0.012, U.shade(c, -0.22));
      rr(ctx, x - w * 0.19, top + h * 0.02, w * 0.38, h * 0.10, s * 0.02, U.shade(c, -0.28));

      // a cable pattern: two lines of chevrons up the front
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const cy = top + h * (0.26 + k * 0.16);
        ctx.moveTo(x - w * 0.13, cy);
        ctx.lineTo(x, cy + h * 0.06);
        ctx.lineTo(x + w * 0.13, cy);
      }
      stroke(ctx, U.shade(c, 0.30), s * 0.022);
    },

    /* A zipped jacket: collar, two front panels, a zip line and a chest seam. */
    jacket(ctx, x, y, s, c) {
      const w = s * 0.58, h = s * 0.56, top = y - h, x0 = x - w / 2;
      ctx.beginPath();
      ctx.moveTo(x0, top + h * 0.20);
      ctx.lineTo(x - w * 0.22, top + h * 0.04);
      ctx.lineTo(x + w * 0.22, top + h * 0.04);
      ctx.lineTo(x0 + w, top + h * 0.20);
      ctx.lineTo(x0 + w, top + h * 0.58);
      ctx.lineTo(x + w * 0.31, top + h * 0.52);
      ctx.lineTo(x + w * 0.31, y);
      ctx.lineTo(x - w * 0.31, y);
      ctx.lineTo(x - w * 0.31, top + h * 0.52);
      ctx.lineTo(x0, top + h * 0.58);
      ctx.closePath(); fill(ctx, c);
      // the right front panel, a shade darker so the jacket has a front seam
      ctx.beginPath();
      ctx.moveTo(x, top + h * 0.08);
      ctx.lineTo(x + w * 0.22, top + h * 0.04);
      ctx.lineTo(x0 + w, top + h * 0.20);
      ctx.lineTo(x0 + w, top + h * 0.58);
      ctx.lineTo(x + w * 0.31, top + h * 0.52);
      ctx.lineTo(x + w * 0.31, y);
      ctx.lineTo(x, y);
      ctx.closePath(); fill(ctx, U.shade(c, -0.15));

      // collar, zip and pull
      ctx.beginPath();
      ctx.moveTo(x - w * 0.24, top + h * 0.05);
      ctx.lineTo(x, top + h * 0.20);
      ctx.lineTo(x + w * 0.24, top + h * 0.05);
      ctx.lineTo(x + w * 0.20, top - h * 0.03);
      ctx.lineTo(x - w * 0.20, top - h * 0.03);
      ctx.closePath(); fill(ctx, U.shade(c, -0.32));
      rr(ctx, x - w * 0.022, top + h * 0.18, w * 0.044, h * 0.80, 0, U.shade(c, 0.40));
      rr(ctx, x - w * 0.05, top + h * 0.30, w * 0.10, h * 0.08, s * 0.012, '#E7EDF6');
      // pockets
      [[-0.27, 0.62], [0.17, 0.62]].forEach(([px, py]) => {
        rr(ctx, x + w * px, top + h * py, w * 0.10, h * 0.18, s * 0.012, U.shade(c, -0.34));
      });
    },

    /* A baseball cap, side on: a domed crown and a peak off the front. */
    cap(ctx, x, y, s, c) {
      const R = s * 0.26, cy = y - R * 0.62;
      ctx.beginPath();                                   // the peak
      ctx.ellipse(x + R * 0.86, cy + R * 0.50, R * 0.72, R * 0.20, -0.10, 0, TAU);
      fill(ctx, U.shade(c, -0.26));
      ctx.beginPath();                                   // the crown
      ctx.arc(x, cy + R * 0.48, R, Math.PI, 0);
      ctx.closePath(); fill(ctx, c);
      ctx.save();                                        // panel shading
      ctx.beginPath(); ctx.arc(x, cy + R * 0.48, R, Math.PI, 0); ctx.closePath(); ctx.clip();
      ctx.beginPath();
      ctx.moveTo(x + R * 0.10, cy - R * 0.6); ctx.lineTo(x + R * 1.1, cy + R * 0.6);
      ctx.lineTo(x + R * 0.10, cy + R * 0.6); ctx.closePath();
      fill(ctx, U.shade(c, -0.15));
      ctx.beginPath();                                   // the seams
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(x + k * R * 0.40, cy + R * 0.48);
        ctx.lineTo(x + k * R * 0.62, cy - R * 0.42);
      }
      stroke(ctx, U.shade(c, -0.34), s * 0.016);
      ctx.restore();
      rr(ctx, x - R, cy + R * 0.38, R * 2, R * 0.16, s * 0.01, U.shade(c, -0.34));
      ell(ctx, x, cy - R * 0.44, R * 0.11, R * 0.11, 0, U.shade(c, 0.34));   // the button
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

    /* A bar with a clock stuck on it. A watch reads from its parts: two strap
       ends rather than one continuous band, a bezel around the dial, tick
       marks, two hands of different lengths, and a crown on the right. */
    watch(ctx, x, y, s, c) {
      const cw = s * 0.33, ch = s * 0.3, dy = y - s * 0.42, sw = s * 0.17;
      const strap = U.shade(c, -0.5);

      rr(ctx, x - sw / 2, y - s * 0.76, sw, s * 0.26, sw * 0.3, strap);
      rr(ctx, x - sw / 2, y - s * 0.32, sw, s * 0.32, sw * 0.3, strap);
      ctx.fillStyle = U.shade(c, -0.72);
      [0.1, 0.17].forEach((d) => {
        ctx.beginPath();
        ctx.ellipse(x, y - s * d, s * 0.014, s * 0.014, 0, 0, TAU);
        ctx.fill();
      });
      rr(ctx, x - sw * 0.66, y - s * 0.3, sw * 1.32, s * 0.05, s * 0.02, U.shade(c, 0.12));

      rr(ctx, x + cw / 2 - s * 0.004, dy - s * 0.03, s * 0.032, s * 0.06, s * 0.014,
         U.shade(c, -0.25));                                     // crown
      rr(ctx, x - cw / 2, dy - ch / 2, cw, ch, s * 0.08, U.shade(c, -0.08));
      rr(ctx, x - cw / 2 + s * 0.02, dy - ch / 2 + s * 0.02,
         cw - s * 0.04, ch - s * 0.04, s * 0.062, '#F8FAFF');     // dial

      ctx.fillStyle = '#9AA6BE';
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * cw * 0.31, dy + Math.sin(a) * ch * 0.31,
                    s * 0.013, s * 0.013, 0, 0, TAU);
        ctx.fill();
      }
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x, dy - ch * 0.27);
      stroke(ctx, '#2B3450', s * 0.022);
      ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x + cw * 0.25, dy + ch * 0.09);
      stroke(ctx, '#2B3450', s * 0.018);
      ell(ctx, x, dy, s * 0.016, s * 0.016, 0, '#2B3450');
    },

    /* ------------------------------------------------------ electronics */
    /* Open case with the two buds sitting in it. The tint is near-white, so
       the case paints its own grey. */
    /* Two white blobs in a grey box read as teeth. What makes it a case is
       the lid standing open BEHIND the buds, and the body drawn over their
       stems so they are sitting down in it rather than lying on it. */
    buds(ctx, x, y, s) {
      const w = s * 0.44, h = s * 0.3, x0 = x - w / 2, top = y - h;

      rr(ctx, x0 + w * 0.04, top - h * 0.82, w * 0.92, h * 0.9, s * 0.05, '#DCE4F0');
      rr(ctx, x0 + w * 0.04, top - h * 0.82, w * 0.92, h * 0.34, s * 0.05, '#C3CFE0');
      rr(ctx, x0 + w * 0.02, top - h * 0.16, w * 0.96, h * 0.18, s * 0.03, '#AFBDD2');

      [-1, 1].forEach((d) => {
        const bx = x + d * w * 0.2;
        rr(ctx, bx - s * 0.026, top - h * 0.5, s * 0.052, h * 0.9, s * 0.024, '#FFFFFF');
        ell(ctx, bx, top - h * 0.54, s * 0.058, s * 0.052, 0, '#FFFFFF');
        ell(ctx, bx + d * s * 0.02, top - h * 0.52, s * 0.024, s * 0.03, 0, '#D3DDEC');
      });

      rr(ctx, x0, top, w, h, s * 0.085, '#F4F7FC');
      rr(ctx, x0, top, w, h * 0.22, s * 0.085, '#E1E8F3');
      ell(ctx, x, top + h * 0.62, s * 0.022, s * 0.022, 0, '#5FE08D');
    },

    /* A rounded rectangle in the product tint is a coloured card, not a
       phone. A phone is a dark chassis with a LIT screen inset in it, a
       notch at the top and a home bar at the bottom — those three details
       are what the eye reads as "phone" at 24px. */
    phone(ctx, x, y, s, c) {
      const w = s * 0.34, h = s * 0.6, x0 = x - w / 2, top = y - h;
      rr(ctx, x0, top, w, h, s * 0.075, '#2B3450');
      rr(ctx, x0 + w * 0.08, top + h * 0.055, w * 0.84, h * 0.83, s * 0.05, c);
      rr(ctx, x0 + w * 0.08, top + h * 0.055, w * 0.84, h * 0.3, s * 0.05,
         U.shade(c, 0.34));                                        // screen glare
      rr(ctx, x - w * 0.15, top + h * 0.035, w * 0.3, h * 0.04, s * 0.02, '#2B3450');
      rr(ctx, x - w * 0.17, y - h * 0.075, w * 0.34, h * 0.02, s * 0.012, '#FFFFFFCC');
    },

    /* Landscape slate: bezel, camera dot, and a grid of app tiles — a blank
       screen looked like a placemat. */
    tablet(ctx, x, y, s, c) {
      const w = s * 0.6, h = s * 0.46, x0 = x - w / 2, top = y - h;
      rr(ctx, x0, top, w, h, s * 0.05, '#2B3450');
      rr(ctx, x0 + w * 0.08, top + h * 0.09, w * 0.84, h * 0.82, s * 0.025, c);
      rr(ctx, x0 + w * 0.08, top + h * 0.09, w * 0.4, h * 0.82, s * 0.025,
         U.shade(c, 0.2));
      ell(ctx, x0 + w * 0.04, y - h * 0.5, s * 0.012, s * 0.012, 0, '#8FA0BC');
      ctx.fillStyle = '#FFFFFF99';
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < 3; k++) {
          rr(ctx, x0 + w * (0.2 + k * 0.22), top + h * (0.24 + r * 0.32),
             w * 0.13, h * 0.2, s * 0.014);
          ctx.fill();
        }
      }
    },

    /* A smart speaker: a rounded fabric drum, the grille dots, and a lit
       ring on top so it reads as electronics and not a pepper mill. */
    speaker(ctx, x, y, s, c) {
      const w = s * 0.40, h = s * 0.56, x0 = x - w / 2, top = y - h;
      rr(ctx, x0, top, w, h, w * 0.24, c);
      rr(ctx, x + w * 0.08, top, w * 0.42, h, w * 0.20, U.shade(c, -0.18));
      // the grille: rows of pinholes across the fabric
      ctx.fillStyle = U.shade(c, -0.34);
      for (let ry = 0; ry < 5; ry++) {
        for (let rx = 0; rx < 4; rx++) {
          ctx.beginPath();
          ctx.arc(x0 + w * (0.18 + rx * 0.21), top + h * (0.26 + ry * 0.14),
                  s * 0.014, 0, TAU);
          ctx.fill();
        }
      }
      ell(ctx, x, top + h * 0.06, w * 0.44, h * 0.055, 0, U.shade(c, 0.16));  // the lid
      ctx.beginPath();                                    // the light ring
      ctx.ellipse(x, top + h * 0.06, w * 0.30, h * 0.038, 0, 0, TAU);
      stroke(ctx, '#7FD4FF', s * 0.024);
      rr(ctx, x0 + w * 0.28, top + h * 0.13, w * 0.44, h * 0.05, s * 0.01, U.shade(c, -0.28));
    },

    /* A laptop, open and three-quarter on: the lid with a glowing screen
       leaning back, the keyboard deck coming forward to the baseline. */
    laptop(ctx, x, y, s, c) {
      const w = s * 0.66, x0 = x - w / 2;
      const deckH = s * 0.16, lidH = s * 0.42, lidTop = y - deckH - lidH;
      ctx.beginPath();                                    // the deck
      ctx.moveTo(x0 - w * 0.05, y);
      ctx.lineTo(x0 + w * 1.05, y);
      ctx.lineTo(x0 + w * 0.94, y - deckH);
      ctx.lineTo(x0 + w * 0.06, y - deckH);
      ctx.closePath(); fill(ctx, U.shade(c, -0.12));
      // key rows suggested, not drawn one by one
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const ky = y - deckH * (0.28 + k * 0.24);
        ctx.moveTo(x0 + w * 0.14, ky); ctx.lineTo(x0 + w * 0.86, ky);
      }
      stroke(ctx, U.shade(c, -0.35), s * 0.014);
      rr(ctx, x - w * 0.12, y - deckH * 0.30, w * 0.24, deckH * 0.22, s * 0.01,
         U.shade(c, -0.30));                              // trackpad

      rr(ctx, x0 + w * 0.05, lidTop, w * 0.9, lidH, s * 0.02, c);   // the lid
      const ix = x0 + w * 0.10, iy = lidTop + lidH * 0.09;
      const iw = w * 0.80, ih = lidH * 0.80;
      ctx.save();
      rr(ctx, ix, iy, iw, ih, s * 0.012);
      ctx.clip();
      fill(ctx, '#16295C');                               // the screen
      ctx.beginPath();                                    // a code window glow
      ctx.moveTo(ix, iy + ih);
      ctx.quadraticCurveTo(ix + iw * 0.4, iy + ih * 0.3, ix + iw, iy + ih * 0.85);
      ctx.lineTo(ix + iw, iy + ih); ctx.closePath();
      fill(ctx, '#2E6FB0');
      rr(ctx, ix + iw * 0.08, iy + ih * 0.12, iw * 0.36, ih * 0.08, s * 0.008, '#7FD4FF');
      rr(ctx, ix + iw * 0.08, iy + ih * 0.28, iw * 0.52, ih * 0.08, s * 0.008, '#5FE08D');
      rr(ctx, ix + iw * 0.08, iy + ih * 0.44, iw * 0.28, ih * 0.08, s * 0.008, '#FFC53D');
      ctx.restore();
    },

    /* A desktop monitor: thinner bezel than the TV, a proper stand with a
       foot, and a splash of game on the panel rather than a sunny hill. */
    monitor(ctx, x, y, s, c) {
      const w = s * 0.62, h = s * 0.40, x0 = x - w / 2, top = y - s * 0.60;
      rr(ctx, x - s * 0.14, y - s * 0.04, s * 0.28, s * 0.04, s * 0.02, '#3E4A66');
      rr(ctx, x - s * 0.035, y - s * 0.20, s * 0.07, s * 0.17, s * 0.015, '#4E5D80');
      rr(ctx, x0, top, w, h, s * 0.025, '#2B3450');

      const ix = x0 + w * 0.04, iy = top + h * 0.08, iw = w * 0.92, ih = h * 0.78;
      ctx.save();
      rr(ctx, ix, iy, iw, ih, s * 0.015);
      ctx.clip();
      fill(ctx, U.shade(c, -0.35));                       // a night level
      ctx.beginPath();                                    // far hills
      ctx.moveTo(ix, iy + ih);
      ctx.lineTo(ix + iw * 0.3, iy + ih * 0.45);
      ctx.lineTo(ix + iw * 0.55, iy + ih * 0.8);
      ctx.lineTo(ix + iw * 0.8, iy + ih * 0.35);
      ctx.lineTo(ix + iw, iy + ih * 0.7);
      ctx.lineTo(ix + iw, iy + ih);
      ctx.closePath(); fill(ctx, U.shade(c, 0.1));
      ell(ctx, ix + iw * 0.2, iy + ih * 0.28, iw * 0.06, iw * 0.06, 0, '#FFC53D');
      ctx.restore();
      rr(ctx, ix, iy, iw, ih * 0.3, s * 0.015, '#FFFFFF18');
      // the racing stripe under the panel that says "gaming, honest"
      rr(ctx, x - w * 0.12, top + h * 0.90, w * 0.24, h * 0.06, s * 0.01, U.shade(c, 0.3));
    },

    /* Screen on a pedestal, showing something: a sky, a hill and a sun. An
       empty dark rectangle read as a doormat stood on its edge. */
    tv(ctx, x, y, s, c) {
      const w = s * 0.72, h = s * 0.44, x0 = x - w / 2, top = y - s * 0.58;
      rr(ctx, x - s * 0.16, y - s * 0.05, s * 0.32, s * 0.05, s * 0.025, '#3E4A66');
      rr(ctx, x - s * 0.05, y - s * 0.16, s * 0.1, s * 0.13, s * 0.02, '#4E5D80');
      rr(ctx, x0, top, w, h, s * 0.035, '#2B3450');

      const ix = x0 + w * 0.05, iy = top + h * 0.1, iw = w * 0.9, ih = h * 0.72;
      ctx.save();
      rr(ctx, ix, iy, iw, ih, s * 0.02);
      ctx.clip();
      fill(ctx, U.shade(c, 0.42));                                 // sky
      ell(ctx, ix + iw * 0.76, iy + ih * 0.28, iw * 0.1, iw * 0.1, 0, '#FFD65A');
      ctx.beginPath();
      ctx.moveTo(ix, iy + ih);
      ctx.quadraticCurveTo(ix + iw * 0.34, iy + ih * 0.34, ix + iw * 0.7, iy + ih);
      ctx.closePath(); fill(ctx, '#5FCB8B');
      ctx.restore();
      rr(ctx, ix, iy, iw, ih * 0.34, s * 0.02, '#FFFFFF22');       // glass sheen
    },

    /* fallback: a taped cardboard carton, not a plain coloured slab */
    box(ctx, x, y, s, c) {
      const w = s * 0.5, h = s * 0.44, x0 = x - w / 2, top = y - h;
      rr(ctx, x0, top, w, h, s * 0.04, c);
      rr(ctx, x0, top, w, h * 0.26, s * 0.04, U.shade(c, 0.22));
      rr(ctx, x - w * 0.06, top, w * 0.12, h, 0, U.shade(c, -0.18));
    },
  };

  MSM.art = {
    /** Paint one product standing on (x, y), about `s` pixels tall. */
    draw(ctx, kind, x, y, s, color) {
      (P[kind] || P.box)(ctx, x, y, s, color);
    },
    has: (kind) => !!P[kind],
  };
})();
