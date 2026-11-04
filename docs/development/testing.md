# Testing and verification

## Local checks

| Command | Scope |
| --- | --- |
| `npm run build` | Frontend TypeScript and production browser bundle |
| `npm run lint` | Active JavaScript/TypeScript lint |
| `npm run check:worker` | Worker TypeScript |
| `npm test` | Planner/Worker tests, local PostgreSQL migration/access suites and configured staging tests |
| `npm run test:hosted` | Three read-only hosted cases with positive controls; missing inputs exit 2 |
| `npm run docs:check` | Local Markdown link targets |
| `npm run app:check` | Wrangler static-frontend deployment dry run after building; no publication |
| `npm run app:dev` | Local Cloudflare static runtime for direct SPA routes/assets |
| `npm run worker:bundle` | Standalone Worker bundle used by the alternate deployment path |
| `npm run pilot:check` | Repeatable code/doc checks and ignored acceptance JSON; hosted/manual gates stay distinct |
| `npm run package:source` | Allowlisted source/docs release without local runtime or credentials |

Local suites include three planner tests, three Worker origin/authentication tests, two private-PDF boundary tests, four assessment Worker tests, sixteen enrollment PostgreSQL cases, twelve assessment PostgreSQL cases, nine branding PostgreSQL cases, four branding-helper cases, eleven account/operations PostgreSQL cases, five account/operations Worker cases, twelve PDF-ledger PostgreSQL cases, nine PDF Worker cases, five PDF-publishing cases, three inventory cases, thirteen guardian-consent PostgreSQL cases, four guardian-consent Worker cases and three hosted-evidence gate cases: 118 local cases. The staging suite has three cases. These do not prove complete SaaS correctness.

## Local enrollment database tests

`tests/enrollment.database.test.ts` runs real PostgreSQL SQL/RLS through the development-only PGlite dependency. It bootstraps a minimal Auth schema/roles, loads the three historical migrations (omitting only extension registration; core `gen_random_uuid()` is used), inserts synthetic existing accounts/content/progress and applies the new forward migration. No remote credentials or paid database is required.

Cases cover ordered practice-hint storage/revision snapshots and publication/enrollment boundaries, typed-label denial, preserved signup/progress/global learning, email/verification checks, subject restrictions, one-use/expired/replaced/cancelled invitations, cross-school/admin/editor denial, hidden hashes and client writes, guardian/consent behavior, revocation and re-enrollment, private-history isolation, inactive schools, draft/answer protection, anonymous denial, school-specific staff removal/restoration and role boundaries. Each case rolls back its transaction. This tests SQL behavior with a local Auth substitute, not actual hosted Supabase token issuance, email delivery, PostgREST or Storage.

The new desktop roster/invite/revocation, staff removal/restoration and a 390-pixel guardian acceptance layout were also exercised in a local browser fixture using real components/styles and synthetic service responses. This is UI evidence, not live end-to-end verification. Preview files/screenshots stay ignored under `.local/enrollment-preview/`.

The practice-hint component was also exercised in an ignored local browser fixture: adding, editing, moving, removing, Markdown preview and ordered save payload. This uses synthetic values and no backend; the PostgreSQL case separately checks storage, revision history and access rules. Hosted UI/PostgREST acceptance is still pending.

## Local assessment tests

`tests/assessments.database.test.ts` loads the enrollment-era schema, inserts existing quizzes/attempts/cards/reviews and applies the assessment forward migration. Twelve cases cover legacy preservation, draft conflicts, school/topic authoring permissions, learner draft/key isolation, publication validation/rollback, revised immutable editions and feedback history, forged/invalid submissions, withdrawal/revocation, card review identity/due behavior and anonymous denial. The database is local PostgreSQL through PGlite; simultaneous hosted sessions are not simulated by its single connection.

`worker/assessments.test.ts` adds four boundary cases: caller-scoped grading, invalid/other-student inputs, useful access-error messages and transactional legacy create delegation. The tests do not use real Supabase credentials.

