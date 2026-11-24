import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const usd = (c) => `$${(Number(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

const GLOSS = `
/* glossy finish: same colours, only sheen + highlights (scoped to the Withdrawals page) */
.wdx h1 { text-shadow: 0 2px 14px rgba(244,197,66,.10); }

/* glossy pill tabs (like Agencies / Host requests) */
.wdx .tabs { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; }
.wdx .tabs .tab {
  position: relative; overflow: hidden; display: inline-flex; align-items: center; cursor: pointer;
  margin: 0 !important; padding: 10px 20px !important; border-radius: 16px !important;
  border: 1px solid rgba(255,255,255,.16) !important; border-top: 1px solid rgba(255,255,255,.2) !important; border-bottom: 1px solid rgba(255,255,255,.1) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 55%, rgba(0,0,0,.18)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2), inset 0 -2px 5px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.3) !important;
  transition: border-color .15s, transform .15s, color .15s;
}
.wdx .tabs .tab::before {
  content: ''; position: absolute; left: 4px; right: 4px; top: 1px; height: 48%; pointer-events: none;
  border-radius: 13px 13px 50% 50% / 13px 13px 10px 10px;
  background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0));
}
.wdx .tabs .tab:hover { transform: translateY(-1px); border-color: rgba(255,255,255,.3) !important; }
.wdx .tabs .tab.active {
  border: 1px solid rgba(255,255,255,.38) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,.08) 50%, rgba(0,0,0,.22)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -3px 6px rgba(0,0,0,.4), 0 6px 16px rgba(0,0,0,.4) !important;
  text-shadow: 0 0 14px rgba(244,197,66,.35);
}
.wdx .tabs .tab.active::before { background: linear-gradient(180deg, rgba(255,255,255,.30), rgba(255,255,255,.02)); }

/* table card: curved light sheen at the top, glass edge */
.wdx .card {
  border: 1px solid rgba(255,255,255,.2);
  background-image:
    radial-gradient(120% 38% at 50% -6%, rgba(255,255,255,.17), rgba(255,255,255,.04) 55%, transparent 72%),
    linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,0) 40%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.5), 0 14px 34px rgba(0,0,0,.45);
}

/* table */
.wdx thead th {
  background-image: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.03));
  border-bottom: 1px solid rgba(255,255,255,.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22);
}
.wdx tbody td { border-bottom: 1px solid rgba(255,255,255,.07); }
.wdx tbody tr:hover td { background-image: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.01)); }

