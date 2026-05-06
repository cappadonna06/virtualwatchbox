import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const W = 1200
const H = 630
const LEFT_W = Math.round(W * 0.34)

const SLOT_LAYOUTS: Record<number, { cols: number; rows: number }> = {
  4: { cols: 2, rows: 2 },
  6: { cols: 3, rows: 2 },
  8: { cols: 4, rows: 2 },
  10: { cols: 5, rows: 2 },
}

const COLORS = {
  bg: '#FAF8F4',
  ink: '#1A1410',
  muted: '#A89880',
  gold: '#C9A84C',
  goldText: 'rgba(201,168,76,0.85)',
  bgWhite: '#FAF8F4',
  slot: '#FFFCF7',
  slotBorder: '#E0DAD0',
  emptySlot: '#F5EFE5',
  frameTop: '#C9A04C',
  frameBottom: '#B58836',
  frameBorder: '#A87A2E',
  darkStart: '#1e1b16',
  darkEnd: '#2a2420',
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// Satori in next/og (Next 14.2) doesn't reliably decode WebP. The watch asset
// pipeline emits PNG twins next to every WebP, so rewrite to PNG here.
function toPng(url: string | null): string | null {
  if (!url) return null
  return url.replace(/\/processed\/webp\/([^/?#]+)\.webp(\?.*)?$/i, '/processed/$1.png$2')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { searchParams } = new URL(request.url)
  const handle = (searchParams.get('handle') || 'collector').slice(0, 32)
  const isPlayground = searchParams.get('type') === 'playground'
  const boxTitle = (searchParams.get('t') || '').slice(0, 36)
  const watchCount = Math.max(0, Math.min(999, Number(searchParams.get('count') ?? 0)))
  const totalValue = Math.max(0, Number(searchParams.get('total') ?? 0))
  const brandCount = Math.max(0, Math.min(999, Number(searchParams.get('brands') ?? 0)))
  const slotsRaw = Number(searchParams.get('slots') ?? 6)
  const slotCount = SLOT_LAYOUTS[slotsRaw] ? slotsRaw : 6
  const layout = SLOT_LAYOUTS[slotCount]
  const images: (string | null)[] = Array.from({ length: slotCount }, (_, i) => toPng(searchParams.get(`img${i}`)))
  const showCount = searchParams.get('c') !== '0'
  const showValue = searchParams.get('v') !== '0'
  const showBrands = searchParams.get('b') !== '0'

  void params

  try {
    return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          background: `linear-gradient(160deg, ${COLORS.darkStart} 0%, ${COLORS.darkEnd} 100%)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 60% 55% at 30% 50%, rgba(201,168,76,0.12) 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        <div
          style={{
            width: LEFT_W,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '46px 32px 46px 44px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: 'sans-serif',
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: COLORS.gold,
                lineHeight: 1.1,
                marginBottom: 28,
                display: 'flex',
                flexWrap: 'wrap',
                maxWidth: '100%',
              }}
            >
              {isPlayground ? 'Dream Box' : 'Virtual Watchbox'}
            </div>
            {isPlayground ? (
              <PlaygroundTitle boxTitle={boxTitle || 'Dream Box'} handle={handle} />
            ) : (
              <CollectionTitle handle={handle} />
            )}
          </div>

          <BottomMeta
            showCount={showCount}
            showValue={showValue}
            showBrands={showBrands}
            watchCount={watchCount}
            brandCount={brandCount}
            totalValue={totalValue}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 44px 24px 0',
          }}
        >
          <Watchbox images={images} cols={layout.cols} rows={layout.rows} />
        </div>
      </div>
    ),
      { width: W, height: H },
    )
  } catch (err) {
    // Fall back to a minimal valid PNG so unfurls don't break entirely.
    console.error('[og/box] render failed:', err)
    return new ImageResponse(
      (
        <div
          style={{
            width: W,
            height: H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: COLORS.darkStart,
            color: COLORS.gold,
            fontFamily: 'serif',
            fontSize: 48,
          }}
        >
          Virtual Watchbox
        </div>
      ),
      { width: W, height: H },
    )
  }
}

function autoTitleSize(text: string) {
  const len = text.length
  if (len >= 22) return 30
  if (len >= 18) return 36
  if (len >= 15) return 42
  if (len >= 12) return 52
  if (len >= 9) return 62
  return 72
}

function clampTitleText(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

function CollectionTitle({ handle }: { handle: string }) {
  const safeHandle = clampTitleText(handle, 18)
  const size = autoTitleSize(`${safeHandle}'s`)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          fontFamily: 'serif',
          fontSize: size,
          color: COLORS.bgWhite,
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          display: 'flex',
        }}
      >
        {safeHandle}&apos;s
      </div>
      <div
        style={{
          fontFamily: 'serif',
          fontStyle: 'italic',
          fontSize: size,
          color: COLORS.bgWhite,
          fontWeight: 300,
          lineHeight: 1.05,
          display: 'flex',
        }}
      >
        Watchbox.
      </div>
    </div>
  )
}

function PlaygroundTitle({ boxTitle, handle }: { boxTitle: string; handle: string }) {
  const safeTitle = clampTitleText(boxTitle, 24)
  const safeHandle = clampTitleText(handle, 18)
  const size = autoTitleSize(safeTitle)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          fontFamily: 'serif',
          fontStyle: 'italic',
          fontSize: size,
          color: COLORS.bgWhite,
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          display: 'flex',
        }}
      >
        {safeTitle}
      </div>
      <div
        style={{
          fontFamily: 'sans-serif',
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)',
          marginTop: 18,
          display: 'flex',
        }}
      >
        {safeHandle}&apos;s Playground
      </div>
    </div>
  )
}

