import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import sharp from 'sharp'
import { brand } from '@/lib/brand'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { decodePlaygroundShare, formatPlaygroundShareTotal } from '@/lib/playgroundShare'
import { loadPlaygroundShareCatalog } from '@/lib/playgroundShareCatalog'

const WIDTH = 1200
const HEIGHT = 630
const headers = { 'X-Robots-Tag': 'noindex, nofollow' }

async function loadThumbnail(url: string) {
  try {
    // Normalizing to PNG also covers primary images stored only as WebP.
    const response = await fetch(url, {
      redirect: 'error', signal: AbortSignal.timeout(5000), next: { revalidate: 300 },
    })
    if (!response.ok) return undefined
    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(220, 280, { fit: 'inside', withoutEnlargement: true })
      .png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  const tokens = request.nextUrl.searchParams.getAll('box')
  const share = decodePlaygroundShare(tokens.length === 1 ? tokens[0] : null)
  if (!share) return new Response(null, { status: 404, headers })

  try {
    const { watches } = await loadPlaygroundShareCatalog(share)
    if (!watches.size) return new Response(null, { status: 404, headers })

    const frame = FRAMES.find(option => option.id === share.frame)!
    const lining = LININGS.find(option => option.id === share.lining)!
    const { cols } = SLOT_COUNTS.find(option => option.n === share.slotCount)!
    const hasOverflow = share.entries.some(entry => entry.slot >= share.slotCount)
    const visibleSlots = hasOverflow ? share.slotCount - 1 : share.slotCount
    const entries = new Map(share.entries.map(entry => [entry.slot, entry.watchId]))
    const cellWidth = Math.floor(Math.min(164, (676 - (cols - 1) * 10) / cols))
    const cellHeight = Math.round(cellWidth * 1.25)
    const slots = Array.from({ length: share.slotCount }, (_, slot) => {
      const id = slot < visibleSlots ? entries.get(slot) : undefined
      return id ? watches.get(id) : undefined
    })
    const thumbnails = new Map(await Promise.all([...new Set(
      slots.flatMap(watch => watch?.imageUrl ? [watch.imageUrl] : []),
    )].map(async url => [url, await loadThumbnail(url)] as const)))

    const overflow = share.entries.length - share.entries.filter(entry => entry.slot < visibleSlots).length
    const count = share.entries.length
    return new ImageResponse(
      <div style={{
        width: WIDTH, height: HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '48px 46px', gap: 22, background: `linear-gradient(155deg, ${brand.colors.heroDark1}, ${brand.colors.heroDark2})`,
        color: brand.colors.onDark,
      }}>
        <div style={{ display: 'flex', width: 350, flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ color: brand.colors.gold, fontSize: 22, letterSpacing: 4, marginBottom: 25 }}>VIRTUAL WATCHBOX</div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 59, lineHeight: 1.03 }}>
            <span>Shared</span>
            <span>Playground Box</span>
          </div>
          <div style={{ color: brand.colors.onDarkMuted, fontSize: 24, marginTop: 24 }}>
            {`${count} ${count === 1 ? 'watch' : 'watches'}`}
          </div>
          {share.total !== undefined && (
            <div style={{ fontSize: 23, color: brand.colors.gold, marginTop: 9 }}>
              {`${formatPlaygroundShareTotal(share.total)} catalog estimate`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <div style={{ display: 'flex', padding: 13, background: frame.swatchColor, borderRadius: 10 }}>
            <div style={{ display: 'flex', padding: 10, gap: 10, flexDirection: 'column', background: lining.color, borderRadius: 5 }}>
              {[0, 1].map(row => (
                <div key={row} style={{ display: 'flex', gap: 10 }}>
                  {slots.slice(row * cols, (row + 1) * cols).map((watch, col) => {
                    const slot = row * cols + col
                    const photo = watch?.imageUrl ? thumbnails.get(watch.imageUrl) : undefined
                    return (
                      <div key={slot} style={{
                        width: cellWidth, height: cellHeight, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: lining.slotBg, borderRadius: 4, opacity: slot === visibleSlots || entries.has(slot) ? 1 : 0.6,
                      }}>
                        {slot === visibleSlots ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: lining.emptyColor }}>
                            <span style={{ fontSize: 30 }}>{`+${overflow}`}</span>
                            <span style={{ fontSize: 15 }}>MORE</span>
                          </div>
                        ) : photo ? (
                          // Satori uses its own image renderer.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" width={cellWidth - 12} height={cellHeight - 12} style={{ objectFit: 'contain' }} />
                        ) : watch ? (
                          <div style={{
                            width: cellWidth * 0.5, height: cellWidth * 0.5, borderRadius: '50%',
                            background: watch.dialConfig.dialColor, border: `3px solid ${watch.dialConfig.markerColor}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ width: 4, height: cellWidth * 0.17, background: watch.dialConfig.handColor }} />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>,
      { width: WIDTH, height: HEIGHT, headers: { ...headers, 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
    )
  } catch {
    return new Response(null, { status: 503, headers })
  }
}
