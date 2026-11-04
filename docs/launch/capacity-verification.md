# 1,500-user capacity verification

Status: **not executed / not proven**. Functional correctness must pass before a capacity result can be accepted. The current shared free project has original records and a real email sender; do not treat it as a disposable load environment.

## Prepared gates

The owner requests 1,500 simultaneously active students, not 1,500 accounts or static-page requests. The October 29 rehearsal exercised a few authenticated synthetic sessions and competing writes. Those results establish bounded correctness only. Idle branding polling was removed, eliminating its previous scheduled 90,000 RPC/hour workload at 1,500 tabs; the remaining session/dashboard/learning queries still require measurement.

Before execution, prepare a separately identifiable, owner-approved synthetic dataset with 1,500 distinct learner identities and permitted curriculum/enrollment, teacher and guardian controls. Never create 1,500 email requests for provisioning; the current sender has a 300/day allowance. Do not disable confirmation, RLS, quotas or revocation to make results pass. No real credentials, tokens, questions, results or student details belong in the public report.

Record current provider usage, Auth rate limits (including the school's shared public IP), Worker daily/API counters, database/storage/egress headroom and database connection limits. Budget the complete ramp, retries and ordinary traffic before starting. Use approved existing compute or a local generator; no paid service or upgrade is assumed. Missing headroom or isolated fixtures is a failed preflight, not a performance result.

## Workload and sequence

1. Measure cold and warm school login/dashboard, lesson list/read, quiz read/submit, flashcard review and guardian report with 10 distinct users.
2. Ramp to 50, 100, 250, 500, 1,000 and finally 1,500 active users. Hold each stage long enough to observe stable behavior; five minutes per stage is an initial planning assumption, not an accepted production SLA.
3. Pace ordinary learners realistically. Separately test a school sign-in burst and synchronized quiz submission, because steady reads do not establish those peaks.
4. Measure browser responsiveness on the actual school devices/network as well as server response time. A static frontend request storm does not simulate authenticated application capacity.
5. Re-run positive/negative authorization and preserved-attempt checks after load, then verify counters, lingering sessions, data integrity, uploads-paused state and recovery.

As an illustrative budget only, one Worker read per learner every 30 seconds and one submission in a five-minute stage uses 11 calls/user. Summing the proposed stage populations (3,410) gives 37,510 Worker calls, before login, setup, retries, staff, extra actions and current traffic. Direct Supabase reads/writes are separate load and are not bounded by the Worker API counter. Reject the scenario if measured headroom cannot cover it.

## Measurements and stopping

Collect achieved active users and request rates, per-journey p50/p95/p99, unexpected errors and timeouts, 401/403 versus genuine quota/rate-limit responses, database CPU/memory/connections/query time, Worker CPU/errors, bytes transferred and before/after usage. Keep failures visible; do not retry without limits or average away tail latency. The generator must stop escalation on sustained failures, quota/provider warnings, a security-boundary failure or exhausted preflight budget.

Proposed latency/error objectives must be agreed before execution, measured on the actual target setup and reported with the exact workload. Any unauthorized access, lost attempt, altered historical result or uncontrolled spending fails acceptance regardless of average speed. A run that reaches only 500 users does not approve 1,500.

Store the generator version/configuration, secret-free dataset description, timestamps, raw aggregated measurements, failures and final limits in a dated evidence report. Until that report passes, the launch gate remains open. See [zero-cash constraints](../operations/pilot-budget.md) and [first-school gates](first-school-readiness.md).
