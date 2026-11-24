import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const usd = (c) => `$${(Number(c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const mins = (m) => `${Math.floor((m || 0) / 60)}h ${String((m || 0) % 60).padStart(2, '0')}m`;

const GLOSS = `
/* glossy finish: same colours, only sheen + highlights (scoped to the Salary page) */
.salx h1 { text-shadow: 0 2px 14px rgba(244,197,66,.10); }

/* glossy pill tabs (like Agencies / Host requests) */
.salx .tabs { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; }
.salx .tabs .tab {
  position: relative; overflow: hidden; display: inline-flex; align-items: center; cursor: pointer;
  margin: 0 !important; padding: 10px 20px !important; border-radius: 16px !important;
  border: 1px solid rgba(255,255,255,.16) !important; border-top: 1px solid rgba(255,255,255,.2) !important; border-bottom: 1px solid rgba(255,255,255,.1) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 55%, rgba(0,0,0,.18)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2), inset 0 -2px 5px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.3) !important;
  transition: border-color .15s, transform .15s, color .15s;
}
.salx .tabs .tab::before {
  content: ''; position: absolute; left: 4px; right: 4px; top: 1px; height: 48%; pointer-events: none;
  border-radius: 13px 13px 50% 50% / 13px 13px 10px 10px;
  background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0));
}
.salx .tabs .tab:hover { transform: translateY(-1px); border-color: rgba(255,255,255,.3) !important; }
.salx .tabs .tab.active {
  border: 1px solid rgba(255,255,255,.38) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,.08) 50%, rgba(0,0,0,.22)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -3px 6px rgba(0,0,0,.4), 0 6px 16px rgba(0,0,0,.4) !important;
  text-shadow: 0 0 14px rgba(244,197,66,.35);
}
.salx .tabs .tab.active::before { background: linear-gradient(180deg, rgba(255,255,255,.30), rgba(255,255,255,.02)); }

/* cards (filter bar + table): curved light sheen at the top, glass edge */
.salx .card {
  border: 1px solid rgba(255,255,255,.2);
  background-image:
    radial-gradient(120% 38% at 50% -6%, rgba(255,255,255,.17), rgba(255,255,255,.04) 55%, transparent 72%),
    linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,0) 40%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.5), 0 14px 34px rgba(0,0,0,.45);
}

/* table */
.salx thead th {
  background-image: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.03));
  border-bottom: 1px solid rgba(255,255,255,.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22);
}
.salx tbody td { border-bottom: 1px solid rgba(255,255,255,.07); }
.salx tbody tr:hover td { background-image: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.01)); }

