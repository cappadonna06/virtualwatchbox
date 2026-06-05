// HomePage.jsx — Homepage with hero + watch box + features

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
      background: '#EDE9E2', border: '1px solid #E0DAD0', borderRadius: 12, padding: 12,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
    }
  },
    ...[...Array(slotCount)].map((_, i) => {
      const isOverflowSlot = overflowCount > 0 && i === slotCount - 1;
      if (isOverflowSlot) {
        return React.createElement('div', {
          key: 'overflow',
          style: {
            aspectRatio: '3/4', borderRadius: 8, background: '#E8E4DC',
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
            aspectRatio: '3/4', borderRadius: 8, background: '#FFFCF7',
            border: '1.5px dashed #D0C9BE', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
            color: '#A89880',
          }
        },
          React.createElement('span', { style: { fontSize: 22, color: '#D4CBBF', lineHeight: 1 } }, '+'),
          React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 7.5, letterSpacing: '0.08em' } }, 'ADD WATCH')
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
        }
      },
        React.createElement('span', { style: { position: 'absolute', top: 7, left: 9, fontFamily: 'DM Sans,sans-serif', fontSize: 8, color: '#A89880', letterSpacing: '0.05em' } }, String(i+1).padStart(2,'0')),
        React.createElement(DialSVG, { ...watch.dialConfig, size: 72 }),
        isHov && React.createElement(HoverCard, { watch })
      );
    })
  );
};

const FEATURES = [
  ['01', 'Playground Mode',   'Build dream boxes with any reference. Save and share your fantasy collection.'],
  ['02', 'Strap Matchmaker',  'Virtually swap straps with compatibility filtering by lug width.'],
  ['03', 'Virtual Try-On',    'Upload a wrist photo. See the watch on you before committing.'],
  ['04', 'Smart Suggestions', 'Personalized picks based on your collection and taste.'],
  ['05', 'Buy & Sell',        'AI-assisted pricing, one-click post to Chrono24 & eBay.'],
];

const ARTICLES = [
  { headline: 'The New Rolex Submariner: Every Change, Explained', source: 'Hodinkee', date: 'Apr 22, 2026' },
  { headline: "Why the Royal Oak's Value Story Is Far From Over", source: 'Fratello', date: 'Apr 20, 2026' },
  { headline: 'Patek Philippe Nautilus: A Complete Reference Guide', source: 'Monochrome', date: 'Apr 18, 2026' },
];

