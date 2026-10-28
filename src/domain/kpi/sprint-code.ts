/** Sprint identifiers such as "S138". Ordered numerically, never lexically. */
export type SprintCode = `S${number}`;

const SPRINT_CODE = /^S(\d{1,6})$/;

export function parseSprintCode(raw: string): SprintCode | null {
  const trimmed = raw.trim().toUpperCase();
  return SPRINT_CODE.test(trimmed) ? (trimmed as SprintCode) : null;
}

export function sprintNumber(code: SprintCode): number {
  return Number(code.slice(1));
}

export function compareSprintCodes(a: SprintCode, b: SprintCode): number {
  return sprintNumber(a) - sprintNumber(b);
}

export function sortSprintCodes(codes: readonly SprintCode[]): SprintCode[] {
  return [...new Set(codes)].sort(compareSprintCodes);
}
