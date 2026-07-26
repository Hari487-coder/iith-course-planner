# IITH M.Tech Techno-Entrepreneurship — Course Planner

A single-page planner for Entrepreneurship & Management students at IIT Hyderabad.
Pick your courses, see your week, catch timetable clashes before AIMS does, and get
the exact rows to type into the registration form.

Built for the **July–November 2026** semester.

---

## Putting it online with GitHub Pages

The whole thing is one file with no dependencies — no build step, no npm, no server.
Hosting takes about two minutes.

### 1. Make a repository

On GitHub, click **New repository**. Name it something like `iith-course-planner`.
Set it to **Public** — GitHub Pages needs public on a free account. Create it.

### 2. Push this folder

Push the whole project. The built page lives at `dist/index.html`.

### 3. Turn Pages on

Go to **Settings** → **Pages** in the left sidebar.

Under *Build and deployment*, set **Source** to `Deploy from a branch`, choose branch
`main` and folder **`/docs`**, then press **Save**.

GitHub Pages can only serve from the repo root or a folder named `docs`, so run:

```
cp dist/index.html docs/index.html
```

after each build and commit that too. (If you would rather not, copy
`dist/index.html` to the repo root as `index.html` and select `/ (root)` instead.)

### 4. Wait a minute, then share

Your link will be:

```
https://YOUR-USERNAME.github.io/iith-course-planner/
```

The first deploy takes 30 to 60 seconds. Refresh the Pages settings screen and it will
show the live URL with a green tick. That link is what you send to people.

---

## Updating it later

Edit the files in `src/`, run `python3 build.py`, copy `dist/index.html` to
`docs/index.html`, and commit. Pages redeploys within a minute. Anyone with the link
sees the update — nothing to resend.

If your browser still shows the old version, hard-refresh: `Ctrl+Shift+R` on
Windows, `Cmd+Shift+R` on a Mac.

---

## About the share links

When a student picks courses, their choices are written into the page URL after a `#`.
So a link like:

```
https://YOUR-USERNAME.github.io/iith-course-planner/#s=1&c=EM5090,EM5110&e=ME5480
```

reopens with exactly that plan. Students can bookmark their own plan or send it to a
friend or to the department office. This works on GitHub Pages with no setup — the
part after `#` never leaves the browser.

Nothing is stored anywhere. There is no database, no account, no analytics, and no
cookies. Whatever a student picks lives in their own URL and nowhere else.

---

## A note for whoever maintains this

Source lives in `src/`. `build.py` assembles it into `dist/index.html` — that one file
is the whole product, with no dependencies. See `CLAUDE.md` for the full working
notes, including the traps.

Data lives in `src/data.js`:

| Variable  | What it holds |
|---|---|
| `SLOTS`   | The A–G and P–S timetable grid |
| `CUR`     | The curriculum: which courses are core, elective and mandatory, per semester |
| `ENG`     | Every timetabled course, with slot, credits and whether it can be an engineering elective |
| `DESC`    | Published syllabus text, with the source URL for each |
| `GLOSS`   | The plain-language glossary |
| `MISTAKES`| The eight failure modes |

Everything else is presentation. To roll this forward to a new semester you mainly
need to update `ENG` from the new departmental timetables, and the dates in `CUR`,
`TERM` and the deadlines table. `CLAUDE.md` has the step-by-step.

```
project/
  build.py          the entire toolchain
  CLAUDE.md         working notes, data model, and the traps
  README.md         this file
  src/shell.html    markup + planner CSS
  src/theme.css     design system
  src/data.js       all data
  src/app.js        all behaviour
  dist/index.html   built output — generated, do not edit
  docs/index.html   copy of the build, what GitHub Pages serves
  docs/DATA-SOURCES.md
```

---

## Where the data came from

Slots were read from the 25 departmental timetables published at
`iith.ac.in/academics/calendars-timetables` for Jul–Nov 2026, then cross-checked
against live AIMS records — every overlapping entry agreed.

Curriculum structure is from the department's own orientation deck and
`em.iith.ac.in/mtech_program.html`. Rules on credits, grading, add/drop and type
conversion come from the Academic Handbook 2022 (50th Senate) and the 2026–27
academic calendar. Course descriptions are quoted from department pages and institute
catalogues, each linked from inside the tool.

Three departmental timetables (MSME, Computational Engineering, Heritage Science)
require an IITH login and could not be read, so courses from those departments may be
missing.

**This is an unofficial student tool.** Always confirm in AIMS before you register,
and talk to your Faculty Advisor before choosing an engineering elective.
