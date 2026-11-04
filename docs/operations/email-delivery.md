# Authentication email delivery

Status checked: 29 October 2026. Custom SMTP and the two exact local callbacks are saved. **One owner-approved password-recovery message was accepted, reported delivered by Brevo and confirmed in the owner's inbox.** New-account confirmation, expiration/resend and full password-reset acceptance remain pending. The verification screen is implemented, but UI feedback is not proof of mail delivery.

## Current evidence

- StudySphere project `flsckscpvqqyyqvsyjwp`: active and healthy.
- Custom SMTP: enabled with Brevo, verified owner-controlled sender, port 587 and the stored encrypted SMTP password. No secret was copied into source or chat.
- Owner: no domain; a Brevo account is now accessible, with a verified owner-controlled sender and 300 free sends available.
- The reported account: already confirmed; use its existing password on Sign in. Do not reset or auto-confirm it to test signup.
- The freeze warning names a different project, Tanvo (`ffyzsfieulmrwsjmulqc`), which is inactive. No restoration was performed.

Supabase's built-in sender is restricted to project-team addresses and has no delivery guarantee. It cannot be accepted as school email infrastructure. [Official SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

## Configuration and recovery delivery evidence

The owner completed the Brevo key setup and saved the prepared Supabase form. The dashboard reports the SMTP password as stored/hidden. Host `smtp-relay.brevo.com`, port `587` and sender name StudySphere are configured. Both exact callbacks, `http://127.0.0.1:5173/verify-email` and `http://127.0.0.1:5173/reset-password`, are saved alongside the existing hosted callback. The production Site URL is unchanged. The assistant neither generated the final key nor stored its full value locally.

Automatic approval review required explicit authorization for a test message. After the owner approved **one** recovery email to their existing address, the Auth API accepted the request and `auth.users.recovery_sent_at` advanced to 29 October 2026 12:27:27 UTC (17:57:27 IST). Brevo's transactional log reports Sent, Delivered and Clicked events for that message, with the temporary provider sender rewrite documented below. The owner explicitly confirmed receipt in the inbox. No password change was performed by the assistant, and no second email was sent.

This proves this configured connection delivered one real recovery message. It does not prove new-signup confirmation, link expiration/resend, completed password change, school-wide sending capacity or reliable delivery to all recipient domains. Saved callbacks establish the allow-list configuration; they do not by themselves prove the complete reset/confirmation journeys. Ignored screenshots are under `.local/verification-preview/`; no recovery tokens or email body were included in the maintained evidence.

## Current zero-cash testing provider

Brevo's Free plan includes 300 sends per day. Brevo documents temporary sender-domain replacement with a `brevosend.com` address for unauthenticated domains, including free email addresses. This is a candidate for bounded testing without purchasing a domain, subject to provider signup, sender validation and transactional activation. It is not a promised delivery result or approved school rollout. [Free limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [temporary sender replacement](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication).

The daily allowance covers signup, resend, recovery and other messages together. It cannot cover 1,500 same-day signup emails. Queued confirmations may expire before delivery; do not rely on the provider queue for timely onboarding. Before school rollout, agree actual daily and burst requirements and authenticate an owner-approved school/product sending domain. Existing school-domain access may avoid a new purchase.

## Owner setup handover

1. Create a Free Brevo account and complete its email verification and required onboarding. The owner must enter new credentials and accept the provider's terms. Do not select a paid plan.
2. Validate the owner-controlled sender and confirm transactional SMTP sending is enabled. Record only non-secret host, port, sender name and sender address in the handover.
3. Obtain the provider's SMTP login and SMTP key. These are not the Supabase database password or the owner's ordinary email password. Save credentials only through an approved ignored local credential file or directly in the SMTP dashboard; never in chat, frontend variables, docs or packages.
4. Review the concrete provider/sender configuration, email-data destination and free allowance before applying it to Supabase. Keep email confirmation enabled.
5. Configure the exact callback for each approved frontend origin. The local development callback is `http://127.0.0.1:5173/verify-email`; the hosted Site URL remains the production frontend. Do not add unrestricted origins.

## Delivery acceptance

Use a controlled new unverified synthetic account and a real owner-controlled inbox. Confirm provider acceptance and actual inbox receipt, follow the link, verify the Auth confirmation and correct dashboard routing, then rehearse expired/resend and password recovery. Keep requests bounded and record provider message status without copying tokens, passwords or mail contents into public evidence. A verified existing account is not a valid pending-signup test.

No database migration is required for SMTP settings. No real-student import or school-wide invitation should start before delivery acceptance.

## Separate Tanvo warning

