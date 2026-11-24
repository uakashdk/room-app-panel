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
    <>
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
    </>
  );
}
