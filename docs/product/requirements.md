# Requirements and implementation status

Baseline: source reviewed 22 October 2026. **Implemented** means present in source, not necessarily proven in a live acceptance test. **Partial** means a material workflow is missing. **Planned** means the expanded product requires new implementation.

Hosted status, 29 October 2026: compatible frontend/API and seven reviewed forward upgrades are deployed. Synthetic rehearsal passed **37 workflow checks and 3 hosted boundary tests**, including quiz history, consent, revocation and private PDF transport. The second synthetic fixture was subsequently retired at the owner's request; one provisional school remains active. Real email/redirect delivery, full recovery, device acceptance and 1,500-concurrent capacity remain pending; uploads are paused again after testing. See the [authenticated evidence](../history/2026-10-29-authenticated-pilot.md). Capability status must not be read as full launch acceptance.

Current follow-up, 4 November 2026: owner-accepted student/new-parent link verification and earlier-parent password recovery (Inbox and correct identity); old parent fixture password is rejected. The one-school rehearsal passed 17 API/workflow checks, 14 deployed browser workflows and four role-screen smoke checks. These are bounded synthetic acceptance results, not school-scale capacity or complete device/curriculum approval. See [current evidence](../history/2026-11-04-recovery-and-school-pilot.md).

Delivery priority: [private institutional workspaces](institutional-launch.md), with the first school free and no founder investment (29 October owner revision). The target is **1,500 simultaneously active students**, Standards 1–10 with CBSE and Karnataka State Board (KSEEB); approved materials and actual capacity remain unverified. See the [release gates](../launch/first-school-readiness.md). Public enrollment and individual subscriptions are deferred. This decision does not change source capability status.

