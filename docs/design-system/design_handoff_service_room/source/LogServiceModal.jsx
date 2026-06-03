// LogServiceModal.jsx — working "log a service" form

const SUGGESTED_PROVIDERS = [
  'Brand Boutique Service',
  'Authorized Service Center',
  'Independent Watchmaker',
];

const LogServiceModal = ({ watch, onClose, onSave }) => {
  const today = TODAY.toISOString().slice(0, 10);
  const [date, setDate] = React.useState(today);
  const [type, setType] = React.useState('full');
  const [provider, setProvider] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    // reset when opening for a new watch
    setDate(today); setType('full'); setProvider(''); setCost(''); setNotes('');
  }, [watch && watch.id]);

  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!watch) return null;
  const t = serviceType(type);

  const submit = () => {
    onSave(watch, {
      id: 'new-' + Date.now(),
      date, type,
      provider: provider.trim() || 'Unspecified provider',
      cost: Math.max(0, parseFloat(cost) || 0),
      notes: notes.trim(),
    });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.4)', backdropFilter: 'blur(3px)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(540px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: C.slot,
        border: `1px solid ${C.borderMid}`, borderRadius: 16, boxShadow: '0 24px 64px rgba(26,20,16,0.28)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ width: 48, height: 48, borderRadius: 9, background: C.bg, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7, flexShrink: 0 }}>
            <img src={watch.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </span>
          <div style={{ flex: 1 }}>
            <Meta style={{ color: C.gold }}>Log a service</Meta>
            <div style={{ fontFamily: C.serif, fontSize: 22, fontWeight: 400, color: C.ink, lineHeight: 1.05 }}>
              {watch.brand} {watch.model}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ ...iconBtn, width: 30, height: 30 }}>
            <Icon name="close" size={14} color={C.muted} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* type */}
          <Field2 label="Service type">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SERVICE_TYPES.map(s => (
                <TypeTag key={s.id} type={s.id} active={type === s.id} interactive onClick={() => setType(s.id)} />
              ))}
            </div>
            {t.resets && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, fontFamily: C.sans, fontSize: 11.5, color: C.gold }}>
                <Icon name="spark" size={13} color={C.gold} />Resets the service clock — next due recalculates to {watch.intervalYears} years out.
              </div>
            )}
          </Field2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field2 label="Date">
              <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={input} />
            </Field2>
            <Field2 label="Cost (USD)">
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontFamily: C.sans, fontSize: 13, color: C.muted }}>$</span>
                <input type="number" min="0" step="10" value={cost} placeholder="0" onChange={e => setCost(e.target.value)} style={{ ...input, paddingLeft: 26 }} />
              </div>
            </Field2>
          </div>

          {/* provider */}
          <Field2 label="Service provider">
            <input type="text" value={provider} placeholder="Where was it serviced?" onChange={e => setProvider(e.target.value)} style={input} />
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
              {SUGGESTED_PROVIDERS.map(p => (
                <button key={p} type="button" onClick={() => setProvider(p)} style={{
                  fontFamily: C.sans, fontSize: 10.5, color: C.muted, background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
                }}>{p}</button>
              ))}
              <a href={bookingUrl(watch)} target="_blank" rel="noopener noreferrer" style={{
                fontFamily: C.sans, fontSize: 10.5, fontWeight: 600, color: C.gold, marginLeft: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>Find a {watch.brand} center ↗</a>
            </div>
          </Field2>

          {/* notes */}
          <Field2 label="Notes">
            <textarea value={notes} placeholder="Amplitude, parts replaced, who handled it…" onChange={e => setNotes(e.target.value)}
              rows={3} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} />
          </Field2>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderTop: `1px solid ${C.border}`, position: 'sticky', bottom: 0, background: C.slot }}>
          <span style={{ fontFamily: C.sans, fontSize: 11, color: C.muted }}>
            {t.label} · {fmtDate(date)}{cost ? ` · ${fmt(parseFloat(cost) || 0)}` : ''}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '10px 18px' }}>Cancel</button>
            <button type="button" onClick={submit} style={{ ...btnPrimary, padding: '10px 22px' }}>
              <Icon name="check" size={13} color={C.slot} />Save record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field2 = ({ label, children }) => (
  <div>
    <Meta style={{ display: 'block', marginBottom: 9 }}>{label}</Meta>
    {children}
  </div>
);

const input = {
  width: '100%', fontFamily: C.sans, fontSize: 13, color: C.ink, background: C.card,
  border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 13px', outline: 'none',
};

Object.assign(window, { LogServiceModal });
