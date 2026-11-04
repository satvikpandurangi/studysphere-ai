# Repository guide

The workspace root is the application root. The previous `outputs/studysphere-ai/` nesting is retired.

```text
studysphere/
  README.md                  project entry
  AGENTS.md                  coding/documentation conventions
  package.json               supported commands
  src/
    pages/                   student, parent, staff and admin screens
    components/              shared UI, layout, Markdown and PDF viewer
    context/                 authentication state
    hooks/                   asynchronous loading helpers
    lib/                     domain types, data/API client and planner
    *.css                    current global/page styles
  worker/                    privileged Cloudflare API and unit tests
  supabase/
    migrations/              ordered incremental schema changes
    seed.sql                 sample curriculum only
  tests/                     integration tests
  sample-assets/             sample PDF and its existing render
  docs/                      maintained documentation and historical guides
  scripts/                   supported validation/packaging tools
  archive/legacy-scripts/    historical Python edits, not setup tools
  artifacts/                 ignored source releases and old build packages
  .local/                    ignored local runtime/logs/evidence
  dist/                      generated frontend output
  worker-dist/               generated API bundle
```

`wrangler.app.toml` hosts only the built `dist/` frontend with SPA routing. `wrangler.toml` and `wrangler.deploy.toml` target the separate privileged API.

Root Vite/TypeScript/ESLint/Wrangler files remain beside `package.json` so existing relative source references work. Existing frontend modules stay intact during this organization-only phase. New features can introduce coherent domain modules without a speculative whole-app rewrite.

Assessment work now uses `pages/AssessmentStudioPage.tsx`, `pages/LearnerAssessmentPages.tsx` and `lib/assessments.ts`. Shared `components/CurriculumSelector.tsx` and `components/StudentGate.tsx` keep curriculum/account behavior consistent across features. `pages/AuthoringPages.tsx` retains curriculum management; `pages/StudentPages.tsx` retains dashboard/lesson browsing. These extractions preserve the existing design.

Institution presentation uses `context/InstitutionContext.tsx`, `lib/branding.ts`, `pages/InstitutionSettingsPage.tsx` and scoped `branding.css`. The context holds in-memory presentation selection and periodically reloads authorized configuration; it is not a content-permission source.

Account controls live in shared `pages/SettingsPage.tsx` and `lib/account.ts`. `pages/ParentPages.tsx` retains family/child management. `scripts/pilot-check.mjs` writes local validation evidence; source packages exclude the generated reports.

`scripts/hosted-check.mjs` runs the focused read-only hosted boundary suite; `scripts/hosted-config.mjs` shares its input/evidence contract with the pilot wrapper. The blank `tests/staging.env.example` documents local configuration; actual `.env.staging.local` and `.local/hosted-validation/` evidence are excluded from source releases.

PDF operations live in `worker/assets.ts`, browser clients in `lib/pdfAssets.ts`, and conditional upload/publication orchestration in `lib/pdfPublishing.ts`. `scripts/storage-inventory.mjs` is a maintained read-only operator inventory; generated reports stay ignored.

## Relocation map

| Previous location | Current location |
| --- | --- |
| `outputs/studysphere-ai/src/` | `src/` |
| `outputs/studysphere-ai/worker/` | `worker/` |
| `outputs/studysphere-ai/supabase/` | `supabase/` |
| `outputs/studysphere-ai/tests/` | `tests/` |
| App configuration, lockfile and local frontend environment | Repository root |
| Original four app Markdown guides | `docs/archive/2026-09/` |
| Original full project review | `docs/history/2026-10-22-project-review.md` |
| `work/*.py` | `archive/legacy-scripts/` |
| `work/dev.log` | `.local/logs/legacy-dev.log` |
| `work/fractions_sample_render.png` | `sample-assets/fractions-sample-render.png` |
| `work/` browser/cache/Python directories | `.local/legacy-runtime/` |
| Earlier source/build ZIPs | `artifacts/archive/` |
| Supported new source release | `artifacts/releases/studysphere-ai-source.zip` |

`node_modules/`, `.npm-cache/`, `.xdg/`, local credentials, logs and generated artifacts are ignored. Browser profiles and runtime caches are preserved locally, not published. `.local/restructure-source-snapshot.json` records pre-move application file hashes for verification; it is local evidence, not part of releases.

The [historical review](../history/2026-10-22-project-review.md) intentionally retains the old paths and findings as a dated snapshot. Use this map to locate their current equivalents.
