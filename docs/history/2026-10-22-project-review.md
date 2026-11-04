# StudySphere AI: project history and current implementation review

Reviewed 22 October 2026. Dates below use Asia/Kolkata.

## Overall assessment

StudySphere has a substantial, persistent application implementation: a React frontend, Supabase authentication and PostgreSQL database, a Cloudflare Worker API, private PDF storage, staff publishing, student learning tools, and parent reporting. It implements the requested data-first direction. AI is supplementary rather than the source of the curriculum.

The previous development chat records a successful public deployment on 25 September. Today's local checks pass, but that is not evidence that every deployed school workflow works. The live isolation tests still skip, the documentation and source archive lag behind the implementation, and several account, publishing, and operational gaps remain.

## Evidence and scope

- Read all four first-party Markdown files in full: `START_HERE.md`, `README.md`, `OPERATIONS.md`, and `ZERO_COST_PILOT.md`.
- Inspected all application pages, shared components, hooks, context, API helpers, types, CSS, Worker implementation, tests, three migrations, seed data, and build/deployment configuration.
- Inspected the 23 first-party Python work scripts and development/deployment error evidence. These scripts explain earlier edits; they are not a supported migration system.
- Retrieved both pages of the original **Rebuild StudySphere school SaaS** chat, including the original requirements and subsequent user changes. Historical claims below are explicitly identified as chat records rather than fresh deployment verification.
- Compared the source ZIP against the current source and inspected the two frontend archive inventories. Inspected the existing sample-PDF render.
- Checked local environment variable presence without reproducing credentials. The three frontend settings are populated.
- The application has 41 files across `src`, `worker`, `supabase`, `tests`, and `sample-assets`; 40 are text/code and one is the sample PDF. Those text files contain 1,426 physical lines, but many functions and styles occupy very long lines.
- Neither the workspace root nor the application folder contains a Git repository. There is no local commit-by-commit history to inspect. Earlier versions, missing sources, and remote database state cannot be reconstructed perfectly from these files.
- Installed dependencies, npm caches, browser profiles, and bundled Python packages were classified as environment/runtime material, not treated as first-party project source. Some bundled Python paths are access denied. Browser profile contents were not inspected. This is not a claim to have audited every dependency or binary byte.
- No application-source edits, remote configuration changes, migrations, account creation, or deployment were performed during this review. Running the build refreshed local generated `dist` output and TypeScript build metadata.

## History from the first request

| Date | Decision or milestone | Evidence and effect |
| --- | --- | --- |
| 22 September, around 01:20 | Initial product request | A friend had a partial AI Studio/Firebase concept. The requested rebuild was a premium school SaaS for Standards 1–10, separate student/parent entry points, board/standard/school/subject selection, staff-authored Markdown/PDF content, embedded YouTube, Groq features, and approximately 1,000 initial users. |
| 22 September, around 01:24 onward | Clean build authorized | The user explicitly chose a clean build. No original source repository or Firebase export was supplied in the retrieved history. This workspace therefore does not establish a completed migration from the friend's application. |
| 22 September | Data-first requirement clarified | The user said the product must rely on supplied data and the backend, not fully on AI. The implementation stores curriculum, assessments, plans, maps, and progress independently of Groq. |
| 22 September, evening | First build completed | The chat reported student/parent/staff roles, publishing, private R2 PDFs, optional grounded tutor, privacy requests, six passing tests, and three skipped staging tests. Services were not connected at this stage. |
| 22 September, around 23:14 | Account policy changed | The user required parent supervision for Standards 1–5, independent accounts above Standard 5, and removal of school approval. This supersedes the earlier all-students guardian/school approval design. |
| 22 September, around 23:42–23:54 | Pilot reduced to 50–100 students at ₹0 | API counters, AI quotas, PDF limits, and the pilot dashboard were added. The original R2 implementation used an 8 GB application storage ceiling. This was later replaced. |
| 23 September | Provider setup and database installation | The chat records provider logins, Windows/CLI obstacles, manual SQL transfer, and the user's confirmation that SQL completed successfully. Frontend/API shells were deployed. Brevo phone verification and R2 billing activation were obstacles. |
| 25 September, around 00:50 onward | Card-free storage change | The user refused to supply card details. R2 was replaced with private Supabase Storage, and the application ceiling fell to 800 MB. The frontend stayed on Cloudflare; the Vercel discussion was a historical hosting decision, not a current terms verification in this review. |
| 25 September | Typed school names added | The user reported that signup offered no way to add their school. Independent students and parents gained typed school-name fields. Names are normalized and matched or created automatically. This supersedes the original prompt's school-request review requirement. |
| 25 September, around 01:34 onward | Final recorded deployment | The user authorized publishing. The chat reports database/storage connection, encrypted Supabase server-key installation, API health 200, invalid-request 401, and visible school-name signup. It also reports that the AI tutor remained disabled pending Groq configuration. |
| 22 October | Current review | Fresh local build, lint, Worker type check, and six unit tests passed. Three tenant tests skipped. Live HTTP checks could not complete due to this session's network restrictions. |

