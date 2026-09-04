/* Mini Shopping Mall — balance, store list and floor plans.
   Everything tunable lives here; no other file hard-codes a number.

   Stage 1, the mini mart: you run one store at a time. Goods are MADE at the
   back, not delivered: crops grow in beds, the cow and the chicken have to be
   fed, the oven has to be loaded. Customers arrive on their own schedule and
   show what they want in a thought bubble; you keep the shelves full and ring
   them up.

   Stage 2, the coffee shop, works differently — see MSM.CFG.CAFE and
   MSM.CFG.PLANS.cafe below. Nothing waits on a shelf: they order, you brew,
   you carry it over, they pay and sit down. */
window.MSM = window.MSM || {};

MSM.CFG = {
  /* v12: fast food slots in as the third shop, so every store after it
     shifts index. Saves are keyed by index, so an old one cannot be read
     onto the new list — it is retired rather than silently mangled. */
  SAVE_KEY: 'msm.save.v12',
  START_CASH: 500,

  /* The live floor box. usePlan() overwrites it from the store you are
     standing in, so a plan can be a different size to its neighbours —
     the mini mart is much the biggest, because it is the only one with a
     farm bolted onto the back of the shop. */
  WORLD: { W: 23.5, H: 15.2 },
  WORLD_DEFAULT: { W: 23.5, H: 15.2 },

  PLAYER_SPEED: 3.8,       // top speed; a light push on the stick is slower
  STAFF_SPEED: 2.9,
  CUSTOMER_SPEED: 2.1,
  STICK_DEAD: 9,           // px of stick travel ignored
  STICK_FULL: 46,          // px at which you are running flat out
  ACCEL: 14,               // how sharply the character takes up a new heading
  CARRY_SLOW: 0.4,         // fraction of speed lost with full arms
  BODY_R: 0.22,
  REACH: 0.8,

  CARRY_CAP: 12,             // items in your arms, of any mix
  CRATE_CAP: 10,             // finished items a station holds before it stalls
  FEED_CAP: 8,               // input items an animal or machine can hold
  SHELF_CAP: 8,
  HANDLE_RATE: 9,            // items per second in and out of your arms
  SERVE_TIME: 0.6,           // minimum checkout, even for one item
  PACK_TIME: 0.35,           // extra seconds per item as it is bagged

  SPAWN_EVERY: [3.0, 1.3],   // seconds between arrivals: [quiet, busy]
  DOOR_HOLD: 0.7,            // seconds stood in the doorway before you travel

  /* The escalator between shops. Its geometry lives here because both the
     painter and the customers who ride it have to agree on where the tread
     is: they walk UP the ramp, so their height has to track it exactly. */
  ESC: {
    TOP_Z: 1.05,           // how high the run climbs
    DECK: 0.14,            // the tread just off the floor
    RAIL: 0.86,            // balustrade height above the tread
    RIDE: 2.6,             // seconds a customer takes to ride it end to end
    BOARD: 0.45,           // how close you stand IN FRONT of it to ride
    /* Once another shop is open, this share of customers come and go by
       escalator instead of the street door — they are shopping the mall,
       not just this one unit. */
    SHARE: 0.45,
  },

  MIN_RESTOCK: 0.35,
  OFFLINE_CAP_H: 2,
  OFFLINE_RATE: 0.5,

  CASHIER_COST: (unlock) => Math.max(2500, unlock * 0.9),
  TILL_COST: (unlock) => Math.max(100, Math.round(unlock * 0.02)),
  LIST_ODDS: [0.45, 0.33, 0.22],  // chance of 1 / 2 / 3 different products
  QTY_ODDS:  [0.55, 0.28, 0.17],  // chance of wanting 1 / 2 / 3 of each
  MAX_BASKET: 6,                  // total items one customer will carry
  TAKE_TIME: 0.28,                // seconds to lift each item off the shelf
  /* How long somebody hovers behind a full queue before giving up. They put
     the shopping back when they go — see MSM.ent.abandon. */
  QUEUE_PATIENCE: 25,
  /* Each extra stocker costs a good deal more than the last. One cannot keep
     eleven shelves and four feed stations going on their own. */
  MAX_STOCKERS: 4,

  /* Levels stop at a hundred — where the last reachable milestone sits. The
     ×10 and Max buttons are gone all the same: one tap is one level, and the
     grind belongs on the level pad out on the shop floor, where you stand
     and your cash pours into the next level on its own. */
  MAX_LEVEL: 100,
  STOCKER_COST: (unlock, owned) =>
    Math.round(Math.max(1800, unlock * 0.7) * Math.pow(3.2, owned || 0)),

  BOOST: { gems: 15, mult: 2, seconds: 60 },
  GEMS_PER_LEVEL: 3,
  levelThreshold: (n) => 5 * n * (n + 1),

  /* The Lv 200 row sits above MAX_LEVEL and can no longer be reached. It
     stays so a save made before the cap keeps the multipliers it already
     bought — capping levels should not quietly nerf someone's shop. */
  MILESTONES: [
    { lvl: 10,  income: 2 },
    { lvl: 25,  income: 2, speed: 2 },
    { lvl: 50,  income: 2, speed: 2 },
    { lvl: 100, income: 3, speed: 2 },
    { lvl: 200, income: 3 },
  ],

  /* ------------------------------------------------------------ the cafe */
  CAFE: {
    ORDER_TIME: 0.9,          // seconds to take one order at the counter
    PATIENCE: 46,             // seconds a customer waits before walking out
    QUEUE_GRACE: 7,           // patience only starts draining after this
    READY_CAP: 8,             // finished drinks the pickup counter holds
    SIT: [8, 15],             // seconds they linger at a table
    CLEAN_TIME: 1.1,          // seconds to wipe one table down
    SERVE_REACH: 1.3,         // how close you stand to hand a drink over
    TIP_MAX: 0.25,            // best-case tip, as a fraction of the price
    MACHINE_SPEED: 0.34,      // brew speed gained per machine level
    MACHINE_CAP: (lvl) => MSM.util.clamp(1 + (((lvl - 1) / 3) | 0), 1, 4),
    MACHINE_GROWTH: 1.16,     // how fast a machine's own upgrades get dearer
    /* An order is a drink, and sometimes food on top: the chance of the
       first and of a second kitchen item joining the ticket. */
    FOOD_ODDS: [0.45, 0.15],
    /* Four jobs the mini mart never had, because there are four more things
       to do: brew the drinks, cook the food, run it all out, and clear the
       tables. The barista owns the drink machines; the chef owns the oven. */
    BARISTA_COST: (unlock) => Math.max(3200, Math.round(unlock * 1.1)),
    CHEF_COST:    (unlock) => Math.max(4000, Math.round(unlock * 1.35)),
    SERVER_COST:  (unlock) => Math.max(4800, Math.round(unlock * 1.6)),
    CLEANER_COST: (unlock) => Math.max(2200, Math.round(unlock * 0.75)),
  },

  /* --------------------------------------------------- the sport outlet */
  /* Stage 3 is a SELLING game. The mini mart's customer takes what is on the
     shelf and the cafe's waits for you to make it; here they pick a thing up,
     go and TRY it, and then decide. Everything below is that decision. */
  SPORTS: {
    BROWSE_TIME: 1.1,        // seconds sizing it up before taking it down
    TRY_TIME: [3.0, 5.0],    // seconds spent on the court / the treadmill
    PATIENCE: 60,            // seconds of waiting at an empty rack
    QUEUE_GRACE: 6,
    ADVISE_REACH: 1.6,       // how close you stand to talk them through it
    ADVISE_TIME: 0.9,        // seconds of standing there to land the advice
    /* The purchase roll. A cold customer who was left alone buys well under
       half the time — the trial and the advice are what close the sale, and
       that is the whole loop of the stage. */
    BASE_BUY: 0.34,
    TRY_BONUS: 0.30,
    ADVICE_BONUS: 0.26,
    LEVEL_BONUS: 0.008,      // a better-stocked range sells itself, a little
    MAX_BUY: 0.96,
    BUDGET: [0.72, 2.20],    // what they will pay, as a multiple of the price
    ADVICE_BUDGET: 1.25,     // good advice finds them something they can afford
    SECOND_LOOK: 0.5,        // chance a "no" becomes "show me another one"
    ADVISOR_COST: (unlock) => Math.max(9000, Math.round(unlock * 1.4)),
  },

  /* ----------------------------------------------- the fashion boutique */
  /* Stage 4 is a MATCHING game. The outlet asks whether you can talk somebody
     into a sale; the boutique asks whether you have the thing they need, in
     their size, and somewhere for them to try it on. Two scarce resources —
     a size on the rail and a free cubicle — and the player's job is to keep
     both of them from running out. */
  BOUTIQUE: {
    SIZES: ['S', 'M', 'L', 'XL'],
    /* Who walks in wearing what. Middle sizes sell out first, which is the
       whole reason the back room ever gets a visit. */
    SIZE_ODDS: [0.20, 0.34, 0.30, 0.16],
    BROWSE_TIME: 1.0,        // seconds at the rail before it is off the hanger
    FIT_TIME: [3.5, 6.0],    // seconds behind the curtain
    PATIENCE: 70,            // seconds queueing for a cubicle
    ASK_PATIENCE: 45,        // a shorter fuse while waiting on a size
    QUEUE_GRACE: 6,
    OUTFIT_ODDS: 0.42,       // chance they are shopping for two pieces, not one
    HAND_REACH: 1.4,         // how close you stand to hand them a size

    /* The buy roll. Trying a thing on is worth a lot, and so is being handed
       the size you asked for — that is service, and it closes sales. */
    BASE_BUY: 0.46,
    FIT_BONUS: 0.26,
    HELP_BONUS: 0.22,
    LEVEL_BONUS: 0.008,
    MAX_BUY: 0.96,
    BUDGET: [0.80, 2.40],
    ASSISTANT_COST: (unlock) => Math.max(12000, Math.round(unlock * 1.3)),
  },

  /* --------------------------------------------------------- the techhub */
  /* Stage 5 is a COMPARISON game. Everywhere else the customer wants one
     thing; here they want a KIND of thing — "a laptop", "a phone" — with a
     priority and a budget, and the shop stocks two of each kind that pull in
     opposite directions. They demo both, weigh the specs against what THEY
     care about, and pick a winner. Advice matters because a spec sheet is
     noise until somebody translates it. */
  TECH: {
    /* The stats a product can be good at, and the badge each shows as. */
    STATS: { perf: '⚡', battery: '🔋', camera: '📷', display: '🖼️', sound: '🎵' },
    BROWSE_TIME: 0.9,        // seconds looking it over at the display
    DEMO_TIME: [2.5, 4.5],   // seconds hands-on at the demo bench
    PATIENCE: 60,            // seconds waiting on a sold-out box
    QUEUE_GRACE: 6,
    ADVISE_REACH: 1.6,
    ADVISE_TIME: 0.9,
    /* The buy roll. Cold, a spec sheet convinces almost nobody; a demo, a
       real comparison and a human recommendation stack up to nearly always. */
    BASE_BUY: 0.30,
    DEMO_BONUS: 0.18,        // they had it in their hands
    COMPARE_BONUS: 0.16,     // they weighed it against the other one and it won
    ADVICE_BONUS: 0.24,      // somebody translated the spec sheet for them
    LEVEL_BONUS: 0.008,
    MAX_BUY: 0.96,
    BUDGET: [0.70, 2.20],    // what they will pay, over their category's prices
    ADVICE_BUDGET: 1.30,     // good advice finds the money for the right one
    ADVISOR_COST: (unlock) => Math.max(30000, Math.round(unlock * 1.2)),
  },

  /* -------------------------------------------------------- fast food */
  /* Stage 3 is a BOTTLENECK game. The cafe makes one drink and hands it
     over; here a meal is three things cooked in three different places, and
     the tray cannot go out until the slowest of them is done:

       burger ✓   drink ✓   fries ✗   ->  the whole order waits

     So the shop is only ever as fast as its worst station, and the player's
     job is to spot which one that is. Nowhere else in the mall does one
     slow machine hold up finished work. */
  FOOD: {
    ORDER_TIME: 0.8,         // seconds to take one order at the counter
    ASSEMBLE_TIME: 1.3,      // seconds to build the tray once every part is up
    PATIENCE: 55,            // seconds holding a ticket before they give up
    QUEUE_GRACE: 5,
    TRAY_CAP: 6,             // finished trays the pickup counter holds
    COMBO_ODDS: 0.62,        // chance they want the meal, not just the main
    STATION_SPEED: 0.30,     // cook speed gained per station level
    STATION_CAP: (lvl) => MSM.util.clamp(1 + (((lvl - 1) / 2) | 0), 1, 5),
    STATION_GROWTH: 1.16,
    /* Two jobs: somebody working the line, and somebody building the trays
       and calling the numbers. Either one missing is a bottleneck of its own. */
    COOK_COST:   (unlock) => Math.max(2600, Math.round(unlock * 0.9)),
    PACKER_COST: (unlock) => Math.max(3400, Math.round(unlock * 1.2)),
  },

  /* --------------------------------------------------------- floor plans */
  /* MSM.CFG.PLAN is the ACTIVE plan. usePlan() copies the current store's
     layout into it IN PLACE, so every module can keep the
     `const P = MSM.CFG.PLAN` it took at load time. */
  PLAN: {},
  PLANS: {},

  STORES: [],
};

