# Workspace Contract

## Layout

```text
project.json
sources/
  index.json
  extracted/
knowledge/
  concepts.json
plan/
  roadmap.md
  today.md
practice/
  questions.jsonl
  attempts.jsonl
  mistakes.jsonl
exams/
reviews/
  schedule.json
progress/
  mastery.json
  dashboard.md
```

## Core Objects

### Project

Required fields are `schema_version`, `name`, `subject`, `goal`, `exam_date`, `target_score`, `available_minutes_per_day`, `language`, `timezone`, `mode`, `source_policy`, and `mastery_weights`.

`mode` is `auto`, `mastery`, `balanced`, or `exam`. `source_policy` defaults to `materials_only`.

### Source

A source record contains `id`, `title`, `path`, `type`, `sha256`, `size_bytes`, `locator_scheme`, `extraction`, and timestamps. The original source is never modified. A changed file keeps its identity only when the user confirms it is a new version.

### Concept

A concept contains `id`, `title`, `learning_objective`, `type`, `prerequisites`, `source_refs`, `exam_weight`, and `inferred`. Source references use source IDs plus locator metadata. Inferred concepts cannot be mandatory exam facts.

### Question

A question contains `id`, `concept_ids`, `provenance`, `source_refs`, optional `locator`, prompt, answer or rubric, and difficulty. Provenance must be one of `source_exact`, `source_derived`, `past_exam`, or `model_generated`.

### Attempt and Mistake

An attempt records what the learner produced and the conditions: date, quality or score, hint level, response time, concept IDs, and source attempt. A mistake adds severity, status, error category, and remediation linkage.

## Integrity Rules

- Validate before writing.
- Use stable IDs and never reuse them for another concept.
- Append attempts and mistakes; do not rewrite history to make progress look better.
- Update mastery only from observable evidence.
- Keep every factual claim traceable to a locator or mark it as insufficient evidence.
- Never store credentials, full private messages, or unrelated personal data in the workspace.
