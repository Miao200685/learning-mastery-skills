# Learning Mastery Skills

A Codex plugin for source-grounded, sustainable mastery and high-stakes exam preparation. It converts local materials into a persistent workspace with concept maps, diagnostics, complete Feynman cycles, active recall, spaced review, momentum support, mistake analysis, and timed mock exams.

## Included Skills

- `$learning-mastery`: project setup, mode selection, routing, and dashboard.
- `$learning-material-to-course`: ingestion, source locators, concept map, roadmap, and diagnostic.
- `$learning-tutor`: diagnostic teaching, hints, complete Feynman cycles, independent practice, and transfer.
- `$learning-momentum`: low-friction restarts, sustainable session modes, curiosity, and motivation.
- `$learning-review-coach`: tiered reviews, SM-2 variant scheduling, lapse diagnosis, and retention.
- `$learning-exam-coach`: source-grounded exams, scoring, error taxonomy, and readiness.

## Install

```bash
codex plugin marketplace add Miao200685/learning-mastery-skills --ref main
codex plugin add learning-mastery-skills@learning-mastery
```

## Start

```text
Use $learning-mastery to create a project for linear algebra, exam on 2027-01-15, target score 90, 60 minutes per day.
```

For a low-motivation or irregular day:

```text
Use $learning-momentum to choose a 10-minute comeback session.
```

For a full explanation cycle:

```text
Use $learning-tutor to run a Feynman Loop for eigenvectors.
```

The core tools use only the Node.js standard library. Learning data stays outside the public repository. See [docs/CATALOG.md](docs/CATALOG.md) for the audited external project catalog and [docs/PRIVACY.md](docs/PRIVACY.md) for data boundaries.

Licensed under MIT. External projects retain their own licenses.
