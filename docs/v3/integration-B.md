# Lane B integration notes

Lane G applies these shared-file edits. Lane B did not edit `index.html`, `css/styles.css`, `js/app.js`, `js/routes.js`, `js/nav.js`, the precache list, or `package.json`.

`sw.js` salt is already `20261015v3b` on this branch. Lane G replaces that with the final `20261015v3` when it lands the other lanes. `tests/nav.test.js` asserts that exact salt string, so the same edit has to update the assertion. That test is the only file outside this lane that changed, and it changed only so the required salt bump still passes `npm test`.

## What is already live

`js/app.js` already calls `renderLearn` and `renderMap`.

- `#Learn` renders chapter tiles, the continue card, and module items. `renderLearn` reads `localStorage` when the caller omits progress, so the rings work before this wiring.
- `#Learn/mod-N` opens a chapter. `#Learn/mod-N-overview|lesson|examples|practice|quiz|videos|terms` opens an item. Nothing is locked.
- `#Map` groups lessons under short chapter titles.
- Opening `#Learn/mod-1` still calls `openLesson` in `app.js`, which stores a fake lesson id `mod-1`. The guard below stops that.

`#Home` still renders the twelve equal cards in `js/routes.js` until the Home block below is applied.

## 1. `index.html`

After the `css/styles.css` link, add:

```html
  <link rel="stylesheet" href="css/learn/learn.css">
  <link rel="stylesheet" href="css/home/home.css">
```

Scripts in `js/learn.js` and `js/home/css.js` also inject these links at runtime (`data-mm-learn`, `data-mm-home`). The head links avoid a flash and work before JavaScript.

Do not remove `data-nav`, `data-nav-slot`, `nav-primary`, or the More button. `tests/nav.test.js` requires them.

## 2. `js/app.js`

Add imports:

```js
import { bindHome, renderHome } from './home/index.js';
import { bindLearn, isLessonTarget, loadLessons, renderLearn } from './learn.js';
import { renderGlossary, bindGlossary } from './glossary.js';
```

`bindGlossary` is already imported. Add `renderGlossary` to that import instead of a second line if you prefer.

Replace the Learn branch:

```js
  if (id === 'Learn') {
    const lessonId = lessonIdFromHash(hash);
    if (lessonId && isLessonTarget(lessonId)) writeProgress(openLesson(readProgress(), lessonId));
    const lessons = await loadLessons();
    if (generation !== paintGeneration) return;
    view.innerHTML = linkTerms(renderLearn(lessons, lessonId, readProgress()));
    bindLearn(view, lessons);
    mountGuided(view, lessons, lessonId);
```

In the final `else`, paint Home with lessons instead of `renderRoute('Home')`:

```js
  } else if (id === 'Home') {
    const lessons = await loadLessons();
    if (generation !== paintGeneration) return;
    view.innerHTML = renderHome(lessons, readProgress(), { glossaryHtml: renderGlossary() });
    bindHome(view);
    bindGlossary(view);
  } else {
    view.innerHTML = renderRoute(id);
  }
```

Leave `renderRoute('Home')` in `js/routes.js` unchanged so `tests/scaffold.test.js` still sees the static fallback.

## 3. Nav groups

Data lives in `js/home/nav-groups.js` (`NAV_GROUPS`, `navItems`, `groupForRoute`).

| Group | Items |
| --- | --- |
| Study | Learn, Map, Videos, Terms, Cards |
| Practice | Drill, Lab, Build, Weak |
| Exam | Exam 3, Prep, Final |
| Tools | Periodic table (`data-open-tray`, not a route) |

Suggested desktop header, only as a visual grouping. Keep the existing `<li data-nav-slot>` nodes so the phone More menu can still move them:

```html
<nav class="site-nav" aria-label="Sections" data-compact-nav>
  <ul class="site-nav-list">
    <li class="nav-group-label" data-nav-group="study">Study</li>
    <!-- existing slots: Learn, Map, Videos, Terms, Cards -->
    <li class="nav-group-label" data-nav-group="practice">Practice</li>
    <!-- Drill, Lab, Build, Weak -->
    <li class="nav-group-label" data-nav-group="exam">Exam</li>
    <!-- Exam3, Prep, Final -->
    <li class="nav-more">…existing More button…</li>
  </ul>
</nav>
```

`PRIMARY_NAV` stays `Learn, Drill, Exam3, Final`. `MORE_NAV` stays `Map, Lab, Build, Cards, Terms, Videos, Weak, Prep`. Group labels are not slots. Hide `.nav-group-label` under 600px in `css/styles.css` so the one-row phone nav does not grow.

Tools stays the existing “Periodic table” button. Do not add a second one.

## 4. `js/offline/precache.js`

Add these paths, then let Lane G set the final salt:

```
css/home/home.css
css/learn/learn.css
js/home/chapters.js
js/home/css.js
js/home/index.js
js/home/modules.js
js/home/nav-groups.js
js/home/render.js
js/home/ring.js
js/map.js
js/progress.js
```

`js/map.js` and `js/progress.js` were already imported by the app and were missing from the precache list. Add them with the new home files.

## 5. Progress reads

New read-only helpers in `js/progress.js`: `lessonState`, `chapterStats`, `continueLesson`, `weakestLesson`, `nextLesson`, `continueTarget`, `startHere`. They do not write storage.
