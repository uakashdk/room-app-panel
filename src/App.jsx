import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Login from './pages/Login.jsx';
import Agencies from './pages/Agencies.jsx';
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

const STAFF_ROLES = ['admin', 'super_admin'];
const PAGES = { Users, Agencies, Rooms, Banners, Posts, Reports, Economy, 'Coin Packages': CoinPackages, VIP: Vip, Transactions, 'Salary Approval': Salary, Withdrawals, 'Host Policy': HostPolicy };
const SOON = ['Dashboard', 'Gifts', 'Hosts', 'Settings'];

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
      <div className="center">
        <div className="card narrow">
          <h2>Access denied</h2>
          <p className="muted">
            {s.user.email} does not have a staff role. Ask a Super admin to give you access.
          </p>
          <button className="btn" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
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
