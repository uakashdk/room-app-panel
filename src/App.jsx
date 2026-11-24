import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./pages/Login.jsx";
import Agencies from "./pages/Agencies.jsx";
import Banners from "./pages/Banners.jsx";
import CoinPackages from "./pages/CoinPackages.jsx";
import Economy from "./pages/Economy.jsx";
import HostPolicy from "./pages/HostPolicy.jsx";
import Posts from "./pages/Posts.jsx";
import Reports from "./pages/Reports.jsx";
import Rooms from "./pages/Rooms.jsx";
import Salary from "./pages/Salary.jsx";
import Transactions from "./pages/Transactions.jsx";
import Users from "./pages/Users.jsx";
import Vip from "./pages/Vip.jsx";
import Withdrawals from "./pages/Withdrawals.jsx";

const STAFF_ROLES = ["admin", "super_admin"];
const PAGES = {
  Users,
  Agencies,
  Rooms,
  Banners,
  Posts,
  Reports,
  Economy,
  "Coin Packages": CoinPackages,
  VIP: Vip,
  Transactions,
  "Salary Approval": Salary,
  Withdrawals,
  "Host Policy": HostPolicy,
};
const SOON = ["Dashboard", "Gifts", "Hosts", "Settings"];

export default function App() {
  const [s, setS] = useState({ loading: true, user: null, role: null });
  const [page, setPage] = useState("Users");

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
            {s.user.email} does not have a staff role. Ask a Super admin to give
            you access.
          </p>
          <button className="btn" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout dv-side">
      <style>{`
        /* ---------- SIDEBAR GLASS ---------- */
        .dv-side .sidebar {
          border-right: 1px solid rgba(255,255,255,0.14);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          background-image:
            linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 18%, rgba(255,255,255,0) 40%),
            linear-gradient(100deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.03) 100%);
          box-shadow:
            18px 0 50px -24px rgba(0,0,0,0.65),
            inset -1px 0 0 rgba(0,0,0,0.35),
            inset 1px 0 0 rgba(255,255,255,0.12),
            inset 0 1.5px 0 rgba(255,255,255,0.3),
            inset 0 0 40px rgba(255,255,255,0.03);
        }

        /* ---------- BRAND ---------- */
        .dv-side .brand {
          padding-bottom: 18px;
          margin-bottom: 14px;
          letter-spacing: 0.03em;
          text-shadow: 0 2px 14px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.15);
          border-bottom: 1px solid transparent;
          border-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent) 1;
          box-shadow: 0 1px 0 rgba(0,0,0,0.35);
        }

        /* ---------- NAV ITEMS ---------- */
        .dv-side .nav {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
          border-radius: 13px;
          border: 1px solid transparent;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          transition: transform .2s ease, box-shadow .2s ease, filter .2s ease, background-color .2s ease, border-color .2s ease;
        }
        .dv-side .nav::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: skewX(-20deg);
          transition: left .7s ease;
          pointer-events: none;
        }
        .dv-side .nav:hover:not(.disabled):not(.active) {
          transform: translateX(3px);
          border-color: rgba(255,255,255,0.18);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.08));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 16px -10px rgba(0,0,0,0.6);
        }
        .dv-side .nav:hover:not(.disabled)::after { left: 150%; }

        /* active item: same glossy split as the buttons */
        .dv-side .nav.active {
          border-color: rgba(255,255,255,0.3);
          background-image: linear-gradient(180deg,
            rgba(255,255,255,0.28) 0%,
            rgba(255,255,255,0.06) 49%,
            rgba(0,0,0,0.16) 51%,
            rgba(0,0,0,0.04) 100%);
          box-shadow:
            0 12px 22px -10px rgba(0,0,0,0.6),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 12px rgba(255,255,255,0.07);
        }
        .dv-side .nav:active:not(.disabled) { transform: translateY(1px); }

        /* "soon" items */
        .dv-side .nav.disabled { cursor: not-allowed; opacity: 0.5; text-shadow: none; }
        .dv-side .nav em {
          font-style: normal;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 3px 9px;
          margin-left: 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.2);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.12));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.25);
        }

        /* ---------- ACCOUNT AREA ---------- */
        .dv-side .me {
          border-top: 1px solid transparent;
          border-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent) 1;
          box-shadow: 0 -1px 0 rgba(0,0,0,0.35);
        }
        .dv-side .role {
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
          box-shadow: 0 4px 10px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.25);
        }

        /* glossy sign-out button */
        .dv-side .me .btn {
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
        .dv-side .me .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .dv-side .me .btn:hover { transform: translateY(-2px); filter: brightness(1.1) saturate(1.05); }
        .dv-side .me .btn:hover::after { left: 150%; }
        .dv-side .me .btn:active { transform: translateY(1px); }

        @media (prefers-reduced-motion: reduce) {
          .dv-side .nav, .dv-side .nav::after, .dv-side .me .btn { transition: none; }
        }
        
                /* ---------- PREMIUM GLOSS (panel + selected item only) ---------- */
        /* keeps "Desi" and "Vox" together */
        .dv-side .brand span { margin-left: 0 !important; padding-left: 0 !important; }
        .dv-side .brand { text-shadow: 0 2px 14px rgba(0,0,0,0.5), 0 0 22px rgba(244,197,66,0.18), 0 1px 0 rgba(255,255,255,0.2); }

        /* panel: curved light sheen at the top, like the login card */
        .dv-side .sidebar {
          background-image:
            radial-gradient(130% 22% at 50% -2%, rgba(255,255,255,0.22), rgba(255,255,255,0.05) 55%, transparent 75%),
            linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0) 45%),
            linear-gradient(100deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0.04) 100%);
          border-right: 1px solid rgba(255,255,255,0.2);
          box-shadow:
            18px 0 50px -24px rgba(0,0,0,0.7),
            inset -1px 0 0 rgba(0,0,0,0.45),
            inset 1px 0 0 rgba(255,255,255,0.2),
            inset 0 2px 0 rgba(255,255,255,0.4),
            inset 0 0 60px rgba(255,255,255,0.04);
        }

        /* selected menu: curved top sheen + glossy split + soft glow */
        .dv-side .nav.active {
          border-color: rgba(255,255,255,0.42);
          background-image:
            radial-gradient(120% 75% at 50% -25%, rgba(255,255,255,0.38), rgba(255,255,255,0.06) 60%, transparent 75%),
            linear-gradient(180deg,
              rgba(255,255,255,0.30) 0%,
              rgba(255,255,255,0.07) 48%,
              rgba(0,0,0,0.20) 52%,
              rgba(0,0,0,0.05) 100%);
          text-shadow: 0 0 14px rgba(244,197,66,0.35), 0 1px 2px rgba(0,0,0,0.4);
          box-shadow:
            0 14px 26px -10px rgba(0,0,0,0.65),
            0 2px 5px rgba(0,0,0,0.3),
            0 0 18px rgba(244,197,66,0.12),
            inset 0 1px 0 rgba(255,255,255,0.8),
            inset 0 -3px 7px rgba(0,0,0,0.32),
            inset 0 0 14px rgba(255,255,255,0.09);
        }

        /* sign-out and role pill: slightly brighter gloss */
        .dv-side .me .btn, .dv-side .role {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 49%, rgba(0,0,0,0.18) 51%, rgba(0,0,0,0.04) 100%);
        }

        .dv-side .me .btn, .dv-side .role {
        background-image: linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.08) 49%, rgba(0,0,0,0.18) 51%, rgba(0,0,0,0.04) 100%);
        }
      `}</style>

      <aside className="sidebar">
        <div className="brand">
          Desi<span>Vox</span>
        </div>
        <nav>
          {Object.keys(PAGES).map((n) => (
            <a
              key={n}
              className={`nav ${page === n ? "active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </a>
          ))}
          {SOON.map((n) => (
            <a key={n} className="nav disabled">
              {n}
              <em>soon</em>
            </a>
          ))}
        </nav>
        <div className="me">
          <div className="muted small">{s.user.email}</div>
          <div className={`role ${s.role}`}>
            {s.role === "super_admin" ? "Super admin" : "Admin"}
          </div>
          <button className="btn ghost" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        {(() => {
          const Page = PAGES[page];
          return <Page staff={s.user} role={s.role} />;
        })()}
      </main>
    </div>
  );
}
