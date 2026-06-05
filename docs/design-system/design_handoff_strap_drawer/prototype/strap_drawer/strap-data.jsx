// strap-data.jsx — owned watches (with lug widths), strap inventory,
// compatibility logic, and formatting helpers for the Strap Drawer.

// ─── Formatting ──────────────────────────────────────────────────────────
const money = (cents) => {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(cents / 100);
};

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch (_) { return url; }
};

// ─── Owned watches (extends the collection set with lug width + bracelet) ─
// braceletType: 'spring-bar' (swappable) | 'integrated' (fixed)
const OWNED_WATCHES = [
  {
    id: 'omega-aqua-terra', brand: 'Omega', model: 'Seamaster Aqua Terra',
    reference: '220.10.41.21.03.001', caseSizeMm: 41, lugWidthMm: 20,
    braceletType: 'spring-bar', dialColor: 'Blue',
    imageUrl: 'assets/watches/longines-02.avif',
  },
  {
    id: 'tudor-bb-gmt', brand: 'Tudor', model: 'Black Bay GMT',
    reference: 'M79830RB-0001', caseSizeMm: 41, lugWidthMm: 22,
    braceletType: 'spring-bar', dialColor: 'Black',
    imageUrl: 'assets/watches/longines-04.avif',
  },
  {
    id: 'sinn-556', brand: 'Sinn', model: '556 I',
    reference: '556.0102', caseSizeMm: 38.5, lugWidthMm: 20,
    braceletType: 'spring-bar', dialColor: 'Black',
    imageUrl: 'assets/watches/longines-01.avif',
  },
  {
    id: 'oris-bigcrown', brand: 'Oris', model: 'Big Crown Pointer Date',
    reference: '01 754 7741 4067', caseSizeMm: 40, lugWidthMm: 20,
    braceletType: 'spring-bar', dialColor: 'Green',
    imageUrl: 'assets/watches/longines-03.avif',
  },
  {
    id: 'hamilton-khaki', brand: 'Hamilton', model: 'Khaki Field Mechanical',
    reference: 'H69439933', caseSizeMm: 38, lugWidthMm: 20,
    braceletType: 'spring-bar', dialColor: 'White',
    imageUrl: 'assets/watches/longines-05.avif',
  },
  {
    id: 'tissot-prx', brand: 'Tissot', model: 'PRX Powermatic 80',
    reference: 'T137.407.11.041.00', caseSizeMm: 40, lugWidthMm: null,
    braceletType: 'integrated', dialColor: 'Ice Blue',
    imageUrl: null,
  },
];

