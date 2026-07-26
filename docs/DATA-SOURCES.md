# Where every piece of data came from

Nothing in this tool is invented. This file records the source for each kind of fact,
so a future maintainer can re-verify or refresh it.

## Timetable slots

The 25 departmental timetables published for Jul–Nov 2026, indexed at
<https://iith.ac.in/academics/calendars-timetables> (the `#timetables` table).
They are a mix of Google Sheets, Google Docs and PDFs; formats vary by department.

Every slot was cross-checked against live AIMS course records. All overlapping
entries agreed — no contradictions.

**Not readable.** Three departmental timetables require an IITH login and return HTTP
401 to anyone outside the institute: **MSME** (including Semiconductor Materials &
Devices), **Computational Engineering**, and **Heritage Science & Technology**.
Courses from those departments are absent from the catalogue.

**Two timetables publish no slot column** — Mathematics & Computing, and EV
Technology (which maps EV codes onto older ME/EE/ET codes instead).

## The slot grid itself

<https://iith.ac.in/academics/assets/files/timetables/Timetable-Template.pdf>,
confirmed independently by the department's own orientation deck. Seven one-hour slots
A–G, four ninety-minute slots P–S, evening slots W–Z, lab slots FN1–FN5 and AN1–AN5
with no AN3. Wednesday afternoon is reserved institute-wide for Challenge Lectures,
which is why slot F is irregular — two mornings plus a Wednesday afternoon.

## Curriculum

The department's own orientation deck (photographed slides) is authoritative and is
what the tool follows: Semester 1 and Semester 2 are **14 credits each**, Semesters 3
and 4 are 12 each, totalling 52.

<https://em.iith.ac.in/mtech_program.html> gives a different split (15 and 13) and
places Communication Skills in Semester 1. The orientation deck places it in Semester
2, and the deck is more recent. Where they disagree, the deck wins.

## Academic rules

- **Academic Handbook 2022 (50th Senate)** —
  <https://www.gymkhana.iith.ac.in/documents/Academic%20Handbook%202022%20(50th%20senate).pdf>
  Credits, segments, the fractal model, grading scale, add/drop, withdrawal.
- **Academic calendar 2026–27 (Jul–Nov 2026)** —
  <https://iith.ac.in/academics/assets/files/calendars/academic_calendar_2026_27_jul_nov_2026.pdf>
  Segment dates and the add/drop deadline table. Supersedes the handbook's older
  drop-window wording for this term.
- **Type conversion (PG form, 2026)** —
  <https://www.iith.ac.in/academics/forms/> — capped at 3 credits.

**Grades:** A+ and A both carry 10 points, then A- 9, B 8, B- 7, C 6, C- 5, D 4,
F 0. The Senate mandates no minimum attendance; an instructor may weight it up to 10%.

## Course descriptions

Each entry in `DESC` carries its own source URL, shown to the student in the course
drawer. The main sources are the EE department's per-course pages
(`ee.iith.ac.in/Courses/`), the MAE Courses Syllabus Manual
(`mae.iith.ac.in/files/mae_pg.pdf`), the institute Courses of Study PDFs, the CSE
elective sheet, and the Biotechnology and Greenko School curriculum documents.

25 of 298 courses have a published syllabus. The rest genuinely have none published
anywhere public, and the tool says so rather than guessing.

## Difficulty and workload — deliberately absent

Researched and confirmed absent, not skipped:

- **No grade distributions.** Not on the RTI page, not in the RTI manuals, not in the
  Annual Report 2023–24, not on any department site. Grades sit behind the AIMS login.
- **Grading is relative and instructor-set.** The welcome booklet states it is "based
  on the Instructor's perception of what an average performance is", so a distribution
  would not transfer between years or teachers even if published.
- **Course feedback is collected but never published.** Submitting it is compulsory
  before a student can see their grades; results are held internally and anonymously.