The pasted notice says its normal restoration window ends in five days; confirm the exact deadline in that project's dashboard. Supabase documents a 90-day normal restore window for paused projects. If its data is needed, the owner should resume that specific project before the shown deadline; no paid upgrade is required merely to use an available normal restore action. If the normal window has ended, inspect the dashboard's backup download/recovery options. Do not restore, replace or reconfigure StudySphere in response to the Tanvo warning. [Official pausing and restore guidance](https://supabase.com/docs/guides/platform/free-project-pausing).

## New signup/resend check in progress

The owner subsequently approved exactly two synthetic Gmail-alias accounts and up to six signup/resend messages. Two initial signup requests and one resend for each were accepted; Brevo reported all four as Delivered at 18:49–18:50 IST on 29 October. Both accounts still rejected password sign-in while unverified at the last status check. Actual link completion/dashboard acceptance remains pending the owner's inbox interaction; no administrative auto-confirmation or token extraction was used. The operator-only helper reads approved destinations from ignored `.local/pilot-auth/email-approval.json` and stores credentials privately, outside source releases. See the [workspace audit](../history/2026-10-29-workspace-audit.md).

## Fresh link rerun — 30 October 2026

At the owner's request, the existing two test accounts were checked and both were still unverified. One fresh resend for each was accepted at approximately 00:16 IST on 30 October, bringing the assistant-requested total to six of six approved messages. The local frontend (5173) and API (8787) both returned HTTP 200. Use the newest message inside each Gmail thread; older links may be superseded. Inbox/link/dashboard acceptance is still pending. No account was recreated or auto-confirmed. The operator's post-confirmation check signs out only its own CLI session, preserving the user's browser session.

## Parent link failure and code-based fallback — 30 October 2026

The owner reported an expired-or-used link screen for the parent alias. A scoped Auth check still showed both test accounts unconfirmed; the parent had a later resend at 00:23 IST than the assistant's 00:16 resend. Superseded links and provider link processing are possible causes, but a particular cause has not been proven. Do not label the account verified from the redirect/error screen or disable confirmation to proceed.

The verification page accepts an email and six-digit code through `auth.verifyOtp` with type `email`. It retains server enforcement, a separate resend action/cooldown, code-length checks and explicit invalid/expired guidance. Codes remain in component memory only and are cleared after successful verification or resend. Existing link callbacks remain supported. The maintained signup email is [confirmation.html](../../supabase/templates/confirmation.html), using Supabase's `{{ .Token }}` placeholder and no single-use URL. This follows [Supabase's documented OTP alternative](https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching) for problems with email links; it is not administrative confirmation.

After separate explicit owner approval, the frontend was published as version `fb058781-9a26-42ec-8ebf-01fc9f07b887` on 30 October. Live login/verification routes returned 200 and the hosted entry matched the tested compiled asset exactly, with the production API URL. The existing signed-in synthetic student continued to its dashboard with automatic school identity. The build passed 134 local tests and a Wrangler dry run; no API or database deployment was performed. The saved code-only template was then verified after dashboard reload. Exactly one additionally approved parent resend was accepted at 00:46 IST and Brevo reported Delivered with subject `Your StudySphere verification code`. Its separate one-use intent/approval ledger prevents another assistant send. The original six-message allowance remains unchanged; seven assistant-requested messages have now been used. Inbox receipt, manual code entry and parent dashboard acceptance remain pending.

The Brevo settings page found during diagnosis exposes anonymous tracking, which is not a switch to disable link rewriting. No unrelated tracking or privacy setting was changed. Do not claim the inspection disabled tracking or proved a specific link failure.

Rollback must preserve email/frontend compatibility. The previous frontend version is `85dbafc5-4f9b-47c7-b578-70a93f83c1d8`; before reverting to a version without code entry, restore the former link-based signup template (subject `Confirm your email address`, link using `{{ .ConfirmationURL }}`). Do not leave a code-only template paired with a frontend that cannot accept codes.

## OTP length alignment — 30 October 2026

The owner received an eight-digit parent code in the inbox. Read-only dashboard inspection confirmed Email OTP length 8 and expiration 3600 seconds. The six-digit form and wording did not match the provider configuration; this was an implementation error, not a delivery failure. The owner explicitly selected six digits. The source now shares one six-digit constant across validation, input pattern, typing/paste limit and instructions; the template asks for the complete code without hard-coding its length. An intermediate eight-digit source/UI check was not deployed. After explicit action-time owner approval, Supabase's Email OTP length was saved as 6 and confirmed after reload; expiry remains 3600 seconds and email confirmation stays enabled. Exactly one newly approved parent resend was accepted at 00:58 IST, and the Auth dispatch timestamp advanced accordingly. A separate one-use ledger records this eighth assistant-requested message; no allowance remains for another send. The original hosted frontend already accepts six digits; the new shared source constant/input regression checks are locally validated and do not require another deployment for this provider alignment.

