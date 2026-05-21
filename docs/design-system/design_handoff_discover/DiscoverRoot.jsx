// DiscoverRoot.jsx — Desktop + Mobile artboards on a design canvas

const ROOT_DEFAULTS = /*EDITMODE-BEGIN*/{
  "personalized": true,
  "showDesktop": true,
  "showMobile": true
}/*EDITMODE-END*/;

// ─── Shared nav (desktop full / mobile compact) ─────────────────────────
const DiscoverNav = ({ personalized, mobile }) => {
  return React.createElement('nav', {
    style: {
      background: '#FAF8F4',
      borderBottom: '1px solid #EAE5DC',
      position: 'sticky', top: 0, zIndex: 100,
    }
  },
    React.createElement('div', {
      style: {
        maxWidth: 1280, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: mobile ? '14px 18px' : '18px 56px',
      }
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: mobile ? 0 : 36 } },
        // Mobile menu icon
        mobile && React.createElement('button', {
          style: {
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, marginRight: 12, color: '#1A1410',
            display: 'flex', alignItems: 'center',
          }
        },
          React.createElement('svg', { width: 18, height: 14, viewBox: '0 0 18 14', fill: 'none' },
            React.createElement('line', { x1: 0, y1: 1, x2: 18, y2: 1, stroke: 'currentColor', strokeWidth: 1.5 }),
            React.createElement('line', { x1: 0, y1: 7, x2: 18, y2: 7, stroke: 'currentColor', strokeWidth: 1.5 }),
            React.createElement('line', { x1: 0, y1: 13, x2: 12, y2: 13, stroke: 'currentColor', strokeWidth: 1.5 }),
          )
        ),
        React.createElement('span', {
          style: {
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: mobile ? 17 : 20, fontWeight: 500,
            letterSpacing: '0.03em', color: '#1A1410',
          }
        }, 'Virtual Watchbox'),

        !mobile && React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: 28 }
        },
          ['My Collection', 'Playground'].map(l =>
            React.createElement('a', {
              key: l, style: {
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                letterSpacing: '0.04em', color: '#A89880', cursor: 'pointer',
              }
            }, l)
          ),
          React.createElement('a', {
            style: {
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
              letterSpacing: '0.04em', color: '#1A1410', cursor: 'pointer',
              borderBottom: '1px solid #1A1410', paddingBottom: 1,
            }
          }, 'Discover'),
          React.createElement('a', {
            style: {
              fontFamily: 'DM Sans, sans-serif', fontSize: 12,
              letterSpacing: '0.04em', color: '#A89880', cursor: 'pointer',
            }
          }, 'News'),
        ),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
        !mobile && personalized && React.createElement('span', {
          style: {
            fontFamily: 'DM Sans, sans-serif', fontSize: 11,
            letterSpacing: '0.04em', color: '#A89880',
          }
        }, 'Signed in as Marc'),
        mobile
          ? React.createElement('div', {
              style: {
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #C9A84C, #8B6B30)',
                color: '#FAF8F4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 14, fontWeight: 500,
              }
            }, 'M')
          : React.createElement('button', {
              style: {
                fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500,
                letterSpacing: '0.08em', padding: '9px 22px',
                background: personalized ? 'transparent' : '#1A1410',
                color: personalized ? '#1A1410' : '#FAF8F4',
                border: personalized ? '1px solid #D4CBBF' : 'none',
                borderRadius: 4, cursor: 'pointer',
              }
            }, personalized ? 'Account' : 'Sign In'),
      ),
    )
  );
};

// ─── Page ───────────────────────────────────────────────────────────────
const DiscoverPage = ({ personalized, mobile }) =>
  React.createElement('div',
    { className: mobile ? 'vwb-mobile' : '', style: { background: '#FAF8F4', minHeight: '100%' } },
    React.createElement(DiscoverNav, { personalized, mobile }),
    React.createElement(SectionNav, { mobile, navHeight: mobile ? 50 : 60 }),
    React.createElement(DiscoverEditorial, { personalized }),
  );