Real components/styles were checked in `.local/assessment-preview/` with synthetic API responses: published quiz read-only state, revised draft/question/answer/explanation editing, save/publication/status replacement, card editing/publication, learner submission and saved result history, plus card flip/rating and due-queue refresh at a 390px iframe viewport. This is UI verification, not live end-to-end grading proof.

## Local branding tests

Branding tests in `tests/branding.database.test.ts` apply the five preceding migrations, create synthetic existing accounts/memberships/enrollments, then apply the branding migration. Nine cases cover preservation, member/guardian/typed-label visibility, admin boundaries, direct-table/anonymous denial, stale/reset versions, contrast validation, bounded logos/contacts/types and refreshed revocation/paused-account behavior. Matching versions omit unchanged logos; stale versions receive the current image. `tests/branding.test.ts` checks contrast defaults/invalid colors and reuse/removal of cached logos through a synthetic RPC. These use local PostgreSQL or browser helpers with mocked transport, not hosted Auth/PostgREST or simultaneous sessions.

Real components/styles were checked with synthetic responses in `.local/branding-preview/`: desktop identity/color/contact editing, save and sidebar application; reset preview/save with version advance and cleared contacts; learner selection/refreshed revocation fallback; 390px learner sidebar selection/contact rendering. Logo file decoding/upload and hosted integration still need acceptance with real provider sessions.

## Local account/operations tests

`tests/account-operations.database.test.ts` upgrades the prior schema with legacy requests/accounts. Eleven cases cover verified self/guardian/paused access, Standard 1–5 versus 6–10 boundaries, preserved legacy duplicates, deduplication/review, request RLS, school usage separation, platform aggregation with 1,100 usage rows, attribution deletion behavior, linked-child deletion guards/cascades and anonymous/preflight denial. `worker/account-operations.test.ts` adds five cases for caller RPC delegation, input/errors/review authority and platform monitoring at exhausted quota. No real account is deleted; SQL deletion occurs only inside isolated local test transactions.

Browser fixtures use real components/styles with synthetic services under ignored `.local/account-preview/`: profile-save feedback, self export/deletion confirmation/status, duplicate-disabled controls, guardian child request, school usage aggregates, platform warnings and deletion preflight. A 390px guardian fixture also submitted a child export request. Provider email/session behavior, hosted Auth deletion and actual fulfillment need independent hosted acceptance. Run `npm run pilot:check` for a timestamped ignored validation report; `-- --require-hosted` requires the three existing hosted tenant tests to pass. See the [acceptance ledger](../launch/pilot-acceptance.md).

## Local PDF storage tests

`tests/pdf-storage.database.test.ts` upgrades populated legacy pointers/sizes, then tests paused inventory cutover, shared keys, reservation overlap, capacity/same-item denial, stale edits/revocation, draft/text finalization, uncertain capacity, raw-write/RPC denial, detachment/publication guards and explicit maintenance/orphan approval. `worker/pdf-storage.test.ts` covers effective caps, declared/chunked limits, provider/finalize/cleanup failures, authoring/monitoring boundaries and detachment. `tests/pdf-publishing.test.ts` verifies old metadata preservation and confirmed-upload publication ordering; `tests/storage-inventory.test.ts` covers >1,000 entries, nested pagination, discrepancy reporting and fail-closed scans. Local ordering tests do not prove simultaneous hosted PostgreSQL sessions or Storage behavior.

Real components/styles were checked in `.local/pdf-preview/` with synthetic service responses: oversize rejection before extraction, sample-PDF extraction, failed replacement/reload preserving the original publication, successful replacement/publication and queued-cleanup totals/feedback. Conditional metadata saves also reject intervening edits in the local SQL/orchestration tests. Actual provider uploads, deletion acknowledgements, hosted concurrency and migration/inventory cutover still need staging acceptance.

## Local guardian consent tests

