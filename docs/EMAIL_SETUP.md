# Email Setup — Resend + Supabase Auth

This document is the runbook for sending all transactional email from `virtualwatchbox.com` via Resend, with Supabase Auth as the consumer.

Most of this work happens in vendor dashboards (Resend, your DNS host, Supabase) — there is no application code to deploy beyond the legal-page email change and the branded templates in `docs/email-templates/`.

---

## 1. Identities and addresses

| Purpose | Address |
|---|---|
| Outbound transactional sender (Supabase Auth) | `noreply@virtualwatchbox.com` |
| Inbound user-facing support / data deletion requests | `support@virtualwatchbox.com` |
| Sender display name | `Virtual Watchbox` |

Sender configured in Supabase: `Virtual Watchbox <noreply@virtualwatchbox.com>`.

`noreply@` and `support@` are not real mailboxes — they are forwarders to a personal inbox (see §4).

---

## 2. Resend domain setup

1. Sign in at https://resend.com.
2. **Domains → Add Domain** → `virtualwatchbox.com`.
3. Choose region. Default `us-east-1` is fine; record the choice — it determines the SPF/MX values below.
4. Resend will display 4 DNS records. Add them to your DNS host exactly as Resend shows — the DKIM TXT value is generated per domain and only Resend can give it to you.

### Required DNS records (region = `us-east-1`)

All records below assume the domain is `virtualwatchbox.com`. If your DNS host expects bare hostnames, drop the trailing `.virtualwatchbox.com` from the `Name` column.

| Type | Name | Value | Priority | TTL |
|---|---|---|---|---|
| MX | `send.virtualwatchbox.com` | `feedback-smtp.us-east-1.amazonses.com` | 10 | Auto |
| TXT | `send.virtualwatchbox.com` | `v=spf1 include:amazonses.com ~all` | — | Auto |
| TXT | `resend._domainkey.virtualwatchbox.com` | *(long DKIM key — copy verbatim from Resend dashboard)* | — | Auto |
| TXT | `_dmarc.virtualwatchbox.com` | `v=DMARC1; p=none;` | — | Auto |

Notes:

- Use `p=none` for DMARC initially so misconfigurations don't bounce real mail. After two weeks of clean Resend "Reports" output, raise to `p=quarantine`.
- If Cloudflare is your DNS host, **disable the orange-cloud proxy** on these records (DNS only). Email records must not be proxied.
- Propagation is usually <15 min but can take up to a few hours. Use `dig +short TXT resend._domainkey.virtualwatchbox.com` to verify.
- Click **Verify DNS Records** in Resend until all four turn green.

### Create the API key

1. Resend → **API Keys → Create API Key**.
2. Name: `supabase-auth-prod`. Permission: `Sending access`. Domain: `virtualwatchbox.com`.
3. Copy the key (`re_...`) once and store it in your password manager. You will paste it into Supabase below.

---

## 3. Supabase SMTP integration

**Project → Authentication → Settings → SMTP Settings.** Enable "Custom SMTP" and use:

| Field | Value |
|---|---|
| Sender email | `noreply@virtualwatchbox.com` |
| Sender name | `Virtual Watchbox` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | *(the `re_...` API key from §2)* |
| Minimum interval between emails | leave default |

Save. Then **Authentication → Email Templates** and paste the templates from `docs/email-templates/` (see §5 — the file layout maps 1:1 to Supabase template tabs).

Send a test from the dashboard ("Send test email") to verify the SMTP path. Then trigger a real magic link from `/auth` against your own address to verify the full path end-to-end (SMTP → Resend → DKIM-signed delivery → branded template → magic link returns to `/auth/callback`).

---

## 4. Inbound forwarding — Cloudflare Email Routing (deployed)

Resend is sending-only. Inbound mail (replies, bounces, deletion requests, support inquiries) is forwarded via **Cloudflare Email Routing**.

DNS for `virtualwatchbox.com` was migrated from GoDaddy nameservers (`ns45/46.domaincontrol.com`) to Cloudflare (`betty.ns.cloudflare.com`, `mitchell.ns.cloudflare.com`). Domain registration remains at GoDaddy. All records are set to **DNS only** (gray cloud) — Cloudflare is used purely for DNS resolution and Email Routing, not HTTP proxy. Vercel continues to serve the site directly.

### Configured aliases