The latest retrieved development activity is 25 September. No later development history was established by this review.

## Current product and architecture

| Area | What the source implements | Limits or unverified behavior |
| --- | --- | --- |
| Frontend | React 19.1.1, TypeScript, Vite 7.1.4, React Router, responsive sidebar and page layouts | No fresh authenticated browser journey was performed today. |
| Roles | `parent`, `student`, `editor`, `school_admin`, `platform_admin` | Roles are stored server-side; changing the visible login tab does not change an account's actual role. |
| Standards 1–5 | Verified parent creates a child through the Worker, selects curriculum, and records consent; parent can withdraw/restore access | Provisioning and consent updates span multiple requests rather than one database transaction. |
| Standards 6–10 | Supabase signup metadata validated by a database trigger; independent student profile and subjects created | Current school membership follows a typed name, without school affiliation verification, as requested. |
| Curriculum | Board → standard → subject → chapter → topic | Initial migration creates CBSE, Karnataka State Board, ICSE, Standards 1–10, and four subjects for each combination. This is a catalog scaffold, not a complete approved syllabus. |
| Lessons | Staff publish Markdown lessons, notes, examples, problems, private inline PDFs, and YouTube embeds | Problem working is local component state; it is not graded or persisted. |
| Publishing | Draft/published status, school/global visibility, live preview for Markdown, revision snapshots | Assessment editing/publishing lifecycle and problem-hint authoring are incomplete. |
| PDF handling | Browser text extraction for up to 100 pages, manual searchable text, Worker upload/read, PDF.js canvas viewer with paging/zoom | No OCR. Extracted text is capped at 200,000 characters. Canvas viewing lacks a selectable accessible text layer. |
| Video | Validated YouTube IDs, privacy-enhanced embeds, attribution, external fallback | Playback and school-device compatibility need live testing. |
| Quizzes | Staff-written multiple choice; Worker grades and persists attempts; students lack answer-column grants | Unit tests do not exercise grading or answer secrecy against the real database. |
| Flashcards | Stored cards, reveal/rating, due dates and review persistence | Scheduling is a simple fixed 1/3/7/14-day mapping, not an adaptive repetition algorithm. |
| Planner | Manual tasks, weekday/subject rotation, edit/delete/complete, maximum 60 generated tasks across six months | Student-only UI and write policies; parents can view upcoming tasks but cannot create the child's plan. |
| Maps | React Flow nodes/connections, label editing, 900 ms debounced save, JSON export | Current UI exposes one general map per student; export is JSON rather than an image. |
| Search | PostgreSQL English full-text search, publication filtering, RLS-scoped results and lesson links | No explicit advanced board/subject filter UI, multilingual search tuning, or PDF-page citation links. |
| AI | Optional Groq tutor; searches authorized published content first; up to three excerpts, six recent messages, 15-second timeout, 450 output-token limit, citations, clear-chat action | Dedicated flashcard/quiz/study-aid generation workflows are absent. Failed calls can consume reserved request quota. No retry loop or hard platform token-budget enforcement. |
| Parent reporting | Linked children, subjects, completed topics, quiz attempts, upcoming tasks, consent controls | Detailed report counts are recent capped results, not lifetime totals. |
| Staff/admin | Content studio, school/staff management, curriculum authoring, educational summaries, aggregate AI counts, pilot usage | No complete school roster management, membership revocation UI, or audit-log viewer. |
| Privacy | Account export/deletion requests and platform-admin review | Fulfillment is manual. Reviewed policy, support details, retention operations, and tested deletion/restore remain unestablished. |

