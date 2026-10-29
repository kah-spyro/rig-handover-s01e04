import type { Night, RunStatus } from './types.js';

export type StatusCounts = Record<RunStatus, number>;

// Jobs in a night by their LAST status (DigestRow.lastStatus). Zero counts stay 0.
export function countByLastStatus(night: Night): StatusCounts {
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of night.rows) counts[row.lastStatus]++;
  return counts;
}
