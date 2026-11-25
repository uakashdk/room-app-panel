import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

/* ------------------------------------------------------------------ */
/* SAMPLE MODE: charts show sample data until the backend is ready.    */
/* When your endpoints exist, set FORCE_SAMPLE to false.               */
/* ------------------------------------------------------------------ */
const FORCE_SAMPLE = true;

const EP_COINS = (days) => `/admin/dashboard/coin-purchases?days=${days}`;
const EP_KPIS = '/admin/dashboard/kpis';
const EP_PACKS = '/admin/dashboard/coin-packages';
const EP_HOSTS = '/admin/dashboard/host-ranking';
const EP_ROOMS = '/admin/dashboard/room-ranking';
const EP_RECENT = '/admin/dashboard/recent-purchases';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days']];
const BUCKETS = { 7: 7, 30: 10, 90: 12 };
const PALETTE = ['#F4C542', '#8b7cf6', '#f472b6', '#34d399', '#60a5fa'];

/* ------------------------------ helpers ---------------------------- */
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (n) => num(n).toLocaleString('en-IN');
const compact = (n) => num(n).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const dshort = (s) => { const d = new Date(s); return Number.isNaN(d) ? String(s) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
const niceMax = (v) => { if (v <= 0) return 10; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
const initials = (s) => String(s || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') || '?';
const listOf = (r) => (Array.isArray(r) ? r : r?.items || r?.data || r?.rows || []);

// smooth line through points (Catmull-Rom to Bezier)
const smooth = (p) => p.map((q, i) => {
  if (!i) return `M${q[0]},${q[1]}`;
  const a = p[i - 2] || p[i - 1], b = p[i - 1], c = q, d = p[i + 1] || q;
  const f = 0.18;
  return `C${b[0] + (c[0] - a[0]) * f},${b[1] + (c[1] - a[1]) * f} ${c[0] - (d[0] - b[0]) * f},${c[1] - (d[1] - b[1]) * f} ${c[0]},${c[1]}`;
}).join(' ');

const bucket = (rows, n) => {
  if (rows.length <= n) return rows.map((r) => ({ ...r, end: r.date }));
  const size = Math.ceil(rows.length / n), out = [];
  for (let i = 0; i < rows.length; i += size) {
    const g = rows.slice(i, i + size);
    out.push({ date: g[0].date, end: g[g.length - 1].date, coins: g.reduce((s, x) => s + x.coins, 0), count: g.reduce((s, x) => s + x.count, 0) });
  }
  return out;
};

/* --------------------------- sample data --------------------------- */
const rng = (seed) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const wave = (seed, n, base, amp) => { const r = rng(seed); return Array.from({ length: n }, (_, i) => Math.round(base + Math.sin(i / 1.7) * amp * 0.5 + r() * amp)); };
const SAMPLE_COINS = Object.fromEntries(RANGES.map(([days]) => {
  const r = rng(days * 13), now = Date.now();
  return [days, Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 864e5);
    const coins = Math.round(5000 + r() * 11000 + (d.getDay() % 6 === 0 ? 5000 : 0));
    return { date: d.toISOString().slice(0, 10), coins, count: Math.round(coins / (380 + r() * 140)) };
  })];
}));
const SAMPLE_KPIS = [
  { label: 'Coins sold', value: '1.28M', delta: 12.3, color: '#F4C542', series: wave(1, 16, 40, 40) },
  { label: 'Revenue (USD)', value: '$18,420', delta: 8.1, color: '#8b7cf6', series: wave(2, 16, 30, 50) },
  { label: 'Active hosts', value: '342', delta: -1.2, color: '#34d399', series: wave(3, 16, 50, 30) },
  { label: 'Live viewers', value: '4,812', delta: 5.6, type: 'bars', series: [38, 56, 71, 44, 90, 62, 100] },
];
const SAMPLE_PACKS = [['100 coins', 4200], ['500 coins', 9800], ['1,000 coins', 15400], ['5,000 coins', 7300], ['10,000 coins', 3100]].map(([name, value]) => ({ name, value }));
const SAMPLE_HOSTS = [['Priya Nair', 98400], ['Rohan Das', 87250], ['Ananya Roy', 76100], ['Kabir Singh', 61800], ['Meera Iyer', 54300], ['Arjun Mehta', 47900], ['Sana Khan', 39600], ['Vikram Patel', 33200], ['Isha Gupta', 27100], ['Dev Malhotra', 21800]]
  .map(([name, value], i) => ({ id: 482100 + i * 37, name, avatar: '', value }));