All forward to a single personal destination inbox (verified in Cloudflare → Email Routing → Destination addresses):

| Alias | Purpose |
|---|---|
| `noreply@virtualwatchbox.com` | Captures replies/bounces to the Supabase Auth sender |
| `support@virtualwatchbox.com` | User-facing support, deletion requests, legal contact (referenced in `/privacy` and `/terms`) |
| `hello@virtualwatchbox.com` | General/marketing inbound |
| `help@virtualwatchbox.com` | Alias for support |
| `legal@virtualwatchbox.com` | Legal/DMCA inbound |
| `press@virtualwatchbox.com` | Press inquiries |
| `marc@virtualwatchbox.com` | Founder personal alias on the domain |
| `privacy@virtualwatchbox.com` | Privacy/data-rights inbound (GDPR/CCPA channel) |

### Adding or changing aliases

Cloudflare → `virtualwatchbox.com` → **Email → Email Routing → Routing rules**. Click **Create address**, set custom address, action **Send to an email**, pick the verified destination, save.

To route a new alias to a different destination, first add and verify that destination under **Destination addresses** (Cloudflare emails a one-time verification link).

### Coexistence with Resend

Resend's MX lives on the subdomain `send.virtualwatchbox.com` (Amazon SES feedback). Cloudflare Email Routing's MX lives on the apex `virtualwatchbox.com`. Different mail "homes" — they do not conflict. Outbound Supabase Auth mail continues to flow through Resend SMTP regardless of the inbound forwarder.

---

## 5. Branded Supabase Auth templates

The HTML templates live in `docs/email-templates/`:

| File | Supabase tab |
|---|---|
| `magic-link.html` | Magic Link |
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset Password |
| `change-email.html` | Change Email Address |
| `invite-user.html` | Invite user |

For each template:

1. Open the corresponding Supabase Auth → Email Templates tab.
2. Set the **Subject** (suggested subjects are at the top of each HTML file as a comment).
3. Replace the **Message body (HTML)** with the file contents verbatim. Variable tokens (`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`) match Supabase's GoTrue template syntax.
4. Save and use **Send test email**.

Design notes:
- Layout is a single 560-px centered card on a `#FAF8F4` background (matches `brand.colors.bg`).
- Wordmark uses Cormorant Garamond with Georgia/Times fallback for email-client compatibility (web fonts do not load reliably across mail clients).
- Body uses DM Sans with Helvetica Neue/Arial fallback.
- Gold accent (`#C9A84C`) is a 36-px hairline only — no gold backgrounds, no large gold areas.
- All structure is table-based with inline styles for Outlook + Gmail clipping safety.
- No emojis, no exclamation points — voice is precise and minimal per brand.
- Footer includes `virtualwatchbox.com · Unsubscribe · Privacy Policy · Terms`. The Unsubscribe link is a `mailto:` to `support@` until a preference center exists; transactional auth mail does not legally require an unsubscribe header but the link is included for consistency.

---

## 6. Acceptance verification

Tick these off after setup:

- [ ] All 4 Resend DNS records show "Verified" in the Resend dashboard.
- [ ] `dig +short TXT resend._domainkey.virtualwatchbox.com` returns a non-empty value.
- [ ] Supabase **Send test email** from a template arrives, passes SPF + DKIM (check the Gmail "Show original" header — both should read `PASS`), and renders branded.
- [ ] A real magic-link sign-in from `/auth` arrives within 30 s and the link returns to `/auth/callback` successfully.
- [ ] An email sent to `support@virtualwatchbox.com` from an outside account lands in the personal inbox within 1 min.
- [ ] An email sent to `noreply@virtualwatchbox.com` also lands in the personal inbox.
- [ ] DMARC report aggregate address (if configured) starts receiving daily reports without `fail` rows from your own sends.

---

## 7. Known scope gaps

These were called out in the original task but are not yet built and are not blocked by this email setup:

- **`/settings` route** — does not exist in the codebase yet. PRD §6 lists it as P0 ("Account summary", "Request data deletion (email-backed)"). When that route is built, the deletion CTA must `mailto:support@virtualwatchbox.com` (already the address used in `/privacy`).
- **Marketing-list double opt-in** — out of scope for this transactional setup. If/when a launch-list is added, set up a separate Resend audience and templates; do not send marketing through the Auth SMTP path.
