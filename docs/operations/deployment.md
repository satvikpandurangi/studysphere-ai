# Deployment and rollback

## Recorded state

The earlier development chat records deployment on 25 September 2026 to:

- App: https://studysphere-app.satvikjee2526.workers.dev/login
- API health: https://studysphere-api.satvikjee2526.workers.dev/health

These addresses and the local environment are historical configuration. On 23 October 2026, read-only checks returned HTTP 404 for the frontend `/login` and HTTP 200 for API `/health`; the configured Supabase hostname did not resolve from this environment. These results do not identify the cause or prove schema/dependency health. No remote deployment was performed. Use the [staging preparation guide](../launch/staging-verification.md) to select a target, inspect migrations and configure synthetic acceptance accounts before resuming hosted verification.

The owner subsequently selected the same configured Supabase project for the application. A fresh check reached Auth health/settings with the existing publishable key (HTTP 200); the earlier API-hostname DNS failure is not a current reachability blocker. This Auth check did not verify the schema, identities or private Storage; the later audit below records that separate inspection. Cloudflare remains the configured frontend/API provider; moving to Vercel has been discussed but not selected or implemented.

The [signed-in baseline audit](../history/2026-10-23-hosted-schema-audit.md) identified the six upgrades. They are now applied: an explicitly approved application snapshot was recovered locally, all baseline values were preserved, and live grant/anonymous API checks passed. At that earlier upgrade the private PDF bucket was empty and uploads were paused. See the [hosted upgrade record](../history/2026-10-23-hosted-upgrade.md) for the recovery scope, applied source/hosted version mapping and remaining advisory/acceptance work. Full provider/Auth backup/restore remains separate. Native PostgreSQL connection/password failures do not block the connected integration used for this rollout.

The compatible frontend and API are now deployed and verified on 29 October 2026. Live routes, all 96 frontend asset hashes and anonymous API boundaries passed; Cloudflare MCP is connected and usable. See [active versions and remaining acceptance](../history/2026-10-29-cloudflare-release.md). Do not run an unreviewed CLI database push against the generated migration history; reconcile the already-present historical baseline and source/hosted version mapping first.

Current follow-up: [authenticated pilot evidence](../history/2026-10-29-authenticated-pilot.md) records 37 workflow checks, three boundary tests and the seventh forward upgrade. Source `20261028232250_pdf_singleton_safe_updates.sql` maps to hosted version `20261028232356`. One provisional school remains active; the second synthetic fixture is retired. One 2,810-byte synthetic PDF remains and uploads are paused again. Full recovery, actual email and 1,500-user capacity are not accepted. This database-only repair requires no frontend/API redeployment.

## Prepare a release

1. Select the intended staging/production service accounts and verify applied database migrations.
2. Apply new migrations to staging first and rehearse recovery. Do not rerun the initial schema on an existing service.
3. Confirm private Supabase Storage bucket, SMTP delivery, Auth URL redirects, frontend environment and Worker secrets.
4. Ensure the intended frontend origin is identical in the active Worker configuration and Auth redirect settings. The checked-in origin matches the verified existing deployment; review it explicitly before retargeting.
5. Run the checks and acceptance journeys in the [testing guide](../development/testing.md).
6. Record release identity, migration list, artifact checksums and environment; keep secrets out of release records.

## Build and deploy

The current ignored development `.env.local` targets the loopback API. **Do not publish a bundle built with that local API URL.** Supply the selected hosted frontend's `VITE_API_BASE_URL` and Supabase settings explicitly when building the deployment artifact, and inspect its compiled configuration before publication. Local developer builds are not deployment artifacts.

```powershell
npm run build
npm run worker:bundle
```

`dist/` is the frontend output. [wrangler.app.toml](../../wrangler.app.toml) deploys only this generated folder to `studysphere-app` with Cloudflare's `single-page-application` fallback. The API remains the separate `studysphere-api` Worker; no privileged API code or local environment files are frontend assets. The existing design is unchanged.

