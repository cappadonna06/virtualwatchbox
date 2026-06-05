// StrapDrawerEntry.jsx — entry points from My Collection into the Strap Drawer.
// Exports: StrapHeaderLink (compact, sits in the header meta row)
//          StrapDrawerBand (editorial band, treatment B, below the watchbox)
// Relies on window globals from strap-data.jsx, ui-atoms.jsx, StrapSwatch.jsx.

const DRAWER_HREF = 'Strap Drawer.html';

// ─── Header affordance (sits right after Stats) ──────────────────────────
const StrapHeaderLink = () => {
  const [hover, setHover] = React.useState(false);
  const n = STRAPS.length;
  return React.createElement('a', {
    href: DRAWER_HREF,
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 10,
      textDecoration: 'none', cursor: 'pointer',
      padding: '8px 8px 8px 14px', borderRadius: 8,
      border: `1px solid ${hover ? '#C9A84C' : '#E0D8CC'}`,
      background: hover ? '#FBF6EA' : '#FFFCF7',
      boxShadow: hover ? '0 6px 16px rgba(201,168,76,0.18)' : '0 1px 3px rgba(26,20,16,0.05)',
      transform: hover ? 'translateY(-1px)' : 'none',
      transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s',
    }
  },
    // mini strap spines
    React.createElement('span', { style: { display: 'flex', gap: 3, alignItems: 'center' } },
      ['#3A2A1E', '#5A2A2E', '#1C1C1C', '#4A5236'].map((c, i) =>
        React.createElement('span', { key: i, style: { width: 4.5, height: 19, borderRadius: 2, background: c, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)' } })),
    ),
    React.createElement('span', { style: {
      fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
      color: '#1A1410', whiteSpace: 'nowrap',
    } }, 'Strap Drawer'),
    // count chip
    React.createElement('span', { style: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22,
      padding: '0 6px', borderRadius: 11, background: '#C9A84C', color: '#1A1410',
      fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: 700,
    } }, n),
    React.createElement('span', { style: { display: 'inline-flex', color: hover ? '#1A1410' : '#A89880', transform: hover ? 'translateX(2px)' : 'none', transition: 'transform 0.15s, color 0.15s', marginRight: 4 } },
      React.createElement('svg', { width: 15, height: 15, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M4 10h11' }), React.createElement('path', { d: 'M10 5l5 5-5 5' })),
    ),
  );
};

// ─── Editorial band (treatment B) ────────────────────────────────────────
const BandCard = ({ strap }) => {
  const [hover, setHover] = React.useState(false);
  const title = strap.name && strap.name !== MATERIAL_LABEL(strap.material)
    ? strap.name : `${strap.color} ${MATERIAL_LABEL(strap.material)}`;
  const fitCount = compatibleWatches(strap, OWNED_WATCHES, []).length;
  return React.createElement('a', {
    href: `${DRAWER_HREF}#strap=${strap.id}`,
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    style: {
      flex: '1 1 0', minWidth: 0, textDecoration: 'none', cursor: 'pointer',
      background: '#FFFCF7', border: `1px solid ${hover ? '#D4CBBF' : '#E8E2D8'}`,
      borderRadius: 9, overflow: 'hidden', display: 'block',
      boxShadow: hover ? '0 8px 22px rgba(26,20,16,0.10)' : '0 1px 4px rgba(26,20,16,0.04)',
      transform: hover ? 'translateY(-3px)' : 'none',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
    }
  },
    React.createElement('div', { style: { aspectRatio: '4 / 5', borderBottom: '1px solid #E8E2D8', overflow: 'hidden' } },
      strap.photoUrl
        ? React.createElement('div', { style: { width: '100%', height: '100%', background: 'radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF 0%, #FBF8F2 72%, #F4EFE6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement('img', { src: strap.photoUrl, alt: title, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '12px 4px', transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.3s ease' } }))
        : React.createElement(StrapSwatch, { swatchId: strap.swatchId, material: strap.material, height: '100%' }),
    ),
    React.createElement('div', { style: { padding: '10px 12px 12px' } },
      React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 8.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, strap.brand),
      React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 16, fontWeight: 400, color: '#1A1410', lineHeight: 1.1, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, title),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' } },
        React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, color: '#A8862F', background: '#FBF6EA', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 } }, `${strap.lugWidthMm} mm`),
        React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#A89880' } }, `Fits ${fitCount}`),
      ),
    ),
  );
};

