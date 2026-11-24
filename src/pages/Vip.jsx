import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const FRAMES = ['none', 'ring', 'double', 'glow'];
const ENTRY = ['none', 'glow', 'sparkle', 'royal', 'fire'];
const CHAT = ['none', 'name_color', 'bubble'];

function GlossSelect({ value, onChange, options, disabled }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({});
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const toggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const up = below < 260 && r.top > below;
      setPos(up
        ? { left: r.left, minWidth: r.width, bottom: window.innerHeight - r.top + 8, maxHeight: Math.min(300, r.top - 16) }
        : { left: r.left, minWidth: r.width, top: r.bottom + 8, maxHeight: Math.min(300, below - 16) });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => {
      if (btnRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', () => setOpen(false));
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const cur = options.find((o) => o.value === value);
  return (
    <div className="gsel">
      <button type="button" ref={btnRef} className="gsel-btn" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={toggle}>
        <span className="gsel-txt">{cur ? cur.label : ''}</span><i className="gsel-chev" />
      </button>
      {open && createPortal(
        <ul ref={listRef} className="gsel-list" role="listbox" style={pos}>
          {options.map((o) => (
            <li key={String(o.value)} role="option" aria-selected={o.value === value} className={`gsel-opt ${o.value === value ? 'on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}

const GLOSS = `
/* glossy finish: same colours, only sheen + highlights (scoped to the VIP page) */
.vipx .card { position: relative; box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(0,0,0,.45), 0 10px 26px rgba(0,0,0,.35); }
.vipx .card::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 46%; pointer-events: none; z-index: 0;
  border-radius: inherit; border-bottom-left-radius: 50% 36px; border-bottom-right-radius: 50% 36px;
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.01)); }
.vipx .card > * { position: relative; z-index: 1; }

/* tabs */
.vipx .tabs .tab.active { box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 3px 10px rgba(0,0,0,.35); }

/* buttons */
.vipx .btn { position: relative; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 5px rgba(0,0,0,.25), 0 6px 16px rgba(0,0,0,.3); }
.vipx .btn::before { content: ''; position: absolute; left: 4px; right: 4px; top: 1px; height: 46%; border-radius: 10px 10px 50% 50% / 10px 10px 8px 8px; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,.38), rgba(255,255,255,.04)); }
.vipx .btn.ghost::before { background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,0)); }

/* inputs, textarea and dropdowns */
.vipx .field input:not([type='checkbox']):not([type='color']):not([type='file']),
.vipx .field textarea,
.vipx select {
  border-radius: 14px; border: 1px solid rgba(255,255,255,.14); outline: none;
  background-image: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.015));
  box-shadow: inset 0 2px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08);
  transition: border-color .15s, box-shadow .15s;
}
.vipx select, .vipx .vip-level-native-select {
  -webkit-appearance: none !important; appearance: none !important; cursor: pointer; padding-right: 38px !important;
  border-radius: 14px !important; border: 1px solid rgba(255,255,255,.16) !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23f4c542' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
                    linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.02));
  background-repeat: no-repeat, no-repeat; background-position: right 13px center, 0 0; background-size: 14px 14px, 100% 100%;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -2px 5px rgba(0,0,0,.3), 0 4px 12px rgba(0,0,0,.3);
}
.vipx select:disabled { opacity: .6; cursor: not-allowed; }
.vipx select option { background: #1a1028; color: #fff; }
.vipx .field input:focus, .vipx .field textarea:focus, .vipx select:focus {
  border-color: var(--gold, #f4c542) !important; box-shadow: inset 0 2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(244,197,66,.16);
}

/* preview box */
.vipx .previewbox { border-radius: 16px; border: 1px solid rgba(255,255,255,.12); box-shadow: inset 0 1px 0 rgba(255,255,255,.16), inset 0 -1px 0 rgba(0,0,0,.4); }
/* ===== stronger gloss (login-page level) ===== */
.vipx .card {
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.5), 0 14px 34px rgba(0,0,0,.45);
}
.vipx .card::before {
  height: 54%;
  border-bottom-left-radius: 50% 52px; border-bottom-right-radius: 50% 52px;
  background: linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.05) 65%, rgba(255,255,255,0));
}

.vipx .btn {
  border: 1px solid rgba(255,255,255,.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -3px 6px rgba(0,0,0,.3), 0 8px 20px rgba(0,0,0,.35);
}
.vipx .btn::before { height: 50%; background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.06)); }
.vipx .btn.ghost::before { background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0)); }

.vipx .field input:not([type='checkbox']):not([type='color']):not([type='file']),
.vipx .field textarea {
  border: 1px solid rgba(255,255,255,.2);
  background-image: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02) 60%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -2px 6px rgba(0,0,0,.35), 0 3px 10px rgba(0,0,0,.25);
}
.vipx select, .vipx .vip-level-native-select {
  border: 1px solid rgba(255,255,255,.22) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3), inset 0 -3px 6px rgba(0,0,0,.35), 0 6px 14px rgba(0,0,0,.35);
}

.vipx .tabs .tab.active { text-shadow: 0 0 14px rgba(244,197,66,.35); box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 4px 12px rgba(0,0,0,.4); }
.vipx .previewbox { box-shadow: inset 0 1px 0 rgba(255,255,255,.25), inset 0 -1px 0 rgba(0,0,0,.5), 0 6px 16px rgba(0,0,0,.3); }

