/* Everything that moves: the character you drive, the hired stocker,
   customers with a product in mind, and the cash they leave behind. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, W = MSM.world, P = MSM.CFG.PLAN;

  const E = MSM.ent = {
    player: null,
    stockers: [],
    customers: [],
    cash: [],
    queue: [],
    spawnTimer: 2,

    /** Rebuild everyone — on boot, on reset, and when you change store. */
    reset() {
      this.player = {
        x: P.spawn.x, y: P.spawn.y,
        hold: [], carry: 0, carryP: -1, only: -1,
        vx: 0, vy: 0, walk: 0, moving: false, handle: 0,
      };
      this.customers.length = 0;
      this.cash.length = 0;
      this.queue.length = 0;
      this.spawnTimer = 1.5;
      this.syncStockers();
      if (MSM.cafe) MSM.cafe.reset();
      if (MSM.sports) MSM.sports.reset();
      if (MSM.boutique) MSM.boutique.reset();
      if (MSM.tech) MSM.tech.reset();
      if (MSM.food) MSM.food.reset();
    },

    /** Keep the crew on the floor matching how many you have hired. */
    syncStockers() {
      const want = MSM.econ.sstate().stockers || 0;
      while (this.stockers.length > want) this.stockers.pop();
      while (this.stockers.length < want) {
        this.stockers.push({
          x: P.stockLane + this.stockers.length * 0.7, y: P.stockLane,
          hold: [], carry: 0, carryP: -1, only: -1,
          phase: 'pick', target: 0, deliverTo: -1, want: 0, leg: 0, stuckT: 0,
          walk: 0, moving: false, handle: 0,
        });
      }
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
        if (!ps.built) return;
        /* Drinks are made to order at a machine, not grown in a crate. */
        if (prod.drink) { ps.t = 0; return; }
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
      /* Ease toward the requested velocity rather than snapping to it, and
         honour how hard the stick is pushed, so small corrections stay small. */
      const want = Math.hypot(ix, iy);
      // a full armful slows you down — dropping the load is how you sprint
      const slow = 1 - CFG.CARRY_SLOW * (p.hold.length / CFG.CARRY_CAP);
      const top = CFG.PLAYER_SPEED * slow;
      const tx = want > 0.02 ? (ix / want) * Math.min(want, 1) * top : 0;
      const ty = want > 0.02 ? (iy / want) * Math.min(want, 1) * top : 0;
      const k = 1 - Math.exp(-CFG.ACCEL * dt);
      p.vx = (p.vx || 0) + (tx - (p.vx || 0)) * k;
      p.vy = (p.vy || 0) + (ty - (p.vy || 0)) * k;

      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0.06) {
        W.move(p, p.vx * dt, p.vy * dt);
        p.walk += speed * dt;
        p.moving = true;
      } else { p.moving = false; p.vx = 0; p.vy = 0; }

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

      /* The coffee shop has its own things to pick up and put down — a
         drink off the pickup counter, a drink into a customer's hand. */
      if (store.mode === 'cafe' && MSM.cafe.handle(body)) { body.handle = 0; return; }
      /* The boutique hangs stock on a rail INTO a size, and hands a fetched
         size straight to whoever asked for it. Both are its own business. */
      if (store.mode === 'boutique' && MSM.boutique.handle(body)) { body.handle = 0; return; }

      store.products.some((prod, n) => {
        const ps = ss.products[n];
        if (!ps.built) return false;

        // in the cafe the "shelf" is the ingredient storage the bar draws on
        if (prod.shelf && (prod.sell || prod.ingredient) && ps.shelf < CFG.SHELF_CAP &&
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
        if (ps.out > 0 && !prod.drink && body.hold.length < CFG.CARRY_CAP &&
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

    dropCash(value, x, y) {
      this.cash.push({
        x: (x != null ? x : P.serve.x) + (Math.random() - 0.5) * 1.3,
        y: (y != null ? y : P.serve.y - 0.15) + (Math.random() - 0.5) * 0.5,
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
    updateStockers(dt) {
      this.stockers.forEach((s) => E.stepStocker(s, dt));
    },

    /** One stocker's turn. Others' claims are skipped so they spread out. */
    stepStocker(s, dt) {
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
          // do not chase a job a colleague is already on
          const claimed = new Set();
          E.stockers.forEach((o) => {
            if (o === s || o.phase === 'pick') return;
            claimed.add(o.deliverTo >= 0 ? 'f' + o.deliverTo : 's' + o.target);
          });

          // a starved cow or oven is the most urgent thing in the shop
          let feedMe = -1;
          prods.forEach((prod, n) => {
            const inp = prod.source.inputIndex;
            if (inp < 0 || feedMe >= 0 || claimed.has('f' + n)) return;
            // only divert for a station that has actually run dry, and only
            // if it still has somewhere to put what it makes
            if (!ss.products[n].built || !ss.products[inp].built) return;
            if (ss.products[n].feed === 0 && ss.products[inp].out > 0 &&
                ss.products[n].out < CFG.CRATE_CAP) feedMe = n;
          });
          if (feedMe >= 0) {
            s.target = prods[feedMe].source.inputIndex;
            s.only = s.target;
            s.deliverTo = feedMe;
            s.want = Math.min(CFG.FEED_CAP - ss.products[feedMe].feed, CFG.CARRY_CAP);
            s.phase = 'toCrate';
            s.leg = 0;
            break;
          }
          // otherwise, whichever shelf is emptiest and has stock behind it
          let best = -1, worst = 1e9;
          ss.products.forEach((ps, n) => {
            if (!ps.built || !prods[n].shelf || ps.out === 0 || ps.shelf >= CFG.SHELF_CAP) return;
            if (claimed.has('s' + n)) return;
            if (ps.shelf < worst) { worst = ps.shelf; best = n; }
          });
          if (best < 0) { s.moving = false; break; }
          s.target = best;
          s.only = best;
          s.deliverTo = -1;
          /* Carry only what the shelf has room for. Loading a full armful and
             then finding nowhere to put the surplus is what wedged this. */
          s.want = Math.min(CFG.SHELF_CAP - ss.products[best].shelf, CFG.CARRY_CAP);
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
          if (s.carry >= (s.want || CFG.CARRY_CAP) || ss.products[s.target].out === 0) {
            s.phase = s.carry > 0 ? 'toShelf' : 'pick';
            s.leg = 0;
            s.stuckT = 0;
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
        case 'unload': {
          s.moving = false;
          const held = s.carry;
          this.handle(s, dt);
          if (s.carry === 0) {
            s.phase = 'pick'; s.leg = 0; s.deliverTo = -1; s.stuckT = 0;
            break;
          }
          /* A full shelf used to strand them here forever, holding the rest —
             and with nobody buying that product, the whole shop stopped. Put
             the surplus back and move on. */
          s.stuckT = s.carry === held ? (s.stuckT || 0) + dt : 0;
          if (s.stuckT > 3) {
            s.hold.forEach((n) => {
              const ps = ss.products[n];
              ps.out = Math.min(CFG.CRATE_CAP, ps.out + 1);
            });
            s.hold.length = 0;
            E.sync(s);
            s.phase = 'pick'; s.leg = 0; s.deliverTo = -1; s.stuckT = 0;
          }
          break;
        }
      }
    },

    /* --------------------------------------------------------- customers */
    spawn() {
      const store = MSM.econ.store();
      const ss = MSM.econ.sstate();
      if (store.mode === 'cafe') { MSM.cafe.spawn(); return; }
      if (store.mode === 'sports') { MSM.sports.spawn(); return; }
      if (store.mode === 'boutique') { MSM.boutique.spawn(); return; }
      if (store.mode === 'tech') { MSM.tech.spawn(); return; }
      if (store.mode === 'food') { MSM.food.spawn(); return; }

      /* During the tutorial, customers keep it simple: one item, and always
         something that is actually on a shelf — the first customer walking
         straight to your stocked potatoes is the whole first-sale moment. */
      if (MSM.state.tut < 99) {
        let best = -1, most = 0;
        store.sells.forEach((pr) => {
          const st = ss.products[pr.index];
          if (st.shelf > most) { most = st.shelf; best = pr.index; }
        });
        if (best < 0) return;                  // nothing stocked yet, nobody comes
        const prodT = store.products[best];
        this.customers.push({
          want: best, wantQty: 1, wantGot: 0, list: [], total: 0, got: 0,
          color: '#4FB0FF', shade: '#F2F5FA',
          x: P.entrance.x, y: P.entrance.y, lane: prodT.lane,
          phase: 'toLane', carry: 0, carryP: -1,
          wait: 0, walk: 0, moving: true, viaLane: false, mood: 'want',
        });
        return;
      }

      // a shopping list: mostly one thing, sometimes two or three
      const open = store.sells.filter((pr) => ss.products[pr.index].built);
      if (!open.length) return;
      /* A basket: one to three different products, and one to three of each,
         capped so nobody queues holding a warehouse. */
      const pickCount = (odds) => {
        const r = Math.random();
        return r < odds[0] ? 1 : r < odds[0] + odds[1] ? 2 : 3;
      };
      const kinds = Math.min(open.length, pickCount(CFG.LIST_ODDS));
      const chosen = [];
      while (chosen.length < kinds) {
        const pick = open[(Math.random() * open.length) | 0].index;
        if (chosen.indexOf(pick) < 0) chosen.push(pick);
      }

      const list = [];
      let items = 0;
      chosen.forEach((n) => {
        const qty = Math.min(pickCount(CFG.QTY_ODDS), CFG.MAX_BASKET - items);
        if (qty <= 0) return;
        items += qty;
        list.push({ n, qty });
      });

      const first = list.shift();
      const want = first.n;
      const prod = store.products[want];
      this.customers.push({
        want,
        wantQty: first.qty,      // how many of the current item they want
        wantGot: 0,
        list,                    // {n, qty} still to collect afterwards
        total: 0, got: 0,
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
      if (this.spawnTimer <= 0 && this.spawnGate) {
        const busy = U.clamp(MSM.state.level / 12, 0, 1);
        this.spawnTimer = U.lerp(CFG.SPAWN_EVERY[0], CFG.SPAWN_EVERY[1], busy);
        if (this.customers.length < 9) this.spawn();
      }

      const mode = MSM.econ.store().mode;
      const cafe = mode === 'cafe', sports = mode === 'sports';
      const boutique = mode === 'boutique', tech = mode === 'tech';
      const food = mode === 'food';

      for (let k = this.customers.length - 1; k >= 0; k--) {
        const c = this.customers[k];
        if (cafe) { MSM.cafe.stepCustomer(c, k, dt); continue; }
        if (sports) { MSM.sports.stepCustomer(c, k, dt); continue; }
        if (boutique) { MSM.boutique.stepCustomer(c, k, dt); continue; }
        if (tech) { MSM.tech.stepCustomer(c, k, dt); continue; }
        if (food) { MSM.food.stepCustomer(c, k, dt); continue; }
        const prod = MSM.econ.prod(c.want);
        const ps = ss.products[c.want];

        switch (c.phase) {
          case 'toLane':
            if (W.seek(c, c.lane, P.walkway, spd, dt, false)) c.phase = 'toShelfLane';
            break;

          case 'toShelfLane':
            if (W.seek(c, c.lane, prod.browse.y, spd, dt, false)) c.phase = 'toShelf';
            break;

          case 'toShelf':
            if (W.seek(c, prod.browse.x, prod.browse.y, spd, dt, false)) c.phase = 'browse';
            break;

          /* The heart of it: they stand at the shelf wanting the thing and
             wait as long as it takes. The bubbles are your to-do list. */
          case 'browse': {
            c.moving = false;
            // they want several of this one, lifted off the shelf one at a time
            if (c.wantGot >= c.wantQty) {
              if (c.list.length) {
                const nxt = c.list.shift();
                c.want = nxt.n; c.wantQty = nxt.qty; c.wantGot = 0;
                c.lane = MSM.econ.prod(c.want).lane;
                c.phase = 'toNextLane';
              } else {
                c.phase = 'toQueue'; c.viaLane = true;
              }
              break;
            }
            if (ps.shelf <= 0) { c.mood = 'wait'; break; }

            c.take = (c.take || 0) + dt;
            if (c.take < CFG.TAKE_TIME) break;
            c.take = 0;

            ps.shelf--;
            c.wantGot++;
            c.got++;
            (c.bought = c.bought || []).push(c.want);
            c.total += MSM.econ.price(c.want);
            c.carry = c.got; c.carryP = c.want;
            c.mood = 'happy';
            break;
          }

          /* Cross to the next item's lane at the current row, then walk the
             lane to its shelf — the same route a person would take. */
          case 'toNextLane':
            if (W.seek(c, c.lane, c.y, spd, dt, false)) c.phase = 'toShelfLane';
            break;

          case 'toQueue': {
            if (this.queue.indexOf(c) < 0) {
              if (this.queue.length >= P.queue.length) { c.phase = 'leave'; break; }
              this.queue.push(c);
            }
            // back down the lane first, then across to the slot
            if (c.viaLane) {
              if (W.seek(c, c.lane, P.walkway, spd, dt, false)) c.viaLane = false;
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
