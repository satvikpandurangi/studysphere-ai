# StudySphere documentation

Maintained baseline: 29 October 2026. The first-school partnership is free with no founder investment; the target is 1,500 simultaneously active Standards 1–10 students. Capacity and curriculum readiness remain unverified; public enrollment is deferred. Start with the capability matrix to distinguish current code from planned delivery.

## Product and delivery

- [Vision, audiences and education stages](product/vision.md)
- [Private-school launch direction and cost rules](product/institutional-launch.md)
- [Requirements and implementation status](product/requirements.md)
- [Roadmap and next coding milestones](product/roadmap.md)
- [First-school partnership and release gates](launch/first-school-readiness.md)
- [1,500-user capacity verification plan](launch/capacity-verification.md)
- [Institutional pilot and future launch checklist](launch/checklist.md)

## Research

- [Market research index](research/README.md)
- [22 October 2026 competitive landscape and differentiation](research/2026-10-22-competitive-landscape.md)
- [Evidence and source register](research/2026-10-22-source-register.md)

Research recommendations remain proposals until selected. The owner's institution-first decision and subsequent free-partnership revision are recorded in the product direction; research features do not become implementation commitments automatically.

## Architecture

- [System overview and data boundaries](architecture/overview.md)
- [Database and migration guide](architecture/database.md)
- [Verified enrollment, invitations and rollout](architecture/enrollment.md)
- [Assessment editing, publication and historical results](architecture/assessments.md)
- [Institution branding, contacts and member selection](architecture/branding.md)
- [Account controls, privacy and usage monitoring](architecture/account-operations.md)
- [Authentication email setup and delivery acceptance](operations/email-delivery.md)
- [Atomic guardian approval and access restoration](architecture/guardian-consent.md)
- [PDF upload limits, storage reservations and inventory](architecture/pdf-storage.md)
- [Pilot validation and acceptance ledger](launch/pilot-acceptance.md)
- [Hosted staging setup, fixtures and verification](launch/staging-verification.md)
- [Worker API reference](architecture/api.md)
- [Decisions and open questions](architecture/decisions.md)

## Development

- [Getting started and environment settings](development/getting-started.md)
- [Cloudflare agent setup](development/cloudflare-setup.md)
- [Repository structure and relocation map](development/repository-guide.md)
- [Contribution and documentation maintenance](development/contributing.md)
- [Testing and evidence](development/testing.md)

## Operations

- [Deployment and rollback](operations/deployment.md)
- [Operating runbook](operations/runbook.md)
- [Pilot limits and capacity planning](operations/pilot-budget.md)
- [Content publishing guide](operations/content-publishing.md)
- [Curriculum coverage and test-source register](operations/curriculum-content.md)

## History

- [4 November recovery acceptance and one-school rehearsal](history/2026-11-04-recovery-and-school-pilot.md)

- [Changelog](history/CHANGELOG.md)
- [29 October workspace detail audit and school rehearsal](history/2026-10-29-workspace-audit.md)
- [29 October authenticated pilot, single-school scope and PDF repair](history/2026-10-29-authenticated-pilot.md)
- [29 October deployed frontend/API and live verification](history/2026-10-29-cloudflare-release.md)
- [23 October hosted upgrades and recovery evidence](history/2026-10-23-hosted-upgrade.md)
- [Detailed review before reorganization](history/2026-10-22-project-review.md)
- [Original setup guides](archive/README.md)

## Maintaining these documents

Product intent belongs in `product/`; current technical behavior in `architecture/`; developer procedures in `development/`; operator procedures in `operations/`; release acceptance in `launch/`; dated evidence in `history/`. Link to one authoritative definition instead of duplicating it. Historical snapshots are preserved unchanged and can contain obsolete paths and instructions.

When a feature is implemented, update its requirement status, relevant API/data/operating instructions, tests, and changelog together. Record whether verification was local, staging, or production. Do not store keys, personal student data, or database backups in docs.
