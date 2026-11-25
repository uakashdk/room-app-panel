import { useEffect, useState } from 'react';
import { api } from '../api';
import PlanEditor from './PlanEditor.jsx';

/**
 * One agency: its TARGETS (weekly or monthly, host levels, live-time rules), the commission % taken from the host's withdrawals
 * and the owner's PayPal email where that commission is paid. Without own targets the agency uses the default host policy.
 */
export default function AgencyPlanModal({ agency, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [commission, setCommission] = useState(String(agency.commissionPercent ?? 0));
  const [paypal, setPaypal] = useState(agency.paypalEmail || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const fail = (e) => { setNote(''); setError(e.message || String(e)); };
  const ok = (m) => { setError(''); setNote(m); };

  const load = async () => {
    try {
      setData(await api(`/admin/agencies/${agency.id}/plan`));
    } catch (e) {
      fail(e);
    }
  };
  useEffect(() => { load(); }, [agency.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTargets = async (body) => {
    setBusy(true);
    try {
      await api(`/admin/agencies/${agency.id}/plan`, 'PUT', body);
      ok('Targets saved for this agency.');
      await load();
      onChanged?.();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const useDefault = async () => {
    if (!window.confirm('Remove the own targets of this agency? It will use the default host policy again.')) return;
    setBusy(true);
    try {
      await api(`/admin/agencies/${agency.id}/plan`, 'DELETE');
      ok('This agency uses the default host policy now.');
      await load();
      onChanged?.();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const saveMoney = async () => {
    const pct = Number(commission);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return fail(new Error('Commission must be between 0 and 100.'));
    if (pct > 0 && !/^\S+@\S+\.\S+$/.test(paypal.trim())) return fail(new Error('Write the PayPal email of the agency owner: the commission is paid there.'));
    setBusy(true);
    try {
      await api(`/admin/agencies/${agency.id}`, 'PUT', { commissionPercent: pct, ...(paypal.trim() ? { paypalEmail: paypal.trim() } : {}) });
      ok('Commission and PayPal saved.');
      onChanged?.();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Targets and payout: {agency.name} <span className="muted small">(ID {agency.id})</span></h2>
          <button className="btn ghost sm" onClick={onClose}>Close</button>
        </div>
        {error && <div className="error box">{error}</div>}
        {note && <div className="ok box">{note}</div>}

        <div className="card form" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', padding: 14, marginBottom: 16 }}>
          <label className="field">
            <span>Agency commission % (of each host withdrawal)</span>
            <input type="number" min="0" max="100" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} style={{ width: 170 }} />
          </label>
          <label className="field" style={{ minWidth: 280 }}>
            <span>Agency owner's PayPal email (the commission is paid here)</span>
            <input type="email" value={paypal} onChange={(e) => setPaypal(e.target.value)} placeholder="owner@example.com" />
          </label>
          <button className="btn" onClick={saveMoney} disabled={busy}>Save commission and PayPal</button>
          <span className="muted small" style={{ flexBasis: '100%' }}>
            When a host of this agency withdraws, this % of the amount goes to the owner's PayPal and the rest to the host's bank or UPI. You pay both parts in <b>Withdrawals</b>.
            The wallet of the owner is not used.
          </span>
        </div>

        <h3 style={{ margin: '4px 0 8px' }}>Targets of this agency</h3>
        {!data && !error && <p className="muted pad">Loading...</p>}
        {data && (
          <>
            <p className="muted small" style={{ marginTop: 0 }}>
              {data.custom ? 'This agency has its OWN targets.' : 'This agency has no targets of its own yet: it uses the default host policy. Change anything below and save to give it its own.'}
            </p>
            <PlanEditor
              policy={data.plan}
              onSave={saveTargets}
              busy={busy}
              saveLabel="Save targets for this agency"
              extra={data.custom ? <button className="btn ghost" onClick={useDefault} disabled={busy}>Use the default policy</button> : null}
            />
          </>
        )}
      </div>
    </div>
  );
}