/* The mini mart:
     back wall    a row of nine crop beds, right across the width
     left column  the farmyard — pig, chicken, wheat, cow, oven, vat, each
                  one within a few steps of whatever it eats
     right column the orchard: apple, banana, orange
     middle       the shop floor: seventeen shelves in three rows
     front-right  the till, with the queue running back to the door
     front-left   the escalator up to the rest of the mall              */
MSM.CFG.PLANS.grocery = {
  id: 'grocery',
  /* This floor was widened once already, because it played cramped: the
     aisles were 0.7 apart, which is narrower than the router's own clearance,
     so half the gaps you could SEE were gaps you could not walk through, and
     every lane ran close enough to a pen that walking past the cow picked its
     milk up. Everything below is spaced off two numbers: bodies are 0.22
     across and reach 0.8, so a lane you only walk down is kept a clear 0.8
     from anything usable, and a gap you walk THROUGH is at least 1.0. */
  world: { W: 27.5, H: 19.0 },
  /* Nine crop beds along the back, an orchard down the right, and the
     farmyard down the left: pig, chicken, then the wheat field with the two
     things that eat it — the cow and the oven — on either side of it, and
     the yogurt vat under the cow it draws its milk from. Wheat used to sit
     in the far top-right corner, nineteen units from the trough. */
  stations: [
    { x0: 0.70,  y0: 0.60,  x1: 2.60,  y1: 2.00 },   //  0 potato bed
    { x0: 3.60,  y0: 0.60,  x1: 5.50,  y1: 2.00 },   //  1 tomato bed
    { x0: 6.50,  y0: 0.60,  x1: 8.40,  y1: 2.00 },   //  2 carrot bed
    { x0: 9.40,  y0: 0.60,  x1: 11.30, y1: 2.00 },   //  3 eggplant bed
    { x0: 12.30, y0: 0.60,  x1: 14.20, y1: 2.00 },   //  4 cabbage bed
    { x0: 15.20, y0: 0.60,  x1: 17.10, y1: 2.00 },   //  5 cucumber bed
    { x0: 18.10, y0: 0.60,  x1: 20.00, y1: 2.00 },   //  6 watermelon patch
    { x0: 21.00, y0: 0.60,  x1: 22.90, y1: 2.00 },   //  7 strawberry patch
    { x0: 23.90, y0: 0.60,  x1: 25.80, y1: 2.00 },   //  8 blueberry bushes
    { x0: 23.00, y0: 4.80,  x1: 25.20, y1: 6.40 },   //  9 apple tree
    { x0: 23.00, y0: 7.60,  x1: 25.20, y1: 9.20 },   // 10 banana tree
    { x0: 23.00, y0: 10.40, x1: 25.20, y1: 12.00 },  // 11 orange tree
    /* The farmyard column, top to bottom: pig, chicken, wheat, cow, oven,
       vat. Every station that eats something is within three units of what
       it eats, and the column keeps a clear 1.5 from the aisle beside it so
       walking down the shop does not milk the cow on the way past. */
    { x0: 0.70,  y0: 11.50, x1: 3.10,  y1: 13.10 },  // 12 cow pen
    { x0: 0.70,  y0: 7.00,  x1: 3.10,  y1: 8.60 },   // 13 chicken coop
    { x0: 0.70,  y0: 13.90, x1: 2.90,  y1: 15.20 },  // 14 oven
    { x0: 0.70,  y0: 4.60,  x1: 3.10,  y1: 6.20 },   // 15 pig pen
    { x0: 0.70,  y0: 9.40,  x1: 3.10,  y1: 10.70 },  // 16 wheat field
    { x0: 0.70,  y0: 16.00, x1: 2.70,  y1: 17.20 },  // 17 yogurt vat
  ],
  /* Where a body stands to work a station. The default is the middle of its
     front edge, which is right for a bed you walk up to from the aisle; for
     the two side columns it would send the staff straight DOWN through the
     pens they are walking past, so those stand at the side instead. */
  stands: [
    null, null, null, null, null, null, null, null, null,
    { x: 22.50, y: 5.60 },   //  9 apple — from the aisle, not through the tree
    { x: 22.50, y: 8.40 },   // 10 banana
    { x: 22.50, y: 11.20 },  // 11 orange
    { x: 3.60,  y: 12.30 },  // 12 cow
    { x: 3.60,  y: 7.80 },   // 13 chicken
    { x: 3.40,  y: 14.55 },  // 14 oven
    { x: 3.60,  y: 5.40 },   // 15 pig
    { x: 3.60,  y: 10.05 },  // 16 wheat
    { x: 3.20,  y: 16.60 },  // 17 vat
  ],
  pads: [
    { x0: 0.70,  y0: 2.35,  x1: 1.40,  y1: 3.05 },
    { x0: 3.60,  y0: 2.35,  x1: 4.30,  y1: 3.05 },
    { x0: 6.50,  y0: 2.35,  x1: 7.20,  y1: 3.05 },
    { x0: 9.40,  y0: 2.35,  x1: 10.10, y1: 3.05 },
    { x0: 12.30, y0: 2.35,  x1: 13.00, y1: 3.05 },
    { x0: 15.20, y0: 2.35,  x1: 15.90, y1: 3.05 },
    { x0: 18.10, y0: 2.35,  x1: 18.80, y1: 3.05 },
    { x0: 21.00, y0: 2.35,  x1: 21.70, y1: 3.05 },
    { x0: 23.90, y0: 2.35,  x1: 24.60, y1: 3.05 },
    { x0: 22.10, y0: 4.80,  x1: 22.80, y1: 5.50 },
    { x0: 22.10, y0: 7.60,  x1: 22.80, y1: 8.30 },
    { x0: 22.10, y0: 10.40, x1: 22.80, y1: 11.10 },
    { x0: 3.45,  y0: 11.50, x1: 4.15,  y1: 12.20 },
    { x0: 3.45,  y0: 7.00,  x1: 4.15,  y1: 7.70 },
    { x0: 3.25,  y0: 13.90, x1: 3.95,  y1: 14.60 },
    { x0: 3.45,  y0: 4.60,  x1: 4.15,  y1: 5.30 },
    { x0: 3.45,  y0: 9.40,  x1: 4.15,  y1: 10.10 },
    { x0: 3.05,  y0: 16.00, x1: 3.75,  y1: 16.70 },
  ],
  /* Six vegetables, six fruit, five dairy & bakery. Shelves are 1.45 across
     with 1.05 between them and 1.65 between the rows, so both the gap down a
     row and the aisle between two rows are walkable — the old 0.70 gaps were
     scenery you bounced off. */
  shelves: [
    { x0: 5.60,  y0: 4.70, x1: 7.05,  y1: 5.65 },
    { x0: 8.10,  y0: 4.70, x1: 9.55,  y1: 5.65 },
    { x0: 10.60, y0: 4.70, x1: 12.05, y1: 5.65 },
    { x0: 13.10, y0: 4.70, x1: 14.55, y1: 5.65 },
    { x0: 15.60, y0: 4.70, x1: 17.05, y1: 5.65 },
    { x0: 18.10, y0: 4.70, x1: 19.55, y1: 5.65 },
    { x0: 5.60,  y0: 7.30, x1: 7.05,  y1: 8.25 },
    { x0: 8.10,  y0: 7.30, x1: 9.55,  y1: 8.25 },
    { x0: 10.60, y0: 7.30, x1: 12.05, y1: 8.25 },
    { x0: 13.10, y0: 7.30, x1: 14.55, y1: 8.25 },
    { x0: 15.60, y0: 7.30, x1: 17.05, y1: 8.25 },
    { x0: 18.10, y0: 7.30, x1: 19.55, y1: 8.25 },
    { x0: 5.60,  y0: 9.90, x1: 7.05,  y1: 10.85 },
    { x0: 8.10,  y0: 9.90, x1: 9.55,  y1: 10.85 },
    { x0: 10.60, y0: 9.90, x1: 12.05, y1: 10.85 },
    { x0: 13.10, y0: 9.90, x1: 14.55, y1: 10.85 },
    { x0: 15.60, y0: 9.90, x1: 17.05, y1: 10.85 },
  ],
  lanes: [7.58, 10.08, 12.58, 15.08, 17.58, 20.08,
          7.58, 10.08, 12.58, 15.08, 17.58, 20.08,
          7.58, 10.08, 12.58, 15.08, 17.58],
  sections: [
    { name: 'VEGETABLES',     x0: 5.30, y0: 4.35, x1: 19.85, y1: 6.60,  tint: '#BFEAB6' },
    { name: 'FRUIT',          x0: 5.30, y0: 6.95, x1: 19.85, y1: 9.20,  tint: '#FFDCA8' },
    { name: 'DAIRY & BAKERY', x0: 5.30, y0: 9.55, x1: 17.35, y1: 11.80, tint: '#CFE2FF' },
  ],
  /* The floor itself: banded zones first, then patches of grass on top. */
  zones: [
    { y0: -0.25, y1: 3.60,  a: '#A9E4A2', b: '#9FDD98' },   // the crop beds
    { y0: 3.60,  y1: 15.90, a: '#FFE3D2', b: '#FBDBC8' },   // the shop floor
    { y0: 15.90, y1: 19.25, a: '#DCE4EE', b: '#D3DCE8' },   // by the door
  ],
  patches: [
    { x0: -0.25, y0: 3.60, x1: 4.30,  y1: 17.90, c: '#9FDD98', line: 'x1' },
    { x0: 22.30, y0: 3.60, x1: 27.75, y1: 12.60, c: '#9FDD98', line: 'x0' },
  ],

  stockLane: 3.70,
  walkway: 12.10,

  till:  { x0: 20.60, y0: 12.90, x1: 22.20, y1: 13.70 },
  serve: { x: 21.40, y: 12.45 },
  /* Five slots, not four. The queue used to be short enough to fill in a
     busy minute, and a customer who found it full walked straight out with
     an armful of shopping — see MSM.ent.abandon. */
  queue: [{ x: 21.40, y: 14.40 }, { x: 21.40, y: 15.05 },
          { x: 21.40, y: 15.70 }, { x: 21.40, y: 16.35 },
          { x: 21.40, y: 17.00 }],
  entrance: { x: 21.40, y: 18.20 },
  spawn:    { x: 17.60, y: 15.60 },
  door:     { x0: 5.20, y0: 16.00, x1: 8.20, y1: 18.00 },
  sign:     { x0: 19.00, y0: 17.40, x1: 19.70, y1: 18.05 },
  bin:      { x0: 25.00, y0: 17.20, x1: 25.70, y1: 17.90 },
};

