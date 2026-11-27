import { useCallback, useEffect, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../api';

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

/* ------------------------------ theme ------------------------------ */
const THEME_CSS = `
html{transition:filter .3s ease,background-color .3s ease;}
html[data-theme="light"]{filter:invert(1) hue-rotate(180deg);background:#fff;color-scheme:light;}
html[data-theme="light"] img,html[data-theme="light"] video,html[data-theme="light"] canvas{filter:invert(1) hue-rotate(180deg);}
`;
export const getTheme = () => { try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } };
export function applyTheme(t) {
  if (!document.getElementById('dv-theme-css')) {
    const s = document.createElement('style'); s.id = 'dv-theme-css'; s.textContent = THEME_CSS; document.head.appendChild(s);
  }
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(THEME_KEY, t); } catch { /* blocked */ }
}
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

/* ------------------------- glossy premium finish ------------------- */
/* Translucent white/black layers only: colours and theme stay as is.   */
const GLOSS_CSS = `
.gloss-page{--acc:var(--accent,#F4C542);}

/* ---------- cards: glass panel with a curved sheen on top ---------- */
.gloss-page .card{position:relative;overflow:hidden;border-radius:22px;border:1px solid rgba(255,255,255,.20);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(0,0,0,.45),0 18px 44px rgba(0,0,0,.55),0 2px 0 rgba(255,255,255,.04);}
.gloss-page .card::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.17),rgba(255,255,255,.06) 34%,rgba(255,255,255,0) 62%);}
.gloss-page .card::after{content:'';position:absolute;left:-12%;right:-12%;top:0;height:44%;pointer-events:none;
  border-radius:0 0 50% 50% / 0 0 100% 100%;
  background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0));}
.gloss-page .card > *{position:relative;z-index:1;}

/* ---------- tabs, buttons, pills ---------- */
.gloss-page .tabs{gap:10px;}
.gloss-page .tab,.gloss-page .btn,.gloss-page .pill,.gloss-page .seg button{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.20);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 -8px 14px rgba(0,0,0,.26),0 6px 14px rgba(0,0,0,.42);}
.gloss-page .tab::before,.gloss-page .btn::before,.gloss-page .pill::before,.gloss-page .seg button::before{content:'';position:absolute;left:0;right:0;top:0;height:52%;
  background:linear-gradient(180deg,rgba(255,255,255,.32),rgba(255,255,255,.02));pointer-events:none;border-radius:inherit;}
.gloss-page .tab{cursor:pointer;border-radius:16px;transition:transform .15s ease,filter .15s ease;}
.gloss-page .tab:hover{transform:translateY(-1px);filter:brightness(1.1);}
.gloss-page .tab.active{border-color:rgba(255,255,255,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -8px 14px rgba(0,0,0,.2),0 0 18px rgba(244,197,66,.18),0 6px 14px rgba(0,0,0,.42);}
.gloss-page .btn{border-radius:14px;font-weight:700;transition:transform .15s ease,filter .15s ease,box-shadow .15s ease;}
.gloss-page .btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -8px 14px rgba(0,0,0,.22),0 10px 20px rgba(0,0,0,.5);}
.gloss-page .btn:active:not(:disabled){transform:translateY(0);}
.gloss-page .btn:disabled{opacity:.55;cursor:not-allowed;}
.gloss-page .pill{border-radius:999px;}
.gloss-page .tab:focus-visible,.gloss-page .btn:focus-visible,.gloss-page .sw:focus-visible,.gloss-page .tswitch:focus-visible,.gloss-page .seg button:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px;}
.gloss-page .box{position:relative;overflow:hidden;border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 8px 20px rgba(0,0,0,.4);}

/* ---------- layout ---------- */
.gloss-page .set-card{padding:8px 26px 14px;margin:20px 0 0;max-width:860px;}
.gloss-page .set-title{margin:0;padding:18px 0 6px;font-size:17px;font-weight:700;}
.gloss-page .set-note{margin:0 0 6px;}
.gloss-page .set-row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 0;
  border-bottom:1px solid rgba(255,255,255,.09);box-shadow:0 1px 0 rgba(0,0,0,.25);}
.gloss-page .set-row:last-child{border-bottom:0;box-shadow:none;}
.gloss-page .set-text b{display:block;font-size:15px;}
.gloss-page .set-text span{display:block;margin-top:3px;font-size:13px;opacity:.65;}
.gloss-page .set-val{font-weight:600;text-align:right;overflow-wrap:anywhere;}
.gloss-page .set-actions{display:flex;flex-wrap:wrap;gap:12px;padding:14px 0 10px;}
.gloss-page .sample-pill{font-size:11px;font-weight:700;letter-spacing:.06em;padding:5px 12px;}

/* ---------- inputs: glass fields, spaced uppercase labels ---------- */
.gloss-page .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;padding:10px 0;}
.gloss-page .field{display:flex;flex-direction:column;gap:8px;}
.gloss-page .field > span{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.7;}
.gloss-page .field input{box-sizing:border-box;width:100%;height:50px;padding:0 16px;border-radius:16px;border:1px solid rgba(255,255,255,.18);
  background-image:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0) 60%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -12px 18px rgba(0,0,0,.28),0 3px 8px rgba(0,0,0,.34);
  transition:border-color .15s ease,box-shadow .15s ease;}
.gloss-page .field input:focus{outline:none; border-color:#f4c542; background-color:rgba(255,255,255,.07); box-shadow: 0 0 0 3px rgba(244,197,66,.18), 0 0 22px 2px rgba(244,197,66,.35), 0 10px 26px -6px rgba(244,197,66,.55), inset 0 2px 6px rgba(0,0,0,.25);}

/* the small label turns gold too while its field is selected */
.gloss-page .field:focus-within > span{color:#f4c542;opacity:1;}
.gloss-page .field input:disabled{opacity:.55;}
.gloss-page .sub{margin:12px 0 0;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.8;}

/* ---------- switches ---------- */
.gloss-page .sw{position:relative;flex:none;width:52px;height:30px;padding:0;cursor:pointer;border-radius:999px;border:1px solid rgba(255,255,255,.24);background:rgba(0,0,0,.5);overflow:hidden;
  box-shadow:inset 0 2px 7px rgba(0,0,0,.65),inset 0 -1px 0 rgba(255,255,255,.12),0 4px 10px rgba(0,0,0,.4);transition:background .25s ease,box-shadow .25s ease;}
.gloss-page .sw::before{content:'';position:absolute;left:0;right:0;top:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0));pointer-events:none;}
.gloss-page .sw i{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:linear-gradient(180deg,#fff,#c3c8d4);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -3px 5px rgba(0,0,0,.15),0 3px 7px rgba(0,0,0,.55);transition:transform .25s cubic-bezier(.4,0,.2,1);}
.gloss-page .sw.on{background:linear-gradient(180deg,rgba(244,197,66,.65),rgba(183,119,19,.65));box-shadow:inset 0 2px 7px rgba(0,0,0,.3),0 0 14px rgba(244,197,66,.28),0 4px 10px rgba(0,0,0,.4);}
.gloss-page .sw.on i{transform:translateX(22px);}
.gloss-page .sw:disabled{opacity:.5;cursor:not-allowed;}
.gloss-page .tswitch{position:relative;flex:none;width:72px;height:38px;padding:0;cursor:pointer;border-radius:999px;border:1px solid rgba(255,255,255,.26);background:rgba(0,0,0,.5);overflow:hidden;
  box-shadow:inset 0 2px 8px rgba(0,0,0,.7),inset 0 -1px 0 rgba(255,255,255,.14),0 5px 14px rgba(0,0,0,.45);transition:background .3s ease;}
.gloss-page .tswitch::before{content:'';position:absolute;left:0;right:0;top:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0));pointer-events:none;}
.gloss-page .tswitch.on{background:linear-gradient(180deg,rgba(244,197,66,.65),rgba(183,119,19,.65));box-shadow:inset 0 2px 7px rgba(0,0,0,.35),0 0 18px rgba(244,197,66,.3),0 5px 14px rgba(0,0,0,.45);}
.gloss-page .tknob{position:absolute;top:3px;left:3px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#2b2e36;background:linear-gradient(180deg,#fff,#c3c8d4);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -3px 6px rgba(0,0,0,.18),0 4px 9px rgba(0,0,0,.55);transition:transform .3s cubic-bezier(.4,0,.2,1);}
.gloss-page .tswitch.on .tknob{transform:translateX(34px);}
.gloss-page .tknob svg{width:16px;height:16px;}

/* ---------- segmented choice ---------- */
.gloss-page .seg{display:flex;flex-wrap:wrap;gap:10px;}
.gloss-page .seg button{cursor:pointer;border-radius:14px;padding:9px 16px;font:inherit;color:inherit;background:rgba(255,255,255,.05);}
.gloss-page .seg button.on{border-color:rgba(255,255,255,.38);background:linear-gradient(180deg,rgba(244,197,66,.5),rgba(183,119,19,.5));}

.gloss-page .keybox{padding:12px 16px;margin:8px 0;border-radius:14px;border:1px dashed rgba(255,255,255,.28);
  background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0));font-family:monospace;font-size:13px;overflow-wrap:anywhere;user-select:all;}
@media (max-width:560px){.gloss-page .set-row{flex-direction:column;align-items:flex-start;}.gloss-page .set-val{text-align:left;}.gloss-page .set-card{padding:6px 18px 12px;}}
@media (prefers-reduced-motion:reduce){.gloss-page *{transition:none !important;animation:none !important;}}
`;

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
    <div className="gloss-page">
      <style>{GLOSS_CSS}</style>
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
