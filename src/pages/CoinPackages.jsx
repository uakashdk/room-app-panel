import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const CSS = `
/* Recharge packages page (modern look). Uses the same colour variables as the rest of the panel. */
.cp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.cp-head h1 { font-size: 26px; letter-spacing: -.5px; }
.cp-sub { color: var(--muted); font-size: 13px; margin: 6px 0 0; max-width: 560px; line-height: 1.5; }
.cp-role { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; padding: 5px 11px; border-radius: 20px; border: 1px solid var(--border); color: var(--muted); }
.cp-role.super { color: #160d05; background: linear-gradient(135deg, #ffe7a0, #f4c542 55%, #c99616); border: 0; }
.cp-add { display: inline-flex; align-items: center; gap: 8px; border: 0; cursor: pointer; font-weight: 800; font-size: 14px; color: #160d05; padding: 12px 20px; border-radius: 14px; background: linear-gradient(135deg, #ffe7a0, #f4c542 55%, #c99616); box-shadow: 0 8px 26px rgba(244, 197, 66, .28); transition: transform .15s, box-shadow .15s; }
.cp-add:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(244, 197, 66, .38); }
.cp-add span { font-size: 20px; line-height: 1; }
.cp-lock { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; background: rgba(244, 197, 66, .08); border: 1px solid rgba(244, 197, 66, .35); color: var(--gold); font-size: 13px; margin-bottom: 18px; }

.cp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 22px; }
.cp-stat { padding: 16px 18px; border-radius: 18px; background: linear-gradient(145deg, #1d1030, #140a21); border: 1px solid var(--border); position: relative; overflow: hidden; }
.cp-stat::after { content: ''; position: absolute; right: -24px; top: -24px; width: 80px; height: 80px; border-radius: 50%; background: rgba(244, 197, 66, .07); }
.cp-stat b { display: block; font-size: 28px; letter-spacing: -.6px; }
.cp-stat small { color: var(--muted); font-size: 12px; }
.cp-stat.gold b { color: var(--gold); }

.cp-tabs { display: inline-flex; padding: 4px; gap: 4px; border-radius: 14px; background: var(--bg2); border: 1px solid var(--border); margin-bottom: 18px; }
.cp-tab { border: 0; background: transparent; color: var(--muted); font-weight: 700; font-size: 13px; padding: 8px 16px; border-radius: 10px; cursor: pointer; }
.cp-tab.on { background: #2a1840; color: var(--gold); }

.cp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
.cp-card { position: relative; border-radius: 22px; padding: 18px; background: linear-gradient(160deg, #1f1233, #130a1f); border: 1px solid var(--border); overflow: hidden; transition: transform .18s, border-color .18s, box-shadow .18s; }
.cp-card:hover { transform: translateY(-4px); border-color: rgba(244, 197, 66, .55); box-shadow: 0 14px 34px rgba(0, 0, 0, .4); }
.cp-card.off { opacity: .5; }
.cp-card::before { content: ''; position: absolute; width: 130px; height: 130px; right: -40px; top: -50px; border-radius: 50%; background: radial-gradient(circle, rgba(244, 197, 66, .22), transparent 70%); }
.cp-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; position: relative; }
.cp-name { font-size: 12px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-coin { width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; font-size: 26px; font-weight: 900; color: #3a2605; background: linear-gradient(135deg, #ffe7a0, #f4c542 55%, #c99616); box-shadow: 0 6px 20px rgba(244, 197, 66, .35), inset 0 0 0 3px rgba(255, 255, 255, .28); margin-bottom: 12px; position: relative; }
.cp-coins { font-size: 30px; font-weight: 900; letter-spacing: -1px; color: var(--gold); position: relative; }
.cp-coins small { font-size: 11px; color: var(--muted); letter-spacing: 1.4px; margin-left: 6px; font-weight: 800; }
.cp-bonus { display: inline-block; margin-top: 8px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 800; color: var(--ok); background: rgba(67, 201, 139, .13); }
.cp-bonus.none { visibility: hidden; }
.cp-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--border); position: relative; }
.cp-price { font-size: 20px; font-weight: 900; }
.cp-edit { border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 10px; padding: 7px 14px; font-size: 12px; font-weight: 800; cursor: pointer; }
.cp-edit:hover { border-color: var(--gold); color: var(--gold); }

.cp-switch { width: 42px; height: 24px; border-radius: 12px; border: 0; padding: 0; background: #3a2a4d; position: relative; cursor: pointer; transition: background .2s; }
.cp-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .2s; }
.cp-switch.on { background: var(--ok); }
.cp-switch.on::after { transform: translateX(18px); }
.cp-switch:disabled { cursor: default; opacity: .6; }

.cp-empty { text-align: center; padding: 60px 20px; border: 1px dashed var(--border); border-radius: 22px; color: var(--muted); }
.cp-empty b { display: block; color: var(--text); font-size: 18px; margin-bottom: 6px; }

/* slide-in form */
.cp-overlay { position: fixed; inset: 0; background: rgba(4, 2, 10, .7); backdrop-filter: blur(3px); z-index: 50; animation: cpFade .2s; }
.cp-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(460px, 100%); background: var(--bg2); border-left: 1px solid var(--border); z-index: 51; display: flex; flex-direction: column; animation: cpSlide .26s cubic-bezier(.2, .8, .2, 1); }
.cp-dh { display: flex; justify-content: space-between; align-items: center; padding: 20px 22px; border-bottom: 1px solid var(--border); }
.cp-dh h3 { margin: 0; font-size: 18px; }
.cp-x { border: 0; background: #241833; color: var(--text); width: 34px; height: 34px; border-radius: 10px; font-size: 18px; cursor: pointer; }
.cp-db { padding: 20px 22px; overflow-y: auto; flex: 1; }
.cp-preview-label { font-size: 11px; font-weight: 800; color: var(--muted); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 8px; }
.cp-preview { margin-bottom: 20px; }
.cp-preview .cp-card:hover { transform: none; }
.cp-presets { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 4px; }
.cp-chip { border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 20px; padding: 6px 13px; font-size: 12px; font-weight: 700; cursor: pointer; }
.cp-chip:hover, .cp-chip.on { border-color: var(--gold); color: var(--gold); background: rgba(244, 197, 66, .08); }
.cp-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cp-fields .full { grid-column: span 2; }
.cp-hint { font-size: 11px; color: var(--muted); }
.cp-df { padding: 16px 22px; border-top: 1px solid var(--border); display: flex; gap: 10px; }
.cp-df .btn { flex: 1; }
.cp-ok { color: var(--ok); background: rgba(67, 201, 139, .12); border: 1px solid rgba(67, 201, 139, .45); padding: 10px 14px; border-radius: 12px; margin-bottom: 14px; font-size: 13px; }
@keyframes cpSlide { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes cpFade { from { opacity: 0; } to { opacity: 1; } }
`;

