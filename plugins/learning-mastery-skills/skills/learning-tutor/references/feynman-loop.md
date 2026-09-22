# Feynman Loop Protocol

## Purpose

The loop converts an explanation into evidence of understanding. It is not a request to write a simplified summary.

## Stage 1: Plain Explanation

Ask the learner to explain the idea without specialist vocabulary. Allow necessary domain terms only after defining them in ordinary language.

Record the explanation in `knowledge/feynman.json`. When using the CLI:

```bash
node <plugin-root>/scripts/feynman.mjs record <workspace> --concept <id> --stage explain --text "<explanation>"
```

## Stage 2: Gap Location

Ask the learner to identify the exact sentence that felt vague, circular, memorized, or dependent on an undefined term. Record it as `gap`.

Do not accept “I need to review everything.” Require one concrete unresolved sentence or relationship.

## Stage 3: Source Check

Return to one page, slide, section, or example. Compare the learner's explanation with the source. Record the correction as `source_check`.

If the source does not answer the question, mark `证据不足`; do not fill the hole from general knowledge.

## Stage 4: Analogy and Boundary

Create an analogy and explicitly state:

- which relationship it preserves;
- where it stops working;
- what a misleading use would imply.

Record both the analogy and its boundary as `analogy`.

## Stage 5: Re-explain

Produce a shorter explanation using a different representation: diagram, formula, example, story, or code. Record it as `simplify`.

Simpler does not mean less accurate. Qualifiers and edge conditions must remain.

## Stage 6: Transfer

Ask for a new case, counterexample, prediction, or real task. Record it as `transfer`.

A cycle is complete only after transfer. If transfer fails, return to the earliest failed stage rather than restarting the whole lesson.

## Storage Shape

```json
{
  "schema_version": 1,
  "concepts": {
    "concept-id": {
      "concept_id": "concept-id",
      "cycles": [
        {
          "id": "cycle-...",
          "status": "in_progress",
          "started_at": "ISO timestamp",
          "completed_at": null,
          "stages": {
            "explain": { "text": "...", "confidence": 3, "recorded_at": "..." },
            "gap": { "text": "...", "confidence": 2, "recorded_at": "..." }
          }
        }
      ]
    }
  }
}
```

Run `feynman.mjs status` to see incomplete cycles. Never overwrite an earlier cycle; revision history shows how understanding changed.
