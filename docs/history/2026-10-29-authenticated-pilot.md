# Authenticated pilot rehearsal — 29 October 2026

## Outcome and scope

**Core synthetic workflows passed; real-school release remains pending.** The owner selected one active pilot school, no cash investment from founder or school, Standards 1–10, CBSE and Karnataka State Board (called KSEEB by the owner; existing catalog code `KSEAB`). Requested capacity is 1,500 simultaneously active students, not yet measured. The provisional display name is **Vidyanidhi Public School**, Dharwad, Karnataka; this is a placeholder, not a claim of an actual school partnership.

The existing database/frontend/API origins are unchanged. The three pre-existing Auth accounts and their application records were not repurposed. Nine clearly synthetic accounts were added: platform operator, two school admins, two teachers, two independent students, guardian and Standard 5 child. The child was created through the deployed guardian provisioning route. Synthetic accounts use generated local-only passwords and reserved test addresses, without sending mail. Admin-confirming these synthetic identities does not verify email delivery or alter real-user confirmation settings.

Two synthetic schools were initially authorized to prove separation. After those checks passed, the owner narrowed the active pilot to one school. The second synthetic school's enrollment was revoked, content unpublished, staff memberships removed, school deactivated and its three accounts suspended with sessions revoked where possible. Its history is retained. One active synthetic school remains. Pre-existing school records were preserved. The two-school mutating rehearsal now refuses to run against the retired fixture; its caller-token inputs were cleared. Do not recreate or reactivate it without a new owner instruction.

## Observed hosted results

| Evidence | Result | Scope and limits |
| --- | --- | --- |
| Authenticated workflow rehearsal | 25 checks passed | Actual Auth password sign-in and stored roles; student invitation email binding/reuse denial; typed labels grant no private access; verified enrollment; lessons/drafts isolated; lesson edit/unpublish; own progress/plan/map writes; quiz editing/publication/answer-column denial/Worker grading; immutable editions and saved feedback; flashcard revisions retain reviews; enrollment/staff revocation/restoration; guardian child creation, consent/stale decisions/history; single-use recovery token and synthetic password change; paused provider inventory and monitoring |
| Read-only boundary suite | 3 tests passed before fixture retirement | Four distinct verified caller identities; symmetric own-record positives/cross-student denials; two teachers' own drafts/cross-school denial; published-question positive plus exact PostgreSQL `42501` answer/explanation privilege denials |
| Single-school follow-up | 4 checks passed | One active synthetic school/retired accounts; two actual concurrent draft saves produce one success/one stale failure; competing guardian withdrawal requests commit once, restore consent and retain progress; staff/unrelated guardian cannot retrieve a learner's full personal history |
| Private PDF rehearsal | 8 checks passed after forward fix | Paused upload rejection; private bucket and stable settled inventory; real bounded upload; authorized byte/hash equality with private/no-store headers; anonymous/direct Storage/public-object denial; invalid replacement retains prior file/publication; revocation denies a new read with the existing token; re-enrollment restores access; ledger/provider agreement |

These are 37 hosted workflow checks plus three boundary tests, not a load certification or full end-to-end browser/email acceptance. The recovery test used an Admin-generated recovery token through public verification/update APIs; no email was delivered. New staff invitation email/password setup and real recovery-link redirects remain pending. Custom SMTP was visibly disabled in the dashboard. No verification protection was disabled and no paid sender was provisioned.

The PDF test retained one **2,810-byte synthetic sample**. The inventory was reviewed while empty/settled before enabling that upload. Uploads were paused again in the test's `finally` block and read back as paused. Real uploads remain unavailable pending the remaining operating/concurrency gates. PDFs already delivered cannot be remotely erased.

## Defect found and repaired

The hosted PDF review failed with SQLSTATE `21000`. Read-only provider logs showed `UPDATE requires a WHERE clause`, specifically the unqualified singleton policy update. The Authenticator role loads `safeupdate`; local PGlite does not. The ledger revision trigger had the same unqualified update.

The forward migration [20261028232250_pdf_singleton_safe_updates.sql](../../supabase/migrations/20261028232250_pdf_singleton_safe_updates.sql) adds `WHERE singleton=true` to the policy updates and explicitly selects/locks that row for review. It preserves authorization, service-only grants, existing data and the provider safeguard. Applying the definitions itself does not resume uploads. Hosted migration version: **20261028232356**, name `pdf_singleton_safe_updates`; retain this mapping alongside the earlier six migrations. Never rerun older source migrations or use an unreconciled CLI push.

A local regression verifies forward-fix preservation, review, revision changes on reservation/finalization and client denial. All 13 PDF database cases pass. The real hosted PDF rehearsal then passed under the still-enabled safeguard. An automatic approval review initially blocked an error-reproduction call that could enable uploads; read-only diagnosis and the tested forward fix resolved that condition before the successful rehearsal.

## Browser and local verification

A real student session opened the deployed subject/chapter/topic, rendered the private PDF canvas and selected the provisional school branding with the existing design. No browser console errors were observed. Auth Site URL matches the deployed origin and its same-origin redirect allow-list includes the reset route; actual email/reset-link traversal is still pending. Full local validation passed build, lint, Worker types/bundle, 119 tests and documentation checks; three hosted tests are intentionally skipped in that fresh local report after the second fixture was retired.

## Server credential cutover

A replacement server key was created by the owner after diagnostic key fragments were exposed. It was transferred privately to the existing Worker secret binding, without including its value in command arguments, source or release artifacts. Authenticated platform usage/storage and the synthetic private PDF passed four post-cutover checks; uploads stayed paused. API version is now `04fd6a03-0284-4e96-b162-4d0ad8847cdf` (deployment `c9ae12eb-42be-473b-a356-626edc14daab`). Frontend version remains the recorded release. The owner retired the old key; dashboard absence and a subsequent authenticated Worker request were verified. The publishable key was preserved. No key value belongs in this record.

## Evidence and remaining work

Restricted evidence stays under ignored `.local/pilot-auth/`: `workflow-report.json`, `single-school-report.json`, `single-school-cleanup.json`, `pdf-reviewed-inventory.json` and `pdf-workflow-report.json`. Fixture identities/passwords and approved operator credentials are in separate private files there; never include them in chat, source control or source packages. The read-only suite's historical pass is in `.local/hosted-validation/acceptance.json`. Current `pilot:check` correctly reports that boundary gate pending after its retired-fixture inputs were cleared; it must not inherit the earlier pass as a fresh result.

Remaining release gates: real invitation/recovery delivery and redirects, school approval/materials, complete CBSE/Karnataka syllabus, paginated roster/cohort requirements, real-device/accessibility/slow-network behavior, full Auth/database/private-object recovery, privacy fulfillment, provider monitoring/support ownership, storage failure/concurrency/cleanup exercises and measured 1,500-user capacity inside a verified zero-cash operating envelope. See [first-school readiness](../launch/first-school-readiness.md) and [budget limits](../operations/pilot-budget.md).
