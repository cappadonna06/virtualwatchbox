'use client'

interface DialSVGProps {
  dialColor: string
  markerColor: string
  handColor: string
  size: number
}

export default function DialSVG({ dialColor, markerColor, handColor, size }: DialSVGProps) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  const outerRingR = r * 0.96
  const dialFaceR = r * 0.88
  const markerOuterR = r * 0.82
  const markerInnerR = r * 0.72
  const markerCardinalInnerR = r * 0.64
  const handTipHour = r * 0.50
  const handTipMinute = r * 0.65
  const handTail = -r * 0.14
  const centerDotR = r * 0.045

  // Display 10:10 — the classic watch photography position
  const hourDecimal = 10 + 10 / 60
  const minuteDecimal = 10 / 60
  const hourAngle = (hourDecimal / 12) * 2 * Math.PI - Math.PI / 2
  const minuteAngle = (minuteDecimal) * 2 * Math.PI - Math.PI / 2

  function handCoords(angle: number, tip: number, tail: number) {
    return {
      x1: cx + Math.cos(angle) * tail,
      y1: cy + Math.sin(angle) * tail,
      x2: cx + Math.cos(angle) * tip,
      y2: cy + Math.sin(angle) * tip,
    }
  }

  const hour = handCoords(hourAngle, handTipHour, handTail)
  const minute = handCoords(minuteAngle, handTipMinute, handTail)

  const markers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
    const isCardinal = i % 3 === 0
    const innerR = isCardinal ? markerCardinalInnerR : markerInnerR
    return {
      x1: cx + Math.cos(angle) * innerR,
      y1: cy + Math.sin(angle) * innerR,
      x2: cx + Math.cos(angle) * markerOuterR,
      y2: cy + Math.sin(angle) * markerOuterR,
      strokeWidth: isCardinal ? size * 0.024 : size * 0.014,
    }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Watch dial"
      role="img"
    >
      {/* Outer ring / bezel */}
      <circle cx={cx} cy={cy} r={outerRingR} fill="#2A2520" />

      {/* Dial face */}
      <circle cx={cx} cy={cy} r={dialFaceR} fill={dialColor} />

      {/* Hour markers */}
      {markers.map((m, i) => (
        <line
          key={i}
          x1={m.x1}
          y1={m.y1}
          x2={m.x2}
          y2={m.y2}
          stroke={markerColor}
          strokeWidth={m.strokeWidth}
          strokeLinecap="round"
        />
      ))}

      {/* Minute hand */}
      <line
        x1={minute.x1}
        y1={minute.y1}
        x2={minute.x2}
        y2={minute.y2}
        stroke={handColor}
        strokeWidth={size * 0.028}
        strokeLinecap="round"
      />

      {/* Hour hand */}
      <line
        x1={hour.x1}
        y1={hour.y1}
        x2={hour.x2}
        y2={hour.y2}
        stroke={handColor}
        strokeWidth={size * 0.044}
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={centerDotR} fill={markerColor} />
    </svg>
  )
}
