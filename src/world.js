/* The shop floor: what is solid, and how bodies move through it. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util;

  const W = MSM.world = {
    _solids: null,

    /** Call when the active store changes. */
    invalidate() { this._solids = null; this._grid = null; },

    solids() {
      if (this._solids) return this._solids;
      const list = [CFG.PLAN.till, CFG.PLAN.bin];
      // wheat and other inputs have no shelf — only sellable goods do
      MSM.econ.store().products.forEach((p) => {
        list.push(p.crate);
        if (p.shelf) list.push(p.shelf);
      });
      this._solids = list;
      return list;
    },

    inBounds(x, y) {
      const B = CFG.WORLD, r = CFG.BODY_R;
      return x >= r && x <= B.W - r && y >= r && y <= B.H + 0.5;
    },

    blocked(x, y, extra) {
      const r = CFG.BODY_R + (extra || 0);
      for (const b of this.solids()) {
        if (x > b.x0 - r && x < b.x1 + r && y > b.y0 - r && y < b.y1 + r) return true;
      }
      return false;
    },

    /** Move a body, sliding along whatever it bumps into. */
    move(e, dx, dy) {
      if (dx) {
        const nx = e.x + dx;
        if (this.inBounds(nx, e.y) && !this.blocked(nx, e.y)) e.x = nx;
      }
      if (dy) {
        const ny = e.y + dy;
        if (this.inBounds(e.x, ny) && !this.blocked(e.x, ny)) e.y = ny;
      }
    },

    /** Step a body toward a target; true once it has arrived. */
    seek(e, tx, ty, speed, dt, slide) {
      const dx = tx - e.x, dy = ty - e.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.06) { e.moving = false; return true; }
      const m = Math.min(d, speed * dt);
      if (slide) this.move(e, (dx / d) * m, (dy / d) * m);
      else { e.x += (dx / d) * m; e.y += (dy / d) * m; }
      e.walk = (e.walk || 0) + m;
      e.moving = true;
      return false;
    },

    /* ---------------------------------------------------------- routing */
    /* Click-to-move needs to get round the shelves, so the floor is coarsely
       gridded and searched. Straight-line steering just stops at the first
       thing in the way, which reads as the character ignoring you. */
    CELL: 0.25,

    grid() {
      if (this._grid) return this._grid;
      const B = CFG.WORLD, c = this.CELL;
      const gw = Math.ceil(B.W / c), gh = Math.ceil((B.H + 0.6) / c);
      const cells = new Uint8Array(gw * gh);
      for (let gx = 0; gx < gw; gx++) {
        for (let gy = 0; gy < gh; gy++) {
          const x = (gx + 0.5) * c, y = (gy + 0.5) * c;
          /* Route with more clearance than the collision test uses. A lane
             that only just fits leaves the character grinding along a wall,
             unable to make the turn the route asked for. */
          cells[gy * gw + gx] = this.inBounds(x, y) && !this.blocked(x, y, 0.14) ? 1 : 0;
        }
      }
      this._grid = { gw, gh, cells };
      return this._grid;
    },

    /** Nearest walkable cell to a point, searched outward. */
    nearestFree(gx, gy) {
      const { gw, gh, cells } = this.grid();
      for (let r = 0; r < 24; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const x = gx + dx, y = gy + dy;
            if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
            if (cells[y * gw + x]) return { x, y };
          }
        }
      }
      return null;
    },

    /**
     * A* across the floor. Returns world-space waypoints, corners only, or
     * null when there is no way through.
     */
    path(sx, sy, tx, ty) {
      const g = this.grid(), { gw, gh, cells } = g, c = this.CELL;
      const toCell = (x, y) => ({ x: U.clamp(Math.floor(x / c), 0, gw - 1),
                                  y: U.clamp(Math.floor(y / c), 0, gh - 1) });
      let a = toCell(sx, sy), b = toCell(tx, ty);
      if (!cells[a.y * gw + a.x]) a = this.nearestFree(a.x, a.y) || a;
      if (!cells[b.y * gw + b.x]) b = this.nearestFree(b.x, b.y) || b;
      if (!a || !b) return null;

      const start = a.y * gw + a.x, goal = b.y * gw + b.x;
      if (start === goal) return [];

      const n = gw * gh;
      const came = new Int32Array(n).fill(-1);
      const gScore = new Float32Array(n).fill(Infinity);
      const open = [start];
      const inOpen = new Uint8Array(n);
      const h = (i) => {
        const dx = Math.abs((i % gw) - b.x), dy = Math.abs((i / gw | 0) - b.y);
        return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
      };
      gScore[start] = 0;
      inOpen[start] = 1;

      const DIRS = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],
                    [1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];
      let guard = 0;
      while (open.length && guard++ < 20000) {
        let bi = 0, bf = Infinity;
        for (let k = 0; k < open.length; k++) {
          const f = gScore[open[k]] + h(open[k]);
          if (f < bf) { bf = f; bi = k; }
        }
        const cur = open.splice(bi, 1)[0];
        inOpen[cur] = 0;
        if (cur === goal) break;

        const cx = cur % gw, cy = cur / gw | 0;
        for (const [dx, dy, cost] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ni = ny * gw + nx;
          if (!cells[ni]) continue;
          // do not squeeze diagonally between two blocked cells
          if (dx && dy && (!cells[cy * gw + nx] || !cells[ny * gw + cx])) continue;
          const t = gScore[cur] + cost;
          if (t >= gScore[ni]) continue;
          came[ni] = cur;
          gScore[ni] = t;
          if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1; }
        }
      }
      if (came[goal] < 0) return null;

      const cellsOut = [];
      for (let i = goal; i !== -1 && i !== start; i = came[i]) cellsOut.unshift(i);

      const pts = cellsOut.map((i) => ({
        x: ((i % gw) + 0.5) * c, y: ((i / gw | 0) + 0.5) * c,
      }));
      pts.push({ x: tx, y: ty });

      /* String-pull the route. A* returns a staircase of grid steps; walking
         it literally is the shuffling, indirect movement you see in a lot of
         click-to-move games. Keeping only the turns you actually cannot see
         past gives straight diagonals instead. */
      const smooth = [];
      const chain = [{ x: sx, y: sy }].concat(pts);
      let i = 0;
      while (i < chain.length - 1) {
        let j = chain.length - 1;
        while (j > i + 1 && !this.clearLine(chain[i], chain[j])) j--;
        smooth.push(chain[j]);
        i = j;
      }
      return smooth;
    },

    /** Is there an unobstructed straight walk between two points? */
    clearLine(a, b) {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.ceil(d / 0.12);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (!this.inBounds(x, y) || this.blocked(x, y, 0.1)) return false;
      }
      return true;
    },

    atBox: (e, box) => U.boxDist(e.x, e.y, box) <= CFG.REACH,
    atPoint: (e, p, r) => Math.hypot(e.x - p.x, e.y - p.y) <= (r || CFG.REACH),
  };
})();
