# Product vision

StudySphere starts as a private learning workspace for specific schools or institutions, using their identity and approved materials for their authorized users. It brings material, practice, planning and educational progress together. AI is optional; it does not replace the curriculum or become a prerequisite for learning. The owner has no funds to subsidize public infrastructure or AI usage.

The [institutional launch direction](institutional-launch.md), revised by the owner on 29 October 2026, makes the first-school partnership free with no founder investment. The requested target is 1,500 simultaneous Standards 1–10 students with CBSE and Karnataka State Board (KSEEB); this capacity is not yet proven. Public enrollment and individual subscriptions are deferred; the broader audiences below remain long-term scope, not a promise to launch them together.

## Audiences

| Audience | Intended experience |
| --- | --- |
| Individual learner (deferred) | Eventually discover permitted content and use a personal workspace without institutional membership |
| Parent/guardian | Manage eligible linked children and understand their educational progress |
| School | Manage staff, verified enrollments, curriculum, classes and school-specific material |
| Higher-secondary / PUC institution | Organize streams, subject combinations, first/second-year learning and institutional reporting |
| College | Organize programs, departments, courses, academic terms and enrolled cohorts |
| Platform operator | Curate platform content, manage organizations, support users and operate the service |

## Education stages

1. **Standards 1–10:** existing baseline, organized by board, standard, subject, chapter and topic.
2. **Standards 11–12 / PUC 1–2:** explicitly included in the target product. Preserve the board/institution's label: PUC 1 corresponds to the first higher-secondary year and PUC 2 to the second. Model the stage once with label/year metadata rather than publishing duplicate grade catalogs. Stream and subject combinations must be configurable; Science, Commerce and Arts/Humanities are examples, not a fixed universal syllabus.
3. **College:** program/course and term-based learning. The eventual data model must accommodate annual and semester-based programs rather than assuming every college uses the same calendar.

Higher-secondary/PUC and college support are **planned**. The current `grades` table restricts values to 1–10 and existing signup assumes that range. Adding a dropdown option alone would not implement these stages.

## Product principles

- Learning content and progress are persistent, with useful behavior when AI is unavailable.
- Separate personal workspaces from institutional memberships and restricted content access.
- A learner may eventually belong to multiple courses or institutions; avoid designing the expanded system around a permanently fixed school field.
- Preserve mobile usability, accessible content, clear errors and affordable operation.
- Teacher-authored material remains identifiable; AI suggestions do not silently change assessments.
- Setup funding and ongoing institutional operating responsibility must be agreed before paid provisioning. No provider, quote or payment plan is selected by these documents.

## Decisions still needed

Select the first institution/cohort and its curriculum, customization, deployment ownership, enrollment verification, support responsibility and funded limits. Decide higher-secondary/college account policy only if those stages are included. The earlier ₹0 50–100-student pilot and 22 October customer-funded-first decision are historical. Current configured limits remain unchanged; the owner now requires a free first-school partnership and 1,500 simultaneously active students. KSEEB is selected; the email/domain service remains undecided. Follow the [release gates](../launch/first-school-readiness.md); do not infer usable capacity from account counts.
