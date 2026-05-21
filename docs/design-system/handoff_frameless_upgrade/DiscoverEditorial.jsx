// DiscoverEditorial.jsx — v2
// Tighter, scannable, with all six sections.
// Hero → Complete the Box → Upgrade This Watch → For Your Next Slot →
// Upgrade This Strap → Upgrade This Box → From the Watch World

const ES = {
  bg: '#FAF8F4',
  slot: '#FFFCF7',
  ink: '#1A1410',
  inkSoft: '#3F362C',
  muted: '#A89880',
  mutedDark: '#6F6353',
  gold: '#C9A84C',
  goldSoft: '#D6BA70',
  dark1: '#1e1b16',
  dark2: '#2a2420',
  border: '#EAE5DC',
  borderMid: '#E8E2D8',
  paper: '#F4EFE6',
  paperWarm: '#F1ECE2',
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
};

// ─── Atoms ──────────────────────────────────────────────────────────────
const Kicker = ({ children, color = ES.muted, style = {} }) =>
  React.createElement('div', { style: {
    fontFamily: ES.sans, fontSize: 10, fontWeight: 600,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color, ...style,
  } }, children);

const SerifH = ({ children, size = 32, italic = false, color = ES.ink, weight = 400, style = {} }) =>
  React.createElement('h2', { style: {
    fontFamily: ES.serif, fontWeight: weight, fontSize: size,
    lineHeight: 1.05, letterSpacing: '-0.008em',
    color, margin: 0, fontStyle: italic ? 'italic' : 'normal', ...style,
  } }, children);

const Em = ({ children }) =>
  React.createElement('em', { style: { fontStyle: 'italic' } }, children);

const SectionHeader = ({ kicker, title, italic, sub, num }) =>
  React.createElement('div', {
    className: 'vwb-section-head',
    style: {
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 24,
      alignItems: 'baseline', marginBottom: 28,
      paddingBottom: 16, borderBottom: `1px solid ${ES.border}`,
    }
  },
    React.createElement('div', null,
      kicker && React.createElement(Kicker, { color: ES.gold, style: { marginBottom: 10 } }, kicker),
      React.createElement('h2', { className: 'vwb-section-h2', style: {
        fontFamily: ES.serif, fontWeight: 400, fontSize: 30,
        lineHeight: 1, letterSpacing: '-0.008em',
        color: ES.ink, margin: 0,
      } },
        italic ? React.createElement(Em, null, title) : title,
      ),
    ),
    sub && React.createElement('div', {
      style: {
        fontFamily: ES.sans, fontSize: 11.5, color: ES.muted,
        letterSpacing: '0.04em', maxWidth: 320, textAlign: 'right',
        textWrap: 'pretty', alignSelf: 'end',
      }
    }, sub),
  );

const GoldArrow = ({ size = 32 }) =>
  React.createElement('svg', { width: size, height: 10, viewBox: '0 0 32 10', fill: 'none' },
    React.createElement('line', { x1: 0, y1: 5, x2: 28, y2: 5, stroke: ES.gold, strokeWidth: 1 }),
    React.createElement('polyline', { points: '23,1 28,5 23,9', fill: 'none', stroke: ES.gold, strokeWidth: 1 }),
  );

const Btn = ({ children, primary, onClick }) =>
  React.createElement('button', {
    onClick,
    style: {
      fontFamily: ES.sans, fontSize: 10.5, fontWeight: 500,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      padding: primary ? '10px 20px' : '9px 16px',
      background: primary ? ES.ink : 'transparent',
      color: primary ? ES.slot : ES.ink,
      border: primary ? 'none' : `1px solid ${ES.borderMid}`,
      borderRadius: 2, cursor: 'pointer', whiteSpace: 'nowrap',
    }
  }, children);

const LinkAction = ({ children, color = ES.ink }) =>
  React.createElement('button', {
    style: {
      fontFamily: ES.sans, fontSize: 10.5, fontWeight: 500,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    }
  }, children);

// ─── Section wrapper ────────────────────────────────────────────────────
const Section = ({ children, padTop = 56, padBottom = 56, bg }) =>
  React.createElement('section', {
    className: 'vwb-section',
    style: {
      maxWidth: 1280, margin: '0 auto',
      padding: `${padTop}px 56px ${padBottom}px`,
      background: bg || 'transparent',
    }
  }, children);

