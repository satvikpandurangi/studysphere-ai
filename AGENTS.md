# Working on StudySphere

## Read before coding

Read `docs/README.md`, `docs/product/requirements.md`, `docs/product/roadmap.md`, and the relevant architecture/development guides. Distinguish implemented behavior from planned capabilities. User instructions take precedence over these project conventions.

## Project conventions

- Run npm commands at the repository root.
- Keep frontend code in `src/`, privileged API code in `worker/`, and incremental database changes in `supabase/migrations/`.
- Keep authoritative documentation under `docs/`; root README is the entry point.
- Keep generated output, credentials, browser profiles, logs and release ZIPs out of source control and source packages.
- Treat `archive/legacy-scripts/` and `docs/archive/` as historical evidence. Do not rerun old text-replacement scripts or present archived setup advice as current.
- Preserve data-first learning: optional AI must not be required for ordinary lessons and progress.
- Preserve the existing platform design: reuse shared UI components, layout, colors, typography and responsive patterns. Do not redesign screens as part of feature work.
- Launch web first for a funded institution. Public enrollment/subscriptions and dedicated native apps are deferred; PWA installation is planned, not implemented.
- Standards 11–12 / PUC 1–2 and colleges are planned scope. Do not claim support until database, API, UI and access tests support it.
- Maintain the user's existing Standard 1–5 guardian / Standard 6–10 independent-account behavior until a subsequent requirement changes it. Do not assume a new policy for older learners or institutional enrollment.
- Do not rewrite applied migrations to implement new behavior. Add reviewed forward migrations and keep existing records usable.
- Do not silently restore the removed school approval queue. Separate typed school labels from verified enrollment entitlements.
- Verified student access uses `school_enrollments`; signup's typed school label must never grant private content or expose a student's full history to staff. See `docs/architecture/enrollment.md` before changing access rules.

## Documentation and validation

When behavior changes, update its capability status and relevant setup/API/operations docs in the same change. Record material milestones in `docs/history/CHANGELOG.md`. Update `docs/product/roadmap.md` when work is completed or reprioritized.

Run appropriate checks: `npm run build`, `npm run lint`, `npm run check:worker`, `npm test`, and `npm run docs:check`. Explain skipped live tests. Use `npm run package:source` for a source release. Never claim deployment or live integration success from a local build alone.
