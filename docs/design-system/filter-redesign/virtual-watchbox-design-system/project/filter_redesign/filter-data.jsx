// Shared filter data + utility components used by all 3 variations.

const MATERIAL_OPTIONS = [
  { name: 'Stainless Steel', count: 1 },
  { name: 'Yellow Gold', count: 0 },
  { name: 'Rose Gold', count: 0 },
  { name: 'White Gold', count: 0 },
  { name: 'Titanium', count: 0 },
  { name: 'Ceramic', count: 0 },
  { name: 'Bronze', count: 0 },
];
const COLOR_OPTIONS = [
  { name: 'Black', count: 0 },
  { name: 'White', count: 0 },
  { name: 'Blue', count: 1 },
  { name: 'Green', count: 0 },
  { name: 'Grey', count: 0 },
  { name: 'Silver', count: 0 },
  { name: 'Champagne', count: 0 },
  { name: 'Brown', count: 0 },
  { name: 'Red', count: 0 },
  { name: 'Salmon', count: 0 },
];
const SIZE_OPTIONS = [
  { name: '≤38mm', count: 0 },
  { name: '39–41mm', count: 1 },
  { name: '≥42mm', count: 0 },
];

const FACETS = [
  { id: 'material', label: 'Case Material', options: MATERIAL_OPTIONS },
  { id: 'color',    label: 'Dial Color',    options: COLOR_OPTIONS },
  { id: 'size',     label: 'Case Size',     options: SIZE_OPTIONS },
];

// Brand tokens (mirrors colors_and_type.css)
const T = {
  bg: '#FAF8F4',
  slot: '#FFFCF7',
  ink: '#1A1410',
  muted: '#A89880',
  gold: '#C9A84C',
  border: '#EAE5DC',
  borderMid: '#E8E2D8',
  borderLight: '#D4CBBF',
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
};

// Tiny chip — used inside sheet/popover bodies. Active = ink fill.
function FacetChip({ label, count, active, disabled, onClick, size = 'md' }) {
  const padY = size === 'sm' ? 4 : 6;
  const padX = size === 'sm' ? 10 : 12;
  const fs = size === 'sm' ? 10.5 : 11.5;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: `${padY}px ${padX}px`, borderRadius: 999,
        fontFamily: T.sans, fontSize: fs, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        border: active ? `1px solid ${T.ink}` : `1px solid ${T.border}`,
        background: active ? T.ink : 'transparent',
        color: active ? T.bg : (disabled ? T.muted : T.ink),
        opacity: disabled ? 0.42 : 1,
        transition: 'all .15s',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      <span>{label}</span>
      {count != null && (
        <span style={{
          fontSize: fs - 2.5, padding: '1px 6px', borderRadius: 999, fontWeight: 600,
          background: active ? 'rgba(255,255,255,0.18)' : '#F0EBE3',
          color: active ? T.bg : T.muted,
          minWidth: 16, textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  );
}

// Eyebrow label used above chip groups
function Eyebrow({ children, style }) {
  return (
    <div style={{
      fontFamily: T.sans, fontSize: 9.5, fontWeight: 600,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: T.muted, ...style,
    }}>{children}</div>
  );
}

// Generic filter state hook — returns state + helpers
// hasPhotos is a boolean facet, default ON (most users want photos).
// Counted as "active" only when set to false (i.e. user explicitly turned it off).
function useFilterState() {
  const [sel, setSel] = React.useState({ material: null, color: null, size: null, hasPhotos: true });
  const toggle = (facet, value) => setSel(s => {
    if (facet === 'hasPhotos') return { ...s, hasPhotos: !s.hasPhotos };
    return { ...s, [facet]: s[facet] === value ? null : value };
  });
  const clearAll = () => setSel({ material: null, color: null, size: null, hasPhotos: true });
  const clearOne = (facet) => setSel(s => ({ ...s, [facet]: facet === 'hasPhotos' ? true : null }));
  const activeCount =
    (sel.material ? 1 : 0) + (sel.color ? 1 : 0) + (sel.size ? 1 : 0) + (sel.hasPhotos === false ? 1 : 0);
  return { sel, toggle, clearAll, clearOne, activeCount };
}

// Mock results count given selections
// Pretend term "omega" matches 18 watches total — 11 with photos, 7 without.
function mockResultCount(sel) {
  let total = sel.hasPhotos ? 11 : 18;
  if (sel.material && sel.material !== 'Stainless Steel') total = Math.max(0, Math.floor(total * 0.2));
  if (sel.color    && sel.color    !== 'Blue')            total = Math.max(0, Math.floor(total * 0.3));
  if (sel.size     && sel.size     !== '39–41mm')         total = Math.max(0, Math.floor(total * 0.4));
  return total;
}

Object.assign(window, {
  MATERIAL_OPTIONS, COLOR_OPTIONS, SIZE_OPTIONS, FACETS, T,
  FacetChip, Eyebrow, useFilterState, mockResultCount,
});
