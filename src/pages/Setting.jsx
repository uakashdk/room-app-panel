import { useCallback, useEffect, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../api';
import './Setting.css';

/* ------------------------------------------------------------------ */
/* SAMPLE MODE for the parts that need your backend (sessions list,    */
/* maintenance, force update, feature switches). While true, nothing   */
/* is sent to the server. Set to false when the endpoints exist.       */
/* ------------------------------------------------------------------ */
const SAMPLE = true;
const EP_PLATFORM = '/admin/settings/platform'; // GET + PUT
const EP_SESSIONS = '/admin/security/sessions'; // GET
const EP_SIGNOUT_ALL = '/admin/security/sign-out-everywhere'; // POST

/* Two-step verification needs Firebase Identity Platform AND a sign-in
   screen that asks for the code. Leave false until Login.jsx supports it,
   or admins who turn it on would be locked out. */
const ENABLE_2FA_SETUP = false;

/* ---------------------------- small storage ------------------------ */
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* blocked */ } },
};
const IDLE_KEY = 'dv-idle-minutes';
const NOTIFY_KEY = 'dv-notify';
const THEME_KEY = 'dv-theme';


export function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(THEME_KEY, t); } catch { /* blocked */ }
}
export const getTheme = () => { try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } };
export const applyStoredTheme = () => applyTheme(getTheme());

/* ------------- auto sign-out after inactivity (used by App) -------- */
export function watchIdle(onTimeout) {
  let last = Date.now();
  const bump = () => { last = Date.now(); };
  const ev = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  ev.forEach((e) => window.addEventListener(e, bump, { passive: true }));
  const t = setInterval(() => { const m = LS.get(IDLE_KEY, 0); if (m && Date.now() - last > m * 60000) onTimeout(); }, 15000);
  return () => { ev.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); };
}

/* ------------------- notification preferences ---------------------- */
const NOTIFY_DEFAULT = { desktop: false, sound: true, withdrawal: true, host: true, report: true, agency: true };
export const getNotifyPrefs = () => ({ ...NOTIFY_DEFAULT, ...LS.get(NOTIFY_KEY, {}) });
const EVENTS = [
  ['withdrawal', 'New withdrawal request', 'Someone asks to cash out.'],
  ['host', 'New host request', 'Someone applies to become a host.'],
  ['agency', 'New agency request', 'Someone asks to open an agency.'],
  ['report', 'New report', 'A user or room is reported.'],
];
const beep = () => {
  try {
    const C = window.AudioContext || window.webkitAudioContext; const c = new C(); const o = c.createOscillator(); const g = c.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.42);
  } catch { /* no audio */ }
};

/* --------------------------- platform data ------------------------- */
const DEF_PLATFORM = {
  maintenance: { enabled: false, message: 'We are making DesiVox better. Please come back soon.' },
  update: { enabled: false, android: { minVersion: '', url: '' }, ios: { minVersion: '', url: '' } },
  features: { gifts: true, vip: true, coins: true, roomCreation: true, signups: true, roomChat: true },
};
const FEATURES = [
  ['gifts', 'Gifts', 'Sending gifts in rooms.'],
  ['vip', 'VIP purchases', 'Buying VIP levels.'],
  ['coins', 'Coin purchases', 'Buying coin packages.'],
  ['roomCreation', 'Room creation', 'Opening new rooms.'],
  ['signups', 'New sign-ups', 'New people creating an account.'],
  ['roomChat', 'Room chat', 'Text chat inside rooms.'],
];
const mergePlatform = (r) => ({
  maintenance: { ...DEF_PLATFORM.maintenance, ...(r?.maintenance || {}) },
  update: {
    ...DEF_PLATFORM.update, ...(r?.update || {}),
    android: { ...DEF_PLATFORM.update.android, ...(r?.update?.android || {}) },
    ios: { ...DEF_PLATFORM.update.ios, ...(r?.update?.ios || {}) },
  },
  features: { ...DEF_PLATFORM.features, ...(r?.features || {}) },
});
const SAMPLE_SESSIONS = [
  { id: 's1', device: 'Chrome on Android', place: 'Kolkata, IN', at: Date.now() - 36e5 * 5 },
  { id: 's2', device: 'Edge on Windows', place: 'Mumbai, IN', at: Date.now() - 864e5 * 2 },
];
const device = () => {
  const u = navigator.userAgent;
  const b = /Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'Browser';
  const o = /Windows/.test(u) ? 'Windows' : /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iOS' : /Mac/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : '';
  return o ? `${b} on ${o}` : b;
};
const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');

