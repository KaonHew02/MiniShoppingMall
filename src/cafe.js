/* Stage 2 — the coffee shop.

   The mini mart is a stocking game: you put things on a shelf and the
   customer takes one. A cafe is a SERVICE game, and that is the whole point
   of the stage. Nothing is ready in advance:

     they queue at the counter  ->  you take the order      (a ticket)
     you tip beans and milk into the storage by the bar
     you stand at the machine   ->  it brews their drink    (a few seconds)
     the drink lands on the pickup counter
     you carry it over          ->  they pay, and tip
     they sit down, drink it, leave a dirty table behind
     you (or a cleaner) wipe it

   Everything physical: the machines, the extra tables and every recipe on
   the menu board are build plots you walk onto and pay for, exactly like the
   mini mart's crop beds.

   Only this file knows any of that. The rest of the game asks
   `store.mode === 'cafe'` and hands over. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, W = MSM.world, P = MSM.CFG.PLAN, C = MSM.CFG.CAFE;

  const K = MSM.cafe = {
    orders: [],        // tickets waiting to be made: {n, cust}, one per item
    jobs: [],          // per machine, the cups on the go: [{n, t, dur}]
    crew: [],          // the barista, the chef, the server and the cleaner
    orderT: 0,
    cleanT: 0,

    active: () => MSM.econ.store().mode === 'cafe',

    /** Called whenever the floor is rebuilt — a new store, or a reset. */
    reset() {
      K.orders.length = 0;
      K.jobs.length = 0;
      K.orderT = 0;
      K.cleanT = 0;
      K.crew.length = 0;
      if (K.active()) K.syncCrew();
    },

    /* ------------------------------------------------------------ crew */
    /* Four jobs the mini mart never had. Each is one body with one idea in
       its head, which is enough — they only ever do the thing they were
       hired for. The barista and the chef are the same routine pointed at
       different machines: drinks are the bar's, food is the kitchen's. */
    syncCrew() {
      const cs = MSM.econ.cstate();
      K.crew.length = 0;
      if (!cs) return;
      const mk = (job, color) => ({
        job, color,
        x: P.serve.x + (Math.random() - 0.5), y: P.serve.y - 0.9,
        hold: [], carry: 0, carryP: -1, only: -1,
        walk: 0, moving: false, handle: 0, t: 0, target: -1,
      });
      if (cs.barista) K.crew.push(mk('barista', '#C0632B'));
      if (cs.chef)    K.crew.push(mk('chef',    '#EDEFF4'));
      if (cs.server)  K.crew.push(mk('server',  '#2B8FC0'));
      if (cs.cleaner) K.crew.push(mk('cleaner', '#7C4FC0'));
    },

    /* ----------------------------------------------------------- tickets */
    /** A wait spot nobody has claimed, or null when the room is full. */
    freeSpot() {
      const used = MSM.ent.customers.map((c) => c.spotIndex);
      for (let i = 0; i < P.waits.length; i++) {
        if (used.indexOf(i) < 0) return i;
      }
      return -1;
    },

    /* Stand behind the counter and the queue is taken one at a time. A
       cashier does it without you, and faster with you there. */
    takeOrders(dt) {
      const ss = MSM.econ.sstate();
      const q = MSM.ent.queue, front = q[0];
      if (!ss.till || !front || front.phase !== 'queue') { K.orderT = 0; return; }

      const at = W.atPoint(MSM.ent.player, P.serve, 1.05);
      if (!at && !ss.cashier) { K.orderT = 0; return; }

      const spot = K.freeSpot();
      if (spot < 0) { K.orderT = 0; return; }        // nowhere for them to wait

      K.orderT += dt * (at && ss.cashier ? 1.7 : 1);
      if (K.orderT < C.ORDER_TIME) return;
      K.orderT = 0;

      q.shift();
      /* The doc's diagram, in one line: the ticket splits into one job per
         item, and each job finds its own machine — latte to the barista,
         cake to the chef. */
      front.items.forEach((it) => K.orders.push({ n: it.n, cust: front }));
      front.spotIndex = spot;
      front.phase = 'toWait';
      front.mood = 'wait';
      MSM.render.pop(front.x, front.y, 1.6,
        front.items.map((it) => MSM.econ.prod(it.n).glyph).join(' '), '#4FB0FF');
    },

    /** Drop every ticket — they gave up, or walked out of a full room. */
    cancel(c) {
      for (let i = K.orders.length - 1; i >= 0; i--) {
        if (K.orders[i].cust === c) K.orders.splice(i, 1);
      }
    },

    /* ---------------------------------------------------------- machines */
    /** The first ticket this machine can actually start right now. */
    nextOrder(mi) {
      for (const o of K.orders) {
        const prod = MSM.econ.prod(o.n);
        if (prod.machineIndex !== mi) continue;
        if (!K.stocked(o.n)) continue;
        return o;
      }
      return null;
    },

    stocked(n) {
      const ss = MSM.econ.sstate();
      return MSM.econ.prod(n).needs.every((r) => ss.products[r.n].shelf >= r.qty);
    },

    consume(n) {
      const ss = MSM.econ.sstate();
      if (!K.stocked(n)) return false;
      MSM.econ.prod(n).needs.forEach((r) => { ss.products[r.n].shelf -= r.qty; });
      return true;
    },

    machines(dt) {
      const ss = MSM.econ.sstate(), cs = ss.cafe;
      const player = MSM.ent.player;

      P.machines.forEach((spec, mi) => {
        const ms = cs.machines[mi];
        const jobs = K.jobs[mi] || (K.jobs[mi] = []);
        if (!ms.built) { jobs.length = 0; return; }

        const cx = (spec.box.x0 + spec.box.x1) / 2, cy = spec.box.y0 + 0.2;

        for (let j = jobs.length - 1; j >= 0; j--) {
          const job = jobs[j];
          job.t += dt;
          if (job.t < job.dur) continue;
          jobs.splice(j, 1);
          if (cs.ready.length >= C.READY_CAP) continue;    // counter is full
          cs.ready.push({ n: job.n, t: 0 });
          MSM.render.pop(cx, cy, 1.7, MSM.econ.prod(job.n).glyph + ' ' + MSM.t('cafe.ready'), '#2CA85C');
        }

        const info = MSM.econ.machine(mi);
        if (jobs.length >= info.cap || cs.ready.length >= C.READY_CAP) return;
        // somebody has to be working it — you, or whoever's station it is:
        // the barista for the drink machines, the chef for the oven
        if (!cs[spec.staff] && !W.atBox(player, spec.box)) return;

        const order = K.nextOrder(mi);
        if (!order || !K.consume(order.n)) return;
        K.orders.splice(K.orders.indexOf(order), 1);
        jobs.push({ n: order.n, t: 0, dur: MSM.econ.brewTime(order.n) });
      });
    },

    /* A drink nobody is waiting for goes cold. Without this an abandoned
       order sits on the counter forever and eventually blocks the machines. */
    ageReady(dt) {
      const cs = MSM.econ.cstate();
      for (let k = cs.ready.length - 1; k >= 0; k--) {
        const r = cs.ready[k];
        if (K.wanting(r.n)) { r.t = 0; continue; }
        r.t += dt;
        if (r.t < 30) continue;
        cs.ready.splice(k, 1);
        MSM.render.pop(P.pickupStand.x, P.pickupStand.y, 1.2, MSM.t('cafe.cold'), '#98A6C4');
      }
    },

    /** Is anybody still waiting for this item, or is one on order? */
    wanting(n) {
      if (K.orders.some((o) => o.n === n)) return true;
      return MSM.ent.customers.some((c) => !c.served && c.items &&
        c.items.some((it) => !it.got && it.n === n) &&
        (c.phase === 'wait' || c.phase === 'toWait' || c.phase === 'queue' ||
         c.phase === 'toQueue' || c.phase === 'in'));
    },

    /* ------------------------------------------------- picking up, serving */
    /**
     * The auto-use rule for a cafe body. Runs before the generic one, and
     * returns true when it did something so the shop rules stand down.
     */
    handle(body) {
      const cs = MSM.econ.cstate();
      if (!cs) return false;

      // hand an item to somebody standing there still owed exactly that
      if (body.hold.length) {
        for (const c of MSM.ent.customers) {
          if (c.served || !c.items) continue;
          if (c.phase !== 'wait' && c.phase !== 'toWait') continue;
          if (Math.hypot(body.x - c.x, body.y - c.y) > C.SERVE_REACH) continue;
          const it = c.items.find((o) => !o.got && body.hold.indexOf(o.n) >= 0);
          if (!it) continue;
          K.give(body, c, it);
          return true;
        }
      }

      // take a finished drink off the pickup counter — but only one that
      // somebody actually ordered, or your arms fill up with cold coffee
      if (cs.ready.length && body.hold.length < CFG.CARRY_CAP && W.atBox(body, P.pickup)) {
        const k = cs.ready.findIndex((r) => K.waiter(r.n));
        if (k >= 0) {
          body.hold.push(cs.ready[k].n);
          cs.ready.splice(k, 1);
          MSM.ent.sync(body);
          return true;
        }
      }
      return false;
    },

    /**
     * Is somebody still owed this item that nobody is already on the
     * way to with? Without the second half you pick up four lattes for one
     * customer and the rest of the counter goes cold in your arms.
     */
    waiter(n) {
      const carried = {};
      const count = (b) => b.hold.forEach((h) => { carried[h] = (carried[h] || 0) + 1; });
      count(MSM.ent.player);
      K.crew.forEach(count);
      let need = 0;
      MSM.ent.customers.forEach((c) => {
        if (c.served || !c.items) return;
        if (c.phase !== 'wait' && c.phase !== 'toWait') return;
        c.items.forEach((it) => { if (!it.got && it.n === n) need++; });
      });
      return need > (carried[n] || 0);
    },

    /* Hand one item over. Payment is automatic — a cafe does not need a
       second queue at a till — but it waits for the LAST item: a
       latte-and-cake ticket pays once, like a real bill. The tip on top is
       where the stage's whole balance sits: served fast, in a clean room,
       on a good machine. */
    give(body, c, it) {
      const cs = MSM.econ.cstate();
      MSM.ent.takeOne(body, it.n);
      it.got = true;
      c.carry = c.items.filter((o) => o.got).length;
      c.carryP = it.n;

      if (c.items.some((o) => !o.got)) {
        MSM.render.pop(c.x, c.y, 1.5, MSM.econ.prod(it.n).glyph + ' ✓', '#2CA85C');
        return;
      }

      const total = c.items.reduce((a, o) => a + MSM.econ.price(o.n), 0);
      const tip = Math.round(total * C.TIP_MAX * U.clamp(c.patience, 0, 1) * MSM.econ.clean());
      cs.tips += tip;
      MSM.state.served++;
      MSM.ent.dropCash(total + tip, c.x, c.y - 0.35);
      if (tip > 0) MSM.render.pop(c.x, c.y, 1.9, MSM.t('cafe.tip', { n: '$' + U.money(tip) }), '#FFB020');

      c.served = true;
      c.mood = 'happy';
      c.spotIndex = -1;
      c.phase = K.claimSeat(c) ? 'toTable' : 'leave';
    },

    /* ------------------------------------------------------------ seating */
    claimSeat(c) {
      const cs = MSM.econ.cstate();
      const taken = {};
      MSM.ent.customers.forEach((o) => { if (o.table >= 0) taken[o.table + ':' + o.seat] = 1; });
      for (let ti = 0; ti < P.tables.length; ti++) {
        const t = cs.tables[ti];
        if (!t.built || t.dirty) continue;
        for (let si = 0; si < 2; si++) {
          if (taken[ti + ':' + si]) continue;
          c.table = ti; c.seat = si;
          return true;
        }
      }
      return false;
    },

    seatPoint(c) {
      const b = P.tables[c.table].box;
      return { x: c.seat ? b.x1 + 0.62 : b.x0 - 0.62, y: (b.y0 + b.y1) / 2 };
    },

    /** They get up, and the cup and plate stay behind. */
    leaveSeat(c) {
      if (c.table < 0) return;
      MSM.econ.cstate().tables[c.table].dirty = true;
      c.table = -1;
      c.seat = -1;
    },

    /* Wipe a table down. The player does it by standing next to one; the
       cleaner does it by walking to whichever is nearest. */
    wipe(body, dt, hold) {
      const cs = MSM.econ.cstate();
      let ti = -1;
      cs.tables.forEach((t, k) => {
        if (ti >= 0 || !t.built || !t.dirty) return;
        if (U.boxDist(body.x, body.y, P.tables[k].box) > CFG.REACH) return;
        ti = k;
      });
      if (ti < 0) return -1;
      body[hold] = (body[hold] || 0) + dt;
      if (body[hold] < C.CLEAN_TIME) return ti;
      body[hold] = 0;
      cs.tables[ti].dirty = false;
      const b = P.tables[ti].box;
      MSM.render.pop((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 1.1, '✨', '#2CA85C');
      return -1;
    },

    /* ------------------------------------------------------- build plots */
    /* Every fixture in the shop is bought by standing on its plot and
       letting your cash drain in — the same feel as the mini mart's beds. */
    drain(paid, cost, seconds, dt) {
      const rate = Math.max(cost / seconds, 60);
      const pay = Math.min(rate * dt, cost - paid, MSM.state.cash);
      if (pay <= 0) return 0;
      MSM.state.cash -= pay;
      return pay;
    },

    plots(dt) {
      const cs = MSM.econ.cstate();
      const p = MSM.ent.player;

      P.machines.forEach((spec, mi) => {
        const ms = cs.machines[mi];
        if (!ms.built) {
          if (U.boxDist(p.x, p.y, spec.box) > 0.05) return;
          ms.buildPaid += K.drain(ms.buildPaid, spec.cost, 2.5, dt);
          if (ms.buildPaid < spec.cost) return;
          ms.built = true;
          ms.buildPaid = 0;
          MSM.world.invalidate();
          p.x = (spec.box.x0 + spec.box.x1) / 2;
          p.y = spec.box.y1 + 0.7;
          p.vx = 0; p.vy = 0;
          MSM.render.pop(p.x, p.y, 1.3, '✨', '#2CA85C');
          MSM.ui.toast(MSM.t('cafe.machineBuilt', { label: spec.label }));
          MSM.save();
          return;
        }
        if (U.boxDist(p.x, p.y, spec.pad) > 0.05) return;
        const cost = MSM.econ.machineCost(mi);
        ms.pay += K.drain(ms.pay, cost, 2.5, dt);
        if (ms.pay < cost) return;
        ms.pay = 0;
        ms.level++;
        MSM.render.pop(p.x, p.y, 1.2, spec.label + ' ' + MSM.t('lv', { n: ms.level }), '#2CA85C');
      });

      P.tables.forEach((spec, ti) => {
        const ts = cs.tables[ti];
        if (ts.built || U.boxDist(p.x, p.y, spec.box) > 0.05) return;
        ts.buildPaid += K.drain(ts.buildPaid, spec.cost, 2.0, dt);
        if (ts.buildPaid < spec.cost) return;
        ts.built = true;
        ts.buildPaid = 0;
        MSM.world.invalidate();
        p.x = spec.box.x0 - 0.7;
        p.y = (spec.box.y0 + spec.box.y1) / 2;
        p.vx = 0; p.vy = 0;
        MSM.render.pop(p.x, p.y, 1.3, '🪑', '#2CA85C');
        MSM.ui.toast(MSM.t('cafe.tableBuilt'));
        MSM.save();
      });
    },

    /* --------------------------------------------------------- the tick */
    update(dt) {
      const cs = MSM.econ.cstate();
      if (!cs) return;
      if (K.crew.length !== (cs.barista + cs.chef + cs.server + cs.cleaner)) K.syncCrew();

      K.takeOrders(dt);
      K.machines(dt);
      K.ageReady(dt);
      K.plots(dt);
      K.wipe(MSM.ent.player, dt, 'wipeT');
      K.crew.forEach((s) => K.stepCrew(s, dt));
    },

    stepCrew(s, dt) {
      const cs = MSM.econ.cstate();
      const spd = CFG.STAFF_SPEED;

      if (s.job === 'cleaner') {
        let best = -1, bd = 1e9;
        cs.tables.forEach((t, k) => {
          if (!t.built || !t.dirty) return;
          const b = P.tables[k].box;
          const d = U.boxDist(s.x, s.y, b);
          if (d < bd) { bd = d; best = k; }
        });
        if (best < 0) {
          W.walk(s, P.tables[0].box.x1 + 1.4, P.tables[0].box.y1 + 0.9, spd, dt);
          return;
        }
        const b = P.tables[best].box;
        if (W.walk(s, b.x0 - 0.62, (b.y0 + b.y1) / 2, spd, dt)) {
          s.moving = false;
          K.wipe(s, dt, 'wipeT');
        }
        return;
      }

      if (s.job === 'barista' || s.job === 'chef') {
        /* Each works whichever of THEIR OWN machines has most to do — it
           looks like a barista or a chef even though the machines already
           run on their own. Neither ever touches the other's station. */
        let best = -1, work = -1;
        P.machines.forEach((spec, mi) => {
          if (spec.staff !== s.job || !cs.machines[mi].built) return;
          const n = (K.jobs[mi] || []).length +
            K.orders.filter((o) => MSM.econ.prod(o.n).machineIndex === mi).length;
          if (n > work) { work = n; best = mi; }
        });
        // hired before their station is built — wait by its plot
        const spec = best >= 0 ? P.machines[best]
          : P.machines.find((m) => m.staff === s.job) || P.machines[0];
        const b = spec.box;
        W.walk(s, (b.x0 + b.x1) / 2, b.y1 + 0.55, spd, dt);
        return;
      }

      /* The server: fetch what is ready, walk it to whoever is owed it. */
      if (s.hold.length) {
        const c = MSM.ent.customers.find((o) => !o.served && o.items &&
          (o.phase === 'wait' || o.phase === 'toWait') &&
          o.items.some((it) => !it.got && s.hold.indexOf(it.n) >= 0));
        if (!c) {
          // nobody wants it any more — put it back rather than hoard it
          if (W.atBox(s, P.pickup)) {
            const n = s.hold.pop();
            MSM.ent.sync(s);
            if (cs.ready.length < C.READY_CAP) cs.ready.push({ n, t: 0 });
          } else W.walk(s, P.pickupStand.x, P.pickupStand.y, spd, dt);
          return;
        }
        if (W.walk(s, c.x, c.y - 0.75, spd, dt)) s.moving = false;
        MSM.ent.handle(s, dt);
        return;
      }

      if (cs.ready.some((r) => K.waiter(r.n))) {
        if (W.walk(s, P.pickupStand.x, P.pickupStand.y, spd, dt)) s.moving = false;
        MSM.ent.handle(s, dt);
        return;
      }
      W.walk(s, P.pickupStand.x - 1.2, P.pickupStand.y - 0.6, spd, dt);
    },

    /* -------------------------------------------------------- customers */
    spawn() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      if (MSM.ent.queue.length >= P.queue.length) return;
      const menu = store.products.filter((p) =>
        p.drink && ss.products[p.index].built && ss.cafe.machines[p.machineIndex].built);
      if (!menu.length) return;

      /* An order is a drink, plus food once the kitchen exists: sometimes a
         cake, occasionally a cake AND a croissant. Each item is its own
         ticket, so one customer can keep both stations busy at once. */
      const drinks = menu.filter((p) => P.machines[p.machineIndex].staff !== 'chef');
      const foods  = menu.filter((p) => P.machines[p.machineIndex].staff === 'chef');
      const items = [];
      const take = (list) => {
        const open = list.filter((p) => !items.some((it) => it.n === p.index));
        if (!open.length) return;
        items.push({ n: open[(Math.random() * open.length) | 0].index, got: false });
      };
      take(drinks.length ? drinks : foods);
      C.FOOD_ODDS.forEach((odds) => { if (Math.random() < odds) take(foods); });
      if (!items.length) return;

      MSM.ent.customers.push({
        items, want: items[0].n,
        wantQty: 1, wantGot: 0, list: [], total: 0, got: 0,
        color: ['#FF7BA6', '#4FB0FF', '#8B62FF', '#FF9E4D', '#2FCB9E', '#FF5C5C'][(Math.random() * 6) | 0],
        shade: '#F2F5FA',
        x: P.entrance.x + (Math.random() - 0.5) * 0.7, y: P.entrance.y,
        lane: P.queue[0].x,
        phase: 'in', carry: 0, carryP: -1,
        wait: 0, walk: 0, moving: true, mood: 'want',
        patience: 1, queueT: 0, served: false,
        table: -1, seat: -1, sitT: 0, spotIndex: -1,
      });
      MSM.ent.enterAt(MSM.ent.customers[MSM.ent.customers.length - 1]);
    },

    stepCustomer(c, k, dt) {
      const spd = CFG.CUSTOMER_SPEED;

      /* Patience only runs while they are being made to wait — in the queue
         after a grace period, and from the moment the order is taken. */
      const impatient = (c.phase === 'toWait' || c.phase === 'wait' ||
        (c.phase === 'queue' && c.queueT > C.QUEUE_GRACE));
      if (impatient) {
        c.patience -= dt / C.PATIENCE;
        if (c.patience <= 0) { K.walkout(c); return; }
      }

      switch (c.phase) {
        case 'in':
          if (W.walk(c, P.queue[0].x, P.walkway, spd, dt)) c.phase = 'toQueue';
          break;

        case 'toQueue': {
          if (MSM.ent.queue.indexOf(c) < 0) {
            if (MSM.ent.queue.length >= P.queue.length) { K.walkout(c); break; }
            MSM.ent.queue.push(c);
          }
          const slot = P.queue[Math.max(0, MSM.ent.queue.indexOf(c))];
          if (W.walk(c, slot.x, slot.y, spd, dt)) c.phase = 'queue';
          break;
        }

        case 'queue': {
          const slot = P.queue[Math.max(0, MSM.ent.queue.indexOf(c))];
          W.walk(c, slot.x, slot.y, spd, dt);
          c.queueT += dt;
          break;
        }

        case 'toWait': {
          const s = P.waits[c.spotIndex] || P.waits[0];
          if (W.walk(c, s.x, s.y, spd, dt)) c.phase = 'wait';
          break;
        }

        case 'wait':
          c.moving = false;
          c.mood = 'wait';
          break;

        case 'toTable': {
          const seat = K.seatPoint(c);
          if (W.walk(c, seat.x, seat.y, spd, dt)) {
            c.phase = 'sit';
            c.sitT = U.lerp(C.SIT[0], C.SIT[1], Math.random());
          }
          break;
        }

        case 'sit':
          c.moving = false;
          c.sitT -= dt;
          if (c.sitT > 0) break;
          c.carry = 0;
          K.leaveSeat(c);
          c.phase = 'leave';
          break;

        case 'leave':
          if (MSM.ent.exitStep(c, dt, spd)) {
            K.forget(c);
            MSM.ent.customers.splice(k, 1);
          }
          break;
      }
    },

    /** Out of patience. The order goes with them. */
    walkout(c) {
      K.forget(c);
      MSM.econ.cstate().walkouts++;
      c.mood = 'angry';
      c.phase = 'leave';
      c.patience = 0;
      MSM.render.pop(c.x, c.y, 1.5, '😡', '#E0553F');
    },

    forget(c) {
      const q = MSM.ent.queue.indexOf(c);
      if (q >= 0) MSM.ent.queue.splice(q, 1);
      K.cancel(c);
      K.leaveSeat(c);
      c.spotIndex = -1;
    },

    /** The one-line hint the HUD shows while you are learning the shop. */
    guide() {
      const ss = MSM.econ.sstate(), cs = ss.cafe;
      if (!ss.till) return MSM.t('cafe.gCounter');
      if (!ss.open) return MSM.t('cafe.gOpen');
      const beans = MSM.econ.store().products.find((p) => p.ingredient &&
        ss.products[p.index].built && ss.products[p.index].shelf === 0 &&
        K.orders.some((o) => MSM.econ.prod(o.n).needs.some((r) => r.n === p.index)));
      if (beans) return MSM.t('cafe.gStock', { name: beans.name });
      if (cs.ready.length) return MSM.t('cafe.gPickup');
      if (K.orders.length) return MSM.t('cafe.gBrew');
      if (cs.tables.some((t) => t.built && t.dirty)) return MSM.t('cafe.gClean');
      return '';
    },
  };
})();
