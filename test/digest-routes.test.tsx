import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-routes-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function appFor(runsDir: string) {
  return createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
}

function line(job: string, status: string, at: string, owner: string | null = 'rook'): string {
  return JSON.stringify({ at, job, status, owner });
}

writeFileSync(
  join(tmp, '2026-01-01.jsonl'),
  [
    line('zeta/job', 'ok', '2026-01-01T23:00:00+01:00'),
    line('alpha/job', 'retry', '2026-01-01T23:10:00+01:00'),
    line('alpha/job', 'ok', '2026-01-01T23:20:00+01:00'),
    '',
  ].join('\n'),
);
writeFileSync(join(tmp, '2026-01-02.jsonl'), '');
writeFileSync(
  join(tmp, '2026-01-03.jsonl'),
  [line('good/one', 'ok', '2026-01-03T01:00:00+01:00'), 'not json', '{"job":"x"}', line('good/two', 'fail', '2026-01-03T02:00:00+01:00'), ''].join('\n'),
);

async function json(app: ReturnType<typeof appFor>, night: string) {
  const res = await app.request(`/api/digest/${night}`);
  return { res, body: (await res.json()) as Night };
}

describe('GET /digest/:night', () => {
  it('200 for a synthetic night, rows sorted by job', async () => {
    const res = await appFor(tmp).request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('alpha/job')).toBeGreaterThan(-1);
    expect(html.indexOf('alpha/job')).toBeLessThan(html.indexOf('zeta/job'));
    expect(html).not.toContain('could not be read');
  });

  it('200 for the real 2026-10-28 fixture with 1 bad line', async () => {
    const res = await appFor('runs').request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line could not be read');
    expect(html).toContain('fixtures/refresh');
  });

  it('404 for a night with no file', async () => {
    const res = await appFor(tmp).request('/digest/2026-02-02');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log');
  });

  it('empty night: 200 and "nothing ran"', async () => {
    const res = await appFor(tmp).request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('bad lines: shows the count and still renders good rows', async () => {
    const res = await appFor(tmp).request('/digest/2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('2 lines could not be read');
    expect(html).toContain('good/one');
    expect(html).toContain('good/two');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 for a synthetic night', async () => {
    const { res, body } = await json(appFor(tmp), '2026-01-01');
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-01-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha/job', 'zeta/job']);
    expect(body.rows[0]).toMatchObject({ runs: 2, retries: 1, lastStatus: 'ok' });
  });

  it('200 for the real 2026-10-28 fixture: 5 jobs, 1 bad line', async () => {
    const { res, body } = await json(appFor('runs'), '2026-10-28');
    expect(res.status).toBe(200);
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
  });

  it('404 with an error body for a night with no file', async () => {
    const res = await appFor(tmp).request('/api/digest/2026-02-02');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('empty night: 200, rows [] and badLines 0', async () => {
    const { res, body } = await json(appFor(tmp), '2026-01-02');
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('bad lines: badLines equals the count and good rows are kept', async () => {
    const { res, body } = await json(appFor(tmp), '2026-01-03');
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(2);
    expect(body.rows.map((r) => r.job)).toEqual(['good/one', 'good/two']);
  });
});

describe('page and JSON agree (ADR 0001)', () => {
  it.each([
    ['synthetic', tmp, '2026-01-01'],
    ['bad lines', tmp, '2026-01-03'],
    ['real fixture', 'runs', '2026-10-28'],
  ])('same jobs in the same order: %s', async (_name, dir, night) => {
    const app = appFor(dir);
    const { body } = await json(app, night);
    const html = await (await app.request(`/digest/${night}`)).text();
    const positions = body.rows.map((r) => html.indexOf(`<td>${r.job}`));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html.match(/<tr>/g)?.length).toBe(body.rows.length + 1);
  });
});
