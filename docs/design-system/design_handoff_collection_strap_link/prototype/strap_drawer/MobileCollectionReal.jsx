// MobileCollectionReal.jsx — faithful recreation of the real mobile My Collection,
// with three swappable Strap Drawer entry treatments (chosen by URL hash):
//   #icon   → discreet strap button in the top app bar (+ inline stat link)
//   #drawer → a strap "drawer" tray echoing the watchbox, below it
//   #band   → editorial band with a swipe shelf, below the watchbox
// Uses window globals: WATCHES, fmt, DialSVG, WatchBoxGrid, STRAPS, OWNED_WATCHES,
//   StrapSwatch, totalCombos, compatibleWatches, MATERIAL_LABEL.

const RC = {
  bg: '#FAF8F4', slot: '#FFFCF7', ink: '#1A1410', inkSoft: '#3F362C',
  muted: '#A89880', mutedDark: '#6F6353', gold: '#C9A84C', goldDeep: '#A8862F',
  border: '#EAE5DC', borderMid: '#E8E2D8', borderLight: '#D4CBBF',
  serif: "'Cormorant Garamond', Georgia, serif", sans: "'DM Sans', system-ui, sans-serif",
};
const RDRAWER = 'Strap Drawer.html';

const rawHash = () => (window.location.hash || '').replace('#', '');
const variant = () => {
  const h = rawHash();
  if (h.startsWith('band')) return 'band';
  return ['icon', 'drawer'].includes(h) ? h : 'drawer';
};