| Area | Status | Scope or acceptance needed |
| --- | --- | --- |
| Standards 1–10 curriculum structure | Implemented | Board → standard → subject → chapter → topic; starter catalogs are not a complete syllabus |
| Complete prescribed curriculum | Planned — required for school delivery | Owner selected 2026–27 English medium, CBSE/Karnataka Standards 1–10, every applicable subject/language/chapter/topic/activity. School language courses and authoritative inventories remain pending; 0/20 board-grade cells accepted. See [coverage register](../operations/curriculum-content.md). |
| Standards 11–12 / PUC 1–2 | Planned | Stage/year labels, streams, subject combinations, curriculum and complete onboarding |
| College learning | Planned | Institutions, programs, courses, academic terms and cohort enrollments |
| Standard 1–5 guardian accounts | Implemented locally | Verified parent creates child; versioned atomic consent withdrawal/restoration with retained progress; hosted synthetic creation, withdrawal/restoration, competing decisions and retained progress passed; child provisioning failure recovery remains a separate multi-request flow |
| Standard 6–10 independent signup | Implemented | Name/email/password plus typed school, board, standard and subjects |
| Link-first email confirmation | Deployed; controlled link/recovery accepted | Explicit confirmation button, fragment cleanup, mixed-callback protection and six-digit fallback; compatible frontend and template saved on 2 November. 148 local tests passed; student and new-parent link/dashboard acceptance and provider role/enrollment checks passed; controlled parent recovery passed on 4 November; fresh-template code/resend acceptance and school-scale delivery remain pending. |
| Email verification UX | Deployed; manual acceptance pending | Dedicated verification page after signup/unconfirmed sign-in, six-digit code entry, resend/cooldown, safe expired-link feedback and confirmed-session routing; compatible frontend and code email template are live, provider length 6 is saved, and parent email inbox receipt is confirmed; the fresh six-digit parent journey passed inbox/dashboard and provider-backed sign-in/role/access checks; Brevo SMTP and local callbacks are saved, and one real recovery message reached the owner's inbox; student link confirmation also passed on 2 November; new-parent fallback and resend acceptance remain pending; controlled parent recovery passed on 4 November. See [account flow](../architecture/account-operations.md#email-verification). |
| Institution-free public onboarding | Planned — deferred | Personal learner path without requiring school selection; define content entitlements |
| Typed school-name matching | Implemented | Normalizes and matches/creates records; does not establish verified affiliation |
| Organization memberships and enrollment | Partial | Verified student/school enrollments, email-bound invitation codes, guardian acceptance and revocation implemented in source; staff roster/removal/restoration also implemented; core hosted synthetic invitations/enrollment/revocation passed; cohort entitlements and real invitation email remain open |
| Roles | Implemented | Parent, student, editor, school admin, platform admin; college/institution role mapping requires design |
| Markdown/PDF/video lessons | Implemented | PDF files are private in Supabase Storage; publishing updates backend content |
| PDF upload/storage reliability | Implemented locally | Effective 15,000,000-byte maximum, bounded uploads, locked capacity ledger, safe replacement/detachment and cleanup/inventory review; bounded hosted upload/read/revocation/replacement rejection passed; full concurrency, provider failure and cleanup acceptance pending |
| Problem authoring | Partial | Ordered teacher hint editing/previews and learner hint/explanation display implemented locally; student working is temporary and explicitly labeled; persisted working and grading/feedback remain open |
| Assessment lifecycle | Deployed; controlled pilot passed | School/topic lists, draft editing, revised immutable editions and transactional publish/unpublish; core hosted, stale draft-edit and deployed teacher/learner browser checks passed; synchronized publication/grading workload and full target-device acceptance remain pending |
| Quiz grading | Deployed; controlled pilot passed | Caller-authorized atomic SQL grading through Worker; immutable edition/snapshot history and protected answer columns; hosted Worker grading/history/column-denial checks passed; synchronized grading load remains untested |
| Flashcard review | Implemented | Published due queue, fixed review intervals and saved reviews; revised editions keep old reviews and start fresh |
| Student planner | Implemented | Manual tasks and deterministic generation, edit/delete/complete |
| Parent-created child plans | Planned | Parent report currently reads plans; planner writes are student-only |
| Mind maps | Implemented | Single general canvas, autosave, JSON export |
| Search | Partial | English full-text search scoped by access; advanced filters and multilingual tuning absent |
| Optional grounded tutor | Implemented | Groq request path, excerpts, citations, history, quotas; deployed key status unverified |
| AI-generated study aids | Planned | Dedicated draft/review workflows for cards/quizzes; no silent replacement of teacher content |
| Parent reporting | Implemented | Linked children's subjects, recent completions, quizzes and upcoming plans |
| Institution roster/reporting | Partial | Admin student/staff roster, student invitations/revocation, staff access removal/restoration and verified summary counts implemented; latest 200 rows, no cohort management or tenant-specific individual learning reports |
| Account/privacy controls | Implemented locally; fulfillment manual | Shared Settings, recovery/global sign-out, verified self/guardian requests/status, deduplication/review and deletion preflight; controlled recovery/password sign-in passed; broader session/privacy fulfillment and real-user acceptance remain pending |
| Deletion dependency handling | Implemented locally | Attribution nulling and guardian guard tested; retained snapshots/invites/backups need approved operator handling; no automatic account deletion |
| Usage monitoring | Implemented locally | School-admin aggregates, exact platform counters, refresh/warnings and privacy backlog; provider-cost reconciliation and hosted acceptance pending |
| Institution branding | Implemented locally | Display name, bounded raster logo, colors, contacts and preview/save/reset; no member branding selector. A sole verified school applies automatically, with neutral fallback for ambiguous/platform accounts; local role/navigation tests passed, hosted UI acceptance pending |
| Institution material/feature configuration | Planned | Approved material and agreed feature entitlements; shared/dedicated deployment model undecided |
| SaaS plans/billing | Planned | First partnership is free; agree zero-cash operating limits, support and entitlements. Later commercial terms remain undecided; public subscriptions/automated checkout deferred |
| Public marketing/support | Planned | Institutional support and onboarding needed first; broad public discovery deferred |
| Tenant isolation | Partial verification | RLS/local tests exist; three hosted boundary cases passed with positive controls before the second synthetic fixture was retired. One-school follow-up passed; fresh broad gate remains pending with cleared retired-fixture inputs |
| Release operations | Partial | Application snapshot recovery and six hosted upgrades verified; compatible deployment/live smoke verified; full provider/Auth restore, monitoring and authenticated acceptance remain open |

Verified enrollment details and cutover limits are in the [enrollment guide](../architecture/enrollment.md). School-specific material now requires verified enrollment; typed signup labels are preserved without granting that access. Existing Standard 1–5 guardian / Standard 6–10 independent registration remains unchanged. Local tests are not hosted acceptance.

The [assessment guide](../architecture/assessments.md) defines immutable editions, learner history, answer-key boundaries and rollout. Practice feedback is visible after a valid submission; this is not a proctored-exam system.

## Existing account policy

Keep the user's accepted Standard 1–5 guardian / Standard 6–10 independent account split. Keep school approval removed. Do not extrapolate either rule to Standards 11–12 / PUC or colleges without an explicit product decision. A program's year is not a reliable substitute for a learner's age or institutional access entitlement.

## Acceptance paths for the institutional pilot and future SaaS

- Deferred public path: learner signs up without inventing a school, gets permitted material, saves progress, and uses account/privacy controls.
- Parent creates an eligible child, sees progress and can pause learning access.
- Institution invites staff, verifies enrollment, assigns material to the right cohort, and revokes access without exposing another tenant's records.
- Institution receives its agreed identity/material/configuration and completes core learning flows with AI unavailable; AI is enabled only against an explicitly funded allowance.
- Higher-secondary learner selects board/program label, year, stream and valid subjects; both Standard and PUC naming remain coherent.
- College learner selects an enrolled program/course and term, studies assigned content and records progress across terms.
- Operator can handle account/support requests and execute a tested backup/restore procedure.

Each path needs database, API, UI and access-control verification before its status becomes launch ready.
