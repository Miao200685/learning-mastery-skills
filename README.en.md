# Learning Mastery Skills

A Codex plugin for source-grounded mastery and high-stakes exam preparation. It converts local learning materials into a persistent workspace with concept maps, diagnostics, tutoring, active recall, spaced review, mistake analysis, and timed mock exams.

## Included Skills

- `$learning-mastery`: project setup, mode selection, routing, and dashboard.
- `$learning-material-to-course`: ingestion, source locators, concept map, roadmap, and diagnostic.
- `$learning-tutor`: diagnostic teaching, fading hints, explanation, independent practice, and transfer.
- `$learning-review-coach`: due reviews, SM-2 variant scheduling, lapse diagnosis, and retention.
- `$learning-exam-coach`: source-grounded exam construction, scoring, error taxonomy, and readiness.

## Install

```bash
codex plugin marketplace add Miao200685/learning-mastery-skills --ref main
codex plugin add learning-mastery-skills@learning-mastery
```

## Start

```text
Use $learning-mastery to create a project for linear algebra, exam on 2027-01-15, target score 90, 60 minutes per day.
```

The core tools use only the Node.js standard library. Learning data stays outside the public repository. See [docs/CATALOG.md](docs/CATALOG.md) for the audited external project catalog and [docs/PRIVACY.md](docs/PRIVACY.md) for data boundaries.

Licensed under MIT. External projects retain their own licenses.

