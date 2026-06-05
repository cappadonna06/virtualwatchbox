// ui-atoms.jsx — shared primitives for the Strap Drawer
const T = {
  bg: '#FAF8F4', slot: '#FFFCF7', ink: '#1A1410', inkSoft: '#3F362C',
  muted: '#A89880', mutedDark: '#6F6353', gold: '#C9A84C', goldDeep: '#A8862F',
  dark: '#2A2520', border: '#EAE5DC', borderMid: '#E8E2D8', borderLight: '#D4CBBF',
  paper: '#F4EFE6', paperWarm: '#F1ECE2',
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
  fitsBg: '#EDF4E8', fitsText: '#3A6A2D',
  exclBg: '#F3EEE7', exclText: '#A89880',
  unkBg: '#FBF3DC', unkText: '#8A6A10',
};

const Kicker = ({ children, color = T.muted, size = 9, style = {} }) =>
  React.createElement('div', { style: {
    fontFamily: T.sans, fontSize: size, fontWeight: 600,
    letterSpacing: '0.16em', textTransform: 'uppercase', color, ...style,
  } }, children);

// Small spec chip: e.g. "20 mm", "Leather", "Dressy"
const SpecBadge = ({ children, tone = 'plain', style = {} }) => {
  const tones = {
    plain: { bg: '#F6F1E9', col: T.mutedDark, bd: T.borderMid },
    width: { bg: '#FBF6EA', col: T.goldDeep, bd: 'rgba(201,168,76,0.35)' },
    ink:   { bg: T.ink, col: T.slot, bd: T.ink },
  }[tone];
  return React.createElement('span', { style: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontFamily: T.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
    padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
    background: tones.bg, color: tones.col, border: `1px solid ${tones.bd}`, ...style,
  } }, children);
};

// Fit pill — fits / excluded / unknown
const FitPill = ({ state, count, style = {} }) => {
  const map = {
    fits:     { bg: T.fitsBg, col: T.fitsText, label: 'Fits' },
    excluded: { bg: T.exclBg, col: T.exclText, label: 'Excluded' },
    unknown:  { bg: T.unkBg,  col: T.unkText,  label: 'Unknown' },
  };
  const m = map[state] || map.unknown;
  return React.createElement('span', { style: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontFamily: T.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20,
    background: m.bg, color: m.col, ...style,
  } },
    React.createElement('span', { style: {
      width: 5, height: 5, borderRadius: '50%', background: 'currentColor', opacity: 0.85,
    } }),
    count != null ? `${m.label} \u00b7 ${count}` : m.label,
  );
};

// Tiny watch thumbnail (image or initial fallback)
const WatchThumb = ({ watch, size = 40 }) =>
  React.createElement('div', { style: {
    width: size, height: size, borderRadius: 7, flexShrink: 0,
    background: T.bg, border: `1px solid ${T.borderMid}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  } },
    watch.imageUrl
      ? React.createElement('img', { src: watch.imageUrl, alt: watch.model, style: {
          width: '100%', height: '100%', objectFit: 'contain', padding: 3,
          filter: 'drop-shadow(0 2px 4px rgba(26,20,16,0.14))',
        } })
      : React.createElement('span', { style: {
          fontFamily: T.serif, fontSize: size * 0.42, color: T.borderLight,
        } }, watch.brand.charAt(0)),
  );

// Lightweight icon set (1.5px stroke)
const Icon = ({ name, size = 16, color = 'currentColor', sw = 1.5 }) => {
  const p = { width: size, height: size, viewBox: '0 0 20 20', fill: 'none',
    stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    plus: ['M10 4v12', 'M4 10h12'],
    close: ['M5 5l10 10', 'M15 5L5 15'],
    chevDown: ['M5 8l5 5 5-5'],
    chevRight: ['M8 5l5 5-5 5'],
    chevLeft: ['M12 5l-5 5 5 5'],
    arrowLeft: ['M16 10H4', 'M9 5l-5 5 5 5'],
    arrowUpRight: ['M6 14L14 6', 'M7 6h7v7'],
    check: ['M4 10.5l4 4 8-9'],
    trash: ['M3 6h14', 'M8 6V4h4v2', 'M5 6l1 11h8l1-11'],
    edit: ['M13 4l3 3', 'M4 16l1-4 8-8 3 3-8 8-4 1z'],
    sliders: ['M4 7h8', 'M14 7h2', 'M4 13h2', 'M8 13h8', 'M12 5v4', 'M6 11v4'],
    photo: ['M3 5h14v10H3z', 'M3 13l4-4 3 3 3-3 4 4'],
    search: ['M9 15A6 6 0 109 3a6 6 0 000 12z', 'M17 17l-3.5-3.5'],
    grid: ['M4 4h5v5H4z', 'M11 4h5v5h-5z', 'M4 11h5v5H4z', 'M11 11h5v5h-5z'],
  };
  return React.createElement('svg', p, (paths[name] || []).map((d, i) =>
    React.createElement('path', { key: i, d })));
};

const PrimaryBtn = ({ children, onClick, full, style = {} }) =>
  React.createElement('button', { onClick, style: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: T.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '11px 20px', background: T.ink, color: T.slot,
    border: 'none', borderRadius: 4, cursor: 'pointer', width: full ? '100%' : 'auto',
    transition: 'opacity 0.15s', ...style,
  } }, children);

const GhostBtn = ({ children, onClick, full, style = {} }) =>
  React.createElement('button', { onClick, style: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: T.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '10px 18px', background: 'transparent', color: T.ink,
    border: `1px solid ${T.borderLight}`, borderRadius: 4, cursor: 'pointer',
    width: full ? '100%' : 'auto', ...style,
  } }, children);

Object.assign(window, { T, Kicker, SpecBadge, FitPill, WatchThumb, Icon, PrimaryBtn, GhostBtn });