/* ----------------------------- small parts ------------------------- */
const Moon = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
const Sun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const ThemeSwitch = ({ theme, onChange }) => {
  const light = theme === 'light';
  return (
    <button type="button" role="switch" aria-checked={light} aria-label="Light theme" className={`tswitch ${light ? 'on' : ''}`} onClick={() => onChange(light ? 'dark' : 'light')}>
      <span className="tknob">{light ? <Sun /> : <Moon />}</span>
    </button>
  );
};
const Switch = ({ on, onChange, label, disabled }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`sw ${on ? 'on' : ''}`} onClick={() => onChange(!on)}><i /></button>
);
const Row = ({ title, desc, children }) => (
  <div className="set-row"><div className="set-text"><b>{title}</b>{desc && <span>{desc}</span>}</div>{children}</div>
);
const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;

/* ============================== GENERAL ============================ */
function General({ staff, role }) {
  const [theme, setTheme] = useState(getTheme);
  return (
    <>
      <section className="card set-card">
        <h3 className="set-title">Appearance</h3>
        <Row title={theme === 'light' ? 'Light theme' : 'Dark theme'} desc="Switch the whole admin panel between dark and light. Saved on this device.">
          <ThemeSwitch theme={theme} onChange={(t) => { setTheme(t); applyTheme(t); }} />
        </Row>
      </section>
      <section className="card set-card">
        <h3 className="set-title">Account</h3>
        <Row title="Signed in as"><div className="set-val">{staff?.email || '-'}</div></Row>
        <Row title="Role"><div className="set-val">{role === 'super_admin' ? 'Super admin' : 'Admin'}</div></Row>
      </section>
    </>
  );
}

