# Lane C — glossary, term links, and quick recall

Lane C owns the glossary and the recall decks. Wiring into `index.html`, `js/routes.js`, `js/learn.js`, and `js/app.js` is a later lane. This file is the contract for that wiring.

Terms and recall decks are JavaScript modules, not JSON. `npm run check:content` treats every `content/**/*.json` file (except `schema.json` and `coverage.json`) as a lesson. A glossary JSON file would fail that check.

## What is here

| Path | Role |
| --- | --- |
| `content/terms/ch01.js` … `ch09.js` | Original glossary terms |
| `content/terms/index.js` | `TERMS`, sorted by name |
| `content/terms/recall/` | List-style recall decks |
| `js/terms/index.js` | Public barrel. Call `installTerms(document)` once |
| `js/terms/linker.js` | `linkTerms(html)` at lesson render time |
| `js/terms/dialog.js` | Accessible term card |
| `js/terms/index-page.js` | Searchable index |
| `js/terms/recall.js` | Rapid-fire recall with self-check |
| `js/terms/cards.js` | Flashcard export for other lanes |
| `css/terms/terms.css` | Term links, dialog, index, recall |

Each term has `chapter`, `lesson`, `id`, `term`, `definition`, `example`, `use`, and `related`. `lesson` is a real lesson id from the chapter JSON, and `chapter` matches that lesson. Optional `visual` is a key in `VISUAL_IDS` (`js/terms/art.js`). Optional `aliases` are extra phrases the linker may match. `match: 'formula'` keeps case (so `CO` is not `Co`).

## Stylesheet

Add this next to the other stylesheets in `index.html`:

```html
<link rel="stylesheet" href="css/terms/terms.css">
```

## One dialog for the page

After the document exists, and before lesson HTML is shown:

```js
import { installTerms } from './terms/index.js';

const termsDialog = installTerms(document);
```

`installTerms` appends the dialog and backdrop to `document.body` (outside `main`, so marking `main` inert does not freeze the card) and listens for clicks on `.term-link`.

The card follows `setBehindInert` in `js/glossary.js`. The dialog and its backdrop sit in a `.term-shell` appended to `document.body` (outside `main`, so marking `main` inert does not freeze the card). Opening the card marks every sibling of that shell inert, then walks up to `body` the same way. It adds `term-open` on `body` and restores focus on close. Tab wraps inside the card. Escape uses the capture phase and stops propagation so the tray’s bubble listener does not also run. A hash change closes the card. The dialog has `role="dialog"`, `aria-modal="true"`, `aria-labelledby="term-dialog-title"`, and `aria-describedby="term-dialog-def"`. Focus moves to the dialog when it opens.

## How a lesson calls the linker

`linkTerms` scans HTML that is already escaped. It wraps the first occurrence of each term. A longer phrase wins over a shorter one at the same spot (`ideal gas law` before `gas`). Matches use word boundaries (letters, digits, apostrophes, hyphens). Case is ignored unless the term’s `match` is `'formula'`. Phrases shorter than two characters are skipped.

It does not link inside `a`, `button`, `script`, `style`, `svg`, `code`, `textarea`, `input`, `select`, `option`, or any element with `data-no-terms`.

In the learn renderer, after the lesson HTML string is built:

```js
import { linkTerms } from './terms/linker.js';

const html = linkTerms(escapedLessonHtml);
```

`linkPlain(text)` escapes plain text and then links it. Use that for a single string that is not HTML yet.

A link looks like:

```html
<a class="term-link" href="#Terms/density" data-term="density">density</a>
```

`installTerms` / `bindTermLinks` opens the card from that click and does not navigate away. `href` is still a real hash so the card works if the route lane handles `#Terms/<id>`.

## Routes

`TERMS_ROUTE` is `'Terms'`. Suggested hash handling, in the route module (do not add it from this lane):

| Hash | Render |
| --- | --- |
| `#Terms` | `renderTermsIndex()` into the view, then `bindTermsIndex(view, termsDialog)` |
| `#Terms/<id>` | Same index (or the current lesson). `termIdFromHash(location.hash)` returns the id. `termsDialog.open(id)` opens the card. `termIdFromHash` returns `null` for `#Terms/recall` and for anything that is not `#Terms`. |
| `#Terms/recall` | `renderRecallIndex()` then `bindRecall(view)`. `recallDeckFromHash` returns `''`. |
| `#Terms/recall/<deckId>` | Same recall page. `recallDeckFromHash(location.hash)` returns the deck id. `bindRecall(...).openDeck(id)` starts that deck. |

Search and the chapter filter live in the index markup. `bindTermsIndex` updates the list in place. The export button calls `triggerFlashcardDownload`, which saves a local `molar-mayhem-flashcards.json`. Nothing is uploaded.

## Quick recall

Decks live in `content/terms/recall/` and are exported as `RECALL_DECKS`:

| Deck id | What to recall |
| --- | --- |
| `strong-acids` | HCl, HBr, HI, HNO₃, H₂SO₄, HClO₄. HClO₃ and HF are near misses. |
| `strong-bases` | LiOH, NaOH, KOH, RbOH, CsOH, Ca(OH)₂, Sr(OH)₂, Ba(OH)₂. Mg(OH)₂ and NH₃ are not on the list. |
| `solubility-rules` | Which salts dissolve, including the usual halide and sulfate exceptions. |
| `polyatomic-ions` | Common ion names with their charges. |
| `vsepr-shapes` | Electron-domain shapes and bond angles. |
| `gas-laws` | Boyle, Charles, Avogadro, Amontons, the combined law, and PV = nRT. |

A card is either a `list` (several items, any order) or an `item` (one formula, charge, shape, or angle).

A normalized match counts as correct and the next card appears immediately. A mismatch stays on the card and shows how many items matched, a targeted hint for a near miss (HClO₃ points at HClO₄; Mg(OH)₂ is not a strong base), and the expected list. **Show the answer** opens that same review without a typed attempt. **I had it** and **I missed it** record the card and advance. Typing is loose about spaces, case, degree signs, unicode subscripts, and a trailing charge (`2-` and `-2` both match).

## Flashcards for other lanes

```js
import { toFlashcards, recallFlashcards, allFlashcards, flashcardsJson } from './terms/index.js';
```

`toFlashcards()` is one card per glossary term (`kind: 'term'`). `recallFlashcards()` is one card per recall prompt (`kind: 'recall'`, id `deckId:cardId`). `allFlashcards()` concatenates both. `flashcardsJson()` is `{ version: 1, source: 'molar-mayhem', cards }` with a trailing newline.

## Attribution

Definitions, examples, uses, and recall prompts are original. Cite OpenStax *Chemistry: Atoms First 2e* (CC BY 4.0) by section on the term card where a chapter lesson already does. Do not copy course-pack or instructor wording into these files.
