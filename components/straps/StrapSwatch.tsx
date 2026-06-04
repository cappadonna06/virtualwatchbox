'use client'

// components/straps/StrapSwatch.tsx
// CSS-rendered strap swatches — the fallback when a strap has no photo. Ported
// faithfully from the design prototype (StrapSwatch.jsx). The hex values inside
// STRAP_TEXTURES / METAL_TEXTURES are bespoke gradient *art data* (not brand
// colors) and are intentionally kept verbatim — they define the layered look of
// each material, the way pixels define a photo. Structural chrome uses brand
// tokens. Vertical / portrait orientation to match the catalog photo treatment.

import { brand } from '@/lib/brand'

type Texture = {
  base: string
  overlay?: string
  overlaySize?: string
  stitch: string
  scale?: boolean
  channel?: boolean
  nato?: boolean
}

export const STRAP_TEXTURES: Record<string, Texture> = {
  // ── Smooth leather ──
  'leather-smooth-black':  { base: '#22201D', overlay: 'radial-gradient(ellipse 80% 60% at 40% 25%, rgba(255,255,255,0.10) 0%, transparent 55%), linear-gradient(160deg, #34302A 0%, #1A1714 78%)', stitch: '#9A7B4E' },
  'leather-smooth-brown':  { base: '#6A4426', overlay: 'radial-gradient(ellipse 80% 60% at 38% 24%, rgba(255,235,200,0.16) 0%, transparent 55%), linear-gradient(160deg, #7E5430 0%, #4E3014 80%)', stitch: '#E7CFA3' },
  'leather-smooth-cognac': { base: '#8A4B24', overlay: 'radial-gradient(ellipse 80% 60% at 38% 22%, rgba(255,225,180,0.22) 0%, transparent 55%), linear-gradient(160deg, #A35D2E 0%, #6A3414 82%)', stitch: '#F0D6A8' },
  'leather-smooth-tan':    { base: '#B08552', overlay: 'radial-gradient(ellipse 80% 60% at 38% 22%, rgba(255,240,210,0.28) 0%, transparent 55%), linear-gradient(160deg, #C49A66 0%, #8A6238 82%)', stitch: '#5A3A1C' },
  'leather-smooth-navy':   { base: '#2A3550', overlay: 'radial-gradient(ellipse 80% 60% at 40% 24%, rgba(255,255,255,0.10) 0%, transparent 55%), linear-gradient(160deg, #36436A 0%, #1E2840 80%)', stitch: '#C7B488' },
  // ── Alligator (square-scale tiling) ──
  'leather-alligator-black': { base: '#1A1410', overlay: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.42) 0 1px, transparent 1px 15px), repeating-linear-gradient(90deg, rgba(0,0,0,0.42) 0 1px, transparent 1px 13px), radial-gradient(ellipse 60% 40% at 30% 25%, rgba(255,255,255,0.10) 0%, transparent 60%), linear-gradient(160deg, #2E2922 0%, #15110D 80%)', overlaySize: '13px 15px, 13px 15px, auto, auto', stitch: '#7A5230', scale: true },
  'leather-alligator-brown': { base: '#5A2A2E', overlay: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.40) 0 1px, transparent 1px 15px), repeating-linear-gradient(90deg, rgba(0,0,0,0.40) 0 1px, transparent 1px 13px), radial-gradient(ellipse 60% 40% at 30% 24%, rgba(255,210,190,0.16) 0%, transparent 60%), linear-gradient(160deg, #6E3236 0%, #3E1C1F 82%)', overlaySize: '13px 15px, 13px 15px, auto, auto', stitch: '#D8A77A', scale: true },
  'leather-alligator-navy':  { base: '#22304E', overlay: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.40) 0 1px, transparent 1px 15px), repeating-linear-gradient(90deg, rgba(0,0,0,0.40) 0 1px, transparent 1px 13px), radial-gradient(ellipse 60% 40% at 30% 24%, rgba(200,220,255,0.14) 0%, transparent 60%), linear-gradient(160deg, #2C3D60 0%, #18223A 82%)', overlaySize: '13px 15px, 13px 15px, auto, auto', stitch: '#C7B488', scale: true },
  // ── Suede (soft vertical nap) ──
  'suede-grey':  { base: '#6E6A63', overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.07) 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), linear-gradient(180deg, #807C74 0%, #5C594F 100%)', stitch: '#CFCBC0' },
  'suede-brown': { base: '#7A5430', overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), linear-gradient(180deg, #9A7752 0%, #6F4926 100%)', stitch: '#E0C599' },
  // ── Rubber (matte with micro-dots, no stitch) ──
  'rubber-black':  { base: '#1C1C1C', overlay: 'radial-gradient(circle 1.4px at 3px 3px, rgba(255,255,255,0.09) 50%, transparent 51%), radial-gradient(circle 1.4px at 9px 9px, rgba(255,255,255,0.05) 50%, transparent 51%), linear-gradient(180deg, #2A2A2A 0%, #141414 100%)', overlaySize: '12px 12px, 12px 12px, auto', stitch: 'transparent', channel: true },
  'rubber-navy':   { base: '#1E2740', overlay: 'radial-gradient(circle 1.4px at 3px 3px, rgba(255,255,255,0.09) 50%, transparent 51%), radial-gradient(circle 1.4px at 9px 9px, rgba(255,255,255,0.05) 50%, transparent 51%), linear-gradient(180deg, #283255 0%, #161D33 100%)', overlaySize: '12px 12px, 12px 12px, auto', stitch: 'transparent', channel: true },
  'rubber-grey':   { base: '#4A5236', overlay: 'radial-gradient(circle 1.4px at 3px 3px, rgba(255,255,255,0.08) 50%, transparent 51%), radial-gradient(circle 1.4px at 9px 9px, rgba(255,255,255,0.05) 50%, transparent 51%), linear-gradient(180deg, #586046 0%, #3A4029 100%)', overlaySize: '12px 12px, 12px 12px, auto', stitch: 'transparent', channel: true },
  'rubber-orange': { base: '#B5521C', overlay: 'radial-gradient(circle 1.4px at 3px 3px, rgba(255,255,255,0.12) 50%, transparent 51%), radial-gradient(circle 1.4px at 9px 9px, rgba(255,255,255,0.06) 50%, transparent 51%), linear-gradient(180deg, #C76327 0%, #8E3E12 100%)', overlaySize: '12px 12px, 12px 12px, auto', stitch: 'transparent', channel: true },
  // ── NATO (woven, with keeper stripes) ──
  'nato-black': { base: '#23211E', overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 5px), linear-gradient(180deg, #2C2A26 0%, #1A1815 100%)', stitch: 'transparent', nato: true },
  'nato-grey':  { base: '#6B6B66', overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 5px), linear-gradient(180deg, #777771 0%, #565651 100%)', stitch: 'transparent', nato: true },
  'nato-olive': { base: '#44523B', overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 5px), linear-gradient(180deg, #4E5C44 0%, #38442F 100%)', stitch: 'transparent', nato: true },
  'nato-navy':  { base: '#2A3550', overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 5px), linear-gradient(180deg, #313D5C 0%, #1F2840 100%)', stitch: 'transparent', nato: true },
  'nato-bond':  { base: '#3A4F3A', overlay: 'repeating-linear-gradient(90deg, #3A4F3A 0 16px, #5A3030 16px 22px, #3A4F3A 22px 40px, #B5912E 40px 46px, #3A4F3A 46px 62px), repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px)', stitch: 'transparent', nato: true },
  // ── Sailcloth (twill weave) ──
  'sailcloth-black': { base: '#1F2330', overlay: 'repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.18) 5px 6px), repeating-linear-gradient(-45deg, transparent 0 5px, rgba(255,255,255,0.05) 5px 6px), linear-gradient(180deg, #2C303C 0%, #181B26 100%)', stitch: '#8A8E96' },
  'sailcloth-navy':  { base: '#26314C', overlay: 'repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.18) 5px 6px), repeating-linear-gradient(-45deg, transparent 0 5px, rgba(255,255,255,0.05) 5px 6px), linear-gradient(180deg, #2F3B58 0%, #1B2238 100%)', stitch: '#9AA6C0' },
  'sailcloth-grey':  { base: '#6E7355', overlay: 'repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.16) 5px 6px), repeating-linear-gradient(-45deg, transparent 0 5px, rgba(255,255,255,0.06) 5px 6px), linear-gradient(180deg, #7B815F 0%, #5A5F44 100%)', stitch: '#D8D2BE' },
}

type MetalKind = 'oyster' | 'jubilee' | 'milanese' | 'mesh'
export const METAL_TEXTURES: Record<string, { link: MetalKind; tone: string }> = {
  'metal-oyster-steel':   { link: 'oyster',   tone: '#B8B8BC' },
  'metal-jubilee-steel':  { link: 'jubilee',  tone: '#BFBFC4' },
  'metal-milanese-steel': { link: 'milanese', tone: '#BCBCC0' },
  'metal-mesh-steel':     { link: 'mesh',     tone: '#B4B4B8' },
}

function LeatherStrap({ tex, bandW }: { tex: Texture; bandW: string }) {
  return (
    <div style={{ position: 'relative', width: bandW, height: '88%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%', borderRadius: '7px 7px 9px 9px',
        background: tex.base, backgroundImage: tex.overlay || 'none', backgroundSize: tex.overlaySize || 'auto',
        boxShadow: '0 16px 26px rgba(26,20,16,0.26), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 4px rgba(0,0,0,0.30), inset 2px 0 3px rgba(0,0,0,0.18), inset -2px 0 3px rgba(0,0,0,0.18)',
      }}>
        {tex.channel && (
          <div style={{
            position: 'absolute', top: 8, bottom: 8, left: '50%', width: 5, transform: 'translateX(-50%)',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.30), rgba(255,255,255,0.05), rgba(0,0,0,0.30))', borderRadius: 3,
          }} />
        )}
        {tex.stitch !== 'transparent' && (['left', 'right'] as const).map(side => (
          <div key={side} style={{
            position: 'absolute', top: 14, bottom: 14, [side]: 7, width: 0,
            borderLeft: `1.5px dashed ${tex.stitch}`, opacity: 0.6,
          }} />
        ))}
        {!tex.nato && (
          <div style={{ position: 'absolute', left: '50%', bottom: '14%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
                boxShadow: 'inset 0 0 1px rgba(255,255,255,0.12), 0 1px 0 rgba(255,255,255,0.08)',
              }} />
            ))}
          </div>
        )}
        <div style={{
          position: 'absolute', left: -3, right: -3, top: '26%', height: 11,
          background: tex.base, backgroundImage: tex.overlay || 'none', backgroundSize: tex.overlaySize || 'auto',
          borderRadius: 2, boxShadow: '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        }} />
      </div>
    </div>
  )
}

function MetalBracelet({ kind, tone, bandW }: { kind: MetalKind; tone: string; bandW: string }) {
  const rows = 9
  const isMesh = kind === 'milanese' || kind === 'mesh'
  const linkBg = (): string => {
    if (isMesh) return `repeating-linear-gradient(115deg, ${tone} 0 2px, rgba(0,0,0,0.18) 2px 3px, ${tone} 3px 5px)`
    if (kind === 'jubilee') return `linear-gradient(90deg, #8E8E92 0 18%, ${tone} 18% 34%, #E8E8EC 34% 50%, ${tone} 50% 66%, #8E8E92 66% 82%, ${tone} 82% 100%)`
    return `linear-gradient(90deg, #8E8E92 0 30%, ${tone} 30% 38%, #E8E8EC 38% 62%, ${tone} 62% 70%, #8E8E92 70% 100%)`
  }
  return (
    <div style={{
      position: 'relative', width: bandW, height: '88%', display: 'flex', flexDirection: 'column',
      gap: isMesh ? 0 : 3, borderRadius: 8, overflow: 'hidden',
      boxShadow: '0 16px 26px rgba(26,20,16,0.28), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)',
    }}>
      {isMesh
        ? <div style={{ flex: 1, background: linkBg() }} />
        : Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{
            flex: 1, background: linkBg(), borderRadius: 2,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 1px rgba(0,0,0,0.3)',
          }} />
        ))}
    </div>
  )
}