The browser talks directly to Supabase for ordinary RLS-controlled data and uses the Worker for privileged actions. PDF files are in **Supabase Storage**; Cloudflare runs the API and serves the frontend. The current source has no active R2 binding.

## Database and access model

The initial migration defines 31 tables, helper functions, grants, RLS policies, search, request reservations, aggregate reports, a parent-child view, and starter catalogs. Private tables have RLS enabled. Important intended boundaries include:

- Students see published material for assigned subjects and their chosen school, plus global material.
- Editors and school administrators edit content only for their memberships; platform administrators can manage global content.
- Students cannot directly select quiz-answer columns or insert quiz scores.
- Parent access follows guardian links; school administrators have selected school-student reporting access.
- AI conversations/messages are readable by the owning student, rather than being exposed in school usage reports.
- Privileged counters and server operations use the service role; the browser gets a publishable key.

Migration order for a fresh installation is:

1. `202609220001_initial.sql`
2. `20260925005545_move_lesson_assets_to_supabase_storage.sql` — adds tracked PDF byte size.
3. `20260925013000_typed_school_signup.sql` — adds normalized school names and replaces the signup trigger.
4. Optional `seed.sql` — a clearly marked Standard 6 Karnataka Mathematics fractions sample, not a complete curriculum.

The storage bucket is configured outside these SQL files. A fresh install still requires a private `lesson-assets` bucket and the prescribed MIME/size settings.

The initial schema was edited during development. Existing deployments should not rerun it as if it were an incremental upgrade: it creates types/tables directly. There is no checked-in migration ledger proving the current remote schema matches these files.

## Findings to address

### 1. Independent students have no Settings/privacy-request route — high

`src/App.tsx:30` defines the student routes without `settings`; unknown student routes redirect to the dashboard. `src/components/AppShell.tsx` also omits student Settings navigation. The actual export/deletion request UI is in `SettingsPage` inside `ParentPages.tsx`, which is routed only for parents and staff. Therefore independent Standards 6–10 students cannot use the privacy controls described by the product's privacy page through the current student UI.

Add the shared Settings route/navigation for students and verify account-holder export/deletion requests.

### 2. The downloadable source package is stale — high

`outputs/studysphere-ai-source.zip` has 54 entries and is 150,914 bytes. Comparing current source files and principal guides/configuration against it found ten different files and two absent migrations.

Missing:

- `supabase/migrations/20260925005545_move_lesson_assets_to_supabase_storage.sql`
- `supabase/migrations/20260925013000_typed_school_signup.sql`

Different:

- `src/pages/AuthPage.tsx`
- `src/pages/ParentPages.tsx`
- `src/pages/StaffPages.tsx`
- `worker/index.ts`
- `supabase/seed.sql`
- All four Markdown guides
- `wrangler.toml`

Someone rebuilding from the advertised ZIP will miss the final storage/signup changes. The package also omits `wrangler.deploy.toml` and `vite.worker-bundle.config.ts`, the later deployment workaround files. Regenerate and verify the release package after the next reviewed changes. No `.env.local`, `.xdg`, or `node_modules` paths were found in these ZIP inventories.

### 3. Tenant isolation has not been demonstrated by the current test run — high

