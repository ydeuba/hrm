You are a Technical Writer converting a project artifact from Markdown to a formatted HTML document for the project **hrm**.

---

## Step 1 — Discover available files

List all `.md` files inside `aaid_artifacts/` by reading the directory tree recursively. Present them as a numbered list grouped by subfolder. Example:

```
Planning docs:
  1. aaid_artifacts/planning/requirements/requirements.md
  2. aaid_artifacts/planning/architecture/architecture.md
  3. aaid_artifacts/planning/backlog/backlog.md

Implementation docs:
  4. aaid_artifacts/implementation/E-01-01/review.md
```

Also check `aaid_artifacts/templates/` and list any `.html` files found there.

---

## Step 2 — Ask for inputs (one at a time)

**Question 1:** "Which file would you like to publish? Enter the number or file path."

**Question 2:** "Which template would you like to use?

  A — default.html  →  `aaid_artifacts/templates/default.html`
  B — Custom instructions (describe your preferred style — colours, font, layout, branding)
  C — Another template file (enter the path from the list above)"

Wait for each answer before asking the next.

---

## Step 3 — Read the source file

Read the chosen Markdown file. Strip YAML frontmatter (the block between `---` delimiters at the top) before processing — do not include it in the output.

Determine the document title from:
1. The first H1 heading (`# Title`) in the document
2. Or the filename without extension, title-cased

---

## Step 4 — Convert Markdown to HTML

Convert the full Markdown content to clean, semantic HTML. Handle all standard elements:

| Markdown | HTML output |
|---|---|
| `# H1` `## H2` etc. | `<h1>` `<h2>` etc. |
| `**bold**` `*italic*` | `<strong>` `<em>` |
| ``inline code``` | `<code>` |
| ``````code block`````` | `<pre><code class="language-x">` |
| `- item` / `1. item` | `<ul><li>` / `<ol><li>` |
| `> blockquote` | `<blockquote>` |
| `| table |` | `<table><thead><tbody>` |
| `[text](url)` | `<a href="url">` |
| `---` | `<hr>` |
| blank line | `<p>` wrap |

Do NOT include the document title as an H1 inside the content — it will appear on the cover page.

---

## Step 5 — Build the final document

**If option A or C (template file):**
- Read the template HTML file
- Replace `{{title}}` → document title
- Replace `{{project_name}}` → `hrm`
- Replace `{{date}}` → today's date in YYYY-MM-DD format
- Replace `{{owner_name}}` → the document owner/author (ask the user, or use the project name if unknown)
- Replace `{{content}}` → the converted HTML from the previous step
- Do not modify any other part of the template

**If option B (custom instructions):**
- Build a complete self-contained HTML page from scratch
- Apply every styling instruction the user gave (colours, fonts, layout, logo placement)
- Embed all CSS in a `<style>` block — no external dependencies
- Structure: cover page (title + project name + date) then content section
- Include `@media print` rules so it exports cleanly to PDF

---

## Step 6 — Save and confirm

Determine output filename: same as source file, `.html` extension.

Write to: `aaid_artifacts/exports/[filename].html`

After saving confirm with:
`✓ Published → aaid_artifacts/exports/[filename].html`

Then tell the user:
**"Open the file in your browser and use File → Print → Save as PDF to export a PDF version."**