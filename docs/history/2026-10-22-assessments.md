# Assessment lifecycle implementation evidence

Local implementation on 22 October 2026. No hosted migration, deployment, paid provider or AI enablement performed. The five selected assessment requirements are implemented in source; institution branding and remaining account/monitoring/pilot work remain subsequent milestones.

## Delivered

1. School/topic quiz and flashcard lists with Draft/Published/Unpublished state and edition labels.
2. Draft editing for card fronts/backs, quiz titles, prompts, 2–10 options, correct options and explanations; question ordering/removal and incomplete draft support.
3. Transactional publish/unpublish with one visible edition per series. Failed publication preserves the previously published edition.
4. Immutable published content, revised drafts with new IDs and preserved old attempt/review identities. New attempts snapshot title, edition, score, total and feedback. Older records retain their score/count and do not acquire invented feedback.
5. Database/Worker access tests for school isolation, hidden keys, invalid/forged submissions, withdrawn access, authoring authority, stale edits and record preservation.

Learner practice now has isolated quiz loading state, version-aware submission, saved feedback and recent result history. Card review explicitly uses published due cards, disables rating controls while saving, and refreshes the due queue after completion. Parent reports display saved quiz title/edition/count. All flows reuse the current shell, forms, buttons, cards and responsive patterns.

Shared curriculum selection and the existing student account gate were extracted into components without changing the accepted Standard 1–5 / Standard 6–10 policy. Existing Worker create paths retain `{id}` responses through caller-authorized transactional RPC delegation; grading no longer splits privileged answer reads and attempt writes.

## Verification

- `npm test`: **39 passed**, three hosted staging tests skipped without their environment inputs.
- Twelve local PostgreSQL assessment cases load the populated prior schema and apply the new forward migration. Fifteen enrollment cases and the existing planner/PDF/boundary suites continue to pass.
- Four assessment Worker cases cover caller-scoped grading, malformed/other-student bodies, access errors and legacy create delegation.
- Synthetic browser preview: quiz read-only state, revised draft editing (prompt/options/correct answer/explanation), saving, replacement publication/statuses, card editing/publication, learner submission and saved history. At a 390px iframe viewport: card flip/rating, saved review completion and due-queue refresh.
- Browser fixtures use actual source components/styles and synthetic service responses; they are not hosted end-to-end evidence. Local preview/screenshots remain ignored under `.local/assessment-preview/`.

`npm run build`, `npm run lint`, `npm run check:worker`, `npm run worker:bundle` and `npm run docs:check` passed. The existing Node deprecation warning does not indicate a failed check. A source release is generated with the supported packaging script and excludes local previews, credentials and generated runtime files.

## Rollout limits

The [assessment guide](../architecture/assessments.md) defines migration order, RPCs, preservation tradeoffs and staging acceptance. Published legacy quiz/card IDs remain unchanged. Historical title backfill uses the title stored at migration time; undocumented earlier manual edits cannot be reconstructed. New snapshot/edition storage must be measured within the pilot budget.

These are practice tools with post-submission explanations, not proctored exams. Pagination, cohort assignments, institution-specific individual reporting, richer formats and adaptive scheduling remain open. Direct database RPC traffic is outside Worker-only counters; successful submission retries may add another attempt. Hosted Auth/PostgREST behavior and simultaneous editing/publication require staging tests.
