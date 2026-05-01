'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import ResponsiveSidebarSheet from '@/components/collection/ResponsiveSidebarSheet'
import WatchBox from '@/components/collection/WatchBox'
import WatchCard from '@/components/collection/WatchCard'
import WatchSidebar from '@/components/collection/WatchSidebar'
import { getStateIcon } from '@/components/collection/WatchStateIcons'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import DialSVG from '@/components/watchbox/DialSVG'
import { brand } from '@/lib/brand'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import {
  copyProfileDemoUrl,
  createCollectionBoxSnapshot,
  createDefaultProfileDemoState,
  createPlaygroundBoxSnapshot,
  getBoxSharePath,
  getOrCreatePublicProfileSnapshot,
  getProfileDemoState,
  getProfileSharePath,
  getPublicBoxSnapshotBySlug,
  getStoredPlaygroundBoxes,
  resizeImageFileToDataUrl,
  saveProfileDemoState,
  syncPublicProfileSnapshot,
} from '@/lib/profileDemo'
import { getOverflowSummary, getWatchboxOverflow } from '@/lib/watchboxOverflow'
import type {
  ProfileDemoState,
  ProfileVisibilitySettings,
  PublicBoxSnapshot,
  PublicCollectionStats,
  PublicFollowedWatchSnapshot,
  PublicProfileSnapshot,
  PublicProfileSummaryStats,
} from '@/types/profile'
import type { PlaygroundBox, ResolvedWatch, WatchSavedState } from '@/types/watch'

const WATCHBOX_WIDTH_PADDING = 64
const WATCHBOX_HEIGHT_PADDING = 72
const WATCHBOX_GAP = 6
const PREVIEW_WIDTH_PADDING = 38
const PREVIEW_HEIGHT_PADDING = 45
const PREVIEW_GAP = 5
const ROWS = 2
const SECTION_IDS = {
  box: 'profile-the-box',
  dreamBoxes: 'profile-dream-boxes',
  radar: 'profile-on-the-radar',
  stats: 'profile-stats',
} as const

function fmtCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function marketHref(watch: { brand: string; model: string }) {
  return `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(`${watch.brand} ${watch.model}`)}`
}

function getPublicHandle(displayName: string) {
  const normalized = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

  return `@${normalized || 'collector'}`
}

function getProfileHeroSummary(stats: PublicProfileSummaryStats) {
  return `${stats.collectionCount} in the box · ${stats.playgroundBoxCount} dream boxes · ${stats.followedCount} on the radar`
}

function calcSlotPx(
  containerWidth: number,
  maxHeight: number,
  columns: number,
  widthPadding: number,
  heightPadding: number,
  gap: number,
) {
  const slotFromWidth = (containerWidth - widthPadding - ((columns - 1) * gap)) / columns
  const slotFromHeight = ((maxHeight - heightPadding) * 3) / (4 * ROWS)
  return Math.max(16, Math.min(slotFromWidth, slotFromHeight))
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getSectionShellStyle(): CSSProperties {
  return {
    background: brand.colors.white,
    border: `1px solid ${brand.colors.border}`,
    borderRadius: brand.radius.xl,
    padding: 24,
    boxShadow: brand.shadow.xs,
  }
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  function showToast(nextMessage: string) {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)

    setMessage(nextMessage)
    showTimer.current = setTimeout(() => {
      hideTimer.current = setTimeout(() => setMessage(null), 300)
    }, 2500)
  }

  return { message, showToast }
}

function FloatingToast({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '11px 16px',
        borderRadius: brand.radius.md,
        background: brand.colors.ink,
        color: brand.colors.bg,
        fontFamily: brand.font.sans,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.04em',
        boxShadow: brand.shadow.xl,
        zIndex: 320,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
      aria-live="polite"
    >
      {message}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  hiddenFromPreview = false,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  hiddenFromPreview?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
            {eyebrow}
          </span>
          {hiddenFromPreview && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 9px',
                borderRadius: brand.radius.pill,
                background: brand.colors.goldWash,
                color: brand.colors.gold,
                border: `1px solid ${brand.colors.goldLine}`,
                fontFamily: brand.font.sans,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Hidden in Public Preview
            </span>
          )}
        </div>
        <h2 style={{ fontFamily: brand.font.serif, fontSize: 34, fontWeight: 400, color: brand.colors.ink, margin: '0 0 6px', lineHeight: 1.05 }}>
          {title}
        </h2>
        {description ? (
          <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.6 }}>
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div> : null}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  href,
  tone = 'secondary',
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  tone?: 'primary' | 'secondary'
}) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    borderRadius: brand.radius.btn,
    border: tone === 'primary' ? 'none' : `1px solid ${brand.colors.borderLight}`,
    background: tone === 'primary' ? brand.colors.ink : brand.colors.white,
    color: tone === 'primary' ? brand.colors.bg : brand.colors.ink,
    fontFamily: brand.font.sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    cursor: 'pointer',
  }

  if (href) {
    return (
      <Link href={href} style={style}>
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  )
}

function SummaryStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      style={{
        background: brand.colors.bg,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.lg,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: brand.font.serif, fontSize: 24, color: brand.colors.ink, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

function StatsStrip({ stats }: { stats: PublicProfileSummaryStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryStat label="Collection" value={String(stats.collectionCount)} />
      <SummaryStat label="Followed" value={String(stats.followedCount)} />
      <SummaryStat label="Dream Boxes" value={String(stats.playgroundBoxCount)} />
      <SummaryStat label="Collection Value" value={fmtCurrency(stats.totalEstimatedValue)} />
    </div>
  )
}

function ProfileAvatar({
  displayName,
  imageUrl,
  size = 112,
}: {
  displayName: string
  imageUrl: string
  size?: number
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: brand.radius.circle,
        overflow: 'hidden',
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        position: 'relative',
        boxShadow: brand.shadow.sm,
        flexShrink: 0,
      }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes={`${size}px`}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brand.colors.gold,
            fontFamily: brand.font.serif,
            fontSize: Math.round(size * 0.34),
            letterSpacing: '0.04em',
          }}
        >
          {getInitials(displayName)}
        </div>
      )}
    </div>
  )
}

