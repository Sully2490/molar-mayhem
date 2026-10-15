# Lane E — videos, Exam 3, practice final

This lane does not edit `index.html`, `js/routes.js`, `js/app.js`, `js/progress.js`, or `css/styles.css`. The pages below are ready to mount. Until that wiring lands, the hash routes fall through to Home.

## Video catalog

`content/videos/catalog.js` exports `videos`. Each item may hold only:

- `youtubeId` — 11-character id
- `start` — seconds
- `chapter` — 1–9
- `lessonId` — a lesson `id` from `content/chNN/`
- `title` and `description` — original short text

No watch URLs, no course-site hosts, and no course-pack wording belong in that file.

The text export of the course pack had no public YouTube watch links and no start times. Notes that pointed at a course-site video were left out. A photo credit that mentions YouTube is not a video. The list is empty on purpose. `publicVideosFromLinks` is the gate for any later addition: it keeps an id only when YouTube oEmbed succeeds and the watch page says `"isUnlisted":false`. Private, removed, unlisted, and unclear pages are dropped.

`#Videos` and `#Videos/5` (chapter filter):

```js
import { mountVideos } from './video/index.js';

// inside the route painter, before the other routes:
if (mountVideos(view, location.hash, { lessons })) return;
```

`mountVideos` injects `css/video/video.css` and returns false for every other hash. The lesson list can be the same array `#Learn` already loaded.

The player renders a thumbnail (`i.ytimg.com`) and a Play button. The button’s accessible name is `Play: ` plus the title. A click replaces that button with an iframe on `https://www.youtube-nocookie.com/embed/ID`. `start` is added only when it is greater than 0. The iframe `title` is the video title. No iframe is in the markup before the click.

## Progress

Exam 3 and Weak spots call `readProgress` from `js/progress.js`. They do not write progress and they do not change that file. Mastery is the lesson map in `localStorage` key `mm-progress`:

- missing — not started
- `practicing` — opened, not mastered
- `mastered`

## Exam 3 — `#Exam3`

A 10-question mix of problems from Chapter 5 and Chapter 7 lessons (`content/ch05/` and `content/ch07/`). Weight per problem follows the lesson:

- practicing: 5
- not started: 2
- mastered: 1

If the draw would skip a chapter that still has problems, one question is swapped in so both chapters appear whenever the set has room. A wrong check shows a hint. The solution shows after the third miss, using `feedbackFor` from `js/learn.js`. Answers are not in the page until then.

## Weak spots — `#Weak`

Lessons that are not mastered, lowest first: not started, then practicing, then chapter order. Each row links to `#Learn/{id}` and to `#Drill`.

## Practice final — `#Final`

Loads `content/final/practice-final.json` through `loadFinalProblems` in `js/prep.js`. The timer checkbox is off by default. Turning it on enables the minutes box (suggestion: 50). Start begins the questions. Nothing is marked, and the answer text is not in the markup, until Submit. At 0:00 a timed run submits the answers currently in the boxes.

The report shows:

- main score, with bonus points on their own line
- points by chapter
- each weak OpenStax section (any miss, including a bonus miss)
- a link to every lesson whose chapter and section number match, plus `#Drill`
- the worked answer for each miss

## Wiring

Add this near the top of the hash painter in `js/app.js`. `lessons` for videos can be loaded the same way `#Learn` loads them. Exam routes load lessons and the practice final themselves.

```js
import { mountLane } from './exam/index.js';
import { mountVideos } from './video/index.js';

async function paintLane(view) {
  if (mountVideos(view, location.hash)) {
    document.title = 'Videos — Molar Mayhem';
    return true;
  }
  if (await mountLane(view, location.hash)) {
    const route = location.hash.replace(/^#/, '').split(/[/?]/)[0];
    document.title = `${route} — Molar Mayhem`;
    return true;
  }
  return false;
}
```

Call `paintLane(view)` at the start of the existing painter and return when it is true. Optional nav links, still outside this lane:

- `#Videos` — Videos
- `#Exam3` — Exam 3
- `#Weak` — Weak spots
- `#Final` — Practice final

`js/routes.js` can keep treating unknown hashes as Home until those ids are added to `ROUTE_IDS`. The mount helpers do not need to be inside `renderRoute`.

Styles live in `css/video/video.css` and `css/exam/exam.css`. Both are attached at mount time, the same way the lab attaches `css/lab/lab.css`.
