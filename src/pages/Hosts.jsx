import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

/* ------------------------------------------------------------------ */
/* SAMPLE MODE: the top-ten list below is made-up data. While true,    */
/* nothing is requested from the server. Set to false when the         */
/* endpoint exists.                                                    */
/*                                                                     */
/* Expected reply of GET /admin/hosts/top?period=week|today|month      */
/*   { items: [{ id, name, agency, level, rooms, hours, listeners,     */
/*               earnings }] }                                         */
/* ------------------------------------------------------------------ */
const SAMPLE = true;
const EP_TOP_HOSTS = '/admin/hosts/top'; // GET ?period=

const PERIODS = [['today', 'Today'], ['week', 'This week'], ['month', 'This month']];
const SORTS = [['earnings', 'Earnings'], ['listeners', 'Listeners'], ['hours', 'Hours live']];
const FACTOR = { today: 0.16, week: 1, month: 4.3 };

/* weekly sample numbers */
const SAMPLE_HOSTS = [
  { id: 'h1', name: 'Aarav Mehta', agency: 'Nova Stars', level: 12, rooms: 14, hours: 41, listeners: 18420, earnings: 482000 },
  { id: 'h2', name: 'Priya Sharma', agency: 'Pulse Agency', level: 11, rooms: 12, hours: 38, listeners: 16980, earnings: 431500 },
  { id: 'h3', name: 'Rohan Das', agency: 'Nova Stars', level: 11, rooms: 15, hours: 44, listeners: 15210, earnings: 397800 },
  { id: 'h4', name: 'Sneha Iyer', agency: 'Skyline Voice', level: 10, rooms: 10, hours: 33, listeners: 13640, earnings: 352400 },
  { id: 'h5', name: 'Kabir Singh', agency: 'Pulse Agency', level: 10, rooms: 11, hours: 36, listeners: 12900, earnings: 318900 },
  { id: 'h6', name: 'Ananya Roy', agency: 'Skyline Voice', level: 9, rooms: 9, hours: 29, listeners: 11870, earnings: 284300 },
  { id: 'h7', name: 'Vikram Nair', agency: 'Independent', level: 9, rooms: 13, hours: 40, listeners: 10450, earnings: 256700 },
  { id: 'h8', name: 'Meera Joshi', agency: 'Nova Stars', level: 8, rooms: 8, hours: 27, listeners: 9320, earnings: 219600 },
  { id: 'h9', name: 'Arjun Verma', agency: 'Independent', level: 8, rooms: 10, hours: 31, listeners: 8710, earnings: 187400 },
  { id: 'h10', name: 'Tanvi Kulkarni', agency: 'Pulse Agency', level: 7, rooms: 7, hours: 24, listeners: 7640, earnings: 152200 },
];
const scale = (list, period) => list.map((h) => ({
  ...h,
  rooms: Math.max(1, Math.round(h.rooms * FACTOR[period])),
  hours: Math.max(1, Math.round(h.hours * FACTOR[period])),
  listeners: Math.round(h.listeners * FACTOR[period]),
  earnings: Math.round(h.earnings * FACTOR[period]),
}));

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const compact = (n) => {
  n = Number(n || 0);
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return String(n);
};
const initials = (name) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/* ------------------------- glossy premium finish ------------------- */
/* Same translucent white/black layers as Settings: colours stay as is. */
const GLOSS_CSS = `
.gloss-page{--acc:var(--accent,#F4C542);}

.gloss-page .card{position:relative;overflow:hidden;border-radius:22px;border:1px solid rgba(255,255,255,.20);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(0,0,0,.45),0 18px 44px rgba(0,0,0,.55),0 2px 0 rgba(255,255,255,.04);}
.gloss-page .card::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.17),rgba(255,255,255,.06) 34%,rgba(255,255,255,0) 62%);}
.gloss-page .card::after{content:'';position:absolute;left:-12%;right:-12%;top:0;height:44%;pointer-events:none;
  border-radius:0 0 50% 50% / 0 0 100% 100%;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0));}
.gloss-page .card > *{position:relative;z-index:1;}

.gloss-page .btn,.gloss-page .pill,.gloss-page .seg button{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.20);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 -8px 14px rgba(0,0,0,.26),0 6px 14px rgba(0,0,0,.42);}
.gloss-page .btn::before,.gloss-page .pill::before,.gloss-page .seg button::before{content:'';position:absolute;left:0;right:0;top:0;height:52%;
  background:linear-gradient(180deg,rgba(255,255,255,.32),rgba(255,255,255,.02));pointer-events:none;border-radius:inherit;}
.gloss-page .btn{border-radius:14px;font-weight:700;cursor:pointer;transition:transform .15s ease,filter .15s ease,box-shadow .15s ease;}
.gloss-page .btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
.gloss-page .btn:active:not(:disabled){transform:translateY(0);}
.gloss-page .btn:disabled{opacity:.55;cursor:not-allowed;}
.gloss-page .pill{border-radius:999px;}
.gloss-page .btn:focus-visible,.gloss-page .seg button:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px;}
.gloss-page .box{position:relative;overflow:hidden;border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 8px 20px rgba(0,0,0,.4);}

/* segmented choice */
.gloss-page .seg{display:flex;flex-wrap:wrap;gap:10px;}
.gloss-page .seg button{cursor:pointer;border-radius:14px;padding:9px 16px;font:inherit;color:inherit;background:rgba(255,255,255,.05);}
.gloss-page .seg button.on{border-color:rgba(255,255,255,.38);background:linear-gradient(180deg,rgba(244,197,66,.5),rgba(183,119,19,.5));}

/* toolbar */
.gloss-page .hbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin:18px 0 0;}
.gloss-page .hbar-group{display:flex;flex-wrap:wrap;align-items:center;gap:12px;}
.gloss-page .hbar-label{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.7;}
.gloss-page .sample-pill{font-size:11px;font-weight:700;letter-spacing:.06em;padding:5px 12px;}

/* summary tiles */
.gloss-page .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px;margin:18px 0 0;}
.gloss-page .stat{padding:18px 22px;}
.gloss-page .stat span{display:block;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.7;}
.gloss-page .stat b{display:block;margin-top:8px;font-size:26px;font-weight:800;}
.gloss-page .stat small{display:block;margin-top:2px;font-size:12px;opacity:.6;}

/* top ten list */
.gloss-page .top-card{margin:18px 0 0;padding:8px 8px 10px;}
.gloss-page .top-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:16px 18px 6px;}
.gloss-page .top-head h3{margin:0;font-size:17px;font-weight:700;}
.gloss-page .top-head span{font-size:13px;opacity:.6;}
.gloss-page .cols,.gloss-page .hrow{display:grid;align-items:center;gap:14px;
  grid-template-columns:52px minmax(190px,2.2fr) 70px 70px 110px minmax(150px,1.6fr);}
.gloss-page .cols{padding:10px 18px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.6;}
.gloss-page .cols .r,.gloss-page .hrow .r{text-align:right;}
.gloss-page .hrow{position:relative;overflow:hidden;margin:8px 8px 0;padding:12px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);
  background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.01));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 5px 12px rgba(0,0,0,.3);transition:transform .15s ease,border-color .15s ease;}
.gloss-page .hrow:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.24);}
.gloss-page .hrow.top{border-color:rgba(244,197,66,.38);
  background:linear-gradient(180deg,rgba(244,197,66,.16),rgba(244,197,66,.03));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 18px rgba(244,197,66,.12),0 6px 14px rgba(0,0,0,.35);}
.gloss-page .hrow::before{content:'';position:absolute;left:0;right:0;top:0;height:48%;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,0));}
.gloss-page .hrow > *{position:relative;}

.gloss-page .rank{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:15px;color:inherit;
  border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -5px 8px rgba(0,0,0,.25),0 3px 8px rgba(0,0,0,.4);}
.gloss-page .rank.r1{color:#2b2e36;border-color:rgba(255,255,255,.5);background:linear-gradient(180deg,#ffe08a,#e0a82a);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -5px 8px rgba(120,70,0,.3),0 0 14px rgba(244,197,66,.45),0 3px 8px rgba(0,0,0,.45);}
.gloss-page .rank.r2{color:#2b2e36;background:linear-gradient(180deg,#fff,#c3c8d4);}
.gloss-page .rank.r3{color:#2b2e36;background:linear-gradient(180deg,#f0c48a,#b77713);}

.gloss-page .who{display:flex;align-items:center;gap:12px;min-width:0;}
.gloss-page .ava{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;
  border:1px solid rgba(255,255,255,.26);background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.04));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -6px 9px rgba(0,0,0,.28),0 3px 8px rgba(0,0,0,.4);}
.gloss-page .who b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gloss-page .who span{display:block;margin-top:2px;font-size:12px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gloss-page .lvl{justify-self:start;font-size:12px;font-weight:700;padding:4px 10px;}
.gloss-page .cell{font-weight:600;font-variant-numeric:tabular-nums;}

.gloss-page .earn b{display:block;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
.gloss-page .bar{position:relative;height:8px;margin-top:7px;border-radius:999px;overflow:hidden;background:rgba(0,0,0,.45);
  box-shadow:inset 0 1px 3px rgba(0,0,0,.7),inset 0 -1px 0 rgba(255,255,255,.1);}
.gloss-page .bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(180deg,rgba(244,197,66,.95),rgba(183,119,19,.95));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 10px rgba(244,197,66,.3);transition:width .5s cubic-bezier(.4,0,.2,1);}

.gloss-page .hempty{padding:34px 18px;text-align:center;opacity:.7;}
.gloss-page .hfoot{padding:12px 20px 6px;font-size:12px;opacity:.55;}

@media (max-width:860px){
  .gloss-page .cols{display:none;}
  .gloss-page .hrow{grid-template-columns:44px 1fr;row-gap:10px;}
  .gloss-page .hrow .lvl,.gloss-page .hrow .cell{display:none;}
  .gloss-page .hrow .earn{grid-column:1 / -1;}
  .gloss-page .earn b{text-align:left;}
}
@media (prefers-reduced-motion:reduce){.gloss-page *{transition:none !important;animation:none !important;}}
`;

