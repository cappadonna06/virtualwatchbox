// service-data.jsx — Virtual Watchbox · Service Room
// Single source of truth: collection, service records, documents, providers, helpers.
// "Today" is pinned so status math is deterministic in the prototype.

const TODAY = new Date('2026-06-01T12:00:00');

// ─── Formatting helpers ──────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0
}).format(n || 0);

const fmtK = n => n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${n}`;

// Always return a fresh Date so callers (addYears/addMonths) can mutate safely
// without corrupting shared references like TODAY.
const parseDate = d => (d instanceof Date ? new Date(d.getTime()) : new Date(d + 'T12:00:00'));

const fmtDate = (d, opts) => parseDate(d).toLocaleDateString('en-US',
  opts || { year: 'numeric', month: 'short', day: 'numeric' });

const fmtMonthYear = d => parseDate(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

const monthsBetween = (a, b) => {
  const da = parseDate(a), db = parseDate(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth())
    + (db.getDate() - da.getDate()) / 30;
};

const addYears = (d, y) => {
  const nd = parseDate(d); nd.setFullYear(nd.getFullYear() + y); return nd;
};

// Human "time ago / until" — compact
const relTime = d => {
  const m = monthsBetween(TODAY, d); // positive = future
  const am = Math.abs(m);
  let txt;
  if (am < 1) txt = 'this month';
  else if (am < 12) txt = `${Math.round(am)} mo`;
  else { const y = am / 12; txt = `${y < 2 ? y.toFixed(1) : Math.round(y)} yr`; }
  if (am < 1) return txt;
  return m >= 0 ? `in ${txt}` : `${txt} ago`;
};

// ─── Service type taxonomy (the pill selector) ───────────────────────────
const SERVICE_TYPES = [
  { id: 'full',     label: 'Full Service',        resets: true,  glyph: '◍' },
  { id: 'movement', label: 'Movement Service',    resets: true,  glyph: '⊚' },
  { id: 'water',    label: 'Water-Resistance',    resets: false, glyph: '◌' },
  { id: 'battery',  label: 'Battery',             resets: false, glyph: '▮' },
  { id: 'polish',   label: 'Polishing',           resets: false, glyph: '◇' },
  { id: 'strap',    label: 'Strap / Bracelet',    resets: false, glyph: '⌒' },
  { id: 'repair',   label: 'Repair',              resets: false, glyph: '✚' },
  { id: 'other',    label: 'Other',               resets: false, glyph: '•' },
];
const serviceType = id => SERVICE_TYPES.find(t => t.id === id) || SERVICE_TYPES[7];

// ─── Document taxonomy (Papers & Provenance) ─────────────────────────────
const DOC_TYPES = [
  { id: 'receipt',       label: 'Receipt' },
  { id: 'warranty_card', label: 'Warranty Card' },
  { id: 'service_record', label: 'Service Record' },
  { id: 'box_papers',    label: 'Box & Papers' },
  { id: 'appraisal',     label: 'Appraisal' },
  { id: 'manual',        label: 'Manual' },
];
const docType = id => DOC_TYPES.find(t => t.id === id) || { id, label: id };

const ACQ_LABEL = {
  ad: 'Authorized Dealer', grey: 'Grey Market', auction: 'Auction',
  private: 'Private Sale', gift: 'Gift', inherited: 'Inherited',
};

// ─── The collection ──────────────────────────────────────────────────────
// intervalYears = the owner's chosen full-service cadence (configurable).
const COLLECTION = [
  {
    id: 'rolex-dj41',
    brand: 'Rolex', model: 'Datejust 41', ref: '126331',
    nickname: 'The everyday',
    image: 'img/rolex-datejust.png',
    caseSizeMm: 41, caseMaterial: 'Oystersteel & Everose', dialColor: 'Chocolate',
    movement: 'Cal. 3235 (Auto)', type: 'Daily',
    acquiredDate: '2023-03-18', acquiredFrom: 'ad', purchasePrice: 14800, estValue: 16200,
    hasBox: true, hasPapers: true, warrantyExpiry: '2026-09-18',
    intervalYears: 10,
    records: [
      { id: 'r1', date: '2024-04-02', type: 'water',  provider: 'Rolex Service Center · Dallas', cost: 0,   notes: 'Pressure tested to 100m, gaskets inspected. Complimentary under warranty.' },
      { id: 'r2', date: '2023-03-18', type: 'other',  provider: 'Authorized Dealer', cost: 0, notes: 'Factory regulation confirmed at delivery (+1.5 s/day).' },
    ],
    documents: [
      { id: 'd1', type: 'receipt',       label: 'AD Sales Invoice', date: '2023-03-18' },
      { id: 'd2', type: 'warranty_card', label: 'Guarantee Card',   date: '2023-03-18' },
      { id: 'd3', type: 'box_papers',    label: 'Full Set — Box, Tags, Booklets', date: '2023-03-18' },
      { id: 'd4', type: 'service_record', label: 'Pressure Test Slip', date: '2024-04-02' },
    ],
  },
  {
    id: 'omega-speedy',
    brand: 'Omega', model: 'Speedmaster Broad Arrow', ref: '3551.20.00',
    nickname: 'The chrono',
    image: 'img/omega-speedmaster.png',
    caseSizeMm: 42, caseMaterial: 'Stainless Steel', dialColor: 'Silver',
    movement: 'Cal. 3303 (Auto Chrono)', type: 'Chronograph',
    acquiredDate: '2019-06-11', acquiredFrom: 'grey', purchasePrice: 3900, estValue: 4600,
    hasBox: true, hasPapers: false, warrantyExpiry: null,
    intervalYears: 5,
    records: [
      { id: 's1', date: '2021-10-08', type: 'full',   provider: 'Omega Boutique Service · NYC', cost: 720, notes: 'Full overhaul, chrono module cleaned, crystal replaced. Amplitude restored to 290°.' },
      { id: 's2', date: '2021-10-08', type: 'polish', provider: 'Omega Boutique Service · NYC', cost: 0,   notes: 'Light case & bracelet refinish included with service.' },
      { id: 's3', date: '2019-08-20', type: 'water',  provider: 'Independent · Central Watch', cost: 65,  notes: 'Resealed after purchase from grey market.' },
    ],
    documents: [
      { id: 'sd1', type: 'box_papers', label: 'Outer & Inner Box', date: '2019-06-11' },
      { id: 'sd2', type: 'service_record', label: 'Omega Service Certificate', date: '2021-10-08' },
    ],
  },
  {
    id: 'patek-calatrava',
    brand: 'Patek Philippe', model: 'Calatrava', ref: '6000G-012',
    nickname: 'The dress watch',
    image: 'img/patek-calatrava.png',
    caseSizeMm: 37, caseMaterial: 'White Gold', dialColor: 'Blue Sunburst',
    movement: 'Cal. 240 PS C (Auto)', type: 'Dress',
    acquiredDate: '2022-11-05', acquiredFrom: 'ad', purchasePrice: 26500, estValue: 31000,
    hasBox: true, hasPapers: true, warrantyExpiry: '2024-11-05',
    intervalYears: 7,
    records: [
      { id: 'p1', date: '2022-11-05', type: 'other', provider: 'Patek Philippe · Geneva', cost: 0, notes: 'Delivered with Origin certificate. Timing verified on six positions.' },
    ],
    documents: [
      { id: 'pd1', type: 'receipt',       label: 'AD Invoice — Tiffany & Co.', date: '2022-11-05' },
      { id: 'pd2', type: 'warranty_card', label: 'Certificate of Origin', date: '2022-11-05' },
      { id: 'pd3', type: 'box_papers',    label: 'Presentation Box & Booklets', date: '2022-11-05' },
      { id: 'pd4', type: 'appraisal',     label: 'Insurance Appraisal', date: '2024-01-12' },
    ],
  },
  {
    id: 'ap-roo',
    brand: 'Audemars Piguet', model: 'Royal Oak Offshore', ref: '26170ST',
    nickname: 'The heavy hitter',
    image: 'img/ap-royaloak.png',
    caseSizeMm: 42, caseMaterial: 'Stainless Steel', dialColor: 'Black Méga Tapisserie',
    movement: 'Cal. 3126/3840 (Auto Chrono)', type: 'Chronograph',
    acquiredDate: '2016-05-22', acquiredFrom: 'private', purchasePrice: 18500, estValue: 28000,
    hasBox: true, hasPapers: true, warrantyExpiry: null,
    intervalYears: 5,
    records: [
      { id: 'a1', date: '2019-05-14', type: 'full',   provider: 'AP Service Center · Geneva', cost: 1480, notes: 'Complete overhaul incl. chronograph. Gaskets and pushers replaced.' },
      { id: 'a2', date: '2019-05-14', type: 'strap',  provider: 'AP Service Center · Geneva', cost: 320,  notes: 'New rubber strap and titanium deployant.' },
      { id: 'a3', date: '2016-06-01', type: 'water',  provider: 'Independent · Right Time Co.', cost: 90, notes: 'Pre-owned purchase check, resealed to 100m.' },
    ],
    documents: [
      { id: 'ad1', type: 'receipt',       label: 'Bill of Sale — Private', date: '2016-05-22' },
      { id: 'ad2', type: 'box_papers',    label: 'Box, no original papers', date: '2016-05-22' },
      { id: 'ad3', type: 'service_record', label: 'AP Service Invoice', date: '2019-05-14' },
    ],
  },
  {
    id: 'lange-1',
    brand: 'A. Lange & Söhne', model: 'Lange 1', ref: '101.031',
    nickname: 'The grail',
    image: 'img/lange-1.png',
    caseSizeMm: 38.5, caseMaterial: 'Rose Gold', dialColor: 'Black',
    movement: 'Cal. L901.0 (Manual)', type: 'Dress',
    acquiredDate: '2025-09-30', acquiredFrom: 'auction', purchasePrice: 31200, estValue: 34500,
    hasBox: true, hasPapers: true, warrantyExpiry: null,
    intervalYears: 5,
    records: [
      { id: 'l1', date: '2025-11-12', type: 'full',     provider: 'Lange Atelier · via Concierge', cost: 1950, notes: 'Pre-purchase full service. Balance staff and mainspring renewed; dial untouched.' },
      { id: 'l2', date: '2025-11-12', type: 'movement', provider: 'Lange Atelier · via Concierge', cost: 0,    notes: 'Hand-engraved balance cock re-finished. Power reserve verified at 72h.' },
    ],
    documents: [
      { id: 'ld1', type: 'receipt',       label: 'Auction Receipt — Phillips', date: '2025-09-30' },
      { id: 'ld2', type: 'box_papers',    label: 'Wooden Presentation Box', date: '2025-09-30' },
      { id: 'ld3', type: 'service_record', label: 'Lange Service Dossier', date: '2025-11-12' },
      { id: 'ld4', type: 'appraisal',     label: 'Provenance Letter', date: '2025-09-30' },
    ],
  },
  {
    id: 'oris-bigcrown',
    brand: 'Oris', model: 'Big Crown Pointer Date', ref: '01 754 7741',
    nickname: 'The honest one',
    image: 'img/oris-bigcrown.png',
    caseSizeMm: 40, caseMaterial: 'Stainless Steel', dialColor: 'Oxblood Red',
    movement: 'Cal. 754 (Auto)', type: 'Pilot',
    acquiredDate: '2021-02-14', acquiredFrom: 'gift', purchasePrice: 1750, estValue: 1700,
    hasBox: true, hasPapers: false, warrantyExpiry: '2026-02-14',
    intervalYears: 10,
    records: [
      { id: 'o1', date: '2024-07-19', type: 'strap', provider: 'Independent · Local Watchmaker', cost: 140, notes: 'Swapped to brown leather; bracelet stored. Lugs polished.' },
    ],
    documents: [
      { id: 'od1', type: 'manual', label: 'Owner\u2019s Manual', date: '2021-02-14' },
    ],
  },
];

Object.assign(window, {
  TODAY, fmt, fmtK, parseDate, fmtDate, fmtMonthYear, monthsBetween, addYears, relTime,
  SERVICE_TYPES, serviceType, DOC_TYPES, docType, ACQ_LABEL, COLLECTION,
});
