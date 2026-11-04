# Publishing learning content

## Current school workflow

1. A platform administrator selects a board, standard and subject in Curriculum and creates chapters/topics. Use the selector's **Use selection** action where shown.
2. Staff open Content studio, select the curriculum path and choose school visibility. Only platform administrators can publish global material.
3. Create a lesson/note/example/problem in Markdown, add reviewed searchable text for a scanned PDF, or supply a validated YouTube URL and attribution. Choose language and title.
4. Save a draft, review the supported preview, and publish the approved item. Students read published backend content without a frontend rebuild.
5. To withdraw an item, save it as draft. Editing an existing content item creates a revision snapshot.
6. Create teacher-written flashcards/quizzes in Assessments. Choose topic/school, save a draft, reopen it from the list and edit as needed. **Publish this edition** exposes it to permitted learners; **Unpublish** withdraws it while preserving records. Test with synthetic learners before publishing to a class.

## Practice problems and hints

For a **problem**, enter the prompt in Markdown, add hints in the order students should reveal them, and enter the worked answer. Existing hints load when reopening an item. Add, edit, move or remove hints and inspect their Markdown previews; blank hints are omitted when saving. Hints use the existing content record and revision snapshots, so no new database migration or AI service is required. Review hints and the worked answer before publishing.

Students reveal one hint at a time and can reveal the explanation after entering working. Working is held only in the current page: it is not autosaved, submitted to teachers or graded. Copy it before navigating away or refreshing. Marking a lesson complete saves topic progress, not the working or a correctness result. Problem explanations are readable practice material; the separate quiz answer-key protections do not apply to them.

## Assessment revisions

Published quiz/card content is read-only even after unpublishing. Select **Create revised draft**, edit and save the new edition, then publish it. This atomically unpublishes the older edition; its questions/results/reviews remain intact. A revised card starts with a fresh review schedule. Save before publishing and reload if another editor changed the assessment. See the [assessment guide](../architecture/assessments.md) for limits, history and rollout.

Quizzes accept 1–20 questions with 2–10 options. Draft question text/options can be incomplete, but publication requires complete prompts/options and a valid correct answer. Card publication requires both sides. Explanations are optional. Learners see correct-answer feedback after a valid complete submission; this is practice, not proctored exam delivery.

## PDF fixtures and limits

Use [the sample PDF](../../sample-assets/fractions-sample.pdf) for product testing only. PDFs are private in Supabase Storage and rendered in the app. Text extraction processes up to 100 pages and caps searchable text; no OCR is provided. The browser fetches the effective limit, at most **15,000,000 bytes**, matching Worker/database validation; stricter operator settings are honored.

Selecting a replacement clears the old extracted text in the form. Save to extract the new PDF or enter reviewed text for that new file. Confirmed attachment returns to draft, then saves reviewed text and requested publication. Failed/unconfirmed replacements preserve the old attachment/text/publication; use **Reload saved item** before further saving. Replacement needs capacity for both files until old-file cleanup is confirmed. **Remove attached PDF** deliberately detaches it, clears its text and returns the item to draft; only then can its content type change.

If uploads are paused, sizes need review or an outcome is uncertain, contact the operator. Queued cleanup can be retried from platform **Pilot usage**. The [storage guide](../architecture/pdf-storage.md) defines the mandatory initial inventory review and safe maintenance procedure; never delete reservations manually to bypass capacity.

## Content readiness

Record rights/attribution and teacher approval. The generic subject catalogs and fractions seed do not provide complete board coverage. Standard 11–12 / PUC and college content require their academic model, valid subject/course assignments and enrollment boundaries before they can be presented as supported product journeys.

## Full curriculum and imported test sources

The current owner requirement is 2026–27 English-medium Standards 1–10 in both CBSE and Karnataka tracks, including prescribed languages and every applicable subject/chapter/topic. Follow the [source/coverage register](curriculum-content.md). Original functional fixtures and downloaded reference books are not complete board coverage. Prepared imports are held pending the authoritative inventory; PDF uploads stay paused.
