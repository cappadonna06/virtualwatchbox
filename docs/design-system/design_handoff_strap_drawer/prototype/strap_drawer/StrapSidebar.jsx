// StrapSidebar.jsx — strap detail sheet (right panel on desktop, bottom sheet on mobile).

const reasonFor = (strap, watch, overrides) => {
  const ov = findOverride(overrides, strap.id, watch.id);
  if (ov) return ov.override === 'fits' ? 'Marked as fits' : 'Marked excluded';
  if (watch.braceletType === 'integrated') return 'Integrated bracelet';
  if (strap.lugWidthMm == null || watch.lugWidthMm == null) return 'Width unknown';
  if (strap.lugWidthMm === watch.lugWidthMm) return 'Lug width matches';
  return `Lug mismatch \u00b7 needs ${watch.lugWidthMm} mm`;
};

// Per-watch row used in both sections
const WatchRow = ({ strap, watch, overrides, state, onSetOverride, onRemoveOverride, onOpenWatch }) => {
  const ov = findOverride(overrides, strap.id, watch.id);
  const reason = reasonFor(strap, watch, overrides);
  return React.createElement('div', { style: {
    display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0',
    borderBottom: `1px solid ${T.border}`,
  } },
    React.createElement(WatchThumb, { watch, size: 56 }),
    React.createElement('div', { onClick: () => onOpenWatch && onOpenWatch(watch), style: { flex: 1, minWidth: 0, cursor: onOpenWatch ? 'pointer' : 'default' } },
      React.createElement('div', { style: {
        fontFamily: T.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: T.gold, marginBottom: 2,
      } }, watch.brand),
      React.createElement('div', { style: {
        fontFamily: T.serif, fontSize: 16, color: T.ink, lineHeight: 1.1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      } }, watch.model),
      React.createElement('div', { style: {
        fontFamily: T.sans, fontSize: 10.5, color: T.muted, marginTop: 2, letterSpacing: '0.02em',
      } }, watch.braceletType === 'integrated' ? `${watch.caseSizeMm} mm \u00b7 integrated` : `${watch.lugWidthMm} mm lugs \u00b7 ${reason}`),
    ),
    // Segmented override control
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
      React.createElement('div', { style: {
        display: 'inline-flex', background: T.bg, border: `1px solid ${T.borderMid}`,
        borderRadius: 6, padding: 2,
      } },
        [['fits', 'Fits'], ['excluded', 'Exclude']].map(([val, lbl]) => {
          const on = state === val;
          return React.createElement('button', {
            key: val,
            onClick: () => onSetOverride(watch.id, val),
            style: {
              fontFamily: T.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase', padding: '5px 8px', borderRadius: 4, border: 'none',
              cursor: 'pointer',
              background: on ? (val === 'fits' ? T.fitsText : T.dark) : 'transparent',
              color: on ? '#fff' : T.muted,
              transition: 'background 0.12s, color 0.12s',
            }
          }, lbl);
        }),
      ),
      ov && React.createElement('button', {
        title: 'Reset to automatic', onClick: () => onRemoveOverride(watch.id),
        style: {
          width: 22, height: 22, borderRadius: '50%', border: `1px solid ${T.borderMid}`,
          background: T.slot, color: T.muted, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }
      }, React.createElement(Icon, { name: 'close', size: 11 })),
    ),
  );
};

const SpecLine = ({ label, value }) => value == null || value === '' ? null :
  React.createElement('div', { style: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '8px 0', borderBottom: `1px solid ${T.border}`, gap: 16,
  } },
    React.createElement('span', { style: { fontFamily: T.sans, fontSize: 11.5, color: T.muted } }, label),
    React.createElement('span', { style: { fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.ink, textAlign: 'right' } }, value),
  );

