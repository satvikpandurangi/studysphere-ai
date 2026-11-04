# PDF storage hardening — 22 October 2026

Aligned browser/Worker/database file ceilings at a database maximum of 15,000,000 bytes, with stricter environment caps honored. Added bounded body reading, a private reservation ledger, version/permission rechecks, full replacement-overlap accounting and confirmed-cleanup release. Existing reads keep their private/no-store permissions.

Failed/uncertain provider writes remain counted; old attachments/text/publication survive failed replacements. Confirmed attachments become drafts with old text cleared before reviewed new text/publication is saved. The studio now rejects oversized files before extraction, clears old text on new selection, requires reload after unconfirmed outcomes, retains new draft IDs and supports explicit attachment removal.

Uploads start paused for an operator inventory review. Shared legacy keys are deduplicated; unknown sizes block new reservations. A read-only paginated inventory CLI reports provider/ledger discrepancies privately. Newly discovered unreferenced files stay retained and charged until separate explicit cleanup approval. Queued cleanup retries are available in Pilot usage; no automatic expiry or orphan sweep is added.

Added local database, Worker, publishing-orchestration and inventory tests. They simulate reservation ordering and failures; PGlite's single connection does not prove simultaneous hosted locks or provider atomicity. Browser fixtures use real components/styles with synthetic service responses and the existing sample PDF; no hosted Storage integration is implied. See the [PDF storage guide](../architecture/pdf-storage.md) for contracts, mandatory cutover and remaining acceptance.

The post-attachment metadata save now matches the returned content version, preventing another editor's intervening changes from being overwritten or published silently. A missing/failed save requires reloading the saved item.

Validation on 22 October: `npm run pilot:check` passed build, lint, Worker type/bundle checks, 97 local tests and documentation links. Three hosted tests skipped because staging credentials were absent; manual launch acceptance remains pending. Browser verification covered oversized selection, real sample-PDF text extraction, failed replacement with reload restoring original published metadata, confirmed replacement/publication with cleared file selection, and queued-cleanup feedback/totals. These used synthetic local transport under ignored `.local/pdf-preview/`; no migration, bucket inventory or deployment was performed against hosted services.
