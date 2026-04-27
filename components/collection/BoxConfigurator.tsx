import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'

interface Props {
  frame: string
  setFrame: (v: string) => void
  lining: string
  setLining: (v: string) => void
  slotCount: number
  setSlotCount: (v: number) => void
}

export default function BoxConfigurator({ frame, setFrame, lining, setLining, slotCount, setSlotCount }: Props) {
  const fr = FRAMES.find(f => f.id === frame) ?? FRAMES[0]
  const ln = LININGS.find(l => l.id === lining) ?? LININGS[0]

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #EAE5DC',
      borderTop: 'none',
      borderRadius: '0 0 8px 8px',
    }}>
      {/* Slots */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EBE3' }}>
        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 }}>
          Slots
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SLOT_COUNTS.map(s => (
            <button
              key={s.n}
              onClick={() => setSlotCount(s.n)}
              style={{
                fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
                padding: '5px 12px', borderRadius: 4,
                border: slotCount === s.n ? '1px solid #C9A84C' : '1px solid #E0DAD0',
                background: slotCount === s.n ? 'rgba(201,168,76,0.06)' : 'transparent',
                color: slotCount === s.n ? '#C9A84C' : '#A89880',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Frame */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EBE3' }}>
        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 }}>
          Frame · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{fr.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FRAMES.map(f => (
            <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                onClick={() => setFrame(f.id)}
                title={f.label}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: f.swatchColor,
                  cursor: 'pointer',
                  border: frame === f.id ? '2px solid #C9A84C' : '2px solid transparent',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, color: '#A89880', textAlign: 'center', marginTop: 4, letterSpacing: '0.03em' }}>
                {f.label.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lining */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 }}>
          Lining · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{ln.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LININGS.map(l => (
            <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                onClick={() => setLining(l.id)}
                title={l.label}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: l.color,
                  cursor: 'pointer',
                  border: lining === l.id ? '2px solid #C9A84C' : l.id === 'cream' ? '2px solid #e0dbd0' : '2px solid transparent',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, color: '#A89880', textAlign: 'center', marginTop: 4, letterSpacing: '0.03em' }}>
                {l.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
