/**
 * Virtual Watchbox — Brand & Design Tokens
 *
 * Single source of truth for all visual constants used in inline styles.
 * See docs/DESIGN_SYSTEM.md for usage guidance.
 */

export const brand = {
  colors: {
    /** Page background — warm cream */
    bg: '#FAF8F4',
    /** Watch slot / card / sidebar fill — lighter cream */
    slot: '#FFFCF7',
    /** Primary text, dark buttons */
    ink: '#1A1410',
    /** Body text — slightly softer than ink */
    inkSoft: '#3F362C',
    /** Secondary text, meta labels */
    muted: '#A89880',
    /** Subtitle body color — darker than muted */
    mutedDark: '#6F6353',
    /** Watch image card backdrop */
    paper: '#F4EFE6',
    /** Strap / news thumb backdrop */
    paperWarm: '#F1ECE2',
    /** Accent: prices, active states, brand labels */
    gold: '#C9A84C',
    /** Soft gold wash for selected luxury controls */
    goldWash: 'rgba(201,168,76,0.08)',
    /** Soft gold line for selected luxury controls */
    goldLine: 'rgba(201,168,76,0.34)',
    /** Dark badge background */
    dark: '#2A2520',
    /** Pure white — card surfaces */
    white: '#FFFFFF',
    /** Primary dividers */
    border: '#EAE5DC',
    /** Card borders */
    borderMid: '#E8E2D8',
    /** Secondary borders, light button borders */
    borderLight: '#D4CBBF',
    /** Empty slot dashed border */
    borderSlot: '#D0C9BE',
    /** Hero dark panel — start */
    heroDark1: '#1e1b16',
    /** Hero dark panel — end */
    heroDark2: '#2a2420',
    /** News card image placeholder gradient — start */
    placeholderStart: '#EDE9E2',
    /** News card image placeholder gradient — end */
    placeholderEnd: '#E0DAD0',
  },

  /** Ownership status badge colors */
  status: {
    owned:          { bg: '#E8F4E8', text: '#2D6A2D' },
    forSale:        { bg: '#FFF8E6', text: '#8A6A10' },
    recentlyAdded:  { bg: '#E8F0FA', text: '#1A4A8A' },
    needsService:   { bg: '#FFF3E0', text: '#8A5010' },
  },

  /** Watch condition badge colors */
  condition: {
    unworn:    { bg: '#E8F4E8', text: '#2D6A2D' },
    likeNew:   { bg: '#EDF4E8', text: '#3A6A2D' },
    excellent: { bg: '#FFF8E6', text: '#8A6A10' },
    good:      { bg: '#FDF0E0', text: '#8A5010' },
    fair:      { bg: '#FAE8E8', text: '#8A2020' },
  },

  /**
   * Service Room status palette — overdue / due-soon / on-track.
   * Each carries a tinted pill (bg/fg) plus a saturated dot/track color for
   * the Service Horizon markers and timeline rails.
   */
  serviceStatus: {
    overdue: { bg: '#FAE8E8', fg: '#8A2020', dot: '#B23A3A', track: '#C25151' },
    due:     { bg: '#FFF3E0', fg: '#8A5010', dot: '#C98A2A', track: '#D69A3A' },
    ok:      { bg: '#E8F4E8', fg: '#2D6A2D', dot: '#5A9A5A', track: '#7BAE7B' },
  },

  /** Warranty countdown chip palette */
  warranty: {
    soon:    { bg: '#FFF8E6', fg: '#8A6A10' },
    active:  { bg: '#E8F0FA', fg: '#1A4A8A' },
    expired: { bg: '#F2EEE7', fg: '#A89880' },
  },

  /** Ownership chips (Box / Papers present-vs-absent) in the dossier strip */
  ownershipChip: {
    presentBg:     '#EEF5EC',
    presentBorder: '#DCEBD8',
    absentBg:      '#F7F2EA',
  },

  /** Service Horizon overdue-zone tint (derived from the overdue dot color) */
  serviceHorizon: {
    overdueZoneBg:     'rgba(178,58,58,0.05)',
    overdueZoneBorder: 'rgba(178,58,58,0.16)',
  },

  /** Papers & Provenance document-tile tints, keyed by document photo type */
  docTint: {
    receipt:        '#8A6A10',
    warranty_card:  '#1A4A8A',
    service_record: '#2D6A2D',
    box_papers:     '#8A5010',
    appraisal:      '#6A3A8A',
    manual:         '#A89880',
  },

  font: {
    /** Cormorant Garamond — display headings, card titles, prices */
    serif: 'var(--font-cormorant)',
    /** DM Sans — UI labels, body, buttons, meta */
    sans: 'var(--font-dm-sans)',
  },

  /** Border radius scale (px) */
  radius: {
    btn:    4,
    sm:     6,
    md:     8,
    lg:     10,
    xl:     12,
    pill:   20,
    circle: 9999,
  },

  /** Box shadow scale */
  shadow: {
    xs:   '0 1px 4px rgba(26,20,16,0.04)',
    sm:   '0 1px 4px rgba(26,20,16,0.05)',
    md:   '0 4px 16px rgba(26,20,16,0.08)',
    menu: '0 14px 32px rgba(26,20,16,0.12), 0 3px 10px rgba(26,20,16,0.06)',
    lg:   '0 4px 24px rgba(26,20,16,0.06)',
    xl:   '0 8px 24px rgba(26,20,16,0.13)',
    drop: 'drop-shadow(0 8px 16px rgba(26,20,16,0.10))',
    gold: '0 0 0 1px rgba(201,168,76,0.4), 0 6px 24px rgba(201,168,76,0.12)',
  },

  /** Transition shorthand strings */
  transition: {
    fast:   '0.15s ease',
    base:   '0.18s ease',
    slide:  '0.2s ease',
    sheet:  '0.28s cubic-bezier(0.32, 0.72, 0, 1)',
    smooth: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /** Z-index stack */
  zIndex: {
    nav:       100,
    dropdown:  110,
    sidebar:    40,
    backdrop:   30,
    overflow:  191,
  },

  controls: {
    dropdown: {
      minWidth: 168,
      triggerHeight: 40,
      menuOffset: 8,
      menuPadding: 6,
      optionMinHeight: 36,
    },
    iconButton: {
      size: 36,
      svgSize: 16,
      radius: 6,
    },
  },
} as const
