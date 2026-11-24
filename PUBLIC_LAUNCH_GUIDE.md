# Public research + consulting launch

This repository now includes public pages under `frontend/`: `services.html`, `research-pro.html`, `about.html`, `contact.html`, `privacy.html`, and `disclaimer.html`. The research homepage (`frontend/index.html`) remains free and does not require authentication.

## Cloudflare Pages deployment

1. Open **Cloudflare Dashboard → Workers & Pages → the existing BTI Pages project → Settings → Builds & deployments**.
2. Confirm the GitHub repository is `mail2dpaksingh-star/bacterial-therapeutics-intelligence` and production branch is `main`.
3. Use the **repository root** as root directory, with the build output directory set to `frontend` (no build command for this static site). Do **not** set the project root directory to `frontend` if you want the root-level Pages Function to deploy.
4. Deploy the latest commit and inspect the deployment logs. Verify the site's actual hostname in Cloudflare; never assume a particular `.pages.dev` address without checking.
5. Visit `/services.html`, `/research-pro.html`, `/about.html`, `/privacy.html`, `/disclaimer.html`, `/contact.html`, and the existing public research homepage.
6. Confirm the Functions deployment includes the `/api/consulting-inquiry` route.

## Enable delivery for consulting inquiries

The form uses the Pages Function at `functions/api/consulting-inquiry.js`. It does not store public API keys, use browser-visible credentials, or send data to a third-party service unless configured by the site administrator.

Set these **server-side** environment variables in the Pages project, both Production and Preview only as appropriate:

- `RESEND_API_KEY` — secret API key issued by Resend (secret, not browser code).
- `INQUIRY_TO_EMAIL` — operator-controlled inbox for receiving inquiries.
- `INQUIRY_FROM_EMAIL` — a verified sender address on a domain authorized by the email provider.

The operator must verify an appropriate domain with the email service provider. Redeploy after configuring. Complete an end-to-end test inquiry and check delivery/reply-to address. Without configuration, the endpoint deliberately returns HTTP 503 with a user-readable setup error and **does not claim successful delivery**.

For public production use, add rate limiting, bot protection, email-delivery monitoring, a documented retention/deletion policy, and operator-approved business/contact identity. Review Privacy and Disclaimer with qualified advisors as appropriate. Do not ask visitors to submit sensitive/confidential information before an agreement.

## Status

GitHub pages and function code: committed to `main`.
Cloudflare deployment status and actual domain: not verified from GitHub.
Secure email delivery: pending operator credentials and configuration.
Research Pro: coming soon; no payments or sign-in.
