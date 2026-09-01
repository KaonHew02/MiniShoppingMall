/* HUD, bottom sheets and toasts. The canvas owns the world; this file owns
   everything made of DOM.

   Every visible string goes through t() — see src/i18n.js. Names (stores,
   products, the bed a product comes from) do not: i18n.js has already written
   the active language into MSM.CFG, so prod.name is whatever the player set. */
window.MSM = window.MSM || {};

(function () {
  const U = MSM.util, CFG = MSM.CFG;
  const $ = (id) => document.getElementById(id);
  const t = (key, p) => MSM.t(key, p);

  const UI = MSM.ui = {
    mode: null,
    arg: null,
    buyMode: 1,
    _html: '',
    _touchedAt: 0,

    init() {
      $('btn-products').onclick = () => UI.open('products');
      $('btn-staff').onclick    = () => UI.open('staff');
      $('btn-map').onclick      = () => UI.open('map');
      $('btn-boost').onclick    = () => UI.open('boost');
      $('btn-settings').onclick = () => UI.open('settings');
      $('sheet-close').onclick  = () => UI.close();
      $('scrim').onclick        = () => UI.close();

      const body = $('sheet-body');
      body.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        UI.action(el.dataset.act, el.dataset.i !== undefined ? +el.dataset.i : null);
      });
      const touched = () => { UI._touchedAt = performance.now(); };
      body.addEventListener('pointerdown', touched);
      body.addEventListener('scroll', touched, { passive: true });
    },

    open(mode, arg) {
      this.mode = mode; this.arg = arg;
      $('sheet-title').textContent = ({
        products: MSM.econ.store().name, staff: t('title.staff'), map: t('title.map'),
        boost: t('title.boost'), settings: t('title.settings'), offline: t('title.offline'),
      })[mode] || '';
      $('scrim').hidden = false;
      $('sheet').hidden = false;
      this.body(true);
    },

    close() {
      this.mode = null;
      $('scrim').hidden = true;
      $('sheet').hidden = true;
    },

    toast(msg) {
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      $('toasts').appendChild(el);
      setTimeout(() => el.remove(), 1900);
    },

    action(act, i) {
      switch (act) {
        case 'upgrade': MSM.game.upgrade(i, this.buyMode); break;
        case 'stocker': MSM.game.hireStocker(); break;
        case 'cashier': MSM.game.hireCashier(); break;
        case 'barista':
        case 'chef':
        case 'server':
        case 'cleaner': MSM.game.hireCafe(act); break;
        case 'advisor': MSM.game.hireAdvisor(); break;
        case 'assistant': MSM.game.hireAssistant(); break;
        case 'techadvisor': MSM.game.hireTechAdvisor(); break;
        case 'machine': MSM.game.upgradeMachine(i); break;
        case 'unlock':  MSM.game.unlockStore(i); return;
        case 'travel':  MSM.game.travel(i); return;
        case 'boost':   MSM.game.boost(); break;
        case 'buymode': this.buyMode = i === 2 ? 'max' : i === 1 ? 10 : 1; break;
        case 'close':   this.close(); return;
        case 'save':    MSM.save(); this.toast(t('toast.saved')); return;
        case 'export':  MSM.backup.exportFile(); return;
        case 'import':  MSM.backup.importFile(); return;
        case 'push':    MSM.drive.push(true); return;
        case 'pull':    MSM.drive.pull(); return;
        case 'auto':    MSM.drive.setAuto(!MSM.drive.auto()); break;
        // setLang redraws the sheet itself, so there is nothing to do after
        case 'lang':    MSM.i18n.setLang((MSM.i18n.LANGS[i] || {}).id); return;
        case 'reset':
          if (confirm(t('confirm.reset'))) {
            MSM.reset(); MSM.world.invalidate(); MSM.ent.reset();
            this.close(); this.toast(t('toast.reset'));
          }
          return;
      }
      this.body(true);
    },

    tick() {
      const s = MSM.state, p = MSM.econ.progress();
      $('cash').textContent = U.money(s.cash);
      $('gems').textContent = U.money(s.gems);
      $('level-num').textContent = p.level;
      $('level-text').textContent = `${U.money(p.have)}/${U.money(p.need)}`;
      $('level-fill').style.width = (p.pct * 100).toFixed(1) + '%';
      $('store-name').textContent = MSM.econ.store().name;

      const ss = MSM.econ.sstate();
      let up = 0;
      MSM.econ.store().products.forEach((_, n) => {
        if (s.cash >= MSM.econ.upgradeCost(n, 1)) up++;
      });
      let hire = 0;
      if (ss.stockers < CFG.MAX_STOCKERS &&
          s.cash >= MSM.econ.store().stockerCost(ss.stockers)) hire++;
      if (!ss.cashier && s.cash >= MSM.econ.store().cashierCost) hire++;
      if (ss.cafe) {
        ['barista', 'chef', 'server', 'cleaner'].forEach((j) => {
          if (!ss.cafe[j] && s.cash >= MSM.game.cafeCost(j)) hire++;
        });
      }
      if (ss.sports && !ss.sports.advisor && s.cash >= MSM.game.advisorCost()) hire++;
      if (ss.boutique && !ss.boutique.assistant && s.cash >= MSM.game.assistantCost()) hire++;
      if (ss.tech && !ss.tech.advisor && s.cash >= MSM.game.techAdvisorCost()) hire++;
      let maps = 0;
      s.stores.forEach((st, i) => { if (!st.owned && s.cash >= CFG.STORES[i].unlock) maps++; });
      badge('badge-products', up);
      badge('badge-staff', hire);
      badge('badge-map', maps);

      // what is in your arms, one chip per product type
      const pl = MSM.ent.player, carry = $('carry');
      if (pl && pl.hold && pl.hold.length) {
        const counts = {};
        pl.hold.forEach((n) => { counts[n] = (counts[n] || 0) + 1; });
        carry.hidden = false;
        carry.textContent = Object.keys(counts)
          .map((n) => `${MSM.econ.prod(+n).glyph} ${counts[n]}`).join('   ') +
          `   (${pl.hold.length}/${CFG.CARRY_CAP})`;
      } else carry.hidden = true;

      // the tutorial's one-line instruction
      const obj = $('objective');
      if (MSM.game.tutText) { obj.hidden = false; obj.textContent = MSM.game.tutText; }
      else obj.hidden = true;

      const banner = $('boost-banner');
      if (MSM.econ.boosting()) {
        banner.hidden = false;
        $('boost-time').textContent = Math.ceil((s.boostUntil - Date.now()) / 1000) + 's';
      } else banner.hidden = true;

      if (this.mode) this.body(false);
    },

    body(force) {
      if (!this.mode) return;
      if (!force && performance.now() - this._touchedAt < 700) return;

      const html = ({
        products: productsBody, staff: staffBody, map: mapBody,
        boost: boostBody, settings: settingsBody, offline: offlineBody,
      }[this.mode])(this.arg);
      if (!force && html === this._html) return;

      const el = $('sheet-body');
      const keep = el.scrollTop;
      this._html = html;
      el.innerHTML = html;
      el.scrollTop = keep;
    },
  };

  function badge(id, n) {
    const el = document.getElementById(id);
    el.hidden = n <= 0;
    el.textContent = n;
  }

  const chip = (glyph, color) =>
    `<div class="row-ico" style="background:${U.shade(color, 0.5)}">${glyph}</div>`;

  /* An emoji is a picture of a tomato drawn by whoever made the font. The
     shelf already has our own tomato, so the list shows THAT — the same
     painter the world uses, rendered once per product into a data URL and
     kept. Keyed on the tint too, so a recoloured product repaints. */
  const thumbs = {};
  function thumb(prod, px) {
    px = px || 52;
    const key = prod.art + '|' + prod.color + '|' + px;
    if (thumbs[key]) return thumbs[key];
    const dpr = Math.min(devicePixelRatio || 1, 3);
    const cv = document.createElement('canvas');
    cv.width = px * dpr; cv.height = px * dpr;
    const c = cv.getContext('2d');

    const ax = px / 2, ay = px * 0.9, S = px * 0.8;
    const paint = (s, bx, by) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, px, px);
      MSM.art.draw(c, prod.art, bx, by, s, prod.color);
    };

    /* Painters stand their item ON the baseline, and they are all different
       heights — a loaf of bread ended up stranded in the bottom corner while
       a carton filled the tile. Paint once, measure the ink, then repaint it
       centred and scaled to fill, so every tile in the list matches. */
    paint(S, ax, ay);
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let p = 0; p < cv.width * cv.height; p++) {
      if (d[p * 4 + 3] < 10) continue;
      const ix = p % cv.width, iy = (p / cv.width) | 0;
      if (ix < x0) x0 = ix;
      if (ix > x1) x1 = ix;
      if (iy < y0) y0 = iy;
      if (iy > y1) y1 = iy;
    }
    if (x1 > x0 && y1 > y0) {
      const pad = px * 0.1;
      const k = Math.min((px - pad * 2) / ((x1 - x0 + 1) / dpr),
                         (px - pad * 2) / ((y1 - y0 + 1) / dpr));
      const cxIn = (x0 + x1 + 1) / (2 * dpr), cyIn = (y0 + y1 + 1) / (2 * dpr);
      paint(S * k, px / 2 - (cxIn - ax) * k, px / 2 - (cyIn - ay) * k);
    }
    return (thumbs[key] = cv.toDataURL());
  }

  const artChip = (prod) =>
    `<div class="row-ico art" style="background:radial-gradient(circle at 50% 34%,#fff 4%,${
      U.shade(prod.color, 0.72)} 100%)"><img src="${thumb(prod)}" alt=""></div>`;

  const meter = (kind, label, have, cap) =>
    `<div class="meter ${kind}"><i style="width:${Math.round(
      U.clamp(have / cap, 0, 1) * 100)}%"></i><span>${label} ${have}/${cap}</span></div>`;

  /* ------------------------------------------------------------- bodies */
  /* The coffee shop's list is a different animal: six ingredients with a
     crate and a storage level, ten recipes with what each one takes, and the
     three machines that turn the first into the second. */
  function cafeProductsBody() {
    const store = MSM.econ.store(), ss = MSM.econ.sstate(), cs = ss.cafe;
    const cash = MSM.state.cash;

    const seg = [t('buy.1'), t('buy.10'), t('buy.max')].map((l, k) => {
      const on = (k === 0 && UI.buyMode === 1) || (k === 1 && UI.buyMode === 10) ||
                 (k === 2 && UI.buyMode === 'max');
      return `<button class="${on ? 'on' : ''}" data-act="buymode" data-i="${k}">${l}</button>`;
    }).join('');

    const machines = store.plan.machines.map((spec, mi) => {
      const ms = cs.machines[mi];
      if (!ms.built) {
        return `<div class="row locked">${chip('🔒', '#B07A4E')}
          <div class="row-main">
            <div class="row-name">${spec.label}</div>
            <div class="row-sub">${t('cafe.machineLocked', {
              cost: '$' + U.money(spec.cost) })}</div>
          </div>
        </div>`;
      }
      const info = MSM.econ.machine(mi);
      const cost = MSM.econ.machineCost(mi);
      return `<div class="row">${chip('⚙️', '#B07A4E')}
        <div class="row-main">
          <div class="row-name">${spec.label}<span class="lvl">${t('lv', { n: ms.level })}</span></div>
          <div class="row-sub">${t('cafe.machineSub', {
            cap: info.cap, sp: info.speed.toFixed(2) })}</div>
        </div>
        <button class="btn" data-act="machine" data-i="${mi}" ${cash >= cost ? '' : 'disabled'}>
          ${t('btn.upgrade', { n: 1 })}<small>$${U.money(cost)}</small></button>
      </div>`;
    }).join('');

    const rows = store.products.map((prod, n) => {
      const ps = MSM.econ.pstate(n);
      if (!ps.built) {
        const next = MSM.econ.nextBuild() === n;
        return `<div class="row prod locked">${artChip(prod)}
          <div class="row-main">
            <div class="row-name">${prod.name}</div>
            <div class="row-sub">${next
              ? t('prod.build', { cost: '$' + U.money(prod.buildCost) })
              : t('prod.later')}</div>
          </div>
        </div>`;
      }
      const count = UI.buyMode === 'max' ? Math.max(1, MSM.econ.maxBuy(n, cash)) : UI.buyMode;
      const cost = MSM.econ.upgradeCost(n, count);

      const line = prod.ingredient
        ? t('cafe.stock', { sec: MSM.econ.restock(n).toFixed(2) })
        : t('cafe.brew', {
            price: '$' + U.money(MSM.econ.price(n)),
            sec: MSM.econ.brewTime(n).toFixed(2),
          });
      const detail = prod.ingredient
        ? `<div class="meters">
             ${meter('shelf', t('meter.storage'), ps.shelf, CFG.SHELF_CAP)}
             ${meter('crate', t('meter.crate'), ps.out, CFG.CRATE_CAP)}
           </div>`
        : `<div class="row-sub">${t('cafe.recipe')} ${prod.needs
             .map((rq) => store.products[rq.n].glyph + (rq.qty > 1 ? '×' + rq.qty : ''))
             .join(' ')} · ${store.plan.machines[prod.machineIndex].label}</div>`;

      return `<div class="row prod">${artChip(prod)}
        <div class="row-main">
          <div class="row-name">${prod.name}<span class="lvl">${t('lv', { n: ps.level })}</span></div>
          <div class="row-sub">${line}</div>
          ${detail}
        </div>
        <button class="btn" data-act="upgrade" data-i="${n}" ${cash >= cost ? '' : 'disabled'}>
          ${t('btn.upgrade', { n: count })}<small>$${U.money(cost)}</small></button>
      </div>`;
    }).join('');

    return `<div class="hint">${t('cafe.hint')}</div>
      <div class="seg">${seg}</div>${machines}${rows}`;
  }

  /* The sport outlet's list leads with the courts, because whether a line
     has one is the single biggest thing about whether it sells. */
  function sportsProductsBody() {
    const store = MSM.econ.store(), ss = MSM.econ.sstate(), sp = ss.sports;
    const cash = MSM.state.cash;

    const seg = [t('buy.1'), t('buy.10'), t('buy.max')].map((l, k) => {
      const on = (k === 0 && UI.buyMode === 1) || (k === 1 && UI.buyMode === 10) ||
                 (k === 2 && UI.buyMode === 'max');
      return `<button class="${on ? 'on' : ''}" data-act="buymode" data-i="${k}">${l}</button>`;
    }).join('');

    const courts = store.plan.areas.map((spec, ai) => {
      const as = sp.areas[ai];
      return `<div class="row${as.built ? '' : ' locked'}">${chip(as.built ? '🧪' : '🔒', '#8B62FF')}
        <div class="row-main">
          <div class="row-name">${spec.label}</div>
          <div class="row-sub">${as.built
            ? t('sport.courtOn')
            : t('sport.courtOff', { cost: '$' + U.money(spec.cost) })}</div>
        </div>
      </div>`;
    }).join('');

    const rows = store.products.map((prod, n) => {
      const ps = MSM.econ.pstate(n);
      if (!ps.built) {
        const next = MSM.econ.nextBuild() === n;
        return `<div class="row prod locked">${artChip(prod)}
          <div class="row-main">
            <div class="row-name">${prod.name}</div>
            <div class="row-sub">${next
              ? t('prod.build', { cost: '$' + U.money(prod.buildCost) })
              : t('prod.later')}</div>
          </div>
        </div>`;
      }
      const count = UI.buyMode === 'max' ? Math.max(1, MSM.econ.maxBuy(n, cash)) : UI.buyMode;
      const cost = MSM.econ.upgradeCost(n, count);
      const court = MSM.econ.court(n);
      return `<div class="row prod">${artChip(prod)}
        <div class="row-main">
          <div class="row-name">${prod.name}<span class="lvl">${t('lv', { n: ps.level })}</span></div>
          <div class="row-sub">${t('prod.price', {
            price: '$' + U.money(MSM.econ.price(n)), sec: MSM.econ.restock(n).toFixed(2) })}</div>
          <div class="row-sub">${court
            ? t('sport.canTry', { p: Math.round(MSM.econ.closeRate(n) * 100) })
            : t('sport.noTry', { p: Math.round(MSM.econ.closeRate(n) * 100) })}</div>
          <div class="meters">
            ${meter('shelf', t('sport.rack'), ps.shelf, CFG.SHELF_CAP)}
            ${meter('crate', t('meter.crate'), ps.out, CFG.CRATE_CAP)}
          </div>
        </div>
        <button class="btn" data-act="upgrade" data-i="${n}" ${cash >= cost ? '' : 'disabled'}>
          ${t('btn.upgrade', { n: count })}<small>$${U.money(cost)}</small></button>
      </div>`;
    }).join('');

    return `<div class="hint">${t('sport.hint')}</div>
      <div class="seg">${seg}</div>${courts}${rows}`;
  }

  /* The boutique's list leads with the cubicles, then gives every garment
     its size breakdown — the one number a shop like this runs on. */
  function boutiqueProductsBody() {
    const store = MSM.econ.store(), bs = MSM.econ.sstate().boutique;
    const cash = MSM.state.cash;
    const B = CFG.BOUTIQUE;
    const rooms = MSM.econ.rooms();

    const seg = [t('buy.1'), t('buy.10'), t('buy.max')].map((l, k) => {
      const on = (k === 0 && UI.buyMode === 1) || (k === 1 && UI.buyMode === 10) ||
                 (k === 2 && UI.buyMode === 'max');
      return `<button class="${on ? 'on' : ''}" data-act="buymode" data-i="${k}">${l}</button>`;
    }).join('');

    const cubicles = `<div class="row">${chip('🚪', '#FF7BA6')}
      <div class="row-main">
        <div class="row-name">${t('fit.rooms')}</div>
        <div class="row-sub">${t('fit.roomsSub', {
          free: rooms.free, built: rooms.built, all: store.plan.rooms.length })}</div>
      </div>
    </div>` + store.plan.rooms.map((spec, k) => {
      if (bs.rooms[k].built) return '';
      return `<div class="row locked">${chip('🔒', '#FF7BA6')}
        <div class="row-main">
          <div class="row-name">${t('fit.roomN', { n: k + 1 })}</div>
          <div class="row-sub">${t('fit.roomOff', { cost: '$' + U.money(spec.cost) })}</div>
        </div>
      </div>`;
    }).join('');

    const rows = store.products.map((prod, n) => {
      const ps = MSM.econ.pstate(n);
      if (!ps.built) {
        const next = MSM.econ.nextBuild() === n;
        return `<div class="row prod locked">${artChip(prod)}
          <div class="row-main">
            <div class="row-name">${prod.name}</div>
            <div class="row-sub">${next
              ? t('prod.build', { cost: '$' + U.money(prod.buildCost) })
              : t('prod.later')}</div>
          </div>
        </div>`;
      }
      const count = UI.buyMode === 'max' ? Math.max(1, MSM.econ.maxBuy(n, cash)) : UI.buyMode;
      const cost = MSM.econ.upgradeCost(n, count);

      /* For a garment the useful line is not "8 on the rail" — it is which
         sizes those eight are. A zero here is somebody walking out. */
      const detail = prod.garment
        ? `<div class="row-sub">${t('fit.sizes')} ${bs.racks[n].map((v, k) =>
             `<b style="color:${v === 0 ? '#E0553F' : v <= 1 ? '#C98B00' : '#2CA85C'}">${
               B.SIZES[k]}&nbsp;${v}</b>`).join(' · ')}</div>`
        : `<div class="row-sub">${t('fit.noSize')}</div>`;

      return `<div class="row prod">${artChip(prod)}
        <div class="row-main">
          <div class="row-name">${prod.name}<span class="lvl">${t('lv', { n: ps.level })}</span></div>
          <div class="row-sub">${t('prod.price', {
            price: '$' + U.money(MSM.econ.price(n)), sec: MSM.econ.restock(n).toFixed(2) })}</div>
          ${detail}
          <div class="meters">
            ${meter('shelf', t('fit.rail'), ps.shelf, CFG.SHELF_CAP)}
            ${meter('crate', t('meter.crate'), ps.out, CFG.CRATE_CAP)}
          </div>
        </div>
        <button class="btn" data-act="upgrade" data-i="${n}" ${cash >= cost ? '' : 'disabled'}>
          ${t('btn.upgrade', { n: count })}<small>$${U.money(cost)}</small></button>
      </div>`;
    }).join('');

    return `<div class="hint">${t('fit.hint')}</div>
      <div class="seg">${seg}</div>${cubicles}${rows}`;
  }

  /* The techhub's list leads with the benches, then gives every product its
     spec sheet — the stars the comparison is fought over. */
  function techProductsBody() {
    const store = MSM.econ.store(), ts = MSM.econ.sstate().tech;
    const cash = MSM.state.cash;
    const T = CFG.TECH;

    const seg = [t('buy.1'), t('buy.10'), t('buy.max')].map((l, k) => {
      const on = (k === 0 && UI.buyMode === 1) || (k === 1 && UI.buyMode === 10) ||
                 (k === 2 && UI.buyMode === 'max');
      return `<button class="${on ? 'on' : ''}" data-act="buymode" data-i="${k}">${l}</button>`;
    }).join('');

    const benches = store.plan.areas.map((spec, ai) => {
      const as = ts.areas[ai];
      return `<div class="row${as.built ? '' : ' locked'}">${chip(as.built ? '🧪' : '🔒', '#4062D8')}
        <div class="row-main">
          <div class="row-name">${spec.label}</div>
          <div class="row-sub">${as.built
            ? t('tech.benchOn')
            : t('tech.benchOff', { cost: '$' + U.money(spec.cost) })}</div>
        </div>
      </div>`;
    }).join('');

    const rows = store.products.map((prod, n) => {
      const ps = MSM.econ.pstate(n);
      if (!ps.built) {
        const next = MSM.econ.nextBuild() === n;
        return `<div class="row prod locked">${artChip(prod)}
          <div class="row-main">
            <div class="row-name">${prod.name}</div>
            <div class="row-sub">${next
              ? t('prod.build', { cost: '$' + U.money(prod.buildCost) })
              : t('prod.later')}</div>
          </div>
        </div>`;
      }
      const count = UI.buyMode === 'max' ? Math.max(1, MSM.econ.maxBuy(n, cash)) : UI.buyMode;
      const cost = MSM.econ.upgradeCost(n, count);

      const specs = Object.keys(prod.specs || {})
        .sort((a, z) => prod.specs[z] - prod.specs[a])
        .map((s) => `${T.STATS[s]} ${'★'.repeat(prod.specs[s])}`)
        .join(' · ');
      const bench = MSM.econ.bench(n);

      return `<div class="row prod">${artChip(prod)}
        <div class="row-main">
          <div class="row-name">${prod.name}<span class="lvl">${t('lv', { n: ps.level })}</span></div>
          <div class="row-sub">${t('prod.price', {
            price: '$' + U.money(MSM.econ.price(n)), sec: MSM.econ.restock(n).toFixed(2) })}</div>
          <div class="row-sub">${specs}${bench ? '' : ' · ' + t('tech.cold')}</div>
          <div class="meters">
            ${meter('shelf', t('tech.boxes'), ps.shelf, CFG.SHELF_CAP)}
            ${meter('crate', t('meter.crate'), ps.out, CFG.CRATE_CAP)}
          </div>
        </div>
        <button class="btn" data-act="upgrade" data-i="${n}" ${cash >= cost ? '' : 'disabled'}>
          ${t('btn.upgrade', { n: count })}<small>$${U.money(cost)}</small></button>
      </div>`;
    }).join('');

    return `<div class="hint">${t('tech.hint')}</div>
      <div class="seg">${seg}</div>${benches}${rows}`;
  }

  function productsBody() {
    if (MSM.cafe.active()) return cafeProductsBody();
    if (MSM.sports.active()) return sportsProductsBody();
    if (MSM.boutique.active()) return boutiqueProductsBody();
    if (MSM.tech.active()) return techProductsBody();
    const seg = [t('buy.1'), t('buy.10'), t('buy.max')].map((l, k) => {
      const on = (k === 0 && UI.buyMode === 1) || (k === 1 && UI.buyMode === 10) || (k === 2 && UI.buyMode === 'max');
      return `<button class="${on ? 'on' : ''}" data-act="buymode" data-i="${k}">${l}</button>`;
    }).join('');

    const rows = MSM.econ.store().products.map((prod, n) => {
      const ps = MSM.econ.pstate(n), cash = MSM.state.cash;
      if (!ps.built) {
        const next = MSM.econ.nextBuild() === n;
        return `<div class="row prod locked">${artChip(prod)}
          <div class="row-main">
            <div class="row-name">${prod.name}</div>
            <div class="row-sub">${next
              ? t('prod.build', { cost: '$' + U.money(prod.buildCost) })
              : t('prod.later')}</div>
          </div>
        </div>`;
      }
      const count = UI.buyMode === 'max' ? Math.max(1, MSM.econ.maxBuy(n, cash)) : UI.buyMode;
      const cost = MSM.econ.upgradeCost(n, count);
      const ms = MSM.econ.nextMilestone(ps.level);
      return `<div class="row prod">${artChip(prod)}
        <div class="row-main">
          <div class="row-name">${prod.name}<span class="lvl">${t('lv', { n: ps.level })}</span></div>
          <div class="row-sub">${t('prod.price', {
            price: '$' + U.money(MSM.econ.price(n)), sec: MSM.econ.restock(n).toFixed(2) })}${
            ms ? t('prod.next', { n: ms.lvl }) : t('prod.maxed')}</div>
          <div class="meters">
            ${meter('shelf', t('meter.shelf'), ps.shelf, CFG.SHELF_CAP)}
            ${meter('crate', t('meter.crate'), ps.out, CFG.CRATE_CAP)}
          </div>
        </div>
        <button class="btn" data-act="upgrade" data-i="${n}" ${cash >= cost ? '' : 'disabled'}>
          ${t('btn.upgrade', { n: count })}<small>$${U.money(cost)}</small></button>
      </div>`;
    }).join('');

    return `<div class="seg">${seg}</div>${rows}`;
  }

  function staffBody() {
    const store = MSM.econ.store(), ss = MSM.econ.sstate(), cash = MSM.state.cash;
    const cs = ss.cafe, sp = ss.sports, bs = ss.boutique, ts = ss.tech;
    const row = (glyph, bg, name, sub, hired, act, cost) => `<div class="row">
      <div class="row-ico" style="background:${bg}">${glyph}</div>
      <div class="row-main">
        <div class="row-name">${name}</div>
        <div class="row-sub">${sub}</div>
      </div>
      ${hired
        ? `<button class="btn" disabled>${t('btn.hired')}</button>`
        : `<button class="btn ${act === 'cashier' ? 'gold' : 'pink'}" data-act="${act}" ${cash >= cost ? '' : 'disabled'}>
             ${t('btn.hire')}<small>$${U.money(cost)}</small></button>`}
    </div>`;

    /* The cafe's four extra jobs. Each one is a whole step of the loop you
       stop having to do yourself. */
    const cafeRows = !cs ? '' :
      row('☕', '#FFE0C4', t('staff.barista'),
          cs.barista ? t('staff.baristaOn') : t('staff.baristaOff'),
          cs.barista, 'barista', MSM.game.cafeCost('barista')) +
      row('👨‍🍳', '#FFD9C9', t('staff.chef'),
          cs.chef ? t('staff.chefOn') : t('staff.chefOff'),
          cs.chef, 'chef', MSM.game.cafeCost('chef')) +
      row('🫖', '#D6ECFB', t('staff.server'),
          cs.server ? t('staff.serverOn') : t('staff.serverOff'),
          cs.server, 'server', MSM.game.cafeCost('server')) +
      row('🧹', '#EDE4FF', t('staff.cleaner'),
          cs.cleaner ? t('staff.cleanerOn') : t('staff.cleanerOff'),
          cs.cleaner, 'cleaner', MSM.game.cafeCost('cleaner')) +
      `<div class="row">
        <div class="row-ico" style="background:#FFF3D6">💛</div>
        <div class="row-main">
          <div class="row-name">${t('cafe.tipsName')}</div>
          <div class="row-sub">${t('cafe.tipsSub', {
            n: '$' + U.money(cs.tips), c: cs.walkouts })}</div>
        </div>
      </div>`;

    /* Stage 3's single hire, and the number that says whether the shop floor
       is actually working: how many of the people who came in bought. */
    const sportRows = !sp ? '' :
      row('🧑‍💼', '#D6F2EE', t('staff.advisor'),
          sp.advisor ? t('staff.advisorOn') : t('staff.advisorOff'),
          sp.advisor, 'advisor', MSM.game.advisorCost()) +
      `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">📊</div>
        <div class="row-main">
          <div class="row-name">${t('sport.convName')}</div>
          <div class="row-sub">${t('sport.convSub', {
            p: Math.round(MSM.econ.conversion() * 100),
            n: sp.bought, r: sp.rejected, w: sp.walkouts })}</div>
        </div>
      </div>`;

    /* Stage 4's hire, and the two numbers that say whether the floor is
       coping: how many sizes were fetched, and how many cubicles are free. */
    const fitRows = !bs ? '' :
      row('🧑‍💼', '#FCDCE8', t('staff.assistant'),
          bs.assistant ? t('staff.assistantOn') : t('staff.assistantOff'),
          bs.assistant, 'assistant', MSM.game.assistantCost()) +
      `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">📊</div>
        <div class="row-main">
          <div class="row-name">${t('fit.convName')}</div>
          <div class="row-sub">${t('fit.convSub', {
            p: Math.round(MSM.econ.fitConversion() * 100),
            n: bs.sold, l: bs.lost, f: bs.fetched })}</div>
        </div>
      </div>`;

    /* Stage 5's hire, and its scoreboard: how many walked out with a box,
       and how much of that the demos and the advice did. */
    const techRows = !ts ? '' :
      row('🧑‍💼', '#D9E2FB', t('staff.techAdvisor'),
          ts.advisor ? t('staff.techAdvisorOn') : t('staff.techAdvisorOff'),
          ts.advisor, 'techadvisor', MSM.game.techAdvisorCost()) +
      `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">📊</div>
        <div class="row-main">
          <div class="row-name">${t('tech.convName')}</div>
          <div class="row-sub">${t('tech.convSub', {
            p: Math.round(MSM.econ.techConversion() * 100),
            n: ts.sold, l: ts.lost, c: ts.compared, a: ts.advised })}</div>
        </div>
      </div>`;

    return `<div class="hint">${t(cs ? 'staff.cafeHint' : sp ? 'staff.sportHint'
                                  : bs ? 'staff.fitHint' : ts ? 'staff.techHint' : 'staff.hint',
                                  { store: store.name })}</div>` +
      row('📦', '#FFE9D6', t(cs ? 'staff.runners' : 'staff.stockers',
          { a: ss.stockers, b: CFG.MAX_STOCKERS }),
          ss.stockers
            ? t(cs ? 'staff.runnersOn' : 'staff.stockersOn', { n: ss.stockers })
            : t(cs ? 'staff.runnersOff' : 'staff.stockersOff'),
          ss.stockers >= CFG.MAX_STOCKERS, 'stocker', store.stockerCost(ss.stockers)) +
      row('🧾', '#FFE9AE', t('staff.cashier'),
          ss.cashier ? t(cs ? 'staff.orderTakerOn' : 'staff.cashierOn')
                     : t(cs ? 'staff.orderTakerOff' : 'staff.cashierOff'),
          ss.cashier, 'cashier', store.cashierCost) +
      cafeRows + sportRows + fitRows + techRows +
      `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">📈</div>
        <div class="row-main">
          <div class="row-name">${t('staff.rate')}</div>
          <div class="row-sub">$${U.money(MSM.econ.storeRate(MSM.state.current))}/s</div>
        </div>
      </div>`;
  }

  function mapBody() {
    const cash = MSM.state.cash;
    const rows = CFG.STORES.map((store, i) => {
      const ss = MSM.state.stores[i];
      const here = i === MSM.state.current;
      if (!ss.owned) {
        return `<div class="row locked">${chip('🔒', store.color)}
          <div class="row-main">
            <div class="row-name">${store.name}</div>
            <div class="row-sub">${store.products.map((p) => p.glyph).join(' ')} · ${
              t('map.products', { n: store.products.length })}</div>
          </div>
          <button class="btn gold" data-act="unlock" data-i="${i}" ${cash >= store.unlock ? '' : 'disabled'}>
            ${t('btn.unlock')}<small>$${U.money(store.unlock)}</small></button>
        </div>`;
      }
      const rate = MSM.econ.storeRate(i);
      return `<div class="row">${chip(store.glyph, store.color)}
        <div class="row-main">
          <div class="row-name">${store.name}${
            here ? ` <span style="color:#2CA85C">${t('map.here')}</span>` : ''}</div>
          <div class="row-sub">${store.products.map((p) => p.glyph).join(' ')}</div>
          <div class="row-sub">${rate > 0
            ? t('map.earning', { n: '$' + U.money(rate) })
            : t('map.needs')}</div>
        </div>
        ${here
          ? `<button class="btn" disabled>${t('btn.youAreHere')}</button>`
          : `<button class="btn" data-act="travel" data-i="${i}">${t('btn.travel')}</button>`}
      </div>`;
    }).join('');
    return `<div class="hint">${t('map.hint')}</div>${rows}`;
  }

  function boostBody() {
    const b = CFG.BOOST, s = MSM.state, on = MSM.econ.boosting();
    return `<div class="hint">${t('boost.hint', { n: CFG.GEMS_PER_LEVEL })}</div>
      <div class="row">
        <div class="row-ico" style="background:#EDE4FF">⚡</div>
        <div class="row-main">
          <div class="row-name">${t('boost.name', { n: b.mult })}</div>
          <div class="row-sub">${on
            ? t('boost.active', { n: Math.ceil((s.boostUntil - Date.now()) / 1000) })
            : t('boost.sub', { n: b.seconds })}</div>
        </div>
        <button class="btn gem" data-act="boost" ${s.gems >= b.gems && !on ? '' : 'disabled'}>
          ${on ? t('btn.active') : t('btn.activate')}<small>${b.gems} 💎</small></button>
      </div>`;
  }

  /* The language picker. Switching rewrites every name in MSM.CFG and reopens
     this sheet, so the change is visible before the button springs back. */
  function langRows() {
    const seg = MSM.i18n.LANGS.map((l, k) =>
      `<button class="${l.id === MSM.i18n.lang ? 'on' : ''}" data-act="lang" data-i="${k}">${l.label}</button>`
    ).join('');
    return `<div class="row">
        <div class="row-ico" style="background:#E7EEFB">🌐</div>
        <div class="row-main">
          <div class="row-name">${t('set.lang')}</div>
          <div class="row-sub">${t('set.langSub')}</div>
        </div>
      </div>
      <div class="seg seg-wrap">${seg}</div>`;
  }

  function settingsBody() {
    const s = MSM.state;
    return `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">💰</div>
        <div class="row-main">
          <div class="row-name">${t('set.earned')}</div>
          <div class="row-sub">${t('set.earnedSub', {
            n: '$' + U.money(s.totalEarned), c: s.served })}</div>
        </div>
      </div>
      ${langRows()}
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">🎮</div>
        <div class="row-main">
          <div class="row-name">${t('set.controls')}</div>
          <div class="row-sub">${t('set.controlsSub')}</div>
        </div>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">💾</div>
        <div class="row-main">
          <div class="row-name">${t('set.save')}</div>
          <div class="row-sub">${t('set.saveSub')}</div>
        </div>
        <button class="btn" data-act="save">${t('btn.saveNow')}</button>
      </div>
      ${driveRows()}
      <div class="row">
        <div class="row-ico" style="background:#FFE4E9">⚠️</div>
        <div class="row-main">
          <div class="row-name">${t('set.reset')}</div>
          <div class="row-sub">${t('set.resetSub')}</div>
        </div>
        <button class="btn pink" data-act="reset">${t('btn.reset')}</button>
      </div>`;
  }

  /* Backup + Drive. Export/Import work anywhere; Drive needs a real origin
     and a client ID, so it says so plainly rather than failing oddly. */
  function driveRows() {
    const D = MSM.drive;
    const stamped = D.lastPush();
    const when = stamped ? new Date(stamped).toLocaleString() : '';

    const files = `<div class="row">
        <div class="row-ico" style="background:#E7EEFB">📤</div>
        <div class="row-main">
          <div class="row-name">${t('bk.file')}</div>
          <div class="row-sub">${t('bk.fileSub')}</div>
        </div>
        <button class="btn" data-act="export">${t('btn.export')}</button>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">📥</div>
        <div class="row-main">
          <div class="row-name">${t('bk.restore')}</div>
          <div class="row-sub">${t('bk.replaces')}</div>
        </div>
        <button class="btn gold" data-act="import">${t('btn.import')}</button>
      </div>`;

    if (!D.configured()) {
      return files + `<div class="row locked">
        <div class="row-ico" style="background:#EDEFF5">☁️</div>
        <div class="row-main">
          <div class="row-name">${t('drive.name')}</div>
          <div class="row-sub">${t('drive.unset')}</div>
        </div>
      </div>`;
    }

    return files + `<div class="row">
        <div class="row-ico" style="background:${stamped ? '#DFF5E6' : '#FFE0E0'}"
             title="${stamped ? t('drive.last', { when }) : t('drive.none')}">☁️</div>
        <div class="row-main">
          <div class="row-name">${t('drive.name')}</div>
          <div class="row-sub">${when || '—'}</div>
        </div>
        <button class="btn" data-act="push">${t('btn.toDrive')}</button>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">⬇️</div>
        <div class="row-main">
          <div class="row-name">${t('drive.restore')}</div>
          <div class="row-sub">${t('bk.replaces')}</div>
        </div>
        <button class="btn gold" data-act="pull">${t('btn.fromDrive')}</button>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#EDE4FF">🔁</div>
        <div class="row-main">
          <div class="row-name">${t('drive.auto')}</div>
          <div class="row-sub">${t('drive.autoSub')}</div>
        </div>
        <button class="btn ${D.auto() ? '' : 'pink'}" data-act="auto">${
          t(D.auto() ? 'btn.on' : 'btn.off')}</button>
      </div>`;
  }

  function offlineBody(info) {
    return `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">💤</div>
        <div class="row-main">
          <div class="row-name">${t('off.title')}</div>
          <div class="row-sub">${t('off.sub', {
            t: U.time(info.seconds), p: CFG.OFFLINE_RATE * 100 })}</div>
        </div>
      </div>
      <div class="row" style="justify-content:center">
        <div class="row-name" style="font-size:26px;color:#2CA85C">+$${U.money(info.cash)}</div>
      </div>
      <button class="btn gold" style="width:100%;align-items:center" data-act="close">${
        t('btn.collect')}</button>`;
  }
})();
