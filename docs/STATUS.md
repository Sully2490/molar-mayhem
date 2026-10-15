# STATUS

_Last updated: 2026-10-15. This branch adds Chapter 1 lessons and the Learn player._

## State
- Features passing: F00, F03. C1 stays `"passing": false` until `content/coverage.json` maps the external manifest (F01, still on hold).
- `#Learn` loads `content/chNN/index.json` and each lesson file. Practice items use a visible "Your answer" label and an `aria-live="polite"` region. A miss shows a hint. The third miss shows the solution and disables the box.
- Chapter 1 (OpenStax AF2e §1.2–§1.6): physical and chemical change, classifying matter, significant figures, metric prefixes, density, dimensional analysis, and temperature. Word answers set `case` to `insensitive`. Numeric checks store the rounded value and leave `unit` null so the student types the number.
- `#Map`, `#Drill`, `#Prep`, and `#Cards` stay placeholders. The periodic-table tray is unchanged.

## Priorities
Chapter drafts continue in order, Ch 2 through Ch 9, each on the merged grader. Ch 5 already has its own draft. Interactive features and the practice final follow the chapter drafts. F01 and F02 stay on hold.

## Blockers
- None for the Chapter 1 player. Coverage mapping waits on the external manifest.
