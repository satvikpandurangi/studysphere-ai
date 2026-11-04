# Changelog

## 4 November 2026 — accept recovery and verify school workflows

- Owner confirmed Inbox delivery, successful password change and the intended parent sign-in/Settings identity. The original saved password is rejected and the parent role is unchanged; the new password was not collected. All four approved emails are used.
- Passed 17 live one-school API/workflow checks, 14 deployed Chromium workflow checks and four role-screen smoke checks. Browser coverage includes teacher publishing/revisions, saved learner results, flashcards, guardian withdrawal/restoration, private PDF rendering, enrollment invitation/revocation/rejoin and staff removal/restoration, plus 390px student/admin and recovery guards.
- Final provider state confirms student/staff access restored, guardian approval restored and storage unchanged with uploads paused. Local test-harness scope/textarea-selector errors were corrected and their original evidence retained; no product source fix or new deployment was required. Actual school materials, real-device coverage, new-staff email setup and 1,500-user capacity remain open. See [dated evidence](2026-11-04-recovery-and-school-pilot.md).

## 4 November 2026 — publish gated password recovery

- Published frontend `cfd8eab0-fb9e-4dc3-b9f4-35261050cfb8` after renewed Cloudflare authorization. The production entry exactly matches the tested bundle; login, verification and reset routes return HTTP 200. The preceding version is `ed08ffd3-59da-4f37-84ae-0546863445bb`.
- Fresh checks passed: 148 local tests, build, lint, Worker type/bundle checks, documentation and deployment dry run. Three hosted boundary tests remain skipped because the retired second-school inputs are cleared. Existing student/new-parent sign-in, role and school-entitlement checks passed again.
- The owner reported the separate recovery template saved. The final fourth approved email was accepted by Supabase at approximately 05:40 IST; read-only provider checks confirmed the intended earlier parent role and advanced recovery dispatch timestamp. All 4/4 messages are used. The owner subsequently confirmed Inbox delivery and correct parent reset/sign-in; the controlled school follow-up is recorded above. No API/schema or paid-resource change.

## 4 November 2026 — restore workspace access after the drive move

