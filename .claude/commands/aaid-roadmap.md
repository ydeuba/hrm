You are a Senior Program Manager building a **visual roadmap** for **hrm** (typescript).

The roadmap is a **derived** artifact. The project plan is authoritative: every date, phase, milestone, owner and dependency you output must trace back to it. You may reorganise, aggregate, and convert relative durations into calendar dates. You may **not** invent scope, milestones, or owners the plan does not support.

---

## Step 1 — Read the source plan

Read `aaid_artifacts/planning/project-plan/project-plan.md`.

**If it exists:** extract the Milestones and Timeline table, the Phase Breakdown, the Dependency Map, the Risk Register, and the critical-path narrative. That is your raw material.

**If it does not exist**, say so and offer three options — do not silently invent a plan:

  A — Generate the project plan first (run `aaid run pm --task project-plan` in your terminal), then come back
  B — Derive a provisional roadmap from whatever exists: `aaid_artifacts/planning/prd/prd.md`, `brd/brd.md`, `requirements/requirements.md`, `backlog/backlog.md` — every date marked `low` confidence
  C — Cancel

Also read `aaid_artifacts/planning/backlog/backlog.md` and `aaid_artifacts/sprint-status.yaml` if present — real sprint state lets you mark items `in-progress` or `done` instead of guessing.

---

## Step 2 — Ask the optional questions (all skippable)

Ask these **as one batch**, not one at a time — they are refinements, not requirements. Tell the user plainly:

> "All optional — reply with just the numbers you care about, or say **skip** and I'll use the defaults from the plan."

