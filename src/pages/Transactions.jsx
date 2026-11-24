import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

const TYPES = ['all', 'admin_grant', 'admin_deduct', 'gift_sent', 'gift_received', 'recharge', 'recharge_bonus', 'vip_purchase', 'refund'];

function GlossSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const cur = options.find((o) => o.value === value);
  return (
    <div className="gsel" ref={ref}>
      <button type="button" className="btn ghost gsel-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{cur ? cur.label : ''}</span><i className="gsel-chev" />
      </button>
      {open && (
        <ul className="gsel-list" role="listbox">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={`gsel-opt ${o.value === value ? 'on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const GLOSS = `
/* glossy finish: same colours, only sheen + highlights (scoped to the Transactions page) */
.txx h1 { text-shadow: 0 2px 14px rgba(244,197,66,.10); }

/* table card: curved light sheen at the top, glass edge */
.txx .card {
  border: 1px solid rgba(255,255,255,.2);
  background-image:
    radial-gradient(120% 38% at 50% -6%, rgba(255,255,255,.17), rgba(255,255,255,.04) 55%, transparent 72%),
    linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,0) 40%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.5), 0 14px 34px rgba(0,0,0,.45);
}

/* header row */
.txx thead th {
  background-image: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.03));
  border-bottom: 1px solid rgba(255,255,255,.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22);
}
.txx tbody td { border-bottom: 1px solid rgba(255,255,255,.07); }
.txx tbody tr:hover td { background-image: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.01)); }

/* type pill */
.txx .pill.plain {
  border: 1px solid rgba(255,255,255,.22);
  background-image: linear-gradient(180deg, rgba(255,255,255,.26) 0%, rgba(255,255,255,.06) 50%, rgba(0,0,0,.14) 51%, rgba(0,0,0,.02) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 2px rgba(0,0,0,.25), 0 3px 8px rgba(0,0,0,.3);
}

/* search box */
.txx .search input {
  border-radius: 14px; border: 1px solid rgba(255,255,255,.2); outline: none;
  background-image: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02) 60%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -2px 6px rgba(0,0,0,.35), 0 3px 10px rgba(0,0,0,.25);
  transition: border-color .15s, box-shadow .15s;
}
.txx .search input:focus { border-color: var(--gold, #f4c542); box-shadow: inset 0 -2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(244,197,66,.16); }

/* Find button + dropdowns: same glossy split as the sidebar buttons */
.txx .btn.ghost {
  border-radius: 14px; cursor: pointer; border: 1px solid rgba(255,255,255,.26);
  background-image: linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.07) 49%, rgba(0,0,0,.16) 51%, rgba(0,0,0,.04) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 -3px 6px rgba(0,0,0,.28), 0 8px 18px -8px rgba(0,0,0,.6);
  transition: transform .15s, filter .15s, border-color .15s;
}
.txx .btn.ghost:hover { transform: translateY(-1px); filter: brightness(1.1); }
.txx .btn.ghost:active { transform: translateY(1px); }

.txx select.btn.ghost {
  -webkit-appearance: none; appearance: none; padding-right: 38px;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23f4c542' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
    linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.07) 49%, rgba(0,0,0,.16) 51%, rgba(0,0,0,.04) 100%);
  background-repeat: no-repeat, no-repeat; background-position: right 13px center, 0 0; background-size: 14px 14px, 100% 100%;
}
.txx select.btn.ghost:focus { outline: none; border-color: var(--gold, #f4c542); }
.txx select option { background: #1a1028; color: #fff; }

/* ===== glossy custom dropdown ===== */
.txx .gsel { position: relative; display: inline-block; }
.txx .gsel-btn { display: inline-flex; align-items: center; gap: 10px; padding-right: 38px; text-align: left; position: relative; }
.txx .gsel-chev {
  position: absolute; right: 13px; top: 50%; width: 14px; height: 14px; margin-top: -7px; pointer-events: none; transition: transform .2s;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23f4c542' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat center / 14px 14px;
}
.txx .gsel-btn[aria-expanded='true'] { border-color: var(--gold, #f4c542); }
.txx .gsel-btn[aria-expanded='true'] .gsel-chev { transform: rotate(180deg); }

.txx .gsel-list {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; min-width: 100%; max-height: 320px; overflow-y: auto; margin: 0; padding: 6px; list-style: none;
  border-radius: 16px; border: 1px solid rgba(255,255,255,.22);
  background-color: #1a1028;
  background-image:
    radial-gradient(130% 30% at 50% -4%, rgba(255,255,255,.2), rgba(255,255,255,.04) 55%, transparent 75%),
    linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 40%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.38), inset 0 -1px 0 rgba(0,0,0,.5), 0 18px 40px rgba(0,0,0,.6);
  animation: gselIn .16s ease-out;
}
.txx .gsel-opt { padding: 9px 14px; border-radius: 10px; cursor: pointer; white-space: nowrap; border: 1px solid transparent; transition: background .12s; }
.txx .gsel-opt:hover {
  border-color: rgba(255,255,255,.18);
  background-image: linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 55%, rgba(0,0,0,.08));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
}
.txx .gsel-opt.on {
  color: var(--gold, #f4c542); font-weight: 700; border-color: rgba(255,255,255,.3);
  background-image: linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.07) 49%, rgba(0,0,0,.18) 51%, rgba(0,0,0,.04) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 4px rgba(0,0,0,.3), 0 4px 10px -4px rgba(0,0,0,.5);
}
@keyframes gselIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
`;

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
    <> <style>{GLOSS}</style><div className="txx">
        <div className="head">
        <h1>Transactions</h1>
        <div className="search">
          <form className="search" onSubmit={findUser}>
            <input placeholder="User ID (6 digits)" value={userIdText} onChange={(e) => setUserIdText(e.target.value)} style={{ width: 170 }} />
            <button className="btn ghost" type="submit">Find</button>
          </form>
              <GlossSelect value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: t }))} />
             <GlossSelect value={count} onChange={setCount} options={[100, 300, 500].map((n) => ({ value: n, label: `Latest ${n}` }))} />
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
    </div></>
  );
}
