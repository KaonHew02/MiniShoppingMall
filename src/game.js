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
      else setTimeout(() => MSM.ui.toast('Customers show what they want — keep those shelves full'), 800);

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

    /** Stick / keys -> a direction in world space. */
    input() {
      let sx = 0, sy = 0;
      const st = MSM.render.stick;
      if (st) {
        const d = Math.hypot(st.dx, st.dy);
        if (d > 8) { sx = st.dx; sy = st.dy; }
      }
      const k = G.keys;
      if (k.has('a') || k.has('arrowleft'))  sx -= 60;
      if (k.has('d') || k.has('arrowright')) sx += 60;
      if (k.has('w') || k.has('arrowup'))    sy -= 60;
      if (k.has('s') || k.has('arrowdown'))  sy += 60;
      if (!sx && !sy) return { x: 0, y: 0 };

      // undo the isometric projection so "up" on screen is up the shop
      const a = sx / (MSM.iso.TW / 2), b = sy / (MSM.iso.TH / 2);
      const wx = (a + b) / 2, wy = (b - a) / 2;
      const len = Math.hypot(wx, wy) || 1;
      return { x: wx / len, y: wy / len };
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
      MSM.ent.updateCustomers(dt);
      MSM.ent.ageCash(dt);
      G.serve(dt);
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
      const atTill = MSM.world.atPoint(MSM.ent.player, P.serve, 0.95);
      if (!atTill && !ss.cashier) { G.serveT = 0; return; }

      G.serveT += dt * (atTill && ss.cashier ? 1.7 : 1);
      if (G.serveT < CFG.SERVE_TIME) return;
      G.serveT = 0;

      q.shift();
      front.carry = 0;
      front.phase = 'leave';
      MSM.state.served++;
      MSM.ent.dropCash(MSM.econ.price(front.want));
    },

    /* Stand on a product's pad and your cash drains into its next level.
       Step off and what you have already put in stays put. */
    levelPads(dt) {
      const p = MSM.ent.player;
      MSM.econ.store().products.forEach((prod, n) => {
        const ps = MSM.econ.pstate(n);
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