1. **Start date** — what date does the timeline anchor to? *(default: today, or the plan's kick-off date if it names one)*
2. **Horizon** — how far should the roadmap look ahead: 1 quarter / 2 quarters / 12 months / everything in the plan? *(default: everything in the plan)*
3. **Axis granularity** — weeks, months, or quarters? *(default: weeks if the window is under 4 months, quarters if over 18, otherwise months)*
4. **Swimlanes** — which workstreams do you want as lanes? *(default: inferred from each phase's deliverables and team focus — typically Product, Engineering, QA, Platform, GTM)*
5. **Audience** — exec summary or delivery detail? *(default: both — the HTML leads with the horizon view, the tables carry the detail)*
6. **Fixed external dates** — any immovable commitments the plan does not mention (audit, contract, conference, board review)? *(default: none)*
7. **Brand colours** — hex values for the HTML? *(default: the AAID palette — teal `#0E7C86` on near-black `#0B1220`)*

Take whatever answers come back, apply the defaults for the rest, and say: "Got it — deriving the roadmap from the project plan now."

---

## Step 3 — Derive the roadmap

Apply these rules exactly. They are what keeps the roadmap honest.

- **Every phase becomes an item.** Split one into two only when it spans two clearly distinct workstreams. Never drop a phase.
- **Every milestone becomes a milestone**, keeping the plan's ID (`M-01`, `M-02`…) so the documents stay traceable. Reuse phase IDs (`P-01`) for items where the plan has them.
- **Dates:** use the plan's target dates when stated. Convert relative durations ("Weeks 1–4", "Sprint 1–3") to real dates from the anchor date. Sprints are 2 weeks unless the plan says otherwise.
- **Horizons** from the anchor date: within 90 days → `now`; 90–180 days → `next`; beyond 180 → `later`.
- **Confidence:** dates the plan states → `high`; dates you computed from durations → `medium`; anything beyond a phase the plan itself hedges → `low`.
- **Status:** `planned` by default; `in-progress`/`done` only when sprint state or the plan says so; `at-risk` when an item is on the critical path **and** exposed to a High-risk dependency.
- **Tracks:** 3–6 lanes, most delivery-critical first. Merge thin lanes rather than adding a seventh.
- Mark anything you inferred with `_(inferred)_` inline. Never state a date more precisely than the plan supports.

---

## Step 4 — Write `aaid_artifacts/planning/roadmap/roadmap.md`

Structure, in this exact order:

1. `# hrm — Roadmap` (H1)
2. The literal line `<!-- roadmap-data -->`, then a ```yaml fenced block — the canonical data both views are built from:

```yaml
project: hrm
subtitle: <one line — what this window delivers>
generated: <YYYY-MM-DD anchor date>
horizonUnit: week | month | quarter
start: <YYYY-MM-DD>          # first day of the earliest item
end: <YYYY-MM-DD>            # last day of the latest item or milestone
tracks: [<lane>, <lane>]     # 3–6, ordered
items:
  - id: P-01
    name: <short label, under 40 chars, no colons>
    track: <one of tracks>
    start: <YYYY-MM-DD>
    end: <YYYY-MM-DD>
    horizon: now | next | later
    status: planned | in-progress | done | at-risk
    note: <what "done" means for this item>
    dependsOn: [<ids that must land first>]
milestones:
  - id: M-01
    name: <short label, no colons>
    date: <YYYY-MM-DD>
    track: <lane, or omit>
    owner: <role from the plan, or omit>
    confidence: high | medium | low
    criticalPath: true | false
assumptions: [<assumption that, if violated, moves the dates>]
risks:
  - id: SR-01
    description: <what could slip the schedule>
    impact: high | medium | low
    affects: [<item/milestone ids>]
    mitigation: <proactive action>
```

IDs must be unique across items and milestones. `start`/`end` must bracket every date. This block is machine-read by `aaid roadmap` — keep it valid.

3. `## Timeline` containing a Mermaid gantt built from that data — one `section` per track, in track order:

```mermaid
gantt
    title hrm — Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b %Y
    section Engineering
    Build the ingest service :active, P-02, 2026-08-03, 2026-09-11
    Cutover rehearsal        :crit, P-03, 2026-09-14, 2026-09-25
    section Milestones
    MVP feature complete :milestone, M-03, 2026-09-30, 0d
```

Gantt rules: task names must not contain `:` `,` or `;` — they are field separators and will break the diagram. Status tags map `in-progress`→`active`, `done`→`done`, `at-risk`→`crit`, `planned`→no tag. Milestones use `:milestone, <ID>, <date>, 0d`. Use `axisFormat %d %b` when `horizonUnit` is `week`.

4. Then these `##` sections — tight, scannable, no marketing prose:
   - **Executive summary** — 3–4 sentences: what ships, the hardest constraint, the date that matters most
   - **Now — next 90 days** — per `now` item: what it delivers, who is active, what would stall it
   - **Next** — per `next` item: what must be true when it starts, and which item it inherits from
   - **Later** — one line per item, each with an explicit "directional, not committed" statement
   - **Milestone commitments** — table `| ID | Milestone | Target date | Owner | Confidence | Critical path |`, same IDs and dates as the yaml block
   - **Critical path and sequencing** — the zero-float chain and what slips downstream when each link moves
   - **Assumptions and re-plan triggers** — each assumption paired with the observable signal that means "redraw this"
   - **Provenance** — which artefact each part came from, plus every inference as `- <what> — _(inferred: <basis>)_`

---

## Step 5 — Write `aaid_artifacts/planning/roadmap/roadmap.html`

A **self-contained** page rendering the same data visually. Hard constraints:

- **No external assets** — no CDN scripts (including Mermaid), no web fonts, no remote images. All CSS inline in one `<style>` block. It must render correctly opened straight from disk with no network.
- **No JavaScript required** to see the roadmap. Position bars with CSS percentages computed from the dates: `left = (item.start - start) / (end - start) × 100`, `width = (item.end - item.start) / (end - start) × 100` (floor width at 1.2%).

Page structure, top to bottom:

1. **Header** — project name, subtitle, and a meta row: window (`start → end`), track count, item count, milestone count, generated date.
2. **Now · Next · Later** — three columns of cards. Each card: track badge, item ID, name, date range + duration in days, the `note`, and any `dependsOn` in a warning colour. Left border colour encodes status.
3. **Delivery timeline** — a swimlane gantt:
   - A month/quarter/week axis row whose tick positions match the lanes below (fixed-width lane-label gutter, e.g. 176px, and the same inset on the axis).
   - A **milestone rail** above the lanes: a rotated-square diamond per milestone at its date position, ID beneath it, full name in the `title` attribute. Critical-path diamonds in the risk colour; `low` confidence drawn as a dashed outline.
   - **One lane per track**, in track order. Bars carry the item name; long names clip with `overflow: hidden` and the full detail goes in `title`. **Overlapping items in the same lane must stack onto separate sub-rows** — compute the stacking, never draw two bars on top of each other.
   - Vertical gridlines at each axis tick, and a "today" line if today falls inside the window.
   - A legend for the four statuses plus the milestone diamond.
4. **Milestone commitments** table, critical-path rows highlighted.
5. **Sequencing constraints** — the `dependsOn` edges as readable lines.
6. **Assumptions**, then **Schedule risks** (ID, risk, impact, affects, mitigation).
7. **Footer** — provenance: derived from `project-plan.md`.

Styling: light, print-first, dense but breathable. Palette unless the user gave brand colours — ink `#0B1220`, body `#333B49`, muted `#667085`, rules `#E1E4E9`, surface `#F5F6F8`, accent `#0E7C86`; status colours planned `#7C8AA0`, in-progress `#0E7C86`, done `#3F8F5B`, at-risk `#C2410C`. System font stack. Include `@media print` (`print-color-adjust: exact` on bars and badges, `page-break-inside: avoid` on sections) and a `@media (max-width: 780px)` collapse so the horizon columns stack.

---

## Step 6 — Save and confirm

Write both files, then confirm:

```
✓ Saved → aaid_artifacts/planning/roadmap/roadmap.md   (data block + Mermaid gantt)
✓ Saved → aaid_artifacts/planning/roadmap/roadmap.html (standalone visual timeline)
```

Then tell the user:
**"Open roadmap.html in your browser — File → Print → Save as PDF to share it. Dates live in the `roadmap-data` yaml block inside roadmap.md: edit them there and run `aaid roadmap` in your terminal to redraw both views without another generation."**

---

## What's next?

The roadmap is a projection of the plan — check it, then work from it.

1. **Adversarial review** → use `/aaid-review roadmap` here in chat (or `aaid review roadmap` in the terminal) — catches dates the plan does not support and milestones with no owner
2. **Re-render after edits** → run `aaid roadmap` in your terminal (CLI) whenever dates change — no AI call, no API key
3. **Plan the first sprint** → use `/aaid-sprint-plan` here in chat (or `aaid sprint plan` in the terminal) to turn the `now` horizon into committed stories
4. **Share it** → use `/aaid-publish` here in chat if you want the Markdown in the standard document template as well

**Recommended:** Run `/aaid-review roadmap` first — a roadmap with unsupported dates is worse than none. Would you like me to run the review now?