const SAMPLE_ROOMS = [['Desi Beats Lounge', 'Priya Nair', 1280, 48200], ['Late Night Talks', 'Rohan Das', 960, 31500], ['Bollywood Karaoke', 'Ananya Roy', 744, 27800], ['Gully Cricket Fans', 'Kabir Singh', 510, 12900], ['Chai & Shayari', 'Meera Iyer', 322, 9400]]
  .map(([name, host, viewers, coins], i) => ({ id: 9100 + i, name, host, viewers, coins, live: true }));
const SAMPLE_RECENT = [
  ['Sourav Dutta', 100231, '1,000 coins', 1000, '$9.99', 'paid'], ['Neha Verma', 100877, '5,000 coins', 5000, '$44.99', 'paid'],
  ['Imran Ali', 101542, '500 coins', 500, '$4.99', 'pending'], ['Pooja Sen', 102019, '10,000 coins', 10000, '$84.99', 'paid'],
  ['Rahul Bose', 102664, '100 coins', 100, '$0.99', 'failed'],
].map(([user, userId, pack, coins, amount, status]) => ({ user, userId, pack, coins, amount, status }));

/* ----------------------------- normalisers ------------------------- */
const normCoins = (r) => listOf(r).map((x) => ({ date: x.date || x.day || x.label, coins: num(x.coins ?? x.totalCoins ?? x.amount), count: num(x.count ?? x.purchases) }));
const normHosts = (r) => listOf(r).map((x) => ({ id: x.userId ?? x.id, name: x.name || x.userName || 'Host', avatar: x.avatar || '', value: num(x.diamonds ?? x.value) })).sort((a, b) => b.value - a.value).slice(0, 10);
const normRooms = (r) => listOf(r).map((x) => ({ id: x.roomId ?? x.id, name: x.name || x.roomName || 'Room', host: x.hostName || x.host || '', viewers: num(x.viewers ?? x.online), coins: num(x.coins), live: x.live !== false })).sort((a, b) => b.viewers - a.viewers).slice(0, 5);
const normPacks = (r) => listOf(r).map((x) => ({ name: x.name || x.package, value: num(x.value ?? x.count) }));
const same = (r) => listOf(r);

/* one small hook for every card: sample / loading / error / reload */
function useData(url, sample, norm) {
  const [s, setS] = useState({ data: FORCE_SAMPLE ? sample : [], loading: !FORCE_SAMPLE, error: '' });
  const load = useCallback(async (silent) => {
    if (FORCE_SAMPLE) return setS({ data: sample, loading: false, error: '' });
    if (!silent) setS((x) => ({ ...x, loading: true, error: '' }));
    try { setS({ data: norm(await api(url, 'GET')), loading: false, error: '' }); }
    catch (e) { setS((x) => ({ data: silent ? x.data : [], loading: false, error: e.message || String(e) })); }
  }, [url, sample, norm]);
  useEffect(() => { load(); }, [load]);
  return [s, load];
}