function UploadButton({
  label,
  onSelect,
}: {
  label: string
  onSelect: (file: File) => Promise<void> | void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async event => {
          const file = event.target.files?.[0]
          if (!file) return
          await onSelect(file)
          event.target.value = ''
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '9px 12px',
          borderRadius: brand.radius.btn,
          border: `1px solid ${brand.colors.borderLight}`,
          background: brand.colors.white,
          color: brand.colors.ink,
          fontFamily: brand.font.sans,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    </>
  )
}

function IconCircleButton({
  label,
  onClick,
  children,
  tone = 'light',
}: {
  label: string
  onClick: () => void
  children: ReactNode
  tone?: 'light' | 'dark'
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: brand.radius.circle,
        border: `1px solid ${tone === 'dark' ? brand.colors.borderLight : brand.colors.border}`,
        background: tone === 'dark' ? brand.colors.ink : brand.colors.white,
        color: tone === 'dark' ? brand.colors.bg : brand.colors.ink,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: brand.shadow.sm,
      }}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.2 11.75V13.8h2.05l6.05-6.05-2.05-2.05-6.05 6.05zm9.65-5.35a.68.68 0 000-.95l-1.3-1.3a.68.68 0 00-.95 0l-.9.9 2.05 2.05.9-.9z" fill="currentColor" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.95 1.9h2.1l.35 1.45c.3.12.58.28.84.48l1.42-.43 1.05 1.82-1.08 1c.03.18.05.36.05.55s-.02.37-.05.55l1.08 1-1.05 1.82-1.42-.43c-.26.2-.54.36-.84.48l-.35 1.45h-2.1l-.35-1.45a4.4 4.4 0 01-.84-.48l-1.42.43-1.05-1.82 1.08-1a3.9 3.9 0 010-1.1l-1.08-1L4.74 3.4l1.42.43c.26-.2.54-.36.84-.48L6.95 1.9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function ProfileCoverArt({
  imageUrl,
  alt,
  children,
  minHeight = 220,
}: {
  imageUrl?: string
  alt: string
  children?: ReactNode
  minHeight?: number
}) {
  const placeholderSrc = '/profile-cover-placeholder.png'
  const [activeSrc, setActiveSrc] = useState<string | null>(imageUrl || placeholderSrc)

  useEffect(() => {
    setActiveSrc(imageUrl || placeholderSrc)
  }, [imageUrl])

  return (
    <div
      style={{
        position: 'relative',
        minHeight,
        background: `linear-gradient(135deg, ${brand.colors.heroDark1}, ${brand.colors.heroDark2})`,
        overflow: 'hidden',
      }}
    >
      {activeSrc ? (
        <Image
          src={activeSrc}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 1280px"
          style={{ objectFit: 'cover' }}
          onError={() => {
            if (activeSrc !== placeholderSrc) {
              setActiveSrc(placeholderSrc)
              return
            }

            setActiveSrc(null)
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, rgba(26,20,16,0.24), rgba(26,20,16,0.72))`,
        }}
      />
      {children}
    </div>
  )
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,20,16,0.42)',
          backdropFilter: 'blur(3px)',
          zIndex: 260,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: '50% auto auto 50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(92vw, 520px)',
          maxHeight: '84vh',
          overflowY: 'auto',
          background: brand.colors.white,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: brand.radius.xl,
          boxShadow: brand.shadow.xl,
          zIndex: 261,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: brand.font.serif, fontSize: 30, color: brand.colors.ink, lineHeight: 1.05 }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: brand.colors.muted,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

function ProfileTextEditModal({
  open,
  profile,
  onClose,
  onSave,
}: {
  open: boolean
  profile: ProfileDemoState
  onClose: () => void
  onSave: (nextValues: { displayName: string; bio: string }) => void
}) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio)

  useEffect(() => {
    if (!open) return
    setDisplayName(profile.displayName)
    setBio(profile.bio)
  }, [open, profile.bio, profile.displayName])

  return (
    <ModalShell open={open} title="Edit Profile" onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
            Display Name
          </span>
          <input
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: brand.radius.lg,
              border: `1px solid ${brand.colors.borderMid}`,
              background: brand.colors.white,
              color: brand.colors.ink,
              fontFamily: brand.font.sans,
              fontSize: 14,
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
            Bio / Tagline
          </span>
          <textarea
            rows={4}
            value={bio}
            onChange={event => setBio(event.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: brand.radius.lg,
              border: `1px solid ${brand.colors.borderMid}`,
              background: brand.colors.white,
              color: brand.colors.ink,
              fontFamily: brand.font.sans,
              fontSize: 14,
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <ActionButton onClick={onClose}>Cancel</ActionButton>
        <ActionButton
          tone="primary"
          onClick={() => {
            onSave({ displayName: displayName.trim() || profile.displayName, bio })
            onClose()
          }}
        >
          Save
        </ActionButton>
      </div>
    </ModalShell>
  )
}

function ImageAssetModal({
  open,
  title,
  uploadLabel,
  showRemove,
  onClose,
  onUpload,
  onRemove,
}: {
  open: boolean
  title: string
  uploadLabel: string
  showRemove: boolean
  onClose: () => void
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
}) {
  return (
    <ModalShell open={open} title={title} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <UploadButton label={uploadLabel} onSelect={async file => {
          await onUpload(file)
          onClose()
        }} />
        {showRemove ? <ActionButton onClick={() => { onRemove(); onClose() }}>Remove</ActionButton> : null}
      </div>
    </ModalShell>
  )
}

function VisibilityModal({
  open,
  visibility,
  onClose,
  onChange,
}: {
  open: boolean
  visibility: ProfileVisibilitySettings
  onClose: () => void
  onChange: (nextVisibility: ProfileVisibilitySettings) => void
}) {
  return (
    <ModalShell open={open} title="Profile Visibility" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3">
        <VisibilityToggle
          label="My Collection"
          description="Show The Box on the profile."
          checked={visibility.showCollection}
          onChange={checked => onChange({ ...visibility, showCollection: checked })}
        />
        <VisibilityToggle
          label="Collection Stats"
          description="Show the value and collection stat chips."
          checked={visibility.showCollectionStats}
          onChange={checked => onChange({ ...visibility, showCollectionStats: checked })}
        />
        <VisibilityToggle
          label="Dream Boxes"
          description="Show the Playground carousel."
          checked={visibility.showPlayground}
          onChange={checked => onChange({ ...visibility, showPlayground: checked })}
        />
        <VisibilityToggle
          label="On the Radar"
          description="Show the followed and target watches section."
          checked={visibility.showFollowedWatches}
          onChange={checked => onChange({ ...visibility, showFollowedWatches: checked })}
        />
        <VisibilityToggle
          label="Grail"
          description="Feature the grail in the hero."
          checked={visibility.showGrail}
          onChange={checked => onChange({ ...visibility, showGrail: checked })}
        />
      </div>
    </ModalShell>
  )
}

function GrailPickerModal({
  open,
  hasGrail,
  onClose,
}: {
  open: boolean
  hasGrail: boolean
  onClose: () => void
}) {
  return (
    <ModalShell open={open} title={hasGrail ? 'Change Grail' : 'Choose Grail'} onClose={onClose}>
      <p style={{ margin: '0 0 16px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.7 }}>
        Choose your grail from the watches you already follow.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <ActionButton href="/followed" tone="primary">Open Followed Watches</ActionButton>
        <ActionButton onClick={onClose}>Close</ActionButton>
      </div>
    </ModalShell>
  )
}

function VisibilityToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        padding: '12px 14px',
        borderRadius: brand.radius.lg,
        border: `1px solid ${checked ? brand.colors.goldLine : brand.colors.border}`,
        background: checked ? brand.colors.goldWash : brand.colors.white,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, color: brand.colors.ink, marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, lineHeight: 1.5 }}>
          {description}
        </div>
      </div>

      <div
        style={{
          width: 42,
          height: 24,
          borderRadius: brand.radius.pill,
          background: checked ? brand.colors.ink : brand.colors.borderLight,
          padding: 3,
          flexShrink: 0,
          transition: `background ${brand.transition.base}`,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: brand.radius.circle,
            background: brand.colors.white,
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
            transition: `transform ${brand.transition.base}`,
          }}
        />
      </div>
    </button>
  )
}

function HeroImage({
  imageUrl,
  title,
}: {
  imageUrl: string
  title: string
}) {
  if (!imageUrl) return null

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/6',
        borderRadius: brand.radius.xl,
        overflow: 'hidden',
        marginBottom: 18,
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
      }}
    >
      <Image
        src={imageUrl}
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, 900px"
        style={{ objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, transparent 30%, ${brand.colors.ink} 100%)`,
          opacity: 0.45,
        }}
      />
    </div>
  )
}

function CollectionStatsRow({
  stats,
}: {
  stats: PublicCollectionStats
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ marginBottom: 18 }}>
      <SummaryStat label="Watches" value={String(stats.watchCount)} />
      <SummaryStat label="Collection Value" value={fmtCurrency(stats.totalEstimatedValue)} />
      <SummaryStat label="Brands" value={String(stats.brandCount)} />
    </div>
  )
}

function CrownIcon() {
  return (
    <span style={{ color: brand.colors.gold, display: 'inline-flex' }}>
      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 9.25h8l-.72-4.45-2.08 1.52L6 2.35 4.8 6.32 2.72 4.8 2 9.25z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="0.35" />
      </svg>
    </span>
  )
}

