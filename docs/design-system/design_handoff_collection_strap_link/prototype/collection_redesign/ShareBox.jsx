// ShareBox.jsx — Share button + modal showing OG-image preview + public profile link

const IconShare = ({ size = 13 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M9.5 4.5L7 2 4.5 4.5' }),
    React.createElement('line', { x1: 7, y1: 2, x2: 7, y2: 9 }),
    React.createElement('path', { d: 'M2.5 8v3a1 1 0 001 1h7a1 1 0 001-1V8' })
  );

const IconCopy = ({ size = 13 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('rect', { x: 4, y: 4, width: 8, height: 8, rx: 1.2 }),
    React.createElement('path', { d: 'M2 9V3a1 1 0 011-1h6' })
  );

const IconCheck = ({ size = 13 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '3,7.5 6,10.5 11,4' })
  );

const IconClose = ({ size = 14 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' },
    React.createElement('line', { x1: 3.5, y1: 3.5, x2: 10.5, y2: 10.5 }),
    React.createElement('line', { x1: 10.5, y1: 3.5, x2: 3.5, y2: 10.5 })
  );

// Inline OG-image preview (1200x630 ratio scaled). Renders the box at 3-up using the same
// gold frame language. Static SVG-style preview; in production this would be a real OG image.
const OGPreview = ({ watches, profileHandle, totalValue }) => {
  const visible = watches.slice(0, 6);
  return React.createElement('div', {
    style: {
      position: 'relative',
      width: '100%', aspectRatio: '1200 / 630',
      borderRadius: 10, overflow: 'hidden',
      background: 'linear-gradient(160deg, #1e1b16 0%, #2a2420 100%)',
      border: '1px solid #2A2520',
      display: 'flex',
    }
  },
    // Subtle gold glow
    React.createElement('div', {
      style: {
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 55% at 30% 50%, rgba(201,168,76,0.12) 0%, transparent 70%)',
      }
    }),
    // Left meta column
    React.createElement('div', {
      style: {
        flex: '0 0 38%', padding: '7% 6%',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', zIndex: 1,
      }
    },
      React.createElement('div', null,
        React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 'clamp(8px, 1.2cqw, 11px)', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', marginBottom: 8 } }, 'Virtual Watchbox'),
        React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 'clamp(20px, 4cqw, 38px)', color: '#FAF8F4', fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.01em' } }, profileHandle + "'s"),
        React.createElement('div', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontStyle: 'italic', fontSize: 'clamp(20px, 4cqw, 38px)', color: '#FAF8F4', fontWeight: 300, lineHeight: 1.05 } }, 'Watchbox.')
      ),
      React.createElement('div', null,
        React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 'clamp(7px, 1cqw, 10px)', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 4 } }, `${watches.length} Watches · Est.`),
        React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 'clamp(14px, 2.6cqw, 24px)', fontWeight: 600, color: '#C9A84C', lineHeight: 1 } }, fmt(totalValue))
      )
    ),
    // Right: mini watchbox
    React.createElement('div', {
      style: {
        flex: '1 1 auto', padding: '4% 5% 4% 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }
    },
      React.createElement('div', {
        style: {
          width: '100%', aspectRatio: '3 / 2',
          background: 'linear-gradient(180deg, #C9A04C 0%, #B58836 100%)',
          border: '1px solid #A87A2E', borderRadius: 6,
          padding: '3%',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '3%',
          boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        }
      },
        [...Array(6)].map((_, i) => {
          const w = visible[i];
          return React.createElement('div', {
            key: i,
            style: {
              borderRadius: 4,
              background: w ? '#FFFCF7' : '#F5EFE5',
              border: w ? '1px solid #E0DAD0' : '1.5px dashed #D0C9BE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8%', overflow: 'hidden',
            }
          },
            w && (w.imageUrl
              ? React.createElement('img', { src: w.imageUrl, alt: '', style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } })
              : React.createElement(DialSVG, { ...w.dialConfig, size: 40 }))
          );
        })
      )
    )
  );
};

