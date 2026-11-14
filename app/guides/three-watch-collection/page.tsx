import Image from 'next/image'
import Link from 'next/link'
import { brand, masthead } from '@/lib/brand'
import { FRAMES, LININGS } from '@/lib/frameConfig'
import { publicPageMetadata } from '@/lib/siteMetadata'
import { withVersion } from '@/lib/watchImages/cacheBust'

export const metadata = publicPageMetadata('/guides/three-watch-collection')

const lineup = [
  {
    id: 'hamilton-h70405730',
    name: 'Hamilton Khaki Field Murph 38 mm',
    reference: 'H70405730',
    price: 995,
    role: 'Everyday',
    why: 'The one I’d grab on a Monday. Its black dial is easy to read, and the 38 mm case and leather strap work with jeans or a jacket.',
    source: 'https://www.hamiltonwatch.com/en-us/h70405730-khaki-field-murph-38mm.html',
    sourceLabel: 'Hamilton product page',
  },
  {
    id: 'nomos-glashutte-101',
    name: 'NOMOS Tangente',
    reference: '101',
    price: 2330,
    role: 'Dress',
    why: 'The dinner pick. A pale dial and small seconds give the box a lighter look, and winding it by hand is part of the pleasure.',
    source: 'https://nomos-glashuette.com/en-us/tangente/tangente-101',
    sourceLabel: 'NOMOS product page',
  },
  {
    id: 'seiko-spb151',
    name: 'Seiko Prospex 1970 Heritage Diver',
    reference: 'SPB151',
    price: 1300,
    role: 'Water and weekends',
    why: 'The one I’d pack for a weekend by the water. The cushion case has a shape all its own, and the rotating bezel gives it a job to do.',
    source: 'https://www.seikowatches.com/us-en/products/prospex/lineup/',
    sourceLabel: 'Seiko Prospex lineup',
  },
]

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const body = { ...masthead.subtitle, color: brand.colors.inkSoft }
const heading = { ...masthead.title, fontSize: brand.text.h2 }
const linkStyle = { color: brand.colors.goldDeep }
const frame = FRAMES.find(frame => frame.id === 'dark-walnut')!
const lining = LININGS.find(lining => lining.id === 'cream')!
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL
const ctaStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 46,
  padding: '10px 19px',
  background: brand.colors.gold,
  color: brand.colors.ink,
  borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans,
  fontSize: brand.text.bodySm,
  fontWeight: 600,
  textDecoration: 'none',
}

function WatchPhoto({ watch, cover = false }: { watch: typeof lineup[number]; cover?: boolean }) {
  const src = storage && withVersion(`${storage}/storage/v1/object/public/watch-images/${watch.id}/primary.webp`)
  if (!src) return null

  return (
    <Image
      src={src}
      alt={cover ? watch.name : ''}
      fill
      sizes={cover ? '(max-width: 640px) 26vw, 175px' : '(max-width: 640px) 60vw, 240px'}
      priority={cover}
      style={{ objectFit: 'contain', objectPosition: 'center', padding: cover ? '7% 9%' : '10% 12%', filter: brand.shadow.drop }}
    />
  )
}

export default function ThreeWatchCollectionGuide() {
  const total = lineup.reduce((sum, watch) => sum + watch.price, 0)

  return (
    <article style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(16px, 4vw, 48px)' }}>
      <header style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(24px, 4vw, 56px)',
        padding: 'clamp(22px, 5vw, 64px)', background: `linear-gradient(140deg, ${brand.colors.heroDark1}, ${brand.colors.heroDark2})`,
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <p style={{ ...masthead.eyebrow, color: brand.colors.gold, margin: '0 0 12px' }}>The three-watch challenge</p>
          <h1 style={{ ...masthead.titleOnDark, fontSize: brand.text.hero, lineHeight: 0.98 }}>
            Three watches.<br /><em style={{ color: brand.colors.gold }}>$5,000.</em>
          </h1>
          <p style={{ ...masthead.subtitleOnDark, fontSize: brand.text.lead, maxWidth: '32ch', margin: '18px 0 24px' }}>
            One for every day, one for a night out, and one for the weekend. What makes your box?
          </p>
          <Link href="/playground" style={ctaStyle}>Build your box →</Link>
        </div>
        <figure style={{ flex: '1 1 375px', minWidth: 0, margin: 0 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(4px, 1vw, 10px)',
            padding: 'clamp(8px, 1.8vw, 20px)', background: frame.css, boxShadow: frame.shadow, borderRadius: brand.radius.lg,
          }}>
            {lineup.map(watch => (
              <div key={watch.id} style={{
                position: 'relative', aspectRatio: '3 / 5', minWidth: 0, borderRadius: brand.radius.sm,
                background: `radial-gradient(ellipse at 55% 44%, ${lining.slotBg} 12%, ${lining.color} 100%)`,
              }}>
                <WatchPhoto watch={watch} cover />
              </div>
            ))}
          </div>
          <figcaption style={{ ...masthead.subtitleOnDark, fontSize: brand.text.bodySm, textAlign: 'center', marginTop: 16 }}>
            The example box · {currency.format(total)} at U.S. list prices
          </figcaption>
        </figure>
      </header>
      <section style={{ marginTop: 'clamp(32px, 6vw, 64px)' }}>
        <h2 style={heading}>What made the cut</h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: 'clamp(16px, 2vw, 24px)', marginTop: 20,
        }}>
          {lineup.map(watch => (
            <section key={watch.id} style={{ background: brand.colors.slot, border: `1px solid ${brand.colors.border}` }}>
              <div style={{ position: 'relative', aspectRatio: '3 / 2', background: brand.colors.paper }}>
                <WatchPhoto watch={watch} />
              </div>
              <div style={{ padding: 'clamp(16px, 2.5vw, 24px)' }}>
                <p style={{ ...masthead.eyebrow, color: brand.colors.goldDeep, margin: '0 0 8px' }}>{watch.role}</p>
                <h3 style={{ ...masthead.title, fontSize: brand.text.h3 }}>{watch.name}</h3>
                <p style={{ ...masthead.subtitle, fontSize: brand.text.bodySm, margin: '8px 0 12px' }}>
                  Ref. {watch.reference} · <strong>{currency.format(watch.price)}</strong>
                </p>
                <p style={body}>{watch.why}</p>
                <a href={watch.source} style={{ ...linkStyle, display: 'inline-block', marginTop: 12, fontSize: brand.text.bodySm }}>{watch.sourceLabel} ↗</a>
              </div>
            </section>
          ))}
        </div>
        <p style={{ ...masthead.subtitle, fontSize: brand.text.bodySm, marginTop: 12 }}>
          Manufacturer prices checked November 14, 2026, before tax and shipping.
        </p>
      </section>
      <section style={{ marginTop: 'clamp(32px, 6vw, 64px)', padding: 'clamp(20px, 4vw, 40px)', background: brand.colors.paperWarm }}>
        <h2 style={heading}>Build your own box</h2>
        <p style={{ ...body, margin: '8px 0 18px', maxWidth: '58ch' }}>
          What would you swap? Try your three picks in Playground, then share the box with someone who’ll argue for a different lineup.
        </p>
        <Link href="/playground" style={ctaStyle}>Open the Playground →</Link>
      </section>
    </article>
  )
}
