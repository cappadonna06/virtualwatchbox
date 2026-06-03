// WatchDrawer.jsx — the per-piece dossier: ownership · service summary · papers · timeline

// ── Ownership strip ──────────────────────────────────────────────────────
const OwnershipStrip = ({ w }) => {
  const chips = [
    { ok: w.hasBox, label: w.hasBox ? 'Box' : 'No box', icon: 'box' },
    { ok: w.hasPapers, label: w.hasPapers ? 'Papers' : 'No papers', icon: 'doc' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {chips.map((c, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.sans, fontSize: 11,
          fontWeight: 500, padding: '5px 11px', borderRadius: 20,
          background: c.ok ? '#EEF5EC' : '#F7F2EA', color: c.ok ? STATUS.ok.fg : C.muted,
          border: `1px solid ${c.ok ? '#DCEBD8' : C.border}`,
        }}>
          <Icon name={c.ok ? 'check' : c.icon} size={12} color={c.ok ? STATUS.ok.fg : C.muted} />{c.label}
        </span>
      ))}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.sans, fontSize: 11,
        fontWeight: 500, padding: '5px 11px', borderRadius: 20, background: '#F7F2EA', color: C.ink,
        border: `1px solid ${C.border}`,
      }}>
        <Icon name="receipt" size={12} color={C.muted} />{ACQ_LABEL[w.acquiredFrom]}
      </span>
      <WarrantyChip w={w} size="sm" />
    </div>
  );
};

// ── Service summary with editable interval ────────────────────────────────
const ServiceSummary = ({ w, onLog, onInterval }) => {
  const st = serviceStatus(w);
  const lf = lastFullService(w);
  const cost = lifetimeCost(w);
  const intervals = [3, 5, 7, 10];
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <StatusChip status={st} showDate />
        <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>
          {st.key === 'overdue' ? `${Math.round(Math.abs(st.months))} mo overdue` : `due ${relTime(st.due)}`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', marginBottom: 16 }}>
        <SumStat label="Last full service" value={lf ? fmtDate(lf.date) : 'Never serviced'} />
        <SumStat label="Lifetime upkeep" value={fmt(cost)} accent={C.gold} />
        <div>
          <Meta style={{ display: 'block', marginBottom: 5, fontSize: 9 }}>Service every</Meta>
          <div style={{ display: 'inline-flex', border: `1px solid ${C.border}`, borderRadius: 7, overflow: 'hidden', background: C.card }}>
            {intervals.map(n => (
              <button key={n} type="button" onClick={() => onInterval(w, n)} style={{
                fontFamily: C.sans, fontSize: 11.5, fontWeight: 600, padding: '5px 9px', border: 'none', cursor: 'pointer',
                background: w.intervalYears === n ? C.ink : 'transparent', color: w.intervalYears === n ? C.slot : C.muted,
              }}>{n}y</button>
            ))}
          </div>
        </div>
        <SumStat label="Next full service" value={fmtDate(st.due, { year: 'numeric', month: 'short' })} accent={st.fg} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => onLog(w)} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', padding: '10px 16px' }}>
          <Icon name="plus" size={13} color={C.slot} />Log a service
        </button>
        <a href={bookingUrl(w)} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, justifyContent: 'center', padding: '9px 14px' }}>
          Find a center ↗
        </a>
      </div>
    </div>
  );
};

const SumStat = ({ label, value, accent }) => (
  <div>
    <Meta style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>{label}</Meta>
    <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: accent || C.ink }}>{value}</span>
  </div>
);

// ── Papers & Provenance ───────────────────────────────────────────────────
const PapersSection = ({ w }) => {
  const docs = w.documents || [];
  const present = [...new Set(docs.map(d => d.type))];
  const [filter, setFilter] = React.useState('all');
  const shown = filter === 'all' ? docs : docs.filter(d => d.type === filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h3 style={drawerH3}>Papers &amp; Provenance</h3>
        <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>{docs.length} on file</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        <DocChip active={filter === 'all'} label="All" count={docs.length} onClick={() => setFilter('all')} />
        {present.map(t => (
          <DocChip key={t} active={filter === t} label={docType(t).label}
            count={docs.filter(d => d.type === t).length} onClick={() => setFilter(t)} />
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {shown.map(d => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 13, padding: '10px 12px',
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 9,
          }}>
            <DocTile type={d.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: C.sans, fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                <span style={{ fontFamily: C.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.gold }}>{docType(d.type).label}</span>
                <span style={{ width: 3, height: 3, borderRadius: 3, background: C.borderLight }} />
                <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>{fmtDate(d.date)}</span>
              </div>
            </div>
            <button type="button" title="View" style={{ ...iconBtn, width: 26, height: 26 }}>
              <Icon name="arrowUpRight" size={13} color={C.muted} />
            </button>
          </div>
        ))}
        {!w.hasPapers && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9,
            background: STATUS.due.bg, color: STATUS.due.fg, fontFamily: C.sans, fontSize: 11.5 }}>
            <Icon name="shield" size={13} color={STATUS.due.fg} />Original papers missing — affects resale value.
          </div>
        )}
      </div>
    </div>
  );
};

