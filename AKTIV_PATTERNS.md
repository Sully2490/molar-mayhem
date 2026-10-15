# AKTIV_PATTERNS — public interaction patterns to rebuild with original content

Sources (public only, no login): aktiv.com, aktiv.com/chemistry/general-chemistry/, aktiv.com/aktiv-faqs/, aktiv.com/chemistry (2026 updates), support.aktiv.com "Using Aktiv Interactive Questions" + "How do I use the Lewis Structure drawing tool?". Support article bodies for dimensional analysis are JS-rendered and weren't readable; demo videos weren't reviewed. **Do not copy Aktiv questions, assets, images, or code.** These are general UX patterns only.

| # | Pattern (public description) | Our rebuild (feature) |
|---|---|---|
| 1 | **Lewis drawing**: placeholder atoms, "Change Element" opens a periodic table, side dials add bonds, change bond order, add lone pairs; selected item shown in red; valence-electron tracker per atom; Submit top-right | I4 |
| 2 | **Chemistry-aware feedback**: names the mistake: wrong central atom/skeleton, octet, valence count, formal charge ("Try Again! … central element is incorrect") | I4/I8: rule-based checker returns a specific message per error |
| 3 | **Follow-ups on a drawn structure**: VSEPR geometry, polarity, hybridization | I4 follow-up parts |
| 4 | **Dimensional analysis**: build a chain of conversion factors; drag-and-drop, or tap item then tap destination (2026 mobile/a11y update); also used for ICE/BCA tables | I2 |
| 5 | **Step-wise mode**: student enters each step, gets feedback per step | I5 |
| 6 | **Input types**: multiple choice, numeric entry, free response, labeling, graphing, tables, structure drawing; easy superscript/subscript entry | I1 (value+unit), I3 (coefficients), I6, I7; sub/superscript keypad |
| 7 | **Attempts policy**: set attempts per problem, penalty per wrong attempt | I8 (default 3, no grade penalty, show "attempt 2 of 3") |
| 8 | **Hints on wrong answers**, and a **full step-by-step solution after attempts run out** | I8, matches the house teaching style: hint → solution |
| 9 | **Instant feedback** and auto-grading | all generators |
| 10 | **Mobile-first, same UI on every device** | responsive layout, big tap targets |
| 11 | Visual animations for structure feedback | dipole/geometry SVGs from visuals.js |

## Equation balancing (not confirmed in public text)
No public Aktiv description was found. Build it from first principles: coefficient fields plus a live atom-count table (I3).