/* status pills */
.wdx .pill {
  border: 1px solid rgba(255,255,255,.22);
  background-image: linear-gradient(180deg, rgba(255,255,255,.26) 0%, rgba(255,255,255,.06) 50%, rgba(0,0,0,.14) 51%, rgba(0,0,0,.02) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 2px rgba(0,0,0,.25), 0 3px 8px rgba(0,0,0,.3);
}

/* buttons: keep their own colours, add the glossy highlight on top */
.wdx .btn {
  position: relative; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -3px 6px rgba(0,0,0,.3), 0 8px 20px -8px rgba(0,0,0,.6);
  transition: transform .15s, filter .15s, border-color .15s;
}
.wdx .btn::before {
  content: ''; position: absolute; left: 4px; right: 4px; top: 1px; height: 48%; pointer-events: none;
  border-radius: 10px 10px 50% 50% / 10px 10px 8px 8px;
  background: linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.05));
}
.wdx .btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.wdx .btn:active:not(:disabled) { transform: translateY(1px); }
.wdx .btn:disabled { cursor: not-allowed; }
`;

/** The payment details the admin needs to pay the person (shown in full, only to a Super admin). */
function Details({ d }) {
  if (!d) return <span className="muted">-</span>;
  if (d.method === 'upi') return <div><b>UPI</b><div className="mono">{d.upiId}</div></div>;
  if (d.method === 'paypal') return <div><b>PayPal</b><div className="mono">{d.paypalEmail}</div></div>;
  return (
    <div>
      <b>Bank</b>
      <div>{d.accountName}</div>
      <div className="mono">{d.accountNumber}</div>
      <div className="mono">{d.ifsc}</div>
    </div>
  );
}

/** Withdrawal requests: pay the person outside the app, then approve with the payment reference. A rejection gives the money back. */
export default function Withdrawals({ role }) {
  const canEdit = role === 'super_admin';
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const fail = (e) => { setNote(''); setError(e.message || String(e)); };
  const ok = (m) => { setError(''); setNote(m); };

  const load = useCallback(async () => {
    if (!canEdit) return setLoading(false);
    setLoading(true);
    setError('');
    try {
      setItems((await api(`/admin/withdrawals?status=${status}`)).items || []);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [canEdit, status]);

  useEffect(() => { load(); }, [load]);

  const approve = async (w) => {
    const ref = window.prompt(`Pay ${usd(w.amountCents)} to ${w.userName} first, then write the payment reference (UTR / transaction id):`);
    if (ref === null) return;
    if (ref.trim().length < 3) return fail(new Error('Please write the payment reference.'));
    setBusy(w.id);
    try {
      await api(`/admin/withdrawals/${w.id}/approve`, 'POST', { paymentRef: ref.trim() });
      ok(`Marked as paid: ${usd(w.amountCents)} to ${w.userName}.`);
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy('');
    }
  };

  const reject = async (w) => {
    const reason = window.prompt(`Reason for rejecting ${usd(w.amountCents)} of ${w.userName} (the person can see it). The money goes back to the balance.`);
    if (reason === null) return;
    if (reason.trim().length < 3) return fail(new Error('Please write a short reason.'));
    setBusy(w.id);
    try {
      await api(`/admin/withdrawals/${w.id}/reject`, 'POST', { reason: reason.trim() });
      ok('Rejected. The money went back to the balance.');
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy('');
    }
  };

  if (!canEdit) return (<><div className="head"><h1>Withdrawals</h1></div><p className="muted pad">Only a Super admin can handle withdrawals.</p></>);

  return (
    <><style>{GLOSS}</style><div className="wdx">
      <div className="head"><h1>Withdrawals</h1></div>
      <p className="muted small">
        When someone asks for a withdrawal the amount leaves their balance at once. Pay it with the details below, then press <b>Mark as paid</b> and write the payment
        reference. Reject if something is wrong: the money returns to the person. Every decision is saved in the audit log.
      </p>

      <div className="tabs">
        {['pending', 'approved', 'rejected', 'cancelled'].map((s) => (
          <a key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s === 'approved' ? 'Paid' : s[0].toUpperCase() + s.slice(1)}</a>
        ))}
      </div>

      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Asked</th><th>Person</th><th>Amount</th><th>Pay to</th><th>Status</th>{status === 'pending' && <th></th>}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="muted pad">Loading...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="muted pad">Nothing here.</td></tr>}
            {items.map((w) => (
              <tr key={w.id}>
                <td className="small">{when(w.createdAt)}</td>
                <td>{w.userName}<div className="muted small mono">ID {w.userId}</div></td>
                <td><b>{usd(w.amountCents)}</b></td>
                <td><Details d={w.details} /></td>
                <td>
                  <span className={`pill ${w.status === 'approved' ? 'active' : w.status === 'pending' ? 'suspended' : 'banned'}`}>{w.status === 'approved' ? 'paid' : w.status}</span>
                  {w.paymentRef && <div className="muted small mono">Ref {w.paymentRef}</div>}
                  {w.reason && <div className="muted small">{w.reason}</div>}
                  {w.decidedAt && <div className="muted small">{when(w.decidedAt)}</div>}
                </td>
                {status === 'pending' && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn sm" disabled={busy === w.id} onClick={() => approve(w)}>Mark as paid</button>{' '}
                    <button className="btn danger sm" disabled={busy === w.id} onClick={() => reject(w)}>Reject</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div></>
  );
}
