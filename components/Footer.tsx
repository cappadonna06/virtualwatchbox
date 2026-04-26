export default function Footer() {
  return (
    <footer
      className="site-footer"
      style={{
        padding: '32px 56px',
        borderTop: '1px solid #EAE5DC',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 16, fontWeight: 400, color: '#1A1410' }}>
        Virtual Watchbox
      </span>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#A89880' }}>
        © 2026 · virtualwatchbox.com
      </span>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#C9A84C' }}>
        Free for Collectors. Always.
      </span>
    </footer>
  )
}
