import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError(e.code === 'auth/popup-closed-by-user' ? 'Sign-in was cancelled.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center">
      <div className="card narrow">
        <div className="brand big">HyperLive<span>Admin</span></div>
        <p className="muted">Staff only. Sign in with your Google account.</p>
        <button className="btn" onClick={signIn} disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