// ─── 1 · Hero ───────────────────────────────────────────────────────────
const EditorialHero = ({ personalized, insight }) =>
  React.createElement('div', { 'data-screen-label': '01 Hero', style: { background: ES.bg } },
    React.createElement(Section, { padTop: 40, padBottom: 56 },
      // Compact byline — hidden on mobile via vwb-masthead CSS rule
      React.createElement('div', { className: 'vwb-masthead', style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 28,
      } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          React.createElement(Kicker, { color: ES.ink, style: { fontSize: 9.5 } }, 'Discover'),
          React.createElement('span', { style: { color: ES.borderMid, fontSize: 10 } }, '\u2014'),
          personalized
            ? React.createElement(Kicker, { color: ES.muted, style: { fontSize: 9.5 } }, 'For Marc')
            : React.createElement(Kicker, { color: ES.muted, style: { fontSize: 9.5 } }, 'Editor\u2019s curation'),
        ),
        React.createElement(Kicker, { color: ES.muted, style: { fontSize: 9.5 } }, 'Tuesday, 20 May 2026'),
      ),

      React.createElement('h1', { className: 'vwb-hero-h1', style: {
        fontFamily: ES.serif, fontWeight: 300, fontSize: 72, lineHeight: 1.0,
        letterSpacing: '-0.022em', margin: 0, marginBottom: 20, color: ES.ink,
      } }, 'Your next move.'),
      React.createElement('p', { className: 'vwb-hero-sub', style: {
        fontFamily: ES.serif, fontStyle: 'italic', fontWeight: 300,
        fontSize: 20, lineHeight: 1.5, color: ES.mutedDark,
        margin: 0, maxWidth: 640, textWrap: 'pretty',
      } },
        personalized
          ? React.createElement(React.Fragment, null,
              'Your box reads ', React.createElement(Em, null, insight.read.toLowerCase()),
              '. Recommendations, upgrades, and reads shaped around the holes in it.')
          : 'Recommendations, upgrades, and reads for any thoughtful collector. Sign in to make these your own.'
      ),
    )
  );

// Section nav — sticky "In this issue" TOC strip
const NAV_SECTIONS = [
  { id: 'lead',      num: '01', label: 'Lead' },
  { id: 'upgrade',   num: '02', label: 'Upgrade' },
  { id: 'next-slot', num: '03', label: 'Next Slot' },
  { id: 'straps',    num: '04', label: 'Straps' },
  { id: 'box',       num: '05', label: 'Box' },
  { id: 'news',      num: '06', label: 'News' },
];

const SectionNav = ({ mobile, navHeight = 56 }) => {
  const [active, setActive] = React.useState('lead');

  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    NAV_SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const onClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const offset = mobile ? 100 : 110;
    const target = el.getBoundingClientRect().top + window.scrollY - offset;
    try { window.scrollTo({ top: target, behavior: 'smooth' }); }
    catch (_) { window.scrollTo(0, target); }
  };

  return React.createElement('div', {
    className: 'vwb-section-nav',
    style: {
      borderBottom: `1px solid ${ES.border}`,
      position: 'sticky', top: navHeight, zIndex: 90,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      background: 'rgba(250,248,244,0.94)',
    }
  },
    React.createElement('div', {
      className: 'vwb-section-nav-inner',
      style: {
        maxWidth: 1280, margin: '0 auto',
        padding: mobile ? '0 18px' : '0 56px',
        display: 'flex', alignItems: 'center', gap: mobile ? 18 : 28,
        height: 44, overflowX: 'auto', scrollbarWidth: 'none',
      }
    },
      React.createElement('div', {
        className: 'vwb-section-nav-label',
        style: {
          fontFamily: ES.serif, fontStyle: 'italic', fontSize: 13,
          color: ES.muted, whiteSpace: 'nowrap',
          paddingRight: 14, borderRight: `1px solid ${ES.borderMid}`,
          marginRight: 4, flexShrink: 0, letterSpacing: '0.02em',
        }
      }, 'In this issue'),
      NAV_SECTIONS.map(s => {
        const isActive = active === s.id;
        return React.createElement('a', {
          key: s.id,
          href: `#${s.id}`,
          onClick: e => onClick(e, s.id),
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 7,
            color: isActive ? ES.ink : ES.muted,
            fontFamily: ES.sans,
            fontSize: 11, fontWeight: 500,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            cursor: 'pointer', whiteSpace: 'nowrap',
            height: 44, flexShrink: 0,
            borderBottom: isActive ? `1.5px solid ${ES.gold}` : '1.5px solid transparent',
            transition: 'color 0.18s ease',
          }
        },
          React.createElement('span', { style: {
            fontFamily: ES.serif, fontStyle: 'italic', fontSize: 13,
            color: isActive ? ES.gold : ES.muted, fontWeight: 400, letterSpacing: '0.04em',
          } }, s.num),
          React.createElement('span', null, s.label),
        );
      }),
    )
  );
};

