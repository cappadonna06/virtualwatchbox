import { brand } from '@/lib/brand'

type Props = {
  label: string
  subhead?: string
  id?: string
}

export default function SectionHeader({ label, subhead, id }: Props) {
  return (
    <div id={id} style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontFamily: brand.font.serif,
          fontSize: 28,
          fontWeight: 500,
          color: brand.colors.ink,
          margin: 0,
          lineHeight: 1.15,
        }}
      >
        {label}
      </h2>
      {subhead && (
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            marginTop: 4,
          }}
        >
          {subhead}
        </div>
      )}
    </div>
  )
}