## Parent verification accepted — 30 October 2026

Brevo reported the newly approved 00:58 IST parent message as Delivered. The owner entered its code in the app and reported the parent dashboard opened. A subsequent provider-backed check at approximately 01:00 IST confirmed that the parent is email-confirmed, password sign-in succeeds, the profile retains role `parent`, and `institution_workspaces` returns no institution entitlement. The checker signed out only its own local session. No administrative auto-confirmation or real account change was used. The student alias still rejects unverified sign-in, so its email verification and the combined two-account gate remain pending. Eight assistant-requested emails have been used across the six-message allowance and two separately approved one-message follow-ups; no additional send is authorized.

## Link-first confirmation — 2 November 2026

Source now includes a link-first signup template and explicit confirmation action, retaining the six-digit fallback. The email opens /verify-email with a custom token hash in the fragment. The page captures it in memory, removes it from the address bar/history entry and waits for Confirm email before auth.verifyOtp with token_hash and type email. It never follows a supplied redirect URL. Invalid/duplicate/oversized or mixed payloads fail closed; Supabase URL auto-detection is disabled at client initialization for custom confirmation fields, while ordinary legacy/recovery callbacks remain supported. Provider errors cannot echo the link payload. A signed-in user sees an account-continuation warning; opening the link alone cannot switch accounts.

The approved design and implementation plan are under docs/superpowers/. Frontend version ed08ffd3-59da-4f37-84ae-0546863445bb was published on 2 November, and the remote compiled entry exactly matched the tested build. Verification/login/recovery routes returned 200 and the live synthetic-link screen scrubbed the fragment and waited for Confirm email. The shared template was then saved and reloaded with subject Verify your StudySphere email, its primary app link and the code fallback. Fresh real-link/recovery inbox acceptance remains pending explicit test-message authorization. The previous six-digit parent journey remains valid historical evidence, not proof of this new link transport. Prior message allowances are exhausted. No API, schema, provider expiry or code-length change is required.

## Approved inbox rehearsal started — 2 November 2026

The owner explicitly approved one new synthetic parent alias and up to four messages across that alias, the existing student alias and one recovery message to the earlier parent test account. Destinations, credentials and the one-use action ledger remain ignored under .local/pilot-auth. No real school users or new school records are involved.

Phase one used two messages at approximately 02:10 IST: the existing unverified student's resend and the new parent's signup were accepted by Auth. The new parent has no confirmed session from signup. Both callbacks target the deployed frontend /verify-email. The owner has been asked to complete the student link first; no link/code was extracted by the assistant. Two messages remain, including the one planned recovery email. Each action reserves its allowance before the side effect and cannot be repeated automatically after interruption or ambiguous failure. Provider/inbox/link/dashboard and full recovery results are still pending.

Student link acceptance at approximately 02:13 IST: the owner reported the student dashboard opened after the email button and explicit Confirm email action. Provider-backed checks confirmed email verification, successful password sign-in, retained student role, no institution workspace entitlement and no automatic verified enrollment. The new parent remains unconfirmed; its email is being used for the six-digit fallback check. No additional messages were sent; two of four requests remain.

The first parent-dashboard report did not pass backend acceptance: the new parent remained unconfirmed, and the owner identified the open session as the existing student account. The owner is retrying the new parent code after sign-out with the exact new-parent email. Do not count a visible dashboard as verification of a different intended account. One approved recovery request to the earlier parent test account was accepted at approximately 02:14 IST; keep it unopened until the new-parent identity check is resolved. Three of four approved messages are used; one signup/resend request remains, and the single recovery request has already been used.

New parent link acceptance at approximately 02:20 IST: after signing out of the existing student session, the owner used the new-parent email link and reported successful verification. Provider-backed checks now confirm both student and new parent sign-in, the correct roles and no automatic institution entitlement; the student still has no verified enrollment. The new parent passed via the link, not the code fallback, so do not label this as new-template live-code evidence. The prior 30 October code acceptance and current local code regressions remain separate. The owner is completing recovery for the earlier parent test account; no fourth message has been sent.

## Recovery defect found during inbox acceptance — 2 November 2026

The owner received the 02:14 recovery message in Spam. Its callback contained otp_expired, and the reset page incorrectly offered a password form without an established recovery session, leading to Auth session missing. This is a confirmed frontend gating defect; the cause of the provider link rejection is unproven. Signup's new template does not update the separate recovery template. Do not classify recovery as passed or assume the password changed.