- Confirmed the application is present under `G:\Codex`, and restored access through the previous `C:` project paths using directory junctions. Existing source and local credentials were preserved; no provider settings, deployments or emails were changed during this repair.
- Rechecked the moved StudySphere application: 148 tests passed, three live RLS tests skipped; build, lint, Worker type checking and documentation links passed. These checks do not establish production recovery-email acceptance or readiness of the other Codex projects.
- Checked all 249,410 archived files and recovered 2,257 missing files without overwriting existing files; preserved 112 entries already available via extended-length paths. No unexpected missing or changed files remained. Preserved the previous generated frontend build separately from the rebuilt output. The cross-project recovery evidence is local in `G:\Codex\.migration-recovery`. See [workspace location](../development/getting-started.md#workspace-location-after-the-drive-move).

## 2 November 2026 — recovery acceptance defect and repair

- Real recovery mail arrived in Spam and its link returned otp_expired. The old reset form still accepted a password attempt without a recovery session, producing Auth session missing. Full recovery remains unaccepted.
- Added recovery-only fragment/code verification, password-form gating, isolated account-bound recovery sessions and safe expired guidance. Reproduced and repaired legacy-session re-adoption and delayed-response races; new callbacks clear prior targets. Prepared a separate recovery email template. Publication and a newly authorized replacement email remain pending.


## 2 November 2026 — explicit link-first confirmation

- Added bounded fragment parsing, credential cleanup, explicit single-flight verification and six-digit fallback in the existing design. Suppressed SDK automatic session detection for custom confirmation URLs and rejected mixed payloads; ordinary recovery callbacks remain supported.
- After explicit approval for one new synthetic parent and up to four emails, Auth accepted the first two signup/resend requests at approximately 02:10 IST; manual inbox/link checks remain in progress.
- Passed 144 local tests, build/lint/Worker/docs and deployment dry run; published frontend ed08ffd3-59da-4f37-84ae-0546863445bb and verified exact hosted bundle/routes before saving/reloading the link-plus-code template. No database/API change or extra test email sent; real link/recovery inbox acceptance remains pending.


## 30 October 2026 — align provider and frontend code length

- Owner inbox evidence and read-only provider settings confirmed an eight-digit email code reached a six-digit form. The owner selected six digits; retained six-digit frontend behavior and centralized typing/paste, pattern and validation limits with leading-zero regression coverage. An intermediate eight-digit change was not deployed.
- Saved neutral complete-code email guidance, then applied the explicitly approved provider OTP length 6 and confirmed it after reload. Exactly one approved fresh parent email was accepted and provider-reported Delivered at 00:58 IST. The owner reached the parent dashboard; provider-backed checks confirmed email confirmation, successful sign-in, parent role and no automatic institution entitlement. Student verification remains pending; expiry, confirmation and rate limits were not changed.

## 30 October 2026 — parent confirmation-link diagnosis and code entry

- Confirmed the reported parent link error did not verify the account. Added six-digit code entry through the public Auth verifier, explicit expired-code guidance and an email-first resend control; confirmation stays required.
- Passed 134 local tests plus build/lint/Worker/docs and deployment dry run, then published the explicitly approved frontend version `fb058781-9a26-42ec-8ebf-01fc9f07b887`. Live routes and exact bundle/production API checks passed; workspace/navigation fixes are included. No API or database deployment.
- Saved and reloaded the approved code-only template after frontend publication; exactly one additional parent code email was accepted and provider-reported Delivered at 00:46 IST. Manual inbox/code/dashboard acceptance remains pending. See [rollout status](../operations/email-delivery.md).

## 30 October 2026 — fresh confirmation-link rerun

- Rechecked both approved synthetic accounts, requested two fresh confirmation emails within the six-message approval and verified the running local frontend/API. Inbox confirmation and dashboard results remain pending.
- Scoped the operator's verification-session cleanup to its current session so read/check runs do not sign the user out of the browser.

## 29 October 2026 — automatic school identity and workspace detail audit

- Removed user-controlled workspace branding and applied a sole verified school automatically; simplified sole-school settings, usage, roster and assessment scope without changing access entitlements.
- Cleaned teacher navigation/direct routes, role labels, branding guidance and sign-out feedback; repaired mobile menu keyboard focus and two mixed-encoding privacy pages. Removed idle branding polling.
- Added role/identity regression checks and passed seven fresh one-school live lesson/quiz/history/flashcard/guardian checks. Two explicitly approved new signup accounts reject unverified sign-in; four bounded signup/resend emails requested, link confirmation pending. See the [audit and remaining gates](2026-10-29-workspace-audit.md).

## 29 October 2026 — Brevo SMTP recovery delivery

- Verified the owner-saved SMTP connection and the exact local verification/recovery callbacks, preserving the hosted Site URL and email confirmation.
- After explicit approval for one recovery message, confirmed Auth acceptance, the updated recovery timestamp, Brevo's Delivered event and the owner's inbox receipt at approximately 17:57 IST. No password change, second test message, paid plan or real-student import was performed.
- Recorded the bounded result and remaining signup, reset/resend, domain and school-volume gates in the [email delivery guide](../operations/email-delivery.md). SMTP keys and recovery tokens remain outside chat and source packages.

## 29 October 2026 — verification screen polish

- Tightened the verification screen hierarchy, field guidance, resend spacing, secondary sign-in action and help footer using the existing authentication colors and controls.
- Reduced the verification-only mobile banner height and kept long feedback readable. Associated email guidance with its field and stopped the resend countdown from announcing every second to screen readers. Authentication behavior is unchanged; this UI adjustment is local.

## 29 October 2026 — email verification routing

- Added the dedicated verification screen after signup and unconfirmed-email sign-in, confirmed-session dashboard routing, resend controls, local cooldown and expired-link recovery while retaining the existing authentication layout. Passwords are cleared before navigation; no public account-existence lookup or automatic verification was added.
- Corrected misleading delivery feedback: generic signup/resend success does not prove that a new confirmation was sent. The reported account was already confirmed; no existing account data or credentials were changed.
- Added focused routing/error tests and documented exact callback configuration and outstanding custom SMTP/inbox acceptance. This is a local frontend change; hosted email delivery is not certified.

## 29 October 2026 — curriculum sources and completeness gate

- Recorded the owner's complete 2026–27 English-medium Standards 1–10 CBSE/Karnataka requirement, including prescribed language subjects and all applicable chapters/topics; exact language courses remain undecided.
- Downloaded four publisher editions unchanged (154,640,586 bytes) locally, verified embedded CC BY 4.0 notices for three adaptable EPUBs (121,848,792 bytes), and prepared three credited reference excerpts. Quarantined the PDF after visual review revealed CC BY-NC 4.0 instead of its catalog label; excluded it from product use. No proprietary EdTech or NCERT textbook copied into the product.
- Authored forty functional concept fixtures, generating 80 board/grade/subject test units, 320 content items, 80 quizzes/240 questions and 160 cards locally. These are samples, not a complete syllabus.
- Indexed 133 official CBSE IX–X syllabus links, collected eight syllabus-reference PDFs (107 pages) locally, and added a completeness gate that rejects missing inventories and fixture-only coverage. Current full acceptance: 0/20 cells; imports held, PDFs paused, no hosted data changes.
- Documented publisher permissions, unreachable official catalog sources, tooling and outstanding curriculum evidence in the [source register](../operations/curriculum-content.md).

## 29 October 2026 — authenticated pilot and one-school scope

- Passed 25 live synthetic workflow checks, three hosted boundary tests, four one-school follow-ups (including real concurrent draft/consent conflicts) and eight private-PDF checks. Real email delivery and 1,500-user capacity remain unverified. See [evidence](2026-10-29-authenticated-pilot.md).
- Retired the second synthetic school and suspended its three test accounts at the owner's request; one provisional workspace remains: **Vidyanidhi Public School**, Dharwad, Karnataka. No original accounts were repurposed.
- Applied `pdf_singleton_safe_updates` as a forward migration after hosted `safeupdate` rejected unqualified singleton updates. Preserved guards/grants/data, added regression coverage, reviewed settled inventory and tested the real PDF transport; uploads paused again afterward.
- Confirmed Karnataka State Board selection (existing catalog code `KSEAB`), Free Supabase limits and disabled custom SMTP. Added zero-cash capacity arithmetic and realistic release gates; no paid services or AI enabled.

## 29 October 2026 — free first-school requirements

- Recorded the owner's free first-school partnership with no founder investment, Standards 1–10 CBSE/State-board target and explicit **1,500 simultaneous active users** requirement. Karnataka State Board is selected; an email/domain delivery arrangement remains open.
- Added release gates for authenticated journeys, isolation, preserved history, private files, realistic load, curriculum/device readiness and recovery. Deployment/local tests do not certify this capacity or a bug-free service.
- Supabase organization inspected as Free; PDF uploads remain paused. No paid resources or real-student imports authorized by this scope change.

## 2026-10-29 — live application release and Cloudflare integration verification

- Confirmed the compatible API upload had completed and published the prepared frontend to the existing StudySphere origin with SPA fallback. Retained existing compatibility dates, secret binding and platform design; explicitly disabled frontend preview URLs to preserve the previous setting.
- Verified seven live routes, all 96 frontend file hashes, API health/origin/preflight/anonymous rejection and the browser's protected-page login redirect. Fresh builds, lint, Worker types and 118 local tests passed; three synthetic authenticated cases remain skipped.
- Confirmed the requested 19 Cloudflare skills and authenticated MCP server are installed and usable; unrelated Codex settings are preserved. No paid provisioning or private record mutation was performed.
- Updated capability, deployment, staging and operating evidence while retaining authenticated tenant/provider tests, PDF inventory approval and full pilot acceptance as open work. See [release record](2026-10-29-cloudflare-release.md).


## 2026-10-23 — reproducible application release preparation

- Added a frontend-only Cloudflare static hosting config with SPA fallback and `app:dev`, `app:check`, `app:deploy` scripts; included the config in source packaging. Existing design and API hosting remain unchanged.
- Verified frontend/API builds, lint, Worker types, all 118 local tests and both deployment dry runs. Local Cloudflare runtimes passed seven SPA navigations, compiled asset loading and four API health/origin/authentication checks; private credentials/account IDs were absent from release output.
- Prepared Cloudflare device sign-in, which expired without authorization; publication and authenticated acceptance remain pending. See [release evidence](2026-10-23-application-release.md).


## 2026-10-23 — hosted application recovery and six database upgrades

- Used the connected Supabase integration and owner-approved private export to recover 31 application tables / 152 rows locally with FK validation and matching live fingerprints; full Auth/provider recovery remains separate.
- Applied the six reviewed forward migrations without rerunning the initial schema. Post-upgrade checks preserved all original application values, kept verified enrollments empty and left PDF uploads paused.
- Confirmed live quiz-key/table/RPC grants, public-table RLS and four anonymous PostgREST permission denials. Recorded generated hosted versions, remaining advisor notices and the CLI history-reconciliation requirement.
- No frontend/API deployment or synthetic user provisioning performed; Cloudflare is unauthenticated and authenticated pilot acceptance remains pending. See [rollout evidence](2026-10-23-hosted-upgrade.md).


## 2026-10-23 — practice hints and connection diagnosis

- Added ordered teacher hint authoring with add/edit/reorder/remove controls and Markdown previews, using existing Content studio components and revision storage.
- Load existing hints, include edited hints on save and clear them for new items. Explained that learner practice working is temporary, unsubmitted and ungraded; persisted working remains open.
- Added a PostgreSQL case proving ordered hint storage, old revision preservation and student/staff boundaries. All 118 local cases pass; three hosted cases remain skipped for missing fixtures. Build, lint, Worker types and documentation checks pass; synthetic browser hint controls were exercised.
- Corrected private PostgreSQL tooling to use Supabase's database CA with full verification. The documented alternate pooler now reaches verified TLS but rejects the supplied password; session connections still time out. No hosted upgrades, password resets or data writes were performed.


## 2026-10-23 — hosted baseline inspection and upgrade rehearsal

- Inspected the selected project's actual schema and aggregate data through signed-in, read-only dashboard SQL; identified six pending upgrades rather than assuming an empty database from missing migration tracking.
- Rehearsed the upgrades locally using observed application functions and synthetic existing accounts/map data; records were preserved and PDF uploads remained paused.
- Prepared private migration checksums and backup tooling. Native PostgreSQL connectivity failed before authentication, leaving the backup/hosted-upgrade gate open. No hosted schema, account or object writes were made. See [audit evidence](2026-10-23-hosted-schema-audit.md).

## 2026-10-23 — hosted staging preparation and reliable evidence gates

- Added a dedicated read-only hosted runner, ignored environment-file loading, blank template and staging fixture/rollout guide.
- Strengthened the three hosted cases with verified identities, two student/editor positive controls, symmetric isolation and exact answer-column privilege denial. Nine inputs are now required.
- Added three local evidence-gate cases; hosted execution remains pending target/credentials. Historical endpoint checks found frontend login 404, API health 200 and configured Supabase DNS resolution failure; no deployment or remote data mutation was performed. See [staging readiness evidence](2026-10-23-staging-readiness.md).

## 2026-10-23 — atomic guardian consent and access restoration

- Replaced separate guardian/student/audit updates with a caller-authorized transaction, student-wide consent version, stale-decision rejection and guards against legacy split writes.
- Preserved Standard 1–5 / Standard 6–10 account policy, saved learning records and enrollment state; restored consent does not restore revoked school access.
- Updated My children request/feedback/reload behavior using the existing design. Added thirteen PostgreSQL and four Worker cases; current local suite totals 114 cases plus three credential-dependent hosted cases.
- Hosted rollout/concurrency/provider acceptance remains pending. See [implementation evidence](2026-10-22-guardian-consent.md) and [consent rollout](../architecture/guardian-consent.md).

## 2026-10-22 — PDF limits, storage reservations and cleanup

- Aligned effective PDF file limits, added bounded streaming and locked reservations that count full replacement overlap, pending/uncertain writes and queued/held objects.
- Added permission/version rechecks, safe draft attachment, conditional metadata publication, preserved old files/text on failed replacement, explicit detachment and retryable confirmed cleanup.
- Added mandatory paused inventory cutover, service-only guarded reconciliation and a read-only paginated provider inventory command. Unknown files are held rather than automatically deleted.
- Added 29 local tests across SQL, Worker, publishing and inventory; full local suite is 97 tests plus three credential-dependent hosted cases. No hosted migration/deployment/provider cleanup performed. See [implementation evidence](2026-10-22-pdf-storage.md) and [rollout guide](../architecture/pdf-storage.md).

## 2026-10-22 — account controls, scoped usage and pilot validation

- Added shared student/parent/staff Settings, recovery/global sign-out controls and verified self/guardian privacy request/status flows with duplicate prevention.
- Added transactional platform review, deletion dependency preflight, attribution nulling that preserves institution content/audits, and a guardian deletion guard. Fulfillment remains manual; retained snapshot/invitation/log/backup handling requires approved policy.
- Added school-admin aggregate usage and exact platform monitoring, including inspection at exhausted Worker quota and corrected planning/counter labels.
- Added eleven PostgreSQL cases, five Worker cases and `npm run pilot:check` with an explicit hosted/manual acceptance ledger. No hosted migration, deployment, paid provisioning or real account deletion performed. See [implementation evidence](2026-10-22-account-operations.md).

## 2026-10-22 — institution branding and contact settings

- Added institution display name, uploaded raster logo, primary/accent colors and support details with preview/save/reset, preserving shared design/layout patterns.
- Added explicit member-scoped sidebar branding selection; selection grants no content access and does not change canonical school names or academic profiles.
- Added a forward migration with private configuration storage, authorized RPCs, validation, optimistic versions and audit events.
- Added nine PostgreSQL permission/migration cases and four branding-helper cases, including version-based in-memory logo reuse; full local suite now has 52 cases plus three credential-dependent hosted staging cases.
- No hosted migration or deployment performed. See [implementation evidence](2026-10-22-branding.md) and [setup/rollout guide](../architecture/branding.md).

## 2026-10-22 — assessment editing, publication and preserved results

- Completed school/topic assessment lists, draft editing, publication/unpublication and revised immutable quiz/card editions using the existing design.
- Added transactional caller-authorized grading with saved title/edition/count/feedback snapshots, learner result history and safer loading/submission states.
- Preserved old question/attempt/card-review identities through a forward migration; failed/stale publications do not silently replace current work.
- Added twelve PostgreSQL assessment cases and four Worker cases. Full local suite: 39 passed, three hosted staging cases skipped.
- Updated operating/API/schema guides and capability status; no hosted migration or deployment performed. See [implementation evidence](2026-10-22-assessments.md).

## 2026-10-22 — verified student enrollment, first coding slice

- Added separate school/student enrollments and email-bound, hashed, expiring one-use invitation codes through an incremental migration.
- Added administrator roster/invite/cancel/revoke controls and student/guardian acceptance, reusing the existing platform design.
- Added staff roster and school-specific access removal/restoration for existing verified staff; preserved other memberships.
- Replaced typed-school private access with verified enrollment; preserved accounts/progress and restricted unscoped student-history exposure to staff.
- Changed private PDF responses/viewer requests to no-store and corrected school summary counts to use verified enrollments.
- Updated the pilot privacy summary for enrollment/roster data, actual PDF storage and current account-control availability; unchanged visual design.
- Added 15 local PostgreSQL access/migration cases and two private-PDF boundary tests. Local suite: 23 passed, 3 hosted staging cases skipped; build/lint/Worker checks passed.
- Recorded [implementation evidence and remaining limits](2026-10-22-enrollment.md) and [migration cutover instructions](../architecture/enrollment.md). No hosted migration or deployment performed.

## 2026-10-22 — institution-funded launch direction

- Recorded the owner's decision to prioritize a funded private workspace for a specific school/institution, with its identity and approved materials.
- Deferred public enrollment and individual subscriptions; retained planned PUC/college scope for actual customer requirements.
- Reprioritized roadmap and acceptance around verified institutional access, complete core learning workflows, customer-funded operation and optional budgeted AI.
- Replaced the earlier zero-cost business assumption in current guidance while preserving configured limits and historical evidence.
- Added [institutional delivery guidance](../product/institutional-launch.md); no application code, schema, service account, paid provisioning or deployment changed. Validation: `npm run docs:check`; runtime checks are not required for this documentation-only decision.

## 2026-10-22 — SaaS scope and repository organization

- Expanded documented audience to individual/public learners, families, schools, higher-secondary/PUC institutions and colleges.
- Included Standards 11–12 / PUC 1–2 as planned capabilities with configurable streams/subjects and board-specific labels.
- Promoted the application from `outputs/studysphere-ai/` to the workspace root; retained existing source-relative paths and application behavior.
- Centralized maintained documentation under `docs/` and preserved original guides/review as historical evidence.
- Separated legacy edit scripts, local runtime state and prior release packages from active source.
- Added maintained source packaging, local-document link validation and explicit Worker bundle commands.
- Updated ignore/lint exclusions for runtime/artifact folders.
- Feature defects remain in the roadmap; this change does not deploy services or migrate data.

Verification evidence for this change is in [the organization record](2026-10-22-organization.md).

## 2026-09-22 through 2026-09-25 — historical baseline

Clean school SaaS build, revised account policy, controlled pilot limits, Supabase Storage migration, typed school signup and recorded Cloudflare deployment. See the [dated review](2026-10-22-project-review.md) for evidence and limits.
