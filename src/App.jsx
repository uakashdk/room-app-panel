import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Login from './pages/Login.jsx';
import Agencies from './pages/Agencies.jsx';
import Arcade from './pages/Arcade.jsx';
import Banners from './pages/Banners.jsx';
import CoinPackages from './pages/CoinPackages.jsx';
import Economy from './pages/Economy.jsx';
import HostPolicy from './pages/HostPolicy.jsx';
import Posts from './pages/Posts.jsx';
import Reports from './pages/Reports.jsx';
import Rooms from './pages/Rooms.jsx';
import Salary from './pages/Salary.jsx';
import Transactions from './pages/Transactions.jsx';
import Users from './pages/Users.jsx';
import Vip from './pages/Vip.jsx';
import Withdrawals from './pages/Withdrawals.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Setting.jsx';
import Hosts from './pages/Hosts.jsx';
import Games from './pages/Games.jsx';

const STAFF_ROLES = ['admin', 'super_admin'];
const PAGES = { Dashboard, Users, Hosts, Agencies, Rooms, Banners, Posts, Reports, Economy, Arcade, Games, 'Coin Packages': CoinPackages, VIP: Vip, Transactions, 'Salary Approval': Salary, Withdrawals, 'Host Policy': HostPolicy, Settings };
const SOON = ['Gifts'];

const GLOSS_CSS = `
/* ---------- Sidebar ---------- */
.sidebar {
  background:
    radial-gradient(120% 60% at 0% 0%, rgba(255,255,255,.16), rgba(255,255,255,0) 60%),
    linear-gradient(180deg, rgba(255,255,255,.07) 0%, rgba(20,12,30,.92) 45%, rgba(8,5,14,.98) 100%) !important;
  border-right: 1px solid rgba(255,255,255,.14) !important;
  box-shadow:
    inset -1px 0 0 rgba(255,255,255,.06),
    8px 0 30px rgba(0,0,0,.55) !important;
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}
.sidebar .brand {
  font-weight: 800;
  letter-spacing: .02em;
  padding-bottom: 18px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,.14);
  text-shadow: 0 2px 10px rgba(0,0,0,.6);
}
.sidebar nav { display: flex; flex-direction: column; gap: 6px; }

/* ---------- Nav items ---------- */
.sidebar .nav {
  display: block;
  padding: 13px 18px !important;
  border-radius: 16px !important;
  font-weight: 600;
  letter-spacing: .02em;
  border: 1px solid transparent !important;
  cursor: pointer;
  transition: background .2s, border-color .2s, box-shadow .2s, transform .15s;
}
.sidebar .nav:hover:not(.active):not(.disabled) {
  background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.03)) !important;
  border-color: rgba(255,255,255,.16) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18) !important;
  transform: translateX(2px);
}
.sidebar .nav.active {
  background: linear-gradient(180deg, rgba(140,110,230,.32) 0%, rgba(70,45,130,.55) 45%, rgba(30,18,60,.9) 100%) !important;
  border: 1px solid rgba(255,255,255,.38) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.4),
    inset 0 -1px 0 rgba(0,0,0,.5),
    0 8px 22px rgba(0,0,0,.55),
    0 0 16px rgba(120,90,220,.22) !important;
}
.sidebar .nav.disabled { opacity: .45; cursor: not-allowed; }
.sidebar .nav em {
  margin-left: 8px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-style: normal;
  letter-spacing: .08em;
  text-transform: uppercase;
  background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.04));
  border: 1px solid rgba(255,255,255,.2);
}

/* ---------- Profile box at bottom ---------- */
.sidebar .me {
  border-radius: 20px;
  padding: 14px 16px;
  background: linear-gradient(160deg, rgba(255,255,255,.12), rgba(255,255,255,.03) 40%, rgba(20,12,30,.7));
  border: 1px solid rgba(255,255,255,.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 10px 24px rgba(0,0,0,.45);
}
.sidebar .role {
  display: inline-block;
  margin: 8px 0 10px;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.05));
  border: 1px solid rgba(255,255,255,.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35);
}

/* ---------- Buttons (sidebar + access denied) ---------- */
.sidebar .btn.ghost, .card.narrow .btn {
  padding: 11px 22px !important;
  border-radius: 14px !important;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,.3) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.05) 50%, rgba(0,0,0,.25) 100%) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.4),
    inset 0 -2px 4px rgba(0,0,0,.4),
    0 6px 16px rgba(0,0,0,.5) !important;
  cursor: pointer;
  transition: transform .15s, filter .15s;
}
.sidebar .btn.ghost:hover, .card.narrow .btn:hover { transform: translateY(-1px); filter: brightness(1.15); }
.sidebar .btn.ghost:active, .card.narrow .btn:active { transform: translateY(1px); }

/* ---------- Access denied card ---------- */
.card.narrow {
  position: relative;
  overflow: hidden;
  border-radius: 28px !important;
  padding: 36px !important;
  background:
    radial-gradient(120% 70% at 20% 0%, rgba(255,255,255,.16), rgba(255,255,255,0) 60%),
    linear-gradient(160deg, rgba(255,255,255,.08) 0%, rgba(20,12,30,.9) 60%) !important;
  border: 1px solid rgba(255,255,255,.28) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.38),
    inset 0 -1px 0 rgba(0,0,0,.55),
    0 24px 60px rgba(0,0,0,.65) !important;
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}

/* ---------- Main area + scrollbar ---------- */
.main h1 { text-shadow: 0 2px 12px rgba(0,0,0,.6); }
*::-webkit-scrollbar { width: 12px; height: 12px; }
*::-webkit-scrollbar-track { background: rgba(0,0,0,.35); }
*::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,.35);
  background: linear-gradient(90deg, rgba(255,255,255,.35), rgba(255,255,255,.12));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4);
}
*::-webkit-scrollbar-thumb:hover { background: linear-gradient(90deg, rgba(255,255,255,.5), rgba(255,255,255,.2)); }
`;

export default function App() {
  const [s, setS] = useState({ loading: true, user: null, role: null });
  const [page, setPage] = useState('Users');

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) return setS({ loading: false, user: null, role: null });
        // force-refresh so a role given by the admin script is picked up
        const token = await user.getIdTokenResult(true);
        setS({ loading: false, user, role: token.claims.role || null });
      }),
    [],
  );

  if (s.loading) return <div className="center muted">Loading...</div>;
  if (!s.user) return <Login />;

  // NOTE: this check only decides what to show. The real protection is in firestore.rules.
    if (!STAFF_ROLES.includes(s.role)) {
    return (
      <>
        <style>{GLOSS_CSS}</style>
        <div className="center">
          <div className="card narrow">
            <h2>Access denied</h2>
            <p className="muted">
              {s.user.email} does not have a staff role. Ask a Super admin to give you access.
            </p>
            <button className="btn" onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </div>
      </>
    );
  }

    return (
    <div className="layout">
      <style>{GLOSS_CSS}</style>
      <aside className="sidebar">
        <div className="brand">HyperLive<span>Admin</span></div>
        <nav>
          {Object.keys(PAGES).map((n) => (
            <a key={n} className={`nav ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</a>
          ))}
          {SOON.map((n) => (
            <a key={n} className="nav disabled">{n}<em>soon</em></a>
          ))}
        </nav>
        <div className="me">
          <div className="muted small">{s.user.email}</div>
          <div className={`role ${s.role}`}>{s.role === 'super_admin' ? 'Super admin' : 'Admin'}</div>
          <button className="btn ghost" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {(() => { const Page = PAGES[page]; return <Page staff={s.user} role={s.role} />; })()}
      </main>
    </div>
  );
}