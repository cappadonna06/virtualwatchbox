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

export default function PrivacyPage() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '40px 56px 64px' }}>
      <h1 style={{ fontFamily: brand.font.serif, fontSize: 40, fontWeight: 600, color: brand.colors.ink, margin: 0 }}>Privacy Policy</h1>
      <p style={{ fontFamily: brand.font.sans, fontSize: 14, lineHeight: 1.7, color: brand.colors.muted, marginTop: 10 }}>Last updated: May 4, 2026</p>

      <div style={{ marginTop: 24, display: 'grid', gap: 20 }}>
        <div>
          <p style={sectionTitleStyle}>What we collect and why</p>
          <p style={bodyStyle}>Virtual Watchbox lets users create, manage, and share watch collections. If you choose Google sign-in, we may receive your name, email address, and profile image to create your collector profile, sign you in, and persist your virtual watchbox experience.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Collection and watch data</p>
          <p style={bodyStyle}>We store watch collection data you create or edit so app features work as expected, including watchbox state, profile surfaces, and collection views.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Google API data policy</p>
          <p style={bodyStyle}>Virtual Watchbox&apos;s use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Affiliate links and third-party cookies</p>
          <p style={bodyStyle}>Virtual Watchbox may include affiliate links for watches, straps, and accessories. If you click an affiliate link, partner sites may set cookies or similar technologies to track referrals and commissions under their own policies.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Uploaded photos</p>
          <p style={bodyStyle}>If you upload watchbox photos, those images are stored to provide your in-app display experience. We do not share uploaded photos with third parties without your consent.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>No sale of personal data</p>
          <p style={bodyStyle}>We do not sell your personal data.</p>
        </div>

        <div>
          <p style={sectionTitleStyle}>Data retention and deletion requests</p>
          <p style={bodyStyle}>To request account deletion and purging of your collection data, contact <a href="mailto:msells.caltech@gmail.com" style={{ color: brand.colors.gold }}>msells.caltech@gmail.com</a> from your account email.</p>
        </div>
      </div>
    </section>
  )
}