/* The coffee shop:
     back wall     six ingredient crates — the back room you fetch from
     back right    the menu board, one plaque per recipe you have unlocked
     left          the ingredient storage the machines actually draw on
     middle        the bar: coffee machine, matcha & ice bar, pastry oven
     front centre  the order counter, with the queue running back to the door
     front right   the pickup counter, and the little waiting area beyond it
     front left    the seating, where they take the drink and sit down   */
MSM.CFG.PLANS.cafe = {
  id: 'cafe',
  stations: [
    /* six supply crates along the back wall */
    { x0: 0.60,  y0: 0.60, x1: 2.30,  y1: 1.80 },   //  0 coffee beans
    { x0: 2.90,  y0: 0.60, x1: 4.60,  y1: 1.80 },   //  1 milk
    { x0: 5.20,  y0: 0.60, x1: 6.90,  y1: 1.80 },   //  2 matcha
    { x0: 7.50,  y0: 0.60, x1: 9.20,  y1: 1.80 },   //  3 cocoa
    { x0: 9.80,  y0: 0.60, x1: 11.50, y1: 1.80 },   //  4 ice
    { x0: 12.10, y0: 0.60, x1: 13.80, y1: 1.80 },   //  5 pastry dough
    /* the menu board: ten recipe plaques, two rows in the back-right */
    { x0: 15.20, y0: 0.60, x1: 16.40, y1: 1.50 },   //  6 espresso
    { x0: 16.80, y0: 0.60, x1: 18.00, y1: 1.50 },   //  7 americano
    { x0: 18.40, y0: 0.60, x1: 19.60, y1: 1.50 },   //  8 latte
    { x0: 20.00, y0: 0.60, x1: 21.20, y1: 1.50 },   //  9 cappuccino
    { x0: 21.60, y0: 0.60, x1: 22.80, y1: 1.50 },   // 10 iced coffee
    { x0: 15.20, y0: 3.10, x1: 16.40, y1: 4.00 },   // 11 mocha
    { x0: 16.80, y0: 3.10, x1: 18.00, y1: 4.00 },   // 12 matcha latte
    { x0: 18.40, y0: 3.10, x1: 19.60, y1: 4.00 },   // 13 iced matcha
    { x0: 20.00, y0: 3.10, x1: 21.20, y1: 4.00 },   // 14 croissant
    { x0: 21.60, y0: 3.10, x1: 22.80, y1: 4.00 },   // 15 cake
  ],
  pads: [
    { x0: 0.60,  y0: 2.10, x1: 1.30,  y1: 2.80 },
    { x0: 2.90,  y0: 2.10, x1: 3.60,  y1: 2.80 },
    { x0: 5.20,  y0: 2.10, x1: 5.90,  y1: 2.80 },
    { x0: 7.50,  y0: 2.10, x1: 8.20,  y1: 2.80 },
    { x0: 9.80,  y0: 2.10, x1: 10.50, y1: 2.80 },
    { x0: 12.10, y0: 2.10, x1: 12.80, y1: 2.80 },
    { x0: 15.45, y0: 1.80, x1: 16.15, y1: 2.50 },
    { x0: 17.05, y0: 1.80, x1: 17.75, y1: 2.50 },
    { x0: 18.65, y0: 1.80, x1: 19.35, y1: 2.50 },
    { x0: 20.25, y0: 1.80, x1: 20.95, y1: 2.50 },
    { x0: 21.85, y0: 1.80, x1: 22.55, y1: 2.50 },
    { x0: 15.45, y0: 4.30, x1: 16.15, y1: 5.00 },
    { x0: 17.05, y0: 4.30, x1: 17.75, y1: 5.00 },
    { x0: 18.65, y0: 4.30, x1: 19.35, y1: 5.00 },
    { x0: 20.25, y0: 4.30, x1: 20.95, y1: 5.00 },
    { x0: 21.85, y0: 4.30, x1: 22.55, y1: 5.00 },
  ],
  shelves: [],
  lanes: [],

  /* One shelf unit the whole bar draws on. You carry beans, milk and the
     rest here from the back — the machines never touch the crates. */
  storage: { x0: 0.60, y0: 5.60, x1: 3.20, y1: 6.90 },

  /* Each machine is a build plot first, then a fixture with its own level
     pad: faster brewing, and more cups on the go at once. `staff` names
     whose station it is — the barista never touches the chef's oven. */
  machines: [
    { id: 'coffee', label: 'Coffee Machine',    cost: 0,     base: 420,  staff: 'barista',
      box: { x0: 4.40,  y0: 5.60, x1: 7.00,  y1: 6.80 },
      pad: { x0: 4.40,  y0: 7.10, x1: 5.10,  y1: 7.80 } },
    { id: 'bar',    label: 'Matcha & Ice Bar',  cost: 4000,  base: 1500, staff: 'barista',
      box: { x0: 8.00,  y0: 5.60, x1: 10.00, y1: 6.80 },
      pad: { x0: 8.00,  y0: 7.10, x1: 8.70,  y1: 7.80 } },
    { id: 'oven',   label: 'Pastry Oven',       cost: 12000, base: 3400, staff: 'chef',
      box: { x0: 11.00, y0: 5.60, x1: 13.00, y1: 6.80 },
      pad: { x0: 11.00, y0: 7.10, x1: 11.70, y1: 7.80 } },
  ],

  /* Seating. The first two come with the shop; the rest are build plots you
     stand on, exactly like everything else in this game. */
  tables: [
    { cost: 0,     box: { x0: 1.20, y0: 10.60, x1: 2.60, y1: 11.70 } },
    { cost: 0,     box: { x0: 4.40, y0: 10.60, x1: 5.80, y1: 11.70 } },
    { cost: 900,   box: { x0: 1.20, y0: 12.90, x1: 2.60, y1: 14.00 } },
    { cost: 2400,  box: { x0: 4.40, y0: 12.90, x1: 5.80, y1: 14.00 } },
    { cost: 6000,  box: { x0: 7.60, y0: 10.60, x1: 9.00, y1: 11.70 } },
    { cost: 14000, box: { x0: 7.60, y0: 12.90, x1: 9.00, y1: 14.00 } },
  ],

  /* Where they stand with a ticket in hand, waiting for you to call it. */
  waits: [
    { x: 13.20, y: 10.90 }, { x: 14.40, y: 10.90 }, { x: 15.60, y: 10.90 },
    { x: 13.20, y: 12.00 }, { x: 14.40, y: 12.00 }, { x: 15.60, y: 12.00 },
  ],

  /* A section is a tinted band with its name lying on the floor, and the
     name is painted at the band's TOP edge — so each one starts on clear
     floor, not underneath the fixtures it belongs to. */
  /* KITCHEN sits last so the older sections keep their translation index. */
  sections: [
    { name: 'BACK ROOM',  x0: 0.35,  y0: 2.95,  x1: 14.10, y1: 4.70,  tint: '#D6E4F4' },
    { name: 'MENU BOARD', x0: 14.70, y0: 5.30,  x1: 23.10, y1: 6.80,  tint: '#FBE3BE' },
    { name: 'THE BAR',    x0: 0.35,  y0: 8.10,  x1: 10.30, y1: 8.90,  tint: '#C7E7D6' },
    { name: 'CAFE',       x0: 0.60,  y0: 9.95,  x1: 9.50,  y1: 14.40, tint: '#FFD9E4' },
    { name: 'KITCHEN',    x0: 10.60, y0: 8.10,  x1: 13.40, y1: 8.90,  tint: '#F6D2BE' },
  ],
  zones: [
    { y0: -0.25, y1: 5.20,  a: '#E8DBC9', b: '#E1D3BF' },   // the prep side
    { y0: 5.20,  y1: 9.90,  a: '#F7EEE0', b: '#F1E6D4' },   // behind the bar
    { y0: 9.90,  y1: 15.45, a: '#EFE0CE', b: '#E7D6C0' },   // the room itself
  ],
  patches: [],

  stockLane: 3.90,
  walkway: 14.05,

  /* The order counter IS the till — the same plot you stand on to build it,
     and the same side you stand on to work it. */
  till:  { x0: 8.00, y0: 9.00, x1: 12.00, y1: 9.80 },
  serve: { x: 10.00, y: 8.50 },
  queue: [{ x: 10.00, y: 10.50 }, { x: 10.00, y: 11.15 },
          { x: 10.00, y: 11.80 }, { x: 10.00, y: 12.45 }],
  pickup:      { x0: 13.20, y0: 9.00, x1: 15.60, y1: 9.80 },
  pickupStand: { x: 14.40, y: 8.50 },

  entrance: { x: 17.80, y: 14.70 },
  spawn:    { x: 10.00, y: 8.00 },
  door:     { x0: 20.20, y0: 11.70, x1: 23.20, y1: 13.90 },
  sign:     { x0: 16.30, y0: 13.95, x1: 17.00, y1: 14.60 },
  bin:      { x0: 19.60, y0: 10.40, x1: 20.30, y1: 11.10 },
};

/* The sport outlet:
     back wall     eight stock crates — the stockroom you fetch from
     mid           four sport zones, two display racks each
     centre        the test area: a treadmill, a goal, a hoop and a net
     front         the cashier, the queue running back to the door

   Nothing here is grown or brewed, so the back of the shop is simple. What
   makes stage 3 its own game happens on the floor: nobody buys a racket they
   have not swung, and nobody swings one you did not build a court for. */
