/* Game loop, input, the till, and moving between stores. */
window.MSM = window.MSM || {};

(function () {
  const U = MSM.util, CFG = MSM.CFG, P = MSM.CFG.PLAN;

  const G = MSM.game = {
    last: 0,
    saveTimer: 0,
    serveT: 0,
    keys: new Set(),

    init() {
      const canvas = document.getElementById('scene');
      MSM.render.setup(canvas);
      MSM.ui.init();

      const offline = MSM.load();
      MSM.world.invalidate();
      MSM.ent.reset();
      MSM.iso.cx = MSM.ent.player.x;
      MSM.iso.cy = MSM.ent.player.y;
      MSM.iso.apply();

      G.bindInput(canvas);
      addEventListener('visibilitychange', () => { if (document.hidden) MSM.save(); });
      addEventListener('pagehide', () => MSM.save());

      if (offline) MSM.ui.open('offline', offline);
      else if (MSM.state.tut >= 99) {
        setTimeout(() => MSM.ui.toast('Customers show what they want — keep those shelves full'), 800);
      }

      this.last = performance.now();
      requestAnimationFrame(G.loop);
    },

    /* ------------------------------------------------------------ input */
    /* A floating joystick: put a finger down anywhere and drag. The stick
       appears where you touched, so there is no fixed pad to reach for. */
    bindInput(canvas) {
      let stickId = null;

      canvas.addEventListener('pointerdown', (e) => {
        if (stickId !== null) return;
        stickId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        const r = canvas.getBoundingClientRect();
        MSM.render.stick = { ox: e.clientX - r.left, oy: e.clientY - r.top, dx: 0, dy: 0 };
      });

      canvas.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stickId || !MSM.render.stick) return;
        const r = canvas.getBoundingClientRect();
        MSM.render.stick.dx = e.clientX - r.left - MSM.render.stick.ox;
        MSM.render.stick.dy = e.clientY - r.top - MSM.render.stick.oy;
      });

      const drop = (e) => {
        if (e.pointerId !== stickId) return;
        stickId = null;
        MSM.render.stick = null;
      };
      canvas.addEventListener('pointerup', drop);
      canvas.addEventListener('pointercancel', drop);

      addEventListener('keydown', (e) => {
        G.keys.add(e.key.toLowerCase());
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
      });
      addEventListener('keyup', (e) => G.keys.delete(e.key.toLowerCase()));

      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        MSM.iso.setZoom(MSM.iso.zoom * (e.deltaY > 0 ? 0.92 : 1.08));
      }, { passive: false });
    },

    /**
     * Stick / keys -> a heading in world space, scaled 0..1 by how far the
     * stick is pushed. Full speed on the faintest touch is what made it feel
     * like the character was getting away from you.
     */
    input() {
      let sx = 0, sy = 0, throttle = 0;

      const st = MSM.render.stick;
      if (st) {
        const d = Math.hypot(st.dx, st.dy);
        if (d > CFG.STICK_DEAD) {
          sx = st.dx; sy = st.dy;
          throttle = U.clamp((d - CFG.STICK_DEAD) / (CFG.STICK_FULL - CFG.STICK_DEAD), 0.22, 1);
        }
      }

      const k = G.keys;
      let kx = 0, ky = 0;
      if (k.has('a') || k.has('arrowleft'))  kx -= 1;
      if (k.has('d') || k.has('arrowright')) kx += 1;
      if (k.has('w') || k.has('arrowup'))    ky -= 1;
      if (k.has('s') || k.has('arrowdown'))  ky += 1;
      if (kx || ky) { sx = kx * 60; sy = ky * 60; throttle = 1; }

      if (!throttle) return { x: 0, y: 0 };

      // undo the isometric projection so "up" on screen is up the shop
      const a = sx / (MSM.iso.TW / 2), b = sy / (MSM.iso.TH / 2);
      const wx = (a + b) / 2, wy = (b - a) / 2;
      const len = Math.hypot(wx, wy) || 1;
      return { x: (wx / len) * throttle, y: (wy / len) * throttle };
    },

    /* ---------------------------------------------------------- loop */
    loop(ts) {
      let dt = (ts - G.last) / 1000;
      G.last = ts;
      if (dt > 1.5) { G.catchUp(dt); dt = 0.05; }
      dt = U.clamp(dt, 0, 0.1);

      const dir = G.input();
      MSM.ent.restock(dt);
      MSM.ent.movePlayer(dt, dir.x, dir.y);
      MSM.ent.updateStockers(dt);
      MSM.ent.spawnGate = MSM.econ.sstate().open;
      MSM.ent.updateCustomers(dt);
      MSM.ent.ageCash(dt);
      G.serve(dt);
      G.tillPad(dt);
      G.buildPads(dt);
      G.signPost(dt);
      G.tutorial();
      G.levelPads(dt);
      G.doors(dt);
      G.passive(dt);
      G.checkLevel();

      MSM.iso.follow(MSM.ent.player.x, MSM.ent.player.y - 0.6, dt);
      MSM.render.frame(dt);
      MSM.ui.tick();

      G.saveTimer += dt;
      if (G.saveTimer > 10) { G.saveTimer = 0; MSM.save(); }
      requestAnimationFrame(G.loop);
    },

    /* ------------------------------------------------------- the till */
    serve(dt) {
      const q = MSM.ent.queue;
      const front = q[0];
      if (!front || front.phase !== 'queue') { G.serveT = 0; return; }

      const ss = MSM.econ.sstate();
      if (!ss.till) { G.serveT = 0; return; }
      const atTill = MSM.world.atPoint(MSM.ent.player, P.serve, 0.95);
      if (!atTill && !ss.cashier) { G.serveT = 0; return; }

      // bigger baskets take longer — each item gets its beat in the bag
      G.serveDur = Math.max(CFG.SERVE_TIME, (front.got || 1) * CFG.PACK_TIME + 0.25);
      G.serveT += dt * (atTill && ss.cashier ? 1.7 : 1);
      if (G.serveT < G.serveDur) return;
      G.serveT = 0;

      q.shift();
      front.carry = 0;
      front.phase = 'leave';
      MSM.state.served++;
      MSM.ent.dropCash(front.total || MSM.econ.price(front.want));
    },

    /* The counter is a construction plot until you pay for it: walk onto
       it and your cash drains in, exactly like the level pads. */
    tillPad(dt) {
      const ss = MSM.econ.sstate();
      if (ss.till) return;
      const p = MSM.ent.player;
      if (U.boxDist(p.x, p.y, P.till) > 0.05) return;

      const cost = CFG.TILL_COST(MSM.econ.store().unlock);
      const rate = Math.max(cost / 1.6, 60);
      const pay = Math.min(rate * dt, cost - ss.tillPaid, MSM.state.cash);
      if (pay <= 0) return;
      MSM.state.cash -= pay;
      ss.tillPaid += pay;
      if (ss.tillPaid < cost) return;

      ss.till = true;
      ss.tillPaid = 0;
      MSM.world.invalidate();
      // you were standing ON the plot to pay for it — step out to the serving
      // side, or the finished counter appears around you and traps you inside
      p.x = P.serve.x;
      p.y = P.serve.y;
      p.vx = 0; p.vy = 0;
      MSM.render.pop(p.x, p.y, 1.3, '\u2728 Counter built!', '#2CA85C');
      MSM.ui.toast('\u2728 Checkout counter unlocked!');
      MSM.save();
    },

    /* The next product line's station is a build plot: stand on it and pay,
       exactly like the counter. Lines open strictly in order. */
    buildPads(dt) {
      const n = MSM.econ.nextBuild();
      if (n < 0) return;
      const prod = MSM.econ.prod(n), ps = MSM.econ.pstate(n);
      const p = MSM.ent.player;
      if (U.boxDist(p.x, p.y, prod.crate) > 0.05) return;

      const cost = prod.buildCost;
      const rate = Math.max(cost / 2.5, 60);
      const pay = Math.min(rate * dt, cost - ps.buildPaid, MSM.state.cash);
      if (pay <= 0) return;
      MSM.state.cash -= pay;
      ps.buildPaid += pay;
      if (ps.buildPaid < cost) return;

      ps.built = true;
      ps.buildPaid = 0;
      MSM.world.invalidate();
      const stand = MSM.ent.crateStand(n);
      p.x = stand.x; p.y = stand.y; p.vx = 0; p.vy = 0;
      MSM.render.pop(p.x, p.y, 1.3, '\u2728 ' + prod.source.label + '!', '#2CA85C');
      MSM.ui.toast('\u2728 ' + prod.name + ' unlocked \u2014 ' + prod.source.label + ' built!');
      MSM.save();
    },

    signHold: 0,
    signArmed: true,

    /* The OPEN/CLOSED sign by the door. Stand at it a moment to flip it —
       customers only come in while it says OPEN. */
    signPost(dt) {
      const ss = MSM.econ.sstate();
      const p = MSM.ent.player;
      if (U.boxDist(p.x, p.y, P.sign) > 0.15) {
        G.signHold = 0;
        G.signArmed = true;
        return;
      }
      if (!G.signArmed) return;
      if (!ss.till) {
        if (G.signHold === 0) MSM.ui.toast('Build the checkout counter first');
        G.signHold = 0.01;
        return;
      }
      G.signHold += dt;
      if (G.signHold < CFG.DOOR_HOLD) return;
      G.signHold = 0;
      G.signArmed = false;                     // step away before flipping again
      ss.open = !ss.open;
      MSM.ui.toast(ss.open ? '\ud83d\udfe2 The store is OPEN!' : '\ud83d\udd34 Closed for now');
      MSM.save();
    },

    /* -------------------------------------------------------- tutorial */
    tutTarget: null,
    tutText: '',

    /* The first five minutes, guided by an arrow: build the counter, harvest,
       stock a shelf, open up, serve, collect. All by walking. */
    tutorial() {
      const s = MSM.state;
      if (s.tut >= 99 || s.current !== 0) { G.tutTarget = null; G.tutText = ''; return; }
      const ss = MSM.econ.sstate();
      const p = MSM.ent.player;
      const potato = MSM.econ.prod(0);

      switch (s.tut) {
        case 0:
          if (ss.till) { s.tut = 1; break; }
          G.tutTarget = { x: (P.till.x0 + P.till.x1) / 2, y: (P.till.y0 + P.till.y1) / 2 };
          G.tutText = 'Stand on the plot to build your counter \u2014 $' +
                      CFG.TILL_COST(MSM.econ.store().unlock);
          break;
        case 1:
          if (p.hold.indexOf(0) >= 0) { s.tut = 2; break; }
          if (MSM.econ.pstate(0).shelf > 0) { s.tut = 3; break; }
          G.tutTarget = { x: (potato.crate.x0 + potato.crate.x1) / 2, y: potato.crate.y1 + 0.4 };
          G.tutText = 'Harvest potatoes \u2014 stand at the potato bed';
          break;
        case 2:
          if (MSM.econ.pstate(0).shelf > 0) { s.tut = 3; break; }
          G.tutTarget = { x: potato.browse.x, y: potato.browse.y };
          G.tutText = 'Carry them to the potato shelf';
          break;
        case 3:
          if (ss.open) { s.tut = 4; break; }
          G.tutTarget = { x: (P.sign.x0 + P.sign.x1) / 2, y: (P.sign.y0 + P.sign.y1) / 2 };
          G.tutText = 'Flip the sign to OPEN your store';
          break;
        case 4:
          if (s.served > 0) { s.tut = 5; break; }
          G.tutTarget = { x: P.serve.x, y: P.serve.y };
          G.tutText = 'A customer is coming \u2014 wait at the counter to serve them';
          break;
        case 5:
          if (MSM.ent.cash.length === 0 && s.totalEarned > 0) {
            s.tut = 99;
            G.tutTarget = null;
            G.tutText = '';
            MSM.ui.toast('\ud83c\udf89 FIRST SALE! Keep your shelves stocked!');
            MSM.save();
            break;
          }
          if (MSM.ent.cash.length) {
            G.tutTarget = { x: MSM.ent.cash[0].x, y: MSM.ent.cash[0].y };
            G.tutText = 'Collect your money!';
          }
          break;
      }
    },

    /* Stand on a product's pad and your cash drains into its next level.
       Step off and what you have already put in stays put. */
    levelPads(dt) {
      const p = MSM.ent.player;
      MSM.econ.store().products.forEach((prod, n) => {
        const ps = MSM.econ.pstate(n);
        if (!ps.built) return;
        if (U.boxDist(p.x, p.y, prod.pad) > 0.05) return;

        const cost = MSM.econ.upgradeCost(n, 1);
        const rate = Math.max(cost / 2.5, 45);
        const pay = Math.min(rate * dt, cost - ps.pay, MSM.state.cash);
        if (pay <= 0) return;
        MSM.state.cash -= pay;
        ps.pay += pay;

        if (ps.pay < cost) return;
        ps.pay = 0;
        const before = MSM.econ.mults(ps.level);
        ps.level++;
        const after = MSM.econ.mults(ps.level);
        MSM.render.pop(p.x, p.y, 1.2, prod.name + ' Lv ' + ps.level, '#2CA85C');
        if (after.income > before.income || after.speed > before.speed) {
          MSM.ui.toast('Milestone! ' + prod.name + ' Lv ' + ps.level);
        }
      });
    },

    /** The next store you own, wrapping round the list. -1 if there is none. */
    nextStore() {
      const n = MSM.state.stores.length;
      for (let k = 1; k <= n; k++) {
        const i = (MSM.state.current + k) % n;
        if (MSM.state.stores[i].owned) return i;
      }
      return -1;
    },

    /** The first store still locked — the doorway advertises it as a teaser. */
    teaseStore() {
      for (let i = 0; i < MSM.state.stores.length; i++) {
        if (!MSM.state.stores[i].owned) return i;
      }
      return -1;
    },

    doorHold: 0,

    /* Stand in the doorway for a moment and you walk through to the next
       store. Held rather than instant so brushing past it does not fire. */
    doors(dt) {
      const p = MSM.ent.player;
      const to = G.nextStore();
      if (to < 0 || U.boxDist(p.x, p.y, P.door) > 0.05) { G.doorHold = 0; return; }
      G.doorHold += dt;
      if (G.doorHold < CFG.DOOR_HOLD) return;
      G.doorHold = 0;
      G.travel(to);
    },

    /** Stores you are not standing in earn quietly, once fully staffed. */
    passive(dt) {
      let gain = 0;
      MSM.state.stores.forEach((ss, i) => {
        if (i === MSM.state.current) return;
        gain += MSM.econ.storeRate(i) * dt;
      });
      if (gain <= 0) return;
      MSM.state.cash += gain;
      MSM.state.totalEarned += gain;
    },

    catchUp(sec) {
      const capped = Math.min(sec, CFG.OFFLINE_CAP_H * 3600);
      const amount = MSM.econ.idleRate() * capped * CFG.OFFLINE_RATE;
      if (amount <= 0) return;
      MSM.state.cash += amount;
      MSM.state.totalEarned += amount;
      if (sec > 20) MSM.ui.toast(`+$${U.money(amount)} while you were away`);
    },

    checkLevel() {
      const p = MSM.econ.progress();
      if (p.level <= MSM.state.level) return;
      const gained = p.level - MSM.state.level;
      MSM.state.level = p.level;
      MSM.state.gems += CFG.GEMS_PER_LEVEL * gained;
      MSM.ui.toast(`Mall level ${p.level}! +${CFG.GEMS_PER_LEVEL * gained} 💎`);
    },

    /* ---------------------------------------------------- map actions */
    unlockStore(i) {
      const store = CFG.STORES[i], ss = MSM.state.stores[i];
      if (ss.owned || MSM.state.cash < store.unlock) return;
      MSM.state.cash -= store.unlock;
      ss.owned = true;
      MSM.ui.toast(`${store.name} is yours!`);
      MSM.save();
      G.travel(i);
    },

    travel(i) {
      if (!MSM.state.stores[i].owned || i === MSM.state.current) return;
      MSM.state.current = i;
      MSM.world.invalidate();
      MSM.ent.reset();
      // arrive standing in the new store's doorway, not at the till
      MSM.ent.player.x = (P.door.x0 + P.door.x1) / 2;
      MSM.ent.player.y = P.door.y1 + 0.5;
      G.doorHold = 0;
      MSM.iso.cx = MSM.ent.player.x;
      MSM.iso.cy = MSM.ent.player.y;
      MSM.iso.apply();
      MSM.ui.close();
      MSM.ui.toast(`Welcome to ${CFG.STORES[i].name}`);
      MSM.save();
    },

    /* -------------------------------------------------- store actions */
    upgrade(n, mode) {
      const ps = MSM.econ.pstate(n);
      const count = mode === 'max' ? MSM.econ.maxBuy(n, MSM.state.cash) : mode;
      if (count < 1) { MSM.ui.toast('Not enough cash'); return; }
      const cost = MSM.econ.upgradeCost(n, count);
      if (MSM.state.cash < cost) { MSM.ui.toast('Not enough cash'); return; }

      const before = MSM.econ.mults(ps.level);
      MSM.state.cash -= cost;
      ps.level += count;
      const after = MSM.econ.mults(ps.level);
      if (after.income > before.income || after.speed > before.speed) {
        MSM.ui.toast(`Milestone! ${MSM.econ.prod(n).name} Lv ${ps.level}`);
      }
    },

    hireStocker() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      if (ss.stockers >= CFG.MAX_STOCKERS) return;
      const cost = store.stockerCost(ss.stockers);
      if (MSM.state.cash < cost) return;
      MSM.state.cash -= cost;
      ss.stockers++;
      MSM.ent.syncStockers();
      MSM.ui.toast(`Stocker hired (${ss.stockers}/${CFG.MAX_STOCKERS})`);
      MSM.save();
    },

    hireCashier() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      if (ss.cashier || MSM.state.cash < store.cashierCost) return;
      MSM.state.cash -= store.cashierCost;
      ss.cashier = true;
      MSM.ui.toast('Cashier hired — the queue clears itself');
      MSM.save();
    },

    boost() {
      const b = CFG.BOOST;
      if (MSM.econ.boosting() || MSM.state.gems < b.gems) return;
      MSM.state.gems -= b.gems;
      MSM.state.boostUntil = Date.now() + b.seconds * 1000;
      MSM.ui.toast(`Rush hour! ×${b.mult} prices`);
    },
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => G.init());
  else G.init();
})();