// ─── Strap inventory ─────────────────────────────────────────────────────
// photoUrl set → real photo; otherwise swatchId drives the CSS swatch.
const STRAPS = [
  {
    id: 'str-allig-black', name: 'Signature Alligator', brand: 'Delugs',
    material: 'leather', subMaterial: 'alligator', color: 'Black', colorHex: '#1A1410',
    lugWidthMm: 20, style: 'dressy', taperedToMm: 16, lengthMm: 115, clasp: 'Steel pin buckle',
    priceCents: 28900, purchaseUrl: 'https://delugs.com/products/alligator-strap',
    photoUrl: 'straps/alligator-black.webp', swatchId: 'leather-alligator-black',
    notes: 'Saved for the Aqua Terra on black-tie nights. Matte finish, hides scuffs.',
    sortOrder: 0,
  },
  {
    id: 'str-allig-mahog', name: 'Signature Alligator', brand: 'Delugs',
    material: 'leather', subMaterial: 'alligator', color: 'Mahogany', colorHex: '#5A2A2E',
    lugWidthMm: 20, style: 'dressy', taperedToMm: 16, lengthMm: 115, clasp: 'Steel pin buckle',
    priceCents: 28900, purchaseUrl: 'https://delugs.com/products/alligator-strap',
    photoUrl: 'straps/alligator-mahogany.webp', swatchId: 'leather-alligator-brown',
    notes: 'Warms up the Big Crown. Burgundy reads brown indoors, oxblood in sun.',
    sortOrder: 1,
  },
  {
    id: 'str-rubber-black', name: 'CTS Curved Rubber', brand: 'Delugs',
    material: 'rubber', subMaterial: 'smooth', color: 'Black', colorHex: '#1C1C1C',
    lugWidthMm: 22, style: 'sporty', taperedToMm: 22, lengthMm: 120, clasp: 'Steel deployant',
    priceCents: 9900, purchaseUrl: 'https://delugs.com/products/cts-rubber-strap',
    photoUrl: 'straps/rubber-black.webp', swatchId: 'rubber-black',
    notes: 'Curved ends cut for the Black Bay. Pool and beach default.',
    sortOrder: 2,
  },
  {
    id: 'str-rubber-olive', name: 'CTS Curved Rubber', brand: 'Delugs',
    material: 'rubber', subMaterial: 'smooth', color: 'Olive', colorHex: '#4A5236',
    lugWidthMm: 20, style: 'sporty', taperedToMm: 20, lengthMm: 120, clasp: 'Steel deployant',
    priceCents: 9900, purchaseUrl: 'https://delugs.com/products/cts-rubber-strap',
    photoUrl: 'straps/rubber-olive.webp', swatchId: 'rubber-grey',
    notes: 'Summer rotation on the Sinn. Surprisingly dressy for rubber.',
    sortOrder: 3,
  },
  {
    id: 'str-sailcloth-sage', name: 'Sailcloth', brand: 'Delugs',
    material: 'fabric', subMaterial: 'sailcloth', color: 'Sage', colorHex: '#6E7355',
    lugWidthMm: 20, style: 'casual', taperedToMm: 18, lengthMm: 115, clasp: 'Steel pin buckle',
    priceCents: 7900, purchaseUrl: 'https://delugs.com/products/sailcloth-strap',
    photoUrl: 'straps/sailcloth-olive.webp', swatchId: 'sailcloth-grey',
    notes: 'Pairs with the Oris green dial. Weatherproof, ages well.',
    sortOrder: 4,
  },
  {
    id: 'str-leather-chestnut', name: 'Box Calf', brand: 'Hodinkee',
    material: 'leather', subMaterial: 'smooth', color: 'Chestnut', colorHex: '#6A4426',
    lugWidthMm: 20, style: 'casual', taperedToMm: 18, lengthMm: 115, clasp: 'Steel pin buckle',
    priceCents: 12000, purchaseUrl: 'https://shop.hodinkee.com/products/box-calf-strap',
    photoUrl: null, swatchId: 'leather-smooth-brown',
    notes: 'The everyday. Goes on the Hamilton more than anything else.',
    sortOrder: 5,
  },
  {
    id: 'str-leather-cognac', name: 'Shell Cordovan', brand: 'Crown & Buckle',
    material: 'leather', subMaterial: 'smooth', color: 'Cognac', colorHex: '#8A4B24',
    lugWidthMm: 19, style: 'vintage', taperedToMm: 16, lengthMm: 110, clasp: 'Steel pin buckle',
    priceCents: 8500, purchaseUrl: 'https://crownandbuckle.com/products/shell-cordovan',
    photoUrl: null, swatchId: 'leather-smooth-cognac',
    notes: 'Orphan width — bought for a watch I sold. Keeping for the patina.',
    sortOrder: 6,
  },
  {
    id: 'str-nato-navy', name: 'Seatbelt NATO', brand: 'Erika\u2019s Originals',
    material: 'nylon', subMaterial: 'nato', color: 'Navy', colorHex: '#2A3550',
    lugWidthMm: 20, style: 'sporty', taperedToMm: 20, lengthMm: 280, clasp: 'Brushed keeper',
    priceCents: 8000, purchaseUrl: 'https://erikasoriginals.com/products/marine-nationale',
    photoUrl: null, swatchId: 'nato-navy',
    notes: 'Weekend knockabout. Adds 2mm of height on the wrist.',
    sortOrder: 7,
  },
  {
    id: 'str-nato-olive', name: 'Bond NATO', brand: 'Crown & Buckle',
    material: 'nylon', subMaterial: 'nato', color: 'Olive', colorHex: '#44523B',
    lugWidthMm: 22, style: 'rugged', taperedToMm: 22, lengthMm: 280, clasp: 'PVD keeper',
    priceCents: 2500, purchaseUrl: 'https://crownandbuckle.com/products/supreme-nato',
    photoUrl: null, swatchId: 'nato-olive',
    notes: 'Throw-it-around strap for the Black Bay.',
    sortOrder: 8,
  },
  {
    id: 'str-suede-grey', name: 'Nubuck Suede', brand: 'Delugs',
    material: 'leather', subMaterial: 'suede', color: 'Grey', colorHex: '#6E6A63',
    lugWidthMm: 22, style: 'casual', taperedToMm: 18, lengthMm: 115, clasp: 'Steel pin buckle',
    priceCents: 11000, purchaseUrl: 'https://delugs.com/products/suede-strap',
    photoUrl: null, swatchId: 'suede-grey',
    notes: 'Autumn strap. Velvety nap, needs babying in the rain.',
    sortOrder: 9,
  },
  {
    id: 'str-oyster-steel', name: 'Oyster Bracelet', brand: 'Strapcode',
    material: 'metal', subMaterial: 'oyster', color: 'Steel', colorHex: '#9A9A9A',
    lugWidthMm: 20, style: 'sporty', taperedToMm: 20, lengthMm: 200, clasp: 'Milled deployant',
    priceCents: 14000, purchaseUrl: 'https://strapcode.com/products/super-oyster',
    photoUrl: null, swatchId: 'metal-oyster-steel',
    notes: 'Brushed-and-polished. Dresses the Sinn up for the office.',
    sortOrder: 10,
  },
  {
    id: 'str-milanese-steel', name: 'Milanese Mesh', brand: 'Staib',
    material: 'metal', subMaterial: 'milanese', color: 'Steel', colorHex: '#A2A2A2',
    lugWidthMm: 22, style: 'dressy', taperedToMm: 22, lengthMm: 200, clasp: 'Magnetic clasp',
    priceCents: 16000, purchaseUrl: 'https://www.staib-mesh.com/products/milanese',
    photoUrl: null, swatchId: 'metal-milanese-steel',
    notes: 'Infinitely adjustable. Surprising match for the GMT.',
    sortOrder: 11,
  },
];

