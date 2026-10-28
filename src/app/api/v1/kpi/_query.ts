import { z } from 'zod';
import type { SprintCode } from '@/domain/kpi/sprint-code';

/** Shared sprint-range query for KPI endpoints. */
export const sprintParam = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^S\d{1,6}$/, 'Sprint codes look like S138')
  .transform((s) => s as SprintCode);

export const RangeQuery = z.object({ from: sprintParam.optional(), to: sprintParam.optional() });