`tests/rls.integration.test.ts:16` skips all three staging cases without the required seven environment values. The six passing unit tests cover three request-boundary cases and three planner cases. They do not validate account creation, consent withdrawal, quiz grading, publication, storage, or AI limits.

Run the real staging tenant suite and extend meaningful coverage to those flows before treating school boundaries as verified. Current SQL policy inspection is evidence of intent, not a substitute for executing the tests.

### 4. School-specific access is based on self-declared school name — product/security tradeoff

The final signup trigger (`20260925013000_typed_school_signup.sql:28`) matches or creates schools from public signup metadata. The parent Worker flow does the same. Content RLS subsequently uses that `school_id` to authorize school-specific lessons. Someone who enters another school's name can be assigned that school without its confirmation.

This follows the user's later instruction to remove approval and accept typed names; it is not a reason to silently restore the rejected approval queue. It does mean school selection currently proves no affiliation. If school-specific material needs restricted enrollment, keep typed-name onboarding and introduce an explicit separate enrollment mechanism such as a school-issued code.

### 5. Account deletion can encounter restrictive foreign keys — medium

`content_items.author_id`, `content_revisions.changed_by`, and `audit_events.actor_id` reference profiles without `ON DELETE SET NULL` or a cascade (`202609220001_initial.sql:74`, `:79`, `:157`). Deleting an account with those references can therefore fail unless the manual operator handles them first. Parent consent/child-creation actions themselves create audit references.

Define and test a deliberate retention/anonymization/deletion sequence rather than assuming deleting an Auth user always removes the account cleanly.

### 6. PDF limits and storage accounting are inconsistent — medium

`StaffPages.tsx` accepts PDFs up to `20*1024*1024` bytes, while the Worker configuration and `asset_bytes` database constraint use 15,000,000 bytes. A file can pass the browser check, undergo extraction, create a draft, and then fail upload.

`worker/index.ts:44` also checks total tracked storage before upload without an atomic reservation. Concurrent uploads can exceed the 800 MB application ceiling. Replacement-deletion failures are only logged, and untracked/orphaned objects do not appear in the in-app total. A new replacement object temporarily coexists with the old object.

Align client/server limits, reserve capacity safely, and reconcile tracked sizes with actual bucket contents. The dashboard's 800 MB number is not a complete provider-storage guarantee.

### 7. Staff cannot finish the full assessment lifecycle in the UI — medium

`AuthoringPages.tsx` creates flashcards and quizzes, including drafts, but exposes no saved-assessment list, editor, or publish/unpublish controls for existing assessments. Worker routes likewise only expose creation for these types. Saving a draft is therefore a UI dead end unless an operator uses the database.

Add list/edit/publish workflows rather than requiring draft assessments to be recreated.

### 8. Problem hints and parent planning are partial — medium

The lesson viewer reads `hints`, but Content studio has no hint editor and its save payload omits hints. Seeded hints work; teachers cannot author them through the normal UI. Problem working is not persisted and receives no correctness check.

The original requirements included parent-created plans. The current planner operates on the signed-in student's ID, and plan insert/update/delete policies permit only that student. Parents have a read-only upcoming-plan report.

### 9. Guides and privacy copy describe earlier states — medium

- `START_HERE.md:3` says services are not connected, contrary to the later deployment record.
- `README.md:75` says SQL has never been executed against live Supabase, contrary to the later migration record.
- `README.md:33` says the configured origin is localhost, but both current Wrangler files specify the deployed frontend domain. Local preview will need a matching local Worker origin configuration.
- The guides prescribe Cloudflare Pages, while the recorded frontend URL is a static `workers.dev` deployment; the checked-in configuration does not fully document the final frontend deployment path.
- `PrivacyPage.tsx:3` still says Cloudflare stores private PDFs, although the implementation moved PDFs to Supabase Storage.
- `OPERATIONS.md:31` has a malformed 5,000-user table row with a missing AI-request value.
- The obsolete `school_requests` table/policies and related CSS remain, despite removal of the request/approval UI.

