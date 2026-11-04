# Institution branding and contact settings

Current rollout: the database upgrade was applied on 23 October and the compatible frontend/API release is deployed and smoke-tested on 29 October 2026. Authenticated hosted workflow acceptance remains pending; see the [upgrade record](../history/2026-10-23-hosted-upgrade.md) and [release evidence](../history/2026-10-29-cloudflare-release.md). Implementation-only statements below describe the original local milestone.

Implemented locally on 22 October 2026. Hosted migration, PostgREST and real-device acceptance remain pending. This adds presentation settings to the existing web workspace, without a customer fork or paid service.

## Administrator workflow

School/platform administrators open **Institution settings**, automatically open their sole managed institution, and edit its display name, logo, primary/accent colors and support email/phone/website. The preview changes immediately; **Save settings** applies changes. **Reset customization** loads defaults into the preview and clears optional identity/contact fields; save to apply. **Load saved settings** discards local edits after confirmation and fetches the latest stored version, including when resolving another administrator's edits.

The canonical `schools.name` remains unchanged, including normalized signup matching. A blank display name falls back to that canonical name. No branding records are backfilled. Existing accounts, enrollments, curriculum and learning records are unchanged.

Logos are selected from local PNG/JPEG/WebP files up to 96 KiB. The browser decodes the image and limits dimensions to 1024 × 1024. The database bounds the stored data URL and permits only base64 image MIME prefixes for those three formats; it does not perform image decoding/dimension verification. SVG and remote image URLs are rejected. The logo is stored with the configuration in PostgreSQL, avoiding an external image request, public bucket or separate asset service. Use a small approved logo; this is not a general media library.

Primary defaults to `#2167e9` and accent to `#15977e`, matching the existing palette. The server requires six-digit hex colors and at least 4.5:1 primary/white contrast and 3:1 accent/white contrast. The accent is used for decorative icons, not body text. Shared buttons, links, brand icons and navigation use scoped theme rules; layout, typography, content illustrations and semantic success/error colors remain intact. These checks are not a complete accessibility audit.

Support fields are optional and bounded. Email/phone formats are validated; website addresses require HTTPS, without embedded credentials. Contact links are shown only inside the authenticated workspace. New website tabs use `noopener noreferrer`; mail addresses are URL-encoded. Enter institution-approved support details, not a student's private contact information.

## Automatic identity and permissions

The sidebar no longer exposes a branding/workspace selector to students, guardians, teachers, school admins or platform admins. A non-platform account with exactly one currently authorized institution receives that institution's identity automatically. Accounts with none or multiple authorized institutions stay neutral; a platform operator stays neutral rather than acquiring an arbitrary school's identity. The source of truth is the existing caller-authorized `institution_workspaces` RPC. Typed signup labels never choose branding or create entitlements. Branding still does not filter lessons or change content permissions.

Single-school administrators open institution settings and aggregate usage directly without a redundant institution picker. The enrollment roster and teacher assessment editor also default to the sole authorized school. Multi-institution administration retains scoped configuration controls where necessary; those choose the record being edited, not the user's workspace identity. Saving branding no longer instructs users to use the removed sidebar selector.

Configuration is readable through an authenticated RPC by:

- School staff with an actual membership at that institution; school admins can manage, editors can only read.
- Approved students with active verified enrollment at an active school.
- Guardians with an approved link to an approved child who has active enrollment at an active school.
- Platform administrators, including configuration for inactive schools.

A typed signup label and a role without the necessary membership grant no access. The underlying settings table has RLS enabled and no anonymous/authenticated table grants. Login and public pages retain StudySphere branding. No public tenant discovery page is added.

The browser refreshes configurations on initial/manual load and return to window focus (at most once per minute), with no background polling. If access disappears or refresh fails, it clears the displayed branding and uses defaults. Server reads/writes enforce current permissions independently; this refresh is not a revocation mechanism for learning material. Already delivered logos/contact details cannot be erased from a user's memory or screenshots.

## Database contracts

Apply [202610220003_institution_branding.sql](../../supabase/migrations/202610220003_institution_branding.sql) after all preceding migrations. It adds `institution_branding`, private permission/contrast helpers and two authenticated RPCs. It changes no existing content-access predicate or Worker route.

| RPC | Arguments | Result |
| --- | --- | --- |
| `institution_workspaces` | optional `known_versions` object mapping school IDs to cached versions (defaults `{}`) | Array of `{id,name,can_manage,branding}` for currently authorized schools; no audit actor IDs; matching versions omit `branding.logo_data_url` |
| `save_institution_branding` | `target_school`, `settings`, `expected_version` | Saved branding row including version/timestamp, excluding audit actor ID |

Settings accepts only `display_name`, `logo_data_url`, `primary_color`, `accent_color`, `support_email`, `support_phone`, `website` (strings/null). Unknown fields/types and oversized settings are rejected. Omitted optional values clear them; omitted colors use defaults. Send the complete editable form. First save expects version 0; later saves require the returned version. Saves lock the school row, recheck authority, validate and update atomically. Stale writes fail without overwriting changes. Reset keeps a row with a new version, avoiding reuse of version zero. Successful writes record `institution.branding_saved` in the audit log without duplicating the logo/contact payload.

The list currently returns all authorized institutions without pagination. The browser supplies cached versions on initial load, explicit refresh and return-to-focus refreshes at least 60 seconds apart; there is no idle branding polling. unchanged logos are omitted and reused from memory only when institution ID/version match. Revoked institutions disappear from the result regardless of supplied versions. First loads and changed configurations include embedded logos, up to roughly 128 KiB per configured institution. There is no persistent image cache. Confirm pilot scale before adding many memberships. Browser refreshes and writes use Supabase directly and are not covered by Worker-only quota counters. No billing, feature entitlements, AI allowance or shared/dedicated deployment choice is implemented here.

## Rollout and recovery

Back up the hosted database, verify applied migrations and run this forward migration in staging first. Deploy compatible frontend after the migration. If the RPC is missing/unavailable, the app shows a small sidebar notice and defaults; ordinary learning is not gated by branding loading. No new environment secret or storage bucket is required. If an existing Content Security Policy is configured, its `img-src` must allow `data:` for these logos; validate the actual host policy.

Test school/platform administration, editor read-only behavior, student/guardian access, multiple enrollments, refreshed revocation, stale saves, valid/invalid logo files, support links and desktop/mobile navigation against hosted Auth/PostgREST. Inspect deployed grants/default privileges and existing custom functions. Local SQL tests do not prove hosted concurrent-session behavior. Revert a bad customization with reset/save; retain audit/version history and fix schema errors forward rather than rewriting older migrations.

Feature/material configuration, cohorts, account controls, usage monitoring and funded pilot acceptance remain separate roadmap work.