const ShareBox = ({ watches, totalValue }) => {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const profileHandle = 'collector';
  const url = `https://virtualwatchbox.com/u/${profileHandle}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const SocialBtn = ({ label, onClick, children }) =>
    React.createElement('button', {
      onClick, title: label, 'aria-label': label,
      style: {
        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: 'DM Sans,sans-serif', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '9px 12px', background: 'transparent', color: '#1A1410',
        border: '1px solid #D4CBBF', borderRadius: 4, cursor: 'pointer',
      }
    }, children);

  const text = encodeURIComponent(`My Virtual Watchbox — ${watches.length} watches.`);
  const enc = encodeURIComponent(url);

  return React.createElement(React.Fragment, null,
    // Trigger button — matches secondary button style
    React.createElement('button', {
      onClick: () => setOpen(true),
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '7px 14px', background: '#FFFFFF', color: '#1A1410',
        border: '1px solid #EAE5DC', borderRadius: 6, cursor: 'pointer',
      },
      onMouseEnter: e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#8A6A10'; },
      onMouseLeave: e => { e.currentTarget.style.borderColor = '#EAE5DC'; e.currentTarget.style.color = '#1A1410'; },
    },
      React.createElement(IconShare, { size: 13 }),
      'Share Box'
    ),

    // Modal
    open && React.createElement('div', {
      onClick: () => setOpen(false),
      style: {
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26,20,16,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }
    },
      React.createElement('div', {
        onClick: e => e.stopPropagation(),
        style: {
          background: '#FFFCF7', border: '1px solid #EAE5DC', borderRadius: 14,
          width: '100%', maxWidth: 620,
          boxShadow: '0 24px 60px rgba(26,20,16,0.32)',
          overflow: 'hidden',
        }
      },
        // Header
        React.createElement('div', { style: { padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE5DC' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 } }, 'Share'),
            React.createElement('h3', { style: { fontFamily: 'Cormorant Garamond,Georgia,serif', fontSize: 22, fontWeight: 400, color: '#1A1410', margin: 0, lineHeight: 1.1 } }, 'Your Public ', React.createElement('em', { style: { fontStyle: 'italic' } }, 'Watchbox.'))
          ),
          React.createElement('button', {
            onClick: () => setOpen(false), 'aria-label': 'Close',
            style: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#A89880', display: 'inline-flex', padding: 6 }
          }, React.createElement(IconClose, { size: 14 }))
        ),

        // OG preview
        React.createElement('div', { style: { padding: 22, paddingBottom: 14 } },
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('span', null, 'Preview · 1200 × 630'),
            React.createElement('span', { style: { color: '#C9A84C' } }, 'Auto-generated')
          ),
          React.createElement(OGPreview, { watches, profileHandle, totalValue })
        ),

        // URL row
        React.createElement('div', { style: { padding: '0 22px 14px' } },
          React.createElement('div', { style: { fontFamily: 'DM Sans,sans-serif', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 } }, 'Public Profile Link'),
          React.createElement('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#FAF8F4', border: '1px solid #EAE5DC', borderRadius: 6,
              padding: '8px 8px 8px 14px',
            }
          },
            React.createElement('span', { style: { flex: 1, fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#1A1410', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, url),
            React.createElement('button', {
              onClick: copy,
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'DM Sans,sans-serif', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '7px 12px', background: copied ? '#E8F4E8' : '#1A1410',
                color: copied ? '#2D6A2D' : '#FAF8F4',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }
            },
              copied ? React.createElement(IconCheck, { size: 12 }) : React.createElement(IconCopy, { size: 12 }),
              copied ? 'Copied' : 'Copy'
            )
          )
        ),

        // Share targets
        React.createElement('div', { style: { padding: '0 22px 22px', display: 'flex', gap: 8 } },
          React.createElement(SocialBtn, {
            label: 'Share on X',
            onClick: () => window.open(`https://twitter.com/intent/tweet?text=${text}&url=${enc}`, '_blank', 'noopener'),
          }, 'X / Twitter'),
          React.createElement(SocialBtn, {
            label: 'Share on Threads',
            onClick: () => window.open(`https://www.threads.net/intent/post?text=${text}%20${enc}`, '_blank', 'noopener'),
          }, 'Threads'),
          React.createElement(SocialBtn, {
            label: 'Share via Email',
            onClick: () => window.open(`mailto:?subject=${text}&body=${enc}`, '_self'),
          }, 'Email'),
          React.createElement(SocialBtn, {
            label: 'Download OG image',
            onClick: () => alert('In production, downloads the rendered 1200×630 OG image.'),
          }, 'Download')
        ),

        // Footer note
        React.createElement('div', {
          style: {
            padding: '10px 22px', borderTop: '1px solid #EAE5DC',
            background: '#FAF8F4',
            fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: '#A89880',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }
        },
          React.createElement('span', null, 'Shared links open your public profile.'),
          React.createElement('a', {
            href: '#', onClick: e => e.preventDefault(),
            style: { color: '#C9A84C', textDecoration: 'none', fontWeight: 500 }
          }, 'Profile settings →')
        )
      )
    )
  );
};

Object.assign(window, { ShareBox, IconShare });
