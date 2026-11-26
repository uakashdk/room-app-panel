import { useEffect, useState } from 'react';

// Must match the menu names in App.jsx (PAGES keys)
export const ALL_MENUS = [
  'Users', 'Agencies', 'Rooms', 'Banners', 'Posts', 'Reports', 'Economy',
  'Games', 'Coin Packages', 'VIP', 'Transactions', 'Salary Approval',
  'Withdrawals', 'Host Policy',
];

const CSS = `
.pm-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  background: rgba(3,2,8,.72);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  animation: pmFade .18s ease;
}
@keyframes pmFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes pmPop { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }

.pm-card {
  position: relative; overflow: hidden;
  width: 100%; max-width: 640px; max-height: 88vh;
  display: flex; flex-direction: column;
  border-radius: 28px; padding: 30px;
  background: linear-gradient(160deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 28%, rgba(20,12,30,.96) 100%);
  border: 1px solid rgba(255,255,255,.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), inset 0 -1px 0 rgba(0,0,0,.55), 0 30px 80px rgba(0,0,0,.75);
  animation: pmPop .22s ease;
}
.pm-card::before {
  content: ''; position: absolute; top: -70%; left: -25%; width: 150%; height: 110%;
  background: radial-gradient(ellipse at 35% 100%, rgba(255,255,255,.13), rgba(255,255,255,.03) 55%, transparent 70%);
  border-radius: 0 0 50% 50%; pointer-events: none;
}
.pm-card > * { position: relative; z-index: 1; }

.pm-card h2 { margin: 0 0 6px; font-size: 22px; letter-spacing: .02em; }
.pm-sub { margin: 0 0 18px; font-size: 13px; opacity: .6; line-height: 1.5; }

.pm-tools { display: flex; gap: 10px; margin-bottom: 14px; }
.pm-chip {
  padding: 7px 16px; border-radius: 999px; font-size: 12px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; cursor: pointer; color: inherit;
  border: 1px solid rgba(255,255,255,.25);
  background: linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.04));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
}
.pm-chip:hover { filter: brightness(1.2); }

.pm-list {
  overflow-y: auto; padding: 2px 4px 2px 2px; margin-bottom: 18px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;
}
.pm-item {
  display: flex; align-items: center; gap: 12px; cursor: pointer;
  padding: 12px 16px; border-radius: 16px; font-weight: 600; letter-spacing: .02em;
  border: 1px solid rgba(255,255,255,.14);
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.14);
  transition: background .2s, border-color .2s, box-shadow .2s;
}
.pm-item:hover { border-color: rgba(255,255,255,.28); }
.pm-item.on {
  border-color: rgba(255,255,255,.38);
  background: linear-gradient(180deg, rgba(140,110,230,.32) 0%, rgba(70,45,130,.55) 45%, rgba(30,18,60,.9) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 6px 16px rgba(0,0,0,.45), 0 0 14px rgba(120,90,220,.2);
}
.pm-item input { width: 20px; height: 20px; accent-color: #f2c445; cursor: pointer; flex: none; }

.pm-err { margin-bottom: 12px; padding: 10px 16px; border-radius: 14px; color: #ff6b81;
  border: 1px solid rgba(255,107,129,.35); background: rgba(255,107,129,.08); }

.pm-acts { display: flex; justify-content: flex-end; gap: 12px; }
.pm-btn {
  padding: 13px 26px; border-radius: 16px; font-weight: 700; font-size: 14px; cursor: pointer;
  transition: transform .15s, filter .15s;
}
.pm-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.pm-btn:active:not(:disabled) { transform: translateY(1px); }
.pm-btn:disabled { opacity: .6; cursor: not-allowed; }
.pm-btn.ghost {
  color: inherit; border: 1px solid rgba(255,255,255,.3);
  background: linear-gradient(180deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.05) 50%, rgba(0,0,0,.25) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), inset 0 -2px 4px rgba(0,0,0,.4), 0 6px 16px rgba(0,0,0,.5);
}
.pm-btn.gold {
  color: #1a1200; border: 1px solid rgba(255,232,160,.85);
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%);
  text-shadow: 0 1px 0 rgba(255,255,255,.35);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 4px rgba(120,80,0,.35), 0 8px 20px rgba(0,0,0,.55), 0 0 18px rgba(240,190,70,.25);
}
`;

export default function PermissionsModal({ user, initial, onClose, onSave }) {
  const [picked, setPicked] = useState(initial ?? ALL_MENUS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saving, onClose]);

  const toggle = (m) => setPicked((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const submit = async () => {
    if (picked.length === 0) return setError('Select at least one menu.');
    setSaving(true);
    setError('');
    try {
      await onSave(picked);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  return (
    <div className="pm-overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <style>{CSS}</style>
      <div className="pm-card">
        <h2>Make Admin</h2>
        <p className="pm-sub">
          Choose which menus <b>{user?.name || user?.displayName || 'this user'}</b> can open.
          Menus left unticked will be hidden from their sidebar.
        </p>

        <div className="pm-tools">
          <button type="button" className="pm-chip" onClick={() => setPicked(ALL_MENUS)}>Select all</button>
          <button type="button" className="pm-chip" onClick={() => setPicked([])}>Clear</button>
        </div>

        <div className="pm-list">
          {ALL_MENUS.map((m) => (
            <label key={m} className={`pm-item ${picked.includes(m) ? 'on' : ''}`}>
              <input type="checkbox" checked={picked.includes(m)} onChange={() => toggle(m)} />
              {m}
            </label>
          ))}
        </div>

        {error && <div className="pm-err">{error}</div>}

        <div className="pm-acts">
          <button type="button" className="pm-btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="pm-btn gold" onClick={submit} disabled={saving}>
            {saving ? 'Saving...' : 'Make Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}