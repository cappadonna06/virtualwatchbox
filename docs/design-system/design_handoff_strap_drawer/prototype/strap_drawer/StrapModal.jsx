// StrapModal.jsx — add / edit strap modal with live swatch preview.

// Best-guess swatch id from material + sub-material + color name
const deriveSwatchId = (material, sub, colorName) => {
  const c = (colorName || '').toLowerCase();
  const colorKey = c.includes('black') ? 'black'
    : c.includes('cognac') ? 'cognac'
    : c.includes('tan') ? 'tan'
    : c.includes('navy') || c.includes('blue') ? 'navy'
    : c.includes('olive') || c.includes('green') || c.includes('sage') ? 'olive'
    : c.includes('grey') || c.includes('gray') ? 'grey'
    : c.includes('burgundy') || c.includes('mahogany') || c.includes('oxblood') ? 'brown'
    : c.includes('brown') || c.includes('chestnut') ? 'brown'
    : c.includes('orange') ? 'orange' : 'brown';
  const s = (sub || '').toLowerCase();
  if (material === 'metal') {
    const k = s.includes('jubilee') ? 'jubilee' : s.includes('milanese') ? 'milanese'
      : s.includes('mesh') ? 'mesh' : 'oyster';
    return `metal-${k}-steel`;
  }
  if (material === 'rubber' || material === 'silicone') {
    const rc = ['black', 'navy', 'grey', 'orange'].includes(colorKey) ? colorKey : 'black';
    return `rubber-${rc}`;
  }
  if (material === 'nylon') {
    const nc = ['black', 'grey', 'olive', 'navy'].includes(colorKey) ? colorKey : 'navy';
    return `nato-${nc}`;
  }
  if (material === 'fabric' || material === 'canvas') {
    const fc = ['black', 'navy', 'grey'].includes(colorKey) ? colorKey : 'grey';
    return `sailcloth-${fc}`;
  }
  // leather + exotic + other
  if (s.includes('alligator') || s.includes('croc') || material === 'exotic') {
    const ac = ['black', 'brown', 'navy'].includes(colorKey) ? colorKey : 'black';
    return `leather-alligator-${ac}`;
  }
  if (s.includes('suede')) return colorKey === 'brown' ? 'suede-brown' : 'suede-grey';
  const lc = ['black', 'brown', 'cognac', 'tan', 'navy'].includes(colorKey) ? colorKey : 'brown';
  return `leather-smooth-${lc}`;
};

// Pill row helper
const PillRow = ({ options, value, onChange, multi, counts }) =>
  React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 7 } },
    options.map(opt => {
      const val = Array.isArray(opt) ? opt[0] : opt;
      const lbl = Array.isArray(opt) ? opt[1] : opt;
      const on = multi ? (value || []).includes(val) : value === val;
      return React.createElement('button', {
        key: val, type: 'button', onClick: () => onChange(val), style: {
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontFamily: T.sans, fontSize: 12, fontWeight: on ? 600 : 500, letterSpacing: '0.02em',
          padding: '8px 13px', borderRadius: 7, cursor: 'pointer',
          background: on ? T.ink : T.slot, color: on ? T.slot : T.inkSoft,
          border: `1px solid ${on ? T.ink : T.borderMid}`, transition: 'all 0.13s',
        }
      },
        lbl,
        counts && counts[val] != null && React.createElement('span', { style: {
          fontSize: 9.5, fontWeight: 600, color: on ? 'rgba(255,255,255,0.7)' : (counts[val] > 0 ? T.gold : T.muted),
        } }, `(${counts[val]})`),
      );
    }),
  );

const Field = ({ label, children, hint }) =>
  React.createElement('div', { style: { marginBottom: 16 } },
    React.createElement('div', { style: {
      fontFamily: T.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: T.muted, marginBottom: 8,
    } }, label, hint && React.createElement('span', { style: { textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: T.borderLight, marginLeft: 6 } }, hint)),
    children,
  );

