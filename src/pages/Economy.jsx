import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const FIELDS = [
  { key: 'coinsPerUSD', label: 'Coins for 1 USD ($1)', hint: 'Example: 85 means $1 = 85 coins' },
  { key: 'coinsPerINR', label: 'Coins for 1 INR (₹1)', hint: 'Example: 1 means ₹100 = 100 coins' },
  { key: 'giftReceiverPercent', label: 'Gift receiver percent (%)', hint: 'Part of a gift price that the receiver earns as diamonds (0 - 100)' },
];

// Money -> coins rate. Only the SUPER ADMIN can change it (the server checks the role again).
export default function Economy({ role }) {
  const canEdit = role === 'super_admin';
  const [form, setForm] = useState({ coinsPerUSD: '', coinsPerINR: '', giftReceiverPercent: '' });
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'app_settings', 'economy'));
      const d = snap.exists() ? snap.data() : {};
      setSaved(d);
      setForm(Object.fromEntries(FIELDS.map((f) => [f.key, d[f.key] ?? ''])));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    const body = {};
    for (const f of FIELDS) {
      const raw = String(form[f.key]).trim();
      if (raw === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || (f.key !== 'giftReceiverPercent' && n === 0)) return setError(`${f.label}: enter a valid number.`);
      if (n !== saved[f.key]) body[f.key] = n;
    }
    if (Object.keys(body).length === 0) return setError('Nothing changed.');
    setSaving(true);
    try {
      await api('/admin/economy', 'PUT', body);
      setOk('Saved. New rates are used for new packages and recharges only; old records keep their old rate.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const usd = Number(form.coinsPerUSD) || 0;
  const inr = Number(form.coinsPerINR) || 0;

  return (
    <>
      <div className="head"><h1>Economy settings</h1></div>
      <p className="muted small">
        The money-to-coins rate. Packages use it to fill in the coins automatically.
        {!canEdit && ' You can only view this page. A Super admin can change the rates.'}
      </p>
      {error && <div className="error box">{error}</div>}
      {ok && <div className="box" style={{ color: 'var(--ok)' }}>{ok}</div>}

      <form className="card form" onSubmit={save}>
        <div className="grid">
          {FIELDS.map((f) => (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              <input
                type="number" step="any" min="0" disabled={!canEdit || loading}
                value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
              <span className="small">{f.hint}</span>
            </label>
          ))}
        </div>
        {canEdit && <div className="acts"><button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving...' : 'Save rates'}</button></div>}
      </form>

      <div className="card form">
        <h3>Preview (with the numbers above)</h3>
        <p>{usd > 0 ? `$1 = ${Math.floor(usd)} coins · $10 = ${Math.floor(usd * 10)} coins · $100 = ${Math.floor(usd * 100)} coins` : 'USD rate is not set.'}</p>
        <p>{inr > 0 ? `₹100 = ${Math.floor(inr * 100)} coins · ₹500 = ${Math.floor(inr * 500)} coins · ₹1000 = ${Math.floor(inr * 1000)} coins` : 'INR rate is not set.'}</p>
      </div>
    </>
  );
}
