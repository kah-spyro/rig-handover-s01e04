import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

function marks(row: DigestRow): string[] {
  const out: string[] = [];
  if (row.retries >= 3) out.push('retries ≥ 3');
  if (row.lastStatus === 'fail') out.push('FAIL');
  return out;
}

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest {night.night}</h1>
      {night.badLines > 0 && (
        <p class="warn">
          {night.badLines} {night.badLines === 1 ? 'line' : 'lines'} could not be read.
        </p>
      )}
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => {
              const m = marks(row);
              return (
                <tr>
                  <td>
                    {row.job}
                    {m.length > 0 && <strong class="warn"> [{m.join(' · ')}]</strong>}
                  </td>
                  <td>{row.owner ?? dash}</td>
                  <td>{row.runs}</td>
                  <td>{row.retries}</td>
                  <td>{row.lastStatus}</td>
                  <td>{row.lastError ?? dash}</td>
                  <td>{row.firstAt}</td>
                  <td>{row.lastAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

export function DigestNotFound({ night }: { night: string }) {
  return (
    <>
      <h1>digest {night}</h1>
      <p>404: no run log for this night.</p>
    </>
  );
}
