export function BrandLockup({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const ink = tone === 'dark' ? '#C9A84C' : '#1A1410'
  const text = tone === 'dark' ? '#FAF8F4' : '#1A1410'
  return (
    <a
      href="/"
      aria-label="Virtual Watchbox home"
      className="brand-lockup"
      style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 64 64"
        overflow="visible"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <text
          x="32"
          y="50"
          textAnchor="middle"
          fontFamily="var(--font-cormorant), 'Cormorant Garamond', Georgia, serif"
          fontWeight={500}
          fontSize={50}
          letterSpacing={-3.2}
          fill={ink}
        >
          VW
        </text>
      </svg>
      <span
        className="brand-lockup-word"
        style={{
          fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
          fontWeight: 500,
          fontSize: 21,
          letterSpacing: '0.02em',
          color: text,
        }}
      >
        Virtual Watchbox
      </span>
    </a>
  )
}
