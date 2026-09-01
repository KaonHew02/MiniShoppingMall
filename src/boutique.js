/* Stage 4 — the fashion boutique.

   The outlet was a SELLING game: can you talk somebody into it? The boutique
   is a MATCHING game, and the question is smaller and harder — have you got
   the thing they want, in their size, with somewhere to try it on:

     they come in wanting an outfit  ->  one piece, sometimes two
     they find the rail              ->  and look for THEIR size
     the size is there               ->  it comes off the hanger
     the size is not                 ->  📏 "have you got this in L?"
                                          and you fetch one from the back
     they take it to a cubicle       ->  if one is free, or they queue
     they try it on                  ->  a few seconds behind the curtain
     they decide                     ->  😊 buy   😞 leave it

   So there are two scarce things on this floor — a size on the rail and a
   free cubicle — and the whole job is keeping either from running out. A
   rail can be full and still be empty to the person standing in front of it.

   Accessories (a cap, a bag) have no size and need no cubicle, which is
   exactly why they are the easy sale when the shop is heaving. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.CFG, U = MSM.util, W = MSM.world, P = MSM.CFG.PLAN, B = MSM.CFG.BOUTIQUE;

  const K = MSM.boutique = {
    crew: [],          // the fashion assistant, when you have hired one

    active: () => MSM.econ.store().mode === 'boutique',

    reset() {
      K.crew.length = 0;
      if (K.active()) K.syncCrew();
    },

    /* ------------------------------------------------------------ crew */
    /* One job, and it is a runner's job: hear a size, walk to the back, walk
       it out to whoever asked. That is a real errand across the shop, which
       is why it is worth paying somebody to do it. */
    syncCrew() {
      const bs = MSM.econ.bstate();
      K.crew.length = 0;
      if (!bs || !bs.assistant) return;
      K.crew.push({
        job: 'assistant', color: '#D14B86',
        x: P.serve.x - 1.6, y: P.serve.y - 0.6,
        hold: [], carry: 0, carryP: -1, only: -1,
        walk: 0, moving: false, handle: 0, target: null,
      });
    },

    /* ------------------------------------------------------ size requests */
    /** Is this shopper stood at a rail waiting for a size you have not brought? */
    asking: (c) => c.phase === 'ask' && !!c.need,

    /** The nearest unanswered size request — the assistant's whole to-do list. */
    nextAsk(from) {
      let best = null, bd = 1e9;
      MSM.ent.customers.forEach((c) => {
        if (!K.asking(c) || c.claimed) return;
        const d = Math.hypot(from.x - c.x, from.y - c.y);
        if (d < bd) { bd = d; best = c; }
      });
      return best;
    },

    /**
     * The boutique's own auto-use rule, run before the generic one. Two
     * things happen here that nowhere else in the game does: handing a
     * fetched size to the person who asked for it, and hanging stock on a
     * rail INTO a size rather than onto a pile.
     */
    handle(body) {
      const bs = MSM.econ.bstate();
      if (!bs) return false;

      // hand over a size somebody is stood there waiting for
      if (body.hold.length) {
        for (const c of MSM.ent.customers) {
          if (!K.asking(c) || body.hold.indexOf(c.need.n) < 0) continue;
          if (Math.hypot(body.x - c.x, body.y - c.y) > B.HAND_REACH) continue;
          K.deliver(body, c);
          return true;
        }
      }

      /* Which rail we are stood at holding its own stock, if any. */
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      let railN = -1;
      store.products.some((prod, n) => {
        if (!ss.products[n].built || !prod.shelf) return false;
        if (body.hold.indexOf(n) < 0 || !W.atBox(body, prod.shelf)) return false;
        railN = n;
        return true;
      });
      if (railN < 0) return false;

      /* From here the boutique owns the outcome, and says so by returning
         true even when it does nothing. The generic shop rule would hang a
         garment on the rail without putting it in a SIZE, and a rail whose
         total no longer matches its own breakdown is a rail that reads as
         full while nobody can find anything to wear. */

      // somebody carrying a garment to a named customer does not stop to tidy
      if (body.errand) return true;
      const ps = ss.products[railN];
      if (ps.shelf >= CFG.SHELF_CAP) return true;

      MSM.ent.takeOne(body, railN);
      ps.shelf++;
      if (store.products[railN].garment) bs.racks[railN][MSM.econ.thinnestSize(railN)]++;
      return true;
    },

    /** A fetched garment, handed straight to the customer who asked. */
    deliver(body, c) {
      const bs = MSM.econ.bstate();
      MSM.ent.takeOne(body, c.need.n);
      c.need.got = true;
      c.need = null;
      c.claimed = false;
      c.helped = true;                 // being served is worth a sale on its own
      c.carry = c.items.filter((it) => it.got).length;
      c.carryP = c.items.filter((it) => it.got).map((it) => it.n).pop();
      bs.fetched++;
      MSM.render.pop(c.x, c.y, 1.9, '📏 ' + B.SIZES[c.size] + ' ✓', '#2CA85C');
      K.afterPickup(c);
    },

    /* ------------------------------------------------------- the cubicles */
    /** Take a free cubicle, or return false and go and stand in line. */
    claimRoom(c) {
      const bs = MSM.econ.bstate();
      const taken = {};
      MSM.ent.customers.forEach((o) => { if (o.room >= 0) taken[o.room] = 1; });
      for (let k = 0; k < bs.rooms.length; k++) {
        if (!bs.rooms[k].built || taken[k]) continue;
        c.room = k;
        return true;
      }
      return false;
    },

    /** The spot outside a cubicle's curtain. */
    roomDoor(k) {
      const b = P.rooms[k].box;
      return { x: (b.x0 + b.x1) / 2, y: b.y1 + 0.55 };
    },

    /** A wait spot nobody has claimed, for when every cubicle is busy. */
    freeSpot() {
      const used = MSM.ent.customers.map((c) => c.spotIndex);
      for (let i = 0; i < P.waits.length; i++) {
        if (used.indexOf(i) < 0) return i;
      }
      return -1;
    },

    /* ------------------------------------------------------- build plots */
    plots(dt) {
      const bs = MSM.econ.bstate();
      const p = MSM.ent.player;

      P.rooms.forEach((spec, k) => {
        const rs = bs.rooms[k];
        if (rs.built || U.boxDist(p.x, p.y, spec.box) > 0.05) return;
        const rate = Math.max(spec.cost / 2.5, 60);
        const pay = Math.min(rate * dt, spec.cost - rs.buildPaid, MSM.state.cash);
        if (pay <= 0) return;
        MSM.state.cash -= pay;
        rs.buildPaid += pay;
        if (rs.buildPaid < spec.cost) return;

        rs.built = true;
        rs.buildPaid = 0;
        MSM.world.invalidate();
        // you were stood on the plot — step out before the walls arrive
        const door = K.roomDoor(k);
        p.x = door.x; p.y = door.y;
        p.vx = 0; p.vy = 0;
        MSM.render.pop(p.x, p.y, 1.4, '✨', '#2CA85C');
        MSM.ui.toast(MSM.t('fit.roomBuilt'));
        MSM.save();
      });
    },

    /* --------------------------------------------------------- the tick */
    update(dt) {
      const bs = MSM.econ.bstate();
      if (!bs) return;
      if (K.crew.length !== (bs.assistant ? 1 : 0)) K.syncCrew();
      K.plots(dt);
      K.crew.forEach((s) => K.stepCrew(s, dt));
    },

    stepCrew(s, dt) {
      const spd = CFG.STAFF_SPEED;

      // the errand they are already on, if that customer is still waiting
      if (s.target && (!K.asking(s.target) || s.target.need.n !== s.only)) {
        if (s.target) s.target.claimed = false;
        s.target = null;
        s.only = -1;
      }
      if (!s.target) {
        const c = K.nextAsk(s);
        if (c) {
          c.claimed = true;
          s.target = c;
          s.only = c.need.n;
        }
      }

      if (!s.target) {
        // off the errand: free to put a stray back on its rail again
        s.errand = false;
        // nothing to fetch — wait where the cubicles are, and drop any stray
        if (s.hold.length) {
          const prod = MSM.econ.prod(s.hold[0]);
          if (W.seek(s, prod.shelf ? (prod.shelf.x0 + prod.shelf.x1) / 2 : P.serve.x,
                     prod.shelf ? prod.shelf.y1 + 0.55 : P.serve.y, spd, dt, false)) {
            s.moving = false;
            MSM.ent.handle(s, dt);
          }
          return;
        }
        const home = K.roomDoor(0);
        W.seek(s, home.x - 1.4, home.y + 0.6, spd, dt, false);
        return;
      }

      const c = s.target;
      s.errand = true;
      // holding it already? walk it over. otherwise go and get one.
      if (s.hold.indexOf(c.need.n) >= 0) {
        if (W.seek(s, c.x + 0.6, c.y + 0.4, spd, dt, false)) s.moving = false;
        MSM.ent.handle(s, dt);
        if (!K.asking(c)) { s.target = null; s.only = -1; }
        return;
      }
      const stand = MSM.ent.crateStand(c.need.n);
      if (W.seek(s, stand.x, stand.y, spd, dt, false)) {
        s.moving = false;
        MSM.ent.handle(s, dt);
      }
    },

    /* -------------------------------------------------------- customers */
    /** The size they are, drawn from how a real shop actually sells. */
    rollSize() {
      const r = Math.random();
      let acc = 0;
      for (let k = 0; k < B.SIZE_ODDS.length; k++) {
        acc += B.SIZE_ODDS[k];
        if (r < acc) return k;
      }
      return 1;
    },

    spawn() {
      const store = MSM.econ.store(), ss = MSM.econ.sstate();
      const open = store.products.filter((p) => p.sell && ss.products[p.index].built);
      if (!open.length) return;

      /* An outfit: one piece, and often a second from a different rail — the
         👕 + 👖 on one receipt the shop is really there to sell. */
      const items = [];
      const take = () => {
        const left = open.filter((p) => !items.some((it) => it.n === p.index));
        if (!left.length) return;
        items.push({ n: left[(Math.random() * left.length) | 0].index, got: false });
      };
      take();
      if (Math.random() < B.OUTFIT_ODDS) take();
      if (!items.length) return;

      const first = MSM.econ.prod(items[0].n);
      MSM.ent.customers.push({
        items, want: items[0].n, size: K.rollSize(),
        wantQty: 1, wantGot: 0, list: [], total: 0, got: 0,
        color: ['#FF7BA6', '#4FB0FF', '#8B62FF', '#FF9E4D', '#2FCB9E', '#FF5C5C'][(Math.random() * 6) | 0],
        shade: ['#F2F5FA', '#E9EEF6', '#F6F0E6', '#EDF3EC'][(Math.random() * 4) | 0],
        x: P.entrance.x + (Math.random() - 0.5) * 0.9, y: P.entrance.y,
        lane: first.lane,
        phase: 'in', carry: 0, carryP: -1,
        wait: 0, walk: 0, moving: true, mood: 'want',
        patience: 1, queueT: 0, served: false, hidden: false,
        budget: 0, helped: false, need: null, claimed: false,
        room: -1, spotIndex: -1, fitT: 0, fitDur: 0, browseT: 0,
        verdict: '', verdictT: 0,
      });
      const c = MSM.ent.customers[MSM.ent.customers.length - 1];
      c.budget = items.reduce((a, it) => a + MSM.econ.price(it.n), 0) *
        U.lerp(B.BUDGET[0], B.BUDGET[1], Math.random());
    },

    /** The next piece of the outfit they still have to find. */
    nextItem: (c) => c.items.find((it) => !it.got) || null,

    /** Called once a piece is in their hands — go on to the next, or fit. */
    afterPickup(c) {
      const next = K.nextItem(c);
      if (next) {
        c.want = next.n;
        c.lane = MSM.econ.prod(next.n).lane;
        c.phase = 'toLane';
        c.browseT = 0;
        return;
      }
      /* Everything in hand. A garment has to be tried on; a hatful of
         accessories goes straight to the till. */
      c.phase = c.items.some((it) => MSM.econ.prod(it.n).garment) ? 'toRoom' : 'decide';
    },

    stepCustomer(c, k, dt) {
      const spd = CFG.CUSTOMER_SPEED;
      const prod = MSM.econ.prod(c.want);
      const ps = MSM.econ.pstate(c.want);

      if (c.verdictT > 0) c.verdictT -= dt;

      /* Patience runs while they are being made to wait, and only then:
         holding out for a size, queueing for a cubicle, or stood at the till.
         Time behind the curtain is theirs. */
      const fuse = c.phase === 'ask' ? B.ASK_PATIENCE : B.PATIENCE;
      const stuck = c.phase === 'ask' || c.phase === 'wait' ||
                    ((c.phase === 'queue' || c.phase === 'toQueue') &&
                     c.queueT > B.QUEUE_GRACE);
      if (stuck) {
        c.patience -= dt / fuse;
        if (c.patience <= 0) { K.walkout(c); return; }
      }

      switch (c.phase) {
        case 'in':
          if (W.seek(c, c.lane, P.walkway, spd, dt, false)) c.phase = 'toRack';
          break;

        case 'toLane':
          if (W.seek(c, c.lane, c.y, spd, dt, false)) c.phase = 'toRack';
          break;

        case 'toRack':
          if (W.seek(c, prod.browse.x, prod.browse.y, spd, dt, false)) {
            c.phase = 'browse';
            c.browseT = 0;
          }
          break;

        /* At the rail. The stage in one branch: a full rail with none of
           THEIR size on it is an empty rail, and that is when they ask. */
        case 'browse': {
          c.moving = false;
          const it = c.items.find((o) => !o.got && o.n === c.want);
          if (!it) { K.afterPickup(c); break; }

          const have = prod.garment
            ? MSM.econ.sizeStock(c.want, c.size) : ps.shelf;
          if (have <= 0) {
            c.mood = 'wait';
            c.need = it;
            c.phase = 'ask';
            MSM.render.pop(c.x, c.y, 1.8,
              '📏 ' + (prod.garment ? B.SIZES[c.size] + '?' : '?'), '#FFB020');
            break;
          }

          c.mood = 'want';
          c.browseT += dt;
          if (c.browseT < B.BROWSE_TIME) break;

          ps.shelf--;
          if (prod.garment) MSM.econ.bstate().racks[c.want][c.size]--;
          it.got = true;
          c.carry = c.items.filter((o) => o.got).length;
          c.carryP = c.want;
          K.afterPickup(c);
          break;
        }

        /* Stood at the rail with their hand up. Somebody has to walk one out
           from the back — you, or the assistant you hired. */
        case 'ask':
          c.moving = false;
          c.mood = 'wait';
          /* It may have been restocked while they waited, which is the
             happiest way for this to end. */
          if (!prod.garment || MSM.econ.sizeStock(c.want, c.size) > 0) {
            c.need = null;
            c.claimed = false;
            c.phase = 'browse';
            c.browseT = 0;
          }
          break;

        case 'toRoom': {
          if (c.room < 0 && !K.claimRoom(c)) {
            // every cubicle is busy — go and stand in line for one
            if (c.spotIndex < 0) c.spotIndex = K.freeSpot();
            c.phase = 'wait';
            break;
          }
          const door = K.roomDoor(c.room);
          if (W.seek(c, door.x, door.y, spd, dt, false)) {
            c.spotIndex = -1;
            c.phase = 'fitting';
            c.hidden = true;
            c.fitT = 0;
            c.fitDur = U.lerp(B.FIT_TIME[0], B.FIT_TIME[1], Math.random());
            const b = P.rooms[c.room].box;
            c.x = (b.x0 + b.x1) / 2;
            c.y = (b.y0 + b.y1) / 2;
          }
          break;
        }

        /* The bottleneck the shop lives or dies by. */
        case 'wait': {
          const s = P.waits[c.spotIndex] || P.waits[0];
          if (W.seek(c, s.x, s.y, spd, dt, false)) c.moving = false;
          if (K.claimRoom(c)) c.phase = 'toRoom';
          break;
        }

        case 'fitting': {
          c.moving = false;
          c.fitT += dt;
          if (c.fitT < c.fitDur) break;
          // back out through the curtain, and then make their mind up
          const door = K.roomDoor(c.room);
          c.hidden = false;
          c.x = door.x;
          c.y = door.y;
          c.room = -1;
          K.decide(c, true);
          break;
        }

        /* An armful of accessories never sees a cubicle — a cap does not need
           trying on — so they make their mind up on the spot. */
        case 'decide':
          c.moving = false;
          K.decide(c, false);
          break;

        /* They have decided to buy. A full till is not a reason to put it all
           back — they wait at the back of the line like anybody would, and
           their patience runs while they do. */
        case 'toQueue': {
          if (MSM.ent.queue.indexOf(c) < 0) {
            if (MSM.ent.queue.length >= P.queue.length) {
              c.queueT += dt;
              const last = P.queue[P.queue.length - 1];
              W.seek(c, last.x, last.y + 0.7, spd, dt, false);
              break;
            }
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

        case 'leave':
          if (W.seek(c, P.entrance.x, P.entrance.y + 0.6, spd, dt, false)) {
            K.forget(c);
            MSM.ent.customers.splice(k, 1);
          }
          break;
      }
    },

    /**
     * Did it suit them? A cubicle is worth a lot, and so is having been
     * handed the size you asked for — that is service, and it sells.
     */
    decide(c, fitted) {
      const bs = MSM.econ.bstate();
      const total = c.items.reduce((a, it) => a + MSM.econ.price(it.n), 0);
      if (total > c.budget) { K.no(c, 'costly'); return; }

      const chance = Math.min(B.MAX_BUY,
        B.BASE_BUY +
        (fitted ? B.FIT_BONUS : 0) +
        (c.helped ? B.HELP_BONUS : 0) +
        B.LEVEL_BONUS * c.items.reduce(
          (a, it) => a + (MSM.econ.pstate(it.n).level - 1), 0));
      if (Math.random() > chance) { K.no(c, 'meh'); return; }

      K.tally(c, 'sold');
      c.verdict = 'buy';
      c.verdictT = 1.8;
      c.mood = 'happy';
      c.got = c.items.length;
      c.total = total;
      c.phase = 'toQueue';
      MSM.render.pop(c.x, c.y, 1.9, '😊', '#2CA85C');
    },

    /* A no. Everything they were carrying goes back on its own rail, in the
       size it came off — a shop floor conserves stock even when it loses the
       sale. */
    /* One shopper is one outcome. Without this a customer who decides to buy
       and then runs out of patience at a busy till lands in BOTH columns and
       the conversion figure quietly stops meaning anything. */
    tally(c, key) {
      if (c.counted) return;
      c.counted = true;
      MSM.econ.bstate()[key]++;
    },

    no(c, why) {
      K.restock(c);
      K.tally(c, 'lost');
      c.verdict = why || 'meh';
      c.verdictT = 2.0;
      c.mood = 'want';
      c.phase = 'leave';
      MSM.render.pop(c.x, c.y, 1.9, why === 'costly' ? '😕' : '😞', '#E0553F');
    },

    /** Put back whatever they are holding, by size. */
    restock(c) {
      const bs = MSM.econ.bstate();
      c.items.forEach((it) => {
        if (!it.got) return;
        const ps = MSM.econ.pstate(it.n);
        if (ps.shelf >= CFG.SHELF_CAP) return;
        ps.shelf++;
        if (MSM.econ.prod(it.n).garment) bs.racks[it.n][c.size]++;
        it.got = false;
      });
      c.carry = 0;
      c.carryP = -1;
    },

    /** Out of patience — waiting on a size, or waiting for a cubicle. */
    walkout(c) {
      K.restock(c);
      K.tally(c, 'lost');
      K.forget(c);
      c.mood = 'angry';
      c.verdict = '';
      c.phase = 'leave';
      c.patience = 0;
      MSM.render.pop(c.x, c.y, 1.5, '😡', '#E0553F');
    },

    forget(c) {
      const q = MSM.ent.queue.indexOf(c);
      if (q >= 0) MSM.ent.queue.splice(q, 1);
      c.need = null;
      c.claimed = false;
      c.room = -1;
      c.spotIndex = -1;
      c.hidden = false;
    },

    /** The one-line hint the HUD shows while you are learning the shop. */
    guide() {
      const ss = MSM.econ.sstate(), bs = ss.boutique;
      if (!ss.till) return MSM.t('fit.gCounter');
      if (!ss.open) return MSM.t('fit.gOpen');

      const ask = MSM.ent.customers.find((c) => K.asking(c));
      if (ask) {
        return MSM.t('fit.gSize', {
          size: B.SIZES[ask.size], name: MSM.econ.prod(ask.need.n).name });
      }
      if (MSM.ent.customers.some((c) => c.phase === 'wait')) return MSM.t('fit.gRoom');
      if (bs.rooms.some((r) => !r.built)) return MSM.t('fit.gBuildRoom');
      return '';
    },
  };
})();
