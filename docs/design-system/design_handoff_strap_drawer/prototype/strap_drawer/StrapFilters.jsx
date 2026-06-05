// StrapFilters.jsx — material / width / style filter chips + sort control.

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently added' },
  { id: 'width', label: 'Lug width' },
  { id: 'material', label: 'Material' },
  { id: 'color', label: 'Color' },
  { id: 'fits', label: 'Most compatible' },
];

const Chip = ({ children, active, onClick, dim }) =>
  React.createElement('button', { onClick, style: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontFamily: T.sans, fontSize: 11.5, fontWeight: active ? 600 : 500, letterSpacing: '0.02em',
    padding: '7px 13px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
    background: active ? T.ink : T.slot,
    color: active ? T.slot : (dim ? T.muted : T.inkSoft),
    border: `1px solid ${active ? T.ink : T.borderMid}`,
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  } }, children);

const FilterGroup = ({ label, children }) =>
  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
    React.createElement('span', { style: {
      fontFamily: T.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: T.muted, flexShrink: 0,
    } }, label),
    React.createElement('div', { className: 'sd-chiprow', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, children),
  );

// Sort dropdown
const SortControl = ({ value, setValue }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const current = SORT_OPTIONS.find(o => o.id === value) || SORT_OPTIONS[0];
  return React.createElement('div', { ref, style: { position: 'relative', flexShrink: 0 } },
    React.createElement('button', { onClick: () => setOpen(o => !o), style: {
      display: 'inline-flex', alignItems: 'center', gap: 10,
      background: T.slot, border: `1px solid ${T.borderMid}`, borderRadius: 6,
      padding: '8px 13px', cursor: 'pointer', fontFamily: T.sans,
    } },
      React.createElement('span', { style: { fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted } }, 'Sort'),
      React.createElement('span', { style: { fontSize: 12, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap' } }, current.label),
      React.createElement('span', { style: { color: T.muted, display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' } },
        React.createElement(Icon, { name: 'chevDown', size: 13 })),
    ),
    open && React.createElement('div', { style: {
      position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 40,
      background: T.slot, border: `1px solid ${T.borderMid}`, borderRadius: 8,
      boxShadow: '0 8px 24px rgba(26,20,16,0.12)', padding: 4, minWidth: 184,
    } },
      SORT_OPTIONS.map(o => React.createElement('button', {
        key: o.id, onClick: () => { setValue(o.id); setOpen(false); }, style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '9px 11px', borderRadius: 4, border: 'none',
          background: o.id === value ? T.bg : 'transparent', color: T.ink,
          fontFamily: T.sans, fontSize: 12, fontWeight: o.id === value ? 500 : 400,
          cursor: 'pointer', textAlign: 'left',
        }
      },
        o.label,
        o.id === value && React.createElement('span', { style: { color: T.gold, display: 'inline-flex' } },
          React.createElement(Icon, { name: 'check', size: 13 })),
      )),
    ),
  );
};

const FilterBar = ({ filters, setFilters, watches, sort, setSort, total, shown }) => {
  const toggle = (key, val) => setFilters(f => {
    const set = new Set(f[key]);
    set.has(val) ? set.delete(val) : set.add(val);
    return { ...f, [key]: [...set] };
  });
  const setStyle = (val) => setFilters(f => ({ ...f, style: f.style === val ? null : val }));

  // materials present in the data
  const presentMaterials = [...new Set(STRAPS.map(s => s.material))];
  const presentWidths = [...new Set(STRAPS.map(s => s.lugWidthMm))].sort((a, b) => a - b);
  const anyActive = filters.material.length || filters.width.length || filters.style;

  return React.createElement('div', { className: 'sd-filterbar', style: {
    display: 'flex', flexDirection: 'column', gap: 13,
    padding: '16px 0 18px', borderBottom: `1px solid ${T.border}`, marginBottom: 24,
  } },
    // Row 1: material + style + sort
    React.createElement('div', { className: 'sd-filterrow', style: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap',
    } },
      React.createElement('div', { className: 'sd-filtergroups', style: { display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' } },
        React.createElement(FilterGroup, { label: 'Material' },
          presentMaterials.map(m => React.createElement(Chip, {
            key: m, active: filters.material.includes(m), onClick: () => toggle('material', m),
          }, MATERIAL_LABEL(m))),
        ),
        React.createElement(FilterGroup, { label: 'Style' },
          STYLES.filter(st => STRAPS.some(s => s.style === st)).map(st => React.createElement(Chip, {
            key: st, active: filters.style === st, onClick: () => setStyle(st),
          }, st.charAt(0).toUpperCase() + st.slice(1))),
        ),
      ),
      React.createElement(SortControl, { value: sort, setValue: setSort }),
    ),
    // Row 2: lug width with counts + result line
    React.createElement('div', { className: 'sd-filterrow', style: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap',
    } },
      React.createElement(FilterGroup, { label: 'Lug width' },
        presentWidths.map(w => {
          const wc = watchesAtWidth(watches, w);
          return React.createElement(Chip, {
            key: w, active: filters.width.includes(w), onClick: () => toggle('width', w), dim: wc === 0,
          },
            `${w} mm`,
            React.createElement('span', { style: {
              fontSize: 9.5, fontWeight: 600, opacity: filters.width.includes(w) ? 0.7 : 0.55,
              color: filters.width.includes(w) ? T.slot : (wc > 0 ? T.gold : T.muted),
            } }, wc > 0 ? `(${wc})` : '(0)'),
          );
        }),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
        anyActive ? React.createElement('button', {
          onClick: () => setFilters({ material: [], width: [], style: null }),
          style: {
            fontFamily: T.sans, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: T.muted, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
          }
        }, 'Clear filters') : null,
        React.createElement('span', { style: {
          fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: T.muted, whiteSpace: 'nowrap',
        } }, shown === total ? `${total} straps` : `${shown} of ${total} straps`),
      ),
    ),
  );
};

// Filtering + sorting
const applyFilters = (straps, filters) => straps.filter(s => {
  if (filters.material.length && !filters.material.includes(s.material)) return false;
  if (filters.width.length && !filters.width.includes(s.lugWidthMm)) return false;
  if (filters.style && s.style !== filters.style) return false;
  return true;
});

const applySort = (straps, sort, watches, overrides) => {
  const arr = [...straps];
  switch (sort) {
    case 'width': return arr.sort((a, b) => a.lugWidthMm - b.lugWidthMm || a.sortOrder - b.sortOrder);
    case 'material': return arr.sort((a, b) => a.material.localeCompare(b.material) || a.sortOrder - b.sortOrder);
    case 'color': return arr.sort((a, b) => a.color.localeCompare(b.color));
    case 'fits': return arr.sort((a, b) =>
      compatibleWatches(b, watches, overrides).length - compatibleWatches(a, watches, overrides).length);
    case 'recent':
    default: return arr.sort((a, b) => b.sortOrder - a.sortOrder);
  }
};

Object.assign(window, { FilterBar, applyFilters, applySort, SortControl });