const StrapDrawerBand = () => {
  // Curate: lead with the photographed straps (strongest visuals)
  const featured = [...STRAPS].sort((a, b) => (b.photoUrl ? 1 : 0) - (a.photoUrl ? 1 : 0)).slice(0, 5);
  const remaining = STRAPS.length - featured.length;
  const combos = totalCombos(OWNED_WATCHES, STRAPS, []);
  const [ctaHover, setCtaHover] = React.useState(false);
  const [allHover, setAllHover] = React.useState(false);

  return React.createElement('section', {
    style: { maxWidth: 1280, margin: '0 auto', padding: '4px 56px 8px' }
  },
    React.createElement('div', { style: { borderTop: '1px solid #EAE5DC', paddingTop: 34 } },
      // Header row
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 22 } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 10 } }, 'Also in your collection'),
          React.createElement('h2', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 34, fontWeight: 400, lineHeight: 1.04, color: '#1A1410', margin: '0 0 8px' } }, 'The Strap Drawer'),
          React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 13.5, color: '#6F6353', lineHeight: 1.5, margin: 0, maxWidth: 440, textWrap: 'pretty' } }, 'The leathers, rubbers and bracelets you swap between \u2014 and which of your watches each one fits.'),
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 } },
          React.createElement('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 12 } },
            React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6 } },
              React.createElement('span', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 22, fontWeight: 500, color: '#1A1410' } }, STRAPS.length),
              React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880' } }, 'straps'),
            ),
            React.createElement('span', { style: { width: 3, height: 3, borderRadius: '50%', background: '#D4CBBF' } }),
            React.createElement('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 6 } },
              React.createElement('span', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 22, fontWeight: 500, color: '#1A1410' } }, combos),
              React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880' } }, 'combinations'),
            ),
          ),
          React.createElement('a', {
            href: DRAWER_HREF,
            onMouseEnter: () => setCtaHover(true), onMouseLeave: () => setCtaHover(false),
            style: {
              display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none',
              fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '11px 20px', background: '#1A1410', color: '#FAF8F4', borderRadius: 4,
              opacity: ctaHover ? 0.9 : 1, transition: 'opacity 0.15s',
            }
          }, 'Open the drawer',
            React.createElement('span', { style: { display: 'inline-flex', transform: ctaHover ? 'translateX(3px)' : 'none', transition: 'transform 0.15s' } },
              React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d: 'M4 10h12' }), React.createElement('path', { d: 'M11 5l5 5-5 5' }))),
          ),
        ),
      ),
      // Cards row
      React.createElement('div', { className: 'strap-band-row', style: { display: 'flex', gap: 16 } },
        featured.map(s => React.createElement(BandCard, { key: s.id, strap: s })),
        // "View all" opener tile
        remaining > 0 && React.createElement('a', {
          key: 'view-all', href: DRAWER_HREF,
          onMouseEnter: () => setAllHover(true), onMouseLeave: () => setAllHover(false),
          style: {
            flex: '1 1 0', minWidth: 0, textDecoration: 'none', cursor: 'pointer',
            border: `1px solid ${allHover ? '#C9A84C' : '#E0D8CC'}`, borderRadius: 9,
            background: allHover ? '#FBF6EA' : 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: 16,
            boxShadow: allHover ? '0 8px 22px rgba(201,168,76,0.14)' : 'none',
            transform: allHover ? 'translateY(-3px)' : 'none',
            transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s, background 0.2s',
          }
        },
          // stacked strap-spine glyph
          React.createElement('div', { style: { display: 'flex', gap: 4, alignItems: 'center' } },
            ['#3A2A1E', '#5A2A2E', '#1C1C1C', '#4A5236', '#6E7355'].map((c, i) =>
              React.createElement('span', { key: i, style: { width: 7, height: 46, borderRadius: 3, background: c, boxShadow: '0 4px 10px rgba(26,20,16,0.16), inset 0 1px 0 rgba(255,255,255,0.14)' } })),
          ),
          React.createElement('div', { style: { textAlign: 'center' } },
            React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 26, fontWeight: 500, color: '#1A1410', lineHeight: 1 } }, `+${remaining}`),
            React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#6F6353', marginTop: 4 } }, 'more straps'),
          ),
          React.createElement('span', { style: {
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: allHover ? '#1A1410' : '#A8862F',
          } }, `View all ${STRAPS.length}`,
            React.createElement('span', { style: { display: 'inline-flex', transform: allHover ? 'translateX(2px)' : 'none', transition: 'transform 0.15s' } },
              React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d: 'M8 5l5 5-5 5' }))),
          ),
        ),
      ),
    ),
  );
};

Object.assign(window, { StrapHeaderLink, StrapDrawerBand });