// Seed overrides empty — users create them live in the detail sidebar.
const SEED_OVERRIDES = [];

// ─── Compatibility logic (mirrors lib/strapCompatibility.ts) ─────────────
// FitState: 'fits' | 'excluded' | 'unknown'
const findOverride = (overrides, strapId, watchId) =>
  overrides.find(o => o.strapId === strapId && o.watchId === watchId);

const effectiveCompatibility = (strap, watch, overrides) => {
  const ov = findOverride(overrides, strap.id, watch.id);
  if (ov) return ov.override;                          // 1. explicit override
  if (watch.braceletType === 'integrated') return 'excluded'; // 2. integrated
  if (strap.lugWidthMm == null || watch.lugWidthMm == null) return 'unknown'; // 4. missing
  if (strap.lugWidthMm === watch.lugWidthMm) return 'fits';   // 3. width match
  return 'excluded';                                   // 5. mismatch
};

const compatibleWatches = (strap, watches, overrides) =>
  watches.filter(w => effectiveCompatibility(strap, w, overrides) === 'fits');

const compatibleStraps = (watch, straps, overrides) =>
  straps.filter(s => effectiveCompatibility(s, watch, overrides) === 'fits');

const totalCombos = (watches, straps, overrides) =>
  watches.reduce((sum, w) => sum + compatibleStraps(w, straps, overrides).length, 0);

// Short label explaining WHY a strap does/doesn't fit a given watch
const fitBasis = (strap, watch, overrides) => {
  const ov = findOverride(overrides, strap.id, watch.id);
  if (ov) return ov.override === 'fits' ? 'Marked as fits' : 'Marked excluded';
  if (watch.braceletType === 'integrated') return 'Integrated bracelet';
  if (strap.lugWidthMm == null || watch.lugWidthMm == null) return 'Width unknown';
  if (strap.lugWidthMm === watch.lugWidthMm) return `${strap.lugWidthMm} mm \u2014 lug match`;
  return `Needs ${watch.lugWidthMm} mm`;
};

// Count of owned watches at a given lug width (for "20mm (4)" affordances)
const watchesAtWidth = (watches, mm) =>
  watches.filter(w => w.lugWidthMm === mm).length;

// ─── Display constants ───────────────────────────────────────────────────
const MATERIALS = ['leather', 'rubber', 'nylon', 'canvas', 'fabric', 'metal', 'silicone', 'ceramic', 'exotic', 'other'];

const SUB_MATERIALS = {
  leather: ['Smooth', 'Alligator', 'Suede', 'Pebbled', 'Shell Cordovan'],
  rubber: ['Smooth', 'Tropic', 'Tread', 'FKM'],
  nylon: ['NATO', 'Seatbelt', 'Perlon', 'Single-pass'],
  canvas: ['Cordura', 'Sailcloth', 'Waxed'],
  fabric: ['Sailcloth', 'Tweed', 'Denim'],
  metal: ['Oyster', 'Jubilee', 'President', 'H-Link', 'Milanese', 'Beads of Rice', 'Mesh'],
  silicone: ['Smooth', 'Textured'],
  ceramic: ['Brushed', 'Polished'],
  exotic: ['Ostrich', 'Lizard', 'Shark', 'Stingray'],
  other: [],
};

const COMMON_COLORS = [
  ['Black', '#1A1410'], ['Dark Brown', '#3A2418'], ['Brown', '#6A4426'],
  ['Cognac', '#8A4B24'], ['Tan', '#B08552'], ['Navy', '#2A3550'],
  ['Olive', '#44523B'], ['Grey', '#6E6A63'], ['Burgundy', '#5A2A2E'], ['Steel', '#9A9A9A'],
];

const COMMON_WIDTHS = [18, 19, 20, 21, 22, 24];
const STYLES = ['dressy', 'sporty', 'casual', 'rugged', 'vintage'];
const MATERIAL_LABEL = (m) => m.charAt(0).toUpperCase() + m.slice(1);

Object.assign(window, {
  money, hostOf, OWNED_WATCHES, STRAPS, SEED_OVERRIDES,
  effectiveCompatibility, compatibleWatches, compatibleStraps, totalCombos, fitBasis,
  watchesAtWidth, findOverride,
  MATERIALS, SUB_MATERIALS, COMMON_COLORS, COMMON_WIDTHS, STYLES, MATERIAL_LABEL,
});