const EMPTY = { name: '', currency: 'USD', price: '', coins: '', bonusCoins: '0', order: '1', enabled: true };
const PRESETS = [100, 500, 1000, 5000, 10000]; // quick-fill examples; every value stays editable
const sym = (c) => (c === 'INR' ? '₹' : '$');
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

// One package card. The same card is used in the list and in the live preview of the form.
function PackCard({ p, canEdit, onEdit, onToggle, preview }) {
  const bonus = Number(p.bonusCoins || 0);
  const pct = Number(p.coins) > 0 ? Math.round((bonus / Number(p.coins)) * 100) : 0;
  return (
    <div className={`cp-card ${p.enabled ? '' : 'off'}`}>
      <div className="cp-top">
        <span className="cp-name">{p.name || 'Package name'}</span>
        {!preview && (
          <button className={`cp-switch ${p.enabled ? 'on' : ''}`} disabled={!canEdit} onClick={() => onToggle(p)} title={canEdit ? (p.enabled ? 'Turn off' : 'Turn on') : 'Only a Super admin can change this'} />
        )}
      </div>
      <div className="cp-coin">฿</div>
      <div className="cp-coins">{fmt(p.coins)}<small>COINS</small></div>
      <span className={`cp-bonus ${bonus > 0 ? '' : 'none'}`}>+{fmt(bonus)} bonus{pct > 0 ? ` (${pct}%)` : ''}</span>
      <div className="cp-foot">
        <span className="cp-price">{p.price === '' || p.price == null ? '—' : `${sym(p.currency)}${p.price}`}</span>
        {!preview && canEdit && <button className="cp-edit" onClick={() => onEdit(p)}>Edit</button>}
      </div>
    </div>
  );
}

