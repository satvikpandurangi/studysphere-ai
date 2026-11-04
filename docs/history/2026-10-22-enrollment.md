# Verified enrollment implementation evidence

Local implementation, 22 October 2026. No hosted migration, service provisioning, paid API enablement or deployment performed.

## Delivered

- Forward migration separates student enrollment from signup's typed school label; no implied affiliation backfill.
- School/platform admins issue private seven-day email-bound invitation codes, cancel them, inspect a minimal student roster and explicitly confirm student access revocation.
- Students in Standards 6–10 accept for themselves; verified linked guardians accept for approved Standard 1–5 children. Invitation consumption and enrollment/audit writes are atomic.
- School-specific content, flashcards, quizzes, questions and search require active verified enrollment and assigned-subject/account access. Private PDF and grading routes retain caller checks. PDFs request no browser storage.
- Existing user IDs, profiles, subjects and learning records are preserved. Global material access follows existing rules. Institution admins no longer read a student's whole history from the claimed school label.
- Added school-specific staff roster/removal/restoration. Existing verified staff can be added by email; student/parent identities cannot be repurposed as staff. Other memberships, accounts and authored material are preserved.
- Existing design retained through the shared shell, forms, cards, buttons and responsive patterns. New routes are **Student enrollment** for administrators and **My schools** for students/parents.
- Added development-only PGlite to execute migration and RLS tests without a hosted database. It is not imported by the application.

## Verification

| Check | Evidence |
| --- | --- |
| Frontend build | `npm run build` passed |
| Lint | `npm run lint` passed |
| Worker TypeScript | `npm run check:worker` passed |
| Worker bundle | `npm run worker:bundle` passed |
| Documentation | `npm run docs:check` passed |
| Local tests | `npm test`: 23 passed; 3 existing hosted staging cases skipped without credentials |
| SQL tests | 15 PostgreSQL cases exercise the forward migration over populated prior schema, permissions, preservation, guardian policy, invitation lifecycle and revocation |
| PDF boundary tests | Authorized reads are no-store; denied caller visibility prevents privileged object retrieval |
| Browser UI | Desktop roster: school selection, private code creation, student revocation confirmation/status, staff removal and restoration. Guardian acceptance at a 390px iframe viewport: linked child selection, code input, success feedback. Real components/styles with synthetic service responses; no live accounts |

Preview harness/screenshots are local-only under `.local/enrollment-preview/`. The development preview optimizer encountered sandbox filesystem restrictions; the same fixture was production-built and served locally for browser checks. Product production build passed independently.

Node emitted the existing `module.register()` deprecation warning without failing checks. The dependency installer reported 25 audit findings (4 low, 2 moderate, 17 high, 2 critical) across the installed tree. This was not a full dependency security review, and no blanket/forced dependency upgrades were performed; triage before a hosted pilot remains required.

## Limits and next work

Hosted Auth email/token behavior, Storage, PostgREST and multi-session acceptance require staging tests. Existing staff email invitation/password setup is not newly verified; cohorts/assigned institutional subjects, pagination, branding and assessment lifecycle are still open. The roster shows the latest 200 enrollments and 200 open invitations; school invitation creation is capped at 500 per rolling day.

Before applying the migration to existing services, follow the [cutover guide](../architecture/enrollment.md). Existing users need invitations to retain private school content access; do not trust typed labels. Previously delivered material cannot be recalled. This is not a complete multi-program institutional model, an offline app, PUC/college support or a production-readiness claim.
