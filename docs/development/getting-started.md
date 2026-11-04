# Getting started

## Workspace location after the drive move

The active project is `G:\Codex\2026-09-22\studysphere-ai-cloud-academic-workspace-your`. Open this folder for new development sessions. On 4 November 2026, compatibility junctions were created beneath `C:\Users\SATVIK\Documents\Codex` for the moved top-level folders. Existing chats and tools can continue using their original paths; the project files remain on `G:` rather than a duplicate copy on `C:`. The `G:` drive must be available for either path to work.

Local environment files and installed dependencies were preserved. Do not overwrite existing environment files or restore an entire older backup over the active project. The migration inventory, recovery results and validation logs are local operator evidence in `G:\Codex\.migration-recovery`; they are outside the source release.

## Local prerequisites

Use a Node runtime compatible with the pinned Vite/tooling dependencies and npm. The lockfile is committed with the source; use `npm ci` for reproducible installation. Python 3 is needed only for the source-package command. Installed tooling was preserved during the folder move.

Run every command at the repository root, which now contains `package.json`.

```powershell
npm ci
Copy-Item .env.example .env.local
```

Skip the copy when `.env.local` already exists. Fill settings locally; do not paste credentials into documentation or chat.

| Frontend variable | Meaning |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key |
| `VITE_API_BASE_URL` | Secure API base URL |

Server credentials do not belong in a `VITE_*` variable. Vite embeds frontend settings at build time.

## Backend setup

For a fresh development/staging project, follow the [migration guide](../architecture/database.md), optionally seed sample material, and create a **private** `lesson-assets` Storage bucket accepting PDF MIME type with a 15,000,000-byte limit. Configure email verification, the frontend site URL, exact `/verify-email` and `/reset-password` redirects for each approved origin, and custom SMTP before public onboarding tests. Actual email delivery must be tested.

Set Worker secrets through the provider's secure mechanism or an ignored local `.dev.vars` file. Required names are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`; `GROQ_API_KEY` is optional. Public limit/model/origin settings are in `wrangler.toml` and `wrangler.deploy.toml`.

For local Worker development, use `http://127.0.0.1:4173` as `APP_ORIGIN` and the matching browser hostname. The checked-in Wrangler files currently contain the historical deployed origin, **not** localhost. Supply the local override when starting the Worker:

```powershell
npm run worker:dev -- --var APP_ORIGIN:http://127.0.0.1:4173
```

Point `VITE_API_BASE_URL` at the local Worker address shown by Wrangler, then rebuild/restart the frontend. Avoid using production data for local tests. Use the same frontend origin in Supabase's allowed redirects.

## Run and verify

```powershell
npm run dev
```

If the Windows dependency optimizer is blocked by filesystem permissions, use the production preview path:

```powershell
npm run build
npm run preview
```

The dev/preview setup uses port 4173. Read startup output if a port is occupied; align API origin configuration with the actual address.

```powershell
npm run lint
npm run check:worker
npm test
npm run docs:check
```

See [testing](testing.md) for live RLS inputs. An unconfigured frontend shows its setup screen; a successful build does not configure services automatically.

## First platform administrator

Only for a service you own: create and verify your own parent account, then promote that exact verified account once through the Supabase SQL editor:

```sql
update public.profiles
set role = 'platform_admin'
where id = (
  select id from auth.users
  where email = 'your-verified-admin@example.com'
    and email_confirmed_at is not null
);
```

Confirm exactly one row changed and sign in again. Use admin tools to manage curriculum and invite staff; never expose account-promotion operations to a public client.

For the local port used in the current browser session, the exact confirmation callback is `http://127.0.0.1:5173/verify-email`. It and the matching `/reset-password` callback were saved by the owner on 29 October 2026; new environments still require explicit Auth configuration. A successful local build does not allow-list callbacks. Preserve the production Site URL. Use an approved custom SMTP sender for real school addresses and verify actual receipt; the built-in sender is restricted. See the [verification flow](../architecture/account-operations.md#email-verification).

## Current 5173 browser session

The current ignored `.env.local` points its API at `http://127.0.0.1:8787`, not the production API. The API runs with `npm run worker:dev -- --local --ip 127.0.0.1 --port 8787 --var APP_ORIGIN:http://127.0.0.1:5173`. Its existing backend credential is in ignored `.dev.vars`; never copy that file into a source release or frontend environment. It still accesses the selected Supabase project, so use only approved synthetic data for operator tests. Keep PDF uploads paused.

The frontend is started with `npm run dev -- --port 5173 --strictPort`. If using another port, align the local API origin and approved Auth callbacks. Before any hosted frontend build, explicitly supply the target's production `VITE_API_BASE_URL` and Supabase settings; a local build using this current environment embeds localhost and must not be deployed.
