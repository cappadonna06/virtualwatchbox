import { brand } from '@/lib/brand'

// Neutral placeholder shown when a strap has neither its own photo nor a matching template
// photo. Replaces the old procedural StrapSwatch drawing — the UI only ever shows real pictures.
export function StrapPhotoFallback({ height = '100%' }: { height?: number | string }) {
  return (
    <div
      style={{
        height,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: brand.colors.slot,
      }}
    >
      <span
        style={{
          fontFamily: brand.font.sans,
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: brand.colors.borderLight,
        }}
      >
        No photo
      </span>
    </div>
  )
}
