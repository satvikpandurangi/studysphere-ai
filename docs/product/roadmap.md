# Development roadmap

This is the ordered working backlog after the owner's [institution-first decision](institutional-launch.md), revised on 29 October 2026 to a free first-school partnership with no founder investment. It is not a delivery-date commitment. Target Standards 1–10, CBSE and Karnataka State Board (KSEEB), and 1,500 simultaneously active students; capacity is not yet proven. Follow the [first-school release gates](../launch/first-school-readiness.md). Public enrollment and individual subscriptions are deferred. The first verified-enrollment slice is implemented locally; hosted acceptance remains open.

## Milestone 0 — repository baseline

- [x] Move the application to the workspace root and separate active code, docs, historical material and local tooling.
- [x] Preserve original guides, scripts and release archives.
- [x] Record individual, school, Standard 11–12 / PUC 1–2 and college scope.
- [x] Add maintained documentation, link checking and reproducible source packaging.
- [ ] Establish version control and the desired remote/CI workflow; no repository history is invented by this reorganization.

## Milestone 1 — scope the first institution and close pilot defects

- [ ] Identify the institution, education stage, initial cohort/subjects, approved materials and minimum teacher/learner workflows.
- [ ] Agree customization, acceptance evidence, deployment/account ownership, setup funding, ongoing budget and support responsibility before paid provisioning.
- [ ] Define core delivery without AI; require an explicitly funded allowance for optional AI.

- [x] Add shared student/staff/parent Settings, recovery/global sign-out and verified self/guardian privacy requests/status; locally tested.
- [x] Test deletion dependency handling with attribution nulling, retained institution content/audit records and a guardian deletion guard; no automatic deletion.
- [ ] Rehearse hosted Auth deletion/export and approve retained snapshot/invitation/log/backup handling; attribution nulling is not complete anonymization.
- [x] Align PDF limits, add bounded uploads, locked reservations including replacement overlap, guarded attachment/cleanup and read-only inventory/reconciliation tooling; locally tested.
- [ ] Stop legacy upload writers, apply the PDF migration, reconcile provider inventory and verify actual concurrent uploads/failures in hosted staging before resuming uploads.
- [x] Make guardian consent updates atomic with stale-decision checks; verify local withdrawal/restoration and history preservation without changing the existing account policy.
- [x] Verify bounded hosted guardian consent, competing requests, protected reads and deployed withdrawal/restoration UI using the existing single-school synthetic accounts. Child provisioning recovery and real users remain separate.
- [x] Finish school/topic quiz/flashcard lists, draft editing and publish/unpublish flows while retaining the existing design.
- [x] Preserve historical questions/results/reviews through immutable published editions and saved grading snapshots; test local access and conflict cases.
- [ ] Verify assessment migrations, PostgREST/Worker grading and concurrent editing/publication in hosted staging.
- [x] Add ordered problem-hint authoring, Markdown previews and explicit temporary-working/no-grading guidance; locally verified. Persisted practice working/feedback remains future work.
- [ ] Verify staff invitation/password setup and parent consent flows.
- [ ] Run staging RLS tests and extend meaningful tests for publishing, grading, onboarding and quotas.

## Milestone 2 — design verified institutional access

- [x] Document the first migration-compatible school enrollment/access model and cutover without verifying typed labels automatically.
- [ ] Extend the model to institution-managed cohorts and academic entitlements as required by the first school.
- [ ] Preserve existing users/progress; avoid making future public enrollment require invented school records.
- [ ] Scope the academic model to the pilot cohort; design higher-secondary/college account policies before supporting those stages.
- [x] Separate verified student enrollment from a typed institution name through invitations and explicit revocation.
- [x] Test the forward migration, enrollment access and negative cases in local PostgreSQL.
- [ ] Verify Auth, Storage, grading/search and revocation in hosted staging, including migration of legitimate users through invitations.

Do not implement this by merely extending `grade <= 10` to `grade <= 12`. The enrollment and curriculum relationships need a coherent design first.

## Milestone 3 — deliver the institution's workspace

- [x] Add reusable institution branding/contact settings, preview/save/reset and automatic verified-school identity while preserving the existing design; locally tested.
- [ ] Verify branding migration, hosted permissions, support links and target-device rendering in staging.
- [ ] Add agreed material/feature configuration; select shared or dedicated deployment from actual requirements, without permanent customer forks as the default.
- [ ] Complete institution setup, verified roster/cohort access, staff lifecycle and revocation.
- [x] Add student enrollment roster, expiring email-bound invitations, student/guardian acceptance and revocation while preserving the existing design.
- [x] Add staff roster, school-specific removal and restoration of existing verified staff accounts, preserving other memberships.
- [ ] Add cohort assignment and server-side roster pagination; verify existing staff email invitation/password setup live.
- [ ] Approved content library, search/filter improvements and accessible content viewing.
- [x] Prepare bounded licensed-reference downloads, independently authored functional fixtures and a fail-closed curriculum coverage report; no hosted import or complete-syllabus claim.
- [ ] Audit every 2026–27 English-medium CBSE/Karnataka Standard 1–10 subject, prescribed language, chapter/topic/activity and current edition; confirm reuse rights and teacher acceptance before import. See [coverage/source status](../operations/curriculum-content.md).
- [ ] Select and deliver an actionable teacher-to-learner workflow beyond publication/activity counts; validate the need before adding research candidates.
- [ ] Verify lessons, practice, planning and saved progress when AI is disabled/unavailable; implement funded AI controls only if included.
- [ ] Parent planning if retained in the agreed launch scope.
- [ ] Add PWA installation after core web workflows; native Android/iOS/desktop applications require a funded customer need.

