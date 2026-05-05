// WatchData.jsx — shared watch data, DialSVG, formatting helpers

const fmt = n => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0
}).format(n);

const WATCHES = [
  {
    id: 'omega-aqua-terra', brand: 'Omega', model: 'Seamaster Aqua Terra',
    reference: '220.10.41.21.03.001', caseSizeMm: 41, caseMaterial: 'Stainless Steel',
    dialColor: 'Blue', movement: 'Cal. 8900 (Auto)', complications: ['Date', 'GMT'],
    condition: 'Like New', purchaseDate: '2024-09-01', purchasePrice: 4800,
    estimatedValue: 6000, notes: 'AD purchase, full set',
    imageUrl: '../assets/watches/longines-02.avif',
    dialConfig: { dialColor: '#1B2A4A', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'Sport', ownershipStatus: 'Owned',
  },
  {
    id: 'tudor-bb-gmt', brand: 'Tudor', model: 'Black Bay GMT',
    reference: 'M79830RB-0001', caseSizeMm: 41, caseMaterial: 'Stainless Steel',
    dialColor: 'Black', movement: 'Cal. MT5652 (Auto)', complications: ['Date', 'GMT'],
    condition: 'Excellent', purchaseDate: '2023-04-12', purchasePrice: 3800,
    estimatedValue: 4200, notes: 'Pepsi bezel, original bracelet',
    imageUrl: '../assets/watches/longines-04.avif',
    dialConfig: { dialColor: '#111111', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'GMT', ownershipStatus: 'Owned',
  },
  {
    id: 'sinn-556', brand: 'Sinn', model: '556 I',
    reference: '556.0102', caseSizeMm: 38.5, caseMaterial: 'Stainless Steel',
    dialColor: 'Black', movement: 'SW 200-1 (Auto)', complications: ['Date'],
    condition: 'Like New', purchaseDate: '2024-01-15', purchasePrice: 1450,
    estimatedValue: 1500, notes: 'Tegimented case, daily wear',
    imageUrl: '../assets/watches/longines-01.avif',
    dialConfig: { dialColor: '#0F0F0F', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'Sport', ownershipStatus: 'Recently Added',
  },
  {
    id: 'oris-bigcrown', brand: 'Oris', model: 'Big Crown Pointer Date',
    reference: '01 754 7741 4067', caseSizeMm: 40, caseMaterial: 'Stainless Steel',
    dialColor: 'Green', movement: 'Cal. 754 (Auto)', complications: ['Date'],
    condition: 'Excellent', purchaseDate: '2022-08-22', purchasePrice: 1700,
    estimatedValue: 1850, notes: 'Brown leather, vintage feel',
    imageUrl: '../assets/watches/longines-03.avif',
    dialConfig: { dialColor: '#2A4A2E', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'Pilot', ownershipStatus: 'Owned',
  },
  {
    id: 'hamilton-khaki', brand: 'Hamilton', model: 'Khaki Field Mechanical',
    reference: 'H69439933', caseSizeMm: 38, caseMaterial: 'Stainless Steel',
    dialColor: 'White', movement: 'H-50 (Manual)', complications: [],
    condition: 'Unworn', purchaseDate: '2025-02-10', purchasePrice: 520,
    estimatedValue: 580, notes: 'Birthday gift from spouse',
    imageUrl: '../assets/watches/longines-05.avif',
    dialConfig: { dialColor: '#F5F0E8', markerColor: '#1A1410', handColor: '#1A1410' },
    watchType: 'Dress', ownershipStatus: 'Recently Added',
  },
];

// Playground "Dream Collection" — fantasy box, all using real product imagery
const PLAYGROUND_WATCHES = [
  {
    id: 'pg-aqua-terra', brand: 'Omega', model: 'Seamaster Aqua Terra',
    reference: '220.10.41.21.03.001', caseSizeMm: 41, caseMaterial: 'Stainless Steel',
    dialColor: 'Blue', movement: 'Cal. 8900 (Auto)', complications: ['Date', 'GMT'],
    condition: 'Like New', purchaseDate: '', purchasePrice: 0,
    estimatedValue: 6000, notes: '',
    imageUrl: '../assets/watches/longines-02.avif',
    dialConfig: { dialColor: '#1B2A4A', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'Sport', ownershipStatus: 'Wishlist',
  },
  {
    id: 'pg-bb-gmt', brand: 'Tudor', model: 'Black Bay GMT',
    reference: 'M79830RB-0001', caseSizeMm: 41, caseMaterial: 'Stainless Steel',
    dialColor: 'Black', movement: 'Cal. MT5652 (Auto)', complications: ['Date', 'GMT'],
    condition: 'Excellent', purchaseDate: '', purchasePrice: 0,
    estimatedValue: 4200, notes: '',
    imageUrl: '../assets/watches/longines-04.avif',
    dialConfig: { dialColor: '#111111', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'GMT', ownershipStatus: 'Wishlist',
  },
  {
    id: 'pg-556', brand: 'Sinn', model: '556 I',
    reference: '556.0102', caseSizeMm: 38.5, caseMaterial: 'Stainless Steel',
    dialColor: 'Black', movement: 'SW 200-1 (Auto)', complications: ['Date'],
    condition: 'Like New', purchaseDate: '', purchasePrice: 0,
    estimatedValue: 1500, notes: '',
    imageUrl: '../assets/watches/longines-01.avif',
    dialConfig: { dialColor: '#0F0F0F', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'Sport', ownershipStatus: 'Wishlist',
  },
  {
    id: 'pg-bigcrown', brand: 'Oris', model: 'Big Crown Pointer Date',
    reference: '01 754 7741 4067', caseSizeMm: 40, caseMaterial: 'Stainless Steel',
    dialColor: 'Green', movement: 'Cal. 754 (Auto)', complications: ['Date'],
    condition: 'Excellent', purchaseDate: '', purchasePrice: 0,
    estimatedValue: 1850, notes: '',
    imageUrl: '../assets/watches/longines-03.avif',
    dialConfig: { dialColor: '#2A4A2E', markerColor: '#FAF8F4', handColor: '#FAF8F4' },
    watchType: 'Pilot', ownershipStatus: 'Wishlist',
  },
  {
    id: 'pg-khaki', brand: 'Hamilton', model: 'Khaki Field Mechanical',
    reference: 'H69439933', caseSizeMm: 38, caseMaterial: 'Stainless Steel',
    dialColor: 'White', movement: 'H-50 (Manual)', complications: [],
    condition: 'Unworn', purchaseDate: '', purchasePrice: 0,
    estimatedValue: 580, notes: '',
    imageUrl: '../assets/watches/longines-05.avif',
    dialConfig: { dialColor: '#F5F0E8', markerColor: '#1A1410', handColor: '#1A1410' },
    watchType: 'Dress', ownershipStatus: 'Wishlist',
  },
];

// Multiple boxes for the box-tab UX
const PLAYGROUND_BOXES = [
  {
    id: 'dream',
    name: 'Dream Collection',
    tags: ['Dream Box'],
    watchIds: ['pg-aqua-terra', 'pg-bb-gmt', 'pg-556', 'pg-bigcrown', 'pg-khaki'],
    slotCount: 6,
  },
  {
    id: 'under10k',
    name: 'Under $10K',
    tags: ['Value', 'Daily'],
    watchIds: ['pg-aqua-terra', 'pg-bb-gmt', 'pg-556', 'pg-khaki'],
    slotCount: 6,
  },
  {
    id: 'travel',
    name: 'Travel Trio',
    tags: ['Travel', 'GMT'],
    watchIds: ['pg-bb-gmt', 'pg-aqua-terra', 'pg-556'],
    slotCount: 3,
  },
];

const STATUS_STYLES = {
  'Owned':          { background: '#E8F4E8', color: '#2D6A2D' },
  'For Sale':       { background: '#FFF8E6', color: '#8A6A10' },
  'Recently Added': { background: '#E8F0FA', color: '#1A4A8A' },
  'Needs Service':  { background: '#FFF3E0', color: '#8A5010' },
};

const CONDITION_STYLES = {
  'Unworn':   { background: '#E8F4E8', color: '#2D6A2D' },
  'Like New': { background: '#EDF4E8', color: '#3A6A2D' },
  'Excellent':{ background: '#FFF8E6', color: '#8A6A10' },
  'Good':     { background: '#FDF0E0', color: '#8A5010' },
  'Fair':     { background: '#FAE8E8', color: '#8A2020' },
};

const DialSVG = ({ dialColor, markerColor, handColor, size = 80 }) => {
  const cx = size / 2, cy = size / 2, r = size * 0.44;
  const hour = 10.5, min = 10;
  const hourAngle = (hour % 12) / 12 * 360 - 90;
  const minAngle = min / 60 * 360 - 90;
  const toRad = d => d * Math.PI / 180;
  const hx = cx + r * 0.55 * Math.cos(toRad(hourAngle));
  const hy = cy + r * 0.55 * Math.sin(toRad(hourAngle));
  const mx = cx + r * 0.78 * Math.cos(toRad(minAngle));
  const my = cy + r * 0.78 * Math.sin(toRad(minAngle));

  return React.createElement('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
    React.createElement('circle', { cx, cy, r, fill: dialColor, stroke: markerColor, strokeWidth: size * 0.015, opacity: 0.9 }),
    React.createElement('circle', { cx, cy, r: r * 0.82, fill: 'none', stroke: markerColor, strokeWidth: 0.8, opacity: 0.15 }),
    // Hour markers
    ...[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
      const angle = i / 12 * 2 * Math.PI - Math.PI / 2;
      const outerR = r * 0.88, innerR = i % 3 === 0 ? r * 0.72 : r * 0.80;
      return React.createElement('line', {
        key: i,
        x1: cx + outerR * Math.cos(angle), y1: cy + outerR * Math.sin(angle),
        x2: cx + innerR * Math.cos(angle), y2: cy + innerR * Math.sin(angle),
        stroke: markerColor, strokeWidth: i % 3 === 0 ? size * 0.022 : size * 0.012,
        strokeLinecap: 'round', opacity: 0.85,
      });
    }),
    // Hour hand
    React.createElement('line', { x1: cx, y1: cy, x2: hx, y2: hy, stroke: handColor, strokeWidth: size * 0.032, strokeLinecap: 'round' }),
    // Minute hand
    React.createElement('line', { x1: cx, y1: cy, x2: mx, y2: my, stroke: handColor, strokeWidth: size * 0.022, strokeLinecap: 'round' }),
    // Center dot
    React.createElement('circle', { cx, cy, r: size * 0.025, fill: handColor }),
  );
};

Object.assign(window, { fmt, WATCHES, PLAYGROUND_WATCHES, PLAYGROUND_BOXES, STATUS_STYLES, CONDITION_STYLES, DialSVG });
