/* Stage 5 — the techhub.

   Every other store's customer wants a THING. This one's wants a KIND of
   thing — "a laptop", "a phone" — and walks in carrying three facts:

     a category      💻          what they came for
     a priority      ⚡ or 🔋    the one spec they actually care about
     a budget        $           what they can spend

   The shop stocks two of each kind, and the pair pulls opposite ways: the
   thin all-day laptop against the fast hot one. So the loop is a comparison:

     they find the first display     ->  look it over
     they carry it to the demo bench ->  hands-on, a few seconds
     then the second one             ->  same again
     they weigh the two              ->  ⚖️ against THEIR priority
     the winner they can afford      ->  a sealed box off the stand
     the till                        ->  and out

   Demoing never consumes stock — fifty people can try the floor unit — but
   the SALE needs a box on the stand, which is what the stockers haul. A
   department with no bench sells cold, off the spec sheet alone, and a spec
   sheet convinces almost nobody. Advice is the other half: stand with a
   shopper and they stop second-guessing — you point them straight at the
   right one for what they told you, and find the budget for it. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, W = MSM.world, P = MSM.CFG.PLAN, T = MSM.CFG.TECH;

  const K = MSM.tech = {
    crew: [],          // the tech advisor, when you have hired one

    active: () => MSM.econ.store().mode === 'tech',

    reset() {
      K.crew.length = 0;
      if (K.active()) K.syncCrew();
    },

    /* ------------------------------------------------------------ crew */
    syncCrew() {
      const ts = MSM.econ.tstate();
      K.crew.length = 0;
      if (!ts || !ts.advisor) return;
      K.crew.push({
        job: 'advisor', color: '#4062D8',
        x: P.serve.x - 1.4, y: P.serve.y - 0.6,
        hold: [], carry: 0, carryP: -1, only: -1,
        walk: 0, moving: false, handle: 0, adviseT: 0,
      });
    },

    /* --------------------------------------------------------- scoring */
    /** How good this product is FOR THIS SHOPPER: their priority counts
        triple, everything else once. The pair in each department is tuned so
        the winner flips with the priority — that is the whole store. */
    score(c, n) {
      const specs = MSM.econ.prod(n).specs || {};
      let total = 0;
      Object.keys(specs).forEach((k) => { total += specs[k]; });
      return (specs[c.focus] || 0) * 3 + total;
    },

    budgetOf: (c) => c.budget * (c.advised ? T.ADVICE_BUDGET : 1),

    /** The best product in their category they can actually pay for —
        among what they have seen, or among everything once advised. */
    best(c) {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      let best = -1, bs = -1;
      store.products.forEach((p, n) => {
        if (p.cat !== c.cat || !ss.products[n].built) return;
        if (!c.advised && c.seen.indexOf(n) < 0) return;
        if (MSM.econ.price(n) > K.budgetOf(c)) return;
        const s = K.score(c, n);
        if (s > bs) { bs = s; best = n; }
      });
      return best;
    },

    /* --------------------------------------------------------- advising */
    advisable: (c) => !c.advised && !c.served &&
      (c.phase === 'toDisplay' || c.phase === 'browse' ||
       c.phase === 'toBench' || c.phase === 'demo'),

    /**
     * Stand with an undecided shopper a moment and they are advised: told
     * which of the pair fits what they care about, and steered straight to
     * it — no more traipsing between displays.
     */
    advise(body, dt) {
      let best = null, bd = 1e9;
      MSM.ent.customers.forEach((c) => {
        if (!K.advisable(c)) return;
        const d = Math.hypot(body.x - c.x, body.y - c.y);
        if (d <= T.ADVISE_REACH && d < bd) { bd = d; best = c; }
      });
      if (!best) { body.adviseT = 0; return null; }

      body.adviseT = (body.adviseT || 0) + dt;
      if (body.adviseT < T.ADVISE_TIME) return best;
      body.adviseT = 0;

      const c = best;
      c.advised = true;
      MSM.econ.tstate().advised++;
      MSM.render.pop(c.x, c.y, 1.9, '💬 ' + T.STATS[c.focus], '#4FB0FF');
      const pick = K.best(c);
      if (pick >= 0) {
        /* Steered, not sold: they go straight to the recommended one and
           still get their hands on it — good advice plus a good demo is the
           strongest close in the shop, which is why the hire is worth it.
           If it is the very one already in their hands, they just finish. */
        c.directed = true;
        if (!(c.phase === 'demo' && c.look === pick)) {
          c.look = pick;
          c.phase = 'toDisplay';
          c.carry = 0;
          c.carryP = -1;
        }
      } else {
        K.no(c, 'costly');       // honest advice: nothing here fits the money
      }
      return null;
    },

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
    plots(dt) {
      const ts = MSM.econ.tstate();
      const p = MSM.ent.player;

      P.areas.forEach((spec, ai) => {
        const as = ts.areas[ai];
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
        p.x = spec.stand.x;
        p.y = spec.stand.y;
        p.vx = 0; p.vy = 0;
        MSM.render.pop(p.x, p.y, 1.4, '✨', '#2CA85C');
        MSM.ui.toast(MSM.t('tech.benchBuilt', { label: spec.label }));
        MSM.save();
      });
    },

    /* --------------------------------------------------------- the tick */
    update(dt) {
      const ts = MSM.econ.tstate();
      if (!ts) return;
      if (K.crew.length !== (ts.advisor ? 1 : 0)) K.syncCrew();
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
      const d = Math.hypot(s.x - c.x, s.y - c.y);
      if (d <= T.ADVISE_REACH * 0.8) { s.moving = false; return; }
      W.walk(s, c.x + 0.7, c.y + 0.4, spd, dt);
    },

    /* -------------------------------------------------------- customers */
    spawn() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      const open = store.products.filter((p) => p.sell && ss.products[p.index].built);
      if (!open.length) return;

      /* They come for a CATEGORY. Their priority is one of the specs that
         category actually competes on, and their budget is drawn against
         what the category costs. */
      const cats = [];
      open.forEach((p) => { if (cats.indexOf(p.cat) < 0) cats.push(p.cat); });
      const cat = cats[(Math.random() * cats.length) | 0];
      const inCat = open.filter((p) => p.cat === cat);

      const stats = [];
      inCat.forEach((p) => Object.keys(p.specs).forEach((k) => {
        if (p.specs[k] >= 2 && stats.indexOf(k) < 0) stats.push(k);
      }));
      const focus = stats[(Math.random() * stats.length) | 0] || 'perf';
      const top = Math.max.apply(null, inCat.map((p) => MSM.econ.price(p.index)));
      const first = inCat.reduce((a, p) =>
        (MSM.econ.price(p.index) < MSM.econ.price(a.index) ? p : a), inCat[0]);

      MSM.ent.customers.push({
        cat, focus, look: first.index, want: first.index,
        seen: [], demos: 0, directed: false,
        wantQty: 1, wantGot: 0, list: [], total: 0, got: 0,
        color: ['#FF7BA6', '#4FB0FF', '#8B62FF', '#FF9E4D', '#2FCB9E', '#FF5C5C'][(Math.random() * 6) | 0],
        shade: ['#F2F5FA', '#E9EEF6', '#F6F0E6', '#EDF3EC'][(Math.random() * 4) | 0],
        x: P.entrance.x + (Math.random() - 0.5) * 0.9, y: P.entrance.y,
        lane: first.lane,
        phase: 'in', carry: 0, carryP: -1,
        wait: 0, walk: 0, moving: true, mood: 'want',
        patience: 1, queueT: 0, served: false, counted: false,
        budget: top * U.lerp(T.BUDGET[0], T.BUDGET[1], Math.random()),
        advised: false, browseT: 0, demoT: 0, demoDur: 0,
        verdict: '', verdictT: 0,
      });
      MSM.ent.enterAt(MSM.ent.customers[MSM.ent.customers.length - 1]);
    },

    /** The other display in their department they have not seen yet. */
    nextLook(c) {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      const p = store.products.find((q) =>
        q.cat === c.cat && ss.products[q.index].built && c.seen.indexOf(q.index) < 0);
      return p ? p.index : -1;
    },

    stepCustomer(c, k, dt) {
      const spd = CFG.CUSTOMER_SPEED;
      const prod = MSM.econ.prod(c.look >= 0 ? c.look : c.want);

      if (c.verdictT > 0) c.verdictT -= dt;

      /* Patience runs while they are made to wait: on a sold-out box, and in
         the queue past the grace. Time at the bench is the fun part. */
      const stuck = c.phase === 'restock' ||
                    ((c.phase === 'queue' || c.phase === 'toQueue') &&
                     c.queueT > T.QUEUE_GRACE);
      if (stuck) {
        c.patience -= dt / T.PATIENCE;
        if (c.patience <= 0) { K.walkout(c); return; }
      }

      switch (c.phase) {
        case 'in':
          if (W.walk(c, prod.lane, P.walkway, spd, dt)) c.phase = 'toDisplay';
          break;

        case 'toLane':
          if (W.walk(c, prod.lane, c.y, spd, dt)) c.phase = 'toDisplay';
          break;

        case 'toDisplay':
          if (W.walk(c, prod.browse.x, prod.browse.y, spd, dt)) {
            c.phase = 'browse';
            c.browseT = 0;
          }
          break;

        /* At the display. With a bench they take the floor unit over for a
           real go; without one all they get is the card on the stand. */
        case 'browse': {
          c.moving = false;
          c.browseT += dt;
          if (c.browseT < T.BROWSE_TIME) break;
          if (c.seen.indexOf(c.look) < 0) c.seen.push(c.look);

          const ai = prod.areaIndex;
          const bench = ai >= 0 && MSM.econ.tstate().areas[ai].built;
          if (!bench) {
            /* Cold: one look at one spec sheet, and a coin-toss heart. */
            MSM.render.pop(c.x, c.y, 1.7, '🧪?', '#FFB020');
            K.decide(c);
            break;
          }
          c.carry = 1;                  // the floor unit, off to the bench
          c.carryP = c.look;
          c.phase = 'toBench';
          break;
        }

        case 'toBench': {
          const stand = P.areas[prod.areaIndex].stand;
          const off = (k % 3) - 1;      // three can share a bench politely
          if (W.walk(c, stand.x + off * 0.8, stand.y, spd, dt)) {
            c.phase = 'demo';
            c.demoT = 0;
            c.demoDur = U.lerp(T.DEMO_TIME[0], T.DEMO_TIME[1], Math.random());
          }
          break;
        }

        case 'demo': {
          c.moving = false;
          c.demoT += dt;
          if (c.demoT < c.demoDur) break;
          c.demos++;
          c.carry = 0;
          c.carryP = -1;

          // a steered shopper has their answer — no second lap of the floor
          const next = c.directed ? -1 : K.nextLook(c);
          if (next >= 0) {
            c.look = next;
            c.phase = 'toLane';
            break;
          }
          /* Both tried. The weigh-up itself — the stage's little ceremony. */
          if (c.demos >= 2) {
            MSM.econ.tstate().compared++;
            MSM.render.pop(c.x, c.y, 1.9, '⚖️', '#FFC53D');
          }
          K.decide(c);
          break;
        }

        /* Sold, but the stand has no sealed box on it — they wait by it as
           long as they are willing to, and a stocker can still save this. */
        case 'restock': {
          const pw = MSM.econ.prod(c.want);
          W.walk(c, pw.browse.x, pw.browse.y, spd, dt);
          c.mood = 'wait';
          if (MSM.econ.pstate(c.want).shelf <= 0) break;
          K.takeBox(c);
          break;
        }

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

        case 'queue': {
          const slot = P.queue[Math.max(0, MSM.ent.queue.indexOf(c))];
          W.walk(c, slot.x, slot.y, spd, dt);
          c.queueT += dt;
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
     * The verdict. The winner is the best score they can afford; the roll on
     * top is everything you did for them — the demo, the comparison, the
     * advice — stacked against a cold spec sheet's coin toss.
     */
    decide(c) {
      const pick = K.best(c);
      if (pick < 0) { K.no(c, 'costly'); return; }

      const chance = Math.min(T.MAX_BUY,
        T.BASE_BUY +
        (c.demos > 0 ? T.DEMO_BONUS : 0) +
        (c.demos >= 2 ? T.COMPARE_BONUS : 0) +
        (c.advised ? T.ADVICE_BONUS : 0) +
        T.LEVEL_BONUS * (MSM.econ.pstate(pick).level - 1));
      if (Math.random() > chance) { K.no(c, 'meh'); return; }

      c.want = pick;
      K.tally(c, 'sold');
      c.verdict = 'buy';
      c.verdictT = 1.8;
      c.mood = 'happy';
      MSM.render.pop(c.x, c.y, 1.9, MSM.econ.prod(pick).glyph + ' 😊', '#2CA85C');

      if (MSM.econ.pstate(pick).shelf <= 0) { c.phase = 'restock'; return; }
      K.takeBox(c);
    },

    /** A sealed box off the stand, and off to the till. */
    takeBox(c) {
      MSM.econ.pstate(c.want).shelf--;
      c.carry = 1;
      c.carryP = c.want;
      c.got = 1;
      c.total = MSM.econ.price(c.want);
      c.mood = 'happy';
      c.phase = 'toQueue';
    },

    /* One shopper is one outcome — the lesson the boutique taught. */
    tally(c, key) {
      if (c.counted) return;
      c.counted = true;
      MSM.econ.tstate()[key]++;
    },

    no(c, why) {
      K.tally(c, 'lost');
      c.carry = 0;
      c.carryP = -1;
      c.verdict = why || 'meh';
      c.verdictT = 2.0;
      c.mood = 'want';
      c.phase = 'leave';
      MSM.render.pop(c.x, c.y, 1.9, why === 'costly' ? '😕' : '😞', '#E0553F');
    },

    /** Out of patience on a sold-out box, or in the queue. */
    walkout(c) {
      K.tally(c, 'lost');
      const q = MSM.ent.queue.indexOf(c);
      if (q >= 0) MSM.ent.queue.splice(q, 1);
      /* They were already rung up as sold in their head — but the box never
         made it to the till, so the stock they took goes back. */
      if (c.carry && c.want >= 0) {
        const ps = MSM.econ.pstate(c.want);
        ps.shelf = Math.min(CFG.SHELF_CAP, ps.shelf + 1);
      }
      c.carry = 0;
      c.carryP = -1;
      c.mood = 'angry';
      c.verdict = '';
      c.phase = 'leave';
      c.patience = 0;
      MSM.render.pop(c.x, c.y, 1.5, '😡', '#E0553F');
    },

    /** The one-line hint the HUD shows while you are learning the shop. */
    guide() {
      const ss = MSM.econ.sstate(), ts = ss.tech;
      if (!ss.till) return MSM.t('tech.gCounter');
      if (!ss.open) return MSM.t('tech.gOpen');

      const dry = MSM.ent.customers.find((c) =>
        c.phase === 'restock' && MSM.econ.pstate(c.want).shelf <= 0);
      if (dry) return MSM.t('tech.gStock', { name: MSM.econ.prod(dry.want).name });

      if (K.needsAdvice()) return MSM.t('tech.gAdvise');
      if (ts.areas.some((a) => !a.built)) return MSM.t('tech.gBench');
      return '';
    },
  };
})();
