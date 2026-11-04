# Worker API reference

Implementation: [worker/index.ts](../../worker/index.ts). This reference describes the existing API; public enrollment, PUC and college endpoints do not exist yet. Most ordinary curriculum/progress reads and student-owned writes use Supabase directly under database policies.

## Request boundary

Except `/health` and preflight, send `Authorization: Bearer <Supabase access token>`. Send JSON with `Content-Type: application/json` where a JSON body is required. Browser origins must match `APP_ORIGIN`; requests with no Origin header still require authorization for protected routes.

Authenticated calls reserve the configured per-user and platform API quota before routing. Parents/staff and students have different limits. An unknown protected route still needs authentication and passes through quota handling.

| Status | Current meaning |
| --- | --- |
| 200 | Successful operation |
| 204 | Allowed CORS preflight |
| 400 | Validation, permission/business-rule, quota or upstream failure in the current implementation |
| 401 | Missing/invalid authentication |
| 403 | Unexpected browser origin |
| 404 | Unknown authenticated route |

Errors generally return `{"error":"message"}`. The API does not yet provide a standardized error-code or pagination envelope. Avoid assuming all permission failures are HTTP 403 or all quotas HTTP 429.

## Endpoints

IDs below are UUIDs. `schoolId: null` means global content and is restricted to platform administrators for writing.

| Method/path | Access | Body or parameters | Success shape |
| --- | --- | --- | --- |
| `GET /health` | Public, subject to origin check | None | `{ok:true}`; does not verify every dependency |
| `POST /students/create` | Verified parent | `name`, `email`, `password`, `schoolName`, `boardId`, `gradeId`, `subjectIds`, `guardianConsent:true` | `{studentId}` |
| `POST /students/consent` | Verified linked parent of Standard 1–5 student | `studentId`, `status:approved\|withdrawn`, `expectedVersion` | `{status,consentVersion,changed}`; atomic caller RPC |
| `PUT /assets/upload/:contentId` | Staff authorized for item's visibility | Raw PDF bytes with `application/pdf` | `{ok:true,cleanupPending,contentVersion}`; reserved/confirmed attachment |
| `GET /assets/:contentId` | User with content access | Content ID | Inline private PDF bytes |
| `POST /quiz/grade` | Approved student with published quiz access | `quizId`, own `studentId`, ordered numeric `answers`, optional `version` | `{attemptId,score,total,quizTitle,quizVersion,feedback}`; saved snapshot |
| `POST /staff/invite` | School admin or platform admin | `email`, `schoolId`, `role:editor\|school_admin` | `{ok:true}` |
| `POST /schools/create` | Platform admin | `name`, optional `city`, `state` | `{id}` |
| `POST /catalog/board` | Platform admin | `code`, `name` | `{id}` |
| `POST /catalog/subject` | Platform admin | `boardId`, `gradeId`, `name` | `{id}` |
| `POST /catalog/chapter` | Platform admin | `subjectId`, `title`, optional `position` | `{id}` |
| `POST /catalog/topic` | Platform admin | `chapterId`, `title`, optional `position` | `{id}` |
| `POST /flashcards/create` | Authorized staff | `topicId`, `schoolId`, `front`, `back`, `publish` | `{id}` |
| `POST /quizzes/create` | Authorized staff | `topicId`, `schoolId`, `title`, `questions`, `publish` | `{id}` |
| `POST /ai/tutor` | Approved student | `question`, optional own `conversationId` | `{answer,citations,conversationId?}` |
| `DELETE /ai/conversation/:id` | Conversation owner | Conversation ID | `{ok:true}` |
| `GET /pilot/usage` | Platform admin | None | Usage counters and configured planning limits |
| `POST /privacy/request` | Verified eligible self/guardian | `kind:export\|delete`, optional `targetUser` | `{ok:true,id,status,existing}`; caller RPC |
| `GET /privacy/requests` | Platform admin | None | `{requests}` for up to 100 unfulfilled requests |
| `POST /privacy/review` | Platform admin | `id`, `status:in_review\|fulfilled`, `processedExternally:true` when fulfilling | `{ok:true}` |

