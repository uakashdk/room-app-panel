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
    <div className="ec-wrap">
      <style>{`
        /* ---------- HEADER ---------- */
        .ec-wrap .head { animation: ec-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .ec-wrap .head h1, .ec-wrap h3 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }
        .ec-wrap p.muted.small { line-height: 1.6; margin-bottom: 16px; }

        /* ---------- GLASS CARDS ---------- */
        .ec-wrap .card {
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
          animation: ec-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        .ec-wrap .card::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 110px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        .ec-wrap .card > * { position: relative; }
        .ec-wrap .card.form { padding: 26px 26px 22px; margin-bottom: 22px; }
        .ec-wrap .card.form h3 { margin: 0 0 14px; letter-spacing: 0.02em; }
        .ec-wrap .card.form p { line-height: 1.7; margin: 6px 0; }
        .ec-wrap .card.form .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
        .ec-wrap .card.form .acts { margin-top: 20px; }

        /* ---------- FIELDS ---------- */
        .ec-wrap .field { display: flex; flex-direction: column; gap: 8px; }
        .ec-wrap .field > span:first-child {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.75;
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .ec-wrap .field > span.small { font-size: 12px; opacity: 0.55; line-height: 1.5; }
        .ec-wrap .field input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.16);
          background-color: rgba(255,255,255,0.05);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%);
          color: inherit;
          font-size: 15px;
          outline: none;
          box-shadow:
            inset 0 3px 8px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 1px 0 rgba(255,255,255,0.10);
          transition: border-color .25s, background-color .25s, box-shadow .25s, transform .25s, opacity .25s;
        }
        .ec-wrap .field input:focus {
          border-color: rgba(255,255,255,0.5);
          background-color: rgba(255,255,255,0.09);
          transform: translateY(-1px);
          box-shadow:
            0 0 0 4px rgba(255,255,255,0.08),
            0 8px 22px -8px rgba(255,255,255,0.18),
            inset 0 3px 8px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .ec-wrap .field input:disabled { opacity: 0.55; cursor: not-allowed; }

        /* number field: no native spinner */
        .ec-wrap input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
        .ec-wrap input[type="number"]::-webkit-outer-spin-button,
        .ec-wrap input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          appearance: none;
          display: none;
          margin: 0;
        }

        /* ---------- GLOSSY BUTTONS (theme color stays from .btn) ---------- */
        .ec-wrap .btn {
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
        .ec-wrap .btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .ec-wrap .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .ec-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 16px 28px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 16px rgba(255,255,255,0.12);
        }
        .ec-wrap .btn:hover:not(:disabled)::after { left: 150%; }
        .ec-wrap .btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 4px 10px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .ec-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ec-wrap .btn { padding: 13px 24px; }

        /* ---------- ACTIONS / MESSAGES ---------- */
        .ec-wrap .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .ec-wrap .box {
          position: relative;
          margin-bottom: 16px;
          padding: 13px 16px;
          border-radius: 14px;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5);
          animation: ec-rise .4s ease both;
        }
        .ec-wrap .error.box { background-color: rgba(255,70,70,0.10); border: 1px solid rgba(255,90,90,0.4); animation: ec-shake .4s ease; }

        /* ---------- GLOSSY SCROLLBAR (if the page ever scrolls sideways) ---------- */
        .ec-wrap .card { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.35) transparent; }
        .ec-wrap .card::-webkit-scrollbar { height: 14px; }
        .ec-wrap .card::-webkit-scrollbar-track {
          margin: 0 22px;
          border-radius: 999px;
          background-color: rgba(0,0,0,0.25);
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08);
        }
        .ec-wrap .card::-webkit-scrollbar-thumb {
          border-radius: 999px;
          border: 3px solid transparent;
          background-clip: padding-box;
          background-color: rgba(255,255,255,0.14);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 49%, rgba(0,0,0,0.18) 51%, rgba(255,255,255,0.06) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.3);
        }
        .ec-wrap .card::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        .ec-wrap .card::-webkit-scrollbar-corner { background: transparent; }

        @keyframes ec-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes ec-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .ec-wrap .head, .ec-wrap .card, .ec-wrap .box { animation: none; }
        }
      `}</style>

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
    </div>
  );
}
