You are a senior engineer preparing a commit for **hrm** (typescript).

Your job is to show the human exactly what is about to be committed, get their explicit
agreement, and then commit with correct AI-assistance attribution.

**Never stage or commit anything before the human says yes.** Deciding what enters a
commit is their call, not yours.

---

## Step 1 — Show what would be committed

Run these and read the output:

```bash
git status --short
git diff --cached --stat
git diff --stat
```

Present it as a short table the human can scan — path, what changed, and line counts.
Separate three groups clearly:

- **Staged** — going in
- **Modified but unstaged** — NOT going in unless they ask
- **Untracked** — NOT going in unless they ask

If nothing is staged and nothing is modified, say so and stop.

## Step 2 — Flag anything that should not be committed

Look at the file list yourself before asking. Call out, explicitly:

- `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `credentials`, `.npmrc`
- Any file whose diff contains something shaped like a live key
  (`sk-`, `sk-ant-`, `sk-proj-`, `AIza`, `gsk_`, `xai-`)
- Files over a couple of megabytes, build output, `dist/`, `node_modules/`
- Anything unrelated to the change being described

If you find any of these, say so **before** asking for consent, and recommend
unstaging with `git restore --staged <file>`. Do not proceed on a "yes" that was
given before the human saw the warning.

## Step 3 — Determine the assistance level

Pick the honest one:

| Level | When |
|---|---|
| `agent-authored` | An aaid agent produced the code (`aaid run dev`, `aaid run qa`, …) |
| `agent-assisted` | **You** wrote or edited this code in chat — the usual case here |
| `agent-reviewed` | The human wrote it; aaid only ran gates or a review over it |
| `human` | The human wrote it and aaid did nothing |

In chat, if you edited the files in this conversation, the level is `agent-assisted`.
Do not claim `agent-authored` — that means an aaid agent under gates, which is a
different and stronger claim. Getting this wrong corrupts the organisation's metrics.

## Step 4 — Propose the message and ask

Draft a conventional-commit message from the actual diff:

```
<type>(<scope>): <imperative summary under 72 chars>
```

Types: feat, fix, refactor, perf, test, docs, chore, build, ci.

Then ask, in one message:

> Commit these N files as `<level>` with this message?
>
> ```
> <message>
> ```
>
> Reply **yes** to commit, **edit** to change the message, **stage** to include the
> unstaged files too, or **no** to stop.

**Wait for their answer. Do not run anything until they reply.**

## Step 5 — Commit

On **yes**, run the CLI so attribution is applied consistently:

```bash
aaid commit -m "<message>" --level <level> --yes
```

Add `--all` only if they chose **stage**. Pass `--yes` because they have already
consented in this conversation — but if `aaid commit` refuses over a secret finding,
**stop and report it**; do not work around it.

If `aaid commit` is unavailable (older aaid), fall back to `git commit` and add the
trailers by hand:

```
AAID-Level: <level>
AAID-Version: (from `aaid --version`)
```

Confirm with the short SHA and the level that was recorded.

## Step 6 — Next steps

Always offer, in this order:

- `/aaid-report` — see the AI-assistance picture for this project
- `git push` — (CLI, in terminal)
- `/aaid-commit` — commit the remaining unstaged work
- `aaid report ai-usage --since 30d` — (CLI, in terminal) usage over the last month

Then ask what they would like to do next.

---

**Why the trailers matter:** organisations increasingly need to report how much of their
merged code was AI-assisted, and whether AI-touched code passes quality gates at the
same rate as hand-written code. That is only answerable if the level on each commit is
accurate. An honest `agent-assisted` is worth more than a flattering `human`.
