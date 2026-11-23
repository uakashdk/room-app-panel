import { useCallback, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const fmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

// Moderation: see the latest posts and remove the ones that break the rules
export default function Posts({ staff }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const remove = async (p) => {
    if (!window.confirm(`Delete this post by ${p.authorName}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'posts', p.id));
      await addDoc(collection(db, 'admin_logs'), {
        actorUid: staff.uid, actorEmail: staff.email, action: 'delete_post', collection: 'posts',
        targetId: p.id, targetUid: p.authorUid, at: serverTimestamp(),
      });
      setRows((r) => r.filter((x) => x.id !== p.id));
      setNotice('Post deleted');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <div className="head">
        <div>
          <h1>Posts</h1>
          <p className="muted small">The latest 50 posts from the Feed. Delete posts that break the rules.</p>
        </div>
        <button className="btn ghost" onClick={load}>Refresh</button>
      </div>
      {error && <div className="error box">{error}</div>}
      {notice && <div className="box" style={{ color: '#7ff0b8', background: '#10261c', borderColor: '#2c6b4c' }}>{notice}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Author</th><th>Post</th><th>Likes</th><th>Comments</th><th>Posted</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="muted pad">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan="6" className="muted pad">No posts yet. Posts created in the app appear here.</td></tr>}
            {!loading && rows.map((p) => (
              <tr key={p.id}>
                <td><b>{p.authorName}</b></td>
                <td style={{ maxWidth: 380 }}>{p.text}</td>
                <td>{p.likeCount ?? 0}</td>
                <td>{p.commentCount ?? 0}</td>
                <td className="muted small">{fmt(p.createdAt)}</td>
                <td><button className="btn sm danger" onClick={() => remove(p)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
