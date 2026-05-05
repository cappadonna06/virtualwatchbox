// Variation A — Bottom Sheet (selected direction)
// "Has photos" is now a 4th facet — boolean, default ON.
// The standalone "With Photos / All Watches" toggle row is gone.
// When ON: shown as a quiet chip in the active row ("Has photos" with × to remove).
// When OFF (user disabled it): shown as a warning-tinted chip ("All watches — incl. no photos").

const ChevronDown = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Cross = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const SlidersIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 4h7M11 4h3M2 8h3M7 8h7M2 12h9M13 12h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" fill="#FAF8F4"/>
    <circle cx="6" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" fill="#FAF8F4"/>
    <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" fill="#FAF8F4"/>
  </svg>
);
const PhotoIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="3" width="11" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="7" cy="7.25" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 3V2.2c0-.4.3-.7.7-.7h3.6c.4 0 .7.3.7.7V3" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

// Pill: photos-on (quiet) — sits in active row to remind user "default photos-only" is engaged
function PhotosOnChip({ onClick }) {
  return (
    <button onClick={onClick} title="Click to include watches without photos"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px 5px 11px', borderRadius: 999,
        background: 'transparent', border: `1px solid ${T.border}`,
        fontFamily: T.sans, fontSize: 11, fontWeight: 500, color: T.muted,
        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
      <PhotoIcon size={11}/>
      <span>Photos only</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: 999, background: '#F0EBE3', color: T.muted,
      }}><Cross size={8}/></span>
    </button>
  );
}

// Pill: photos-off (alert) — visible warning that user is seeing watches without photos
function PhotosOffChip({ onClick }) {
  return (
    <button onClick={onClick} title="Click to show only watches with photos"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 6px 5px 11px', borderRadius: 999,
        background: '#FFF8E6', border: `1px solid #E8D9B0`,
        fontFamily: T.sans, fontSize: 11, fontWeight: 500, color: '#8A6A10',
        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
      <span>Showing all watches</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: 999, background: 'rgba(138,106,16,0.12)', color: '#8A6A10',
      }}><Cross size={9}/></span>
    </button>
  );
}

// Compact summary row — what shows when sheet is closed
function FilterSummaryRow({ sel, onOpen, clearOne, clearAll, activeCount, toggle }) {
  const facetChips = [];
  if (sel.material) facetChips.push(['material', sel.material]);
  if (sel.color)    facetChips.push(['color', sel.color]);
  if (sel.size)     facetChips.push(['size', sel.size]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={onOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 999,
          background: activeCount > 0 ? T.ink : 'transparent',
          border: `1px solid ${activeCount > 0 ? T.ink : T.borderLight}`,
          color: activeCount > 0 ? T.bg : T.ink,
          fontFamily: T.sans, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', flexShrink: 0,
        }}>
        <SlidersIcon />
        <span>Filters</span>
        {activeCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            background: T.gold, color: T.ink,
            padding: '1px 7px', borderRadius: 999, minWidth: 18, textAlign: 'center',
          }}>{activeCount}</span>
        )}
      </button>

      <div className="hscroll" style={{
        display: 'flex', gap: 6, overflowX: 'auto', flex: 1, alignItems: 'center',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Photo state always visible — either quiet or warning */}
        {sel.hasPhotos
          ? <PhotosOnChip onClick={() => toggle('hasPhotos')}/>
          : <PhotosOffChip onClick={() => toggle('hasPhotos')}/>}

        {facetChips.map(([facet, val]) => (
          <button key={facet} onClick={() => clearOne(facet)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 6px 5px 11px', borderRadius: 999,
              background: '#F0EBE3', border: `1px solid ${T.border}`,
              fontFamily: T.sans, fontSize: 11.5, fontWeight: 500, color: T.ink,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            <span>{val}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: 999, background: 'rgba(26,20,16,0.08)', color: T.ink,
            }}><Cross size={9}/></span>
          </button>
        ))}
        {(facetChips.length > 0 || sel.hasPhotos === false) && (
          <button onClick={clearAll} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: T.sans, fontSize: 11, color: T.muted,
            textDecoration: 'underline', textUnderlineOffset: 2,
            padding: '0 6px', whiteSpace: 'nowrap', flexShrink: 0,
          }}>Reset</button>
        )}
      </div>
    </div>
  );
}

