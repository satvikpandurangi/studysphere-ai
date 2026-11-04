# Recovery acceptance and one-school rehearsal — 4 November 2026

## Recovery evidence

The owner reported the latest earlier-parent recovery email in Inbox, successful password change and sign-in, and the exact intended parent identity in Settings. Provider-backed checks separately confirmed the parent role and rejection of the original saved password. The new password was never collected. The private fixture password is marked stale. All four approved email requests are used.

Frontend `cfd8eab0-fb9e-4dc3-b9f4-35261050cfb8` serves the tested recovery confirmation/code UI. The shared recovery template was saved/reloaded according to the owner; the current connector cannot independently read Auth-template settings. Exact hosted bundle, production API and login/verification/recovery route checks passed. Earlier expired-link/Spam evidence is retained; the specific reason for the earlier rejection and Spam placement remains unproven.

## Live one-school checks

Only the existing synthetic accounts and the single provisional school were used. No retired school was restored, no additional accounts or emails were created, and no paid resources were provisioned.

| Group | Passed checks | Evidence |
| --- | --- | --- |
| Teacher and learner journeys | 7 | Verified school identity; draft lesson hiding and publication; quiz key denial; real Worker grading; immutable prior results after revision; flashcard review persistence; permitted child reporting and unrelated-history denial |
| Concurrency and guardian controls | 4 | One active school/retired staff still denied; stale teacher save rejected; competing consent withdrawals commit once and restore approval/history; staff/unrelated parent cannot read full student history |
| Private PDF and revocation | 6 | Settled private-bucket inventory; authorized bytes/cache controls; anonymous and direct Storage denial; revoked student loses lessons/quizzes/cards/search/PDF with an already-issued token while retaining own attempts; staff removal/restoration; unchanged storage with uploads paused |

Total: **17 live workflow checks passed**. Student enrollment and staff membership were restored after revocation. Existing private PDF: one provider object, 2,810 accounted bytes; zero reserved, uncertain or unverified uploads. Uploads remained paused throughout this follow-up; the private PDF was reused rather than uploaded again.

The last storage assertion initially referenced a block-scoped variable from outside its scope in the local operator script. The harness was corrected and only that read-only final storage check was repeated. The original report is preserved locally. This was a test-harness error; no product fix or deployment was required for these 17 checks.

## Evidence boundaries

Private reports and fixture identifiers remain ignored under `.local/pilot-auth/` and `.local/link-first/`; no credentials, real codes or session tokens belong in this document or the source release. Teacher/student/guardian browser and target-device acceptance, actual school identity and materials, real staff invitation/setup, provider/Auth recovery operations and measured 1,500-user capacity remain separate gates. The deployed app also passed 14 Chromium browser workflow checks and four role-screen smoke checks, described below. These controlled checks do not establish complete device coverage or launch readiness.

## Deployed browser acceptance

An isolated local Playwright 1.64.1/Chromium runtime used the existing synthetic teacher, student, guardian, child and school-admin accounts. No owner password, real confirmation code or browser session export was collected. Test tools, browser binaries and screenshots remain ignored under `.local/` and are excluded from releases.

Four signed-in role screens loaded with automatic school identity, appropriate navigation and no workspace-branding selector. The 14 workflow checks covered:

- Teacher quiz draft saving and learner draft hiding; publication and pre-submit answer hiding; learner Worker grading and feedback.
- Teacher revision publishing with the learner's original question, selected answer, score and edition retained in history.
- Flashcard draft hiding, publication, flipping and rating; the saved rating was confirmed separately in the database.
- Guardian withdrawal blocking an already signed-in child's learning page, then approval restoration returning the learning page.
- Real lesson/notes rendering and private PDF canvas; admin enrollment revocation removing the PDF and quizzes from the existing student session.
- Admin-generated email-bound invitation code and learner acceptance through My schools, restoring the same student's access without another email.
- Staff removal blocking the existing teacher's authoring page, then restoration of that verified account through the admin UI.
- Student practice and admin enrollment at 390px without horizontal overflow; recovery confirmation waits without a provider verification call, and expired callbacks remove the password field and scrub URL/error payloads.

The browser revision test initially used an exact accessible-label match for a populated textarea, whose wrapping label includes its existing text. The locator was corrected to a prefix match, and the already-created draft was resumed rather than duplicated. The initial failed report is preserved. No product defect or further application deployment was required.

Final provider checks confirm active student enrollment, restored editor membership, approved child consent, persisted browser-generated quiz history and card rating, and unchanged paused storage with 2,810 accounted bytes and no reserved/uncertain/unverified uploads. Reports distinguish **17 API/workflow checks**, **14 browser workflow checks** and **4 role-screen smoke checks** rather than treating their overlapping coverage as a load test. New synthetic material is explicitly titled as test material and stays within the same provisional school.