Update these as historical/current facts separately. Do not simply replace old unverified claims with new claims of complete production readiness.

### 10. Deployment and maintenance remain manual — medium

`npm run worker:deploy` uses the normal Wrangler source entry. Historical logs show Windows access failures and the later deployment used a bundled/manual upload route. There is a separate bundle config and deploy config, but no package scripts explaining that complete path. No Git history, CI configuration, or automatic backup/restore process is present in the authored project.

Much of the source is compressed into very long lines. This makes reviews, debugging, conflict resolution, and future modifications harder. The old Python scripts use exact text replacement and some remove source sections; rerunning them against current source is unsafe as a routine setup step.

## Pilot controls present in configuration

These are application settings inspected today, not a current provider-pricing or billing audit:

| Control | Configured value |
| --- | ---: |
| PDF maximum | 15,000,000 bytes |
| Tracked PDF storage ceiling | 800,000,000 bytes |
| Student authenticated Worker actions/day | 300 |
| Parent/staff authenticated Worker actions/day | 1,000 |
| Platform authenticated Worker actions/day | 90,000 |
| AI requests/student/day | 3 |
| AI requests/school/day | 100 |
| AI requests/platform/day | 100 |
| Database dashboard planning ceiling | 500,000,000 bytes |

The database ceiling is a displayed planning value, not an enforced database-write cap. The platform API counter covers authenticated Worker actions, not direct Supabase reads/writes, static requests, preflight, health, or rejected unauthenticated traffic. `ZERO_COST_MODE` controls the displayed mode flag; limits are still applied by their individual code paths. Provider bills and current free allowances were not independently audited today.

## Fresh verification on 22 October

| Check | Result |
| --- | --- |
| `npm run build` | Passed; 2,131 modules transformed |
| `npm run lint` | Passed |
| `npm run check:worker` | Passed |
| `npm test` | Six passed; three integration tests skipped |
| ZIP/current-source comparison | Ten compared files differ; two newer migrations absent |
| Frontend environment presence | Supabase URL, publishable key, API URL populated |
| Sample teaching artifact | Existing render inspected; explicitly labeled sample/test content |
| Live frontend/API health today | Unverified: web fetch unavailable and shell HTTPS blocked by socket permissions |
| Live authenticated signup, email, upload, consent, AI, tenant isolation | Not exercised today |

The build emitted a Node `module.register()` deprecation warning. It did not fail the checks. The lockfile uses format 3 and contains 539 package records; this review did not perform a dependency vulnerability audit.

Historical deployment addresses, recorded on 25 September:

- App: https://studysphere-app.satvikjee2526.workers.dev/login
- API health: https://studysphere-api.satvikjee2526.workers.dev/health

Historical account setup evidence says Groq key creation was attempted/succeeded earlier, but the final deployment message still says AI was disabled pending a configured key. Do not infer that a key existing in a provider account means it is installed in the deployed Worker. Brevo delivery is likewise not established by today's review.

## Suggested implementation order

1. Put the current working source under version control, preserve the present state, and make documentation/release packaging accurately reproducible.
2. Restore student Settings/privacy controls and define a tested deletion sequence.
3. Run the real tenant/onboarding/consent/publishing/PDF/quiz journeys against staging; add the missing meaningful tests.
4. Finish assessment lifecycle and problem-hint editing; align PDF limits and storage accounting.
5. Resolve the school-affiliation tradeoff explicitly with the product owner, without reinstating the removed approval workflow by assumption.
6. Complete parent planning if still required, staff invitation/password setup testing, operational backups, and the actual school curriculum.
7. Verify live email and optional AI configuration, then refresh the setup/operations guides and package the verified release.

The existing code is a credible pilot foundation. A complete production acceptance claim is not supported by the currently executed tests or the available operational evidence.

## First-party file inventory

