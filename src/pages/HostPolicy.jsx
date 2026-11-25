import { useEffect, useState } from 'react';
import { api } from '../api';
import PlanEditor from '../components/PlanEditor.jsx';

// the server keeps money in cents, the admin types dollars
const toCents = (v) => Math.round(Number(String(v).replace(',', '.')) * 100);
const toDollars = (c) => (Number(c || 0) / 100).toFixed(2);
const METHODS = [['upi', 'UPI'], ['bank', 'Bank account'], ['paypal', 'PayPal']];

/** The host salary levels (the "host policy") and the withdrawal rules. Nothing about salary or commission is fixed in the code: it is set here. */
export default function HostPolicy({ role }) {
  const canEdit = role === 'super_admin';
  const [policy, setPolicy] = useState(null);
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
        setPolicy(r.policy);
        setW({ enabled: r.withdrawal.enabled, min: toDollars(r.withdrawal.minCents), max: toDollars(r.withdrawal.maxCents), daily: toDollars(r.withdrawal.dailyLimitCents), methods: r.withdrawal.methods });
      } catch (e) {
        fail(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [canEdit]);

  const savePolicy = async (body) => {
    if (!window.confirm('Save the default targets? Agencies that have no targets of their own use them from now on (periods already calculated do not change).')) return;
    setBusy(true);
    try {
      const r = await api('/admin/host-policy', 'PUT', body);
      setPolicy(r.policy);
      ok('Default targets saved.');
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
    <>
      <div className="head"><h1>Host policy</h1></div>
      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}
      {loading && <p className="muted pad">Loading...</p>}

      {!loading && (
        <>
          <p className="muted small">
            These are the <b>default targets</b>, used by every agency that has no targets of its own. To give one agency its own targets (weekly or monthly, its own levels),
            open <b>Agencies</b> and press <b>Targets</b> on that agency. A host who receives the target number of diamonds before the deadline reaches that level and earns its
            host salary. The <b>agency commission</b> is not a second salary: it is a % of the host's withdrawal, paid to the agency owner's PayPal (set per agency).
          </p>
          <PlanEditor policy={policy} onSave={savePolicy} busy={busy} saveLabel="Save default targets" />
          <div style={{ height: 24 }} />

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
    </>
  );
}
