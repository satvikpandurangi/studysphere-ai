# Hosted staging verification

Current state, 29 October 2026: **database upgrades and compatible frontend/API deployed; authenticated pilot acceptance pending**. The owner-selected Supabase project is `https://flsckscpvqqyyqvsyjwp.supabase.co`. The six forward upgrades preserved original application data. The compatible Cloudflare API and frontend are now published; live SPA routing, all 96 frontend file hashes and anonymous API checks passed. See [database recovery/upgrade evidence](../history/2026-10-23-hosted-upgrade.md) and [deployed release evidence](../history/2026-10-29-cloudflare-release.md). The later [authenticated rehearsal](../history/2026-10-29-authenticated-pilot.md) passed 37 workflow checks plus three boundary tests and added the seventh forward upgrade; uploads were paused again after the PDF test. Real email/manual/full-capacity acceptance remains pending.

## Select and prepare the environment

The selected Supabase project already matches frontend and Worker configuration. Ignored `.env.staging.local` now contains its URL and the existing local publishable key; synthetic identity/fixture fields remain blank. Do not overwrite that file with the blank template. Record frontend/API URLs, environment owner and funded/free resource limits in restricted operational notes. Inspect this existing project's data before any migrations or fixture creation; it is not assumed empty or dedicated staging. Use clearly identified synthetic students/materials without changing real institutional records. No paid provisioning or new provider project was performed. The database and compatible frontend/API deployments are complete; authenticated and manual acceptance remain pending.

Inspect the actual project and applied migrations with an authorized operator. For a new project apply all migrations in filename order; for an existing one apply only unapplied forward migrations after backup/rehearsal. Follow the [deployment guide](../operations/deployment.md), [PDF paused-inventory cutover](../architecture/pdf-storage.md) and [consent traffic/version cutover](../architecture/guardian-consent.md). A healthy Worker route or successful local migration cannot substitute for inspecting the hosted schema.

The application recovery snapshot covers public/private application schemas and records; it is not a full provider/Auth backup. Auth passwords and session tokens were not exported, and no password was reset. The native session-pooler/password issues remain separate from the now-working integration. Private recovery files remain ignored and outside source packages.

The migration service recorded generated versions that differ from the source filenames, and the three already-present historical schema migrations were not tracked. Use the [recorded mapping](../history/2026-10-23-hosted-upgrade.md) and reconcile history before any CLI push; do not rerun the initial schema or the six applied source files. Cloudflare is authenticated and the compatible application release is published; the requested MCP integration is usable in the current session.

The matching frontend/API are deployed to the recorded origins. Before authenticated acceptance, verify Auth site/reset redirects, actual server-secret operations, email delivery and the private Storage bucket. For future retargeting, deploy/configure compatible frontend and Worker together. Do not repurpose the historical URLs as staging without explicitly choosing that target. Retain release/source checksums and a database/private-object recovery plan. No automated fixture provisioning or cleanup is provided by the boundary test command.


## Current one-school pilot

The owner now wants one active school only. The provisional workspace is **Vidyanidhi Public School**, Dharwad, Karnataka; the real school name is undecided. Existing CBSE and Karnataka catalog labels exist (Karnataka code `KSEAB`); complete approved curriculum does not. See [29 October authenticated evidence](../history/2026-10-29-authenticated-pilot.md): 25 workflow checks, three read-only boundary tests, four single-school follow-ups and eight private-PDF checks passed. The initial second synthetic school was then retired, its three accounts suspended and the nine-input test file's fixture fields cleared. Do not recreate/reactivate that school just to make a fresh gate green. Three original accounts and pre-existing school data were preserved.

Operator-only scripts `scripts/pilot-single-school.mjs --execute` and `scripts/pilot-private-pdf.mjs --execute-reviewed-inventory` use the existing restricted fixture manifest and ignored operator credential file. They perform real synthetic writes, unlike `test:hosted`. The PDF script requires fresh settled inventory review, uploads only the bounded bundled sample and pauses uploads in `finally`. Check the actual paused state after any interruption. The earlier `scripts/pilot-authenticated.mjs --execute` is a historical two-school provisioning rehearsal and refuses to rerun after retirement. It must not be used for real users. Generated test credentials are never supplied in command arguments or committed.

