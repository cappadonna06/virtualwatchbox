'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import type { CatalogWatch, WatchSavedState, WatchStateSource } from '@/types/watch'
import GrailSetModal from './GrailSetModal'
import GrailRemoveConfirmation from './GrailRemoveConfirmation'
import { CheckIcon, getStateIcon, getStateLabel } from './WatchStateIcons'
import { useIsMobile } from './useResponsiveState'

type WatchStateControlProps = {
  catalogWatchId: string
  source: WatchStateSource
  size?: 'sm' | 'md'
  tone?: 'light' | 'dark'
  placement?: 'bottom-left' | 'top-right'
}

type PickerPosition = {
  top: number
  left: number
}

const PICKER_WIDTH = 220
const PICKER_GAP = 8
const PICKER_HEIGHT_ESTIMATE = 248

function getButtonMetrics(size: 'sm' | 'md') {
  return size === 'sm'
    ? { button: 30, icon: 14, inset: 8 }
    : { button: 36, icon: 16, inset: 10 }
}

function getButtonStyle({
  size,
  tone,
  state,
  placement,
}: {
  size: 'sm' | 'md'
  tone: 'light' | 'dark'
  state: WatchSavedState | null
  placement: 'bottom-left' | 'top-right'
}): CSSProperties {
  const metrics = getButtonMetrics(size)
  const isSaved = state !== null

  return {
    position: 'absolute',
    ...(placement === 'top-right'
      ? { top: metrics.inset, right: metrics.inset }
      : { left: metrics.inset, bottom: metrics.inset }),
    width: metrics.button,
    height: metrics.button,
    borderRadius: brand.radius.circle,
    border: `1px solid ${isSaved ? brand.colors.goldLine : brand.colors.borderLight}`,
    background: tone === 'dark'
      ? brand.colors.white
      : isSaved
        ? brand.colors.goldWash
        : brand.colors.white,
    color: state === 'followed'
      ? brand.colors.gold
      : state === 'target' || state === 'grail' || state === 'jewel'
        ? brand.colors.gold
        : tone === 'dark'
          ? brand.colors.ink
          : brand.colors.muted,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: brand.shadow.md,
    zIndex: 4,
  }
}

type GrailMomentState = {
  watch: CatalogWatch
  previousWatch: CatalogWatch | null
}

