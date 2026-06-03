// MaintenanceHub.jsx — root: nav · summary · layout switch · affiliates · export · state

// ─── Partner service centers (affiliate band) ────────────────────────────
const PARTNERS = [
  { name: 'Crown & Caliber Service', tag: 'Multi-brand overhauls', detail: 'Free shipping both ways · 18-month service warranty', cta: 'Get a quote' },
  { name: 'The 1916 Company Atelier', tag: 'Authorized & vintage', detail: 'Factory-trained watchmakers · Rolex, Omega, AP', cta: 'Book service' },
  { name: 'WatchCSA — Independent', tag: 'Complications & restoration', detail: 'Specialists in chronographs and perpetual calendars', cta: 'Enquire' },
];

const PartnerBand = () => (
  <section style={{ marginTop: 8 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
      <div>
        <Meta style={{ color: C.gold, display: 'block', marginBottom: 5 }}>Partner service centers</Meta>
        <h2 style={{ fontFamily: C.serif, fontSize: 26, fontWeight: 400, color: C.ink, margin: 0, lineHeight: 1 }}>Where collectors send their pieces</h2>
      </div>
      <span style={{ fontFamily: C.sans, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: 20 }}>Sponsored</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      {PARTNERS.map(p => (
        <a key={p.name} href="#" onClick={e => e.preventDefault()} style={{
          display: 'flex', flexDirection: 'column', gap: 10, padding: 20, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 12, textDecoration: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,20,16,0.07)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}>
          <Meta style={{ color: C.gold }}>{p.tag}</Meta>
          <div style={{ fontFamily: C.serif, fontSize: 20, fontWeight: 500, color: C.ink, lineHeight: 1.1 }}>{p.name}</div>
          <p style={{ fontFamily: C.sans, fontSize: 12, color: C.muted, lineHeight: 1.55, margin: 0, flex: 1 }}>{p.detail}</p>
          <span style={{ fontFamily: C.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: C.ink, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {p.cta} <span style={{ color: C.gold }}>↗</span>
          </span>
        </a>
      ))}
    </div>
  </section>
);

// ─── Summary stat strip ──────────────────────────────────────────────────
const SummaryStrip = ({ collection }) => {
  const attention = collection.filter(w => serviceStatus(w).key !== 'ok');
  const total = collection.reduce((s, w) => s + lifetimeCost(w), 0);
  const soonest = [...collection].sort((a, b) => parseDate(serviceStatus(a).due) - parseDate(serviceStatus(b).due))[0];
  const ss = soonest ? serviceStatus(soonest) : null;

  const stats = [
    { label: 'Pieces under care', value: collection.length, meta: 'in your box' },
    { label: 'Need attention', value: attention.length, meta: attention.length ? 'overdue or due soon' : 'all on track', accent: attention.length ? STATUS.due.fg : STATUS.ok.fg },
    { label: 'Lifetime upkeep', value: fmt(total), meta: 'across all records', accent: C.gold },
    { label: 'Next on the bench', value: ss ? fmtMonthYear(ss.due) : '—', meta: soonest ? `${soonest.brand} ${soonest.model}` : '' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: C.card,
      border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ padding: '18px 22px', borderLeft: i ? `1px solid ${C.border}` : 'none' }}>
          <Meta style={{ display: 'block', marginBottom: 8 }}>{s.label}</Meta>
          <div style={{ fontFamily: C.serif, fontSize: 34, fontWeight: 400, color: s.accent || C.ink, lineHeight: 0.95, marginBottom: 6 }}>{s.value}</div>
          <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>{s.meta}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Layout switcher ─────────────────────────────────────────────────────
const LAYOUTS = [
  { id: 'agenda', label: 'Agenda', icon: 'rows' },
  { id: 'ledger', label: 'Ledger', icon: 'list' },
  { id: 'gallery', label: 'Gallery', icon: 'grid' },
];

const LayoutSwitch = ({ value, onChange }) => (
  <div style={{ display: 'inline-flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
    {LAYOUTS.map(l => (
      <button key={l.id} type="button" onClick={() => onChange(l.id)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: C.sans, fontSize: 12, fontWeight: 600,
        letterSpacing: '0.02em', padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
        background: value === l.id ? C.ink : 'transparent', color: value === l.id ? C.slot : C.muted, transition: 'all 0.15s ease',
      }}>
        <Icon name={l.icon} size={14} color={value === l.id ? C.slot : C.muted} />{l.label}
      </button>
    ))}
  </div>
);

// ─── Toast ───────────────────────────────────────────────────────────────
const Toast = ({ toast }) => (
  <div style={{
    position: 'fixed', bottom: 28, left: '50%', transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
    opacity: toast ? 1 : 0, pointerEvents: 'none', transition: 'all 0.28s cubic-bezier(0.32,0.72,0,1)', zIndex: 120,
    background: C.ink, color: C.slot, fontFamily: C.sans, fontSize: 12.5, fontWeight: 500,
    padding: '12px 20px', borderRadius: 30, boxShadow: '0 10px 30px rgba(26,20,16,0.3)',
    display: 'flex', alignItems: 'center', gap: 9,
  }}>
    <Icon name="check" size={15} color={C.gold} />{toast || ''}
  </div>
);

// ─── Root ────────────────────────────────────────────────────────────────
const MaintenanceHub = () => {
  const [collection, setCollection] = React.useState(() => COLLECTION.map(w => ({ ...w, records: [...w.records], documents: [...w.documents] })));
  const [layout, setLayout] = React.useState('agenda');
  const [selectedId, setSelectedId] = React.useState(null);
  const [logFor, setLogFor] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);

  const selected = collection.find(w => w.id === selectedId) || null;

  const flash = msg => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const onPick = w => setSelectedId(w.id);
  const onLog = w => setLogFor(w);

  const onSaveService = (watch, record) => {
    setCollection(cs => cs.map(w => w.id === watch.id ? { ...w, records: [record, ...w.records] } : w));
    setLogFor(null);
    flash(`${serviceType(record.type).label} logged for ${watch.brand} ${watch.model}`);
  };

  const onInterval = (watch, years) => {
    setCollection(cs => cs.map(w => w.id === watch.id ? { ...w, intervalYears: years } : w));
  };

  const onExport = watch => { downloadDossier([watch], `${watch.brand}-${watch.model}-dossier`); flash(`Dossier exported for ${watch.brand} ${watch.model}`); };
  const onExportAll = () => { downloadDossier(collection, 'collection-service-dossier'); flash('Full collection dossier exported'); };

  const Layout = { agenda: HubAgenda, ledger: HubLedger, gallery: HubGallery }[layout];

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 60, background: 'rgba(250,248,244,0.88)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 40px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: C.serif, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: C.gold }}>VW</span>
            <span style={{ width: 1, height: 20, background: C.borderLight }} />
            <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', color: C.ink, whiteSpace: 'nowrap' }}>The Service Room</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            {['Collection', 'Discover', 'Playground'].map(l => (
              <a key={l} href="#" onClick={e => e.preventDefault()} style={{ fontFamily: C.sans, fontSize: 12.5, color: C.muted, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{l}</a>
            ))}
            <span style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink, fontWeight: 600, whiteSpace: 'nowrap' }}>Service Room</span>
          </div>
        </div>
      </nav>

      {/* header */}
      <header style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 40px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 26, flexWrap: 'wrap' }}>
          <div>
            <Meta style={{ color: C.gold, display: 'block', marginBottom: 10 }}>Maintenance &amp; provenance</Meta>
            <h1 style={{ fontFamily: C.serif, fontSize: 52, fontWeight: 300, color: C.ink, lineHeight: 0.98, letterSpacing: '-0.01em', margin: 0 }}>
              The Service Room
            </h1>
            <p style={{ fontFamily: C.sans, fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '12px 0 0', maxWidth: 460 }}>
              Every service, document, and cost for your collection — and a clear read on what to send to the bench next.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onExportAll} style={{ ...btnSecondary, padding: '10px 16px' }}>
              <Icon name="download" size={14} color={C.ink} />Export dossier
            </button>
          </div>
        </div>

        <SummaryStrip collection={collection} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, margin: '28px 0 4px', flexWrap: 'wrap' }}>
          <LayoutSwitch value={layout} onChange={setLayout} />
          <span style={{ fontFamily: C.sans, fontSize: 12, color: C.muted }}>
            Three reads on the same box — pick the one that suits the moment.
          </span>
        </div>
      </header>

      {/* main */}
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 40px 40px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <Layout collection={collection} onPick={onPick} onLog={onLog} activeId={selectedId} />
        <div style={{ height: 1, background: C.border }} />
        <PartnerBand />
      </main>

      <footer style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 40px 48px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontFamily: C.serif, fontSize: 17, color: C.muted, fontStyle: 'italic' }}>Your source of truth — for the life of every piece.</span>
        <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted, letterSpacing: '0.04em' }}>VIRTUAL WATCHBOX · THE SERVICE ROOM</span>
      </footer>

      <WatchDrawer watch={selected} onClose={() => setSelectedId(null)} onLog={onLog} onInterval={onInterval} onExport={onExport} />
      <LogServiceModal watch={logFor} onClose={() => setLogFor(null)} onSave={onSaveService} />
      <Toast toast={toast} />
    </div>
  );
};

Object.assign(window, { MaintenanceHub });
