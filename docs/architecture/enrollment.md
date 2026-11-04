# Verified school enrollment

Current rollout: the database upgrade was applied on 23 October and the compatible frontend/API release is deployed and smoke-tested on 29 October 2026. Authenticated hosted workflow acceptance remains pending; see the [upgrade record](../history/2026-10-23-hosted-upgrade.md) and [release evidence](../history/2026-10-29-cloudflare-release.md). Implementation-only statements below describe the original local milestone.

Implemented in source on 22 October 2026; local PostgreSQL tests pass. The database migration is now applied; live authenticated workflow/Storage acceptance remains pending. This first slice supports student membership across schools within the existing Standard 1–10 academic profile. It does not implement PUC, college programs, cohort assignment.

## Identity and access

`student_profiles.school_id` remains the historical typed signup label. It does not establish private material access or authorize the named school's staff to inspect the student's records. No verified enrollments are inferred from old labels.

`school_enrollments` stores accepted student/school relationships with active/revoked state and timestamps. It preserves a single row per student/school when a newly issued invitation restores access. This does not modify the student's account, guardian consent, assigned subjects or learning history. Multiple schools may enroll the same student; different academic profiles per institution are not supported yet.

[Guardian consent updates](guardian-consent.md) atomically pause/restore Standard 1–5 approval independently of these enrollment records. Restoring consent never reactivates revoked enrollment.

Published school material requires an active enrollment at an active school, an approved student account and the existing assigned-subject/topic checks. Global published content retains its previous subject/account rules. Staff content permissions still follow `memberships`; student enrollments grant no staff authority. The same `private.can_read_topic` predicate governs lessons, flashcards, quizzes, their questions and search results. The Worker checks caller-visible content before private PDF downloads and grading.

School admins get a dedicated minimal roster. They no longer gain direct access to a student's entire learning history from a typed school label. Cross-institution learning records do not yet have sufficient tenant provenance for that permission. Guardian and platform access remain unchanged. School summary counts use verified active enrollments; quiz counts use that school's quizzes, and topic counts cover its published topics. A topic completion does not prove the student learned from that school's material.

## Invitation flow

1. An administrator for the selected school, or a platform administrator, issues an invitation for a student's sign-in email.
2. The database creates a random 72-character code from two UUIDs and stores only its SHA-256 hash. The raw code is returned once. Issue/replace/accept/revoke operations serialize on the school row.
3. The administrator copies and shares the code through an institution-approved private channel. This feature sends no email and requires no email service integration. Existing staff email invitations remain a separate workflow.
4. A verified Standard 6–10 student accepts for their own account. For Standard 1–5, a verified linked parent with approved consent accepts for the approved child. Email matching uses the child's sign-in address, not the parent's address.
5. Acceptance consumes the invitation and creates/reactivates enrollment atomically. Wrong email, wrong actor, paused account, inactive school, expired, cancelled or reused code is rejected.

Invitations expire after seven days. Reissuing for the same school/email cancels prior unused codes. A school may create at most 500 invitations in a rolling day. The pilot roster returns the latest 200 enrollments and 200 open invitations, plus up to 200 staff memberships; pagination/search and long-term invitation retention are future work. Codes are not placed in URLs, browser storage or audit events. Keep codes and invite emails out of logs/screenshots containing real people.

## Revocation and retained information

An administrator confirms revocation in the roster. Enrollment becomes revoked and outstanding invitations for that school/current student email are cancelled. The accepted code is already consumed. Re-enrollment requires a new invitation. Account/consent/progress remain intact and other schools retain their independent enrollments.

New server reads for the revoked school's private resources are denied. PDF responses and viewer fetches request no browser storage. Material already delivered, screenshots, exports and in-flight requests cannot be remotely erased; this is not DRM. Global lessons and personal records remain accessible under their existing rules. There is no offline download/cache feature in this change.

## Staff access

Administrators also get a school-scoped staff roster. They can remove another staff member’s membership with confirmation while retaining the account, authored content and other schools’ memberships. Self-removal is blocked. An existing verified editor/school-admin account can be added or restored by email with a school-specific role; this cannot convert a student/parent or assign platform-admin privileges. Adding an existing member is rejected rather than silently changing their role. A newly granted school-admin membership promotes an editor’s global UI role where necessary, but authorization still checks the actual membership for each school.

New staff still use the existing **Schools & people** email invitation workflow; it needs hosted verification. These controls do not add a general user-directory lookup.

## Database contracts

The browser calls authenticated Supabase RPCs; no new Worker route or service-role credential is required. Functions use fixed search paths, server-side authorization and explicit grants. Invitation tables expose neither direct reads nor client writes. Enrollment tables permit scoped reads only.

| RPC | Arguments | Result |
| --- | --- | --- |
| `create_enrollment_invite` | `target_school`, `student_email` | `{id,code,expiresAt}` |
| `school_enrollment_roster` | `target_school` | `{enrollments,invitations}`; hashes/codes omitted |
| `cancel_enrollment_invite` | `target_school`, `invite_id` | void |
| `revoke_school_enrollment` | `target_school`, `target_student` | void |
| `accept_enrollment_invite` | `invite_code`, `target_student` | `{schoolId,schoolName}` |
| `my_school_enrollments` | none | Own/linked-child enrollment list |
| `revoke_school_staff` | `target_school`, `target_user` | void; school-specific removal, self-removal blocked |
| `add_existing_school_staff` | `target_school`, `staff_email`, `staff_role` | void; existing verified staff only, no student/parent conversion |

All mutations record audit events in the same database transaction. Invite failures do not consume a code. The frontend uses existing UI primitives and adds only enrollment-specific responsive CSS. Student/parent navigation adds **My schools**; administrator navigation adds **Student enrollment**.

## Migration and rollout

Apply [202610220001_verified_enrollment.sql](../../supabase/migrations/202610220001_verified_enrollment.sql) after the existing migrations. Old migrations are unchanged. Before a hosted rollout:

- Back up and inspect applied migrations, current content visibility and legitimate roster records; test the upgrade in staging.
- Agree a cutover with school administrators. Existing students keep accounts/progress but lose private school access until invitations are accepted. Do not bulk-verify typed school matches as a shortcut.
- Apply the migration and deploy compatible frontend/Worker together; distribute private invitations through the institution. Previously cached PDF responses from the prior release can persist for its former 60-second cache lifetime.
- Test real student/guardian sessions, direct database reads, quiz grading, search and private PDF reads before/after revocation, including another school's users and staff.
- Inspect custom deployed policies/functions: permissive extra policies can defeat the reviewed baseline. Do not infer staging behavior from this repository alone.

Recover a failed migration transaction without partial schema changes. After a successful cutover, preserve enrollment/audit records and fix forward. Restoring the earlier content predicate would reintroduce access based on unverified labels and is not a safe routine rollback.

## Remaining scope

Institution setup and staff email invitations already exist in source; hosted invitation delivery still needs follow-up. Cohort-controlled subject entitlements and server pagination remain open. Assessment editing/publication and result preservation are implemented locally; see the [assessment guide](assessments.md). Institution branding/contact settings are also [implemented locally](branding.md), independently of learning entitlements. Shared Settings/privacy controls and scoped aggregate usage are [implemented locally](account-operations.md), with hosted/operational acceptance pending. Existing AI school quota attribution still follows the legacy academic profile label; it is not a verified institutional billing model. This change enables no paid AI or commercial entitlement. See the [roadmap](../product/roadmap.md).
