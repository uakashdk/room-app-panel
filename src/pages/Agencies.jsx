
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const fmtDate = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-';

export default function Agencies({ role }) {
  const canEdit = role === 'super_admin';

  const [tab, setTab] = useState('agencies');
  const [agencies, setAgencies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const [form, setForm] = useState({
    name: '',
    ownerUserId: '',
    commissionPercent: '0',
  });

  const [busy, setBusy] = useState(false);

  const fail = (e) => {
    setNote('');
    setError(e.message || String(e));
  };

  const ok = (message) => {
    setError('');
    setNote(message);
  };

  // Load agencies and host applications
  const load = useCallback(async () => {
    if (!canEdit) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [a, r] = await Promise.all([
        api('/admin/agencies', 'GET'),
        api('/admin/host-applications', 'GET'),
      ]);

      setAgencies(a.items || []);
      setRequests(r.items || []);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [canEdit]);

  useEffect(() => {
    load();
  }, [load]);

  // Create agency
  const create = async (e) => {
    e.preventDefault();

    if (form.name.trim().length < 2) {
      return fail(new Error('Write the agency name.'));
    }

    if (!/^\d{6}$/.test(form.ownerUserId)) {
      return fail(
        new Error('Enter the 6-digit User ID of the owner.')
      );
    }

    const commissionPercent = Number(form.commissionPercent || 0);

    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      return fail(new Error('Commission must be between 0 and 100.'));
    }

    setBusy(true);

    try {
      const r = await api('/admin/agencies', 'POST', {
        name: form.name.trim(),
        ownerUserId: form.ownerUserId,
        commissionPercent,
      });

      ok(
        `Agency created. Its Agency ID is ${r.id}. Give this ID to the owner; people use it to find the agency.`
      );

      setForm({
        name: '',
        ownerUserId: '',
        commissionPercent: '0',
      });

      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // Update agency
  const patch = async (a, body, what) => {
    if (
      !window.confirm(
        `${what} "${a.name}" (ID ${a.id})?`
      )
    ) {
      return;
    }

    try {
      await api(`/admin/agencies/${a.id}`, 'PUT', body);

      ok('Saved.');

      await load();
    } catch (err) {
      fail(err);
    }
  };

  // Rename agency
  const rename = (a) => {
    const name = window.prompt('New agency name', a.name);

    if (
      name &&
      name.trim().length >= 2 &&
      name.trim() !== a.name
    ) {
      patch(a, { name: name.trim() }, 'Rename');
    }
  };

  // Approve or reject host application
  const decide = async (r, decision) => {
    let reason = '';

    if (decision === 'reject') {
      reason =
        window.prompt(
          'Reason (optional, the person can see it)'
        ) ?? null;
    }

    if (reason === null) return;

    if (
      !window.confirm(
        `${decision === 'approve' ? 'Approve' : 'Reject'} ${r.name} (ID ${r.userId}) for ${r.agencyName}? This is saved as an admin decision in the audit log.`
      )
    ) {
      return;
    }

    try {
      await api(
        `/admin/host-applications/${r.uid}/decision`,
        'POST',
        {
          decision,
          reason,
        }
      );

      ok(
        decision === 'approve'
          ? 'Host approved.'
          : 'Request rejected.'
      );

      await load();
    } catch (err) {
      fail(err);
    }
  };

  if (!canEdit) {
    return (
      <>
        <div className="head">
          <h1>Agencies</h1>
        </div>

        <p className="muted pad">
          Only a Super admin can manage agencies.
        </p>
      </>
    );
  }

  return (
    <div className="ag-wrap">
      <style>{`
        /* ---------- HEADER ---------- */
        .ag-wrap .head { animation: ag-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .ag-wrap .head h1 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }

        /* ---------- TABS ---------- */
        .ag-wrap .tabs { display: flex; flex-wrap: wrap; gap: 10px; margin: 6px 0 18px; animation: ag-rise .65s cubic-bezier(.2,.8,.2,1) both; }
        .ag-wrap .tab {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
          padding: 11px 20px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.03em;
          border: 1px solid rgba(255,255,255,0.16);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 55%, rgba(0,0,0,0.10));
          box-shadow:
            0 8px 18px -10px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.3),
            inset 0 -2px 4px rgba(0,0,0,0.22);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
        }
        .ag-wrap .tab:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .ag-wrap .tab.active {
          border-color: rgba(255,255,255,0.32);
          background-image: linear-gradient(180deg,
            rgba(255,255,255,0.26) 0%,
            rgba(255,255,255,0.06) 49%,
            rgba(0,0,0,0.16) 51%,
            rgba(0,0,0,0.04) 100%);
          box-shadow:
            0 12px 22px -10px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 12px rgba(255,255,255,0.07);
        }
        .ag-wrap .tab.active::before {
          content: "";
          position: absolute;
          top: 1px; left: 4%; right: 4%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.04));
          pointer-events: none;
        }

        /* ---------- GLASS CARDS (form + tables) ---------- */
        .ag-wrap .card {
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          background-image: linear-gradient(155deg,
            rgba(255,255,255,0.14) 0%,
            rgba(255,255,255,0.04) 30%,
            rgba(255,255,255,0) 55%,
            rgba(255,255,255,0.06) 100%);
          box-shadow:
            0 40px 80px -28px rgba(0,0,0,0.65),
            0 14px 30px rgba(0,0,0,0.28),
            0 0 0 1px rgba(0,0,0,0.25),
            inset 0 1.5px 0 rgba(255,255,255,0.42),
            inset 0 -1.5px 0 rgba(0,0,0,0.35),
            inset 0 0 40px rgba(255,255,255,0.035);
          animation: ag-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        /* curved glass reflection across the top */
        .ag-wrap .card::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 110px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        .ag-wrap .card > * { position: relative; }
        .ag-wrap .card.form { padding: 26px 26px 22px; margin-bottom: 22px; }
        .ag-wrap .card.form h3 { margin: 0 0 18px; letter-spacing: 0.02em; text-shadow: 0 2px 10px rgba(0,0,0,0.35); }
        .ag-wrap .card.form .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .ag-wrap .card.form .acts { margin-top: 20px; }

        /* ---------- FIELDS ---------- */
        .ag-wrap .field { display: flex; flex-direction: column; gap: 8px; }
        .ag-wrap .field > span {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.75;
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .ag-wrap .field input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.16);
          background-color: rgba(255,255,255,0.05);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%);
          color: inherit;
          font-size: 15px;
          outline: none;
          box-shadow:
            inset 0 3px 8px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 1px 0 rgba(255,255,255,0.10);
          transition: border-color .25s, background-color .25s, box-shadow .25s, transform .25s;
        }
        .ag-wrap .field input:focus {
          border-color: rgba(255,255,255,0.5);
          background-color: rgba(255,255,255,0.09);
          transform: translateY(-1px);
          box-shadow:
            0 0 0 4px rgba(255,255,255,0.08),
            0 8px 22px -8px rgba(255,255,255,0.18),
            inset 0 3px 8px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }

        /* ---------- GLOSSY BUTTONS (theme color stays from .btn) ---------- */
        .ag-wrap .btn {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.26);
          font-weight: 600;
          letter-spacing: 0.02em;
          background-image: linear-gradient(180deg,
            rgba(255,255,255,0.26) 0%,
            rgba(255,255,255,0.06) 49%,
            rgba(0,0,0,0.16) 51%,
            rgba(0,0,0,0.04) 100%);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          box-shadow:
            0 10px 20px -10px rgba(0,0,0,0.6),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 12px rgba(255,255,255,0.07);
          transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
        }
        .ag-wrap .btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .ag-wrap .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .ag-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 16px 28px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 16px rgba(255,255,255,0.12);
        }
        .ag-wrap .btn:hover:not(:disabled)::after { left: 150%; }
        .ag-wrap .btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 4px 10px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .ag-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ag-wrap .btn:not(.sm) { padding: 13px 24px; }
        .ag-wrap .btn.sm { border-radius: 10px; }
        .ag-wrap .btn.sm::before { border-radius: 9px 9px 60% 60% / 9px 9px 30% 30%; }

        /* ---------- TABLES ---------- */
        .ag-wrap table { position: relative; border-collapse: separate; border-spacing: 0; width: 100%; }
        .ag-wrap thead th {
          position: relative;
          padding: 16px 14px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.85;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.12));
          border-bottom: 1px solid rgba(255,255,255,0.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.35);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .ag-wrap tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 0 rgba(0,0,0,0.25);
          transition: background-color .25s ease;
        }
        .ag-wrap tbody tr { animation: ag-row .5s cubic-bezier(.2,.8,.2,1) both; }
        .ag-wrap tbody tr:nth-child(1) { animation-delay: .04s; }
        .ag-wrap tbody tr:nth-child(2) { animation-delay: .08s; }
        .ag-wrap tbody tr:nth-child(3) { animation-delay: .12s; }
        .ag-wrap tbody tr:nth-child(4) { animation-delay: .16s; }
        .ag-wrap tbody tr:nth-child(5) { animation-delay: .20s; }
        .ag-wrap tbody tr:nth-child(n+6) { animation-delay: .24s; }
        .ag-wrap tbody tr:nth-child(even) td { background-image: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)); }
        .ag-wrap tbody tr:hover td {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 0 rgba(0,0,0,0.25);
        }
        .ag-wrap tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.14); }
        .ag-wrap tbody tr:last-child td { border-bottom: 0; box-shadow: none; }
        .ag-wrap .pad { padding: 28px 14px; text-align: center; letter-spacing: 0.04em; }

        /* ---------- PILLS ---------- */
        .ag-wrap .pill {
          position: relative;
          overflow: hidden;
          display: inline-block;
          padding: 5px 13px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          border: 1px solid rgba(255,255,255,0.22);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.14) 51%, rgba(0,0,0,0.02) 100%);
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          box-shadow:
            0 4px 10px -4px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.5),
            inset 0 -1px 2px rgba(0,0,0,0.25);
        }

        /* ---------- ACTIONS / MESSAGES ---------- */
        .ag-wrap .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .ag-wrap .box {
          position: relative;
          margin-bottom: 16px;
          padding: 13px 16px;
          border-radius: 14px;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5);
          animation: ag-rise .4s ease both;
        }
        .ag-wrap .error.box {
          background-color: rgba(255,70,70,0.10);
          border: 1px solid rgba(255,90,90,0.4);
          animation: ag-shake .4s ease;
        }
        .ag-wrap .ok.box { border: 1px solid rgba(255,255,255,0.22); }
        .ag-wrap p.muted.small { line-height: 1.6; margin-bottom: 16px; }

        @keyframes ag-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes ag-row { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes ag-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .ag-wrap .head, .ag-wrap .tabs, .ag-wrap .card, .ag-wrap tbody tr, .ag-wrap .box { animation: none; }
        }
      `}</style>

      <div className="head">
        <h1>Agencies</h1>
      </div>

      <div className="tabs">
        <a
          className={`tab ${tab === 'agencies' ? 'active' : ''}`}
          onClick={() => setTab('agencies')}
        >
          Agencies
        </a>

        <a
          className={`tab ${tab === 'requests' ? 'active' : ''}`}
          onClick={() => setTab('requests')}
        >
          Host requests
          {requests.length ? ` (${requests.length})` : ''}
        </a>
      </div>

      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}

      {/* AGENCIES TAB */}
      {tab === 'agencies' && (
        <>
          <p className="muted small">
            A host must belong to an agency. A person sends a
            request to an agency and the agency owner approves
            it in the app. Here you create an agency and choose
            its owner (the owner gets the Agency Dashboard in
            the app). The owner must not be in another agency.
          </p>

          <form className="card form" onSubmit={create}>
            <h3>Create an agency</h3>

            <div className="grid">
              <label className="field">
                <span>Agency name *</span>
                <input
                  maxLength={40}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Owner User ID (6 digits) *</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={form.ownerUserId}
                  onChange={(e) =>
                    setForm({ ...form, ownerUserId: e.target.value.replace(/\D/g, '') })
                  }
                />
              </label>

              <label className="field">
                <span>Commission % (saved for the earning rules)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.commissionPercent}
                  onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                />
              </label>
            </div>

            <div className="acts">
              <button className="btn" disabled={busy}>
                {busy ? 'Creating...' : 'Create agency'}
              </button>
            </div>
          </form>

          {/* AGENCY TABLE */}
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agency ID</th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Hosts</th>
                  <th>Requests</th>
                  <th>Commission</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="muted pad">Loading...</td>
                  </tr>
                )}

                {!loading && agencies.length === 0 && (
                  <tr>
                    <td colSpan={9} className="muted pad">
                      No agencies yet. Create the first one above.
                    </td>
                  </tr>
                )}

                {!loading &&
                  agencies.map((a) => (
                    <tr key={a.id}>
                      <td><b>{a.id}</b></td>
                      <td>{a.name}</td>
                      <td>
                        {a.ownerName}
                        <div className="muted small">ID {a.ownerUserId}</div>
                      </td>
                      <td>{a.hosts}</td>
                      <td>{a.pending}</td>
                      <td>{a.commissionPercent}%</td>
                      <td>{fmtDate(a.createdAt)}</td>
                      <td>
                        <span className={`pill ${a.status === 'suspended' ? 'suspended' : 'active'}`}>
                          {a.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="acts">
                          <button className="btn sm ghost" onClick={() => rename(a)}>
                            Rename
                          </button>

                          {a.status === 'suspended' ? (
                            <button
                              className="btn sm"
                              onClick={() => patch(a, { status: 'active' }, 'Activate')}
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              className="btn sm danger"
                              onClick={() => patch(a, { status: 'suspended' }, 'Suspend')}
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* HOST REQUESTS TAB */}
      {tab === 'requests' && (
        <>
          <p className="muted small">
            These requests are normally approved by the agency
            owner in the app. Use the buttons here only when
            an owner is not available.
          </p>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Person</th>
                  <th>Agency</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="muted pad">Loading...</td>
                  </tr>
                )}

                {!loading && requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted pad">No host requests are waiting.</td>
                  </tr>
                )}

                {!loading &&
                  requests.map((r) => (
                    <tr key={r.uid}>
                      <td>{fmtDate(r.createdAt)}</td>
                      <td>
                        <b>{r.name}</b>
                        <div className="muted small">ID {r.userId}</div>
                      </td>
                      <td>
                        {r.agencyName}
                        <div className="muted small">ID {r.agencyId}</div>
                      </td>
                      <td>
                        <div className="acts">
                          <button className="btn sm" onClick={() => decide(r, 'approve')}>
                            Approve
                          </button>
                          <button className="btn sm danger" onClick={() => decide(r, 'reject')}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  // return (
  //   <>
  //     <div className="head">
  //       <h1>Agencies</h1>
  //     </div>

  //     <div className="tabs">
  //       <a
  //         className={`tab ${tab === 'agencies' ? 'active' : ''}`}
  //         onClick={() => setTab('agencies')}
  //       >
  //         Agencies
  //       </a>

  //       <a
  //         className={`tab ${tab === 'requests' ? 'active' : ''}`}
  //         onClick={() => setTab('requests')}
  //       >
  //         Host requests
  //         {requests.length ? ` (${requests.length})` : ''}
  //       </a>
  //     </div>

  //     {error && (
  //       <div className="error box">
  //         {error}
  //       </div>
  //     )}

  //     {note && (
  //       <div className="ok box">
  //         {note}
  //       </div>
  //     )}

  //     {/* AGENCIES TAB */}
  //     {tab === 'agencies' && (
  //       <>
  //         <p className="muted small">
  //           A host must belong to an agency. A person sends a
  //           request to an agency and the agency owner approves
  //           it in the app. Here you create an agency and choose
  //           its owner (the owner gets the Agency Dashboard in
  //           the app). The owner must not be in another agency.
  //         </p>

  //         <form className="card form" onSubmit={create}>
  //           <h3>Create an agency</h3>

  //           <div className="grid">
  //             <label className="field">
  //               <span>Agency name *</span>

  //               <input
  //                 maxLength={40}
  //                 value={form.name}
  //                 onChange={(e) =>
  //                   setForm({
  //                     ...form,
  //                     name: e.target.value,
  //                   })
  //                 }
  //               />
  //             </label>

  //             <label className="field">
  //               <span>Owner User ID (6 digits) *</span>

  //               <input
  //                 inputMode="numeric"
  //                 maxLength={6}
  //                 value={form.ownerUserId}
  //                 onChange={(e) =>
  //                   setForm({
  //                     ...form,
  //                     ownerUserId: e.target.value.replace(
  //                       /\D/g,
  //                       ''
  //                     ),
  //                   })
  //                 }
  //               />
  //             </label>

  //             <label className="field">
  //               <span>
  //                 Commission % (saved for the earning rules)
  //               </span>

  //               <input
  //                 type="number"
  //                 min="0"
  //                 max="100"
  //                 step="0.01"
  //                 value={form.commissionPercent}
  //                 onChange={(e) =>
  //                   setForm({
  //                     ...form,
  //                     commissionPercent: e.target.value,
  //                   })
  //                 }
  //               />
  //             </label>
  //           </div>

  //           <div className="acts">
  //             <button className="btn" disabled={busy}>
  //               {busy ? 'Creating...' : 'Create agency'}
  //             </button>
  //           </div>
  //         </form>

  //         {/* AGENCY TABLE */}
  //         <div className="card table-wrap">
  //           <table>
  //             <thead>
  //               <tr>
  //                 <th>Agency ID</th>
  //                 <th>Name</th>
  //                 <th>Owner</th>
  //                 <th>Hosts</th>
  //                 <th>Requests</th>
  //                 <th>Commission</th>
  //                 <th>Created</th>
  //                 <th>Status</th>
  //                 <th>Actions</th>
  //               </tr>
  //             </thead>

  //             <tbody>
  //               {loading && (
  //                 <tr>
  //                   <td colSpan={9} className="muted pad">
  //                     Loading...
  //                   </td>
  //                 </tr>
  //               )}

  //               {!loading && agencies.length === 0 && (
  //                 <tr>
  //                   <td colSpan={9} className="muted pad">
  //                     No agencies yet. Create the first one above.
  //                   </td>
  //                 </tr>
  //               )}

  //               {!loading &&
  //                 agencies.map((a) => (
  //                   <tr key={a.id}>
  //                     <td>
  //                       <b>{a.id}</b>
  //                     </td>

  //                     <td>{a.name}</td>

  //                     <td>
  //                       {a.ownerName}
  //                       <div className="muted small">
  //                         ID {a.ownerUserId}
  //                       </div>
  //                     </td>

  //                     <td>{a.hosts}</td>

  //                     <td>{a.pending}</td>

  //                     <td>{a.commissionPercent}%</td>

  //                     <td>{fmtDate(a.createdAt)}</td>

  //                     <td>
  //                       <span
  //                         className={`pill ${
  //                           a.status === 'suspended'
  //                             ? 'suspended'
  //                             : 'active'
  //                         }`}
  //                       >
  //                         {a.status === 'suspended'
  //                           ? 'Suspended'
  //                           : 'Active'}
  //                       </span>
  //                     </td>

  //                     <td>
  //                       <div className="acts">
  //                         <button
  //                           className="btn sm ghost"
  //                           onClick={() => rename(a)}
  //                         >
  //                           Rename
  //                         </button>

  //                         {a.status === 'suspended' ? (
  //                           <button
  //                             className="btn sm"
  //                             onClick={() =>
  //                               patch(
  //                                 a,
  //                                 { status: 'active' },
  //                                 'Activate'
  //                               )
  //                             }
  //                           >
  //                             Activate
  //                           </button>
  //                         ) : (
  //                           <button
  //                             className="btn sm danger"
  //                             onClick={() =>
  //                               patch(
  //                                 a,
  //                                 { status: 'suspended' },
  //                                 'Suspend'
  //                               )
  //                             }
  //                           >
  //                             Suspend
  //                           </button>
  //                         )}
  //                       </div>
  //                     </td>
  //                   </tr>
  //                 ))}
  //             </tbody>
  //           </table>
  //         </div>
  //       </>
  //     )}

  //     {/* HOST REQUESTS TAB */}
  //     {tab === 'requests' && (
  //       <>
  //         <p className="muted small">
  //           These requests are normally approved by the agency
  //           owner in the app. Use the buttons here only when
  //           an owner is not available.
  //         </p>

  //         <div className="card table-wrap">
  //           <table>
  //             <thead>
  //               <tr>
  //                 <th>Date</th>
  //                 <th>Person</th>
  //                 <th>Agency</th>
  //                 <th>Actions</th>
  //               </tr>
  //             </thead>

  //             <tbody>
  //               {loading && (
  //                 <tr>
  //                   <td colSpan={4} className="muted pad">
  //                     Loading...
  //                   </td>
  //                 </tr>
  //               )}

  //               {!loading && requests.length === 0 && (
  //                 <tr>
  //                   <td colSpan={4} className="muted pad">
  //                     No host requests are waiting.
  //                   </td>
  //                 </tr>
  //               )}

  //               {!loading &&
  //                 requests.map((r) => (
  //                   <tr key={r.uid}>
  //                     <td>{fmtDate(r.createdAt)}</td>

  //                     <td>
  //                       <b>{r.name}</b>
  //                       <div className="muted small">
  //                         ID {r.userId}
  //                       </div>
  //                     </td>

  //                     <td>
  //                       {r.agencyName}
  //                       <div className="muted small">
  //                         ID {r.agencyId}
  //                       </div>
  //                     </td>

  //                     <td>
  //                       <div className="acts">
  //                         <button
  //                           className="btn sm"
  //                           onClick={() =>
  //                             decide(r, 'approve')
  //                           }
  //                         >
  //                           Approve
  //                         </button>

  //                         <button
  //                           className="btn sm danger"
  //                           onClick={() =>
  //                             decide(r, 'reject')
  //                           }
  //                         >
  //                           Reject
  //                         </button>
  //                       </div>
  //                     </td>
  //                   </tr>
  //                 ))}
  //             </tbody>
  //           </table>
  //         </div>
  //       </>
  //     )}
  //   </>
  // );
}
