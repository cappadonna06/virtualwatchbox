const items = [
  { ref: 'Rolex Sub 126610LN',       val: '$14,200', dir: 'up'   },
  { ref: 'AP Royal Oak 15500ST',     val: '$28,500', dir: 'down' },
  { ref: 'Patek 5711/1A',            val: '$65,000', dir: 'up'   },
  { ref: 'IWC Pilot IW327001',       val: '$6,800',  dir: 'flat' },
  { ref: 'Longines Legend Diver',    val: '$1,350',  dir: 'up'   },
  { ref: 'Omega Speedy Moonwatch',   val: '$5,400',  dir: 'up'   },
  { ref: 'Tudor Black Bay 58',       val: '$3,100',  dir: 'down' },
  { ref: 'Cartier Santos M',         val: '$7,200',  dir: 'up'   },
]

export default function Ticker() {
  const doubled = [...items, ...items]
  return (
    <div
      style={{
        overflow: 'hidden',
        borderTop: '1px solid #EAE5DC',
        borderBottom: '1px solid #EAE5DC',
        padding: '10px 0',
        background: '#FAF8F4',
      }}
    >
      <div className="ticker-inner" style={{ display: 'flex', gap: '60px', width: 'max-content' }}>
        {doubled.map((it, i) => (
          <span
            key={i}
            style={{ fontSize: 11, letterSpacing: '0.06em', color: '#A89880', whiteSpace: 'nowrap' }}
          >
            <strong style={{ color: '#1A1410', fontWeight: 500 }}>{it.ref}</strong>
            {' · '}{it.val}
            <span style={{ color: it.dir === 'up' ? '#4a8a4a' : it.dir === 'down' ? '#8a3a3a' : 'inherit' }}>
              {it.dir === 'up' ? ' ↑' : it.dir === 'down' ? ' ↓' : ' →'}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
