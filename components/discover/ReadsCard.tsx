import { brand } from '@/lib/brand'

type Props = {
  publication: string
  title: string
  category: string
  date: string
  href: string
}

export default function ReadsCard({ publication, title, category, date, href }: Props) {
  return (
    <article
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.md,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
        }}
      >
        {publication}
      </div>
      <h3
        style={{
          fontFamily: brand.font.serif,
          fontSize: 17,
          color: brand.colors.ink,
          lineHeight: 1.4,
          margin: 0,
          fontWeight: 500,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: brand.colors.muted,
        }}
      >
        {category} · {date}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: brand.colors.gold,
          textDecoration: 'none',
          marginTop: 4,
        }}
      >
        Read ↗
      </a>
    </article>
  )
}
