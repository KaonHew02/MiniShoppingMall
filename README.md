<p align="center">
  <img src="assets/logo/logo-lockup.svg" width="720" alt="Mini Shopping Mall">
</p>

# Mini Shopping Mall

An arcade-idle store tycoon in the mould of *My Mini Mart*: you drive the
character around one store at a time, read what each customer wants from the
bubble over their head, restock that shelf from the back room, and ring them
up. Cash lands on the floor — walk over it. Earn enough and the map unlocks
the next store.

<p align="center"><img src="tools/screenshot.png" width="300" alt="gameplay"></p>

## Run it

```bash
npm start
```

Then open http://127.0.0.1:8788. There is no build step — `index.html` also
works if you just double-click it.

## Controls

| | |
| --- | --- |
| **Drag anywhere** | floating joystick — the stick appears where you touch |
| | it is analog: a small push walks, a full push runs |
| **WASD / arrows** | same thing on desktop |
| **Scroll wheel** | zoom |

Walk up to the **bin** on the shop floor to empty your arms — useful when you
grabbed the wrong thing.

## Your first five minutes

You start with **$500** in a closed, empty store. A gold arrow walks you
through the spec-standard opening: stand on the **checkout plot** and $100
drains in to build the counter, harvest potatoes, stock their shelf, flip the
**OPEN sign** by the door, serve the first customer at the till, and run over
the cash. FIRST SALE — then the game opens up.

Customers only come in while the sign says OPEN, and once the tutorial is done
they carry **shopping lists** — up to three different items, collected shelf
by shelf and paid in one total at the till. Carrying a full armful slows you
down; the bin is where mistakes go.

## The loop

1. **Customers arrive on their own schedule**, stocked or not, and each shows
   the product they came for in a thought bubble.
2. **Read the floor** — a green ring round the bubble is their patience. It
   drains only while they stand at an empty shelf. At zero they walk out
   angry and the sale is lost.
3. **Restock** — everything is *made* on site, not delivered. Crop beds sit
   back-left, the animal pens back-right, the oven off to the side:

   | Product | Comes from | Needs |
   | --- | --- | --- |
   | Potato, Tomato, Carrot, Eggplant, Cabbage, Wheat | crop beds along the back | just time |
   | Apple, Banana, Orange | the orchard down the right | just time |
   | Milk | the cow, in the farmyard down the left | wheat in its trough |
   | Eggs | the chicken coop, below the cow | tomatoes |
   | Bread | the oven, by the door | wheat |

   The shop floor is laid out by department — **Vegetables**, **Fruit**, and
   **Dairy & Bakery** — each a tinted block of floor with its name on it.

   So the chain is: harvest → carry to whatever eats it → carry what that
   makes to the shelf. Your arms hold **10 items of any mix**, stacked over
   your head (12 max), so one trip can carry potatoes and tomatoes together.
4. **Level up in the world** — every station has a pad beside it. Stand on it
   and your cash drains into the next level, which raises that product's
   price and speeds up how fast it is made.
5. **Serve** — stand behind the till and the queue clears, one every 0.6s.
   Each sale drops cash on the floor.
6. **Collect** — run over the cash. Piles left more than 9 seconds bank
   themselves, so idling still pays.
7. **Expand** — open the Map and buy the next store.

Only the Grocery Store has the full farm chain so far — the Sports Outlet,
the Boutique and Electronics still make their goods without an input. The
Coffee Shop is a different game entirely — see below.

**Staff** take over the parts you are tired of doing. A stocker hauls feed to
whatever is starving, then restocks the emptiest shelf; the cashier works the
till. You can hire **up to four stockers** — each costs 3.2x the last — and
they claim jobs so two never chase the same shelf. One alone cannot keep
eleven shelves and four feed stations going. A store only earns while you
are elsewhere — or offline, 2 hours max at half rate — with **both** hired.

**Upgrades** raise the price per item. Levels 10 / 25 / 50 / 100 / 200 are
milestones that multiply the price and speed up deliveries. Mall level rises
with your total product levels and pays gems; gems buy a ×2 Rush Hour.

## Stage 2 — the Coffee Shop

The mini mart is a *stocking* game: you fill a shelf and the customer takes
one off it. The café is a *service* game, and nothing is ready in advance:

```
they queue at the counter  ->  you take the order        (a ticket)
you fetch beans and milk from the back room into the bar's storage
you stand at the machine   ->  it brews their drink      (a few seconds)
the drink lands on the pickup counter
you carry it over          ->  they pay, and they tip
they sit down, drink it, and leave a dirty table behind
you wipe it, or nobody can sit there
```

