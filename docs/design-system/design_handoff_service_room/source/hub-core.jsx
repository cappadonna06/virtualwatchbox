// hub-core.jsx — derived service logic + shared UI primitives + design tokens

// ─── Design tokens (mirror colors_and_type.css) ──────────────────────────
const C = {
  bg: '#FAF8F4', slot: '#FFFCF7', card: '#FFFFFF', ink: '#1A1410',
  muted: '#A89880', gold: '#C9A84C', dark: '#2A2520',
  border: '#EAE5DC', borderMid: '#E8E2D8', borderLight: '#D4CBBF',
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
};

// Status palette — drawn from the system's semantic tokens
const STATUS = {
  overdue: { key: 'overdue', label: 'Overdue',  bg: '#FAE8E8', fg: '#8A2020', dot: '#B23A3A', track: '#C25151' },
  due:     { key: 'due',     label: 'Due soon', bg: '#FFF3E0', fg: '#8A5010', dot: '#C98A2A', track: '#D69A3A' },
  ok:      { key: 'ok',      label: 'On track', bg: '#E8F4E8', fg: '#2D6A2D', dot: '#5A9A5A', track: '#7BAE7B' },
};

const WARRANTY = {
  soon:    { bg: '#FFF8E6', fg: '#8A6A10' },
  active:  { bg: '#E8F0FA', fg: '#1A4A8A' },
  expired: { bg: '#F2EEE7', fg: '#A89880' },
};

// ─── Derived service logic ───────────────────────────────────────────────
function lastFullService(w) {
  const resets = (w.records || []).filter(r => serviceType(r.type).resets);
  if (!resets.length) return null;
  return resets.reduce((a, b) => (parseDate(a.date) > parseDate(b.date) ? a : b));
}

function lastAnyService(w) {
  if (!(w.records || []).length) return null;
  return w.records.reduce((a, b) => (parseDate(a.date) > parseDate(b.date) ? a : b));
}

function nextDueDate(w) {
  const lf = lastFullService(w);
  const base = lf ? lf.date : w.acquiredDate;
  return addYears(base, w.intervalYears);
}

function serviceStatus(w) {
  const due = nextDueDate(w);
  const m = monthsBetween(TODAY, due); // + = future
  if (m < 0) return { ...STATUS.overdue, due, months: m };
  if (m <= 6) return { ...STATUS.due, due, months: m };
  return { ...STATUS.ok, due, months: m };
}

function lifetimeCost(w) {
  return (w.records || []).reduce((s, r) => s + (r.cost || 0), 0);
}

function warrantyStatus(w) {
  if (!w.warrantyExpiry) return null;
  const m = monthsBetween(TODAY, w.warrantyExpiry);
  if (m < 0) return { ...WARRANTY.expired, key: 'expired', label: 'Warranty expired', date: w.warrantyExpiry, months: m };
  if (m <= 4) return { ...WARRANTY.soon, key: 'soon', label: 'Warranty ending', date: w.warrantyExpiry, months: m };
  return { ...WARRANTY.active, key: 'active', label: 'Under warranty', date: w.warrantyExpiry, months: m };
}

// Order: overdue → due → ok, then soonest due first
function byAttention(a, b) {
  const order = { overdue: 0, due: 1, ok: 2 };
  const sa = serviceStatus(a), sb = serviceStatus(b);
  if (order[sa.key] !== order[sb.key]) return order[sa.key] - order[sb.key];
  return parseDate(sa.due) - parseDate(sb.due);
}

// ─── Icons (inline, 1.5px stroke, no fill) ───────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor', strokeWidth = 1.5, style }) => {
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    wrench: <path {...p} d="M14.5 5.8a3.3 3.3 0 0 1-4.2 4.2l-4.9 4.9a1.4 1.4 0 0 1-2-2l4.9-4.9a3.3 3.3 0 0 1 4.2-4.2L10.3 6 11 8.3l2.3.7 1.2-3.2Z" />,
    doc: <><path {...p} d="M5 2.5h5l3 3v10a.5.5 0 0 1-.5.5h-7.5a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z" /><path {...p} d="M10 2.5v3h3" /></>,
    box: <><path {...p} d="M3 6 8 3.5 13 6v5L8 13.5 3 11V6Z" /><path {...p} d="M3 6l5 2.5L13 6M8 8.5v5" /></>,
    shield: <path {...p} d="M8 2.5l4.5 1.7v3.6c0 3-1.9 5.2-4.5 6.2-2.6-1-4.5-3.2-4.5-6.2V4.2L8 2.5Z" />,
    calendar: <><rect {...p} x="3" y="4" width="10" height="9.5" rx="1" /><path {...p} d="M3 6.8h10M5.5 2.6v2.4M10.5 2.6v2.4" /></>,
    clock: <><circle {...p} cx="8" cy="8" r="5.5" /><path {...p} d="M8 5v3l2 1.4" /></>,
    plus: <path {...p} d="M8 3.5v9M3.5 8h9" />,
    close: <path {...p} d="M4 4l8 8M12 4l-8 8" />,
    chevron: <path {...p} d="M6 4l4 4-4 4" />,
    chevronDown: <path {...p} d="M4 6l4 4 4-4" />,
    download: <><path {...p} d="M8 3v7M5 7.5 8 10.5l3-3" /><path {...p} d="M3.5 12.5h9" /></>,
    check: <path {...p} d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
    dot: <circle cx="8" cy="8" r="3" fill={color} stroke="none" />,
    drop: <path {...p} d="M8 2.5c2.2 2.6 3.8 4.8 3.8 7a3.8 3.8 0 0 1-7.6 0c0-2.2 1.6-4.4 3.8-7Z" />,
    spark: <path {...p} d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.4 4.4l1.6 1.6M10 10l1.6 1.6M11.6 4.4 10 6M6 10l-1.6 1.6" />,
    receipt: <><path {...p} d="M4 2.5h8v11l-1.3-.9-1.3.9-1.4-.9-1.3.9-1.4-.9L4 13.5v-11Z" /><path {...p} d="M6 5.5h4M6 8h4" /></>,
    list: <path {...p} d="M3 4.5h10M3 8h10M3 11.5h10" />,
    grid: <><rect {...p} x="3" y="3" width="4" height="4" rx="0.6" /><rect {...p} x="9" y="3" width="4" height="4" rx="0.6" /><rect {...p} x="3" y="9" width="4" height="4" rx="0.6" /><rect {...p} x="9" y="9" width="4" height="4" rx="0.6" /></>,
    rows: <><rect {...p} x="3" y="3.5" width="10" height="3" rx="0.6" /><rect {...p} x="3" y="9.5" width="10" height="3" rx="0.6" /></>,
    arrowUpRight: <path {...p} d="M5 11 11 5M6 5h5v5" />,
    search: <><circle {...p} cx="7.3" cy="7.3" r="4" /><path {...p} d="M10.5 10.5 13.5 13.5" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={style} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
};

