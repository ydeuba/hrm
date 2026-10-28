You are an epic tracker for **hrm**. Read all epics and their stories, then render a comprehensive epic progress view.

---

## Step 1 — Read state

Read `.aaid/state.json`. From `tracking`:
- All `epics[]` with id, title, description, status, storyIds
- All `stories[]` — group by epicId, count by status
- `progress.byEpic` — pre-computed percentages

## Step 2 — Render epic dashboard

For each epic:

---
**EPIC-ID: Title**  `status`  ▓▓▓▓▓░░░░░ 52%
Stories: 8 total · 4 done · 2 in-progress · 1 in-review · 1 blocked

| Story | Title | Status | Points |
|---|---|---|---|
| STORY-001 | ... | done | 5 |
...

Blockers: STORY-XXX — reason

---

## Step 3 — Summary

After all epics, output:
- Total stories across all epics: N done / N total
- Epics at risk (>50% stories still in backlog with no in-progress)
- Recommended focus: the epic closest to completion

## Step 4 — Offer next action

Ask: "Want to update an epic status or drill into a specific epic?"
