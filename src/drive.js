/* Google Drive copy of the save — a port of MoneyFlow's drive.js.

   Rules carried over from that build, all of them learned the hard way:
   - Scope is drive.file and must never be widened to `drive`. It reaches only
     files this app itself created, so a client ID published in a public repo
     is not a key to the whole Drive.
   - The token lives in memory only and lasts about an hour, so a reload loses
     it. Auto-push renews it silently; it NEVER opens a sign-in window.
   - The Drive file is a mirror, not an archive. Pushing after a reset pushes
     the reset.
   - Pull replaces local progress and routes through the same confirm as
     Import. */
window.MSM = window.MSM || {};

(function () {
  const CFG = MSM.DRIVE_CFG;
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const AUTO_KEY = 'msm.drive.auto';
  const STAMP_KEY = 'msm.drive.lastPush';
  const DEBOUNCE = 60000;

  let token = null, tokenAt = 0, client = null, pending = null;

  const D = MSM.drive = {
    configured: () => !!CFG.CLIENT_ID && CFG.CLIENT_ID.indexOf('PASTE_YOUR') !== 0,
    ready: () => typeof google !== 'undefined' && google.accounts && google.accounts.oauth2,
    auto: () => localStorage.getItem(AUTO_KEY) === '1',
    lastPush: () => localStorage.getItem(STAMP_KEY) || '',

    setAuto(on) {
      localStorage.setItem(AUTO_KEY, on ? '1' : '0');
      MSM.ui.toast(on ? 'Auto-backup on' : 'Auto-backup off');
    },

    valid: () => !!token && Date.now() - tokenAt < 55 * 60 * 1000,

    /**
     * Get an access token. interactive=false asks Google for one silently and
     * gives up rather than showing a window — that is what makes auto-push
     * safe to call from a background write.
     */
    authorize(interactive) {
      return new Promise((resolve, reject) => {
        if (D.valid()) { resolve(token); return; }
        if (!D.configured()) { reject(new Error('not-configured')); return; }
        if (!D.ready()) { reject(new Error('Google sign-in did not load.')); return; }

        client = client || google.accounts.oauth2.initTokenClient({
          client_id: CFG.CLIENT_ID,
          scope: SCOPE,
          callback: () => {},
        });
        client.callback = (res) => {
          if (!res || !res.access_token) { reject(new Error('no-token')); return; }
          token = res.access_token;
          tokenAt = Date.now();
          resolve(token);
        };
        client.error_callback = () => reject(new Error('no-token'));
        try {
          client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
        } catch (e) { reject(e); }
      });
    },

    /* ------------------------------------------------------------ files */
    async find() {
      const parent = CFG.FOLDER_ID ? ` and '${CFG.FOLDER_ID}' in parents` : '';
      const q = encodeURIComponent(`name='${CFG.FILE_NAME}' and trashed=false${parent}`);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&spaces=drive`,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (!res.ok) throw new Error('Drive search failed (' + res.status + ')');
      const json = await res.json();
      return (json.files && json.files[0]) || null;
    },

    /** multipart/related demands CRLF between parts — a bare \n is rejected. */
    multipart(meta, body) {
      const b = '-------msm' + Date.now();
      const payload = [
        '--' + b,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(meta),
        '--' + b,
        'Content-Type: application/json; charset=UTF-8',
        '',
        body,
        '--' + b + '--',
        '',
      ].join('\r\n');
      return { boundary: b, payload };
    },

    async write(envelope) {
      const body = JSON.stringify(envelope);
      const existing = await D.find();
      const meta = existing
        ? { name: CFG.FILE_NAME }
        : { name: CFG.FILE_NAME, ...(CFG.FOLDER_ID ? { parents: [CFG.FOLDER_ID] } : {}) };
      const { boundary, payload } = D.multipart(meta, body);

      const url = existing
        ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const res = await fetch(url, {
        method: existing ? 'PATCH' : 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'multipart/related; boundary=' + boundary,
        },
        body: payload,
      });
      if (!res.ok) throw new Error('Drive upload failed (' + res.status + ')');
      return res.json();
    },

    async read() {
      const existing = await D.find();
      if (!existing) throw new Error('No save in Drive yet.');
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (!res.ok) throw new Error('Drive download failed (' + res.status + ')');
      return res.json();
    },

    /* ---------------------------------------------------------- actions */
    async push(interactive = true) {
      if (!D.configured()) { MSM.ui.toast('Drive is not set up yet — see docs/DRIVE.md'); return false; }
      try {
        await D.authorize(interactive);
        MSM.save();
        await D.write(MSM.backup.envelope());
        localStorage.setItem(STAMP_KEY, new Date().toISOString());
        if (interactive) MSM.ui.toast('Saved to Drive');
        MSM.ui.body(true);
        return true;
      } catch (e) {
        // a failed automatic push never nags — the stamp just goes stale
        if (interactive) {
          MSM.ui.toast(e.message === 'not-configured'
            ? 'Drive is not set up yet' : 'Drive backup failed: ' + e.message);
        }
        return false;
      }
    },

    async pull() {
      if (!D.configured()) { MSM.ui.toast('Drive is not set up yet — see docs/DRIVE.md'); return; }
      try {
        await D.authorize(true);
        const data = await D.read();
        const bad = MSM.backup.check(data);
        if (bad) { MSM.ui.toast(bad); return; }
        if (!confirm('Replace your current progress with the Drive save? This cannot be undone.')) return;
        MSM.backup.apply(data);
      } catch (e) {
        MSM.ui.toast('Could not read Drive: ' + e.message);
      }
    },

    /**
     * Called after a successful local save. Debounced, and silent in every
     * failure case. Only runs while the tab is visible so a background tab is
     * never woken into a sign-in window.
     */
    touch() {
      if (!D.auto() || !D.configured()) return;
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        if (document.visibilityState !== 'visible') return;
        D.push(false);
      }, DEBOUNCE);
    },
  };

  MSM.driveTouch = () => D.touch();
})();
