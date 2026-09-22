# Source Ingestion Rules

## Locator Schemes

- PDF: `page:<n>` plus `figure:<label>` or `table:<label>` when relevant.
- PPTX: `slide:<n>` plus `notes:<n>` when the source uses speaker notes.
- DOCX: `heading:<path>` plus a paragraph, table, or figure identifier.
- Markdown/text/HTML: heading path and line range.
- Image/scanned page: `image:<path>` plus page or region coordinates; record extraction confidence.

## Extraction Quality

Classify each source as `complete`, `partial`, `pending`, or `needs_review`.

A source is partial when formulas, images, marginal notes, handwritten content, or tables may have been lost. Keep the locator even when extraction is partial, and clearly identify what could not be read.

## Deduplication

- Use SHA-256 for exact file identity.
- Use title, heading tree, and content overlap for conceptual duplicates.
- Do not merge two versions merely because they share a title.
- Preserve a version note when content changes, and mark dependent concepts for revalidation.

## Failure Handling

- If a page cannot be read, say so and preserve the page reference.
- If a table is visually complex, keep the image locator and extract only values that can be verified.
- If a cited claim is outside the supplied material, label it `model_generated` or request another source.
- Never invent a quote, page number, slide number, formula, or exam rule.
