/* Export / Import of the save file.
   Same envelope shape as MoneyFlow and FinSim so the three stay familiar:
   { format, version, saved, stores: { <key>: <value> } }

   Import REPLACES, never merges — merging two saves means guessing which
   store is "further along", and guessing wrong silently rewrites progress. */
window.MSM = window.MSM || {};

(function () {
  const FORMAT = 'minimall.backup';
  const STORES = [MSM.CFG.SAVE_KEY];        // a new key must be added here or it is not backed up

  const B = MSM.backup = {
    /** The object that gets written to a file or pushed to Drive. */
    envelope() {
      const stores = {};
      STORES.forEach((k) => {
        try { stores[k] = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { stores[k] = null; }
      });
      return { format: FORMAT, version: 1, saved: new Date().toISOString(), stores };
    },

    filename() {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      return `mini-shopping-mall-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
    },

    /** Download the current save as a file. */
    exportFile() {
      MSM.save();                                    // capture what is on screen, not the last autosave
      const blob = new Blob([JSON.stringify(B.envelope(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = B.filename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      MSM.ui.toast('Save exported');
    },

    /** Validate an envelope. Returns an error string, or null when it is fine. */
    check(data) {
      if (!data || typeof data !== 'object') return 'That file is not a save.';
      if (data.format !== FORMAT) return 'That file is not a Mini Shopping Mall save.';
      if (!data.stores || typeof data.stores !== 'object') return 'That save has no data in it.';
      const main = data.stores[MSM.CFG.SAVE_KEY];
      if (!main || !Array.isArray(main.stores)) return 'That save is from an older version and cannot be read.';
      return null;
    },

    /**
     * Overwrite local progress with an envelope and restart.
     * The reload is what makes it take: every module reads its store once.
     */
    apply(data) {
      const bad = B.check(data);
      if (bad) { MSM.ui.toast(bad); return false; }

      const before = {};
      STORES.forEach((k) => { before[k] = localStorage.getItem(k); });
      try {
        STORES.forEach((k) => {
          if (data.stores[k] == null) return;
          localStorage.setItem(k, JSON.stringify(data.stores[k]));
        });
      } catch (e) {
        // all-or-nothing: a half-applied save is worse than none
        STORES.forEach((k) => {
          if (before[k] == null) localStorage.removeItem(k);
          else localStorage.setItem(k, before[k]);
        });
        MSM.ui.toast('Could not write the save — nothing was changed.');
        return false;
      }

      // The pagehide handler would otherwise save the *old* in-memory game
      // over the file we just wrote, on the way out of the reload.
      MSM.suspendSave = true;
      location.reload();
      return true;
    },

    /** Pick a .json from disk and apply it. */
    importFile() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const fr = new FileReader();
        fr.onload = () => {
          let data = null;
          try { data = JSON.parse(String(fr.result)); } catch (e) { /* handled below */ }
          if (!data) { MSM.ui.toast('That file is not readable JSON.'); return; }
          if (!confirm('Replace your current progress with this save? This cannot be undone.')) return;
          B.apply(data);
        };
        fr.readAsText(file);
      };
      input.click();
    },
  };
})();