Real staff invitation/recovery email and reset-link browser journeys remain unverified; the dashboard currently has custom SMTP disabled. Admin-generated synthetic recovery-token verification is not email-delivery proof. No provider billing/verification guard was disabled.

## Historical two-school fixture contract

This contract records the completed boundary rehearsal. It is retained for evidence; creating another school is no longer in the current authorized pilot scope. The verification command below remains read-only and fails closed when the retired fixture inputs are absent.

| Fixture | Required positive control |
| --- | --- |
| Students A/B | Two distinct verified Auth accounts with stored student roles, independent Standard 6–10 profiles, assigned curriculum/subjects and appropriate verified school enrollments |
| Student-owned records | Each student has their own `student_profiles`, `topic_progress`, `plan_items` and `mind_maps` rows. Complete a topic, save a plan and save a map using each student session |
| Staff A/B | Two distinct verified editors/school admins, each authorized only for their own school; neither is a platform admin. Four distinct Auth IDs across students/staff are required |
| Drafts A/B | Existing draft content rows belonging to two different schools. Each school editor can read its own row; neither can read the other's |
| Published quiz | Student A can read at least one published quiz question's permitted `id`, `prompt` and `options`; answer and explanation columns remain restricted |

Obtain current caller access tokens through the normal sign-in flow of those synthetic accounts. Use the selected project's publishable key, never a service-role key or platform-admin token in place of a fixture identity. Keep passwords, tokens and keys out of chat/source packages. Expired tokens or missing fixture rows fail verification rather than counting as isolation success.

## Configure and run

From the repository root, copy the blank template once:

```powershell
Copy-Item tests/staging.env.example .env.staging.local
```

If the destination already exists, edit it in place instead of overwriting credentials. Fill the nine named inputs locally. `TEST_STUDENT_B_ID` must match Student B's authenticated identity. `.env.staging.local` is ignored and excluded from source packages. Both validation wrappers load it if present; existing process-environment values take precedence. Clear stale process variables when switching projects. Ordinary `npm test` uses its process environment and does not independently load this optional file.

```powershell
npm run test:hosted
npm run pilot:check -- --require-hosted
```

`test:hosted` exits **2** without network calls if required inputs are absent, **1** on failed/missing test evidence, and **0** only if all three hosted cases pass. It checks real Auth identities/roles, nonempty own-record controls and cross-student reads in both directions, both schools' own draft visibility/cross-school denial, and actual PostgreSQL `42501` denial for answer/explanation columns after a permitted published-question read. A generic network/auth/schema error cannot count as answer-key protection. Requests have timeouts.

The command creates only ignored `.local/hosted-validation/tests.json` and `acceptance.json`. It performs no remote insert/update/delete, upload, signup, deployment or email action. `pilot:check` repeats the normal code/documentation checks and writes its separate `.local/pilot-validation/` evidence. Both use the same required-input and three-case evidence contract. A missing-input report replaces prior acceptance and removes stale test JSON; it never inherits a previous pass.

## Acceptance still required

A three-case pass is a narrow Auth/PostgREST boundary result, not proof of the new migrations, private Storage transport, complete tenant isolation or pilot readiness. Record the [full acceptance ledger](pilot-acceptance.md), including:

- Applied schema/grants, versioned consent withdrawal/restoration, competing real sessions, failure recovery and preserved history.
- Private PDF reads before/after revocation, actual bucket inventory, bounded/concurrent upload behavior and provider cleanup outcomes.
- Assessment edits/publication/grading/history, branding and institution membership changes.
- Real invitation/recovery email, independent and guardian account journeys, privacy fulfillment and backup/private-object restore.
- Free first-school terms, approved Standards 1–10 CBSE/identified State-board materials, zero-cash operating limits, target devices, 1,500-concurrent load evidence and support ownership. See the [release gates](first-school-readiness.md).

Stop the staging run on cross-tenant exposure, unexpected answer-key access, inconsistent consent or lost history, missing private objects, or unaccounted storage writes. Keep the affected writes unavailable, retain evidence and fix forward before repeating acceptance. Do not disable guards or reopen the legacy uploader to make a rehearsal pass. No CI/remote repository workflow or production rollback baseline is inferred from local checks.
