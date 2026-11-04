# Workspace detail audit and school rehearsal — 29 October 2026

This is local frontend implementation plus bounded live synthetic evidence. It does not approve the school launch or certify 1,500 simultaneous users. The source changes have not been deployed.

## Fixed in source

- Removed the sidebar branding selector for every role. A single verified school applies automatically to its student/guardian/staff members; platform and ambiguous/unaffiliated accounts remain neutral. No typed school-name entitlement was introduced.
- Removed redundant sole-school pickers in institution settings, usage, enrollment and assessment scope. Multi-school record administration remains explicit.
- Removed school-administration navigation from teachers and disallowed those direct frontend routes. Database/API permissions are still authoritative.
- Replaced the internal editor role label with Teacher, updated stale branding instructions and removed the empty selector container.
- Added sign-out failure feedback and disabled duplicate submission. Made the sidebar scroll internally so long navigation and school names do not push Sign out beyond a short viewport.
- Fixed mobile navigation: expanded-state announcement, focus containment, Escape dismissal, focus return, inactive hidden sidebar and inactive background while open. The 390px fixture has no horizontal overflow.
- Removed one-minute idle branding polling; refresh occurs on initial/manual load and return to focus, throttled to once per minute. At 1,500 idle tabs this avoids the previous scheduled 90,000 branding RPCs/hour; this is request arithmetic, not a capacity result.
- Surfaced content-studio membership/catalog failures instead of empty controls, and made assessment empty-state guidance match automatic school scope.
- Repaired isolated legacy bytes in the two privacy pages without corrupting their existing UTF-8 text.

## Verification evidence

`tests/app-shell.test.tsx` checks role navigation, absence of any branding picker and usable content on branding failure. Branding tests cover automatic single-school identity, neutral ambiguous/platform accounts and revoked-cache removal. The existing database boundary suites still enforce grants and verified enrollment.

Ignored `.local/workspace-audit-preview/` uses real components/styles with synthetic service responses: student/teacher sidebar, automatic single-school settings, mobile focus wrap and Escape/focus return. This is visual UI evidence, not live role authentication.

The new operator-only `scripts/pilot-school-journey.mjs --execute` passed seven live checks with the existing one-school synthetic accounts: common verified school identity, draft-hidden then published lesson, quiz questions with hidden answer key, deployed Worker grading/persistent feedback, preserved historical results after revision, published flashcard/review persistence and guardian child progress with unrelated older learner history denied. It writes fresh clearly synthetic lesson/assessment records, tracks their IDs under ignored `.local/pilot-auth/`, does not enable PDF uploads and does not recreate the retired second school.

The owner approved two new Gmail-alias test accounts and up to six signup/resend messages. `scripts/pilot-email-verification.mjs start --execute` created the student and parent through ordinary signup and proved both have no immediate session and both reject unverified password sign-in. One resend for each was accepted, for four requested messages total. Brevo reports all four messages Delivered (initial pair at 18:49 IST, resend pair at 18:50 IST). Opening the newest links and checking dashboard/session/profile/enrollment remain pending the owner's inbox interaction. The script does not auto-confirm accounts or fetch verification tokens.

The local frontend had still targeted the hosted API, whose strict production origin rejected localhost. Local development now uses a loopback-only Worker on `127.0.0.1:8787`, an ignored server-secret binding and `APP_ORIGIN=http://127.0.0.1:5173`; the frontend's ignored API setting points there. Four real local runtime checks passed: authenticated synthetic teacher PDF limits (uploads still paused), unexpected-origin 403, anonymous 401 and allowed preflight 204. No hosted origin policy or deployment was changed.

## Still open

- Confirm both real signup links, sign-in/dashboard routing and reused/expired-link behavior without weakening confirmation.
- Full new parent/child onboarding and real target-device acceptance remain separate from the existing synthetic guardian data checks.
- Content studio and staff overview retain some redundant scoped controls; changing existing content scope must preserve draft ownership and is not silently rewritten by this audit.
- Teacher/admin/learner end-to-end browser workflows with real sessions across all edited screens still need acceptance; the live API checks above are narrower evidence.
- Perform the staged capacity plan only after functional acceptance and isolated fixtures/resource budgets are ready. No 1,500-user load was sent to the shared project.

## Frontend publication — 30 October 2026

The owner explicitly approved publication of the frontend containing this workspace/navigation audit and six-digit email verification. Version `fb058781-9a26-42ec-8ebf-01fc9f07b887` is live; login and verification routes returned HTTP 200 and the remote compiled entry matched the tested production bundle exactly. An existing signed-in synthetic student reached its dashboard with its automatic school identity. These checks do not certify all roles/devices or complete email confirmation; see [email rollout](../operations/email-delivery.md).
