import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const usd = (c) => `$${(Number(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

/* Glossy premium finish. Translucent white/black layers only, so colours and theme stay unchanged. */
const GLOSS_CSS = `
.gloss-page .card{
  position:relative;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.14);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.16),
    inset 0 -1px 0 rgba(0,0,0,.35),
    0 14px 36px rgba(0,0,0,.45);
}
.gloss-page .card::before{
  content:'';
  position:absolute;
  inset:0;
  border-radius:inherit;
  background:linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.03) 38%,rgba(255,255,255,0) 60%);
  pointer-events:none;
}
.gloss-page .card > *{position:relative;}
.gloss-page .table-wrap{overflow-x:auto;}

.gloss-page .tabs{gap:10px;}
.gloss-page .tab{
  position:relative;
  overflow:hidden;
  cursor:pointer;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.14);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.18),
    inset 0 -8px 14px rgba(0,0,0,.25),
    0 4px 10px rgba(0,0,0,.35);
  transition:transform .15s ease,box-shadow .15s ease;
}
.gloss-page .tab::before{
  content:'';
  position:absolute;
  left:0;right:0;top:0;height:50%;
  background:linear-gradient(180deg,rgba(255,255,255,.20),rgba(255,255,255,0));
  pointer-events:none;
}
.gloss-page .tab:hover{transform:translateY(-1px);}
.gloss-page .tab.active{
  border-color:rgba(255,255,255,.28);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.30),
    inset 0 -8px 14px rgba(0,0,0,.30),
    0 6px 16px rgba(0,0,0,.50);
}

.gloss-page .btn{
  position:relative;
  overflow:hidden;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.16);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.28),
    inset 0 -6px 10px rgba(0,0,0,.22),
    0 4px 12px rgba(0,0,0,.40);
  transition:transform .15s ease,filter .15s ease,box-shadow .15s ease;
}
.gloss-page .btn::before{
  content:'';
  position:absolute;
  left:0;right:0;top:0;height:52%;
  background:linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,.02));
  pointer-events:none;
}
.gloss-page .btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08);}
.gloss-page .btn:active:not(:disabled){
  transform:translateY(1px);
  box-shadow:inset 0 2px 6px rgba(0,0,0,.40),0 1px 3px rgba(0,0,0,.40);
}
.gloss-page .btn:disabled{opacity:.6;cursor:not-allowed;}
.gloss-page .btn.sm{border-radius:10px;}
.gloss-page td .btn + .btn{margin-left:8px;}

.gloss-page table{border-collapse:separate;border-spacing:0;width:100%;}
.gloss-page thead th{
  background-image:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02));
  box-shadow:inset 0 -1px 0 rgba(255,255,255,.12);
}
.gloss-page tbody td{border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top;}
.gloss-page tbody tr{transition:background-color .15s ease;}
.gloss-page tbody tr:hover{background-color:rgba(255,255,255,.04);}
.gloss-page tbody tr:last-child td{border-bottom:0;}

.gloss-page .pill{
  position:relative;
  overflow:hidden;
  border-radius:999px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.30),
    inset 0 -4px 8px rgba(0,0,0,.20),
    0 2px 6px rgba(0,0,0,.35);
}
.gloss-page .pill::before{
  content:'';
  position:absolute;
  left:0;right:0;top:0;height:50%;
  background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0));
  pointer-events:none;
}

/* agency payout box inside the "Pay to" cell */
.gloss-page .split-box{
  margin-top:8px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.14);
  background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02));
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.14),
    inset 0 -8px 14px rgba(0,0,0,.18),
    0 2px 8px rgba(0,0,0,.30);
}

.gloss-page .box{
  position:relative;
  overflow:hidden;
  border-radius:14px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 6px 16px rgba(0,0,0,.35);
}
.gloss-page .box::before{
  content:'';
  position:absolute;
  inset:0;
  background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0) 55%);
  pointer-events:none;
}

.gloss-page .btn:focus-visible,
.gloss-page .tab:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px;}
@media (prefers-reduced-motion:reduce){
  .gloss-page *{transition:none !important;}
}
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
    const p = w.agencyPayout;
    const ref = window.prompt(p
      ? `1/2  Pay ${usd(p.hostCents)} to ${w.userName} (bank / UPI details in the table) first, then write that payment reference (UTR / transaction id):`
      : `Pay ${usd(w.amountCents)} to ${w.userName} first, then write the payment reference (UTR / transaction id):`);
    if (ref === null) return;
    if (ref.trim().length < 3) return fail(new Error('Please write the payment reference.'));
    let agencyRef;
    if (p) {
      agencyRef = window.prompt(`2/2  Pay ${usd(p.agencyCents)} (${p.percent}% agency commission) by PayPal to ${p.paypalEmail} (agency ${p.agencyName}), then write the PayPal transaction id:`);
      if (agencyRef === null) return;
      if (agencyRef.trim().length < 3) return fail(new Error('Please write the PayPal payment reference of the agency commission.'));
    }
    setBusy(w.id);
    try {
      await api(`/admin/withdrawals/${w.id}/approve`, 'POST', { paymentRef: ref.trim(), ...(p ? { agencyPaymentRef: agencyRef.trim() } : {}) });
      ok(`Marked as paid: ${usd(w.amountCents)} (${w.userName}${p ? ` + agency commission ${usd(p.agencyCents)}` : ''}).`);
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

  if (!canEdit) return (
    <div className="gloss-page">
      <style>{GLOSS_CSS}</style>
      <div className="head"><h1>Withdrawals</h1></div>
      <p className="muted pad">Only a Super admin can handle withdrawals.</p>
    </div>
  );

  return (
    <div className="gloss-page">
      <style>{GLOSS_CSS}</style>
      <div className="head"><h1>Withdrawals</h1></div>
      <p className="muted small">
        When someone asks for a withdrawal the amount leaves their balance at once. Pay it with the details below, then press <b>Mark as paid</b> and write the payment
        reference. If the person is a host of an agency, the <b>agency commission</b> is shown separately: pay that part to the owner's PayPal and write its reference too. Reject if something is wrong: the money returns to the person. Every decision is saved in the audit log.
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
                <td>
                  <Details d={w.details} />
                  {w.agencyPayout && (
                    <div className="split-box">
                      <div>Host gets <b>{usd(w.agencyPayout.hostCents)}</b> (above)</div>
                      <div>Agency owner gets <b>{usd(w.agencyPayout.agencyCents)}</b> ({w.agencyPayout.percent}%) by <b>PayPal</b>:</div>
                      <div className="mono">{w.agencyPayout.paypalEmail}</div>
                      <div className="muted">{w.agencyPayout.agencyName}</div>
                      {w.agencyPayout.paymentRef && <div className="muted mono">Ref {w.agencyPayout.paymentRef}</div>}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`pill ${w.status === 'approved' ? 'active' : w.status === 'pending' ? 'suspended' : 'banned'}`}>{w.status === 'approved' ? 'paid' : w.status}</span>
                  {w.paymentRef && <div className="muted small mono">Ref {w.paymentRef}</div>}
                  {w.reason && <div className="muted small">{w.reason}</div>}
                  {w.decidedAt && <div className="muted small">{when(w.decidedAt)}</div>}
                </td>
                {status === 'pending' && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn sm" disabled={busy === w.id} onClick={() => approve(w)}>Mark as paid</button>
                    <button className="btn danger sm" disabled={busy === w.id} onClick={() => reject(w)}>Reject</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
