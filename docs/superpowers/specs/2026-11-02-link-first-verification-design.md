# Link-first signup confirmation

Date: 2 November 2026
Status: design approved by the owner on 2 November 2026. Implementation plan awaits review; no product code or hosted settings changed for this proposal.

## Intent

Make signup verification easier for students and parents while retaining the working six-digit fallback and existing StudySphere design. The owner chose link-first confirmation after comparing links and codes.

## Approaches

- Code only: already works for the parent test, but requires copying or typing.
- Direct provider confirmation link: convenient, but automated email fetching can consume its one-use token.
- Link to an explicit confirmation page plus code fallback: selected direction. It adds a confirmation button in the app before the token is exchanged, following Supabase's documented intermediate-page approach.

## Proposed behavior

The email prominently offers Verify my email and includes the six-digit code below as fallback. Its link opens the existing /verify-email route. Opening, previewing, refreshing or rendering the route never initiates verification. A user must press Confirm email to exchange the token with Supabase. A successful confirmed session routes through existing role handling to the appropriate dashboard. This is two presses (email button, then app button), rather than an automatic single-click confirmation.

The implementation will use a bounded token-hash payload in the URL fragment rather than putting bearer material in query strings. The page captures it in component memory and removes it from the address bar/history entry before interaction. No local/session storage, analytics, logging, error text or external redirect may retain or echo it. Verification uses the existing publishable client and provider verification API; no backend secret or administrative auto-confirmation. Hash handling must coexist with current legacy callbacks and password recovery.

The app will retain the code form as an alternative. Invalid, expired, superseded or used links show useful resend/sign-in/code guidance without reflecting provider-supplied descriptions. Repeated confirmation presses are disabled during submission. An existing signed-in session must not silently consume a different account's link or change accounts on page load; any link exchange requires the explicit button.

The template uses the already configured frontend callback, not a user-controlled destination. Its URL construction and fragment preservation through the actual mail provider must be tested before declaring live acceptance. This reduces ordinary prefetch consumption; it is not a guarantee against scanners that execute arbitrary interactions.

## Boundaries

Preserve email confirmation, six-digit length, provider expiry/rate limits, guardian policy, existing account passwords, verified enrollment rules and current layout. No schema changes, new school fixtures, paid services or unrelated auth redesign. Signup confirmation is not school enrollment or MFA.

## Verification

Start with failing regression tests for valid/malformed/duplicate payloads, allowed type, credential cleanup, no automatic verifier call, explicit submission, duplicate presses, fallback codes and role routing. Check template/button/code consistency and ordinary recovery behavior. Exercise the real UI with isolated synthetic services at desktop/mobile sizes and run build, lint, Worker types, tests and docs checks.

Then deploy compatible frontend before applying the shared template. Live student/parent link, used/expired/resend and actual password-reset completion need controlled mailbox interactions. Prior email allowances are exhausted; request one concrete bounded allowance for new live messages after preparing the implementation. Any password entry/change in browser remains owner-controlled. Do not alter an existing user's password to manufacture acceptance.

## Acceptance and rollout

Keep the currently working code-only hosted template until the compatible frontend is live. Record deployment version, template save, exact authorized message counts and actual provider/inbox/dashboard evidence separately. If the new links fail provider transport, retain code fallback and do not claim link acceptance. Update capability status, account guide, email operations, roadmap and changelog with the implementation and its evidence.

Reference: https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching
