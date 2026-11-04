# Decisions and open questions

## Accepted baseline

| Decision | Rationale and consequence |
| --- | --- |
| Clean rebuild | User authorized a clean build; no imported Firebase migration is established |
| Data-first learning | Staff material and persistent progress remain useful without AI |
| Supabase + Cloudflare Worker | Existing identity/data/API architecture retained |
| Supabase private PDF storage | Replaced R2 after the user declined card details; no active R2 dependency |
| Standard 1–5 guardian / 6–10 independent accounts | User's accepted policy, implemented in current source |
| Typed school names without approval queue | User's explicit onboarding change; school name is not affiliation proof |
| Root project, dedicated docs and archives | Commands run from one root; historical/runtime material does not mix with active source |
| Broader education scope | User added public learners, schools, colleges and Standard 11–12 / PUC 1–2 |
| Free first-school partnership — 29 October 2026 | Owner superseded first-customer funding: neither school nor founder pays initially. Target 1,500 simultaneously active Standards 1–10 students with CBSE and Karnataka State Board (KSEEB). Capacity, syllabus and email arrangements need evidence; no paid provisioning. See [release gates](../launch/first-school-readiness.md). |
| Institution-funded launch — 22 October 2026 | Owner selected private customized delivery using an institution's materials, funded by that institution; public enrollment/subscriptions deferred, core learning independent of AI. See [delivery direction](../product/institutional-launch.md). No deployment model or paid service selected. |
| Verified student enrollment — 22 October 2026 | Explicit email-bound invitations separate private access from typed school labels. Preserve existing account/guardian policy and progress; no trust backfill. Minimal roster avoids exposing unscoped cross-institution history. First implementation is locally verified; see [enrollment design and rollout](enrollment.md). |
| Web first; preserve design — 22 October 2026 | Build on the responsive existing frontend/shared UI. PWA installation follows core flows; native Android/iOS/desktop apps are deferred pending funded requirements. |
| Assessment editions — 22 October 2026 | Freeze content once published, create revised drafts with new IDs, atomically replace publication and snapshot new results. Protect old attempts/reviews instead of editing their question identities. See [assessment contracts and tradeoffs](assessments.md). Local tests pass; hosted concurrency/rollout remain pending. |

## Proposed, not yet implemented

Separate organization identity, memberships, verified enrollment and content entitlements. Represent higher-secondary stage/year with board-specific Standard/PUC labels and configurable streams. Represent colleges through programs/courses/terms rather than extending school grades indefinitely.

## Open owner decisions

- First institution/cohort, curriculum, required customization and acceptance evidence.
- Higher-secondary/college account policy and guardian expectations.
- Institution enrollment proof and who administers it.
- Institution setup/operating budget, seat limits, payment administration, renewal/exit and handover; public plans deferred.
- Shared versus dedicated deployment and provider-account ownership; reusable codebase/configuration is recommended, not implemented tenant provisioning.
- Support owner/contact, operational roles, approved policies and retention schedule.
- Measured 1,500-concurrent capacity within the first partnership's zero-cash constraint; existing pilot limits unchanged.

Record future material decisions here with date, status, alternatives and migration consequences. A planned item must not become an implementation claim merely by appearing in this document.
