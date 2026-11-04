# Database and migration guide

## Current migrations

| File | Purpose |
| --- | --- |
| `202609220001_initial.sql` | 31 tables, role/approval/content enums, RLS, grants, triggers, search, quotas, reporting and starter catalog |
| `20260925005545_move_lesson_assets_to_supabase_storage.sql` | Tracks PDF byte sizes on content items |
| `20260925013000_typed_school_signup.sql` | Normalized unique school names and typed-name independent signup |
| `202610220001_verified_enrollment.sql` | Separate verified enrollments, expiring invitation codes, roster RPCs, private-content access and summary corrections; no trust backfill from typed labels |
| `202610220002_assessment_lifecycle.sql` | Quiz/card editions, protected published content, atomic draft/publication RPCs and grading/result snapshots; retains old attempts/reviews |
| `202610220003_institution_branding.sql` | Private institution presentation/contact settings, authorized workspace listing, validated versioned saves and audit events |
| `202610220004_account_operations.sql` | Verified self/guardian privacy RPCs, review/preflight, attribution deletion rules/guardian guard and exact scoped usage aggregates |
| `202610220005_pdf_storage_ledger.sql` | Private PDF policy/ledger, service-role storage transactions, safe cleanup and operator inventory review; uploads begin paused |
| `202610220006_atomic_guardian_consent.sql` | Caller-authorized atomic guardian/student approval and audit changes, shared consent versions and guards against legacy split writes |
| `20261028232250_pdf_singleton_safe_updates.sql` | Explicit singleton predicates for hosted safe-update protection; preserves grants/data and leaves uploads paused until reviewed |

Hosted status on 29 October 2026: the six earlier forward upgrades and PDF singleton fix are applied. The new source version `20261028232250` maps to hosted `20261028232356` (`pdf_singleton_safe_updates`); see the [authenticated rehearsal](../history/2026-10-29-authenticated-pilot.md). Core synthetic workflows passed; full release acceptance remains pending. The migration service generated different hosted version IDs, and the historical baseline had no tracker entries. Read the [version mapping and recovery evidence](../history/2026-10-23-hosted-upgrade.md) before using CLI push.

Files live in [supabase/migrations](../../supabase/migrations/). Apply in filename order to a **fresh** project. The initial migration is not a rerunnable incremental upgrade script. Existing services must be inspected for applied schema before applying any change. Never rerun the initial schema against a deployed database to catch it up.

The private Storage bucket is a separate provider configuration; these SQL files do not create it.

## Main data groups

| Group | Tables |
| --- | --- |
| Identity and institutions | `profiles`, `schools`, `memberships`, `student_profiles`, `student_subjects`, `guardian_links` |
| Curriculum | `boards`, `grades`, `subjects`, `chapters`, `topics` |
| Published material | `content_items`, `content_revisions`, `flashcards`, `quizzes`, `quiz_questions` |
| Learning records | `flashcard_reviews`, `quiz_attempts`, `topic_progress`, `plan_items`, `mind_maps` |
| AI | `ai_conversations`, `ai_messages`, `ai_usage`, `ai_platform_daily`, `ai_school_daily` |
| Operations | `api_usage`, `api_platform_daily`, `privacy_requests`, `audit_events` |
| Legacy | `school_requests` remains in schema; the approval/request UI was removed |
| Verified student membership | `school_enrollments`, `school_enrollment_invites`; see [access and rollout](enrollment.md) |
| Institution presentation | `institution_branding`; RPC-only member reads/admin writes, see [branding guide](branding.md) |
| Private PDF operations | `pdf_storage_policy`, `pdf_asset_objects`; service-only transactions and initial inventory review, see [storage guide](pdf-storage.md) |

`parent_children_overview` is an invoker-security reporting view. Search runs with caller permissions; quota/privileged routines have restricted execution grants.

Assessment metadata and attempt snapshot columns are described in the [assessment guide](assessments.md). Published rows are retained as immutable editions; do not bypass their guards to perform in-place edits.

## Seed and constraints

[seed.sql](../../supabase/seed.sql) contains clearly marked fractions examples for Standard 6 Karnataka Mathematics. The initial migration supplies three boards, Standards 1–10 and four generic subjects per board/standard. Neither is a licensed complete teaching curriculum.

The grade constraint is currently 1–10. Higher-secondary streams/PUC and college programs do not exist in the schema. Plan a forward migration with compatibility/backfill before changing onboarding. The [account operations guide](account-operations.md) defines attribution retention/nulling, the guardian deletion guard and remaining operator privacy work. [Consent updates](guardian-consent.md) are transactional and versioned; child provisioning still spans Auth and database requests.

## Rules for future migrations

Create a new timestamped SQL file for each coherent change. Test against both a fresh installation and a copy of the prior schema. Include access-policy/grant changes and backfills where necessary. Preserve IDs and learning records. Document rollback or recovery; destructive schema rollback is not assumed safe. Do not store production dumps or real student records in the repository.
