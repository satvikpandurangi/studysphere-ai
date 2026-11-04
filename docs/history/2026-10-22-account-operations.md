# Account controls and operational pilot checks — 22 October 2026

Added shared Settings for students/parents/staff, profile updates, password-recovery requests/global sign-out, guardian-scoped privacy requests, duplicate prevention, request status and platform deletion preflight. New requests require verified self/guardian authority and preserve the Standard 1–5 / Standard 6–10 account split. Operator-reviewed fulfillment remains manual.

A forward migration adds requester/reviewer attribution and transactional review/audit behavior. Attribution foreign keys now null on operator account deletion while retaining institution content/audit records. A guardian deletion guard prevents accidental linked-child orphaning. Retained snapshots/invitations/logs/backups still require policy review; no full anonymization or automatic production deletion is claimed.

Replaced old ₹0 pilot UI claims with measured application usage and explicit planning limits. School admins receive scoped aggregate institution totals; platform totals aggregate in SQL and stay readable through authenticated monitoring when Worker quota is exhausted. Existing AI/PDF reservation/accounting limitations remain documented.

Added eleven local PostgreSQL cases and five Worker cases. They cover existing request preservation, self/guardian/verification/paused-account boundaries, deduplication and review, direct-write/anonymous denial, cross-school usage, aggregation beyond 1,000 rows, deletion guards/cascades and retained attribution records. Browser checks use synthetic local services, not hosted sessions. No provider service was provisioned and no real account was deleted.

Added `npm run pilot:check` and a [pilot evidence ledger](../launch/pilot-acceptance.md). Local command results do not approve launch. Hosted migrations, email/token behavior, real restore/deletion, customer funding/policies and final acceptance remain pending. See [contracts and operating limits](../architecture/account-operations.md).

Final local validation: the pilot runner passed frontend build, lint, Worker type-check, Worker bundle, all 68 local tests and documentation links. Three hosted tenant tests skipped because their seven staging inputs were absent. The generated report records `localChecksPassed: true`, `hostedVerified: false` and `launchDecision: pending_manual_acceptance`. The existing Node `module.register()` deprecation warning is non-failing.

Real component/style fixtures verified profile-save feedback, self export/deletion confirmation/status, duplicate-disabled controls, guardian child selection/submission, school-admin aggregate rendering, platform capacity warnings and deletion preflight counts. A 390px guardian fixture also submitted a child export request. Password-email delivery, actual global-session behavior and provider operations were not exercised. Screenshots and synthetic fixture source remain ignored under `.local/account-preview/`.
