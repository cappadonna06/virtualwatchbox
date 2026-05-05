// CollectionStats.jsx — denser single-column layout
//  - Single column rows, label left / data right (more like a data sheet)
//  - Hides zero-count chips by default with "Show all" reveal
//  - Prominent Overview/Graphical toggle

const statsLabel = {
  fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880',
};

const ALL_WATCH_TYPES = ['Diver', 'Dress', 'Sport', 'Chronograph', 'GMT', 'Pilot', 'Field', 'Integrated Bracelet', 'Vintage'];
const ALL_COMPLICATIONS = ['Date', 'Day-Date', 'GMT', 'Chronograph', 'Moonphase', 'Annual Calendar', 'Perpetual Calendar', 'Power Reserve', 'Tourbillon'];
const ALL_DIAL_COLORS = [
  { name: 'Black',     hex: '#1A1410' },
  { name: 'White',     hex: '#F5F0E8' },
  { name: 'Blue',      hex: '#1B2A4A' },
  { name: 'Grey',      hex: '#7A7A7A' },
  { name: 'Green',     hex: '#2A4A2E' },
  { name: 'Silver',    hex: '#D4CDC0' },
  { name: 'Champagne', hex: '#E8D9B0' },
  { name: 'Salmon',    hex: '#E8C8B8' },
  { name: 'Brown',     hex: '#7A5A3A' },
  { name: 'Red',       hex: '#A83838' },
];

const matchDialColor = (raw) => {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes('black')) return 'Black';
  if (s.includes('white') || s.includes('lacquer')) return 'White';
  if (s.includes('blue') || s.includes('navy')) return 'Blue';
  if (s.includes('grey') || s.includes('gray') || s.includes('anthracite')) return 'Grey';
  if (s.includes('green')) return 'Green';
  if (s.includes('silver')) return 'Silver';
  if (s.includes('champagne')) return 'Champagne';
  if (s.includes('salmon')) return 'Salmon';
  if (s.includes('brown')) return 'Brown';
  if (s.includes('red'))   return 'Red';
  return null;
};

// ---- Toggle ----

const StatsModeToggle = ({ mode, setMode }) =>
  React.createElement('div', {
    role: 'tablist',
    style: {
      display: 'inline-flex', gap: 4,
      background: '#1A1410', borderRadius: 999, padding: 4,
      boxShadow: '0 2px 10px rgba(26,20,16,0.10)',
    }
  },
    ['overview', 'graphical'].map(id => {
      const active = mode === id;
      const label = id === 'overview' ? 'Overview' : 'Graphical';
      return React.createElement('button', {
        key: id, role: 'tab', 'aria-selected': active,
        onClick: () => setMode(id),
        style: {
          fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: active ? '#FAF8F4' : 'transparent',
          color: active ? '#1A1410' : 'rgba(250,248,244,0.55)',
          transition: 'background 0.15s, color 0.15s',
        }
      }, label);
    })
  );

// ---- Chip ----

const StatChip = ({ label, count, dim }) =>
  React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
      padding: '4px 10px', borderRadius: 20,
      background: dim ? 'transparent' : '#1A1410',
      border: dim ? '1px solid #EAE5DC' : '1px solid #1A1410',
      color: dim ? '#C8BCA9' : '#FAF8F4',
      opacity: dim ? 0.7 : 1,
    }
  },
    label,
    React.createElement('span', { style: { fontSize: 10, opacity: 0.65 } }, count)
  );

const RevealToggle = ({ open, setOpen, hiddenCount }) =>
  hiddenCount === 0 ? null :
  React.createElement('button', {
    onClick: () => setOpen(o => !o),
    style: {
      fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.10em', textTransform: 'uppercase',
      background: 'transparent', border: 'none', cursor: 'pointer',
      color: '#A89880', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
    }
  },
    open ? 'Show fewer' : `Show all (+${hiddenCount})`,
    React.createElement('span', { style: { display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' } },
      React.createElement(IconChevron, { size: 10, dir: 'down' })
    )
  );

// ---- Data row: label-left / values-right (single column friendly) ----

const DataRow = ({ label, hiddenCount, open, setOpen, isLast, children }) =>
  React.createElement('div', {
    style: {
      display: 'grid', gridTemplateColumns: '180px 1fr auto',
      alignItems: 'flex-start', gap: 24,
      padding: '18px 0', borderBottom: isLast ? 'none' : '1px solid #EAE5DC',
    }
  },
    React.createElement('div', { style: { ...statsLabel, paddingTop: 4 } }, label),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } }, children),
    typeof open === 'boolean'
      ? React.createElement(RevealToggle, { open, setOpen, hiddenCount })
      : React.createElement('span')
  );