MSM.CFG.PLANS.sports = {
  id: 'sports',
  /* Eight stock crates along the back, one per line, each above the zone it
     serves so a restock run is a short straight walk. */
  stations: [
    { x0: 1.10,  y0: 0.55, x1: 2.90,  y1: 1.70 },   // 0 running shoes
    { x0: 3.50,  y0: 0.55, x1: 5.30,  y1: 1.70 },   // 1 water bottles
    { x0: 6.90,  y0: 0.55, x1: 8.70,  y1: 1.70 },   // 2 footballs
    { x0: 9.30,  y0: 0.55, x1: 11.10, y1: 1.70 },   // 3 football boots
    { x0: 12.70, y0: 0.55, x1: 14.50, y1: 1.70 },   // 4 basketballs
    { x0: 15.10, y0: 0.55, x1: 16.90, y1: 1.70 },   // 5 team jerseys
    { x0: 18.50, y0: 0.55, x1: 20.30, y1: 1.70 },   // 6 rackets
    { x0: 20.90, y0: 0.55, x1: 22.70, y1: 1.70 },   // 7 shuttlecocks
  ],
  pads: [
    { x0: 1.10,  y0: 2.00, x1: 1.80,  y1: 2.70 },
    { x0: 3.50,  y0: 2.00, x1: 4.20,  y1: 2.70 },
    { x0: 6.90,  y0: 2.00, x1: 7.60,  y1: 2.70 },
    { x0: 9.30,  y0: 2.00, x1: 10.00, y1: 2.70 },
    { x0: 12.70, y0: 2.00, x1: 13.40, y1: 2.70 },
    { x0: 15.10, y0: 2.00, x1: 15.80, y1: 2.70 },
    { x0: 18.50, y0: 2.00, x1: 19.20, y1: 2.70 },
    { x0: 20.90, y0: 2.00, x1: 21.60, y1: 2.70 },
  ],
  /* Display racks, two to a sport. The wider gap between each pair is what
     makes the four zones read as four zones from across the room. */
  shelves: [
    { x0: 1.20,  y0: 4.20, x1: 2.80,  y1: 5.15 },
    { x0: 3.60,  y0: 4.20, x1: 5.20,  y1: 5.15 },
    { x0: 7.00,  y0: 4.20, x1: 8.60,  y1: 5.15 },
    { x0: 9.40,  y0: 4.20, x1: 11.00, y1: 5.15 },
    { x0: 12.80, y0: 4.20, x1: 14.40, y1: 5.15 },
    { x0: 15.20, y0: 4.20, x1: 16.80, y1: 5.15 },
    { x0: 18.60, y0: 4.20, x1: 20.20, y1: 5.15 },
    { x0: 21.00, y0: 4.20, x1: 22.60, y1: 5.15 },
  ],
  lanes: [2.00, 4.40, 7.80, 10.20, 13.60, 16.00, 19.40, 21.80],

  /* The test areas — the stage's whole point. Each is a court you walk onto
     and pay for; the prop in the middle of it is the only solid part, so a
     customer can stand on the court and use it. A sport with no court still
     sells, just to far fewer people. */
  areas: [
    { id: 'run',    sport: 'run',    label: 'Running Test',    cost: 0,
      box:  { x0: 0.80,  y0: 6.60, x1: 5.60,  y1: 9.60 },
      prop: { x0: 2.10,  y0: 6.85, x1: 4.30,  y1: 8.05 },
      stand: { x: 3.20,  y: 8.95 } },
    { id: 'foot',   sport: 'foot',   label: 'Football Test',   cost: 60000,
      box:  { x0: 6.40,  y0: 6.60, x1: 11.20, y1: 9.60 },
      prop: { x0: 7.70,  y0: 6.85, x1: 9.90,  y1: 8.05 },
      stand: { x: 8.80,  y: 8.95 } },
    { id: 'basket', sport: 'basket', label: 'Basketball Test', cost: 200000,
      box:  { x0: 12.00, y0: 6.60, x1: 16.80, y1: 9.60 },
      prop: { x0: 13.30, y0: 6.85, x1: 15.50, y1: 8.05 },
      stand: { x: 14.40, y: 8.95 } },
    { id: 'bad',    sport: 'bad',    label: 'Badminton Test',  cost: 500000,
      box:  { x0: 17.60, y0: 6.60, x1: 22.40, y1: 9.60 },
      prop: { x0: 18.90, y0: 6.85, x1: 21.10, y1: 8.05 },
      stand: { x: 20.00, y: 8.95 } },
  ],

  sections: [
    { name: 'RUNNING',    x0: 0.90,  y0: 3.60, x1: 5.50,  y1: 5.80, tint: '#BFE3FF' },
    { name: 'FOOTBALL',   x0: 6.70,  y0: 3.60, x1: 11.30, y1: 5.80, tint: '#C6EFD2' },
    { name: 'BASKETBALL', x0: 12.50, y0: 3.60, x1: 17.10, y1: 5.80, tint: '#FFD9B8' },
    { name: 'BADMINTON',  x0: 18.30, y0: 3.60, x1: 22.90, y1: 5.80, tint: '#E7D6FF' },
    { name: 'TEST AREA',  x0: 0.60,  y0: 6.20, x1: 22.60, y1: 9.90, tint: '#A9DCB6' },
  ],
  zones: [
    { y0: -0.25, y1: 2.95,  a: '#DCE4EE', b: '#D3DCE8' },   // the stockroom
    { y0: 2.95,  y1: 6.20,  a: '#F4F6FA', b: '#EBEFF6' },   // the shop floor
    { y0: 6.20,  y1: 10.10, a: '#BFE3C9', b: '#B4DBBF' },   // the courts
    { y0: 10.10, y1: 15.45, a: '#E8E2F5', b: '#DFD7F0' },   // the front
  ],
  patches: [],

  stockLane: 3.30,
  walkway: 10.15,

  till:  { x0: 9.60, y0: 11.20, x1: 12.40, y1: 12.05 },
  serve: { x: 11.00, y: 10.75 },
  queue: [{ x: 11.00, y: 12.55 }, { x: 11.00, y: 13.15 },
          { x: 11.00, y: 13.75 }, { x: 11.00, y: 14.35 }],
  entrance: { x: 11.00, y: 14.90 },
  spawn:    { x: 7.60,  y: 10.70 },
  door:     { x0: 0.80,  y0: 12.00, x1: 3.80,  y1: 14.20 },
  sign:     { x0: 13.20, y0: 13.70, x1: 13.90, y1: 14.40 },
  bin:      { x0: 21.40, y0: 13.20, x1: 22.10, y1: 13.90 },
};

/* The fashion boutique:
     back wall     eight wardrobe crates — the stockroom you fetch sizes from
     mid           four departments, two hanging rails each
     centre        the fitting rooms, in a row, curtains facing the floor
     front         the cashier, the queue running back to the door

   The rails carry a count PER SIZE, and that is the stage: a full rail with
   no L on it is an empty rail to the customer standing in front of it. */
MSM.CFG.PLANS.boutique = {
  id: 'boutique',
  stations: [
    { x0: 1.10,  y0: 0.55, x1: 2.90,  y1: 1.70 },   // 0 t-shirts
    { x0: 3.50,  y0: 0.55, x1: 5.30,  y1: 1.70 },   // 1 sweaters
    { x0: 6.90,  y0: 0.55, x1: 8.70,  y1: 1.70 },   // 2 jeans
    { x0: 9.30,  y0: 0.55, x1: 11.10, y1: 1.70 },   // 3 shorts
    { x0: 12.70, y0: 0.55, x1: 14.50, y1: 1.70 },   // 4 dresses
    { x0: 15.10, y0: 0.55, x1: 16.90, y1: 1.70 },   // 5 jackets
    { x0: 18.50, y0: 0.55, x1: 20.30, y1: 1.70 },   // 6 caps
    { x0: 20.90, y0: 0.55, x1: 22.70, y1: 1.70 },   // 7 handbags
  ],
  pads: [
    { x0: 1.10,  y0: 2.00, x1: 1.80,  y1: 2.70 },
    { x0: 3.50,  y0: 2.00, x1: 4.20,  y1: 2.70 },
    { x0: 6.90,  y0: 2.00, x1: 7.60,  y1: 2.70 },
    { x0: 9.30,  y0: 2.00, x1: 10.00, y1: 2.70 },
    { x0: 12.70, y0: 2.00, x1: 13.40, y1: 2.70 },
    { x0: 15.10, y0: 2.00, x1: 15.80, y1: 2.70 },
    { x0: 18.50, y0: 2.00, x1: 19.20, y1: 2.70 },
    { x0: 20.90, y0: 2.00, x1: 21.60, y1: 2.70 },
  ],
  /* Hanging rails, two to a department. */
  shelves: [
    { x0: 1.20,  y0: 4.20, x1: 2.80,  y1: 5.15 },
    { x0: 3.60,  y0: 4.20, x1: 5.20,  y1: 5.15 },
    { x0: 7.00,  y0: 4.20, x1: 8.60,  y1: 5.15 },
    { x0: 9.40,  y0: 4.20, x1: 11.00, y1: 5.15 },
    { x0: 12.80, y0: 4.20, x1: 14.40, y1: 5.15 },
    { x0: 15.20, y0: 4.20, x1: 16.80, y1: 5.15 },
    { x0: 18.60, y0: 4.20, x1: 20.20, y1: 5.15 },
    { x0: 21.00, y0: 4.20, x1: 22.60, y1: 5.15 },
  ],
  lanes: [2.00, 4.40, 7.80, 10.20, 13.60, 16.00, 19.40, 21.80],

  /* The cubicles. Two come with the shop; the rest are build plots, and
     every one of them is a customer who does not have to stand and wait. */
  rooms: [
    { cost: 0,       box: { x0: 5.40,  y0: 6.60, x1: 7.30,  y1: 8.10 } },
    { cost: 0,       box: { x0: 8.10,  y0: 6.60, x1: 10.00, y1: 8.10 } },
    { cost: 120000,  box: { x0: 10.80, y0: 6.60, x1: 12.70, y1: 8.10 } },
    { cost: 400000,  box: { x0: 13.50, y0: 6.60, x1: 15.40, y1: 8.10 } },
    { cost: 900000,  box: { x0: 16.20, y0: 6.60, x1: 18.10, y1: 8.10 } },
  ],
  /* Where they stand when every cubicle is taken. */
  waits: [
    { x: 6.35,  y: 9.55 }, { x: 9.05,  y: 9.55 }, { x: 11.75, y: 9.55 },
    { x: 14.45, y: 9.55 }, { x: 17.15, y: 9.55 }, { x: 3.60,  y: 9.55 },
  ],

  sections: [
    { name: 'TOPS',          x0: 0.90,  y0: 3.60, x1: 5.50,  y1: 5.80, tint: '#FFD3E2' },
    { name: 'BOTTOMS',       x0: 6.70,  y0: 3.60, x1: 11.30, y1: 5.80, tint: '#CFE0FF' },
    { name: 'DRESSES',       x0: 12.50, y0: 3.60, x1: 17.10, y1: 5.80, tint: '#E7D6FF' },
    { name: 'ACCESSORIES',   x0: 18.30, y0: 3.60, x1: 22.90, y1: 5.80, tint: '#FFE6C2' },
    { name: 'FITTING ROOMS', x0: 4.90,  y0: 6.20, x1: 18.60, y1: 8.90, tint: '#F6C6D8' },
  ],
  zones: [
    { y0: -0.25, y1: 2.95,  a: '#DCE4EE', b: '#D3DCE8' },   // the stockroom
    { y0: 2.95,  y1: 6.20,  a: '#FBF3F6', b: '#F5EAEF' },   // the shop floor
    { y0: 6.20,  y1: 10.00, a: '#F7DCE6', b: '#F0D0DC' },   // the fitting rooms
    { y0: 10.00, y1: 15.45, a: '#F3EFF7', b: '#EAE4F1' },   // the front
  ],
  patches: [],

  stockLane: 3.30,
  walkway: 10.30,

  till:  { x0: 9.60, y0: 11.10, x1: 12.40, y1: 11.95 },
  serve: { x: 11.00, y: 10.65 },
  queue: [{ x: 11.00, y: 12.45 }, { x: 11.00, y: 13.05 },
          { x: 11.00, y: 13.65 }, { x: 11.00, y: 14.25 }],
  entrance: { x: 11.00, y: 14.80 },
  spawn:    { x: 7.60,  y: 10.60 },
  door:     { x0: 0.80,  y0: 11.90, x1: 3.80,  y1: 14.10 },
  sign:     { x0: 13.10, y0: 13.60, x1: 13.80, y1: 14.30 },
  bin:      { x0: 21.40, y0: 13.00, x1: 22.10, y1: 13.70 },
};