`tests/guardian-consent.database.test.ts` applies the forward migration to populated prior records. It covers preserved legacy decisions/history, atomic withdrawal/restoration, new protected lesson/PDF-pointer/search/quiz/card/progress requests, independently revoked enrollment, invalid/unverified/unrelated/staff/older-learner callers, no-op/stale versions, competing guardians' ordered decisions, raw-write denial, and injected student/audit failures rolling back all writes. `worker/guardian-consent.test.ts` checks caller RPC delegation, forged actor-field omission, input validation, role denial and propagated failures. PGlite uses one connection; this does not verify simultaneous hosted locks, actual tokens, Storage transport or provider sessions. See [rollout and access semantics](../architecture/guardian-consent.md).

Real parent components/styles were checked in `.local/guardian-preview/` with synthetic responses: withdrawal/restoration, pending-action disabling, preserved progress, stale-decision refresh, failed-save feedback and successful retry. This is local UI evidence, not hosted consent/access verification.

## Hosted staging RLS suite

Follow the [staging setup/fixture contract](../launch/staging-verification.md). Create separate verified synthetic students and editors at schools A/B, existing drafts at both schools, nonempty own progress/plan/map rows for both students and an accessible published quiz/question for Student A. Set all nine inputs in the process environment or ignored `.env.staging.local` used by the validation wrappers:

```text
TEST_SUPABASE_URL
TEST_SUPABASE_PUBLISHABLE_KEY
TEST_STUDENT_A_JWT
TEST_STUDENT_B_JWT
TEST_STUDENT_B_ID
TEST_SCHOOL_A_EDITOR_JWT
TEST_SCHOOL_B_EDITOR_JWT
TEST_SCHOOL_A_DRAFT_ID
TEST_SCHOOL_B_DRAFT_ID
```

Run `npm run test:hosted` for the focused gate or `npm run pilot:check -- --require-hosted` for the combined gate. Ordinary `npm test` uses its process environment and skips these three cases if inputs are absent. The dedicated runner exits 2 instead of accepting missing inputs; both evidence gates require exactly three completed passes. Identity/own-record controls prevent empty fixtures or invalid sessions from masquerading as isolation success; answer and explanation denials must be PostgreSQL `42501` after a permitted question read. Local gate tests reject missing/skipped/unrelated/duplicate/failed reports. Do not store tokens or test credentials in docs or committed files.

## Acceptance work still needed

Test guardian creation/withdrawal/restoration, independent registration and recovery, staff invitation, content drafts/revisions, ordinary/scanned PDF handling, grading, flashcard persistence, plans/maps, privacy fulfillment and AI budget behavior. Include unauthorized direct API/database attempts and cross-tenant tests. Test mobile rendering, keyboard use and accessible PDF alternatives.

Public learners, Standards 11–12 / PUC 1–2 and college flows need new acceptance cases once implemented. Test migration from current school records as well as a fresh database.

## Evidence rules

Record date/environment, command or user journey, result, skipped cases and material warnings. Keep local build success separate from staging and production evidence. Current historical deployment success is documented in the dated review; it is not a current health guarantee.

## Hosted database rollout evidence

On 23 October 2026, the approved application snapshot recovery and six hosted upgrades passed schema/data-fingerprint checks, grant checks and four anonymous PostgREST denial checks. These do not replace the three synthetic authenticated boundary cases or complete pilot acceptance. See the [rollout record](../history/2026-10-23-hosted-upgrade.md) for exact scope, recovery limits, migration versions and remaining work.

## Frontend deployment verification

The checked-in frontend configuration was verified with Wrangler's local static runtime on 23 October 2026: seven direct navigation routes returned the built index, the compiled entry script resolved, and the API runtime passed health, unexpected-origin rejection, allowed preflight and unauthenticated rejection. Both frontend/API deployment dry runs passed. Ignored `.local/release-preview/` contains release hashes and local evidence; this is not hosted deployment or authenticated workflow acceptance. See [release preparation](../history/2026-10-23-application-release.md).

## Live Cloudflare release — 29 October 2026

Fresh builds/lint/Worker types and all 118 local tests passed. Live HTTP checks verified seven SPA routes, all 96 frontend file hashes and health/CORS/anonymous rejection; the browser confirmed the existing login design, protected-page redirect and no console errors during that visit. No authenticated identity was supplied, so the three credential-dependent boundary tests remain unrun. See [release scope and versions](../history/2026-10-29-cloudflare-release.md).

