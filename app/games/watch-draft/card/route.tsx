import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import sharp from 'sharp'
import { draftEditionNames, money, weekLabel, type Watch } from '../boards'
import { fitsDraft, resolveDraft } from '../resolveDraft'

export const runtime = 'nodejs'
const titleFontPath = join(process.cwd(), 'app/games/watch-draft/card/fonts/cormorant-garamond-600.ttf')
const bodyFontPath = join(process.cwd(), 'app/games/watch-draft/card/fonts/dm-sans-600.ttf')

async function thumbnail(watch: Watch) {
  if (!watch.image) return null
  try {
    const response = await fetch(watch.image, { redirect: 'error', signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } })
    if (!response.ok) return null
    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: 320, height: 400, fit: 'inside' }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { board, budget, lineup, count, week } = resolveDraft(request.nextUrl.searchParams)
  const total = lineup.reduce((sum, watch) => sum + watch.tier, 0)
  if (!fitsDraft(board, lineup, count, total, budget)) {
    return new Response(null, { status: 404 })
  }

  const [photos, titleFont, bodyFont] = await Promise.all([Promise.all(lineup.map(thumbnail)), readFile(titleFontPath), readFile(bodyFontPath)])
  const portrait = request.nextUrl.searchParams.get('format') === 'portrait'
  const width = portrait ? 1080 : 1200
  const height = portrait ? 1350 : 630
  const tileWidth = portrait ? (count === 3 ? 440 : 307) : (count === 3 ? 300 : 200)
  const photoHeight = portrait ? 375 : 270
  const edition = draftEditionNames[board.id]
  return new ImageResponse(
    <div style={{
      width, height, display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, #221913, #38271d)',
      color: '#faf0df', padding: '29px 50px', fontFamily: 'DM Sans', fontWeight: 600,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 13, borderBottom: '1px solid #7b5b41' }}>
        <span style={{ fontSize: 18, letterSpacing: 3, color: '#e7bd84' }}>VIRTUAL WATCHBOX</span>
        <span style={{ fontSize: 20, color: '#ead8bf' }}>{`${edition}${week ? ` · Week of ${weekLabel(week)}` : ''}`}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 17 }}>
        <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 65 }}>{`The $${budget / 1000}k Watch Draft`}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 31, color: '#ffd79e' }}>{`${money(total)} spent`}</span>
          <span style={{ fontSize: 19, color: '#e8d6bf' }}>{`${count} watches · ${money(budget)} budget`}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: portrait ? 22 : 12 }}>
        {lineup.map((watch, index) => (
          <div key={watch.id} style={{ display: 'flex', width: tileWidth, alignItems: 'center', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', width: tileWidth, height: photoHeight,
              border: '2px solid #a57c53', borderRadius: 12,
              background: 'linear-gradient(145deg, #fff9ee, #dcc7a9)', boxShadow: '0 5px 14px #160e08',
            }}>
              {photos[index] && (
                // ImageResponse uses its own renderer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[index]!} alt="" width={tileWidth - 12} height={photoHeight - 18} style={{ objectFit: 'contain' }} />
              )}
            </div>
            <span style={{ fontSize: portrait ? 23 : 16, color: '#ead6bc', marginTop: 8 }}>{watch.brand}</span>
            <span style={{ fontSize: portrait ? 31 : 21, lineHeight: 1.08, textAlign: 'center', marginTop: 3 }}>{watch.model}</span>
            <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 6, color: '#f3cc98', fontSize: portrait ? 26 : 19 }}>{`~${money(watch.tier)}`}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 14 }}>
        <span style={{ fontSize: 26, color: '#faf0df' }}>Play your own Watch Draft</span>
        <span style={{ fontSize: 22, color: '#e6c9a6' }}>virtualwatchbox.com</span>
      </div>
    </div>,
    {
      width,
      height,
      fonts: [
        { name: 'Cormorant Garamond', data: titleFont, weight: 600 },
        { name: 'DM Sans', data: bodyFont, weight: 600 },
      ],
      headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    },
  )
}
