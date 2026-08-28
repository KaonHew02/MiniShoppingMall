/* Mini Shopping Mall — balance, store list and floor plan.
   Everything tunable lives here; no other file hard-codes a number.

   You run one store at a time. Goods are MADE at the back, not delivered:
   crops grow in beds, the cow and the chicken have to be fed, the oven has
   to be loaded. Customers arrive on their own schedule and show what they
   want in a thought bubble; you keep the shelves full and ring them up. */
window.MSM = window.MSM || {};

MSM.CFG = {
  SAVE_KEY: 'msm.save.v6',
  START_CASH: 60,

  WORLD: { W: 16, H: 14.0 },

  PLAYER_SPEED: 5.4,
  STAFF_SPEED: 3.2,
  CUSTOMER_SPEED: 2.3,
  BODY_R: 0.22,
  REACH: 0.8,

  CARRY_CAP: 12,             // items in your arms, of any mix
  CRATE_CAP: 10,             // finished items a station holds before it stalls
  FEED_CAP: 8,               // input items an animal or machine can hold
  SHELF_CAP: 8,
  HANDLE_RATE: 9,            // items per second in and out of your arms
  SERVE_TIME: 0.6,

  SPAWN_EVERY: [3.0, 1.3],   // seconds between arrivals: [quiet, busy]
  DOOR_HOLD: 0.7,            // seconds stood in the doorway before you travel

  MIN_RESTOCK: 0.35,
  OFFLINE_CAP_H: 2,
  OFFLINE_RATE: 0.5,

  CASHIER_COST: (unlock) => Math.max(2500, unlock * 0.9),
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
    /* Production sits round the edges: crop beds along the back, the farmyard
       down the left, an orchard down the right, the oven by the door. */
    stations: [
      { x0: 0.60,  y0: 0.60, x1: 2.50,  y1: 1.90 },   // 0 potato bed
      { x0: 3.00,  y0: 0.60, x1: 4.90,  y1: 1.90 },   // 1 tomato bed
      { x0: 5.40,  y0: 0.60, x1: 7.30,  y1: 1.90 },   // 2 carrot bed
      { x0: 7.80,  y0: 0.60, x1: 9.70,  y1: 1.90 },   // 3 eggplant bed
      { x0: 10.20, y0: 0.60, x1: 12.10, y1: 1.90 },   // 4 cabbage bed
      { x0: 13.90, y0: 3.20, x1: 15.60, y1: 4.60 },   // 5 apple tree
      { x0: 13.90, y0: 5.20, x1: 15.60, y1: 6.60 },   // 6 banana tree
      { x0: 13.90, y0: 7.20, x1: 15.60, y1: 8.60 },   // 7 orange tree
      { x0: 0.60,  y0: 3.60, x1: 3.10,  y1: 5.60 },   // 8 cow pen
      { x0: 0.60,  y0: 6.40, x1: 3.10,  y1: 8.40 },   // 9 chicken coop
      { x0: 0.60,  y0: 9.40, x1: 2.30,  y1: 10.70 },  // 10 oven
      { x0: 12.60, y0: 0.60, x1: 14.50, y1: 1.90 },   // 11 wheat field
    ],
    pads: [
      { x0: 0.60,  y0: 2.15, x1: 1.30,  y1: 2.85 },
      { x0: 3.00,  y0: 2.15, x1: 3.70,  y1: 2.85 },
      { x0: 5.40,  y0: 2.15, x1: 6.10,  y1: 2.85 },
      { x0: 7.80,  y0: 2.15, x1: 8.50,  y1: 2.85 },
      { x0: 10.20, y0: 2.15, x1: 10.90, y1: 2.85 },
      { x0: 13.90, y0: 4.75, x1: 14.60, y1: 5.05 },
      { x0: 13.90, y0: 6.75, x1: 14.60, y1: 7.05 },
      { x0: 13.90, y0: 8.75, x1: 14.60, y1: 9.05 },
      { x0: 3.25,  y0: 3.60, x1: 3.55,  y1: 4.30 },
      { x0: 3.25,  y0: 6.40, x1: 3.55,  y1: 7.10 },
      { x0: 2.45,  y0: 9.40, x1: 3.15,  y1: 10.10 },
      { x0: 12.60, y0: 2.15, x1: 13.30, y1: 2.85 },
    ],
    /* Eleven shelves in three labelled bands, so the floor reads as a shop
       laid out by department rather than a field of identical tables. */
    shelves: [
      { x0: 3.90, y0: 4.20, x1: 5.20, y1: 5.10 },     // vegetables
      { x0: 5.60, y0: 4.20, x1: 6.90, y1: 5.10 },
      { x0: 7.30, y0: 4.20, x1: 8.60, y1: 5.10 },
      { x0: 9.00, y0: 4.20, x1: 10.30, y1: 5.10 },
      { x0: 10.70, y0: 4.20, x1: 12.00, y1: 5.10 },
      { x0: 3.90, y0: 6.40, x1: 5.20, y1: 7.30 },     // fruit
      { x0: 5.60, y0: 6.40, x1: 6.90, y1: 7.30 },
      { x0: 7.30, y0: 6.40, x1: 8.60, y1: 7.30 },
      { x0: 3.90, y0: 8.60, x1: 5.20, y1: 9.50 },     // dairy + bakery
      { x0: 5.60, y0: 8.60, x1: 6.90, y1: 9.50 },
      { x0: 7.30, y0: 8.60, x1: 8.60, y1: 9.50 },
    ],
    lanes: [5.40, 7.10, 8.80, 10.50, 12.40,
            5.40, 7.10, 8.80,
            5.40, 7.10, 8.80],
    sections: [
      { name: 'VEGETABLES',     x0: 3.60, y0: 3.90, x1: 12.30, y1: 5.85, tint: '#BFEAB6' },
      { name: 'FRUIT',          x0: 3.60, y0: 6.10, x1: 8.90,  y1: 8.05, tint: '#FFDCA8' },
      { name: 'DAIRY & BAKERY', x0: 3.60, y0: 8.30, x1: 8.90,  y1: 10.25, tint: '#CFE2FF' },
    ],
    stockLane: 3.00,                          // the open run behind the shelves

    till:  { x0: 12.90, y0: 9.60, x1: 14.50, y1: 10.40 },
    serve: { x: 13.70, y: 9.15 },
    queue: [{ x: 13.70, y: 10.90 }, { x: 13.70, y: 11.45 },
            { x: 13.70, y: 12.00 }, { x: 13.70, y: 12.55 }],
    entrance: { x: 13.70, y: 13.60 },
    spawn:    { x: 11.20, y: 11.40 },
    door:     { x0: 0.60, y0: 11.60, x1: 2.20, y1: 12.80 },
    bin:      { x0: 14.90, y0: 12.90, x1: 15.60, y1: 13.60 },
  },

  STORES: [
    {
      id: 'grocery', name: 'Grocery Store', glyph: '\ud83e\udd55', color: '#5FCBB6', unlock: 0,
      products: [
        /* --- vegetables ------------------------------------------------ */
        { id:'potato',   name:'Potato',   glyph:'\ud83e\udd54', color:'#D9A85F', price:9,  restock:2.0, art:'potato',
          source:{ kind:'crop', label:'Potato Bed' } },
        { id:'tomato',   name:'Tomato',   glyph:'\ud83c\udf45', color:'#FF5C5C', price:14, restock:2.2, art:'tomato',
          source:{ kind:'crop', label:'Tomato Bed' } },
        { id:'carrot',   name:'Carrot',   glyph:'\ud83e\udd55', color:'#F08A2E', price:20, restock:2.4, art:'carrot',
          source:{ kind:'crop', label:'Carrot Bed' } },
        { id:'eggplant', name:'Eggplant', glyph:'\ud83c\udf46', color:'#8B5CC7', price:28, restock:2.6, art:'eggplant',
          source:{ kind:'crop', label:'Eggplant Bed' } },
        { id:'cabbage',  name:'Cabbage',  glyph:'\ud83e\udd6c', color:'#7CC24E', price:36, restock:2.8, art:'cabbage',
          source:{ kind:'crop', label:'Cabbage Bed' } },
        /* --- fruit ----------------------------------------------------- */
        { id:'apple',    name:'Apple',    glyph:'\ud83c\udf4e', color:'#E8413F', price:44, restock:2.6, art:'apple',
          source:{ kind:'tree', label:'Apple Tree' } },
        { id:'banana',   name:'Banana',   glyph:'\ud83c\udf4c', color:'#F2CB3D', price:54, restock:2.8, art:'banana',
          source:{ kind:'tree', label:'Banana Tree' } },
        { id:'orange',   name:'Orange',   glyph:'\ud83c\udf4a', color:'#FF9A1F', price:66, restock:3.0, art:'orange',
          source:{ kind:'tree', label:'Orange Tree' } },
        /* --- dairy and bakery ------------------------------------------ */
        { id:'milk',     name:'Milk',     glyph:'\ud83e\udd5b', color:'#DFE7F3', price:80, restock:3.0, art:'milk',
          source:{ kind:'cow', label:'Cow', input:'wheat' } },
        { id:'egg',      name:'Eggs',     glyph:'\ud83e\udd5a', color:'#F6E7CE', price:96, restock:3.2, art:'egg',
          source:{ kind:'chicken', label:'Chicken Coop', input:'tomato' } },
        { id:'bread',    name:'Bread',    glyph:'\ud83c\udf5e', color:'#E0A44E', price:120, restock:3.4, art:'bread',
          source:{ kind:'machine', label:'Oven', input:'wheat' } },
        /* Not sold — wheat is what the cow and the oven eat. */
        { id:'wheat',    name:'Wheat',    glyph:'\ud83c\udf3e', color:'#E8C86A', price:0,  restock:1.5, art:'wheat',
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
    return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
  },

  boxDist(px, py, b) {
    const dx = Math.max(b.x0 - px, 0, px - b.x1);
    const dy = Math.max(b.y0 - py, 0, py - b.y1);
    return Math.hypot(dx, dy);
  },
};
