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
  SAVE_KEY: 'msm.save.v11',
  START_CASH: 500,

  WORLD: { W: 23.5, H: 15.2 },

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

  MIN_RESTOCK: 0.35,
  OFFLINE_CAP_H: 2,
  OFFLINE_RATE: 0.5,

  CASHIER_COST: (unlock) => Math.max(2500, unlock * 0.9),
  TILL_COST: (unlock) => Math.max(100, Math.round(unlock * 0.02)),
  LIST_ODDS: [0.45, 0.33, 0.22],  // chance of 1 / 2 / 3 different products
  QTY_ODDS:  [0.55, 0.28, 0.17],  // chance of wanting 1 / 2 / 3 of each
  MAX_BASKET: 6,                  // total items one customer will carry
  TAKE_TIME: 0.28,                // seconds to lift each item off the shelf
  /* Each extra stocker costs a good deal more than the last. One cannot keep
     eleven shelves and four feed stations going on their own. */
  MAX_STOCKERS: 4,
  STOCKER_COST: (unlock, owned) =>
    Math.round(Math.max(1800, unlock * 0.7) * Math.pow(3.2, owned || 0)),

  BOOST: { gems: 15, mult: 2, seconds: 60 },
  GEMS_PER_LEVEL: 3,
  levelThreshold: (n) => 5 * n * (n + 1),

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

  /* --------------------------------------------------------- floor plans */
  /* MSM.CFG.PLAN is the ACTIVE plan. usePlan() copies the current store's
     layout into it IN PLACE, so every module can keep the
     `const P = MSM.CFG.PLAN` it took at load time. */
  PLAN: {},
  PLANS: {},

  STORES: [],
};

/* The mini mart, and the three stores that still borrow its shape:
     back wall    a row of crop beds, right across the width
     left column  the farmyard — cow pen above, chicken coop below
     right        the orchard, and the oven off on its own
     middle       the shop floor: seventeen shelves in three rows
     front-right  the till, with the queue running back to the door   */