// ─── Meta label (ALL CAPS, tracked) ──────────────────────────────────────
const Meta = ({ children, style, color = C.muted }) => (
  <span style={{
    fontFamily: C.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
    textTransform: 'uppercase', color, ...style,
  }}>{children}</span>
);

// ─── Status chip ─────────────────────────────────────────────────────────
const StatusChip = ({ status, size = 'md', showDate = false }) => {
  const small = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: C.sans, fontSize: small ? 10 : 11, fontWeight: 600,
      letterSpacing: '0.04em', padding: small ? '3px 9px' : '4px 11px',
      borderRadius: 20, background: status.bg, color: status.fg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 6, background: status.dot, flexShrink: 0 }} />
      {status.label}{showDate ? ` · ${fmtMonthYear(status.due)}` : ''}
    </span>
  );
};

// ─── Warranty chip ───────────────────────────────────────────────────────
const WarrantyChip = ({ w, size = 'md' }) => {
  const ws = warrantyStatus(w);
  if (!ws) return null;
  const small = size === 'sm';
  const txt = ws.key === 'expired' ? 'Warranty expired'
    : ws.key === 'soon' ? `Warranty ends ${relTime(ws.date)}`
    : `Warranty to ${fmtMonthYear(ws.date)}`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: C.sans, fontSize: small ? 10 : 11, fontWeight: 500,
      letterSpacing: '0.02em', padding: small ? '3px 9px' : '4px 10px',
      borderRadius: 20, background: ws.bg, color: ws.fg, whiteSpace: 'nowrap',
    }}>
      <Icon name="shield" size={11} color={ws.fg} />{txt}
    </span>
  );
};

// ─── Service-type pill (the glyph + label tag) ───────────────────────────
const TypeTag = ({ type, active = false, onClick, interactive = false }) => {
  const t = serviceType(type);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive && !onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: C.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.01em',
        padding: '7px 13px', borderRadius: 20, cursor: (interactive || onClick) ? 'pointer' : 'default',
        background: active ? C.ink : 'transparent',
        color: active ? C.slot : C.ink,
        border: `1px solid ${active ? C.ink : C.borderLight}`,
        transition: 'all 0.15s ease', whiteSpace: 'nowrap',
      }}>
      <span style={{ fontSize: 13, lineHeight: 1, opacity: active ? 0.9 : 0.5 }}>{t.glyph}</span>
      {t.label}
    </button>
  );
};

// ─── Document chip ───────────────────────────────────────────────────────
const DocChip = ({ active, label, count, onClick }) => (
  <button type="button" onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: C.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
    padding: '5px 11px', borderRadius: 20, cursor: 'pointer',
    background: active ? C.ink : 'transparent', color: active ? C.slot : C.muted,
    border: `1px solid ${active ? C.ink : C.border}`, transition: 'all 0.15s ease',
  }}>
    {label}{count != null && <span style={{ opacity: 0.6 }}>{count}</span>}
  </button>
);

// ─── Watch thumbnail on cream tile ───────────────────────────────────────
const WatchThumb = ({ w, size = 64, radius = 8, pad = 0.12 }) => (
  <div style={{
    width: size, height: size, borderRadius: radius, background: C.bg,
    border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
  }}>
    <img src={w.image} alt={`${w.brand} ${w.model}`} style={{
      width: '100%', height: '100%', objectFit: 'contain', padding: size * pad,
      filter: 'drop-shadow(0 3px 6px rgba(26,20,16,0.14))',
    }} />
  </div>
);

Object.assign(window, {
  C, STATUS, WARRANTY,
  lastFullService, lastAnyService, nextDueDate, serviceStatus, lifetimeCost,
  warrantyStatus, byAttention,
  Icon, Meta, StatusChip, WarrantyChip, TypeTag, DocChip, WatchThumb,
});