/* status pills */
.salx .pill {
  border: 1px solid rgba(255,255,255,.22);
  background-image: linear-gradient(180deg, rgba(255,255,255,.26) 0%, rgba(255,255,255,.06) 50%, rgba(0,0,0,.14) 51%, rgba(0,0,0,.02) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 2px rgba(0,0,0,.25), 0 3px 8px rgba(0,0,0,.3);
}

/* search boxes */
.salx input:not([type='checkbox']) {
  border-radius: 14px; border: 1px solid rgba(255,255,255,.2); outline: none;
  background-image: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02) 60%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -2px 6px rgba(0,0,0,.35), 0 3px 10px rgba(0,0,0,.25);
  transition: border-color .15s, box-shadow .15s;
}
.salx input:not([type='checkbox']):focus { border-color: var(--gold, #f4c542); box-shadow: inset 0 -2px 6px rgba(0,0,0,.35), 0 0 0 3px rgba(244,197,66,.16); }

/* buttons: keep their own colours, add the glossy highlight on top */
.salx .btn {
  position: relative; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -3px 6px rgba(0,0,0,.3), 0 8px 20px -8px rgba(0,0,0,.6);
  transition: transform .15s, filter .15s, border-color .15s;
}
.salx .btn::before {
  content: ''; position: absolute; left: 4px; right: 4px; top: 1px; height: 48%; pointer-events: none;
  border-radius: 10px 10px 50% 50% / 10px 10px 8px 8px;
  background: linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.05));
}
.salx .btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.salx .btn:active:not(:disabled) { transform: translateY(1px); }
.salx .btn:disabled { cursor: not-allowed; }
.salx .btn.ghost {
  background-image: linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.07) 49%, rgba(0,0,0,.16) 51%, rgba(0,0,0,.04) 100%);
}
.salx .btn.ghost::before { background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0)); }
/* align the filter bar: inputs and buttons on the same level */
.salx .salbar { align-items: center; }
.salx .salbar > * { margin-top: 0 !important; margin-bottom: 0 !important; align-self: center; }
.salx .salbar .btn { height: 44px; padding-top: 0; padding-bottom: 0; display: inline-flex; align-items: center; }
`;

/** Weekly salary approval: the server makes one record per host every Monday; a Super admin approves or rejects them (one by one or many at once). */
export default function Salary({ role }) {
  const canEdit = role === 'super_admin';
  const [status, setStatus] = useState('pending');
  const [week, setWeek] = useState('');
  const [currentWeek, setCurrentWeek] = useState('');
  const [items, setItems] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  const fail = (e) => { setNote(''); setError(e.message || String(e)); };
  const ok = (m) => { setError(''); setNote(m); };

  const load = useCallback(async () => {
    if (!canEdit) return setLoading(false);
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (week) qs.set('week', week);
      if (status) qs.set('status', status);
      const r = await api(`/admin/salary?${qs.toString()}`);
      setItems(r.items || []);
      setCurrentWeek(r.currentWeek || '');
      setPicked(new Set());
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [canEdit, week, status]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((r) => `${r.hostName} ${r.hostUserId} ${r.agencyName}`.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const pendingShown = shown.filter((r) => r.status === 'pending');
  const total = pendingShown.reduce((s, r) => s + r.hostSalaryCents + r.agentSalaryCents, 0);

  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPicked = pendingShown.length > 0 && pendingShown.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(pendingShown.map((r) => r.id)));

  const decide = async (ids, decision) => {
    if (!ids.length) return;
    let reason = null;
    if (decision === 'reject') {
      reason = window.prompt('Reason for rejecting (the host can see it)');
      if (reason === null) return;
      if (reason.trim().length < 3) return fail(new Error('Please write a short reason.'));
    }
    const sum = items.filter((r) => ids.includes(r.id)).reduce((s, r) => s + r.hostSalaryCents + r.agentSalaryCents, 0);
    if (!window.confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} ${ids.length} record(s)${decision === 'approve' ? ` and add ${usd(sum)} to the balances` : ''}? This is saved in the audit log and cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await api('/admin/salary/decision', 'POST', { ids, decision, reason });
      ok(`${r.done} record(s) ${decision === 'approve' ? 'approved' : 'rejected'}${r.skipped ? `, ${r.skipped} skipped (already decided)` : ''}.`);
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const runWeek = async () => {
    const w = window.prompt('Make the salary records of a FINISHED week, for example 2026-W47.\nThe server does this by itself every Monday; use this only if a week was missed.');
    if (!w) return;
    setBusy(true);
    try {
      const r = await api('/admin/salary/run-week', 'POST', { week: w.trim() });
      ok(`Week ${w.trim()}: ${r.created} record(s) waiting for approval, ${r.notEligible} not eligible.`);
      setWeek(w.trim());
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return (<><div className="head"><h1>Salary approval</h1></div><p className="muted pad">Only a Super admin can approve salaries.</p></>);

  return (
    <><style>{GLOSS}</style><div className="salx">
      <div className="head"><h1>Salary approval</h1></div>
      <p className="muted small">
        Every Monday
       the server calculates last week's salary of each host from the Host policy. Nothing is paid until you approve.
        Approving adds the host salary to the host and the agent salary to the agency owner. Current week: <b>{currentWeek || '-'}</b>.
      </p>

      <div className="tabs">
        {['pending', 'approved', 'rejected'].map((s) => (
          <a key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)}</a>
        ))}
      </div>

      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}

      <div className="card form salbar" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Week, e.g. 2026-W47 (empty = all weeks)" value={week} onChange={(e) => setWeek(e.target.value.trim())} style={{ width: 260 }} />
        <input placeholder="Search host, ID or agency" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
        <button className="btn ghost sm" onClick={load} disabled={loading}>Refresh</button>
        <button className="btn ghost sm" onClick={runWeek} disabled={busy}>Calculate a missed week</button>
        <span style={{ flex: 1 }} />
        {status === 'pending' && (
          <>
            <span className="muted small">{pendingShown.length} waiting · {usd(total)}</span>
            <button className="btn sm" disabled={busy || picked.size === 0} onClick={() => decide([...picked], 'approve')}>Approve selected ({picked.size})</button>
            <button className="btn danger sm" disabled={busy || picked.size === 0} onClick={() => decide([...picked], 'reject')}>Reject selected</button>
          </>
        )}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              {status === 'pending' && <th><input type="checkbox" checked={allPicked} onChange={toggleAll} /></th>}
              <th>Host</th><th>Agency</th><th>Week</th><th>Diamonds</th><th>Level</th><th>Live</th>
              <th>Host salary</th><th>Agent salary</th><th>Status</th>{status === 'pending' && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="muted pad">Loading...</td></tr>}
            {!loading && shown.length === 0 && <tr><td colSpan={11} className="muted pad">Nothing here.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id}>
                {status === 'pending' && <td><input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} /></td>}
                <td>{r.hostName}<div className="muted small mono">ID {r.hostUserId}</div></td>
                <td>{r.agencyName || '-'}</td>
                <td className="mono">{r.week}</td>
                <td>{fmt(r.diamonds)}</td>
                <td>L{r.level}</td>
                <td>{r.activeDays} d · {mins(r.liveMinutes)}</td>
                <td><b>{usd(r.hostSalaryCents)}</b></td>
                <td>{usd(r.agentSalaryCents)}</td>
                <td>
                  <span className={`pill ${r.status === 'approved' ? 'active' : r.status === 'rejected' ? 'banned' : 'suspended'}`}>{r.status}</span>
                  {r.reason && <div className="muted small">{r.reason}</div>}
                </td>
                {status === 'pending' && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn sm" disabled={busy} onClick={() => decide([r.id], 'approve')}>Approve</button>{' '}
                    <button className="btn danger sm" disabled={busy} onClick={() => decide([r.id], 'reject')}>Reject</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
            </div>
    </div></>
  );
}
