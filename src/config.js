/* Mini Shopping Mall — balance, store list and floor plan.
   Everything tunable lives here; no other file hard-codes a number.

   You run one store at a time. Goods are MADE at the back, not delivered:
   crops grow in beds, the cow and the chicken have to be fed, the oven has
   to be loaded. Customers arrive on their own schedule and show what they
   want in a thought bubble; you keep the shelves full and ring them up. */
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

  /* The floor, shared by every store.
       back wall    a row of crop beds, right across the width
       left column  the farmyard — cow pen above, chicken coop below
       right        the oven, on its own away from the animals
       middle       the shop floor: eight shelves in two rows
       front-right  the till, with the queue running back to the door   */
  PLAN: {
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
    ],
    /* Six vegetables, six fruit, four dairy & bakery. */
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
    ],
    lanes: [6.20, 8.15, 10.10, 12.05, 14.00, 16.20,
            6.20, 8.15, 10.10, 12.05, 14.00, 16.20,
            6.20, 8.15, 10.10, 12.05],
    sections: [
      { name: 'VEGETABLES',     x0: 4.35, y0: 4.10, x1: 16.00, y1: 6.30,  tint: '#BFEAB6' },
      { name: 'FRUIT',          x0: 4.35, y0: 6.70, x1: 16.00, y1: 8.90,  tint: '#FFDCA8' },
      { name: 'DAIRY & BAKERY', x0: 4.35, y0: 9.30, x1: 12.10, y1: 11.50, tint: '#CFE2FF' },
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
  },

  STORES: [
    {
      id: 'grocery', name: 'Grocery Store', glyph: '\ud83e\udd55', color: '#5FCBB6', unlock: 0,
      /* Lines open one at a time at their own build plot; the price of each
         rises with its place in the order. */
      unlocks: [
        { id: 'potato',     cost: 0 },
        { id: 'tomato',     cost: 250 },
        { id: 'carrot',     cost: 550 },
        { id: 'wheat',      cost: 950 },
        { id: 'milk',       cost: 1600 },
        { id: 'bread',      cost: 2600 },
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
        { id:'potato',     name:'Potato',     glyph:'\ud83e\udd54', color:'#C69A63', price:9,   restock:2.0, art:'potato',
          source:{ kind:'crop', label:'Potato Bed' } },
        { id:'tomato',     name:'Tomato',     glyph:'\ud83c\udf45', color:'#FF5C5C', price:14,  restock:2.2, art:'tomato',
          source:{ kind:'crop', label:'Tomato Bed' } },
        { id:'carrot',     name:'Carrot',     glyph:'\ud83e\udd55', color:'#F08A2E', price:20,  restock:2.4, art:'carrot',
          source:{ kind:'crop', label:'Carrot Bed' } },
        { id:'eggplant',   name:'Eggplant',   glyph:'\ud83c\udf46', color:'#8B5CC7', price:82,  restock:2.6, art:'eggplant',
          source:{ kind:'crop', label:'Eggplant Bed' } },
        { id:'cabbage',    name:'Cabbage',    glyph:'\ud83e\udd6c', color:'#7CC24E', price:96,  restock:2.8, art:'cabbage',
          source:{ kind:'crop', label:'Cabbage Bed' } },
        { id:'cucumber',   name:'Cucumber',   glyph:'\ud83e\udd52', color:'#4F9E3E', price:112, restock:2.9, art:'cucumber',
          source:{ kind:'crop', label:'Cucumber Bed' } },
        /* --- fruit ----------------------------------------------------- */
        { id:'watermelon', name:'Watermelon', glyph:'\ud83c\udf49', color:'#3FA45B', price:155, restock:3.0, art:'watermelon',
          source:{ kind:'crop', label:'Watermelon Patch' } },
        { id:'strawberry', name:'Strawberry', glyph:'\ud83c\udf53', color:'#F0384F', price:130, restock:2.8, art:'strawberry',
          source:{ kind:'crop', label:'Strawberry Patch' } },
        { id:'blueberry',  name:'Blueberry',  glyph:'\ud83e\uded0', color:'#5A6CD8', price:185, restock:3.1, art:'blueberry',
          source:{ kind:'crop', label:'Blueberry Bushes' } },
        { id:'apple',      name:'Apple',      glyph:'\ud83c\udf4e', color:'#E8413F', price:230, restock:3.0, art:'apple',
          source:{ kind:'tree', label:'Apple Tree' } },
        { id:'banana',     name:'Banana',     glyph:'\ud83c\udf4c', color:'#F2CB3D', price:285, restock:3.2, art:'banana',
          source:{ kind:'tree', label:'Banana Tree' } },
        { id:'orange',     name:'Orange',     glyph:'\ud83c\udf4a', color:'#FF9A1F', price:355, restock:3.4, art:'orange',
          source:{ kind:'tree', label:'Orange Tree' } },
        /* --- dairy, bakery and the butcher ----------------------------- */
        { id:'milk',       name:'Milk',       glyph:'\ud83e\udd5b', color:'#DFE7F3', price:30,  restock:3.0, art:'milk',
          source:{ kind:'cow', label:'Cow', input:'wheat' } },
        { id:'egg',        name:'Eggs',       glyph:'\ud83e\udd5a', color:'#F6E7CE', price:56,  restock:3.2, art:'egg',
          source:{ kind:'chicken', label:'Chicken Coop', input:'tomato' } },
        { id:'bread',      name:'Bread',      glyph:'\ud83c\udf5e', color:'#E0A44E', price:42,  restock:3.4, art:'bread',
          source:{ kind:'machine', label:'Oven', input:'wheat' } },
        { id:'bacon',      name:'Bacon',      glyph:'\ud83e\udd53', color:'#E86A78', price:68,  restock:3.3, art:'bacon',
          source:{ kind:'pig', label:'Pig Pen', input:'potato' } },
        /* Not sold — wheat is what the cow and the oven eat. */
        { id:'wheat',      name:'Wheat',      glyph:'\ud83c\udf3e', color:'#E8C86A', price:0,   restock:1.5, art:'wheat',
          sell:false, source:{ kind:'crop', label:'Wheat Field' } },
      ],
    },
    {
      id: 'coffee', name: 'Coffee Shop', glyph: '☕', color: '#B07A4E', unlock: 6000,
      products: [
        { id:'espresso',  name:'Espresso',  glyph:'☕', color:'#8C5A34', price:120,  restock:1.6, art:'espresso' },
        { id:'latte',     name:'Latte',     glyph:'🥤', color:'#D9B48F', price:190,  restock:1.9, art:'latte' },
        { id:'croissant', name:'Croissant', glyph:'🥐', color:'#E8B761', price:280,  restock:2.3, art:'croissant' },
        { id:'cake',      name:'Cake',      glyph:'🍰', color:'#FF9EC4', price:420,  restock:2.8, art:'cake' },
      ],
    },
    {
      id: 'sports', name: 'Sports Outlet', glyph: '🏀', color: '#8B62FF', unlock: 180000,
      products: [
        { id:'ball',   name:'Basketball', glyph:'🏀', color:'#FF8A3D', price:2400,  restock:1.8, art:'ball' },
        { id:'shoes',  name:'Trainers',   glyph:'👟', color:'#4FB0FF', price:3800,  restock:2.1, art:'shoes' },
        { id:'racket', name:'Racket',     glyph:'🎾', color:'#C9E265', price:5600,  restock:2.5, art:'racket' },
        { id:'jersey', name:'Jersey',     glyph:'👕', color:'#FF5C8A', price:8200,  restock:3.0, art:'shirt' },
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
  ],
};

/* Bind the floor plan to every product. */
MSM.CFG.STORES.forEach((store) => {
  const P = MSM.CFG.PLAN;
  let shelfN = 0;
  store.products.forEach((p, n) => {
    p.index = n;
    p.sell = p.sell !== false;
    p.source = p.source || { kind: 'maker', label: p.name };
    p.crate = P.stations[n];
    p.pad = P.pads[n];
    if (p.sell) {
      p.shelf = P.shelves[shelfN];
      p.lane = P.lanes[shelfN];
      p.browse = { x: (p.shelf.x0 + p.shelf.x1) / 2, y: p.shelf.y1 + 0.55 };
      shelfN++;
    }
    p.upgradeBase = Math.max(60, (p.price || 12) * 7);
    if (p.shelf) {
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
  });
  /* The unlock sequence: an explicit list, or array order with costs from the
     price. The first line in the sequence comes with the store. */
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