// ---- Portfolio value: horizontal row of numbers ----

const PortfolioValueRow = ({ watches }) => {
  const total = watches.reduce((s, w) => s + w.estimatedValue, 0);
  const cost  = watches.reduce((s, w) => s + w.purchasePrice, 0);
  const gain  = total - cost;
  const sorted = [...watches].sort((a, b) => b.estimatedValue - a.estimatedValue);
  const highest = sorted[0];
  const median  = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;

  const Cell = ({ label, value, color = '#1A1410', icon, sub }) =>
    React.createElement('div', { style: { flex: '1 1 0', minWidth: 140 } },
      React.createElement('div', { style: { ...statsLabel, marginBottom: 6 } }, label),
      React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 26, fontWeight: 500, color, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: 6 } },
        icon && React.createElement('span', { style: { fontSize: 16, color } }, icon),
        value
      ),
      sub && React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, sub)
    );

  return React.createElement('div', {
    style: {
      background: '#FFFCF7', border: '1px solid #EAE5DC', borderRadius: 12,
      padding: '20px 24px',
      display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start',
      marginBottom: 8,
    }
  },
    React.createElement(Cell, { label: 'Total Est. Value', value: fmt(total) }),
    React.createElement(Cell, { label: 'Cost Basis', value: fmt(cost) }),
    React.createElement(Cell, { label: 'Gain / Loss', value: `${gain >= 0 ? '+' : ''}${fmt(gain)}`, color: gain >= 0 ? '#2D6A2D' : '#8A2020', icon: gain >= 0 ? '↑' : '↓' }),
    median && React.createElement(Cell, { label: 'Median Value', value: fmt(median.estimatedValue) }),
    highest && React.createElement(Cell, { label: 'Highest', value: fmt(highest.estimatedValue), color: '#C9A84C', sub: `${highest.brand} ${highest.model}` })
  );
};

// ---- Dial color row (swatches inline) ----

const DialColorsInline = ({ watches }) => {
  const [showAll, setShowAll] = React.useState(false);
  const counts = ALL_DIAL_COLORS.map(c => ({
    ...c, count: watches.filter(w => matchDialColor(w.dialColor) === c.name).length
  }));
  const nonzero = counts.filter(c => c.count > 0);
  const zero = counts.filter(c => c.count === 0);
  const list = showAll ? counts : nonzero;

  return React.createElement(DataRow, { label: 'Dial Colors', hiddenCount: zero.length, open: showAll, setOpen: setShowAll },
    list.map(c =>
      React.createElement('div', { key: c.name, style: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 11px 3px 4px', borderRadius: 20, border: '1px solid #EAE5DC', opacity: c.count === 0 ? 0.45 : 1 } },
        React.createElement('span', {
          style: {
            position: 'relative', width: 18, height: 18, borderRadius: '50%',
            background: c.hex,
            border: c.name === 'White' || c.name === 'Champagne' || c.name === 'Silver' ? '1px solid #D4CBBF' : 'none',
          }
        }),
        React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, color: c.count > 0 ? '#1A1410' : '#A89880' } }, c.name),
        c.count > 0 && React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#A89880' } }, c.count)
      )
    )
  );
};

// ---- Generic chip row ----

const ChipRow = ({ label, items, getCount }) => {
  const [showAll, setShowAll] = React.useState(false);
  const withCounts = items.map(it => ({ ...it, count: getCount(it) }));
  const nonzero = withCounts.filter(it => it.count > 0);
  const zero = withCounts.filter(it => it.count === 0);
  const list = showAll ? withCounts : nonzero;

  return React.createElement(DataRow, { label, hiddenCount: zero.length, open: showAll, setOpen: setShowAll },
    list.length === 0
      ? React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#A89880' } }, 'None recorded yet.')
      : list.map(it => React.createElement(StatChip, { key: it.name, label: it.name, count: it.count, dim: it.count === 0 }))
  );
};

