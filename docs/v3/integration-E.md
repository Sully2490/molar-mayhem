# Lane E integration notes

Lane E adds lab help panels and the hydrogen spectrum. It does not edit the shared shell except the deploy salt.

## DEPLOY_SALT

`sw.js` is set to:

```js
const DEPLOY_SALT = '20261015v3e';
```

Only that line changed. Lane G should replace it with the final salt `20261015v3` when the lanes are combined.

`tests/nav.test.js` pins that same salt so `npm test` matches this branch. Lane G should update that assertion when it sets the final salt.

## Precache

Add these paths to `PRECACHE_PATHS` in `js/offline/precache.js` (near the other lab files):

- `content/lab-help.json`
- `js/lab/help.js`

`css/lab/lab.css` is already on the list. `js/lab/index.js` already imports `js/lab/help.js`, and `index.html` already links `css/lab/lab.css`. No change to `index.html`, `css/styles.css`, `js/app.js`, `js/routes.js`, `js/nav.js`, or `package.json`.

`tests/offline.test.js` temporarily skips `content/lab-help.json` in the “every content JSON is precached” check. Remove that skip when the path is added.

## Search

`content/lab-help.json` includes the lesson fields so `scripts/check-content.js` accepts it. The catalog the lab reads is `categories`.

If that file is added to the precache list, `js/search/records.js` will treat it as a lesson and offer `#Learn/lab-help`, which is not a lesson route. When Lane G precaches it, skip `content/lab-help.json` in search indexing.

## What the lab does now

- Every lab tool renders a collapsed `<details class="lab-help">` with a tutor hint, a worked example, at least three practice problems from `generateProblem` / `generateFromSeed`, a `#Learn/...` link, and OpenStax Chemistry: Atoms First 2e section cites. Page numbers are omitted.
- A miss shows a hint. The full answer appears after the third miss.
- Hydrogen levels keep their energies, and the n = 4, 5, 6, and ∞ labels are spaced with leader lines.
- The spectrum strip is a 380–750 nm gradient with Balmer lines at 410, 434, 486, and 656 nm. Lyman is a shaded UV band. Paschen and later series are a shaded IR band.