/* ------------------------- glossy premium finish ------------------- */
/* Translucent white/black layers only: colours and theme stay as is.   */
const GLOSS_CSS = `
.gloss-page{--acc:var(--accent,#F4C542);--up:#34d399;--down:#f87171;}
.gloss-page .card{position:relative;border-radius:18px;border:1px solid rgba(255,255,255,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -1px 0 rgba(0,0,0,.35),0 14px 36px rgba(0,0,0,.45);}
.gloss-page .card::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03) 38%,rgba(255,255,255,0) 60%);}
.gloss-page .card > *{position:relative;}
.gloss-page .tabs{gap:10px;margin:0;}
.gloss-page .tab,.gloss-page .btn,.gloss-page .pill{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.16);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -7px 12px rgba(0,0,0,.22),0 4px 10px rgba(0,0,0,.38);}
.gloss-page .tab::before,.gloss-page .btn::before,.gloss-page .pill::before{content:'';position:absolute;left:0;right:0;top:0;height:50%;
  background:linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,0));pointer-events:none;}
.gloss-page .tab{cursor:pointer;border-radius:14px;transition:transform .15s ease;}
.gloss-page .tab:hover{transform:translateY(-1px);}
.gloss-page .tab.active{border-color:rgba(255,255,255,.3);}
.gloss-page .btn{border-radius:10px;transition:transform .15s ease,filter .15s ease;}
.gloss-page .btn:hover{transform:translateY(-1px);filter:brightness(1.08);}
.gloss-page .pill{border-radius:999px;}
.gloss-page .tab:focus-visible,.gloss-page .btn:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px;}

.gloss-page .dash-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;}
.gloss-page .dash-right{display:flex;align-items:center;gap:12px;}
.gloss-page .dash-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px;margin-top:18px;}
.gloss-page .s3{grid-column:span 3;}.gloss-page .s4{grid-column:span 4;}.gloss-page .s6{grid-column:span 6;}
.gloss-page .s8{grid-column:span 8;}.gloss-page .s12{grid-column:span 12;}
@media (max-width:1180px){.gloss-page .s3{grid-column:span 6;}.gloss-page .s4,.gloss-page .s6,.gloss-page .s8{grid-column:span 12;}}
@media (max-width:640px){.gloss-page .s3{grid-column:span 12;}}
.gloss-page .panel{padding:18px 20px;margin:0;}
.gloss-page .panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
.gloss-page .panel-head h3{margin:0;font-size:16px;}
.gloss-page .panel-head p{margin:3px 0 0;}
.gloss-page .sample{font-size:11px;font-weight:700;letter-spacing:.04em;padding:4px 10px;}

/* KPI cards */
.gloss-page .kpi{padding:16px 18px;}
.gloss-page .kpi-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.gloss-page .kpi-top span{font-size:13px;opacity:.75;}
.gloss-page .kpi-val{font-size:26px;font-weight:700;line-height:1.1;margin-top:6px;}
.gloss-page .delta{font-size:12px;font-weight:700;white-space:nowrap;}
.gloss-page .delta.up{color:var(--up);}.gloss-page .delta.down{color:var(--down);}
.gloss-page .kpi svg{display:block;width:100%;height:56px;margin-top:8px;overflow:visible;}

/* charts */
.gloss-page .chart-wrap{position:relative;width:100%;}
.gloss-page .chart-wrap svg{display:block;width:100%;height:auto;overflow:visible;}
.gloss-page .gl{stroke:rgba(255,255,255,.08);}
.gloss-page .ax{fill:rgba(255,255,255,.55);font-size:11px;}
.gloss-page .legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;}
.gloss-page .legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;}
.gloss-page .tip{position:absolute;transform:translate(-50%,-100%);margin-top:-10px;padding:8px 12px;border-radius:12px;
  white-space:nowrap;pointer-events:none;font-size:12px;border:1px solid rgba(255,255,255,.2);
  background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.03)),rgba(20,15,30,.94);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 10px 24px rgba(0,0,0,.55);}
.gloss-page .tip b{display:block;font-size:14px;}.gloss-page .tip span{opacity:.7;display:block;}
.gloss-page .donut-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}
.gloss-page .donut-wrap svg{width:210px;max-width:100%;overflow:visible;}
.gloss-page .donut-wrap circle{transition:stroke-width .15s ease;cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));}

/* rankings */
.gloss-page .rank-list{display:flex;flex-direction:column;gap:9px;margin:0;padding:0;list-style:none;}
.gloss-page .rank-row{display:grid;grid-template-columns:30px 38px minmax(0,1fr) auto;align-items:center;gap:12px;padding:9px 12px;
  border-radius:14px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.015));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 8px rgba(0,0,0,.28);}
.gloss-page .rank-no,.gloss-page .avatar{position:relative;overflow:hidden;display:grid;place-items:center;border-radius:50%;font-weight:700;
  border:1px solid rgba(255,255,255,.2);background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.05));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 2px 6px rgba(0,0,0,.4);}
.gloss-page .rank-no{width:28px;height:28px;font-size:13px;}
.gloss-page .avatar{width:38px;height:38px;font-size:13px;}
.gloss-page .avatar img{width:100%;height:100%;object-fit:cover;}
.gloss-page .rank-no.r1{background:#F4C542;color:#2a1f00;}.gloss-page .rank-no.r2{background:#cfd3dc;color:#22252c;}.gloss-page .rank-no.r3{background:#c88a5a;color:#2b1708;}
.gloss-page .rank-main{min-width:0;}
.gloss-page .rank-name{display:flex;align-items:center;gap:8px;font-weight:600;}
.gloss-page .rank-name>span:first-child,.gloss-page .rank-sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gloss-page .rank-sub{font-size:12px;opacity:.65;}
.gloss-page .bar{position:relative;height:7px;margin-top:7px;border-radius:999px;background:rgba(0,0,0,.35);box-shadow:inset 0 1px 2px rgba(0,0,0,.5);overflow:hidden;}
.gloss-page .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:inherit;background:var(--acc);box-shadow:inset 0 1px 0 rgba(255,255,255,.45);}
.gloss-page .rank-val{text-align:right;font-weight:700;white-space:nowrap;}
.gloss-page .rank-val small{display:block;font-weight:400;opacity:.65;font-size:11px;}
.gloss-page .live{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;
  border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.3);}
.gloss-page .live::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--up);animation:dpulse 1.6s ease-in-out infinite;}
@keyframes dpulse{50%{opacity:.3}}

/* table */
.gloss-page .table-wrap{overflow-x:auto;}
.gloss-page table{border-collapse:separate;border-spacing:0;width:100%;}
.gloss-page thead th{background-image:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02));box-shadow:inset 0 -1px 0 rgba(255,255,255,.12);text-align:left;}
.gloss-page tbody td{border-bottom:1px solid rgba(255,255,255,.07);}
.gloss-page tbody tr:last-child td{border-bottom:0;}
.gloss-page tbody tr:hover{background-color:rgba(255,255,255,.04);}

.gloss-page .empty{padding:26px 8px;text-align:center;opacity:.7;}
.gloss-page .skeleton{height:200px;border-radius:14px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.10),rgba(255,255,255,.04));background-size:200% 100%;animation:dshim 1.4s linear infinite;}
@keyframes dshim{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.gloss-page *{transition:none !important;animation:none !important;}}
`;