// ---- Brands row ----

const BrandsRow = ({ watches }) => {
  const brandCounts = watches.reduce((acc, w) => { acc[w.brand] = (acc[w.brand] || 0) + 1; return acc; }, {});
  const brands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
  return React.createElement(DataRow, { label: 'Brands', isLast: true },
    brands.map(([name, n]) =>
      React.createElement('span', {
        key: name,
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
          padding: '4px 10px', borderRadius: 20,
          background: 'rgba(201,168,76,0.10)', color: '#8A6A10',
        }
      },
        name,
        React.createElement('span', { style: { fontSize: 10, opacity: 0.6 } }, `×${n}`)
      )
    )
  );
};

// ---- Graphical: bar chart of value by brand ----

const GraphicalView = ({ watches }) => {
  const byBrand = {};
  watches.forEach(w => { byBrand[w.brand] = (byBrand[w.brand] || 0) + w.estimatedValue; });
  const entries = Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return React.createElement('div', { style: { background: '#FFFCF7', border: '1px solid #EAE5DC', borderRadius: 12, padding: 24 } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 } },
      React.createElement('div', { style: statsLabel }, 'Value by Brand'),
      React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880' } }, `${entries.length} brands · ${fmt(total)} total`)
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      entries.map(([brand, value]) =>
        React.createElement('div', { key: brand },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 5 } },
            React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#1A1410', fontWeight: 500 } }, brand),
            React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#A89880' } }, `${fmt(value)} · ${Math.round(value / total * 100)}%`)
          ),
          React.createElement('div', { style: { height: 6, borderRadius: 3, background: '#F0EBE3', overflow: 'hidden' } },
            React.createElement('div', { style: { width: `${value / max * 100}%`, height: '100%', background: 'linear-gradient(90deg, #C9A84C 0%, #B89535 100%)', borderRadius: 3, transition: 'width 0.4s ease' } })
          )
        )
      )
    )
  );
};

// ---- Main ----

const CollectionStats = ({ watches }) => {
  const [mode, setMode] = React.useState('overview');

  return React.createElement('section', {
    id: 'stats',
    style: {
      padding: '40px 56px 56px',
      borderTop: '1px solid #EAE5DC',
      background: '#FAF8F4',
      scrollMarginTop: 80,
    }
  },
    React.createElement('div', { style: { maxWidth: 1280, margin: '0 auto' } },
      React.createElement('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          flexWrap: 'wrap', gap: 16, marginBottom: 20,
        }
      },
        React.createElement('div', null,
          React.createElement('h2', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 32, fontWeight: 400, lineHeight: 1.1, color: '#1A1410', margin: 0 } }, 'Collection Stats'),
          React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: '#A89880', margin: '6px 0 0' } }, 'A factual breakdown of what you own.')
        ),
        React.createElement(StatsModeToggle, { mode, setMode })
      ),

      mode === 'overview'
        ? React.createElement(React.Fragment, null,
            React.createElement(PortfolioValueRow, { watches }),
            React.createElement('div', {
              style: {
                background: '#FFFCF7', border: '1px solid #EAE5DC', borderRadius: 12,
                padding: '0 24px',
              }
            },
              React.createElement(DialColorsInline, { watches }),
              React.createElement(ChipRow, {
                label: 'Watch Types',
                items: ALL_WATCH_TYPES.map(name => ({ name })),
                getCount: it => watches.filter(w => w.watchType === it.name).length,
              }),
              React.createElement(ChipRow, {
                label: 'Complications',
                items: ALL_COMPLICATIONS.map(name => ({ name })),
                getCount: it => watches.filter(w => w.complications.includes(it.name)).length,
              }),
              React.createElement(BrandsRow, { watches })
            )
          )
        : React.createElement(GraphicalView, { watches })
    )
  );
};

Object.assign(window, { CollectionStats });
