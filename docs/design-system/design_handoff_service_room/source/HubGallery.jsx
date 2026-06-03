// HubGallery.jsx — "Cards" layout: editorial maintenance card per piece

const GalleryCard = ({ w, onPick, onLog, active }) => {
  const st = serviceStatus(w);
  const lf = lastFullService(w);
  const cost = lifetimeCost(w);
  const docs = (w.documents || []).length;

  return (
    <div onClick={() => onPick(w)} style={{
      background: C.card, border: `1px solid ${active ? C.gold : C.border}`,
      borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column',
      boxShadow: active ? '0 0 0 1px rgba(201,168,76,0.4), 0 8px 24px rgba(201,168,76,0.1)' : '0 1px 4px rgba(26,20,16,0.04)',
      transition: 'box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,20,16,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = active ? '0 0 0 1px rgba(201,168,76,0.4), 0 8px 24px rgba(201,168,76,0.1)' : '0 1px 4px rgba(26,20,16,0.04)'; }}>

      {/* image panel */}
      <div style={{ position: 'relative', background: C.bg, padding: '22px 22px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ position: 'absolute', top: 14, left: 14 }}><StatusChip status={st} size="sm" /></div>
        <div style={{ position: 'absolute', top: 14, right: 14 }}><WarrantyChip w={w} size="sm" /></div>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={w.image} alt={`${w.brand} ${w.model}`} style={{ maxWidth: '80%', maxHeight: '100%', objectFit: 'contain',
            filter: 'drop-shadow(0 12px 22px rgba(26,20,16,0.2))' }} />
        </div>
      </div>

      {/* body */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Meta>{w.brand}</Meta>
          <div style={{ fontFamily: C.serif, fontSize: 23, fontWeight: 400, color: C.ink, lineHeight: 1.08 }}>{w.model}</div>
          <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>Ref. {w.ref} · {w.caseSizeMm}mm</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', padding: '14px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <Field label="Last full service" value={lf ? fmtDate(lf.date, { year: 'numeric', month: 'short' }) : 'Never'} />
          <Field label="Next due" value={fmtDate(st.due, { year: 'numeric', month: 'short' })} accent={st.fg} />
          <Field label="Lifetime upkeep" value={fmt(cost)} />
          <Field label="On file" value={`${docs} document${docs === 1 ? '' : 's'}`} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button type="button" onClick={e => { e.stopPropagation(); onLog(w); }} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
            <Icon name="plus" size={13} color={C.slot} />Log a service
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onPick(w); }} style={{ ...btnSecondary, justifyContent: 'center' }}>
            Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, accent }) => (
  <div>
    <Meta style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>{label}</Meta>
    <span style={{ fontFamily: C.sans, fontSize: 13.5, fontWeight: 600, color: accent || C.ink }}>{value}</span>
  </div>
);

const HubGallery = ({ collection, onPick, onLog, activeId }) => {
  const sorted = [...collection].sort(byAttention);
  return (
    <div>
      <SectionHead eyebrow="The collection" title="Six pieces under care"
        hint="Ordered by what needs attention first" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(308px, 1fr))', gap: 18 }}>
        {sorted.map(w => <GalleryCard key={w.id} w={w} onPick={onPick} onLog={onLog} active={activeId === w.id} />)}
      </div>
    </div>
  );
};

Object.assign(window, { HubGallery, GalleryCard, Field });