function GrailFeature({
  grailWatch,
  ownerMode = false,
  hiddenFromPreview = false,
}: {
  grailWatch: ResolvedWatch | null
  ownerMode?: boolean
  hiddenFromPreview?: boolean
}) {
  return (
    <section style={getSectionShellStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <CrownIcon />
        <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold }}>
          Grail
        </span>
        {ownerMode && hiddenFromPreview && (
          <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.muted }}>
            Hidden in public preview
          </span>
        )}
      </div>

      {grailWatch ? (
        <div className="grid grid-cols-1 md:grid-cols-[140px,1fr] gap-5 items-center">
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1/1',
              borderRadius: brand.radius.lg,
              overflow: 'hidden',
              background: brand.colors.bg,
              border: `1px solid ${brand.colors.border}`,
            }}
          >
            <Image
              src={grailWatch.imageUrl}
              alt={grailWatch.model}
              fill
              sizes="140px"
              style={{ objectFit: 'contain', padding: 12 }}
            />
          </div>

          <div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 6 }}>
              {grailWatch.brand}
            </div>
            <h3 style={{ fontFamily: brand.font.serif, fontSize: 32, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: '0 0 6px' }}>
              {grailWatch.model}
            </h3>
            <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginBottom: 14 }}>
              Ref. {grailWatch.reference}
            </div>
            <div style={{ fontFamily: brand.font.serif, fontSize: 28, color: brand.colors.gold, marginBottom: 16 }}>
              {fmtCurrency(grailWatch.estimatedValue)}
            </div>
            <a
              href={marketHref(grailWatch)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 16px',
                borderRadius: brand.radius.btn,
                background: brand.colors.ink,
                color: brand.colors.bg,
                fontFamily: brand.font.sans,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Find on Market ↗
            </a>
          </div>
        </div>
      ) : (
        <>
          <h3 style={{ fontFamily: brand.font.serif, fontSize: 28, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: '0 0 10px' }}>
            No grail selected yet.
          </h3>
          <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.6 }}>
            Mark one followed watch as your north star and it will be featured here.
          </p>
        </>
      )}
    </section>
  )
}