export default function WatchStateControl({
  catalogWatchId,
  source,
  size = 'md',
  tone = 'light',
  placement = 'bottom-left',
}: WatchStateControlProps) {
  const session = useCollectionSession()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const grailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [pickerPosition, setPickerPosition] = useState<PickerPosition | null>(null)
  const [grailMoment, setGrailMoment] = useState<GrailMomentState | null>(null)
  const [grailRemoveOpen, setGrailRemoveOpen] = useState(false)
  const isMobile = useIsMobile()

  const currentState = typeof session.getWatchSavedState === 'function'
    ? session.getWatchSavedState(catalogWatchId)
    : typeof session.isWatchJewel === 'function' && session.isWatchJewel(catalogWatchId)
      ? 'jewel'
    : typeof session.isWatchGrail === 'function' && session.isWatchGrail(catalogWatchId)
      ? 'grail'
      : typeof session.isWatchTarget === 'function' && session.isWatchTarget(catalogWatchId)
        ? 'target'
        : typeof session.isWatchFollowed === 'function' && session.isWatchFollowed(catalogWatchId)
          ? 'followed'
          : null

  const intent = typeof session.getWatchIntentAvailability === 'function'
    ? session.getWatchIntentAvailability(catalogWatchId)
    : null
  const canSetTarget = typeof session.canSetWatchAsTarget === 'function'
    ? session.canSetWatchAsTarget(catalogWatchId)
    : session.nextTargets.some(target => target.watchId === catalogWatchId) || session.nextTargets.length < 3
  const isOwnedWatch = intent?.isOwned ?? (typeof session.isInCollection === 'function'
    ? session.isInCollection(catalogWatchId)
    : false)
  const visibleStates = isOwnedWatch
    ? (['followed', 'jewel'] as WatchSavedState[])
    : (['followed', 'target', 'grail'] as WatchSavedState[])

  const targetLimitReached = !isOwnedWatch && !canSetTarget && currentState !== 'target'
  const targetHelperMessage = targetLimitReached ? "You've reached your 3 target limit." : null
  const metrics = getButtonMetrics(size)

  useEffect(() => {
    return () => {
      if (grailTimerRef.current) clearTimeout(grailTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open || !buttonRef.current) return

    function updatePosition() {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const left = Math.min(
        Math.max(12, rect.left + (rect.width / 2) - (PICKER_WIDTH / 2)),
        window.innerWidth - PICKER_WIDTH - 12,
      )
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= PICKER_HEIGHT_ESTIMATE
        ? rect.bottom + PICKER_GAP
        : Math.max(12, rect.top - PICKER_HEIGHT_ESTIMATE - PICKER_GAP)

      setPickerPosition({
        top,
        left,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      const clickedButton = buttonRef.current?.contains(target)
      const clickedPopover = popoverRef.current?.contains(target)

      if (!clickedButton && !clickedPopover) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function toggleOpen(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    event.preventDefault()
    setOpen(prev => !prev)
  }

  function handleSelect(nextState: WatchSavedState | 'remove') {
    const currentWatch = session.getCatalogWatch(catalogWatchId)

    if (nextState === 'remove') {
      setOpen(false)

      if (currentState === 'grail') {
        if (grailTimerRef.current) clearTimeout(grailTimerRef.current)
        grailTimerRef.current = setTimeout(() => {
          setGrailRemoveOpen(true)
        }, 120)
        return
      }

      session.removeSavedWatchState(catalogWatchId, { source })
      return
    }

    if (nextState === currentState) {
      setOpen(false)
      return
    }

    const previousGrailId = session.grailWatchId
    const previousWatch = previousGrailId ? session.getCatalogWatch(previousGrailId) ?? null : null
    const result = session.setWatchSavedState(catalogWatchId, nextState, { source })
    if (result.ok) {
      setOpen(false)

      if (nextState === 'grail' && currentWatch) {
        if (grailTimerRef.current) clearTimeout(grailTimerRef.current)
        grailTimerRef.current = setTimeout(() => {
          setGrailMoment({
            watch: currentWatch,
            previousWatch: previousGrailId && previousGrailId !== catalogWatchId ? previousWatch : null,
          })
        }, 120)
      }
    }
  }

  const picker = useMemo(() => {
    if (!open || typeof document === 'undefined') return null

    const optionBase: CSSProperties = {
      width: '100%',
      border: 'none',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '11px 12px',
      cursor: 'pointer',
      fontFamily: brand.font.sans,
      fontSize: 11,
      color: brand.colors.ink,
      borderRadius: brand.radius.sm,
      textAlign: 'left',
    }

    const content = (
      <div
        ref={popoverRef}
        style={{
          width: PICKER_WIDTH,
          background: brand.colors.white,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: brand.radius.lg,
          boxShadow: brand.shadow.menu,
          padding: 8,
        }}
        onClick={event => event.stopPropagation()}
      >
        {visibleStates.map(state => {
          const disabled = state === 'target' && targetLimitReached
          const checked = currentState === state

          return (
            <div key={state}>
              <button
                type="button"
                onClick={() => !disabled && handleSelect(state)}
                disabled={disabled}
                style={{
                  ...optionBase,
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  background: checked ? brand.colors.goldWash : 'transparent',
                  color: state === 'grail' || state === 'target' || checked ? brand.colors.ink : brand.colors.ink,
                }}
                >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: state === 'followed' ? brand.colors.gold : brand.colors.gold }}>
                    {getStateIcon(state, 14)}
                  </span>
                  <span>{state === 'followed' ? 'Follow' : getStateLabel(state)}</span>
                </span>
                {checked && (
                  <span style={{ color: brand.colors.gold }}>
                    <CheckIcon />
                  </span>
                )}
              </button>
              {state === 'target' && targetHelperMessage && (
                <div
                  style={{
                    padding: '0 12px 10px 36px',
                    fontFamily: brand.font.sans,
                    fontSize: 10,
                    lineHeight: 1.45,
                    color: brand.colors.muted,
                  }}
                >
                  {targetHelperMessage}
                </div>
              )}
            </div>
          )
        })}

        <div style={{ height: 1, background: brand.colors.border, margin: '4px 4px 6px' }} />

        <button
          type="button"
          onClick={() => handleSelect('remove')}
          disabled={currentState === null}
          style={{
            ...optionBase,
            opacity: currentState === null ? 0.45 : 1,
            cursor: currentState === null ? 'not-allowed' : 'pointer',
            color: brand.colors.muted,
          }}
        >
          {currentState ? `Remove ${getStateLabel(currentState)}` : 'Remove saved state'}
        </button>
      </div>
    )

    if (isMobile) {
      if (!pickerPosition) return null

      return createPortal(
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26,20,16,0.45)',
              zIndex: 340,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: pickerPosition.top,
              left: pickerPosition.left,
              zIndex: 341,
            }}
          >
            {content}
          </div>
        </>,
        document.body,
      )
    }

    if (!pickerPosition) return null

    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: pickerPosition.top,
          left: pickerPosition.left,
          zIndex: 341,
        }}
      >
        {content}
      </div>,
      document.body,
    )
  }, [currentState, isMobile, open, pickerPosition, targetHelperMessage, targetLimitReached, visibleStates])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        style={getButtonStyle({ size, tone, state: currentState, placement })}
        aria-label={currentState ? `${getStateLabel(currentState)} saved state` : 'Save watch state'}
        title={currentState ? getStateLabel(currentState) : 'Follow'}
      >
        {getStateIcon(currentState, metrics.icon)}
      </button>
      {picker}
      <GrailSetModal
        open={grailMoment !== null}
        watch={grailMoment?.watch ?? null}
        previousWatch={grailMoment?.previousWatch ?? null}
        onClose={() => setGrailMoment(null)}
      />
      <GrailRemoveConfirmation
        open={grailRemoveOpen}
        watch={session.getCatalogWatch(catalogWatchId) ?? null}
        onCancel={() => setGrailRemoveOpen(false)}
        onConfirm={() => {
          session.removeSavedWatchState(catalogWatchId, { source })
          setGrailRemoveOpen(false)
        }}
      />
    </>
  )
}
