# Guardian consent changes

Current rollout: the database upgrade was applied on 23 October and the compatible frontend/API release is deployed and smoke-tested on 29 October 2026. Authenticated hosted workflow acceptance remains pending; see the [upgrade record](../history/2026-10-23-hosted-upgrade.md) and [release evidence](../history/2026-10-29-cloudflare-release.md). Implementation-only statements below describe the original local milestone.

Implemented in source and tested locally. Hosted Auth/PostgREST, simultaneous sessions and real device acceptance remain pending. Apply [202610220006_atomic_guardian_consent.sql](../../supabase/migrations/202610220006_atomic_guardian_consent.sql) after the preceding migrations.

## Current behavior

A verified parent linked to a Standard 1–5 student can withdraw or restore approval in **My children**. The existing Standard 6–10 independent-account policy remains unchanged; historical links to older learners do not grant consent authority. School staff and platform administrators cannot use this parent operation.

`change_guardian_consent(target_student uuid, new_status text, expected_version integer)` runs with caller identity through an authenticated RPC. It checks verified Auth email, stored parent/student roles, the actual guardian link and Standard 1–5 grade. Only `approved` and `withdrawn` are accepted. The Worker forwards the parent's JWT through `a.client`, without accepting an actor ID or using service-role writes for the change.

The function locks the student row and then the caller's guardian link. All guardians for the same child share the student row's `consent_version`. It checks the supplied version after acquiring the locks and commits the guardian status/timestamp, student approval status/timestamp, incremented version and audit event in one transaction. Any failure rolls everything back. A same-version request already matching both records/timestamps is a no-op and creates no duplicate audit event. An old version always requires reload, even if its requested status now matches.

The response is `{status, consentVersion, changed}`. `parent_children_overview` keeps its existing invoker-security behavior and appends `consent_version`. The frontend sends `expectedVersion`, disables approval actions during a request and reloads the saved overview after success or failure. A network failure can hide a committed result; reload resolves the current state before another decision. Old clients missing a version receive an explicit reload error.

The migration preserves existing decisions and timestamps, including legacy partial writes; it does not infer approval from inconsistent data. An explicit authorized request updates both relevant rows. Existing records receive version 1 without changing their learning history. Guards reject separate status/timestamp/version updates by ordinary clients and the service role, including older Worker code. Trusted database-owner maintenance remains possible and must be reviewed; it is not an ordinary consent path. Existing child-creation inserts remain compatible.

## Access and retained records

Withdrawal pauses new protected lesson/PDF-pointer reads, search results, quiz submission, flashcard review and topic-progress writes through the existing approval/access predicates. Restoration enables only content still permitted by subjects, publication and verified active institution enrollment. It does not restore revoked school access or create enrollments.

Progress, attempts, card reviews, plans, maps, subjects, memberships and personal history are retained. Guardian reporting and eligible privacy requests remain available. Existing personal planner/map policies are unchanged; withdrawal is a pause on protected learning access, not account deletion or universal denial of every personal-data route. PDFs already delivered to a device cannot be remotely erased; requests already in flight can complete under their existing database snapshot. Test new requests after the withdrawal transaction commits.

Multiple guardian links retain their existing behavior: an eligible linked guardian updates their own link and the student's overall approval. This change adds serialization and stale-decision rejection; it does not add a consensus rule or synchronize other guardians' link statuses. A new multi-guardian policy requires a separate product decision.

## Rollout and recovery

1. Back up and inspect applied migrations and deployed grants. Rehearse the upgrade with approved, withdrawn and legacy inconsistent records in synthetic staging.
2. Pause consent-changing traffic, apply the forward migration and deploy the matching Worker/frontend. Old separate service writes fail closed after migration. Resume only after the updated flow passes; do not disable guards to keep the old Worker running.
3. Refresh parent pages and verify versions, withdrawal/restoration, stale tabs, unverified/unrelated callers and failures. Test new private PDF reads, search, quizzes, card reviews and progress writes before/after withdrawal and restoration, including independently revoked enrollment.
4. Exercise competing requests through distinct hosted sessions. Local PGlite tests check ordered stale decisions and rollback; its single connection does not prove real lock scheduling or provider JWT behavior.

On request failure, reload before retrying. On migration/deployment failure, preserve decisions and audit history, keep consent writes unavailable and fix forward. A code rollback to the old multi-request handler is not a safe recovery. Inspect legacy inconsistencies with authorized operational access; do not bulk approve children to clear a mismatch.

Child-account provisioning still spans Auth creation and database inserts with compensating deletion on error. Making that separate workflow atomic/recoverable is outside this consent-update change. No hosted migration or deployment is implied by local verification. See [testing evidence](../development/testing.md) and the [pilot acceptance ledger](../launch/pilot-acceptance.md).
