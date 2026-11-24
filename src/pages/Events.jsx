import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const KINDS = ['daily', 'weekly', 'special'];
const REPEATS = [['none', 'One time'], ['daily', 'Every day'], ['weekly', 'Every week']];
const EMPTY = { title: '', subtitle: '', description: '', bannerUrl: '', kind: 'daily', repeat: 'daily', start: '', end: '', enabled: true, order: '0' };

// "2026-11-21T20:00" (the person's own clock) <-> milliseconds
const toLocalInput = (ms) => {
  if (!ms) return '';
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};
const fmt = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '-');

// The banner: made small here (800 x 400) and saved inside the event, so no file storage is needed. A good size to design: 1600 x 800.
async function bannerFromFile(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a picture.');
  const bmp = await createImageBitmap(file);
  const w = 800, h = 400;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const r = Math.max(w / bmp.width, h / bmp.height); // fill the 2 : 1 frame, centre crop
  const dw = bmp.width * r, dh = bmp.height * r;
  c.getContext('2d').drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  for (const q of [0.8, 0.65, 0.5, 0.35]) {
    const uri = c.toDataURL('image/jpeg', q);
    if (uri.length <= 190_000) return uri;
  }
  throw new Error('This picture is too detailed. Use a simpler one.');
}

export default function Events({ role }) {
  const canEdit = role === 'super_admin';
  const [tab, setTab] = useState('events');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const fail = (e) => { setNote(''); setError(e.message || String(e)); };
  const ok = (m) => { setError(''); setNote(m); };

  if (!canEdit) return <><div className="head"><h1>Events</h1></div><p className="muted pad">Only a Super admin can manage events and announcements.</p></>;
  return (
    <>
      <div className="head"><h1>Events and announcements</h1></div>
      <div className="tabs">
        <a className={`tab ${tab === 'events' ? 'active' : ''}`} onClick={() => { setTab('events'); setError(''); setNote(''); }}>Daily events</a>
        <a className={`tab ${tab === 'announcements' ? 'active' : ''}`} onClick={() => { setTab('announcements'); setError(''); setNote(''); }}>Announcements</a>
      </div>
      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}
      {tab === 'events' ? <EventList ok={ok} fail={fail} /> : <AnnouncementList ok={ok} fail={fail} />}
    </>
  );
}

