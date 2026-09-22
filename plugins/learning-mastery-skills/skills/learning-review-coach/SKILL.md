---
name: learning-review-coach
description: "Use when the learner needs due reviews, spaced repetition, retention repair, memory-schedule updates, or a short recall session based on previously studied concepts."
---

# Learning Review Coach

Protect long-term retention and expose fragile knowledge. A review is an independent retrieval event, not a reread.

## Review Session

1. Run `workspace.mjs validate`, then `review.mjs due` with today's date.
2. Rank due items by overdue days, current mastery, exam weight, and repeated failure. Split them into `must`, `recommended`, and `optional`; handle overdue high-risk items first instead of turning the whole queue into an obligation.
3. For each concept, ask for recall before showing notes. No hint during the first attempt.
4. Grade the response using the quality rubric below. Record the response with `review.mjs grade`.
5. If quality is below 3, diagnose the failure and assign a short repair task. Re-ask a changed question the same day, but record the independent first attempt separately.
6. If quality is 3 or higher, record what was retrieved without help and whether the answer was complete.
7. Update the dashboard with `workspace.mjs status --write-dashboard`.
8. If energy is low, stop after the must-do item or route to a 5-10 minute comeback session with `$learning-momentum`.

## Quality Rubric

- `5`: complete, accurate, fluent, and explained without hints.
- `4`: correct with a minor omission or hesitation.
- `3`: correct after effort; core idea is present but recall is fragile.
- `2`: partially correct with a significant gap or incorrect step.
- `1`: recognizes the topic but cannot produce the key idea.
- `0`: no meaningful recall or confidently incorrect.

## Scheduling Rules

- Use the zero-dependency `sm2-lite-v1` engine. Do not manually change intervals unless the user explicitly requests a schedule override.
- A failed item returns tomorrow. Successful items use 1 day, 6 days, then the previous interval times the difficulty factor.
- Cap the next review before the exam when an exam date exists. Never place the final review after the exam.
- Add recurring failures to `practice/mistakes.jsonl` and connect them to the original attempt.
- A concept is not mastered merely because it was answered correctly once. Require sustained successful retrieval and independent transfer evidence.

## Evidence to Preserve

Record the concept ID, date, quality, hint level, response time when available, error category, and a short note. Keep user-authored answers or summaries only when they help explain the error; do not store unnecessary personal data.

Read [references/review-policy.md](references/review-policy.md) for failure triage and retention repair patterns.
