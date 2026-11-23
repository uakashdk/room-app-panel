import { useCallback, useEffect, useState } from 'react';
import {
  addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';

const PAGE = 50;

function buildQuery(text) {
  const users = collection(db, 'users');
  const t = text.trim();
  if (!t) return query(users, orderBy('createdAt', 'desc'), limit(PAGE));
  if (/^\d{6}$/.test(t)) return query(users, where('userId', '==', t), limit(PAGE)); // exact User ID
  // name starts with (case sensitive; Firestore has no "contains")
  return query(users, orderBy('name'), where('name', '>=', t), where('name', '<=', t + '\uf8ff'), limit(PAGE));
}

const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString('en-IN') : '-');

export default function Users({ staff }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (t) => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(buildQuery(t));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  // change one of the staff-controlled fields (status or hostStatus) and write an audit log
  const change = async (u, field, value, label) => {
    if (!window.confirm(`${label}: ${u.name} (ID ${u.userId})?`)) return;
    setBusyId(u.id);
    setError('');
    try {
      await updateDoc(doc(db, 'users', u.id), { [field]: value });
      await addDoc(collection(db, 'admin_logs'), {
        actorUid: staff.uid, actorEmail: staff.email, action: `set_${field}`,
        targetUid: u.id, targetUserId: u.userId, from: u[field] || null, to: value, at: serverTimestamp(),
      });
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, [field]: value } : x)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="head">
        <h1>Users</h1>
        <form className="search" onSubmit={(e) => { e.preventDefault(); load(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="6-digit User ID or name (starts with)" />
          <button className="btn" type="submit">Search</button>
          <button className="btn ghost" type="button" onClick={() => { setText(''); load(''); }}>Reset</button>
        </form>
      </div>

      {error && <div className="error box">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>User ID</th><th>Country</th><th>Status</th><th>Host</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="muted pad">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan="7" className="muted pad">No users found.</td></tr>}
            {!loading && rows.map((u) => {
              const status = u.status || 'active';
              const host = u.hostStatus || 'none';
              const self = u.id === staff.uid;
              const busy = busyId === u.id;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="who">
                      {u.photoURL && u.photoURL.startsWith('http') ? <img src={u.photoURL} alt="" /> : <span className="av">{(u.name || '?')[0]}</span>}
                      <span>{u.name || '(no name)'}</span>
                    </div>
                  </td>
                  <td className="mono">{u.userId}</td>
                  <td>{u.country || '-'}</td>
                  <td><span className={`pill ${status}`}>{status}</span></td>
                  <td><span className="pill plain">{host}</span></td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="acts">
                      {!self && status !== 'active' && (
                        <button className="btn sm" disabled={busy} onClick={() => change(u, 'status', 'active', 'Unban')}>Unban</button>
                      )}
                      {!self && status === 'active' && (
                        <>
                          <button className="btn sm ghost" disabled={busy} onClick={() => change(u, 'status', 'suspended', 'Suspend')}>Suspend</button>
                          <button className="btn sm danger" disabled={busy} onClick={() => change(u, 'status', 'banned', 'Ban')}>Ban</button>
                        </>
                      )}
                      {/* nobody becomes a host here: a person applies to an agency and the agency owner approves (Agencies page) */}
                      {status === 'active' && host === 'approved' && (
                        <button className="btn sm ghost" disabled={busy} onClick={() => change(u, 'hostStatus', 'none', 'Remove host status of')}>Remove host</button>
                      )}
                      {host === 'pending' && <span className="muted small">Host request waiting</span>}
                      {self && <span className="muted small">you</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Showing up to {PAGE} users. "Make host" is a temporary shortcut so Top Hosts has data; the real host application and approval flow comes later.
      </p>
    </>
  );
}