const inputStyle = {
  width: '100%', fontFamily: T.sans, fontSize: 13, color: T.ink, background: T.slot,
  border: `1px solid ${T.borderMid}`, borderRadius: 6, padding: '9px 11px', outline: 'none',
};

const StrapModal = ({ initial, watches, onSave, onClose }) => {
  const editing = !!initial;
  const [f, setF] = React.useState(() => initial ? { ...initial } : {
    material: 'leather', subMaterial: 'Smooth', color: '', colorHex: '#6A4426',
    lugWidthMm: null, name: '', brand: '', style: null, taperedToMm: '', lengthMm: '',
    clasp: '', priceCents: '', purchaseUrl: '', notes: '', photoUrl: null,
  });
  const [showDetails, setShowDetails] = React.useState(editing);
  const set = (patch) => setF(prev => ({ ...prev, ...patch }));

  const widthCounts = {}; COMMON_WIDTHS.forEach(w => widthCounts[w] = watchesAtWidth(watches, w));
  const subs = SUB_MATERIALS[f.material] || [];
  const swatchId = f.swatchId && editing ? f.swatchId : deriveSwatchId(f.material, f.subMaterial, f.color);
  const canSave = f.material && f.color.trim() && f.lugWidthMm;

  const previewTitle = f.name?.trim() || (f.color ? `${f.color} ${MATERIAL_LABEL(f.material)}` : `New ${MATERIAL_LABEL(f.material)} strap`);

  const handleSave = () => {
    if (!canSave) return;
    const out = {
      ...f,
      id: initial?.id || 'str-' + Math.random().toString(36).slice(2, 8),
      swatchId,
      taperedToMm: f.taperedToMm ? parseInt(f.taperedToMm, 10) : null,
      lengthMm: f.lengthMm ? parseInt(f.lengthMm, 10) : null,
      priceCents: f.priceCents !== '' && f.priceCents != null ? parseInt(f.priceCents, 10) : null,
      sortOrder: initial?.sortOrder ?? 999,
    };
    onSave(out);
  };

  return React.createElement('div', { className: 'sd-modal-card', style: {
    background: T.slot, borderRadius: 14, width: 'min(880px, 100%)', maxHeight: '92vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 24px 70px rgba(26,20,16,0.34)',
  } },
    // Header
    React.createElement('div', { style: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
    } },
      React.createElement('div', null,
        React.createElement(Kicker, { color: T.gold, style: { marginBottom: 4 } }, editing ? 'Edit strap' : 'Add strap'),
        React.createElement('h2', { style: { fontFamily: T.serif, fontSize: 23, fontWeight: 400, color: T.ink, margin: 0, whiteSpace: 'nowrap' } },
          editing ? 'Update the details' : 'New strap'),
      ),
      React.createElement('button', { onClick: onClose, style: { background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4, display: 'flex' } },
        React.createElement(Icon, { name: 'close', size: 19 })),
    ),

    // Body — preview + form
    React.createElement('div', { className: 'sd-modal-body', style: { display: 'flex', minHeight: 0, flex: 1 } },
      // Preview rail
      React.createElement('div', { className: 'sd-modal-preview', style: {
        width: 270, flexShrink: 0, borderRight: `1px solid ${T.border}`, padding: 22,
        display: 'flex', flexDirection: 'column', background: T.bg,
      } },
        React.createElement('div', { style: { borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.borderMid}` } },
          f.photoUrl
            ? React.createElement('div', { style: { height: 230, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                React.createElement('img', { src: f.photoUrl, alt: 'preview', style: { height: '100%', objectFit: 'contain', padding: 16 } }))
            : React.createElement(StrapSwatch, { swatchId, material: f.material, height: 230 }),
        ),
        React.createElement('div', { style: { marginTop: 16 } },
          React.createElement(Kicker, { color: T.gold, style: { marginBottom: 5 } }, f.brand || 'Your strap'),
          React.createElement('div', { style: { fontFamily: T.serif, fontSize: 20, color: T.ink, lineHeight: 1.12, marginBottom: 8 } }, previewTitle),
          React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5 } },
            f.lugWidthMm && React.createElement(SpecBadge, { tone: 'width' }, `${f.lugWidthMm} mm`),
            React.createElement(SpecBadge, null, MATERIAL_LABEL(f.material)),
            f.style && React.createElement(SpecBadge, null, f.style.charAt(0).toUpperCase() + f.style.slice(1)),
          ),
          f.lugWidthMm && React.createElement('div', { style: { marginTop: 14, fontFamily: T.sans, fontSize: 11, color: T.mutedDark, lineHeight: 1.5 } },
            React.createElement('span', { style: { color: T.gold, fontWeight: 600 } }, `${watchesAtWidth(watches, f.lugWidthMm)} `),
            `of your watches use ${f.lugWidthMm} mm lugs.`),
        ),
      ),

      // Form scroll
      React.createElement('div', { className: 'sd-modal-form', style: { flex: 1, overflowY: 'auto', padding: '22px 24px' } },
        React.createElement(Field, { label: 'Material' },
          React.createElement(PillRow, {
            options: MATERIALS.map(m => [m, MATERIAL_LABEL(m)]), value: f.material,
            onChange: (m) => set({ material: m, subMaterial: (SUB_MATERIALS[m] || [])[0] || '' }),
          })),

        subs.length > 0 && React.createElement(Field, { label: 'Sub-material' },
          React.createElement(PillRow, { options: subs, value: f.subMaterial, onChange: (s) => set({ subMaterial: s }) })),

        React.createElement(Field, { label: 'Color', hint: '· required' },
          React.createElement('input', { style: { ...inputStyle, marginBottom: 9 }, placeholder: 'e.g. Cognac', value: f.color, onChange: e => set({ color: e.target.value }) }),
          React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            COMMON_COLORS.map(([name, hex]) => React.createElement('button', {
              key: name, type: 'button', onClick: () => set({ color: name, colorHex: hex }), style: {
                display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.sans, fontSize: 11,
                fontWeight: 500, padding: '5px 10px 5px 6px', borderRadius: 20, cursor: 'pointer',
                background: f.color === name ? T.ink : T.slot, color: f.color === name ? T.slot : T.inkSoft,
                border: `1px solid ${f.color === name ? T.ink : T.borderMid}`,
              }
            },
              React.createElement('span', { style: { width: 14, height: 14, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.15)' } }),
              name,
            )),
          )),

        React.createElement(Field, { label: 'Lug width', hint: '· required · ( ) = your watches' },
          React.createElement(PillRow, {
            options: COMMON_WIDTHS.map(w => [w, `${w} mm`]), value: f.lugWidthMm,
            onChange: (w) => set({ lugWidthMm: w }), counts: widthCounts,
          })),

        // Details toggle
        React.createElement('button', { type: 'button', onClick: () => setShowDetails(d => !d), style: {
          display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 0 6px', marginTop: 6, width: '100%', borderTop: `1px solid ${T.border}`,
        } },
          React.createElement('span', { style: { color: T.muted, display: 'flex', transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' } },
            React.createElement(Icon, { name: 'chevDown', size: 15 })),
          React.createElement('span', { style: { fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.inkSoft } }, 'Details'),
          React.createElement('span', { style: { fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.muted } }, 'optional'),
        ),

        showDetails && React.createElement('div', { style: { paddingTop: 10 } },
          React.createElement('div', { className: 'sd-form-2col', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
            React.createElement(Field, { label: 'Name' },
              React.createElement('input', { style: inputStyle, placeholder: 'e.g. Brown Hirsch Rally', value: f.name, onChange: e => set({ name: e.target.value }) })),
            React.createElement(Field, { label: 'Brand' },
              React.createElement('input', { style: inputStyle, placeholder: 'e.g. Delugs', value: f.brand, onChange: e => set({ brand: e.target.value }) })),
          ),
          React.createElement(Field, { label: 'Style' },
            React.createElement(PillRow, { options: STYLES.map(s => [s, s.charAt(0).toUpperCase() + s.slice(1)]), value: f.style, onChange: (s) => set({ style: f.style === s ? null : s }) })),
          React.createElement('div', { className: 'sd-form-2col', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
            React.createElement(Field, { label: 'Tapered to (mm)' },
              React.createElement('input', { type: 'number', style: inputStyle, placeholder: '16', value: f.taperedToMm, onChange: e => set({ taperedToMm: e.target.value }) })),
            React.createElement(Field, { label: 'Length (mm)' },
              React.createElement('input', { type: 'number', style: inputStyle, placeholder: '115', value: f.lengthMm, onChange: e => set({ lengthMm: e.target.value }) })),
          ),
          React.createElement(Field, { label: 'Clasp type' },
            React.createElement('input', { style: inputStyle, placeholder: 'e.g. Steel pin buckle', value: f.clasp, onChange: e => set({ clasp: e.target.value }) })),
          React.createElement('div', { className: 'sd-form-2col', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
            React.createElement(Field, { label: 'Price paid (USD)' },
              React.createElement('input', { type: 'number', style: inputStyle, placeholder: '189', value: f.priceCents !== '' && f.priceCents != null ? Math.round(f.priceCents / 100) : '', onChange: e => set({ priceCents: e.target.value === '' ? '' : parseInt(e.target.value, 10) * 100 }) })),
            React.createElement(Field, { label: 'Purchase URL' },
              React.createElement('input', { style: inputStyle, placeholder: 'https://\u2026', value: f.purchaseUrl, onChange: e => set({ purchaseUrl: e.target.value }) })),
          ),
          React.createElement(Field, { label: 'Notes' },
            React.createElement('textarea', { style: { ...inputStyle, minHeight: 64, resize: 'vertical', lineHeight: 1.5 }, placeholder: 'When you reach for it, what it pairs with\u2026', value: f.notes, onChange: e => set({ notes: e.target.value }) })),
          React.createElement(Field, { label: 'Photo' },
            React.createElement('div', { style: {
              border: `1.5px dashed ${T.borderLight}`, borderRadius: 10, padding: '22px 16px', textAlign: 'center',
              background: T.bg, cursor: 'pointer',
            } },
              React.createElement('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8, color: T.borderLight } },
                React.createElement(Icon, { name: 'photo', size: 22 })),
              React.createElement('div', { style: { fontFamily: T.sans, fontSize: 12, color: T.mutedDark } }, 'Drop a photo, or ',
                React.createElement('span', { style: { color: T.gold, fontWeight: 600 } }, 'browse')),
              React.createElement('div', { style: { fontFamily: T.sans, fontSize: 10.5, color: T.muted, marginTop: 4 } }, 'JPG, PNG, WEBP or HEIC \u00b7 processed to 1600px'),
            )),
        ),
      ),
    ),

    // Footer
    React.createElement('div', { style: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '14px 24px', borderTop: `1px solid ${T.border}`, flexShrink: 0, background: T.slot,
    } },
      React.createElement('span', { style: { fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: canSave ? T.muted : T.borderLight } },
        canSave ? 'Ready to save' : 'Material, color and lug width required'),
      React.createElement('div', { style: { display: 'flex', gap: 10 } },
        React.createElement(GhostBtn, { onClick: onClose }, 'Cancel'),
        React.createElement(PrimaryBtn, { onClick: handleSave, style: { opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? 'auto' : 'none' } },
          editing ? 'Save changes' : 'Add strap'),
      ),
    ),
  );
};

Object.assign(window, { StrapModal, deriveSwatchId });
