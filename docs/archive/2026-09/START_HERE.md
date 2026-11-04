# Start StudySphere with a small school pilot

The source is built. It is not connected to live services yet. Follow [ZERO_COST_PILOT.md](./ZERO_COST_PILOT.md) to run one controlled 50–100 student environment on free plans. Test with a few adults and children before inviting the full pilot.

## Accounts to create

1. [Supabase](https://supabase.com/) for sign-in, the curriculum database, and student progress.
2. [Cloudflare](https://dash.cloudflare.com/) for the secure API and static site hosting. Private PDFs stay in Supabase Storage.
3. [Brevo](https://www.brevo.com/) Free for confirmation, invitation, and password recovery email through Supabase custom SMTP.
4. [Groq](https://console.groq.com/) Free only if you want the optional AI tutor. Lessons, quizzes, flashcards, plans, and progress work without it.

Use organizational accounts owned by the school business, with two trusted administrators and multifactor authentication. Do not send secret keys in chat, email, screenshots, or the frontend `.env.local` file.

## Bring up staging

1. Create a fresh Supabase Free project. In its SQL Editor, run every file in `supabase/migrations/` in filename order, then optionally run `supabase/seed.sql` for the clearly labeled sample fractions lesson.
2. Turn on email confirmation in Supabase Auth. Configure its site URL and redirect allow list for the frontend domain, including `/reset-password`. Connect Brevo Free as custom SMTP before testing invitations and password recovery.
3. Create a private Supabase Storage bucket named `lesson-assets`, limit files to 15 MB, and allow only `application/pdf`. Do not make the bucket public.
4. Copy `.env.example` to `.env.local`. Add the Supabase project URL and publishable key plus your Worker URL. Set the matching frontend origin in `wrangler.toml`.
5. Add the four Worker secrets using the Cloudflare Wrangler commands in `README.md`. These are the Supabase URL, publishable key, **secret key**, and optional Groq key. The secret key belongs only in the Worker.
6. Keep the limits already defined in `wrangler.toml`. Run `npm ci`, `npm run build`, `npm run test`, `npm run check:worker`, and `npm run lint`. Deploy the Worker and built `dist/` directory to free Cloudflare URLs.
7. Sign up using your own administrator email, verify it, and use the one-time administrator promotion SQL in `README.md`. Create a school, invite staff, publish one topic, and test the family journey.

## Test before inviting a school

Ask one adult to create a parent-managed Standard 1–5 account for a test child. Confirm the adult sees that child's results, then withdraw guardian approval and verify the child's access closes. Separately, create an independent Standard 6–10 student account and verify its email. No school approval step is required. Confirm both students see the right board, standard, subjects, lesson, inline PDF, video, quiz, flashcards, plan, and mind map. Test a second school and ensure neither school can see the other's private content. Run the staging tenant tests described in `README.md`.

## Budget expectation

The controlled 50–100 student pilot is configured for ₹0: Supabase Free, Cloudflare Free, Brevo Free, and optional Groq Free. The code stops PDF uploads at 800 MB, limits PDFs to 15 MB, stops authenticated API actions at 90,000/day, and caps AI at 100 answers/day. Open **₹0 pilot usage** as the platform administrator and check provider dashboards weekly. Free plans do not provide a production uptime or backup guarantee.

## Remaining decisions before launch

Choose the legal business owner, support contact, school agreement, approved curriculum sources, privacy retention period, and who handles account deletion and data export requests. Have the privacy and guardian consent text reviewed for the schools and locations where you launch. Do not treat the sample lesson as approved teaching material.
