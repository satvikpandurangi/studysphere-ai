# Link-first verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add explicit link confirmation with a six-digit fallback, then verify safe rollout and the remaining account journeys.

**Architecture:** Reuse /verify-email, AuthLayout and the publishable Supabase client. Parse a bounded custom fragment into temporary component state, scrub it from history, and call verifyOtp only from an explicit confirmation action. Preserve normal code entry, legacy callbacks and recovery.

**Tech Stack:** React 19, TypeScript, React Router 7, Supabase JS 2.58.0, Vite 7 and Vitest 3; existing Cloudflare static frontend. No new runtime dependencies.

**Spec:** [Approved design](../specs/2026-11-02-link-first-verification-design.md). Approved by the owner on 2 November 2026.

## Global Constraints

- Preserve the current design and six-digit provider length, expiry, rate limits and enrollment policy.
- No new database/schema, schools, credentials, paid services or unrelated account changes.
- Never verify during mount, URL parsing or ordinary preview; explicit button activation is required.
- No sensitive payload in logs, analytics, persistence, rendered errors or external redirects.
- Frontend must be deployed before changing the shared email template; prior live-email allowances are exhausted.
- Implement in this chat. Do not initialize Git or invent commits in this workspace if no repository is present.

## Review Focus

- A signed-in different account must not silently replace its session when a link is opened.
- Duplicate fragment parameters, malformed/oversized values and unsupported types must fail closed.
- Refresh/back/remount and repeated presses must not trigger unsolicited or concurrent verification.
- Mail-provider wrapping must preserve the fragment; missing fragments leave the code fallback usable.
- Signup handling must not break recovery links or admit an unconfirmed session into a dashboard.

### Task 1: Parse and validate link payloads

**Files:** src/lib/emailVerification.ts; tests/email-verification.test.ts.

**Interfaces:** Add readConfirmationLink(hash: string): { tokenHash: string | null; invalid: boolean }. Accept exactly one confirmation_token_hash (32–256 ASCII alphanumeric/underscore/hyphen characters) and one confirmation_type=signup. No supplied URL or redirect is followed. Keep confirmationRedirect and code helpers compatible.

- [x] Add failing tests for a valid synthetic payload, empty/oversized/invalid/duplicate parameters, unsupported type, no-link and legacy callback inputs. Assert parsing calls no provider API.
- [x] Run npm test -- tests/email-verification.test.ts and observe the new failures.
- [x] Implement the pure parser, without global/browser state or side effects.
- [x] Run the same command; require all existing and added cases to pass.

### Task 2: Explicit confirmation UI and dual-option email

**Files:** src/pages/VerifyEmailPage.tsx; src/lib/emailVerification.ts; supabase/templates/confirmation.html; tests/email-verification.test.ts. Reuse existing styles unless a small shared-spacing adjustment is required.

**Interfaces:** The page captures readConfirmationLink(location.hash) once into component state and replaces the credential-bearing URL with /verify-email. Confirm email delegates to auth.verifyOtp({ token_hash: tokenHash, type: 'email' }); code submission retains { email, token, type: 'email' }. Both require a confirmed user and session before dashboard navigation. An in-flight guard prevents duplicate exchanges. Do not auto-redirect a signed-in user while a pending link is awaiting explicit confirmation.

- [x] Add failing verifier/session/duplicate-submit tests around a small dependency-injected helper if needed; retain unconfirmed-session denial and sanitized error cases. Add template-contract assertions for the button and {{ .Token }} fallback.
- [x] Observe the failures with the targeted test command before implementing.
- [x] Add the Confirm email action with code alternative, scrub the fragment and show safe failure/resend/sign-in guidance. Explicit confirmation warns that it continues with the linked account when another session exists. Clear payload after exchange or abandonment.
- [x] Update the maintained template to link to {{ .RedirectTo }}#confirmation_token_hash={{ .TokenHash }}&amp;confirmation_type=signup and display the six-digit fallback. Keep raw provider confirmation URLs out of the primary link.
- [x] Run targeted tests. Exercise the real component with isolated synthetic provider responses: no call on load, one call on click, busy repeat, invalid/expired/used link, code success/failure, signed-in account case, refresh/remount, desktop and narrow layout. Keep fixture payloads synthetic and screenshots free of real tokens.

### Task 3: Validation, compatible rollout and manual acceptance

**Files:** docs/architecture/account-operations.md; docs/operations/email-delivery.md; docs/development/testing.md; docs/product/requirements.md; docs/product/roadmap.md; docs/history/CHANGELOG.md; docs/launch/pilot-acceptance.md. Existing ResetPasswordPage/AuthPage recovery behavior is inspected and tested; any discovered defect gets a failing regression before repair.

- [x] Run npm run build, npm run lint, npm run check:worker, npm test and npm run docs:check. Record skipped live boundaries accurately.
- [x] Build with the hosted VITE_API_BASE_URL, inspect for loopback URLs/backend secrets, and run npm run app:check. Keep API/database unchanged.
- [x] Publish through the existing frontend deployment path within authorized scope; verify the hosted bundle/routes and record prior/new versions. Do not infer live success from build results.
- [ ] Apply the shared template only after frontend compatibility is verified. Save/reload the template and retain the previous code-only body for rollback.
- [x] Prepare then request one bounded, explicit live-email allowance covering the existing unverified student, parent and recovery testing. Never resend automatically after an ambiguous request or outside that allowance.
- [ ] Use owner inbox interaction to test actual link transport/confirmation, code fallback, reused/expired link guidance, resend and role-specific dashboards. Keep separate provider-backed role/enrollment checks. Password-reset completion is owner-operated; do not enter or change their password through browser automation.
- [ ] Update docs/capability status and this checklist with actual evidence and remaining gates. Run docs checks and npm run package:source; verify release excludes credentials, .local, generated bundles and logs.

## Self-review

The three tasks cover the approved spec and five review-focus conditions. No runtime install or migration is needed. Local tests can prove behavior and guardrails; actual mail transport, inbox actions and password changes remain separate live evidence. Ordinary prefetch protection is a design property, not a promise against every automated browser. A missing or consumed payload always leaves sign-in/resend/code recovery available.

## Execution record

2 November: Tasks 1–2 complete, including red/green tests and synthetic browser validation. Task 3 local checks, frontend publication and template save/reload are complete; actual inbox/recovery acceptance is waiting for bounded message approval. No Git metadata exists, so no worktree/commit was fabricated. Ruling: readConfirmationLink additionally accepts an optional search argument to reject and scrub misplaced query credentials; client initialization disables legacy URL auto-detection whenever custom confirmation fields occur. Independent review found this required guard. Previous frontend version fb058781-9a26-42ec-8ebf-01fc9f07b887 remains code-capable for fallback; restore the recorded code-only template before any rollback that removes the new link UI.

4 November: recovery release cfd8eab0-fb9e-4dc3-b9f4-35261050cfb8 published after fresh 148-test gate; hosted entry/routes verified. Recovery template save and final fourth recovery email remain pending owner action; no new email sent.

4 November acceptance: owner confirmed Inbox/reset/correct-parent sign-in. Original fixture password rejected; parent role preserved. One-school follow-up passed 17 API/workflows, 14 deployed browser workflows and four role-screen smokes; final access/consent restored, uploads paused. Fresh-template code/resend and exact prior recovery-template backup verification remain outside this completed controlled journey. No fifth email requested.
