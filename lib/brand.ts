/**
 * Virtual Watchbox — Brand & Design Tokens
 *
 * Single source of truth for all visual constants used in inline styles.
 * See docs/DESIGN_SYSTEM.md for usage guidance.
 */

import type { CSSProperties } from 'react'

export const brand = {
  colors: {
    /** Page background — warm cream */
    bg: '#FAF8F4',
    /** Watch slot / card / sidebar fill — lighter cream */
    slot: '#FFFCF7',
    /** Primary text, dark buttons */
    ink: '#1A1410',
    /** Strong secondary / body text — softer than ink (readability pass) */
    inkSoft: '#43392E',
    /** Secondary/meta text — readability pass (WAS #A89880 ~2.5:1 → 6.2:1 AA on cream) */
    muted: '#6A5B48',
    /** Subtitle body color — companion to muted */
    mutedDark: '#6F6353',
    /** Decorative ONLY — slot numbers, hairlines. Never load-bearing text */
    faint: '#9A8B73',
    /** Watch image card backdrop */
    paper: '#F4EFE6',
    /** Strap / news thumb backdrop */
    paperWarm: '#F1ECE2',
    /** BRIGHT gold — dark surfaces & decorative accents ONLY (fails as text on cream) */
    gold: '#C9A84C',
    /** Antique gold — prices, labels, links & accents on LIGHT surfaces (4.9:1 AA) */
    goldDeep: '#876A12',
    /** Soft gold wash for selected luxury controls */
    goldWash: 'rgba(201,168,76,0.08)',
    /** Soft gold line for selected luxury controls */
    goldLine: 'rgba(201,168,76,0.34)',
    /** Dark badge background */
    dark: '#2A2520',
    /** Empty-state sample tray — oak frame gradient (start → end) */
    trayStart: '#C99A5B',
    trayEnd: '#B6863F',
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
    /** Body/heading text on dark surfaces */
    onDark: '#F5F1E9',
    /** Muted/meta text on dark surfaces (7.8:1 on #1C1814) */
    onDarkMuted: '#B8AB95',
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
   * Strap-fit compatibility palette (Feature 7 / Strap Drawer).
   * `fits` / `excluded` / `unknown` tint the card footer dot + sidebar rows;
   * `destructive` is the delete-action ink.
   */
  fit: {
    fits:        { bg: '#EDF4E8', text: '#3A6A2D', dot: '#3A6A2D' },
    excluded:    { bg: '#F3EEE7', text: '#A89880', dot: '#D4CBBF' },
    unknown:     { bg: '#FBF3DC', text: '#8A6A10', dot: '#C9A84C' },
    destructive: '#8A2020',
    /** Lug-width spec badge — gold-wash chip */
    widthBadge:  { bg: '#FBF6EA', text: '#A8862F', border: 'rgba(201,168,76,0.35)' },
    /** Plain spec badge — material / style */
    plainBadge:  { bg: '#F6F1E9', text: '#6F6353' },
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
  },

  font: {
    /** Cormorant Garamond — display headings, card titles, prices */
    serif: 'var(--font-cormorant)',
    /** DM Sans — UI labels, body, buttons, meta */
    sans: 'var(--font-dm-sans)',
  },

  /**
   * Type scale (px) — Readability pass. Hard 11px floor for any real text.
   * Display roles use the serif; body/label/price roles use the sans.
   * Source of truth for new code; legacy inline sizes migrate toward these.
   */
  text: {
    /** Hero H1 */
    hero:       'clamp(54px, 6vw, 90px)',
    /** Section H2 */
    h2:         'clamp(33px, 3.6vw, 46px)',
    /** Page masthead title — one per page; sits below the homepage hero */
    pageTitle:  'clamp(34px, 4.5vw, 48px)',
    /** H3 / sidebar title */
    h3:          26,
    /** Card title */
    cardTitle:   21,
    /** Lead / intro copy */
    lead:        18,
    /** Body default */
    body:        15,
    /** Caption — paragraph floor */
    bodySm:      14,
    /** Small body / dense UI */
    bodyXs:      13,
    /** Uppercase UI label */
    label:       12,
    /** Smallest label — hard floor, tertiary only */
    labelSm:     11,
    /** Large price */
    priceLg:     27,
    /** Price */
    price:       20,
    /** Small price */
    priceSm:     18,
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

  /**
   * Strap Studio surface (Feature 7). Light product-photography canvas (the
   * straps/watches are shot on white) with the site's cream + ink + gold
   * palette. Values mirror colors.* so the Studio stays in the brand system.
   */
  studio: {
    /** Page canvas — site cream with a faint white halo behind the watch. */
    canvas: 'radial-gradient(ellipse 64% 44% at 50% 32%, rgba(255,255,255,0.85) 0%, rgba(250,248,244,0) 70%), #FAF8F4',
    /** Flat background fallback (matches colors.bg). */
    void: '#FAF8F4',
    /** Panels / trays / dropdowns / sheets. */
    panel: '#FFFFFF',
    panelSolid: '#FFFFFF',
    /** Hairline borders (mirror colors.borderLight / colors.border). */
    hairline: '#D4CBBF',
    hairlineSoft: '#EAE5DC',
    /** Text tiers (mirror colors.ink / inkSoft / muted). */
    textHi: '#1A1410',
    textMid: '#43392E',
    textLow: '#6A5B48',
    /** Soft warm shadow beneath the composite. */
    compositeShadow: '0 24px 44px rgba(26,20,16,0.14)',
  },
} as const

/**
 * Page masthead type system — eyebrow -> serif title -> subtitle.
 * One canonical treatment for every page title. Spread into inline styles,
 * or use <PageMasthead/>. The *OnDark variants are for dark-surface mastheads.
 */
const mastheadEyebrow: CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: brand.text.label,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
}
const mastheadTitle: CSSProperties = {
  fontFamily: brand.font.serif,
  fontSize: brand.text.pageTitle,
  fontWeight: 400,
  lineHeight: 1.1,
  letterSpacing: '-0.01em',
  color: brand.colors.ink,
  margin: 0,
}
const mastheadSubtitle: CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: brand.text.body,
  fontWeight: 400,
  lineHeight: 1.6,
  color: brand.colors.muted,
  margin: 0,
}
export const masthead: Record<
  'eyebrow' | 'title' | 'subtitle' | 'titleOnDark' | 'subtitleOnDark',
  CSSProperties
> = {
  eyebrow: mastheadEyebrow,
  title: mastheadTitle,
  subtitle: mastheadSubtitle,
  titleOnDark: { ...mastheadTitle, color: brand.colors.onDark },
  subtitleOnDark: { ...mastheadSubtitle, color: brand.colors.onDarkMuted },
}
