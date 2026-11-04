# Cloudflare application release — 29 October 2026

The compatible StudySphere frontend and API are deployed to the existing owner-selected Cloudflare account. The application design, separate Worker API, Supabase project, institution-funded scope and account policies are unchanged. This is a verified deployment, not complete institutional pilot acceptance.

## Deployed versions

| Service | URL | Active version |
| --- | --- | --- |
| Frontend | [StudySphere login](https://studysphere-app.satvikjee2526.workers.dev/login) | `85dbafc5-4f9b-47c7-b578-70a93f83c1d8` |
| API | [Health endpoint](https://studysphere-api.satvikjee2526.workers.dev/health) | `966fcb24-12a9-4087-96c4-6a43a3baaa61` |

The API upload completed on 23 October local time before the earlier session stopped; its active deployment was confirmed on 29 October. The frontend was published on 29 October. Both serve 100% of their respective deployment traffic. Their origins match Vite's API target and the API's configured `APP_ORIGIN`; the API still targets Supabase project `flsckscpvqqyyqvsyjwp`.

Frontend hosting uses `wrangler.app.toml`, uploads only built `dist/` assets and enables SPA fallback. Its pre-existing compatibility date, 24 September 2026, was retained. Wrangler initially enabled frontend preview URLs by default; they were restored to the prior disabled setting through the authenticated Cloudflare API and verified by readback. `preview_urls = false` is now explicit in source. Existing API preview settings were retained.

The API's existing `SUPABASE_SECRET_KEY` secret binding was preserved without reading or displaying its value. No Groq credential was installed, no paid service was provisioned, and no database/user/Storage mutation was performed by this deployment work. Secret presence is not proof of authenticated privileged workflows; those still require real caller tests.

## Verification

- Fresh frontend build, API bundle, lint, Worker type-check and **118 local tests** passed. Three synthetic authenticated hosted cases remain skipped for missing fixtures.
- Rebuilt frontend/API files match the previously reviewed release hashes. Local database credentials and real account IDs were absent from public output.
- Seven live direct navigation routes returned the reviewed built index: `/`, `/login`, `/privacy`, `/reset-password`, `/app`, `/app/settings` and a nested lesson route.
- All **96 published frontend files**, including scripts, styles and fonts, returned bytes matching the local build hashes. The JavaScript entry has the expected content type.
- The live API returned healthy JSON, rejected an unexpected origin, accepted preflight only for the configured app origin and rejected an unauthenticated protected consent request.
- A live browser rendered the existing login design, redirected a signed-out `/app/settings` visit to `/login`, and reported no console errors during that check. No account or password was entered.
- Cloudflare's active deployment records and frontend preview-disable setting were read back through the connected MCP server. This also confirms the requested Cloudflare integration works in the current session.

Private runtime evidence, hashes, prior version identities and the login screenshot are under ignored `.local/release-preview/`. No private backups, credentials, OAuth state or release outputs belong in source packages.

## Cloudflare agent setup

The owner's [requested setup instructions](https://developers.cloudflare.com/agent-setup/prompt.md) were applied: 19 official Cloudflare skills were installed at the pinned repository revision `86505e44f87d801aa1864a3c4109e9a8ae5c409f`, and `https://mcp.cloudflare.com/mcp` was registered and authenticated in the user-level Codex configuration. The tools are loaded and usable in this session. Unrelated configuration was preserved; credentials remain in provider-managed local stores. See the [setup guide](../development/cloudflare-setup.md).

## Remaining acceptance and recovery

The three authenticated tenant boundary tests, actual school/teacher/student/guardian journeys, staff invitation/email delivery, Auth recovery redirects, service-key operations and provider failure/concurrency checks remain pending. A signed-out redirect and anonymous HTTP 401 do not prove institution separation. Keep the PDF upload/inventory gate closed until its dedicated review and acceptance pass. Do not present this release as a public SaaS launch or claim PUC/college support.

Review production observability and its sampling, retention and budget before pilot acceptance; this release did not enable new logging/tracing services. Existing provider advisory and full Auth/provider recovery work remains in the [hosted database record](2026-10-23-hosted-upgrade.md).

Retained previous version IDs are `4165ec14-083f-45e2-915d-5d46246843f6` for the old API and `f2e3d4b8-78f0-42de-be26-a31897ccb518` for the old frontend. These identities are operational evidence, not approval to restore incompatible code. In particular, do not restore the old PDF or split-consent writer against the upgraded database. Fix forward and follow the [deployment recovery guide](../operations/deployment.md).
