/* Mini Shopping Mall — balance, store list and floor plan.
   Everything tunable lives here; no other file hard-codes a number.

   You run one store at a time. Goods are MADE at the back, not delivered:
   crops grow in beds, the cow and the chicken have to be fed, the oven has
   to be loaded. Customers arrive on their own schedule and show what they
   want in a thought bubble; you keep the shelves full and ring them up. */
window.MSM = window.MSM || {};

MSM.CFG = {
  SAVE_KEY: 'msm.save.v4',
  START_CASH: 60,

  WORLD: { W: 12, H: 12.4 },

  PLAYER_SPEED: 5.0,
  STAFF_SPEED: 3.0,
  CUSTOMER_SPEED: 2.2,
  BODY_R: 0.22,
  REACH: 0.8,

  CARRY_CAP: 10,             // items in your arms, of any mix
  CRATE_CAP: 10,             // finished items a station holds before it stalls
  FEED_CAP: 8,               // input items an animal or machine can hold
  SHELF_CAP: 8,
  HANDLE_RATE: 8,            // items per second in and out of your arms
  SERVE_TIME: 0.6,

  SPAWN_EVERY: [3.4, 1.5],   // seconds between arrivals: [quiet, busy]
  DOOR_HOLD: 0.7,            // seconds stood in the doorway before you travel
  ARRIVE_R: 0.18,            // how close a tap-to-walk target counts as reached

  MIN_RESTOCK: 0.35,
  OFFLINE_CAP_H: 2,
  OFFLINE_RATE: 0.5,

  CASHIER_COST: (unlock) => Math.max(2500, unlock * 0.9),
  STOCKER_COST: (unlock) => Math.max(1800, unlock * 0.7),

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
       back-left    crop beds
       back-right   animal pens, well clear of the crops
       mid-right    the oven
       middle       the shop floor and its shelves
       front-right  the till, with the queue running back to the door   */
  PLAN: {
    stations: [
      { x0: 0.60, y0: 0.70, x1: 2.10, y1: 1.80 },    // potato bed
      { x0: 2.50, y0: 0.70, x1: 4.00, y1: 1.80 },    // tomato bed
      { x0: 7.00, y0: 0.70, x1: 9.20, y1: 2.90 },    // cow pen
      { x0: 9.80, y0: 4.20, x1: 11.30, y1: 5.40 },   // oven
      { x0: 9.60, y0: 0.70, x1: 11.80, y1: 2.90 },   // chicken coop
      { x0: 4.40, y0: 0.70, x1: 5.90, y1: 1.80 },    // wheat field
    ],
    pads: [
      { x0: 0.60, y0: 2.05, x1: 1.25, y1: 2.70 },
      { x0: 2.50, y0: 2.05, x1: 3.15, y1: 2.70 },
      { x0: 7.00, y0: 3.15, x1: 7.65, y1: 3.80 },
      { x0: 9.80, y0: 5.65, x1: 10.45, y1: 6.30 },
      { x0: 9.60, y0: 3.15, x1: 10.25, y1: 3.80 },
      { x0: 4.40, y0: 2.05, x1: 5.05, y1: 2.70 },
    ],
    shelves: [
      { x0: 1.00, y0: 6.00, x1: 2.60, y1: 6.90 },
      { x0: 3.40, y0: 6.00, x1: 5.00, y1: 6.90 },
      { x0: 5.80, y0: 6.00, x1: 7.40, y1: 6.90 },
      { x0: 1.00, y0: 8.00, x1: 2.60, y1: 8.90 },
      { x0: 3.40, y0: 8.00, x1: 5.00, y1: 8.90 },
    ],
    lanes: [3.00, 5.40, 7.80, 3.00, 5.40],   // clear column that reaches shelf n
    stockLane: 3.60,                          // the open run between back and floor

    till:  { x0: 8.40, y0: 8.00, x1: 9.90, y1: 8.70 },
    serve: { x: 9.15, y: 7.55 },
    queue: [{ x: 9.15, y: 9.30 }, { x: 9.15, y: 9.85 },
            { x: 9.15, y: 10.40 }, { x: 9.15, y: 10.95 }],
    entrance: { x: 9.15, y: 11.90 },
    spawn:    { x: 7.60, y: 10.20 },
    door:     { x0: 0.50, y0: 10.20, x1: 1.90, y1: 11.20 },
    bin:      { x0: 10.85, y0: 11.30, x1: 11.55, y1: 12.00 },   // tucked in the corner
  },

  STORES: [
    {
      id: 'grocery', name: 'Grocery Store', glyph: '🥕', color: '#5FCBB6', unlock: 0,
      products: [
        { id:'potato', name:'Potato', glyph:'🥔', color:'#D9A85F', price:9,  restock:2.0, art:'potato',
          source:{ kind:'crop', label:'Potato Bed' } },
        { id:'tomato', name:'Tomato', glyph:'🍅', color:'#FF5C5C', price:14, restock:2.2, art:'tomato',
          source:{ kind:'crop', label:'Tomato Bed' } },
        { id:'milk',   name:'Milk',   glyph:'🥛', color:'#DFE7F3', price:26, restock:2.6, art:'milk',
          source:{ kind:'cow', label:'Cow', input:'wheat' } },
        { id:'bread',  name:'Bread',  glyph:'🍞', color:'#E0A44E', price:38, restock:2.8, art:'bread',
          source:{ kind:'machine', label:'Oven', input:'wheat' } },
        { id:'egg',    name:'Eggs',   glyph:'🥚', color:'#F6E7CE', price:48, restock:3.0, art:'egg',
          source:{ kind:'chicken', label:'Chicken Coop', input:'tomato' } },
        /* Not sold — wheat is what the cow and the oven eat. */
        { id:'wheat',  name:'Wheat',  glyph:'🌾', color:'#E8C86A', price:0,  restock:1.5, art:'wheat',
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
    p.source = p.source || { kind: 'machine', label: p.name };
    p.crate = P.stations[n];
    p.pad = P.pads[n];
    if (p.sell) {
      p.shelf = P.shelves[shelfN];
      p.lane = P.lanes[shelfN];
      p.browse = { x: (p.shelf.x0 + p.shelf.x1) / 2, y: p.shelf.y1 + 0.55 };
      shelfN++;
    }
    p.upgradeBase = Math.max(60, (p.price || 12) * 7);
  });
  // an animal or a machine eats another product — store its index
  store.products.forEach((p) => {
    p.source.inputIndex = p.source.input
      ? store.products.findIndex((q) => q.id === p.source.input) : -1;
  });
  store.sells = store.products.filter((p) => p.sell);
  store.stockerCost = MSM.CFG.STOCKER_COST(store.unlock);
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
