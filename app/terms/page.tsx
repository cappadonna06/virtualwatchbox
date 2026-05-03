import { brand } from '@/lib/brand'

export default function TermsPage() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '40px 56px 64px' }}>
      <h1 style={{ fontFamily: brand.font.serif, fontSize: 40, fontWeight: 600, color: brand.colors.ink, margin: 0 }}>Terms of Use</h1>
      <p style={{ fontFamily: brand.font.sans, fontSize: 14, lineHeight: 1.7, color: brand.colors.muted, marginTop: 10 }}>Last updated: May 3, 2026</p>
      <div style={{ marginTop: 24, display: 'grid', gap: 18 }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>Virtual Watchbox lets users create, manage, and share watch collections.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>You may sign in using Google. Profile information such as your name, email, and avatar may be used to create and manage your account.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>Collection and watch data may be stored to support the product experience.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>We do not sell personal data.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>Some links in the product may be affiliate links for watches, straps, and accessories.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>Questions about these terms can be sent to <a href="mailto:msells.caltech@gmail.com" style={{ color: brand.colors.gold }}>msells.caltech@gmail.com</a>.</p>
      </div>
    </section>
  )
}
