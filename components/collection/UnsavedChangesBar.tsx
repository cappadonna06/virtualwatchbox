'use client'

import { useState } from 'react'

export interface DraftChange {
  id: string
  type: 'move_watch' | 'swap_watch' | 'add_watch' | 'remove_watch' | 'update_box'
  label: string
  timestamp: string
}

interface Props {
  pendingChanges: DraftChange[]
  onSave: () => void
  onDiscard: () => void
}

export default function UnsavedChangesBar({ pendingChanges, onSave, onDiscard }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (pendingChanges.length === 0) return null

  const count = pendingChanges.length

  return (
    <>
      {/* Fixed bottom bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          background: '#FFFFFF',
          borderTop: '1px solid #E8E2D8',
          boxShadow: '0 -4px 20px rgba(26,20,16,0.08)',
          padding: '14px 56px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 13,
            color: '#1A1410',
            flex: 1,
            minWidth: 200,
          }}
        >
          You have{' '}
          <strong>
            {count} unsaved {count === 1 ? 'change' : 'changes'}
          </strong>
        </span>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Save to My Collection */}
          <button
            onClick={() => setConfirmOpen(true)}
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              padding: '8px 18px',
              background: '#1A1410',
              color: '#FAF8F4',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Save to My Collection
          </button>

          {/* Save as Playground — disabled, Phase 2 */}
          {/* TODO: wire up Save as Playground modal in Phase 2 */}
          <button
            disabled
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              padding: '8px 18px',
              background: 'transparent',
              color: '#C8BFAF',
              border: '1px solid #E0DAD0',
              borderRadius: 4,
              cursor: 'not-allowed',
              opacity: 0.5,
            }}
          >
            Save as Playground
          </button>

          {/* Discard */}
          <button
            onClick={onDiscard}
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              padding: '8px 18px',
              background: 'transparent',
              color: '#A89880',
              border: '1px solid #E0DAD0',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Discard
          </button>
        </div>
      </div>

      {/* Save confirmation dialog */}
      {confirmOpen && (
        <>
          <div
            onClick={() => setConfirmOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26,20,16,0.45)',
              zIndex: 300,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 301,
              background: '#FFFFFF',
              border: '1px solid #E8E2D8',
              borderRadius: 12,
              padding: '32px 36px',
              width: 380,
              maxWidth: 'calc(100vw - 40px)',
              boxShadow: '0 20px 60px rgba(26,20,16,0.18)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 26,
                fontWeight: 400,
                color: '#1A1410',
                margin: '0 0 8px',
              }}
            >
              Save Changes
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 13,
                color: '#A89880',
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}
            >
              Save these {count} {count === 1 ? 'change' : 'changes'} to your collection?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  onSave()
                  setConfirmOpen(false)
                }}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  padding: '10px 0',
                  background: '#1A1410',
                  color: '#FAF8F4',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  padding: '10px 0',
                  background: 'transparent',
                  color: '#1A1410',
                  border: '1px solid #D4CBBF',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