// ─── 2 · Complete the Box — the lead featured recommendation ────────────
const CompleteTheBox = ({ lead, personalized }) => {
  const w = lead.watch;
  return React.createElement('div', { 'data-screen-label': '02 Complete the Box', id: 'lead', style: { background: ES.dark1, color: ES.slot } },
    React.createElement(Section, { padTop: 64, padBottom: 64 },
      React.createElement('div', { className: 'vwb-complete-row', style: { display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center' } },
        // Left — Insight + actions
        React.createElement('div', null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 } },
            React.createElement(Kicker, { color: ES.gold }, personalized ? 'Complete the Box' : 'This Week\u2019s Pick'),
            React.createElement('div', { style: { height: 1, width: 24, background: 'rgba(201,168,76,0.6)' } }),
            React.createElement(Kicker, { color: ES.gold }, lead.gapLabel),
          ),
          React.createElement('h2', { className: 'vwb-complete-h2', style: {
            fontFamily: ES.serif, fontWeight: 300, fontSize: 44, lineHeight: 1.05,
            letterSpacing: '-0.015em', margin: 0, marginBottom: 24, color: ES.slot,
          } },
            personalized
              ? React.createElement(React.Fragment, null,
                  'A ', React.createElement(Em, null, 'dress watch'), ', for the formal anchor your box is missing.')
              : React.createElement(React.Fragment, null,
                  'A ', React.createElement(Em, null, 'two-register chronograph'), ' to lead the week.')
          ),
          React.createElement('p', { style: {
            fontFamily: ES.serif, fontStyle: 'italic', fontSize: 17, lineHeight: 1.55,
            color: 'rgba(250,248,244,0.78)', margin: 0, marginBottom: 28,
            maxWidth: 480, textWrap: 'pretty',
          } }, lead.insight),

          // Spec row
          React.createElement('div', { className: 'vwb-complete-specs', style: {
            display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 28,
            paddingTop: 22, borderTop: '1px solid rgba(250,248,244,0.18)', marginBottom: 28,
          } },
            [
              ['Brand', w.brand],
              ['Reference', w.ref],
              ['Market median', fmt(w.marketMedian)],
            ].map(([k, v], i) =>
              React.createElement('div', { key: i },
                React.createElement(Kicker, { color: 'rgba(250,248,244,0.5)', style: { marginBottom: 6 } }, k),
                React.createElement('div', { style: { fontFamily: ES.serif, fontSize: 18, color: ES.slot } }, v),
              )
            ),
          ),

          React.createElement('div', { className: 'vwb-complete-actions', style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
            React.createElement('button', { style: {
              fontFamily: ES.sans, fontSize: 10.5, fontWeight: 500,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '11px 22px', background: ES.gold, color: ES.ink,
              border: 'none', borderRadius: 2, cursor: 'pointer',
            } }, 'Find on Chrono24 \u2197'),
            React.createElement('button', { style: {
              fontFamily: ES.sans, fontSize: 10.5, fontWeight: 500,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '11px 18px', background: 'transparent', color: ES.slot,
              border: '1px solid rgba(250,248,244,0.28)', borderRadius: 2, cursor: 'pointer',
            } }, 'Add to Playground'),
            React.createElement('span', { style: {
              fontFamily: ES.sans, fontSize: 10.5,
              color: 'rgba(250,248,244,0.5)', letterSpacing: '0.06em', marginLeft: 8,
            } }, '\u2661 Follow'),
          ),
        ),

        // Right — Watch with editorial photo treatment
        React.createElement('div', { style: { position: 'relative', textAlign: 'center' } },
          React.createElement('div', { style: {
            position: 'absolute', top: -12, left: 0,
            fontFamily: ES.serif, fontStyle: 'italic', fontSize: 100,
            fontWeight: 300, color: 'rgba(201,168,76,0.10)',
            lineHeight: 0.85, letterSpacing: '-0.04em',
          } }, '\u00b6 01'),
          React.createElement('img', {
            src: w.image, alt: w.model,
            style: {
              width: '100%', maxWidth: 340, maxHeight: 420, objectFit: 'contain',
              filter: 'drop-shadow(0 18px 32px rgba(0,0,0,0.45))',
              position: 'relative', zIndex: 1,
            }
          }),
          React.createElement('div', { style: { marginTop: 18 } },
            React.createElement('div', { style: {
              fontFamily: ES.serif, fontStyle: 'italic', fontSize: 22, color: ES.slot,
            } }, w.model),
            React.createElement('div', { style: {
              fontFamily: ES.sans, fontSize: 11, color: 'rgba(250,248,244,0.55)', marginTop: 4, letterSpacing: '0.04em',
            } }, `${w.size} mm\u2002\u00b7\u2002${w.type}`),
          ),
        ),
      ),
    )
  );
};