## Hosted authenticated rehearsal — 29 October 2026

The [dated evidence](../history/2026-10-29-authenticated-pilot.md) records 25 authenticated workflow checks, three read-only boundary cases, four single-school follow-ups and eight private-PDF checks. These use real provider sessions, not local Auth stubs. The second synthetic school was subsequently retired at the owner's request; its caller-token inputs were cleared and a fresh boundary gate is pending. One active provisional school remains.

Operator-only scripts are under `scripts/pilot-*.mjs`; authenticated/single-school/PDF scripts require explicit execution flags and restricted ignored files. They are not part of ordinary `npm test`. The original two-school provisioning rehearsal refuses to rerun against the retired fixture. Existing single-school follow-ups create only scoped synthetic assessment data and make bounded concurrent requests; they do not certify 1,500-user capacity. The PDF rehearsal requires actual fresh inventory review and re-pauses uploads in `finally`; verify pause after any interruption.

The PDF forward fix adds a thirteenth database case, bringing the ordinary local suite to 119 tests. Local PGlite does not load the hosted `safeupdate` extension; the real hosted PDF check, provider log diagnosis and role configuration supply that integration evidence. Never disable this safeguard to make local/hosted behavior match. Actual SMTP delivery, browser reset links, full provider recovery and target-device/load acceptance remain open.

## Email verification flow — 29 October 2026

`tests/email-verification.test.ts` adds five cases for confirmed-session versus generic signup routing, explicit `email_not_confirmed` discrimination, sanitized expired-link errors, sender/rate-limit failures and exact callback URLs. The local suite now contains 128 cases; the three existing hosted boundary cases remain skipped without active fixture inputs.

An isolated browser fixture under ignored `.local/verification-preview/` uses the real authentication components/styles with synthetic service responses. It checks unconfirmed sign-in redirect, missing-sender feedback, resend acknowledgement/cooldown, returning with an empty password, invalid credentials staying on sign-in, confirmed sign-in/callback routing and expired-link recovery. The normal app verification screen was also checked at desktop size and 390px width without horizontal overflow. These are UI checks, not actual mail delivery or provider confirmation proof. The normal local app remains connected to the selected Supabase project; no real account was changed for the fix. Configure the approved local callback and custom SMTP, then test a controlled inbox and the complete link/recovery journey before accepting email delivery.

## Automatic identity and detail audit — 29 October 2026

Five additional cases cover automatic school identity and rendered role navigation without a branding selector, bringing the local suite to 133 tests (three separate hosted boundary cases still require active fixture inputs). Mobile fixture checks cover hidden-menu isolation, focus wrap, Escape dismissal/focus return and 390px overflow. The [dated audit](../history/2026-10-29-workspace-audit.md) distinguishes those mocked UI checks from seven fresh live school-workflow checks and the pending real email-link interaction. Operator email tools are execution-gated, use only the approved alias accounts and cap requests at six; never run them as part of ordinary tests.

## Verification-code fallback — 30 October 2026

A sixth email-verification helper case checks exact six-digit input (including leading zero), rejects malformed lengths/characters and verifies expired-code guidance. The full local suite passed 134 cases, with three separate hosted boundary cases skipped. An isolated real-component browser fixture checked blank-action disabling, invalid-code feedback, resend/code clearing and cooldown, then a successful mocked session/dashboard route. No real OTP was read from mail or logs, and this does not prove live code verification. The compatible frontend is now live and its compiled entry matches the local production build; login/verification routes returned 200. The code template was saved and reloaded, and one owner-approved parent message was accepted and provider-reported Delivered at 00:46 IST. Manual code entry remains pending; the mocked result is not live verification evidence.

## OTP length alignment regression — 30 October 2026

