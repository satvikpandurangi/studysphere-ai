# Contribution and documentation workflow

## Before changes

Read the [capability matrix](../product/requirements.md) and [roadmap](../product/roadmap.md). Keep existing implemented behavior distinct from future SaaS scope. Work from the root. Do not run the archived construction scripts.

## Code placement

Frontend UI/state belongs in `src/`; privileged validation and authorization belong in `worker/`; schema, grants and policies belong in new `supabase/migrations/` files. Keep cross-system tests in `tests/`. Put synthetic fixtures in `sample-assets/`, never real student information.

Preserve existing data and user IDs when expanding public/institutional enrollment or academic stages. Changes to permissions need meaningful negative tests, not only hidden navigation. Do not make AI a requirement for stored learning flows.

## Documentation maintenance

1. Update requirement status when behavior becomes implemented, partial or verified.
2. Update the authoritative API/data/setup/operations page affected by the change.
3. Add a dated entry to [CHANGELOG](../history/CHANGELOG.md) for material changes.
4. Mark roadmap items complete only after their acceptance evidence exists.
5. Run `npm run docs:check`; keep links relative and valid after file moves.

Root README and `docs/README.md` are navigation. Avoid copying entire setup guides into multiple places. Historical documents remain snapshots; correct current advice in maintained docs.

## Review and release

Run the [appropriate checks](testing.md), summarize behavior changes and verification limits, and regenerate the source package when delivering a release. Commit source/docs/configuration rather than generated output, credentials or release ZIPs. A Git repository/remote has not been initialized as part of this organization phase; establish the desired version-control workflow before collaborative coding.
