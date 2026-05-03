# Google OAuth Branding for Supabase Auth

If the Google sign-in screen shows `<project-ref>.supabase.co` instead of `virtualwatchbox.com`, that is expected unless you configure Google OAuth consent + Supabase auth URLs for your brand domain.

## What controls the text users see

Google uses your **OAuth consent app** metadata in Google Cloud, plus authorized domains and redirect origins.

## Recommended setup

### 1) Google Cloud Console (OAuth consent screen)
- Set **App name** to `Virtual Watchbox`.
- Set a branded **User support email**.
- Add **Developer contact information**.
- Add **Authorized domains**:
  - `virtualwatchbox.com`
  - `vercel.app` (if previews are used for auth)
  - `supabase.co` (only if needed by your callback setup)
- Publish the app (External + In production), or keep test users explicitly allowlisted.

### 2) Google Credentials (OAuth client)
For the OAuth client used by Supabase Google provider:
- **Authorized JavaScript origins**:
  - `https://virtualwatchbox.com`
  - `https://www.virtualwatchbox.com` (if used)
  - `https://<project-ref>.supabase.co`
- **Authorized redirect URIs**:
  - `https://<project-ref>.supabase.co/auth/v1/callback`

> Keep the Supabase callback URI exactly as required by Supabase Auth.

### 3) Supabase Auth settings
In Supabase dashboard:
- Auth → URL Configuration
  - **Site URL**: `https://virtualwatchbox.com`
  - **Redirect URLs**: include
    - `https://virtualwatchbox.com/auth/callback`
    - `https://www.virtualwatchbox.com/auth/callback` (if used)
    - preview URLs if needed
- Auth → Providers → Google
  - Ensure the correct Google client ID/secret pair is configured.

### 4) (Optional but best) Supabase Custom Domain
If you want to remove visible `<project-ref>.supabase.co` references where possible:
- Configure Supabase custom domain for Auth (Pro plan feature).
- Use branded domain endpoints in auth flows.

## Troubleshooting
- If Google still shows the old name/domain, wait for propagation (can take minutes to hours).
- Confirm you edited the **same Google project/client** referenced in Supabase provider settings.
- Clear browser account chooser state or test in a private window.
