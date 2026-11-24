import { useEffect, useState } from 'react';
import { api } from '../api';

// the server keeps money in cents, the admin types dollars
const toCents = (v) => Math.round(Number(String(v).replace(',', '.')) * 100);
const toDollars = (c) => (Number(c || 0) / 100).toFixed(2);
const METHODS = [['upi', 'UPI'], ['bank', 'Bank account'], ['paypal', 'PayPal']];

const GLOSS = `
/* glossy finish: same colours, only sheen + highlights (scoped to the Host policy page) */
.hpx h1 { text-shadow: 0 2px 14px rgba(244,197,66,.10); }

/* cards (rule bars + level table): curved light sheen at the top, glass edge */
.hpx .card {
  border: 1px solid rgba(255,255,255,.2);
  background-image:
    radial-gradient(120% 38% at 50% -6%, rgba(255,255,255,.17), rgba(255,255,255,.04) 55%, transparent 72%),
    linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,0) 40%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.5), 0 14px 34px rgba(0,0,0,.45);
}

/* table */
.hpx thead th {
  background-image: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.03));
  border-bottom: 1px solid rgba(255,255,255,.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22);
}
.hpx tbody td { border-bottom: 1px solid rgba(255,255,255,.07); }
.hpx tbody tr:hover td { background-image: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.01)); }

/* inputs */
.hpx input:not([type='checkbox']) {
  border-radius: 14px; border: 1px solid rgba(255,255,255,.2); outline: none;
  background-image: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02) 60%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -2px 6px rgba(0,0,0,.35), 0 3px 10px rgba(0,0,0,.25);
  transition: border-color .15s, box-shadow .15s;
}
.hpx input:not([type='checkbox']):focus { border-color: var(--gold, #f4c542); box-shadow: inset 0 -2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(244,197,66,.16); }

/* buttons: keep their own colours, add the glossy highlight on top */
.hpx .btn {
  position: relative; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -3px 6px rgba(0,0,0,.3), 0 8px 20px -8px rgba(0,0,0,.6);
  transition: transform .15s, filter .15s, border-color .15s;
}
.hpx .btn::before {
  content: ''; position: absolute; left: 4px; right: 4px; top: 1px; height: 48%; pointer-events: none;
  border-radius: 10px 10px 50% 50% / 10px 10px 8px 8px;
  background: linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.05));
}
.hpx .btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.hpx .btn:active:not(:disabled) { transform: translateY(1px); }
.hpx .btn:disabled { cursor: not-allowed; }
.hpx .btn.ghost {
  background-image: linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.07) 49%, rgba(0,0,0,.16) 51%, rgba(0,0,0,.04) 100%);
}
.hpx .btn.ghost::before { background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0)); }
`;