// striped paper placeholder, tinted by doc family
const DocTile = ({ type }) => {
  const tint = { receipt: '#8A6A10', warranty_card: '#1A4A8A', service_record: '#2D6A2D', box_papers: '#8A5010', appraisal: '#6A3A8A', manual: '#A89880' }[type] || C.muted;
  return (
    <div style={{
      width: 38, height: 46, borderRadius: 5, flexShrink: 0, position: 'relative', overflow: 'hidden',
      background: `repeating-linear-gradient(135deg, ${tint}14, ${tint}14 5px, ${tint}07 5px, ${tint}07 10px)`,
      border: `1px solid ${tint}33`,
    }}>
      <div style={{ position: 'absolute', top: 6, left: 6, right: 6, height: 2, background: `${tint}55`, borderRadius: 2 }} />
      <div style={{ position: 'absolute', top: 11, left: 6, width: 16, height: 2, background: `${tint}40`, borderRadius: 2 }} />
      <Icon name="doc" size={13} color={tint} style={{ position: 'absolute', bottom: 5, right: 5, opacity: 0.8 }} />
    </div>
  );
};

// ── Service timeline (most-recent-first) ──────────────────────────────────
const ServiceTimeline = ({ w }) => {
  const records = [...(w.records || [])].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h3 style={drawerH3}>Service history</h3>
        <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>{records.length} record{records.length === 1 ? '' : 's'}</span>
      </div>

      {records.length === 0 && (
        <div style={{ ...emptyNote, padding: '14px 0', textAlign: 'left', fontSize: 15 }}>No service logged yet.</div>
      )}

      <div style={{ position: 'relative' }}>
        {records.map((r, i) => {
          const t = serviceType(r.type);
          const last = i === records.length - 1;
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 14, paddingBottom: last ? 0 : 18 }}>
              {/* rail */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 13, height: 13, borderRadius: 13, border: `2px solid ${t.resets ? C.gold : C.borderLight}`,
                  background: t.resets ? C.gold : C.card, marginTop: 3, flexShrink: 0,
                  boxShadow: t.resets ? '0 0 0 3px rgba(201,168,76,0.13)' : 'none' }} />
                {!last && <span style={{ width: 1.5, flex: 1, background: C.border, marginTop: 4 }} />}
              </div>
              {/* entry */}
              <div style={{ paddingBottom: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 5 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.ink }}>
                    <span style={{ color: t.resets ? C.gold : C.muted, fontSize: 13 }}>{t.glyph}</span>{t.label}
                  </span>
                  <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDate(r.date)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: r.notes ? 6 : 0 }}>
                  <span style={{ fontFamily: C.sans, fontSize: 11.5, color: C.muted }}>{r.provider}</span>
                  <span style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 700, color: r.cost ? C.ink : STATUS.ok.fg, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {r.cost ? fmt(r.cost) : 'No charge'}
                  </span>
                </div>
                {r.notes && <p style={{ fontFamily: C.sans, fontSize: 11.5, color: C.ink, opacity: 0.75, lineHeight: 1.5, margin: 0 }}>{r.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const drawerH3 = { fontFamily: C.serif, fontSize: 21, fontWeight: 500, color: C.ink, margin: 0, lineHeight: 1 };

// ── The drawer shell ──────────────────────────────────────────────────────
const WatchDrawer = ({ watch, onClose, onLog, onInterval, onExport }) => {
  const [displayed, setDisplayed] = React.useState(watch);
  React.useEffect(() => { if (watch) setDisplayed(watch); }, [watch]);
  const open = !!watch;
  const w = displayed;

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const st = w ? serviceStatus(w) : null;

  return (
    <>
      {/* backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.32)', backdropFilter: 'blur(2px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.3s ease', zIndex: 80,
      }} />
      {/* panel */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width: 'min(456px, 100vw)',
        background: C.slot, borderLeft: `1px solid ${C.borderMid}`, boxShadow: '-12px 0 40px rgba(26,20,16,0.12)',
        transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        zIndex: 90, display: 'flex', flexDirection: 'column',
      }}>
        {w && <>
          {/* header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <Meta>Service Dossier</Meta>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => onExport(w)} title="Export dossier" style={{ ...btnSecondary, padding: '6px 12px' }}>
                <Icon name="download" size={13} color={C.ink} />Export
              </button>
              <button type="button" onClick={onClose} title="Close" style={{ ...iconBtn, width: 30, height: 30 }}>
                <Icon name="close" size={14} color={C.muted} />
              </button>
            </div>
          </div>

          {/* scroll body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* hero */}
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <div style={{ width: 116, height: 116, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, flexShrink: 0 }}>
                <img src={w.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(26,20,16,0.2))' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Meta style={{ color: C.gold }}>{w.brand}</Meta>
                <h2 style={{ fontFamily: C.serif, fontSize: 30, fontWeight: 400, color: C.ink, lineHeight: 1.02, margin: '2px 0 5px' }}>{w.model}</h2>
                <div style={{ fontFamily: C.sans, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
                  Ref. {w.ref}<br />{w.caseSizeMm}mm · {w.caseMaterial}<br />{w.movement}
                </div>
              </div>
            </div>

            <OwnershipStrip w={w} />
            <ServiceSummary w={w} onLog={onLog} onInterval={onInterval} />
            <div style={{ height: 1, background: C.border }} />
            <PapersSection w={w} />
            <div style={{ height: 1, background: C.border }} />
            <ServiceTimeline w={w} />
          </div>
        </>}
      </aside>
    </>
  );
};

Object.assign(window, { WatchDrawer, OwnershipStrip, ServiceSummary, PapersSection, ServiceTimeline });
