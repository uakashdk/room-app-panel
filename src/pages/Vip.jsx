import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const FRAMES = ['none', 'ring', 'double', 'glow'];
const ENTRY = ['none', 'glow', 'sparkle', 'royal', 'fire'];
const CHAT = ['none', 'name_color', 'bubble'];
const EMPTY = {
  name: '', tier: '1', priceCoins: '1000', days: '30', color: '#F4C542', color2: '#B77713', badgeText: '', frameStyle: 'ring',
  entryEffect: 'none', entryMessage: '', chatEffect: 'name_color', order: '1', enabled: true, perks: '', frameImage: '',
};
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const textOn = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6 ? '#1A1020' : '#FFFFFF';
};
// A frame picture: made small here (256 px) and saved inside the level, so it works without any file storage.
// It should be a PNG with a see-through middle where the photo goes. A good size to design: 512 x 512 px.
async function frameFromFile(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a picture (PNG is best).');
  const bmp = await createImageBitmap(file);
  for (const side of [256, 200, 150]) {
    const c = document.createElement('canvas');
    c.width = side; c.height = side;
    c.getContext('2d').drawImage(bmp, 0, 0, side, side); // keeps the see-through parts
    const uri = c.toDataURL('image/png');
    if (uri.length <= 250_000) return uri;
  }
  throw new Error('This picture is too detailed. Use a simpler or smaller frame.');
}

const frameCss = (l) =>
  l.frameImage ? { border: '2px solid transparent' }
  : l.frameStyle === 'none' ? { border: '2px solid transparent' }
    : l.frameStyle === 'ring' ? { border: `3px solid ${l.color}` }
      : l.frameStyle === 'double' ? { border: `3px solid ${l.color}`, boxShadow: `0 0 0 3px #0000, 0 0 0 5px ${l.color2}` }
        : { border: `3px solid ${l.color}`, boxShadow: `0 0 14px 3px ${l.color}` };

// The small VIP pill, the avatar frame and a chat line, drawn exactly as the app draws them.
function Look({ l }) {
  const badge = (l.badgeText || l.name || 'VIP').toUpperCase().slice(0, 10);
  const bubble = l.chatEffect === 'bubble';
  return (
    <div className="vip-look">
      <div className="vip-avatar-wrap">
        <div className="vip-avatar" style={frameCss(l)}>🙂</div>
        {l.frameImage && <img className="vip-frameimg" src={l.frameImage} alt="" />}
      </div>
      <div>
        <div className="vip-name">
          <b style={{ color: l.chatEffect !== 'none' ? l.color : undefined }}>Aarav</b>
          <span className="vip-badge" style={{ background: `linear-gradient(135deg, ${l.color}, ${l.color2})`, color: textOn(l.color) }}>◆ {badge}</span>
        </div>
        <div className="vip-bubble" style={bubble ? { background: `${l.color}26`, borderLeft: `3px solid ${l.color}` } : undefined}>Hello everyone 👋</div>
      </div>
    </div>
  );
}