// ─── Icon buttons ────────────────────────────────────────────────────────
const SquareBtn = ({ children, onClick }) =>
  React.createElement('button', { onClick, style: {
    width: 46, height: 46, borderRadius: 12, background: RC.slot, border: `1px solid ${RC.border}`,
    boxShadow: '0 1px 3px rgba(26,20,16,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  } }, children);

const StrapGlyph = ({ size = 20, color = RC.ink }) =>
  React.createElement('span', { style: { display: 'flex', gap: 2.5, alignItems: 'center' } },
    ['#3A2A1E', '#5A2A2E', '#1C1C1C', '#4A5236'].map((c, i) =>
      React.createElement('span', { key: i, style: { width: 3, height: size, borderRadius: 1.5, background: color === RC.ink ? c : color } })));

// ─── Top app bar ─────────────────────────────────────────────────────────
const RTopBar = ({ showStrapIcon }) =>
  React.createElement('div', { style: {
    position: 'sticky', top: 0, zIndex: 20, background: 'rgba(250,248,244,0.94)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    borderBottom: `1px solid ${RC.border}`, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '14px 18px',
  } },
    React.createElement('span', { style: { fontFamily: RC.serif, fontSize: 26, fontWeight: 500, letterSpacing: '0.02em', color: RC.ink } }, 'VW'),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
      React.createElement('div', { style: { width: 46, height: 46, borderRadius: '50%', background: RC.ink, color: RC.slot, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: RC.sans, fontSize: 15, fontWeight: 500 } }, 'M'),
      showStrapIcon && React.createElement('a', { href: RDRAWER, title: 'Strap Drawer', style: {
        position: 'relative', width: 46, height: 46, borderRadius: 12, background: RC.slot, border: `1px solid ${RC.border}`,
        boxShadow: '0 1px 3px rgba(26,20,16,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0,
      } },
        React.createElement(StrapGlyph, { size: 20 }),
        React.createElement('span', { style: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: RC.gold, color: RC.ink, fontFamily: RC.sans, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${RC.bg}` } }, STRAPS.length),
      ),
      React.createElement(SquareBtn, null,
        React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: RC.ink, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' },
          React.createElement('circle', { cx: 9, cy: 9, r: 6 }), React.createElement('path', { d: 'M17 17l-3.5-3.5' }))),
      React.createElement(SquareBtn, null,
        React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: RC.ink, strokeWidth: 1.6, strokeLinecap: 'round' },
          React.createElement('path', { d: 'M3 6h14' }), React.createElement('path', { d: 'M3 10h14' }), React.createElement('path', { d: 'M3 14h14' }))),
    ),
  );

// ─── View switcher (grid / list / camera) ────────────────────────────────
const RViewSwitcher = () => {
  const [v, setV] = React.useState('grid');
  const items = [
    ['grid', React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
      React.createElement('rect', { x: 3, y: 3, width: 6, height: 6, rx: 1 }), React.createElement('rect', { x: 11, y: 3, width: 6, height: 6, rx: 1 }),
      React.createElement('rect', { x: 3, y: 11, width: 6, height: 6, rx: 1 }), React.createElement('rect', { x: 11, y: 11, width: 6, height: 6, rx: 1 }))],
    ['list', React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' },
      React.createElement('path', { d: 'M4 6h12' }), React.createElement('path', { d: 'M4 10h12' }), React.createElement('path', { d: 'M4 14h12' }))],
    ['camera', React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
      React.createElement('path', { d: 'M3 6.5h3l1-1.5h6l1 1.5h3v9H3z' }), React.createElement('circle', { cx: 10, cy: 11, r: 2.5 }))],
  ];
  return React.createElement('div', { style: { display: 'inline-flex', gap: 3, background: '#F0EBE3', borderRadius: 11, padding: 4 } },
    items.map(([id, icon]) => React.createElement('button', { key: id, onClick: () => setV(id), style: {
      width: 50, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
      background: v === id ? RC.ink : 'transparent', color: v === id ? RC.slot : RC.muted,
      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, color 0.15s',
    } }, icon)),
  );
};

// ─── Action row ──────────────────────────────────────────────────────────
const RActionRow = () =>
  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', marginTop: 18 } },
    React.createElement('button', { style: {
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 20px', borderRadius: 11,
      background: RC.slot, border: `1px solid ${RC.borderLight}`, cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(26,20,16,0.05)',
    } },
      React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 14 14', fill: 'none', stroke: RC.gold, strokeWidth: 2, strokeLinecap: 'round' },
        React.createElement('line', { x1: 7, y1: 2.5, x2: 7, y2: 11.5 }), React.createElement('line', { x1: 2.5, y1: 7, x2: 11.5, y2: 7 })),
      React.createElement('span', { style: { fontFamily: RC.sans, fontSize: 15, fontWeight: 500, color: RC.ink } }, 'Add Watch')),
    React.createElement(RViewSwitcher),
    React.createElement('div', { style: { marginLeft: 'auto' } },
      React.createElement(SquareBtn, null,
        React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 20 20', fill: RC.ink },
          React.createElement('circle', { cx: 5, cy: 10, r: 1.4 }), React.createElement('circle', { cx: 10, cy: 10, r: 1.4 }), React.createElement('circle', { cx: 15, cy: 10, r: 1.4 })))),
  );

// ─── Entry: DRAWER tray (echoes the watchbox) ────────────────────────────
const StrapTrayTile = ({ strap }) =>
  React.createElement('a', { href: `${RDRAWER}#strap=${strap.id}`, style: {
    flex: '0 0 88px', textDecoration: 'none', display: 'block',
    background: RC.slot, border: `1.5px solid #E0DAD0`, borderRadius: 8, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(26,20,16,0.06)',
  } },
    React.createElement('div', { style: { aspectRatio: '3 / 4' } },
      strap.photoUrl
        ? React.createElement('div', { style: { width: '100%', height: '100%', background: 'radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF, #FBF8F2 72%, #F4EFE6)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement('img', { src: strap.photoUrl, alt: strap.name, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '8px 2px' } }))
        : React.createElement(StrapSwatch, { swatchId: strap.swatchId, material: strap.material, height: '100%' }),
    ),
  );

const StrapDrawerTray = () => {
  const featured = [...STRAPS].sort((a, b) => (b.photoUrl ? 1 : 0) - (a.photoUrl ? 1 : 0)).slice(0, 6);
  const remaining = STRAPS.length - featured.length;
  return React.createElement('div', { style: { padding: '26px 18px 0' } },
    // drawer header / front
    React.createElement('a', { href: RDRAWER, style: { display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: -6, position: 'relative', zIndex: 2,
      background: 'linear-gradient(180deg, #C9A04C 0%, #B58836 100%)', border: '1px solid #A87A2E', borderRadius: '12px 12px 0 0', padding: '12px 16px',
      boxShadow: '0 -1px 0 rgba(255,255,255,0.15) inset' } },
      React.createElement('span', { style: { display: 'flex', gap: 3 } },
        ['#2A1E14', '#5A2A2E', '#15110D', '#3A4029'].map((c, i) =>
          React.createElement('span', { key: i, style: { width: 4, height: 18, borderRadius: 2, background: c } }))),
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('div', { style: { fontFamily: RC.sans, fontSize: 14, fontWeight: 600, color: '#2A1E0E' } }, 'Strap Drawer'),
        React.createElement('div', { style: { fontFamily: RC.sans, fontSize: 11, color: 'rgba(42,30,14,0.7)', marginTop: 1 } }, `${STRAPS.length} straps \u00b7 ${totalCombos(OWNED_WATCHES, STRAPS, [])} combinations`)),
      React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RC.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2A1E0E' } }, 'Open',
        React.createElement('svg', { width: 13, height: 13, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
          React.createElement('path', { d: 'M8 5l5 5-5 5' }))),
    ),
    // drawer body
    React.createElement('div', { style: {
      background: 'linear-gradient(180deg, #6B4E2E 0%, #573D22 100%)', border: '1px solid #4A3318', borderTop: 'none',
      borderRadius: '0 0 12px 12px', padding: 12, boxShadow: 'inset 0 8px 16px rgba(0,0,0,0.32)',
    } },
      React.createElement('div', { className: 'mc-tray-scroll', style: { display: 'flex', gap: 9, overflowX: 'auto' } },
        featured.map(s => React.createElement(StrapTrayTile, { key: s.id, strap: s })),
        remaining > 0 && React.createElement('a', { href: RDRAWER, style: {
          flex: '0 0 88px', textDecoration: 'none', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.22)',
          background: 'rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        } },
          React.createElement('span', { style: { fontFamily: RC.serif, fontSize: 22, fontWeight: 500, color: '#F4EFE6' } }, `+${remaining}`),
          React.createElement('span', { style: { fontFamily: RC.sans, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(244,239,230,0.7)' } }, 'More'),
        ),
      ),
    ),
  );
};

// ─── Entry: BAND (editorial swipe shelf) ─────────────────────────────────
const BandTile = ({ strap }) => {
  const title = strap.name && strap.name !== MATERIAL_LABEL(strap.material) ? strap.name : `${strap.color} ${MATERIAL_LABEL(strap.material)}`;
  const fits = compatibleWatches(strap, OWNED_WATCHES, []).length;
  return React.createElement('a', { href: `${RDRAWER}#strap=${strap.id}`, style: {
    flex: '0 0 140px', textDecoration: 'none', background: RC.slot, border: `1px solid ${RC.borderMid}`, borderRadius: 9, overflow: 'hidden', display: 'block',
  } },
    React.createElement('div', { style: { aspectRatio: '4 / 5', borderBottom: `1px solid ${RC.borderMid}` } },
      strap.photoUrl
        ? React.createElement('div', { style: { width: '100%', height: '100%', background: 'radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF, #FBF8F2 72%, #F4EFE6)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement('img', { src: strap.photoUrl, alt: title, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '10px 4px' } }))
        : React.createElement(StrapSwatch, { swatchId: strap.swatchId, material: strap.material, height: '100%' }),
    ),
    React.createElement('div', { style: { padding: '9px 11px 11px' } },
      React.createElement('div', { style: { fontFamily: RC.sans, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: RC.gold, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, strap.brand),
      React.createElement('div', { style: { fontFamily: RC.serif, fontSize: 15, color: RC.ink, lineHeight: 1.1, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, title),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' } },
        React.createElement('span', { style: { fontFamily: RC.sans, fontSize: 9, fontWeight: 500, color: RC.goldDeep, background: '#FBF6EA', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '2px 5px' } }, `${strap.lugWidthMm} mm`),
        React.createElement('span', { style: { fontFamily: RC.sans, fontSize: 9.5, color: RC.muted } }, `Fits ${fits}`)),
    ),
  );
};

const StrapBand = () => {
  const featured = [...STRAPS].sort((a, b) => (b.photoUrl ? 1 : 0) - (a.photoUrl ? 1 : 0)).slice(0, 5);
  const remaining = STRAPS.length - featured.length;
  return React.createElement('div', { style: { marginTop: 28, padding: '24px 0 0', borderTop: `1px solid ${RC.border}` } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 18px', marginBottom: 14, gap: 12 } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontFamily: RC.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: RC.gold, marginBottom: 7 } }, 'Also in your collection'),
        React.createElement('h2', { style: { fontFamily: RC.serif, fontSize: 26, fontWeight: 400, lineHeight: 1, color: RC.ink, margin: 0 } }, 'The Strap Drawer'),
        React.createElement('div', { style: { fontFamily: RC.sans, fontSize: 11.5, color: RC.muted, marginTop: 5 } }, `${STRAPS.length} straps \u00b7 ${totalCombos(OWNED_WATCHES, STRAPS, [])} combinations`)),
      React.createElement('a', { href: RDRAWER, style: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: RC.sans, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: RC.ink, textDecoration: 'none', borderBottom: `1.5px solid ${RC.gold}`, paddingBottom: 3 } }, 'Open',
        React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
          React.createElement('path', { d: 'M8 5l5 5-5 5' }))),
    ),
    React.createElement('div', { className: 'mc-band-scroll', style: { display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px 4px' } },
      featured.map(s => React.createElement(BandTile, { key: s.id, strap: s })),
      remaining > 0 && React.createElement('a', { href: RDRAWER, style: {
        flex: '0 0 116px', textDecoration: 'none', border: `1px solid ${RC.borderLight}`, borderRadius: 9,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14,
      } },
        React.createElement('div', { style: { display: 'flex', gap: 3 } },
          ['#3A2A1E', '#5A2A2E', '#1C1C1C', '#4A5236', '#6E7355'].map((c, i) =>
            React.createElement('span', { key: i, style: { width: 6, height: 38, borderRadius: 2, background: c, boxShadow: '0 3px 8px rgba(26,20,16,0.16)' } }))),
        React.createElement('div', { style: { fontFamily: RC.serif, fontSize: 20, fontWeight: 500, color: RC.ink, lineHeight: 1 } }, `+${remaining}`),
        React.createElement('span', { style: { fontFamily: RC.sans, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: RC.goldDeep } }, 'View all'),
      ),
    ),
  );
};

// ─── Collection Stats (light, for fidelity) ──────────────────────────────
const RStats = ({ watches }) => {
  const total = watches.reduce((s, w) => s + w.estimatedValue, 0);
  return React.createElement('div', { style: { marginTop: 30, padding: '26px 18px 0', borderTop: `1px solid ${RC.border}` } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
      React.createElement('h2', { style: { fontFamily: RC.serif, fontSize: 28, fontWeight: 400, color: RC.ink, margin: 0 } }, 'Collection Stats'),
      React.createElement('div', { style: { display: 'inline-flex', background: '#F0EBE3', borderRadius: 20, padding: 3 } },
        ['Overview', 'Graphical'].map((t, i) => React.createElement('span', { key: t, style: { fontFamily: RC.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '7px 12px', borderRadius: 16, background: i === 0 ? RC.ink : 'transparent', color: i === 0 ? RC.slot : RC.muted } }, t))),
    ),
    React.createElement('div', { style: { display: 'flex', gap: 20, background: RC.slot, border: `1px solid ${RC.border}`, borderRadius: 12, padding: 16 } },
      [['Total Value', fmt(total)], ['Cost Basis', fmt(Math.round(total * 0.86))], ['Gain', '+' + fmt(Math.round(total * 0.14))]].map(([l, v], i) =>
        React.createElement('div', { key: l, style: { flex: 1 } },
          React.createElement('div', { style: { fontFamily: RC.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: RC.muted, marginBottom: 5 } }, l),
          React.createElement('div', { style: { fontFamily: RC.serif, fontSize: 21, fontWeight: 500, color: i === 2 ? '#2D6A2D' : RC.ink } }, v))),
    ),
  );
};

// ─── Root ────────────────────────────────────────────────────────────────
const MobileCollectionRealRoot = () => {
  const v = variant();
  const watches = React.useMemo(() =>
    WATCHES.filter(w => w.imageUrl).map(w => ({ ...w, imageUrl: w.imageUrl.replace(/^\.\.\//, '') })).slice(0, 5), []);
  const total = watches.reduce((s, w) => s + w.estimatedValue, 0);

  React.useEffect(() => {
    const h = rawHash();
    const toEntry = v === 'drawer' || h === 'bandshelf';
    if (toEntry) {
      const el = document.getElementById('mc-entry');
      if (el) setTimeout(() => window.scrollTo({ top: el.offsetTop - 70 }), 70);
    }
  }, [v]);

  return React.createElement('div', { style: { background: RC.bg, minHeight: '100vh', color: RC.ink, paddingBottom: 30 } },
    React.createElement(RTopBar, { showStrapIcon: v === 'icon' }),
    // Title
    React.createElement('div', { style: { padding: '20px 18px 0' } },
      React.createElement('h1', { style: { fontFamily: RC.serif, fontSize: 46, fontWeight: 400, lineHeight: 1, color: RC.ink, margin: '0 0 8px' } }, 'My Collection'),
      React.createElement('p', { style: { fontFamily: RC.sans, fontSize: 14, color: RC.muted, margin: 0 } }, 'Your collection, wherever you go.'),
    ),
    React.createElement(RActionRow),
    // stats line (+ bold tappable strap chip in band / icon variants)
    React.createElement('div', { style: { padding: '0 18px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 } },
      React.createElement('span', { style: { fontFamily: RC.sans, fontSize: 14, color: RC.mutedDark, whiteSpace: 'nowrap' } }, `${watches.length} watches \u00b7 ${fmt(total)} est.`),
      (v === 'icon' || v === 'band') && React.createElement('a', { href: RDRAWER, style: {
        marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '7px 7px 7px 13px', borderRadius: 20, textDecoration: 'none',
        background: '#FBF6EA', border: '1px solid rgba(201,168,76,0.5)',
        boxShadow: '0 1px 3px rgba(201,168,76,0.18)',
      } },
        React.createElement('span', { style: { fontFamily: RC.sans, fontSize: 13, fontWeight: 700, color: '#8A6A10', letterSpacing: '0.01em', whiteSpace: 'nowrap' } }, `${STRAPS.length} straps`),
        React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: RC.gold, color: RC.ink } },
          React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('path', { d: 'M8 5l5 5-5 5' }))),
      ),
    ),
    // Watchbox
    React.createElement('div', { style: { padding: '16px 18px 0' } },
      React.createElement(WatchBoxGrid, { watches, slotCount: 6, activeIdx: null, onSlotClick: () => {} }),
    ),
    // Entry treatment
    React.createElement('div', { id: 'mc-entry' },
      v === 'drawer' && React.createElement(StrapDrawerTray),
      v === 'band' && React.createElement(StrapBand),
    ),
    // Stats
    React.createElement(RStats, { watches }),
  );
};

Object.assign(window, { MobileCollectionRealRoot });