// ---------------------------------------------------------------- events
function EventList({ ok, fail }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (p) => setForm((f) => ({ ...f, ...p }));

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await api('/admin/events')).items || []); } catch (e) { fail(e); } finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (e) => {
    e.preventDefault();
    const startAt = new Date(form.start).getTime();
    const endAt = new Date(form.end).getTime();
    if (form.title.trim().length < 2) return fail(new Error('Write the event name.'));
    if (!startAt || !endAt) return fail(new Error('Choose the start and the end time.'));
    const body = {
      title: form.title.trim(), subtitle: form.subtitle.trim(), description: form.description.trim(), bannerUrl: form.bannerUrl, kind: form.kind, repeat: form.repeat,
      startAt, endAt, enabled: !!form.enabled, order: Number(form.order || 0),
    };
    setSaving(true);
    try {
      if (editingId) await api(`/admin/events/${editingId}`, 'PUT', body);
      else await api('/admin/events', 'POST', body);
      ok(editingId ? 'Event saved.' : 'Event added. It shows on Home when it is live or starts within 7 days.');
      reset();
      await load();
    } catch (err) { fail(err); } finally { setSaving(false); }
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({ title: r.title, subtitle: r.subtitle, description: r.description, bannerUrl: r.bannerUrl, kind: r.kind, repeat: r.repeat, start: toLocalInput(r.startAt), end: toLocalInput(r.endAt), enabled: r.enabled, order: String(r.order) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggle = async (r) => { try { await api(`/admin/events/${r.id}`, 'PUT', { enabled: !r.enabled }); await load(); } catch (err) { fail(err); } };
  const remove = async (r) => {
    if (!window.confirm(`Delete the event "${r.title}"? This cannot be undone.`)) return;
    try { await api(`/admin/events/${r.id}`, 'DELETE'); ok('Event deleted.'); await load(); } catch (err) { fail(err); }
  };

  return (
    <>
      <p className="muted small">
        The events shown on the Home screen. An event that repeats <b>every day</b> or <b>every week</b> uses the clock time you set for the first run
        (for example 8:00 PM to 9:00 PM) again and again; the app shows today's or the next run. Times are in your computer's time zone.
      </p>
      <form className="card form" onSubmit={save}>
        <h3>{editingId ? 'Edit event' : 'Add an event'}</h3>
        <div className="grid">
          <label className="field"><span>Name *</span><input maxLength={60} value={form.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="field"><span>Short line</span><input maxLength={100} placeholder="Send gifts and win rewards" value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} /></label>
          <label className="field"><span>Type</span><select value={form.kind} onChange={(e) => set({ kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="field"><span>Repeats</span><select value={form.repeat} onChange={(e) => set({ repeat: e.target.value })}>{REPEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field"><span>Starts *</span><input type="datetime-local" value={form.start} onChange={(e) => set({ start: e.target.value })} /></label>
          <label className="field"><span>Ends *</span><input type="datetime-local" value={form.end} onChange={(e) => set({ end: e.target.value })} /></label>
          <label className="field"><span>Order (0 shows first)</span><input type="number" min="0" value={form.order} onChange={(e) => set({ order: e.target.value })} /></label>
          <label className="field check"><input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} /><span>Show in the app</span></label>
          <label className="field wide"><span>Rules and details (the person sees this when opening the event)</span><textarea rows={5} maxLength={1500} value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>
          <label className="field wide"><span>Banner picture (2 : 1, like 1600 x 800)</span>
            <div className="colorrow">
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try { set({ bannerUrl: await bannerFromFile(f) }); } catch (err) { fail(err); }
              }} />
              {form.bannerUrl && <button type="button" className="btn sm ghost" onClick={() => set({ bannerUrl: '' })}>Remove picture</button>}
            </div>
          </label>
        </div>
        {form.bannerUrl && <div className="previewbox"><span className="muted small">Banner</span><img src={form.bannerUrl} alt="" style={{ display: 'block', width: 320, height: 160, objectFit: 'cover', borderRadius: 14, marginTop: 8 }} /></div>}
        <div className="acts">
          <button className="btn" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add event'}</button>
          {editingId && <button type="button" className="btn ghost" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Banner</th><th>Event</th><th>Type</th><th>Repeats</th><th>First run</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="muted pad">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="muted pad">No events yet. Add the first one above.</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id}>
                <td>{r.bannerUrl ? <img src={r.bannerUrl} alt="" style={{ width: 80, height: 40, objectFit: 'cover', borderRadius: 8 }} /> : <span className="muted small">none</span>}</td>
                <td><b>{r.title}</b><div className="muted small">{r.subtitle}</div></td>
                <td>{r.kind}</td>
                <td>{(REPEATS.find(([v]) => v === r.repeat) || [])[1] || r.repeat}</td>
                <td>{fmt(r.startAt)} - {fmt(r.endAt)}</td>
                <td><span className={`pill ${r.enabled ? 'active' : 'plain'}`}>{r.enabled ? 'On' : 'Off'}</span></td>
                <td><div className="acts">
                  <button className="btn sm ghost" onClick={() => edit(r)}>Edit</button>
                  <button className="btn sm ghost" onClick={() => toggle(r)}>{r.enabled ? 'Turn off' : 'Turn on'}</button>
                  <button className="btn sm danger" onClick={() => remove(r)}>Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- announcements
function AnnouncementList({ ok, fail }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', link: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await api('/admin/announcements')).items || []); } catch (e) { fail(e); } finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (form.title.trim().length < 2 || form.body.trim().length < 2) return fail(new Error('Write the title and the message.'));
    if (!window.confirm('Send this announcement to everybody? It shows in every person\'s notification bell.')) return;
    setSaving(true);
    try {
      await api('/admin/announcements', 'POST', { title: form.title.trim(), body: form.body.trim(), ...(form.link.trim() ? { link: form.link.trim() } : {}) });
      ok('Announcement sent. It shows in the notification bell of every user.');
      setForm({ title: '', body: '', link: '' });
      await load();
    } catch (err) { fail(err); } finally { setSaving(false); }
  };
  const toggle = async (r) => { try { await api(`/admin/announcements/${r.id}`, 'PUT', { enabled: !r.enabled }); await load(); } catch (err) { fail(err); } };

  return (
    <>
      <p className="muted small">
        An announcement shows in the notification bell (on Home) of every user: a new offer, a coupon, an event, news. It is not a push notification yet;
        the person sees it when they open the bell. A link is optional, for example <b>/vip</b>, <b>/recharge</b> or <b>/rooms</b>.
      </p>
      <form className="card form" onSubmit={send}>
        <h3>New announcement</h3>
        <div className="grid">
          <label className="field"><span>Title *</span><input maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="field"><span>Link (optional)</span><input maxLength={120} placeholder="/recharge" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></label>
          <label className="field wide"><span>Message *</span><textarea rows={3} maxLength={240} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
        </div>
        <div className="acts"><button className="btn" disabled={saving}>{saving ? 'Sending...' : 'Send to everybody'}</button></div>
      </form>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Announcement</th><th>Link</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="muted pad">Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="muted pad">No announcements yet.</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id}>
                <td>{fmt(r.createdAt)}</td>
                <td><b>{r.title}</b><div className="muted small">{r.body}</div></td>
                <td>{r.link || '-'}</td>
                <td><span className={`pill ${r.enabled ? 'active' : 'plain'}`}>{r.enabled ? 'Shown' : 'Hidden'}</span></td>
                <td><button className="btn sm ghost" onClick={() => toggle(r)}>{r.enabled ? 'Hide' : 'Show again'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
