import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, doc, getDocs, limit, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const PAGE = 100;
const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString('en-IN') : '-');

// Keep true while the backend is not ready: "Remove Admin" only hides the row on screen, nothing is saved.
// When POST /admin/set-role exists on the backend, set it to false.
const PREVIEW_ONLY = true;

// The menus an admin can be allowed to open (the Admin page itself is always Super admin only).
const MENUS = ['Users', 'Agencies', 'Rooms', 'Banners', 'Posts', 'Reports', 'Economy', 'Coin Packages', 'VIP', 'Transactions', 'Salary Approval', 'Withdrawals', 'Host Policy'];

// Shows one sample row while the list is empty so you can try the permissions panel. Set to false to remove it.
const SHOW_DEMO = true;
const DEMO = { id: 'demo', name: 'Sample admin (preview)', userId: '000000', country: 'India', status: 'active', hostStatus: 'none', role: 'admin', permissions: ['Users', 'Rooms'] };

// The people who have staff access. Only a Super admin can see this page and remove an Admin.
export default function AdminAccess({ staff, role }) {
  const isSuper = role === 'super_admin';
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null); // which admin's menu access is open
  const [perms, setPerms] = useState({});     // unsaved checkbox choices, by admin id

  const load = useCallback(async () => {
    if (!isSuper) return setLoading(false);
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'super_admin']), limit(PAGE)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isSuper]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = text.trim().toLowerCase();
    return t ? rows.filter((u) => `${u.name || ''} ${u.userId || ''}`.toLowerCase().includes(t)) : rows;
  }, [rows, text]);

  // change one of the staff-controlled fields (status or hostStatus) and write an audit log
  const change = async (u, field, value, label) => {
    if (!window.confirm(`${label}: ${u.name} (ID ${u.userId})?`)) return;
    setBusyId(u.id);
    setError('');
    setNote('');
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

  const removeAdmin = async (u) => {
    if (!window.confirm(`Remove Admin access of ${u.name} (ID ${u.userId})?`)) return;
    setBusyId(u.id);
    setError('');
    setNote('');
    try {
      if (!PREVIEW_ONLY) await api('/admin/set-role', 'POST', { uid: u.id, role: 'user' });
      setRows((r) => r.filter((x) => x.id !== u.id));
      setNote(PREVIEW_ONLY
        ? `Preview only: ${u.name} is hidden from this list on this screen, but nothing was saved because the backend is not connected yet.`
        : `${u.name} is no longer an Admin. It applies the next time they sign in.`);
    } catch (e) {
      const m = String(e.message || e);
      setError(/cannot reach|failed to fetch|network|404|not found/i.test(m)
        ? 'This is not available yet: the backend is not connected or does not have this feature. Nothing was changed.'
        : m);
    } finally {
      setBusyId(null);
    }
  };

    // an admin with no saved list keeps the current behaviour: every menu
  const permsOf = (u) => perms[u.id] ?? u.permissions ?? MENUS;
  const togglePerm = (u, m) => {
    const cur = permsOf(u);
    setPerms((p) => ({ ...p, [u.id]: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] }));
  };
  const setAllPerms = (u, all) => setPerms((p) => ({ ...p, [u.id]: all ? [...MENUS] : [] }));

  // Needs a backend endpoint (not available yet): POST /admin/set-permissions  { uid, permissions: ['Users', ...] }
  const savePerms = async (u) => {
    const permissions = MENUS.filter((m) => permsOf(u).includes(m));
    setBusyId(u.id);
    setError('');
    setNote('');
    try {
      if (!PREVIEW_ONLY) await api('/admin/set-permissions', 'POST', { uid: u.id, permissions });
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, permissions } : x)));
      setNote(PREVIEW_ONLY
        ? `Preview only: ${u.name} has ${permissions.length} menu(s) on this screen, but nothing was saved because the backend is not connected yet.`
        : `Menu access of ${u.name} saved. It applies the next time they sign in.`);
    } catch (e) {
      const m = String(e.message || e);
      setError(/cannot reach|failed to fetch|network|404|not found/i.test(m)
        ? 'This is not available yet: the backend is not connected or does not have this feature. Nothing was changed.'
        : m);
    } finally {
      setBusyId(null);
    }
  };

  const list = !loading && shown.length === 0 && SHOW_DEMO && PREVIEW_ONLY && !text.trim() ? [DEMO] : shown;

  if (!isSuper) {
    return (<><div className="head"><h1>Admin</h1></div><p className="muted pad">Only a Super admin can manage Admins.</p></>);
  }

  return (
    <div className="ux-wrap">
      <style>{`
        /* ---------- HEADER + SEARCH ---------- */
        .ux-wrap .head { animation: ux-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .ux-wrap .head h1 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }

        .ux-wrap .search input {
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.16);
          background-color: rgba(255,255,255,0.05);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%);
          color: inherit;
          outline: none;
          box-shadow:
            inset 0 3px 8px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 1px 0 rgba(255,255,255,0.10);
          transition: border-color .25s, background-color .25s, box-shadow .25s, transform .25s;
        }
        .ux-wrap .search input::placeholder { color: inherit; opacity: 0.45; }
        .ux-wrap .search input:focus {
          border-color: rgba(255,255,255,0.5);
          background-color: rgba(255,255,255,0.09);
          transform: translateY(-1px);
          box-shadow:
            0 0 0 4px rgba(255,255,255,0.08),
            0 8px 22px -8px rgba(255,255,255,0.18),
            inset 0 3px 8px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }

        /* ---------- GLOSSY BUTTONS (theme color stays from .btn) ---------- */
        .ux-wrap .btn {
          position: relative;
          overflow: hidden;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.26);
          font-weight: 600;
          letter-spacing: 0.02em;
          background-image: linear-gradient(180deg,
            rgba(255,255,255,0.26) 0%,
            rgba(255,255,255,0.06) 49%,
            rgba(0,0,0,0.16) 51%,
            rgba(0,0,0,0.04) 100%);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          box-shadow:
            0 10px 20px -10px rgba(0,0,0,0.6),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 12px rgba(255,255,255,0.07);
          transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
        }
        .ux-wrap .btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .ux-wrap .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .ux-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 16px 28px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 16px rgba(255,255,255,0.12);
        }
        .ux-wrap .btn:hover:not(:disabled)::after { left: 150%; }
        .ux-wrap .btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 4px 10px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .ux-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ux-wrap .btn.sm { border-radius: 10px; }
        .ux-wrap .btn.sm::before { border-radius: 9px 9px 60% 60% / 9px 9px 30% 30%; }

        /* ---------- TABLE CARD ---------- */
        .ux-wrap .table-wrap {
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          background-image: linear-gradient(155deg,
            rgba(255,255,255,0.14) 0%,
            rgba(255,255,255,0.04) 30%,
            rgba(255,255,255,0) 55%,
            rgba(255,255,255,0.06) 100%);
          box-shadow:
            0 40px 80px -28px rgba(0,0,0,0.65),
            0 14px 30px rgba(0,0,0,0.28),
            0 0 0 1px rgba(0,0,0,0.25),
            inset 0 1.5px 0 rgba(255,255,255,0.42),
            inset 0 -1.5px 0 rgba(0,0,0,0.35),
            inset 0 0 40px rgba(255,255,255,0.035);
          animation: ux-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        .ux-wrap .table-wrap::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 120px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        .ux-spot {
          position: absolute;
          inset: 0;
          background: radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.10), transparent 60%);
          pointer-events: none;
        }

        .ux-wrap table { position: relative; border-collapse: separate; border-spacing: 0; width: 100%; }

        .ux-wrap thead th {
          position: relative;
          padding: 16px 14px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.85;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.12));
          border-bottom: 1px solid rgba(255,255,255,0.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.35);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }

        .ux-wrap tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 0 rgba(0,0,0,0.25);
          transition: background-color .25s ease;
        }
        .ux-wrap tbody tr { animation: ux-row .5s cubic-bezier(.2,.8,.2,1) both; }
        .ux-wrap tbody tr:nth-child(1) { animation-delay: .04s; }
        .ux-wrap tbody tr:nth-child(2) { animation-delay: .08s; }
        .ux-wrap tbody tr:nth-child(3) { animation-delay: .12s; }
        .ux-wrap tbody tr:nth-child(4) { animation-delay: .16s; }
        .ux-wrap tbody tr:nth-child(5) { animation-delay: .20s; }
        .ux-wrap tbody tr:nth-child(n+6) { animation-delay: .24s; }
        .ux-wrap tbody tr:nth-child(even) td { background-image: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)); }
        .ux-wrap tbody tr:hover td {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 0 rgba(0,0,0,0.25);
        }
        .ux-wrap tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.14); }
        .ux-wrap tbody tr:last-child td { border-bottom: 0; box-shadow: none; }

        /* ---------- AVATAR ---------- */
        .ux-wrap .who { display: flex; align-items: center; gap: 12px; }
        .ux-wrap .who img,
        .ux-wrap .who .av {
          position: relative;
          width: 40px; height: 40px;
          border-radius: 50%;
          object-fit: cover;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1.5px solid rgba(255,255,255,0.45);
          box-shadow:
            0 8px 18px rgba(0,0,0,0.45),
            0 0 0 2px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -2px 4px rgba(0,0,0,0.3);
        }
        .ux-wrap .who .av {
          font-weight: 700;
          text-transform: uppercase;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.16));
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }

        /* ---------- PILLS ---------- */
        .ux-wrap .pill {
          position: relative;
          overflow: hidden;
          display: inline-block;
          padding: 5px 13px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          border: 1px solid rgba(255,255,255,0.22);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.14) 51%, rgba(0,0,0,0.02) 100%);
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          box-shadow:
            0 4px 10px -4px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.5),
            inset 0 -1px 2px rgba(0,0,0,0.25);
        }

        /* ---------- ACTIONS / MISC ---------- */
        .ux-wrap .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .ux-wrap .mono { letter-spacing: 0.06em; }
        .ux-wrap .error.box {
          border-radius: 14px;
          background-color: rgba(255,70,70,0.10);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          border: 1px solid rgba(255,90,90,0.4);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5);
          animation: ux-shake .4s ease;
        }
        .ux-wrap .pad { padding: 28px 14px; text-align: center; letter-spacing: 0.04em; }
        .ux-load { animation: ux-pulse 1.4s ease-in-out infinite; }

                /* ---------- MENU ACCESS PANEL ---------- */
        .ux-wrap tbody tr.perm-row td { padding: 0 14px 18px; background-image: none; box-shadow: none; }
        .ux-wrap tbody tr.perm-row:hover td { background-image: none; box-shadow: none; }
        .ux-wrap .perm-box {
          border-radius: 18px;
          padding: 16px 18px;
          border: 1px solid rgba(255,255,255,0.16);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.10));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.4), 0 10px 24px -12px rgba(0,0,0,0.55);
        }
        .ux-wrap .perm-head, .ux-wrap .perm-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ux-wrap .perm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; margin: 14px 0; }
        .ux-wrap .perm-item {
          display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; user-select: none;
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.14);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 60%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -2px 5px rgba(0,0,0,0.25);
          transition: border-color .15s, background-image .15s;
        }
        .ux-wrap .perm-item:hover { border-color: rgba(255,255,255,0.3); }
        .ux-wrap .perm-item.on { border-color: rgba(244,197,66,0.55); background-image: linear-gradient(180deg, rgba(244,197,66,0.20), rgba(244,197,66,0.05) 60%); }
        .ux-wrap .perm-item input { width: 17px; height: 17px; accent-color: #f4c542; cursor: pointer; }

        @keyframes ux-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes ux-row { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes ux-pulse { 0%,100% { opacity: .45; } 50% { opacity: .9; } }
        @keyframes ux-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .ux-wrap .head, .ux-wrap .table-wrap, .ux-wrap tbody tr, .ux-load { animation: none; }
        }
      `}</style>

      <div className="head">
        <h1>Admin</h1>
        <form className="search" onSubmit={(e) => e.preventDefault()}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search admin by name or ID" />
          <button className="btn ghost" type="button" onClick={() => setText('')}>Reset</button>
        </form>
      </div>

      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}

      <div
        className="card table-wrap"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
        }}
      >
        <div className="ux-spot" />
        <table>
          <thead>
            <tr><th>Admin</th><th>User ID</th><th>Country</th><th>Status</th><th>Host</th><th>Joined</th><th>Actions</th></tr>
          </thead>
                    <tbody>
            {loading && <tr><td colSpan="7" className="muted pad ux-load">Loading...</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan="7" className="muted pad">No admins found.</td></tr>}
            {!loading && list.map((u) => {
              const status = u.status || 'active';
              const host = u.hostStatus || 'none';
              const self = u.id === staff.uid;
              const isSuperRow = u.role === 'super_admin';
              const demo = u.id === 'demo';
              const busy = busyId === u.id;
              const cur = permsOf(u);
              return (
                <Fragment key={u.id}>
                  <tr>
                    <td>
                      <div className="who">
                        {u.photoURL && u.photoURL.startsWith('http') ? <img src={u.photoURL} alt="" /> : <span className="av">{(u.name || '?')[0]}</span>}
                        <span>{u.name || '(no name)'}</span>
                        {isSuperRow && <span className="pill active">super admin</span>}
                      </div>
                    </td>
                    <td className="mono">{u.userId}</td>
                    <td>{u.country || '-'}</td>
                    <td><span className={`pill ${status}`}>{status}</span></td>
                    <td><span className="pill plain">{host}</span></td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div className="acts">
                        {!isSuperRow && (
                          <button className="btn sm" onClick={() => setOpenId(openId === u.id ? null : u.id)}>{openId === u.id ? 'Hide access' : 'Menu access'}</button>
                        )}
                        {demo && <span className="muted small">Preview row</span>}
                        {!demo && (
                          <>
                            {!self && !isSuperRow && status !== 'active' && (
                              <button className="btn sm" disabled={busy} onClick={() => change(u, 'status', 'active', 'Unban')}>Unban</button>
                            )}
                            {!self && !isSuperRow && status === 'active' && (
                              <>
                                <button className="btn sm ghost" disabled={busy} onClick={() => change(u, 'status', 'suspended', 'Suspend')}>Suspend</button>
                                <button className="btn sm danger" disabled={busy} onClick={() => change(u, 'status', 'banned', 'Ban')}>Ban</button>
                              </>
                            )}
                            {status === 'active' && host === 'approved' && !isSuperRow && (
                              <button className="btn sm ghost" disabled={busy} onClick={() => change(u, 'hostStatus', 'none', 'Remove host status of')}>Remove host</button>
                            )}
                            {!self && !isSuperRow && (
                              <button className="btn sm danger" disabled={busy} onClick={() => removeAdmin(u)}>Remove Admin</button>
                            )}
                            {host === 'pending' && <span className="muted small">Host request waiting</span>}
                            {self && <span className="muted small">you</span>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {openId === u.id && !isSuperRow && (
                    <tr className="perm-row">
                      <td colSpan="7">
                        <div className="perm-box">
                          <div className="perm-head">
                            <b>Menu access for {u.name || 'this admin'}</b>
                            <div className="acts">
                              <button className="btn sm ghost" type="button" onClick={() => setAllPerms(u, true)}>Select all</button>
                              <button className="btn sm ghost" type="button" onClick={() => setAllPerms(u, false)}>Clear</button>
                            </div>
                          </div>
                          <div className="perm-grid">
                            {MENUS.map((m) => (
                              <label key={m} className={`perm-item ${cur.includes(m) ? 'on' : ''}`}>
                                <input type="checkbox" checked={cur.includes(m)} onChange={() => togglePerm(u, m)} />
                                <span>{m}</span>
                              </label>
                            ))}
                          </div>
                          <div className="perm-foot">
                            <span className="muted small">{cur.length} of {MENUS.length} menus allowed</span>
                            <button className="btn sm" type="button" disabled={busy} onClick={() => savePerms(u)}>Save access</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Everyone listed here can open this panel. Only a Super admin can remove an Admin. Super admins cannot be changed from this page.
      </p>
    </div>
  );
}
