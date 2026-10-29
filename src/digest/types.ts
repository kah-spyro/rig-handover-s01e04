// Types for the run log reader (plan.md § 1). Types only: no logic, no runtime code.
// Section 2 (page, JSON, board link, route tests) builds against this file.

/** Status of one line in runs/<night>.jsonl. */
export type RunStatus = 'ok' | 'retry' | 'fail';

/** One job's summary for a night: every line with the same `job`, folded into one row. */
export interface DigestRow {
  job: string;
  /** null is kept as a row, never dropped; views show it as "—". */
  owner: string | null;
  /** Lines for this job. */
  runs: number;
  /** Lines with status 'retry'. */
  retries: number;
  /** Status of the job's last line. */
  lastStatus: RunStatus;
  /** Error of the job's last line; null when that line has none. */
  lastError: string | null;
  /** ISO time with its offset, exactly as in the log (never converted to UTC). */
  firstAt: string;
  /** Same format as firstAt. */
  lastAt: string;
}

/** One night's digest. */
export interface Night {
  /** e.g. "2026-10-28", the file name without .jsonl. */
  night: string;
  /** One per job, sorted by job. */
  rows: DigestRow[];
  /** Lines that did not parse (bad JSON or missing/invalid fields): counted, never thrown. */
  badLines: number;
}

/**
 * Reads runs/<night>.jsonl. Returns null when the file does not exist (routes answer 404).
 * An empty file gives rows: [] and badLines: 0.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;

/**
 * Signature only, for type-checking against. This is a declaration: it has no runtime value,
 * so don't import it from here at runtime. The implementation lands in src/digest/ (§ 1)
 * and must match ReadNight.
 */
export declare function readNight(runsDir: string, night: string): Night | null;
