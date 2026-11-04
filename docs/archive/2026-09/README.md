# StudySphere AI

StudySphere is a school learning workspace for Standards 1–10. The product is **data first**: schools publish the lessons, worked examples, PDFs, videos, flashcards, and quizzes that students see. Study plans, quiz results, flashcard reviews, mind maps, and parent progress are stored in the backend. The optional AI tutor can only answer from published material visible to that student, and a missing match produces a clear no source response without calling Groq.

## Architecture

| Layer | Choice | Purpose |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Student, parent, and staff workspaces |
| Identity and database | Supabase Auth and Postgres | Accounts, curriculum, progress, RLS tenant boundaries |
| API | Cloudflare Worker | Privileged account actions, private PDF access, quiz grading, AI budget |
| PDF storage | Supabase Storage | Private lesson files; the browser receives them through an authorized Worker route |
| Optional AI | Groq | Socratic responses grounded in published lesson excerpts |

The browser uses a Supabase publishable key. Keep the Supabase secret key and Groq key **only** in Worker secrets. The PDF bucket must remain private.

## ₹0 pilot mode

The included configuration is designed for a controlled 50–100 student pilot on Supabase Free, Cloudflare Free, Brevo Free, and optional Groq Free. It enforces a 15 MB PDF limit, an 800 MB application storage ceiling, 300 secure API requests per student/day, 90,000 secure API requests across the platform/day, 3 AI answers per student/day, and 100 AI answers across the platform/day. A platform administrator can monitor the counters in **₹0 pilot usage**.

Use the exact account and deployment checklist in [ZERO_COST_PILOT.md](./ZERO_COST_PILOT.md). Free allowances are provider policies rather than service guarantees, and Supabase Free requires manual backup planning.

## Local setup

1. Create a fresh Supabase project and a Cloudflare account. In Supabase Storage, create a private bucket named `lesson-assets`, limit files to 15 MB, and allow only `application/pdf`.
2. In Supabase SQL Editor, apply every file in `supabase/migrations/` in filename order. To add the clearly labeled sample lesson, apply `supabase/seed.sql` after the migrations. Replace this sample with school approved material before inviting students.
3. In Supabase Auth, enable email confirmation, configure your site URL and allow the app origin plus `/reset-password` as redirect URLs, and connect Brevo Free as custom SMTP. Supabase's default mailer is not a public onboarding channel. Student addresses should be guardian controlled or managed by the school so password recovery reaches an authorized adult.
4. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_BASE_URL` to your project URL, publishable key, and Worker URL.
5. Set the exact frontend origin in `wrangler.toml` as `APP_ORIGIN`. It has no trailing slash. Set your production AI daily limits after checking your Groq organization's current limits.
6. Set Worker secrets with `npx wrangler secret put SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `GROQ_API_KEY`. Use the publishable key from Supabase and the server side secret key for `SUPABASE_SECRET_KEY`. Never place any of these secrets in `.env.local` except the publishable key.
7. Run `npm ci`, `npm run build`, and `npm run check:worker`. For local development, run `npm run dev` and `npm run worker:dev` in separate terminals. The local Worker origin must match the frontend origin configured in `APP_ORIGIN`.

The `wrangler.toml` default `APP_ORIGIN` is `http://127.0.0.1:4173`; use that same hostname in the browser. In this restricted Windows workspace, Vite's development dependency optimizer was blocked by filesystem access rules. The production build and `npm run preview` work here; use those for local preview until the development server runs in an unrestricted environment.

## First administrator

Sign up with a verified parent account, then promote **only your own verified account** once in Supabase SQL Editor:

```sql
update public.profiles
set role = 'platform_admin'
where id = (select id from auth.users where email = 'your-verified-admin@example.com' and email_confirmed_at is not null);
```

Confirm exactly one row was updated. Sign out and back in. Create schools in **Schools & people**, invite school administrators and editors, then create chapters and topics in **Curriculum**. Staff can publish Markdown lessons, in-app PDFs, YouTube embeds, flashcards, and quizzes. For Standards 1–5, a verified parent creates and supervises the student account, records guardian approval, and chooses the board, standard, school, and subjects. Students in Standards 6–10 can create their own verified account and make the same curriculum selections during sign-up.

The sample PDF is `sample-assets/fractions-sample.pdf`. Upload it in Content studio if you want to test the in-app PDF reader. The SQL seed does not publish a broken PDF link.

## Publish a chapter

1. A platform administrator opens **Curriculum**, selects a board, standard, and subject, then adds the chapter and its topics.
2. An authorized editor opens **Content studio**, selects the same board, standard, subject, chapter, and topic, then chooses school visibility or platform-wide visibility. A school editor can publish only within their school.
3. Write a Markdown lesson, worked example, or problem. For a PDF, choose the file and add searchable text when it is scanned. For a video, paste a valid YouTube URL and record attribution. Set the language for each item.
4. Save a draft and review the rendered Markdown preview. Select **Publish** when it is approved. The student lesson page reads published content directly from the database; no frontend redeployment is needed. To unpublish, edit the item and save it as a draft. Earlier values are retained in revision history.
5. In **Assessments**, add teacher-written flashcards and a quiz for the topic. Verify the full student journey on staging before inviting the class.

## Deployment

Build the frontend with `npm run build`; deploy `dist/` to Cloudflare static hosting, which permits commercial projects on its free tier. Deploy the API with `npm run worker:deploy`. Update the Supabase Auth URL allow list, `APP_ORIGIN`, and frontend API URL to the final HTTPS domains. Keep separate Supabase projects, Storage buckets, and Worker secrets for staging and production. Apply reviewed SQL migrations to staging first.

Before a school pilot, complete [ZERO_COST_PILOT.md](./ZERO_COST_PILOT.md) and [OPERATIONS.md](./OPERATIONS.md). Real signup, tenant isolation, email, file upload, and AI flows require integration testing against the connected services.

For tenant tests on staging, create approved students A and B in different schools, editors in both schools, and one draft content item in each school. Supply `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY`, `TEST_STUDENT_A_JWT`, `TEST_STUDENT_B_ID`, `TEST_SCHOOL_A_EDITOR_JWT`, `TEST_SCHOOL_A_DRAFT_ID`, and `TEST_SCHOOL_B_DRAFT_ID` to `npm test`. The test file `tests/rls.integration.test.ts` checks cross-student records, cross-school drafts, and hidden quiz answers. It skips when those staging inputs are absent; a skip is not proof of isolation.

## Data and AI boundaries

- Curriculum content is authored and published by staff. Markdown is rendered in the app; PDFs are streamed into an in-app reader; videos use YouTube's privacy enhanced embed.
- Quizzes are authored by staff and graded by the Worker. Correct answers are not granted to the browser before submission.
- The AI tutor first searches published content under the student's RLS permissions. It sends selected excerpts and recent chat to Groq only after a match and an available daily quota. AI output is supplementary and should be checked against the cited lesson.
- A parent's withdrawal of approval blocks lesson and AI access for their linked Standard 1–5 child. Standard 6–10 students manage their independent accounts.
- Privacy export and deletion buttons create requests for an administrator to process. They are not automated deletion or export jobs yet.

## Known launch gates

The database SQL has been parsed but has **not** been executed against a live Supabase instance here. The build and Worker type check pass. Do not present the application to a school as a verified production deployment until the services are connected, RLS and child privacy tests are run on staging, the legal documents are reviewed, and backup/restore is rehearsed.