function BottomMeta({
  showCount,
  showValue,
  showBrands,
  watchCount,
  brandCount,
  totalValue,
}: {
  showCount: boolean
  showValue: boolean
  showBrands: boolean
  watchCount: number
  brandCount: number
  totalValue: number
}) {
  if (!showCount && !showValue && !showBrands) return <div style={{ display: 'flex' }} />

  const muted: React.CSSProperties = {
    fontFamily: 'sans-serif',
    fontSize: 24,
    fontWeight: 500,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    display: 'flex',
  }
  const big: React.CSSProperties = {
    fontFamily: 'serif',
    fontSize: 64,
    fontWeight: 500,
    color: '#C9A84C',
    lineHeight: 1,
    letterSpacing: '-0.01em',
    display: 'flex',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showCount ? (
        <div style={muted}>
          {watchCount === 1 ? '1 Watch' : `${watchCount} Watches`}
        </div>
      ) : null}
      {showBrands ? (
        <div style={muted}>
          {brandCount === 1 ? '1 Brand' : `${brandCount} Brands`}
        </div>
      ) : null}
      {showValue ? (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: showCount || showBrands ? 12 : 0 }}>
          <div style={{ ...muted, marginBottom: 10 }}>Est.</div>
          <div style={big}>{fmtUsd(totalValue)}</div>
        </div>
      ) : null}
    </div>
  )
}

function Watchbox({ images, cols, rows }: { images: (string | null)[]; cols: number; rows: number }) {
  const maxBoxW = W - LEFT_W - 88
  const maxBoxH = H - 48
  const innerPad = 22
  const gap = 14
  const cellAspect = 3 / 4

  const cellWFromW = (maxBoxW - innerPad * 2 - gap * (cols - 1)) / cols
  const cellHFromW = cellWFromW / cellAspect
  const totalHFromW = cellHFromW * rows + gap * (rows - 1) + innerPad * 2
  const cellHFromH = (maxBoxH - innerPad * 2 - gap * (rows - 1)) / rows
  const cellWFromH = cellHFromH * cellAspect

  const cellW = totalHFromW <= maxBoxH ? cellWFromW : cellWFromH
  const cellH = cellW / cellAspect
  const boxW = cellW * cols + gap * (cols - 1) + innerPad * 2
  const boxH = cellH * rows + gap * (rows - 1) + innerPad * 2

  return (
    <div
      style={{
        width: boxW,
        height: boxH,
        background: `linear-gradient(180deg, ${COLORS.frameTop} 0%, ${COLORS.frameBottom} 100%)`,
        border: `1px solid ${COLORS.frameBorder}`,
        borderRadius: 8,
        padding: innerPad,
        display: 'flex',
        flexDirection: 'column',
        gap,
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
      }}
    >
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} style={{ display: 'flex', gap, height: cellH }}>
          {Array.from({ length: cols }).map((__, col) => {
            const idx = row * cols + col
            const img = images[idx]
            return (
              <div
                key={col}
                style={{
                  width: cellW,
                  height: cellH,
                  borderRadius: 5,
                  background: img ? COLORS.slot : COLORS.emptySlot,
                  border: img ? `1px solid ${COLORS.slotBorder}` : '2px dashed #D0C9BE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    width={Math.round(cellW * 0.92)}
                    height={Math.round(cellH * 0.92)}
                    style={{ objectFit: 'contain' }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
