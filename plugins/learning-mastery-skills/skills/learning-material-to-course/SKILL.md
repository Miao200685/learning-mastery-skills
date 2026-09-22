---
name: learning-material-to-course
description: "Use when learning materials such as PDFs, slides, Word documents, Markdown, web pages, or images need to become a source-grounded concept map, diagnostic, course roadmap, or study workspace."
---

# Material to Course

Convert learner-supplied materials into an evidence-linked course. Preserve source fidelity and make gaps visible.

## Ingestion Workflow

1. Locate the learning workspace and run `workspace.mjs validate` first.
2. Inventory each file without modifying it. Register it with `workspace.mjs source`, which records its path, SHA-256, type, locator scheme, and extraction status.
3. Extract the smallest useful unit:
   - PDF: page and figure/table label.
   - PPTX: slide and shape or notes location.
   - DOCX: heading path and paragraph or table location.
   - Markdown/text/HTML: heading path and line range.
   - Image or scanned page: image path, page, and region; mark low-confidence text for review.
4. Save extracted Markdown under `sources/extracted/` and update the source's extraction status and confidence. Never overwrite the original file.
5. Deduplicate repeated material by hash and equivalence, not by filename alone.

If text extraction is unavailable or low-confidence, use page/slide images as anchors and mark `needs_review`. Do not silently OCR, paraphrase away important qualifiers, or claim a locator that cannot be checked.

## Build the Concept Map

Create atomic concepts in `knowledge/concepts.json`. Each concept must include:

- stable `id` and concise title;
- learning objective and kind (`fact`, `concept`, `procedure`, `strategy`, or `skill`);
- prerequisite IDs and confusable concepts;
- source references with page, slide, section, or region locators;
- exam weight when an exam exists;
- `inferred: true` only when no source supports it.

Connect prerequisites without cycles. Keep prerequisite edges necessary, not merely related. Split concepts when they require different evidence or practice methods.

## Produce the Course

- Write a dependency-aware roadmap to `plan/roadmap.md`: diagnostic, foundational concepts, worked examples, independent practice, retrieval, transfer, and exam simulation.
- Write the next actionable session to `plan/today.md` with time blocks and measurable exit criteria.
- Create a short diagnostic across major concept clusters. Use source-grounded items and record confidence before revealing answers.
- Identify high-yield nodes from exam weight, prerequisite centrality, and repeated error history. Do not equate repetition in the source with actual exam importance.
- Keep unverified or inferred topics out of mandatory exam coverage.

## Quality Gate

Before finishing, run `workspace.mjs validate`. Fix every missing source reference, dangling prerequisite, cycle, invalid provenance value, and missing locator. Use [references/ingestion.md](references/ingestion.md) for extraction rules and [references/concept-map.md](references/concept-map.md) for concept quality criteria.
