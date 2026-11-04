# Maintained project tools

Run from the repository root:

```powershell
npm run docs:check
npm run pilot:check
npm run test:hosted
npm run storage:inventory
npm run package:source
```

`check-docs.mjs` checks local Markdown link targets in maintained docs, root README/AGENTS and tool/archive indexes. Archived guide snapshots and the original dated review retain historical context and are excluded. It does not fetch external links or verify heading fragments.

`package_source.py` creates `artifacts/releases/studysphere-ai-source.zip` using an explicit root-file and source-folder allowlist. It includes maintained documentation and preserved historical scripts, and rejects symlinks or credential/runtime paths. It excludes local environment values, node_modules, build output, provider sessions, caches and prior archives. The ZIP is generated locally, not deployed or published.

Use `npm run app:check` after building for a static-frontend Wrangler dry run, and `npm run app:dev` for local SPA routing verification. Use `npm run worker:bundle` to generate the standalone API bundle. Deployment commands are documented separately in the deployment guide because they modify provider state.

`pilot-check.mjs` runs local code/doc checks and writes ignored test/acceptance JSON under `.local/pilot-validation/`. `npm run pilot:check -- --require-hosted` also requires the configured hosted tenant suite to pass. Neither mode deploys or approves launch; complete the evidence ledger in `docs/launch/pilot-acceptance.md`.

`hosted-check.mjs` loads optional ignored `.env.staging.local`, requires all nine inputs and runs only the three read-only hosted boundary cases. Missing inputs exit 2 without network requests; failed evidence exits 1; a three-case pass exits 0. Reports stay under `.local/hosted-validation/`. It shares its configuration/evidence contract with the pilot wrapper through `hosted-config.mjs`. Neither runner provisions fixtures or accepts a skipped suite as hosted success. Follow `docs/launch/staging-verification.md` for fixture setup and scope limits.

`storage-inventory.mjs` is an operator **read-only** provider/ledger inventory. Credentials come from the process environment; private reports stay under ignored `.local/storage-inventory/`. It makes no storage or database mutations. Follow `docs/architecture/pdf-storage.md` for pause/settled-write prerequisites, exit codes and explicit operator reconciliation. Unit tests use synthetic lists; a local CLI build does not establish live Storage success.

`content:fixtures` builds original draft-only functional data locally. `content:sources` validates the reviewed publisher list without network access by default; add `-- --download` for bounded licensed downloads. `content:prepare-oer` selects credited text only from verified adaptable editions. `content:coverage` exits 2 while full subject/chapter/topic acceptance is incomplete. None imports to Supabase or resumes PDFs. See [curriculum/source status](../docs/operations/curriculum-content.md).
