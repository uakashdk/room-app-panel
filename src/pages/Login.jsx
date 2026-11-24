import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { auth } from "../firebase";
import logo from "../assets/desi-vox-logo.jpeg";
import { FcGoogle } from "react-icons/fc";
import {
  MdEmail,
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import { sendPasswordResetEmail } from "firebase/auth";

const fieldCls =
  "flex items-center h-[50px] pl-2.5 rounded-[10px] border-[1.5px] " +
  "border-[color-mix(in_srgb,currentColor_18%,transparent)] " +
  "focus-within:border-[var(--accent,currentColor)] transition duration-200 ease-in-out";

const inputCls =
  "flex-1 min-w-0 h-full ml-2.5 p-0 !border-none !bg-transparent !shadow-none " +
  "rounded-[10px] text-inherit outline-none focus:outline-none";

const iconCls = "shrink-0 text-xl opacity-60";

const btnCls =
  "flex items-center justify-center gap-2.5 w-full h-[50px] rounded-[10px] " +
  "text-[15px] font-medium cursor-pointer transition duration-200 ease-in-out";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const loginWithEmail = async (event) => {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email)
      return setError('Enter your email first, then click "Forgot password".');
    setBusy(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setError("Password reset email sent. Check your inbox (and spam).");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addPasswordToGoogleAccount = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;

      const newPassword = window.prompt("Choose a password (min 6 characters)");
      if (!newPassword) return;

      const cred = EmailAuthProvider.credential(user.email, newPassword);
      await linkWithCredential(user, cred);
      setError("Password added. You can now log in with email and password.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError(
        e.code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <style>{`
        /* ---------- CARD ---------- */
        .lx-card {
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 420px;
          padding: 42px 34px 32px;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          background-image: linear-gradient(155deg,
            rgba(255,255,255,0.16) 0%,
            rgba(255,255,255,0.04) 35%,
            rgba(255,255,255,0) 55%,
            rgba(255,255,255,0.07) 100%);
          box-shadow:
            0 40px 80px -24px rgba(0,0,0,0.65),
            0 14px 30px rgba(0,0,0,0.30),
            0 0 0 1px rgba(0,0,0,0.25),
            inset 0 1.5px 0 rgba(255,255,255,0.45),
            inset 0 -1.5px 0 rgba(0,0,0,0.35),
            inset 0 0 40px rgba(255,255,255,0.04);
          animation: lx-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        /* rim light: bright glassy edge on top-left and bottom-right */
        .lx-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg,
            rgba(255,255,255,0.75),
            rgba(255,255,255,0) 30%,
            rgba(255,255,255,0) 70%,
            rgba(255,255,255,0.35));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 2;
        }
        /* curved glass reflection across the top */
        .lx-card::after {
          content: "";
          position: absolute;
          left: -10%; right: -10%; top: 0;
          height: 46%;
          border-radius: 0 0 50% 50% / 0 0 38% 38%;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.22),
            rgba(255,255,255,0.04) 85%,
            rgba(255,255,255,0));
          pointer-events: none;
          z-index: 1;
        }
        /* cursor-following spotlight */
        .lx-spot {
          position: absolute;
          inset: 0;
          background: radial-gradient(380px circle at var(--mx, 50%) var(--my, 0%),
            rgba(255,255,255,0.16), transparent 60%);
          pointer-events: none;
          z-index: 1;
        }
        /* slow light sweep */
        .lx-sweep {
          position: absolute;
          top: -50%;
          left: -60%;
          width: 40%;
          height: 200%;
          background: linear-gradient(90deg,
            transparent,
            rgba(255,255,255,0.10),
            rgba(255,255,255,0.22),
            rgba(255,255,255,0.10),
            transparent);
          transform: rotate(20deg);
          animation: lx-sweep 7s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
        .lx-inner {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ---------- LOGO ---------- */
        .lx-logo-wrap {
          position: relative;
          width: 98px; height: 98px;
          padding: 3px;
          border-radius: 50%;
          overflow: hidden;
          background: conic-gradient(from 210deg,
            rgba(255,255,255,0.75),
            rgba(255,255,255,0.08),
            rgba(255,255,255,0.55),
            rgba(255,255,255,0.08),
            rgba(255,255,255,0.75));
          box-shadow:
            0 14px 34px rgba(0,0,0,0.5),
            0 0 34px rgba(255,255,255,0.10),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -2px 4px rgba(0,0,0,0.3);
          margin-bottom: 18px;
          animation: lx-glow 4s ease-in-out infinite;
        }
        .lx-logo-wrap img {
          width: 100%; height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.25);
        }
        /* specular glare on the logo */
        .lx-logo-wrap::after {
          content: "";
          position: absolute;
          top: 7%; left: 14%;
          width: 56%; height: 36%;
          border-radius: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0));
          transform: rotate(-22deg);
          pointer-events: none;
        }

        .lx-sub {
          margin: 6px 0 26px;
          font-size: 12.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.6;
        }

        /* ---------- INPUTS ---------- */
        .lx-form { width: 100%; display: flex; flex-direction: column; gap: 14px; }
        .lx-field { position: relative; }
        .lx-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 15px 18px;
          border-radius: 15px;
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
        .lx-field input::placeholder { color: inherit; opacity: 0.45; }
        .lx-field input:focus {
          border-color: rgba(255,255,255,0.5);
          background-color: rgba(255,255,255,0.09);
          transform: translateY(-1px);
          box-shadow:
            0 0 0 4px rgba(255,255,255,0.08),
            0 8px 22px -8px rgba(255,255,255,0.18),
            inset 0 3px 8px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }

        /* ---------- GLOSSY BUTTONS (theme color comes from .btn) ---------- */
        .lx-card .lx-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px 18px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.28);
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          /* classic gloss split: bright top half, deeper bottom half */
          background-image: linear-gradient(180deg,
            rgba(255,255,255,0.26) 0%,
            rgba(255,255,255,0.06) 49%,
            rgba(0,0,0,0.16) 51%,
            rgba(0,0,0,0.04) 100%);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          box-shadow:
            0 14px 26px -10px rgba(0,0,0,0.6),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.65),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 14px rgba(255,255,255,0.08);
          transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
        }
        /* crisp curved highlight on top half */
        .lx-card .lx-btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 14px 14px 60% 60% / 14px 14px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0.05));
          pointer-events: none;
        }
        /* shine sweep on hover */
        .lx-card .lx-btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .lx-card .lx-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 20px 34px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.75),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 18px rgba(255,255,255,0.12);
        }
        .lx-card .lx-btn:hover:not(:disabled)::after { left: 150%; }
        .lx-card .lx-btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 6px 12px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .lx-card .lx-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .lx-btn span { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 10px; }
        .lx-btn svg { font-size: 20px; }

        .lx-card .lx-google {
          background-color: rgba(255,255,255,0.08);
          color: inherit;
          border-color: rgba(255,255,255,0.22);
        }

        /* ---------- DIVIDER / ERROR / FOOTER ---------- */
        .lx-divider {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 20px 0;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          opacity: 0.55;
        }
        .lx-divider::before, .lx-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          box-shadow: 0 1px 0 rgba(0,0,0,0.3);
        }
        .lx-error {
          width: 100%;
          box-sizing: border-box;
          margin-top: 18px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
          text-align: center;
          background-color: rgba(255,70,70,0.10);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          border: 1px solid rgba(255,90,90,0.4);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
          animation: lx-shake .4s ease;
        }
        .lx-foot { margin-top: 24px; font-size: 12px; opacity: 0.45; text-align: center; }

        @keyframes lx-rise { from { opacity: 0; transform: translateY(28px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes lx-sweep { 0% { left: -60%; } 45%, 100% { left: 150%; } }
        @keyframes lx-glow {
          0%, 100% { box-shadow: 0 14px 34px rgba(0,0,0,0.5), 0 0 24px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.3); }
          50%      { box-shadow: 0 14px 34px rgba(0,0,0,0.5), 0 0 42px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.3); }
        }
        @keyframes lx-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (max-width: 480px) { .lx-card { padding: 34px 22px 26px; border-radius: 22px; } }
        @media (prefers-reduced-motion: reduce) {
          .lx-sweep, .lx-logo-wrap, .lx-card { animation: none; }
        }
      `}</style>

      <div
        className="card narrow login-card lx-card"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
      >
        <div className="lx-spot" />
        <div className="lx-sweep" />

        <div className="lx-inner">
          <div className="lx-logo-wrap">
            <img src={logo} alt="Desi Vox Logo" className="login-logo" />
          </div>

          <div className="brand big">
            HyperLive<span>Admin</span>
          </div>
          <p className="lx-sub">Secure Admin Access</p>

          <form onSubmit={loginWithEmail} className="lx-form">
            <div className="lx-field">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="lx-field">
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="button"
              onClick={resetPassword}
              disabled={busy}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                opacity: 0.7,
                cursor: "pointer",
                fontSize: 13,
                textAlign: "right",
              }}
            >
              Forgot password?
            </button>

            <button className="btn lx-btn" type="submit" disabled={busy}>
              <span>
                {busy ? (
                  "Signing in..."
                ) : (
                  <>
                    <MdEmail /> Login with Email
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="lx-divider">or</div>

          <button
            className="btn lx-btn lx-google"
            onClick={signIn}
            disabled={busy}
          >
            <span>
              {busy ? (
                "Signing in..."
              ) : (
                <>
                  <FcGoogle /> Sign in with Google
                </>
              )}
            </span>
          </button>

          <button
            type="button"
            className="btn lx-btn lx-google"
            onClick={addPasswordToGoogleAccount}
            disabled={busy}
          >
            <span>Set password for Google account</span>
          </button>

          {error && <p className="error lx-error">{error}</p>}

          <p className="lx-foot">Protected area · Authorized personnel only</p>
        </div>
      </div>
    </div>
  );
}
