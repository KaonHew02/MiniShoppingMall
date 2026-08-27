/* Everything that moves: the character you drive, the hired stocker,
   customers with a product in mind, and the cash they leave behind. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, W = MSM.world, P = MSM.CFG.PLAN;

  const E = MSM.ent = {
    player: null,
    stocker: null,
    customers: [],
    cash: [],
    queue: [],
    spawnTimer: 2,

    /** Rebuild everyone — on boot, on reset, and when you change store. */
    reset() {
      this.player = {
        x: P.spawn.x, y: P.spawn.y,
        hold: [], carry: 0, carryP: -1, only: -1,
        walk: 0, moving: false, handle: 0,
      };
      this.customers.length = 0;
      this.cash.length = 0;
      this.queue.length = 0;
      this.spawnTimer = 1.5;
      this.syncStocker();
    },

    syncStocker() {
      const ss = MSM.econ.sstate();
      if (!ss.stocker) { this.stocker = null; return; }
      if (this.stocker) return;
      this.stocker = {
        x: P.stockLane, y: P.stockLane, hold: [], carry: 0, carryP: -1, only: -1,
        phase: 'pick', target: 0, deliverTo: -1, leg: 0, walk: 0, moving: false, handle: 0,
      };
    },

    /** Where a body stands to reach a source / a shelf. Offset to the right
        of the station so it clears the level pad on its left. */
    crateStand: (n) => ({ x: (P.stations[n].x0 + P.stations[n].x1) / 2 + 0.28, y: P.stations[n].y1 + 0.5 }),
    shelfStand: (n) => MSM.econ.prod(n).browse,

    /* ------------------------------------------------------- production */
    /**
     * Crops grow on their own. A cow or an oven eats an input first — no
     * wheat in the trough means no milk, which is the point of the chain:
     * you have to keep the back of the shop fed.
     */
    restock(dt) {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      store.products.forEach((prod, n) => {
        const ps = ss.products[n];
        if (ps.out >= CFG.CRATE_CAP) { ps.t = 0; return; }

        const needsFeed = prod.source.inputIndex >= 0;
        if (needsFeed && ps.feed <= 0) { ps.t = 0; return; }

        ps.t += dt;
        const every = MSM.econ.restock(n);
        while (ps.t >= every && ps.out < CFG.CRATE_CAP) {
          if (needsFeed) {
            if (ps.feed <= 0) break;
            ps.feed--;
          }
          ps.t -= every;
          ps.out++;
        }
      });
    },

    /* ------------------------------------------------------------ player */
    movePlayer(dt, ix, iy) {
      const p = this.player;
      const len = Math.hypot(ix, iy);
      if (len > 0.05) {
        const s = CFG.PLAYER_SPEED * dt;
        W.move(p, (ix / len) * s, (iy / len) * s);
        p.walk += s;
        p.moving = true;
      } else p.moving = false;

      this.handle(p, dt);
      this.dump(p, dt);
      this.collect(p);
    },

    /* Your arms hold a LIST, so a trip can carry a mix — potatoes and
       tomatoes together — rather than one product type at a time. */
    sync(body) {
      body.carry = body.hold.length;
      body.carryP = body.hold.length ? body.hold[0] : -1;
    },
    takeOne(body, n) {
      const i = body.hold.indexOf(n);
      if (i < 0) return false;
      body.hold.splice(i, 1);
      E.sync(body);
      return true;
    },

    /**
     * Auto-use whatever you are standing next to. Three things can happen,
     * in this order: put stock on its shelf, tip something into an animal or
     * machine that eats it, or fill your arms from a station.
     */
    handle(body, dt) {
      body.handle += dt;
      if (body.handle < 1 / CFG.HANDLE_RATE) return;
      const store = MSM.econ.store(), ss = MSM.econ.sstate();

      store.products.some((prod, n) => {
        const ps = ss.products[n];

        if (prod.sell && ps.shelf < CFG.SHELF_CAP &&
            body.hold.indexOf(n) >= 0 && W.atBox(body, prod.shelf)) {
          E.takeOne(body, n); ps.shelf++;
          body.handle = 0;
          return true;
        }
        // feeding: this station eats something we are holding
        const inp = prod.source.inputIndex;
        if (inp >= 0 && ps.feed < CFG.FEED_CAP &&
            body.hold.indexOf(inp) >= 0 && W.atBox(body, prod.crate)) {
          E.takeOne(body, inp); ps.feed++;
          body.handle = 0;
          return true;
        }
        if (ps.out > 0 && body.hold.length < CFG.CARRY_CAP &&
            (body.only < 0 || body.only === n) && W.atBox(body, prod.crate)) {
          ps.out--; body.hold.push(n); E.sync(body);
          body.handle = 0;
          return true;
        }
        return false;
      });
    },

    /** Stand by the bin and whatever is in your arms goes in it. */
    dump(body, dt) {
      if (!body.hold.length) return;
      if (!W.atBox(body, P.bin)) return;
      body.dumpT = (body.dumpT || 0) + dt;
      if (body.dumpT < 1 / CFG.HANDLE_RATE) return;
      body.dumpT = 0;
      const gone = body.hold.pop();
      E.sync(body);
      MSM.render.pop(body.x, body.y, 0.9, MSM.econ.prod(gone).glyph, '#98A6C4');
    },

    collect(p) {
      for (let k = this.cash.length - 1; k >= 0; k--) {
        const c = this.cash[k];
        if (Math.hypot(c.x - p.x, c.y - p.y) > 0.8) continue;
        MSM.state.cash += c.value;
        MSM.state.totalEarned += c.value;
        MSM.render.pop(c.x, c.y, 0.5, '+$' + U.money(c.value), '#2CA85C');
        this.cash.splice(k, 1);
      }
    },

    dropCash(value) {
      this.cash.push({
        x: P.serve.x + (Math.random() - 0.5) * 1.3,
        y: P.serve.y - 0.15 + (Math.random() - 0.5) * 0.5,
        value, t: 0,
      });
      if (this.cash.length > 14) this.cash.shift();
    },

    /** Piles left too long bank themselves, so idling still pays. */
    ageCash(dt) {
      for (let k = this.cash.length - 1; k >= 0; k--) {
        const c = this.cash[k];
        c.t += dt;
        if (c.t < 9) continue;
        MSM.state.cash += c.value;
        MSM.state.totalEarned += c.value;
        this.cash.splice(k, 1);
      }
    },

    /* ----------------------------------------------------------- stocker */
    updateStocker(dt) {
      const s = this.stocker;
      if (!s) return;
      const ss = MSM.econ.sstate();
      const spd = CFG.STAFF_SPEED;

      switch (s.phase) {
        case 'pick': {
          // Never go shopping for a new product while still holding one — at
          // another crate it can neither load nor put down, and jams there.
          if (s.carry > 0) {
            s.target = s.carryP;
            s.phase = 'toShelf';
            s.leg = 0;
            break;
          }
          const prods = MSM.econ.store().products;
          // a starved cow or oven is the most urgent thing in the shop
          let feedMe = -1;
          prods.forEach((prod, n) => {
            const inp = prod.source.inputIndex;
            if (inp < 0 || feedMe >= 0) return;
            if (ss.products[n].feed <= 1 && ss.products[inp].out > 0) feedMe = n;
          });
          if (feedMe >= 0) {
            s.target = prods[feedMe].source.inputIndex;
            s.only = s.target;
            s.deliverTo = feedMe;
            s.phase = 'toCrate';
            s.leg = 0;
            break;
          }
          // otherwise, whichever shelf is emptiest and has stock behind it
          let best = -1, worst = 1e9;
          ss.products.forEach((ps, n) => {
            if (!prods[n].sell || ps.out === 0 || ps.shelf >= CFG.SHELF_CAP) return;
            if (ps.shelf < worst) { worst = ps.shelf; best = n; }
          });
          if (best < 0) { s.moving = false; break; }
          s.target = best;
          s.only = best;
          s.deliverTo = -1;
          s.phase = 'toCrate';
          s.leg = 0;
          break;
        }
        /* Legs are explicit. Deciding the next waypoint from the current
           position instead makes the test flip as it walks, and it stalls
           between two targets that pull opposite ways. */
        case 'toCrate': {
          const at = E.crateStand(s.target);
          if (s.leg === 0) {
            if (W.seek(s, at.x, P.stockLane, spd, dt, false)) s.leg = 1;
          } else if (W.seek(s, at.x, at.y, spd, dt, false)) s.phase = 'load';
          break;
        }
        case 'load':
          s.moving = false;
          this.handle(s, dt);
          if (s.carry >= CFG.CARRY_CAP || ss.products[s.target].out === 0) {
            s.phase = s.carry > 0 ? 'toShelf' : 'pick';
            s.leg = 0;
          }
          break;
        case 'toShelf': {
          const feeding = s.deliverTo >= 0;
          const at = feeding ? E.crateStand(s.deliverTo) : E.shelfStand(s.carryP);
          const lane = feeding ? at.x : MSM.econ.prod(s.carryP).lane;
          if (s.leg === 0) {
            if (W.seek(s, lane, P.stockLane, spd, dt, false)) s.leg = 1;
          } else if (W.seek(s, at.x, at.y, spd, dt, false)) s.phase = 'unload';
          break;
        }
        case 'unload':
          // If the shelf is full they wait here holding the rest, rather than
          // walking away with it — a customer will free a slot soon enough.
          s.moving = false;
          this.handle(s, dt);
          if (s.carry === 0) { s.phase = 'pick'; s.leg = 0; s.deliverTo = -1; }
          break;
      }
    },

    /* --------------------------------------------------------- customers */
    spawn() {
      const store = MSM.econ.store();
      const prod = store.sells[(Math.random() * store.sells.length) | 0];
      const want = prod.index;
      this.customers.push({
        want,
        color: ['#FF7BA6', '#4FB0FF', '#8B62FF', '#FF9E4D', '#2FCB9E', '#FF5C5C'][(Math.random() * 6) | 0],
        shade: ['#F2F5FA', '#E9EEF6', '#F6F0E6', '#EDF3EC'][(Math.random() * 4) | 0],
        x: P.entrance.x + (Math.random() - 0.5) * 0.7, y: P.entrance.y,
        lane: prod.lane,
        phase: 'toLane', carry: 0, carryP: -1,
        wait: 0, walk: 0, moving: true, viaLane: false, mood: 'want',
      });
    },

    updateCustomers(dt) {
      const spd = CFG.CUSTOMER_SPEED;
      const ss = MSM.econ.sstate();

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const busy = U.clamp(MSM.state.level / 12, 0, 1);
        this.spawnTimer = U.lerp(CFG.SPAWN_EVERY[0], CFG.SPAWN_EVERY[1], busy);
        if (this.customers.length < 9) this.spawn();
      }

      for (let k = this.customers.length - 1; k >= 0; k--) {
        const c = this.customers[k];
        const prod = MSM.econ.prod(c.want);
        const ps = ss.products[c.want];

        switch (c.phase) {
          case 'toLane':
            if (W.seek(c, c.lane, 9.3, spd, dt, false)) c.phase = 'toShelfLane';
            break;

          case 'toShelfLane':
            if (W.seek(c, c.lane, prod.browse.y, spd, dt, false)) c.phase = 'toShelf';
            break;

          case 'toShelf':
            if (W.seek(c, prod.browse.x, prod.browse.y, spd, dt, false)) c.phase = 'browse';
            break;

          /* The heart of it: they stand at the shelf wanting the thing and
             wait as long as it takes. The bubbles are your to-do list. */
          case 'browse':
            c.moving = false;
            if (ps.shelf > 0) {
              ps.shelf--;
              c.carry = 1; c.carryP = c.want;
              c.mood = 'happy';
              c.phase = 'toQueue'; c.viaLane = true;
              break;
            }
            c.mood = 'wait';
            break;

          case 'toQueue': {
            if (this.queue.indexOf(c) < 0) {
              if (this.queue.length >= P.queue.length) { c.phase = 'leave'; break; }
              this.queue.push(c);
            }
            // back down the lane first, then across to the slot
            if (c.viaLane) {
              if (W.seek(c, c.lane, 9.3, spd, dt, false)) c.viaLane = false;
              break;
            }
            const slot = P.queue[Math.max(0, this.queue.indexOf(c))];
            if (W.seek(c, slot.x, slot.y, spd, dt, false)) c.phase = 'queue';
            break;
          }

          case 'queue': {
            const slot = P.queue[Math.max(0, this.queue.indexOf(c))];
            c.moving = false;
            W.seek(c, slot.x, slot.y, spd, dt, false);
            break;
          }

          case 'leave':
            if (W.seek(c, P.entrance.x, P.entrance.y + 0.6, spd, dt, false)) {
              const q = this.queue.indexOf(c);
              if (q >= 0) this.queue.splice(q, 1);
              this.customers.splice(k, 1);
            }
            break;
        }
      }
    },
  };
})();
