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

  /* ------------------------------------------------------------- bodies */
  function productsBody() {
    const seg = [t('buy.1'), t('buy.10'), t('buy.max')].map((l, k) => {
      const on = (k === 0 && UI.buyMode === 1) || (k === 1 && UI.buyMode === 10) || (k === 2 && UI.buyMode === 'max');
      return `<button class="${on ? 'on' : ''}" data-act="buymode" data-i="${k}">${l}</button>`;
    }).join('');

    const rows = MSM.econ.store().products.map((prod, n) => {
      const ps = MSM.econ.pstate(n), cash = MSM.state.cash;
      if (!ps.built) {
        const next = MSM.econ.nextBuild() === n;
        return `<div class="row locked">${chip(prod.glyph, prod.color)}
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
      return `<div class="row">${chip(prod.glyph, prod.color)}
        <div class="row-main">
          <div class="row-name">${prod.name} <span style="color:#42538C">${t('lv', { n: ps.level })}</span></div>
          <div class="row-sub">${t('prod.price', {
            price: '$' + U.money(MSM.econ.price(n)), sec: MSM.econ.restock(n).toFixed(2) })}</div>
          <div class="row-sub">${t('prod.stock', {
            a: ps.shelf, b: CFG.SHELF_CAP, c: ps.out, d: CFG.CRATE_CAP })}${
            ms ? t('prod.next', { n: ms.lvl }) : t('prod.maxed')}</div>
        </div>
        <button class="btn" data-act="upgrade" data-i="${n}" ${cash >= cost ? '' : 'disabled'}>
          ${t('btn.upgrade', { n: count })}<small>$${U.money(cost)}</small></button>
      </div>`;
    }).join('');

    return `<div class="seg">${seg}</div>${rows}`;
  }

  function staffBody() {
    const store = MSM.econ.store(), ss = MSM.econ.sstate(), cash = MSM.state.cash;
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

    return `<div class="hint">${t('staff.hint', { store: store.name })}</div>` +
      row('📦', '#FFE9D6', t('staff.stockers', { a: ss.stockers, b: CFG.MAX_STOCKERS }),
          ss.stockers
            ? t('staff.stockersOn', { n: ss.stockers })
            : t('staff.stockersOff'),
          ss.stockers >= CFG.MAX_STOCKERS, 'stocker', store.stockerCost(ss.stockers)) +
      row('🧾', '#FFE9AE', t('staff.cashier'),
          ss.cashier ? t('staff.cashierOn') : t('staff.cashierOff'),
          ss.cashier, 'cashier', store.cashierCost) +
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
