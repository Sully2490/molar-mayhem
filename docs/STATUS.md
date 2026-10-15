# STATUS

_Last updated: 2026-10-15. This branch adds the untimed cumulative practice final._

## State
- Features passing: F00, F03. See `feature_list.json`.
- Static site loads from `index.html` with no build step. `#Prep` is an untimed cumulative practice final for chapters 1–9, with more items in chapters 5 and 7. `#Map`, `#Learn`, `#Drill`, and `#Cards` are still placeholders. The periodic-table tray colors atomic radius, ionization energy, and electronegativity.
- P1 stays `passing: false` here because its listed dependencies (GF, I1, I3) are still open. The final itself grades every written key.
- `npm test` and `npm run check:content` run locally. GitHub Actions runs `npm test`.
- `check:content` parses any `content/*.json` files and skips the coverage manifest when `MM_SOURCES` is unset. The manifest mapping itself is F01.
- Course source material and the coverage manifest stay outside the repo, at the path set in `MM_SOURCES`.
- Numeric tolerance is a relative percent (default 0.5%). A sig-fig mismatch returns a hint and still counts. Exact checks fold Unicode subscripts and superscripts into ASCII digits, collapse whitespace, follow a case rule, and accept any listed answer. An unordered set can mark near-miss items. A config check expands [He] through [Rn] and matches orbitals in any order.

## Priorities
The grader review fixes land before chapter content. After that:

1. F01 coverage check, then F02 local OCR (no paid service).
2. Unit 3 first: C5 (Ch 5), C7 (Ch 7), then the Unit 3 checklist (G3).
3. Weak-spot drills W1–W6.
4. Ch 8 and Ch 9 (C8, C9).
5. Interactive features I1–I8.
6. Remaining chapters C1–C4 and C6, then the cumulative checklist (GF), study plan (P2), and practice final (P1).

The first chapter with answer boxes must give every input a visible label and put feedback in an aria-live region.

## Blockers
- None on the grader. Chapter lessons are not part of this branch.