function BoxPreviewVisual({
  box,
  variant = 'card',
}: {
  box: PublicBoxSnapshot
  variant?: 'card' | 'feature'
}) {
  const frame = FRAMES.find(item => item.id === box.frame) ?? FRAMES[0]
  const lining = LININGS.find(item => item.id === box.lining) ?? LININGS[0]
  const slotConfig = SLOT_COUNTS.find(item => item.n === box.slotCount) ?? SLOT_COUNTS[1]
  const overflow = getWatchboxOverflow(box.watches, slotConfig.n)
  const visibleSlots = overflow.hasOverflow
    ? [...overflow.visibleItems.slice(0, Math.max(slotConfig.n - 1, 0)), null]
    : Array.from({ length: slotConfig.n }, (_, index) => overflow.visibleItems[index] ?? null)
  const isFeature = variant === 'feature'

  return (
    <div
      style={{
        borderRadius: brand.radius.lg,
        padding: isFeature ? '18px 18px 20px' : '14px 14px 16px',
        background: frame.css,
        boxShadow: frame.shadow,
      }}
    >
      <div
        style={{
          background: lining.color,
          borderRadius: 5,
          padding: isFeature ? 10 : 7,
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${slotConfig.cols}, 1fr)`,
            gap: isFeature ? 6 : PREVIEW_GAP,
          }}
        >
          {visibleSlots.map((watch, index) => {
            const isOverflowSlot = overflow.hasOverflow && index === slotConfig.n - 1

            if (isOverflowSlot) {
              return (
                <div
                  key={`overflow-${box.slug}`}
                  style={{
                    aspectRatio: '3/4',
                    borderRadius: 3,
                    background: lining.slotBg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: brand.colors.ink,
                  }}
                >
                  <span style={{ fontFamily: brand.font.serif, fontSize: 20, lineHeight: 1 }}>+{overflow.overflowCount}</span>
                  <span style={{ fontFamily: brand.font.sans, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
                    More
                  </span>
                </div>
              )
            }

            if (!watch) {
              return (
                <div
                  key={`empty-${index}`}
                  style={{
                    aspectRatio: '3/4',
                    borderRadius: 3,
                    background: lining.slotBg,
                    opacity: 0.42,
                  }}
                />
              )
            }

            return (
              <div
                key={watch.id}
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 3,
                  background: lining.slotBg,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {box.source === 'playground' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <DialSVG
                      dialColor={watch.dialConfig.dialColor}
                      markerColor={watch.dialConfig.markerColor}
                      handColor={watch.dialConfig.handColor}
                      size={isFeature ? 42 : 28}
                    />
                  </div>
                ) : (
                  <Image
                    src={watch.imageUrl}
                    alt={watch.model}
                    fill
                    sizes={isFeature ? '140px' : '90px'}
                    style={{ objectFit: 'cover', objectPosition: 'center 45%' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BoxPreviewCarousel({
  boxes,
  ownerMode = false,
  hiddenFromPreview = false,
  onShareBox,
}: {
  boxes: PublicBoxSnapshot[]
  ownerMode?: boolean
  hiddenFromPreview?: boolean
  onShareBox: (box: PublicBoxSnapshot) => void
}) {
  return (
    <section style={getSectionShellStyle()}>
      <SectionHeader
        eyebrow="Playground"
        title="Dream boxes, lined up."
        description="A horizontal preview of every fantasy box in the collection."
        hiddenFromPreview={ownerMode && hiddenFromPreview}
      />

      {boxes.length > 0 ? (
        <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(260px, 320px)', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {boxes.map(box => (
            <div
              key={box.slug}
              style={{
                background: brand.colors.bg,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radius.xl,
                padding: 16,
                minWidth: 0,
              }}
            >
              <Link href={getBoxSharePath(box.slug)} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 5 }}>
                      {box.subtitle}
                    </div>
                    <div style={{ fontFamily: brand.font.serif, fontSize: 24, color: brand.colors.ink, lineHeight: 1.05, marginBottom: 4 }}>
                      {box.title}
                    </div>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
                      {box.watchCount} watches
                    </div>
                  </div>

                  <BoxPreviewVisual box={box} />
                </div>
              </Link>

              {box.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                  {box.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: brand.radius.pill,
                        border: `1px solid ${brand.colors.border}`,
                        color: brand.colors.muted,
                        fontFamily: brand.font.sans,
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <ActionButton href={getBoxSharePath(box.slug)}>Open Box</ActionButton>
                <ActionButton onClick={() => onShareBox(box)}>Share Box</ActionButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.6 }}>
          No playground boxes yet. Create a dream box in Playground and it will appear here automatically.
        </p>
      )}
    </section>
  )
}

function ReadonlyWatchGridSection({
  eyebrow,
  title,
  description,
  watches,
  emptyCopy,
  hiddenFromPreview = false,
  ownerMode = false,
}: {
  eyebrow: string
  title: string
  description: string
  watches: ResolvedWatch[]
  emptyCopy: string
  hiddenFromPreview?: boolean
  ownerMode?: boolean
}) {
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)
  const activeWatch = watches.find(watch => watch.id === selectedWatchId) ?? null
  const activeIndex = activeWatch ? watches.findIndex(watch => watch.id === activeWatch.id) : -1

  return (
    <section style={getSectionShellStyle()}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        hiddenFromPreview={ownerMode && hiddenFromPreview}
      />

      {watches.length === 0 ? (
        <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.6 }}>
          {emptyCopy}
        </p>
      ) : (
        <>
          <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: activeWatch ? '1fr 300px' : '1fr', gap: 32, alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {watches.map((watch, index) => (
                <WatchCard
                  key={watch.id}
                  watch={watch}
                  mode="saved"
                  stateSource={null}
                  isActive={activeIndex === index}
                  onSelect={() => setSelectedWatchId(selectedWatchId === watch.id ? null : watch.id)}
                />
              ))}
            </div>

            {activeWatch ? (
              <ResponsiveSidebarSheet active={Boolean(activeWatch)} onClose={() => setSelectedWatchId(null)}>
                <WatchSidebar
                  watch={activeWatch}
                  sticky={false}
                  catalogWatchId={activeWatch?.watchId ?? null}
                  mode="public"
                />
              </ResponsiveSidebarSheet>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}

function ReadonlyBoxShowcase({
  box,
  eyebrow,
  title,
  description,
  heroImageUrl = '',
  showCollectionStats = false,
  collectionStats,
  actions,
  footerContent,
}: {
  box: PublicBoxSnapshot
  eyebrow: string
  title: string
  description: string
  heroImageUrl?: string
  showCollectionStats?: boolean
  collectionStats?: PublicCollectionStats
  actions?: ReactNode
  footerContent?: ReactNode
}) {
  const [screenWidth, setScreenWidth] = useState(0)
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)

  useLayoutEffect(() => {
    const update = () => setScreenWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    setSelectedWatchId(null)
  }, [box.slug])

  const slotConfig = SLOT_COUNTS.find(item => item.n === box.slotCount) ?? SLOT_COUNTS[1]
  const overflowSummary = getOverflowSummary(
    slotConfig.n,
    getWatchboxOverflow(box.watches, slotConfig.n).overflowCount,
  )
  const activeSlot = selectedWatchId ? box.watches.findIndex(watch => watch.id === selectedWatchId) : -1
  const activeWatch = activeSlot >= 0 ? box.watches[activeSlot] ?? null : null
  const frame = FRAMES.find(item => item.id === box.frame) ?? FRAMES[0]
  const lining = LININGS.find(item => item.id === box.lining) ?? LININGS[0]
  const isMobile = screenWidth > 0 && screenWidth < 768
  const watchboxContainerWidth = isMobile ? screenWidth - 40 : Math.max(200, screenWidth - 444)
  const watchboxMaxHeight = isMobile ? 300 : 480
  const watchboxSlotWidth = screenWidth > 0
    ? Math.floor(
        calcSlotPx(
          watchboxContainerWidth,
          watchboxMaxHeight,
          slotConfig.cols,
          WATCHBOX_WIDTH_PADDING,
          WATCHBOX_HEIGHT_PADDING,
          WATCHBOX_GAP,
        ),
      )
    : undefined
  const watchboxMaxWidth = watchboxSlotWidth !== undefined
    ? WATCHBOX_WIDTH_PADDING + ((slotConfig.cols - 1) * WATCHBOX_GAP) + (slotConfig.cols * watchboxSlotWidth)
    : undefined

  return (
    <section style={getSectionShellStyle()}>
      <SectionHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <HeroImage imageUrl={heroImageUrl} title={title} />
      {showCollectionStats && collectionStats ? <CollectionStatsRow stats={collectionStats} /> : null}

      <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: activeWatch ? '1fr 300px' : '1fr', gap: 32, alignItems: 'start' }}>
        <div>
          <div
            style={{
              position: 'relative',
              ...(watchboxMaxWidth !== undefined ? { maxWidth: watchboxMaxWidth, width: '100%', margin: '0 auto' } : {}),
            }}
          >
            <WatchBox
              watches={box.watches}
              activeSlot={activeSlot >= 0 ? activeSlot : null}
              onSlotClick={index => {
                const watch = box.watches[index]
                if (!watch) return
                setSelectedWatchId(selectedWatchId === watch.id ? null : watch.id)
              }}
              frame={box.frame}
              lining={box.lining}
              slotCount={box.slotCount}
              slotWidth={watchboxSlotWidth}
              mode={box.source === 'playground' ? 'playground' : 'collection'}
              readonly
            />

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
                {frame.label} · {lining.label} · {slotConfig.n} slots
                {overflowSummary ? ` · ${overflowSummary}` : ''}
              </span>
              {footerContent}
            </div>
          </div>
        </div>

        {activeWatch ? (
          <ResponsiveSidebarSheet active={Boolean(activeWatch)} onClose={() => setSelectedWatchId(null)}>
            <WatchSidebar
              watch={activeWatch}
              sticky={false}
              catalogWatchId={activeWatch?.watchId ?? null}
              mode="public"
            />
          </ResponsiveSidebarSheet>
        ) : null}
      </div>
    </section>
  )
}

function ShareIconButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={event => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      aria-label={label}
      title={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: brand.radius.circle,
        border: `1px solid ${brand.colors.border}`,
        background: brand.colors.white,
        color: brand.colors.ink,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: brand.shadow.sm,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M9.25 2.25h4.5v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 9 13.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.25 8.25v4a1 1 0 01-1 1h-8.5a1 1 0 01-1-1v-8.5a1 1 0 011-1h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function CompactStatNav({
  items,
}: {
  items: Array<{ id: string; label: string; value: string }>
}) {
  const isMobile = useIsMobile()
  if (items.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => {
            const target = document.getElementById(item.id)
            if (!target) return
            target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: isMobile ? 8 : 10,
            padding: isMobile ? '9px 11px' : '10px 12px',
            borderRadius: brand.radius.pill,
            border: `1px solid ${brand.colors.border}`,
            background: brand.colors.white,
            color: brand.colors.ink,
            cursor: 'pointer',
            boxShadow: brand.shadow.xs,
            maxWidth: '100%',
          }}
        >
          <span style={{ fontFamily: brand.font.sans, fontSize: isMobile ? 8 : 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
            {item.label}
          </span>
          <span style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 18 : 20, lineHeight: 1, color: brand.colors.ink }}>
            {item.value}
          </span>
        </button>
      ))}
    </div>
  )
}

function PublicGrailHeroPanel({ watch }: { watch: ResolvedWatch | null }) {
  const isMobile = useIsMobile()
  if (!watch) return null

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        padding: 18,
        boxShadow: brand.shadow.lg,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CrownIcon />
        <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold }}>
          Grail
        </span>
      </div>

      <div className={isMobile ? 'grid grid-cols-1 gap-4 items-start' : 'grid grid-cols-[96px,1fr] gap-4 items-center'}>
        <div
          style={{
            position: 'relative',
            width: isMobile ? 96 : '100%',
            aspectRatio: '1/1',
            borderRadius: brand.radius.lg,
            overflow: 'hidden',
            background: brand.colors.bg,
            border: `1px solid ${brand.colors.border}`,
          }}
        >
          <Image
            src={watch.imageUrl}
            alt={watch.model}
            fill
            sizes="96px"
            style={{ objectFit: 'contain', padding: 10 }}
          />
        </div>

        <div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 5 }}>
            {watch.brand}
          </div>
          <div style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 22 : 26, color: brand.colors.ink, lineHeight: 1.04, marginBottom: 4 }}>
            {watch.model}
          </div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginBottom: 10 }}>
            Ref. {watch.reference}
          </div>
          <div style={{ fontFamily: brand.font.serif, fontSize: 24, color: brand.colors.gold, marginBottom: 12 }}>
            {fmtCurrency(watch.estimatedValue)}
          </div>
          <a
            href={marketHref(watch)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 14px',
              borderRadius: brand.radius.btn,
              background: brand.colors.ink,
              color: brand.colors.bg,
              fontFamily: brand.font.sans,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Find on Market ↗
          </a>
        </div>
      </div>
    </section>
  )
}

function PublicProfileHero({
  snapshot,
  onShareProfile,
  showEditProfile = false,
}: {
  snapshot: PublicProfileSnapshot
  onShareProfile: () => void
  showEditProfile?: boolean
}) {
  const isMobile = useIsMobile()
  const statItems = [
    snapshot.visibility.showCollection
      ? { id: SECTION_IDS.box, label: 'The Box', value: String(snapshot.summaryStats.collectionCount) }
      : null,
    snapshot.visibility.showFollowedWatches
      ? { id: SECTION_IDS.radar, label: 'On the Radar', value: String(snapshot.summaryStats.followedCount) }
      : null,
    snapshot.visibility.showPlayground
      ? { id: SECTION_IDS.dreamBoxes, label: 'Dream Boxes', value: String(snapshot.summaryStats.playgroundBoxCount) }
      : null,
    snapshot.visibility.showCollection && snapshot.visibility.showCollectionStats
      ? { id: SECTION_IDS.stats, label: 'Value', value: fmtCurrency(snapshot.collectionStats.totalEstimatedValue) }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; value: string }>

  return (
    <section
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        overflow: 'hidden',
        boxShadow: brand.shadow.xs,
      }}
    >
      <ProfileCoverArt
        imageUrl={snapshot.profile.coverImageUrl}
        alt={`${snapshot.profile.displayName} cover`}
        minHeight={isMobile ? 152 : 236}
      />

      <div style={{ padding: isMobile ? '0 16px 18px' : '0 24px 24px', position: 'relative' }}>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr),360px] gap-5 items-start">
          <div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start', gap: isMobile ? 12 : 18, flexWrap: 'wrap', marginTop: isMobile ? -48 : -62 }}>
              <ProfileAvatar displayName={snapshot.profile.displayName} imageUrl={snapshot.profile.profileImageUrl} size={isMobile ? 96 : 124} />

              <div style={{ paddingTop: isMobile ? 0 : 70, minWidth: 0, width: '100%' }}>
                <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
                  Collector Profile
                </div>
                <h1 style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 34 : 48, fontWeight: 400, color: brand.colors.ink, lineHeight: 0.98, margin: '0 0 8px', overflowWrap: 'anywhere' }}>
                  {snapshot.profile.displayName}
                </h1>
                <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: brand.colors.gold, marginBottom: 10, lineHeight: 1.5 }}>
                  {getPublicHandle(snapshot.profile.displayName)} · {getProfileHeroSummary(snapshot.summaryStats)}
                </div>
                {snapshot.profile.bio ? (
                  <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: isMobile ? 13 : 14, color: brand.colors.muted, lineHeight: 1.7, maxWidth: 760 }}>
                    {snapshot.profile.bio}
                  </p>
                ) : null}
              </div>
            </div>

            <CompactStatNav items={statItems} />
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: isMobile ? 0 : 16 }}>
              {showEditProfile ? <ActionButton href="/profile" tone="secondary">Edit Profile</ActionButton> : null}
              <ActionButton onClick={onShareProfile}>Share Profile</ActionButton>
            </div>
            {snapshot.visibility.showGrail ? <PublicGrailHeroPanel watch={snapshot.grailWatch} /> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function OwnerProfileHero({
  profile,
  summaryStats,
  collectionStats,
  grailWatch,
  visibility,
  onShareProfile,
  onEditText,
  onEditAvatar,
  onEditCover,
  onOpenVisibility,
}: {
  profile: ProfileDemoState
  summaryStats: PublicProfileSummaryStats
  collectionStats: PublicCollectionStats
  grailWatch: ResolvedWatch | null
  visibility: ProfileVisibilitySettings
  onShareProfile: () => void
  onEditText: () => void
  onEditAvatar: () => void
  onEditCover: () => void
  onOpenVisibility: () => void
}) {
  const isMobile = useIsMobile()
  const statItems = [
    visibility.showCollection
      ? { id: SECTION_IDS.box, label: 'The Box', value: String(summaryStats.collectionCount) }
      : null,
    visibility.showFollowedWatches
      ? { id: SECTION_IDS.radar, label: 'On the Radar', value: String(summaryStats.followedCount) }
      : null,
    visibility.showPlayground
      ? { id: SECTION_IDS.dreamBoxes, label: 'Dream Boxes', value: String(summaryStats.playgroundBoxCount) }
      : null,
    visibility.showCollection && visibility.showCollectionStats
      ? { id: SECTION_IDS.stats, label: 'Value', value: fmtCurrency(collectionStats.totalEstimatedValue) }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; value: string }>

  return (
    <section
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        overflow: 'hidden',
        boxShadow: brand.shadow.xs,
      }}
    >
      <ProfileCoverArt imageUrl={profile.coverImageUrl} alt={`${profile.displayName} cover`} minHeight={isMobile ? 152 : 236}>
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
          <IconCircleButton label="Edit cover image" onClick={onEditCover} tone="dark">
            <PencilIcon />
          </IconCircleButton>
        </div>
      </ProfileCoverArt>

      <div style={{ padding: isMobile ? '0 16px 18px' : '0 24px 24px', position: 'relative' }}>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr),360px] gap-5 items-start">
          <div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start', gap: isMobile ? 12 : 18, flexWrap: 'wrap', marginTop: isMobile ? -48 : -62 }}>
              <div style={{ position: 'relative' }}>
                <ProfileAvatar displayName={profile.displayName} imageUrl={profile.profileImageUrl} size={isMobile ? 96 : 124} />
                <div style={{ position: 'absolute', right: 2, bottom: 2 }}>
                  <IconCircleButton label="Edit profile image" onClick={onEditAvatar}>
                    <PencilIcon />
                  </IconCircleButton>
                </div>
              </div>

              <div style={{ paddingTop: isMobile ? 0 : 70, minWidth: 0, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
                    Collector Profile
                  </span>
                  <IconCircleButton label="Edit name and bio" onClick={onEditText}>
                    <PencilIcon />
                  </IconCircleButton>
                </div>
                <h1 style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 34 : 48, fontWeight: 400, color: brand.colors.ink, lineHeight: 0.98, margin: '0 0 8px', overflowWrap: 'anywhere' }}>
                  {profile.displayName}
                </h1>
                <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: brand.colors.gold, marginBottom: 10, lineHeight: 1.5 }}>
                  {getPublicHandle(profile.displayName)} · {getProfileHeroSummary(summaryStats)}
                </div>
                {profile.bio ? (
                  <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: isMobile ? 13 : 14, color: brand.colors.muted, lineHeight: 1.7, maxWidth: 760 }}>
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <CompactStatNav items={statItems} />
              <IconCircleButton label="Profile visibility" onClick={onOpenVisibility}>
                <SettingsIcon />
              </IconCircleButton>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: isMobile ? 0 : 16 }}>
              <ActionButton href={getProfileSharePath()} tone="secondary">Preview Public Profile</ActionButton>
              <ActionButton onClick={onShareProfile}>Share Profile</ActionButton>
            </div>
            {visibility.showGrail && grailWatch ? <PublicGrailHeroPanel watch={grailWatch} /> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function PublicBoxFeatureCard({
  box,
  title,
  sectionId,
  shareLabel,
  onShare,
  stats,
}: {
  box: PublicBoxSnapshot
  title: string
  sectionId: string
  shareLabel: string
  onShare: () => void
  stats?: PublicCollectionStats
}) {
  const frame = FRAMES.find(item => item.id === box.frame) ?? FRAMES[0]
  const lining = LININGS.find(item => item.id === box.lining) ?? LININGS[0]
  const slotConfig = SLOT_COUNTS.find(item => item.n === box.slotCount) ?? SLOT_COUNTS[1]
  const overflowSummary = getOverflowSummary(slotConfig.n, getWatchboxOverflow(box.watches, slotConfig.n).overflowCount)

  return (
    <section id={sectionId} style={getSectionShellStyle()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
            Collection
          </div>
          <h2 style={{ fontFamily: brand.font.serif, fontSize: 34, fontWeight: 400, color: brand.colors.ink, margin: 0, lineHeight: 1.02 }}>
            {title}
          </h2>
        </div>

        <ShareIconButton onClick={onShare} label={shareLabel} />
      </div>

      {stats ? (
        <div id={SECTION_IDS.stats} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 10px', borderRadius: brand.radius.pill, background: brand.colors.bg, border: `1px solid ${brand.colors.border}`, fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
            {stats.watchCount} watches
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 10px', borderRadius: brand.radius.pill, background: brand.colors.bg, border: `1px solid ${brand.colors.border}`, fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
            {fmtCurrency(stats.totalEstimatedValue)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 10px', borderRadius: brand.radius.pill, background: brand.colors.bg, border: `1px solid ${brand.colors.border}`, fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
            {stats.brandCount} brands
          </span>
        </div>
      ) : null}

      <Link href={getBoxSharePath(box.slug)} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div
          style={{
            background: brand.colors.bg,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.xl,
            padding: 16,
          }}
        >
          <BoxPreviewVisual box={box} variant="feature" />
        </div>
      </Link>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
          {frame.label} · {lining.label} · {slotConfig.n} slots{overflowSummary ? ` · ${overflowSummary}` : ''}
        </span>
      </div>
    </section>
  )
}

function PublicDreamBoxesSection({
  boxes,
  onShareBox,
  actions,
}: {
  boxes: PublicBoxSnapshot[]
  onShareBox: (box: PublicBoxSnapshot) => void
  actions?: ReactNode
}) {
  const isMobile = useIsMobile()

  return (
    <section id={SECTION_IDS.dreamBoxes} style={getSectionShellStyle()}>
      <SectionHeader
        eyebrow="Playground"
        title="Dream Boxes"
        description="A look at where the collection could go next."
        actions={actions}
      />

      {boxes.length > 0 ? (
        <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: isMobile ? 'minmax(240px, 82vw)' : 'minmax(280px, 340px)', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {boxes.map(box => (
            <Link
              key={box.slug}
              href={getBoxSharePath(box.slug)}
              style={{
                position: 'relative',
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                background: brand.colors.bg,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radius.xl,
                padding: 16,
              }}
            >
              <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
                <ShareIconButton onClick={() => onShareBox(box)} label={`Share ${box.title}`} />
              </div>

              <div style={{ paddingRight: 44, marginBottom: 12 }}>
                <div style={{ fontFamily: brand.font.serif, fontSize: 24, color: brand.colors.ink, lineHeight: 1.05, marginBottom: 4 }}>
                  {box.title}
                </div>
                <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
                  {box.watchCount} watches
                </div>
              </div>

              <BoxPreviewVisual box={box} />
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.6 }}>
          No dream boxes are on display right now.
        </p>
      )}
    </section>
  )
}

function PublicWatchStateBadge({ state }: { state: WatchSavedState }) {
  const label = state === 'target' ? 'Target' : state === 'grail' ? 'Grail' : 'Followed'

  return (
    <div
      aria-label={label}
      title={label}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: brand.radius.circle,
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        color: state === 'target' || state === 'grail' ? brand.colors.gold : brand.colors.ink,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: brand.shadow.sm,
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      {getStateIcon(state, 13)}
    </div>
  )
}

function PublicRadarSection({
  watches,
  actions,
}: {
  watches: PublicFollowedWatchSnapshot[]
  actions?: ReactNode
}) {
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)
  const visibleWatches = useMemo(
    () => watches.filter(watch => watch.profileState !== 'grail'),
    [watches],
  )
  const activeWatch = visibleWatches.find(watch => watch.id === selectedWatchId) ?? null
  const activeIndex = activeWatch ? visibleWatches.findIndex(watch => watch.id === activeWatch.id) : -1

  return (
    <section id={SECTION_IDS.radar} style={getSectionShellStyle()}>
      <SectionHeader eyebrow="Followed Watches" title="On the Radar" actions={actions} />

      {visibleWatches.length === 0 ? (
        <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.6 }}>
          Nothing is on the radar right now.
        </p>
      ) : (
        <>
          <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: activeWatch ? '1fr 300px' : '1fr', gap: 32, alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {visibleWatches.map((watch, index) => (
                <div key={watch.id} style={{ position: 'relative' }}>
                  <PublicWatchStateBadge state={watch.profileState} />
                  <WatchCard
                    watch={watch}
                    mode="saved"
                    stateSource={null}
                    isActive={activeIndex === index}
                    onSelect={() => setSelectedWatchId(selectedWatchId === watch.id ? null : watch.id)}
                  />
                </div>
              ))}
            </div>

            {activeWatch ? (
              <ResponsiveSidebarSheet active={Boolean(activeWatch)} onClose={() => setSelectedWatchId(null)}>
                <WatchSidebar
                  watch={activeWatch}
                  sticky={false}
                  catalogWatchId={activeWatch?.watchId ?? null}
                  mode="public"
                />
              </ResponsiveSidebarSheet>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}

function OwnerProfileCard({
  profile,
  summaryStats,
  onProfileChange,
  onUploadProfileImage,
  onUploadCollectionHero,
  onClearProfileImage,
  onClearCollectionHero,
}: {
  profile: ProfileDemoState
  summaryStats: PublicProfileSummaryStats
  onProfileChange: (updater: (current: ProfileDemoState) => ProfileDemoState) => void
  onUploadProfileImage: (file: File) => Promise<void>
  onUploadCollectionHero: (file: File) => Promise<void>
  onClearProfileImage: () => void
  onClearCollectionHero: () => void
}) {
  return (
    <section style={getSectionShellStyle()}>
      <div className="grid grid-cols-1 md:grid-cols-[140px,1fr] gap-6">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <ProfileAvatar displayName={profile.displayName} imageUrl={profile.profileImageUrl} size={132} />
          <UploadButton label={profile.profileImageUrl ? 'Replace Photo' : 'Upload Photo'} onSelect={onUploadProfileImage} />
          {profile.profileImageUrl && (
            <button
              onClick={onClearProfileImage}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: brand.colors.muted,
                cursor: 'pointer',
                fontFamily: brand.font.sans,
                fontSize: 10,
                letterSpacing: '0.04em',
              }}
            >
              Remove photo
            </button>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 6 }}>
                Profile Demo
              </div>
              <h1 style={{ fontFamily: brand.font.serif, fontSize: 42, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.02, margin: 0 }}>
                Your public collector page.
              </h1>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ActionButton href={getProfileSharePath()} tone="secondary">Preview Public Profile</ActionButton>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
                Display Name
              </span>
              <input
                value={profile.displayName}
                onChange={event => onProfileChange(current => ({ ...current, displayName: event.target.value }))}
                placeholder="Private Collector"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: brand.radius.lg,
                  border: `1px solid ${brand.colors.borderMid}`,
                  background: brand.colors.white,
                  color: brand.colors.ink,
                  fontFamily: brand.font.sans,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
                Bio / Tagline
              </span>
              <textarea
                value={profile.bio}
                onChange={event => onProfileChange(current => ({ ...current, bio: event.target.value }))}
                rows={4}
                placeholder="A short note about your collecting style."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: brand.radius.lg,
                  border: `1px solid ${brand.colors.borderMid}`,
                  background: brand.colors.white,
                  color: brand.colors.ink,
                  fontFamily: brand.font.sans,
                  fontSize: 14,
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 18 }}>
            <StatsStrip stats={summaryStats} />
          </div>

          <div
            style={{
              background: brand.colors.bg,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.lg,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 6 }}>
                  Collection Hero Image
                </div>
                <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.6 }}>
                  One optional editorial image for the My Collection section.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <UploadButton label={profile.collectionHeroImageUrl ? 'Replace Hero' : 'Upload Hero'} onSelect={onUploadCollectionHero} />
                {profile.collectionHeroImageUrl && (
                  <ActionButton onClick={onClearCollectionHero}>Remove Hero</ActionButton>
                )}
              </div>
            </div>

            {profile.collectionHeroImageUrl ? (
              <HeroImage imageUrl={profile.collectionHeroImageUrl} title="Collection hero image" />
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${brand.colors.border}` }}>
        <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 12 }}>
          Public Visibility
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <VisibilityToggle
            label="My Collection"
            description="Show the readonly collection box on the public profile."
            checked={profile.visibility.showCollection}
            onChange={checked => onProfileChange(current => ({
              ...current,
              visibility: { ...current.visibility, showCollection: checked },
            }))}
          />
          <VisibilityToggle
            label="Collection Stats"
            description="Show the small collection stats row in the public My Collection section."
            checked={profile.visibility.showCollectionStats}
            onChange={checked => onProfileChange(current => ({
              ...current,
              visibility: { ...current.visibility, showCollectionStats: checked },
            }))}
          />
          <VisibilityToggle
            label="Playground"
            description="Show the dream-box carousel and public box links."
            checked={profile.visibility.showPlayground}
            onChange={checked => onProfileChange(current => ({
              ...current,
              visibility: { ...current.visibility, showPlayground: checked },
            }))}
          />
          <VisibilityToggle
            label="Followed Watches"
            description="Show the readonly followed watches section."
            checked={profile.visibility.showFollowedWatches}
            onChange={checked => onProfileChange(current => ({
              ...current,
              visibility: { ...current.visibility, showFollowedWatches: checked },
            }))}
          />
          <VisibilityToggle
            label="Grail"
            description="Feature your grail watch near the top of the public profile."
            checked={profile.visibility.showGrail}
            onChange={checked => onProfileChange(current => ({
              ...current,
              visibility: { ...current.visibility, showGrail: checked },
            }))}
          />
        </div>
      </div>
    </section>
  )
}