// Recharge packages. Everyone on the staff can LOOK; only a SUPER ADMIN can add / edit / turn on-off
// (the server checks the role again, so hiding the buttons is only for a clean screen).
export default function CoinPackages({ role }) {
  const canEdit = role === 'super_admin';
  const [items, setItems] = useState([]);
  const [eco, setEco] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [coinsTouched, setCoinsTouched] = useState(false);
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pk, ec] = await Promise.all([getDocs(query(collection(db, 'recharge_packages'), limit(200))), getDoc(doc(db, 'app_settings', 'economy'))]);
      setItems(pk.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0)));
      setEco(ec.exists() ? ec.data() : {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const rateOf = (currency) => Number(currency === 'USD' ? eco.coinsPerUSD : eco.coinsPerINR) || 0;
  const autoCoins = (currency, price) => {
    const r = rateOf(currency);
    const p = Number(price);
    return r > 0 && p > 0 ? String(Math.floor(Number((p * r).toFixed(6)))) : '';
  };

  // changing price or currency fills "coins" from the rate, until the admin types coins by hand
  const change = (patch) => {
    const next = { ...form, ...patch };
    if (!coinsTouched && ('price' in patch || 'currency' in patch)) next.coins = autoCoins(next.currency, next.price);
    setForm(next);
  };

  const openNew = () => {
    setForm({ ...EMPTY, order: String(items.length + 1) });
    setEditingId(null);
    setCoinsTouched(false);
    setError('');
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditingId(p.id);
    setCoinsTouched(true);
    setForm({ name: p.name || '', currency: p.currency || 'USD', price: String(p.price ?? ''), coins: String(p.coins ?? ''), bonusCoins: String(p.bonusCoins ?? 0), order: String(p.order ?? 0), enabled: !!p.enabled });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setError('');
    setOk('');
    const price = Number(form.price);
    const coins = form.coins === '' ? undefined : Number(form.coins);
    const bonusCoins = Number(form.bonusCoins || 0);
    if (!form.name.trim()) return setError('Name is required.');
    if (!(price > 0)) return setError('Price must be more than 0.');
    if (coins === undefined && rateOf(form.currency) <= 0) return setError(`Enter the coins, or set the ${form.currency} rate in Economy settings first.`);
    if (coins !== undefined && !(Number.isInteger(coins) && coins >= 1)) return setError('Coins must be a whole number, 1 or more.');
    if (!(Number.isInteger(bonusCoins) && bonusCoins >= 0)) return setError('Bonus coins must be a whole number (0 or more).');
    const body = { name: form.name.trim(), currency: form.currency, price, bonusCoins, order: Number(form.order || 0), enabled: !!form.enabled };
    if (coins !== undefined) body.coins = coins;
    setSaving(true);
    try {
      if (editingId) await api(`/admin/coin-packages/${editingId}`, 'PUT', body);
      else await api('/admin/coin-packages', 'POST', body);
      setOpen(false);
      setOk(editingId ? 'Package updated.' : 'Package added. It is now visible in the app.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p) => {
    setError('');
    setOk('');
    try {
      await api(`/admin/coin-packages/${p.id}`, 'PUT', { enabled: !p.enabled });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const shown = useMemo(() => items.filter((p) => (tab === 'on' ? p.enabled : tab === 'off' ? !p.enabled : true)), [items, tab]);
  const liveCount = items.filter((p) => p.enabled).length;
  const previewItem = { ...form, coins: form.coins === '' ? 0 : Number(form.coins), bonusCoins: Number(form.bonusCoins || 0) };

  return (
    <>
      <style>{CSS}</style>
      <div className="cp-head">
        <div>
          <h1>Recharge packages</h1>
          <p className="cp-sub">The coin packages users see on the Recharge screen. Packages are never deleted (old payments point to them); turn a package off to hide it.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className={`cp-role ${canEdit ? 'super' : ''}`}>{canEdit ? '★ Super admin' : 'Admin · view only'}</span>
          {canEdit && <button className="cp-add" onClick={openNew}><span>+</span> Add package</button>}
        </div>
      </div>

      {!canEdit && (
        <div className="cp-lock">🔒 Only a <b>Super admin</b> can add or change recharge packages. Your role: {role || 'none'}.</div>
      )}
      {error && !open && <div className="error box">{error}</div>}
      {ok && <div className="cp-ok">{ok}</div>}

      <div className="cp-stats">
        <div className="cp-stat"><b>{items.length}</b><small>Total packages</small></div>
        <div className="cp-stat gold"><b>{liveCount}</b><small>Live in the app</small></div>
        <div className="cp-stat"><b>{rateOf('INR') ? `₹1 = ${rateOf('INR')}` : '—'}</b><small>INR rate (coins)</small></div>
        <div className="cp-stat"><b>{rateOf('USD') ? `$1 = ${rateOf('USD')}` : '—'}</b><small>USD rate (coins)</small></div>
      </div>

      <div className="cp-tabs">
        {[['all', `All (${items.length})`], ['on', `Live (${liveCount})`], ['off', `Hidden (${items.length - liveCount})`]].map(([k, label]) => (
          <button key={k} className={`cp-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="muted pad">Loading...</div>
      ) : shown.length === 0 ? (
        <div className="cp-empty">
          <b>{items.length === 0 ? 'No packages yet' : 'Nothing in this tab'}</b>
          {items.length === 0 ? (canEdit ? 'Add your first package. Users will see it on the Recharge screen straight away.' : 'A Super admin has to add the first package.') : 'Change the tab above.'}
          {items.length === 0 && canEdit && <div style={{ marginTop: 18 }}><button className="cp-add" onClick={openNew}><span>+</span> Add package</button></div>}
        </div>
      ) : (
        <div className="cp-grid">
          {shown.map((p) => <PackCard key={p.id} p={p} canEdit={canEdit} onEdit={openEdit} onToggle={toggle} />)}
        </div>
      )}

      {open && canEdit && (
        <>
          <div className="cp-overlay" onClick={() => setOpen(false)} />
          <aside className="cp-drawer" role="dialog" aria-label={editingId ? 'Edit package' : 'Add package'}>
            <div className="cp-dh">
              <h3>{editingId ? 'Edit package' : 'Add a package'}</h3>
              <button className="cp-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="cp-db">
              {error && <div className="error box">{error}</div>}
              <div className="cp-preview-label">Live preview (how it looks in the app)</div>
              <div className="cp-preview"><PackCard p={previewItem} preview /></div>

              <div className="cp-fields">
                <label className="field full"><span>Package name *</span><input value={form.name} placeholder="e.g. Starter pack" onChange={(e) => change({ name: e.target.value })} /></label>
                <label className="field"><span>Currency</span>
                  <select value={form.currency} onChange={(e) => change({ currency: e.target.value })}><option>USD</option><option>INR</option></select>
                </label>
                <label className="field"><span>Price *</span><input type="number" step="0.01" min="0" value={form.price} onChange={(e) => change({ price: e.target.value })} /></label>
                <label className="field full"><span>Coins {coinsTouched ? '' : '(auto from rate)'}</span>
                  <input type="number" min="1" value={form.coins} onChange={(e) => { setCoinsTouched(true); setForm({ ...form, coins: e.target.value }); }} />
                  <div className="cp-presets">
                    {PRESETS.map((n) => (
                      <button type="button" key={n} className={`cp-chip ${Number(form.coins) === n ? 'on' : ''}`} onClick={() => { setCoinsTouched(true); setForm({ ...form, coins: String(n) }); }}>{fmt(n)}</button>
                    ))}
                    {coinsTouched && !editingId && <button type="button" className="cp-chip" onClick={() => { setCoinsTouched(false); setForm({ ...form, coins: autoCoins(form.currency, form.price) }); }}>Use rate again</button>}
                  </div>
                  <span className="cp-hint">Tap a number for a quick start, or type your own. Leave empty to use the Economy rate.</span>
                </label>
                <label className="field"><span>Bonus coins</span><input type="number" min="0" value={form.bonusCoins} onChange={(e) => setForm({ ...form, bonusCoins: e.target.value })} /></label>
                <label className="field"><span>Order (1 shows first)</span><input type="number" min="0" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></label>
                <label className="field check full"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /><span>Show this package in the app</span></label>
              </div>
            </div>
            <div className="cp-df">
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add package'}</button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