Paths below are relative to `outputs/studysphere-ai/`. Generated output and local credentials are listed separately.

| File | Role |
| --- | --- |
| `.env.example` | Names of the three required frontend variables |
| `.gitignore` | Generated, environment and local-state exclusions |
| `OPERATIONS.md` | Launch, monitoring, backups, estimates and incident procedure |
| `README.md` | Architecture, setup, publishing, deployment, boundaries and launch gates |
| `START_HERE.md` | Short account/setup checklist |
| `ZERO_COST_PILOT.md` | Controlled-pilot setup, app limits and operating checks |
| `eslint.config.js` | Lint rules and generated-output exclusions |
| `index.html` | Browser entry, metadata and Google Fonts references |
| `package-lock.json` | Resolved package graph, lockfile format 3 |
| `package.json` | Pinned direct dependencies and npm commands |
| `sample-assets/fractions-sample.pdf` | One-page sample PDF for upload/view testing |
| `src/App.tsx` | Top-level routing, session protection, and role-specific routes |
| `src/authoring.css` | Page/component styling |
| `src/components/AppShell.tsx` | Role-based sidebar, mobile menu, identity display, logout |
| `src/components/Markdown.tsx` | Markdown, GFM, math and KaTeX rendering |
| `src/components/PdfViewer.tsx` | Authenticated PDF retrieval, page canvas, navigation and zoom |
| `src/components/Ui.tsx` | Shared buttons, fields, notices, loading and empty states |
| `src/context/AuthContext.tsx` | Session/user/profile loading and auth-change subscription |
| `src/hooks/useLoad.ts` | Reusable asynchronous loading/error/reload state |
| `src/lib/api.ts` | Supabase data helpers and authenticated Worker fetch |
| `src/lib/studyPlan.test.ts` | Three planner unit cases |
| `src/lib/studyPlan.ts` | Deterministic weekday/subject planning |
| `src/lib/supabase.ts` | Frontend Supabase configuration and client creation |
| `src/lib/types.ts` | Domain types |
| `src/main.tsx` | React entry point and global stylesheet imports |
| `src/maps.css` | Page/component styling |
| `src/pages/AuthPage.tsx` | Parent/student sign-in, signup and recovery request |
| `src/pages/AuthoringPages.tsx` | Curriculum/catalog authoring and assessment creation |
| `src/pages/ChildProgressPage.tsx` | Linked-child educational report |
| `src/pages/MapsPage.tsx` | Persisted node/edge canvas and JSON export |
| `src/pages/ParentPages.tsx` | Parent overview, child creation/consent, shared settings |
| `src/pages/PilotUsagePage.tsx` | Platform usage and configured ceilings |
| `src/pages/PlanPage.tsx` | Student task generation and editing |
| `src/pages/PrivacyPage.tsx` | Pilot data-use summary |
| `src/pages/PrivacyRequestsPage.tsx` | Manual privacy-request administration |
| `src/pages/ResetPasswordPage.tsx` | Recovery-session password change |
| `src/pages/StaffPages.tsx` | Staff dashboard, content studio, revisions, schools and invitations |
| `src/pages/StudentPages.tsx` | Student gate, dashboard, lessons, search, quizzes and flashcards |
| `src/pages/TutorPage.tsx` | Tutor chat, stored conversation and citations |
| `src/parent-report.css` | Page/component styling |
| `src/pilot.css` | Page/component styling |
| `src/plan.css` | Page/component styling |
| `src/search.css` | Page/component styling |
| `src/styles.css` | Page/component styling |
| `supabase/migrations/202609220001_initial.sql` | Initial schema, access policies, functions and catalog scaffold |
| `supabase/migrations/20260925005545_move_lesson_assets_to_supabase_storage.sql` | Tracked PDF asset-size column |
| `supabase/migrations/20260925013000_typed_school_signup.sql` | Normalized school-name matching and revised signup trigger |
| `supabase/seed.sql` | Clearly labeled fractions sample lesson/assessments |
| `tests/rls.integration.test.ts` | Three environment-gated live tenant/answer-column tests |
| `tsconfig.app.json` | TypeScript compiler/project configuration |
| `tsconfig.json` | TypeScript compiler/project configuration |
| `tsconfig.worker.json` | TypeScript compiler/project configuration |
| `vite.config.ts` | React frontend build/dev configuration |
| `vite.worker-bundle.config.ts` | Alternative standalone Worker bundle build |
| `worker/index.test.ts` | Three Worker origin/auth boundary tests |
| `worker/index.ts` | Worker authentication, role checks, quotas, storage, grading and admin endpoints |
| `wrangler.deploy.toml` | Prebundled Worker deployment workaround |
| `wrangler.toml` | Normal source-entry Worker deployment and public settings |

