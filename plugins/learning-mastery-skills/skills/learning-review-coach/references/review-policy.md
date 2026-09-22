# Review and Retention Policy

## SM-2 Lite v1

- Difficulty factor starts at 2.5 and never falls below 1.3.
- Quality below 3 resets repetitions and schedules the next review tomorrow.
- Successful intervals are 1 day, 6 days, then `round(previous_interval * difficulty_factor)`.
- The difficulty factor update uses:
  `EF' = max(1.3, EF + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`
- Before an exam, cap the next due date at the day before the exam when that date is in the future.

## Failure Triage

- `retrieval_gap`: wait several minutes, then ask a changed retrieval question.
- `concept_gap`: return to a worked example or source locator before retrying.
- `procedure_gap`: isolate the first incorrect step and practice the transition.
- `reasoning_gap`: ask for assumptions and evidence, then compare with the source.
- `careless_execution`: add a check routine; do not change the concept explanation first.
- `time_or_format`: practice the exact constraint or rubric separately.

## Same-Day Repair

The first attempt remains recorded with its original quality. A repair attempt may use hints, but it must be stored as a separate attempt and cannot count as independent recall.

## Retention Evidence

A successful review date matters more than the number of repetitions. Record successful dates, lapses, and spaced-success count. A concept is not mastered from one successful session.
