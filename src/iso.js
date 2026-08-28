/* Isometric projection + canvas primitives.
   Same 2:1 dimetric grid as the app icon: one cell is TW wide, TW/2 tall,
   and one unit of height is ZH pixels. */
window.MSM = window.MSM || {};

MSM.iso = {
  TW: 64, TH: 35, ZH: 42,
  ox: 0, oy: 0,
  baseTW: 64, vw: 0, vh: 0,

  /* Camera: `zoom` scales the tile, (cx,cy) is the world point held at the
     centre of the screen. It trails the player rather than being dragged. */
  zoom: 1.0, cx: 4, cy: 8,
  ZOOM_MIN: 0.7, ZOOM_MAX: 1.7,

  /* Tile size follows the smaller of the two axes: sized on width alone, a
     wide-but-short desktop window zoomed in until the shop no longer fit. */
  fit(w, h) {
    this.vw = w; this.vh = h;
    this.baseTW = MSM.util.clamp(Math.min(w / 4.4, h / 5.2), 56, 120);
    this.apply();
  },

  /** Ease the camera toward a target, kept inside the mall. */
  follow(tx, ty, dt) {
    const k = 1 - Math.pow(0.0015, dt);
    this.cx += (tx - this.cx) * k;
    this.cy += (ty - this.cy) * k;
    this.tx = tx; this.ty = ty;
    this.apply();
  },

  /**
   * Keep the floor covering the whole window.
   *
   * The old limits were fixed numbers (1.6 world units from each edge), which
   * say nothing about what the screen actually shows: on a wide window, or
   * zoomed out, you could stand near a corner and look straight past the gold
   * rim into the sky. Work out where the four screen corners land in world
   * space instead and keep all four on the floor.
   *
   * Screen x of u = x - y is vw/2 + (u - cu)·TW/2, so the left and right
   * edges sit at u = cu ± a with a = vw/TW. Screen y of v = x + y is
   * vh·0.58 + (v - cv)·TH/2, so the top and bottom sit at v = cv - bT and
   * cv + bB. Feeding those into x = (u + v)/2 and y = (v - u)/2, every corner
   * is on the floor exactly when cx and cy are inside the ranges below — the
   * asymmetry is the 0.58 anchor, which shows more floor below the camera
   * than above it.
   */
  contain() {
    const B = MSM.CFG.WORLD, M = 0.25;              // the floor's own overhang
    const a = this.vw / this.TW;
    const bT = 1.16 * this.vh / this.TH;
    const bB = 0.84 * this.vh / this.TH;
    const near = (a + bT) / 2, far = (a + bB) / 2;

    /* Containing the view completely is not always possible: the shop is a
       rectangle in world space but a DIAMOND on screen, and the crop beds and
       the wheat field sit right on its corners. Clamping hard to the contained
       box put four stations somewhere the camera could never look.
       So containment gives way to the player: the box is widened to include
       wherever they are standing. In the shop you never see past the gold rim;
       walk into a corner and the corner is what you get. */
    const px = this.tx == null ? this.cx : this.tx;
    const py = this.ty == null ? this.cy : this.ty;
    const fit = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : v < lo ? lo : v > hi ? hi : v);

    this.cx = fit(this.cx, Math.min(-M + near, px), Math.max(B.W + M - far, px));
    this.cy = fit(this.cy, Math.min(-M + near, py), Math.max(B.H + M - far, py));
  },

  /** Recompute the projection from the camera. */
  apply() {
    this.TW = this.baseTW * this.zoom;
    this.TH = this.TW * 0.55;
    this.ZH = this.TW * 0.66;
    this.contain();
    this.ox = this.vw / 2 - (this.cx - this.cy) * (this.TW / 2);
    this.oy = this.vh * 0.58 - (this.cx + this.cy) * (this.TH / 2);
  },

  setZoom(z) {
    this.zoom = MSM.util.clamp(z, this.ZOOM_MIN, this.ZOOM_MAX);
    this.apply();
  },

  /** Grid space -> screen space. */
  s(x, y, z = 0) {
    return {
      x: this.ox + (x - y) * (this.TW / 2),
      y: this.oy + (x + y) * (this.TH / 2) - z * this.ZH,
    };
  },

  /* --------------------------------------------------------- primitives */
  poly(ctx, pts, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  },

  /* Corner coordinates below are raw grid units, not cell indices:
     cell (cx,cy) spans x0=cx, y0=cy, x1=cx+1, y1=cy+1. */

  /** Flat quad at height z. */
  tile(ctx, x0, y0, x1, y1, z, fill) {
    this.poly(ctx, [
      this.s(x0, y0, z), this.s(x1, y0, z), this.s(x1, y1, z), this.s(x0, y1, z),
    ], fill);
  },

  /** Solid box between heights z0 and z1. */
  box(ctx, x0, y0, x1, y1, z0, z1, color) {
    const sh = MSM.util.shade;
    this.poly(ctx, [this.s(x0, y1, z1), this.s(x1, y1, z1), this.s(x1, y1, z0), this.s(x0, y1, z0)], sh(color, -0.28));
    this.poly(ctx, [this.s(x1, y1, z1), this.s(x1, y0, z1), this.s(x1, y0, z0), this.s(x1, y1, z0)], sh(color, -0.14));
    this.poly(ctx, [this.s(x0, y0, z1), this.s(x1, y0, z1), this.s(x1, y1, z1), this.s(x0, y1, z1)], color);
  },

  /** Quad painted on the front-left wall of a box (the y = yw plane). */
  faceL(ctx, yw, x0, x1, z0, z1, fill) {
    this.poly(ctx, [this.s(x0, yw, z1), this.s(x1, yw, z1), this.s(x1, yw, z0), this.s(x0, yw, z0)], fill);
  },

  /** Quad painted on the front-right wall of a box (the x = xw plane). */
  faceR(ctx, xw, y0, y1, z0, z1, fill) {
    this.poly(ctx, [this.s(xw, y1, z1), this.s(xw, y0, z1), this.s(xw, y0, z0), this.s(xw, y1, z0)], fill);
  },

  /** Screen-space polygon of a box's top face — used for tap hit-testing. */
  topQuad(x0, y0, x1, y1, z) {
    return [this.s(x0, y0, z), this.s(x1, y0, z), this.s(x1, y1, z), this.s(x0, y1, z)];
  },

  hit(pt, quad) {
    let inside = false;
    for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
      const a = quad[i], b = quad[j];
      if ((a.y > pt.y) !== (b.y > pt.y) &&
          pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  },
};