/* ----------------------------- charts ------------------------------ */
function Kpi({ k, id }) {
  const W = 200, H = 56;
  let chart;
  if (k.type === 'bars') {
    const max = Math.max(...k.series);
    chart = k.series.map((v, i) => {
      const w = W / k.series.length, bh = (v / max) * 42;
      return (
        <g key={i}>
          <rect x={i * w + 5} y={H - 12} width={w - 10} height={12} rx="3" fill="rgba(255,255,255,.14)" />
          <rect x={i * w + 5} y={H - 16 - bh} width={w - 10} height={bh} rx="3" fill="url(#kb)" />
        </g>
      );
    });
  } else {
    const mn = Math.min(...k.series), mx = Math.max(...k.series);
    const pts = k.series.map((v, i) => [(i / (k.series.length - 1)) * W, H - 6 - ((v - mn) / (mx - mn || 1)) * (H - 14)]);
    const d = smooth(pts);
    chart = (
      <>
        <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#kf${id})`} />
        <path d={d} fill="none" stroke={k.color} strokeWidth="2.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.45))' }} />
      </>
    );
  }
  return (
    <section className="card kpi s3">
      <div className="kpi-top">
        <span>{k.label}</span>
        <span className={`delta ${k.delta >= 0 ? 'up' : 'down'}`}>{k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta)}%</span>
      </div>
      <div className="kpi-val">{k.value}</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`kf${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={k.color} stopOpacity=".35" /><stop offset="100%" stopColor={k.color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="kb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4C542" /><stop offset="100%" stopColor="#B77713" />
          </linearGradient>
        </defs>
        {chart}
      </svg>
    </section>
  );
}

function CoinBars({ data }) {
  const [hv, setHv] = useState(null);
  const W = 760, H = 280, p = { l: 46, r: 10, t: 12, b: 28 };
  const iw = W - p.l - p.r, ih = H - p.t - p.b;
  const maxC = niceMax(Math.max(0, ...data.map((d) => d.coins)));
  const maxN = Math.max(1, ...data.map((d) => d.count));
  const slot = iw / data.length, bw = Math.min(16, slot * 0.28);
  const yC = (v) => p.t + ih - (v / maxC) * ih;
  const yN = (v) => p.t + ih - (v / maxN) * ih * 0.9;
  const h = hv != null ? data[hv] : null;
  const rect = (x, y, w, fill) => <rect x={x} y={y} width={w} height={Math.max(2, p.t + ih - y)} rx="4" fill={fill} />;
  return (
    <>
      <div className="legend" style={{ marginBottom: 10 }}>
        <span><i style={{ background: '#F4C542' }} />Coins bought</span>
        <span><i style={{ background: '#e8e6f2' }} />Purchases</span>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Coin purchases">
          <defs>
            <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F4C542" /><stop offset="100%" stopColor="#B77713" /></linearGradient>
            <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#9a98ad" /></linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line className="gl" x1={p.l} x2={W - p.r} y1={yC(maxC * t)} y2={yC(maxC * t)} />
              <text className="ax" x={p.l - 8} y={yC(maxC * t) + 4} textAnchor="end">{compact(maxC * t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = p.l + slot * i + slot / 2;
            return (
              <g key={i} opacity={hv == null || hv === i ? 1 : 0.45} style={{ transition: 'opacity .15s' }}>
                {rect(cx - bw - 2, yC(d.coins), bw, 'url(#bg1)')}
                {rect(cx + 2, yN(d.count), bw, 'url(#bg2)')}
                <text className="ax" x={cx} y={H - 8} textAnchor="middle">{dshort(d.date)}</text>
                <rect x={p.l + slot * i} y={p.t} width={slot} height={ih} fill="transparent" onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(null)} />
              </g>
            );
          })}
        </svg>
        {h && (
          <div className="tip" style={{ left: `${((p.l + slot * hv + slot / 2) / W) * 100}%`, top: `${(yC(h.coins) / H) * 100}%` }}>
            <span>{h.date === h.end ? dshort(h.date) : `${dshort(h.date)} – ${dshort(h.end)}`}</span>
            <b>{fmt(h.coins)} coins</b>
            <span>{fmt(h.count)} purchases</span>
          </div>
        )}
      </div>
    </>
  );
}

function Donut({ data }) {
  const [hv, setHv] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 70, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = data.map((d, i) => { const f = d.value / total, len = Math.max(0, f * C - 4), off = -acc * C; acc += f; return { d, i, f, len, off }; });
  const h = hv != null ? segs[hv] : null;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" role="img" aria-label="Coins sold by package">
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="26" />
        {segs.map((s) => (
          <circle key={s.i} cx="100" cy="100" r={R} fill="none" stroke={PALETTE[s.i % PALETTE.length]} strokeWidth={hv === s.i ? 30 : 24}
            strokeDasharray={`${s.len} ${C - s.len}`} strokeDashoffset={s.off} transform="rotate(-90 100 100)"
            onMouseEnter={() => setHv(s.i)} onMouseLeave={() => setHv(null)} />
        ))}
        <text x="100" y="92" textAnchor="middle" className="ax" style={{ fontSize: 11 }}>{h ? h.d.name : 'Total sold'}</text>
        <text x="100" y="114" textAnchor="middle" fill="currentColor" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(h ? h.d.value : total)}</text>
        <text x="100" y="130" textAnchor="middle" className="ax">{h ? `${Math.round(h.f * 100)}%` : 'packages'}</text>
      </svg>
      <div className="legend" style={{ justifyContent: 'center' }}>
        {data.map((d, i) => <span key={i}><i style={{ background: PALETTE[i % PALETTE.length] }} />{d.name}</span>)}
      </div>
    </div>
  );
}

function Ranking({ items, rooms }) {
  const top = Math.max(1, ...items.map((i) => (rooms ? i.viewers : i.value)));
  return (
    <ul className="rank-list">
      {items.map((x, i) => {
        const v = rooms ? x.viewers : x.value;
        return (
          <li className="rank-row" key={x.id ?? i}>
            <span className={`rank-no ${i < 3 ? `r${i + 1}` : ''}`}>{i + 1}</span>
            <span className="avatar">{x.avatar ? <img src={x.avatar} alt="" /> : initials(x.name)}</span>
            <div className="rank-main">
              <div className="rank-name"><span>{x.name}</span>{rooms && x.live && <span className="live">LIVE</span>}</div>
              <div className="rank-sub">{rooms ? `${x.host ? `Host: ${x.host}` : `Room ${x.id}`}${x.coins ? ` · ${fmt(x.coins)} coins` : ''}` : `ID ${x.id}`}</div>
              <div className="bar"><i style={{ width: `${Math.max(4, (v / top) * 100)}%` }} /></div>
            </div>
            <div className="rank-val">{fmt(v)}<small>{rooms ? 'viewers' : 'diamonds'}</small></div>
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------- page -------------------------------- */
export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [coins, loadCoins] = useData(EP_COINS(days), SAMPLE_COINS[days], normCoins);
  const [kpis, loadKpis] = useData(EP_KPIS, SAMPLE_KPIS, same);
  const [packs, loadPacks] = useData(EP_PACKS, SAMPLE_PACKS, normPacks);
  const [hosts, loadHosts] = useData(EP_HOSTS, SAMPLE_HOSTS, normHosts);
  const [rooms, loadRooms] = useData(EP_ROOMS, SAMPLE_ROOMS, normRooms);
  const [recent, loadRecent] = useData(EP_RECENT, SAMPLE_RECENT, same);

  useEffect(() => {
    if (FORCE_SAMPLE) return undefined;
    const t = setInterval(() => loadRooms(true), 30000); // live rooms refresh by themselves
    return () => clearInterval(t);
  }, [loadRooms]);

  const buckets = useMemo(() => bucket(coins.data, BUCKETS[days]), [coins.data, days]);
  const refreshAll = () => [loadCoins, loadKpis, loadPacks, loadHosts, loadRooms, loadRecent].forEach((f) => f());

  const show = (s, node, emptyText, retry) => {
    if (s.loading) return <div className="skeleton" />;
    if (s.error) return <div className="empty"><div>{s.error}</div><button className="btn" style={{ marginTop: 12 }} onClick={() => retry()}>Try again</button></div>;
    return s.data.length ? node : <div className="empty">{emptyText}</div>;
  };
  const head = (title, sub) => <div className="panel-head"><div><h3>{title}</h3>{sub && <p className="muted small">{sub}</p>}</div></div>;

  return (
    <div className="gloss-page">
      <style>{GLOSS_CSS}</style>
      <div className="head"><h1>Dashboard</h1></div>

      <div className="dash-top">
        <div className="tabs">
          {RANGES.map(([d, label]) => <a key={d} className={`tab ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{label}</a>)}
        </div>
        <div className="dash-right">
          {FORCE_SAMPLE && <span className="pill sample">SAMPLE DATA</span>}
          <button className="btn" onClick={refreshAll}>Refresh</button>
        </div>
      </div>

      <div className="dash-grid">
        {/* KPI cards with sparklines / mini bars */}
        {kpis.loading || kpis.error || !kpis.data.length
          ? <div className="s12">{show(kpis, null, 'No numbers yet.', loadKpis)}</div>
          : kpis.data.map((k, i) => <Kpi key={k.label} k={k} id={i} />)}

        {/* 1. COIN PURCHASES */}
        <section className="card panel s8">
          {head('Coin purchases', `Coins bought by users in the last ${days} days.`)}
          {show(coins, <CoinBars data={buckets} />, 'No coin purchases in this period.', loadCoins)}
        </section>

        <section className="card panel s4">
          {head('Coins sold by package', 'Share of each coin package.')}
          {show(packs, <Donut data={packs.data} />, 'No package sales yet.', loadPacks)}
        </section>

        {/* 2. HOST RANKING */}
        <section className="card panel s6">
          {head('Host ranking', 'Top 10 hosts by diamonds received.')}
          {show(hosts, <Ranking items={hosts.data} />, 'No host earnings yet.', loadHosts)}
        </section>

        {/* 3. ROOM RANKING (top 5 live rooms) */}
        <section className="card panel s6">
          {head('Top 5 live rooms', 'Rooms with the most viewers right now. Updates every 30 seconds.')}
          {show(rooms, <Ranking items={rooms.data} rooms />, 'No room is live right now.', loadRooms)}
        </section>

        {/* Recent purchases table */}
        <section className="card panel s12">
          {head('Recent coin purchases')}
          {show(recent, (
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Package</th><th>Coins</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {recent.data.map((r, i) => (
                    <tr key={r.id ?? i}>
                      <td>{r.user}<div className="muted small">ID {r.userId}</div></td>
                      <td>{r.pack}</td>
                      <td><b>{fmt(r.coins)}</b></td>
                      <td>{r.amount}</td>
                      <td><span className={`pill ${r.status === 'paid' ? 'active' : r.status === 'pending' ? 'suspended' : 'banned'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ), 'No purchases yet.', loadRecent)}
        </section>
      </div>
    </div>
  );
}