function PublicProfileCard({
  profile,
  summaryStats,
  actions,
}: {
  profile: ProfileDemoState
  summaryStats: PublicProfileSummaryStats
  actions?: ReactNode
}) {
  return (
    <section style={getSectionShellStyle()}>
      <div className="grid grid-cols-1 md:grid-cols-[140px,1fr] gap-6 items-start">
        <ProfileAvatar displayName={profile.displayName} imageUrl={profile.profileImageUrl} size={132} />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
                Collector Profile
              </div>
              <h1 style={{ fontFamily: brand.font.serif, fontSize: 44, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.02, margin: '0 0 8px' }}>
                {profile.displayName}
              </h1>
              <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted, lineHeight: 1.7, maxWidth: 760 }}>
                {profile.bio}
              </p>
            </div>
            {actions ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div> : null}
          </div>

          <StatsStrip stats={summaryStats} />
        </div>
      </div>
    </section>
  )
}

function buildProfileSnapshotFromOwnerState({
  profile,
  collectionWatches,
  followedWatches,
  nextTargets,
  grailWatch,
  watchboxConfig,
  playgroundBoxes,
}: {
  profile: ProfileDemoState
  collectionWatches: ReturnType<typeof useCollectionSession>['collectionWatches']
  followedWatches: ReturnType<typeof useCollectionSession>['followedWatches']
  nextTargets: ReturnType<typeof useCollectionSession>['nextTargets']
  grailWatch: ReturnType<typeof useCollectionSession>['grailWatch']
  watchboxConfig: ReturnType<typeof useCollectionSession>['watchboxConfig']
  playgroundBoxes: PlaygroundBox[]
}) {
  return syncPublicProfileSnapshot({
    profile,
    collectionWatches,
    followedWatches,
    nextTargets,
    grailWatch,
    watchboxConfig,
    playgroundBoxes,
  })
}

