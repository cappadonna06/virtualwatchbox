// HubLedger.jsx — "File Cabinet" layout: a sortable ledger of the whole box

const LEDGER_COLS = [
  { id: 'watch',    label: 'Piece',          w: '2.9fr', align: 'left' },
  { id: 'last',     label: 'Last serviced',  w: '0.95fr', align: 'left' },
  { id: 'next',     label: 'Next due',       w: '1.2fr', align: 'left' },
  { id: 'interval', label: 'Interval',       w: '0.65fr', align: 'left' },
  { id: 'cost',     label: 'Lifetime upkeep', w: '1fr',  align: 'right' },
  { id: 'docs',     label: 'Papers',         w: '0.8fr', align: 'left' },
  { id: 'warranty', label: 'Warranty',       w: '1.1fr', align: 'left' },
];

const gridTemplate = LEDGER_COLS.map(c => c.w).join(' ') + ' 28px';

const sortValue = (w, key) => {
  switch (key) {
    case 'watch': return (w.brand + w.model).toLowerCase();
    case 'last': { const l = lastAnyService(w); return l ? parseDate(l.date).getTime() : 0; }
    case 'next': return parseDate(serviceStatus(w).due).getTime();
    case 'interval': return w.intervalYears;
    case 'cost': return lifetimeCost(w);
    case 'docs': return (w.documents || []).length;
    case 'warranty': { const ws = warrantyStatus(w); return ws ? parseDate(ws.date).getTime() : -1; }
    default: return 0;
  }
};

const HubLedger = ({ collection, onPick, onLog, activeId }) => {
  const [sort, setSort] = React.useState({ key: 'next', dir: 1 });
  const rows = [...collection].sort((a, b) => {
    const va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
  });
  const totalCost = collection.reduce((s, w) => s + lifetimeCost(w), 0);
  const totalDocs = collection.reduce((s, w) => s + (w.documents || []).length, 0);

  const toggleSort = key => setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: 1 });

  return (
    <div>
      <SectionHead eyebrow="The file cabinet" title="Every piece, on the record"
        hint="Sort any column · click a row to open the dossier" />

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* header */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridTemplate, gap: 14, alignItems: 'center',
          padding: '13px 20px', borderBottom: `1px solid ${C.border}`, background: C.bg,
        }}>
          {LEDGER_COLS.map(c => (
            <button key={c.id} type="button" onClick={() => toggleSort(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
              fontFamily: C.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: sort.key === c.id ? C.ink : C.muted,
            }}>
              {c.label}
              <span style={{ opacity: sort.key === c.id ? 1 : 0.25, fontSize: 8, transform: sort.key === c.id && sort.dir < 0 ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
          ))}
          <span />
        </div>

        {/* rows */}
        {rows.map((w, i) => {
          const st = serviceStatus(w);
          const lf = lastFullService(w);
          const la = lastAnyService(w);
          const ws = warrantyStatus(w);
          const active = activeId === w.id;
          return (
            <div key={w.id} onClick={() => onPick(w)} style={{
              display: 'grid', gridTemplateColumns: gridTemplate, gap: 14, alignItems: 'center',
              padding: '14px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
              cursor: 'pointer', background: active ? '#FBF7EE' : C.card, transition: 'background 0.12s ease',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#FCFAF6'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = C.card; }}>
              {/* piece */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <span style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={w.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 9px rgba(26,20,16,0.18))' }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.brand}</div>
                  <div style={{ fontFamily: C.serif, fontSize: 15, color: C.muted, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.model}</div>
                </div>
              </div>
              {/* last */}
              <div style={{ fontFamily: C.sans, fontSize: 12.5, color: la ? C.ink : C.muted }}>
                {la ? <>{fmtMonthYear(la.date)}<div style={{ fontSize: 10.5, color: C.muted }}>{serviceType(la.type).label}</div></> : '—'}
              </div>
              {/* next */}
              <div><StatusChip status={st} size="sm" showDate /></div>
              {/* interval */}
              <div style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink }}>{w.intervalYears} yr</div>
              {/* cost */}
              <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.ink, textAlign: 'right' }}>{fmt(lifetimeCost(w))}</div>
              {/* docs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
                <Icon name="doc" size={14} color={C.muted} />
                <span style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink }}>{(w.documents || []).length}</span>
                {!w.hasPapers && <span title="Missing original papers" style={{ fontFamily: C.sans, fontSize: 9.5, color: STATUS.due.fg, background: STATUS.due.bg, padding: '1px 6px', borderRadius: 10 }}>no papers</span>}
              </div>
              {/* warranty */}
              <div>
                {ws ? <span style={{ fontFamily: C.sans, fontSize: 11.5, color: ws.fg, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 6, background: ws.fg, opacity: 0.7 }} />
                  {ws.key === 'expired' ? 'Expired' : fmtMonthYear(ws.date)}
                </span> : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
              </div>
              {/* action */}
              <button type="button" onClick={e => { e.stopPropagation(); onLog(w); }} title="Log a service" style={{ ...iconBtn, width: 26, height: 26 }}>
                <Icon name="plus" size={13} color={C.muted} />
              </button>
            </div>
          );
        })}

        {/* totals */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridTemplate, gap: 14, alignItems: 'center',
          padding: '14px 20px', borderTop: `1.5px solid ${C.borderLight}`, background: C.bg,
        }}>
          <div style={{ fontFamily: C.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink }}>
            {collection.length} pieces
          </div>
          <div /><div /><div />
          <div style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 700, color: C.gold, textAlign: 'right' }}>{fmt(totalCost)}</div>
          <div style={{ fontFamily: C.sans, fontSize: 12.5, color: C.muted }}>{totalDocs} docs</div>
          <div /><div />
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HubLedger });
