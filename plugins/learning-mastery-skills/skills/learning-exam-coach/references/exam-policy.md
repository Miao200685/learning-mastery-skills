# Exam Construction and Scoring Policy

## Blueprint

Assign every question to at least one concept and one evidence source, except explicitly generated practice. Balance coverage, difficulty, expected time, and exam format. Include a short retrieval warm-up only when it does not leak later answers.

## Provenance

- `source_exact`: wording or fact is directly supported by a locator.
- `source_derived`: a new question constructed from supplied evidence.
- `past_exam`: verified user-supplied historical item.
- `model_generated`: practice not asserted to come from the supplied evidence.

A generated item must never be labelled as a real past paper. If the source lacks an answer, say `证据不足` rather than inventing one.

## Scoring

- Objective items: exact or explicitly defined equivalent answers.
- Numeric items: accept a documented tolerance and show the calculation path.
- Short answer: score against required claims and relationships.
- Proof or essay: score against a rubric with evidence, reasoning, organization, and alternative-valid-answer rules.
- Practical tasks: use an observable performance rubric and record artifacts.

For ambiguous responses, output a provisional score and mark it for manual review.

## Error Classification

Use `concept_gap`, `retrieval_gap`, `procedure_gap`, `reasoning_gap`, `representation_gap`, `careless_execution`, or `time_or_format`. Each critical error must produce a remediation action, a source locator, a first repair attempt, and a review date.

## Readiness

Use the configured formula: coverage 25%, concept mastery 30%, timed mock performance 30%, consistency 15%, minus unresolved critical-error penalty. Report a range and state that it is an estimate, not a guarantee.
