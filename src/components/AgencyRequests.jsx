import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

/** "Create my own agency" requests from the app: look at the details and documents, then approve (the agency is created) or reject. */
export default function AgencyRequests({ onChanged }) {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // the request in the detail window
  const [files, setFiles] = useState(null);
  const [commission, setCommission] = useState('10');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const fail = (e) => { setNote(''); setError(e.message || String(e)); };
  const ok = (m) => { setError(''); setNote(m); };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems((await api(`/admin/agency-applications?status=${status}`)).items || []);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const show = async (r) => {
    setOpen(r);
    setFiles(null);
    setCommission('10');
    try {
      setFiles(await api(`/admin/agency-applications/${r.uid}`));
    } catch (e) {
      fail(e);
    }
  };

  const decide = async (decision) => {
    let reason = '';
    if (decision === 'reject') {
      reason = window.prompt('Reason for rejecting (the person can see it in the app):');
      if (reason === null) return;
      if (reason.trim().length < 3) return fail(new Error('Please write a short reason.'));
    } else {
      const pct = Number(commission);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) return fail(new Error('Commission must be between 0 and 100.'));
      if (!window.confirm(`Approve "${open.agencyName}"? The agency is created now and ${open.ownerName} becomes its owner (commission ${pct}%).`)) return;
    }
    setBusy(true);
    try {
      const r = await api(`/admin/agency-applications/${open.uid}/decision`, 'POST', { decision, reason: reason.trim(), commissionPercent: Number(commission) });
      ok(decision === 'approve' ? `Agency created. Its Agency ID is ${r.agencyId}. Open Agencies -> Targets to set its targets.` : 'Request rejected.');
      setOpen(null);
      await load();
      onChanged?.();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="muted small">
        A user can ask for his own agency in the app (Become a host &rarr; Create my agency). Check the details and the documents, then approve or reject. Only an approved request creates the agency.
      </p>
      <div className="tabs">
        {['pending', 'approved', 'rejected'].map((s) => (
          <a key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)}</a>
        ))}
      </div>
      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Applicant</th><th>Agency name</th><th>Email / phone</th><th>Docs</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="muted pad">Loading...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="muted pad">No {status} agency requests.</td></tr>}
            {!loading && items.map((r) => (
              <tr key={r.uid}>
                <td className="small">{when(r.createdAt)}</td>
                <td><b>{r.ownerName}</b><div className="muted small">User ID {r.userId}</div></td>
                <td>{r.agencyName}{r.agencyId && <div className="muted small">Agency ID {r.agencyId}</div>}</td>
                <td className="small">{r.email}<div className="muted">{r.phone}</div></td>
                <td>{r.documentCount}</td>
                <td>
                  <span className={`pill ${r.status === 'approved' ? 'active' : r.status === 'pending' ? 'suspended' : 'banned'}`}>{r.status}</span>
                  {r.reason && <div className="muted small">{r.reason}</div>}
                </td>
                <td><button className="btn sm" onClick={() => show(r)}>{r.status === 'pending' ? 'Review' : 'View'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-back" onClick={() => !busy && setOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Agency request: {open.agencyName}</h2>
              <button className="btn ghost sm" onClick={() => setOpen(null)}>Close</button>
            </div>
            {!files && <p className="muted pad">Loading pictures...</p>}
            {files?.logo && <img className="logo-img" src={files.logo} alt="Agency logo" />}
            <div className="kv">
              <span>Applicant name</span><b>{open.ownerName}</b>
              <span>App account</span><span>{open.userName} (User ID {open.userId})</span>
              <span>Agency name</span><b>{open.agencyName}</b>
              <span>Email</span><span>{open.email}</span>
              <span>Phone</span><span>{open.phone}</span>
              <span>PayPal email</span><span>{open.paypalEmail}</span>
              <span>Sent</span><span>{when(open.createdAt)}</span>
            </div>
            <b>Documents</b>
            <div className="docs">
              {files?.documents?.length === 0 && <span className="muted small">No documents.</span>}
              {files?.documents?.map((d, i) => (<a key={i} href={d} target="_blank" rel="noreferrer"><img src={d} alt={`Document ${i + 1}`} /></a>))}
            </div>
            {open.status === 'pending' && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <label className="field">
                  <span>Agency commission % (taken from host withdrawals)</span>
                  <input type="number" min="0" max="100" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} style={{ width: 160 }} />
                </label>
                <button className="btn" disabled={busy} onClick={() => decide('approve')}>Approve and create agency</button>
                <button className="btn danger" disabled={busy} onClick={() => decide('reject')}>Reject</button>
              </div>
            )}
            {open.status !== 'pending' && <p className="muted small">Decided {when(open.decidedAt)}. {open.reason || ''}</p>}
          </div>
        </div>
      )}
    </>
  );
}
