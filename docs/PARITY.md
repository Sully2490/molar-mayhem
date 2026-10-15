# PARITY

Molar Mayhem keeps the study features of the earlier site. This file maps each one to where it lives. Original problems and explanations only.

## Sync

Progress sync is a **manual export/import code** and nothing else.

- The only store is `localStorage` in the browser.
- The student copies a code out, or pastes a code in. The same code may also sit in a `#sync=` link, which the page reads locally.
- No accounts. No logins. No backend. No server save.

Home when it is built: `js/sync.js`. The progress policy that saves attempts is feature I8.

## Lab tools

Every Lab tool has to meet all four of these. The list includes the VSEPR 3D viewer, the EM wave, standing waves, orbital pictures, the orbital-box widget, hydrogen energy levels, the Lewis structure builder, and the ionic formula builder. A tool added later follows the same four rules.

1. **Text description of what is shown.** Example: `tetrahedral, 109.5°`. The description sits in an `aria-live` region or in an element referenced by `aria-describedby`. It updates when the picture changes.
2. **Full keyboard control.** Every control can be reached and used with the keyboard alone.
3. **Static frame under reduced motion.** When `prefers-reduced-motion: reduce` is set, the tool shows one still frame of the current state. It does not autoplay, spin, or animate.
4. **Touch on phone widths.** The same controls work with touch at the site’s narrow layout (`max-width: 720px`).

Home: `js/lab/` and `css/lab/`.

## Map

| Item | Where it lives | Now |
| --- | --- | --- |
| Periodic-table tray (heat map, trend arrows, element popup) | `js/periodic.js`, `js/elements.js`, tray in `index.html` and `css/styles.css` | Tray colors atomic radius, ionization energy, and electronegativity. Further properties stay with the table work. |
| Glossary terms that open a popup | Not in the repo yet | |
| Lab tools | `js/lab/`, `css/lab/` | Follow the Lab rules above. |
| Drills | `#Drill` | Placeholder in `js/routes.js`. |
| Flash cards | `#Cards` | Placeholder in `js/routes.js`. |
| Exam prep (untimed cumulative final, chapters 1–9, more items in 5 and 7, corrections summary) | `#Prep`, `js/prep.js`, `js/final-exam.js` | On the practice-final branch. |
| Course map, per-lesson progress, streak, and XP | `#Map` | Placeholder in `js/routes.js`. |
| Sync | `js/sync.js`, `localStorage`, export/import code, `#sync=` | Follow the Sync rules above. Not built yet. |
