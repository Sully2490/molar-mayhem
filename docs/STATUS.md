# STATUS

_Last updated: 2026-10-15. F01 coverage check is in place._

## State
- Features passing: F00, F01, F03. See `feature_list.json`.
- Static site loads from `index.html` with no build step. Hash routes `#Map`, `#Learn`, `#Drill`, `#Prep`, and `#Cards` show placeholders. The periodic-table tray colors atomic radius, ionization energy, and electronegativity.
- `npm test` and `npm run check:content` run locally. GitHub Actions runs `npm test`.
- `check:content` parses any `content/*.json` files and skips the coverage manifest when `MM_SOURCES` is unset. The manifest mapping itself is F01.
- Course source material and the coverage manifest stay outside the repo, at the path set in `MM_SOURCES`.

## Priorities
The owner approved autonomous building. Order:

1. F02 local OCR (no paid service).
2. Unit 3 first: C5 (Ch 5), C7 (Ch 7), then the Unit 3 checklist (G3).
3. Weak-spot drills W1–W6.
4. Ch 8 and Ch 9 (C8, C9).
5. Interactive features I1–I8.
6. Remaining chapters C1–C4 and C6, then the cumulative checklist (GF), study plan (P2), and practice final (P1).

F00’s pull request is still open, so later feature branches start from that scaffold and rebase onto main when it contains the earlier work.

## Blockers
- None.
