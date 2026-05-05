import { brand } from '@/lib/brand'

type Props = {
  name: string
  descriptor: string
  fitsCollection?: boolean
  href?: string
}

export default function BoxUpgradeCard({ name, descriptor, fitsCollection = false, href = '#' }: Props) {
  return (
    <div
      style={{
        background: brand.colors.white,
        border: fitsCollection
          ? `2px solid ${brand.colors.gold}`
          : `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.md,
        padding: '20px 24px',
        minWidth: 200,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: brand.font.serif,
          fontSize: 20,
          color: brand.colors.ink,
          lineHeight: 1.2,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 12,
          color: brand.colors.muted,
        }}
      >
        {descriptor}
      </div>
      {fitsCollection && (
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.gold,
            fontWeight: 500,
          }}
        >
          Fits your collection
        </div>
      )}
      {/* TODO: replace with affiliate URL */}
      <a
        href={href}
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: brand.colors.gold,
          textDecoration: 'none',
          marginTop: 6,
        }}
      >
        Shop ↗
      </a>
    </div>
  )
}
