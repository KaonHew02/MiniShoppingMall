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
  let inFlight = null;      // the one authorize() promise allowed at a time
  let silentOff = false;    // a silent attempt failed: stop trying until asked
  let warned = false;       // say why exactly once per session

  const D = MSM.drive = {
    configured: () => !!CFG.CLIENT_ID && CFG.CLIENT_ID.indexOf('PASTE_YOUR') !== 0,
    ready: () => typeof google !== 'undefined' && google.accounts && google.accounts.oauth2,
    auto: () => localStorage.getItem(AUTO_KEY) === '1',
    lastPush: () => localStorage.getItem(STAMP_KEY) || '',

    setAuto(on) {
      localStorage.setItem(AUTO_KEY, on ? '1' : '0');
      if (on) { silentOff = false; warned = false; }   // give it a fresh try
      MSM.ui.toast(MSM.t(on ? 'toast.driveAutoOn' : 'toast.driveAutoOff'));
    },

    valid: () => !!token && Date.now() - tokenAt < 55 * 60 * 1000,

    /**
     * Get an access token.
     *
     * interactive=false must put NOTHING on screen. `prompt: ''` does not
     * promise that: with more than one Google session signed in, Google still
     * opens the account chooser — which is how a background auto-push ended
     * up asking "which Gmail?" in the middle of a game and taking the window
     * away from it. `prompt: 'none'` tells Google to answer or fail, never to
     * show UI; the failure arrives at error_callback and we go quiet for the
     * rest of the session rather than trying again a minute later.
     *
     * Two other ways this used to hang: a second call would overwrite the
     * first's callback and leave its promise pending forever, and a window
     * the player closed called neither callback. Hence inFlight and the
     * timeout.
     */
    authorize(interactive) {
      if (D.valid()) return Promise.resolve(token);
      if (!D.configured()) return Promise.reject(new Error('not-configured'));
      if (!D.ready()) return Promise.reject(new Error(MSM.t('err.gsi')));
      if (!interactive && silentOff) return Promise.reject(new Error('needs-sign-in'));
      if (inFlight) return inFlight;

      const p = new Promise((resolve, reject) => {
        let done = false, timer = null;
        const settle = (fn, v) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          fn(v);
        };

        client = client || google.accounts.oauth2.initTokenClient({
          client_id: CFG.CLIENT_ID,
          scope: SCOPE,
          callback: () => {},
        });
        client.callback = (res) => {
          if (!res || !res.access_token) { settle(reject, new Error('no-token')); return; }
          token = res.access_token;
          tokenAt = Date.now();
          silentOff = false;
          settle(resolve, token);
        };
        client.error_callback = () =>
          settle(reject, new Error(interactive ? 'no-token' : 'needs-sign-in'));

        timer = setTimeout(() => settle(reject, new Error('timeout')),
                           interactive ? 120000 : 15000);
        try {
          client.requestAccessToken(interactive ? {} : { prompt: 'none' });
        } catch (e) { settle(reject, e); }
      });

      inFlight = p;
      p.catch(() => {}).then(() => { if (inFlight === p) inFlight = null; });
      return p;
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
      if (!existing) throw new Error(MSM.t('err.driveNoFile'));
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (!res.ok) throw new Error('Drive download failed (' + res.status + ')');
      return res.json();
    },

    /* ---------------------------------------------------------- actions */
    async push(interactive = true) {
      if (!D.configured()) { MSM.ui.toast(MSM.t('toast.driveUnset')); return false; }
      try {
        await D.authorize(interactive);
        MSM.save();
        await D.write(MSM.backup.envelope());
        localStorage.setItem(STAMP_KEY, new Date().toISOString());
        if (interactive) MSM.ui.toast(MSM.t('toast.driveSaved'));
        MSM.ui.body(true);
        return true;
      } catch (e) {
        /* A failed automatic push never nags and never retries: the retry is
           exactly the call that would pop a sign-in window mid-game. One
           toast, then the stamp just goes stale until you tap To Drive. */
        if (!interactive) {
          silentOff = true;
          if (!warned) { warned = true; MSM.ui.toast(MSM.t('drive.needSignIn')); }
          return false;
        }
        MSM.ui.toast(e.message === 'not-configured'
          ? MSM.t('toast.driveUnset') : MSM.t('toast.driveFail', { msg: e.message }));
        return false;
      }
    },

    async pull() {
      if (!D.configured()) { MSM.ui.toast(MSM.t('toast.driveUnset')); return; }
      try {
        await D.authorize(true);
        const data = await D.read();
        const bad = MSM.backup.check(data);
        if (bad) { MSM.ui.toast(bad); return; }
        if (!confirm(MSM.t('confirm.drive'))) return;
        MSM.backup.apply(data);
      } catch (e) {
        MSM.ui.toast(MSM.t('toast.driveRead', { msg: e.message }));
      }
    },

    /**
     * Called after a successful local save. Debounced, and silent in every
     * failure case. Only runs while the tab is visible so a background tab is
     * never woken into a sign-in window.
     */
    touch() {
      if (!D.auto() || !D.configured() || silentOff) return;
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