// ─── 3 · Upgrade This Watch ─────────────────────────────────────────────
// Editorial spread: large image side-by-side comparison.
const UpgradeRow = ({ u }) =>
  React.createElement('article', {
    style: {
      background: ES.slot, border: `1px solid ${ES.border}`,
      padding: '32px 36px 28px', position: 'relative',
    }
  },
    // From → To pair, frameless (watches sit directly on the slot surface)
    React.createElement('div', { className: 'vwb-upgrade-pair', style: {
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12,
      alignItems: 'center', marginBottom: 18,
    } },
      // FROM — frameless
      React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('div', { style: {
          width: '100%', height: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 0',
        } },
          React.createElement('img', { src: u.from.image, alt: u.from.model,
            style: {
              width: 260, height: 260, objectFit: 'contain',
              filter: 'drop-shadow(0 16px 28px rgba(26,20,16,0.22))',
            } })
        ),
        React.createElement(Kicker, { color: ES.muted, style: { marginBottom: 6 } }, 'You own'),
        React.createElement('div', { style: {
          fontFamily: ES.serif, fontSize: 21, lineHeight: 1.1, color: ES.ink,
        } }, u.from.model),
        React.createElement('div', { style: {
          fontFamily: ES.sans, fontSize: 11.5, color: ES.muted, marginTop: 4, letterSpacing: '0.04em',
        } }, `${fmt(u.from.value)}\u2002\u00b7\u2002${u.from.size} mm`),
      ),

      // ARROW + DELTA — featured center column with vertical rules + tracking
      React.createElement('div', { className: 'vwb-upgrade-arrow', style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, padding: '0 8px',
      } },
        React.createElement('div', { style: {
          fontFamily: ES.sans, fontSize: 8.5, fontWeight: 600,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: ES.muted, marginBottom: 2,
        } }, 'Step up'),
        React.createElement('div', { style: {
          fontFamily: ES.serif, fontStyle: 'italic', fontSize: 26,
          fontWeight: 400, lineHeight: 1, color: ES.gold,
          letterSpacing: '-0.005em',
        } }, u.delta),
        React.createElement(GoldArrow, { size: 44 }),
      ),

      // TO — frameless, with a soft gold radial glow halo behind the watch
      React.createElement('div', { style: { textAlign: 'center', position: 'relative' } },
        React.createElement('div', { style: {
          width: '100%', height: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 0', position: 'relative',
        } },
          // The halo — radial gradient behind the image, sized to match the
          // 260px image box so the glow is consistent across cards.
          React.createElement('div', { style: {
            position: 'absolute',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 320, height: 320,
            background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.28) 0%, rgba(201,168,76,0.12) 40%, rgba(201,168,76,0) 72%)',
            pointerEvents: 'none',
          } }),
          React.createElement('img', { src: u.to.image, alt: u.to.model,
            style: {
              width: 260, height: 260, objectFit: 'contain',
              filter: 'drop-shadow(0 20px 32px rgba(26,20,16,0.26))',
              position: 'relative', zIndex: 1,
            } })
        ),
        React.createElement(Kicker, { color: ES.gold, style: { marginBottom: 6 } }, 'Consider'),
        React.createElement('div', { style: {
          fontFamily: ES.serif, fontStyle: 'italic', fontSize: 21, lineHeight: 1.1, color: ES.ink,
        } }, u.to.model),
        React.createElement('div', { style: {
          fontFamily: ES.sans, fontSize: 11.5, color: ES.muted, marginTop: 4, letterSpacing: '0.04em',
        } }, `${fmt(u.to.value)}\u2002\u00b7\u2002${u.to.size} mm`),
      ),
    ),

    React.createElement('p', { style: {
      fontFamily: ES.serif, fontStyle: 'italic', fontSize: 14.5,
      lineHeight: 1.55, color: ES.inkSoft, margin: 0,
      paddingTop: 18, borderTop: `1px solid ${ES.border}`, marginBottom: 14,
      textWrap: 'pretty',
    } }, u.rationale),

    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      React.createElement(Kicker, { color: ES.muted, style: { fontSize: 9 } },
        `${u.from.brand}\u2002\u2192\u2002${u.to.brand}`),
      React.createElement('div', { style: { display: 'flex', gap: 18 } },
        React.createElement(LinkAction, { color: ES.mutedDark }, 'Set as target'),
        React.createElement(LinkAction, null, 'Find on market \u2197'),
      ),
    ),
  );

