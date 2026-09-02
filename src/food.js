/* Stage 3 — fast food.

   The cafe taught you to make a thing after somebody asks for it. This
   stage teaches BOTTLENECKS, and it does it with one rule: a meal is three
   things cooked in three different places, and the tray does not go out
   until the slowest of them is done.

     they queue at the counter   ->  you take the order AND the money
     the ticket splits three ways -> 🍔 grill  🍟 fryer  🥤 drinks
     each station cooks its part  ->  in parallel, at its own pace
     every part up                ->  the tray gets built at assembly
     the tray lands on pickup     ->  they collect it and go

     🍔 ✓   🥤 ✓   🍟 ✗   ->  the whole order is still waiting

   So the shop runs at the speed of its worst station, never its best, and
   the job is to see which one that is and pay to relieve it. The line bins
   are the other half: a station with no raw stock in front of it cannot
   start at all, however fast it is.

   Only this file knows any of that. The rest of the game asks
   `store.mode === 'food'` and hands over. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, W = MSM.world, P = MSM.CFG.PLAN, F = MSM.CFG.FOOD;

  const K = MSM.food = {
    tickets: [],       // orders taken and not yet handed over
    jobs: [],          // per station, the parts on the go: [{n, tk, t, dur}]
    trays: [],         // finished trays waiting on the pickup counter
    crew: [],          // the line cook and the packer
    orderT: 0,
    buildT: 0,         // progress on the tray currently being assembled
    seq: 1,            // ticket numbers, because a counter shouts numbers

    active: () => MSM.econ.store().mode === 'food',

    reset() {
      K.tickets.length = 0;
      K.jobs.length = 0;
      K.trays.length = 0;
      K.crew.length = 0;
      K.orderT = 0;
      K.buildT = 0;
      K.seq = 1;
      if (K.active()) K.syncCrew();
    },

    /* ------------------------------------------------------------ crew */
    /* Two jobs, and they sit either side of the bottleneck: the cook feeds
       the stations, the packer clears what they produce. */
    syncCrew() {
      const fs = MSM.econ.fstate();
      K.crew.length = 0;
      if (!fs) return;
      const mk = (job, color, x, y) => ({
        job, color, x, y,
        hold: [], carry: 0, carryP: -1, only: -1,
        walk: 0, moving: false, handle: 0, t: 0,
      });
      if (fs.cook) K.crew.push(mk('cook', '#E8552F', P.machines[0].box.x1 + 0.6, P.machines[0].box.y1 + 0.7));
      if (fs.packer) K.crew.push(mk('packer', '#2F8FE8', P.assembly.x1 + 0.8, P.assembly.y1 + 0.6));
    },

    /* --------------------------------------------------------- ordering */
    /** A wait spot nobody has claimed, or -1 when the lobby is full. */
    freeSpot() {
      const used = MSM.ent.customers.map((c) => c.spotIndex);
      for (let i = 0; i < P.waits.length; i++) {
        if (used.indexOf(i) < 0) return i;
      }
      return -1;
    },

    /* Stand behind the counter and the queue moves. Unlike every other shop
       in the mall they pay HERE, up front, and wait for the food after —
       which is why the queue clears fast and the lobby fills up instead. */
    takeOrders(dt) {
      const ss = MSM.econ.sstate();
      const q = MSM.ent.queue, front = q[0];
      if (!ss.till || !front || front.phase !== 'queue') { K.orderT = 0; return; }

      const at = W.atPoint(MSM.ent.player, P.serve, 1.05);
      if (!at && !ss.cashier) { K.orderT = 0; return; }

      const spot = K.freeSpot();
      if (spot < 0) { K.orderT = 0; return; }        // nowhere left to wait

      K.orderT += dt * (at && ss.cashier ? 1.7 : 1);
      if (K.orderT < F.ORDER_TIME) return;
      K.orderT = 0;

      q.shift();
      const tk = {
        no: K.seq++,
        cust: front,
        parts: front.items.map((it) => ({ n: it.n, cooking: false, done: false })),
        built: false,
      };
      K.tickets.push(tk);
      front.ticket = tk;
      front.spotIndex = spot;
      front.phase = 'toWait';
      front.mood = 'wait';

      // paid at the counter, before a thing is cooked
      const total = front.items.reduce((a, it) => a + MSM.econ.price(it.n), 0);
      front.total = total;
      front.got = front.items.length;
      MSM.state.served++;
      MSM.econ.fstate().sold++;
      MSM.ent.dropCash(total, P.serve.x, P.serve.y + 0.6);
      MSM.render.pop(front.x, front.y, 1.7, '#' + tk.no, '#4FB0FF');
    },

    /** Drop a ticket — they gave up, or the lobby turned them away. */
    cancel(c) {
      for (let i = K.tickets.length - 1; i >= 0; i--) {
        if (K.tickets[i].cust === c) K.tickets.splice(i, 1);
      }
      for (let s = 0; s < K.jobs.length; s++) {
        const list = K.jobs[s] || [];
        for (let j = list.length - 1; j >= 0; j--) {
          if (list[j].tk && list[j].tk.cust === c) list.splice(j, 1);
        }
      }
      for (let i = K.trays.length - 1; i >= 0; i--) {
        if (K.trays[i].cust === c) K.trays.splice(i, 1);
      }
      c.ticket = null;
    },

    /* --------------------------------------------------------- stations */
    /** The next uncooked part this station could start right now. */
    nextPart(mi) {
      for (const tk of K.tickets) {
        for (const part of tk.parts) {
          if (part.done || part.cooking) continue;
          if (MSM.econ.prod(part.n).machineIndex !== mi) continue;
          if (MSM.econ.pstate(part.n).shelf <= 0) continue;    // no raw stock
          return { tk, part };
        }
      }
      return null;
    },

    /** How much work is stacked on a station — the bottleneck read. */
    load(mi) {
      let n = (K.jobs[mi] || []).length;
      K.tickets.forEach((tk) => tk.parts.forEach((p) => {
        if (!p.done && !p.cooking && MSM.econ.prod(p.n).machineIndex === mi) n++;
      }));
      return n;
    },

    stations(dt) {
      const fs = MSM.econ.fstate();
      const player = MSM.ent.player;

      P.machines.forEach((spec, mi) => {
        const st = fs.stations[mi];
        const jobs = K.jobs[mi] || (K.jobs[mi] = []);
        if (!st.built) { jobs.length = 0; return; }

        const cx = (spec.box.x0 + spec.box.x1) / 2, cy = spec.box.y0 + 0.2;

        for (let j = jobs.length - 1; j >= 0; j--) {
          const job = jobs[j];
          job.t += dt;
          if (job.t < job.dur) continue;
          jobs.splice(j, 1);
          job.part.cooking = false;
          job.part.done = true;
          MSM.render.pop(cx, cy, 1.7, MSM.econ.prod(job.n).glyph + ' ✓', '#2CA85C');
        }

        const info = MSM.econ.station(mi);
        if (jobs.length >= info.cap) return;
        // somebody has to be on the line — you, or the cook you hired
        if (!fs.cook && !W.atBox(player, spec.box)) return;

        const next = K.nextPart(mi);
        if (!next) return;
        MSM.econ.pstate(next.part.n).shelf--;      // raw stock off the line bin
        next.part.cooking = true;
        jobs.push({ n: next.part.n, tk: next.tk, part: next.part,
                    t: 0, dur: MSM.econ.cookTime(next.part.n) });
      });
    },

    /* -------------------------------------------------------- assembly */
    /** The first ticket whose every part is up and is not a tray yet. */
    nextTray() {
      return K.tickets.find((tk) => !tk.built && tk.parts.every((p) => p.done)) || null;
    },

    /* Building the tray is its own little job, and its own little queue: a
       kitchen that cooks faster than it can plate is still slow. */
    assemble(dt) {
      const fs = MSM.econ.fstate();
      if (K.trays.length >= F.TRAY_CAP) { K.buildT = 0; return; }
      const tk = K.nextTray();
      if (!tk) { K.buildT = 0; return; }

      const at = W.atBox(MSM.ent.player, P.assembly);
      if (!fs.packer && !at) { K.buildT = 0; return; }

      K.buildT += dt * (at && fs.packer ? 1.6 : 1);
      if (K.buildT < F.ASSEMBLE_TIME) return;
      K.buildT = 0;

      tk.built = true;
      K.tickets.splice(K.tickets.indexOf(tk), 1);
      K.trays.push({ no: tk.no, cust: tk.cust, items: tk.parts.map((p) => p.n) });
      fs.trays++;
      const c = (P.pickup.x0 + P.pickup.x1) / 2;
      MSM.render.pop(c, P.pickup.y0 + 0.2, 1.6, '🍽️ #' + tk.no, '#FFC53D');

      // called to the counter
      const cust = tk.cust;
      if (cust && !cust.served && cust.phase === 'wait') cust.phase = 'toPickup';
    },

    /** The tray waiting for this customer, if it is up. */
    trayFor(c) {
      return K.trays.find((t) => t.cust === c) || null;
    },

    /* ------------------------------------------------------ build plots */
    drain(paid, cost, seconds, dt) {
      const rate = Math.max(cost / seconds, 60);
      const pay = Math.min(rate * dt, cost - paid, MSM.state.cash);
      if (pay <= 0) return 0;
      MSM.state.cash -= pay;
      return pay;
    },

    plots(dt) {
      const fs = MSM.econ.fstate();
      const p = MSM.ent.player;

      P.machines.forEach((spec, mi) => {
        const st = fs.stations[mi];
        if (!st.built) {
          if (U.boxDist(p.x, p.y, spec.box) > 0.05) return;
          st.buildPaid += K.drain(st.buildPaid, spec.cost, 2.5, dt);
          if (st.buildPaid < spec.cost) return;
          st.built = true;
          st.buildPaid = 0;
          MSM.world.invalidate();
          p.x = (spec.box.x0 + spec.box.x1) / 2;
          p.y = spec.box.y1 + 0.7;
          p.vx = 0; p.vy = 0;
          MSM.render.pop(p.x, p.y, 1.3, '✨', '#2CA85C');
          MSM.ui.toast(MSM.t('food.stationBuilt', { label: spec.label }));
          MSM.save();
          return;
        }
        if (U.boxDist(p.x, p.y, spec.pad) > 0.05) return;
        const cost = MSM.econ.stationCost(mi);
        st.pay += K.drain(st.pay, cost, 2.5, dt);
        if (st.pay < cost) return;
        st.pay = 0;
        st.level++;
        MSM.render.pop(p.x, p.y, 1.2, spec.label + ' ' + MSM.t('lv', { n: st.level }), '#2CA85C');
      });
    },

    /* --------------------------------------------------------- the tick */
    update(dt) {
      const fs = MSM.econ.fstate();
      if (!fs) return;
      if (K.crew.length !== (fs.cook + fs.packer)) K.syncCrew();

      K.takeOrders(dt);
      K.stations(dt);
      K.assemble(dt);
      K.plots(dt);
      K.crew.forEach((s) => K.stepCrew(s, dt));
    },

    stepCrew(s, dt) {
      const spd = CFG.STAFF_SPEED;
      const fs = MSM.econ.fstate();

      if (s.job === 'cook') {
        /* Work whichever station has most stacked up. The stations already
           run themselves once a cook is hired — this is so the shop LOOKS
           like its bottleneck, and you can see where the pressure is. */
        let best = -1, work = -1;
        P.machines.forEach((spec, mi) => {
          if (!fs.stations[mi].built) return;
          const n = K.load(mi);
          if (n > work) { work = n; best = mi; }
        });
        const spec = best >= 0 ? P.machines[best] : P.machines[0];
        const b = spec.box;
        W.seek(s, (b.x0 + b.x1) / 2, b.y1 + 0.6, spd, dt, false);
        return;
      }

      // the packer lives at the assembly bench
      const a = P.assembly;
      W.seek(s, (a.x0 + a.x1) / 2 + 1.1, a.y1 + 0.55, spd, dt, false);
    },

    /* -------------------------------------------------------- customers */
    spawn() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      if (MSM.ent.queue.length >= P.queue.length) return;
      const open = store.products.filter((p) =>
        ss.products[p.index].built && ss.food.stations[p.machineIndex].built);
      if (!open.length) return;

      const pick = (role) => {
        const list = open.filter((p) => p.role === role);
        return list.length ? list[(Math.random() * list.length) | 0].index : -1;
      };

      /* A meal is a main, a side and a drink — which is exactly why every
         order touches all three stations. Sometimes they just want the one
         thing, and those are the orders that fly through. */
      const items = [];
      const main = pick('main');
      if (main >= 0) items.push({ n: main, got: false });
      if (Math.random() < F.COMBO_ODDS) {
        [pick('side'), pick('drink')].forEach((n) => {
          if (n >= 0) items.push({ n, got: false });
        });
      }
      if (!items.length) {
        const any = open[(Math.random() * open.length) | 0].index;
        items.push({ n: any, got: false });
      }

      MSM.ent.customers.push({
        items, want: items[0].n,
        wantQty: 1, wantGot: 0, list: [], total: 0, got: 0,
        color: ['#FF7BA6', '#4FB0FF', '#8B62FF', '#FF9E4D', '#2FCB9E', '#FF5C5C'][(Math.random() * 6) | 0],
        shade: ['#F2F5FA', '#E9EEF6', '#F6F0E6', '#EDF3EC'][(Math.random() * 4) | 0],
        x: P.entrance.x + (Math.random() - 0.5) * 0.8, y: P.entrance.y,
        lane: P.queue[0].x,
        phase: 'in', carry: 0, carryP: -1,
        wait: 0, walk: 0, moving: true, mood: 'want',
        patience: 1, queueT: 0, served: false,
        ticket: null, spotIndex: -1,
      });
    },

    stepCustomer(c, k, dt) {
      const spd = CFG.CUSTOMER_SPEED;

      /* Patience runs in the queue past the grace period, and the whole time
         they are stood in the lobby holding a ticket. Waiting for a tray IS
         the complaint this stage is about. */
      const impatient = c.phase === 'toWait' || c.phase === 'wait' ||
        (c.phase === 'queue' && c.queueT > F.QUEUE_GRACE);
      if (impatient) {
        c.patience -= dt / F.PATIENCE;
        if (c.patience <= 0) { K.walkout(c); return; }
      }

      switch (c.phase) {
        case 'in':
          if (W.seek(c, P.queue[0].x, P.walkway, spd, dt, false)) c.phase = 'toQueue';
          break;

        case 'toQueue': {
          if (MSM.ent.queue.indexOf(c) < 0) {
            if (MSM.ent.queue.length >= P.queue.length) { K.walkout(c); break; }
            MSM.ent.queue.push(c);
          }
          const slot = P.queue[Math.max(0, MSM.ent.queue.indexOf(c))];
          if (W.seek(c, slot.x, slot.y, spd, dt, false)) c.phase = 'queue';
          break;
        }

        case 'queue': {
          const slot = P.queue[Math.max(0, MSM.ent.queue.indexOf(c))];
          W.seek(c, slot.x, slot.y, spd, dt, false);
          c.queueT += dt;
          break;
        }

        case 'toWait': {
          const s = P.waits[c.spotIndex] || P.waits[0];
          if (W.seek(c, s.x, s.y, spd, dt, false)) c.phase = 'wait';
          break;
        }

        /* Holding a number, watching the kitchen. If their tray got built
           while they were walking over, they are called straight away. */
        case 'wait':
          c.moving = false;
          c.mood = 'wait';
          if (K.trayFor(c)) c.phase = 'toPickup';
          break;

        case 'toPickup': {
          const t = K.trayFor(c);
          if (!t) { c.phase = 'wait'; break; }
          if (!W.seek(c, P.pickupStand.x + (k % 3 - 1) * 0.7, P.pickupStand.y, spd, dt, false)) break;
          K.handOver(c, t);
          break;
        }

        case 'leave':
          if (W.seek(c, P.entrance.x, P.entrance.y + 0.6, spd, dt, false)) {
            K.forget(c);
            MSM.ent.customers.splice(k, 1);
          }
          break;
      }
    },

    /* The tray goes over the counter. They already paid at the till.
       NOT called `collect` — every stage's render module owns that name for
       its painter list, and this file's twin would be clobbered by it. */
    handOver(c, tray) {
      K.trays.splice(K.trays.indexOf(tray), 1);
      c.served = true;
      c.mood = 'happy';
      c.carry = tray.items.length;
      c.carryP = tray.items[0];
      c.spotIndex = -1;
      c.ticket = null;
      c.phase = 'leave';
      MSM.render.pop(c.x, c.y, 1.9, '🍽️ 😊', '#2CA85C');
    },

    /**
     * Out of patience: in the queue, or in the lobby with a ticket.
     *
     * They paid at the counter, before a thing was cooked — so giving up on
     * a tray you never produced hands the money straight back. Without this
     * a jammed kitchen is FREE money, and the whole bottleneck stops
     * mattering the moment you stop caring about the queue.
     */
    walkout(c) {
      const paid = c.ticket ? (c.total || 0) : 0;
      K.forget(c);
      MSM.econ.fstate().walkouts++;
      if (paid > 0) {
        MSM.state.cash = Math.max(0, MSM.state.cash - paid);
        MSM.state.totalEarned = Math.max(0, MSM.state.totalEarned - paid);
        MSM.render.pop(c.x, c.y, 2.1, '-$' + U.money(paid), '#E0553F');
      }
      c.total = 0;
      c.got = 0;
      c.mood = 'angry';
      c.phase = 'leave';
      c.patience = 0;
      MSM.render.pop(c.x, c.y, 1.5, '😡', '#E0553F');
    },

    forget(c) {
      const q = MSM.ent.queue.indexOf(c);
      if (q >= 0) MSM.ent.queue.splice(q, 1);
      K.cancel(c);
      c.spotIndex = -1;
    },

    /** The one-line hint the HUD shows while you are learning the shop. */
    guide() {
      const ss = MSM.econ.sstate(), fs = ss.food;
      if (!ss.till) return MSM.t('food.gCounter');
      if (!ss.open) return MSM.t('food.gOpen');

      // a station with tickets waiting and an empty bin is the loudest problem
      const dry = MSM.econ.store().products.find((p) =>
        ss.products[p.index].built && ss.products[p.index].shelf <= 0 &&
        K.tickets.some((tk) => tk.parts.some((q) => !q.done && q.n === p.index)));
      if (dry) return MSM.t('food.gStock', { name: dry.name });

      if (K.nextTray()) return MSM.t('food.gAssemble');
      if (K.trays.length) return MSM.t('food.gPickup');

      // otherwise name the station holding everything else up
      let worst = -1, load = 1;
      P.machines.forEach((spec, mi) => {
        if (!fs.stations[mi].built) return;
        const n = K.load(mi);
        if (n > load) { load = n; worst = mi; }
      });
      if (worst >= 0) return MSM.t('food.gBottleneck', { label: P.machines[worst].label });
      if (fs.stations.some((s) => !s.built)) return MSM.t('food.gStation');
      return '';
    },
  };
})();