/* The techhub:
     back wall     eight stock crates — the boxed units, sealed
     mid           four departments, two display stands each
     centre        the demo zone: one bench per department, hands-on
     front         the cashier, the queue running back to the door

   The displays are for looking; the BOXES are what sells. A demo never
   consumes stock — you can let fifty people try the floor unit — but a sale
   needs a sealed box on the stand, and that is what the stockers carry. */
MSM.CFG.PLANS.tech = {
  id: 'tech',
  stations: [
    { x0: 1.10,  y0: 0.55, x1: 2.90,  y1: 1.70 },   // 0 earbuds
    { x0: 3.50,  y0: 0.55, x1: 5.30,  y1: 1.70 },   // 1 speaker
    { x0: 6.90,  y0: 0.55, x1: 8.70,  y1: 1.70 },   // 2 phone
    { x0: 9.30,  y0: 0.55, x1: 11.10, y1: 1.70 },   // 3 phone pro
    { x0: 12.70, y0: 0.55, x1: 14.50, y1: 1.70 },   // 4 laptop
    { x0: 15.10, y0: 0.55, x1: 16.90, y1: 1.70 },   // 5 gaming laptop
    { x0: 18.50, y0: 0.55, x1: 20.30, y1: 1.70 },   // 6 monitor
    { x0: 20.90, y0: 0.55, x1: 22.70, y1: 1.70 },   // 7 tv
  ],
  pads: [
    { x0: 1.10,  y0: 2.00, x1: 1.80,  y1: 2.70 },
    { x0: 3.50,  y0: 2.00, x1: 4.20,  y1: 2.70 },
    { x0: 6.90,  y0: 2.00, x1: 7.60,  y1: 2.70 },
    { x0: 9.30,  y0: 2.00, x1: 10.00, y1: 2.70 },
    { x0: 12.70, y0: 2.00, x1: 13.40, y1: 2.70 },
    { x0: 15.10, y0: 2.00, x1: 15.80, y1: 2.70 },
    { x0: 18.50, y0: 2.00, x1: 19.20, y1: 2.70 },
    { x0: 20.90, y0: 2.00, x1: 21.60, y1: 2.70 },
  ],
  /* Display stands, two to a department — the pair the customer compares. */
  shelves: [
    { x0: 1.20,  y0: 4.20, x1: 2.80,  y1: 5.15 },
    { x0: 3.60,  y0: 4.20, x1: 5.20,  y1: 5.15 },
    { x0: 7.00,  y0: 4.20, x1: 8.60,  y1: 5.15 },
    { x0: 9.40,  y0: 4.20, x1: 11.00, y1: 5.15 },
    { x0: 12.80, y0: 4.20, x1: 14.40, y1: 5.15 },
    { x0: 15.20, y0: 4.20, x1: 16.80, y1: 5.15 },
    { x0: 18.60, y0: 4.20, x1: 20.20, y1: 5.15 },
    { x0: 21.00, y0: 4.20, x1: 22.60, y1: 5.15 },
  ],
  lanes: [2.00, 4.40, 7.80, 10.20, 13.60, 16.00, 19.40, 21.80],

  /* The demo benches — the stage's whole point. One per department, a build
     plot like everything else. A department with no bench sells cold, and
     cold sells badly. Only the bench itself is solid; the floor around it is
     where the customer stands with the thing in their hands. */
  areas: [
    { id: 'audiobar',  cat: 'audio',  label: 'Audio Demo',  cost: 0,
      box:  { x0: 0.80,  y0: 6.60, x1: 5.60,  y1: 9.60 },
      prop: { x0: 2.10,  y0: 6.85, x1: 4.30,  y1: 8.05 },
      stand: { x: 3.20,  y: 8.95 } },
    { id: 'phonebar',  cat: 'phone',  label: 'Phone Demo',  cost: 30000000,
      box:  { x0: 6.40,  y0: 6.60, x1: 11.20, y1: 9.60 },
      prop: { x0: 7.70,  y0: 6.85, x1: 9.90,  y1: 8.05 },
      stand: { x: 8.80,  y: 8.95 } },
    { id: 'laptopbar', cat: 'laptop', label: 'Laptop Demo', cost: 90000000,
      box:  { x0: 12.00, y0: 6.60, x1: 16.80, y1: 9.60 },
      prop: { x0: 13.30, y0: 6.85, x1: 15.50, y1: 8.05 },
      stand: { x: 14.40, y: 8.95 } },
    { id: 'screenbar', cat: 'screen', label: 'Screen Demo', cost: 220000000,
      box:  { x0: 17.60, y0: 6.60, x1: 22.40, y1: 9.60 },
      prop: { x0: 18.90, y0: 6.85, x1: 21.10, y1: 8.05 },
      stand: { x: 20.00, y: 8.95 } },
  ],

  sections: [
    { name: 'AUDIO',       x0: 0.90,  y0: 3.60, x1: 5.50,  y1: 5.80, tint: '#D9D2F4' },
    { name: 'SMARTPHONES', x0: 6.70,  y0: 3.60, x1: 11.30, y1: 5.80, tint: '#C4E2FF' },
    { name: 'LAPTOPS',     x0: 12.50, y0: 3.60, x1: 17.10, y1: 5.80, tint: '#C9EEE4' },
    { name: 'SCREENS',     x0: 18.30, y0: 3.60, x1: 22.90, y1: 5.80, tint: '#FFDBC4' },
    { name: 'DEMO ZONE',   x0: 0.60,  y0: 6.20, x1: 22.60, y1: 9.90, tint: '#B7C4E8' },
  ],
  zones: [
    { y0: -0.25, y1: 2.95,  a: '#DCE4EE', b: '#D3DCE8' },   // the stockroom
    { y0: 2.95,  y1: 6.20,  a: '#EEF2FA', b: '#E5EBF6' },   // the shop floor
    { y0: 6.20,  y1: 10.10, a: '#C7D2EC', b: '#BCC9E7' },   // the demo zone
    { y0: 10.10, y1: 15.45, a: '#E4E9F4', b: '#DBE1EF' },   // the front
  ],
  patches: [],

  stockLane: 3.30,
  walkway: 10.15,

  till:  { x0: 9.60, y0: 11.20, x1: 12.40, y1: 12.05 },
  serve: { x: 11.00, y: 10.75 },
  queue: [{ x: 11.00, y: 12.55 }, { x: 11.00, y: 13.15 },
          { x: 11.00, y: 13.75 }, { x: 11.00, y: 14.35 }],
  entrance: { x: 11.00, y: 14.90 },
  spawn:    { x: 7.60,  y: 10.70 },
  door:     { x0: 0.80,  y0: 12.00, x1: 3.80,  y1: 14.20 },
  sign:     { x0: 13.20, y0: 13.70, x1: 13.90, y1: 14.40 },
  bin:      { x0: 21.40, y0: 13.20, x1: 22.10, y1: 13.90 },
};

/* Fast food:
     back wall   eight freezer crates — the raw stock, one per line
     mid         the prep bins the runners fill, grouped by station
     kitchen     three stations: GRILL, FRYER, DRINKS — the bottlenecks
     behind      the assembly bench, then the pickup counter
     front       the order counter, and the queue running back to the door

   The floor is read top to bottom: raw stock comes down from the freezers
   into the line bins, the stations turn it into parts, and the parts only
   become a TRAY once every one of them is up. */
