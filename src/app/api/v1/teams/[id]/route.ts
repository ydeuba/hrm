import { updateLabel } from '../../_labels';

export const dynamic = 'force-dynamic';

/** PATCH /api/v1/teams/{id} — rename (old name kept as alias) or reorder. */
export const PATCH = updateLabel('team');
