
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
    <>
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

      {error && (
        <div className="error box">
          {error}
        </div>
      )}

      {note && (
        <div className="ok box">
          {note}
        </div>
      )}

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
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Owner User ID (6 digits) *</span>

                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={form.ownerUserId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ownerUserId: e.target.value.replace(
                        /\D/g,
                        ''
                      ),
                    })
                  }
                />
              </label>

              <label className="field">
                <span>
                  Commission % (saved for the earning rules)
                </span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.commissionPercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      commissionPercent: e.target.value,
                    })
                  }
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
                    <td colSpan={9} className="muted pad">
                      Loading...
                    </td>
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
                      <td>
                        <b>{a.id}</b>
                      </td>

                      <td>{a.name}</td>

                      <td>
                        {a.ownerName}
                        <div className="muted small">
                          ID {a.ownerUserId}
                        </div>
                      </td>

                      <td>{a.hosts}</td>

                      <td>{a.pending}</td>

                      <td>{a.commissionPercent}%</td>

                      <td>{fmtDate(a.createdAt)}</td>

                      <td>
                        <span
                          className={`pill ${
                            a.status === 'suspended'
                              ? 'suspended'
                              : 'active'
                          }`}
                        >
                          {a.status === 'suspended'
                            ? 'Suspended'
                            : 'Active'}
                        </span>
                      </td>

                      <td>
                        <div className="acts">
                          <button
                            className="btn sm ghost"
                            onClick={() => rename(a)}
                          >
                            Rename
                          </button>

                          {a.status === 'suspended' ? (
                            <button
                              className="btn sm"
                              onClick={() =>
                                patch(
                                  a,
                                  { status: 'active' },
                                  'Activate'
                                )
                              }
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              className="btn sm danger"
                              onClick={() =>
                                patch(
                                  a,
                                  { status: 'suspended' },
                                  'Suspend'
                                )
                              }
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
                    <td colSpan={4} className="muted pad">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading && requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted pad">
                      No host requests are waiting.
                    </td>
                  </tr>
                )}

                {!loading &&
                  requests.map((r) => (
                    <tr key={r.uid}>
                      <td>{fmtDate(r.createdAt)}</td>

                      <td>
                        <b>{r.name}</b>
                        <div className="muted small">
                          ID {r.userId}
                        </div>
                      </td>

                      <td>
                        {r.agencyName}
                        <div className="muted small">
                          ID {r.agencyId}
                        </div>
                      </td>

                      <td>
                        <div className="acts">
                          <button
                            className="btn sm"
                            onClick={() =>
                              decide(r, 'approve')
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="btn sm danger"
                            onClick={() =>
                              decide(r, 'reject')
                            }
                          >
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
    </>
  );
}