## Work scripts and generated material

All 23 Python files under `work/` were inspected as historical construction scripts. They should not be run as current installation steps.

| Script | Historical purpose |
| --- | --- |
| `add_ai_memory.py` | Added conversation ownership, recent context and persisted messages |
| `add_approval_routes.py` | Added the subsequently removed school-approval endpoints |
| `add_clear_route.py` | Added chat deletion routing |
| `add_usage_panel.py` | Wired staff AI usage reporting |
| `assign_subjects.py` | Restricted learner subject lists to assigned subjects |
| `auth_student_gate.py` | Earlier parent/guardian-only student onboarding interface |
| `catalog_ui.py` | Wired board and subject administration |
| `content_meta.py` | Added language, attribution and revision-history interface |
| `due_flashcards.py` | Filtered cards by saved review due dates |
| `extract_plan.py` | Moved planner out of the combined student page module |
| `finalize.py` | Earlier route, PDF, onboarding, seed and school-management adjustments |
| `fix_pdf_extract.py` | Removed duplicate/stale PDF extraction state handling |
| `fix_publish_pdf.py` | Restricted PDF publish payload to editable fields |
| `fix_staff.py` | School visibility selection and draft-before-upload publishing sequence |
| `fix_worker_routes.py` | Wired catalog, school and assessment creation routes |
| `make_sample_pdf.py` | Created the sample fractions PDF |
| `parent_reapprove.py` | Added restoration after guardian withdrawal |
| `recent_dashboard.py` | Added saved recent-topic activity to the student dashboard |
| `remove_old_maps.py` | Removed an earlier embedded maps implementation |
| `remove_old_tutor.py` | Removed an earlier embedded tutor implementation |
| `update_account_policy.py` | Changed UI from school approval to the Standards 1–5/6–10 split |
| `video_fallback.py` | Added attribution and fallback YouTube link |
| `zip_project.py` | Allowlist-based source ZIP packaging |

Other material:
- `outputs/studysphere-ai-source.zip`: earlier source release; drift documented above.
- `studysphere-dist.zip`: 79-entry compiled frontend archive, 1,633,554 bytes.
- `app-deploy-typed-school.zip`: 79-entry compiled frontend archive, 1,632,937 bytes.
- `dist/`: generated browser assets; refreshed by the build in this review.
- `worker-dist/worker-bundle.js`: generated Worker bundle from the deployment workaround; deployment parity not established today.
- `tsconfig.app.tsbuildinfo`: generated TypeScript incremental metadata.
- `.env.local`: local frontend configuration; variable names/presence checked, values omitted from this report.
- `.xdg/.wrangler/`: local provider configuration, metrics and ten deployment logs. Error summaries show the historical Windows access/bundling failures; sensitive configuration is excluded from this report.
- `work/dev.log`: historical Vite optimizer failure under Windows filesystem restrictions.
- `work/fractions_sample_render.png`: existing visual render of the sample PDF, inspected during this review.
- `node_modules/`, npm caches and `work/python/`: installed tooling/dependencies, not application authoring.
- `work/chrome-profile/` and `work/edge-profile/`: browser runtime state; not inspected as project content.