/** The host salary levels (the "host policy") and the withdrawal rules. Nothing about salary or commission is fixed in the code: it is set here. */
export default function HostPolicy({ role }) {
  const canEdit = role === 'super_admin';
  const [levels, setLevels] = useState([]);
  const [minActiveDays, setMinActiveDays] = useState('0');
  const [minLiveMinutes, setMinLiveMinutes] = useState('0');
  const [w, setW] = useState({ enabled: true, min: '10.00', max: '5000.00', daily: '5000.00', methods: ['upi', 'bank', 'paypal'] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const fail = (e) => { setNote(''); setError(e.message || String(e)); };
  const ok = (m) => { setError(''); setNote(m); };

  useEffect(() => {
    if (!canEdit) return setLoading(false);
    (async () => {
      try {
        const r = await api('/admin/host-policy');
        setLevels(r.policy.levels.map((l) => ({ target: String(l.targetDiamonds), host: toDollars(l.hostSalaryCents), agent: toDollars(l.agentSalaryCents) })));
        setMinActiveDays(String(r.policy.minActiveDays));
        setMinLiveMinutes(String(r.policy.minLiveMinutes));
        setW({ enabled: r.withdrawal.enabled, min: toDollars(r.withdrawal.minCents), max: toDollars(r.withdrawal.maxCents), daily: toDollars(r.withdrawal.dailyLimitCents), methods: r.withdrawal.methods });
      } catch (e) {
        fail(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [canEdit]);

  const setRow = (i, k, v) => setLevels((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const addRow = () => setLevels((ls) => {
    const last = ls[ls.length - 1];
    return [...ls, { target: String((Number(last?.target) || 0) * 2 || 100000), host: last?.host || '0.00', agent: last?.agent || '0.00' }];
  });
  const removeRow = (i) => setLevels((ls) => ls.filter((_, j) => j !== i));

  const savePolicy = async () => {
    const rows = levels.map((l) => ({ targetDiamonds: Math.round(Number(l.target)), hostSalaryCents: toCents(l.host), agentSalaryCents: toCents(l.agent) }));
    if (rows.length === 0 || rows.some((r) => !Number.isFinite(r.targetDiamonds) || r.targetDiamonds < 1 || !Number.isFinite(r.hostSalaryCents) || r.hostSalaryCents < 0 || !Number.isFinite(r.agentSalaryCents) || r.agentSalaryCents < 0)) {
      return fail(new Error('Every level needs a target (1 or more) and salary amounts (0 or more).'));
    }
    if (!window.confirm('Save the new host policy? It is used for the weekly salary calculation from now on (weeks already calculated do not change).')) return;
    setBusy(true);
    try {
      const r = await api('/admin/host-policy', 'PUT', { minActiveDays: Number(minActiveDays) || 0, minLiveMinutes: Number(minLiveMinutes) || 0, levels: rows });
      setLevels(r.policy.levels.map((l) => ({ target: String(l.targetDiamonds), host: toDollars(l.hostSalaryCents), agent: toDollars(l.agentSalaryCents) })));
      ok('Host policy saved.');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const saveWithdrawal = async () => {
    const body = { enabled: w.enabled, minCents: toCents(w.min), maxCents: toCents(w.max), dailyLimitCents: toCents(w.daily), methods: w.methods };
    if ([body.minCents, body.maxCents, body.dailyLimitCents].some((n) => !Number.isFinite(n) || n < 1)) return fail(new Error('The amounts must be more than 0.'));
    if (body.methods.length === 0) return fail(new Error('Choose at least one payment method.'));
    setBusy(true);
    try {
      await api('/admin/withdrawal-settings', 'PUT', body);
      ok('Withdrawal rules saved.');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return (<><div className="head"><h1>Host policy</h1></div><p className="muted pad">Only a Super admin can change the host policy.</p></>);

  return (
    <><style>{GLOSS}</style><div className="hpx">
      <div className="head"><h1>Host policy</h1></div>
      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}
      {loading && <p className="muted pad">Loading...</p>}

      {!loading && (
        <>
          <p className="muted small">
            In a week a host who receives the target number of diamonds reaches that level. The <b>host salary</b> goes to the host and the <b>agent salary</b> goes to the
            owner of the host's agency, after you approve the week in <b>Salary approval</b>. Levels are numbered in the order of the target.
          </p>
          <div className="card form" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label>Live on at least (days of the week)<input type="number" min="0" max="7" value={minActiveDays} onChange={(e) => setMinActiveDays(e.target.value)} style={{ width: 120 }} /></label>
            <label>and at least (live minutes in the week)<input type="number" min="0" value={minLiveMinutes} onChange={(e) => setMinLiveMinutes(e.target.value)} style={{ width: 140 }} /></label>
            <span className="muted small">0 = no rule. A host who does not meet it gets the week marked "not eligible".</span>
          </div>

          <div className="card table-wrap">
            <table>
              <thead><tr><th>Level</th><th>Weekly target (diamonds)</th><th>Host salary (USD)</th><th>Agent salary (USD)</th><th></th></tr></thead>
              <tbody>
                {levels.map((l, i) => (
                  <tr key={i}>
                    <td><b>L{i + 1}</b></td>
                    <td><input type="number" min="1" value={l.target} onChange={(e) => setRow(i, 'target', e.target.value)} style={{ width: 170 }} /></td>
                    <td><input value={l.host} onChange={(e) => setRow(i, 'host', e.target.value)} style={{ width: 120 }} /></td>
                    <td><input value={l.agent} onChange={(e) => setRow(i, 'agent', e.target.value)} style={{ width: 120 }} /></td>
                    <td><button className="btn danger sm" onClick={() => removeRow(i)} disabled={levels.length <= 1}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, margin: '12px 0 30px' }}>
            <button className="btn ghost" onClick={addRow}>+ Add level</button>
            <button className="btn" onClick={savePolicy} disabled={busy}>Save host policy</button>
          </div>

          <div className="head"><h1 style={{ fontSize: 20 }}>Withdrawal rules</h1></div>
          <div className="card form" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={w.enabled} onChange={(e) => setW({ ...w, enabled: e.target.checked })} /> Withdrawals are on
            </label>
            <label>Smallest (USD)<input value={w.min} onChange={(e) => setW({ ...w, min: e.target.value })} style={{ width: 110 }} /></label>
            <label>Largest single (USD)<input value={w.max} onChange={(e) => setW({ ...w, max: e.target.value })} style={{ width: 110 }} /></label>
            <label>Most per person per day (USD)<input value={w.daily} onChange={(e) => setW({ ...w, daily: e.target.value })} style={{ width: 110 }} /></label>
            <div style={{ display: 'flex', gap: 14 }}>
              {METHODS.map(([k, label]) => (
                <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox" checked={w.methods.includes(k)}
                    onChange={(e) => setW({ ...w, methods: e.target.checked ? [...w.methods, k] : w.methods.filter((m) => m !== k) })}
                  /> {label}
                </label>
              ))}
            </div>
            <button className="btn" onClick={saveWithdrawal} disabled={busy}>Save withdrawal rules</button>
          </div>
                </>
      )}
    </div></>
  );
}