/* ============================== SECURITY =========================== */
function Security({ ok, fail }) {
  const user = auth.currentUser;
  const hasPassword = !!user?.providerData?.some((p) => p.providerId === 'password');
  const [pw, setPw] = useState({ cur: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const [idle, setIdle] = useState(() => LS.get(IDLE_KEY, 0));
  const [sessions, setSessions] = useState(SAMPLE ? SAMPLE_SESSIONS : []);

  // optional two-step verification state (only used when ENABLE_2FA_SETUP is true)
  const [mfa, setMfa] = useState({ factors: [], secret: null, key: '', code: '' });

  useEffect(() => {
    if (SAMPLE) return;
    api(EP_SESSIONS, 'GET').then((r) => setSessions(r.items || [])).catch(fail);
  }, [fail]);

  useEffect(() => {
    if (!ENABLE_2FA_SETUP || !user) return;
    import('firebase/auth').then((m) => setMfa((s) => ({ ...s, factors: m.multiFactor(user).enrolledFactors }))).catch(() => {});
  }, [user]);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return fail(new Error('The new password must have at least 8 characters.'));
    if (pw.next !== pw.again) return fail(new Error('The two new passwords are not the same.'));
    if (pw.next === pw.cur) return fail(new Error('The new password must be different from the current one.'));
    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw.cur));
      await updatePassword(user, pw.next);
      setPw({ cur: '', next: '', again: '' });
      ok('Password changed.');
    } catch (err) {
      fail(new Error(/wrong-password|invalid-credential/.test(err.code || '') ? 'The current password is not correct.' : err.message || String(err)));
    } finally { setBusy(false); }
  };

  const startMfa = async () => {
    try {
      const m = await import('firebase/auth');
      const session = await m.multiFactor(user).getSession();
      const secret = await m.TotpMultiFactorGenerator.generateSecret(session);
      setMfa((s) => ({ ...s, secret, key: secret.secretKey, code: '' }));
    } catch (err) {
      fail(new Error(err.code === 'auth/requires-recent-login' ? 'Please sign out and sign in again, then retry.' : err.message || String(err)));
    }
  };
  const confirmMfa = async () => {
    try {
      const m = await import('firebase/auth');
      await m.multiFactor(user).enroll(m.TotpMultiFactorGenerator.assertionForEnrollment(mfa.secret, mfa.code.trim()), 'Authenticator app');
      setMfa({ factors: m.multiFactor(user).enrolledFactors, secret: null, key: '', code: '' });
      ok('Two-step verification is on.');
    } catch (err) { fail(err); }
  };
  const removeMfa = async (f) => {
    if (!window.confirm('Turn off two-step verification?')) return;
    try {
      const m = await import('firebase/auth');
      await m.multiFactor(user).unenroll(f);
      setMfa((s) => ({ ...s, factors: m.multiFactor(user).enrolledFactors }));
      ok('Two-step verification is off.');
    } catch (err) { fail(err); }
  };

  const signOutAll = async () => {
    if (!window.confirm(SAMPLE ? 'Sign out of this device? (Sample mode: other devices are not affected yet.)' : 'Sign out of every device, including this one?')) return;
    try {
      if (!SAMPLE) await api(EP_SIGNOUT_ALL, 'POST');
      await signOut(auth);
    } catch (err) { fail(err); }
  };

  const setIdleMin = (m) => { setIdle(m); LS.set(IDLE_KEY, m); ok(m ? `You will be signed out after ${m} minutes without activity.` : 'Auto sign-out is off.'); };

  return (
    <>
      {/* PASSWORD */}
      <form className="card set-card" onSubmit={changePassword}>
        <h3 className="set-title">Change password</h3>
        {hasPassword ? (
          <>
            <div className="grid">
              <Field label="Current password"><input type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></Field>
              <Field label="New password (8+ characters)"><input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
              <Field label="Repeat new password"><input type="password" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></Field>
            </div>
            <div className="set-actions"><button className="btn" disabled={busy || !pw.cur || !pw.next}>{busy ? 'Saving...' : 'Change password'}</button></div>
          </>
        ) : <p className="muted small set-note">You sign in with another provider, so the password is managed there.</p>}
      </form>

      {/* TWO-STEP */}
      <section className="card set-card">
        <h3 className="set-title">Two-step verification</h3>
        {!ENABLE_2FA_SETUP && (
          <Row title="Authenticator app" desc="Not available yet. The sign-in screen must ask for the 6-digit code first, otherwise admins would be locked out.">
            <button className="btn" disabled>Set up</button>
          </Row>
        )}
        {ENABLE_2FA_SETUP && mfa.factors.length > 0 && mfa.factors.map((f) => (
          <Row key={f.uid} title={f.displayName || 'Authenticator app'} desc="A 6-digit code is asked at every sign-in.">
            <button className="btn" onClick={() => removeMfa(f)}>Turn off</button>
          </Row>
        ))}
        {ENABLE_2FA_SETUP && mfa.factors.length === 0 && !mfa.secret && (
          <Row title="Authenticator app" desc="Use Google Authenticator, Authy or a similar app."><button className="btn" onClick={startMfa}>Set up</button></Row>
        )}
        {ENABLE_2FA_SETUP && mfa.secret && (
          <>
            <p className="muted small set-note">Add this key in your authenticator app (choose "enter a setup key"), then type the 6-digit code it shows.</p>
            <div className="keybox">{mfa.key}</div>
            <div className="grid"><Field label="6-digit code"><input inputMode="numeric" maxLength={6} value={mfa.code} onChange={(e) => setMfa({ ...mfa, code: e.target.value.replace(/\D/g, '') })} /></Field></div>
            <div className="set-actions">
              <button type="button" className="btn" disabled={mfa.code.length !== 6} onClick={confirmMfa}>Turn on</button>
              <button type="button" className="btn" onClick={() => setMfa({ ...mfa, secret: null })}>Cancel</button>
            </div>
          </>
        )}
      </section>

      {/* SESSIONS */}
      <section className="card set-card">
        <h3 className="set-title">Sessions</h3>
        <Row title={device()} desc={`Signed in ${when(Date.parse(user?.metadata?.lastSignInTime))}`}><span className="pill active">This device</span></Row>
        {sessions.map((s) => (
          <Row key={s.id} title={s.device} desc={`${s.place || ''}${s.place ? ' · ' : ''}${when(s.at)}`}><span className="muted small">{SAMPLE ? 'sample' : 'signed in'}</span></Row>
        ))}
        <div className="set-actions"><button className="btn" onClick={signOutAll}>Sign out everywhere</button></div>
      </section>

      {/* AUTO SIGN-OUT */}
      <section className="card set-card">
        <h3 className="set-title">Auto sign-out</h3>
        <Row title="Sign out after inactivity" desc="Protects the panel if you leave it open. Saved on this device.">
          <div className="seg">
            {[[0, 'Off'], [15, '15 min'], [30, '30 min'], [60, '60 min']].map(([m, l]) => (
              <button key={m} type="button" className={idle === m ? 'on' : ''} onClick={() => setIdleMin(m)}>{l}</button>
            ))}
          </div>
        </Row>
      </section>
    </>
  );
}