The recovery repair in source requires explicit token exchange or six-digit recovery-code verification before displaying a password field. The new maintained recovery template carries a bounded recovery-only fragment. Mixed/query credentials are rejected and SDK auto-detection is suppressed for custom recovery fields. New recovery sessions are isolated in a nonpersistent client, bound to the verified account, so another app login cannot become the password-reset target. Successful legacy callbacks require an observed PASSWORD_RECOVERY event; an ordinary signed-in session is insufficient. Callback changes clear the prior target and invalidate pending responses; delayed old requests cannot reopen a password form. Errors and payloads are scrubbed, passwords clear after submission, and updates occur only after revalidating the isolated target. Refreshing this in-memory recovery flow fails closed and may require a new email; no recovery grant is stored by the page.

The repair and template are awaiting compatible publication and fresh inbox acceptance. No further recovery email is currently authorized: three of four messages have been used, with the one approved recovery message already sent. A replacement recovery requires the owner's approval to reallocate the remaining request. Spam placement remains a separate delivery acceptance issue.

## Recovery rollout resumed — 4 November 2026

After workspace recovery, fresh checks passed: 148 local tests with three credential-dependent hosted boundary tests skipped, frontend build, lint, Worker type/bundle checks, documentation and frontend deployment dry run. The production-target bundle contains the confirmation gate and isolated recovery client, uses the hosted API and excludes the saved backend secret. Fresh read-only sign-in checks again passed for the existing student and new parent, including their retained roles and lack of automatic school entitlement.

The original device request expired before authorization completed; a second owner-authorized request succeeded. Published recovery frontend `cfd8eab0-fb9e-4dc3-b9f4-35261050cfb8`, replacing `ed08ffd3-59da-4f37-84ae-0546863445bb`. The hosted entry `/assets/index-CuI8dsiO.js` exactly matches the production-target local bundle, including confirmation and isolated recovery. Login, verification and reset routes return HTTP 200. Browser automation from the earlier session is unavailable here, and the connected Supabase tools do not expose Auth-template configuration. The owner has been given the prepared recovery HTML, subject and prior-template backup instructions for a dashboard save/reload. The owner subsequently reported the prepared recovery template saved after the requested dashboard save/reload. This is owner-reported configuration evidence; the current connector cannot independently read the Auth template.

The owner's continuation explicitly requests one fresh recovery email after the fix. This reallocates the remaining fourth message to `satvikjee2526+ss-parent@gmail.com`; the four-message total is unchanged. After the owner reported the template saved, the one-use sender reserved and sent the final fourth request. Supabase accepted it at approximately 05:40 IST on 4 November; a read-only check confirmed the intended earlier parent remains verified with role `parent` and its recovery dispatch timestamp advanced. Four of four requests are now used; no automatic resend is authorized. Inbox/Spam placement, actual reset, sign-in with the new password and Settings identity remain pending owner interaction. Password entry and reset submission remain owner-operated. Prior recovery-template rollback-file contents have not been independently verified.

### Spam investigation

The screenshot confirms the old recovery message reached Spam and used Brevo's `brevosend.com` sender domain. The specific cause remains unproven. [Brevo documents its temporary sender-domain replacement](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication) when a sender domain is not authenticated. A school-owned sender domain with verified DKIM/DMARC is the production preparation path; no domain purchase, DNS change or provider upgrade is authorized or performed here. Authentication does not itself guarantee inbox placement.

For the replacement, record Inbox/Spam placement and Gmail's Show original SPF/DKIM/DMARC results without copying codes, confirmation URLs or raw headers into chat. Review the corresponding Brevo delivery event and link-tracking setting when dashboard access is available. [Supabase warns that email tracking can rewrite authentication links](https://supabase.com/docs/guides/auth/auth-email-templates); this is a possible transport issue to inspect, not a proven explanation for the earlier expired token or Spam placement. Keep the explicit confirmation and code fallback even if inbox placement improves.

## Recovery accepted — 4 November 2026

The owner confirmed that the replacement reached Inbox, password reset completed through the new link/confirmation flow, and sign-in with the new password opened the correct earlier-parent account, verified in Settings. A separate scoped backend check confirmed role `parent` remains intact and the saved original fixture password is now rejected. The new password was not collected or persisted by the assistant. The older private fixture entry is marked stale; historical scripts must not try to sign in that parent with its saved original password.

The four-message allowance is exhausted. This proves the controlled recovery journey and this message's Inbox placement. It does not establish inbox placement for every recipient, the cause of the earlier Spam classification, new staff invitation delivery or school-scale sending capacity. Keep sender-domain authentication and SPF/DKIM/DMARC review in the production email checklist; no provider/DNS purchase or configuration change was made during acceptance.