**Six ingredients** — beans, milk, matcha, cocoa, ice, pastry dough — refill in
crates along the back wall. Carry them to the **ingredient storage** by the
bar; the machines draw on that, never on the crates. An empty bin is why
nothing is brewing.

**Ten recipes** live on the **menu board** in the back right, each its own
plaque you walk onto and pay for: Espresso, Americano, Latte, Cappuccino, Iced
Coffee, Mocha, Matcha Latte, Iced Matcha, Croissant, Cake. Each names what it
takes and which of the three machines makes it — the **Coffee Machine**, the
**Matcha & Ice Bar** or the **Pastry Oven**. Machines level up on their own
pads: faster, and more cups on the go at once.

**Patience** is the ring round a customer's bubble. It starts draining after a
few seconds in the queue, and from the moment you take their order. Run it out
and they walk. Serve them fast, in a clean room, and they **tip** — that is
where the café's real money is.

**Seating** is six tables, two free and the rest build plots. A served
customer takes a seat, drinks for ten seconds or so, and leaves the table
dirty; a dirty table cannot be sat at and drags your tips down. If every table
is dirty or taken they take the drink away instead.

The café has three jobs the mini mart never had, on top of runners and a
cashier: a **Barista** works the bar, a **Server** runs the drinks out, and a
**Cleaner** clears the tables. It only earns unattended with all five hired.

## Stores

| Store | Unlock | Products |
| --- | --- | --- |
| Grocery Store | free | 11 lines across vegetables, fruit, dairy and bakery |
| Coffee Shop | $6K | 6 ingredients, 10 recipes, 3 machines — made to order |
| Sports Outlet | $180K | basketball, trainers, racket, jersey |
| Fashion Boutique | $4.2M | t-shirt, dress, handbag, watch |
| Electronics | $95M | earbuds, phone, tablet, TV |

Unlock a store once, then travel between them freely from the Map.

Progress autosaves to `localStorage` every 10 seconds and when you leave.

## Backing up

Settings → **Export** writes a dated `.json` you can keep anywhere; **Import**
reads one back. Both work from a double-clicked `index.html`.

A **Google Drive** copy uses the same layer as MoneyFlow and FinSim — one file
in a folder of your own, `drive.file` scope, manual push/pull plus an opt-in
auto-backup. It needs the game served from a real origin (GitHub Pages, or an
authorised `localhost`) and an OAuth client ID you create yourself. See
[`docs/DRIVE.md`](docs/DRIVE.md); until `src/drive-config.js` is filled in the
Drive row just says it is not set up.

Restoring always **replaces, never merges**, confirms first, and reloads.

## Layout

```
src/config.js      balance, the store list, and one floor plan per shop  <- tune here
src/iso.js         isometric projection + the camera that trails you
src/state.js       game state, economy maths, save/load, offline
src/world.js       what is solid, and how bodies move and slide
src/entities.js    player, stocker, customers and their wants, cash
src/cafe.js        stage 2: orders, brewing, serving, tips, tables, crew
src/cafe-render.js stage 2's fixtures — crates, menu board, machines, tables
src/render.js      canvas scene + the joystick
src/art.js         one painter per product — potatoes, tomatoes, cups...
src/ui.js          HUD, bottom sheets, toasts
src/game.js        loop, input, the till, unlocking and travelling
src/backup.js      export / import the save file
src/drive.js       the Google Drive copy (config in src/drive-config.js)
tools/dev-server.mjs  static server for `npm start`
tools/build-logo.mjs  generates every file in assets/logo
```

Scripts load as plain `<script>` tags into one `MSM` namespace — no bundler, no
modules, so the file:// path keeps working.

## Not built yet

Sound, prestige, per-store decoration, and a tutorial past the first sale.
Customers and staff do not collide with anything — only the player does — so
they clip through fixtures on the diagonal. The café has no day cycle, so
there is no end-of-day summary and no missions yet. The Sports Outlet, the
Boutique and Electronics still borrow the mini mart's floor plan.

## Brand

App icon, wordmark and lockup live in [`assets/logo/`](assets/logo/) — see
[`assets/logo/BRAND.md`](assets/logo/BRAND.md) for the palette and usage rules.

```bash
npm run logo:png     # regenerate every SVG + PNG export
```
