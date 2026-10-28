# ADR-018: Alias-based identity for employees, teams and designations; HR-locked fields

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Review findings #3 and #13. Team names drift between sheets (`Run Team` / `RUN`, `Team Bimal` / `Bimal`). HR will rename labels and correct employees' teams, but a naïve import would recreate old teams and overwrite those corrections. Employee name uniqueness was split across two tables.
- **Decision**:
  - `EmployeeAlias`, `TeamAlias` and `DesignationAlias` are the **only** unique name namespaces. Each canonical name is itself an alias row with `source = CANONICAL`. Renaming adds the new canonical alias and keeps the old one as `source = RENAME`, and imports resolve every name through the alias tables.
  - When HR edits an employee's team or designation, `Employee.teamLocked` or `designationLocked` is set to true. Imports never overwrite a locked field; the preview raises a `LOCKED_FIELD_DIFFERS` warning showing the file's value, and HR can unlock the field from the employee editor.
  - When one normalised name in a file maps to more than one employee, the import fails with `AMBIGUOUS_NAME` until the sheet carries an `Employee Code` column. Header detection recognises an optional `Code` / `Employee Code` column, and when it is present, matching uses the code first (OQ-01).
- **Consequences**: Renames survive re-imports, and HR corrections are never silently lost. There is one more table per label type, and the preview gets slightly richer.
