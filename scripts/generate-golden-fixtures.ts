/**
 * Regenerates the golden expectation files from the source artefacts.
 * Usage: npm run fixtures:generate   (review the diff before committing)
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildReferenceExpectations, buildWorkbookExpectations } from '../tests/fixtures/golden-generator';

const dir = path.resolve(__dirname, '../tests/fixtures');
const write = (file: string, data: unknown) => {
  writeFileSync(path.join(dir, file), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`wrote tests/fixtures/${file}`);
};

write('expected-workbook.json', buildWorkbookExpectations(path.join(dir, 'kpi-master-sheet.xlsx')));
write('reference-s122-s135.json', buildReferenceExpectations(path.join(dir, 'reference-dashboard-s122-s135.html')));
