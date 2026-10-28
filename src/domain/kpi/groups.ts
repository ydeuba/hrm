import type { EngineerSeries, KpiDataset } from './dataset';
import { rankAll } from './ranking';
import { isScored, scoredCenti } from './score-cell';
import type { SprintCode } from './sprint-code';

/** Weighted group summary (US-04-03): Σ scores ÷ number of scores. */
export interface GroupSummary {
  readonly key: string;
  readonly people: number;
  readonly scoreObs: number;
  readonly totalCenti: number;
  readonly weightedAverage: number | null;
  readonly rank: number | null;
}

export function aggregateBy(engineers: readonly EngineerSeries[], keyOf: (e: EngineerSeries) => string): GroupSummary[] {
  const acc = new Map<string, { people: number; obs: number; total: number }>();
  for (const e of engineers) {
    const centi = scoredCenti(e.cells);
    const cur = acc.get(keyOf(e)) ?? { people: 0, obs: 0, total: 0 };
    acc.set(keyOf(e), { people: cur.people + 1, obs: cur.obs + centi.length, total: cur.total + centi.reduce((a, b) => a + b, 0) });
  }
  const rows = [...acc].map(([key, v]) => ({ id: key, name: key, totalCenti: v.total, count: v.obs, people: v.people }));
  const ranks = new Map(rankAll(rows, 1).map((r) => [r.id, r.rank]));
  return rows.map((r) => ({
    key: r.id,
    people: r.people,
    scoreObs: r.count,
    totalCenti: r.totalCenti,
    weightedAverage: r.count ? r.totalCenti / r.count / 100 : null,
    rank: ranks.get(r.id) ?? null,
  }));
}

export interface SprintPoint {
  readonly sprint: SprintCode;
  readonly average: number | null;
  readonly participants: number;
  readonly coverage: number;
}

/** Org average per sprint; sprints with no scores are gaps (null), never 0 (US-05-03 AC-2). */
export function sprintTrend(ds: KpiDataset, population: number): SprintPoint[] {
  return ds.sprints.map((sprint, i) => {
    const centi = ds.engineers.flatMap((e) => {
      const c = e.cells[i];
      return c && isScored(c) ? [c.centi] : [];
    });
    const total = centi.reduce((a, b) => a + b, 0);
    return {
      sprint,
      average: centi.length ? total / centi.length / 100 : null,
      participants: centi.length,
      coverage: population > 0 ? centi.length / population : 0,
    };
  });
}

/** Overall weighted average across every scored cell. */
export function overallWeightedAverage(engineers: readonly EngineerSeries[]): number | null {
  const centi = engineers.flatMap((e) => scoredCenti(e.cells));
  return centi.length ? centi.reduce((a, b) => a + b, 0) / centi.length / 100 : null;
}
