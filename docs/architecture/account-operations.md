# Account controls and pilot operations

Current rollout: the database upgrade was applied on 23 October and the compatible frontend/API release is deployed and smoke-tested on 29 October 2026. Authenticated hosted workflow acceptance remains pending; see the [upgrade record](../history/2026-10-23-hosted-upgrade.md) and [release evidence](../history/2026-10-29-cloudflare-release.md). Implementation-only statements below describe the original local milestone.

Implemented locally on 22 October 2026; hosted migration/Auth/PostgREST/Storage and actual pilot acceptance remain pending. Apply [202610220004_account_operations.sql](../../supabase/migrations/202610220004_account_operations.sql) after the preceding migrations. No paid service is provisioned.

## Email verification

The source frontend routes successful signups without a confirmed session and sign-in errors with Auth code `email_not_confirmed` to `/verify-email`. Confirmed sessions continue to `/app`; the protected layout also rejects unconfirmed sessions. The verification page keeps the existing authentication design and provides an editable email address, resend, a 60-second local cooldown, expired-link guidance and a return-to-sign-in link. Passwords are cleared before navigation and never included in router state or URLs. The Supabase browser client handles successful confirmation sessions; the UI does not parse or store callback tokens itself.

A successful signup/resend response does **not** prove a new account or delivered email. Supabase may deliberately obscure repeated signup for an existing account. The page uses generic wording and provides no public account-existence lookup. Only the explicit unconfirmed-email error triggers the sign-in redirect; invalid credentials remain a sign-in error. Email confirmation stays enabled, and existing accounts are not reset or auto-confirmed.

Configure the exact frontend `/verify-email` callback in Supabase Auth redirect URLs before testing that origin, alongside `/reset-password`. The hosted origin and both exact local callbacks (`http://127.0.0.1:5173/verify-email` and `http://127.0.0.1:5173/reset-password`) are now saved. Unapproved callbacks can fall back to the Auth Site URL, which does not prove a local return path. Keep production Site URL on the hosted frontend, and do not add unrestricted wildcard origins.

On 29 October, the account reported as missing mail was already confirmed; scoped Auth evidence showed repeated signup rather than a newly delivered confirmation. No account data or credentials were changed. Custom SMTP was still disabled. Supabase's default sender is restricted to project-team addresses and is unsuitable for school onboarding; configure an approved sender and test an actual inbox, confirmation, resend, expiration and recovery before accepting delivery. Local UI tests cannot certify SMTP. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp) and [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

On 29 October, a fresh status check confirmed StudySphere (`flsckscpvqqyyqvsyjwp`) was `ACTIVE_HEALTHY`, while the freeze notice named the separate inactive Tanvo project (`ffyzsfieulmrwsjmulqc`). The SMTP dashboard still showed custom SMTP disabled, and the reported account was already verified. The owner confirmed there is no domain or email provider yet. No provider account, paid plan, SMTP credential or project restoration was created by this diagnosis. See the [email setup handover](../operations/email-delivery.md).

The owner subsequently configured Brevo SMTP and saved both exact local callbacks on 29 October. One explicitly approved recovery message was accepted by Auth, reported delivered by Brevo and confirmed in the owner's inbox at approximately 17:57 IST. No password was changed by the assistant; new-signup verification and full reset/resend journeys remain unaccepted. See the updated [delivery evidence](../operations/email-delivery.md).

The deployed verification page additionally supports six-digit signup codes with the caller's email and `auth.verifyOtp({ type: 'email' })`. Code entry, resend and loading/error states preserve the existing design and never bypass provider confirmation. The compatible frontend was published before the shared code-only email template was saved on 30 October. Owner inbox receipt is confirmed; provider Email OTP length is now saved at 6 to match the form, and one fresh approved parent dispatch was accepted at 00:58 IST. The owner reached the parent dashboard; provider checks confirmed email verification, successful sign-in, parent role and no institution entitlement. Student confirmation and full recovery remain pending. See the [parent link diagnosis and rollout status](../operations/email-delivery.md#parent-link-failure-and-code-based-fallback--30-october-2026).

## Account Settings

All roles, including students, have `/app/settings` and sidebar navigation. The shared page supports full-name updates (existing self-only profile permissions), a password-recovery email request, global sign-out and privacy requests/status. Email changes, role changes, curriculum changes and guardian consent are not managed here. Guardian consent remains in **My children**.

Guardian withdrawal/restoration now uses a separate [atomic, versioned transaction](guardian-consent.md). Privacy requests remain available to eligible guardians after withdrawal; submitting one does not change consent or verified enrollment.

Recovery uses the existing Supabase recovery flow and `/reset-password`. Configure that redirect in hosted Auth; a successful SDK request does not prove delivery. Global sign-out revokes refresh sessions through Auth, while previously issued access tokens can remain usable until expiry. Test actual provider sessions before launch; this is not immediate forced access-token invalidation.

Verified Standard 6–10 students request their own data. Verified parents can request for themselves or a linked Standard 1–5 child. The relationship remains sufficient for privacy requests after learning consent is withdrawn; it grants no learning-access restoration. A guardian link to an older learner does not grant this new request authority. Standard 1–5 learners are directed to their guardian. Paused independent learners can still request their own records. Unverified callers cannot submit a new request.

The Settings page uses caller-authorized database RPCs directly so Worker learning quotas do not block privacy requests. The legacy Worker request route delegates to the same function and retains its normal Worker quota handling. An open request for the same subject/kind/requester is returned rather than duplicated; requests by different guardians stay separate. Legacy duplicates remain intact and legacy requester IDs are backfilled from the subject. Latest 100 requests for the caller's account or submitted by them are displayed; this is not a full export.

