# Atomic guardian approval — 22–23 October 2026

Replaced split service-role guardian/student/audit writes with one caller-authorized transaction. Added a shared student consent version, parent overview version, row locking, verified-parent/link/Standard 1–5 checks, no-op handling, stale-decision denial and guards against old separate status writes. Existing decisions, progress and enrollment records remain intact. An explicit authorized request can repair a legacy partial decision; the migration does not bulk reconcile or approve records.

My children uses the existing design, sends the displayed version, disables approval actions during a save, reports success/failure and reloads the saved state. Standard 6–10 independent accounts remain outside guardian approval changes. Existing multi-guardian behavior is preserved; no new consensus rule is introduced.

Added thirteen local PostgreSQL cases and four Worker cases for access, restoration, rollback, version conflicts, migration preservation and caller boundaries. The database is PGlite with synthetic Auth; ordered competing decisions are tested, not simultaneous hosted connections. Child creation remains a separate Auth/database workflow. Hosted migration, provider integration and deployment are not performed by this change. See the [guardian consent guide](../architecture/guardian-consent.md).

Validation completed 23 October: `npm run pilot:check` passed build, lint, Worker type/bundle checks, 114 local tests and documentation links. Three hosted tests skipped because the seven staging inputs were absent; hosted/manual acceptance remains pending. All eight prior migrations matched the preceding source ZIP byte for byte.

The ignored `.local/guardian-preview/` fixture exercised real parent components/styles with synthetic responses: withdrawal/status feedback, controls disabled during a held request, restored approval with unchanged progress, stale-decision error/reload, simulated transaction failure preserving the withdrawn state and successful retry. The preview does not prove actual provider behavior or simultaneous sessions. Screenshots and fixture code remain outside source releases.
