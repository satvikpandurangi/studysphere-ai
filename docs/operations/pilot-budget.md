# Pilot limits and capacity planning

Current owner constraint, 29 October 2026: the first-school partnership is free, with no money available from either school or founder. Requested capacity is **1,500 simultaneously active students**, Standards 1–10, CBSE and Karnataka State Board (KSEEB). This supersedes the first-customer funding prerequisite from 22 October. Existing configuration is unchanged. These are **configured application limits**, not provider allowances or proof of usable capacity. Follow the [release gates](../launch/first-school-readiness.md).

Do not provision paid services, enter card details, raise billing limits or enable paid AI. Core delivery must work without AI. Account ownership, deployment model, monitoring, support and handover remain to be scoped. Any later paid arrangement requires a new owner decision; this document authorizes no spending.

| Setting | Current value |
| --- | ---: |
| `PDF_MAX_BYTES` | 15,000,000 |
| `STORAGE_LIMIT_BYTES` | 800,000,000 |
| `API_STUDENT_DAILY_LIMIT` | 300 |
| `API_OTHER_DAILY_LIMIT` | 1,000 |
| `API_PLATFORM_DAILY_LIMIT` | 90,000 |
| `AI_STUDENT_DAILY_LIMIT` | 3 |
| `AI_SCHOOL_DAILY_LIMIT` | 100 |
| `AI_PLATFORM_DAILY_LIMIT` | 100 |
| Displayed database planning ceiling | 500,000,000 bytes |

The PDF ledger reserves capacity before managed uploads and counts active, reserved/uncertain, held and queued-cleanup bytes, including full replacement overlap. Initial provider inventory review is mandatory before uploads resume; old/out-of-band orphan files cannot be inferred from content metadata alone. Browser, Worker and database file limits now agree, with stricter configured caps honored. See the [storage protocol](../architecture/pdf-storage.md). The database planning ceiling is displayed, not enforced against every write. API counters exclude direct Supabase requests, static traffic and authenticated platform monitoring reads. `ZERO_COST_MODE` is a mode indicator, not a provider billing switch.

## Verified provider constraints — 29 October 2026

The connected Supabase organization reports `plan=free`; the selected project is healthy. Before synthetic setup the database occupied 13,470,867 bytes, with three existing Auth accounts, no staff memberships, no lesson rows and no private objects; uploads were paused. This is a baseline observation, not a future storage forecast. Cloudflare paid/free account entitlement has not yet been confirmed; the public Free limits below are a conservative planning constraint, not a billing-account attestation.

| Service | Published allowance or constraint | Consequence |
| --- | --- | --- |
| Supabase Free | 50,000 monthly active users; 500 MB database, shared CPU and 500 MB RAM; 1 GB files | MAU is not a simultaneous-session or throughput guarantee. Measure queries, history/index growth and peak workload. |
| Supabase Free egress | 5 GB uncached plus a separate 5 GB cached monthly allowance | Private Worker-proxied PDFs must be budgeted conservatively as uncached unless measured otherwise. Database/Auth traffic also consumes egress. |
| Supabase default email | Team-address restrictions, low project email limit, no delivery/uptime SLA; custom SMTP required for real users | Invitation, verification and recovery delivery remain blocked until an available sender/domain service and its limits are verified. Do not disable verification. |
| Cloudflare Workers Free | 100,000 dynamic requests/day and 10 ms CPU per invocation; static asset requests free/unlimited | Current app API cap is 90,000/day across the platform, excluding static and direct Supabase calls. Synchronized load and per-call CPU remain untested. |

Sources checked: [Supabase pricing](https://supabase.com/pricing), [egress accounting](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [SMTP production restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/). Recheck before release; free allowances and terms can change.

## Workload arithmetic, not a load-test result

Use decimal MB/GB below. These examples show why enrollment counts alone cannot establish affordability:

| Explicit assumed workload | Calculation | Planning implication |
| --- | --- | --- |
| One 5 MB private PDF opened once by 1,500 students | 5,000,000 × 1,500 = 7.5 GB | Above the 5 GB uncached monthly allowance before other traffic. |
| One 1 MB private PDF/student/day for 20 days | 1,000,000 × 1,500 × 20 = 30 GB/month | File reuse reduces stored copies, not the bytes delivered to learners. |
| 60 Worker calls/student/day | 60 × 1,500 = 90,000/day | Consumes the entire configured platform allowance before staff, retries and other users. |
| One dynamic request every 30 seconds during a one-hour class | 1,500 × 120 = 180,000 requests | Exceeds both the app cap and Workers Free daily dynamic limit if every request hits the Worker. Direct database requests still load Supabase separately. |
| One quiz attempt/student/day for 20 days | 30,000 stored attempts/month | Measure actual snapshot, row and index bytes; do not assume an arbitrary per-student storage figure. |

No free-tier production approval for 1,500 concurrent users is currently established. First measure realistic sessions and peak grading/sign-in bursts, then optimize within the zero-cash envelope or agree a revised workload/support arrangement. Never public-cache restricted files to evade costs: new private reads must still honor enrollment and revocation. Content already delivered cannot be erased remotely. Avoid client polling and repeated large downloads; compression and efficient queries need validation rather than assumed savings.

Published assessment editions and quiz feedback snapshots add persistent database storage. Measure actual attempts, question/feedback sizes and revision counts rather than relying on the illustrative per-learner estimate above. Direct authenticated assessment/enrollment RPCs are outside Worker-only API counters; no AI is used by their ordinary learning flows.

## Implemented monitoring

Platform **Pilot usage** now refreshes measured database size, tracked PDF totals, UTC API/AI reservation counters and privacy backlog through exact SQL aggregates. AI reservations use the platform daily row; token totals sum remaining recorded student usage and can exclude failed/unrecorded/deleted usage. The platform-only monitoring read bypasses its own Worker quota reservation, allowing inspection when the quota is exhausted. It remains authenticated and platform-authorized. No provider cost, egress or all-request counter is inferred from these metrics.

School administrators receive only their institution's aggregate verified enrollment, staff, content/assessment and tracked PDF totals. Shared API/AI usage is not assigned to a school or used as an invoice. Settings/privacy requests, branding and other direct database actions are outside the Worker quota. Dashboards refresh manually rather than polling. See [account/usage contracts](../architecture/account-operations.md); provider reconciliation and zero-cash limits remain part of [pilot acceptance](../launch/pilot-acceptance.md).
