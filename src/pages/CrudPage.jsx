import { useCallback, useEffect, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const initialForm = (fields, defaults) =>
  Object.fromEntries(
    fields.map((f) => [
      f.key,
      defaults[f.key] ??
        (f.type === 'checkbox' ? false : f.type === 'number' ? 0 : f.type === 'select' ? f.options[0] : ''),
    ]),
  );

// One reusable add / edit / delete page for a Firestore collection (used by Rooms and Banners).
export default function CrudPage({
  title, hint, noun, collectionName, fields, columns, defaults = {}, sortFn, samples = [], staff,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => initialForm(fields, defaults));
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, collectionName), limit(200)));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(sortFn ? list.sort(sortFn) : list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [collectionName, sortFn]);

  useEffect(() => { load(); }, [load]);

  // append-only audit log of every staff action
  const log = (action, targetId) =>
    addDoc(collection(db, 'admin_logs'), {
      actorUid: staff.uid, actorEmail: staff.email, action, collection: collectionName, targetId, at: serverTimestamp(),
    });

  const reset = () => { setForm(initialForm(fields, defaults)); setEditingId(null); };

  const save = async (e) => {
    e.preventDefault();
    const payload = {};
    for (const f of fields) {
      let v = form[f.key];
      if (f.type === 'number') v = Number(v) || 0;
      if (f.type === 'text') v = String(v).trim();
      if (f.required && v === '') return setError(`${f.label} is required.`);
      payload[f.key] = v;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), payload);
        await log(`update_${noun}`, editingId);
      } else {
        const ref = await addDoc(collection(db, collectionName), { ...payload, createdAt: serverTimestamp() });
        await log(`create_${noun}`, ref.id);
      }
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm(initialForm(fields, { ...defaults, ...Object.fromEntries(fields.map((f) => [f.key, item[f.key]])) }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete this ${noun}?`)) return;
    try {
      await deleteDoc(doc(db, collectionName, item.id));
      await log(`delete_${noun}`, item.id);
      if (editingId === item.id) reset();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addSamples = async () => {
    setSaving(true);
    setError('');
    try {
      for (const s of samples) await addDoc(collection(db, collectionName), { ...s, createdAt: serverTimestamp() });
      await log(`seed_${noun}s`, 'samples');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="head">
        <h1>{title}</h1>
        {!loading && items.length === 0 && samples.length > 0 && (
          <button className="btn ghost" onClick={addSamples} disabled={saving}>Add sample data</button>
        )}
      </div>
      {hint && <p className="muted small">{hint}</p>}
      {error && <div className="error box">{error}</div>}

      <form className="card form" onSubmit={save}>
        <h3>{editingId ? `Edit ${noun}` : `Add a ${noun}`}</h3>
        <div className="grid">
          {fields.map((f) =>
            f.type === 'checkbox' ? (
              <label key={f.key} className="field check">
                <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                <span>{f.label}</span>
              </label>
            ) : (
              <label key={f.key} className={`field ${f.wide ? 'wide' : ''}`}>
                <span>{f.label}{f.required && ' *'}</span>
                {f.type === 'select' ? (
                  <select value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </label>
            ),
          )}
        </div>
        <div className="acts">
          <button className="btn" type="submit" disabled={saving}>{editingId ? 'Save changes' : `Add ${noun}`}</button>
          {editingId && <button className="btn ghost" type="button" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length + 1} className="muted pad">Loading...</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="muted pad">Nothing here yet. Add one above.</td></tr>
            )}
            {!loading && items.map((it) => (
              <tr key={it.id}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(it) : String(it[c.key] ?? '-')}</td>
                ))}
                <td>
                  <div className="acts">
                    <button className="btn sm ghost" onClick={() => edit(it)}>Edit</button>
                    <button className="btn sm danger" onClick={() => remove(it)}>Delete</button>
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