export default function Vip({ role }) {
  const canEdit = role === 'super_admin';
  const [tab, setTab] = useState('levels');
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

 const loadLevels = useCallback(async () => {
  setLoading(true);
  setError('');

  try {
    console.log('Firebase Project:', db.app.options.projectId);

    const snap = await getDocs(
      query(collection(db, 'vip_levels'), limit(100))
    );

    console.log('VIP Levels Count:', snap.size);
    console.log(
      'VIP Levels Documents:',
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );

    setLevels(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) =>
            (Number(a.order) || 0) - (Number(b.order) || 0) ||
            (Number(a.tier) || 0) - (Number(b.tier) || 0)
        )
    );
  } catch (e) {
    console.error('VIP Levels Fetch Error:', e);
    setError(e.message || 'Failed to load VIP levels.');
    setLevels([]);
  } finally {
    setLoading(false);
  }
}, []);
  useEffect(() => { loadLevels(); }, [loadLevels]);

  const ok = (m) => { setError(''); setNote(m); };
  const fail = (e) => { setNote(''); setError(e.message || String(e)); };

  return (
    <>
      <div className="head"><h1>VIP</h1></div>
      <div className="tabs">
        {[['levels', 'Levels'], ['members', 'Give / revoke & history'], ['gifts', 'VIP gifts']].map(([k, l]) => (
          <a key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => { setTab(k); setError(''); setNote(''); }}>{l}</a>
        ))}
      </div>
      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}
      {!canEdit && <p className="muted small">You can only view this page. A Super admin can change VIP.</p>}

      {tab === 'levels' && <Levels canEdit={canEdit} levels={levels} loading={loading} reload={loadLevels} ok={ok} fail={fail} />}
      {tab === 'members' && (canEdit ? <Members levels={levels} ok={ok} fail={fail} /> : <p className="muted pad">Only a Super admin can give VIP or see the VIP history.</p>)}
      {tab === 'gifts' && <VipGifts canEdit={canEdit} levels={levels} ok={ok} fail={fail} />}
    </>
  );
}

