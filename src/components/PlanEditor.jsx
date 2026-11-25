import { useEffect, useState } from 'react';

// the server keeps money in cents, the admin types dollars
const toCents = (v) => Math.round(Number(String(v).replace(',', '.')) * 100);
const toDollars = (c) => (Number(c || 0) / 100).toFixed(2);

const rowsOf = (policy) => (policy?.levels || []).map((l) => ({ target: String(l.targetDiamonds), host: toDollars(l.hostSalaryCents) }));

/**
 * The targets: weekly or monthly, the levels (target -> host salary), the live-time rules and the auto-credit switch.
 * Used for the default host policy AND for the targets of one agency. onSave gets the body the server expects.
 */
export default function PlanEditor({ policy, onSave, busy, saveLabel = 'Save targets', extra = null }) {
  const [period, setPeriod] = useState('weekly');
  const [autoCredit, setAutoCredit] = useState(false);
  const [minActiveDays, setMinActiveDays] = useState('0');
  const [minLiveMinutes, setMinLiveMinutes] = useState('0');
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!policy) return;
    setPeriod(policy.period === 'monthly' ? 'monthly' : 'weekly');
    setAutoCredit(policy.autoCredit === true);
    setMinActiveDays(String(policy.minActiveDays ?? 0));
    setMinLiveMinutes(String(policy.minLiveMinutes ?? 0));
    setLevels(rowsOf(policy));
  }, [policy]);

  const setRow = (i, k, v) => setLevels((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const addRow = () => setLevels((ls) => {
    const last = ls[ls.length - 1];
    return [...ls, { target: String((Number(last?.target) || 0) * 2 || 30000), host: last?.host || '0.00' }];
  });
  const removeRow = (i) => setLevels((ls) => ls.filter((_, j) => j !== i));

  const save = () => {
    const rows = levels.map((l) => ({ targetDiamonds: Math.round(Number(l.target)), hostSalaryCents: toCents(l.host) }));
    if (rows.length === 0 || rows.some((r) => !Number.isFinite(r.targetDiamonds) || r.targetDiamonds < 1 || !Number.isFinite(r.hostSalaryCents) || r.hostSalaryCents < 0)) {
      return setError('Every level needs a target (1 or more) and a host salary (0 or more).');
    }
    setError('');
    onSave({ period, autoCredit, minActiveDays: Number(minActiveDays) || 0, minLiveMinutes: Number(minLiveMinutes) || 0, levels: rows });
  };

  const word = period === 'monthly' ? 'month' : 'week';
  return (
    <>
      {error && <div className="error box">{error}</div>}
      <div className="card form" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', padding: 14 }}>
        <label className="field">
          <span>Target period (deadline)</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="weekly">Weekly (every Monday)</option>
            <option value="monthly">Monthly (1st of the month)</option>
          </select>
        </label>
        <label className="field">
          <span>Live on at least (days of the {word})</span>
          <input type="number" min="0" max="31" value={minActiveDays} onChange={(e) => setMinActiveDays(e.target.value)} style={{ width: 150 }} />
        </label>
        <label className="field">
          <span>and at least (live minutes in the {word})</span>
          <input type="number" min="0" value={minLiveMinutes} onChange={(e) => setMinLiveMinutes(e.target.value)} style={{ width: 170 }} />
        </label>
        <label className="field check">
          <input type="checkbox" checked={autoCredit} onChange={(e) => setAutoCredit(e.target.checked)} /> Add the salary automatically when the {word} ends
        </label>
        <span className="muted small" style={{ flexBasis: '100%' }}>
          0 = no rule. The <b>room target</b> is the live time above (days and minutes the host's room was live). The <b>host target</b> is the table below. Without the automatic switch,
          every {word}'s salary waits in <b>Salary approval</b> for you.
        </span>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Level</th><th>Target ({word}ly diamonds received)</th><th>Host salary (USD)</th><th></th></tr></thead>
          <tbody>
            {levels.map((l, i) => (
              <tr key={i}>
                <td><b>L{i + 1}</b></td>
                <td><input type="number" min="1" value={l.target} onChange={(e) => setRow(i, 'target', e.target.value)} style={{ width: 170 }} /></td>
                <td><input value={l.host} onChange={(e) => setRow(i, 'host', e.target.value)} style={{ width: 120 }} /></td>
                <td><button className="btn danger sm" onClick={() => removeRow(i)} disabled={levels.length <= 1}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
        <button className="btn ghost" onClick={addRow}>+ Add level</button>
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving...' : saveLabel}</button>
        {extra}
      </div>
    </>
  );
}
