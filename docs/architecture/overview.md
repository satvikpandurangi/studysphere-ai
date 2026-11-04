# Architecture overview

## Implemented system

| Layer | Current implementation |
| --- | --- |
| Browser | React/TypeScript/Vite, role-based routes, Supabase client, PDF.js, React Flow, Markdown/math rendering |
| Identity | Supabase Auth |
| Data | Supabase PostgreSQL with RLS and restricted column grants |
| Privileged API | Cloudflare Worker |
| Private files | Supabase Storage `lesson-assets` bucket, accessed through authorized Worker routes |
| Optional AI | Groq behind the Worker |
| Authentication email | Intended Supabase custom SMTP integration; delivery needs verification |
| Frontend hosting | Cloudflare static Workers hosting via `wrangler.app.toml`; compatible release and live SPA/asset checks verified on 29 October 2026 |

The browser uses Supabase directly for ordinary data reads/writes subject to RLS. Privileged operations such as child creation, staff invitation, PDF upload/read, grading and AI go through the Worker. The Worker validates the user token, obtains the stored role, reserves API quota and applies operation-specific authorization.

## Data boundaries

- Student lesson access follows approved student profile, assigned subjects, publication state and global visibility or active verified school enrollment. A typed school label grants no private access.
- Parent educational reports follow guardian links.
- School editors/admins act through memberships. Only platform admins manage global curriculum/content.
- Quiz answer columns are not granted to students. Caller-authorized atomic database grading returns feedback after a valid submission and saves a historical snapshot.
- The private file bucket stays private. A content-authorized Worker route streams PDFs to the browser.
- AI searches under the student's RLS permissions before sending excerpts and recent conversation to Groq.
- Server secrets belong in Worker secrets, never `VITE_*` variables.

The first [verified enrollment workflow](enrollment.md) is implemented in source and locally tested. School administrators receive a minimal roster through authorized RPCs; unscoped student learning history remains private to the learner, guardian and platform administrator.

Current policy intent still needs the staging tests in the [testing guide](../development/testing.md).

The [assessment lifecycle](assessments.md) uses immutable published editions, authenticated draft/publication RPCs and transactional grading. Worker grading and legacy create routes delegate with caller identity; studio authoring uses the same database contracts directly.

[Institution branding](branding.md) is configured through admin-only versioned RPC writes and member-scoped reads. The sidebar selection changes presentation only; content permissions remain independent. Existing global/login presentation stays StudySphere.

## Expansion boundary

[Account operations](account-operations.md) adds shared Settings, verified self/guardian privacy requests, operator preflight and scoped aggregate monitoring. No automatic deletion or hosted pilot acceptance is implied.

Public learners, Standards 11–12 / PUC 1–2, and colleges require expansion beyond the current single academic profile and grade-based curriculum. Verified school enrollments already exist in source; separate program/course/term and institution-controlled cohort entitlements remain a design target. Preserve existing user IDs, content and progress in forward migrations.

Keep frontend, API and database code grouped in the current root layout. Split deployable services or frontend feature modules when an actual implementation warrants it; this reorganization introduces no new service dependency.