MSM.CFG.PLANS.food = {
  id: 'food',
  stations: [
    { x0: 1.10,  y0: 0.55, x1: 2.90,  y1: 1.70 },   // 0 cheeseburger
    { x0: 3.50,  y0: 0.55, x1: 5.30,  y1: 1.70 },   // 1 double burger
    { x0: 5.90,  y0: 0.55, x1: 7.70,  y1: 1.70 },   // 2 chicken burger
    { x0: 9.10,  y0: 0.55, x1: 10.90, y1: 1.70 },   // 3 fries
    { x0: 11.50, y0: 0.55, x1: 13.30, y1: 1.70 },   // 4 nuggets
    { x0: 13.90, y0: 0.55, x1: 15.70, y1: 1.70 },   // 5 fried chicken
    { x0: 17.90, y0: 0.55, x1: 19.70, y1: 1.70 },   // 6 cola
    { x0: 20.30, y0: 0.55, x1: 22.10, y1: 1.70 },   // 7 milkshake
  ],
  pads: [
    { x0: 1.10,  y0: 2.00, x1: 1.80,  y1: 2.70 },
    { x0: 3.50,  y0: 2.00, x1: 4.20,  y1: 2.70 },
    { x0: 5.90,  y0: 2.00, x1: 6.60,  y1: 2.70 },
    { x0: 9.10,  y0: 2.00, x1: 9.80,  y1: 2.70 },
    { x0: 11.50, y0: 2.00, x1: 12.20, y1: 2.70 },
    { x0: 13.90, y0: 2.00, x1: 14.60, y1: 2.70 },
    { x0: 17.90, y0: 2.00, x1: 18.60, y1: 2.70 },
    { x0: 20.30, y0: 2.00, x1: 21.00, y1: 2.70 },
  ],
  /* The line bins: raw stock waiting at the station that cooks it. A runner
     keeps these full; an empty one is a station that cannot start. */
  shelves: [
    { x0: 1.20,  y0: 4.30, x1: 2.80,  y1: 5.20 },
    { x0: 3.60,  y0: 4.30, x1: 5.20,  y1: 5.20 },
    { x0: 6.00,  y0: 4.30, x1: 7.60,  y1: 5.20 },
    { x0: 9.20,  y0: 4.30, x1: 10.80, y1: 5.20 },
    { x0: 11.60, y0: 4.30, x1: 13.20, y1: 5.20 },
    { x0: 14.00, y0: 4.30, x1: 15.60, y1: 5.20 },
    { x0: 18.00, y0: 4.30, x1: 19.60, y1: 5.20 },
    { x0: 20.40, y0: 4.30, x1: 22.00, y1: 5.20 },
  ],
  lanes: [2.00, 4.40, 6.80, 10.00, 12.40, 14.80, 18.80, 21.20],

  /* The three stations. Every combo needs all three, so the slowest one
     sets the pace of the whole shop — level them up to relieve it. */
  machines: [
    { id: 'grill',  cat: 'grill',  label: 'Grill',      cost: 0,     base: 900,
      box: { x0: 1.60,  y0: 6.60, x1: 7.20,  y1: 7.80 },
      pad: { x0: 1.60,  y0: 8.10, x1: 2.30,  y1: 8.80 } },
    { id: 'fryer',  cat: 'fryer',  label: 'Fryer',      cost: 5000,  base: 1800,
      box: { x0: 9.60,  y0: 6.60, x1: 15.20, y1: 7.80 },
      pad: { x0: 9.60,  y0: 8.10, x1: 10.30, y1: 8.80 } },
    { id: 'drinks', cat: 'drinks', label: 'Drinks Bar', cost: 14000, base: 3200,
      box: { x0: 17.60, y0: 6.60, x1: 22.00, y1: 7.80 },
      pad: { x0: 17.60, y0: 8.10, x1: 18.30, y1: 8.80 } },
  ],

  /* Where a finished order becomes a tray, and where the tray waits. */
  /* The bench STOPS clear of the order counter at 7.60. They used to run
     into each other by four tenths of a tile, and since the bench stands
     0.70 to the till's 0.55 it swallowed the register whole — all you saw of
     it was a navy corner poking out of the end of the bench. */
  assembly: { x0: 3.60,  y0: 9.60, x1: 6.90,  y1: 10.40 },
  pickup:   { x0: 12.40, y0: 9.60, x1: 16.80, y1: 10.40 },
  pickupStand: { x: 14.60, y: 11.00 },

  /* Where they stand with a ticket, waiting for their number. */
  waits: [
    { x: 13.20, y: 12.10 }, { x: 14.80, y: 12.10 }, { x: 16.40, y: 12.10 },
    { x: 13.20, y: 13.30 }, { x: 14.80, y: 13.30 }, { x: 16.40, y: 13.30 },
  ],

  sections: [
    { name: 'GRILL',    x0: 0.90,  y0: 3.70, x1: 7.80,  y1: 5.50, tint: '#FFD2C2' },
    { name: 'FRYER',    x0: 8.90,  y0: 3.70, x1: 15.90, y1: 5.50, tint: '#FFE7B8' },
    { name: 'DRINKS',   x0: 17.30, y0: 3.70, x1: 22.30, y1: 5.50, tint: '#CFE8F7' },
    { name: 'PICKUP',   x0: 11.90, y0: 9.10, x1: 17.30, y1: 11.40, tint: '#D9F0D2' },
  ],
  zones: [
    { y0: -0.25, y1: 2.95,  a: '#DCE4EE', b: '#D3DCE8' },   // the freezers
    { y0: 2.95,  y1: 9.10,  a: '#FBEFE2', b: '#F5E6D6' },   // the kitchen
    { y0: 9.10,  y1: 11.40, a: '#FFF3DE', b: '#FCEACE' },   // behind the counter
    { y0: 11.40, y1: 15.45, a: '#F3EDE2', b: '#EBE3D5' },   // the customer side
  ],
  patches: [],

  stockLane: 3.30,
  walkway: 11.55,

  till:  { x0: 7.60, y0: 9.60, x1: 11.60, y1: 10.40 },
  serve: { x: 9.60, y: 9.10 },
  queue: [{ x: 9.60, y: 11.10 }, { x: 9.60, y: 11.80 },
          { x: 9.60, y: 12.50 }, { x: 9.60, y: 13.20 }],
  entrance: { x: 9.60,  y: 14.60 },
  spawn:    { x: 6.00,  y: 12.20 },
  door:     { x0: 0.80,  y0: 12.00, x1: 3.80,  y1: 14.20 },
  sign:     { x0: 19.40, y0: 13.60, x1: 20.10, y1: 14.30 },
  bin:      { x0: 21.40, y0: 12.60, x1: 22.10, y1: 13.30 },
};

