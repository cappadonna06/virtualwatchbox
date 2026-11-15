import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import sharp from 'sharp'
import { draftName } from '@/lib/watchDraftChallenge'
import { money, weekLabel, type Watch } from '../boards'
import { fitsDraft, resolveDraft } from '../resolveDraft'

export const runtime = 'nodejs'
const width = 1200
const height = 630

async function thumbnail(watch: Watch) {
  if (!watch.image) return null
  try {
    const response = await fetch(watch.image, { redirect: 'error', signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } })
    if (!response.ok) return null
    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: 175, height: 224, fit: 'inside' }).png().toBuffer()
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

  const photos = await Promise.all(lineup.map(thumbnail))
  const size = count === 3 ? 287 : 197
  const title = draftName({ board: board.id, budget })
  return new ImageResponse(
    <div style={{
      width, height, display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, #221913, #38271d)',
      color: '#faf0df', padding: '35px 50px', fontFamily: 'sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 13, borderBottom: '1px solid #7b5b41' }}>
        <span style={{ fontSize: 17, letterSpacing: 5, color: '#e7bd84' }}>VIRTUAL WATCHBOX</span>
        <span style={{ fontSize: 17, letterSpacing: 2, color: '#ead8bf' }}>{week ? `WEEK OF ${weekLabel(week).toUpperCase()}` : 'THE WATCH DRAFT'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 17, marginBottom: 21 }}>
        <span style={{ fontSize: count === 3 ? 47 : 55, fontWeight: 700, letterSpacing: -2 }}>{title}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 33, fontWeight: 700, color: '#ffd79e' }}>{money(total)}</span>
          <span style={{ fontSize: 17, color: '#e8d6bf' }}>{`of ${money(budget)} spent`}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, borderRadius: 14, padding: 15, background: 'linear-gradient(145deg, #7a5135, #543722)', boxShadow: '0 10px 25px #120b06' }}>
        {lineup.map((watch, index) => (
          <div key={watch.id} style={{ display: 'flex', width: size, alignItems: 'center', flexDirection: 'column', padding: '10px 5px', borderRadius: 9, background: 'linear-gradient(145deg, #fff9ee, #d9bfa0)', color: '#2e2119' }}>
            {photos[index] ? (
              // ImageResponse uses its own renderer.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[index]!} alt="" width={size - 22} height={220} style={{ objectFit: 'contain' }} />
            ) : <div style={{ width: size - 22, height: 220, display: 'flex' }} />}
            <span style={{ fontSize: 14, color: '#6f513b' }}>{watch.brand}</span>
            <span style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginTop: 3 }}>{watch.model}</span>
            <span style={{ fontSize: 16, marginTop: 4, color: '#6a482e' }}>{money(watch.tier)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 14, color: '#e6c9a6', fontSize: 19 }}>
        <span>{`${board.title} · ${count} watches`}</span><span>virtualwatchbox.com</span>
      </div>
    </div>,
    { width, height, headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
