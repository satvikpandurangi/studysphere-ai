# Run the 50–100 student pilot for ₹0

This configuration keeps the pilot inside published free allowances and adds conservative limits in the application. Provider limits and terms can change, so the platform administrator must check the provider dashboards weekly.

## Free services

| Service | Select | Used for | Pilot guardrail |
| --- | --- | --- | --- |
| Supabase | Free | Auth, Postgres, progress, curriculum, private PDFs | 500 MB database planning ceiling; PDF uploads stop at 800 MB |
| Cloudflare Pages | Free | Static React site | Static asset requests do not consume the Worker allowance |
| Cloudflare Workers | Free | Secure API | App stops authenticated API actions at 90,000/day, below the 100,000/day provider allowance |
| Brevo | Free | Supabase confirmation and recovery email | 300 messages/day; sufficient for a controlled 100-user onboarding |
| Groq | Free | Optional grounded tutor | 3 answers/student/day and 100 answers/platform/day |

Core lessons, Markdown, quizzes, flashcards, plans, progress, mind maps, YouTube embeds, and parent supervision do not depend on Groq.

## Account setup

1. Create free accounts for [Supabase](https://supabase.com/pricing), [Cloudflare](https://dash.cloudflare.com/), [Brevo](https://www.brevo.com/), and optionally [Groq](https://console.groq.com/).
2. Keep each account on its free plan. Do not enable a paid Supabase plan or a paid Workers plan.
3. Create one Supabase Free project. Apply every SQL file in `supabase/migrations/` in filename order.
4. In Brevo, create an SMTP key and verify a sender. In Supabase, open **Authentication → SMTP Settings**, enable custom SMTP, and enter Brevo's SMTP host, port, username, and key. The built-in Supabase mailer is unsuitable for public onboarding.
5. Create a private Supabase Storage bucket named `lesson-assets`, set its file limit to 15 MB, and allow only PDF MIME types. Never enable public bucket access.
6. Create a Worker, set the public variables from `wrangler.toml`, and add the Worker secrets listed in `README.md`.
7. Create a Cloudflare Pages project from the built `dist/` directory. Use the free `pages.dev` address during the pilot to avoid buying a domain.
8. Configure the Pages address in Supabase's site URL and redirect allow list, and configure it as `APP_ORIGIN` in `wrangler.toml`.
9. Sign up with your administrator account, verify the email, then run the one-time administrator promotion SQL in `README.md`.

## Limits already enforced by the code

- A student may make 300 authenticated Worker requests/day. Staff and parents may make 1,000/day.
- The entire platform stops authenticated Worker actions at 90,000/day.
- Each PDF is at most 15 MB, and new uploads stop before tracked lesson PDF storage exceeds 800 MB.
- The AI tutor stops at 3 answers/student/day and 100 answers/platform/day.
- The platform administrator can open **₹0 pilot usage** to see database size, PDF storage, API requests, AI requests, account count, and student count.
- When AI reaches its limit, the stored learning product continues to work.

Cloudflare can still receive unauthenticated traffic before the application checks a user token. On the Free plan, excess Worker traffic is rejected rather than converted into an application charge, but service may be unavailable until the daily allowance resets.

## Weekly operating check

1. Open **₹0 pilot usage** in StudySphere and investigate any metric above 70%.
2. Open Supabase usage and check database size, egress, monthly active users, and email errors.
3. Open Cloudflare usage and check Worker requests. Open Supabase Storage usage and compare it with the in-app counter.
4. Open Groq limits and check requests and tokens if the tutor is enabled.
5. Export an encrypted database backup manually. Supabase Free does not include production backup guarantees.
6. Remove unused drafts and PDFs. Pause new onboarding before any provider limit is reached.

## What ₹0 means

No subscription is required for this controlled pilot when usage stays inside these limits. It does not provide an uptime guarantee or managed backups. A custom domain, SMS, paid email, paid AI capacity, or a production database plan would create costs and is intentionally excluded from this setup.

Official references: [Supabase plans](https://supabase.com/pricing), [Supabase Storage](https://supabase.com/docs/guides/storage), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Brevo Free plan](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), and [Groq rate limits](https://console.groq.com/docs/rate-limits).
