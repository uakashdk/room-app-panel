import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';
import './Levels.css';

// the same defaults as the server (backend/src/config/levels.ts), shown until the admin saves his own numbers
const DEFAULT_ROOM = 20000;
const DEFAULT_STEPS = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000];
const DEFAULT_WEALTH = [30000, 100000, 250000, 500000, 1000000, 2000000, 4000000, 7000000, 10000000, 20000000];

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

/** a list of numbers: one input per row, add / remove at the end */
function ListEditor({ values, onChange, label, disabled, total }) {
  const set = (i, v) => onChange(values.map((x, j) => (j === i ? v : x)));
  let running = 0;
  return (
    <div>
      <div className="lv-list">
        {values.map((v, i) => {
          running += Number(v) || 0;
          return (
            <label key={i} className="field">
              <span>{label(i)}</span>
              <input type="number" min="1" disabled={disabled} value={v} onChange={(e) => set(i, e.target.value)} />
              {total && <span className="small">Total coins to reach this level: {fmt(running)}</span>}
            </label>
          );
        })}
      </div>
      {!disabled && (
        <div className="acts lv-list-acts">
          <button type="button" className="btn" onClick={() => onChange([...values, values.length ? Number(values[values.length - 1]) + 10000 : 10000])}>+ Add level</button>
          {values.length > 1 && <button type="button" className="btn" onClick={() => onChange(values.slice(0, -1))}>Remove last</button>}
        </div>
      )}
    </div>
  );
}

// Room gift target, ID level steps (coins SENT) and wealth level targets (coins RECHARGED). Only the Super admin can change them.
export default function Levels({ role }) {
  const canEdit = role === 'super_admin';
  const [room, setRoom] = useState(DEFAULT_ROOM);
  const [roomInc, setRoomInc] = useState(0);
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [beyond, setBeyond] = useState(50000);
  const [maxLevel, setMaxLevel] = useState(100);
  const [wealth, setWealth] = useState(DEFAULT_WEALTH);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [r, u, w] = await Promise.all([
          getDoc(doc(db, 'app_settings', 'room_levels')),
          getDoc(doc(db, 'app_settings', 'user_levels')),
          getDoc(doc(db, 'app_settings', 'wealth_levels')),
        ]);
        if (r.exists()) {
          if (r.data().giftCoinsPerLevel) setRoom(r.data().giftCoinsPerLevel);
          if (r.data().increasePerLevel !== undefined) setRoomInc(r.data().increasePerLevel);
        }
        if (u.exists()) {
          if (Array.isArray(u.data().steps) && u.data().steps.length) setSteps(u.data().steps);
          if (u.data().beyondIncrease !== undefined) setBeyond(u.data().beyondIncrease);
          if (u.data().maxLevel) setMaxLevel(u.data().maxLevel);
        }
        if (w.exists() && Array.isArray(w.data().thresholds) && w.data().thresholds.length) setWealth(w.data().thresholds);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    const nums = (list) => list.map((v) => Math.round(Number(v)));
    const s = nums(steps);
    const w = nums(wealth);
    if (!Number.isFinite(Number(room)) || Number(room) < 1) return setError('Room level: enter the gift coins for one level (above 0).');
    if (!Number.isFinite(Number(roomInc)) || Number(roomInc) < 0) return setError('Room level: the extra coins per level cannot be below 0.');
    if (s.some((n) => !(n > 0))) return setError('ID level: every step must be a number above 0.');
    if (w.some((n) => !(n > 0)) || w.some((n, i) => i > 0 && n <= w[i - 1])) return setError('Wealth level: every target must be bigger than the one before.');
    setSaving(true);
    try {
      await api('/admin/levels', 'PUT', {
        roomGiftCoinsPerLevel: Math.round(Number(room)),
        roomIncreasePerLevel: Math.round(Number(roomInc)),
        userSteps: s,
        userBeyondIncrease: Math.round(Number(beyond)),
        userMaxLevel: Math.round(Number(maxLevel)),
        wealthThresholds: w,
      });
      setOk('Saved. People who already have a level keep it (a level is never taken away). New numbers count from now on.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lv-wrap">
      <div className="head"><h1>Level settings</h1></div>
      <p className="muted small">
        Room level, ID level and Wealth level: they only go up and never reset. The host level (it restarts every week) is set in Host Policy.
        {!canEdit && ' You can only view this page. A Super admin can change the numbers.'}
      </p>
      {error && <div className="error box">{error}</div>}
      {ok && <div className="box lv-ok">{ok}</div>}

      <form className="card form" onSubmit={save}>
        <section className="lv-sec">
          <h3>Room level <small>(all the gifts a room has received, never resets)</small></h3>
          <p className="muted small">The room level only goes up. It counts ALL the gift coins the room has received (sent inside the room). Seats do not matter.</p>
          <div className="grid">
            <label className="field">
              <span>Gift coins for the first level up</span>
              <input type="number" min="1" disabled={!canEdit || loading} value={room} onChange={(e) => setRoom(e.target.value)} />
              <span className="small">Example: 20,000 means the room goes from level 1 to level 2 after 20,000 coins of gifts.</span>
            </label>
            <label className="field">
              <span>Extra coins for every next level</span>
              <input type="number" min="0" disabled={!canEdit || loading} value={roomInc} onChange={(e) => setRoomInc(e.target.value)} />
              <span className="small">0 = every level needs the same coins. Example: 5,000 means level 2 to 3 needs 25,000, then 30,000, 35,000 ... so it gets harder.</span>
            </label>
          </div>
        </section>

        <section className="lv-sec">
          <h3>ID level <small>(coins SENT as gifts, never resets)</small></h3>
          <p className="muted small">How many coins a user must send to go to the next level. The level a user has is always shown, it is never taken away.</p>
          <ListEditor
            values={steps} onChange={setSteps} disabled={!canEdit || loading} total
            label={(i) => `Level ${i + 1} to level ${i + 2}: coins to send`}
          />
          <div className="grid lv-extra">
            <label className="field">
              <span>After level {steps.length + 1}: every level needs this many coins MORE</span>
              <input type="number" min="0" disabled={!canEdit || loading} value={beyond} onChange={(e) => setBeyond(e.target.value)} />
              <span className="small">Example: last step 90,000 and this is 50,000 gives 140,000, then 190,000, 240,000 ... so it gets harder.</span>
            </label>
            <label className="field">
              <span>Highest ID level</span>
              <input type="number" min="10" disabled={!canEdit || loading} value={maxLevel} onChange={(e) => setMaxLevel(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="lv-sec">
          <h3>Wealth level <small>(coins RECHARGED, never resets)</small></h3>
          <p className="muted small">The total coins a user has bought. Reaching a target gives that wealth level.</p>
          <ListEditor
            values={wealth} onChange={setWealth} disabled={!canEdit || loading}
            label={(i) => `Wealth level ${i + 1}: total coins recharged`}
          />
        </section>

        {canEdit && (
          <div className="acts">
            <button className="btn primary" disabled={saving || loading}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        )}
      </form>
    </div>
  );
}