// The sheet body — sectioned facets + a top-level "Has photos" toggle.
function FilterSheetBody({ sel, toggle, showAllZeros, setShowAllZeros }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: '4px 2px' }}>
      {/* Photos toggle — distinct row, default-on, prominent */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
        padding: '14px 16px', borderRadius: 12,
        background: T.slot, border: `1px solid ${T.borderMid}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, background: T.bg, color: T.ink, flexShrink: 0,
          }}><PhotoIcon size={16}/></div>
          <div>
            <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 2 }}>
              Show only watches with photos
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.muted, lineHeight: 1.45 }}>
              We're still adding photos. Turn off to see the full catalog.
            </div>
          </div>
        </div>
        <Switch checked={sel.hasPhotos} onChange={() => toggle('hasPhotos')}/>
      </div>

      {FACETS.map(f => {
        const visible = showAllZeros ? f.options : f.options.filter(o => o.count > 0 || sel[f.id] === o.name);
        const hidden = f.options.length - visible.length;
        return (
          <div key={f.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <Eyebrow>{f.label}</Eyebrow>
              {sel[f.id] && (
                <span style={{ fontFamily: T.sans, fontSize: 10.5, color: T.gold, fontWeight: 500 }}>{sel[f.id]}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {visible.map(opt => (
                <FacetChip key={opt.name} label={opt.name} count={opt.count}
                  active={sel[f.id] === opt.name}
                  disabled={opt.count === 0 && sel[f.id] !== opt.name}
                  onClick={() => toggle(f.id, opt.name)}/>
              ))}
              {hidden > 0 && !showAllZeros && (
                <button onClick={() => setShowAllZeros(true)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: T.sans, fontSize: 11, color: T.muted,
                  textDecoration: 'underline', textUnderlineOffset: 2, padding: '6px 4px',
                }}>+ {hidden} more</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Switch component — used inline in the photos toggle row
function Switch({ checked, onChange }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={checked}
      style={{
        position: 'relative', width: 44, height: 26, borderRadius: 999,
        background: checked ? T.ink : '#D4CBBF', border: 'none', cursor: 'pointer',
        transition: 'background .18s', flexShrink: 0, padding: 0,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}/>
    </button>
  );
}

// Mobile bottom sheet
function MobileBottomSheet({ open, onClose, children, resultsCount, onApply, onReset }) {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity .25s ease', zIndex: 5,
      }} onClick={onClose} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .28s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 6, maxHeight: '88%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(26,20,16,0.16)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D4CBBF' }}/>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 14px', borderBottom: `1px solid ${T.border}`,
        }}>
          <h3 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 400, margin: 0, color: T.ink }}>Filters</h3>
          <button onClick={onReset} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: T.sans, fontSize: 11, color: T.muted, fontWeight: 500, letterSpacing: '0.04em',
          }}>Reset</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 28px' }}>
          {children}
        </div>
        <div style={{
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          borderTop: `1px solid ${T.border}`, background: T.slot,
          display: 'flex', gap: 10,
        }}>
          <button onClick={onClose} style={{
            flex: '0 0 auto', padding: '12px 18px', borderRadius: 8,
            background: 'transparent', border: `1px solid ${T.borderLight}`,
            fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.ink, cursor: 'pointer',
          }}>Close</button>
          <button onClick={onApply} style={{
            flex: 1, padding: '12px 18px', borderRadius: 8,
            background: T.ink, border: 'none', color: T.bg,
            fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer',
          }}>Show {resultsCount} {resultsCount === 1 ? 'result' : 'results'}</button>
        </div>
      </div>
    </>
  );
}

function PageChrome({ children }) {
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
      {children}
    </div>
  );
}

function Header() {
  return (
    <div style={{ padding: '14px 20px 0' }}>
      <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>← My Collection</div>
      <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 400, margin: '0 0 4px', color: T.ink, lineHeight: 1.0 }}>Find a Watch</h1>
      <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, margin: '0 0 14px' }}>Search by brand, model, or reference</p>
      <div style={{ padding: '11px 14px', borderRadius: 8, border: `1px solid ${T.borderMid}`, background: T.slot, fontFamily: T.sans, fontSize: 14, color: T.ink, marginBottom: 14 }}>omega</div>
    </div>
  );
}

function ResultBlock({ count, ghosted }) {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ marginTop: 18, fontFamily: T.sans, fontSize: 12, color: T.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{count} {count === 1 ? 'result' : 'results'}</span>
        {ghosted && <span style={{ color: T.muted, fontSize: 11 }}>· {ghosted} without photos</span>}
      </div>
      <div style={{
        marginTop: 12, height: 200, borderRadius: 10, border: `1px solid ${T.borderMid}`,
        background: T.slot, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 110, height: 110, borderRadius: 8, background: '#EDE9E2' }}/>
      </div>
    </div>
  );
}

// MOBILE — default state (no filter sheet open, photos-on)
function V1Mobile() {
  const f = useFilterState();
  const [open, setOpen] = React.useState(false);
  const [showAllZeros, setShowAllZeros] = React.useState(false);
  const results = mockResultCount(f.sel);
  return (
    <PageChrome>
      <Header/>
      <div style={{ padding: '0 20px' }}>
        <FilterSummaryRow {...f} onOpen={() => setOpen(true)} />
      </div>
      <ResultBlock count={results} ghosted={f.sel.hasPhotos ? 7 : null}/>
      <MobileBottomSheet
        open={open} onClose={() => setOpen(false)}
        resultsCount={results}
        onApply={() => setOpen(false)}
        onReset={() => { f.clearAll(); setShowAllZeros(false); }}
      >
        <FilterSheetBody {...f} showAllZeros={showAllZeros} setShowAllZeros={setShowAllZeros}/>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button onClick={() => setShowAllZeros(s => !s)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: T.sans, fontSize: 11, color: T.muted, padding: 6,
            textDecoration: 'underline', textUnderlineOffset: 2,
          }}>{showAllZeros ? 'Hide zero-count options' : 'Show all options'}</button>
        </div>
      </MobileBottomSheet>
    </PageChrome>
  );
}

// MOBILE — sheet open, with one filter pre-selected to show active state
function V1MobileOpen() {
  const f = useFilterState();
  React.useEffect(() => { f.toggle('color', 'Blue'); }, []);
  const [showAllZeros, setShowAllZeros] = React.useState(false);
  const results = mockResultCount(f.sel);
  return (
    <PageChrome>
      <Header/>
      <div style={{ padding: '0 20px' }}>
        <FilterSummaryRow {...f} onOpen={()=>{}}/>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.45)', zIndex: 5 }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        zIndex: 6, maxHeight: '88%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(26,20,16,0.16)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D4CBBF' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 400, margin: 0, color: T.ink }}>Filters</h3>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.sans, fontSize: 11, color: T.muted, fontWeight: 500 }}>Reset</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 28px' }}>
          <FilterSheetBody {...f} showAllZeros={showAllZeros} setShowAllZeros={setShowAllZeros}/>
        </div>
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, background: T.slot, display: 'flex', gap: 10 }}>
          <button style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: 8, background: 'transparent', border: `1px solid ${T.borderLight}`, fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.ink, cursor: 'pointer' }}>Close</button>
          <button style={{ flex: 1, padding: '12px 18px', borderRadius: 8, background: T.ink, border: 'none', color: T.bg, fontFamily: T.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer' }}>Show {results} {results === 1 ? 'result' : 'results'}</button>
        </div>
      </div>
    </PageChrome>
  );
}

// MOBILE — photos toggle OFF, surfaced as warning chip
function V1MobilePhotosOff() {
  const f = useFilterState();
  React.useEffect(() => { f.toggle('hasPhotos'); }, []);
  const results = mockResultCount(f.sel);
  return (
    <PageChrome>
      <Header/>
      <div style={{ padding: '0 20px' }}>
        <FilterSummaryRow {...f} onOpen={()=>{}}/>
      </div>
      <ResultBlock count={results}/>
    </PageChrome>
  );
}

// DESKTOP — popover anchored under the trigger
function V1Desktop() {
  const f = useFilterState();
  const [open, setOpen] = React.useState(true);
  const [showAllZeros, setShowAllZeros] = React.useState(false);
  const results = mockResultCount(f.sel);

  return (
    <div style={{ position: 'relative', width: 880, padding: '36px 40px', background: T.bg }}>
      <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>← Home</div>
      <h1 style={{ fontFamily: T.serif, fontSize: 38, fontWeight: 400, margin: '0 0 4px', color: T.ink }}>Search Watches</h1>
      <p style={{ fontFamily: T.sans, fontSize: 13, color: T.muted, margin: '0 0 18px' }}>Search by brand, model, or reference</p>
      <div style={{ padding: '13px 16px', borderRadius: 8, border: `1px solid ${T.borderMid}`, background: T.slot, fontFamily: T.sans, fontSize: 15, color: T.ink, marginBottom: 14 }}>omega</div>

      <FilterSummaryRow {...f} onOpen={() => setOpen(o=>!o)} />

      {open && (
        <div style={{
          marginTop: 10, background: T.slot,
          border: `1px solid ${T.borderMid}`, borderRadius: 12,
          boxShadow: '0 6px 24px rgba(26,20,16,0.08)', padding: '20px 22px',
        }}>
          {/* Photos toggle — full width row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            padding: '0 0 18px', marginBottom: 18, borderBottom: `1px solid ${T.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: T.bg, color: T.ink }}>
                <PhotoIcon size={16}/>
              </div>
              <div>
                <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Show only watches with photos</div>
                <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.muted }}>We're still adding photos. Turn off to see the full catalog.</div>
              </div>
            </div>
            <Switch checked={f.sel.hasPhotos} onChange={() => f.toggle('hasPhotos')}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28 }}>
            {FACETS.map(facet => {
              const visible = showAllZeros ? facet.options : facet.options.filter(o => o.count > 0 || f.sel[facet.id] === o.name);
              const hidden = facet.options.length - visible.length;
              return (
                <div key={facet.id}>
                  <Eyebrow style={{ marginBottom: 10 }}>{facet.label}</Eyebrow>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {visible.map(o => (
                      <FacetChip key={o.name} label={o.name} count={o.count}
                        active={f.sel[facet.id] === o.name}
                        disabled={o.count === 0 && f.sel[facet.id] !== o.name}
                        onClick={() => f.toggle(facet.id, o.name)} size="sm"/>
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
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 22, fontFamily: T.sans, fontSize: 13, color: T.ink }}>
        {results} {results === 1 ? 'result' : 'results'}
      </div>
    </div>
  );
}

Object.assign(window, { V1Mobile, V1MobileOpen, V1MobilePhotosOff, V1Desktop });
