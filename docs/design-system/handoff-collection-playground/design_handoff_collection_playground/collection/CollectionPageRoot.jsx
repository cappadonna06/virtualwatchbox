// CollectionPageRoot.jsx — orchestrates header + view + below-fold stats

const IconPlus = ({ size = 13 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' },
    React.createElement('line', { x1: 7, y1: 2.5, x2: 7, y2: 11.5 }),
    React.createElement('line', { x1: 2.5, y1: 7, x2: 11.5, y2: 7 })
  );

const CollectionPageRoot = ({ setPage }) => {
  const [view, setView] = React.useState('watchbox');
  const [activeWatch, setActiveWatch] = React.useState(null);
  const [activeIdx, setActiveIdx] = React.useState(null);
  const [watches, setWatches] = React.useState(WATCHES);
  const [unsaved, setUnsaved] = React.useState(0);
  const [sort, setSort] = React.useState('recent');

  const totalEstValue = watches.reduce((s, w) => s + w.estimatedValue, 0);

  const handleBoxSlotClick = idx => {
    if (idx === null) return;
    setActiveIdx(prev => {
      const n = prev === idx ? null : idx;
      setActiveWatch(n !== null ? watches[n] : null);
      return n;
    });
  };
  const handleCardSelect = w => setActiveWatch(prev => (prev?.id === w.id ? null : w));

  const handleDelete = w => {
    setWatches(prev => prev.filter(x => x.id !== w.id));
    setActiveWatch(null); setActiveIdx(null);
    setUnsaved(n => n + 1);
  };

  const sorted = sortWatches(watches, sort);

  const metaLabel = { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880' };
  const metaValue = { fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 500, color: '#1A1410' };

  return React.createElement('div', { style: { minHeight: '100vh', background: '#FAF8F4' } },

    // ============ HEADER ============
    React.createElement('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '40px 56px 0' } },

      React.createElement('div', { style: { marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' } },
        React.createElement('h1', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 48, fontWeight: 400, lineHeight: 1.1, color: '#1A1410', margin: 0 } }, 'My Collection'),
        React.createElement('p', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 14, color: '#A89880', margin: 0, letterSpacing: '0.02em' } }, 'Your source of truth.')
      ),

      // Meta row: Add Watch + quiet stats
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #EAE5DC',
        }
      },
        React.createElement('button', {
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '9px 22px 9px 18px', background: '#1A1410', color: '#FAF8F4',
            border: 'none', borderRadius: 4, cursor: 'pointer',
          }
        },
          React.createElement(IconPlus, { size: 13 }),
          'Add Watch'
        ),

        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
            React.createElement('span', { style: metaLabel }, 'Watches'),
            React.createElement('span', { style: metaValue }, watches.length)
          ),
          React.createElement('span', { style: { width: 1, height: 14, background: '#EAE5DC' } }),
          React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
            React.createElement('span', { style: metaLabel }, 'Est. Value'),
            React.createElement('span', { style: metaValue }, fmt(totalEstValue))
          ),
          React.createElement('span', { style: { width: 1, height: 14, background: '#EAE5DC' } }),
          React.createElement('a', {
            href: '#stats',
            onClick: e => { e.preventDefault(); document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
            style: { display: 'inline-flex', alignItems: 'center', gap: 5, ...metaLabel, textDecoration: 'none', cursor: 'pointer' },
            onMouseEnter: e => { e.currentTarget.style.color = '#1A1410'; },
            onMouseLeave: e => { e.currentTarget.style.color = '#A89880'; },
          },
            'Stats',
            React.createElement(IconArrowDown, { size: 11 })
          )
        ),

        unsaved > 0 && React.createElement('span', { style: { marginLeft: 'auto', fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#C9A84C', opacity: 0.85 } }, `${unsaved} unsaved`)
      )
    ),

    // ============ MAIN CONTENT ============
    React.createElement('div', {
      style: {
        maxWidth: 1280, margin: '0 auto',
        padding: '0 56px 64px',
        display: 'grid',
        gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start',
      }
    },
      // LEFT column: toolbar (view switcher / order) + watchbox or cards
      React.createElement('div', null,
        React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 14, minHeight: 36,
          }
        },
          React.createElement(ViewSwitcher, { view, setView }),
          React.createElement('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 10 } },
            view === 'cards' && React.createElement(OrderDropdown, { value: sort, setValue: setSort }),
            React.createElement(ShareBox, { watches: sorted, totalValue: totalEstValue })
          )
        ),
        view === 'watchbox' && React.createElement(WatchBoxGrid, { watches: sorted, slotCount: 6, activeIdx, onSlotClick: handleBoxSlotClick }),
        view === 'cards'    && React.createElement(WatchCardGrid, { watches: sorted, activeId: activeWatch?.id, onSelect: handleCardSelect })
      ),
      // RIGHT column: sidebar
      React.createElement(WatchSidebar, {
        watch: activeWatch, mode: 'collection',
        onClose: () => { setActiveWatch(null); setActiveIdx(null); },
        onDelete: handleDelete,
      })
    ),

    // ============ STATS ============
    React.createElement(CollectionStats, { watches }),

    // ============ Unsaved bar ============
    unsaved > 0 && React.createElement('div', {
      style: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1A1410', borderTop: '1px solid #3A3028', padding: '14px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }
    },
      React.createElement('span', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#FAF8F4' } }, `You have ${unsaved} unsaved ${unsaved === 1 ? 'change' : 'changes'}`),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement('button', { onClick: () => setUnsaved(0), style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', padding: '7px 16px', background: '#FAF8F4', color: '#1A1410', border: 'none', borderRadius: 4, cursor: 'pointer' } }, 'Save to My Collection'),
        React.createElement('button', { onClick: () => setUnsaved(0), style: { fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', padding: '7px 16px', background: 'transparent', color: '#FAF8F4', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, cursor: 'pointer' } }, 'Discard')
      )
    )
  );
};

Object.assign(window, { CollectionPageRoot, IconPlus });
