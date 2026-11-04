# First-school pilot acceptance

Current decision: **pending hosted and manual acceptance**. Account controls, usage monitoring and a repeatable local validation tool exist in source. The six hosted database upgrades and application snapshot recovery are recorded in the [rollout evidence](../history/2026-10-23-hosted-upgrade.md). Compatible frontend/API publication and live anonymous smoke are recorded in the [release evidence](../history/2026-10-29-cloudflare-release.md). The [authenticated rehearsal](../history/2026-10-29-authenticated-pilot.md) subsequently passed 37 workflow checks and three boundary tests and applied the PDF singleton repair. One provisional school remains active; full provider/Auth recovery, real email, device/load acceptance and free first-school release remain pending.

## Repeatable code checks

From the repository root run:

```powershell
npm run pilot:check
```

The tool runs build, lint, Worker type-check, Worker bundle, all tests and documentation links. It writes ignored `.local/pilot-validation/tests.json` and `acceptance.json`, including actual results, skipped counts and names of missing hosted-test inputs (never their values). It changes no provider deployment or account. Local success exits zero while reporting hosted/manual work as pending. For the existing hosted tenant-test gate use:

```powershell
npm run pilot:check -- --require-hosted
```

That mode exits nonzero unless the configured hosted tenant suite passes, as well as all code checks. Use only an authorized synthetic staging project. Follow the [staging fixture/setup guide](staging-verification.md), then run `npm run test:hosted` for the focused read-only gate. Both wrappers load ignored `.env.staging.local` when present; nine inputs include separate Student B and School B editor tokens for positive controls. Never commit tokens or put them into this ledger. Even a hosted pass covers only those three tenant boundary cases. The report always leaves launch approval pending manual evidence.

The two-school boundary suite passed before the owner retired its second fixture. Its inputs are now deliberately cleared; a fresh `--require-hosted` run fails closed. Use the recorded evidence and current one-school scripts, not a re-created school, until the owner authorizes otherwise.

## Acceptance ledger

Copy this ledger into the institution's restricted operational records and fill actual dates/owners/evidence references. Keep private identifiers, contracts, provider exports and credentials out of the source package. `Pending` is not a passing result.

| Gate | Required evidence | Current result |
| --- | --- | --- |
| First-school scope | Free partnership, no founder investment, Standards 1–10 CBSE/KSEEB, approved materials, ownership/support/exit agreement; 1,500 concurrent target | One provisional Vidyanidhi Public School, Dharwad; real school identity, materials and delivery arrangements pending |
| Migration and release | Backup, applied migration inventory, staged forward migration, matching frontend/Worker versions and rollback rehearsal | Database/application release and core authenticated rehearsal verified; full recovery/rollback gates pending |
| Enrollment and isolation | Verified student/guardian invitations, cross-school denial, revocation including direct PDF/search/assessment reads | Core synthetic hosted checks passed; real-user/manual rollout pending |
| Staff lifecycle | New invitation email/password setup, correct role, removal/restoration and handover | Existing verified staff removal/restoration passed; new email invitation/setup pending |
| Core learning without AI | Lesson/PDF access, quiz feedback/history, flashcard review, planning/maps and saved progress with no AI key | Core synthetic data/API flows passed; target-device/UI completion pending |
| Assessment safety | Draft hiding, key protection, edition replacement, concurrent edit/publish/grading and old-result preservation | Draft/key/history and two-request stale-edit tests passed; synchronized publication/grading workload pending |
| Branding | Name/logo/color/contact validation, automatic permitted-school identity, refresh after revocation and target-device rendering | Four deployed role-screen checks show automatic identity with no member branding selector; 390px student/admin screens passed. Editable branding and real devices remain separate acceptance |
| Account/guardian controls | Standard 6–10 self request; Standard 1–5 guardian request and atomic consent withdrawal/restoration; stale/competing decisions, retained history, unverified/paused cases; recovery email/global-session behavior | Synthetic child creation/consent/conflicts/history and single-use recovery-token change passed; email/redirect/privacy/global-session acceptance pending |
| Privacy fulfillment | Secure export, identity check, retention decisions, deletion preflight, child disposition and synthetic Auth deletion rehearsal | Pending |
| Capacity and monitoring | Provider database/storage/transfer/API/email/billing snapshots, zero-cash limits, observed 1,500 active-user workload, device performance and support escalation | Pending |
| Recovery and policy | Restore database and private objects to a separate environment; reviewed notices, retention and incident owner | Pending |
| Final institution acceptance | Named owner/date, actual pilot users, evidence review and explicit go/no-go | Pending |

Local evidence and test limits are in the [testing guide](../development/testing.md). Regenerate the source package with `npm run package:source` after the accepted source/docs change. It is not a database backup. Do not mark a gate passed solely from a screenshot, build, health endpoint or source ZIP.

## Parent email acceptance — 30 October 2026

Provider OTP length 6 is saved and confirmed after reload. One explicitly approved fresh message at 00:58 IST was provider-reported Delivered; the owner entered the code and reached the parent dashboard. Live checks confirmed parent email confirmation, successful sign-in, retained parent role and no automatic institution entitlement. The student alias remains unverified. This closes the bounded parent confirmation journey, not the full signup/invitation/recovery or school-volume acceptance gate. See the [email evidence](../operations/email-delivery.md).

## Link-first rollout — 2 November 2026

Frontend ed08ffd3-59da-4f37-84ae-0546863445bb and the dual-option signup template are live. Exact compiled entry, three routes and synthetic-link waiting screen were checked. Full local validation passed 144 cases; three retired-fixture boundary cases were skipped. Link confirmation, resend/used/expired inbox handling, student/parent role routing and full password reset are pending new explicitly bounded message authorization and owner interaction. The 30 October parent code journey is historical evidence only.

Student link acceptance: owner-reported student dashboard after explicit confirmation, plus live sign-in, role preservation, empty institution entitlement and absent automatic enrollment checks passed at approximately 02:13 IST on 2 November. Parent fallback/recovery and used/resend acceptance remain open. Two approved messages used of four.

New-parent link acceptance at approximately 02:20 IST: owner link verification plus provider-backed sign-in, retained parent role and absent institution entitlement all passed after correcting the existing student-session confusion. Recovery for the earlier parent test account is owner-operated and pending. Three of four approved messages used; the single recovery email has been sent.

4 November recovery follow-up: the gated recovery frontend is now deployed as `cfd8eab0-fb9e-4dc3-b9f4-35261050cfb8`, with exact-bundle and three-route HTTP checks passed. Fresh local suite: 148 passed, three live boundaries skipped. Student/new-parent provider-backed roles/access passed again. The owner reported the recovery template saved; Supabase accepted the replacement request at approximately 05:40 IST and the intended parent's recovery dispatch timestamp advanced. The final allocated recovery request is used: 4/4 messages, with no automatic resend authorized. The owner subsequently confirmed Inbox receipt, successful password change and the correct parent Settings identity. A separate check rejects the saved original password and confirms the parent role. Controlled one-school follow-up passed 17 API/workflow checks, 14 deployed browser workflows and four role-screen smoke checks; student/staff access and child consent were restored and uploads remain paused. See [4 November evidence](../history/2026-11-04-recovery-and-school-pilot.md). Real devices, real staff invitation/setup, school materials and capacity gates stay open.
