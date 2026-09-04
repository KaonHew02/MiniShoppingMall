/* The shop floor: what is solid, and how bodies move through it. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util;

  const W = MSM.world = {
    _solids: null,
    _gen: 0,

    /** Call when the active store changes, or when anything is built. */
    invalidate() {
      CFG.usePlan(MSM.state.current);
      this._solids = null;
      this._grid = null;
      this._gen++;                     // every route in flight is now stale
    },

    solids() {
      if (this._solids) return this._solids;
      // an unbuilt counter is an open construction plot you stand on to pay
      const list = MSM.econ.sstate().till ? [CFG.PLAN.till, CFG.PLAN.bin] : [CFG.PLAN.bin];
      // wheat and other inputs have no shelf — only sellable goods do
      // a line you have not built yet is empty floor
      const ps = MSM.econ.sstate().products;
      MSM.econ.store().products.forEach((p, n) => {
        if (!ps[n].built) return;
        list.push(p.crate);
        // every cafe ingredient shares the one storage unit — add it once
        if (p.shelf && list.indexOf(p.shelf) < 0) list.push(p.shelf);
      });
      const cs = MSM.econ.cstate();
      if (cs) {
        const P = CFG.PLAN;
        list.push(P.pickup);
        cs.machines.forEach((m, k) => { if (m.built) list.push(P.machines[k].box); });
        cs.tables.forEach((t, k) => { if (t.built) list.push(P.tables[k].box); });
      }
      /* A test area is a floor you stand on, so only the equipment in the
         middle of it is solid — block the whole court and nobody could use it. */
      const sp = MSM.econ.spstate();
      if (sp) {
        const P = CFG.PLAN;
        sp.areas.forEach((a, k) => { if (a.built) list.push(P.areas[k].prop); });
      }
      // a fitting room is a box you can only get into through its curtain
      const bs = MSM.econ.bstate();
      if (bs) {
        const P = CFG.PLAN;
        bs.rooms.forEach((r, k) => { if (r.built) list.push(P.rooms[k].box); });
      }
      // the techhub's demo counters — the bench, never the floor around it
      const ts = MSM.econ.tstate();
      if (ts) {
        const P = CFG.PLAN;
        ts.areas.forEach((a, k) => { if (a.built) list.push(P.areas[k].prop); });
      }
      // fast food's kitchen line, plus the two counters behind the till
      const fs = MSM.econ.fstate();
      if (fs) {
        const P = CFG.PLAN;
        list.push(P.assembly, P.pickup);
        fs.stations.forEach((st, k) => { if (st.built) list.push(P.machines[k].box); });
      }
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
      /* If something was built around this body (the counter finishing while
         you stand on its plot), collision would refuse every step and trap
         them inside. Inside a solid, all movement is allowed — walking out is
         always possible. */
      const trapped = this.blocked(e.x, e.y);
      if (dx) {
        const nx = e.x + dx;
        if (this.inBounds(nx, e.y) && (trapped || !this.blocked(nx, e.y))) e.x = nx;
      }
      if (dy) {
        const ny = e.y + dy;
        if (this.inBounds(e.x, ny) && (trapped || !this.blocked(e.x, ny))) e.y = ny;
      }
    },

    /* Searching for a route costs real time, so only a few bodies re-plan
       in any one frame; the rest walk their straight line this frame and get
       their route on the next. Reset from the game loop. */
    _budget: 0,
    frame() { this._budget = 3; },

    /**
     * Steer a body to a point the way a person would: straight there while
     * the way is clear, around the furniture when it is not.
     *
     * Every NPC used to steer with seek(..., false) — a straight line with
     * no collision test at all — so staff and customers walked clean through
     * the counters. Simply turning collision on is not the fix: a body that
     * slides into the shelf between it and its target grinds along the side
     * of it forever, and a barista who never reaches the machine stops the
     * shop earning. So route around it instead, and only pay for the search
     * when the straight line is genuinely blocked, which is rare.
     */
    walk(e, tx, ty, speed, dt) {
      if (e.rgen !== this._gen || e.rtx === undefined ||
          Math.hypot(tx - e.rtx, ty - e.rty) > 0.4 || e.rwait) {
        e.rgen = this._gen; e.rtx = tx; e.rty = ty; e.rwait = false;
        if (this.clearLine(e, { x: tx, y: ty })) e.route = null;
        else if (this._budget > 0) {
          this._budget--;
          const r = this.path(e.x, e.y, tx, ty);
          e.route = r && r.length ? r : null;
        } else e.rwait = true;         // out of budget — try again next frame
      }
      if (e.route) {
        // A* only hands back legs it has already checked, so take them straight
        const w = e.route[0];
        if (this.seek(e, w.x, w.y, speed, dt, false)) {
          e.route.shift();
          if (!e.route.length) e.route = null;
        }
        e.moving = true;
        return false;
      }
      return this.seek(e, tx, ty, speed, dt, false);
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
