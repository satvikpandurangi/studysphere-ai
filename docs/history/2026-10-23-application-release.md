# Application release preparation — 23 October 2026

**Subsequent outcome:** the API upload completed on 23 October and the frontend was published on 29 October. Both active deployments and live smoke are verified in the [release record](2026-10-29-cloudflare-release.md). The preparation status below is historical.

The six database upgrades are applied; this milestone prepares the compatible frontend/API release. Added `wrangler.app.toml` for the existing `studysphere-app` name, serving only generated `dist/` with SPA fallback. The privileged `studysphere-api` Worker retains its separate configuration. No visual redesign, provider migration, paid provisioning or database change is part of this preparation.

## Verification

- Frontend build, API bundle, lint, Worker types and all **118 local tests** passed; three synthetic authenticated hosted tests remain skipped for missing fixtures.
- Frontend and prebundled API Wrangler deployment dry runs passed. Initial sandbox filesystem errors were resolved by running the same checks with the required filesystem access; they were not deployment failures.
- Local Cloudflare static runtime served the built index at `/`, `/login`, `/privacy`, `/reset-password`, `/app`, `/app/settings` and a nested lesson path. The compiled JavaScript entry resolved as JavaScript.
- Local API runtime returned healthy JSON, rejected an unexpected origin, accepted preflight for the configured app origin and rejected an unauthenticated protected request.
- The release targets the selected Supabase project and existing API origin. Generated output was checked for absence of the local database password and real account IDs. Release file hashes and detailed local results stay ignored under `.local/release-preview/`.

The static configuration follows [Cloudflare's SPA guidance](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/). The source package includes the new frontend configuration; generated bundles, credentials, login state, private backups and logs are excluded.

## Publication status

**Not deployed by this preparation.** Cloudflare was unauthenticated; Wrangler's official short-lived device flow was started for the owner to approve, but it expired after five minutes without authorization. The code is no longer usable; start a fresh login when the owner is ready. No token, password or authorization code is stored in maintained documentation. Sign-in follows the [official device-flow documentation](https://developers.cloudflare.com/changelog/post/2026-08-04-wrangler-login-device-flow/).

After authorization, verify account ownership, remote Worker versions and required secret names before publishing the prepared frontend/API. Check the actual returned origins against CORS, Vite targets and Supabase Auth redirects. Then complete live smoke and synthetic authenticated acceptance. Keep PDF uploads paused until provider inventory review; deployment alone does not establish pilot readiness. See [deployment](../operations/deployment.md) and [staging acceptance](../launch/staging-verification.md).
