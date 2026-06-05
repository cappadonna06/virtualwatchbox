// CollectionPage.jsx — My Collection (redesigned)
// Changes vs original:
//  - Header: removed "Open Playground"; "Est. Value" reads as a quiet stat (no border, no hover);
//    added watch count + a discreet "Stats ↓" jump-link
//  - View switcher: 2 icon buttons (watchbox, cards). Stats removed (it lives below-fold).
//  - ORDER dropdown: only renders in Cards view.
//  - Stats: now a permanent below-fold section. Default hides zero-count chips with
//    a "Show all" reveal. Tighter padding. Prominent Overview/Graphical toggle.
//  - Untouched: ADD WATCH button placement + style, sidebar empty state, watchbox grid.

// ---------- Icons (1.5px stroke, no fill, currentColor) ----------

const IconWatchbox = ({ size = 16 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('rect', { x: 2.5, y: 3.5, width: 15, height: 13, rx: 1.5 }),
    React.createElement('line', { x1: 7.5, y1: 3.5, x2: 7.5, y2: 16.5 }),
    React.createElement('line', { x1: 12.5, y1: 3.5, x2: 12.5, y2: 16.5 }),
    React.createElement('line', { x1: 2.5, y1: 10, x2: 17.5, y2: 10 })
  );

const IconCards = ({ size = 16 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('rect', { x: 2.5, y: 2.5, width: 6.5, height: 6.5, rx: 1 }),
    React.createElement('rect', { x: 11, y: 2.5, width: 6.5, height: 6.5, rx: 1 }),
    React.createElement('rect', { x: 2.5, y: 11, width: 6.5, height: 6.5, rx: 1 }),
    React.createElement('rect', { x: 11, y: 11, width: 6.5, height: 6.5, rx: 1 })
  );

const IconChevron = ({ size = 12, dir = 'down' }) => {
  const rot = { down: 0, up: 180, left: 90, right: -90 }[dir] || 0;
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', style: { transform: `rotate(${rot}deg)` } },
    React.createElement('polyline', { points: '3,4.5 6,7.5 9,4.5' })
  );
};

const IconArrowDown = ({ size = 11 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('line', { x1: 6, y1: 2, x2: 6, y2: 10 }),
    React.createElement('polyline', { points: '3,7 6,10 9,7' })
  );

// ---------- View switcher (2 icon buttons) ----------

const ViewSwitcher = ({ view, setView }) => {
  const items = [
    { id: 'watchbox', label: 'Watchbox', Icon: IconWatchbox },
    { id: 'cards', label: 'Cards', Icon: IconCards },
  ];
  return React.createElement('div', {
    role: 'tablist',
    style: { display: 'inline-flex', gap: 2, background: '#F0EBE3', borderRadius: 6, padding: 3 }
  },
    items.map(({ id, label, Icon }) => {
      const active = view === id;
      return React.createElement('button', {
        key: id,
        role: 'tab',
        'aria-selected': active,
        'aria-label': label,
        title: label,
        onClick: () => setView(id),
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.06em',
          padding: '7px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
          background: active ? '#FFFFFF' : 'transparent',
          color: active ? '#1A1410' : '#A89880',
          boxShadow: active ? '0 1px 3px rgba(26,20,16,0.08)' : 'none',
          transition: 'background 0.15s, color 0.15s',
        }
      },
        React.createElement(Icon, { size: 15 }),
        React.createElement('span', { style: { fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase' } }, label)
      );
    })
  );
};

// ---------- Order dropdown (Cards view only) ----------

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently Added' },
  { id: 'value-desc', label: 'Value, High → Low' },
  { id: 'value-asc',  label: 'Value, Low → High' },
  { id: 'brand', label: 'Brand A → Z' },
  { id: 'type', label: 'Watch Type' },
];

const OrderDropdown = ({ value, setValue }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = SORT_OPTIONS.find(o => o.id === value) || SORT_OPTIONS[0];

  return React.createElement('div', { ref, style: { position: 'relative' } },
    React.createElement('button', {
      onClick: () => setOpen(o => !o),
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 14,
        background: '#FFFFFF', border: '1px solid #EAE5DC', borderRadius: 6,
        padding: '8px 14px', cursor: 'pointer',
        fontFamily: 'DM Sans,sans-serif',
      }
    },
      React.createElement('span', { style: { fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880' } }, 'Order'),
      React.createElement('span', { style: { fontSize: 12, fontWeight: 500, color: '#1A1410' } }, current.label),
      React.createElement('span', { style: { color: '#A89880', display: 'inline-flex' } }, React.createElement(IconChevron, { size: 12, dir: open ? 'up' : 'down' }))
    ),
    open && React.createElement('div', {
      style: {
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
        background: '#FFFFFF', border: '1px solid #EAE5DC', borderRadius: 8,
        boxShadow: '0 8px 24px rgba(26,20,16,0.10)', padding: 4, minWidth: 200,
      }
    },
      SORT_OPTIONS.map(o =>
        React.createElement('button', {
          key: o.id,
          onClick: () => { setValue(o.id); setOpen(false); },
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '8px 10px', borderRadius: 4, border: 'none',
            background: o.id === value ? '#FAF8F4' : 'transparent',
            color: '#1A1410', fontFamily: 'DM Sans,sans-serif', fontSize: 12,
            fontWeight: o.id === value ? 500 : 400, cursor: 'pointer', textAlign: 'left',
          }
        },
          o.label,
          o.id === value && React.createElement('span', { style: { color: '#C9A84C', fontSize: 12 } }, '✓')
        )
      )
    )
  );
};

// ---------- Sort logic ----------

const sortWatches = (watches, sortId) => {
  const w = [...watches];
  switch (sortId) {
    case 'value-desc': return w.sort((a, b) => b.estimatedValue - a.estimatedValue);
    case 'value-asc':  return w.sort((a, b) => a.estimatedValue - b.estimatedValue);
    case 'brand':      return w.sort((a, b) => a.brand.localeCompare(b.brand));
    case 'type':       return w.sort((a, b) => a.watchType.localeCompare(b.watchType));
    case 'recent':
    default:           return w.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));
  }
};

// ---------- Cards grid ----------

const WatchCardGrid = ({ watches, activeId, onSelect }) =>
  React.createElement('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }
  },
    watches.map(watch => {
      const isActive = activeId === watch.id;
      const statusStyle = STATUS_STYLES[watch.ownershipStatus] || STATUS_STYLES['Owned'];
      return React.createElement('div', {
        key: watch.id, onClick: () => onSelect(watch),
        style: {
          background: '#FFFFFF',
          border: isActive ? '2px solid rgba(201,168,76,0.8)' : '1px solid #E8E2D8',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: isActive
            ? '0 0 0 1px rgba(201,168,76,0.4),0 6px 24px rgba(201,168,76,0.12)'
            : '0 1px 4px rgba(26,20,16,0.04)',
          cursor: 'pointer',
          transform: isActive ? 'translateY(-2px)' : 'none',
          transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        }
      },
        React.createElement('div', {
          style: { background: '#FAF8F4', aspectRatio: '4/3', borderBottom: '1px solid #E8E2D8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }
        },
          watch.imageUrl
            ? React.createElement('img', { src: watch.imageUrl, alt: watch.model, style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(26,20,16,0.10))' } })
            : React.createElement(DialSVG, { ...watch.dialConfig, size: 72 })
        ),
        React.createElement('div', { style: { padding: '14px 16px 16px' } },
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 4 } }, watch.brand),
          React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 19, fontWeight: 400, color: '#1A1410', lineHeight: 1.15, marginBottom: 4 } }, watch.model),
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880', marginBottom: 2 } }, `Ref. ${watch.reference}`),
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880', marginBottom: 12 } }, `${watch.caseSizeMm}mm · ${watch.dialColor}`),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 22, fontWeight: 500, color: '#1A1410' } }, fmt(watch.estimatedValue)),
            React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 20, background: statusStyle.background, color: statusStyle.color } }, watch.ownershipStatus)
          )
        )
      );
    })
  );

Object.assign(window, { ViewSwitcher, OrderDropdown, WatchCardGrid, sortWatches, IconWatchbox, IconCards, IconChevron, IconArrowDown });
