// FramelessUpgrade.jsx — single-page view of the chosen Frameless treatment
// Reuses ES tokens + UpgradeRow from DiscoverEditorial.jsx (loaded first).
// Renders the section direct, no nav, no canvas, no other Discover sections.

const FramelessUpgrade = () => {
  return React.createElement('div', {
    style: { background: '#FAF8F4', minHeight: '100vh', padding: '64px 0' }
  },
    React.createElement('div', {
      style: { maxWidth: 1280, margin: '0 auto', padding: '0 56px' }
    },
      // Section header (same shape as the live Discover)
      React.createElement('div', {
        style: {
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 24,
          alignItems: 'baseline', marginBottom: 28,
          paddingBottom: 16, borderBottom: `1px solid #EAE5DC`,
        }
      },
        React.createElement('div', null,
          React.createElement('div', { style: {
            fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#C9A84C', marginBottom: 10,
          } }, '\u00a7 02'),
          React.createElement('h2', { style: {
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: 30,
            lineHeight: 1, letterSpacing: '-0.008em',
            color: '#1A1410', margin: 0, fontStyle: 'italic',
          } }, 'Upgrade this watch.'),
        ),
        React.createElement('div', { style: {
          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 11.5, color: '#A89880',
          letterSpacing: '0.04em', maxWidth: 320, textAlign: 'right',
        } }, 'Step-up paths that preserve your box balance. Brand-family logic; grounded and aspirational picks.'),
      ),
      React.createElement('div', {
        style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }
      },
        UPGRADES.map(u => React.createElement(window.UpgradeRow, { key: u.id, u }))
      ),
    )
  );
};

Object.assign(window, { FramelessUpgrade });