/* ===== glossy pill tabs (like Agencies / Host requests) ===== */
.vipx .tabs { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; }
.vipx .tabs .tab {
  position: relative; overflow: hidden; display: inline-flex; align-items: center; cursor: pointer;
  margin: 0 !important; padding: 10px 20px !important; border-radius: 16px !important;
  border: 1px solid rgba(255,255,255,.16) !important; border-top: 1px solid rgba(255,255,255,.2) !important; border-bottom: 1px solid rgba(255,255,255,.1) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 55%, rgba(0,0,0,.18)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2), inset 0 -2px 5px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.3) !important;
  transition: border-color .15s, transform .15s, color .15s;
}
.vipx .tabs .tab::before {
  content: ''; position: absolute; left: 4px; right: 4px; top: 1px; height: 48%; pointer-events: none;
  border-radius: 13px 13px 50% 50% / 13px 13px 10px 10px;
  background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0));
}
.vipx .tabs .tab:hover { transform: translateY(-1px); border-color: rgba(255,255,255,.3) !important; }
.vipx .tabs .tab.active {
  border: 1px solid rgba(255,255,255,.38) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,.08) 50%, rgba(0,0,0,.22)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -3px 6px rgba(0,0,0,.4), 0 6px 16px rgba(0,0,0,.4) !important;
  text-shadow: 0 0 14px rgba(244,197,66,.35);
}
.vipx .tabs .tab.active::before { background: linear-gradient(180deg, rgba(255,255,255,.30), rgba(255,255,255,.02)); }

`;

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

const GSEL_CSS = `
.vipx .gsel { position: relative; display: block; width: 100%; }
.vipx td .gsel { min-width: 230px; }
.vipx .gsel .gsel-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; min-height: 44px; padding: 10px 38px 10px 12px; position: relative;
  font: inherit; font-size: 14px; color: var(--text, #fff); text-align: left; cursor: pointer; outline: none;
  border-radius: 14px; border: 1px solid rgba(255,255,255,.22);
  background-color: rgba(8,4,16,.55);
  background-image: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.02));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3), inset 0 -3px 6px rgba(0,0,0,.35), 0 6px 14px rgba(0,0,0,.35);
  transition: border-color .15s, box-shadow .15s;
}
.vipx .gsel .gsel-btn:focus-visible, .vipx .gsel .gsel-btn[aria-expanded='true'] { border-color: var(--gold, #f4c542); box-shadow: inset 0 1px 0 rgba(255,255,255,.3), inset 0 -3px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(244,197,66,.16); }
.vipx .gsel .gsel-btn:disabled { opacity: .6; cursor: not-allowed; }
.vipx .gsel .gsel-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vipx .gsel .gsel-chev {
  position: absolute; right: 13px; top: 50%; width: 14px; height: 14px; margin-top: -7px; pointer-events: none; transition: transform .2s;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23f4c542' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat center / 14px 14px;
}
.vipx .gsel .gsel-btn[aria-expanded='true'] .gsel-chev { transform: rotate(180deg); }

/* the open list is drawn on top of the page (outside .vipx), so it is styled globally */
.gsel-list {
  position: fixed; z-index: 1000; margin: 0; padding: 6px; list-style: none; overflow-y: auto; color: #fff;
  border-radius: 16px; border: 1px solid rgba(255,255,255,.22);
  background-color: #1a1028;
  background-image:
    radial-gradient(130% 30% at 50% -4%, rgba(255,255,255,.2), rgba(255,255,255,.04) 55%, transparent 75%),
    linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 40%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.38), inset 0 -1px 0 rgba(0,0,0,.5), 0 18px 40px rgba(0,0,0,.6);
  animation: gselIn .16s ease-out;
}
.gsel-list .gsel-opt { padding: 9px 14px; border-radius: 10px; cursor: pointer; white-space: nowrap; border: 1px solid transparent; }
.gsel-list .gsel-opt:hover {
  border-color: rgba(255,255,255,.18);
  background-image: linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.04) 55%, rgba(0,0,0,.08));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
}
.gsel-list .gsel-opt.on {
  color: #f4c542; font-weight: 700; border-color: rgba(255,255,255,.3);
  background-image: linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.07) 49%, rgba(0,0,0,.18) 51%, rgba(0,0,0,.04) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 4px rgba(0,0,0,.3), 0 4px 10px -4px rgba(0,0,0,.5);
}
@keyframes gselIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
`;

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
    <><style>{GLOSS}{GSEL_CSS}</style><div className="vipx">
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
    </div>
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
            <label className="field"><span>Avatar frame</span><GlossSelect value={form.frameStyle} onChange={(v) => set({ frameStyle: v })} options={FRAMES.map((o) => ({ value: o, label: o }))} /></label>
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
            <label className="field"><span>Room entry effect</span><GlossSelect value={form.entryEffect} onChange={(v) => set({ entryEffect: v })} options={ENTRY.map((o) => ({ value: o, label: o }))} /></label>
            <label className="field"><span>Chat look in rooms</span><GlossSelect value={form.chatEffect} onChange={(v) => set({ chatEffect: v })} options={CHAT.map((o) => ({ value: o, label: o }))} /></label>
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
              <GlossSelect
                value={levelId}
                onChange={(v) => setGrant((current) => ({ ...current, levelId: v }))}
                disabled={levels.length === 0}
                options={levels.length ? levels.map((l) => ({ value: l.id, label: `${l.name} (Tier ${l.tier})` })) : [{ value: '', label: 'No VIP levels available' }]}
              />
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
                  <GlossSelect
                    disabled={!canEdit || busyId === g.id}
                    value={Number(g.minVipTier || 0)}
                    onChange={(v) => change(g, v)}
                    options={[{ value: 0, label: 'Everybody' }, ...tiers.map((t) => ({ value: t.tier, label: `${t.name} VIP and above (tier ${t.tier})` }))]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
