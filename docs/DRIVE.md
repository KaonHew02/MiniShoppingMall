# Saving to Google Drive

Progress lives in this browser's `localStorage` under `msm.save.v9`. Clearing
your browsing data destroys it. Two ways to keep a copy.

## Already done for you

| | |
| --- | --- |
| Drive folder | `1fQZvAMTKITE2ZAjjfZog2l5U21UITe-E` — already in `src/drive-config.js` |
| File name | `mini-shopping-mall-save.json` |
| Scope | `drive.file` — the app can only touch files it made itself |
| Code | `src/backup.js` + `src/drive.js`, the same layer MoneyFlow and FinSim use |

## Setting it up on a fresh project

You made a new Google Cloud project for this rather than reusing MoneyFlow's.
That is tidier, but a new project starts empty — the Drive API is **off** and
there is **no consent screen** — so there are two steps before the Client ID
that MoneyFlow's project already had done. Do them in this order or the
sign-in fails with an error that does not explain itself.

All of it needs your own Google sign-in, so none of it can be done for you.

### 1. Turn on the Drive API

<https://console.cloud.google.com/> → make sure your **Mini Shopping Mall**
project is the one selected in the bar at the top.

**APIs & Services → Library** → search `Google Drive API` → **Enable**.

Miss this and the sign-in works but every push fails with a 403.

### 2. Set up the consent screen

This is the panel Google shows when the game asks for permission. In a new
project it does not exist yet. Look for **OAuth consent screen** under APIs &
Services — newer consoles call the same area **Google Auth Platform**, with
the settings split across *Branding*, *Audience* and *Data access*.

Fill in:

- **User type / Audience: External** (unless this is a Workspace account)
- **App name:** `Mini Shopping Mall`
- **User support email:** your own address
- **Developer contact email:** your own address

Then, under **Audience → Test users**, click *Add users* and **add your own
Google address**. A new project starts in *Testing* mode, and in that mode
only listed test users may sign in — including you. This is the step people
skip, and it produces *"Access blocked: this app has not completed
verification"*.

You do **not** need to submit anything for review. `drive.file` is a
non-sensitive scope and Testing mode is fine for your own use — it just means
you have to be on the test-user list.

### 3. Create the client

**APIs & Services → Credentials → + Create credentials → OAuth client ID**

- **Application type:** Web application
- **Name:** `Mini Shopping Mall`

Under **Authorised JavaScript origins**, click *Add URI* for each. Scheme and
host only — **no path, no trailing slash**:

```
http://127.0.0.1:8788
http://localhost:8788
```

Add this one too if you later publish it, like your other apps:

```
https://kaonhew02.github.io
```

Leave *Authorised redirect URIs* empty — this flow does not use one.

### 4. Copy the Client ID into the game

Press **Create**. Copy the long string ending in
`.apps.googleusercontent.com`, and paste it into
[`src/drive-config.js`](../src/drive-config.js), replacing the placeholder:

```js
CLIENT_ID: '1234567890-abcdefg.apps.googleusercontent.com',
```

### 5. Use it

Hard-refresh the game, then **⚙ Settings → To Drive**. Google asks you to sign
in and to allow the app; after that the cloud icon turns green and shows the
time of the last copy. **From Drive** pulls it back onto any browser.

## If something goes wrong

**"Drive is not set up yet"** — the Client ID is still the placeholder, or the
file was not saved.

**Error 400: `redirect_uri_mismatch` or `origin_mismatch`** — the address in
your browser's bar does not exactly match an authorised origin. Check whether
you are on `127.0.0.1` or `localhost`, and that the port is `8788`.

**"Access blocked: this app has not completed verification"** — you are not on
the test-user list. Consent screen → **Audience → Test users** → add your own
address. Step 2 above.

**Push fails with 403 / "Drive API has not been used"** — the Drive API is not
enabled on this project. Step 1 above. If you just enabled it, give it a
minute and retry.

**Nothing happens when you press To Drive** — the sign-in window was blocked.
Allow pop-ups for the site and press it again.

## Things worth knowing

**It cannot work from `file://`.** A page opened straight off disk has no
origin and Google will not issue a token to one. Run it with `npm start`.
Export/Import work off disk either way.

**The Drive file is a mirror, not a history.** Each push overwrites the same
file with whatever is in this browser now. Reset your progress and push, and
the reset is what is in Drive. Export a file before anything drastic.

**Restoring replaces, it never merges.** Two saves cannot be reconciled — the
game would have to guess which is further along. Import and From Drive both
confirm first, then reload.

**Auto-backup is off by default.** Turn it on and a successful save pushes at
most once a minute. It never opens a sign-in window by itself: the first push
must be a manual **To Drive**, and if the silent token renewal is refused it
stands down and the cloud icon goes red. A failed automatic push shows no
dialog — check the icon.