const HomePage = ({ setPage }) => {
  const [activeIdx, setActiveIdx] = React.useState(null);
  const [activeSidebarWatch, setActiveSidebarWatch] = React.useState(null);
  const [liked, setLiked] = React.useState(new Set());
  const [carouselIdx, setCarouselIdx] = React.useState(0);

  const handleSlotClick = idx => {
    if (idx === null) return;
    if (activeIdx === idx) { setActiveIdx(null); setActiveSidebarWatch(null); }
    else { setActiveIdx(idx); setActiveSidebarWatch(WATCHES[idx]); }
  };

  const watch = WATCHES[carouselIdx];
  const isLiked = liked.has(watch.id);

  return React.createElement('div', null,
    // Hero
    React.createElement('section', { style: { borderBottom: '1px solid #EAE5DC' } },
      React.createElement('div', {
        style: { display: 'grid', gridTemplateColumns: '1fr 440px', minHeight: 420, alignItems: 'stretch' }
      },
        // Left
        React.createElement('div', { style: { padding: '72px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 20 } }, 'The Digital Home for Every Collector'),
          React.createElement('h1', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 'clamp(48px,5vw,72px)', fontWeight: 300, lineHeight: 1.0, letterSpacing: '-0.01em', color: '#1A1410', marginBottom: 24 } },
            'Showcase Your', React.createElement('br'), React.createElement('em', { style: { fontStyle: 'italic', fontWeight: 300 } }, 'Timepieces.')
          ),
          React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 13, lineHeight: 1.9, color: '#A89880', maxWidth: 360, marginBottom: 32 } }, 'Organize what you own, explore what you want, discover what\'s next.'),
          React.createElement('div', { style: { display: 'flex', gap: 12 } },
            React.createElement('button', {
              onClick: () => setPage('collection'),
              style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', padding: '12px 28px', background: '#1A1410', color: '#FAF8F4', border: 'none', borderRadius: 4, cursor: 'pointer' }
            }, 'Build Your Box'),
            React.createElement('button', {
              style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', padding: '12px 28px', background: 'transparent', color: '#1A1410', border: '1px solid #D4CBBF', borderRadius: 4, cursor: 'pointer' }
            }, 'Explore Watches')
          )
        ),
        // Right dark panel
        React.createElement('div', {
          style: {
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(160deg,#1e1b16 0%,#2a2420 100%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '28px 24px 0',
          }
        },
          React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 55% at 50% 60%,rgba(201,168,76,0.08) 0%,transparent 70%)', pointerEvents: 'none' } }),
          // Like btn
          React.createElement('button', {
            onClick: () => setLiked(prev => { const n = new Set(prev); isLiked ? n.delete(watch.id) : n.add(watch.id); return n; }),
            style: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: isLiked ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)', border: isLiked ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: isLiked ? '#C9A84C' : 'rgba(255,255,255,0.7)' }
          }, isLiked ? '♥' : '♡'),
          // Prev
          React.createElement('button', { onClick: () => setCarouselIdx(i => (i - 1 + WATCHES.length) % WATCHES.length), style: { position: 'absolute', top: '50%', left: 12, zIndex: 10, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 } }, '‹'),
          // Next
          React.createElement('button', { onClick: () => setCarouselIdx(i => (i + 1) % WATCHES.length), style: { position: 'absolute', top: '50%', right: 12, zIndex: 10, transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 } }, '›'),
          // Top-left brand
          React.createElement('div', { style: { position: 'absolute', top: 18, left: 18, zIndex: 3 } },
            React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', marginBottom: 4 } }, watch.brand.toUpperCase()),
            React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 22, color: '#faf8f4', fontWeight: 400, lineHeight: 1.1 } }, watch.model)
          ),
          // Watch image
          React.createElement('img', { src: watch.imageUrl, alt: watch.model, style: { width: '100%', maxWidth: 420, display: 'block', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.55))', objectFit: 'contain', height: 'auto' } }),
          // Price pill
          React.createElement('div', { style: { position: 'absolute', bottom: 20, right: 16, zIndex: 3, background: 'rgba(20,16,12,0.72)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(10px)', textAlign: 'right' } },
            React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 19, fontWeight: 600, color: '#C9A84C', lineHeight: 1 } }, fmt(watch.estimatedValue)),
            React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 5 } }, watch.dialColor),
            React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginTop: 2 } }, watch.reference)
          ),
          // Dots
          React.createElement('div', { style: { display: 'flex', gap: 5, justifyContent: 'center', position: 'absolute', bottom: 14, left: 0, right: 0, zIndex: 10 } },
            WATCHES.map((_, i) => React.createElement('div', { key: i, onClick: () => setCarouselIdx(i), style: { width: i === carouselIdx ? 14 : 4, height: 4, borderRadius: i === carouselIdx ? 2 : '50%', background: i === carouselIdx ? '#C9A84C' : 'rgba(255,255,255,0.25)', transition: 'background 0.2s,width 0.2s', cursor: 'pointer' } }))
          )
        )
      )
    ),

    // Watch Box section
    React.createElement('section', { style: { padding: '64px 56px', borderBottom: '1px solid #EAE5DC', position: 'relative' } },
      React.createElement('div', { style: { maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 } }, 'My Collection'),
          React.createElement('h2', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410', marginBottom: 28 } }, 'Your Virtual ', React.createElement('em', null, 'Watchbox.')),
          React.createElement(WatchBoxGrid, { watches: WATCHES, slotCount: 6, activeIdx, onSlotClick: handleSlotClick })
        ),
        React.createElement(WatchSidebar, { watch: activeSidebarWatch, mode: 'collection', onClose: () => { setActiveIdx(null); setActiveSidebarWatch(null); } })
      )
    ),

    // Features
    React.createElement('section', { style: { padding: '80px 56px', borderBottom: '1px solid #EAE5DC' } },
      React.createElement('div', { style: { maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 } }, 'Also in the Box'),
          React.createElement('h2', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410', marginBottom: 40 } }, 'Everything a ', React.createElement('em', null, 'Collector Needs.')),
          FEATURES.map(([num, name, desc]) =>
            React.createElement('div', { key: name, style: { display: 'flex', alignItems: 'baseline', gap: 16, padding: '14px 0', borderBottom: '1px solid #EAE5DC', cursor: 'pointer' } },
              React.createElement('span', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 13, color: '#C9A84C', fontWeight: 500, minWidth: 24 } }, num),
              React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 20, fontWeight: 400, color: '#1A1410' } }, name),
                React.createElement('div', { style: { fontSize: 12, color: '#A89880', marginTop: 2, fontFamily: 'DM Sans,sans-serif' } }, desc)
              ),
              React.createElement('span', { style: { color: '#D4CBBF', fontSize: 14 } }, '→')
            )
          )
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 } }, 'From the Watch World'),
          React.createElement('h2', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410', marginBottom: 36 } }, 'Horological ', React.createElement('em', null, 'Intelligence.')),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 28 } },
            ARTICLES.map((a, i) =>
              React.createElement('div', { key: i, style: { display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, cursor: 'pointer' } },
                React.createElement('div', { style: { aspectRatio: '1/1', borderRadius: 6, background: 'linear-gradient(135deg,#EDE9E2 0%,#E0DAD0 100%)' } }),
                React.createElement('div', null,
                  React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 5 } }, `${a.source} · ${a.date}`),
                  React.createElement('h4', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 15, fontWeight: 400, lineHeight: 1.35, color: '#1A1410' } }, a.headline)
                )
              )
            )
          )
        )
      )
    ),

    // Footer
    React.createElement('footer', { style: { padding: '32px 56px', borderTop: '1px solid #EAE5DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      React.createElement('span', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 16, fontWeight: 400, color: '#1A1410' } }, 'Virtual Watchbox'),
      React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880' } }, '© 2026 · virtualwatchbox.com'),
      React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C' } }, 'Free for Collectors. Always.')
    )
  );
};

Object.assign(window, { HomePage, WatchBoxGrid, HoverCard });