The original six-digit helper/fixture did not match the provider's configured length 8. After the owner selected six digits, source tests cover a shared six-digit pattern, full typing/paste preservation including leading zeros, rejection of shorter/longer/non-ASCII input and eight-digit rejection. The final six-digit source passed 135 tests plus build/lint/Worker/docs and packaging dry run; the isolated real-component fixture reached its synthetic verified route with a leading-zero six-digit code. Provider length 6 was saved after explicit approval and confirmed after reload; one fresh approved dispatch at 00:58 IST is recorded. An intermediate eight-digit UI fixture passed but was not deployed. The owner screenshot proves inbox receipt, not successful live verification. Synthetic fixture codes never use a real code from the screenshot.

Parent acceptance at approximately 01:00 IST: owner-reported dashboard success plus live provider checks for email confirmation, sign-in, retained parent role and no institution entitlement. Brevo reported the 00:58 fresh message Delivered. The student remains unverified and its negative sign-in check passed. The operator report is incomplete for the combined two-account gate, rather than a parent-flow failure. No further email requested.

## Link-first confirmation checks — 2 November 2026

New tests cover fragment validation, mixed/query credentials, explicit exchange, single-flight submission, confirmed-session requirement, sanitized errors and the maintained dual-option email contract. Red/green logs are ignored under .local/link-first/. Isolated real-component browser checks proved zero calls and a clean URL on link open, one call after confirmation, invalid/expired fallback and successful six-digit entry, an existing-session warning, and no horizontal overflow at 390px. These mocks do not certify real email transport or password reset.

Final validation passed 144 tests (three credential-dependent hosted boundaries skipped), frontend build, lint, Worker type/bundle checks and docs checks. Independent review identified the mixed callback bypass; a failing regression preceded its SDK-initialization guard. Query-string payload rejection has separate red/green evidence. Hosted version ed08ffd3-59da-4f37-84ae-0546863445bb exactly matches the tested entry; login/verification/recovery routes return 200. Email template is saved/reloaded; actual mail transport and password-reset completion still require approved inbox tests.

## Recovery regression — 2 November 2026

The reported expired callback was reproduced with an SSR assertion that the password form must be absent (failed before repair). Recovery parsing/intent tests cover custom-only fields, query/mixed/duplicate/cross-namespace rejection and PASSWORD_RECOVERY rather than ordinary login. Isolated browser fixtures reproduced old-session re-adoption and a delayed response reopening the form after a newer expired callback, then verified both repairs. Fresh valid recovery and six-digit fallback expose only the synthetic verified target. No real password was entered or changed by the assistant. Source changes await fresh full validation and live recovery acceptance.

## Recovery publication — 4 November 2026

Fresh validation passed 148 tests (three credential-dependent hosted boundary cases skipped), frontend build, lint, Worker type/bundle checks and documentation. Production configuration and saved-server-secret exclusion passed; deployment dry run passed. Published frontend `cfd8eab0-fb9e-4dc3-b9f4-35261050cfb8`. Hosted login/verification/reset routes returned 200 and the entry exactly matched the tested local bytes (SHA-256 `5e1a736a042702e1af0781f08993777e2fdbdcd88a4705c8abc145dbac89f4af`). This is transport/bundle evidence, not a current browser or real password-reset pass. Shared recovery-template save and the owner's newest-email/password/sign-in journey remain pending. Fresh read-only student/new-parent sign-in and role/no-school-access checks passed without sending emails.

## Controlled recovery and school browser acceptance — 4 November 2026

Owner Inbox/reset/correct-parent sign-in evidence is accepted, backed by unchanged parent role and rejection of the original fixture password. Never reuse that stale password or ask for the replacement. All four approved emails are used.

Current one-school evidence passed 17 API/workflow checks, 14 deployed Chromium browser workflow checks and four role-screen smoke checks. The isolated browser runtime is Playwright 1.64.1 under ignored `.local/tools/ui-venv`, with Chromium binaries under `.local/tools/browsers`; no application dependency or lockfile was changed. Desktop 1366px and 390px emulation are measured browser coverage, not real Android/iOS/device acceptance. Exact fixture/evidence and both corrected harness errors are described in [the dated record](../history/2026-11-04-recovery-and-school-pilot.md). Final backend checks revalidated enrollment, staff membership, child consent, quiz history, flashcard rating and paused/settled storage. These tests do not prove 1,500-user capacity or a fresh two-active-school boundary suite.