export function OwnerProfilePage() {
  const isMobile = useIsMobile()
  const {
    collectionWatches,
    followedWatches,
    nextTargets,
    grailWatch,
    watchboxConfig,
  } = useCollectionSession()
  const { message, showToast } = useToast()
  const [profile, setProfile] = useState<ProfileDemoState>(createDefaultProfileDemoState())
  const [playgroundBoxes, setPlaygroundBoxes] = useState<PlaygroundBox[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [textEditOpen, setTextEditOpen] = useState(false)
  const [avatarEditOpen, setAvatarEditOpen] = useState(false)
  const [coverEditOpen, setCoverEditOpen] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)

  useEffect(() => {
    setProfile(getProfileDemoState())
    setPlaygroundBoxes(getStoredPlaygroundBoxes())
    setHydrated(true)
  }, [])

  const ownerGrailWatch = useMemo<ResolvedWatch | null>(
    () => grailWatch ? { ...grailWatch, watchId: grailWatch.id, condition: 'Excellent', notes: '' } : null,
    [grailWatch],
  )

  const ownerRadarWatches = useMemo<PublicFollowedWatchSnapshot[]>(() => {
    const targetIds = new Set(nextTargets.map(target => target.watchId))
    const grailId = ownerGrailWatch?.watchId ?? null

    return followedWatches
      .map(watch => {
        let profileState: WatchSavedState = 'followed'
        if (grailId && watch.id === grailId) profileState = 'grail'
        else if (targetIds.has(watch.id)) profileState = 'target'

        return {
          ...watch,
          watchId: watch.id,
          condition: 'Excellent' as const,
          notes: '',
          profileState,
        }
      })
      .sort((a, b) => {
        const priority: Record<WatchSavedState, number> = {
          target: 0,
          followed: 1,
          grail: 2,
        }

        const stateDelta = priority[a.profileState] - priority[b.profileState]
        if (stateDelta !== 0) return stateDelta
        return b.estimatedValue - a.estimatedValue
      })
      .filter(watch => watch.profileState !== 'grail')
  }, [followedWatches, nextTargets, ownerGrailWatch])

  const summaryStats = useMemo<PublicProfileSummaryStats>(() => ({
    collectionCount: collectionWatches.length,
    followedCount: ownerRadarWatches.length,
    playgroundBoxCount: playgroundBoxes.length,
    playgroundWatchCount: playgroundBoxes.reduce((sum, box) => sum + box.entries.length, 0),
    totalEstimatedValue: collectionWatches.reduce((sum, watch) => sum + watch.estimatedValue, 0),
  }), [collectionWatches, ownerRadarWatches.length, playgroundBoxes])

  const collectionStats = useMemo<PublicCollectionStats>(() => ({
    watchCount: collectionWatches.length,
    totalEstimatedValue: collectionWatches.reduce((sum, watch) => sum + watch.estimatedValue, 0),
    brandCount: new Set(collectionWatches.map(watch => watch.brand)).size,
  }), [collectionWatches])

  const publicBoxes = useMemo(
    () => playgroundBoxes.map(box => createPlaygroundBoxSnapshot(box, new Date().toISOString())),
    [playgroundBoxes],
  )

  useEffect(() => {
    if (!hydrated) return

    saveProfileDemoState(profile)
    buildProfileSnapshotFromOwnerState({
      profile,
      collectionWatches,
      followedWatches,
      nextTargets,
      grailWatch,
      watchboxConfig,
      playgroundBoxes,
    })
  }, [profile, hydrated, collectionWatches, followedWatches, nextTargets, grailWatch, watchboxConfig, playgroundBoxes])

  const collectionBox = useMemo(
    () => createCollectionBoxSnapshot(collectionWatches, watchboxConfig, new Date().toISOString()),
    [collectionWatches, watchboxConfig],
  )

  async function handleCopy(path: string, successMessage: string) {
    await copyProfileDemoUrl(path)
    showToast(successMessage)
  }

  async function handleProfileImageUpload(file: File) {
    const imageUrl = await resizeImageFileToDataUrl(file, { maxWidth: 480, maxHeight: 480, quality: 0.82 })
    setProfile(current => ({ ...current, profileImageUrl: imageUrl }))
    showToast('Profile image updated.')
  }

  async function handleCoverImageUpload(file: File) {
    const imageUrl = await resizeImageFileToDataUrl(file, { maxWidth: 1600, maxHeight: 720, quality: 0.78 })
    setProfile(current => ({ ...current, coverImageUrl: imageUrl, collectionHeroImageUrl: imageUrl }))
    showToast('Cover image updated.')
  }

  function updateProfile(updater: (current: ProfileDemoState) => ProfileDemoState) {
    setProfile(current => {
      const next = updater(current)
      return {
        ...next,
        visibility: { ...next.visibility } as ProfileVisibilitySettings,
      }
    })
  }

  return (
    <div className="collection-section" style={{ padding: isMobile ? '24px 20px 96px' : '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
      <div style={{ display: 'grid', gap: 20 }}>
        <OwnerProfileHero
          profile={profile}
          summaryStats={summaryStats}
          collectionStats={collectionStats}
          grailWatch={ownerGrailWatch}
          visibility={profile.visibility}
          onShareProfile={() => handleCopy(getProfileSharePath(), 'Profile link copied to clipboard.')}
          onEditText={() => setTextEditOpen(true)}
          onEditAvatar={() => setAvatarEditOpen(true)}
          onEditCover={() => setCoverEditOpen(true)}
          onOpenVisibility={() => setVisibilityOpen(true)}
        />

        <PublicBoxFeatureCard
          box={collectionBox}
          title="The Box"
          sectionId={SECTION_IDS.box}
          shareLabel="Share The Box"
          onShare={() => handleCopy(getBoxSharePath(collectionBox.slug), 'The Box link copied to clipboard.')}
          stats={profile.visibility.showCollectionStats ? collectionStats : undefined}
        />

        <PublicDreamBoxesSection
          boxes={publicBoxes}
          onShareBox={box => handleCopy(getBoxSharePath(box.slug), `${box.title} link copied to clipboard.`)}
          actions={<ActionButton href="/playground">Manage</ActionButton>}
        />

        <PublicRadarSection watches={ownerRadarWatches} actions={<ActionButton href="/followed">Manage</ActionButton>} />
      </div>

      <ProfileTextEditModal
        open={textEditOpen}
        profile={profile}
        onClose={() => setTextEditOpen(false)}
        onSave={nextValues => setProfile(current => ({ ...current, ...nextValues }))}
      />
      <ImageAssetModal
        open={avatarEditOpen}
        title="Profile Photo"
        uploadLabel={profile.profileImageUrl ? 'Replace Photo' : 'Upload Photo'}
        showRemove={Boolean(profile.profileImageUrl)}
        onClose={() => setAvatarEditOpen(false)}
        onUpload={handleProfileImageUpload}
        onRemove={() => setProfile(current => ({ ...current, profileImageUrl: '' }))}
      />
      <ImageAssetModal
        open={coverEditOpen}
        title="Profile Cover"
        uploadLabel={profile.coverImageUrl ? 'Replace Cover' : 'Upload Cover'}
        showRemove={Boolean(profile.coverImageUrl)}
        onClose={() => setCoverEditOpen(false)}
        onUpload={handleCoverImageUpload}
        onRemove={() => setProfile(current => ({ ...current, coverImageUrl: '', collectionHeroImageUrl: '' }))}
      />
      <VisibilityModal
        open={visibilityOpen}
        visibility={profile.visibility}
        onClose={() => setVisibilityOpen(false)}
        onChange={nextVisibility => setProfile(current => ({ ...current, visibility: nextVisibility }))}
      />
      <FloatingToast message={message} />
    </div>
  )
}

function ProfilePreviewLayout({
  snapshot,
}: {
  snapshot: PublicProfileSnapshot
}) {
  const isMobile = useIsMobile()
  const { message, showToast } = useToast()

  async function handleCopy(path: string, successMessage: string) {
    await copyProfileDemoUrl(path)
    showToast(successMessage)
  }

  return (
    <div className="collection-section" style={{ padding: isMobile ? '24px 20px 96px' : '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
      <div style={{ display: 'grid', gap: 20 }}>
        <PublicProfileHero
          snapshot={snapshot}
          onShareProfile={() => handleCopy(getProfileSharePath(), 'Profile link copied to clipboard.')}
          showEditProfile
        />

        {snapshot.visibility.showCollection && (
          <PublicBoxFeatureCard
            box={snapshot.collectionBox}
            title="The Box"
            sectionId={SECTION_IDS.box}
            shareLabel="Share The Box"
            onShare={() => handleCopy(getBoxSharePath(snapshot.collectionBox.slug), 'The Box link copied to clipboard.')}
            stats={snapshot.visibility.showCollectionStats ? snapshot.collectionStats : undefined}
          />
        )}

        {snapshot.visibility.showPlayground && (
          <PublicDreamBoxesSection
            boxes={snapshot.playgroundBoxes}
            onShareBox={box => handleCopy(getBoxSharePath(box.slug), `${box.title} link copied to clipboard.`)}
          />
        )}

        {snapshot.visibility.showFollowedWatches && (
          <PublicRadarSection watches={snapshot.followedWatches} />
        )}
      </div>

      <FloatingToast message={message} />
    </div>
  )
}

export function PublicProfilePreviewPage() {
  const isMobile = useIsMobile()
  const [snapshot, setSnapshot] = useState<PublicProfileSnapshot | null>(null)

  useEffect(() => {
    setSnapshot(getOrCreatePublicProfileSnapshot())
  }, [])

  if (!snapshot) {
    return (
      <div className="collection-section" style={{ padding: isMobile ? '24px 20px 96px' : '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
        <section style={getSectionShellStyle()}>
          <h1 style={{ fontFamily: brand.font.serif, fontSize: 40, fontWeight: 400, color: brand.colors.ink, margin: '0 0 10px' }}>
            This collector profile is not available right now.
          </h1>
          <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.7 }}>
            Please check back in a moment.
          </p>
        </section>
      </div>
    )
  }

  return <ProfilePreviewLayout snapshot={snapshot} />
}

export function PublicBoxPage({ slug }: { slug: string }) {
  const isMobile = useIsMobile()
  const { message, showToast } = useToast()
  const [snapshot, setSnapshot] = useState<PublicProfileSnapshot | null>(null)
  const [box, setBox] = useState<PublicBoxSnapshot | null>(null)

  useEffect(() => {
    const nextSnapshot = getOrCreatePublicProfileSnapshot()
    setSnapshot(nextSnapshot)
    setBox(getPublicBoxSnapshotBySlug(slug))
  }, [slug])

  if (!snapshot || !box) {
    return (
      <div className="collection-section" style={{ padding: isMobile ? '24px 20px 96px' : '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
        <section style={getSectionShellStyle()}>
          <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
            Box Page
          </div>
          <h1 style={{ fontFamily: brand.font.serif, fontSize: 40, fontWeight: 400, color: brand.colors.ink, margin: '0 0 10px' }}>
            This box is not available right now.
          </h1>
          <p style={{ margin: '0 0 16px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.7 }}>
            Please head back to the profile and try again.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ActionButton href="/profile/preview" tone="primary">Back to Public Profile</ActionButton>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="collection-section" style={{ padding: isMobile ? '24px 20px 96px' : '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
      <div style={{ display: 'grid', gap: 20 }}>
        <section style={getSectionShellStyle()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Link
                href="/profile/preview"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  fontFamily: brand.font.sans,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: brand.colors.muted,
                  marginBottom: 10,
                }}
              >
                Public Profile →
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold }}>
                  {box.source === 'collection' ? 'Collection Box' : 'Dream Box'}
                </span>
                {box.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                      borderRadius: brand.radius.pill,
                      border: `1px solid ${brand.colors.border}`,
                      color: brand.colors.muted,
                      fontFamily: brand.font.sans,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 style={{ fontFamily: brand.font.serif, fontSize: 44, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.02, margin: '0 0 8px' }}>
                {box.title}
              </h1>
              <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.7 }}>
                {box.source === 'collection'
                  ? `${snapshot.profile.displayName}'s collection box.`
                  : `${snapshot.profile.displayName}'s dream box.`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ActionButton href="/profile/preview" tone="secondary">Back to Profile</ActionButton>
              <ActionButton
                onClick={async () => {
                  await copyProfileDemoUrl(getBoxSharePath(box.slug))
                  showToast('Box link copied to clipboard.')
                }}
                tone="primary"
              >
                Share
              </ActionButton>
            </div>
          </div>
        </section>

        <ReadonlyBoxShowcase
          box={box}
          eyebrow={box.source === 'collection' ? 'My Collection' : 'Playground'}
          title={box.title}
          description={box.source === 'collection'
            ? 'A closer look at the collection.'
            : 'A closer look at this dream box.'}
          heroImageUrl={box.source === 'collection' ? snapshot.profile.coverImageUrl : ''}
          showCollectionStats={box.source === 'collection' && snapshot.visibility.showCollectionStats}
          collectionStats={box.source === 'collection' ? snapshot.collectionStats : undefined}
        />
      </div>

      <FloatingToast message={message} />
    </div>
  )
}