MSM.CFG.STORES = [
  {
    id: 'grocery', name: 'Grocery Store', glyph: '🥕', color: '#5FCBB6', unlock: 0,
    plan: MSM.CFG.PLANS.grocery,
    /* Lines open one at a time at their own build plot; the price of each
       rises with its place in the order. */
    unlocks: [
      { id: 'potato',     cost: 0 },
      { id: 'tomato',     cost: 250 },
      { id: 'carrot',     cost: 550 },
      { id: 'wheat',      cost: 950 },
      { id: 'milk',       cost: 1600 },
      { id: 'bread',      cost: 2600 },
      { id: 'yogurt',     cost: 3400 },
      { id: 'egg',        cost: 4200 },
      { id: 'bacon',      cost: 6000 },
      { id: 'eggplant',   cost: 8500 },
      { id: 'cabbage',    cost: 11000 },
      { id: 'cucumber',   cost: 14000 },
      { id: 'strawberry', cost: 18000 },
      { id: 'watermelon', cost: 24000 },
      { id: 'blueberry',  cost: 32000 },
      { id: 'apple',      cost: 45000 },
      { id: 'banana',     cost: 62000 },
      { id: 'orange',     cost: 85000 },
    ],
    products: [
      /* --- vegetables ------------------------------------------------ */
      { id:'potato',     name:'Potato',     glyph:'🥔', color:'#C69A63', price:9,   restock:2.0, art:'potato',
        source:{ kind:'crop', label:'Potato Bed' } },
      { id:'tomato',     name:'Tomato',     glyph:'🍅', color:'#FF5C5C', price:14,  restock:2.2, art:'tomato',
        source:{ kind:'crop', label:'Tomato Bed' } },
      { id:'carrot',     name:'Carrot',     glyph:'🥕', color:'#F08A2E', price:20,  restock:2.4, art:'carrot',
        source:{ kind:'crop', label:'Carrot Bed' } },
      { id:'eggplant',   name:'Eggplant',   glyph:'🍆', color:'#8B5CC7', price:82,  restock:2.6, art:'eggplant',
        source:{ kind:'crop', label:'Eggplant Bed' } },
      { id:'cabbage',    name:'Cabbage',    glyph:'🥬', color:'#7CC24E', price:96,  restock:2.8, art:'cabbage',
        source:{ kind:'crop', label:'Cabbage Bed' } },
      { id:'cucumber',   name:'Cucumber',   glyph:'🥒', color:'#4F9E3E', price:112, restock:2.9, art:'cucumber',
        source:{ kind:'crop', label:'Cucumber Bed' } },
      /* --- fruit ----------------------------------------------------- */
      { id:'watermelon', name:'Watermelon', glyph:'🍉', color:'#3FA45B', price:155, restock:3.0, art:'watermelon',
        source:{ kind:'crop', label:'Watermelon Patch' } },
      { id:'strawberry', name:'Strawberry', glyph:'🍓', color:'#F0384F', price:130, restock:2.8, art:'strawberry',
        source:{ kind:'crop', label:'Strawberry Patch' } },
      { id:'blueberry',  name:'Blueberry',  glyph:'🫐', color:'#5A6CD8', price:185, restock:3.1, art:'blueberry',
        source:{ kind:'crop', label:'Blueberry Bushes' } },
      { id:'apple',      name:'Apple',      glyph:'🍎', color:'#E8413F', price:230, restock:3.0, art:'apple',
        source:{ kind:'tree', label:'Apple Tree' } },
      { id:'banana',     name:'Banana',     glyph:'🍌', color:'#F2CB3D', price:285, restock:3.2, art:'banana',
        source:{ kind:'tree', label:'Banana Tree' } },
      { id:'orange',     name:'Orange',     glyph:'🍊', color:'#FF9A1F', price:355, restock:3.4, art:'orange',
        source:{ kind:'tree', label:'Orange Tree' } },
      /* --- dairy, bakery and the butcher ----------------------------- */
      { id:'milk',       name:'Milk',       glyph:'🥛', color:'#DFE7F3', price:30,  restock:3.0, art:'milk',
        source:{ kind:'cow', label:'Cow', input:'wheat' } },
      { id:'egg',        name:'Eggs',       glyph:'🥚', color:'#F6E7CE', price:56,  restock:3.2, art:'egg',
        source:{ kind:'chicken', label:'Chicken Coop', input:'tomato' } },
      { id:'bread',      name:'Bread',      glyph:'🍞', color:'#E0A44E', price:42,  restock:3.4, art:'bread',
        source:{ kind:'machine', label:'Oven', input:'wheat' } },
      { id:'bacon',      name:'Bacon',      glyph:'🥓', color:'#E86A78', price:68,  restock:3.3, art:'bacon',
        source:{ kind:'pig', label:'Pig Pen', input:'potato' } },
      /* Not sold — wheat is what the cow and the oven eat. */
      { id:'wheat',      name:'Wheat',      glyph:'🌾', color:'#E8C86A', price:0,   restock:1.5, art:'wheat',
        sell:false, source:{ kind:'crop', label:'Wheat Field' } },

      /* Made from milk, so it sits at the end of the array — see above. */
      { id:'yogurt',     name:'Yogurt',     glyph:'🥣', color:'#EFD3E4', price:48,  restock:3.1, art:'yogurt',
        source:{ kind:'vat', label:'Yogurt Vat', input:'milk' } },
    ],
  },

  /* ------------------------------------------------------- STAGE 2 ---- */
  /* Nothing here waits on a shelf. Six ingredients come out of the back
     room and go into the storage by the bar; ten recipes turn them into
     drinks, but only once somebody has ordered one. */
  {
    id: 'coffee', name: 'Coffee Shop', glyph: '☕', color: '#B07A4E', unlock: 6000,
    mode: 'cafe',
    plan: MSM.CFG.PLANS.cafe,
    unlocks: [
      { id: 'beans',       cost: 0 },
      { id: 'espresso',    cost: 0 },
      { id: 'americano',   cost: 140 },
      { id: 'dairy',       cost: 320 },
      { id: 'latte',       cost: 600 },
      { id: 'cappuccino',  cost: 1100 },
      { id: 'ice',         cost: 1800 },
      { id: 'icedcoffee',  cost: 2600 },
      { id: 'cocoa',       cost: 3800 },
      { id: 'mocha',       cost: 5200 },
      { id: 'matcha',      cost: 7000 },
      { id: 'matchalatte', cost: 9500 },
      { id: 'icedmatcha',  cost: 13000 },
      { id: 'dough',       cost: 17000 },
      { id: 'croissant',   cost: 22000 },
      { id: 'cake',        cost: 30000 },
    ],
    products: [
      /* --- the back room: what the crates hold ----------------------- */
      { id:'beans',  name:'Coffee Beans', glyph:'🫘', color:'#7A4A2B', price:0, restock:1.4, art:'beans',
        sell:false, source:{ kind:'supply', label:'Bean Sack' } },
      { id:'dairy',  name:'Milk',         glyph:'🥛', color:'#DFE7F3', price:0, restock:1.6, art:'milk',
        sell:false, source:{ kind:'supply', label:'Milk Fridge' } },
      { id:'matcha', name:'Matcha',       glyph:'🍵', color:'#7FB93B', price:0, restock:2.2, art:'matchatin',
        sell:false, source:{ kind:'supply', label:'Matcha Tin' } },
      { id:'cocoa',  name:'Cocoa',        glyph:'🍫', color:'#6B4226', price:0, restock:2.0, art:'cocoa',
        sell:false, source:{ kind:'supply', label:'Cocoa Box' } },
      { id:'ice',    name:'Ice',          glyph:'🧊', color:'#9FD8F5', price:0, restock:1.2, art:'ice',
        sell:false, source:{ kind:'supply', label:'Ice Machine' } },
      { id:'dough',  name:'Pastry Dough', glyph:'🫓', color:'#E8CFA0', price:0, restock:2.4, art:'dough',
        sell:false, source:{ kind:'supply', label:'Dough Tray' } },

      /* --- the menu: a recipe plaque each, and what it takes to make - */
      { id:'espresso',    name:'Espresso',     glyph:'☕', color:'#8C5A34', price:90,  restock:1.5, art:'espresso',
        machine:'coffee', recipe:{ beans:1 },
        source:{ kind:'menu', label:'Espresso Recipe' } },
      { id:'americano',   name:'Americano',    glyph:'☕', color:'#6F4327', price:110, restock:1.7, art:'americano',
        machine:'coffee', recipe:{ beans:1 },
        source:{ kind:'menu', label:'Americano Recipe' } },
      { id:'latte',       name:'Latte',        glyph:'🥛', color:'#D9B48F', price:160, restock:2.2, art:'latte',
        machine:'coffee', recipe:{ beans:1, dairy:1 },
        source:{ kind:'menu', label:'Latte Recipe' } },
      { id:'cappuccino',  name:'Cappuccino',   glyph:'☕', color:'#C89A6E', price:210, restock:2.4, art:'cappuccino',
        machine:'coffee', recipe:{ beans:1, dairy:1 },
        source:{ kind:'menu', label:'Cappuccino Recipe' } },
      { id:'icedcoffee',  name:'Iced Coffee',  glyph:'🧊', color:'#8E6A4A', price:260, restock:2.0, art:'icedcoffee',
        machine:'coffee', recipe:{ beans:1, ice:1 },
        source:{ kind:'menu', label:'Iced Coffee Recipe' } },
      { id:'mocha',       name:'Mocha',        glyph:'🍫', color:'#7B4A2E', price:330, restock:2.8, art:'mocha',
        machine:'coffee', recipe:{ beans:1, dairy:1, cocoa:1 },
        source:{ kind:'menu', label:'Mocha Recipe' } },
      { id:'matchalatte', name:'Matcha Latte', glyph:'🍵', color:'#8FC24E', price:400, restock:2.6, art:'matchalatte',
        machine:'bar', recipe:{ matcha:1, dairy:1 },
        source:{ kind:'menu', label:'Matcha Latte Recipe' } },
      { id:'icedmatcha',  name:'Iced Matcha',  glyph:'🧊', color:'#77B25A', price:480, restock:2.4, art:'icedmatcha',
        machine:'bar', recipe:{ matcha:1, ice:1, dairy:1 },
        source:{ kind:'menu', label:'Iced Matcha Recipe' } },
      { id:'croissant',   name:'Croissant',    glyph:'🥐', color:'#E8B761', price:300, restock:2.0, art:'croissant',
        machine:'oven', recipe:{ dough:1 },
        source:{ kind:'menu', label:'Croissant Recipe' } },
      { id:'cake',        name:'Cake',         glyph:'🍰', color:'#FF9EC4', price:560, restock:3.0, art:'cake',
        machine:'oven', recipe:{ dough:1, cocoa:1 },
        source:{ kind:'menu', label:'Cake Recipe' } },
    ],
  },

  /* ------------------------------------------------------- STAGE 3 ---- */
  /* Eight lines across three stations. Every meal is a main, a side and a
     drink, which means every meal touches all three — and the tray waits on
     whichever of them is slowest. Fictional brands throughout. */
  {
    id: 'food', name: 'Burger Rush', glyph: '🍔', color: '#E8552F', unlock: 45000,
    mode: 'food',
    plan: MSM.CFG.PLANS.food,
    unlocks: [
      { id: 'cheeseburger', cost: 0 },
      { id: 'fries',        cost: 0 },
      { id: 'cola',         cost: 0 },
      { id: 'nuggets',      cost: 3500 },
      { id: 'doubleburger', cost: 9000 },
      { id: 'shake',        cost: 20000 },
      { id: 'chickenburger',cost: 42000 },
      { id: 'friedchicken', cost: 90000 },
    ],
    products: [
      /* --- 🔥 the grill ---------------------------------------------- */
      { id:'cheeseburger',  name:'Cheeseburger',   glyph:'🍔', color:'#D8912F', price:190, restock:1.8, art:'burger',
        cat:'grill',  role:'main', source:{ kind:'freezer', label:'Patty Freezer' } },
      { id:'doubleburger',  name:'Double Burger',  glyph:'🍔', color:'#C4762A', price:320, restock:2.2, art:'bigburger',
        cat:'grill',  role:'main', source:{ kind:'freezer', label:'Double Freezer' } },
      { id:'chickenburger', name:'Chicken Burger', glyph:'🍔', color:'#E0A44E', price:480, restock:2.4, art:'burger',
        cat:'grill',  role:'main', source:{ kind:'freezer', label:'Chicken Patty Freezer' } },
      /* --- 🍟 the fryer ---------------------------------------------- */
      { id:'fries',         name:'Fries',          glyph:'🍟', color:'#F2C23D', price:120, restock:1.5, art:'fries',
        cat:'fryer',  role:'side', source:{ kind:'freezer', label:'Fries Freezer' } },
      { id:'nuggets',       name:'Nuggets',        glyph:'🍗', color:'#E8A64E', price:210, restock:1.9, art:'nuggets',
        cat:'fryer',  role:'side', source:{ kind:'freezer', label:'Nugget Freezer' } },
      { id:'friedchicken',  name:'Fried Chicken',  glyph:'🍗', color:'#C9762E', price:640, restock:2.6, art:'drumstick',
        cat:'fryer',  role:'main', source:{ kind:'freezer', label:'Chicken Freezer' } },
      /* --- 🥤 the drinks bar ----------------------------------------- */
      { id:'cola',          name:'Cola',           glyph:'🥤', color:'#8C3B2E', price:100, restock:1.2, art:'softdrink',
        cat:'drinks', role:'drink', source:{ kind:'freezer', label:'Syrup Store' } },
      { id:'shake',         name:'Milkshake',      glyph:'🥤', color:'#F0C7D8', price:260, restock:1.8, art:'shake',
        cat:'drinks', role:'drink', source:{ kind:'freezer', label:'Shake Mix Store' } },
    ],
  },

  /* ------------------------------------------------------- STAGE 5 ---- */
  /* Four sports, two lines each, and a court for every one of them. The
     lines open a sport at a time, so a zone arrives whole: the gear, the
     kit, and then the place to try them out. */
  {
    id: 'sports', name: 'Sport Outlet', glyph: '🏀', color: '#8B62FF', unlock: 180000,
    mode: 'sports',
    plan: MSM.CFG.PLANS.sports,
    unlocks: [
      { id: 'runshoe',    cost: 0 },
      { id: 'bottle',     cost: 9000 },
      { id: 'football',   cost: 26000 },
      { id: 'boots',      cost: 60000 },
      { id: 'basketball', cost: 130000 },
      { id: 'jersey',     cost: 260000 },
      { id: 'racket',     cost: 520000 },
      { id: 'shuttle',    cost: 900000 },
    ],
    products: [
      /* --- 🏃 running ------------------------------------------------ */
      { id:'runshoe',    name:'Running Shoes',  glyph:'👟', color:'#4FB0FF', price:2400,  restock:2.0, art:'shoes',
        sport:'run',    source:{ kind:'stock', label:'Shoe Stock' } },
      { id:'bottle',     name:'Water Bottle',   glyph:'🥤', color:'#2FCB9E', price:3200,  restock:1.8, art:'bottle',
        sport:'run',    source:{ kind:'stock', label:'Bottle Stock' } },
      /* --- ⚽ football ----------------------------------------------- */
      { id:'football',   name:'Football',       glyph:'⚽', color:'#EDEFF4', price:4800,  restock:2.2, art:'football',
        sport:'foot',   source:{ kind:'stock', label:'Football Stock' } },
      { id:'boots',      name:'Football Boots', glyph:'🥾', color:'#FF5C5C', price:6400,  restock:2.5, art:'boots',
        sport:'foot',   source:{ kind:'stock', label:'Boot Stock' } },
      /* --- 🏀 basketball --------------------------------------------- */
      { id:'basketball', name:'Basketball',     glyph:'🏀', color:'#FF8A3D', price:9000,  restock:2.4, art:'ball',
        sport:'basket', source:{ kind:'stock', label:'Basketball Stock' } },
      { id:'jersey',     name:'Team Jersey',    glyph:'👕', color:'#FF5C8A', price:12000, restock:2.7, art:'shirt',
        sport:'basket', source:{ kind:'stock', label:'Jersey Stock' } },
      /* --- 🏸 badminton ---------------------------------------------- */
      { id:'racket',     name:'Racket',         glyph:'🏸', color:'#C9E265', price:17000, restock:2.8, art:'racket',
        sport:'bad',    source:{ kind:'stock', label:'Racket Stock' } },
      { id:'shuttle',    name:'Shuttlecocks',   glyph:'🪶', color:'#F4F8FC', price:24000, restock:2.2, art:'shuttle',
        sport:'bad',    source:{ kind:'stock', label:'Shuttle Stock' } },
    ],
  },
  /* ------------------------------------------------------- STAGE 4 ---- */
  /* Four departments, two rails each. Six of the eight lines are garments —
     they carry sizes and they get tried on. The two accessories do neither,
     which is exactly why they are the quick sale on a busy afternoon. */
  {
    id: 'fashion', name: 'Fashion Boutique', glyph: '👗', color: '#FF7BA6', unlock: 4200000,
    mode: 'boutique',
    plan: MSM.CFG.PLANS.boutique,
    unlocks: [
      { id: 'tshirt',  cost: 0 },
      { id: 'jeans',   cost: 40000 },
      { id: 'cap',     cost: 90000 },
      { id: 'shorts',  cost: 180000 },
      { id: 'sweater', cost: 350000 },
      { id: 'dress',   cost: 700000 },
      { id: 'jacket',  cost: 1400000 },
      { id: 'handbag', cost: 2600000 },
    ],
    products: [
      /* --- 👕 tops --------------------------------------------------- */
      { id:'tshirt',  name:'T-Shirt',  glyph:'👕', color:'#7FD4FF', price:46000,  restock:1.9, art:'shirt',
        garment:true,  source:{ kind:'wardrobe', label:'T-Shirt Stock' } },
      { id:'sweater', name:'Sweater',  glyph:'🧶', color:'#E8845C', price:88000,  restock:2.6, art:'sweater',
        garment:true,  source:{ kind:'wardrobe', label:'Sweater Stock' } },
      /* --- 👖 bottoms ------------------------------------------------ */
      { id:'jeans',   name:'Jeans',    glyph:'👖', color:'#5A78C4', price:62000,  restock:2.2, art:'jeans',
        garment:true,  source:{ kind:'wardrobe', label:'Jeans Stock' } },
      { id:'shorts',  name:'Shorts',   glyph:'🩳', color:'#5FCBB6', price:54000,  restock:2.0, art:'shorts',
        garment:true,  source:{ kind:'wardrobe', label:'Shorts Stock' } },
      /* --- 👗 dresses & coats ---------------------------------------- */
      { id:'dress',   name:'Dress',    glyph:'👗', color:'#FF7BA6', price:145000, restock:2.8, art:'dress',
        garment:true,  source:{ kind:'wardrobe', label:'Dress Stock' } },
      { id:'jacket',  name:'Jacket',   glyph:'🧥', color:'#8B62FF', price:230000, restock:3.0, art:'jacket',
        garment:true,  source:{ kind:'wardrobe', label:'Jacket Stock' } },
      /* --- 🧢 accessories: no size, no cubicle, straight to the till -- */
      { id:'cap',     name:'Cap',      glyph:'🧢', color:'#F0384F', price:38000,  restock:1.7, art:'cap',
        garment:false, source:{ kind:'wardrobe', label:'Cap Stock' } },
      { id:'handbag', name:'Handbag',  glyph:'👜', color:'#C98B4B', price:380000, restock:3.2, art:'bag',
        garment:false, source:{ kind:'wardrobe', label:'Handbag Stock' } },
    ],
  },
  /* ------------------------------------------------------- STAGE 5 ---- */
  /* Four departments, and in each one a PAIR that pulls opposite ways: the
     phone with the battery against the phone with the camera, the thin
     laptop against the fast one. A customer's priority decides which of the
     two is "better", and that is the entire point of the store. */
  {
    id: 'tech', name: 'TechHub', glyph: '📱', color: '#4FB0FF', unlock: 95000000,
    mode: 'tech',
    plan: MSM.CFG.PLANS.tech,
    unlocks: [
      { id: 'buds',     cost: 0 },
      { id: 'phone',    cost: 2000000 },
      { id: 'speaker',  cost: 5000000 },
      { id: 'phonepro', cost: 12000000 },
      { id: 'laptop',   cost: 26000000 },
      { id: 'monitor',  cost: 55000000 },
      { id: 'gambook',  cost: 120000000 },
      { id: 'tv',       cost: 260000000 },
    ],
    products: [
      /* --- 🎧 audio: long-life buds against the big loud speaker -------- */
      { id:'buds',     name:'TechBuds',       glyph:'🎧', color:'#E7EEF7', price:900000,   restock:2.0, art:'buds',
        cat:'audio',  specs:{ sound:3, battery:4 },
        source:{ kind:'techstock', label:'TechBuds Stock' } },
      { id:'speaker',  name:'TechSound Max',  glyph:'🔊', color:'#5A6472', price:1900000,  restock:2.4, art:'speaker',
        cat:'audio',  specs:{ sound:5, battery:1 },
        source:{ kind:'techstock', label:'Speaker Stock' } },
      /* --- 📱 phones: the battery phone against the camera phone -------- */
      { id:'phone',    name:'TechPhone',      glyph:'📱', color:'#4FB0FF', price:1400000,  restock:2.2, art:'phone',
        cat:'phone',  specs:{ camera:3, battery:5 },
        source:{ kind:'techstock', label:'TechPhone Stock' } },
      { id:'phonepro', name:'TechPhone Pro',  glyph:'📱', color:'#2B3450', price:2600000,  restock:2.6, art:'phone',
        cat:'phone',  specs:{ camera:5, battery:3 },
        source:{ kind:'techstock', label:'Pro Stock' } },
      /* --- 💻 laptops: all-day thin against all-out fast ---------------- */
      { id:'laptop',   name:'TechBook Air',   glyph:'💻', color:'#C9D2DC', price:3400000,  restock:2.8, art:'laptop',
        cat:'laptop', specs:{ perf:3, battery:5 },
        source:{ kind:'techstock', label:'TechBook Stock' } },
      { id:'gambook',  name:'TechBook Pro',   glyph:'💻', color:'#8B62FF', price:6000000,  restock:3.0, art:'laptop',
        cat:'laptop', specs:{ perf:5, battery:2 },
        source:{ kind:'techstock', label:'Pro Book Stock' } },
      /* --- 📺 screens: the fast monitor against the huge TV ------------- */
      { id:'monitor',  name:'TechView 144',   glyph:'🖥️', color:'#5FCBB6', price:4500000,  restock:3.0, art:'monitor',
        cat:'screen', specs:{ display:4, perf:4, sound:1 },
        source:{ kind:'techstock', label:'Monitor Stock' } },
      { id:'tv',       name:'TechVision TV',  glyph:'📺', color:'#4E5D80', price:8000000,  restock:3.4, art:'tv',
        cat:'screen', specs:{ display:5, perf:1, sound:4 },
        source:{ kind:'techstock', label:'TV Stock' } },
    ],
  },
];