// ─── Canvas root ────────────────────────────────────────────────────────
const DiscoverRoot = () => {
  const [t, setTweak] = useTweaks(ROOT_DEFAULTS);

  const desktopArtboard = React.createElement(DCArtboard, {
    key: 'desktop', id: 'desktop', label: 'Desktop \u00b7 1320 \u00d7 ', width: 1320, height: 4400,
  },
    React.createElement('div', { 'data-screen-label': 'Desktop' },
      React.createElement(DiscoverPage, { personalized: t.personalized, mobile: false }),
    )
  );

  // Mobile artboard — render the page inside a minimal phone frame
  // (status bar + rounded corners + home indicator), no internal scroll.
  const MobileFrame = ({ children }) =>
    React.createElement('div', {
      style: {
        width: 402, background: '#FAF8F4',
        borderRadius: 44, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.10)',
        position: 'relative', fontFamily: '-apple-system, system-ui, sans-serif',
      }
    },
      // Status bar
      React.createElement('div', {
        style: {
          height: 50, padding: '0 28px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          background: '#FAF8F4', color: '#1A1410', fontSize: 15, fontWeight: 600,
          position: 'relative', zIndex: 2,
        }
      },
        React.createElement('span', null, '9:41'),
        React.createElement('div', { style: { position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 100, height: 28, borderRadius: 20, background: '#000' } }),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          // Signal
          React.createElement('svg', { width: 18, height: 11, viewBox: '0 0 18 11' },
            [3, 5, 7, 9].map((h, i) =>
              React.createElement('rect', { key: i, x: i * 4.5, y: 11 - h, width: 3, height: h, rx: 0.5, fill: '#1A1410' })
            )
          ),
          // Wifi
          React.createElement('svg', { width: 16, height: 11, viewBox: '0 0 16 11', fill: '#1A1410' },
            React.createElement('path', { d: 'M8 0a14 14 0 00-8 3l1.5 1.7A12 12 0 018 1.7c2.4 0 4.7.9 6.5 2.4L16 3A14 14 0 008 0zm0 4a8 8 0 00-5 1.8l1.6 1.7A6 6 0 018 6.4c1.3 0 2.5.4 3.4 1.1L13 6A8 8 0 008 4zm0 4a3 3 0 00-2 .7l2 2.2 2-2.2A3 3 0 008 8z' })
          ),
          // Battery
          React.createElement('svg', { width: 26, height: 11, viewBox: '0 0 26 11' },
            React.createElement('rect', { x: 0.5, y: 0.5, width: 22, height: 10, rx: 2.5, fill: 'none', stroke: '#1A1410', strokeOpacity: 0.4 }),
            React.createElement('rect', { x: 2, y: 2, width: 18, height: 7, rx: 1, fill: '#1A1410' }),
            React.createElement('rect', { x: 23, y: 4, width: 1.5, height: 3, rx: 0.5, fill: '#1A1410', fillOpacity: 0.4 })
          ),
        )
      ),
      // Content
      children,
      // Home indicator
      React.createElement('div', {
        style: {
          height: 26, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          paddingBottom: 8, background: '#FAF8F4',
        }
      },
        React.createElement('div', {
          style: { width: 134, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.7)' }
        }),
      ),
    );

  const mobileArtboard = React.createElement(DCArtboard, {
    key: 'mobile', id: 'mobile', label: 'Mobile \u00b7 iPhone 402', width: 480, height: 6800,
  },
    React.createElement('div', {
      'data-screen-label': 'Mobile',
      style: { display: 'flex', justifyContent: 'center', padding: '24px 0' }
    },
      React.createElement(MobileFrame, null,
        React.createElement(DiscoverPage, { personalized: t.personalized, mobile: true }),
      )
    )
  );

  const artboards = [];
  if (t.showDesktop) artboards.push(desktopArtboard);
  if (t.showMobile)  artboards.push(mobileArtboard);

  return React.createElement(React.Fragment, null,
    React.createElement(DesignCanvas, null,
      React.createElement(DCSection, {
        id: 'discover',
        title: 'Discover',
        subtitle: `Editorial direction \u00b7 ${t.personalized ? 'Personalized for Marc' : 'Guest / demo state'}`,
      },
        artboards
      )
    ),

    React.createElement(TweaksPanel, { title: 'Tweaks' },
      React.createElement(TweakSection, { title: 'Audience' },
        React.createElement(TweakRadio, {
          label: 'State',
          value: t.personalized ? 'personalized' : 'guest',
          onChange: v => setTweak('personalized', v === 'personalized'),
          options: [
            { value: 'personalized', label: 'Personalized' },
            { value: 'guest', label: 'Guest' },
          ],
        }),
      ),
      React.createElement(TweakSection, { title: 'Show' },
        React.createElement(TweakToggle, { label: 'Desktop', value: t.showDesktop, onChange: v => setTweak('showDesktop', v) }),
        React.createElement(TweakToggle, { label: 'Mobile',  value: t.showMobile,  onChange: v => setTweak('showMobile',  v) }),
      ),
    )
  );
};

Object.assign(window, { DiscoverRoot });
