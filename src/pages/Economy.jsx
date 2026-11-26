import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const FIELDS = [
  { key: 'coinsPerUSD', label: 'Coins for 1 USD ($1)', hint: 'Example: 85 means $1 = 85 coins' },
  { key: 'coinsPerINR', label: 'Coins for 1 INR (₹1)', hint: 'Example: 1 means ₹100 = 100 coins' },
  { key: 'giftReceiverPercent', label: 'Gift receiver percent (%)', hint: 'Part of a gift price that the receiver earns as diamonds (0 - 100)' },
  { key: 'chatGiftCoinsPercent', label: 'Private chat gift: coins for the receiver (%)', hint: 'Part of a gift price that goes into the receiver\'s COIN wallet when the gift is sent in a private chat (0 - 100, empty = 50). 0 = the receiver gets no coins. Lucky gifts never pay the receiver.' },
];
const PERCENT_KEYS = ['giftReceiverPercent', 'chatGiftCoinsPercent']; // these may be 0

const GLOSS_CSS = `
.eco .card.form {
  position: relative !important;
  overflow: hidden !important;
  border-radius: 28px !important;
  padding: 32px !important;
  margin-bottom: 24px;
  background: linear-gradient(160deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.05) 28%, rgba(20,12,30,.88) 100%) !important;
  border: 1px solid rgba(255,255,255,.28) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.38),
    inset 0 -1px 0 rgba(0,0,0,.55),
    0 20px 50px rgba(0,0,0,.6) !important;
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}
/* curved glossy sheen on top of the card */
.eco .card.form::before {
  content: '';
  position: absolute;
  top: -70%; left: -25%;
  width: 150%; height: 110%;
  background: radial-gradient(ellipse at 35% 100%, rgba(255,255,255,.13), rgba(255,255,255,.03) 55%, transparent 70%);
  border-radius: 0 0 50% 50%;
  pointer-events: none;
}
.eco .card.form > * { position: relative; z-index: 1; }

.eco .card.form h3 { font-size: 18px; letter-spacing: .02em; margin: 0 0 14px; }

.eco .grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important;
  gap: 28px 32px !important;
}
.eco .field { display: flex; flex-direction: column; gap: 10px; }
.eco .field > span:first-child {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  opacity: .7;
}
.eco .field > span.small { font-size: 13px; opacity: .55; line-height: 1.5; }

.eco .field input {
  width: 100%;
  box-sizing: border-box;
  padding: 16px 20px !important;
  border-radius: 18px !important;
  font-size: 16px;
  color: inherit;
  border: 1px solid rgba(255,255,255,.22) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.13) 0%, rgba(255,255,255,.04) 100%) !important;
  box-shadow:
    inset 0 2px 8px rgba(0,0,0,.55),
    inset 0 1px 0 rgba(255,255,255,.14),
    0 1px 0 rgba(255,255,255,.06) !important;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.eco .field input:focus {
  border-color: rgba(240,190,70,.75) !important;
  box-shadow:
    inset 0 2px 8px rgba(0,0,0,.55),
    0 0 0 3px rgba(240,190,70,.18),
    0 0 18px rgba(240,190,70,.25) !important;
}
.eco .field input:disabled { opacity: .6; cursor: not-allowed; }

.eco .acts { margin-top: 28px; }
.eco .btn {
  position: relative;
  padding: 14px 28px !important;
  border-radius: 16px !important;
  font-weight: 700;
  color: #1a1200 !important;
  border: 1px solid rgba(255,232,160,.85) !important;
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%) !important;
  text-shadow: 0 1px 0 rgba(255,255,255,.35);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.75),
    inset 0 -2px 4px rgba(120,80,0,.35),
    0 8px 20px rgba(0,0,0,.55),
    0 0 18px rgba(240,190,70,.25) !important;
  cursor: pointer;
  transition: transform .15s, filter .15s, box-shadow .15s;
}
.eco .btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.eco .btn:active:not(:disabled) { transform: translateY(1px); filter: brightness(.96); }
.eco .btn:disabled { opacity: .6; cursor: not-allowed; }

.eco .error.box, .eco .box {
  border-radius: 16px;
  padding: 12px 18px;
  margin-bottom: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
}
`;

// Money -> coins rate. Only the SUPER ADMIN can change it (the server checks the role again).
export default function Economy({ role }) {
  const canEdit = role === 'super_admin';
  const [form, setForm] = useState({ coinsPerUSD: '', coinsPerINR: '', giftReceiverPercent: '', chatGiftCoinsPercent: '' });
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
      if (!Number.isFinite(n) || n < 0 || (!PERCENT_KEYS.includes(f.key) && n === 0)) return setError(`${f.label}: enter a valid number.`);
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
    <div className="eco">
      <style>{GLOSS_CSS}</style>

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
        {canEdit && (
          <div className="acts">
            <button className="btn" type="submit" disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save rates'}
            </button>
          </div>
        )}
      </form>

      <div className="card form">
        <h3>Preview (with the numbers above)</h3>
        <p>{usd > 0 ? `$1 = ${Math.floor(usd)} coins · $10 = ${Math.floor(usd * 10)} coins · $100 = ${Math.floor(usd * 100)} coins` : 'USD rate is not set.'}</p>
        <p>{inr > 0 ? `₹100 = ${Math.floor(inr * 100)} coins · ₹500 = ${Math.floor(inr * 500)} coins · ₹1000 = ${Math.floor(inr * 1000)} coins` : 'INR rate is not set.'}</p>
      </div>
    </div>
  );
}