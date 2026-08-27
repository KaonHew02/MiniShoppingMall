/* HUD, bottom sheets and toasts. The canvas owns the world; this file owns
   everything made of DOM. */
window.MSM = window.MSM || {};

(function () {
  const U = MSM.util, CFG = MSM.CFG;
  const $ = (id) => document.getElementById(id);

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
        products: MSM.econ.store().name, staff: 'Staff', map: 'Map',
        boost: 'Boost', settings: 'Settings', offline: 'Welcome back!',
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
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg;
      $('toasts').appendChild(t);
      setTimeout(() => t.remove(), 1900);
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
        case 'save':    MSM.save(); this.toast('Saved'); return;
        case 'export':  MSM.backup.exportFile(); return;
        case 'import':  MSM.backup.importFile(); return;
        case 'push':    MSM.drive.push(true); return;
        case 'pull':    MSM.drive.pull(); return;
        case 'auto':    MSM.drive.setAuto(!MSM.drive.auto()); break;
        case 'reset':
          if (confirm('Reset all progress? This cannot be undone.')) {
            MSM.reset(); MSM.world.invalidate(); MSM.ent.reset();
            this.close(); this.toast('Progress reset');
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
      if (!ss.stocker && s.cash >= MSM.econ.store().stockerCost) hire++;
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
    const seg = ['×1', '×10', 'Max'].map((l, k) => {
      const on = (k === 0 && UI.buyMode === 1) || (k === 1 && UI.buyMode === 10) || (k === 2 && UI.buyMode === 'max');
      return `<button class="${on ? 'on' : ''}" data-act="buymode" data-i="${k}">${l}</button>`;
    }).join('');

    const rows = MSM.econ.store().products.map((prod, n) => {
      const ps = MSM.econ.pstate(n), cash = MSM.state.cash;
      const count = UI.buyMode === 'max' ? Math.max(1, MSM.econ.maxBuy(n, cash)) : UI.buyMode;
      const cost = MSM.econ.upgradeCost(n, count);
      const ms = MSM.econ.nextMilestone(ps.level);
      return `<div class="row">${chip(prod.glyph, prod.color)}
        <div class="row-main">
          <div class="row-name">${prod.name} <span style="color:#42538C">Lv ${ps.level}</span></div>
          <div class="row-sub">$${U.money(MSM.econ.price(n))} each · delivery every ${MSM.econ.restock(n).toFixed(2)}s</div>
          <div class="row-sub">shelf ${ps.shelf}/${CFG.SHELF_CAP} · crate ${ps.crate}/${CFG.CRATE_CAP}${
            ms ? ` · next bonus Lv ${ms.lvl}` : ' · maxed'}</div>
        </div>
        <button class="btn" data-act="upgrade" data-i="${n}" ${cash >= cost ? '' : 'disabled'}>
          Upgrade ×${count}<small>$${U.money(cost)}</small></button>
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
        ? '<button class="btn" disabled>Hired ✓</button>'
        : `<button class="btn ${act === 'cashier' ? 'gold' : 'pink'}" data-act="${act}" ${cash >= cost ? '' : 'disabled'}>
             Hire<small>$${U.money(cost)}</small></button>`}
    </div>`;

    return `<div class="hint">Staff for ${store.name}. Hire both and it earns while you are elsewhere.</div>` +
      row('📦', '#FFE9D6', 'Stocker',
          ss.stocker ? 'Keeping every shelf filled' : 'Runs crate → shelf so you do not have to',
          ss.stocker, 'stocker', store.stockerCost) +
      row('🧾', '#FFE9AE', 'Cashier',
          ss.cashier ? 'Serving the queue without you' : 'Otherwise you must stand at the till',
          ss.cashier, 'cashier', store.cashierCost) +
      `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">📈</div>
        <div class="row-main">
          <div class="row-name">This store, unattended</div>
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
            <div class="row-sub">${store.products.map((p) => p.glyph).join(' ')} · ${store.products.length} products</div>
          </div>
          <button class="btn gold" data-act="unlock" data-i="${i}" ${cash >= store.unlock ? '' : 'disabled'}>
            Unlock<small>$${U.money(store.unlock)}</small></button>
        </div>`;
      }
      const rate = MSM.econ.storeRate(i);
      return `<div class="row">${chip(store.glyph, store.color)}
        <div class="row-main">
          <div class="row-name">${store.name}${here ? ' <span style="color:#2CA85C">• here</span>' : ''}</div>
          <div class="row-sub">${store.products.map((p) => p.glyph).join(' ')}</div>
          <div class="row-sub">${rate > 0 ? `earning $${U.money(rate)}/s unattended` : 'needs a stocker and a cashier to idle'}</div>
        </div>
        ${here
          ? '<button class="btn" disabled>You are here</button>'
          : `<button class="btn" data-act="travel" data-i="${i}">Travel</button>`}
      </div>`;
    }).join('');
    return `<div class="hint">Unlock a store once, then travel between them any time.</div>${rows}`;
  }

  function boostBody() {
    const b = CFG.BOOST, s = MSM.state, on = MSM.econ.boosting();
    return `<div class="hint">Gems come from mall levels — ${CFG.GEMS_PER_LEVEL} per level.</div>
      <div class="row">
        <div class="row-ico" style="background:#EDE4FF">⚡</div>
        <div class="row-main">
          <div class="row-name">Rush Hour ×${b.mult}</div>
          <div class="row-sub">${on
            ? `Active for ${Math.ceil((s.boostUntil - Date.now()) / 1000)}s`
            : `Doubles every sale price for ${b.seconds}s`}</div>
        </div>
        <button class="btn gem" data-act="boost" ${s.gems >= b.gems && !on ? '' : 'disabled'}>
          ${on ? 'Active' : 'Activate'}<small>${b.gems} 💎</small></button>
      </div>`;
  }

  function settingsBody() {
    const s = MSM.state;
    return `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">💰</div>
        <div class="row-main">
          <div class="row-name">Total earned</div>
          <div class="row-sub">$${U.money(s.totalEarned)} · ${s.served} customers served</div>
        </div>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">🎮</div>
        <div class="row-main">
          <div class="row-name">Controls</div>
          <div class="row-sub">Tap where you want to go · WASD on desktop · scroll to zoom</div>
        </div>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">💾</div>
        <div class="row-main">
          <div class="row-name">Save</div>
          <div class="row-sub">Autosaves every 10s and when you leave</div>
        </div>
        <button class="btn" data-act="save">Save now</button>
      </div>
      ${driveRows()}
      <div class="row">
        <div class="row-ico" style="background:#FFE4E9">⚠️</div>
        <div class="row-main">
          <div class="row-name">Reset progress</div>
          <div class="row-sub">Start over from the grocery store</div>
        </div>
        <button class="btn pink" data-act="reset">Reset</button>
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
          <div class="row-name">Backup file</div>
          <div class="row-sub">One .json you can keep anywhere</div>
        </div>
        <button class="btn" data-act="export">Export</button>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">📥</div>
        <div class="row-main">
          <div class="row-name">Restore from file</div>
          <div class="row-sub">Replaces this browser's progress</div>
        </div>
        <button class="btn gold" data-act="import">Import</button>
      </div>`;

    if (!D.configured()) {
      return files + `<div class="row locked">
        <div class="row-ico" style="background:#EDEFF5">☁️</div>
        <div class="row-main">
          <div class="row-name">Google Drive</div>
          <div class="row-sub">Not set up — see docs/DRIVE.md</div>
        </div>
      </div>`;
    }

    return files + `<div class="row">
        <div class="row-ico" style="background:${stamped ? '#DFF5E6' : '#FFE0E0'}"
             title="${stamped ? 'Last copy ' + when : 'No copy in Drive yet'}">☁️</div>
        <div class="row-main">
          <div class="row-name">Google Drive</div>
          <div class="row-sub">${when || '—'}</div>
        </div>
        <button class="btn" data-act="push">To Drive</button>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#E7EEFB">⬇️</div>
        <div class="row-main">
          <div class="row-name">Restore from Drive</div>
          <div class="row-sub">Replaces this browser's progress</div>
        </div>
        <button class="btn gold" data-act="pull">From Drive</button>
      </div>
      <div class="row">
        <div class="row-ico" style="background:#EDE4FF">🔁</div>
        <div class="row-main">
          <div class="row-name">Auto-backup</div>
          <div class="row-sub">Pushes after a save, at most once a minute</div>
        </div>
        <button class="btn ${D.auto() ? '' : 'pink'}" data-act="auto">${D.auto() ? 'On' : 'Off'}</button>
      </div>`;
  }

  function offlineBody(info) {
    return `<div class="row">
        <div class="row-ico" style="background:#E4F6EA">💤</div>
        <div class="row-main">
          <div class="row-name">Your staff kept working</div>
          <div class="row-sub">${U.time(info.seconds)} away · paid at ${CFG.OFFLINE_RATE * 100}% rate</div>
        </div>
      </div>
      <div class="row" style="justify-content:center">
        <div class="row-name" style="font-size:26px;color:#2CA85C">+$${U.money(info.cash)}</div>
      </div>
      <button class="btn gold" style="width:100%;align-items:center" data-act="close">Collect</button>`;
  }
})();
