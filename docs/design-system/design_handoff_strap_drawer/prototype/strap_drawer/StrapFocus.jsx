// StrapFocus.jsx — "Fit finder" hero: pick a watch to see only the straps that fit it.

const WatchTile = ({ watch, count, active, isAll, onClick }) =>
  React.createElement('button', {
    onClick, style: {
      flexShrink: 0, width: 168, textAlign: 'left', cursor: 'pointer',
      background: 'transparent', border: 'none', padding: 0,
    }
  },
    // Image frame — the watch is the hero
    React.createElement('div', { style: {
      height: 150, borderRadius: 12, position: 'relative',
      background: active
        ? 'radial-gradient(ellipse 120% 90% at 50% 30%, #FFFEFB 0%, #F4EFE6 100%)'
        : T.paperWarm,
      border: active ? `1.5px solid ${T.gold}` : `1px solid ${T.borderMid}`,
      boxShadow: active ? '0 0 0 1px rgba(201,168,76,0.35)' : 'none',
      transition: 'border-color 0.16s, box-shadow 0.16s, background 0.16s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    } },
      isAll
        ? React.createElement('div', { style: { display: 'flex', gap: 7 } },
            ['#1A1410', '#8A4B24', '#44523B', '#2A3550'].map((c, i) => React.createElement('div', { key: i, style: {
              width: 14, height: 72, borderRadius: 5, background: c,
              boxShadow: '0 6px 12px rgba(26,20,16,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
            } })))
        : watch.imageUrl
          ? React.createElement('img', { src: watch.imageUrl, alt: watch.model, style: {
              height: '94%', maxWidth: '90%', objectFit: 'contain',
              filter: 'drop-shadow(0 8px 16px rgba(26,20,16,0.2))',
            } })
          : React.createElement('span', { style: { fontFamily: T.serif, fontSize: 56, color: T.borderLight } }, (watch.brand || '?').charAt(0)),
      active && React.createElement('div', { style: {
        position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%',
        background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink,
        boxShadow: '0 2px 6px rgba(26,20,16,0.25)',
      } }, React.createElement(Icon, { name: 'check', size: 12, sw: 2.4 })),
    ),
    // Text — outside the frame
    React.createElement('div', { style: { padding: '11px 2px 0' } },
      React.createElement('div', { style: {
        fontFamily: T.sans, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase',
        color: T.gold, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      } }, isAll ? 'Everything' : watch.brand),
      React.createElement('div', { style: {
        fontFamily: T.serif, fontSize: 17, color: active ? T.ink : T.inkSoft, lineHeight: 1.1, marginBottom: 6,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      } }, isAll ? 'All straps' : watch.model),
      React.createElement('div', { style: {
        fontFamily: T.sans, fontSize: 11, fontWeight: 500,
        color: count > 0 ? T.mutedDark : T.muted,
      } },
        React.createElement('span', { style: { color: count > 0 ? T.gold : T.muted, fontWeight: 600 } }, count),
        isAll ? ' in drawer' : (count === 1 ? ' strap fits' : ' straps fit')),
    ),
  );

const WatchFocusBar = ({ watches, straps, overrides, focusId, setFocus }) =>
  React.createElement('section', { style: { paddingTop: 4, paddingBottom: 22 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 } },
      React.createElement(Kicker, { color: T.gold }, 'Fit Finder'),
      React.createElement('span', { style: { fontFamily: T.serif, fontStyle: 'italic', fontSize: 15, color: T.muted } },
        focusId ? 'Showing straps for one watch' : 'Pick a watch to see only what fits it'),
    ),
    React.createElement('div', { className: 'sd-focus-rail', style: {
      display: 'flex', gap: 16, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 6,
    } },
      React.createElement(WatchTile, { isAll: true, count: straps.length, active: !focusId, onClick: () => setFocus(null) }),
      React.createElement('div', { style: { width: 1, flexShrink: 0, background: T.border, margin: '6px 4px' } }),
      watches.map(w => React.createElement(WatchTile, {
        key: w.id, watch: w, count: compatibleStraps(w, straps, overrides).length,
        active: focusId === w.id, onClick: () => setFocus(focusId === w.id ? null : w.id),
      })),
    ),
  );

// Banner shown above the grid when a watch is focused
const FocusBanner = ({ watch, count, onClear }) =>
  React.createElement('div', { style: {
    display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap',
    background: T.ink, borderRadius: 10, padding: '13px 18px', marginBottom: 20,
  } },
    React.createElement('div', { style: {
      width: 52, height: 52, borderRadius: 9, background: 'rgba(255,255,255,0.07)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    } },
      watch.imageUrl
        ? React.createElement('img', { src: watch.imageUrl, alt: watch.model, style: { width: '100%', height: '100%', objectFit: 'contain', padding: 4 } })
        : React.createElement('span', { style: { fontFamily: T.serif, fontSize: 24, color: 'rgba(250,248,244,0.6)' } }, watch.brand.charAt(0)),
    ),
    React.createElement('div', { style: { flex: 1, minWidth: 160 } },
      React.createElement('div', { style: { fontFamily: T.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.gold, marginBottom: 3 } },
        watch.braceletType === 'integrated' ? 'Integrated bracelet' : `${watch.lugWidthMm} mm lugs`),
      React.createElement('div', { style: { fontFamily: T.serif, fontSize: 18, color: T.slot, lineHeight: 1.1 } },
        count > 0
          ? React.createElement(React.Fragment, null, count, ' strap', count === 1 ? '' : 's', ' fit your ', React.createElement('em', { style: { fontStyle: 'italic' } }, watch.model))
          : React.createElement(React.Fragment, null, 'Nothing fits your ', React.createElement('em', { style: { fontStyle: 'italic' } }, watch.model), ' yet')),
    ),
    React.createElement('button', { onClick: onClear, style: {
      fontFamily: T.sans, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: T.slot, background: 'transparent', border: '1px solid rgba(250,248,244,0.3)', borderRadius: 4,
      padding: '8px 14px', cursor: 'pointer', flexShrink: 0,
    } }, 'Clear'),
  );

Object.assign(window, { WatchFocusBar, FocusBanner, WatchTile });
