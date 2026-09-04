/* Stage 3 — the sport outlet.

   Each stage so far has moved the work to a different place. The mini mart
   is a STOCKING game: fill the shelf and the customer takes one off it. The
   cafe is a SERVICE game: nothing exists until they order it. The sport
   outlet is a SELLING game — the goods are already made and already on the
   rack, and the question is whether anybody buys them:

     they come in wanting one thing   ->  they find its rack
     they take it down                ->  and carry it to the test area
     they try it                      ->  a few seconds on the court
     you talk them through it         ->  stand with them a moment
     they decide                      ->  😊 buy  😕 too dear  😞 not for me
     a no goes back on the rack, and sometimes they ask to see another

   So a sale is never automatic. Three things close it: a court to try the
   thing on, somebody advising, and a price they can live with. That is the
   whole balance of the stage, and all of it lives in this file. The rest of
   the game asks `store.mode === 'sports'` and hands over. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, W = MSM.world, P = MSM.CFG.PLAN, S = MSM.CFG.SPORTS;

  const K = MSM.sports = {
    crew: [],          // the sports advisor, when you have hired one
    hintT: 0,          // rate-limits the "there is no court for this" nudge

    active: () => MSM.econ.store().mode === 'sports',

    /** Called whenever the floor is rebuilt — a new store, or a reset. */
    reset() {
      K.crew.length = 0;
      K.hintT = 0;
      if (K.active()) K.syncCrew();
    },

    /* ------------------------------------------------------------ crew */
    /* One job the other stages never had. The advisor does not touch stock
       and does not work the till — they walk the floor and talk to whoever
       is holding something and wondering. */
    syncCrew() {
      const sp = MSM.econ.spstate();
      K.crew.length = 0;
      if (!sp || !sp.advisor) return;
      K.crew.push({
        job: 'advisor', color: '#1F9E8C',
        x: P.serve.x - 1.4, y: P.serve.y - 0.6,
        hold: [], carry: 0, carryP: -1, only: -1,
        walk: 0, moving: false, handle: 0, adviseT: 0,
      });
    },

    /* --------------------------------------------------------- advising */
    /** Is this shopper still open to being talked to? */
    advisable: (c) => !c.advised && !c.served &&
      (c.phase === 'browse' || c.phase === 'toTest' || c.phase === 'try'),

    /**
     * Stand near an undecided shopper for a moment and you have advised
     * them. Works for the player and for the hired advisor alike; returns
     * whoever is being talked to, so the advisor knows to stay put.
     */
    advise(body, dt) {
      let best = null, bd = 1e9;
      MSM.ent.customers.forEach((c) => {
        if (!K.advisable(c)) return;
        const d = Math.hypot(body.x - c.x, body.y - c.y);
        if (d <= S.ADVISE_REACH && d < bd) { bd = d; best = c; }
      });
      if (!best) { body.adviseT = 0; return null; }

      body.adviseT = (body.adviseT || 0) + dt;
      if (body.adviseT < S.ADVISE_TIME) return best;
      body.adviseT = 0;
      best.advised = true;
      MSM.render.pop(best.x, best.y, 1.9, '💬', '#4FB0FF');
      return null;
    },

    /** The nearest shopper who still wants talking to, court or no court. */
    needsAdvice() {
      let best = null, bd = 1e9;
      MSM.ent.customers.forEach((c) => {
        if (!K.advisable(c)) return;
        const d = Math.hypot(P.serve.x - c.x, P.serve.y - c.y);
        if (d < bd) { bd = d; best = c; }
      });
      return best;
    },

    /* ------------------------------------------------------ build plots */
    /* A court is bought exactly like everything else in this game: walk onto
       its plot and let your cash drain in. */
    plots(dt) {
      const sp = MSM.econ.spstate();
      const p = MSM.ent.player;

      P.areas.forEach((spec, ai) => {
        const as = sp.areas[ai];
        if (as.built || U.boxDist(p.x, p.y, spec.box) > 0.05) return;
        const rate = Math.max(spec.cost / 2.5, 60);
        const pay = Math.min(rate * dt, spec.cost - as.buildPaid, MSM.state.cash);
        if (pay <= 0) return;
        MSM.state.cash -= pay;
        as.buildPaid += pay;
        if (as.buildPaid < spec.cost) return;

        as.built = true;
        as.buildPaid = 0;
        MSM.world.invalidate();
        // you were standing on the plot — step clear of the new equipment
        p.x = spec.stand.x;
        p.y = spec.stand.y;
        p.vx = 0; p.vy = 0;
        MSM.render.pop(p.x, p.y, 1.4, '✨', '#2CA85C');
        MSM.ui.toast(MSM.t('sport.courtBuilt', { label: spec.label }));
        MSM.save();
      });
    },

    /* --------------------------------------------------------- the tick */
    update(dt) {
      const sp = MSM.econ.spstate();
      if (!sp) return;
      if (K.crew.length !== (sp.advisor ? 1 : 0)) K.syncCrew();
      K.hintT = Math.max(0, K.hintT - dt);

      K.plots(dt);
      K.advise(MSM.ent.player, dt);
      K.crew.forEach((s) => K.stepCrew(s, dt));
    },

    stepCrew(s, dt) {
      const spd = CFG.STAFF_SPEED;
      const busy = K.advise(s, dt);
      if (busy) { s.moving = false; return; }

      const c = K.needsAdvice();
      if (!c) {
        W.walk(s, P.serve.x - 1.6, P.serve.y - 0.7, spd, dt);
        return;
      }
      // stop a polite step short rather than standing on top of them
      const d = Math.hypot(s.x - c.x, s.y - c.y);
      if (d <= S.ADVISE_REACH * 0.8) { s.moving = false; return; }
      W.walk(s, c.x + 0.7, c.y + 0.4, spd, dt);
    },

    /* -------------------------------------------------------- customers */
    /** What they will pay for this line today. */
    budgetFor: (n) => MSM.econ.price(n) *
      U.lerp(S.BUDGET[0], S.BUDGET[1], Math.random()),

    spawn() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      const open = store.products.filter((p) => p.sell && ss.products[p.index].built);
      if (!open.length) return;

      const pick = open[(Math.random() * open.length) | 0];
      MSM.ent.customers.push({
        want: pick.index, sport: pick.sport,
        wantQty: 1, wantGot: 0, list: [], total: 0, got: 0,
        color: ['#FF7BA6', '#4FB0FF', '#8B62FF', '#FF9E4D', '#2FCB9E', '#FF5C5C'][(Math.random() * 6) | 0],
        shade: ['#F2F5FA', '#E9EEF6', '#F6F0E6', '#EDF3EC'][(Math.random() * 4) | 0],
        x: P.entrance.x + (Math.random() - 0.5) * 0.9, y: P.entrance.y,
        lane: pick.lane,
        phase: 'in', carry: 0, carryP: -1,
        wait: 0, walk: 0, moving: true, mood: 'want',
        patience: 1, queueT: 0, served: false,
        budget: K.budgetFor(pick.index),
        advised: false, tried: false,
        tryT: 0, tryDur: 0, browseT: 0, looks: 0,
        verdict: '', verdictT: 0,
      });
      MSM.ent.enterAt(MSM.ent.customers[MSM.ent.customers.length - 1]);
    },

    stepCustomer(c, k, dt) {
      const spd = CFG.CUSTOMER_SPEED;
      const ss = MSM.econ.sstate();
      const prod = MSM.econ.prod(c.want);
      const ps = ss.products[c.want];

      if (c.verdictT > 0) c.verdictT -= dt;

      /* Patience runs only while they are being made to wait: at a rack with
         nothing on it, and in the queue once the grace period is up. Time on
         the court is time they are enjoying — it never costs you. */
      const stuck = (c.phase === 'browse' && ps.shelf <= 0) ||
                    ((c.phase === 'queue' || c.phase === 'toQueue') &&
                     c.queueT > S.QUEUE_GRACE);
      if (stuck) {
        c.patience -= dt / S.PATIENCE;
        if (c.patience <= 0) { K.walkout(c); return; }
      }

      switch (c.phase) {
        case 'in':
          if (W.walk(c, c.lane, P.walkway, spd, dt)) c.phase = 'toRack';
          break;

        /* Cross to the right lane at the current row, then walk up it — the
           route a person takes round a shop floor. */
        case 'toLane':
          if (W.walk(c, c.lane, c.y, spd, dt)) c.phase = 'toRack';
          break;

        case 'toRack':
          if (W.walk(c, prod.browse.x, prod.browse.y, spd, dt)) {
            c.phase = 'browse';
            c.browseT = 0;
          }
          break;

        /* At the rack. An empty one is where their patience goes; a stocked
           one takes a moment to size up, and then it is in their hands. */
        case 'browse': {
          c.moving = false;
          if (ps.shelf <= 0) { c.mood = 'wait'; break; }
          c.mood = 'want';
          c.browseT += dt;
          if (c.browseT < S.BROWSE_TIME) break;

          ps.shelf--;
          c.carry = 1;
          c.carryP = c.want;
          c.phase = 'toTest';
          break;
        }

        /* The signature of the stage. With a court for their sport they go
           and use it; without one they have to buy on faith, and most of
           them will not. */
        case 'toTest': {
          const ai = prod.areaIndex;
          const area = ai >= 0 ? P.areas[ai] : null;
          if (!area || !MSM.econ.spstate().areas[ai].built) {
            if (K.hintT <= 0) {
              K.hintT = 7;
              MSM.render.pop(c.x, c.y, 1.7, '🧪?', '#FFB020');
            }
            K.decide(c);
            break;
          }
          if (W.walk(c, area.stand.x, area.stand.y, spd, dt)) {
            c.phase = 'try';
            c.tryT = 0;
            c.tryDur = U.lerp(S.TRY_TIME[0], S.TRY_TIME[1], Math.random());
          }
          break;
        }

        case 'try':
          c.moving = false;
          c.tryT += dt;
          if (c.tryT < c.tryDur) break;
          c.tried = true;
          MSM.render.pop(c.x, c.y, 1.8, '💥', '#FFC53D');
          K.decide(c);
          break;

        /* Sold. A full till is not a reason to put it back on the shelf —
           they wait at the back of the line, and their patience runs. */
        case 'toQueue': {
          if (MSM.ent.queue.indexOf(c) < 0) {
            if (MSM.ent.queue.length >= P.queue.length) {
              c.queueT += dt;
              const last = P.queue[P.queue.length - 1];
              W.walk(c, last.x, last.y + 0.7, spd, dt);
              break;
            }
            MSM.ent.queue.push(c);
          }
          const slot = P.queue[Math.max(0, MSM.ent.queue.indexOf(c))];
          if (W.walk(c, slot.x, slot.y, spd, dt)) c.phase = 'queue';
          break;
        }

        /* The till itself is the mini mart's — a queue, a counter and a
           cashier work the same in any shop. MSM.game.serve() clears it. */
        case 'queue': {
          const slot = P.queue[Math.max(0, MSM.ent.queue.indexOf(c))];
          W.walk(c, slot.x, slot.y, spd, dt);
          c.queueT += dt;
          break;
        }

        /* A no. They carry it back to where they found it rather than
           dropping it — and sometimes ask to see something else instead. */
        case 'toReturn': {
          if (!W.walk(c, prod.browse.x, prod.browse.y, spd, dt)) break;
          ps.shelf = Math.min(CFG.SHELF_CAP, ps.shelf + 1);
          c.carry = 0;
          c.carryP = -1;

          const alt = c.looks < 1 && Math.random() < S.SECOND_LOOK ? K.pickAlt(c) : -1;
          if (alt >= 0) {
            c.looks++;
            c.want = alt;
            c.lane = MSM.econ.prod(alt).lane;
            c.budget = K.budgetFor(alt);
            c.tried = false;
            c.verdict = '';
            c.verdictT = 0;
            c.mood = 'want';
            c.phase = 'toLane';
            break;
          }
          K.tally(c, 'rejected');
          c.phase = 'leave';
          break;
        }

        case 'leave':
          if (MSM.ent.exitStep(c, dt, spd)) {
            const q = MSM.ent.queue.indexOf(c);
            if (q >= 0) MSM.ent.queue.splice(q, 1);
            MSM.ent.customers.splice(k, 1);
          }
          break;
      }
    },

    /**
     * The whole stage in one function. Price against what they brought,
     * then a roll they can only pass if you gave them a reason to.
     */
    decide(c) {
      const sp = MSM.econ.spstate();
      const price = MSM.econ.price(c.want);
      // good advice also steers them to something they can actually afford
      const budget = c.budget * (c.advised ? S.ADVICE_BUDGET : 1);

      if (price > budget) { K.no(c, 'costly'); return; }

      const chance = Math.min(S.MAX_BUY,
        S.BASE_BUY +
        (c.tried ? S.TRY_BONUS : 0) +
        (c.advised ? S.ADVICE_BONUS : 0) +
        S.LEVEL_BONUS * (MSM.econ.pstate(c.want).level - 1));
      if (Math.random() > chance) { K.no(c, 'meh'); return; }

      K.tally(c, 'bought');
      c.verdict = 'buy';
      c.verdictT = 1.8;
      c.mood = 'happy';
      c.got = 1;
      c.total = price;
      c.phase = 'toQueue';
      MSM.render.pop(c.x, c.y, 1.9, '😊', '#2CA85C');
    },

    /** Not this one. The count happens when they finally give up, not here —
        a shopper who says no twice is still only one lost sale. */
    no(c, why) {
      c.verdict = why;
      c.verdictT = 2.0;
      c.mood = why === 'costly' ? 'wait' : 'want';
      c.phase = 'toReturn';
      MSM.render.pop(c.x, c.y, 1.9, why === 'costly' ? '😕' : '😞', '#E0553F');
    },

    /* One shopper is one outcome. Somebody who decides to buy and then runs
       out of patience at a busy till used to land in both columns at once. */
    tally(c, key) {
      if (c.counted) return;
      c.counted = true;
      MSM.econ.spstate()[key]++;
    },

    /** Another line in the same sport — "have you got anything else?" */
    pickAlt(c) {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      const open = store.products.filter((p) =>
        p.sport === c.sport && p.index !== c.want && p.sell && ss.products[p.index].built);
      if (!open.length) return -1;
      return open[(Math.random() * open.length) | 0].index;
    },

    /** Out of patience at an empty rack, or in the queue. */
    walkout(c) {
      const q = MSM.ent.queue.indexOf(c);
      if (q >= 0) MSM.ent.queue.splice(q, 1);
      if (c.carry) {
        const ps = MSM.econ.pstate(c.want);
        ps.shelf = Math.min(CFG.SHELF_CAP, ps.shelf + 1);
        c.carry = 0;
        c.carryP = -1;
      }
      K.tally(c, 'walkouts');
      c.mood = 'angry';
      c.verdict = '';
      c.phase = 'leave';
      c.patience = 0;
      MSM.render.pop(c.x, c.y, 1.5, '😡', '#E0553F');
    },

    /** The one-line hint the HUD shows while you are learning the shop. */
    guide() {
      const ss = MSM.econ.sstate(), sp = ss.sports;
      if (!ss.till) return MSM.t('sport.gCounter');
      if (!ss.open) return MSM.t('sport.gOpen');

      // somebody stood at a rack with nothing on it is the loudest problem
      const empty = MSM.ent.customers.find((c) =>
        c.phase === 'browse' && MSM.econ.pstate(c.want).shelf <= 0);
      if (empty) return MSM.t('sport.gStock', { name: MSM.econ.prod(empty.want).name });

      if (K.needsAdvice()) return MSM.t('sport.gAdvise');
      if (sp.areas.some((a) => !a.built)) return MSM.t('sport.gCourt');
      return '';
    },
  };
})();