Request submission does not export data, delete an account, pause learning, or guarantee a response time. The operator must verify the request, fulfill it securely and apply the approved policy. The UI confirms deletion *requests*, not irreversible deletion. No real account is deleted by this feature.

## Privacy review and deletion

Platform administrators review open requests (latest 100 in the existing Worker list). An export must move to `in_review` before it can be marked `fulfilled`, with explicit confirmation that delivery occurred. The database updates status/reviewer/timestamp and records an audit event atomically. Deletion requests remain in review until the operator handles the account; their subject-owned request rows cascade on account deletion.

The deletion preflight button returns counts for linked children, memberships, authored content, revision/audit attributions, invitations matching the current Auth email, and personal quiz attempts. It is an informative snapshot, not a complete data inventory or approval. It returns no invitation email/code, learning answers or private conversation text.

The migration changes four restrictive attribution foreign keys to `ON DELETE SET NULL`: content author, revision editor, audit actor and historical school-request reviewer. Authored institution content and audit events remain; personal rows retain their existing cascading relationships. A guardian profile cannot be deleted while any guardian links remain. Resolve each linked child under the approved policy first; do not remove links merely to bypass the guard. Local tests verify a blocked guardian deletion, deliberate synthetic child-then-parent cleanup and preserved staff content/audit records. Hosted Auth deletion needs its own rehearsal.

**This is not complete anonymization.** Content revision snapshots, audit target text, institution materials, invite email records, provider logs/backups and externally delivered copies can retain identifiers. Auth/profile deletion alone does not clean them. An attribution update can create a content revision through the existing revision trigger. Never promise total erasure from these foreign-key changes. Follow the operator sequence in the [runbook](../operations/runbook.md) and record institution handover/retention decisions before any irreversible provider action.

## Usage monitoring

School admins see only aggregate totals for institutions they actually administer: active approved enrollment rows, staff memberships, draft/published material items, published quiz/card editions and tracked PDF bytes. A typed school label, editor role or selected sidebar brand grants no authority. Multiple-school selection is explicit; students/parents cannot call the usage RPC. No individual learning history or cross-tenant account totals are returned. Enrollment counts describe row/account status, not daily activity or a seat invoice; an inactive school's retained rows can still be counted for its administrators.

Platform **Pilot usage** retains the existing metric-card design and adds manual refresh, UTC measurement timestamps, privacy-request backlog and accurate counter labels. Aggregation occurs in SQL, avoiding Data API row-limit undercounting. AI reservations come from the persistent platform daily quota row, including reservations for subsequently deleted students; recorded token totals sum remaining student usage rows. Tokens are not a provider invoice and can exclude failed calls/unrecorded usage/deleted rows. PDF size is tracked metadata, not actual object inventory or egress. Database size is measured against the existing 500 MB planning ceiling, which does not enforce every write.

The platform-only authenticated `GET /pilot/usage` skips Worker quota reservation so monitoring remains accessible when that quota is exhausted. The later [PDF ledger](pdf-storage.md) adds the same exemption for platform `GET /assets/storage`. Both require authentication, platform role and origin checks; mutations retain quota handling. Direct Supabase requests, static traffic and these monitoring reads are outside that API counter. The legacy zero-cost flag is displayed only as a setting, not a billing guarantee. AI key presence is reported only to the platform admin and does not prove provider health or a funded allowance. No external monitoring/AI service or background dashboard polling is added.

## RPC contracts

| RPC | Arguments | Result/access |
| --- | --- | --- |
| `account_privacy_overview` | none | Own request eligibility, eligible linked children, latest 100 own/submitted requests |
| `request_account_privacy` | `request_kind`, optional `target_user` (defaults caller) | `{id,status,existing}`; verified eligible self/guardian |
| `review_account_privacy` | `request_id`, `new_status`, optional `export_delivered` | void; platform admin, transactional transition/audit |
| `account_deletion_preflight` | `target_user` | Dependency counts; platform admin only |
| `institution_usage` | `target_school` | Aggregate institution snapshot; actual school/platform admin |
| `platform_usage_snapshot` | none | Exact SQL platform aggregates and UTC timestamp/day; platform admin only |

Functions use fixed search paths and explicit authenticated grants with internal authorization. Anonymous callers cannot execute them. Request rows remain readable only by their subject, requester or platform administrator; clients have no direct request write grants. New reviewer/requester foreign keys null on deletion of those attribution accounts. Existing request status/history is preserved.

Back up and rehearse the forward migration in staging with deployed privileges/default grants inspected. Deploy compatible Worker/frontend after migration. Rolling back frontend/Worker code can reintroduce the old manual request behavior; fix forward, preserve new records and do not rewrite older migrations. Use [pilot acceptance](../launch/pilot-acceptance.md) to record evidence; local passes are not launch approval.

## Link-first signup confirmation (2 November 2026)

The existing verification page now supports an explicit link-confirmation action with six-digit fallback. A bounded fragment token is scrubbed from history and exchanged only on button activation. Mixed legacy/custom credentials cannot trigger SDK URL auto-authentication. Ordinary recovery callbacks remain separate. Compatible frontend and template were published on 2 November; student link/dashboard and provider-backed role/enrollment acceptance passed; new-parent fallback and recovery remain pending; see the [delivery guide](../operations/email-delivery.md).

## Recovery-session repair (source, 2 November 2026)

After a real expired recovery callback exposed an ungated password form, source now requires verified recovery before password entry. Custom recovery links/codes use an isolated nonpersistent client; legacy callbacks require observed PASSWORD_RECOVERY intent. New callbacks and stale responses cannot reuse the previous target. Refresh loses the in-memory authorization and requires renewed verification. The separate recovery email template and compatible frontend await rollout; full recovery remains unaccepted.