/* Bind each store's products to ITS OWN floor plan. */
MSM.CFG.STORES.forEach((store) => {
  const P = store.plan = store.plan || MSM.CFG.PLANS.grocery;
  const cafe = store.mode === 'cafe';
  let shelfN = 0;
  store.products.forEach((p, n) => {
    p.index = n;
    p.sell = p.sell !== false;
    p.source = p.source || { kind: 'maker', label: p.name };
    p.crate = P.stations[n];
    p.pad = P.pads[n];

    if (cafe) {
      /* A cafe product is either an ingredient — fetched from a crate and
         carried to the storage — or a recipe, which is made to order and
         never sits anywhere. Every ingredient shares the one storage unit. */
      p.drink = !!p.recipe;
      p.ingredient = !p.drink;
      if (p.ingredient) {
        p.shelf = P.storage;
        p.lane = (P.storage.x0 + P.storage.x1) / 2;
        p.browse = { x: p.lane, y: P.storage.y1 + 0.55 };
      } else {
        p.machineIndex = P.machines.findIndex((m) => m.id === p.machine);
      }
    } else if (store.mode === 'food') {
      /* Fast food keeps a line bin per product, and every product belongs to
         the station that cooks it. */
      p.shelf = P.shelves[shelfN];
      p.lane = P.lanes[shelfN];
      p.browse = { x: (p.shelf.x0 + p.shelf.x1) / 2, y: p.shelf.y1 + 0.55 };
      p.machineIndex = P.machines.findIndex((m) => m.cat === p.cat);
      shelfN++;
    } else if (p.sell) {
      p.shelf = P.shelves[shelfN];
      p.lane = P.lanes[shelfN];
      p.browse = { x: (p.shelf.x0 + p.shelf.x1) / 2, y: p.shelf.y1 + 0.55 };
      shelfN++;
    }

    /* Which court or demo bench this line is tried out on. -1 means its
       group has no area in the plan at all; an area that is merely unbuilt
       is a state, not a layout, so the sim checks that separately. */
    if (P.areas) {
      const key = p.sport || p.cat;
      p.areaIndex = key == null ? -1
        : P.areas.findIndex((a) => (a.sport || a.cat) === key);
    }

    p.upgradeBase = Math.max(60, (p.price || 12) * 7);
    if (p.shelf && !cafe) {
      const sec = (P.sections || []).find((z) =>
        p.shelf.x0 >= z.x0 - 0.4 && p.shelf.x1 <= z.x1 + 0.4 &&
        p.shelf.y0 >= z.y0 - 0.4 && p.shelf.y1 <= z.y1 + 0.4);
      p.section = sec ? sec.name : '';
    }
  });
  // an animal or a machine eats another product — store its index
  store.products.forEach((p) => {
    p.source.inputIndex = p.source.input
      ? store.products.findIndex((q) => q.id === p.source.input) : -1;
    /* A recipe names its ingredients by id; the sim wants indices. */
    if (!p.recipe) return;
    p.needs = Object.keys(p.recipe).map((id) => ({
      n: store.products.findIndex((q) => q.id === id),
      qty: p.recipe[id],
    })).filter((r) => r.n >= 0);
  });
  /* The unlock sequence: an explicit list, or array order with costs from the
     price. Anything that costs nothing comes with the store. */
  const order = store.unlocks
    ? store.unlocks.map((u) => ({ n: store.products.findIndex((q) => q.id === u.id), cost: u.cost }))
    : store.products.map((p, n) => ({ n, cost: n === 0 ? 0 : Math.round((p.price || 12) * 22) }));
  order.forEach((u, rank) => {
    store.products[u.n].rank = rank;
    store.products[u.n].buildCost = u.cost;
  });
  store.sells = store.products.filter((p) => p.sell);
  store.stockerCost = (owned) => MSM.CFG.STOCKER_COST(store.unlock, owned);
  store.cashierCost = MSM.CFG.CASHIER_COST(store.unlock);
});

/* Make the active plan point at a store's layout, IN PLACE — every module
   holds a reference to MSM.CFG.PLAN taken at load time. */
MSM.CFG.usePlan = function (i) {
  const store = MSM.CFG.STORES[i] || MSM.CFG.STORES[0];
  if (MSM.CFG.PLAN.id === store.plan.id) return false;
  Object.keys(MSM.CFG.PLAN).forEach((k) => { delete MSM.CFG.PLAN[k]; });
  Object.assign(MSM.CFG.PLAN, store.plan);
  // the floor box travels with the plan, in place — iso and world hold it
  Object.assign(MSM.CFG.WORLD, store.plan.world || MSM.CFG.WORLD_DEFAULT);
  return true;
};
MSM.CFG.usePlan(0);

/* ------------------------------------------------------------- helpers */
MSM.util = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,

  shade(hex, t) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
      Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t))
    );
    return '#' + ch.map((c) => MSM.util.clamp(c, 0, 255).toString(16).padStart(2, '0')).join('');
  },

  money(n) {
    if (!isFinite(n)) return '∞';
    if (n < 1000) return String(Math.floor(n));
    const units = ['K', 'M', 'B', 'T'];
    let u = -1;
    while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
    if (n >= 1000) {
      let i = 0;
      while (n >= 1000) { n /= 1000; i++; }
      const a = String.fromCharCode(97 + Math.floor((i - 1) / 26));
      const b = String.fromCharCode(97 + ((i - 1) % 26));
      return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + a + b;
    }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + units[u];
  },

  time(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const H = MSM.t('time.h'), M = MSM.t('time.m'), S = MSM.t('time.s');
    return h ? `${h}${H} ${m}${M}` : m ? `${m}${M} ${s}${S}` : `${s}${S}`;
  },

  boxDist(px, py, b) {
    const dx = Math.max(b.x0 - px, 0, px - b.x1);
    const dy = Math.max(b.y0 - py, 0, py - b.y1);
    return Math.hypot(dx, dy);
  },
};
