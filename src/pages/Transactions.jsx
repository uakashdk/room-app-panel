import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

const TYPES = ['all', 'admin_grant', 'admin_deduct', 'gift_sent', 'gift_received', 'recharge', 'recharge_bonus', 'vip_purchase', 'refund'];

// The money ledger (wallet_transactions): read only, nobody can edit these records.
export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(100);
  const [type, setType] = useState('all');
  const [userIdText, setUserIdText] = useState('');
  const [uidFilter, setUidFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'wallet_transactions'), orderBy('createdAt', 'desc'), limit(count)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [count]);
  useEffect(() => { load(); }, [load]);

  // search by the 6-digit User ID: find the uid, then filter the loaded list
  const findUser = async (e) => {
    e.preventDefault();
    setError('');
    const t = userIdText.trim();
    if (!t) return setUidFilter(null);
    if (!/^[0-9]{6}$/.test(t)) return setError('User ID is 6 digits.');
    try {
      const s = await getDoc(doc(db, 'userIds', t));
      if (!s.exists()) { setUidFilter('none'); return setError(`No user has the ID ${t}.`); }
      setUidFilter(s.data().uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const shown = useMemo(
    () => rows.filter((r) => (type === 'all' || r.type === type) && (!uidFilter || r.uid === uidFilter)),
    [rows, type, uidFilter],
  );

  return (
    <>
      <div className="head">
        <h1>Transactions</h1>
        <div className="search">
          <form className="search" onSubmit={findUser}>
            <input placeholder="User ID (6 digits)" value={userIdText} onChange={(e) => setUserIdText(e.target.value)} style={{ width: 170 }} />
            <button className="btn ghost" type="submit">Find</button>
          </form>
          <select className="btn ghost" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select className="btn ghost" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[100, 300, 500].map((n) => <option key={n} value={n}>Latest {n}</option>)}
          </select>
        </div>
      </div>
      <p className="muted small">Every coin or diamond change is written here by the server. Records cannot be edited or deleted.</p>
      {error && <div className="error box">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Type</th><th>User (uid)</th><th>Amount</th><th>Balance after</th><th>Note / ref</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="muted pad">Loading...</td></tr>}
            {!loading && shown.length === 0 && <tr><td colSpan={6} className="muted pad">No records.</td></tr>}
            {!loading && shown.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '-'}</td>
                <td><span className="pill plain">{r.type}</span></td>
                <td className="mono small">{String(r.uid || '').slice(0, 10)}…</td>
                <td style={{ color: r.amount >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
                  {r.amount >= 0 ? '+' : ''}{Number(r.amount).toLocaleString()} {r.currency === 'diamonds' ? '💎' : '🪙'}
                </td>
                <td>{Number(r.balanceAfter ?? 0).toLocaleString()}</td>
                <td className="small muted">{r.note || r.refId || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
