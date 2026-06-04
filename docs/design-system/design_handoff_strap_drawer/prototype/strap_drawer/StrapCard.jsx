// StrapCard.jsx — card, grid, filter/sort bar, and empty state.

// ─── Single card ─────────────────────────────────────────────────────────
const StrapCard = ({ strap, watches, overrides, focusWatch, active, onClick }) => {
  const [hover, setHover] = React.useState(false);
  const fitCount = compatibleWatches(strap, watches, overrides).length;
  const title = strap.name && strap.name !== MATERIAL_LABEL(strap.material)
    ? strap.name : `${strap.color} ${MATERIAL_LABEL(strap.material)}`;
  const focusState = focusWatch ? effectiveCompatibility(strap, focusWatch, overrides) : null;

  return React.createElement('article', {
    onClick, onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    style: {
      background: T.slot,
      border: active ? `1.5px solid rgba(201,168,76,0.85)` : `1px solid ${T.borderMid}`,
      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
      boxShadow: active ? '0 0 0 1px rgba(201,168,76,0.4), 0 8px 28px rgba(201,168,76,0.14)'
        : hover ? '0 8px 24px rgba(26,20,16,0.10)' : '0 1px 4px rgba(26,20,16,0.04)',
      transform: hover && !active ? 'translateY(-3px)' : active ? 'translateY(-2px)' : 'none',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
      display: 'flex', flexDirection: 'column',
    }
  },
    // Image / swatch — portrait 4:5
    React.createElement('div', { style: {
      position: 'relative', aspectRatio: '4 / 5', borderBottom: `1px solid ${T.borderMid}`,
      overflow: 'hidden',
    } },
      strap.photoUrl
        ? React.createElement('div', { style: {
            width: '100%', height: '100%',
            background: 'radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF 0%, #FBF8F2 72%, #F4EFE6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          } },
            React.createElement('img', { src: strap.photoUrl, alt: title, style: {
              width: '100%', height: '100%', objectFit: 'contain',
              padding: '14px 6px',
              transform: hover ? 'scale(1.035)' : 'scale(1)', transition: 'transform 0.3s ease',
            } })
          )
        : React.createElement(StrapSwatch, { swatchId: strap.swatchId, material: strap.material, height: '100%' }),
      // Photo / swatch tag
      React.createElement('div', { style: {
        position: 'absolute', top: 10, right: 10,
        fontFamily: T.sans, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: strap.photoUrl ? T.muted : T.borderLight,
        background: 'rgba(255,252,247,0.82)', padding: '2px 6px', borderRadius: 3,
        backdropFilter: 'blur(2px)',
      } }, strap.photoUrl ? 'Photo' : 'Swatch'),
    ),

    // Text block
    React.createElement('div', { style: { padding: '14px 16px 15px', flex: 1, display: 'flex', flexDirection: 'column' } },
      React.createElement(Kicker, { color: T.gold, style: { marginBottom: 5 } }, strap.brand),
      React.createElement('h3', { style: {
        fontFamily: T.serif, fontSize: 19, fontWeight: 400, lineHeight: 1.12, color: T.ink,
        margin: 0, marginBottom: 3,
      } }, title),
      React.createElement('div', { style: {
        fontFamily: T.sans, fontSize: 11, color: T.muted, letterSpacing: '0.02em', marginBottom: 12,
      } }, `${strap.color} \u00b7 ${strap.subMaterial}`),

      // Spec badges
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 13 } },
        React.createElement(SpecBadge, { tone: 'width' }, `${strap.lugWidthMm} mm`),
        React.createElement(SpecBadge, null, MATERIAL_LABEL(strap.material)),
        strap.style && React.createElement(SpecBadge, null, strap.style.charAt(0).toUpperCase() + strap.style.slice(1)),
      ),

      // Footer fit line — context-aware (focus mode shows the basis for that watch)
      focusWatch
        ? React.createElement('div', { style: {
            marginTop: 'auto', paddingTop: 11, borderTop: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 7,
          } },
            React.createElement('span', { style: {
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: focusState === 'fits' ? T.fitsText : focusState === 'unknown' ? T.gold : T.borderLight,
            } }),
            React.createElement('span', { style: {
              fontFamily: T.sans, fontSize: 11, fontWeight: 500,
              color: focusState === 'fits' ? T.inkSoft : T.muted, letterSpacing: '0.02em',
            } }, fitBasis(strap, focusWatch, overrides)),
          )
        : React.createElement('div', { style: {
            marginTop: 'auto', paddingTop: 11, borderTop: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 7,
          } },
            React.createElement('span', { style: {
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: fitCount > 0 ? T.gold : T.borderLight,
            } }),
            React.createElement('span', { style: {
              fontFamily: T.sans, fontSize: 11, fontWeight: fitCount > 0 ? 500 : 400,
              color: fitCount > 0 ? T.inkSoft : T.muted, letterSpacing: '0.02em',
            } },
              fitCount > 0 ? `Fits ${fitCount} of your watches` : 'No matching watches yet'),
          ),
    ),
  );
};

// ─── Grid ────────────────────────────────────────────────────────────────
const StrapGrid = ({ straps, watches, overrides, focusWatch, activeId, onSelect }) =>
  React.createElement('div', { style: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18,
  } },
    straps.map(s => React.createElement(StrapCard, {
      key: s.id, strap: s, watches, overrides, focusWatch,
      active: activeId === s.id, onClick: () => onSelect(s),
    })),
  );

// ─── Empty state ─────────────────────────────────────────────────────────
const EmptyDrawer = ({ onAdd }) =>
  React.createElement('div', { style: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
  } },
    React.createElement('div', { style: {
      maxWidth: 460, width: '100%', textAlign: 'center',
      background: T.slot, border: `1px solid ${T.borderMid}`, borderRadius: 14,
      padding: '52px 40px', boxShadow: '0 1px 4px rgba(26,20,16,0.04)',
    } },
      React.createElement('div', { style: {
        width: 56, height: 56, margin: '0 auto 22px', borderRadius: '50%',
        background: T.bg, border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      } },
        React.createElement('div', { style: {
          width: 9, height: 30, borderRadius: 3, background: T.borderLight,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
        } }),
      ),
      React.createElement('h2', { style: {
        fontFamily: T.serif, fontSize: 28, fontWeight: 400, color: T.ink, margin: '0 0 12px',
      } }, 'Your strap drawer is empty'),
      React.createElement('p', { style: {
        fontFamily: T.sans, fontSize: 13, lineHeight: 1.65, color: T.mutedDark,
        margin: '0 auto 26px', maxWidth: 340, textWrap: 'pretty',
      } }, 'Track the leathers, rubbers, NATOs and bracelets you swap between. We\u2019ll tell you which watches each one fits.'),
      React.createElement(PrimaryBtn, { onClick: onAdd },
        React.createElement(Icon, { name: 'plus', size: 14 }), 'Add your first strap'),
    )
  );

Object.assign(window, { StrapCard, StrapGrid, EmptyDrawer });