/* ============================== PLATFORM =========================== */
function Platform({ role, ok, fail }) {
  const canEdit = role === 'super_admin';
  const [p, setP] = useState(DEF_PLATFORM);
  const [loading, setLoading] = useState(!SAMPLE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (SAMPLE || !canEdit) return;
    api(EP_PLATFORM, 'GET').then((r) => setP(mergePlatform(r))).catch(fail).finally(() => setLoading(false));
  }, [canEdit, fail]);

  if (!canEdit) return <p className="muted pad">Only a Super admin can change platform settings.</p>;
  if (loading) return <p className="muted pad">Loading...</p>;

  const setM = (k, v) => setP({ ...p, maintenance: { ...p.maintenance, [k]: v } });
  const setU = (k, v) => setP({ ...p, update: { ...p.update, [k]: v } });
  const setOS = (os, k, v) => setP({ ...p, update: { ...p.update, [os]: { ...p.update[os], [k]: v } } });
  const setF = (k, v) => setP({ ...p, features: { ...p.features, [k]: v } });

  const save = async () => {
    const ver = /^\d+(\.\d+){0,2}$/;
    if (p.maintenance.enabled && p.maintenance.message.trim().length < 3) return fail(new Error('Write the maintenance message.'));
    for (const os of ['android', 'ios']) {
      const { minVersion, url } = p.update[os];
      if (minVersion && !ver.test(minVersion)) return fail(new Error(`${os === 'ios' ? 'iOS' : 'Android'} version must look like 1.2.0.`));
      if (url && !/^https:\/\//.test(url)) return fail(new Error(`${os === 'ios' ? 'iOS' : 'Android'} store link must start with https://`));
      if (p.update.enabled && (!minVersion || !url)) return fail(new Error('Force update needs a version and a store link for both Android and iOS.'));
    }
    const warn = [p.maintenance.enabled && 'MAINTENANCE MODE is ON: users are blocked.', p.update.enabled && 'FORCE UPDATE is ON: old app versions are blocked.'].filter(Boolean);
    if (!window.confirm(`Save platform settings?${warn.length ? `\n\n${warn.join('\n')}` : ''}`)) return;
    setBusy(true);
    try {
      if (SAMPLE) ok('Saved on this screen only (sample mode, nothing was sent to the server).');
      else { await api(EP_PLATFORM, 'PUT', p); ok('Platform settings saved.'); }
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  return (
    <>
      <section className="card set-card">
        <h3 className="set-title">Maintenance mode</h3>
        <Row title="Pause the app" desc="Users see your message instead of the app. Admins can still use this panel.">
          <Switch on={p.maintenance.enabled} onChange={(v) => setM('enabled', v)} label="Maintenance mode" />
        </Row>
        <div className="grid"><Field label="Message shown to users"><input maxLength={160} value={p.maintenance.message} onChange={(e) => setM('message', e.target.value)} /></Field></div>
      </section>

      <section className="card set-card">
        <h3 className="set-title">Force update</h3>
        <Row title="Require the latest app" desc="Versions older than the minimum below must update before they can open the app.">
          <Switch on={p.update.enabled} onChange={(v) => setU('enabled', v)} label="Force update" />
        </Row>
        {[['android', 'Android'], ['ios', 'iOS']].map(([os, label]) => (
          <div key={os}>
            <p className="sub">{label}</p>
            <div className="grid">
              <Field label="Minimum version (e.g. 1.4.0)"><input value={p.update[os].minVersion} onChange={(e) => setOS(os, 'minVersion', e.target.value.trim())} /></Field>
              <Field label="Store link (https://...)"><input value={p.update[os].url} onChange={(e) => setOS(os, 'url', e.target.value.trim())} /></Field>
            </div>
          </div>
        ))}
      </section>

      <section className="card set-card">
        <h3 className="set-title">Feature switches</h3>
        {FEATURES.map(([k, title, desc]) => (
          <Row key={k} title={title} desc={desc}><Switch on={p.features[k]} onChange={(v) => setF(k, v)} label={title} /></Row>
        ))}
      </section>

      <div className="set-actions" style={{ maxWidth: 860 }}>
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save platform settings'}</button>
      </div>
    </>
  );
}

/* ============================ NOTIFICATIONS ======================== */
function Notifications({ ok, fail }) {
  const [n, setN] = useState(getNotifyPrefs);
  const perm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

  const put = (k, v) => { const next = { ...n, [k]: v }; setN(next); LS.set(NOTIFY_KEY, next); };

  const toggleDesktop = async (v) => {
    if (!v) return put('desktop', false);
    if (perm === 'unsupported') return fail(new Error('This browser does not support desktop alerts.'));
    const r = perm === 'granted' ? 'granted' : await Notification.requestPermission();
    if (r !== 'granted') return fail(new Error('Desktop alerts are blocked. Allow notifications for this site in the browser settings.'));
    put('desktop', true);
  };

  const test = () => {
    if (n.sound) beep();
    if (n.desktop && perm === 'granted') new Notification('DesiVox admin', { body: 'This is a test alert.' });
    ok('Test sent.');
  };

  return (
    <>
      <section className="card set-card">
        <h3 className="set-title">How you are alerted</h3>
        <Row title="Desktop alerts" desc={perm === 'denied' ? 'Blocked in the browser. Allow notifications for this site to use it.' : 'A pop-up even when this tab is in the background.'}>
          <Switch on={n.desktop && perm === 'granted'} onChange={toggleDesktop} label="Desktop alerts" disabled={perm === 'unsupported'} />
        </Row>
        <Row title="Sound" desc="A short beep when something new arrives."><Switch on={n.sound} onChange={(v) => put('sound', v)} label="Sound" /></Row>
        <div className="set-actions"><button className="btn" onClick={test}>Send test alert</button></div>
      </section>

      <section className="card set-card">
        <h3 className="set-title">What you are alerted about</h3>
        {EVENTS.map(([k, title, desc]) => <Row key={k} title={title} desc={desc}><Switch on={n[k]} onChange={(v) => put(k, v)} label={title} /></Row>)}
        <p className="muted small set-note">Saved on this device. Choices apply to this browser only.</p>
      </section>
    </>
  );
}

/* ============================== PAGE =============================== */
const TABS = ['General', 'Security', 'Platform', 'Notifications'];

export default function Settings({ staff, role }) {
  const [tab, setTab] = useState('General');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const fail = useCallback((e) => { setNote(''); setError(e.message || String(e)); }, []);
  const ok = useCallback((m) => { setError(''); setNote(m); }, []);
  const go = (t) => { setError(''); setNote(''); setTab(t); };

  return (
    <div className="gloss-settings">
      <div className="head"><h1>Settings</h1></div>

      <div className="tabs">
        {TABS.map((t) => <a key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => go(t)}>{t}</a>)}
        {SAMPLE && tab === 'Platform' && <span className="pill sample-pill" style={{ marginLeft: 'auto' }}>SAMPLE MODE</span>}
      </div>

      {error && <div className="error box" style={{ marginTop: 16 }}>{error}</div>}
      {note && <div className="ok box" style={{ marginTop: 16 }}>{note}</div>}

      {tab === 'General' && <General staff={staff} role={role} />}
      {tab === 'Security' && <Security ok={ok} fail={fail} />}
      {tab === 'Platform' && <Platform role={role} ok={ok} fail={fail} />}
      {tab === 'Notifications' && <Notifications ok={ok} fail={fail} />}
    </div>
  );
}
