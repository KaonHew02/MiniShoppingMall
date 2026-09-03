/* The guided hand.

   Every shop used to be on its own once you walked in. The mini mart had a
   six-step script with a gold arrow and nothing after it; the other five had
   a one-line hint and nothing before it. So the first minute in a new shop
   was a floor full of unlabelled plots and no idea which one to stand on.

   Each shop now gets both layers:

   1. a SCRIPT — the first few minutes in a shop you have never run, one step
      at a time, arrow on the floor. It runs once per shop and then stops for
      good; progress is `MSM.state.stores[i].tut`.
   2. a HINT — from then on, the single most useful thing to do RIGHT NOW,
      recomputed every frame: a starving cow, a queue with nobody on the
      till, the next line you can afford to build, the next shop you can
      afford to buy. This is what stops a shop going quiet once the script
      ends.

   Both come out the same way — MSM.game.tutTarget (a floor point, or null)
   and MSM.game.tutText (the line under the HUD). */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, P = MSM.CFG.PLAN;

  const DONE = 99;                       // the script is over for this shop

  const t = (k, v) => MSM.t(k, v);
  const ss = () => MSM.econ.sstate();
  const mid = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
  const below = (b, d) => ({ x: (b.x0 + b.x1) / 2, y: b.y1 + (d == null ? 0.55 : d) });
  const sales = () => ss().sales || 0;
  const stocked = (n) => MSM.econ.pstate(n).shelf > 0;

  /* ------------------------------------------------------------- steps */
  /* Every shop opens the same way — you cannot sell anything without a
     counter, and nobody comes in until the sign says OPEN. */
  const COUNTER = {
    text: () => t('tut.counter', { cost: '$' + CFG.TILL_COST(MSM.econ.store().unlock) }),
    at: () => mid(P.till),
    done: () => ss().till,
  };
  const SIGN = {
    text: () => t('tut.sign'),
    at: () => mid(P.sign),
    done: () => ss().open,
  };
  /** Stock line 0 out of whatever the shop keeps at the back. */
  const stockFirst = (key) => ({
    text: () => t(key, { name: MSM.econ.prod(0).name }),
    at: () => MSM.ent.crateStand(0),
    done: () => stocked(0),
  });
  /** The last step of every shop: ring one up, whatever "ring up" means here. */
  const firstSale = (key, at) => ({
    text: () => t(key),
    at: at || (() => P.serve),
    done: () => sales() > 0,
  });

  const SCRIPTS = {
    /* The mini mart, unchanged: build, harvest, stock, open, serve, collect. */
    grocery: [
      COUNTER,
      { text: () => t('tut.harvest'),
        at: () => MSM.ent.crateStand(0),
        done: () => MSM.ent.player.hold.indexOf(0) >= 0 || stocked(0) },
      { text: () => t('tut.shelf'),
        at: () => MSM.econ.prod(0).browse,
        done: () => stocked(0) },
      SIGN,
      { text: () => t('tut.serve'), at: () => P.serve, done: () => sales() > 0 },
      { text: () => t('tut.collect'),
        at: () => MSM.ent.cash[0] || null,
        done: () => MSM.ent.cash.length === 0 && MSM.state.totalEarned > 0 },
    ],

    /* Nothing waits on a shelf here: they order, you brew, you carry it. */
    cafe: [
      COUNTER, SIGN,
      stockFirst('tut.cafeStock'),
      { text: () => t('tut.cafeBrew'),
        at: () => below(P.machines[0].box),
        done: () => (MSM.econ.cstate().ready || []).length > 0 || sales() > 0 },
      firstSale('tut.cafeServe', () => below(P.pickup)),
    ],

    /* A meal is three things cooked in three places and one tray out. */
    food: [
      COUNTER, SIGN,
      stockFirst('tut.foodStock'),
      { text: () => t('tut.foodCook'),
        at: () => below(P.machines[0].box),
        done: () => MSM.food.trays.length > 0 || sales() > 0 },
      firstSale('tut.foodHand', () => P.pickupStand),
    ],

    /* They pick it up, TRY it, and only then decide. */
    sports: [
      COUNTER, SIGN,
      stockFirst('tut.sportStock'),
      /* Trying it on and ringing it up land in the same instant, so this is
         ONE step, not two — a step that completes the moment it appears is
         a step nobody ever reads. */
      { text: () => t('tut.sportTry'),
        at: () => (P.areas[0] || {}).stand || null,
        done: () => MSM.econ.spstate().bought > 0 || sales() > 0 },
    ],

    /* Have you got it, in their size, with somewhere to try it on? */
    boutique: [
      COUNTER, SIGN,
      stockFirst('tut.fitStock'),
      { text: () => t('tut.fitRoom'),
        at: () => mid(P.rooms[0].box),
        done: () => MSM.econ.bstate().sold > 0 || sales() > 0 },
    ],

    /* They want a KIND of thing, and want the two of them compared. */
    tech: [
      COUNTER, SIGN,
      stockFirst('tut.techStock'),
      { text: () => t('tut.techDemo'),
        at: () => (P.areas[0] || {}).stand || null,
        done: () => MSM.econ.tstate().sold > 0 || sales() > 0 },
    ],
  };

  /* -------------------------------------------------------------- hints */
  /* Once the script is done, the shop still has to tell you what it needs.
     Ordered by how loudly it is costing you money. */
  function hint() {
    const store = MSM.econ.store(), s = ss();
    if (!s.till) return { text: COUNTER.text(), at: COUNTER.at() };
    if (!s.open) return { text: SIGN.text(), at: SIGN.at() };

    /* A cow with an empty trough is the one failure that stops the whole
       chain behind it, and it is invisible from the shop floor. */
    const starving = store.products.find((p, n) => {
      const inp = p.source.inputIndex;
      if (inp < 0) return false;
      const ps = MSM.econ.pstate(n);
      return ps.built && ps.feed <= 0 && ps.out <= 0 && MSM.econ.pstate(inp).built;
    });
    if (starving) {
      const inp = starving.source.inputIndex;
      return {
        text: t('hint.feed', {
          label: starving.source.label, name: MSM.econ.prod(inp).name }),
        at: MSM.ent.crateStand(inp),
      };
    }

    /* A queue nobody is working. Every shop shares MSM.ent.queue, so this
       reads the same at a till, a coffee counter and a burger counter. */
    if (!s.cashier && MSM.ent.queue.length >= 2 &&
        !MSM.world.atPoint(MSM.ent.player, P.serve, 1.4)) {
      return { text: t('hint.till'), at: P.serve };
    }

    // whatever this particular shop is worried about, in its own words
    const own = (MSM.cafe.active() ? MSM.cafe.guide()
               : MSM.sports.active() ? MSM.sports.guide()
               : MSM.boutique.active() ? MSM.boutique.guide()
               : MSM.tech.active() ? MSM.tech.guide()
               : MSM.food.active() ? MSM.food.guide()
               : martGuide()) || '';
    if (own) return { text: own.text || own, at: own.at || null };

    // nothing is on fire: point at the next thing worth buying
    const n = MSM.econ.nextBuild();
    if (n >= 0) {
      const prod = MSM.econ.prod(n);
      const afford = MSM.state.cash >= prod.buildCost;
      return {
        text: t(afford ? 'hint.build' : 'hint.saveFor',
                { name: prod.name, cost: '$' + U.money(prod.buildCost) }),
        at: afford ? mid(prod.crate) : null,
      };
    }
    const next = MSM.game.teaseStore();
    if (next >= 0 && MSM.state.cash >= CFG.STORES[next].unlock) {
      return { text: t('hint.newShop', { store: CFG.STORES[next].name }), at: null };
    }
    return { text: '', at: null };
  }

  /* The mini mart never had a guide() of its own — it just went quiet after
     the first sale. Somebody stood at an empty shelf is its loudest problem,
     exactly as it is in every other shop. */
  function martGuide() {
    const waiting = MSM.ent.customers.find((c) =>
      c.phase === 'browse' && c.want != null && MSM.econ.pstate(c.want) &&
      MSM.econ.pstate(c.want).shelf <= 0);
    if (!waiting) return null;
    const prod = MSM.econ.prod(waiting.want), ps = MSM.econ.pstate(waiting.want);
    // is there a crate full of it out the back, or is it still growing?
    return ps.out > 0
      ? { text: t('hint.restock', { name: prod.name }), at: MSM.ent.crateStand(waiting.want) }
      : { text: t('hint.growing', { name: prod.name, label: prod.source.label }),
          at: MSM.ent.crateStand(waiting.want) };
  }

  /* --------------------------------------------------------------- api */
  MSM.tut = {
    /** Is this shop still being walked through? Customers keep it simple. */
    scripted: () => (ss().tut || 0) < DONE,

    /** Called once a frame. Sets MSM.game.tutTarget and .tutText. */
    update() {
      const script = SCRIPTS[MSM.econ.store().mode || 'grocery'] || [];
      const s = ss();
      let step = s.tut || 0;

      if (step < DONE) {
        // walk forward past everything already true — a returning save may
        // be several steps in, and one action can satisfy two steps at once
        let guard = 0;
        while (step < script.length && script[step].done() && guard++ < 40) step++;
        if (step >= script.length) {
          s.tut = DONE;
          MSM.ui.toast(t('toast.firstSale'));
          MSM.save();
        } else if (step !== s.tut) {
          s.tut = step;
        }
      }

      if ((s.tut || 0) < DONE) {
        const cur = script[s.tut];
        MSM.game.tutText = cur.text();
        MSM.game.tutTarget = cur.at ? cur.at() : null;
        return;
      }

      const h = hint();
      MSM.game.tutText = h.text;
      MSM.game.tutTarget = h.at;
    },
  };
})();
