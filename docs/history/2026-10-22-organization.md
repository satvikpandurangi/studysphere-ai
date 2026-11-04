# Repository organization record — 22 October 2026

## Scope

Prepared the existing project for continued SaaS development. No feature implementation, database migration, paid service activation or live deployment is included. The owner expanded the intended scope to public learners, schools and colleges, and then explicitly included Standards 11–12 / PUC 1–2.

## File preservation and relocation

The application now lives at the workspace root. Existing frontend/API/database/test contents are preserved; original guides and all 23 work scripts are archived. Browser profiles, caches and installed Python tooling remain local. Old ZIPs remain under `artifacts/archive/`. See the [relocation map](../development/repository-guide.md).

The current docs replace outdated setup claims with explicit current-source versus historical-deployment status. The original four guides and pre-organization review remain unchanged as dated evidence. A new source package includes the full current migration set and maintained docs.

## Verification

| Check | Result |
| --- | --- |
| Original application/database/test/fixture contents | All 41 files match pre-move SHA256 hashes |
| `npm run build` from the root | Passed; 2,131 modules transformed |
| `npm run lint` | Passed |
| `npm run check:worker` | Passed |
| `npm test` | Six passed; three staging tests skipped |
| `npm run worker:bundle` | Passed; 70 modules, standalone bundle generated |
| `npm run docs:check` | Passed; 24 maintained Markdown files, 52 local link targets |
| `npm run package:source` | Passed; 109 source/documentation/configuration/archive entries |
| Independent ZIP audit | All 94 folder-based authored files match; all three migrations included; no excluded runtime/credential paths |

The build/test tooling emitted a Node `module.register()` deprecation warning without failing. The source ZIP was regenerated after completing this record. Live integration tests require separate staging credentials; no live service verification is implied by this organization phase.

## Next coding phase

Start with milestone 1 in the [roadmap](../product/roadmap.md), then design public/institutional enrollment and the higher-secondary/PUC/college academic model before implementing their UI. Feature work has not started in this organization change.