// ---------------------------------------------------------------- levels
function Levels({ canEdit, levels, loading, reload, ok, fail }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const preview = useMemo(() => ({ ...form, name: form.name || 'VIP' }), [form]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return fail(new Error('Name is required.'));
    const body = {
      name: form.name.trim(), priceCoins: Number(form.priceCoins), days: Number(form.days), color: form.color, color2: form.color2,
      badgeText: (form.badgeText || form.name).trim().slice(0, 10), frameStyle: form.frameStyle, entryEffect: form.entryEffect,
      entryMessage: form.entryMessage.trim(), chatEffect: form.chatEffect, order: Number(form.order || 0), enabled: !!form.enabled,
      perks: form.perks.split('\n').map((x) => x.trim()).filter(Boolean), frameImage: form.frameImage || '',
    };
    setSaving(true);
    try {
      if (editingId) await api(`/admin/vip-levels/${editingId}`, 'PUT', body);
      else await api('/admin/vip-levels', 'POST', { ...body, tier: Number(form.tier) });
      ok(editingId ? 'VIP level saved.' : 'VIP level added.');
      reset();
      await reload();
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  const edit = (l) => {
    setEditingId(l.id);
    setForm({
      name: l.name || '', tier: String(l.tier ?? 1), priceCoins: String(l.priceCoins ?? 0), days: String(l.days ?? 30), color: l.color || '#F4C542',
      color2: l.color2 || l.color || '#B77713', badgeText: l.badgeText || '', frameStyle: l.frameStyle || 'ring', entryEffect: l.entryEffect || 'none',
      entryMessage: l.entryMessage || '', chatEffect: l.chatEffect || 'name_color', order: String(l.order ?? 0), enabled: l.enabled !== false,
      perks: (l.perks || []).join('\n'), frameImage: l.frameImage || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggle = async (l) => {
    try {
      await api(`/admin/vip-levels/${l.id}`, 'PUT', { enabled: l.enabled === false });
      await reload();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <>
      <p className="muted small">
        A level is found by its tier (1, 2, 3 ...), so a tier is used once and cannot be changed later. Levels are never deleted, only turned off:
        people who already have a level keep their badge and frame until their time ends. A price change affects only new purchases.
      </p>

      {canEdit && (
        <form className="card form" onSubmit={save}>
          <h3>{editingId ? 'Edit level' : 'Add a level'}</h3>
          <div className="grid">
            <label className="field"><span>Name *</span><input value={form.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <label className="field"><span>Tier * (1, 2, 3 ...)</span><input type="number" min="1" disabled={!!editingId} value={form.tier} onChange={(e) => set({ tier: e.target.value })} /></label>
            <label className="field"><span>Price (coins)</span><input type="number" min="0" value={form.priceCoins} onChange={(e) => set({ priceCoins: e.target.value })} /></label>
            <label className="field"><span>Duration (days)</span><input type="number" min="1" value={form.days} onChange={(e) => set({ days: e.target.value })} /></label>
            <label className="field"><span>Badge text (max 10)</span><input maxLength={10} placeholder={form.name || 'GOLD'} value={form.badgeText} onChange={(e) => set({ badgeText: e.target.value })} /></label>
            <label className="field"><span>Order (1 shows first)</span><input type="number" min="0" value={form.order} onChange={(e) => set({ order: e.target.value })} /></label>
            <label className="field"><span>Colour</span>
              <div className="colorrow"><input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} /><input value={form.color} onChange={(e) => set({ color: e.target.value })} /></div>
            </label>
            <label className="field"><span>Second colour (gradient / frame)</span>
              <div className="colorrow"><input type="color" value={form.color2} onChange={(e) => set({ color2: e.target.value })} /><input value={form.color2} onChange={(e) => set({ color2: e.target.value })} /></div>
            </label>
            <label className="field"><span>Avatar frame</span><select value={form.frameStyle} onChange={(e) => set({ frameStyle: e.target.value })}>{FRAMES.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className="field wide"><span>Frame picture (optional, PNG with a see-through middle; it replaces the plain frame above)</span>
              <div className="colorrow">
                <input type="file" accept="image/png,image/webp" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try { set({ frameImage: await frameFromFile(f) }); } catch (err) { fail(err); }
                }} />
                {form.frameImage && <button type="button" className="btn sm ghost" onClick={() => set({ frameImage: '' })}>Remove picture</button>}
              </div>
            </label>
            <label className="field"><span>Room entry effect</span><select value={form.entryEffect} onChange={(e) => set({ entryEffect: e.target.value })}>{ENTRY.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className="field"><span>Chat look in rooms</span><select value={form.chatEffect} onChange={(e) => set({ chatEffect: e.target.value })}>{CHAT.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className="field"><span>Entry message (shown with the name)</span><input maxLength={60} placeholder="entered the room" value={form.entryMessage} onChange={(e) => set({ entryMessage: e.target.value })} /></label>
            <label className="field wide"><span>Other benefits (one per line, shown on the VIP screen)</span>
              <textarea rows={4} value={form.perks} onChange={(e) => set({ perks: e.target.value })} />
            </label>
            <label className="field check"><input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} /><span>Enabled (can be bought in the app)</span></label>
          </div>
          <div className="previewbox"><span className="muted small">Preview (like in the app)</span><Look l={preview} /></div>
          <div className="acts">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add level'}</button>
            {editingId && <button className="btn ghost" type="button" onClick={reset}>Cancel</button>}
          </div>
        </form>
      )}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Order</th><th>Level</th><th>Look</th><th>Frame picture</th><th>Price</th><th>Days</th><th>Frame</th><th>Entry</th><th>Chat</th><th>Status</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="muted pad">Loading...</td></tr>}
            {!loading && levels.length === 0 && <tr><td colSpan={11} className="muted pad">No VIP levels yet. Add one above (or run "npm run seed:vip" in the backend).</td></tr>}
            {!loading && levels.map((l) => (
              <tr key={l.id}>
                <td>{l.order}</td>
                <td><b>{l.name}</b><div className="muted small">tier {l.tier}</div></td>
                <td><span className="vip-badge" style={{ background: `linear-gradient(135deg, ${l.color}, ${l.color2 || l.color})`, color: textOn(l.color) }}>◆ {(l.badgeText || l.name || '').toUpperCase().slice(0, 10)}</span></td>
                <td>{l.frameImage ? <img src={l.frameImage} alt="" style={{ width: 38, height: 38 }} /> : <span className="muted small">none</span>}</td>
                <td>🪙 {Number(l.priceCoins).toLocaleString('en-IN')}</td>
                <td>{l.days}</td>
                <td>{l.frameStyle || '-'}</td>
                <td>{l.entryEffect || '-'}</td>
                <td>{l.chatEffect || '-'}</td>
                <td><span className={`pill ${l.enabled === false ? 'plain' : 'active'}`}>{l.enabled === false ? 'Off' : 'On'}</span></td>
                {canEdit && (
                  <td><div className="acts">
                    <button className="btn sm ghost" onClick={() => edit(l)}>Edit</button>
                    <button className="btn sm ghost" onClick={() => toggle(l)}>{l.enabled === false ? 'Turn on' : 'Turn off'}</button>
                  </div></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- give / revoke + history
function Members({ levels, ok, fail }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [grant, setGrant] = useState({ userId: '', levelId: '', days: '30', note: '' });
  const [revoke, setRevoke] = useState({ userId: '', reason: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await api('/admin/vip-subscriptions')).items || []);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const levelId = grant.levelId || levels[0]?.id || '';

  const doGrant = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(grant.userId)) return fail(new Error('Enter the 6-digit User ID.'));
    const lvl = levels.find((l) => l.id === levelId);
    if (!window.confirm(`Give ${lvl?.name} VIP for ${grant.days} days to User ID ${grant.userId}? It is free for the user and is saved in the audit log.`)) return;
    setBusy(true);
    try {
      const r = await api('/admin/vip-grant', 'POST', { userId: grant.userId, levelId, days: Number(grant.days), note: grant.note });
      ok(`VIP given. It ends on ${fmtDate(r.expiresAt)}.`);
      setGrant({ ...grant, userId: '', note: '' });
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const doRevoke = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(revoke.userId)) return fail(new Error('Enter the 6-digit User ID.'));
    if (!window.confirm(`End the VIP of User ID ${revoke.userId} right now? The coins they paid are NOT returned automatically.`)) return;
    setBusy(true);
    try {
      await api('/admin/vip-revoke', 'POST', revoke);
      ok('VIP ended.');
      setRevoke({ userId: '', reason: '' });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const shown = rows.filter((r) => !filter.trim() || r.userId.includes(filter.trim()) || r.userName.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <>
      <div className="two">
        <form className="card form" onSubmit={doGrant}>
          <h3>Give VIP (free)</h3>
          <div className="grid">
            <label className="field"><span>User ID (6 digits) *</span><input inputMode="numeric" maxLength={6} value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value.replace(/\D/g, '') })} /></label>
            <label className="field vip-level-field">
              <span>Level</span>
              <select
                className="vip-level-native-select"
                value={levelId}
                onChange={(e) => setGrant((current) => ({ ...current, levelId: e.target.value }))}
                disabled={levels.length === 0}
                required
                style={{
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  minHeight: '44px',
                  padding: '10px 12px',
                  border: '1px solid var(--border, #454052)',
                  borderRadius: '9px',
                  backgroundColor: 'var(--input-bg, #171724)',
                  color: 'var(--text, #ffffff)',
                  fontSize: '14px',
                  appearance: 'auto',
                  WebkitAppearance: 'menulist',
                  cursor: levels.length ? 'pointer' : 'not-allowed',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {levels.length === 0 && <option value="">No VIP levels available</option>}
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} (Tier {l.tier})
                  </option>
                ))}
              </select>
            </label>
            <label className="field"><span>Days</span><input type="number" min="1" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} /></label>
            <label className="field"><span>Note (why)</span><input maxLength={120} value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} /></label>
          </div>
          <div className="acts"><button className="btn" disabled={busy || levels.length === 0}>Give VIP</button></div>
        </form>

        <form className="card form" onSubmit={doRevoke}>
          <h3>End someone's VIP</h3>
          <div className="grid">
            <label className="field"><span>User ID (6 digits) *</span><input inputMode="numeric" maxLength={6} value={revoke.userId} onChange={(e) => setRevoke({ ...revoke, userId: e.target.value.replace(/\D/g, '') })} /></label>
            <label className="field wide"><span>Reason * (saved in the audit log)</span><input maxLength={120} value={revoke.reason} onChange={(e) => setRevoke({ ...revoke, reason: e.target.value })} /></label>
          </div>
          <div className="acts"><button className="btn danger" disabled={busy || revoke.reason.trim().length < 3}>End VIP</button></div>
        </form>
      </div>

      <div className="head"><h2>VIP history</h2><div className="search"><input placeholder="Filter by User ID or name" value={filter} onChange={(e) => setFilter(e.target.value)} /></div></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>User</th><th>Level</th><th>Days</th><th>Paid</th><th>Source</th><th>Ends</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="muted pad">Loading...</td></tr>}
            {!loading && shown.length === 0 && <tr><td colSpan={7} className="muted pad">No VIP purchases yet.</td></tr>}
            {!loading && shown.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.createdAt)}</td>
                <td><b>{r.userName}</b><div className="muted small">ID {r.userId || '-'}</div></td>
                <td>{r.levelName}</td>
                <td>{r.days}</td>
                <td>{r.priceCoins ? `🪙 ${r.priceCoins.toLocaleString('en-IN')}` : 'Free'}</td>
                <td><span className={`pill ${r.source === 'admin' ? 'suspended' : 'active'}`}>{r.source === 'admin' ? 'Admin' : 'Coins'}</span>{r.note && <div className="muted small">{r.note}</div>}</td>
                <td>{fmtDate(r.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- VIP-only gifts
function VipGifts({ canEdit, levels, ok, fail }) {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'gifts'), limit(300)));
      setGifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0) || (a.price || 0) - (b.price || 0)));
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const tiers = [...new Map(levels.map((l) => [l.tier, l])).values()].sort((a, b) => a.tier - b.tier);

  const toggleLucky = async (g) => {
    setBusyId(g.id);
    try {
      await api(`/admin/gifts/${g.id}/lucky`, 'PUT', { lucky: !g.lucky });
      setGifts((list) => list.map((x) => (x.id === g.id ? { ...x, lucky: !g.lucky } : x)));
      ok(`${g.name}: ${!g.lucky ? 'is now a lucky gift (the sender can win coins back, the receiver earns no diamonds)' : 'is a normal gift again'}.`);
    } catch (e) {
      fail(e);
    } finally {
      setBusyId(null);
    }
  };

  const change = async (g, value) => {
    const minVipTier = Number(value);
    setBusyId(g.id);
    try {
      await api(`/admin/gifts/${g.id}/vip-tier`, 'PUT', { minVipTier });
      setGifts((list) => list.map((x) => (x.id === g.id ? { ...x, minVipTier } : x)));
      ok(`${g.name}: ${minVipTier === 0 ? 'now for everybody' : `now only for ${tiers.find((t) => t.tier === minVipTier)?.name || `tier ${minVipTier}`} VIP and above`}.`);
    } catch (e) {
      fail(e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <p className="muted small">
        Choose which gifts only VIP members can send. The gift server checks this on every send, so it cannot be bypassed from the app.
        "Everybody" means no VIP needed.
      </p>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Gift</th><th>Category</th><th>Price</th><th>Status</th><th>Lucky</th><th>Who can send it</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="muted pad">Loading...</td></tr>}
            {!loading && gifts.length === 0 && <tr><td colSpan={6} className="muted pad">No gifts yet.</td></tr>}
            {!loading && gifts.map((g) => (
              <tr key={g.id}>
                <td>{g.emoji || '🎁'} <b>{g.name}</b></td>
                <td>{g.category || '-'}</td>
                <td>🪙 {Number(g.price || 0).toLocaleString('en-IN')}</td>
                <td><span className={`pill ${g.enabled ? 'active' : 'plain'}`}>{g.enabled ? 'On' : 'Off'}</span></td>
                <td>
                  <label className="small">
                    <input type="checkbox" disabled={!canEdit || busyId === g.id} checked={g.lucky === true} onChange={() => toggleLucky(g)} /> 🍀 Lucky
                  </label>
                </td>
                <td>
                  <select disabled={!canEdit || busyId === g.id} value={Number(g.minVipTier || 0)} onChange={(e) => change(g, e.target.value)}>
                    <option value={0}>Everybody</option>
                    {tiers.map((t) => <option key={t.tier} value={t.tier}>{t.name} VIP and above (tier {t.tier})</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
