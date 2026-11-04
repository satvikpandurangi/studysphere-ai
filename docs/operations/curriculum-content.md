# Curriculum sources, test material and completeness

Owner scope, 29 October 2026: **2026–27, English medium, Standards 1–10, CBSE and Karnataka State Board**, including the school's prescribed language subjects. The exact school language combinations/course variants remain unconfirmed. Every applicable subject, chapter, topic, practical/activity and assessment needs coverage; four generic subjects or a large sample bank do not establish a complete syllabus.

One provisional school remains in scope: Vidyanidhi Public School, Dharwad, Karnataka. No additional school, native application or public-content entitlement is introduced by this work. Existing account/guardian rules and the design remain unchanged.

## Actual preparation and import status

- Four Siyavula publisher files were initially downloaded unchanged, **154,640,586 bytes** total. The three EPUB edition notices explicitly confirm **CC BY 4.0**, which takes precedence over the catalog's generic discussion of older licenses; those active sources total **121,848,792 bytes**. Original credits and license pages were preserved. The PDF's visual copyright page instead states **CC BY-NC 4.0** and restricts profit-seeking copies despite the catalog's CC-BY-ND label. That unmodified 32,791,794-byte file is quarantined for rights review and removed from the active downloader list. These are South African reference books, not approved Indian-board coverage.
- Three complete credited science paragraphs were selected from the adaptable editions for a possible reference-text import. Each records the original archive member, file checksum, publisher, license, original URL and the conversion made. These are not copied NCERT/Karnataka textbook paragraphs.
- Forty independently authored concept fixtures generate **80 board/grade/subject units**, containing **320 lesson/note/example/problem items, 80 quizzes, 240 questions and 160 flashcards** across the four currently configured generic subject names. This is a functional sample matrix with human review and syllabus alignment pending. It is not all subjects or all chapters.
- The official CBSE 2026–27 secondary index yielded **133 syllabus-document links**: 69 listed under Class IX and 64 under Class X, including languages, advanced/course variants, optional areas and internal assessment. Eight core-subject syllabus reference PDFs, **107 pages** total, were collected locally for subsequent chapter review. These are listed choices, not a statement that every learner takes every course. No Class XI–XII support is added.
- **No provider content import was performed.** After the owner required complete subject/chapter coverage, import was held pending the authoritative inventory. The hosted database is unchanged by these preparation tools; PDF uploads remain paused. The quarantined PDF also exceeds the application's 15,000,000-byte maximum and 100-page text-processing bound; do not split, recompress, strip notices or bypass limits to attach it.
- The completeness check currently reports **0/20 board-grade cells accepted**. Unknown official inventories stay unknown rather than receiving an invented chapter count or coverage percentage.

## Source decisions

