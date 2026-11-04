# Quiz and flashcard editions

Current rollout: the database upgrade was applied on 23 October and the compatible frontend/API release is deployed and smoke-tested on 29 October 2026. Authenticated hosted workflow acceptance remains pending; see the [upgrade record](../history/2026-10-23-hosted-upgrade.md) and [release evidence](../history/2026-10-29-cloudflare-release.md). Implementation-only statements below describe the original local milestone.

Implemented in source on 22 October 2026. Local database/Worker tests and synthetic browser checks pass. Hosted migration, PostgREST/Auth and multi-session acceptance remain pending. This implements practice assessments; it does not add proctoring, timed exams, assignment deadlines or cohort gradebooks.

## Teacher workflow

The **Assessments** studio retains the existing curriculum selector and visual design. Choose board/standard/subject/chapter/topic, click **Use selection**, and choose school visibility. A non-platform staff member can use only their own school memberships; global assessment authoring requires platform administration. The database rechecks authority independently of navigation.

The selected topic/school lists the latest 200 quizzes and 200 cards, including draft, published and unpublished editions. Teachers can create a card or quiz, open an existing draft, edit its content and save. Quizzes support 1–20 questions, 2–10 options per question, the correct option, explanations, question ordering and removal. Draft prompts/options may be incomplete. A title/card front is required to identify a saved draft. Publication validates complete question prompts/options/correct indexes or both sides of a card. Explanations are optional.

Save before publishing. **Publish this edition** makes the edition available to permitted learners and unpublishes any previously published edition in the same series, atomically. **Unpublish** removes future learner access and grading for that edition. These actions do not delete historical attempts or reviews. A failed publication rolls back the entire operation, including unpublication of the previous edition.

An edition that has ever been published is read-only, including after unpublishing. **Create revised draft** copies it to a new ID and version in the same series. Edit/save that draft, then publish it when ready. The old edition remains published while the replacement is being prepared. An old unpublished edition may be explicitly republished; the one-published-edition rule still applies. Creating several revised drafts is allowed; publication chooses the active one.

`edit_version` detects another editor's intervening save/publication. Stale changes are rejected with a reload message rather than silently overwriting newer work. Scope and identity are fixed for an existing edition; create a new assessment to use a different topic/school. The UI asks before discarding unsaved content during scope/assessment selection changes.

## Schema and preservation

[202610220002_assessment_lifecycle.sql](../../supabase/migrations/202610220002_assessment_lifecycle.sql) adds `series_id`, `version`, `edit_version`, `published_at`, `created_at` and `updated_at` to quizzes/cards. Each original assessment starts its own series at version 1. Partial unique indexes permit one published edition per series. Published content and quiz questions are protected by triggers, including privileged ordinary writes. Parent-row locks prevent question writes from crossing a publication boundary. Draft save, question replacement, publication and audit events use database transactions.

Existing published assessments, quizzes with attempts and cards with reviews are marked as previously published. Their IDs and learning records are retained; no applied migration is edited. Existing attempts gain `quiz_title`, `quiz_version` and `total`. The backfill uses the stored quiz title at cutover and submitted answer-array length; it cannot reconstruct undocumented older manual edits. Existing `feedback` stays null rather than inventing a historical answer key.

New quiz attempts snapshot title, edition, score, total and feedback containing question IDs, prompts, options, selected/correct indexes and explanations. Old questions also remain attached to their immutable quiz ID. Editing a replacement cannot change those results. Card reviews remain attached to the old card ID; a newly published revised card has a new ID and starts due for review rather than inheriting confidence from different content.

Published editions cannot be hard-deleted through ordinary writes; unpublish them instead. This protects history. Deleting a learner's account/review records is a separate privacy operation, not an assessment deletion. Full privacy-fulfillment and retention work remains in the roadmap.

## Learner flow and access

Practice lists published quizzes allowed by account, subjects and [verified enrollment](enrollment.md). It fetches only public question fields. Each quiz selection mounts a separate loading/answer/result state, preventing the prior quiz's questions from appearing under a new title. Submission includes the selected edition, and controls are disabled while saving. A successful response shows saved feedback and refreshes **Your recent results** (latest 20), including feedback snapshots where recorded. Learners can intentionally try again.

