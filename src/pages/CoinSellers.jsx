// NEW FILE (admin panel). Coin sellers: applications, sellers and their stock, every transfer, and the settings.
// Data is read from Firestore (the server writes it). Changes go through the server API (super admin only).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const TIER_NAME = { S: 'S seller (anybody)', A: 'A seller (own agency hosts)', B: 'B seller (own country)' };
const n = (v) => Number(v || 0);
const fmt = (v) => n(v).toLocaleString('en-IN');
const when = (d) => (d.createdAt?.toDate ? d.createdAt.toDate() : null);

export default function CoinSellers({ role }) {
  const canEdit = role === 'super_admin';
  const [tab, setTab] = useState('apps');
  const [sellers, setSellers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, b] = await Promise.all([
        getDocs(query(collection(db, 'coin_sellers'), orderBy('createdAt', 'desc'), limit(300))),
        getDocs(query(collection(db, 'seller_transfers'), orderBy('createdAt', 'desc'), limit(300))),
      ]);
      setSellers(a.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTransfers(b.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (canEdit) api('/admin/seller-settings').then((r) => setSettings(r.settings)).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [canEdit]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okText) => {
    setError(''); setMsg('');
    try { await fn(); setMsg(okText); await load(); } catch (e) { setError(e.message); }
  };

  const pending = sellers.filter((s) => s.status === 'pending');
  return (
    <>
      <div className="head"><h1>Coin Sellers</h1><button className="btn ghost" onClick={load}>Refresh</button></div>
      <div className="tabs">
        {[['apps', `Applications (${pending.length})`], ['sellers', 'Sellers'], ['transfers', 'Transfers'], ['settings', 'Settings']].map(([k, label]) => (
          <a key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</a>
        ))}
      </div>
      {error && <div className="error box">{error}</div>}
      {msg && <div className="ok box">{msg}</div>}
      {loading && <div className="muted">Loading...</div>}
      {!loading && tab === 'apps' && <Applications rows={pending} canEdit={canEdit} act={act} settings={settings} />}
      {!loading && tab === 'sellers' && <Sellers rows={sellers.filter((s) => s.status !== 'pending')} canEdit={canEdit} act={act} settings={settings} />}
      {!loading && tab === 'transfers' && <Transfers rows={transfers} />}
      {!loading && tab === 'settings' && <Settings settings={settings} canEdit={canEdit} act={act} />}
    </>
  );
}

function Applications({ rows, canEdit, act, settings }) {
  const [form, setForm] = useState({}); // per seller: { tier, country, agencyId }
  const set = (id, patch) => setForm((f) => ({ ...f, [id]: { ...f[id], ...patch } }));
  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Applied</th><th>Person</th><th>Wants</th><th>Country</th><th>Agency</th><th>Note</th><th>Decision</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="muted pad">No application waiting.</td></tr>}
          {rows.map((s) => {
            const f = form[s.id] ?? {};
            const tier = f.tier ?? s.tier;
            return (
              <tr key={s.id}>
                <td>{when(s)?.toLocaleString() ?? '-'}</td>
                <td><div>{s.name}</div><div className="muted small mono">ID {s.userId}</div></td>
                <td>
                  <select className="btn ghost" disabled={!canEdit} value={tier} onChange={(e) => set(s.id, { tier: e.target.value })}>{Object.keys(TIER_NAME).map((t) => <option key={t} value={t}>{TIER_NAME[t]}</option>)}</select>
                  {settings && <div className="muted small">price ${settings.prices[tier]} = {fmt(settings.prices[tier] * settings.coinsPerUsd)} coins</div>}
                </td>
                <td><input style={{ width: 110 }} disabled={!canEdit} defaultValue={s.country} onChange={(e) => set(s.id, { country: e.target.value })} /></td>
                <td className="mono small">{s.agencyId ?? '-'}</td>
                <td className="small">{s.note || '-'}</td>
                <td>
                  {canEdit && (
                    <div className="acts">
                      <button className="btn" onClick={() => act(() => api(`/admin/sellers/${s.id}`, 'PUT', { status: 'approved', tier, ...(f.country !== undefined ? { country: f.country } : {}) }), 'Approved. Now add his stock in the Sellers tab.')}>Approve</button>
                      <button className="btn ghost" onClick={() => { const reason = window.prompt('Reason (the person can read it):', ''); if (reason !== null) act(() => api(`/admin/sellers/${s.id}`, 'PUT', { status: 'rejected', reason }), 'Rejected.'); }}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Sellers({ rows, canEdit, act, settings }) {
  const [q, setQ] = useState('');
  const [stockFor, setStockFor] = useState(null);
  const [mode, setMode] = useState('usd');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const shown = useMemo(() => rows.filter((s) => !q.trim() || String(s.userId).includes(q.trim()) || String(s.name ?? '').toLowerCase().includes(q.trim().toLowerCase())), [rows, q]);
  const preview = mode === 'usd' && settings && Number(amount) > 0 ? Math.round(Number(amount) * settings.coinsPerUsd) : null;

  const submitStock = () => {
    const body = mode === 'usd' ? { usd: Number(amount), reason } : { coins: Math.trunc(Number(amount)), reason };
    act(() => api(`/admin/sellers/${stockFor.id}/stock`, 'POST', body), 'Stock updated.').then(() => { setStockFor(null); setAmount(''); setReason(''); });
  };

  return (
    <>
      <div className="search" style={{ marginBottom: 12 }}><input placeholder="Search by User ID or name" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} /></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Seller</th><th>Type</th><th>Country / agency</th><th>Stock</th><th>Bought</th><th>Sold</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="muted pad">No seller.</td></tr>}
            {shown.map((s) => (
              <tr key={s.id}>
                <td><div>{s.name}</div><div className="muted small mono">ID {s.userId}</div></td>
                <td><span className="pill plain">{s.tier}</span></td>
                <td className="small">{s.country || '-'}<div className="mono muted">{s.agencyId ?? ''}</div></td>
                <td style={{ fontWeight: 800 }}>🪙 {fmt(s.stock)}</td>
                <td>{fmt(s.totalBought)}</td>
                <td>{fmt(s.totalSold)}</td>
                <td><span className={`pill ${s.status === 'approved' ? 'active' : s.status === 'suspended' ? 'suspended' : 'banned'}`}>{s.status}</span></td>
                <td>
                  {canEdit && (
                    <div className="acts">
                      {(s.status === 'approved' || s.status === 'suspended') && <button className="btn" onClick={() => setStockFor(s)}>Stock</button>}
                      {s.status === 'approved' && <button className="btn ghost" onClick={() => window.confirm(`Suspend ${s.name}? He cannot send coins until you approve him again.`) && act(() => api(`/admin/sellers/${s.id}`, 'PUT', { status: 'suspended' }), 'Suspended.')}>Suspend</button>}
                      {(s.status === 'suspended' || s.status === 'rejected') && <button className="btn ghost" onClick={() => act(() => api(`/admin/sellers/${s.id}`, 'PUT', { status: 'approved' }), 'Approved.')}>Approve</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stockFor && (
        <div className="card form" style={{ marginTop: 16, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Stock of {stockFor.name} (ID {stockFor.userId}) · now {fmt(stockFor.stock)} coins</h3>
          <div className="acts" style={{ marginBottom: 10 }}>
            <button className={`btn ${mode === 'usd' ? '' : 'ghost'}`} onClick={() => setMode('usd')}>He paid (USD)</button>
            <button className={`btn ${mode === 'coins' ? '' : 'ghost'}`} onClick={() => setMode('coins')}>Coins directly (+ or −)</button>
          </div>
          <div className="grid">
            <label className="field"><span>{mode === 'usd' ? 'Dollars the seller paid' : 'Coins (use − to take away)'}</span>
              <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {preview !== null && <span className="small">= {fmt(preview)} coins at {fmt(settings.coinsPerUsd)} coins per $1</span>}</label>
            <label className="field"><span>Reason (saved in the log)</span><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. PayPal payment #123" /></label>
          </div>
          <div className="acts">
            <button className="btn" disabled={!amount || reason.trim().length < 2} onClick={submitStock}>Save stock</button>
            <button className="btn ghost" onClick={() => setStockFor(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

function Transfers({ rows }) {
  const [period, setPeriod] = useState('7d');
  const shown = useMemo(() => {
    const since = { today: new Date().setHours(0, 0, 0, 0), '7d': Date.now() - 7 * 864e5, '30d': Date.now() - 30 * 864e5, all: 0 }[period];
    return rows.filter((r) => (when(r)?.getTime() ?? 0) >= since);
  }, [rows, period]);
  const total = shown.reduce((a, r) => a + n(r.amount), 0);
  const exportCsv = () => {
    const head = ['time', 'tier', 'seller', 'sellerId', 'receiver', 'receiverId', 'coins', 'to', 'id'];
    const lines = shown.map((r) => [when(r)?.toISOString() ?? '', r.tier, JSON.stringify(r.sellerName ?? ''), r.sellerUserId, JSON.stringify(r.receiverName ?? ''), r.receiverUserId, n(r.amount), r.toStock ? 'stock' : 'wallet', r.id].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
    a.download = `seller-transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  return (
    <>
      <div className="search" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="btn ghost" value={period} onChange={(e) => setPeriod(e.target.value)}>{[['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['all', 'All loaded']].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn ghost" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
        <span className="muted">{fmt(shown.length)} transfers · 🪙 {fmt(total)} coins</span>
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Type</th><th>Seller</th><th>Receiver</th><th>Coins</th><th>Went to</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} className="muted pad">No transfer.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id}>
                <td>{when(r)?.toLocaleString() ?? '-'}</td>
                <td><span className="pill plain">{r.tier}</span></td>
                <td><div>{r.sellerName}</div><div className="muted small mono">ID {r.sellerUserId}</div></td>
                <td><div>{r.receiverName}</div><div className="muted small mono">ID {r.receiverUserId}</div></td>
                <td style={{ fontWeight: 800 }}>{fmt(r.amount)}</td>
                <td>{r.toStock ? 'seller stock' : 'wallet'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Settings({ settings, canEdit, act }) {
  const [f, setF] = useState(null);
  useEffect(() => { if (settings) setF({ enabled: settings.enabled, coinsPerUsd: String(settings.coinsPerUsd), S: String(settings.prices.S), A: String(settings.prices.A), B: String(settings.prices.B), minTransfer: String(settings.minTransfer), maxTransfer: String(settings.maxTransfer) }); }, [settings]);
  if (!canEdit) return <p className="muted">Only a Super admin can see and change the settings.</p>;
  if (!f) return <div className="muted">Loading...</div>;
  const save = (e) => {
    e.preventDefault();
    act(() => api('/admin/seller-settings', 'PUT', {
      enabled: f.enabled, coinsPerUsd: Number(f.coinsPerUsd), prices: { S: Number(f.S), A: Number(f.A), B: Number(f.B) },
      minTransfer: Math.trunc(Number(f.minTransfer)), maxTransfer: Math.trunc(Number(f.maxTransfer)),
    }), 'Saved.');
  };
  const inp = (k, label, hint) => (
    <label className="field"><span>{label}</span><input type="number" step="any" min="0" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />{hint && <span className="small">{hint}</span>}</label>
  );
  return (
    <form className="card form" onSubmit={save}>
      <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
        <span><b>Coin selling is open</b> <span className="muted small">(off = nobody can apply or send coins)</span></span>
      </label>
      <div className="grid">
        {inp('coinsPerUsd', 'Coins for $1', 'Stock = dollars paid × this number')}
        {inp('S', 'S seller price ($)', 'Shown to people who apply')}
        {inp('A', 'A seller price ($)')}
        {inp('B', 'B seller price ($)')}
        {inp('minTransfer', 'Smallest transfer (coins)')}
        {inp('maxTransfer', 'Largest transfer (coins)')}
      </div>
      <div className="acts"><button className="btn" type="submit">Save settings</button></div>
    </form>
  );
}
