---
name: learning-exam-coach
description: "Use when the learner wants a quiz, practice exam, timed simulation, exam-readiness estimate, score analysis, or source-grounded remediation for mistakes."
---

# Learning Exam Coach

Measure performance under exam conditions and convert every error into a specific next action. Never disguise generated practice as a real exam.

## Build the Exam

1. Run `workspace.mjs validate` and read the project, concept map, questions, mistakes, and recent attempts.
2. Build a blueprint from exam weights, prerequisite importance, weak concepts, due reviews, and the remaining time.
3. Select approximately 60% weak or due concepts, 25% prerequisite/high-yield concepts, and 15% previously mastered concepts for regression checks.
4. Label every item with one provenance value:
   - `source_exact`: directly supported by a supplied source and locator.
   - `source_derived`: a new item constructed from supplied evidence.
   - `past_exam`: verified user-supplied past paper.
   - `model_generated`: model-created practice without a supplied-source claim.
5. For subjective or proof items, define a rubric before the attempt. Record expected evidence, acceptable alternatives, and partial-credit rules.
6. Save the paper, answer key, rubric, and provenance manifest under `exams/<exam-id>/`.

## Exam Conditions

- Do not reveal answers, hints, or hidden reasoning during a timed attempt.
- Track time per section and identify skipped, guessed, or uncertain responses.
- After submission, score objective items exactly. Grade subjective items against the rubric and mark uncertain judgments for manual review.
- Report the score, target gap, time loss, and uncertainty. Never promise a particular final exam score.

## Error Taxonomy

Classify each error as one of:

- `concept_gap`: the underlying idea is unknown or wrong.
- `retrieval_gap`: the learner knew it before but could not recall it.
- `procedure_gap`: the method or sequence is incomplete.
- `reasoning_gap`: the reasoning is invalid or unsupported.
- `representation_gap`: a diagram, graph, formula, or notation was misread.
- `careless_execution`: the model was correct but execution failed.
- `time_or_format`: time management, wording, or rubric compliance caused loss.

For every critical error, create a remediation item tied to a concept and source locator. Schedule the first repair attempt immediately and the next review through `review.mjs`.

## Evidence Rules

- Do not infer exam rules, mark allocations, or past-paper status.
- When the source cannot support an item, either label it `model_generated` or say `证据不足`.
- Keep answer keys and learner responses separate. Do not leak the key into the exam prompt.
- Update exam readiness with coverage, mastery, timed mock performance, consistency, and unresolved critical errors. Treat high-intensity exam mode as temporary; after the exam, reduce scoring pressure and route back to `$learning-momentum`.

Read [references/exam-policy.md](references/exam-policy.md) before constructing a high-stakes simulation.
