/* Google Drive settings — fill these in yourself, see docs/DRIVE.md.
   Until CLIENT_ID is replaced, every Drive button says it is not set up
   rather than failing in some confusing way. */
window.MSM = window.MSM || {};

MSM.DRIVE_CFG = {
  // OAuth 2.0 Client ID (Web application) from your Google Cloud project.
  // The same project MoneyFlow and FinSim use — just add a third client.
  CLIENT_ID: 'PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',

  // The Drive folder the save file lives in. Open the folder in Drive and
  // copy the id out of the URL. Leave blank to use the root of My Drive.
  FOLDER_ID: '',

  // One file, overwritten each push. It is a mirror of this browser, not a
  // history — see docs/DRIVE.md.
  FILE_NAME: 'mini-shopping-mall-save.json',
};
