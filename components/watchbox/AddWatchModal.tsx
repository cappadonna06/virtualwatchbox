'use client'

import { useState } from 'react'
import type { Watch } from '@/types/watch'
import { watchCatalog } from '@/lib/watches'
import DialSVG from './DialSVG'

interface AddWatchModalProps {
  open: boolean
  onClose: () => void
  onSelect: (watch: Watch) => void
}

export default function AddWatchModal({ open, onClose, onSelect }: AddWatchModalProps) {
  const [query, setQuery] = useState('')

  if (!open) return null

  const q = query.trim().toLowerCase()
  const results: Watch[] = q
    ? watchCatalog.filter(w =>
        [w.brand, w.model, w.reference].some(s =>
          s.toLowerCase().includes(q)
        )
      )
    : watchCatalog

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 40, backgroundColor: 'rgba(26,20,16,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="fixed"
        style={{
          zIndex: 50,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, 90vw)',
          maxHeight: '80vh',
          backgroundColor: '#FFFCF7',
          borderRadius: '12px',
          border: '1px solid #E8E2D8',
          boxShadow: '0 20px 60px rgba(26,20,16,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid #E8E2D8',
            flexShrink: 0,
          }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}
          >
            <span
              className="font-serif"
              style={{ fontSize: '1.3rem', color: '#1A1410', fontWeight: 500 }}
            >
              Add to Collection
            </span>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#A89880',
                fontSize: '1.1rem',
                lineHeight: 1,
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Search input */}
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search brand, model, or reference…"
            className="font-sans"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #E8E2D8',
              backgroundColor: '#FAF8F4',
              color: '#1A1410',
              fontSize: '0.8rem',
              outline: 'none',
              fontFamily: 'var(--font-dm-sans)',
            }}
          />
        </div>

        {/* Results — scrollable */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '12px 20px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            alignContent: 'start',
          }}
        >
          {results.map(watch => (
            <ResultCard key={watch.id} watch={watch} onSelect={onSelect} />
          ))}
          {results.length === 0 && (
            <p
              className="font-sans"
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                color: '#A89880',
                fontSize: '0.8rem',
                padding: '32px 0',
              }}
            >
              No watches found
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function ResultCard({ watch, onSelect }: { watch: Watch; onSelect: (w: Watch) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => onSelect(watch)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="font-sans"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        backgroundColor: hovered ? '#FAF8F4' : '#FFFCF7',
        border: hovered ? '1px solid #C9A84C' : '1px solid #E8E2D8',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        boxShadow: hovered ? '0 2px 12px rgba(201,168,76,0.15)' : 'none',
        transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <DialSVG
          dialColor={watch.dialConfig.dialColor}
          markerColor={watch.dialConfig.markerColor}
          handColor={watch.dialConfig.handColor}
          size={48}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.6rem',
            color: '#A89880',
            letterSpacing: '0.08em',
            marginBottom: '2px',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {watch.brand.toUpperCase()}
        </p>
        <p
          className="font-serif"
          style={{
            fontSize: '0.88rem',
            color: '#1A1410',
            fontWeight: 500,
            lineHeight: 1.2,
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {watch.model}
        </p>
        <p
          style={{
            fontSize: '0.62rem',
            color: '#A89880',
            fontFamily: 'var(--font-dm-sans)',
            marginBottom: '1px',
          }}
        >
          Ref. {watch.reference}
        </p>
        <p
          style={{
            fontSize: '0.62rem',
            color: '#A89880',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {watch.caseSizeMm}mm
        </p>
      </div>
    </button>
  )
}