- **Workload guidance is contact hours only** — roughly 14–15 hours of class per
  credit, usually over five weeks. Nothing about expected study hours outside class.
- **Prerequisites are patchy.** MAE, EE and AI publish them; CSE does not. There is no
  central catalogue.

Any "easy / hard / good scope" rating would therefore be fabricated. The tool says
this plainly and points students at the syllabus, the credit weight, the code's nature
digit, and their seniors instead.

## Known conflicts, left visible

`TITLECONFLICT` in `src/data.js` lists codes whose published title differs between
sources, because IITH reuses course codes across years:

- **AI5110** — the 2026 AI timetable says "Linear Algebra and Applications"; the
  institute catalogue says "Big Data – Tools and Techniques", 2 credits.
- **BT5013** — the 2026 Biotechnology timetable uses this code; the department's own
  course document lists Biochemistry as BT5010.
- **ME5880** — the MAE syllabus manual says "Combustion and Flow Diagnostics"; the
  current MAE stream page says "Probability and Optimization". No title is shown.
- **SE5723** — published in the Greenko curriculum as SE50723.
- **ET5020** — the course exists in the Energy Science M.Tech, but no IITH page
  publishes this code for it.

## Engineering-elective credits, verified per course

The engineering elective must be a single **3-credit** course, so a course's credit
count decides whether a student may pick it. 37 catalogue courses were shown with
"cr ?" (credits unpublished in the timetable). Each was re-verified against its own
department's official course listing and the credit and eligibility set accordingly.
Only courses whose **code and title both matched** the official source were changed;
where a title differed between the 2026 timetable and the department catalogue (code
reused across years), the course was left as "confirm in AIMS" rather than risk a
wrong credit.

Confirmed **3 credits → eligible**: EE5110, EE5183, EE5193, EE5200, EE5210, EE5230,
EE5240, EE5350, EE5540, EE5552, EE5610, EE5670, EE5750, EE5817, EE5900, EE6190,
EE6307, EE6380 (per-course pages at `ee.iith.ac.in/Courses/`); CH5010, CH5050, CH5060
(`che.iith.ac.in` M.Tech curriculum PDF); CS5060, CS5600, CS5610, CS6160, CS6843 (the
CSE 5-/6-level elective sheets linked from `cse.iith.ac.in/academics/courses.html`);
BT6390 (Biotechnology M.Tech curriculum).

Confirmed **not 3 credits → cannot be the engineering elective**: EE5033 (2), EE5604
(1), EE5848 (2); CH5460 (1), CH6580 (2), CH6620 (1), CH6870 (1); BT5060 (2), BT6040
(1), BT6060 (2), BT6113 (2), BT6143 (2), BT6303 (2). These now show their real credit
weight and are flagged "not a 3-credit course".

Left as "cr ? — confirm in AIMS" (title conflict or not found in the official listing):
EE5170, EE5480, EE5490 (2026 timetable title differs from the EE catalogue); CH6080
(catalogue title differs); AI5040, CS5013, CS5103, CS5363, CS5903, CS6113, SE5500,
SE5723, and the remaining CH5xxx codes absent from the published ChE lists.

## Corrections applied after publication

- **EM5270 Entrepreneurial Marketing** and **LA1260 Fundamentals of Organizational
  Structure** were originally flagged from a live AIMS session as missing from the
  course picker and not running respectively. Both were subsequently confirmed
  available in AIMS and are now marked registerable. LA1260 still has no published
  slot in any departmental timetable, so it shows as "slot tba".
- **Mechanical & Aerospace courses** were absent from an early build because the MAE
  timetable is a PDF while most departments publish spreadsheets, and it dropped out
  of the aggregation step. 17 courses were restored, including ME5480 and ME5770.
- **Ten MAE course titles** could not be read back from the PDF, whose titles wrap
  across lines and interleave with faculty names. They display as "Title not
  confirmed" with verified slots and credits.