/* ------------------------------ page ------------------------------- */
export default function Hosts() {
  const [period, setPeriod] = useState('week');
  const [sort, setSort] = useState('earnings');
  const [items, setItems] = useState(() => (SAMPLE ? scale(SAMPLE_HOSTS, 'week') : []));
  const [loading, setLoading] = useState(!SAMPLE);
  const [error, setError] = useState('');

  const load = useCallback(async (p) => {
    setError('');
    if (SAMPLE) { setItems(scale(SAMPLE_HOSTS, p)); return; }
    setLoading(true);
    try {
      const r = await api(`${EP_TOP_HOSTS}?period=${p}`, 'GET');
      setItems(r.items || []);
    } catch (e) { setError(e.message || String(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const top = useMemo(() => [...items].sort((a, b) => (b[sort] || 0) - (a[sort] || 0)).slice(0, 10), [items, sort]);
  const max = top[0]?.[sort] || 1;
  const totals = useMemo(() => ({
    earnings: top.reduce((s, h) => s + (h.earnings || 0), 0),
    listeners: top.reduce((s, h) => s + (h.listeners || 0), 0),
    hours: top.reduce((s, h) => s + (h.hours || 0), 0),
  }), [top]);

  const metricText = (h) => (sort === 'earnings' ? `${num(h.earnings)} coins` : sort === 'listeners' ? `${num(h.listeners)} listeners` : `${num(h.hours)} hrs`);
  const periodLabel = PERIODS.find(([k]) => k === period)[1].toLowerCase();

  return (
    <div className="gloss-page">
      <style>{GLOSS_CSS}</style>
      <div className="head"><h1>Hosts</h1></div>
      <p className="muted small">The ten best hosts on the platform. Change the period or the ranking to see who leads.</p>

      {error && <div className="error box" style={{ marginTop: 16 }}>{error}</div>}

      <div className="hbar">
        <div className="hbar-group">
          <span className="hbar-label">Period</span>
          <div className="seg">
            {PERIODS.map(([k, l]) => <button key={k} type="button" className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>)}
          </div>
        </div>
        <div className="hbar-group">
          <span className="hbar-label">Rank by</span>
          <div className="seg">
            {SORTS.map(([k, l]) => <button key={k} type="button" className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>)}
          </div>
          {SAMPLE && <span className="pill sample-pill">SAMPLE DATA</span>}
          <button type="button" className="btn" onClick={() => load(period)} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      <div className="stats">
        <section className="card stat"><span>Top 10 earnings</span><b>{compact(totals.earnings)}</b><small>coins {periodLabel}</small></section>
        <section className="card stat"><span>Top 10 listeners</span><b>{compact(totals.listeners)}</b><small>reached {periodLabel}</small></section>
        <section className="card stat"><span>Hours live</span><b>{num(totals.hours)}</b><small>by the top 10 {periodLabel}</small></section>
      </div>

      <section className="card top-card">
        <div className="top-head"><h3>Top 10 hosts</h3><span>Ranked by {SORTS.find(([k]) => k === sort)[1].toLowerCase()}, {periodLabel}</span></div>
        <div className="cols">
          <span>Rank</span><span>Host</span><span>Level</span><span className="r">Rooms</span><span className="r">Hours live</span><span className="r">{SORTS.find(([k]) => k === sort)[1]}</span>
        </div>

        {loading && <div className="hempty">Loading...</div>}
        {!loading && top.length === 0 && <div className="hempty">No host activity for this period yet.</div>}

        {!loading && top.map((h, i) => (
          <div key={h.id} className={`hrow ${i < 3 ? 'top' : ''}`}>
            <span className={`rank ${i < 3 ? `r${i + 1}` : ''}`}>{i + 1}</span>
            <div className="who">
              <span className="ava">{initials(h.name)}</span>
              <div style={{ minWidth: 0 }}><b>{h.name}</b><span>{h.agency || 'Independent'}</span></div>
            </div>
            <span className="pill lvl">Lv {h.level}</span>
            <span className="cell r">{num(h.rooms)}</span>
            <span className="cell r">{num(h.hours)} hrs</span>
            <div className="earn">
              <b>{metricText(h)}</b>
              <div className="bar"><i style={{ width: `${Math.max(4, Math.round(((h[sort] || 0) / max) * 100))}%` }} /></div>
            </div>
          </div>
        ))}
        <p className="hfoot">{SAMPLE ? 'Sample numbers for layout only. They will be replaced when this page is connected to the backend.' : 'Updated when you open the page or press Refresh.'}</p>
      </section>
    </div>
  );
}
