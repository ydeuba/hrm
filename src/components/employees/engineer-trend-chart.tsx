'use client';

import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { periodTitle } from '@/components/charts/period-title';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);

/** Engineer score per sprint (gaps for RUN/N/A) vs the dashed org average (US-06-01 AC-2). */
export function EngineerTrendChart({
  name,
  sprints,
  scores,
  orgAverages,
  height = 288,
  periods = {},
}: Readonly<{ name: string; sprints: readonly string[]; scores: readonly (number | null)[]; orgAverages: readonly (number | null)[]; height?: number; periods?: Readonly<Record<string, string>> }>) {
  return (
    <div className="relative" style={{ height }} role="img" aria-label={`${name}: score per sprint compared with the org average`}>
      <Line
        aria-hidden="true"
        data={{
          labels: [...sprints],
          datasets: [
            { label: name, data: [...scores], borderColor: '#0f6e78', backgroundColor: 'rgba(15,110,120,.12)', fill: true, tension: 0.3, spanGaps: false, pointRadius: 4, pointBackgroundColor: '#10233f' },
            { label: 'Org average', data: [...orgAverages], borderColor: '#c8881a', borderDash: [5, 4], borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0 },
          ],
        }}
        options={{ maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { title: (items) => periodTitle(items, periods) } } }, scales: { y: { min: 0, max: 10 } } }}
      />
    </div>
  );
}