MSM.CFG.PLANS.grocery = {
  id: 'grocery',
  /* Ten crop beds along the back, an orchard down the right, and the
     farmyard down the left: cow, pig, chicken, then the oven. */
  stations: [
    { x0: 0.60,  y0: 0.60,  x1: 2.30,  y1: 1.90 },   //  0 potato bed
    { x0: 2.90,  y0: 0.60,  x1: 4.60,  y1: 1.90 },   //  1 tomato bed
    { x0: 5.20,  y0: 0.60,  x1: 6.90,  y1: 1.90 },   //  2 carrot bed
    { x0: 7.50,  y0: 0.60,  x1: 9.20,  y1: 1.90 },   //  3 eggplant bed
    { x0: 9.80,  y0: 0.60,  x1: 11.50, y1: 1.90 },   //  4 cabbage bed
    { x0: 12.10, y0: 0.60,  x1: 13.80, y1: 1.90 },   //  5 cucumber bed
    { x0: 14.40, y0: 0.60,  x1: 16.10, y1: 1.90 },   //  6 watermelon patch
    { x0: 16.70, y0: 0.60,  x1: 18.40, y1: 1.90 },   //  7 strawberry patch
    { x0: 19.00, y0: 0.60,  x1: 20.70, y1: 1.90 },   //  8 blueberry bushes
    { x0: 18.60, y0: 3.60,  x1: 20.50, y1: 5.00 },   //  9 apple tree
    { x0: 18.60, y0: 5.80,  x1: 20.50, y1: 7.20 },   // 10 banana tree
    { x0: 18.60, y0: 8.00,  x1: 20.50, y1: 9.40 },   // 11 orange tree
    /* Spaced a clear 1.0 apart down the column. You stand 0.5 in front of a
       pen to use it, and with a 0.6 gap that spot fell inside the next
       pen's collision box — which made all three animals unreachable. */
    { x0: 0.60,  y0: 3.20,  x1: 3.10,  y1: 4.80 },   // 12 cow pen
    { x0: 0.60,  y0: 8.40,  x1: 3.10,  y1: 10.00 },  // 13 chicken coop
    { x0: 0.60,  y0: 11.00, x1: 2.40,  y1: 12.30 },  // 14 oven
    { x0: 0.60,  y0: 5.80,  x1: 3.10,  y1: 7.40 },   // 15 pig pen
    { x0: 21.30, y0: 0.60,  x1: 23.00, y1: 1.90 },   // 16 wheat field
    { x0: 14.60, y0: 9.60,  x1: 16.40, y1: 11.00 },  // 17 yogurt vat
  ],
  pads: [
    { x0: 0.60,  y0: 2.20,  x1: 1.30,  y1: 2.90 },
    { x0: 2.90,  y0: 2.20,  x1: 3.60,  y1: 2.90 },
    { x0: 5.20,  y0: 2.20,  x1: 5.90,  y1: 2.90 },
    { x0: 7.50,  y0: 2.20,  x1: 8.20,  y1: 2.90 },
    { x0: 9.80,  y0: 2.20,  x1: 10.50, y1: 2.90 },
    { x0: 12.10, y0: 2.20,  x1: 12.80, y1: 2.90 },
    { x0: 14.40, y0: 2.20,  x1: 15.10, y1: 2.90 },
    { x0: 16.70, y0: 2.20,  x1: 17.40, y1: 2.90 },
    { x0: 19.00, y0: 2.20,  x1: 19.70, y1: 2.90 },
    { x0: 17.70, y0: 4.00,  x1: 18.40, y1: 4.70 },
    { x0: 17.70, y0: 6.20,  x1: 18.40, y1: 6.90 },
    { x0: 17.70, y0: 8.40,  x1: 18.40, y1: 9.10 },
    { x0: 3.45,  y0: 3.20,  x1: 4.15,  y1: 3.90 },
    { x0: 3.45,  y0: 8.40,  x1: 4.15,  y1: 9.10 },
    { x0: 2.70,  y0: 11.30, x1: 3.40,  y1: 12.00 },
    { x0: 3.45,  y0: 5.80,  x1: 4.15,  y1: 6.50 },
    { x0: 21.30, y0: 2.20,  x1: 22.00, y1: 2.90 },
    { x0: 15.30, y0: 11.30, x1: 16.00, y1: 12.00 },
  ],
  /* Six vegetables, six fruit, five dairy & bakery. */
  shelves: [
    { x0: 4.60,  y0: 4.40, x1: 5.85,  y1: 5.30 },
    { x0: 6.55,  y0: 4.40, x1: 7.80,  y1: 5.30 },
    { x0: 8.50,  y0: 4.40, x1: 9.75,  y1: 5.30 },
    { x0: 10.45, y0: 4.40, x1: 11.70, y1: 5.30 },
    { x0: 12.40, y0: 4.40, x1: 13.65, y1: 5.30 },
    { x0: 14.35, y0: 4.40, x1: 15.60, y1: 5.30 },
    { x0: 4.60,  y0: 7.00, x1: 5.85,  y1: 7.90 },
    { x0: 6.55,  y0: 7.00, x1: 7.80,  y1: 7.90 },
    { x0: 8.50,  y0: 7.00, x1: 9.75,  y1: 7.90 },
    { x0: 10.45, y0: 7.00, x1: 11.70, y1: 7.90 },
    { x0: 12.40, y0: 7.00, x1: 13.65, y1: 7.90 },
    { x0: 14.35, y0: 7.00, x1: 15.60, y1: 7.90 },
    { x0: 4.60,  y0: 9.60, x1: 5.85,  y1: 10.50 },
    { x0: 6.55,  y0: 9.60, x1: 7.80,  y1: 10.50 },
    { x0: 8.50,  y0: 9.60, x1: 9.75,  y1: 10.50 },
    { x0: 10.45, y0: 9.60, x1: 11.70, y1: 10.50 },
    { x0: 12.40, y0: 9.60, x1: 13.65, y1: 10.50 },
  ],
  lanes: [6.20, 8.15, 10.10, 12.05, 14.00, 16.20,
          6.20, 8.15, 10.10, 12.05, 14.00, 16.20,
          6.20, 8.15, 10.10, 12.05, 14.00],
  sections: [
    { name: 'VEGETABLES',     x0: 4.35, y0: 4.10, x1: 16.00, y1: 6.30,  tint: '#BFEAB6' },
    { name: 'FRUIT',          x0: 4.35, y0: 6.70, x1: 16.00, y1: 8.90,  tint: '#FFDCA8' },
    { name: 'DAIRY & BAKERY', x0: 4.35, y0: 9.30, x1: 14.05, y1: 11.50, tint: '#CFE2FF' },
  ],
  /* The floor itself: banded zones first, then patches of grass on top. */
  zones: [
    { y0: -0.25, y1: 3.15,  a: '#A9E4A2', b: '#9FDD98' },   // the crop beds
    { y0: 3.15,  y1: 12.00, a: '#FFE3D2', b: '#FBDBC8' },   // the shop floor
    { y0: 12.00, y1: 15.45, a: '#DCE4EE', b: '#D3DCE8' },   // by the door
  ],
  patches: [
    { x0: -0.25, y0: 3.15, x1: 3.50,  y1: 12.00, c: '#9FDD98', line: 'x1' },
    { x0: 18.20, y0: 3.15, x1: 23.75, y1: 9.90,  c: '#9FDD98', line: 'x0' },
  ],

  stockLane: 3.40,
  walkway: 12.35,

  till:  { x0: 17.00, y0: 10.40, x1: 18.60, y1: 11.20 },
  serve: { x: 17.80, y: 9.95 },
  queue: [{ x: 17.80, y: 11.90 }, { x: 17.80, y: 12.45 },
          { x: 17.80, y: 13.00 }, { x: 17.80, y: 13.55 }],
  entrance: { x: 17.80, y: 14.70 },
  spawn:    { x: 15.20, y: 12.40 },
  door:     { x0: 0.60, y0: 12.80, x1: 2.20, y1: 14.00 },
  sign:     { x0: 16.30, y0: 13.95, x1: 17.00, y1: 14.60 },
  bin:      { x0: 21.80, y0: 14.00, x1: 22.50, y1: 14.70 },
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
  door:     { x0: 21.80, y0: 12.20, x1: 23.20, y1: 13.60 },
  sign:     { x0: 16.30, y0: 13.95, x1: 17.00, y1: 14.60 },
  bin:      { x0: 19.60, y0: 10.40, x1: 20.30, y1: 11.10 },
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

  {
    id: 'sports', name: 'Sports Outlet', glyph: '🏀', color: '#8B62FF', unlock: 180000,
    products: [
      { id: 'ball',   name:'Basketball', glyph:'🏀', color:'#FF8A3D', price:2400,  restock:1.8, art:'ball' },
      { id: 'shoes',  name:'Trainers',   glyph:'👟', color:'#4FB0FF', price:3800,  restock:2.1, art:'shoes' },
      { id: 'racket', name:'Racket',     glyph:'🎾', color:'#C9E265', price:5600,  restock:2.5, art:'racket' },
      { id: 'jersey', name:'Jersey',     glyph:'👕', color:'#FF5C8A', price:8200,  restock:3.0, art:'shirt' },
    ],
  },
  {
    id: 'fashion', name: 'Fashion Boutique', glyph: '👗', color: '#FF7BA6', unlock: 4200000,
    products: [
      { id:'tshirt', name:'T-Shirt', glyph:'👕', color:'#7FD4FF', price:46000,  restock:1.9, art:'shirt' },
      { id:'dress',  name:'Dress',   glyph:'👗', color:'#FF7BA6', price:72000,  restock:2.2, art:'dress' },
      { id:'bag',    name:'Handbag', glyph:'👜', color:'#C98B4B', price:110000, restock:2.6, art:'bag' },
      { id:'watch',  name:'Watch',   glyph:'⌚', color:'#B9C4D6', price:165000, restock:3.1, art:'watch' },
    ],
  },
  {
    id: 'tech', name: 'Electronics', glyph: '📱', color: '#4FB0FF', unlock: 95000000,
    products: [
      { id:'buds',   name:'Earbuds', glyph:'🎧', color:'#E7EEF7', price:900000,   restock:2.0, art:'buds' },
      { id:'phone',  name:'Phone',   glyph:'📱', color:'#4FB0FF', price:1400000,  restock:2.4, art:'phone' },
      { id:'tablet', name:'Tablet',  glyph:'💻', color:'#8B62FF', price:2100000,  restock:2.8, art:'tablet' },
      { id:'tv',     name:'TV',      glyph:'📺', color:'#4E5D80', price:3200000,  restock:3.3, art:'tv' },
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
    } else if (p.sell) {
      p.shelf = P.shelves[shelfN];
      p.lane = P.lanes[shelfN];
      p.browse = { x: (p.shelf.x0 + p.shelf.x1) / 2, y: p.shelf.y1 + 0.55 };
      shelfN++;
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
