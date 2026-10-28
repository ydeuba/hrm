You are generating a project report for **hrm** (typescript).

**Requested report (if provided):** $ARGUMENTS

Every report below is a mechanical projection of `.aaid/state.json` and `git log`.
None of them call a model, so they need no API key and are safe in CI. Your job is to
run the right one, then explain what the numbers mean.

---

## Step 0 — Pick the report

If `$ARGUMENTS` already names one (e.g. `ai-usage`, `gates`, `ai-usage --since 30d`),
skip straight to it.

Otherwise ask **one** question, listing what is available with the direct command for
each so they can run it themselves next time:

> Which report?
>
> 1. **Status summary** — one page for a steering meeting: scope, sprint, quality, AI, risks
>    `aaid report exec`
> 2. **AI usage** — assistance levels, volume, and gate-pass correlation
>    `aaid report ai-usage --since 90d`
> 3. **Gate health** — latest result per gate, plus the bypass audit trail
>    `aaid report gates`
> 4. **Sprint** — active sprint: goal, stories by status, points burned, blockers
>    `aaid report sprint`
> 5. **Backlog** — stories by epic, with unestimated work called out
>    `aaid report backlog`
> 6. **Velocity** — delivered points per completed sprint, and the trend
>    `aaid report velocity`
> 7. **Flow** — story cycle time: median, 85th percentile, what is in flight
>    `aaid report flow`
> 8. **Contributors** — commit activity joined to AI attribution
>    `aaid report contributors`
>
> Any report can be time-scoped: `--since 30d`, `--since 2026-01-01`, `--until`.

Wait for their choice.

## Step 1 — Run it

```bash
aaid report <name> [--since <window>] [--until <window>]
```

Output is written to `aaid_artifacts/reports/<name>-<date>.md`. Read that file and
present the table inline — do not just tell them a file was written.

## Step 2 — Interpret, do not just repeat

The table is already in the file. Add the reading they cannot get from it:

**For AI usage:**
- Compare **gate-pass rate across levels**. This is the point of the report. If
  `agent-authored` passes gates as often as `human`, AI assistance is not costing
  quality. If it is materially lower, say so plainly.
- Call out the **unattributed** count. Those commits predate attribution or were made
  with the hook bypassed. They are excluded from the percentage rather than counted as
  human — so a large unattributed share means the headline number is provisional.
- Do **not** present a per-person breakdown unless they explicitly ask AND
  `reports.contributor_identity` is set to something other than `aggregate`. If they
  ask and it is not set, explain the trade-off (per-developer AI metrics tend to get
  gamed, which corrupts the org-level data; naming individuals can carry works-council
  or GDPR duties in EU engagements) and offer `pseudonymous` as the middle option.

**For the status summary (`exec`):**
- It composes the other reports, so never contradict it — if a number looks wrong, run the
  detailed report rather than recomputing it yourself.
- The **risks** section is derived only from recorded data. If it is empty, say "none
  identified from the recorded data" rather than inventing risks to fill the page.

**For sprint / backlog:**
- **Unestimated stories are excluded from every points total.** If the backlog report flags
  them, the sprint's percentage-complete is optimistic — say so.
- A sprint past its end date, or with blocked stories, is the headline. Lead with it.

**For velocity:**
- Below **3 completed sprints there is no trend**, only history. The report says so; do not
  talk around it or extrapolate a forecast from two data points.
- Compare *committed* against *delivered*, not delivered alone — consistently over-committing
  is a planning problem, not a delivery one.

**For flow:**
- Quote the **85th percentile**, not the median, when anyone asks how long something takes.
  The median is what half of stories beat; the 85th is what you can commit to.
- Long-lived in-flight stories are the actionable part. Name the oldest.

**For contributors:**
- Default is aggregate. Do **not** push for per-person data; if they ask, explain the
  trade-off before offering `pseudonymous`.
- Commit counts and lines changed are poor proxies for contribution. Say that plainly if
  the numbers are about to be used to compare people.

**For gate health:**
- **Active bypasses are the headline.** A gate with an active bypass is not being
  enforced, whatever its last recorded result says. Name each one, its reason, and when
  it expires.
- A failing gate with no bypass is an open quality issue — say which and suggest the
  `aaid gate run <name>` to re-check.

## Step 3 — Caveat honestly if asked about audit use

Attribution is self-reported by aaid. A developer can bypass the hook with
`git commit --no-verify`. It is sound for engineering metrics and trend lines; it is
**not** audit-grade, and must not be presented to a client as assured. If someone needs
assured numbers, that requires a verified check from the git host, which aaid does not
do yet — do not imply otherwise.

Also worth knowing: if the repository squash-merges using only the PR title, trailers
are discarded at merge and the data will look thinner than reality.

## Step 4 — Next steps

Offer:

- `/aaid-report` — another report
- `aaid report ai-usage --format csv --stdout` — (CLI, in terminal) export for a dashboard
- `/aaid-review` — adversarial review of an artifact, if a gate looked weak
- `aaid gate run <name>` — (CLI, in terminal) re-run a specific gate

Then ask what they want to look at next.
