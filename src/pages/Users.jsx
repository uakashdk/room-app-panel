import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

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

// One "Actions" button that opens a glossy menu. The menu is drawn on top of the page, so the table can't clip it.
function ActionMenu({ items, disabled }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({});
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const toggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const right = document.documentElement.clientWidth - r.right;
      const below = window.innerHeight - r.bottom;
      const up = below < 240 && r.top > below; // not enough room below: open upwards
      setPos(up ? { right, bottom: window.innerHeight - r.top + 8 } : { right, top: r.bottom + 8 });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const outside = (e) => {
      if (btnRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) close(); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button type="button" ref={btnRef} className="btn sm am-btn" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        Actions
        <svg className="am-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && createPortal(
        <ul ref={listRef} className="am-list" role="menu" style={pos}>
          {items.map((it) => (
            <li key={it.label} role="menuitem" className={`am-item ${it.danger ? 'danger' : ''}`} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}

export default function Users({ staff, role }) {
  const isSuper = role === 'super_admin';
  const [note, setNote] = useState('');
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

    // Keep true while the backend is not ready: the button flips on screen only, nothing is saved.
  // When POST /admin/set-role exists on the backend, set it to false.
  const PREVIEW_ONLY = true;

  const setAdminRole = async (u, makeAdmin) => {
    const newRole = makeAdmin ? 'admin' : 'user';
    const question = makeAdmin
      ? `Make ${u.name} (ID ${u.userId}) an Admin? They will get access to this panel.`
      : `Remove Admin access of ${u.name} (ID ${u.userId})?`;
    if (!window.confirm(question)) return;
    setBusyId(u.id);
    setError('');
    setNote('');
    try {
      if (!PREVIEW_ONLY) await api('/admin/set-role', 'POST', { uid: u.id, role: newRole });
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
      setNote(PREVIEW_ONLY
        ? `Preview only: ${u.name} looks like ${makeAdmin ? 'an Admin' : 'a normal user'} on this screen, but nothing was saved because the backend is not connected yet.`
        : `${u.name} is ${makeAdmin ? 'now an Admin. They must sign out and sign in again to see the panel' : 'no longer an Admin. It applies the next time they sign in'}.`);
    } catch (e) {
      const m = String(e.message || e);
      setError(/cannot reach|failed to fetch|network|404|not found/i.test(m)
        ? 'This is not available yet: the backend is not connected or does not have this feature. Nothing was changed.'
        : m);
    } finally {
      setBusyId(null);
    }
  };

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
        /* curved glass reflection across the top of the card */
        .ux-wrap .table-wrap::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 120px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        /* cursor-following spotlight */
        .ux-spot {
          position: absolute;
          inset: 0;
          background: radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.10), transparent 60%);
          pointer-events: none;
        }

        .ux-wrap table { position: relative; border-collapse: separate; border-spacing: 0; width: 100%; }

        /* header row: glossy bar */
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

        /* body rows */
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

        /* ---------- PILLS (colors stay from your theme, gloss is layered) ---------- */
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

                /* ---------- ACTIONS DROPDOWN ---------- */
        .ux-wrap .am-btn { display: inline-flex; align-items: center; gap: 8px; padding-right: 12px; }
        .ux-wrap .am-chev { transition: transform .2s; position: relative; }
        .ux-wrap .am-btn[aria-expanded='true'] .am-chev { transform: rotate(180deg); }

        /* the open menu is drawn outside .ux-wrap, so these rules are global */
        .am-list {
          position: fixed; z-index: 1000; min-width: 190px; margin: 0; padding: 6px; list-style: none; color: #fff;
          border-radius: 16px; border: 1px solid rgba(255,255,255,0.22);
          background-color: #1a1028;
          background-image:
            radial-gradient(130% 30% at 50% -4%, rgba(255,255,255,0.20), rgba(255,255,255,0.04) 55%, transparent 75%),
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0) 40%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(0,0,0,0.5), 0 18px 40px rgba(0,0,0,0.6);
          animation: am-in .16s ease-out;
        }
        .am-item { padding: 10px 14px; border-radius: 10px; cursor: pointer; white-space: nowrap; font-weight: 600; letter-spacing: 0.02em; border: 1px solid transparent; }
        .am-item:hover {
          border-color: rgba(255,255,255,0.2);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0.05) 55%, rgba(0,0,0,0.08));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.32);
        }
        .am-item.danger { color: var(--danger, #ff6b7a); }
        .am-item.danger:hover { border-color: rgba(255,90,100,0.4); background-image: linear-gradient(180deg, rgba(255,90,100,0.22), rgba(255,90,100,0.06) 55%, rgba(0,0,0,0.08)); }
        @keyframes am-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

        @keyframes ux-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes ux-row { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes ux-pulse { 0%,100% { opacity: .45; } 50% { opacity: .9; } }
        @keyframes ux-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .ux-wrap .head, .ux-wrap .table-wrap, .ux-wrap tbody tr, .ux-load { animation: none; }
        }
      `}</style>

      <div className="head">
        <h1>Users</h1>
        <form className="search" onSubmit={(e) => { e.preventDefault(); load(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="6-digit User ID or name (starts with)" />
          <button className="btn" type="submit">Search</button>
          <button className="btn ghost" type="button" onClick={() => { setText(''); load(''); }}>Reset</button>
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
            <tr><th>User</th><th>User ID</th><th>Country</th><th>Status</th><th>Host</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="muted pad ux-load">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan="7" className="muted pad">No users found.</td></tr>}
            {!loading && rows.map((u) => {
              const status = u.status || 'active';
              const host = u.hostStatus || 'none';
              const self = u.id === staff.uid;
              const busy = busyId === u.id;
              const items = [];
              if (!self && status !== 'active') items.push({ label: 'Unban', onClick: () => change(u, 'status', 'active', 'Unban') });
              if (!self && status === 'active') {
                items.push({ label: 'Suspend', onClick: () => change(u, 'status', 'suspended', 'Suspend') });
                items.push({ label: 'Ban', danger: true, onClick: () => change(u, 'status', 'banned', 'Ban') });
              }
              if (status === 'active' && host === 'approved') items.push({ label: 'Remove host', onClick: () => change(u, 'hostStatus', 'none', 'Remove host status of') });
              if (isSuper && !self && u.role !== 'super_admin') {
                items.push(u.role === 'admin'
                  ? { label: 'Remove Admin', danger: true, onClick: () => setAdminRole(u, false) }
                  : { label: 'Make Admin', onClick: () => setAdminRole(u, true) });
              }
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
                      {items.length > 0 && <ActionMenu items={items} disabled={busy} />}
                      {isSuper && !self && u.role === 'super_admin' && <span className="muted small">Super admin</span>}
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
    </div>
  );
}
