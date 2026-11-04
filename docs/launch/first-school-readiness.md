# First-school partnership and release gates

Owner decision, 29 October 2026: the first school partnership is free. Neither the school nor the founder can fund hosting, database, email or AI. The requested capacity is **1,500 simultaneously active students**, not just 1,500 registered accounts. Pilot education scope is Standards 1–10, with CBSE and Karnataka State Board (KSEEB). The institution, subjects and approved syllabus/materials are not yet identified. Brevo SMTP now delivers a bounded owner recovery test; the sending domain, new-signup acceptance and school-volume arrangement remain open. A generic State option or starter catalog does not establish syllabus coverage.

This supersedes the requirement that the first institution fund setup/operation in the 22 October decision. Private verified access, one reusable codebase, the existing design, web-first delivery and data-first learning remain accepted. Higher-secondary/PUC, college, public subscriptions and native applications remain deferred. Preserve Standard 1–5 guardian accounts and Standard 6–10 independent accounts.

One provisional workspace is active: **Vidyanidhi Public School**, Dharwad, Karnataka. The real school identity remains undecided. The owner selected one school only; the second synthetic isolation fixture was retired after its checks passed. The catalog already contains Karnataka State Board under code `KSEAB`; do not add a duplicate board merely to use the older KSEEB label.

## Current release decision

**Not approved for a 1,500-concurrent-student rollout.** Deployment and local tests exist, but core synthetic journeys have passed, while real-user/manual journeys, realistic load, complete signup/recovery journeys and full provider recovery are still acceptance gates. No concurrency certification follows from free-tier monthly active-user allowances, a local test run or an anonymous health check. No paid upgrade, card entry or paid AI is authorized. Keep PDF uploads paused until the provider inventory is reviewed and accepted through the documented protocol.

The zero-cash constraint is real. If measured demand exceeds free allowances, reduce or stage the admitted workload, secure genuinely available support/credits or agree a revised operating arrangement with the owner. Do not promise the requested capacity, silently incur charges, split accounts to evade quotas or weaken private access to make a test pass. A staged pilot does not meet the full concurrency target until that target itself is tested.

## Quality gates

| Gate | Evidence needed before real-school release | Current status |
| --- | --- | --- |
| Authenticated core | One active school with separate staff/students; earlier two-school fixture retained as historical isolation evidence, normal sign-in, email-bound invitations and verified enrollment; positive permitted reads as well as negative tests | Pending |
| Learning | Teacher draft/edit/publish/unpublish, lessons, quizzes, flashcard review, grading and saved progress without AI; refresh/relogin persistence | Core synthetic checks passed; full acceptance pending |
| Historical integrity | Published editions immutable; revised answers cannot change old scores, questions, feedback or flashcard reviews; stale/concurrent edits fail safely | Core synthetic checks passed; full acceptance pending |
| Isolation and revocation | Cross-school denial for lists, direct IDs, search, RPCs, answer columns and PDFs; revocation blocks new reads with an already-issued token; other enrollment/history survives | Core synthetic checks passed; full acceptance pending |
| Guardian and accounts | Standards 1–5 creation/consent, withdrawal/restoration, conflicting requests, verified guardian invitation acceptance, Standards 6–10 signup, password recovery and global sign-out | Core synthetic checks passed; full acceptance pending |
| Private files | Paused inventory, ledger/provider agreement, no unknown/missing files, explicit review, bounded upload/replacement/cleanup, private read and revoke tests | Eight hosted checks passed after inventory review; uploads paused again; concurrency/provider failure gates pending |
| Curriculum | Selected CBSE/State board, Standards 1–10 subject mapping, approved accessible materials and accurate empty states; no claim of a complete syllabus from seed rows | Pending school/material decisions |
| School operations | Paginated/searchable roster beyond 200 members, cohort/subject entitlements agreed, usable staff lifecycle and support contact | Implementation gaps remain |
| Devices and accessibility | Actual school Android/desktop browsers, keyboard navigation, readable errors, slow-network/retry behavior and no critical console errors | Pending |
| Capacity | Observed 1,500 active sessions with realistic reads, writes, quiz submissions, PDFs and sign-in bursts; database/egress/request/CPU budgets measured | Not tested |
| Recovery and support | Repeatable database/Auth/private-object recovery, monitoring and incident/support ownership; no known critical/high security or data-loss defects | Application-only recovery rehearsed; full recovery pending |

Quality means no known release-blocking defects and measured performance, with recovery when something fails. Zero bugs or uninterrupted service cannot be guaranteed, particularly with third-party free services. Record failures honestly, fix them and rerun affected journeys before approval.

## Capacity rehearsal protocol

First measure one complete authenticated lesson/quiz/card session: request mix, payload bytes, database row/index growth and endpoint latency. Fix inefficient queries and unbounded/200-row lists before extrapolating. Capture sign-in/recovery limits and shared school-NAT behavior separately; 1,500 active sessions are not 1,500 PostgreSQL connections.

Prepare a bounded synthetic workload and a recovery/cleanup plan. Start with a small authorized run, then increase through 25, 100, 300, 750 and 1,500 active sessions only while resource headroom and correctness remain acceptable. Use realistic think time plus a separate synchronized quiz-submit burst and a login burst. Do not flood the existing project containing real records or send load emails. Set hard request/byte/time limits, abort on isolation/data corruption, quota errors, provider distress or sustained service errors, and retain redacted evidence. Full-scale shared-host testing needs a reviewed run budget and provider rules before execution.

Proposed performance acceptance, to confirm against school devices/network: ordinary API/DB requests p95 under 1 second and p99 under 3 seconds, quiz grading p95 under 2 seconds, under 0.5% unexpected failures, zero unauthorized successes and zero corrupted/lost committed attempts. Explicitly report expected quota denials separately; widespread quota denials still fail the usable-service target. A sustained classroom-length run and a longer soak must cover peak concurrency and recovery after failures. These are acceptance targets, not current measurements or an SLA.

Use the [budget evidence](../operations/pilot-budget.md), [authenticated staging procedure](staging-verification.md) and [acceptance ledger](pilot-acceptance.md). Keep credentials, synthetic passwords, tokens and detailed provider evidence in ignored local operator files; source documents contain only redacted outcomes.

The [capacity verification plan](capacity-verification.md) records the distinct-user dataset, staged workload, budget arithmetic, measurements and stopping gates. It is prepared planning, not a completed 1,500-user result.