export function StrapSwatch({
  swatchId,
  material,
  height = 220,
  bandWidth,
}: {
  swatchId: string
  material: string
  height?: number | string
  bandWidth?: string
}) {
  const isMetal = material === 'metal' || swatchId.startsWith('metal-')
  const bandW = bandWidth || (isMetal ? '30%' : '27%')
  const metal = METAL_TEXTURES[swatchId] ?? METAL_TEXTURES['metal-oyster-steel']
  const tex = STRAP_TEXTURES[swatchId] ?? STRAP_TEXTURES['leather-smooth-brown']
  return (
    <div style={{
      position: 'relative', width: '100%', height,
      background: `radial-gradient(ellipse 120% 80% at 50% 35%, #FBF8F2 0%, ${brand.colors.paper} 70%, ${brand.colors.paperWarm} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(168,152,128,0.045) 0 1px, transparent 1px 13px)' }} />
      <div style={{
        position: 'absolute', bottom: '7%', left: '50%', transform: 'translateX(-50%)',
        width: '34%', height: 14, borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(26,20,16,0.18) 0%, transparent 70%)', filter: 'blur(2px)',
      }} />
      {isMetal
        ? <MetalBracelet kind={metal.link} tone={metal.tone} bandW={bandW} />
        : <LeatherStrap tex={tex} bandW={bandW} />}
    </div>
  )
}
