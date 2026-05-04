import { brand } from '@/lib/brand'

const sectionTitleStyle = {
  fontFamily: brand.font.sans,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: brand.colors.muted,
  margin: '0 0 6px',
}

const bodyStyle = {
  fontFamily: brand.font.sans,
  fontSize: 15,
  lineHeight: 1.8,
  color: brand.colors.ink,
  margin: 0,
}

export default function TermsPage() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '40px 56px 64px' }}>
      <h1 style={{ fontFamily: brand.font.serif, fontSize: 40, fontWeight: 600, color: brand.colors.ink, margin: 0 }}>Terms of Use</h1>
      <p style={{ fontFamily: brand.font.sans, fontSize: 14, lineHeight: 1.7, color: brand.colors.muted, marginTop: 10 }}>Last updated: May 4, 2026</p>

      <div style={{ marginTop: 24, display: 'grid', gap: 20 }}>
        <div>
          <p style={sectionTitleStyle}>Service overview</p>
          <p style={bodyStyle}>Virtual Watchbox allows users to create, manage, and share virtual watch collections. You may use Google sign-in, and profile information such as name, email, and avatar may be used for account setup and access.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Valuation disclaimer</p>
          <p style={bodyStyle}>Any estimated watch values, market pricing signals, or analytics shown in Virtual Watchbox are provided for informational purposes only, are not financial advice, and are not guarantees of resale value or future performance.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Affiliate disclosure</p>
          <p style={bodyStyle}>Virtual Watchbox is a participant in affiliate advertising programs and may earn a commission if you purchase through links on the site.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>User conduct</p>
          <p style={bodyStyle}>You agree not to upload or publish unlawful, infringing, abusive, hateful, sexually explicit, deceptive, or impersonating content, including in profile names, handles, bios, and uploaded images.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Catalog and intellectual property</p>
          <p style={bodyStyle}>Watch catalog records, watch metadata, and dial-render assets are owned by Virtual Watchbox or its licensors/data providers. Adding items to your virtual watchbox does not transfer ownership rights in those assets.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Questions</p>
          <p style={bodyStyle}>For terms questions, contact <a href="mailto:msells.caltech@gmail.com" style={{ color: brand.colors.gold }}>msells.caltech@gmail.com</a>.</p>
        </div>
      </div>
    </section>
  )
}