const StrapSidebar = ({ strap, watches, overrides, onClose, onSetOverride, onRemoveOverride, onEdit, onDelete, onOpenWatch }) => {
  const [showOther, setShowOther] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  if (!strap) return null;

  const fits = watches.filter(w => effectiveCompatibility(strap, w, overrides) === 'fits');
  const others = watches.filter(w => effectiveCompatibility(strap, w, overrides) !== 'fits');
  const title = strap.name && strap.name !== MATERIAL_LABEL(strap.material)
    ? strap.name : `${strap.color} ${MATERIAL_LABEL(strap.material)}`;

  return React.createElement('div', { className: 'sd-sheet-scroll', style: { height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } },
    // Header bar
    React.createElement('div', { style: {
      position: 'sticky', top: 0, zIndex: 3, background: T.slot,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 22px', borderBottom: `1px solid ${T.border}`,
    } },
      React.createElement(Kicker, { color: T.muted }, 'Strap detail'),
      React.createElement('button', { onClick: onClose, style: {
        background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4, display: 'flex',
      } }, React.createElement(Icon, { name: 'close', size: 18 })),
    ),

    React.createElement('div', { style: { padding: '0 22px 24px' } },
      // Image
      React.createElement('div', { style: { margin: '18px -22px 0', borderBottom: `1px solid ${T.border}` } },
        strap.photoUrl
          ? React.createElement('div', { style: {
              background: 'radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF 0%, #FBF8F2 72%, #F4EFE6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280,
            } }, React.createElement('img', { src: strap.photoUrl, alt: title, style: { height: '100%', objectFit: 'contain', padding: '20px 0' } }))
          : React.createElement(StrapSwatch, { swatchId: strap.swatchId, material: strap.material, height: 260 }),
      ),

      // Title block
      React.createElement('div', { style: { padding: '20px 0 8px' } },
        React.createElement(Kicker, { color: T.gold, style: { marginBottom: 6 } }, strap.brand),
        React.createElement('h2', { style: {
          fontFamily: T.serif, fontSize: 28, fontWeight: 400, color: T.ink, lineHeight: 1.08, margin: '0 0 4px',
        } }, title),
        React.createElement('div', { style: { fontFamily: T.sans, fontSize: 12, color: T.muted } },
          `${strap.color} \u00b7 ${strap.subMaterial} ${MATERIAL_LABEL(strap.material).toLowerCase()}`),
        strap.notes && React.createElement('div', { style: {
          fontFamily: T.serif, fontStyle: 'italic', fontSize: 14.5, color: T.inkSoft, lineHeight: 1.5,
          marginTop: 14, paddingLeft: 12, borderLeft: `2px solid ${T.gold}`, textWrap: 'pretty',
        } }, strap.notes),
      ),

      // Specs
      React.createElement('div', { style: { marginTop: 8 } },
        React.createElement(SpecLine, { label: 'Material', value: `${MATERIAL_LABEL(strap.material)} \u00b7 ${strap.subMaterial}` }),
        React.createElement(SpecLine, { label: 'Color', value: strap.color }),
        React.createElement(SpecLine, { label: 'Lug width', value: `${strap.lugWidthMm} mm` }),
        React.createElement(SpecLine, { label: 'Tapered to', value: strap.taperedToMm ? `${strap.taperedToMm} mm` : null }),
        React.createElement(SpecLine, { label: 'Length', value: strap.lengthMm ? `${strap.lengthMm} mm` : null }),
        React.createElement(SpecLine, { label: 'Clasp', value: strap.clasp }),
        React.createElement(SpecLine, { label: 'Style', value: strap.style ? strap.style.charAt(0).toUpperCase() + strap.style.slice(1) : null }),
      ),

      // Purchase block
      strap.priceCents != null && React.createElement('div', { style: {
        marginTop: 18, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px',
      } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement('div', null,
            React.createElement(Kicker, { color: T.muted, style: { marginBottom: 4 } },
              strap.purchaseUrl ? `Bought from ${hostOf(strap.purchaseUrl)}` : 'Paid'),
            React.createElement('div', { style: { fontFamily: T.sans, fontSize: 18, fontWeight: 600, color: T.gold } }, money(strap.priceCents)),
          ),
          strap.purchaseUrl && React.createElement('a', {
            href: strap.purchaseUrl, target: '_blank', rel: 'noopener noreferrer', style: {
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.sans, fontSize: 10.5,
              fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink,
              textDecoration: 'none', border: `1px solid ${T.borderLight}`, borderRadius: 4, padding: '8px 12px',
            }
          }, 'Buy another', React.createElement(Icon, { name: 'arrowUpRight', size: 12 })),
        ),
      ),

      // Fits these watches
      React.createElement('div', { style: { marginTop: 26 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 } },
          React.createElement('h3', { style: { fontFamily: T.serif, fontSize: 19, fontWeight: 500, color: T.ink, margin: 0 } }, 'Fits these watches'),
          React.createElement('span', { style: { fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.gold } }, `${fits.length}`),
        ),
        fits.length === 0
          ? React.createElement('div', { style: { fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: T.muted, padding: '8px 0 4px' } },
              'None of your current watches match this strap.')
          : fits.map(w => React.createElement(WatchRow, {
              key: w.id, strap, watch: w, overrides, state: effectiveCompatibility(strap, w, overrides),
              onSetOverride, onRemoveOverride, onOpenWatch,
            })),
      ),

      // Other watches (collapsible)
      others.length > 0 && React.createElement('div', { style: { marginTop: 22 } },
        React.createElement('button', { onClick: () => setShowOther(o => !o), style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
          borderTop: `1px solid ${T.border}`,
        } },
          React.createElement('span', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
            React.createElement('span', { style: { fontFamily: T.serif, fontSize: 18, fontWeight: 500, color: T.inkSoft } }, 'Other watches'),
            React.createElement('span', { style: { fontFamily: T.sans, fontSize: 11, color: T.muted } }, `${others.length}`),
          ),
          React.createElement('span', { style: { color: T.muted, display: 'flex', transform: showOther ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' } },
            React.createElement(Icon, { name: 'chevDown', size: 15 })),
        ),
        showOther && React.createElement('div', { style: { marginTop: 2 } },
          React.createElement('p', { style: { fontFamily: T.sans, fontSize: 11, color: T.muted, lineHeight: 1.5, margin: '2px 0 8px' } },
            'Override the automatic call when you know better.'),
          others.map(w => React.createElement(WatchRow, {
            key: w.id, strap, watch: w, overrides, state: effectiveCompatibility(strap, w, overrides),
            onSetOverride, onRemoveOverride, onOpenWatch,
          })),
        ),
      ),

      // Actions
      React.createElement('div', { style: { display: 'flex', gap: 10, marginTop: 26 } },
        React.createElement(GhostBtn, { full: true, onClick: () => onEdit(strap) },
          React.createElement(Icon, { name: 'edit', size: 14 }), 'Edit'),
        React.createElement('button', { onClick: () => setConfirmDel(true), style: {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: 52,
          fontFamily: T.sans, fontSize: 11, fontWeight: 500, background: 'transparent', color: '#8A2020',
          border: `1px solid ${T.borderLight}`, borderRadius: 4, cursor: 'pointer',
        } }, React.createElement(Icon, { name: 'trash', size: 15 })),
      ),
    ),

    // Delete confirm overlay
    confirmDel && React.createElement('div', { style: {
      position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.45)', zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    } },
      React.createElement('div', { style: {
        background: T.slot, borderRadius: 12, padding: 24, maxWidth: 300, textAlign: 'center',
        boxShadow: '0 12px 40px rgba(26,20,16,0.3)',
      } },
        React.createElement('h3', { style: { fontFamily: T.serif, fontSize: 21, fontWeight: 400, color: T.ink, margin: '0 0 8px' } }, 'Delete this strap?'),
        React.createElement('p', { style: { fontFamily: T.sans, fontSize: 12, color: T.mutedDark, lineHeight: 1.5, margin: '0 0 18px' } },
          'This removes the strap and any fit overrides you set for it.'),
        React.createElement('div', { style: { display: 'flex', gap: 8 } },
          React.createElement(GhostBtn, { full: true, onClick: () => setConfirmDel(false) }, 'Cancel'),
          React.createElement('button', { onClick: () => { setConfirmDel(false); onDelete(strap); }, style: {
            flex: 1, fontFamily: T.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em',
            textTransform: 'uppercase', background: '#8A2020', color: '#fff', border: 'none',
            borderRadius: 4, cursor: 'pointer', padding: '10px',
          } }, 'Delete'),
        ),
      ),
    ),
  );
};

Object.assign(window, { StrapSidebar });
