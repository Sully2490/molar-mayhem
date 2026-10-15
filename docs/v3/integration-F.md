# Lane F integration notes

Lane F owns the glossary layout and the Search / Focus mode placement. Shared files were left alone except the deploy salt (required when cached files change) and the one test that asserts that salt.

## Already applied on this branch

`sw.js` salt line only:

```js
const DEPLOY_SALT = '20261015v3f';
```

`tests/nav.test.js` asserts that same value so `npm test` matches `sw.js`. Lane G should change both to the final salt `20261015v3` when the lanes are wired together. Do not leave the salt at `20261015i`.

## Do not add a second search bar in index.html

`js/search/mount.js` places `.mm-tools` (the Search field and the Focus mode button) in this order:

1. Inside the first `[data-mm-tools-mount]` element, when one is on the page.
2. Otherwise immediately after the first `h1` in `#view`.
3. Otherwise immediately after `.site-header`.

The Terms page renders this slot directly under its `h1`:

```html
<h1>Terms</h1>
<div class="terms-tools-slot" data-mm-tools-mount></div>
```

A `MutationObserver` on `#view` (`childList: true`) runs `placeSearchTools(document, tools)` after each route paint. `view.innerHTML = …` drops the tools node; the observer puts the same node back under the new title or mount. Listeners stay on that node.

Lane G should not insert another `.mm-tools` block, and should not move search in `js/app.js` or `index.html`. No `index.html` edit is required for this lane.

`placeSearchTools` is exported from `js/search/mount.js` and `js/search/index.js` if a later paint needs to call it by hand.

## Focus mode

`css/search/search.css` keeps `.mm-tools` visible when it is a direct child of `.page`, so the fixed “Exit focus mode” button is not `display: none` inside a hidden parent. The search field itself still hides in focus mode.

## Precache list (please apply in Lane G)

`css/terms/terms.css` is linked from `index.html` and is not in `PRECACHE_PATHS`. Add it to `js/offline/precache.js` (keep the list sorted with the other CSS paths):

```js
  'css/styles.css',
  'css/terms/terms.css',
```

`css/search/search.css` and `js/search/mount.js` are already precached. Their contents changed; the salt bump above refreshes that cache. No `package.json` change.

## Terms page contract

- 374 glossary cards, grouped by chapter 1–9, then by letter.
- Chapter filter chips (`data-terms-chapter`) and an A–Z jump (`data-terms-letter`). The jump scrolls to `[data-terms-anchor]` and does not write a URL hash, because the hash router owns `#Terms`.
- Cards use `a.term-tile`, not a flat `ul.terms-index`.
- Styles live in `css/terms/terms.css`, which `index.html` already loads.
