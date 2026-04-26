'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Watch, OwnershipStatus } from '@/types/watch'
import DialSVG from '@/components/watchbox/DialSVG'
import HoverCard from '@/components/watchbox/HoverCard'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const statusStyles: Record<OwnershipStatus, { background: string; color: string }> = {
  'Owned':          { background: '#E8F4E8', color: '#2D6A2D' },
  'For Sale':       { background: '#FFF8E6', color: '#8A6A10' },
  'Recently Added': { background: '#E8F0FA', color: '#1A4A8A' },
  'Needs Service':  { background: '#FFF3E0', color: '#8A5010' },
}

interface Props {
  watch: Watch
  isActive: boolean
  onSelect: () => void
}

export default function WatchCard({ watch, isActive, onSelect }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const status = statusStyles[watch.ownershipStatus]

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        background: '#FFFFFF',
        border: isActive
          ? '2px solid rgba(201,168,76,0.8)'
          : '1px solid #E8E2D8',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: isActive
          ? '0 0 0 1px rgba(201,168,76,0.4), 0 6px 24px rgba(201,168,76,0.12)'
          : isHovered
            ? '0 4px 16px rgba(26,20,16,0.08)'
            : '0 1px 4px rgba(26,20,16,0.04)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
      }}
    >
      {/* HoverCard */}
      {isHovered && (
        <HoverCard watch={watch} />
      )}

      {/* Image / dial section */}
      <div
        style={{
          background: '#FAF8F4',
          aspectRatio: '4/3',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid #E8E2D8',
        }}
      >
        {/* DialSVG as background layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.18,
          }}
        >
          <DialSVG {...watch.dialConfig} size={100} />
        </div>
        {/* Actual watch image */}
        <Image
          src={watch.imageUrl}
          alt={watch.model}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
          style={{ objectFit: 'contain', objectPosition: 'center', padding: 12 }}
        />
      </div>

      {/* Info section */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: 4,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 20,
            fontWeight: 400,
            color: '#1A1410',
            lineHeight: 1.15,
            marginBottom: 4,
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            color: '#A89880',
            marginBottom: 2,
          }}
        >
          Ref. {watch.reference}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            color: '#A89880',
            marginBottom: 10,
          }}
        >
          {watch.caseSizeMm}mm · {watch.dialColor}
        </div>

        {/* Type badge */}
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: '#2A2520',
            color: '#FAF8F4',
            padding: '3px 9px',
            borderRadius: 20,
            marginBottom: 12,
          }}
        >
          {watch.watchType}
        </span>

        {/* Estimated value */}
        <div
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 24,
            fontWeight: 500,
            color: '#1A1410',
            marginBottom: 10,
          }}
        >
          {fmt(watch.estimatedValue)}
        </div>

        {/* Ownership status badge */}
        <span
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '3px 10px',
            borderRadius: 20,
            background: status.background,
            color: status.color,
          }}
        >
          {watch.ownershipStatus}
        </span>
      </div>
    </div>
  )
}
