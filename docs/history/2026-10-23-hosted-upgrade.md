# Hosted upgrade — 23 October 2026

**Subsequent delivery:** the compatible frontend/API release is now deployed and smoke-tested; see [29 October release evidence](2026-10-29-cloudflare-release.md). Authenticated pilot acceptance remains pending.

Applied the six reviewed forward migrations to the owner-selected Supabase project `flsckscpvqqyyqvsyjwp` using the connected Supabase integration. The initial schema was not rerun. Existing application records were preserved; this is database rollout evidence, not complete pilot acceptance or frontend/API deployment.

## Backup and recovery evidence

With explicit owner approval for the private data export, captured all 31 application tables, 152 rows, schema/catalog definitions, grants, Auth user IDs for foreign-key validation and private Storage bucket metadata. No Auth passwords or session tokens were exported. The bucket contained no objects. Private files and checksums are retained under ignored `.local/backups/flsckscpvqqyyqvsyjwp/2026-10-23-application/`; they are excluded from source packages.

Restored all application rows into local PostgreSQL through PGlite with foreign-key checks enabled. All 31 per-table fingerprints matched the live database. Compared relations, columns/nullability, constraints, indexes, policies, triggers, views, enums and client table/column grants with the observed hosted baseline. PostgreSQL 18's separate NOT NULL constraint records were excluded from the constraint-list comparison; nullability was checked through column flags against hosted PostgreSQL 17. Rehearsed all six forward files against the recovered data, confirming every original column value remained unchanged.

This is an application recovery snapshot, **not a full provider/Auth disaster-recovery backup**. Local Auth rows are ID stubs only; provider-managed Auth tables, credentials, sessions, service configuration and physical file recovery are outside its tested scope. Routine full logical backup/restore remains operational work. The native session pooler still times out; the alternate pooler reaches verified TLS with Supabase's database CA but rejects the supplied database password. The HTTPS integration removes that credential dependency for the completed application upgrade; no password was reset and no TLS checks were disabled.

## Applied migrations

The migration service generated the hosted versions below. Source files retain their reviewed filenames and contents. An initial declined write request made no changes; after the owner's explicit instruction to migrate, all six calls returned success and migration history confirmed them.

| Source file | Hosted version | Name |
| --- | --- | --- |
| `202610220001_verified_enrollment.sql` | `20261022201356` | `verified_enrollment` |
| `202610220002_assessment_lifecycle.sql` | `20261022201500` | `assessment_lifecycle` |
| `202610220003_institution_branding.sql` | `20261022201507` | `institution_branding` |
| `202610220004_account_operations.sql` | `20261022201518` | `account_operations` |
| `202610220005_pdf_storage_ledger.sql` | `20261022201531` | `pdf_storage_ledger` |
| `202610220006_atomic_guardian_consent.sql` | `20261022201539` | `atomic_guardian_consent` |

The three historical migrations were already represented by the inspected schema but had no migration-history entries. **Do not run an unreviewed `supabase db push` against this project.** Reconcile the existing baseline and the source/hosted version mapping before adopting a CLI push workflow; an absent source version in the tracker is not an unapplied schema change. Do not rewrite or rerun the applied source files.

The first migration held application write locks and checked all baseline data fingerprints before changing schema. Subsequent migrations ran in order through the migration service, with lock/statement timeouts and service-managed transactions; only the files' outer transaction wrappers were omitted from the submitted SQL.

## Hosted verification

- All original column-value fingerprints still match across the 31 tables, including the three profiles and one saved map. Existing privacy-request attribution was backfilled; student consent versions are 1.
- No typed-school enrollments were inferred: the new enrollment table is empty. There were no staff memberships, guardian links or content/PDF references in the inspected baseline.
- Every public application table has RLS enabled. Authenticated users have SELECT on quiz prompt columns, but lack SELECT on correct answers and explanations. Direct authenticated reads of invitation, branding and PDF-policy tables are denied.
- New authenticated RPCs deny anonymous execution; PDF reservation/state RPCs are service-role-only. These grant checks do not replace testing authorization inside the RPCs with real caller sessions.
- Four live anonymous PostgREST checks returned HTTP 401 / PostgreSQL `42501` for enrollment/privacy RPCs and invitation/PDF-policy tables. The new routes resolve in the API cache. No requests mutated data.
- PDF uploads remain paused, with inventory review unset and an empty ledger/bucket. Uploads must stay paused until the operator follows the [storage cutover](../architecture/pdf-storage.md).

Security advisors were run before and after rollout. RLS-without-policy notices on deliberately RPC/service-only tables are expected; adding broad client policies would weaken their boundary. Authenticated SECURITY DEFINER RPC notices require ongoing review of their explicit caller checks. The pre-existing provider-created `public.rls_auto_enable()` helper still has public execution grants ([advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)); review and restrict it through a separate forward change. Leaked-password protection is disabled ([provider guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)); provider configuration remains to be reviewed before launch. This is not a clean-advisory or launch-ready claim.

## Next delivery step

Deploy compatible frontend and Worker code, then provision synthetic identities and complete authenticated tenant/assessment/consent/Storage acceptance. Cloudflare CLI reports unauthenticated; no frontend/API deployment was performed. No synthetic users were created and the three hosted boundary tests remain unconfigured. Do not resume the old consent writer or uploader as a substitute for deploying the compatible code. Keep AI optional and uploads paused until their separate gates pass. See the [staging guide](../launch/staging-verification.md) and [roadmap](../product/roadmap.md).
