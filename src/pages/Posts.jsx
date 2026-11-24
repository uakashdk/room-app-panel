import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const fmt = (ts) =>
  ts?.toDate
    ? ts
        .toDate()
        .toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "-";

// Moderation: see the latest posts and remove the ones that break the rules
export default function Posts({ staff }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(
        query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50)),
      );
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const remove = async (p) => {
    if (
      !window.confirm(
        `Delete this post by ${p.authorName}? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "posts", p.id));
      await addDoc(collection(db, "admin_logs"), {
        actorUid: staff.uid,
        actorEmail: staff.email,
        action: "delete_post",
        collection: "posts",
        targetId: p.id,
        targetUid: p.authorUid,
        at: serverTimestamp(),
      });
      setRows((r) => r.filter((x) => x.id !== p.id));
      setNotice("Post deleted");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="ps-wrap">
      <style>{`
        /* ---------- HEADER ---------- */
        .ps-wrap .head { animation: ps-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .ps-wrap .head h1 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }
        .ps-wrap p.muted.small { line-height: 1.6; }

        /* ---------- GLASS CARD ---------- */
        .ps-wrap .card {
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
          animation: ps-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        .ps-wrap .card::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 110px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        .ps-wrap .card > * { position: relative; }

        /* ---------- GLOSSY BUTTONS (theme color stays from .btn) ---------- */
        .ps-wrap .btn {
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
        .ps-wrap .btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .ps-wrap .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .ps-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 16px 28px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 16px rgba(255,255,255,0.12);
        }
        .ps-wrap .btn:hover:not(:disabled)::after { left: 150%; }
        .ps-wrap .btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 4px 10px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .ps-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ps-wrap .btn:not(.sm) { padding: 12px 22px; }
        .ps-wrap .btn.sm { border-radius: 10px; }
        .ps-wrap .btn.sm::before { border-radius: 9px 9px 60% 60% / 9px 9px 30% 30%; }

        /* ---------- TABLE ---------- */
        .ps-wrap table { position: relative; border-collapse: separate; border-spacing: 0; width: 100%; }
        .ps-wrap thead th {
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
        .ps-wrap tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 0 rgba(0,0,0,0.25);
          transition: background-color .25s ease;
        }
        .ps-wrap tbody tr { animation: ps-row .5s cubic-bezier(.2,.8,.2,1) both; }
        .ps-wrap tbody tr:nth-child(1) { animation-delay: .04s; }
        .ps-wrap tbody tr:nth-child(2) { animation-delay: .08s; }
        .ps-wrap tbody tr:nth-child(3) { animation-delay: .12s; }
        .ps-wrap tbody tr:nth-child(4) { animation-delay: .16s; }
        .ps-wrap tbody tr:nth-child(5) { animation-delay: .20s; }
        .ps-wrap tbody tr:nth-child(n+6) { animation-delay: .24s; }
        .ps-wrap tbody tr:nth-child(even) td { background-image: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)); }
        .ps-wrap tbody tr:hover td {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 0 rgba(0,0,0,0.25);
        }
        .ps-wrap tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.14); }
        .ps-wrap tbody tr:last-child td { border-bottom: 0; box-shadow: none; }
        .ps-wrap .pad { padding: 28px 14px; text-align: center; letter-spacing: 0.04em; }

        /* ---------- MESSAGES ---------- */
        .ps-wrap .box {
          position: relative;
          margin-bottom: 16px;
          padding: 13px 16px;
          border-radius: 14px;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5);
          animation: ps-rise .4s ease both;
        }
        .ps-wrap .error.box { background-color: rgba(255,70,70,0.10); border: 1px solid rgba(255,90,90,0.4); animation: ps-shake .4s ease; }

        @keyframes ps-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes ps-row { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes ps-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .ps-wrap .head, .ps-wrap .card, .ps-wrap tbody tr, .ps-wrap .box { animation: none; }
        }

        /* ================= GLOSSY SCROLLBAR ================= */
.ps-wrap .table-wrap {
  overflow-x: auto;
  scrollbar-width: thin;                                   /* Firefox */
  scrollbar-color: rgba(255,255,255,0.35) transparent;     /* Firefox */
}

/* Chrome / Edge / Safari */
.ps-wrap .table-wrap::-webkit-scrollbar { height: 14px; }

.ps-wrap .table-wrap::-webkit-scrollbar-track {
  margin: 0 22px;
  border-radius: 999px;
  background-color: rgba(0,0,0,0.25);
  background-image: linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.04));
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08);
}

.ps-wrap .table-wrap::-webkit-scrollbar-thumb {
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
.ps-wrap .table-wrap::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255,255,255,0.24);
}

/* the arrow buttons and corner that show as white boxes */
.ps-wrap .table-wrap::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
.ps-wrap .table-wrap::-webkit-scrollbar-corner { background: transparent; }

      `}</style>

      <div className="head">
        <div>
          <h1>Posts</h1>
          <p className="muted small">
            The latest 50 posts from the Feed. Delete posts that break the
            rules.
          </p>
        </div>
        <button className="btn ghost" onClick={load}>
          Refresh
        </button>
      </div>
      {error && <div className="error box">{error}</div>}
      {notice && (
        <div
          className="box"
          style={{
            color: "#7ff0b8",
            background: "#10261c",
            borderColor: "#2c6b4c",
          }}
        >
          {notice}
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Author</th>
              <th>Post</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="muted pad">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="6" className="muted pad">
                  No posts yet. Posts created in the app appear here.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.authorName}</b>
                  </td>
                  <td style={{ maxWidth: 380 }}>{p.text}</td>
                  <td>{p.likeCount ?? 0}</td>
                  <td>{p.commentCount ?? 0}</td>
                  <td className="muted small">{fmt(p.createdAt)}</td>
                  <td>
                    <button className="btn sm danger" onClick={() => remove(p)}>
                      Delete
                    </button>
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
  //         <h1>Posts</h1>
  //         <p className="muted small">The latest 50 posts from the Feed. Delete posts that break the rules.</p>
  //       </div>
  //       <button className="btn ghost" onClick={load}>Refresh</button>
  //     </div>
  //     {error && <div className="error box">{error}</div>}
  //     {notice && <div className="box" style={{ color: '#7ff0b8', background: '#10261c', borderColor: '#2c6b4c' }}>{notice}</div>}

  //     <div className="card table-wrap">
  //       <table>
  //         <thead>
  //           <tr><th>Author</th><th>Post</th><th>Likes</th><th>Comments</th><th>Posted</th><th>Actions</th></tr>
  //         </thead>
  //         <tbody>
  //           {loading && <tr><td colSpan="6" className="muted pad">Loading...</td></tr>}
  //           {!loading && rows.length === 0 && <tr><td colSpan="6" className="muted pad">No posts yet. Posts created in the app appear here.</td></tr>}
  //           {!loading && rows.map((p) => (
  //             <tr key={p.id}>
  //               <td><b>{p.authorName}</b></td>
  //               <td style={{ maxWidth: 380 }}>{p.text}</td>
  //               <td>{p.likeCount ?? 0}</td>
  //               <td>{p.commentCount ?? 0}</td>
  //               <td className="muted small">{fmt(p.createdAt)}</td>
  //               <td><button className="btn sm danger" onClick={() => remove(p)}>Delete</button></td>
  //             </tr>
  //           ))}
  //         </tbody>
  //       </table>
  //     </div>
  //   </>
  // );
}
