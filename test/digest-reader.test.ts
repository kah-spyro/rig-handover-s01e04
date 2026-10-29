import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-digest-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('readNight on the real 2026-10-28 log', () => {
  const night = readNight('runs', '2026-10-28');

  it('gives 5 jobs, sorted, and 1 bad line', () => {
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('folds retries, last status and times as logged', () => {
    const refresh = night?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    const backup = night?.rows.find((r) => r.job === 'notes/backup');
    expect(backup?.lastStatus).toBe('fail');
    expect(backup?.lastError).toBe('quota exceeded');
  });

  it('keeps a job with a null owner', () => {
    const render = night?.rows.find((r) => r.job === 'digest/render');
    expect(render?.owner).toBeNull();
    expect(render?.runs).toBe(1);
  });
});

describe('readNight edge cases', () => {
  it('returns null for a night with no file', () => {
    expect(readNight(tmp, '2026-01-01')).toBeNull();
  });

  it('reads an empty file as nothing ran', () => {
    writeFileSync(join(tmp, '2026-01-02.jsonl'), '');
    expect(readNight(tmp, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('counts bad lines, ignores blank ones, never throws', () => {
    const ok = '{"at":"2026-01-03T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}';
    writeFileSync(
      join(tmp, '2026-01-03.jsonl'),
      [ok, '{not json', '', '42', '{"at":"x","job":"a","status":"maybe","owner":"rook"}', '{"at":"x","job":"a","status":"ok"}', ''].join('\n'),
    );
    const night = readNight(tmp, '2026-01-03');
    expect(night?.badLines).toBe(4);
    expect(night?.rows).toHaveLength(1);
  });

  it('refuses a night that is not YYYY-MM-DD', () => {
    writeFileSync(join(tmp, 'secret.jsonl'), '');
    const inner = join(tmp, 'inner');
    expect(readNight(inner, '../secret')).toBeNull();
    expect(readNight(tmp, 'secret')).toBeNull();
    expect(readNight(tmp, '2026-01-02/../2026-01-02')).toBeNull();
  });
});
