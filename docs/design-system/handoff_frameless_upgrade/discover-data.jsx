// discover-data.jsx — data model for Discover page
// Owned collection + insights + recommendations + upgrade paths
// Single source of truth for both variations.

const fmt = n => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0
}).format(n);

const fmtK = n => n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${n}`;

// ─── Owned collection (mirrors collection_redesign WatchData) ────────────
const OWNED = [
  { id: 'tudor-bbgmt', brand: 'Tudor', model: 'Black Bay GMT', ref: 'M79830RB-0001',
    size: 41, value: 4200, dialColor: 'Black', type: 'GMT', lug: 22,
    image: 'watches/longines-legend-leather.avif' },
  { id: 'omega-aqua', brand: 'Omega', model: 'Seamaster Aqua Terra', ref: '220.10.41',
    size: 41, value: 6000, dialColor: 'Blue', type: 'Sport', lug: 20,
    image: 'watches/longines-02.avif' },
  { id: 'oris-bigcrown', brand: 'Oris', model: 'Big Crown Pointer Date', ref: '01 754 7741',
    size: 40, value: 1850, dialColor: 'Green', type: 'Pilot', lug: 20,
    image: 'watches/longines-03.avif' },
  { id: 'sinn-556', brand: 'Sinn', model: '556 I', ref: '556.0102',
    size: 38.5, value: 1500, dialColor: 'Black', type: 'Sport', lug: 20,
    image: 'watches/longines-legend-steel.avif' },
  { id: 'hamilton-khaki', brand: 'Hamilton', model: 'Khaki Field Mechanical', ref: 'H69439933',
    size: 38, value: 580, dialColor: 'White', type: 'Field', lug: 20,
    image: 'watches/longines-05.avif' },
];

// ─── Box analysis (computed read of the collection) ─────────────────────
const BOX_INSIGHT = {
  read: 'Sport-led, blue–black, sub-$10K',
  thesis: 'Five steel sport watches under 41 mm. You buy for the dial, not the brand. There\'s no dress watch, no chronograph, and nothing precious — but the editorial logic of your box is unusually tight.',
  stats: [
    { label: 'Watches', value: '5', meta: 'in collection' },
    { label: 'Portfolio value', value: '$14,130', meta: '+$1,580 vs paid' },
    { label: 'Median size', value: '40 mm', meta: '38.5 — 41' },
    { label: 'Brands', value: '5', meta: 'no doubles' },
  ],
  gaps: [
    { id: 'chrono', label: 'No chronograph', detail: 'Conspicuous absence in a sport-led box. A two-register chrono under $6K would round you out.' },
    { id: 'dress', label: 'No proper dress watch', detail: 'Hamilton Khaki is field, not dress. Your box has no precious metal, no leather strap formal piece.' },
    { id: 'integrated', label: 'Missing integrated bracelet', detail: 'You own the modern sport language but none of its archetypes — Royal Oak, Nautilus, Overseas, Aqua Terra Spirate.' },
    { id: 'precious', label: 'All steel', detail: 'No gold, no platinum, no titanium. Steel is honest but limiting at this collection size.' },
  ],
};

// ─── Next-slot recommendations (the affiliate centerpiece) ──────────────
// Each tied to a gap from BOX_INSIGHT.
const NEXT_SLOT = [
  {
    rank: '01',
    id: 'omega-speedy',
    brand: 'Omega', model: 'Speedmaster Broad Arrow',
    ref: '3551.20.00', size: 42, type: 'Chronograph',
    image: 'watches/omega-speedmaster-broadarrow.png',
    priceLow: 3800, priceHigh: 4600, marketMedian: 4200,
    addresses: 'chrono',
    addressesLabel: 'Fills your chronograph gap',
    thesis: 'You already own the Aqua Terra. The Broad Arrow keeps you in the Omega vocabulary while answering the chronograph absence head-on. Two-register, no date noise, silver dial reads dress when it needs to.',
    why: ['Same brand language as your Aqua Terra', 'White dial introduces a third color to your box', 'Blue-tipped hands echo your Tudor + Omega palette'],
    findOn: 'Chrono24',
  },
  {
    rank: '02',
    id: 'patek-calatrava',
    brand: 'Patek Philippe', model: 'Calatrava Ref. 6000G',
    ref: '6000G-012', size: 37, type: 'Dress',
    image: 'watches/patek-calatrava-6000g.png',
    priceLow: 22000, priceHigh: 28000, marketMedian: 25500,
    addresses: 'dress',
    addressesLabel: 'The dress watch your box is missing',
    thesis: 'A stretch — but the right one. Blue dial keeps continuity with your Aqua Terra and Black Bay. White gold on alligator is the formal counterpoint your collection has been refusing to name.',
    why: ['Blue dial harmonizes with three of your existing five', '37 mm pulls your size median down from 40', 'First watch in your box that demands a jacket'],
    findOn: 'Chrono24',
  },
  {
    rank: '03',
    id: 'vc-overseas',
    brand: 'Vacheron Constantin', model: 'Overseas Chronograph',
    ref: '47450/000A-9039', size: 42, type: 'Integrated · Chronograph',
    image: 'watches/vc-overseas-chrono.png',
    priceLow: 18000, priceHigh: 24000, marketMedian: 21000,
    addresses: 'integrated',
    addressesLabel: 'Two gaps in one piece',
    thesis: 'The collector\'s shortcut: integrated bracelet sport plus chronograph, in the brand of the holy trinity that isn\'t Patek or AP. Same blue you already love. Pre-2016 reference — buy on condition.',
    why: ['Closes the chronograph and integrated-bracelet gaps simultaneously', 'Blue dial mirrors your existing palette', 'Pre-owned market is soft — a buyer\'s window'],
    findOn: 'Chrono24',
  },
];

// ─── Upgrade Suggestions (per owned watch upgrade paths) ────────────────
const UPGRADES = [
  {
    id: 'sinn-up',
    from: { brand: 'Sinn', model: '556 I', ref: '556.0102', value: 1500, image: 'watches/longines-legend-steel.avif', size: 38.5 },
    to:   { brand: 'Oris', model: 'Aquis GMT Date', ref: '01 798 7754', value: 3200, image: 'watches/oris-aquis-gmt.png', size: 43.5 },
    rationale: 'You own the daily-wear sport thesis. The Aquis adds a true GMT and 300 m of water resistance — the natural next step when the Sinn outgrows you.',
    delta: '+$1,700',
  },
  {
    id: 'hamilton-up',
    from: { brand: 'Hamilton', model: 'Khaki Field', ref: 'H69439933', value: 580, image: 'watches/longines-05.avif', size: 38 },
    to:   { brand: 'Oris', model: 'Big Crown Pointer Date', ref: '01 754 7779', value: 2400, image: 'watches/oris-bigcrown-grey.png', size: 38 },
    rationale: 'Same case-size language, real pilot heritage, pointer-date complication. The grey-dial set keeps your collection\'s muted palette intact.',
    delta: '+$1,820',
  },
  {
    id: 'bbgmt-up',
    from: { brand: 'Tudor', model: 'Black Bay GMT', ref: 'M79830RB', value: 4200, image: 'watches/longines-legend-leather.avif', size: 41 },
    to:   { brand: 'Patek Philippe', model: 'Nautilus Travel Time Chrono', ref: '5990/1A-001', value: 78000, image: 'watches/patek-nautilus-5990.png', size: 40.5 },
    rationale: 'The hardest jump. Same dual-time logic, vastly different ambition. Reserve this for the day the Tudor leaves the box for good.',
    delta: '+$73,800',
    aspirational: true,
  },
  {
    id: 'aqua-up',
    from: { brand: 'Omega', model: 'Aqua Terra', ref: '220.10.41', value: 6000, image: 'watches/longines-02.avif', size: 41 },
    to:   { brand: 'Audemars Piguet', model: 'Royal Oak "Frosted"', ref: '15410BC', value: 62000, image: 'watches/ap-royal-oak-frosted.png', size: 37 },
    rationale: 'Blue tapisserie carries forward your Aqua Terra\'s color story; the case finishing rewrites everything else. The integrated bracelet your box has been missing.',
    delta: '+$56,000',
    aspirational: true,
  },
];

// ─── Demo (guest) state ─────────────────────────────────────────────────
// Stable seed used when there's no signed-in collection.
const GUEST_INSIGHT = {
  read: 'A starter box, well-read',
  thesis: 'You\'re browsing without a saved collection. These are the picks we\'d hand any thoughtful first-time visitor — a chronograph, a dress watch, and an integrated-bracelet sport — across three price tiers.',
  stats: [
    { label: 'Sample size', value: 'Three', meta: 'editor-chosen pieces' },
    { label: 'Price tier', value: '$4K – $25K', meta: 'spans entry to stretch' },
    { label: 'Categories', value: 'Three', meta: 'one of each watch type' },
    { label: 'Updated', value: 'Weekly', meta: 'Tuesdays at noon' },
  ],
};

const GUEST_NEXT_SLOT = NEXT_SLOT.map(r => ({
  ...r,
  addressesLabel: r.rank === '01' ? 'Entry — under $5K'
                : r.rank === '02' ? 'Refinement — $20K and up'
                : 'Connoisseur — the stretch pick',
}));

// ─── Strap suggestions — lug-width-aware ────────────────────────────────
// Owned collection skews 20mm (4 watches) with one 22mm.
const STRAP_SUMMARY = '5 of your 6 watches share 20 mm lugs. Swap-friendly across most of your box.';
const STRAPS = [
  { id: 'leather-black', label: 'Black Leather',  material: 'Calfskin',         use: 'classic',
    swatch: '#1A1410', accent: '#2A2520' },
  { id: 'suede-brown',   label: 'Brown Suede',    material: 'Suede',            use: 'casual',
    swatch: '#7A5230', accent: '#8B6B45' },
  { id: 'rubber',        label: 'Rubber Sport',   material: 'FKM rubber',       use: 'diver',
    swatch: '#212121', accent: '#3A3A3A' },
  { id: 'nato',          label: 'NATO',           material: 'Nylon weave',      use: 'military',
    swatch: '#4A5B3E', accent: '#5E6F4A' },
  { id: 'sailcloth',     label: 'Sailcloth',      material: 'Technical weave',  use: 'sport',
    swatch: '#262B36', accent: '#3A4051' },
];

// ─── Physical watchbox commerce ─────────────────────────────────────────
const WATCHBOXES = [
  { id: 'travel-roll', label: 'Travel Roll',         desc: 'Soft 3-watch travel companion',
    partner: 'Wolf 1834',    price: '$165',  capacity: '3 slots',  finish: 'Suede',  cta: 'Shop' },
  { id: 'display-6',   label: '6-Slot Display Box',  desc: 'Glass-top oak display, brass hinges',
    partner: 'Rapport London', price: '$425', capacity: '6 slots', finish: 'Oak',    cta: 'Shop' },
  { id: 'collector-10',label: '10-Slot Collector',   desc: 'Lockable case for larger rotations',
    partner: 'Holme & Hadfield', price: '$680', capacity: '10 slots', finish: 'Walnut', cta: 'Shop' },
];

// ─── News / Reads ───────────────────────────────────────────────────────
const NEWS = [
  { kicker: 'Field Report', source: 'Worn & Wound', when: '1h ago', isNew: true,
    headline: 'Seiko introduces a pair of limited editions in the Presage line',
    excerpt: 'The slow drip of Seiko limited editions to celebrate the brand\u2019s new dial workshop continues this week.',
    brand: 'Seiko', img: 'watches/longines-legend-steel.avif' },
  { kicker: 'Heritage',     source: 'Worn & Wound', when: '4h ago', isNew: true,
    headline: 'My 1968 Hamilton Accumatic A-203: honoring a legacy in 14K',
    excerpt: 'For many, an interest in horology is sparked by inheriting a wristwatch \u2014 here\u2019s mine.',
    brand: 'Hamilton', img: 'watches/longines-05.avif' },
  { kicker: 'First Look',   source: 'Monochrome',   when: '5h ago', isNew: true,
    headline: 'The new Armin Strom Dual Time GMT Resonance is its quietest piece yet',
    excerpt: 'To our regular readers, Armin Strom needs no introduction. To everyone else: pay attention.',
    brand: 'Armin Strom', img: 'watches/patek-calatrava-6000g.png' },
  { kicker: 'Introducing',  source: 'Monochrome',   when: '8h ago', isNew: false,
    headline: 'The new Awake Son Mai Guilloché Main: a return to French-pressed lacquer',
    excerpt: 'After moving on from its space-themed watches, Awake has rediscovered a quieter idiom.',
    brand: 'Awake', img: 'watches/oris-bigcrown-red.png' },
];

// Legacy alias
const READS = NEWS.slice(0, 3).map(n => ({ kicker: n.kicker, headline: n.headline, source: n.source, mins: 8 }));

// ─── Lead recommendation (Complete the Box) ─────────────────────────────
// The single highlighted gap pick — shown big at the top of the page.
const LEAD = {
  gapLabel: 'Dress',
  insight: 'Your collection is missing a dress watch. Five steel sport pieces and a field watch \u2014 even a quiet box benefits from a formal anchor on leather.',
  watch: NEXT_SLOT.find(r => r.addresses === 'dress'),
};

// Guest lead: replace with the Speedmaster as a generic entry pick
const GUEST_LEAD = {
  gapLabel: 'Featured this week',
  insight: 'A two-register chronograph at the entry of Omega\u2019s catalog. Wears small for its 42 mm, sits dressy on a bracelet, sits sporty on a strap.',
  watch: NEXT_SLOT.find(r => r.id === 'omega-speedy'),
};

Object.assign(window, {
  fmt, fmtK,
  OWNED, BOX_INSIGHT, NEXT_SLOT, UPGRADES,
  LEAD, GUEST_LEAD,
  GUEST_INSIGHT, GUEST_NEXT_SLOT, READS, NEWS,
  STRAPS, STRAP_SUMMARY, WATCHBOXES,
});
