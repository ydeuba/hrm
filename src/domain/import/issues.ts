/** Validation finding produced while interpreting or diffing an import. */
export type IssueCode =
  | 'OUT_OF_RANGE'
  | 'NON_NUMERIC'
  | 'DUPLICATE_NAME'
  | 'AMBIGUOUS_NAME'
  | 'AVG_MISMATCH'
  | 'TOTAL_MISMATCH'
  | 'NEAR_DUPLICATE'
  | 'PRECISION_ROUNDED'
  | 'LOCKED_FIELD_DIFFERS';

export interface ImportIssueDraft {
  readonly severity: 'error' | 'warning';
  readonly code: IssueCode;
  readonly row: number | null;
  readonly column: string | null;
  readonly employeeName: string | null;
  readonly message: string;
  readonly sheetValue?: number;
  readonly computedValue?: number;
}

export const hasErrors = (issues: readonly ImportIssueDraft[]): boolean => issues.some((i) => i.severity === 'error');
