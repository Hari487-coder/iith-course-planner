# Context for Claude Code

Read this before changing anything.

## What this is

A single-page course planner for M.Tech Techno-Entrepreneurship students at
IIT Hyderabad, for the July–November 2026 semester. It exists because AIMS — the
institute's registration portal — lets students make mistakes it never warns them
about: timetable clashes, wrong elective categories, courses that silently do not
appear in the picker.

The product is **one HTML file**. No framework, no npm, no bundler, no network
requests at runtime. `build.py` concatenates four source files into `dist/index.html`.

## Build

```
python3 build.py
```

That is the entire toolchain. It substitutes three markers in `src/shell.html` and
runs sanity checks. If a check fails it exits non-zero and says why.

## Layout

```
src/shell.html   markup + planner-specific CSS, with the three build markers
src/theme.css    the design system (tokens, cards, buttons, rows, badges)
src/data.js      all data: slots, curriculum, catalogue, glossary, descriptions
src/app.js       all behaviour, wrapped in one IIFE
dist/index.html  the built artifact — this is what gets deployed
```

`dist/index.html` is generated. Never edit it directly; your change will be
overwritten on the next build.

## Things that will bite you

**`src/app.js` is one IIFE and order matters.** The boot block at the very bottom
(`readHash(); … sync();`) must stay last. Every module above it defines functions and
state that `sync()` calls. Moving it earlier throws `Cannot read properties of
undefined` — this has already happened once.

**`$` takes a bare id, not a selector.** It is `document.getElementById`, so it is
`$("elist")`, never `$("#elist")`.

**No browser storage.** No `localStorage`, no `sessionStorage`, no cookies. Student
selections live in `location.hash` and nowhere else. The build script fails if storage
appears. This is deliberate: it keeps the tool hostable as a static file with no
privacy surface at all.

**Every rendered string goes through `textContent`.** Course titles come from
scraped PDFs and spreadsheets. Never build DOM with `innerHTML` from that data.

**Data edits are surgical.** `src/data.js` is one long file of literals. When editing
it programmatically, splice narrowly — a wide slice once deleted `GLOSS`, `CODEPARTS`,
`MISTAKES` and `DESC` in a single line and the page died with
`MISTAKES is not defined`. Prefer targeted string replacement, and re-run the build,
which checks each block is still present.

## The data model

| Variable | Holds |
|---|---|
| `SLOTS` | The A–G and P–S timetable grid. Slot letter → list of `[dayIndex, "HH:MM"]`. |
| `CUR` | Curriculum by semester: groups of courses with a required credit count each. |
| `ENG` | Every timetabled course: `[code, slot, credits, title, dept, aimsVerified, whyIneligible]`. |
| `WHYTXT` | Text for `ENG[6]`: 0 eligible, 1 wrong level, 2 excluded dept, 3 not 3 credits, 4 credits unknown. |
| `DESC` | Published syllabus: `[summary, sourceLabel, sourceURL, prerequisite]`. |
| `GLOSS` | Glossary term → `[title, plain-language definition]`. |
| `MISTAKES` | The eight failure modes: `[name, what AIMS does, the guard here]`. |
| `TITLECONFLICT` | Codes whose published title differs between sources. |
| `SENIORS` | Electives previous batches took, from the orientation deck. |

A course in `CUR` carries a status as its last field:
`ok` registerable · `noslot` registerable but no published timings ·
`blocked` running but absent from the AIMS picker · `off` not running ·
`next` a Semester 2 course whose slot is not published yet.

## The rule this project is built on

**Never invent data a student would act on.**

There is no difficulty rating in this tool because IITH publishes no grade
distributions, no course feedback and no workload data — that was researched, not
assumed, and there is a section in the tool explaining it. Ten Mechanical courses show
*"Title not confirmed"* rather than a plausible guess, because their source PDF wraps
titles across lines and could not be read back reliably. `ME5880` shows no title at all
because the department publishes two conflicting ones.

If you find yourself filling a gap with something that sounds right, stop and mark the
gap instead. A wrong course title or a fabricated difficulty score is worse than a
visible blank, because a student registers on it.

## Provenance

Slots came from the 25 departmental timetables at
`iith.ac.in/academics/calendars-timetables` for Jul–Nov 2026, cross-checked against
live AIMS records — every overlapping entry agreed. Curriculum structure is from the
department orientation deck and `em.iith.ac.in/mtech_program.html`. Rules on credits,
grading and add/drop are from the Academic Handbook 2022 (50th Senate) and the 2026–27
calendar. Course descriptions are quoted from department pages, each with its source
URL in `DESC`.

Three departmental timetables (MSME, Computational Engineering, Heritage Science)
need an IITH login and could not be read. Courses from those departments are missing.

See `docs/DATA-SOURCES.md` for the full list.

## Rolling to a new semester

1. Pull the new departmental timetables and rebuild `ENG` (code, slot, credits, title).
2. Update `CUR` if the curriculum changed — check the orientation deck, not the
   website, which has been out of date before.
3. Update the term dates in `src/app.js`: `TERM` (calendar export) and the
   `DEADLINES` array, plus the deadline table in `src/shell.html`.
4. Re-verify a handful of slots against live AIMS before publishing.
5. `python3 build.py`, then deploy `dist/index.html`.

## Testing

There is no test framework. What has actually caught bugs is loading
`dist/index.html` in a headless browser and driving it:

```js
// npm i playwright
const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror', e => console.log('ERROR', e.message));
await p.goto('file://' + __dirname + '/dist/index.html');
// tick courses, check credit totals, force a clash, export the .ics, resize to 390px
```

Worth checking after any change: no page errors, credit totals per group, clash
detection, the AIMS script rows, the `.ics` download parses, the `#` share link
round-trips, and no horizontal overflow at 390px wide.
