# BTI account sign-in setup (Cloudflare Pages + Supabase Auth)

## Current status

The public sign-in page is available at **https://bacterial-therapeutics-intelligence.pages.dev/sign-in.html**.
It is intentionally **not active** until the operator configures and verifies a Supabase Auth project.
The optional public file `frontend/auth-config.js` remains blank, and the Cloudflare auth configuration endpoint returns an unconfigured status by default. No passwords are collected.
Public research at `/index.html` continues working without sign-in.
Research Pro remains a future product: signing in does **not** grant subscriptions, protected scientific data or paid features.

## 1 — Create an authentication project

1. Create/select a Supabase project: https://supabase.com/dashboard
2. In **Authentication → Providers → Email**, enable email authentication.
3. Start with the default passwordless magic-link email behavior. Confirm the project can actually send test emails. For production, configure a suitable SMTP provider, deliverability, abuse/rate limiting and CAPTCHA according to Supabase's current guidance.
4. In **Authentication → URL Configuration**, set:
   - **Site URL:** `https://bacterial-therapeutics-intelligence.pages.dev`
   - **Additional redirect URL:** `https://bacterial-therapeutics-intelligence.pages.dev/account.html`
   - Add any separately trusted custom-domain / staging callback URLs you really use.
5. Review the Supabase email template; it must provide a working sign-in link. Do not send password-reset or OTP secrets to a third-party endpoint.

## 2 — Activate from Cloudflare (no GitHub key editing)

The website now reads the Supabase **public** URL and publishable key from a Cloudflare Pages Function:
`GET /api/auth-public-config`. Its default response is `{"configured":false}` until settings are entered. The browser never receives Supabase administrative/secret keys.

In Cloudflare Dashboard → **Workers & Pages → bacterial-therapeutics-intelligence → Settings → Variables and Secrets**, create these **Production** variables:

| Name | Value |
|---|---|
| `BTI_SUPABASE_URL` | Supabase Project URL, e.g. `https://PROJECT_REF.supabase.co` |
| `BTI_SUPABASE_PUBLISHABLE_KEY` | Supabase project's **publishable key** beginning with `sb_publishable_` |

Get both values from your Supabase project settings. These values are public client identifiers, not login passwords; only use the publishable key. Do not use any `sb_secret_` key, `service_role` credential, database password, SMTP password, or JWT admin key.

**Important:** Save variables for the production environment and trigger a new Cloudflare production deployment; variable changes typically need a new deployment before Pages Functions can read them. Check the latest deployment is **Success**.

Verify `https://bacterial-therapeutics-intelligence.pages.dev/api/auth-public-config` responds with `"configured":true`. The response intentionally exposes only the PUBLIC project URL and publishable key. Do not share screenshots containing unrelated Cloudflare credentials.

The alternative static `frontend/auth-config.js` remains blank and is optional for local development. Production should use Cloudflare environment settings instead.

For real public signup, configure a **custom SMTP sender**, email delivery/authentication, abuse controls, and rate limits in Supabase before inviting users; the built-in Supabase email service is test-limited. Check https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/rate-limits .

## 3 — Verify actual sign-in

1. Open `https://bacterial-therapeutics-intelligence.pages.dev/sign-in.html` in a private browser window.
2. Enter an email address you control and select **Email me a sign-in link**.
3. Open the link in the email. It must return to `/account.html` on your approved site.
4. Confirm that **My account** shows the authenticated email.
5. Test **Sign out** and refresh the page to verify the signed-out state.
6. Test on mobile, an expired link, an invalid email, rate limits, spam filtering, network failure, and the unconfigured state.
7. Check that users can still visit the public `index.html` and access public research without signing in.

If sign-in links fail, check the Supabase allowed redirect URLs, email provider and template, browser blocking, and the authentication logs. Do not paste live magic-link URLs or session tokens in support messages.

## Security and product limitations

- This implementation uses the hosted Supabase Auth email flow and the official browser SDK, not local password storage.
- It uses a browser-managed session for display of the user's own verified account email. It does **not** implement server-side authorization, data isolation, or paid access gates.
- Before building protected saved research or team storage, implement database row-level security (RLS), server-side verification where appropriate, ownership checks, privacy/data-retention policies, rate limits, deletion/export processes, and authorization tests.
- Do not use a client-side `if (user)` check alone to protect confidential content or paid research.
- For account setup review use the official Supabase references:
  - https://supabase.com/docs/guides/auth/auth-email-passwordless
  - https://supabase.com/docs/reference/javascript/auth-signinwithotp
  - https://supabase.com/docs/reference/javascript/initializing
  - https://supabase.com/docs/guides/database/postgres/row-level-security

## Existing Cloudflare settings

Keep the working Cloudflare Pages build configuration unchanged: use GitHub `main`, **root directory empty**, **build output directory `frontend`**, and your previously working build command. Auth pages are ordinary static assets. **The two Supabase configuration values above are PUBLIC identifiers and should not be confused with backend secrets. Never store a privileged key in a client-readable Pages endpoint.**

The consulting inquiry form and its separate email delivery provider are independent of this authentication setup.