```powershell
npm run app:check
npm run app:dev -- --port 4175 --local
```

The check is a deployment dry run and publishes nothing. The dev command runs the Cloudflare static runtime locally; verify direct `/login`, `/privacy`, `/reset-password` and nested `/app/...` navigation as well as compiled assets. On Windows a filesystem sandbox may prevent Wrangler/esbuild from resolving installed dependencies; a successful Vite build alone does not prove the Wrangler dry run passed.

For an authorized release after account/target validation:

```powershell
npm run app:deploy
```

This publishes to the signed-in account. Confirm the returned frontend URL matches `APP_ORIGIN`, Vite's API target and the configured Supabase Auth site/redirect URLs. Do not silently publish to a different account or expose server secrets through `VITE_*` settings.

The normal API command is:

```powershell
npm run worker:deploy
```

The alternative prebundled route uses `vite.worker-bundle.config.ts` and `wrangler.deploy.toml`:

```powershell
npm run worker:bundle
npm run worker:deploy:bundle
```

Both deploy commands mutate the configured provider deployment and are for an authorized release. Historical Windows logs show Wrangler filesystem access failures; bundling alone does not establish that upload will work in the current environment. Validate the selected route on staging.

Set the Supabase server key and optional Groq key only through secure provider secrets. A provider account containing a key does not prove the Worker has that secret installed.

## Cloudflare sign-in and remote preflight

The prepared release passed builds, lint, Worker types, 118 local tests, dry runs and local static/API smoke on 23 October. Builds/types/lint and all 118 local tests passed again on 29 October; the [live release checks](../history/2026-10-29-cloudflare-release.md) also passed. The three synthetic authenticated hosted tests remain unconfigured. See [preparation evidence](../history/2026-10-23-application-release.md).

Sign in through Wrangler's official flow, keeping credentials out of chat and source files:

```powershell
npx wrangler login --device --browser=false --scopes account:read user:read workers_scripts:write workers:write
npx wrangler whoami
```

If a device request expires, start a new one rather than retrying the old code. On the same desktop, `npx wrangler login --scopes account:read user:read workers_scripts:write workers:write` also opens the normal browser callback flow.

Use the verification URL and short-lived code printed by that specific invocation; codes expire and are not reusable setup values. The owner approves Cloudflare's access request. No API token needs to be pasted into chat. Do not use a temporary preview account to bypass ownership or sign-in.

Before publishing, inspect existing `studysphere-api` deployments and **secret names only**, retain the current version identity for recovery, and confirm the account owns the expected `satvikjee2526.workers.dev` deployment. `SUPABASE_SECRET_KEY` must be installed as an API Worker secret, pointing to the selected Supabase project. Publishing preserves existing secrets, but their names alone do not prove that values are valid. `GROQ_API_KEY` remains optional and requires a funded allowance; ordinary learning must work without it. Inspect the account's limits without enabling paid services.

For subsequent releases, deploy compatible API/frontend versions and run live read-only route/CORS/authentication checks before provisioning synthetic accounts and exercising privileged flows. The current deployment passed the anonymous checks; authenticated acceptance remains open. Keep PDF uploads paused until the separate inventory/acceptance procedure succeeds. Do not roll back to the legacy consent or PDF writer against the upgraded database.

## Verify and recover

After an authorized release, verify frontend routes, API health, unauthorized request rejection and an authenticated end-to-end journey. Confirm email, PDFs and optional AI separately. Record results in release evidence.

If application behavior fails, first verify that a retained version supports the currently applied schema. Redeploy only a compatible retained version and recheck; otherwise fix forward. The old pre-upgrade PDF and split-consent writers are incompatible recovery targets. Schema changes may not be reversible by rolling back code; use the migration's recovery plan and tested database/storage backup. Do not assume a source ZIP is a data backup.
