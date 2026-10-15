# Lane F — chemistry keyboard, search, and offline

Lane F adds three modules the page can load without a build. `index.html` is left unchanged; paste the tags below when you wire this lane.

## Tags to add

In `<head>`, after the existing stylesheets:

```html
<link rel="stylesheet" href="css/chemkb/chemkb.css">
<link rel="stylesheet" href="css/search/search.css">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<meta name="theme-color" content="#0f5c56">
```

Before `</body>`, after `js/app.js`:

```html
<script type="module" src="js/app.js"></script>
<script type="module" src="js/offline/start.js"></script>
```

`start.js` calls `startLaneF()`. That mounts search, watches for answer fields, and registers the service worker. Paths are relative, so they resolve under `/molar-mayhem/` on GitHub Pages.

## Chemistry keyboard

`js/chemkb/keyboard.js` exports `attachChemKeyboard(input)`.

The row is a `role="toolbar"` of real `<button type="button">` elements. Each button has an `aria-label` spoken name (`superscript minus`, `subscript 2`, `times ten to the`, `minus`, and the rest). `pointerdown`, `mousedown`, and `touchstart` call `preventDefault` so the phone keyboard stays open and the caret does not jump. The inserted text goes at the saved caret, or replaces the selection.

Keys: `×10^`, `−`, superscript digits `⁰¹²³⁴⁵⁶⁷⁸⁹`, `⁻`, `⁺`, subscript digits `₀₁₂₃₄₅₆₇₈₉`, `→`, `⇌`, `Δ`, `°`, `(`, `)`.

`×10^` keeps the caret that `parseAnswer` needs. `4.307×10^⁻¹⁹` and `6.02×10^²³` grade as scientific notation. `−` is U+2212, for the iPhone decimal keypad, which has no minus and no `×10^`. The row does not change `inputmode`, so a decimal keypad can stay up.

`startLaneF` attaches the row to every `input[name="answer"]`, including problems rendered later. Call `attachChemKeyboard` yourself for any other field.

## Search and focus mode

`js/search/mount.js` exports `mountSearch(document)`.

The field is a visible `<label for="mm-search-input">Search</label>`. Results go in a `role="listbox"`. A separate `aria-live="polite"` region announces the count and the first title, for example `2 results. What is the density of water?`. `/` focuses the field unless the student is already in an input, textarea, or select. Arrow Down moves into the results.

The index is built in the browser from the lesson and problem JSON listed in `js/offline/precache.js` (`content/`, skipping `schema.json`). Solutions (`a` and `why`) are not indexed. If `content/terms/index.json` exists, it is a list of file names in `content/terms/`. Each term file looks like `{ "id", "term", "definition", "ch" }`. A missing terms folder is ignored.

Ranking uses an inverted index. Every query word must match. A title hit outranks a body hit. A prefix of two or more letters matches (`sig` finds `significant`).

**Focus mode** is the button next to search. It adds `mm-focus` on `<body>` and `mm-focus-keep` on the current problem (`[data-problem]`, or the problem that holds focus). The stylesheet hides the header, footer, tray, search, and the other blocks in the lesson. The chemistry keys stay, because they sit inside the problem. Escape calls `exitFocusMode`. The periodic-table Escape handler still runs.

## Offline and the home screen

`sw.js` is a module worker at the site root. `js/offline/register.js` exports `registerOffline`.

```js
navigator.serviceWorker.register('/molar-mayhem/sw.js', {
  scope: '/molar-mayhem/',
  type: 'module',
});
```

The scope is exactly `/molar-mayhem/`. Precache URLs are relative (`css/styles.css`, `content/ch01/sigfigs.json`) and are resolved against that scope, so they never land on the domain root or on another project hosted at `sully2490.github.io`.

`DEPLOY_SALT` in `sw.js` is part of the cache name (`molar-mayhem-<salt>-<fingerprint>`). The fingerprint changes when `PRECACHE_PATHS` changes. **Bump `DEPLOY_SALT` on every deploy.** Browsers check `sw.js` itself for updates, not the modules it imports. `activate` deletes caches whose names start with `molar-mayhem-` and are not the current name. Caches that belong to another app on the same origin are left alone.

- HTML (`navigate`, `.html`, or a path ending in `/`) is network-first. If the network fails, the worker serves the cached page, then cached `index.html`.
- CSS, JS, JSON, icons, and the manifest are cache-first.
- `sw.js` is not cached, so the browser can see the next salt.
- A response is stored only when it is `ok`, `type === 'basic'`, and its final URL is under `/molar-mayhem/`.
- YouTube, `youtu.be`, `youtube-nocookie.com`, Canvas (`instructure.com`, any host whose labels include `canvas`), and every other origin are fetched and never written to the cache.

Install does **not** call `skipWaiting`. When a new worker is waiting and the page already has a controller, the registration helper shows a button labeled `New version, tap to refresh`. The tap posts `{ type: 'SKIP_WAITING' }`. The worker calls `skipWaiting` only for that message, then `activate` claims clients and the page reloads.

`manifest.webmanifest` uses `start_url` and `scope` of `./`, so they follow the manifest URL on GitHub Pages. Icons are `icons/icon-192.png`, `icons/icon-512.png`, and a maskable `icons/icon-maskable-512.png`.

When a chapter adds a JSON file, add that path to `PRECACHE_PATHS` in `js/offline/precache.js` and bump `DEPLOY_SALT`.

## Public imports

```js
import { attachChemKeyboard } from './js/chemkb/keyboard.js';
import { mountSearch } from './js/search/mount.js';
import { registerOffline } from './js/offline/register.js';
import { startLaneF } from './js/offline/boot.js';
```
