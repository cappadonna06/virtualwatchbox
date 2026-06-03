// HubAgenda.jsx — "Service Desk" layout: runway + attention queue + on-track list

const AttentionCard = ({ w, onPick, onLog }) => {
  const st = serviceStatus(w);
  const lf = lastFullService(w);
  const cost = lifetimeCost(w);
  const overdue = st.key === 'overdue';
  const need = overdue
    ? `Full service overdue by ${Math.round(Math.abs(st.months))} months`
    : `Full service due ${relTime(st.due)} — ${fmtDate(st.due)}`;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '128px 1fr', gap: 22, padding: 20,
      background: C.card, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${st.dot}`, borderRadius: 12,
      boxShadow: '0 1px 4px rgba(26,20,16,0.04)',
    }}>
      <button type="button" onClick={() => onPick(w)} style={{
        width: 128, height: 128, background: 'none', border: 'none',
        cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={w.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
          filter: 'drop-shadow(0 8px 16px rgba(26,20,16,0.22))' }} />
      </button>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div onClick={() => onPick(w)} style={{ cursor: 'pointer', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Meta style={{ whiteSpace: 'nowrap' }}>{w.brand}</Meta>
              <span style={{ fontFamily: C.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: C.muted, whiteSpace: 'nowrap' }}>REF {w.ref}</span>
            </div>
            <div style={{ fontFamily: C.serif, fontSize: 23, fontWeight: 400, color: C.ink, lineHeight: 1.06 }}>
              {w.model}
            </div>
          </div>
          <StatusChip status={st} />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 14,
          fontFamily: C.sans, fontSize: 12.5, fontWeight: 500, color: st.fg,
        }}>
          <Icon name={overdue ? 'clock' : 'calendar'} size={14} color={st.fg} />{need}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 22 }}>
            <Stat label="Last full" value={lf ? fmtMonthYear(lf.date) : 'Never'} />
            <Stat label="Interval" value={`${w.intervalYears} yr`} />
            <Stat label="Lifetime upkeep" value={fmt(cost)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => onLog(w)} style={btnPrimary}>
              <Icon name="plus" size={13} color={C.slot} />Log a service
            </button>
            <a href={bookingUrl(w)} target="_blank" rel="noopener noreferrer" style={btnSecondary}>
              Find a center <span style={{ opacity: 0.6 }}>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const OnTrackRow = ({ w, onPick, onLog }) => {
  const st = serviceStatus(w);
  const lf = lastFullService(w);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '64px 1.5fr 1fr 1fr auto', alignItems: 'center', gap: 16,
      padding: '12px 18px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
    }}>
      <button type="button" onClick={() => onPick(w)} style={{
        width: 64, height: 64, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={w.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
          filter: 'drop-shadow(0 5px 10px rgba(26,20,16,0.18))' }} />
      </button>
      <div onClick={() => onPick(w)} style={{ cursor: 'pointer', minWidth: 0 }}>
        <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {w.brand} <span style={{ fontWeight: 400, color: C.muted }}>{w.model}</span>
        </div>
        <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>Last full · {lf ? fmtMonthYear(lf.date) : 'Never serviced'}</span>
      </div>
      <div><Meta style={{ display: 'block', marginBottom: 2 }}>Next due</Meta>
        <span style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink }}>{fmtDate(st.due, { year: 'numeric', month: 'short' })}</span>
      </div>
      <div><Meta style={{ display: 'block', marginBottom: 2 }}>Upkeep</Meta>
        <span style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink }}>{fmt(lifetimeCost(w))}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusChip status={st} size="sm" />
        <button type="button" onClick={() => onLog(w)} title="Log a service" style={iconBtn}>
          <Icon name="plus" size={14} color={C.muted} />
        </button>
      </div>
    </div>
  );
};

const HubAgenda = ({ collection, onPick, onLog, activeId }) => {
  const sorted = [...collection].sort(byAttention);
  const attention = sorted.filter(w => serviceStatus(w).key !== 'ok');
  const onTrack = sorted.filter(w => serviceStatus(w).key === 'ok');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      <section>
        <SectionHead eyebrow="Service horizon" title="The next two years" hint="Each colored dot marks the next full-service date" />
        <ServiceHorizon collection={collection} onPick={onPick} activeId={activeId} />
      </section>

      <section>
        <SectionHead
          eyebrow={`Needs attention · ${attention.length}`}
          title="On the bench"
          hint="Overdue and due-soon pieces, most urgent first" />
        {attention.length ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {attention.map(w => <AttentionCard key={w.id} w={w} onPick={onPick} onLog={onLog} />)}
          </div>
        ) : (
          <div style={emptyNote}>Nothing needs servicing right now. The whole box is on track.</div>
        )}
      </section>

      <section>
        <SectionHead eyebrow={`On track · ${onTrack.length}`} title="Resting easy" />
        <div style={{ display: 'grid', gap: 8 }}>
          {onTrack.map(w => <OnTrackRow key={w.id} w={w} onPick={onPick} onLog={onLog} />)}
        </div>
      </section>
    </div>
  );
};

// ─── small shared bits used by layouts ───────────────────────────────────
const Stat = ({ label, value }) => (
  <div>
    <Meta style={{ display: 'block', marginBottom: 3, fontSize: 9, whiteSpace: 'nowrap' }}>{label}</Meta>
    <span style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>{value}</span>
  </div>
);

const SectionHead = ({ eyebrow, title, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <Meta style={{ color: C.gold, display: 'block', marginBottom: 5 }}>{eyebrow}</Meta>
    <h2 style={{ fontFamily: C.serif, fontSize: 28, fontWeight: 400, color: C.ink, lineHeight: 1.05, margin: 0 }}>{title}</h2>
    {hint && <span style={{ fontFamily: C.sans, fontSize: 12, color: C.muted, display: 'block', marginTop: 6 }}>{hint}</span>}
  </div>
);

const bookingUrl = w => `https://www.google.com/search?q=${encodeURIComponent(w.brand + ' authorized service center near me')}`;

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: C.sans, fontSize: 11,
  fontWeight: 500, letterSpacing: '0.06em', padding: '9px 16px', background: C.ink,
  color: C.slot, border: 'none', borderRadius: 4, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
};
const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: C.sans, fontSize: 11,
  fontWeight: 500, letterSpacing: '0.06em', padding: '8px 15px', background: 'transparent',
  color: C.ink, border: `1px solid ${C.borderLight}`, borderRadius: 4, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
};
const iconBtn = {
  width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.card,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
};
const rowThumb = {
  width: 48, height: 48, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0,
};
const emptyNote = {
  fontFamily: C.serif, fontSize: 17, color: C.muted, fontStyle: 'italic',
  padding: '24px 0', textAlign: 'center',
};

Object.assign(window, { HubAgenda, Stat, SectionHead, bookingUrl, btnPrimary, btnSecondary, iconBtn, rowThumb, emptyNote });
