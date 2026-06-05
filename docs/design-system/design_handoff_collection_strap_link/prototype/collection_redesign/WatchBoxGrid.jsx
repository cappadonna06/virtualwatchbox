// WatchBoxGrid.jsx — extracted from HomePage so the collection page doesn't
// need to load the full home page.

const HoverCard = ({ watch }) =>
  React.createElement('div', {
    style: {
      position: 'absolute', left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(100% + 8px)', zIndex: 20,
      background: '#FFFCF7', border: '1px solid #E8E2D8',
      borderRadius: 10, padding: 12, width: 180,
      boxShadow: '0 8px 24px rgba(26,20,16,0.13)',
      pointerEvents: 'none', whiteSpace: 'nowrap',
    }
  },
    React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9, color: '#A89880', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 } }, watch.brand.toUpperCase()),
    React.createElement('p', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 16, color: '#1A1410', fontWeight: 500, lineHeight: 1.2, marginBottom: 3 } }, watch.model),
    React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#A89880', marginBottom: 8 } }, `Ref. ${watch.reference}`),
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E8E2D8', paddingTop: 8 } },
      React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#A89880' } }, `${watch.caseSizeMm}mm`),
      React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#C9A84C', fontWeight: 600 } }, fmt(watch.estimatedValue))
    ),
    React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9, color: '#A89880', marginTop: 5, textAlign: 'right' } }, 'Click to expand ↗')
  );

const WatchBoxGrid = ({ watches, slotCount, activeIdx, onSlotClick }) => {
  const [hovered, setHovered] = React.useState(null);
  const overflowCount = Math.max(0, watches.length - (slotCount - 1));
  const visible = watches.slice(0, overflowCount > 0 ? slotCount - 1 : slotCount);

  return React.createElement('div', {
    style: {
      background: 'linear-gradient(180deg, #C9A04C 0%, #B58836 100%)',
      border: '1px solid #A87A2E', borderRadius: 12, padding: 14,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
      boxShadow: '0 8px 28px rgba(26,20,16,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
    }
  },
    ...[...Array(slotCount)].map((_, i) => {
      const isOverflowSlot = overflowCount > 0 && i === slotCount - 1;
      if (isOverflowSlot) {
        return React.createElement('div', {
          key: 'overflow',
          style: {
            aspectRatio: '3/4', borderRadius: 8, background: '#F5EFE5',
            border: '1.5px solid #D4CBBF', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer',
          }
        },
          React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 18, fontWeight: 600, color: '#1A1410' } }, `+${overflowCount}`),
          React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 8, letterSpacing: '0.08em', color: '#A89880' } }, 'MORE')
        );
      }
      const watch = visible[i];
      if (!watch) {
        return React.createElement('div', {
          key: i,
          onClick: () => onSlotClick(null),
          style: {
            aspectRatio: '3/4', borderRadius: 8, background: '#F5EFE5',
            border: '1.5px dashed #D0C9BE', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
            color: '#A89880',
          }
        },
          React.createElement('span', { style: { fontSize: 22, color: '#D4CBBF', lineHeight: 1 } }, '+'),
          React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 7.5, letterSpacing: '0.08em' } }, 'ADD')
        );
      }
      const isActive = activeIdx === i;
      const isHov = hovered === i;
      return React.createElement('div', {
        key: i,
        onClick: () => onSlotClick(i),
        onMouseEnter: () => setHovered(i),
        onMouseLeave: () => setHovered(null),
        style: {
          aspectRatio: '3/4', borderRadius: 8, background: '#FFFCF7',
          border: `1.5px solid ${isActive ? '#C9A84C' : isHov ? '#C9A84C' : '#E0DAD0'}`,
          boxShadow: isActive ? '0 0 0 1px rgba(201,168,76,0.4),0 6px 24px rgba(201,168,76,0.12)' : isHov ? '0 4px 16px rgba(201,168,76,0.16)' : '0 1px 4px rgba(26,20,16,0.05)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 12, overflow: 'hidden',
        }
      },
        React.createElement('span', { style: { position: 'absolute', top: 7, left: 9, fontFamily: 'DM Sans,sans-serif', fontSize: 8, color: '#A89880', letterSpacing: '0.05em', zIndex: 2 } }, String(i+1).padStart(2,'0')),
        watch.imageUrl
          ? React.createElement('img', { src: watch.imageUrl, alt: watch.model, style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(26,20,16,0.18))' } })
          : React.createElement(DialSVG, { ...watch.dialConfig, size: 72 }),
        isHov && React.createElement(HoverCard, { watch })
      );
    })
  );
};

Object.assign(window, { WatchBoxGrid, HoverCard });
