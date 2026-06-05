// WatchSidebar.jsx — Detail sidebar used across collection + playground

const WatchSidebar = ({ watch, mode = 'collection', onClose, onDelete }) => {
  const s = {
    panel: {
      background: '#FFFFFF', borderLeft: '1px solid #E8E2D8',
      width: 'min(360px,100vw)', height: '100%', overflowY: 'auto',
      boxShadow: '-8px 0 32px rgba(26,20,16,0.09)',
      padding: 24,
    },
    metaLabel: {
      fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880',
    },
    specRow: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '9px 0', borderBottom: '1px solid #F0EBE3', fontSize: 12,
    },
  };

  if (!watch) return React.createElement('div', {
    style: {
      ...s.panel, display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 400,
    }
  },
    React.createElement('div', { style: { textAlign: 'center' } },
      React.createElement('div', { style: { ...s.metaLabel, marginBottom: 10 } }, 'Select a Watch'),
      React.createElement('div', {
        style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 18, color: '#D4CBBF' }
      }, 'Click any slot to view details')
    )
  );

  const condStyle = CONDITION_STYLES[watch.condition] || CONDITION_STYLES['Excellent'];
  const specs = [
    ['Case Size', `${watch.caseSizeMm}mm`],
    ['Case Material', watch.caseMaterial],
    ['Dial Color', watch.dialColor],
    ['Movement', watch.movement],
    ['Complications', watch.complications.join(', ') || '—'],
    ...(mode === 'collection' ? [['Price Paid', fmt(watch.purchasePrice)]] : []),
  ];

  return React.createElement('div', { style: s.panel },
    // Header row
    React.createElement('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }
    },
      React.createElement('span', { style: s.metaLabel }, 'Watch Detail'),
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        mode === 'collection' && onDelete && React.createElement('button', {
          onClick: () => onDelete(watch),
          title: 'Remove',
          style: {
            width: 24, height: 24, borderRadius: 6, border: '1px solid #E8E2D8',
            background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#A89880', fontSize: 11,
          }
        },
          React.createElement('svg', { width: 11, height: 11, viewBox: '0 0 12 12', fill: 'none' },
            React.createElement('path', { d: 'M4.5 1.5h3l.3.8H10v1H2v-1h2.2l.3-.8zM3 4h6l-.5 6.2a.8.8 0 01-.8.8H4.3a.8.8 0 01-.8-.8L3 4zm2 1v5h1V5H5zm2 0v5h1V5H7z', fill: 'currentColor' })
          )
        ),
        onClose && React.createElement('button', {
          onClick: onClose,
          style: { background: 'none', border: 'none', cursor: 'pointer', color: '#A89880', fontSize: 18, lineHeight: 1, padding: 4 }
        }, '✕')
      )
    ),

    // Dial
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 16 } },
      React.createElement(DialSVG, { ...watch.dialConfig, size: 140 })
    ),

    // Brand
    React.createElement('div', { style: { ...s.metaLabel, marginBottom: 4 } }, watch.brand.toUpperCase()),

    // Model + condition badge
    React.createElement('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }
    },
      React.createElement('h3', {
        style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 26, fontWeight: 400, lineHeight: 1.1, color: '#1A1410', margin: 0 }
      }, watch.model),
      React.createElement('span', {
        style: { fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', padding: '3px 10px', borderRadius: 20, background: condStyle.background, color: condStyle.color, flexShrink: 0 }
      }, watch.condition)
    ),
    React.createElement('div', { style: { fontSize: 12, color: '#A89880', marginBottom: 4 } }, `Ref. ${watch.reference}`),
    watch.notes && React.createElement('div', {
      style: { fontSize: 11, color: '#C9A84C', fontStyle: 'italic', marginBottom: 14 }
    }, `"${watch.notes}"`),

    // Est. value
    React.createElement('div', {
      style: {
        background: '#FAF8F4', border: '1px solid #EAE5DC', borderRadius: 8,
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        margin: '16px 0',
      }
    },
      React.createElement('span', { style: { ...s.metaLabel } }, 'Est. Market Value'),
      React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 18, fontWeight: 600, color: '#C9A84C' } }, fmt(watch.estimatedValue))
    ),

    // Specs
    React.createElement('div', { style: { marginBottom: 16 } },
      specs.map(([label, value]) =>
        React.createElement('div', { key: label, style: s.specRow },
          React.createElement('span', { style: { color: '#A89880', fontWeight: 400, fontFamily: 'DM Sans,sans-serif' } }, label),
          React.createElement('span', { style: { color: '#1A1410', fontWeight: 500, fontFamily: 'DM Sans,sans-serif', textAlign: 'right', maxWidth: '55%' } }, value)
        )
      )
    ),

    // CTAs
    mode === 'playground'
      ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          React.createElement('a', {
            href: `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(watch.brand+' '+watch.model)}`,
            target: '_blank', rel: 'noopener noreferrer',
            style: { display: 'block', fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', padding: '9px 18px', background: '#1A1410', color: '#FAF8F4', border: 'none', borderRadius: 4, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }
          }, 'Find For Sale ↗'),
          React.createElement('button', {
            style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', padding: '9px 18px', background: 'transparent', color: '#1A1410', border: '1px solid #D4CBBF', borderRadius: 4, cursor: 'pointer', width: '100%' }
          }, 'Add to My Collection'),
          React.createElement('button', {
            onClick: onClose,
            style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', padding: '6px', background: 'transparent', color: '#A89880', border: 'none', cursor: 'pointer', textDecoration: 'underline', width: '100%' }
          }, 'Remove from Box')
        )
      : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          React.createElement('a', {
            href: `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(watch.brand+' '+watch.model)}`,
            target: '_blank', rel: 'noopener noreferrer',
            style: { display: 'block', fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', padding: '9px 18px', background: '#1A1410', color: '#FAF8F4', border: 'none', borderRadius: 4, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }
          }, 'Find For Sale ↗'),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            React.createElement('button', {
              style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', padding: '9px', background: 'transparent', color: '#1A1410', border: '1px solid #D4CBBF', borderRadius: 4, cursor: 'pointer' }
            }, 'Sell This Watch'),
            React.createElement('button', {
              style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', padding: '9px', background: 'transparent', color: '#1A1410', border: '1px solid #D4CBBF', borderRadius: 4, cursor: 'pointer' }
            }, 'Swap Strap')
          )
        )
  );
};

Object.assign(window, { WatchSidebar });
