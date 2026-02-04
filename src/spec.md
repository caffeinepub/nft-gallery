# Specification

## Summary
**Goal:** Automatically render URLs in post captions/descriptions as clickable links wherever captions are displayed.

**Planned changes:**
- Detect URLs in post caption/description text and render them as clickable anchor elements in all relevant UI surfaces (e.g., posts feed PostCard and post detail views).
- Ensure auto-linked URLs open in a new tab and include safe anchor attributes (`target="_blank"` with `rel="noreferrer noopener"`).
- Preserve non-URL caption text formatting and readability (including spacing and line breaks).

**User-visible outcome:** When a post caption includes a URL, viewers (including non-authenticated users) can click it to open the link in a new tab safely.
