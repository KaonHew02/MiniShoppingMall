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
      /* Throw the stockers away rather than re-using them. syncStockers only
         adds and removes to match the count, so travelling between two shops
         that employ the SAME number of them handed the new shop the old
         one's bodies — still carrying a `target` product index from a floor
         that had more lines than this one. Reaching for it crashed the loop
         (`ss.products[s.target].out` on an undefined row) the moment you
         stepped off the escalator into a smaller shop. */
      this.stockers.length = 0;
      this.syncStockers();
      this.cashier = null;
      this.syncCashier();
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

    /* ----------------------------------------------------------- cashier */
    /* Hiring a cashier used to be a tick in a menu and nothing else: the
       queue cleared itself with visibly nobody standing there doing it, and
       the obvious read was that the character was missing. They are a body
       on the floor now, like the stockers, in every shop — the till, the
       cafe counter and the burger counter all run off the same flag. */
    cashier: null,

    /** Put one behind the counter, or take them away, to match the hire. */
    syncCashier() {
      if (!MSM.econ.sstate().cashier) { this.cashier = null; return; }
      if (this.cashier) return;
      /* Along the counter to one end, and a touch further back than the
         player's own spot, so the two of you do not stand in each other. */
      const t = P.till, sv = P.serve;
      const wide = (t.x1 - t.x0) >= (t.y1 - t.y0);
      const side = wide ? Math.max(0.8, (t.x1 - t.x0) * 0.45)
                        : Math.max(0.8, (t.y1 - t.y0) * 0.45);
      this.cashier = {
        x: wide ? sv.x - side : sv.x - 0.15,
        y: wide ? sv.y - 0.15 : sv.y - side,
        hold: [], carry: 0, carryP: -1,
        walk: 0, moving: false, handle: 0,
      };
    },

    /** They shuffle on the spot while there is somebody to ring up. */
    stepCashier(dt) {
      this.syncCashier();
      const s = this.cashier;
      if (!s) return;
      const front = this.queue[0];
      s.moving = !!front && front.phase === 'queue';
      if (s.moving) s.walk += dt * 1.5;
    },

    /* ------------------------------------------------- the escalator */
    /* Once a second shop is open the mall stops being one unit: a share of
       every shop's customers arrive down the escalator and leave back up it
       instead of using the street door, because they are shopping the whole
       building. Nobody is painted onto the escalator itself — the people you
       see riding are these customers, walking on under their own steam. */

    /** Points along the tread, 0 at the foot and 1 at the top. */
    escRamp(yF, yB, topZ) {
      const E = CFG.ESC;
      return (t) => ({
        y: yF + (yB - yF) * t,
        z: E.DECK + (topZ - E.DECK) * t,
      });
    },

    /* Is the escalator joined to anything? Either run counts. The traffic
       riding it is the MALL's, not yours — it does not care which of the two
       neighbours you happen to have bought, so the treads stay busy even in
       a shop whose up run has nowhere for YOU to go yet. */
    escOpen: () => MSM.game.nextStore() >= 0 || MSM.game.prevStore() >= 0,

    /** Coin-flip, weighted, for whether this customer uses it at all. */
    escPick: () => E.escOpen() && Math.random() < CFG.ESC.SHARE,

    /** The foot of the run — the DOWN one for arrivals, UP for departures. */
    escFoot(up) {
      const d = P.door, mid = (d.x0 + d.x1) / 2;
      const x = up ? (d.x0 + mid) / 2 : (mid + d.x1) / 2;
      // clear of the escalator's own footprint, which is solid now
      return { x, y: d.y1 + 0.55 };
    },

    /** Put a customer on the escalator, coming down into the shop. */
    escArrive(c) {
      const d = P.door, foot = E.escFoot(false);
      c.rideT = 0;
      c.riding = -1;                 // coming down
      c.x = foot.x;
      c.y = d.y0 + 0.20;
      c.z = CFG.ESC.TOP_Z;
      c.moving = true;
    },

    /** Send a customer up and out of the shop. */
    escLeave(c) {
      c.rideT = 0;
      c.riding = 1;                  // going up
      c.z = c.z || 0;
    },

    /**
     * Walk a rider along the tread. Returns true once they are done: at the
     * bottom for an arrival, or gone through the opening for a departure.
     */
    rideStep(c, dt) {
      const d = P.door, E2 = CFG.ESC;
      const at = E.escRamp(d.y1, d.y0, E2.TOP_Z);
      c.rideT = (c.rideT || 0) + dt / E2.RIDE;
      const done = c.rideT >= 1;
      const t = U.clamp(c.riding > 0 ? c.rideT : 1 - c.rideT, 0, 1);
      const p = at(t);
      c.y = p.y;
      c.z = p.z;
      c.walk += dt * 2;
      c.moving = true;
      if (!done) return false;
      const down = c.riding === -1;
      c.riding = 0;
      c.rideT = 0;
      c.z = 0;
      // step off the tread onto the floor rather than into the machine
      if (down) c.y = d.y1 + 0.55;
      return true;
    },

    /**
     * Called on a brand new customer. Most walk in off the street; the rest
     * appear at the top of the DOWN run and ride in, which is what makes the
     * escalator look like it connects somewhere.
     */
    enterAt(c) {
      if (!E.escPick()) return;
      c.viaEsc = true;
      E.escArrive(c);
    },

    /** Still riding down? The caller must skip its own logic while true. */
    descending(c, dt) {
      if (c.riding !== -1) return false;
      return !E.rideStep(c, dt);
    },

    /**
     * The shared way out. Riders walk to the foot of the UP run and take it;
     * everyone else uses the street door. True means remove them.
     */
    exitStep(c, dt, spd) {
      if (c.riding === 1) return E.rideStep(c, dt);
      if (c.viaEsc && E.escOpen()) {
        const foot = E.escFoot(true);
        if (W.walk(c, foot.x, foot.y, spd, dt)) E.escLeave(c);
        return false;
      }
      return W.walk(c, P.entrance.x, P.entrance.y + 0.6, spd, dt);
    },

    /**
     * Where a body stands to reach a source. The default is just in front of
     * the station, offset right so it clears the level pad on its left.
     * A plan may name the spot itself instead: the mini mart's farmyard and
     * orchard are vertical columns, and standing in FRONT of each one sent
     * the staff walking straight down through every pen above it.
     */
    crateStand(n) {
      const st = (P.stands || [])[n];
      if (st) return { x: st.x, y: st.y };
      const b = P.stations[n];
      return { x: (b.x0 + b.x1) / 2 + 0.28, y: b.y1 + 0.5 };
    },
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

      /* Three passes over the whole floor, in that order — NOT one pass per
         product that tries all three. Stations sit close enough now that you
         are often in reach of two at once, and the old per-product order let
         the lower-numbered one win: carrying milk to the yogurt vat you were
         also in range of the cow, so the cow topped your arms back up with
         milk and the vat never got fed. Putting something down always beats
         picking something up. */
      const passes = [
        // 1. stock a shelf — in the cafe, the storage the bar draws on
        (prod, n, ps) => {
          if (!prod.shelf || !(prod.sell || prod.ingredient)) return false;
          if (ps.shelf >= CFG.SHELF_CAP) return false;
          if (body.hold.indexOf(n) < 0 || !W.atBox(body, prod.shelf)) return false;
          E.takeOne(body, n); ps.shelf++;
          return true;
        },
        // 2. tip something into the animal or machine that eats it
        (prod, n, ps) => {
          const inp = prod.source.inputIndex;
          if (inp < 0 || ps.feed >= CFG.FEED_CAP) return false;
          if (body.hold.indexOf(inp) < 0 || !W.atBox(body, prod.crate)) return false;
          E.takeOne(body, inp); ps.feed++;
          return true;
        },
        // 3. fill your arms from a station
        (prod, n, ps) => {
          if (ps.out <= 0 || prod.drink) return false;
          if (body.hold.length >= CFG.CARRY_CAP) return false;
          if (body.only >= 0 && body.only !== n) return false;
          if (!W.atBox(body, prod.crate)) return false;
          ps.out--; body.hold.push(n); E.sync(body);
          return true;
        },
      ];
      const acted = passes.some((pass) => store.products.some((prod, n) => {
        const ps = ss.products[n];
        return ps.built && pass(prod, n, ps);
      }));
      if (acted) body.handle = 0;
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

    /**
     * They give up and leave with nothing. Everything in the basket goes
     * back where it came from — onto its shelf if there is room, otherwise
     * into the crate behind it — so a walkout costs you the sale and the
     * time, but never the stock itself.
     */
    abandon(c) {
      const ss = MSM.econ.sstate();
      (c.bought || []).forEach((n) => {
        const ps = ss.products[n];
        if (!ps) return;
        if (ps.shelf < CFG.SHELF_CAP) ps.shelf++;
        else if (ps.out < CFG.CRATE_CAP) ps.out++;
      });
      c.bought = null;
      c.got = 0; c.total = 0; c.carry = 0; c.carryP = -1;
      c.mood = 'angry';
      c.phase = 'leave';
      ss.walkouts = (ss.walkouts || 0) + 1;
      MSM.render.pop(c.x, c.y, 1.0, '😠', '#FF5C5C');
    },

    dropCash(value, x, y) {
      // the one point every completed sale in every shop passes through
      const sst = MSM.econ.sstate();
      sst.sales = (sst.sales || 0) + 1;
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

    /* ------------------------------------------------------------- crowd */
    /** Everyone standing on this floor right now, staff and shoppers alike. */
    bodies() {
      const out = [this.player];
      if (this.cashier) out.push(this.cashier);
      this.stockers.forEach((s) => out.push(s));
      this.customers.forEach((c) => out.push(c));
      [MSM.cafe, MSM.sports, MSM.boutique, MSM.tech, MSM.food].forEach((m) => {
        (m && m.crew || []).forEach((s) => out.push(s));
      });
      return out;
    },

    /* Nobody stands inside anybody else.

       Bodies have always collided with the counters, but never with each
       other: a shopper walking to a shelf someone was already at parked in
       the same square and the pair came out as one four-armed customer with
       two heads. Same at the pickup counter, where you drive the player
       straight through whoever is working it.

       So overlapping pairs shove each other apart, half the depth each, and
       the shove goes through W.move — a push can never post someone into a
       counter or through the wall. Anyone off the floor (riding the
       escalator) or behind a fitting room curtain is not in the crowd. */
    separate() {
      const list = this.bodies();
      const R = CFG.BODY_R * 1.9;              // shoulder to shoulder
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a || a.z || a.hidden) continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (!b || b.z || b.hidden) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d >= R) continue;
          /* Dead centre on each other — spawned on the same spot, or walked
             in from opposite sides. Any direction will do, as long as it is
             the SAME one every frame, or the pair jitters in place. */
          const ux = d > 1e-3 ? dx / d : Math.cos(i * 2.4);
          const uy = d > 1e-3 ? dy / d : Math.sin(i * 2.4);
          /* You are the one thing the crowd cannot move: shoppers used to
             walk the player off a build pad mid-payment. Everyone else
             gives half the overlap each. */
          const push = R - d;
          if (a === this.player) W.move(b, ux * push, uy * push);
          else if (b === this.player) W.move(a, -ux * push, -uy * push);
          else {
            W.move(a, -ux * push / 2, -uy * push / 2);
            W.move(b, ux * push / 2, uy * push / 2);
          }
        }
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
            if (W.walk(s, at.x, P.stockLane, spd, dt)) s.leg = 1;
          } else if (W.walk(s, at.x, at.y, spd, dt)) s.phase = 'load';
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
            if (W.walk(s, lane, P.stockLane, spd, dt)) s.leg = 1;
          } else if (W.walk(s, at.x, at.y, spd, dt)) s.phase = 'unload';
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
      if (MSM.tut.scripted()) {
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
      E.enterAt(this.customers[this.customers.length - 1]);
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
        // riding in: the escalator owns them until they step off at the foot
        if (E.descending(c, dt)) continue;
        if (cafe) { MSM.cafe.stepCustomer(c, k, dt); continue; }
        if (sports) { MSM.sports.stepCustomer(c, k, dt); continue; }
        if (boutique) { MSM.boutique.stepCustomer(c, k, dt); continue; }
        if (tech) { MSM.tech.stepCustomer(c, k, dt); continue; }
        if (food) { MSM.food.stepCustomer(c, k, dt); continue; }
        const prod = MSM.econ.prod(c.want);
        const ps = ss.products[c.want];

        switch (c.phase) {
          case 'toLane':
            if (W.walk(c, c.lane, P.walkway, spd, dt)) c.phase = 'toShelfLane';
            break;

          case 'toShelfLane':
            if (W.walk(c, c.lane, prod.browse.y, spd, dt)) c.phase = 'toShelf';
            break;

          case 'toShelf':
            /* Their own place at the shelf. Everyone aiming at the exact
               middle of it meant everyone shoving for the same square —
               the crowd rule would have them shuffling there all day. */
            if (c.side === undefined) c.side = Math.random() * 0.9 - 0.45;
            if (W.walk(c, prod.browse.x + c.side, prod.browse.y, spd, dt)) c.phase = 'browse';
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
            if (W.walk(c, c.lane, c.y, spd, dt)) c.phase = 'toShelfLane';
            break;

          case 'toQueue': {
            if (this.queue.indexOf(c) < 0) {
              /* Nowhere to stand. They used to turn round and walk out THERE
                 AND THEN — still holding everything they had lifted off the
                 shelf, which is why customers looked like they were robbing
                 the place: the stock was gone and no money came in. Hang
                 back behind the last slot instead and keep trying, and if
                 the till never clears, put the shopping back before going. */
              if (this.queue.length >= P.queue.length) {
                const back = P.queue[P.queue.length - 1];
                c.mood = 'wait';
                W.walk(c, back.x, back.y + 0.85, spd, dt);
                c.qWait = (c.qWait || 0) + dt;
                if (c.qWait > CFG.QUEUE_PATIENCE) E.abandon(c);
                break;
              }
              c.qWait = 0;
              this.queue.push(c);
            }
            // back down the lane first, then across to the slot
            if (c.viaLane) {
              if (W.walk(c, c.lane, P.walkway, spd, dt)) c.viaLane = false;
              break;
            }
            const slot = P.queue[Math.max(0, this.queue.indexOf(c))];
            if (W.walk(c, slot.x, slot.y, spd, dt)) c.phase = 'queue';
            break;
          }

          case 'queue': {
            const slot = P.queue[Math.max(0, this.queue.indexOf(c))];
            c.moving = false;
            W.walk(c, slot.x, slot.y, spd, dt);
            break;
          }

          case 'leave':
            if (E.exitStep(c, dt, spd)) {
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
