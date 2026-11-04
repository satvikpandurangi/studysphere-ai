# Pilot and operations guide

## Launch checks

1. Use a production domain with HTTPS, working SMTP, Supabase Auth redirect URLs, and a private Supabase Storage bucket. Confirm that no server secret appears in frontend build output or browser requests.
2. On staging, exercise one parent, two students at different schools, two editors, two school administrators, and one platform administrator. Attempt direct API and Supabase requests across roles, schools, board/grade/subject boundaries, drafts, quiz answers, and private PDFs. Confirm access is denied where expected.
3. Verify Standards 1–5 can only be created by a verified parent with explicit guardian approval. Verify Standards 6–10 can self-register, while Standards 1–5 cannot. Verify a parent's withdrawal immediately removes access from the linked child.
4. Upload an ordinary PDF and a scanned PDF. Review extracted search text before publication; manually supply text for scans. Check mobile PDF and YouTube playback on school devices.
5. Publish and revise a lesson. Verify the student view updates and the old content appears in `content_revisions`. Confirm draft content does not appear to students.
6. Run a complete parent → Standard 1–5 child → lesson → quiz → parent progress journey, plus an independent Standard 6–10 registration journey. Run export and deletion requests and confirm the operator can locate and process them.
7. Have counsel review the privacy notice, guardian consent wording, school agreement, retention schedule, processor terms, cross border transfers, and child data obligations for your launch location. Obtain school content rights and review each linked video.

## Backups and recovery

For the ₹0 pilot, export an encrypted database dump to a separate restricted account every week. Export the Supabase Storage object inventory and keep the deployment configuration as well. Retain only the necessary history and test a restore to a temporary project each month. Record who can access backups and when they are deleted. Supabase Free does not provide production backup guarantees.

## Monitoring

Open **₹0 pilot usage** each school day. Check Cloudflare Worker errors, Supabase database, Storage size and egress, Brevo delivery, Groq 429 responses, and AI usage. Investigate any metric above 70%. Keep the limits in `wrangler.toml`; when AI reaches its limit, lessons and practice remain available. Review privacy requests every school day.

## ₹0 capacity assumption

The 50–100 student pilot can operate without a subscription when usage stays within the application limits and provider allowances. Supabase Free supplies the database, authentication, and private file storage; verify its current dashboard allowances before onboarding. Workers Free serves the secure API and static frontend. The app stops authenticated API traffic at 90,000/day to leave a buffer, stops PDF uploads at 800 MB, and limits AI to 100 answers/day. Groq limits depend on the organization and model.

The planning table assumes 40% of monthly users study on a typical day, one requested AI answer per active student per day, about 1,500 tokens per answer, roughly 0.4 MB of database data per registered user, 5 MB of shared PDF storage per registered user, and 0.03 GB of PDF viewing transfer per user per month. These are estimates to check against real pilot metrics.

| Monthly users | Estimated database | Shared PDFs | PDF viewing transfer / month | Requested AI / day | Free tier implication |
| ---: | ---: | ---: | ---: | ---: | --- |
| 100 | 40 MB plus curriculum | 0.5 GB | 3 GB | 40 | Target ₹0 pilot; monitor egress and storage weekly |
| 1,000 | 400 MB plus curriculum | 4 GB | 50 GB | 400 | Paid storage and database capacity will likely be required |
| 5,000 | 2 GB plus curriculum | 20 GB | 250 GB | Paid database, storage, and AI capacity required |

At 1,000 users, the application's default platform AI allowance is only 100 requests/day, so roughly 300 requested answers/day would be deferred under these assumptions. Core lessons, quizzes, videos, flashcards, and plans keep working. Groq limits vary by organization and model, so the console is authoritative. Move to paid capacity only after measured pilot usage and a separate approval. Verify current allowances at launch: [Supabase](https://supabase.com/pricing), [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Brevo](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), and [Groq limits](https://console.groq.com/docs/rate-limits).

## Incident response

If credentials leak, rotate Worker secrets and database keys, revoke affected sessions, review audit and provider logs, and notify affected schools as required by the applicable agreements and law. If a school reports wrong content, unpublish it immediately, preserve the revision and audit trail, and communicate the correction. If an AI answer is wrong, direct the learner to the cited source and teacher, and review the grounding excerpt before changing the prompt or content.