## Behavior details

Child creation accepts Standards 1–5 only, at least one valid assigned subject, explicit guardian approval and a password of at least ten characters. It caps linked children at ten per parent. Independent Standards 6–10 registration goes through Supabase Auth and its signup trigger, not this route.

Consent changes delegate to caller-scoped `change_guardian_consent` with `target_student`, `new_status` and `expected_version`. Guardian status, student approval, shared version and audit event commit together. Missing/stale versions require reloading **My children**; no fallback privileged writes occur. Existing learning records and enrollment status are preserved. See [consent contracts and rollout](guardian-consent.md).

Assessment create routes delegate to caller-authorized `save_assessment`; `publish:true` uses atomic save/publication. Quiz creation accepts 1–20 questions with 2–10 options, a valid `correctIndex` and optional explanation. Draft prompts/options can be incomplete; publication validates them. The studio's authenticated RPCs implement lists, detail, edits, revised drafts and publication. See the [assessment contracts](assessments.md).

Grading invokes caller-scoped `submit_quiz`, which rechecks published access, validates answer count/type/range, grades and snapshots the attempt in one transaction. The Worker does not separately retrieve privileged answer keys or insert a client-provided score. Feedback intentionally includes correct answers after successful submission. An omitted version remains compatible with older clients because each published quiz ID is immutable. Each successful call creates an attempt; retries can create additional practice attempts.

PDF uploads use the [ledger protocol](pdf-storage.md): MIME/header/byte validation, bounded body reading, service-only locked reservation/finalization, full old/new overlap accounting, guarded cleanup and mandatory initial inventory review. New routes are `GET /assets/limits` (staff), `GET /assets/storage` and `POST /assets/cleanup` (platform), and `DELETE /assets/:contentId` (actual authoring scope). Upload/detach success returns `{ok:true,cleanupPending}`; uploads also return `contentVersion` for the conditional metadata/publication save. The authenticated platform storage-monitoring read is exempt from Worker quota reservation; cleanup/mutations remain counted. Reads first check caller-visible content, then fetch the private current object with server credentials. Private PDF responses/viewer requests use no-store; already delivered files cannot be erased remotely.

Tutor requests cap questions at 1,000 characters, search accessible published material, and avoid calling Groq if no source or no configured key exists. Successful generated answers include lesson citations. Daily quotas, source limits, timeout and output-token cap are applied; failed provider calls can still consume reserved request quota.

Privacy requests record manual work. An export may be marked fulfilled only after external delivery is confirmed. Deletion requests remain in review until the operator actually deletes the account/data; current foreign-key dependencies require a tested process.

The [account operations contracts](account-operations.md) cover direct Settings RPCs, guardian request eligibility, atomic review, deletion preflight and school/platform usage. `GET /pilot/usage` uses caller-authorized SQL aggregation, returns `measuredAt`, privacy backlog and AI-key configuration presence, and bypasses quota reservation only for this authenticated platform-admin monitoring read. Quota counters exclude that route; they do not measure every incoming request.

Stored content authoring, plans, reviews, progress and maps use the Supabase API and its SQL grants/RLS. Document new contracts here when adding the expanded SaaS workflows.

Institution settings use authenticated `institution_workspaces(known_versions)` (optional cached versions) and `save_institution_branding(target_school,settings,expected_version)` Supabase RPCs. The [branding guide](branding.md) defines fields, permissions, optimistic versions and limits. These do not add a Worker route or change material entitlements.

Verified student invitations, roster, acceptance and revocation use authenticated **Supabase RPCs**, not new Worker routes. Contracts and permission/rollout details are in the [enrollment guide](enrollment.md). Private lesson/search/quiz access shares its database predicate; PDF and grading routes retain the caller-permission check.
