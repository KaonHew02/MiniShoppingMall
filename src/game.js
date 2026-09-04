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
      MSM.i18n.init();
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
      else if ((MSM.state.stores[0].tut || 0) >= 99) {
        setTimeout(() => MSM.ui.toast(MSM.t('toast.tip')), 800);
      }

      this.last = performance.now();
      requestAnimationFrame(G.loop);
    },

    /* ------------------------------------------------------------ input */
    /* A floating joystick: put a finger down anywhere and drag. The stick
       appears where you touched, so there is no fixed pad to reach for. */
    bindInput(canvas) {
      let stickId = null;

      const drop = () => { stickId = null; MSM.render.stick = null; };

      canvas.addEventListener('pointerdown', (e) => {
        if (stickId !== null) return;
        stickId = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
        const r = canvas.getBoundingClientRect();
        MSM.render.stick = { ox: e.clientX - r.left, oy: e.clientY - r.top, dx: 0, dy: 0 };
      });

      canvas.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stickId || !MSM.render.stick) return;
        const r = canvas.getBoundingClientRect();
        MSM.render.stick.dx = e.clientX - r.left - MSM.render.stick.ox;
        MSM.render.stick.dy = e.clientY - r.top - MSM.render.stick.oy;
      });

      const release = (e) => { if (e.pointerId === stickId) drop(); };
      canvas.addEventListener('pointerup', release);
      canvas.addEventListener('pointercancel', release);

      /* The stick used to jam, and that is what "the game hangs" looked like:
         anything that takes the window away mid-drag — a Google sign-in
         popup, the iOS long-press callout, switching apps — swallows the
         pointerup, so stickId stayed set (no new touch was ever accepted)
         and the last heading kept walking the character into a wall. Every
         way of losing the pointer now drops the stick. */
      canvas.addEventListener('lostpointercapture', release);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      addEventListener('blur', () => { drop(); G.keys.clear(); });
      addEventListener('visibilitychange', () => {
        if (document.hidden) { drop(); G.keys.clear(); }
      });

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
      MSM.world.frame();
      MSM.ent.restock(dt);
      MSM.ent.movePlayer(dt, dir.x, dir.y);
      MSM.ent.updateStockers(dt);
      MSM.ent.stepCashier(dt);
      MSM.ent.spawnGate = MSM.econ.sstate().open;
      MSM.ent.updateCustomers(dt);
      MSM.ent.ageCash(dt);
      /* The sport outlet still uses the mini mart's till — a queue and a
         counter work the same in any shop — so it gets both. */
      /* The cafe and fast food both work their own counter — one hands the
         drink over on delivery, the other takes the money up front — so
         neither runs the mini mart's till. */
      if (MSM.cafe.active()) MSM.cafe.update(dt);
      else if (MSM.food.active()) MSM.food.update(dt);
      else {
        if (MSM.sports.active()) MSM.sports.update(dt);
        if (MSM.boutique.active()) MSM.boutique.update(dt);
        if (MSM.tech.active()) MSM.tech.update(dt);
        G.serve(dt);
      }
      // last, once everyone has moved: no two bodies left standing in one spot
      MSM.ent.separate();
      G.tillPad(dt);
      G.buildPads(dt);
      G.signPost(dt);
      MSM.tut.update();
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
      MSM.render.pop(p.x, p.y, 1.3, MSM.t('pop.counter'), '#2CA85C');
      MSM.ui.toast(MSM.t('toast.counter'));
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
      MSM.render.pop(p.x, p.y, 1.3, MSM.t('pop.built', { label: prod.source.label }), '#2CA85C');
      MSM.ui.toast(MSM.t('toast.built', { name: prod.name, label: prod.source.label }));
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
        if (G.signHold === 0) MSM.ui.toast(MSM.t('toast.tillFirst'));
        G.signHold = 0.01;
        return;
      }
      G.signHold += dt;
      if (G.signHold < CFG.DOOR_HOLD) return;
      G.signHold = 0;
      G.signArmed = false;                     // step away before flipping again
      ss.open = !ss.open;
      MSM.ui.toast(MSM.t(ss.open ? 'toast.open' : 'toast.closed'));
      MSM.save();
    },

    /* -------------------------------------------------------- tutorial */
    /* Where the guided arrow points and what the line under the HUD says.
       MSM.tut owns both — see src/tutorial.js. */
    tutTarget: null,
    tutText: '',

    /* Stand on a product's pad and your cash drains into its next level.
       Step off and what you have already put in stays put. */
    levelPads(dt) {
      const p = MSM.ent.player;
      MSM.econ.store().products.forEach((prod, n) => {
        const ps = MSM.econ.pstate(n);
        if (!ps.built || MSM.econ.maxed(n)) return;
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
        MSM.render.pop(p.x, p.y, 1.2, prod.name + ' ' + MSM.t('lv', { n: ps.level }), '#2CA85C');
        if (after.income > before.income || after.speed > before.speed) {
          MSM.ui.toast(MSM.t('toast.milestone', { name: prod.name, n: ps.level }));
        }
      });
    },

    /** The shop one step round the ring in `dir`, and only if you own it —
        -1 otherwise. An escalator joins the units either SIDE of it, so it
        does not reach over the ones you have not bought yet: with Sport
        Outlet still locked, Burger Rush's up run goes nowhere rather than
        making the long trip round to the Grocery Store. Nothing is stranded
        by that — the Map travels to any shop you own. */
    ringStore(dir) {
      const n = MSM.state.stores.length;
      const i = ((MSM.state.current + dir) % n + n) % n;
      return i !== MSM.state.current && MSM.state.stores[i].owned ? i : -1;
    },

    /* It is drawn as a TWIN escalator and now it works like one. The UP run
       carries you on round the ring; the DOWN run — the one the shop's own
       customers ride in on — takes you back the way you came. Forward-only
       meant that from Burger Rush, with the next three shops still locked,
       the only ride out was the long way round to the Grocery Store while
       the Coffee Shop sat one step behind you. */
    nextStore() { return G.ringStore(1); },
    prevStore() { return G.ringStore(-1); },

    /** The first store still locked — the doorway advertises it as a teaser. */
    teaseStore() {
      for (let i = 0; i < MSM.state.stores.length; i++) {
        if (!MSM.state.stores[i].owned) return i;
      }
      return -1;
    },

    doorHold: 0,
    doorUp: true,                    // which of the two runs is being charged

    /* Stand on one of the two runs for a moment and it carries you off.
       Held rather than instant so brushing past it does not fire, and the
       hold resets when you step across to the other run — otherwise half a
       charge on the up side would finish the trip down. */
    doors(dt) {
      const p = MSM.ent.player, d = P.door;
      const up = p.x < (d.x0 + d.x1) / 2;
      const next = G.nextStore(), back = G.prevStore();
      /* Only one run going anywhere and you stood on the other: take them
         anyway. A tread that quietly does nothing reads as broken. */
      const to = up ? (next >= 0 ? next : back) : (back >= 0 ? back : next);
      // stand at the foot of a run, not inside it — the escalator is solid
      if (to < 0 || U.boxDist(p.x, p.y, d) > CFG.ESC.BOARD) { G.doorHold = 0; return; }
      if (up !== G.doorUp) { G.doorUp = up; G.doorHold = 0; }
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
      if (sec > 20) MSM.ui.toast(MSM.t('toast.away', { n: '$' + U.money(amount) }));
    },

    checkLevel() {
      const p = MSM.econ.progress();
      if (p.level <= MSM.state.level) return;
      const gained = p.level - MSM.state.level;
      MSM.state.level = p.level;
      MSM.state.gems += CFG.GEMS_PER_LEVEL * gained;
      MSM.ui.toast(MSM.t('toast.level', { n: p.level, g: CFG.GEMS_PER_LEVEL * gained }));
    },

    /* ---------------------------------------------------- map actions */
    unlockStore(i) {
      const store = CFG.STORES[i], ss = MSM.state.stores[i];
      if (ss.owned || MSM.state.cash < store.unlock) return;
      MSM.state.cash -= store.unlock;
      ss.owned = true;
      MSM.ui.toast(MSM.t('toast.storeYours', { store: store.name }));
      MSM.save();
      G.travel(i);
    },

    travel(i) {
      if (!MSM.state.stores[i].owned || i === MSM.state.current) return;
      MSM.state.current = i;
      MSM.world.invalidate();          // also swaps in the new store's floor plan
      MSM.ent.reset();
      // arrive stepping off the new store's escalator, not at the till
      MSM.ent.player.x = (P.door.x0 + P.door.x1) / 2;
      MSM.ent.player.y = P.door.y1 + 0.5;
      G.doorHold = 0;
      MSM.iso.cx = MSM.ent.player.x;
      MSM.iso.cy = MSM.ent.player.y;
      MSM.iso.apply();
      MSM.ui.close();
      MSM.ui.toast(MSM.t('toast.welcomeStore', { store: CFG.STORES[i].name }));
      MSM.save();
    },

    /* -------------------------------------------------- store actions */
    upgrade(n) {
      const ps = MSM.econ.pstate(n);
      if (MSM.econ.maxed(n)) return;
      const cost = MSM.econ.upgradeCost(n, 1);
      if (MSM.state.cash < cost) { MSM.ui.toast(MSM.t('toast.noCash')); return; }

      const before = MSM.econ.mults(ps.level);
      MSM.state.cash -= cost;
      ps.level++;
      const after = MSM.econ.mults(ps.level);
      if (after.income > before.income || after.speed > before.speed) {
        MSM.ui.toast(MSM.t('toast.milestone', { name: MSM.econ.prod(n).name, n: ps.level }));
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
      MSM.ui.toast(MSM.t('toast.stocker', { a: ss.stockers, b: CFG.MAX_STOCKERS }));
      MSM.save();
    },

    hireCashier() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      if (ss.cashier || MSM.state.cash < store.cashierCost) return;
      MSM.state.cash -= store.cashierCost;
      ss.cashier = true;
      MSM.ent.syncCashier();
      MSM.ui.toast(MSM.t('toast.cashier'));
      MSM.save();
    },

    /* The cafe crew. A barista works the bar, a chef runs the kitchen, a
       server carries it all out and a cleaner clears the tables — the four
       jobs stage 2 adds. */
    hireCafe(job) {
      const store = MSM.econ.store(), cs = MSM.econ.cstate();
      if (!cs || cs[job]) return;
      const cost = G.cafeCost(job);
      if (MSM.state.cash < cost) return;
      MSM.state.cash -= cost;
      cs[job] = true;
      MSM.cafe.syncCrew();
      MSM.ui.toast(MSM.t('toast.' + job));
      MSM.save();
    },

    /* A machine's own levels: faster, and more cups on the go at once. Also
       on its pad in the world, exactly like a product's. */
    upgradeMachine(mi) {
      const cs = MSM.econ.cstate();
      if (!cs || !cs.machines[mi].built) return;
      if (cs.machines[mi].level >= CFG.MAX_LEVEL) return;
      const cost = MSM.econ.machineCost(mi);
      if (MSM.state.cash < cost) { MSM.ui.toast(MSM.t('toast.noCash')); return; }
      MSM.state.cash -= cost;
      cs.machines[mi].level++;
      MSM.ui.toast(MSM.t('cafe.machineUp', {
        label: MSM.econ.store().plan.machines[mi].label, n: cs.machines[mi].level }));
    },

    /* Stage 3's one hire. An advisor does not touch stock and does not work
       the till — they walk the floor and close the sales you cannot reach. */
    hireAdvisor() {
      const sp = MSM.econ.spstate();
      if (!sp || sp.advisor) return;
      const cost = G.advisorCost();
      if (MSM.state.cash < cost) return;
      MSM.state.cash -= cost;
      sp.advisor = true;
      MSM.sports.syncCrew();
      MSM.ui.toast(MSM.t('toast.advisor'));
      MSM.save();
    },

    advisorCost: () => CFG.SPORTS.ADVISOR_COST(MSM.econ.store().unlock),

    /* Stage 4's one hire: the person who walks a size out from the back. */
    hireAssistant() {
      const bs = MSM.econ.bstate();
      if (!bs || bs.assistant) return;
      const cost = G.assistantCost();
      if (MSM.state.cash < cost) return;
      MSM.state.cash -= cost;
      bs.assistant = true;
      MSM.boutique.syncCrew();
      MSM.ui.toast(MSM.t('toast.assistant'));
      MSM.save();
    },

    assistantCost: () => CFG.BOUTIQUE.ASSISTANT_COST(MSM.econ.store().unlock),

    /* Stage 5's one hire: the person who reads the spec sheet FOR them. */
    hireTechAdvisor() {
      const ts = MSM.econ.tstate();
      if (!ts || ts.advisor) return;
      const cost = G.techAdvisorCost();
      if (MSM.state.cash < cost) return;
      MSM.state.cash -= cost;
      ts.advisor = true;
      MSM.tech.syncCrew();
      MSM.ui.toast(MSM.t('toast.techAdvisor'));
      MSM.save();
    },

    techAdvisorCost: () => CFG.TECH.ADVISOR_COST(MSM.econ.store().unlock),

    /* Fast food's two hires, either side of the bottleneck. */
    hireFood(job) {
      const fs = MSM.econ.fstate();
      if (!fs || fs[job]) return;
      const cost = G.foodCost(job);
      if (MSM.state.cash < cost) return;
      MSM.state.cash -= cost;
      fs[job] = true;
      MSM.food.syncCrew();
      MSM.ui.toast(MSM.t('toast.' + job));
      MSM.save();
    },

    foodCost: (job) => (job === 'cook' ? CFG.FOOD.COOK_COST : CFG.FOOD.PACKER_COST)
      (MSM.econ.store().unlock),

    /* A station's own levels: faster, and more parts on at once. Also on its
       pad in the world, exactly like a cafe machine's. */
    upgradeStation(mi) {
      const fs = MSM.econ.fstate();
      if (!fs || !fs.stations[mi].built) return;
      if (fs.stations[mi].level >= CFG.MAX_LEVEL) return;
      const cost = MSM.econ.stationCost(mi);
      if (MSM.state.cash < cost) { MSM.ui.toast(MSM.t('toast.noCash')); return; }
      MSM.state.cash -= cost;
      fs.stations[mi].level++;
      MSM.ui.toast(MSM.t('food.stationUp', {
        label: MSM.econ.store().plan.machines[mi].label, n: fs.stations[mi].level }));
    },

    cafeCost(job) {
      const u = MSM.econ.store().unlock;
      return job === 'barista' ? CFG.CAFE.BARISTA_COST(u)
        : job === 'chef' ? CFG.CAFE.CHEF_COST(u)
        : job === 'server' ? CFG.CAFE.SERVER_COST(u) : CFG.CAFE.CLEANER_COST(u);
    },

    boost() {
      const b = CFG.BOOST;
      if (MSM.econ.boosting() || MSM.state.gems < b.gems) return;
      MSM.state.gems -= b.gems;
      MSM.state.boostUntil = Date.now() + b.seconds * 1000;
      MSM.ui.toast(MSM.t('toast.boost', { n: b.mult }));
    },
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => G.init());
  else G.init();
})();