Flashcards explicitly fetch published, permitted cards, apply saved due dates and prevent repeated rating clicks while saving. Checking for due cards after a session reloads the queue; cards just reviewed remain excluded until due. The schedule remains the existing fixed 1/3/7/14-day intervals, not adaptive learning.

Students cannot read `quiz_questions.correct_index` or `explanation`, call teacher-detail RPCs, insert arbitrary scores or inspect another student's attempts. Correct answers/explanations are intentionally returned **after a valid complete submission** and retained in the learner's own historical record. Flashcard backs are intentional study content, not secret quiz answer keys. Linked guardians retain access to permitted child results under the existing account policy. School staff do not gain a student's entire history through this feature.

Unpublished/revoked/paused access blocks new quiz submissions and published resource reads. Historical attempts/reviews remain personal learning records, including previously delivered prompts/feedback; revocation cannot recall information already delivered. This feature does not lock the whole account merely because one school revokes enrollment.

## Authenticated database contracts

| RPC | Inputs | Output |
| --- | --- | --- |
| `assessment_list` | `target_topic`, `target_school` (null for global) | `{quizzes,flashcards}`; metadata only |
| `assessment_detail` | `assessment_kind`, `assessment_id` | Authorized teacher detail, including quiz answers/explanations |
| `save_assessment` | kind/topic/school, `assessment_data`, optional ID/expected edit, optional `publish_now` | Saved detail; save+publish is atomic when requested |
| `copy_assessment_draft` | kind, ID, expected edit | New unpublished editable edition |
| `set_assessment_status` | kind, ID, expected edit, `publish` | Updated detail |
| `submit_quiz` | `target_quiz`, JSON `submitted_answers`, optional `expected_version` | `{attemptId,score,total,quizTitle,quizVersion,feedback}` |

Teacher mutations validate the caller's school membership/global authority using fixed-search-path definer functions. Quizzes/cards have no direct authenticated write grant. Existing question-column restrictions are preserved. Helper/trigger functions are not directly executable by ordinary clients. Anonymous execution is revoked.

The existing Worker `/quiz/grade` route validates the actor/body, reserves its normal API quota and invokes `submit_quiz` with the **caller client**, never reading keys and saving scores through separate privileged requests. SQL serializes grading with edition publication, rechecks publication/access, validates every answer's type/range/count and inserts a self-owned snapshot atomically. Client-supplied scores are ignored. Each successful submission creates an attempt; network replays are not idempotent. Direct authenticated RPC calls enforce the same permissions but are not counted by Worker-only API counters.

Legacy `/quizzes/create` and `/flashcards/create` routes delegate to `save_assessment` with the caller identity and preserve `{id}` responses. `publish:true` requests transactional save/publication. The new studio calls authenticated RPCs directly. No AI, paid provider or new runtime dependency is required.

## Rollout and acceptance

Apply the forward migration after verified enrollment. Back up and rehearse against the prior schema and synthetic data, inspect custom policies/triggers, then deploy compatible frontend/Worker. Do not serve the new learner UI against a database missing the new columns/RPCs. Do not rewrite the initial schema or infer that local tests migrated a hosted service.

In staging, use separate editors and learners at two schools, a typed-label-only learner, an unassigned-subject learner and a linked guardian. Verify draft hiding, teacher-detail/column denial, publication/revision replacement, old result preservation, card ratings/due dates, unpublication/revocation during a session, and actual Worker grading. Exercise two editors and concurrent publication/submission: local PGlite serializes connections and is not proof of hosted concurrency behavior. Rehearse failure/rollback with existing attempts and reviews. Prefer a forward repair after cutover; dropping snapshot columns or restoring the old split grading path loses the guarantees of this version.

Server pagination, assignment/cohort administration, institutional individual-result reports, richer assessment formats, adaptive scheduling and exam-security controls remain future work.