| Source | Verified use or remaining restriction |
| --- | --- |
| [NCERT textbook service](https://ncert.nic.in/textbook.php/textbook/textbook/textbook/textbook.php) | Published notice distinguishes textbook/reference downloads from republication and inclusion in software/digital packages. No software-import permission was established. Pre-launch status or preserving a watermark does not supply permission. The live catalog connection failed here; do not substitute a third-party mirror as proof of current books. |
| [Karnataka Textbook Society](https://www.ktbs.kar.nic.in/New/index.html#!/textbook) | Portal timed out. Current book inventory and applicable publisher reuse terms could not be verified. Older commentary about a permissive policy is not recorded as current approval. |
| [DSERT Karnataka](https://dsert.karnataka.gov.in/english) | State academic-source access failed here. A complete Standards 1–10 curriculum cannot be inferred from an exam-board homepage. |
| [KSEAB](https://kseab.karnataka.gov.in/en) | Exam authority site is reachable. Its website policy and exam information do not grant rights over externally published textbooks. |
| [CBSE Academic Unit](https://cbseacademic.nic.in/curriculum_2027.html) | Current IX–X subject/syllabus index verified for metadata/reference. Individual chapter/topic inventories still need review. Class IX and X differ; do not copy one year's course structure to the other. |
| [Karnataka OER](https://koer-en.karnatakaeducation.org.in/index.php/Main_Page) | Portal describes CC BY-SA resources, but linked third-party books/media need their own rights checks; some live paths presented a bot check. No bot-check bypass or bulk mirror was attempted. |
| [Siyavula](https://www.siyavula.com/read) | Specific adaptable EPUB editions verified by embedded CC BY 4.0 notices. The conflicting-label PDF is quarantined under its more restrictive embedded notice, not approved for product use. No closed-copyright IT/CAT materials collected. |
| [Vedantu](https://www.vedantu.com/tnc), [Unacademy](https://unacademy.com/notes-terms), [PW](https://www.pw.live/terms-and-conditions) | No permission to mirror their proprietary libraries was established. Content was not scraped or imported. |

Permission checks apply to each work/edition and its third-party inclusions. Attribution, an available download, a government URL, a free trial or the word "simulation" does not establish general reuse rights. Keep source notices and any written permission with the restricted source record. Do not send permission requests to publishers without the owner's instruction.

## Repeatable local tools

Run npm commands at the repository root:

```powershell
npm run content:fixtures
npm run content:sources
npm run content:sources -- --download
npm run content:prepare-oer
python scripts/index_curriculum_sources.py
npm run content:coverage
```

`content:sources` without `--download` only validates the reviewed source list and prints the download budget. Download mode uses only the reviewed publisher paths, enforces per-file/total byte caps, retains originals, checks edition notices and records checksums. It is not a general crawler. `content:prepare-oer` requires those inspected files and refuses non-adaptable text extraction. The CBSE indexing command reads the previously collected official HTML; it performs no network calls or textbook copying.

`content:coverage` exits **2** when acceptance is incomplete, including missing official inventories; it makes no provider changes. The evidence file, if supplied, is ignored `.local/content-library/curriculum-evidence.json`. Operator attestations still require checking actual authoritative sources: the tool is a completeness gate, not an automated guarantee of curriculum correctness or a legal license determination.

Generated files stay under `.local/content-library/`: `original-test-library.json`, `coverage.json`, `download-report.json`, `licensed-sections.json`, official-source access reports, `cbse-secondary-subject-index.json/.csv` and `curriculum-coverage.json`. Third-party books, extracted source text, raw portal snapshots and reports stay out of source releases. Source packages include only the first-party fixture definitions, tools and reviewed source metadata.

## Full-coverage acceptance procedure

1. For each board/standard/year/medium, obtain the authoritative prescribed subject set. Record languages by course/position, optional subjects, internal assessment and any special track; confirm the school's actual selection.
2. For every applicable subject, record the current textbook edition/part and complete chapter list, then all required topics, activities/practicals and excluded or changed portions. Preserve the source URL, retrieval date and evidence of the current edition. Do not assume an older book or another school's list is current.
3. Record rights for each resource, accessible language/format, attribution and teacher review. Author missing lessons/questions independently or obtain permission; do not copy restricted answer banks or assume all material linked by a portal shares its license.
4. Verify each topic's lesson/practice/assessment coverage with the teacher. A PDF alone, a quiz count or one concept per grade is insufficient. Confirm answer correctness and preservation of historical attempts through normal editions.
5. Review the expected-versus-accepted inventory before importing into the single private school. Keep drafts distinguishable, use a recorded resumable import plan and never overwrite published editions/history or publish global test content. Shared curriculum titles require review because catalog structure is not institution-private.
6. Test student/guardian/staff visibility and actual rendering. PDF inventory, capacity and pause controls remain independent release gates. Only accepted authoritative coverage may be called complete.

Current blocking inputs are the full official I–VIII/State subject-and-chapter inventories and the school's prescribed language/course selections, plus reuse permission where required. Complete first-party fixtures and verified open sources remain available for functional tests while these are resolved.
