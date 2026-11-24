import { useCallback, useEffect, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';

const fmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

// Reports sent by users. Staff delete the content or dismiss the report.
export default function Reports({ staff }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'reports'), where('status', '==', 'open'), limit(100)));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // show the reported post's text next to each report
      const withPosts = await Promise.all(
        list.map(async (r) => {
          if (r.type !== 'post') return r;
          const p = await getDoc(doc(db, 'posts', r.targetId));
          return { ...r, postText: p.exists() ? p.data().text : null, postAuthor: p.exists() ? p.data().authorName : '' };
        }),
      );
      setRows(withPosts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const resolve = async (r, status, alsoDeletePost) => {
    try {
      if (alsoDeletePost) await deleteDoc(doc(db, 'posts', r.targetId));
      await updateDoc(doc(db, 'reports', r.id), { status, resolvedBy: staff.uid, resolvedAt: serverTimestamp() });
      await addDoc(collection(db, 'admin_logs'), {
        actorUid: staff.uid, actorEmail: staff.email, action: alsoDeletePost ? 'report_delete_post' : 'report_dismiss',
        collection: 'reports', targetId: r.id, at: serverTimestamp(),
      });
      setRows((x) => x.filter((y) => y.id !== r.id));
      setNotice(alsoDeletePost ? 'Post deleted' : 'Report dismissed');
    } catch (e) {
      setError(e.message);
    }
  };

    return (
    <div className="rp-wrap">
      <style>{`
        /* ---------- HEADER ---------- */
        .rp-wrap .head { animation: rp-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .rp-wrap .head h1 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }
        .rp-wrap p.muted.small { line-height: 1.6; }

        /* ---------- GLASS CARD ---------- */
        .rp-wrap .card {
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
          animation: rp-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        .rp-wrap .card::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 110px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        .rp-wrap .card > * { position: relative; }

        /* ---------- GLOSSY BUTTONS (theme color stays from .btn) ---------- */
        .rp-wrap .btn {
          position: relative;
          overflow: hidden;
          cursor: pointer;
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
        .rp-wrap .btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .rp-wrap .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .rp-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 16px 28px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 16px rgba(255,255,255,0.12);
        }
        .rp-wrap .btn:hover:not(:disabled)::after { left: 150%; }
        .rp-wrap .btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 4px 10px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .rp-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rp-wrap .btn:not(.sm) { padding: 12px 22px; }
        .rp-wrap .btn.sm { border-radius: 10px; }
        .rp-wrap .btn.sm::before { border-radius: 9px 9px 60% 60% / 9px 9px 30% 30%; }

        /* ---------- TABLE ---------- */
        .rp-wrap table { position: relative; border-collapse: separate; border-spacing: 0; width: 100%; }
        .rp-wrap thead th {
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
        .rp-wrap tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 0 rgba(0,0,0,0.25);
          transition: background-color .25s ease;
        }
        .rp-wrap tbody tr { animation: rp-row .5s cubic-bezier(.2,.8,.2,1) both; }
        .rp-wrap tbody tr:nth-child(1) { animation-delay: .04s; }
        .rp-wrap tbody tr:nth-child(2) { animation-delay: .08s; }
        .rp-wrap tbody tr:nth-child(3) { animation-delay: .12s; }
        .rp-wrap tbody tr:nth-child(4) { animation-delay: .16s; }
        .rp-wrap tbody tr:nth-child(5) { animation-delay: .20s; }
        .rp-wrap tbody tr:nth-child(n+6) { animation-delay: .24s; }
        .rp-wrap tbody tr:nth-child(even) td { background-image: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)); }
        .rp-wrap tbody tr:hover td {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 0 rgba(0,0,0,0.25);
        }
        .rp-wrap tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.14); }
        .rp-wrap tbody tr:last-child td { border-bottom: 0; box-shadow: none; }
        .rp-wrap .pad { padding: 28px 14px; text-align: center; letter-spacing: 0.04em; }
        .rp-wrap .mono { letter-spacing: 0.06em; }

        /* ---------- PILLS / ACTIONS ---------- */
        .rp-wrap .pill {
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
          box-shadow: 0 4px 10px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.25);
        }
        .rp-wrap .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

        /* ---------- MESSAGES ---------- */
        .rp-wrap .box {
          position: relative;
          margin-bottom: 16px;
          padding: 13px 16px;
          border-radius: 14px;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5);
          animation: rp-rise .4s ease both;
        }
        .rp-wrap .error.box { background-color: rgba(255,70,70,0.10); border: 1px solid rgba(255,90,90,0.4); animation: rp-shake .4s ease; }

        /* ---------- GLOSSY SCROLLBAR ---------- */
        .rp-wrap .table-wrap {
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.35) transparent;
        }
        .rp-wrap .table-wrap::-webkit-scrollbar { height: 14px; }
        .rp-wrap .table-wrap::-webkit-scrollbar-track {
          margin: 0 22px;
          border-radius: 999px;
          background-color: rgba(0,0,0,0.25);
          background-image: linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.04));
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08);
        }
        .rp-wrap .table-wrap::-webkit-scrollbar-thumb {
          border-radius: 999px;
          border: 3px solid transparent;
          background-clip: padding-box;
          background-color: rgba(255,255,255,0.14);
          background-image: linear-gradient(180deg,
            rgba(255,255,255,0.45) 0%,
            rgba(255,255,255,0.12) 49%,
            rgba(0,0,0,0.18) 51%,
            rgba(255,255,255,0.06) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.3);
        }
        .rp-wrap .table-wrap::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.24); }
        .rp-wrap .table-wrap::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        .rp-wrap .table-wrap::-webkit-scrollbar-corner { background: transparent; }

        @keyframes rp-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes rp-row { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes rp-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .rp-wrap .head, .rp-wrap .card, .rp-wrap tbody tr, .rp-wrap .box { animation: none; }
        }
      `}</style>

      <div className="head">
        <div>
          <h1>Reports</h1>
          <p className="muted small">Open reports from users. Delete the post, or dismiss the report if the post is fine.</p>
        </div>
        <button className="btn ghost" onClick={load}>Refresh</button>
      </div>
      {error && <div className="error box">{error}</div>}
      {notice && <div className="box" style={{ color: '#7ff0b8', background: '#10261c', borderColor: '#2c6b4c' }}>{notice}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Type</th><th>Reported content</th><th>Reason</th><th>Reported</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="muted pad">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan="5" className="muted pad">No open reports. Everything is clean.</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id}>
                <td><span className="pill plain">{r.type}</span></td>
                <td style={{ maxWidth: 360 }}>
                  {r.type === 'post'
                    ? (r.postText ? <><b>{r.postAuthor}:</b> {r.postText}</> : <span className="muted">Post already deleted</span>)
                    : <span className="mono small">{r.targetId}</span>}
                </td>
                <td><b>{r.reason}</b></td>
                <td className="muted small">{fmt(r.createdAt)}</td>
                <td>
                  <div className="acts">
                    {r.type === 'post' && r.postText && <button className="btn sm danger" onClick={() => resolve(r, 'resolved', true)}>Delete post</button>}
                    <button className="btn sm ghost" onClick={() => resolve(r, 'dismissed', false)}>Dismiss</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // return (
  //   <>
  //     <div className="head">
  //       <div>
  //         <h1>Reports</h1>
  //         <p className="muted small">Open reports from users. Delete the post, or dismiss the report if the post is fine.</p>
  //       </div>
  //       <button className="btn ghost" onClick={load}>Refresh</button>
  //     </div>
  //     {error && <div className="error box">{error}</div>}
  //     {notice && <div className="box" style={{ color: '#7ff0b8', background: '#10261c', borderColor: '#2c6b4c' }}>{notice}</div>}

  //     <div className="card table-wrap">
  //       <table>
  //         <thead>
  //           <tr><th>Type</th><th>Reported content</th><th>Reason</th><th>Reported</th><th>Actions</th></tr>
  //         </thead>
  //         <tbody>
  //           {loading && <tr><td colSpan="5" className="muted pad">Loading...</td></tr>}
  //           {!loading && rows.length === 0 && <tr><td colSpan="5" className="muted pad">No open reports. Everything is clean.</td></tr>}
  //           {!loading && rows.map((r) => (
  //             <tr key={r.id}>
  //               <td><span className="pill plain">{r.type}</span></td>
  //               <td style={{ maxWidth: 360 }}>
  //                 {r.type === 'post'
  //                   ? (r.postText ? <><b>{r.postAuthor}:</b> {r.postText}</> : <span className="muted">Post already deleted</span>)
  //                   : <span className="mono small">{r.targetId}</span>}
  //               </td>
  //               <td><b>{r.reason}</b></td>
  //               <td className="muted small">{fmt(r.createdAt)}</td>
  //               <td>
  //                 <div className="acts">
  //                   {r.type === 'post' && r.postText && <button className="btn sm danger" onClick={() => resolve(r, 'resolved', true)}>Delete post</button>}
  //                   <button className="btn sm ghost" onClick={() => resolve(r, 'dismissed', false)}>Dismiss</button>
  //                 </div>
  //               </td>
  //             </tr>
  //           ))}
  //         </tbody>
  //       </table>
  //     </div>
  //   </>
  // );
}
