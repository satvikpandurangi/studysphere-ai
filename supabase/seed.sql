-- Clearly labeled sample curriculum. Replace with school-approved content before launch.
insert into public.schools(id,name,city,state) values
('11111111-1111-4111-8111-111111111111','StudySphere Sample School','Bengaluru','Karnataka')
on conflict(id) do nothing;

with chosen as (
  select s.id from public.subjects s join public.boards b on b.id=s.board_id
  join public.grades g on g.id=s.grade_id
  where b.code='KSEAB' and g.number=6 and s.name='Mathematics'
)
insert into public.chapters(id,subject_id,title,position)
select '22222222-2222-4222-8222-222222222222',id,'Fractions',1 from chosen
on conflict(id) do nothing;

insert into public.topics(id,chapter_id,title,position) values
('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','Understanding fractions',1)
on conflict(id) do nothing;

insert into public.content_items(id,topic_id,school_id,kind,title,body_md,answer_md,hints,status,position) values
('44444444-4444-4444-8444-444444444441','33333333-3333-4333-8333-333333333333',null,'lesson','What is a fraction?',
'**Sample content for product testing — not an approved textbook.**

A fraction describes equal parts of a whole. In $\frac{3}{4}$, the bottom number says the whole is divided into four equal parts, and the top number says we have three of those parts.

Try drawing a rectangle divided into four equal sections. Shade three sections.',null,'[]','published',1),
('44444444-4444-4444-8444-444444444442','33333333-3333-4333-8333-333333333333',null,'example','A fraction of a pizza',
'A pizza is cut into 8 equal slices. If you eat 2 slices, you ate $\frac{2}{8}$ of the pizza. This simplifies to $\frac{1}{4}$.',null,'[]','published',2),
('44444444-4444-4444-8444-444444444443','33333333-3333-4333-8333-333333333333',null,'problem','Try it yourself',
'A chocolate bar has 6 equal pieces. You share 2 pieces. What fraction did you share?',
'You shared 2 of the 6 pieces: $\frac{2}{6}$. Divide top and bottom by 2 to simplify: $\frac{1}{3}$.',
'["Count all equal pieces first.","Put the shared pieces on top and all pieces on the bottom."]','published',3)
on conflict(id) do nothing;

insert into public.content_items(id,topic_id,school_id,kind,title,video_id,attribution,status,position) values
('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333',null,'video','Intro to equivalent fractions - Khan Academy','N1X0vf5PUz4','Khan Academy on YouTube','published',4)
on conflict(id) do nothing;

-- Upload sample-assets/fractions-sample.pdf through the Content studio to add a PDF lesson.
-- The seed does not publish a PDF with a missing private Storage object.

insert into public.flashcards(id,topic_id,front,back,position,status) values
('55555555-5555-4555-8555-555555555551','33333333-3333-4333-8333-333333333333','What does the denominator tell us?','How many equal parts make up the whole.',1,'published'),
('55555555-5555-4555-8555-555555555552','33333333-3333-4333-8333-333333333333','Simplify $\frac{2}{8}$.','$\frac{1}{4}$',2,'published')
on conflict(id) do nothing;

insert into public.quizzes(id,topic_id,title,status) values
('66666666-6666-4666-8666-666666666666','33333333-3333-4333-8333-333333333333','Fractions: quick check','published')
on conflict(id) do nothing;
insert into public.quiz_questions(id,quiz_id,prompt,options,correct_index,explanation,position) values
('77777777-7777-4777-8777-777777777771','66666666-6666-4666-8666-666666666666','Which fraction means three out of four equal parts?','["1/4","3/4","4/3","3/8"]',1,'The numerator counts selected parts (3); the denominator counts all equal parts (4).',1),
('77777777-7777-4777-8777-777777777772','66666666-6666-4666-8666-666666666666','What is 2/8 in simplest form?','["1/2","1/4","2/4","1/8"]',1,'Divide both 2 and 8 by 2 to get 1/4.',2)
on conflict(id) do nothing;
