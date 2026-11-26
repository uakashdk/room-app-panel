// Games (PrimeArcade): switch the games on/off, choose the stake amounts and the list of games.
// Only the SUPER ADMIN can change it (the server checks the role again).
import { useEffect, useState } from 'react';
import { api } from '../api';

const EMPTY = { enabled: false, stakes: '100, 500, 1000, 5000', maxStake: 5000, maxPayoutMultiplier: 20, games: [] };
const PRESETS = [100, 500, 1000, 2000, 5000, 10000];

const parseStakes = (s) => String(s).split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n > 0);
const fmt = (n) => Number(n).toLocaleString('en-IN');

const GLOSS_CSS = `
/* ================= PAGE GLOSS (unchanged) ================= */
.arc .card.form {
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
.arc .card.form::before {
  content: '';
  position: absolute;
  top: -70%; left: -25%;
  width: 150%; height: 110%;
  background: radial-gradient(ellipse at 35% 100%, rgba(255,255,255,.13), rgba(255,255,255,.03) 55%, transparent 70%);
  border-radius: 0 0 50% 50%;
  pointer-events: none;
}
.arc .card.form > * { position: relative; z-index: 1; }
.arc .card.form h3 { font-size: 18px; letter-spacing: .02em; margin: 22px 0 10px; }
.arc .card.form h3:first-child { margin-top: 0; }

.arc .grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
  gap: 24px 28px !important;
  margin-top: 18px;
}
.arc .acts { margin-top: 26px; }

.arc .btn:not(.ghost) {
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
  transition: transform .15s, filter .15s;
}
.arc .btn.ghost {
  padding: 13px 24px !important;
  border-radius: 16px !important;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,.3) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.05) 50%, rgba(0,0,0,.25) 100%) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.4),
    inset 0 -2px 4px rgba(0,0,0,.4),
    0 6px 16px rgba(0,0,0,.5) !important;
  cursor: pointer;
  transition: transform .15s, filter .15s;
}
.arc .btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.arc .btn:active:not(:disabled) { transform: translateY(1px); filter: brightness(.96); }
.arc .btn:disabled { opacity: .6; cursor: not-allowed; }
.arc .grid > .btn { justify-self: start; align-self: center; }

.arc .error.box, .arc .box {
  border-radius: 16px;
  padding: 12px 18px;
  margin-bottom: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
}

/* ================= FANCY FIELDS ================= */
.arc .fxf { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.arc .fxf-label {
  font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; opacity: .7;
}
.arc .fxf-hint { font-size: 13px; opacity: .55; line-height: 1.5; }
.arc .fxf.off { opacity: .55; pointer-events: none; }

/* ---- 1. floating label ---- */
.arc .fx-fl {
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.22);
  background-color: rgba(255,255,255,.03);
  background-image:
    radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%),
    linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85);
  transition: border-color .25s, box-shadow .25s, transform .25s;
}
.arc .fx-fl:hover { border-color: rgba(255,255,255,.4); }
.arc .fx-fl input {
  width: 100%; box-sizing: border-box; height: auto;
  padding: 26px 18px 9px !important;
  font-size: 16px; font-weight: 500; letter-spacing: .02em; color: inherit;
  border: 0 !important; border-radius: 0 !important; outline: none;
  background: transparent !important; box-shadow: none !important;
}
.arc .fx-fl label {
  position: absolute; left: 18px; top: 19px;
  font-size: 15px; opacity: .5; pointer-events: none;
  transition: top .2s, font-size .2s, opacity .2s, color .2s, letter-spacing .2s;
}
.arc .fx-fl input:focus + label,
.arc .fx-fl input:not(:placeholder-shown) + label {
  top: 8px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; opacity: 1; color: #f2c445;
}
.arc .fx-fl:focus-within {
  transform: translateY(-2px);
  border-color: rgba(240,190,70,.9);
  box-shadow: inset 0 3px 10px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.35), 0 0 0 4px rgba(240,190,70,.14), 0 16px 30px -10px rgba(240,190,70,.35);
}
.arc .fx-fl::after {
  content: ''; position: absolute; left: 18px; right: 18px; bottom: -1px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, #f2c445, transparent);
  transform: scaleX(0); transition: transform .4s ease; pointer-events: none;
}
.arc .fx-fl:focus-within::after { transform: scaleX(1); }

/* ---- 2. stepper ---- */
.arc .fx-st {
  display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,.22);
  background-image: radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85);
  transition: border-color .25s, box-shadow .25s;
}
.arc .fx-st:focus-within { border-color: rgba(240,190,70,.9); box-shadow: inset 0 3px 10px rgba(0,0,0,.4), 0 0 0 4px rgba(240,190,70,.14), 0 16px 30px -10px rgba(240,190,70,.35); }
.arc .fx-st button {
  flex: none; width: 46px; height: 46px; padding: 0; border-radius: 14px; cursor: pointer;
  font-size: 24px; font-weight: 500; line-height: 1; color: #1a1200 !important;
  border: 1px solid rgba(255,232,160,.85) !important;
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 4px rgba(120,80,0,.35), 0 6px 14px -6px rgba(0,0,0,.8) !important;
  transition: transform .15s, filter .15s;
}
.arc .fx-st button:hover { filter: brightness(1.1); transform: translateY(-1px); }
.arc .fx-st button:active { transform: translateY(1px); }
.arc .fx-st input {
  flex: 1; min-width: 0; height: auto; text-align: center;
  font-size: 22px; font-weight: 600; letter-spacing: .04em; color: inherit;
  padding: 8px 4px !important; border: 0 !important; outline: none;
  background: transparent !important; box-shadow: none !important; -moz-appearance: textfield;
}
.arc .fx-st input::-webkit-outer-spin-button,
.arc .fx-st input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.arc .fx-st small { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; opacity: .55; margin-right: 4px; }

/* ---- 3. quick pick pills (compact) ---- */
.arc .fx-pk { display: flex; flex-wrap: wrap; gap: 8px; }
.arc .fx-pk button {
  padding: 8px 17px; border-radius: 999px; cursor: pointer;
  font-size: 14px; font-weight: 600; letter-spacing: .02em; color: inherit !important;
  border: 1px solid rgba(255,255,255,.25) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.03)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3) !important;
  opacity: .8;
  transition: opacity .2s, box-shadow .2s, border-color .2s, transform .15s;
}
.arc .fx-pk button:hover { opacity: 1; border-color: rgba(240,190,70,.6) !important; }
.arc .fx-pk button.on {
  opacity: 1;
  color: #1a1200 !important;
  font-weight: 700;
  border: 1px solid rgba(255,232,160,.85) !important;
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.75),
    inset 0 -2px 3px rgba(120,80,0,.35),
    0 0 14px rgba(242,196,69,.4),
    0 4px 10px -4px rgba(0,0,0,.7) !important;
}
.arc .fx-pk button:active { transform: translateY(1px); }

.arc .fx-add {
  display: flex; align-items: center; gap: 8px; max-width: 320px; padding: 5px 5px 5px 16px; border-radius: 999px;
  border: 1px dashed rgba(255,255,255,.3);
  background: rgba(255,255,255,.04);
  transition: border-color .25s, box-shadow .25s;
}
.arc .fx-add:focus-within { border-color: rgba(240,190,70,.9); border-style: solid; box-shadow: 0 0 0 4px rgba(240,190,70,.14); }
.arc .fx-add input {
  flex: 1; min-width: 0; height: auto; min-height: 0; line-height: 1.2;
  font-size: 14px; color: inherit; padding: 8px 0 !important;
  border: 0 !important; outline: none; background: transparent !important; box-shadow: none !important; -moz-appearance: textfield;
}
.arc .fx-add input::-webkit-outer-spin-button,
.arc .fx-add input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.arc .fx-add button {
  flex: none; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; color: inherit !important;
  border: 1px solid rgba(255,255,255,.3) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.04)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4) !important;
}
.arc .fx-add button:hover { filter: brightness(1.2); }

/* ---- 5. glow slider ---- */
.arc .fx-sl { display: flex; align-items: center; gap: 16px; }
.arc .fx-sl input[type=range] {
  -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 12px; padding: 0 !important; margin: 0;
  border-radius: 99px; outline: none; cursor: pointer;
  border: 1px solid rgba(255,255,255,.2) !important;
  box-shadow: inset 0 2px 6px rgba(0,0,0,.65) !important;
  background: linear-gradient(90deg, #c9962b, #f2c445 var(--p, 20%), rgba(255,255,255,.08) var(--p, 20%)) !important;
}
.arc .fx-sl input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; cursor: grab;
  border: 1px solid #ffe8a0;
  background: radial-gradient(circle at 35% 30%, #fff3c2, #f2c445 55%, #c9962b);
  box-shadow: 0 0 16px rgba(242,196,69,.65), 0 4px 8px rgba(0,0,0,.8);
}
.arc .fx-sl input[type=range]::-moz-range-thumb {
  width: 28px; height: 28px; border-radius: 50%; cursor: grab; border: 1px solid #ffe8a0; background: #f2c445;
  box-shadow: 0 0 16px rgba(242,196,69,.65);
}
.arc .fx-sl output {
  flex: none; min-width: 70px; text-align: center; padding: 9px 14px; border-radius: 14px; font-weight: 800; color: #1a1200;
  border: 1px solid rgba(255,232,160,.85);
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 6px 14px -6px rgba(0,0,0,.8);
}

/* ---- 6. prefix input ---- */
.arc .fx-pf {
  display: flex; align-items: stretch; overflow: hidden; border-radius: 16px;
  border: 1px solid rgba(255,255,255,.22);
  background-image: radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85);
  transition: border-color .25s, box-shadow .25s, transform .25s;
}
.arc .fx-pf:hover { border-color: rgba(255,255,255,.4); }
.arc .fx-pf:focus-within { transform: translateY(-2px); border-color: rgba(240,190,70,.9); box-shadow: 0 0 0 4px rgba(240,190,70,.14), 0 16px 30px -10px rgba(240,190,70,.35); }
.arc .fx-pf em {
  display: flex; align-items: center; padding: 0 14px; font-style: normal; font-size: 13px; font-weight: 700; color: #f2c445;
  border-right: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.03));
}
.arc .fx-pf input {
  flex: 1; min-width: 0; height: auto; font-size: 15px; font-weight: 500; color: inherit;
  padding: 18px 14px !important; border: 0 !important; border-radius: 0 !important; outline: none;
  background: transparent !important; box-shadow: none !important;
}
.arc .fx-pf svg { align-self: center; margin-right: 14px; color: #f2c445; flex: none; }
.arc .fx-pf input::placeholder, .arc .fx-add input::placeholder { color: inherit; opacity: .35; }

/* ---- 7. glossy toggle ---- */
.arc .fx-sw {
  display: inline-flex; align-items: center; gap: 16px; padding: 0; cursor: pointer; color: inherit !important;
  border: 0 !important; background: transparent !important; box-shadow: none !important; text-align: left;
}
.arc .fx-sw:disabled { opacity: .55; cursor: not-allowed; }
.arc .fx-sw i {
  position: relative; flex: none; width: 68px; height: 36px; border-radius: 99px;
  border: 1px solid rgba(255,255,255,.25);
  background: linear-gradient(180deg, rgba(0,0,0,.45), rgba(255,255,255,.06));
  box-shadow: inset 0 3px 8px rgba(0,0,0,.65);
  transition: background .3s, box-shadow .3s, border-color .3s;
}
.arc .fx-sw i::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 28px; height: 28px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, #b9b9c4 70%);
  box-shadow: 0 3px 8px rgba(0,0,0,.8);
  transition: left .3s;
}
.arc .fx-sw.on i {
  border-color: #ffe8a0;
  background: linear-gradient(180deg, #c9962b, #f2c445);
  box-shadow: inset 0 2px 6px rgba(120,80,0,.5), 0 0 20px rgba(242,196,69,.45);
}
.arc .fx-sw.on i::after { left: 35px; }
.arc .fx-sw b { font-size: 16px; font-weight: 600; }
.arc .fx-sw span { font-size: 13px; opacity: .6; font-weight: 400; display: block; }
`;

