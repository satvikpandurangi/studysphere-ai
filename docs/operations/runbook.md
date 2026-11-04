# Operating runbook

## Student enrollment and private access

School/platform administrators use **Student enrollment** to issue an email-bound invitation code, inspect the verified roster, cancel open invitations or revoke student access. Share codes privately; the platform does not send student invitation emails. Students/parents use **My schools**; a guardian accepts for Standards 1–5. Existing staff invitations remain in **Schools & people**. The roster also lists staff: remove school-specific access with confirmation or add an existing verified staff account by email. New staff still use the email invitation flow. Self-removal is blocked; other school memberships and authored material remain.

School-name labels from signup grant no private access. Before applying the new migration, follow the [enrollment cutover guide](../architecture/enrollment.md); legitimate existing learners need invitations. Do not bulk-enroll based on typed school matches. A revoked student retains their account/progress and other valid memberships. New private reads are denied; previously delivered resources cannot be erased remotely.

## Guardian approval changes

Verified parents use **My children** to withdraw or restore Standard 1–5 approval. Saved progress remains; restoration grants only still-permitted learning access. The status/link/audit transaction uses the displayed consent version. If another decision intervenes or a network/save error occurs, reload the overview before retrying. Never issue separate service-role updates to either status: the migration guards reject them. Follow the [consent rollout and recovery guide](../architecture/guardian-consent.md); inspect and resolve legacy inconsistencies deliberately rather than bulk approving accounts. Hosted competing-request and provider-session acceptance remains pending.

## PDF storage maintenance

The platform **Pilot usage → PDF storage accounting** panel includes active attachments, reservations/uncertain writes, held objects and queued cleanup. **Retry queued cleanup** retries up to 20 authorized, unreferenced objects; failed removals remain charged. Removing an attachment in Content studio returns its item to draft and queues only files with no remaining live reference. Replacing a file needs temporary room for both old and new files.

Uploads begin paused after the PDF migration. Stop legacy/service-key upload writers, inventory the actual private bucket and reconcile before explicitly resuming. `npm run storage:inventory` is read-only and stores private reports outside source packages. Neither an old reservation's age nor an unrecognized filename authorizes deleting it. Newly found unreferenced files stay held/charged until separate platform approval. Follow the [complete storage procedure](../architecture/pdf-storage.md) for current-revision reconciliation, missing references, abandoned-write review and recovery. Do not free reservations manually to make capacity appear available.

## Daily pilot checks

- Review platform usage, Worker errors, database/storage/egress metrics, authentication email delivery and AI failures.
- Investigate usage above 70% of configured planning limits; compare tracked PDF size with actual bucket contents.
- Review pending privacy and support requests. Escalation owner/contact still needs to be assigned before launch.
- When content is reported wrong, unpublish it, retain revision evidence and arrange teacher review.

AI unavailability should leave ordinary lessons/practice usable. A platform API quota exhaustion can block protected actions; investigate the actual quota and provider state rather than promising complete availability.

## Backups and restore

For the controlled pilot, maintain encrypted database backups in a separate restricted location, plus private file backups/object inventory and release configuration. Record frequency, responsible operator and retention. Rehearse a restore to a separate project before inviting the intended public cohort; a backup that has not been restored is unproven.

Do not place backups or student exports in the source repository. This codebase does not supply an automated backup service.

## Privacy fulfillment

All roles now have **Settings**. Verified independent students request for themselves; parents can also request for linked Standard 1–5 children, including after learning consent withdrawal. Requests show review status and are deduplicated per subject/kind/requester. Platform administrators review requests and can inspect deletion dependencies. These are manual fulfillment queues; no export or account deletion happens when a request is submitted.

1. Verify the requester/subject and record the authorized scope in the institution's restricted operations record. A submitted request is not sufficient identity proof for irreversible handling. Confirm guardian authority and resolve any disputed request before proceeding.
2. For export, inventory the subject's Auth/profile/academic/enrollment records, personal progress, attempts/feedback, reviews, plans, maps, optional conversations, requests and applicable operational records. Include linked-child data only within the approved scope. Review shared institution material, other users' records, answer keys, secrets and provider metadata before securely delivering the export. The app does not generate this export. Mark the request in review first, then confirm delivery before marking an export fulfilled.
3. For deletion, run **Check deletion dependencies** and take a current backup under the approved retention process. Arrange staff/content handover and inspect membership, attribution, requests and personal data. A guardian with any child links cannot be deleted: resolve each child's account/guardian arrangement through the approved process first. Do not simply remove links to bypass the guard.
4. Review invitation email records (including historical addresses), revision snapshots, audit target text, institution material, provider logs/backups and external copies. Decide and record retention/anonymization/cleanup under the approved policy. The preflight is not a complete data inventory. Attribution nulling preserves content/audit records; it does not erase identifiers embedded in JSON/text.
5. Rehearse the chosen sequence with synthetic accounts in hosted staging. Only an authorized operator then performs provider Auth deletion and any approved separate cleanup. Verify cascades, retained institution content, revoked access and other institutions' records. The application supplies no automatic deletion endpoint. Existing access tokens/copies may outlast session deletion; verify actual provider behavior.
6. Record completion/evidence outside the subject-owned request row, which cascades when the account is deleted. Never mark deletion fulfilled merely because it was requested or preflight returned zero. Preserve only the evidence allowed by the approved retention process.

Local PostgreSQL tests verify dependency rules, synthetic deletion/cascades and retained attribution records. Hosted Auth deletion, provider backups/logs and actual fulfillment remain acceptance work. See [account operations](../architecture/account-operations.md) and the [pilot ledger](../launch/pilot-acceptance.md).

## Incidents

For leaked credentials, rotate affected secrets, revoke relevant sessions and review access/provider logs. For access isolation failures, restrict the affected flow and preserve evidence before reopening enrollment. For deployment failures, use the [release recovery procedure](deployment.md). The operator's notification/escalation obligations must come from reviewed agreements and policy, not assumptions in this runbook.

## Before scaling

Measure usage, validate entitlements and separation of institutional data, prove email/restore/support operation and approve the operating budget. Public/student, higher-secondary and college launches each require their own completed acceptance path.
