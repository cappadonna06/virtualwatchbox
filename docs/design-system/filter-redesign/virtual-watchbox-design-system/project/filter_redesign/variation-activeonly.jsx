// Variation 3 — Active-only Pills + Add Filter
// Idea: most compact. Show only active filter pills + an "+ Add filter" button.
// Tapping "Add filter" reveals a small inline popover with the 3 facets,
// and within each, the chips (filtered to non-zero by default).
// This is a stepped picker — pick facet first, then value.
// Result: when nothing's selected, the entire filter chrome is one button.

function AddFilterPopover({ sel, onPick, onClose }) {
  const [stage, setStage] = React.useState(null); // null | facet.id
  const facet = stage ? FACETS.find(f => f.id === stage) : null;
  const [showAllZeros, setShowAllZeros] = React.useState(false);

  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30,
      background: T.slot, border: `1px solid ${T.borderMid}`, borderRadius: 12,
      boxShadow: '0 10px 28px rgba(26,20,16,0.14)',
      width: 280, padding: 6, overflow: 'hidden',
    }}>
      {!facet ? (
        <>
          <div style={{ padding: '8px 12px 4px', fontFamily: T.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>
            Filter by
          </div>
          {FACETS.map(f => {
            const current = sel[f.id];
            return (
              <button key={f.id} onClick={() => setStage(f.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 12px', borderRadius: 8, background: 'transparent', border: 'none',
                fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: T.ink, cursor: 'pointer',
                textAlign: 'left',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0EBE3'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>{f.label}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.muted, fontSize: 12 }}>
                  {current ? <span style={{ color: T.gold, fontWeight: 600 }}>{current}</span> : null}
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
            );
          })}
        </>
      ) : (
        <>
          <button onClick={() => setStage(null)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', background: 'transparent', border: 'none',
            fontFamily: T.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: T.muted, cursor: 'pointer', textAlign: 'left',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M7 2L3 5l4 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{facet.label}</span>
          </button>
          <div style={{ padding: '4px 10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(showAllZeros ? facet.options : facet.options.filter(o => o.count > 0 || sel[facet.id] === o.name)).map(o => (
              <FacetChip key={o.name} label={o.name} count={o.count}
                active={sel[facet.id] === o.name}
                disabled={o.count === 0 && sel[facet.id] !== o.name}
                onClick={() => { onPick(facet.id, o.name); onClose(); }}
                size="sm"/>
            ))}
            {!showAllZeros && facet.options.filter(o => o.count === 0).length > 0 && (
              <button onClick={() => setShowAllZeros(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: T.sans, fontSize: 11, color: T.muted,
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}>+{facet.options.filter(o => o.count === 0).length}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ActiveOnlyFilterRow({ sel, toggle, clearOne, clearAll, activeCount }) {
  const [open, setOpen] = React.useState(false);
  const activeChips = [];
  if (sel.material) activeChips.push(['material', 'Material', sel.material]);
  if (sel.color)    activeChips.push(['color',    'Dial',     sel.color]);
  if (sel.size)     activeChips.push(['size',     'Size',     sel.size]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', position: 'relative' }}>
      {activeChips.map(([id, label, val]) => (
        <button key={id} onClick={() => clearOne(id)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 8px 6px 12px', borderRadius: 999,
          background: T.ink, border: `1px solid ${T.ink}`,
          fontFamily: T.sans, fontSize: 11.5, fontWeight: 500, color: T.bg,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          <span style={{ color: 'rgba(250,248,244,0.6)', fontSize: 10.5 }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{val}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: 999, background: 'rgba(255,255,255,0.18)',
          }}>
            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M2 2l4 4M6 2l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </span>
        </button>
      ))}

      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999,
          background: 'transparent', border: `1px dashed ${T.borderLight}`,
          fontFamily: T.sans, fontSize: 11.5, fontWeight: 500, color: T.muted,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <span>{activeCount === 0 ? 'Add filter' : 'Add another'}</span>
        </button>
        {open && (
          <AddFilterPopover sel={sel} onPick={(facet, value) => toggle(facet, value)} onClose={() => setOpen(false)} />
        )}
      </div>

      {activeCount > 1 && (
        <button onClick={clearAll} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.sans, fontSize: 11, color: T.muted,
          textDecoration: 'underline', textUnderlineOffset: 2,
        }}>Clear</button>
      )}
    </div>
  );
}

function V3Mobile() {
  const f = useFilterState();
  const results = mockResultCount(f.sel);
  return (
    <div style={{
      position: 'relative', width: 360, height: 720,
      background: T.bg, borderRadius: 36, overflow: 'hidden',
      border: '8px solid #1A1410', boxShadow: '0 20px 60px rgba(26,20,16,0.18)',
    }}>
      <div style={{
        height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 22px 0', fontFamily: '-apple-system, system-ui', fontSize: 13, fontWeight: 600, color: T.ink,
      }}>
        <span>9:41</span>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10 }}>●●●</span>
          <span style={{ width: 22, height: 10, border: `1px solid ${T.ink}`, borderRadius: 2, position: 'relative' }}>
            <span style={{ position: 'absolute', inset: 1, right: 4, background: T.ink, borderRadius: 1 }}/>
          </span>
        </span>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>← My Collection</div>
        <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 400, margin: '0 0 4px', color: T.ink, lineHeight: 1.0 }}>Find a Watch</h1>
        <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, margin: '0 0 14px' }}>Search by brand, model, or reference</p>
        <div style={{ padding: '11px 14px', borderRadius: 8, border: `1px solid ${T.borderMid}`, background: T.slot, fontFamily: T.sans, fontSize: 14, color: T.ink, marginBottom: 14 }}>omega</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <FacetChip label="With Photos" active onClick={()=>{}} size="sm"/>
          <FacetChip label="All Watches (1)" active={false} onClick={()=>{}} size="sm"/>
        </div>

        <ActiveOnlyFilterRow {...f} />

        <div style={{ marginTop: 18, fontFamily: T.sans, fontSize: 12, color: T.ink }}>
          {results} {results === 1 ? 'result' : 'results'}
        </div>
        <div style={{
          marginTop: 12, height: 220, borderRadius: 10, border: `1px solid ${T.borderMid}`,
          background: T.slot, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 120, height: 120, borderRadius: 8, background: '#EDE9E2' }}/>
        </div>
      </div>
    </div>
  );
}

function V3Desktop() {
  const f = useFilterState();
  const results = mockResultCount(f.sel);
  return (
    <div style={{ position: 'relative', width: 880, padding: '36px 40px', background: T.bg }}>
      <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>← Home</div>
      <h1 style={{ fontFamily: T.serif, fontSize: 38, fontWeight: 400, margin: '0 0 4px', color: T.ink }}>Search Watches</h1>
      <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: '0 0 18px' }}>Search by brand, model, or reference</p>
      <div style={{ padding: '13px 16px', borderRadius: 8, border: `1px solid ${T.borderMid}`, background: T.slot, fontFamily: T.sans, fontSize: 15, color: T.ink, marginBottom: 14 }}>omega</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <FacetChip label="With Photos" active onClick={()=>{}} size="sm"/>
        <FacetChip label="All Watches (1)" active={false} onClick={()=>{}} size="sm"/>
      </div>
      <ActiveOnlyFilterRow {...f} />
      <div style={{ marginTop: 22, fontFamily: T.sans, fontSize: 13, color: T.ink }}>
        {results} {results === 1 ? 'result' : 'results'}
      </div>
    </div>
  );
}

Object.assign(window, { V3Mobile, V3Desktop });