function FloatInput({ id, label, ...props }) {
  return (
    <div className="fx-fl">
      <input id={id} placeholder=" " {...props} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function UrlInput({ value, onChange, disabled }) {
  const shown = String(value || '').replace(/^https?:\/\//i, '');
  return (
    <div className="fx-pf">
      <em>https://</em>
      <input
        placeholder="cdn.example.com/ludo.png"
        value={shown}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.trim().replace(/^https?:\/\//i, '');
          onChange(v ? `https://${v}` : '');
        }}
      />
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" />
      </svg>
    </div>
  );
}

export default function Arcade({ role }) {
  const canEdit = role === 'super_admin';
  const [form, setForm] = useState(EMPTY);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { arcade } = await api('/admin/arcade');
      setForm({
        enabled: arcade.enabled === true,
        stakes: (arcade.stakes ?? []).join(', '),
        maxStake: arcade.maxStake,
        maxPayoutMultiplier: arcade.maxPayoutMultiplier,
        games: (arcade.games ?? []).map((g) => ({ id: g.id, name: g.name, image: g.image ?? '' })),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const setGame = (i, patch) => setForm((f) => ({ ...f, games: f.games.map((g, k) => (k === i ? { ...g, ...patch } : g)) }));
  const addGame = () => setForm((f) => ({ ...f, games: [...f.games, { id: '', name: '', image: '' }] }));
  const delGame = (i) => setForm((f) => ({ ...f, games: f.games.filter((_, k) => k !== i) }));

  const selected = parseStakes(form.stakes);
  const options = [...new Set([...PRESETS, ...selected])].sort((a, b) => a - b);
  const writeStakes = (arr) => setForm((f) => ({ ...f, stakes: [...new Set(arr)].sort((a, b) => a - b).join(', ') }));
  const toggleStake = (n) => writeStakes(selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n]);
  const addCustom = () => {
    const n = Number(custom);
    if (Number.isInteger(n) && n > 0) writeStakes([...selected, n]);
    setCustom('');
  };

  const step = (field, delta) => setForm((f) => ({ ...f, [field]: Math.max(1, (Number(f[field]) || 0) + delta) }));
  const mult = Math.max(1, Number(form.maxPayoutMultiplier) || 1);
  const multMax = Math.max(100, mult);
  const off = !canEdit || loading;

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    const stakes = String(form.stakes).split(/[,\s]+/).filter(Boolean).map(Number);
    if (!stakes.length || stakes.some((n) => !Number.isInteger(n) || n < 1)) return setError('Pick at least one stake amount.');
    const games = form.games.map((g) => ({ id: g.id.trim(), name: g.name.trim(), image: g.image.trim() || null }));
    if (games.some((g) => !/^[A-Za-z0-9_-]{1,40}$/.test(g.id) || !g.name)) return setError('Every game needs an id (letters, numbers, - _) and a name.');
    setSaving(true);
    try {
      await api('/admin/arcade', 'PUT', {
        enabled: form.enabled, stakes, maxStake: Number(form.maxStake), maxPayoutMultiplier: Number(form.maxPayoutMultiplier), games,
      });
      setOk('Saved. The app uses it right away.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="arc">
      <style>{GLOSS_CSS}</style>

      <div className="head"><h1>Games</h1></div>
      <p className="muted small">
        The games shown inside rooms. When the switch is OFF, people see &quot;Games are not open right now&quot;.
        {!canEdit && ' You can only view this page. A Super admin can change it.'}
      </p>
      {error && <div className="error box">{error}</div>}
      {ok && <div className="box" style={{ color: 'var(--ok)' }}>{ok}</div>}

      <form className="card form" onSubmit={save}>
        <button
          type="button"
          className={`fx-sw ${form.enabled ? 'on' : ''}`}
          role="switch"
          aria-checked={form.enabled}
          disabled={off}
          onClick={() => setForm({ ...form, enabled: !form.enabled })}
        >
          <i />
          <b>{form.enabled ? 'Games are ON' : 'Games are OFF'}<span>People can play inside rooms when this is on.</span></b>
        </button>

        <div className="grid">
          <div className={`fxf ${off ? 'off' : ''}`}>
            <span className="fxf-label">Coin amounts people can play with</span>
            <div className="fx-pk">
              {options.map((n) => (
                <button type="button" key={n} className={selected.includes(n) ? 'on' : ''} aria-pressed={selected.includes(n)} onClick={() => toggleStake(n)}>
                  {fmt(n)}
                </button>
              ))}
            </div>
            <div className="fx-add">
              <input
                type="number" min="1" placeholder="Other amount" value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              />
              <button type="button" onClick={addCustom}>+ Add</button>
            </div>
            <span className="fxf-hint">{selected.length} selected. Tap an amount to turn it on or off.</span>
          </div>

          <div className={`fxf ${off ? 'off' : ''}`}>
            <span className="fxf-label">Biggest amount</span>
            <div className="fx-st">
              <button type="button" aria-label="Decrease" onClick={() => step('maxStake', -500)}>−</button>
              <input type="number" min="1" value={form.maxStake} onChange={(e) => setForm({ ...form, maxStake: e.target.value })} />
              <small>coins</small>
              <button type="button" aria-label="Increase" onClick={() => step('maxStake', 500)}>+</button>
            </div>
          </div>

          <div className={`fxf ${off ? 'off' : ''}`}>
            <span className="fxf-label">Most a player can get back (x amount)</span>
            <div className="fx-sl">
              <input
                type="range" min="1" max={multMax} value={mult}
                style={{ '--p': `${((mult - 1) / (multMax - 1)) * 100}%` }}
                onChange={(e) => setForm({ ...form, maxPayoutMultiplier: Number(e.target.value) })}
              />
              <output>{mult}x</output>
            </div>
            <span className="fxf-hint">Safety limit, example 20 = at most 20 times the coins played with</span>
          </div>
        </div>

        <h3>Games list</h3>
        <p className="muted small">Leave the list empty to use the list that PrimeArcade sends. Or type the game ids you want to show.</p>
        {form.games.map((g, i) => (
          <div key={i} className="grid" style={{ alignItems: 'center' }}>
            <div className={`fxf ${!canEdit ? 'off' : ''}`}>
              <FloatInput id={`gid-${i}`} label="Game id" value={g.id} disabled={!canEdit} onChange={(e) => setGame(i, { id: e.target.value })} />
            </div>
            <div className={`fxf ${!canEdit ? 'off' : ''}`}>
              <FloatInput id={`gname-${i}`} label="Name" value={g.name} disabled={!canEdit} onChange={(e) => setGame(i, { name: e.target.value })} />
            </div>
            <div className={`fxf ${!canEdit ? 'off' : ''}`}>
              <UrlInput value={g.image} disabled={!canEdit} onChange={(v) => setGame(i, { image: v })} />
            </div>
            {canEdit && <button type="button" className="btn ghost" onClick={() => delGame(i)}>Remove</button>}
          </div>
        ))}
        {canEdit && <div className="acts"><button type="button" className="btn ghost" onClick={addGame}>+ Add a game</button></div>}

        {canEdit && <div className="acts"><button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving...' : 'Save'}</button></div>}
      </form>
    </div>
  );
}
