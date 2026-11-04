# StudySphere AI

StudySphere is being developed for a free first-school partnership: a private workspace using the school's identity and approved materials. Neither the school nor founder can fund operation initially. The target is 1,500 simultaneously active students in Standards 1–10, with CBSE and Karnataka State Board (KSEEB); capacity and complete curriculum coverage are not yet verified. Public enrollment and individual subscriptions are deferred. The product is data first: published learning material and saved progress work independently of the optional AI tutor.

**Current implementation:** Standards 1–10. Standards 11–12 / PUC 1–2, college programs, independent public enrollment, and SaaS billing are planned capabilities, not completed features.

The first [verified enrollment workflow](docs/architecture/enrollment.md) is implemented and locally tested: administrator invitations/roster/revocation and student/guardian acceptance. Apply the new forward migration and complete staged access checks before using it with real institutions. Existing typed school names grant no private-material access after the migration.

The [assessment lifecycle](docs/architecture/assessments.md) now includes teacher draft editing, revised editions, publish/unpublish controls and saved learner result history. Published content is immutable so later edits cannot rewrite earlier attempts. Its forward migration and hosted acceptance are still pending.

## Start here

[PDF storage hardening](docs/architecture/pdf-storage.md) now includes aligned limits, reservations, safe replacement/cleanup and inventory tooling. Its forward migration starts uploads paused until the operator reviews actual private-bucket inventory; hosted verification remains pending.

Shared [account controls and operational monitoring](docs/architecture/account-operations.md) are implemented locally. Use `npm run pilot:check` and the [acceptance ledger](docs/launch/pilot-acceptance.md) to distinguish local validation from hosted launch readiness.

Institution administrators can now configure [branding and contact details](docs/architecture/branding.md), with preview/save/reset and authorized member selection. This is implemented locally; its forward migration and hosted acceptance remain pending.

- [Documentation index](docs/README.md)
- [Product scope and audiences](docs/product/vision.md)
- [Private-school launch direction](docs/product/institutional-launch.md)
- [Current capability matrix](docs/product/requirements.md)
- [Development roadmap](docs/product/roadmap.md)
- [Local setup](docs/development/getting-started.md)
- [Repository structure](docs/development/repository-guide.md)
- [Institutional pilot and future launch checklist](docs/launch/checklist.md)

## Development

Run commands from this directory. The app previously lived under `outputs/studysphere-ai/`; that location is retired.

```powershell
npm ci
npm run build
npm run preview
```

Use the existing local `.env.local`, or copy `.env.example` and fill in your own project's frontend settings. A connected Supabase project and the migrations are required for actual account/data flows. See the setup guide before configuring services.

```powershell
npm run lint
npm run check:worker
npm test
npm run docs:check
```

The three staging RLS tests skip without their environment inputs; a skipped test is not evidence of tenant isolation.

## Main folders

| Path | Purpose |
| --- | --- |
| `src/` | React frontend pages, components, context, hooks, helpers and styles |
| `worker/` | Cloudflare API and request-boundary tests |
| `supabase/` | Database migrations and sample seed |
| `tests/` | Cross-system integration tests |
| `docs/` | Maintained product, technical, operating and historical documentation |
| `scripts/` | Supported maintenance and packaging commands |
| `sample-assets/` | Clearly marked teaching/test fixtures |
| `archive/legacy-scripts/` | Preserved historical construction scripts; do not run on current source |
| `artifacts/` | Ignored release packages and previous build archives |
| `.local/` | Ignored local tooling, logs and restructuring evidence |

Do not place server secrets in frontend environment variables. No live deployment or database migration is performed by organizing this repository.
