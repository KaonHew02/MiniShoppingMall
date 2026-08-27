# Backing up your save

Progress lives in this browser's `localStorage` under `msm.save.v3`. Clearing
your browsing data destroys it. There are two ways to keep a copy.

## 1. Backup file — works everywhere

Settings → **Export** writes `mini-shopping-mall-YYYY-MM-DD.json`. Keep it
wherever you like. **Import** reads one back.

This works from a double-clicked `index.html` as well as from a served page.

## 2. Google Drive — needs a hosted page

Settings → **To Drive** / **From Drive** keep one file in a folder of your own
Drive. Two things have to be true first.

### It cannot run from `file://`

A page opened straight off disk has no origin, and Google will not issue a
token to one. Drive works when the game is served from a real origin — GitHub
Pages, the same as MoneyFlow and FinSim — or from an authorised
`http://localhost:8788` while you are developing.

Everything else, including Export/Import, keeps working from `file://`.

### You have to make the OAuth client yourself

It needs your Google sign-in and your acceptance of Google's terms, so it is
not something that can be set up for you.

You already have a Google Cloud project from MoneyFlow with the Drive API and
the consent screen done. **Add a third OAuth client to that same project**
rather than reusing MoneyFlow's — it works either way, but a separate client
makes the sign-in window name the right app and keeps the grants separate.

1. Google Cloud console → **APIs & Services → Credentials**
2. **Create credentials → OAuth client ID → Web application**
3. Under *Authorised JavaScript origins* add the scheme and host only, no
   path — e.g. `https://kaonhew02.github.io`, and `http://localhost:8788` if
   you want it while developing
4. Copy the client ID into `src/drive-config.js`
5. Make a folder in Drive for the save, open it, and copy the id out of the
   URL into `FOLDER_ID` (leave blank to use the root of My Drive)

Until `CLIENT_ID` is filled in, the Drive row in Settings says it is not set
up rather than failing strangely.

### Scope

`drive.file` — the app can only see files it created itself. It cannot read
the rest of your Drive, needs no Google verification, and a client ID sitting
in a public repo is not a key to anything else. **Do not widen it to
`drive`.**

## Things worth knowing

**The Drive file is a mirror, not a history.** Each push overwrites the same
file with whatever is in this browser now. If you reset your progress and then
push, the reset is what is in Drive. Export a file before doing anything
drastic.

**Restoring replaces, it never merges.** Two saves cannot be reconciled — the
game would have to guess which one is further along, and guessing wrong
rewrites your progress silently. Both Import and From Drive confirm first,
then reload.

**Auto-backup is off by default.** Turn it on and a successful save pushes to
Drive, at most once a minute. It never opens a sign-in window on its own: the
first push always has to be a manual **To Drive**, and if the silent token
renewal is refused it just stands down and the cloud icon goes red. A failed
automatic push shows no dialog — check the icon.
