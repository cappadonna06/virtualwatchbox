import { brand } from '@/lib/brand'

export default function PrivacyPage() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '40px 56px 64px' }}>
      <h1 style={{ fontFamily: brand.font.serif, fontSize: 40, fontWeight: 600, color: brand.colors.ink, margin: 0 }}>
        Privacy Policy
      </h1>
      <p style={{ fontFamily: brand.font.sans, fontSize: 14, lineHeight: 1.7, color: brand.colors.muted, marginTop: 10 }}>
        Last updated: May 3, 2026
      </p>
      <div style={{ marginTop: 24, display: 'grid', gap: 18 }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>Virtual Watchbox helps users create, manage, and share watch collections.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>Accounts may use Google sign-in. For account setup and access, we may use profile information provided by Google such as your name, email address, and avatar image.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>We may store collection and watch-related data you add in order to provide the app experience.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>We do not sell your personal data.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>Virtual Watchbox may include affiliate links for watches, straps, and accessories.</p>
        <p style={{ fontFamily: brand.font.sans, fontSize: 15, lineHeight: 1.8, color: brand.colors.ink, margin: 0 }}>For privacy questions, contact: <a href="mailto:msells.caltech@gmail.com" style={{ color: brand.colors.gold }}>msells.caltech@gmail.com</a></p>
      </div>
    </section>
  )
}