## Milestone 4 — free first-school acceptance and operation

- [x] Deploy link-first signup/recovery and accept controlled student/new-parent links and parent password recovery, with six-digit fallback preserved. Owner Inbox/reset/sign-in and deployed guard checks passed; fresh-template code/resend coverage remains in the email gate below.

- [x] Remove member branding selection, simplify sole-school administration, restrict teacher navigation and repair mobile menu focus/sign-out feedback; source/UI audit recorded in the [workspace audit](../history/2026-10-29-workspace-audit.md).

- [x] Record the owner's one-school free partnership, Standards 1–10 CBSE/Karnataka scope and 1,500-simultaneous-user target. Provisional workspace: Vidyanidhi Public School, Dharwad, Karnataka.
- [x] Rehearse 25 hosted workflow checks, three boundary tests, four single-school follow-ups and eight private-PDF checks; retain [dated evidence](../history/2026-10-29-authenticated-pilot.md).
- [x] Fix hosted safe-update rejection with an incremental singleton migration; review PDF inventory and test transport/revocation, then pause uploads again.
- [ ] Finish real invitation, signup-code and recovery/browser acceptance; Brevo SMTP is configured and one recovery message reached the owner inbox. The 30 October code frontend/template are live, owner inbox receipt is confirmed, provider OTP length is aligned at 6 and the parent code/dashboard journey passed with provider confirmation, retained parent role and no institution entitlement. Student/new-parent link verification and full controlled parent recovery now passed; fresh-template code/resend, real staff invitations and school-scale delivery remain pending.
- [ ] Measure realistic 1,500-concurrent-user behavior and provider headroom; bounded two-request conflict checks do not establish this capacity.

- [x] Add institution-scoped aggregate usage and exact platform monitoring with explicit limits/counter coverage; locally tested.
- [x] Add a repeatable local validation report and [hosted/manual acceptance ledger](../launch/pilot-acceptance.md).
- [x] Prepare the read-only hosted boundary runner, positive-control fixture contract and [staging setup guide](../launch/staging-verification.md); three hosted cases passed with synthetic credentials, then the second fixture was retired and its inputs cleared at the owner's request.
- [x] Inspect the owner-selected hosted baseline and rehearse the six pending upgrades locally using observed application functions and synthetic preserved records; see [audit evidence](../history/2026-10-23-hosted-schema-audit.md).
- [x] Verify an owner-approved application recovery snapshot and apply the six reviewed hosted upgrades through the connected integration; original data preserved, uploads paused. See [rollout evidence](../history/2026-10-23-hosted-upgrade.md).
- [ ] Establish routine full provider/Auth logical backup/restore; the tested application snapshot uses Auth ID stubs and does not cover provider disaster recovery.
- [x] Add a reproducible frontend static-hosting config with SPA fallback, deployment scripts, source-package coverage and local runtime/dry-run verification.
- [x] Sign in to Cloudflare, complete the requested skills/MCP setup and deploy the compatible frontend/API; live SPA/asset/origin/anonymous checks passed on 29 October. See [release evidence](../history/2026-10-29-cloudflare-release.md).
- [x] Provision the approved synthetic callers and run bounded authenticated acceptance; latest one-school follow-up passed 17 API/workflow checks, 14 deployed browser workflows and four role-screen smoke checks. The retired second school was not restored; real-user/device and capacity gates remain open.
- [ ] Reconcile source/hosted migration versions before adopting CLI database push.
- [x] Deploy dedicated signup/unconfirmed-sign-in verification, six-digit code entry, resend controls and generic delivery feedback while preserving confirmation and existing accounts; compatible code template saved, manual acceptance pending.
- [x] Configure owner-approved Brevo SMTP and exact local callbacks; verify one explicitly approved recovery email through Auth acceptance, provider delivery and owner-confirmed inbox receipt. Controlled student/new-parent links and full parent recovery now passed; school sending capacity remains open; see [evidence](../operations/email-delivery.md).
- [ ] Complete hosted account/privacy/session/email/usage checks and all manual acceptance evidence; local reports do not approve launch.

- [ ] Record free-first-school terms, zero-cash provider limits, concurrency evidence, support, exit and handover; automated subscription checkout is not required for a manually administered engagement.
- [ ] Add institutional onboarding/help, owner-approved policies and operational ownership.
- [ ] Rehearse release/rollback, backup/restore, email delivery, privacy fulfillment and incident handling.
- [ ] Validate actual costs and device performance against measured usage.
- [ ] Complete the [launch checklist](../launch/checklist.md) for the cohorts actually being invited.

## Deferred expansion — after a sustainable institutional delivery

- [ ] Add Standard 11–12 / PUC 1–2 stage/year labels, streams and subject combinations after the Standards 1–10 pilot.
- [ ] Add college programs/courses/terms/cohorts after the Standards 1–10 pilot; support semester/annual variations.
- [ ] Reassess public discovery/onboarding, personal workspaces and public-content licensing.
- [ ] Consider individual subscriptions, payment provider/checkout and broader public support only with a sustainable operating budget.

PUC/college work moves into the active milestone only when selected for the actual customer; neither is removed from planned scope. The competitive research's correction, bilingual diagnosis and intervention ideas remain candidates, not an instruction to implement all of them.

## Known unresolved baseline findings

The [dated review](../history/2026-10-22-project-review.md) remains historical technical evidence. Enrollment now separates private access from typed labels; shared Settings/privacy requests and local deletion dependency tests address further baseline gaps. Hosted acceptance, provider reconciliation, privacy fulfillment and other defects remain open unless explicitly checked above.