const UpgradeThisWatch = ({ upgrades }) =>
  React.createElement(Section, { padTop: 64, padBottom: 32 },
    React.createElement('div', { 'data-screen-label': '03 Upgrade This Watch', id: 'upgrade' },
      React.createElement(SectionHeader, {
        kicker: '\u00a7 02', title: 'Upgrade this watch.', italic: true,
        sub: 'Step-up paths that preserve your box balance. Brand-family logic; grounded and aspirational picks.',
      }),
      React.createElement('div', { className: 'vwb-upgrade-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 } },
        upgrades.map(u => React.createElement(UpgradeRow, { key: u.id, u })),
      )
    )
  );

// ─── 4 · For Your Next Slot — alternate picks grid ──────────────────────
const NextSlotCard = ({ rec }) =>
  React.createElement('article', {
    style: {
      background: ES.slot, border: `1px solid ${ES.border}`,
      display: 'flex', flexDirection: 'column',
    }
  },
    React.createElement('div', { style: {
      background: ES.paperWarm, aspectRatio: '4/3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    } },
      React.createElement('div', { style: {
        position: 'absolute', top: 16, left: 16,
        fontFamily: ES.serif, fontStyle: 'italic', fontSize: 14, color: ES.gold,
      } }, `No. ${rec.rank}`),
      React.createElement('div', { style: {
        position: 'absolute', top: 16, right: 16,
        fontFamily: ES.sans, fontSize: 9, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: ES.muted,
      } }, rec.type),
      React.createElement('img', { src: rec.image, alt: rec.model,
        style: {
          maxWidth: '70%', maxHeight: '90%', objectFit: 'contain',
          filter: 'drop-shadow(0 12px 22px rgba(26,20,16,0.18))',
        }
      }),
    ),
    React.createElement('div', { style: { padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' } },
      React.createElement(Kicker, { color: ES.gold, style: { marginBottom: 8, fontSize: 9 } }, rec.addressesLabel),
      React.createElement('div', { style: {
        fontFamily: ES.sans, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: ES.ink, marginBottom: 6,
      } }, rec.brand),
      React.createElement('div', { style: {
        fontFamily: ES.serif, fontSize: 22, fontWeight: 400, lineHeight: 1.1,
        color: ES.ink, marginBottom: 6,
      } }, React.createElement(Em, null, rec.model)),
      React.createElement('div', { style: {
        fontFamily: ES.sans, fontSize: 11, color: ES.muted, marginBottom: 14, letterSpacing: '0.04em',
      } }, `Ref. ${rec.ref}\u2002\u00b7\u2002${rec.size} mm`),

      React.createElement('p', { style: {
        fontFamily: ES.serif, fontStyle: 'italic', fontSize: 13.5,
        lineHeight: 1.55, color: ES.inkSoft, margin: 0, marginBottom: 16,
        flex: 1, textWrap: 'pretty',
      } }, rec.thesis),

      React.createElement('div', { style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 14, borderTop: `1px solid ${ES.border}`,
      } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: ES.serif, fontSize: 16, color: ES.ink } },
            `${fmtK(rec.priceLow)} \u2013 ${fmtK(rec.priceHigh)}`),
          React.createElement('div', { style: { fontFamily: ES.sans, fontSize: 10, color: ES.muted, marginTop: 2 } },
            `Median ${fmt(rec.marketMedian)}`),
        ),
        React.createElement(LinkAction, null, 'Find on market \u2197'),
      ),
    )
  );

const NextSlot = ({ recs }) =>
  React.createElement(Section, { padTop: 56, padBottom: 32 },
    React.createElement('div', { 'data-screen-label': '04 Next Slot', id: 'next-slot' },
      React.createElement(SectionHeader, {
        kicker: '\u00a7 03', title: 'For your next slot.', italic: true,
        sub: 'Watches not yet in your box. Three alternative reads across the same gap, in different price tiers.',
      }),
      React.createElement('div', { className: 'vwb-nextslot-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 } },
        recs.map(r => React.createElement(NextSlotCard, { key: r.id, rec: r })),
      )
    )
  );

// ─── 5 · Upgrade This Strap ─────────────────────────────────────────────
// Each strap renders its material as a CSS texture swatch (no fake photo).
// Materials read by signature: leather grain, suede nap, NATO stripes, etc.
const STRAP_TEXTURES = {
  'leather-black': {
    base: '#1A1410',
    overlay: 'radial-gradient(ellipse 70% 90% at 35% 30%, rgba(255,255,255,0.07) 0%, transparent 60%), repeating-linear-gradient(125deg, transparent 0 18px, rgba(0,0,0,0.22) 18px 19px), repeating-linear-gradient(40deg, transparent 0 22px, rgba(0,0,0,0.16) 22px 23px), linear-gradient(155deg, #2E2922 0%, #1A1410 70%)',
    stitch: '#7A5230',
  },
  'suede-brown': {
    base: '#7A5430',
    overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), linear-gradient(180deg, #9A7752 0%, #6F4926 100%)',
    stitch: '#E0C599',
  },
  'rubber': {
    base: '#1C1C1C',
    overlay: 'radial-gradient(circle 1.5px at 3px 3px, rgba(255,255,255,0.10) 50%, transparent 51%), radial-gradient(circle 1.5px at 9px 9px, rgba(255,255,255,0.06) 50%, transparent 51%), linear-gradient(180deg, #2A2A2A 0%, #161616 100%)',
    overlaySize: '12px 12px, 12px 12px, auto',
    stitch: 'transparent',
  },
  'nato': {
    base: '#44523B',
    overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, #44523B 0 22px, #C9A84C 22px 26px, #44523B 26px 56px, #8A3838 56px 60px, #44523B 60px 82px)',
    stitch: 'transparent',
  },
  'sailcloth': {
    base: '#1F2330',
    overlay: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.16) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px), linear-gradient(180deg, #2F3441 0%, #1B1F2B 100%)',
    stitch: '#8A8E96',
  },
};

// Strap-shaped swatch with rounded ends, stitch lines, pin holes
const StrapSwatch = ({ id }) => {
  const tex = STRAP_TEXTURES[id] || STRAP_TEXTURES['leather-black'];
  return React.createElement('div', {
    style: {
      position: 'relative', height: 128,
      background: ES.paperWarm,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', borderBottom: `1px solid ${ES.border}`,
    }
  },
    // Subtle background hatch for texture/paper feel
    React.createElement('div', { style: {
      position: 'absolute', inset: 0,
      backgroundImage: 'repeating-linear-gradient(135deg, rgba(168,152,128,0.05) 0 1px, transparent 1px 12px)',
    } }),
    // The strap form
    React.createElement('div', {
      style: {
        position: 'relative',
        width: '82%', height: 52, borderRadius: 7,
        background: tex.base,
        backgroundImage: tex.overlay || 'none',
        backgroundSize: tex.overlaySize || 'auto',
        boxShadow: '0 10px 18px rgba(26,20,16,0.22), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.25)',
      }
    },
      // Stitch lines
      tex.stitch !== 'transparent' && React.createElement('div', {
        style: {
          position: 'absolute', top: 6, left: 10, right: 10, height: 1,
          borderTop: `1px dashed ${tex.stitch}`, opacity: 0.55,
        }
      }),
      tex.stitch !== 'transparent' && React.createElement('div', {
        style: {
          position: 'absolute', bottom: 6, left: 10, right: 10, height: 1,
          borderTop: `1px dashed ${tex.stitch}`, opacity: 0.55,
        }
      }),
      // Pin holes near one end
      React.createElement('div', {
        style: {
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }
      },
        [0, 1, 2].map(i =>
          React.createElement('div', { key: i, style: {
            width: 3, height: 3, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            boxShadow: 'inset 0 0 1px rgba(255,255,255,0.1), 0 1px 0 rgba(255,255,255,0.06)',
          } })
        )
      ),
    )
  );
};

const StrapCard = ({ s }) =>
  React.createElement('article', {
    style: {
      background: ES.slot, border: `1px solid ${ES.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }
  },
    React.createElement(StrapSwatch, { id: s.id }),
    React.createElement('div', { style: { padding: '18px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 } },
        React.createElement('div', { style: {
          fontFamily: ES.serif, fontSize: 20, fontWeight: 400, color: ES.ink, lineHeight: 1.1,
        } }, s.label),
        React.createElement(Kicker, { color: ES.muted, style: { fontSize: 9 } }, '20 mm'),
      ),
      React.createElement('div', { style: {
        fontFamily: ES.sans, fontSize: 11, color: ES.muted, marginBottom: 14, letterSpacing: '0.03em',
      } }, `${s.material}\u2002\u00b7\u2002${s.use}`),
      React.createElement('button', { style: {
        fontFamily: ES.sans, fontSize: 10.5, fontWeight: 500,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: ES.gold,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        textAlign: 'left', marginTop: 'auto',
      } }, 'Explore strap swap \u2197'),
    ),
  );

const UpgradeStrap = ({ summary }) =>
  React.createElement(Section, { padTop: 56, padBottom: 32 },
    React.createElement('div', { 'data-screen-label': '05 Upgrade Strap', id: 'straps' },
      React.createElement(SectionHeader, {
        kicker: '\u00a7 04', title: 'Upgrade this strap.', italic: true,
        sub: summary,
      }),
      React.createElement('div', { className: 'vwb-strap-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 } },
        STRAPS.map(s => React.createElement(StrapCard, { key: s.id, s })),
      ),
      React.createElement('div', { style: {
        marginTop: 16, fontFamily: ES.serif, fontStyle: 'italic', fontSize: 12,
        color: ES.muted, letterSpacing: '0.02em',
      } }, 'Compatibility filtered by your owned lug widths. Affiliate partners coming soon.'),
    )
  );

// ─── 6 · Upgrade This Box ───────────────────────────────────────────────
// Top-down rendering: wood-grain interior + slot pillows. Different woods per
// box. No fake product shot; honest CSS schematic with material identity.
const BOX_FINISHES = {
  'Suede':  {
    wood: 'linear-gradient(180deg, #C9A674 0%, #A88858 100%)',
    grain: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 4px)',
    pillow: '#F0E2C2', pillowDark: '#D8C49A',
    frame: '#7E5C32',
  },
  'Oak':    {
    wood: 'linear-gradient(180deg, #B6864F 0%, #8A5F30 100%)',
    grain: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 14px)',
    pillow: '#ECDDB6', pillowDark: '#CFBA8C',
    frame: '#5A3A18',
  },
  'Walnut': {
    wood: 'linear-gradient(180deg, #5A3920 0%, #3A2412 100%)',
    grain: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.14) 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 18px)',
    pillow: '#D6C49A', pillowDark: '#B9A276',
    frame: '#22150A',
  },
};

const BoxRender = ({ capacity, finish }) => {
  const n = parseInt(capacity, 10) || 6;
  const cols = n === 3 ? 3 : n === 6 ? 3 : 5;
  const rows = Math.ceil(n / cols);
  const fin = BOX_FINISHES[finish] || BOX_FINISHES['Oak'];

  return React.createElement('div', {
    style: {
      position: 'relative', height: 188,
      background: fin.wood,
      backgroundImage: fin.grain + ', ' + fin.wood,
      padding: 16,
      borderBottom: `1px solid ${fin.frame}`,
      borderTop: `1px solid ${fin.frame}`,
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10), inset 0 6px 12px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }
  },
    // Inner frame inset (gives the lid-removed feel)
    React.createElement('div', {
      style: {
        flex: 1, alignSelf: 'stretch',
        margin: '4px 2px',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 8,
        padding: 8,
        background: 'rgba(0,0,0,0.18)',
        borderRadius: 3,
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.35), inset 0 -1px 2px rgba(255,255,255,0.04)',
      }
    },
      Array.from({ length: n }).map((_, i) =>
        // Slot pillow
        React.createElement('div', {
          key: i,
          style: {
            position: 'relative',
            borderRadius: 4,
            background: `linear-gradient(160deg, ${fin.pillow} 0%, ${fin.pillowDark} 100%)`,
            boxShadow: '0 1px 2px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.18)',
          }
        },
          // Subtle dimple in the middle (where a watch rests)
          React.createElement('div', { style: {
            position: 'absolute', left: '20%', right: '20%', top: '38%', bottom: '38%',
            background: 'rgba(0,0,0,0.10)',
            borderRadius: '50%',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)',
            filter: 'blur(0.3px)',
          } })
        )
      )
    ),
  );
};

const BoxCard = ({ b, fit }) =>
  React.createElement('article', {
    style: {
      background: ES.slot, border: `1px solid ${fit ? ES.gold : ES.border}`,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }
  },
    fit && React.createElement('div', {
      style: {
        position: 'absolute', top: 14, left: 14, zIndex: 2,
        fontFamily: ES.sans, fontSize: 9, fontWeight: 600,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        padding: '4px 10px', borderRadius: 20,
        background: ES.gold, color: ES.ink,
      }
    }, 'Best fit'),

    React.createElement(BoxRender, { capacity: b.capacity, finish: b.finish }),

    React.createElement('div', { style: { padding: '22px 24px 20px', flex: 1, display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 } },
        React.createElement(Kicker, { color: ES.muted, style: { fontSize: 9 } }, b.partner),
        React.createElement(Kicker, { color: ES.muted, style: { fontSize: 9 } }, `${b.capacity}\u2002\u00b7\u2002${b.finish}`),
      ),
      React.createElement('div', { style: {
        fontFamily: ES.serif, fontSize: 22, fontWeight: 400, color: ES.ink, marginBottom: 8, lineHeight: 1.1,
      } }, b.label),
      React.createElement('p', { style: {
        fontFamily: ES.sans, fontSize: 12, color: ES.mutedDark, margin: 0, marginBottom: 18, lineHeight: 1.5,
      } }, b.desc),

      React.createElement('div', { style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 14, borderTop: `1px solid ${ES.border}`, marginTop: 'auto',
      } },
        React.createElement('div', { style: { fontFamily: ES.serif, fontSize: 20, color: ES.ink } }, b.price),
        React.createElement(LinkAction, null, `${b.cta} \u2197`),
      ),
    ),
  );

const UpgradeBox = () =>
  React.createElement(Section, { padTop: 56, padBottom: 32 },
    React.createElement('div', { 'data-screen-label': '06 Upgrade Box', id: 'box' },
      React.createElement(SectionHeader, {
        kicker: '\u00a7 05', title: 'Upgrade this box.', italic: true,
        sub: 'Physical cases for the collection you actually own. Sized to your slot count.',
      }),
      React.createElement('div', { className: 'vwb-box-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 } },
        WATCHBOXES.map((b, i) => React.createElement(BoxCard, { key: b.id, b, fit: i === 1 })),
      ),
      React.createElement('div', { style: {
        marginTop: 16, fontFamily: ES.serif, fontStyle: 'italic', fontSize: 12,
        color: ES.muted,
      } }, 'Virtual Watchbox may earn a commission on box purchases.'),
    )
  );

// ─── 7 · From the Watch World ───────────────────────────────────────────
const NewsCard = ({ n }) =>
  React.createElement('article', { style: { display: 'flex', flexDirection: 'column', cursor: 'pointer' } },
    React.createElement('div', { style: {
      background: ES.paperWarm, aspectRatio: '4/3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 14, position: 'relative', overflow: 'hidden',
    } },
      React.createElement('img', { src: n.img, alt: n.headline,
        style: {
          maxWidth: '78%', maxHeight: '88%', objectFit: 'contain',
          filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.18))',
        }
      }),
      n.isNew && React.createElement('div', { style: {
        position: 'absolute', top: 10, right: 10,
        fontFamily: ES.sans, fontSize: 8.5, fontWeight: 600,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        padding: '3px 7px', background: ES.gold, color: ES.ink, borderRadius: 2,
      } }, 'New'),
    ),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
      React.createElement(Kicker, { color: ES.gold, style: { fontSize: 9 } }, n.source),
      React.createElement('span', { style: {
        fontFamily: ES.sans, fontSize: 10, color: ES.muted, letterSpacing: '0.04em',
      } }, n.when),
    ),
    React.createElement('h3', { style: {
      fontFamily: ES.serif, fontSize: 18, fontWeight: 400, lineHeight: 1.18,
      margin: 0, marginBottom: 6, color: ES.ink, textWrap: 'balance',
    } }, n.headline),
    React.createElement('p', { style: {
      fontFamily: ES.sans, fontSize: 12, color: ES.mutedDark, margin: 0, lineHeight: 1.55,
      textWrap: 'pretty',
    } }, n.excerpt),
  );

const FromTheWatchWorld = () =>
  React.createElement(Section, { padTop: 56, padBottom: 80 },
    React.createElement('div', { 'data-screen-label': '07 News', id: 'news' },
      React.createElement(SectionHeader, {
        kicker: '\u00a7 06', title: 'From the watch world.', italic: true,
        sub: 'The latest from the publications collectors trust. Tagged for your brands of interest.',
      }),
      React.createElement('div', { className: 'vwb-news-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 } },
        NEWS.map((n, i) => React.createElement(NewsCard, { key: i, n })),
      ),
      React.createElement('div', { style: { marginTop: 28, display: 'flex', justifyContent: 'flex-end' } },
        React.createElement(LinkAction, null, 'View all news \u2192'),
      ),
    )
  );

// ─── Page ───────────────────────────────────────────────────────────────
const DiscoverEditorial = ({ personalized = true }) => {
  const insight   = personalized ? BOX_INSIGHT : GUEST_INSIGHT;
  const recs      = personalized ? NEXT_SLOT   : GUEST_NEXT_SLOT;
  const lead      = personalized ? LEAD        : GUEST_LEAD;
  const upgrades  = personalized ? UPGRADES    : UPGRADES.slice(0, 2);

  return React.createElement('div', { style: { background: ES.bg, color: ES.ink, fontFamily: ES.sans } },
    React.createElement(EditorialHero,    { personalized, insight }),
    React.createElement(CompleteTheBox,   { lead, personalized }),
    personalized && React.createElement(UpgradeThisWatch, { upgrades }),
    React.createElement(NextSlot,         { recs }),
    React.createElement(UpgradeStrap,     { summary: STRAP_SUMMARY }),
    React.createElement(UpgradeBox),
    React.createElement(FromTheWatchWorld),
  );
};

Object.assign(window, { DiscoverEditorial, SectionNav });
