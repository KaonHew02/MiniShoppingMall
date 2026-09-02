/* Game state, economy maths, save/load and offline earnings. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG;
  const GROWTH = 1.13;

  /* Stage 2 keeps three things the mini mart has no idea about: the machines
     behind the bar, the tables out front, and the drinks already made and
     waiting on the pickup counter. */
  const blankCafe = (store) => ({
    machines: store.plan.machines.map((m) => ({
      built: m.cost === 0, buildPaid: 0, level: 1, pay: 0,
    })),
    tables: store.plan.tables.map((t) => ({
      built: t.cost === 0, buildPaid: 0, dirty: false,
    })),
    ready: [],                  // finished drinks sitting on the pickup counter
    barista: false, chef: false, server: false, cleaner: false,
    tips: 0, walkouts: 0,
  });

  /* Stage 3 keeps the courts you have built, whether an advisor is on the
     floor, and the running tally of who bought and who walked. */
  const blankSports = (store) => ({
    areas: store.plan.areas.map((a) => ({
      built: a.cost === 0, buildPaid: 0,
    })),
    advisor: false,
    bought: 0, rejected: 0, walkouts: 0,
  });

  /* Stage 4 keeps the cubicles you have built, whether an assistant is on the
     floor, and — the stage's whole point — how many of each SIZE is hanging
     on every rail. `products[n].shelf` stays the total, so the stockers, the
     meters and the world all keep working without knowing about sizes. */
  const blankBoutique = (store) => ({
    rooms: store.plan.rooms.map((r) => ({ built: r.cost === 0, buildPaid: 0 })),
    racks: store.products.map(() => [0, 0, 0, 0]),
    assistant: false,
    sold: 0, lost: 0, fetched: 0,
  });

  /* Stage 5 keeps the demo benches you have built, whether a tech advisor is
     on the floor, and the tallies the Staff sheet reports. */
  const blankTech = (store) => ({
    areas: store.plan.areas.map((a) => ({ built: a.cost === 0, buildPaid: 0 })),
    advisor: false,
    sold: 0, lost: 0, advised: 0, compared: 0,
  });

  /* Fast food keeps its three stations and its two hires. Tickets, trays and
     part-cooked food are all in flight, so — like the cafe's orders — they
     live in the sim and are not saved. */
  const blankFood = (store) => ({
    stations: store.plan.machines.map((m) => ({
      built: m.cost === 0, buildPaid: 0, level: 1, pay: 0,
    })),
    cook: false, packer: false,
    sold: 0, walkouts: 0, trays: 0,
  });

  const blank = () => ({
    cash: CFG.START_CASH,
    gems: 0,
    level: 1,
    current: 0,                 // which store you are standing in
    boostUntil: 0,
    lastSeen: Date.now(),
    totalEarned: 0,
    served: 0,
    tut: 0,                     // tutorial step; 99 once the first sale is done
    stores: CFG.STORES.map((s, i) => ({
      owned: i === 0,
      till: false,              // the counter has to be built before you can sell
      tillPaid: 0,
      open: false,              // customers only come while the sign says OPEN
      stockers: 0,
      cashier: false,
      products: s.products.map((p) => ({
        built: p.buildCost === 0, buildPaid: 0,
        level: 1, shelf: 0, out: 0, feed: 0, t: 0, pay: 0,
      })),
      cafe: s.mode === 'cafe' ? blankCafe(s) : null,
      sports: s.mode === 'sports' ? blankSports(s) : null,
      boutique: s.mode === 'boutique' ? blankBoutique(s) : null,
      tech: s.mode === 'tech' ? blankTech(s) : null,
      food: s.mode === 'food' ? blankFood(s) : null,
    })),
  });

  MSM.state = blank();

  const E = MSM.econ = {
    store: (i) => CFG.STORES[i ?? MSM.state.current],
    sstate: (i) => MSM.state.stores[i ?? MSM.state.current],
    prod: (n, i) => CFG.STORES[i ?? MSM.state.current].products[n],
    pstate: (n, i) => MSM.state.stores[i ?? MSM.state.current].products[n],

    mults(level) {
      let income = 1, speed = 1;
      for (const m of CFG.MILESTONES) {
        if (level >= m.lvl) { income *= m.income || 1; speed *= m.speed || 1; }
      }
      return { income, speed };
    },

    nextMilestone: (level) => CFG.MILESTONES.find((m) => level < m.lvl) || null,

    /** The next product line to open — lowest unbuilt rank, or -1. */
    nextBuild(i) {
      const store = E.store(i), ss = E.sstate(i);
      let best = -1, rank = 1e9;
      store.products.forEach((p, n) => {
        if (ss.products[n].built || p.rank >= rank) return;
        rank = p.rank; best = n;
      });
      return best;
    },

    /* ------------------------------------------------------- the cafe */
    cstate: (i) => MSM.state.stores[i ?? MSM.state.current].cafe,
    isCafe: (i) => CFG.STORES[i ?? MSM.state.current].mode === 'cafe',

    /* ------------------------------------------------ the sport outlet */
    spstate: (i) => MSM.state.stores[i ?? MSM.state.current].sports,

    /** Is this line's court built? A sport with no court still sells, but
        nobody gets to try anything, so far fewer of them buy. */
    court(n, i) {
      const sp = E.spstate(i), prod = E.prod(n, i);
      if (!sp || prod.areaIndex == null || prod.areaIndex < 0) return false;
      return !!sp.areas[prod.areaIndex].built;
    },

    /** How often a sale actually closes here — the stage's real headline. */
    conversion(i) {
      const sp = E.spstate(i);
      if (!sp) return 1;
      const seen = sp.bought + sp.rejected + sp.walkouts;
      return seen ? sp.bought / seen : 0;
    },

    /* -------------------------------------------- the fashion boutique */
    bstate: (i) => MSM.state.stores[i ?? MSM.state.current].boutique,

    /** How many of this line are hanging in that size. */
    sizeStock(n, size, i) {
      const bs = E.bstate(i);
      if (!bs || !E.prod(n, i).garment) return E.pstate(n, i).shelf;
      return bs.racks[n][size] || 0;
    },

    /** The emptiest size on a rail — where the next one off the box goes. */
    thinnestSize(n, i) {
      const bs = E.bstate(i);
      let best = 0, low = Infinity;
      bs.racks[n].forEach((v, k) => { if (v < low) { low = v; best = k; } });
      return best;
    },

    /** Cubicles free right now, and how many there are at all. */
    rooms(i) {
      const bs = E.bstate(i);
      if (!bs) return { built: 0, free: 0 };
      const taken = {};
      MSM.ent.customers.forEach((c) => { if (c.room >= 0) taken[c.room] = 1; });
      let built = 0, free = 0;
      bs.rooms.forEach((r, k) => {
        if (!r.built) return;
        built++;
        if (!taken[k]) free++;
      });
      return { built, free };
    },

    /** What share of shoppers the boutique closes, unattended. */
    fitRate(n, i) {
      const B = CFG.BOUTIQUE;
      const chance = B.BASE_BUY + B.HELP_BONUS +
        (E.prod(n, i).garment ? B.FIT_BONUS : 0);
      return Math.min(chance, B.MAX_BUY) * 0.85;
    },

    /** Boutique conversion — same headline number, its own tallies. */
    fitConversion(i) {
      const bs = E.bstate(i);
      if (!bs) return 1;
      const seen = bs.sold + bs.lost;
      return seen ? bs.sold / seen : 0;
    },

    /* ------------------------------------------------------ fast food */
    fstate: (i) => MSM.state.stores[i ?? MSM.state.current].food,

    /** A station's cook speed and how many parts it can have on at once —
        the number that decides whether it is the bottleneck. */
    station(mi, i) {
      const fs = E.fstate(i);
      const lvl = fs && fs.stations[mi] ? fs.stations[mi].level : 1;
      return {
        level: lvl,
        speed: 1 + CFG.FOOD.STATION_SPEED * (lvl - 1),
        cap: CFG.FOOD.STATION_CAP(lvl),
      };
    },

    stationCost(mi, i) {
      const spec = E.store(i).plan.machines[mi];
      const lvl = E.fstate(i).stations[mi].level;
      return Math.ceil(spec.base * Math.pow(CFG.FOOD.STATION_GROWTH, lvl - 1));
    },

    /** Seconds to cook one of this item on the station that makes it. */
    cookTime(n, i) {
      const prod = E.prod(n, i);
      const st = E.station(prod.machineIndex, i);
      return Math.max(CFG.MIN_RESTOCK, E.restock(n, i) / st.speed);
    },

    /* --------------------------------------------------- the techhub */
    tstate: (i) => MSM.state.stores[i ?? MSM.state.current].tech,

    /** Is this line's demo bench built? Cold spec sheets barely sell. */
    bench(n, i) {
      const ts = E.tstate(i), prod = E.prod(n, i);
      if (!ts || prod.areaIndex == null || prod.areaIndex < 0) return false;
      return !!ts.areas[prod.areaIndex].built;
    },

    /** What share of shoppers a tech line closes, unattended. */
    techRate(n, i) {
      const T = CFG.TECH;
      const chance = T.BASE_BUY + T.ADVICE_BONUS +
        (E.bench(n, i) ? T.DEMO_BONUS + T.COMPARE_BONUS : 0);
      return Math.min(chance, T.MAX_BUY) * 0.85;
    },

    techConversion(i) {
      const ts = E.tstate(i);
      if (!ts) return 1;
      const seen = ts.sold + ts.lost;
      return seen ? ts.sold / seen : 0;
    },

    /** A machine's brew speed and how many cups it can have on at once. */
    machine(mi, i) {
      const cs = E.cstate(i);
      const lvl = (cs && cs.machines[mi] ? cs.machines[mi].level : 1);
      return {
        level: lvl,
        speed: 1 + CFG.CAFE.MACHINE_SPEED * (lvl - 1),
        cap: CFG.CAFE.MACHINE_CAP(lvl),
      };
    },

    machineCost(mi, i) {
      const spec = E.store(i).plan.machines[mi];
      const lvl = E.cstate(i).machines[mi].level;
      return Math.ceil(spec.base * Math.pow(CFG.CAFE.MACHINE_GROWTH, lvl - 1));
    },

    /** Seconds to brew one of this drink, on the machine that makes it. */
    brewTime(n, i) {
      const prod = E.prod(n, i);
      const m = E.machine(prod.machineIndex, i);
      return Math.max(CFG.MIN_RESTOCK, E.restock(n, i) / m.speed);
    },

    /** Fraction of the built tables that are clean — it drives the tip. */
    clean(i) {
      const cs = E.cstate(i);
      if (!cs) return 1;
      let built = 0, dirty = 0;
      cs.tables.forEach((t) => { if (t.built) { built++; if (t.dirty) dirty++; } });
      return built ? 1 - dirty / built : 1;
    },

    boosting: () => Date.now() < MSM.state.boostUntil,
    boostMult: () => (E.boosting() ? CFG.BOOST.mult : 1),

    /** What one unit of this product sells for. */
    price(n, i) {
      const ps = E.pstate(n, i);
      return E.prod(n, i).price * ps.level * E.mults(ps.level).income * E.boostMult();
    },

    /** Seconds for the back-room crate to receive one more unit. */
    restock(n, i) {
      const ps = E.pstate(n, i);
      return Math.max(CFG.MIN_RESTOCK, E.prod(n, i).restock / E.mults(ps.level).speed);
    },

    upgradeCost(n, count = 1, i) {
      const ps = E.pstate(n, i);
      const first = E.prod(n, i).upgradeBase * Math.pow(GROWTH, ps.level - 1);
      return Math.ceil(first * (Math.pow(GROWTH, count) - 1) / (GROWTH - 1));
    },

    maxBuy(n, cash, i) {
      const ps = E.pstate(n, i);
      const first = E.prod(n, i).upgradeBase * Math.pow(GROWTH, ps.level - 1);
      return Math.max(0, Math.floor(Math.log(1 + (cash * (GROWTH - 1)) / first) / Math.log(GROWTH)));
    },

    /** Cash per second a store earns unattended — needs a stocker AND a cashier. */
    storeRate(i) {
      const ss = MSM.state.stores[i];
      if (!ss.owned || !ss.till || !ss.open || !ss.stockers || !ss.cashier) return 0;
      /* A cafe needs the whole crew: somebody to brew it and somebody to
         carry it out, or the drinks just pile up on the counter. */
      if (ss.cafe && !(ss.cafe.barista && ss.cafe.server)) return 0;
      /* An outlet with nobody advising sells to almost nobody — the whole
         stage is the conversation on the shop floor. */
      if (ss.sports && !ss.sports.advisor) return 0;
      /* Nobody to find a size or work the cubicles is the same problem in a
         different shop: the clothes stay on the rail. */
      if (ss.boutique && !ss.boutique.assistant) return 0;
      /* Nobody to translate the spec sheets is the same problem again: the
         boxes stay sealed on the stands. */
      if (ss.tech && !ss.tech.advisor) return 0;
      /* A kitchen with nobody on the line, or nobody building trays, plates
         nothing at all — both halves have to be hired. */
      if (ss.food && !(ss.food.cook && ss.food.packer)) return 0;
      let r = 0;
      CFG.STORES[i].products.forEach((p, n) => {
        if (!p.sell || !ss.products[n].built) return;
        /* Food is the chef's station — without one the kitchen earns nothing. */
        if (ss.cafe && p.recipe && !ss.cafe.chef &&
            CFG.STORES[i].plan.machines[p.machineIndex].staff === 'chef') return;
        // a line with no court to try it on closes far fewer sales
        let rate = E.price(n, i) / E.restock(n, i);
        if (ss.sports) rate *= E.closeRate(n, i);
        if (ss.boutique) rate *= E.fitRate(n, i);
        if (ss.tech) rate *= E.techRate(n, i);
        r += rate;
      });
      return r * 0.5;             // customers, not supply, are the real limit
    },

    /** The share of shoppers a line converts, unattended, with an advisor. */
    closeRate(n, i) {
      const S = CFG.SPORTS;
      const chance = S.BASE_BUY + S.ADVICE_BONUS + (E.court(n, i) ? S.TRY_BONUS : 0);
      return Math.min(chance, S.MAX_BUY) * 0.85;   // and some cannot afford it
    },

    idleRate: () => MSM.state.stores.reduce((a, _, i) => a + E.storeRate(i), 0),

    totalLevels: () => MSM.state.stores.reduce(
      (a, s) => a + (s.owned ? s.products.reduce((b, p) => b + p.level, 0) : 0), 0),

    progress() {
      const total = E.totalLevels();
      let lvl = 1;
      while (total >= CFG.levelThreshold(lvl)) lvl++;
      const prev = lvl > 1 ? CFG.levelThreshold(lvl - 1) : 0;
      const need = CFG.levelThreshold(lvl);
      return { level: lvl, have: total, need, pct: (total - prev) / (need - prev) };
    },
  };

  /* --------------------------------------------------------- persistence */
  /* MSM.suspendSave is set while a restore is reloading the page — otherwise
     the pagehide handler writes the old in-memory game straight over it. */
  MSM.save = function () {
    if (MSM.suspendSave) return;
    MSM.state.lastSeen = Date.now();
    try {
      localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(MSM.state));
      if (MSM.driveTouch) MSM.driveTouch();     // auto-backup, debounced and silent
    } catch (e) { /* quota / private mode */ }
  };

  MSM.reset = function () {
    MSM.state = blank();
    MSM.save();
  };

  MSM.load = function () {
    let raw = null;
    try { raw = localStorage.getItem(CFG.SAVE_KEY); } catch (e) { /* ignore */ }
    if (!raw) return null;

    let data;
    try { data = JSON.parse(raw); } catch (e) { return null; }
    if (!data || !Array.isArray(data.stores)) return null;

    const s = blank();
    s.cash = +data.cash || 0;
    s.gems = +data.gems || 0;
    s.level = +data.level || 1;
    s.totalEarned = +data.totalEarned || 0;
    s.served = +data.served || 0;
    s.lastSeen = +data.lastSeen || Date.now();
    s.current = MSM.util.clamp(+data.current || 0, 0, s.stores.length - 1);
    s.tut = +data.tut || 0;
    // merge by index so adding stores or products never breaks an old save
    data.stores.forEach((old, i) => {
      if (!s.stores[i] || !old) return;
      s.stores[i].owned = !!old.owned;
      s.stores[i].stockers = Math.max(0, +old.stockers || (old.stocker ? 1 : 0));
      s.stores[i].till = !!old.till;
      s.stores[i].tillPaid = Math.max(0, +old.tillPaid || 0);
      s.stores[i].open = !!old.open;
      s.stores[i].cashier = !!old.cashier;
      /* The coffee shop was rebuilt from four shelf products into sixteen
         ingredients and recipes. An old save's numbers would land on
         completely different lines, so that store starts fresh — everything
         else merges by index as before. */
      const fresh = (old.products || []).length !== s.stores[i].products.length;
      if (fresh) { s.stores[i].till = false; s.stores[i].open = false; }
      (fresh ? [] : old.products || []).forEach((op, n) => {
        const ps = s.stores[i].products[n];
        if (!ps || !op) return;
        ps.level = Math.max(1, +op.level || 1);
        ps.shelf = MSM.util.clamp(+op.shelf || 0, 0, CFG.SHELF_CAP);
        ps.out = MSM.util.clamp(+(op.out != null ? op.out : op.crate) || 0, 0, CFG.CRATE_CAP);
        ps.feed = MSM.util.clamp(+op.feed || 0, 0, CFG.FEED_CAP);
        ps.pay = Math.max(0, +op.pay || 0);
        ps.built = op.built != null ? !!op.built : true;   // old saves had everything
        ps.buildPaid = Math.max(0, +op.buildPaid || 0);
      });

      /* The sport outlet's courts and its advisor. Same rule as the cafe:
         if the line-up changed shape, this store starts over. */
      const sp = s.stores[i].sports, op = old.sports;
      if (sp && op && !fresh) {
        sp.advisor = !!op.advisor;
        sp.bought = Math.max(0, +op.bought || 0);
        sp.rejected = Math.max(0, +op.rejected || 0);
        sp.walkouts = Math.max(0, +op.walkouts || 0);
        (op.areas || []).forEach((oa, k) => {
          const a = sp.areas[k];
          if (!a || !oa) return;
          a.built = !!oa.built;
          a.buildPaid = Math.max(0, +oa.buildPaid || 0);
        });
      }

      /* The boutique's cubicles, its assistant, and what is hanging in each
         size. The per-size counts and the rail total are two views of one
         thing, so they are reconciled below rather than trusted. */
      const bs = s.stores[i].boutique, ob = old.boutique;
      if (bs) {
        if (ob && !fresh) {
          bs.assistant = !!ob.assistant;
          bs.sold = Math.max(0, +ob.sold || 0);
          bs.lost = Math.max(0, +ob.lost || 0);
          bs.fetched = Math.max(0, +ob.fetched || 0);
          (ob.rooms || []).forEach((orm, k) => {
            const rm = bs.rooms[k];
            if (!rm || !orm) return;
            rm.built = !!orm.built;
            rm.buildPaid = Math.max(0, +orm.buildPaid || 0);
          });
          (ob.racks || []).forEach((orr, k) => {
            if (!bs.racks[k] || !Array.isArray(orr)) return;
            bs.racks[k] = [0, 1, 2, 3].map((z) => Math.max(0, +orr[z] || 0));
          });
        }
        /* Make the sizes add up to the rail, whatever the save said. A total
           that disagrees with its own breakdown is how a rail ends up
           permanently "full" with nothing anybody can wear. */
        CFG.STORES[i].products.forEach((p, n) => {
          const ps = s.stores[i].products[n];
          if (!p.garment) { bs.racks[n] = [0, 0, 0, 0]; return; }
          const have = bs.racks[n].reduce((a, v) => a + v, 0);
          if (have === ps.shelf) return;
          const each = Math.floor(ps.shelf / 4);
          bs.racks[n] = [each, each, each, each];
          for (let k = 0; k < ps.shelf - each * 4; k++) bs.racks[n][k]++;
        });
      }

      /* The techhub's demo benches, its advisor, and its tallies. */
      const ts = s.stores[i].tech, ot = old.tech;
      if (ts && ot && !fresh) {
        ts.advisor = !!ot.advisor;
        ts.sold = Math.max(0, +ot.sold || 0);
        ts.lost = Math.max(0, +ot.lost || 0);
        ts.advised = Math.max(0, +ot.advised || 0);
        ts.compared = Math.max(0, +ot.compared || 0);
        (ot.areas || []).forEach((oa, k) => {
          const a = ts.areas[k];
          if (!a || !oa) return;
          a.built = !!oa.built;
          a.buildPaid = Math.max(0, +oa.buildPaid || 0);
        });
      }

      /* Fast food's stations and its two hires. */
      const fs = s.stores[i].food, of = old.food;
      if (fs && of && !fresh) {
        fs.cook = !!of.cook;
        fs.packer = !!of.packer;
        fs.sold = Math.max(0, +of.sold || 0);
        fs.walkouts = Math.max(0, +of.walkouts || 0);
        fs.trays = Math.max(0, +of.trays || 0);
        (of.stations || []).forEach((os, k) => {
          const st = fs.stations[k];
          if (!st || !os) return;
          st.built = !!os.built;
          st.buildPaid = Math.max(0, +os.buildPaid || 0);
          st.level = Math.max(1, +os.level || 1);
          st.pay = Math.max(0, +os.pay || 0);
        });
      }

      const cs = s.stores[i].cafe, oc = old.cafe;
      if (!cs || !oc || fresh) return;
      cs.barista = !!oc.barista;
      cs.chef = !!oc.chef;
      cs.server = !!oc.server;
      cs.cleaner = !!oc.cleaner;
      cs.tips = Math.max(0, +oc.tips || 0);
      cs.walkouts = Math.max(0, +oc.walkouts || 0);
      (oc.machines || []).forEach((om, k) => {
        const m = cs.machines[k];
        if (!m || !om) return;
        m.built = !!om.built;
        m.buildPaid = Math.max(0, +om.buildPaid || 0);
        m.level = Math.max(1, +om.level || 1);
        m.pay = Math.max(0, +om.pay || 0);
      });
      (oc.tables || []).forEach((ot, k) => {
        const t = cs.tables[k];
        if (!t || !ot) return;
        t.built = !!ot.built;
        t.buildPaid = Math.max(0, +ot.buildPaid || 0);
        t.dirty = !!ot.dirty;
      });
      /* Drinks already made and standing on the pickup counter. Each is
         {n, t}: which drink, and how long it has been sitting there. */
      cs.ready = (oc.ready || [])
        .map((r) => ({ n: +(r && r.n != null ? r.n : r), t: Math.max(0, +(r && r.t) || 0) }))
        .filter((r) => r.n >= 0 && r.n < s.stores[i].products.length)
        .slice(0, CFG.CAFE.READY_CAP);
    });
    if (!s.stores[s.current].owned) s.current = 0;
    MSM.state = s;

    const elapsed = Math.max(0, (Date.now() - s.lastSeen) / 1000);
    const capped = Math.min(elapsed, CFG.OFFLINE_CAP_H * 3600);
    if (capped < 60) return null;

    const earned = E.idleRate() * capped * CFG.OFFLINE_RATE;
    if (earned <= 0) return null;
    MSM.state.cash += earned;
    MSM.state.totalEarned += earned;
    return { seconds: capped, cash: earned };
  };
})();
