/* Google Drive settings — fill these in yourself, see docs/DRIVE.md.
   Until CLIENT_ID is replaced, every Drive button says it is not set up
   rather than failing in some confusing way. */
window.MSM = window.MSM || {};

MSM.DRIVE_CFG = {
  // OAuth 2.0 Client ID (Web application) from your Google Cloud project.
  // The same project MoneyFlow and FinSim use — just add a third client.
  CLIENT_ID: '724538062298-fgnnaeqlcrmi9soeelj838fc4ug09sac.apps.googleusercontent.com',

  // The Drive folder the save file lives in — the one you shared on
  // 2026-08-28. Copy the id out of the folder URL to change it.
  FOLDER_ID: '1fQZvAMTKITE2ZAjjfZog2l5U21UITe-E',

  // One file, overwritten each push. It is a mirror of this browser, not a
  // history — see docs/DRIVE.md.
  FILE_NAME: 'mini-shopping-mall-save.json',
};
