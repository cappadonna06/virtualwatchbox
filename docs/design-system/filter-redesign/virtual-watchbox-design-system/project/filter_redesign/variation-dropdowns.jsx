// Variation 2 — Compact Dropdown Buttons
// Idea: replace the 3 chip rows with 3 dropdown buttons (Material ▾ · Dial ▾ · Size ▾).
// Each opens a small popover with chips. Active state = chip count + label changes to selected value.
// Mobile: dropdowns are equal-width, stacked horizontally and scroll if needed.
// Desktop: same dropdowns but inline with results.

const ChevronD = ({ size = 12, open }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" style={{ transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }}>
    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

function FacetDropdown({ facet, selected, onSelect, onClear, isOpen, onToggle, align = 'left' }) {
  const ref = React.useRef(null);
  const [showAllZeros, setShowAllZeros] = React.useState(false);
  const visible = showAllZeros ? facet.options : facet.options.filter(o => o.count > 0 || selected === o.name);
  const hidden = facet.options.length - visible.length;

  React.useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onToggle(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isOpen, onToggle]);

  const active = !!selected;
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => onToggle(!isOpen)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 12px 8px 14px', borderRadius: 999,
        border: `1px solid ${active ? T.ink : T.borderLight}`,
        background: active ? T.ink : 'transparent',
        color: active ? T.bg : T.ink,
        fontFamily: T.sans, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <span style={{ color: active ? 'rgba(250,248,244,0.7)' : T.muted, fontSize: 11 }}>{facet.label}</span>
        {active && <span style={{ fontWeight: 600 }}>{selected}</span>}
        <ChevronD open={isOpen}/>
        {active && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: 999, marginLeft: -2,
              background: 'rgba(255,255,255,0.18)',
            }}>
            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M2 2l4 4M6 2l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)',
          [align]: 0, zIndex: 20,
          background: T.slot, border: `1px solid ${T.borderMid}`, borderRadius: 12,
          boxShadow: '0 8px 24px rgba(26,20,16,0.12)',
          padding: 14, minWidth: 240, maxWidth: 280,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {visible.map(o => (
              <FacetChip key={o.name} label={o.name} count={o.count}
                active={selected === o.name}
                disabled={o.count === 0 && selected !== o.name}
                onClick={() => { onSelect(o.name); onToggle(false); }}
                size="sm"/>
            ))}
            {hidden > 0 && !showAllZeros && (
              <button onClick={() => setShowAllZeros(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: T.sans, fontSize: 11, color: T.muted,
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}>+{hidden}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FacetDropdownRow({ sel, toggle, clearOne, clearAll, activeCount }) {
  const [open, setOpen] = React.useState(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {FACETS.map(facet => (
        <FacetDropdown
          key={facet.id} facet={facet}
          selected={sel[facet.id]}
          onSelect={v => toggle(facet.id, v)}
          onClear={() => clearOne(facet.id)}
          isOpen={open === facet.id}
          onToggle={(v) => setOpen(v ? facet.id : null)}
        />
      ))}
      {activeCount > 0 && (
        <button onClick={clearAll} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: T.sans, fontSize: 11, color: T.muted, marginLeft: 4,
          textDecoration: 'underline', textUnderlineOffset: 2,
        }}>Clear all</button>
      )}
    </div>
  );
}

function V2Mobile() {
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

        {/* Horizontal-scroll dropdown row */}
        <div className="hscroll" style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginLeft: -2, marginRight: -20,
          paddingRight: 20, WebkitOverflowScrolling: 'touch',
        }}>
          <FacetDropdownRow {...f} />
        </div>

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

function V2Desktop() {
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
      <FacetDropdownRow {...f} />
      <div style={{ marginTop: 22, fontFamily: T.sans, fontSize: 13, color: T.ink }}>
        {results} {results === 1 ? 'result' : 'results'}
      </div>
    </div>
  );
}

Object.assign(window, { V2Mobile, V2Desktop });
