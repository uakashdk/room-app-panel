import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8790";

// every call to the backend carries the logged-in admin's token
async function api(path, options = {}) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${API_URL}/admin/coin-transactions${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Something went wrong.");
  return data;
}

// a new id for every send, so a double click can never send coins twice
const newRequestId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");

const fmtDate = (ms) => (ms ? new Date(ms).toLocaleString() : "-");

export default function CoinTransactions() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [requestId, setRequestId] = useState(newRequestId);
  const [sending, setSending] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async (uid) => {
    setLoading(true);
    try {
      const data = await api(uid ? `?userId=${uid}` : "");
      setItems(data.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(activeSearch); }, [load, activeSearch]);
  useEffect(() => {
  if (!error && !ok) return;
  const t = setTimeout(() => { setError(""); setOk(""); }, 4000);
  return () => clearTimeout(t);
 }, [error, ok]);

  const cancel = () => {
    setUserId("");
    setAmount("");
    setError("");
    setOk("");
    setRequestId(newRequestId());
  };

  // step 1: check the form, then open the popup
const send = (e) => {
  e.preventDefault();
  setError("");
  setOk("");
  const coins = Number(amount);
  if (!/^\d{6}$/.test(userId)) return setError("The User ID must be exactly 6 digits.");
  if (!Number.isInteger(coins) || coins < 1) return setError("Enter a whole number of coins (1 or more).");
  setConfirmData({ coins, userId });
};

// step 2: the admin pressed Confirm in the popup
const doSend = async () => {
  const { coins, userId: uid } = confirmData;
  setConfirmData(null);
  setSending(true);
  try {
    const r = await api("", { method: "POST", body: JSON.stringify({ userId: uid, amount: coins, requestId }) });
    setOk(`Sent ${coins.toLocaleString()} coins to ${r.userName} (${uid}). New balance: ${r.balance.toLocaleString()}.`);
    setUserId("");
    setAmount("");
    setRequestId(newRequestId());
    await load(activeSearch);
  } catch (err) {
    setError(err.message);
  } finally {
    setSending(false);
  }
};

  const runSearch = (e) => {
    e.preventDefault();
    setError("");
    if (search && !/^\d{6}$/.test(search)) return setError("Search needs a 6-digit User ID.");
    setActiveSearch(search);
  };

  const clearSearch = () => {
    setSearch("");
    setActiveSearch("");
    setError("");
  };

  return (
    <div className="ct-wrap">
      <style>{`
        .ct-wrap .head h1, .ct-wrap h3 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }
        .ct-wrap .card {
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          background-image: linear-gradient(155deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.06) 100%);
          box-shadow: 0 40px 80px -28px rgba(0,0,0,0.65), 0 14px 30px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.42), inset 0 -1.5px 0 rgba(0,0,0,0.35);
        }
        .ct-wrap .card.form { padding: 26px; margin-bottom: 22px; }
        .ct-wrap .card.form h3 { margin: 0 0 16px; }
        .ct-wrap .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; }
        @media (max-width: 700px) { .ct-wrap .grid { grid-template-columns: 1fr; } }

        .ct-wrap .field { display: flex; flex-direction: column; gap: 8px; }
        .ct-wrap .field > span {
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
          opacity: 0.75; text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .ct-wrap .field input, .ct-wrap .search input {
          width: 100%; box-sizing: border-box; height: 44px; padding: 9px 14px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.16); background-color: rgba(255,255,255,0.05);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%);
          color: inherit; font-size: 14px; outline: none;
          box-shadow: inset 0 3px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 0 rgba(255,255,255,0.10);
          transition: border-color .25s, background-color .25s, box-shadow .25s;
        }
        .ct-wrap .field input:focus, .ct-wrap .search input:focus {
          border-color: #f4c542; background-color: rgba(255,255,255,0.07);
          box-shadow: 0 0 0 3px rgba(244,197,66,0.18), 0 0 22px 2px rgba(244,197,66,0.35), 0 10px 26px -6px rgba(244,197,66,0.55), inset 0 2px 6px rgba(0,0,0,0.25);
        }
        .ct-wrap .field:focus-within > span { color: #f4c542; opacity: 1; }
        .ct-wrap input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
        .ct-wrap input[type="number"]::-webkit-outer-spin-button,
        .ct-wrap input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

        .ct-wrap .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .ct-wrap .card.form .acts { margin-top: 22px; }
        .ct-wrap .btn {
          position: relative; overflow: hidden; cursor: pointer; border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.26); font-weight: 600; letter-spacing: 0.02em; padding: 11px 24px;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.06) 49%, rgba(0,0,0,0.16) 51%, rgba(0,0,0,0.04) 100%);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          box-shadow: 0 10px 20px -10px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.25);
          transition: transform .2s ease, filter .2s ease;
        }
        .ct-wrap .btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .ct-wrap .btn:active:not(:disabled) { transform: translateY(1px); }
        .ct-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .ct-wrap .search { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
        .ct-wrap .search input { max-width: 320px; }

        .ct-wrap .box { margin-bottom: 16px; padding: 13px 16px; border-radius: 14px; background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5); }
        .ct-wrap .error.box { background-color: rgba(255,70,70,0.10); border: 1px solid rgba(255,90,90,0.4); }
        .ct-wrap .ok.box { background-color: rgba(70,200,120,0.10); border: 1px solid rgba(90,220,140,0.4); }

        .ct-wrap .table-wrap { overflow-x: auto; }
        .ct-wrap table { border-collapse: separate; border-spacing: 0; width: 100%; }
        .ct-wrap thead th {
          padding: 16px 14px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;
          text-align: left; opacity: 0.85;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.12));
          border-bottom: 1px solid rgba(255,255,255,0.14);
        }
        .ct-wrap tbody td { padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .ct-wrap tbody tr:hover td { background-image: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.05)); }
        .ct-wrap tbody tr:last-child td { border-bottom: 0; }
        .ct-wrap .pad { padding: 28px 14px; text-align: center; }
        .ct-wrap .plus { color: #5fe08a; font-weight: 700; }

        .ct-wrap .toasts { position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 10px; width: min(340px, calc(100vw - 40px)); }
        .ct-wrap .toast {
        padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.45;
        border: 1px solid rgba(255,255,255,0.22);
        background-color: rgba(18,12,28,0.92);
        background-image: linear-gradient(155deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 60%);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 18px 40px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3);
        animation: ct-toast .25s ease both;
        }
        .ct-wrap .toast.err { border-color: rgba(255,90,90,0.5); color: #ff7b7b; }
        .ct-wrap .toast.okk { border-color: rgba(90,220,140,0.5); color: #5fe08a; }
        @keyframes ct-toast { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }

        .ct-wrap .modal-back {
        position: fixed; inset: 0; z-index: 1100;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
        animation: ct-fade .2s ease both;
        }
        .ct-wrap .modal {
        width: min(360px, calc(100vw - 40px));
        padding: 24px 26px;
        border-radius: 20px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.22);
        background-color: rgba(18,12,28,0.96);
        background-image: linear-gradient(155deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 60%);
        box-shadow: 0 30px 70px -16px rgba(0,0,0,0.8), inset 0 1.5px 0 rgba(255,255,255,0.35);
        animation: ct-pop .22s cubic-bezier(.2,.8,.2,1) both;
        }
        .ct-wrap .modal h3 { margin: 0 0 10px; }
        .ct-wrap .modal p { margin: 0 0 20px; font-size: 15px; line-height: 1.5; }
        .ct-wrap .modal .acts { justify-content: center; }
        @keyframes ct-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ct-pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="head"><h1>Coin Transactions</h1></div>
      <p className="muted small">Send coins to a user by their 6-digit User ID. Every send is saved below and cannot be edited or deleted.</p>

      <div className="toasts">
        {error && <div className="toast err">{error}</div>}
        {ok && <div className="toast okk">{ok}</div>}
        </div>

        {confirmData && (
        <div className="modal-back" onClick={() => setConfirmData(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm send</h3>
            <p>
                Send <b>{confirmData.coins.toLocaleString()}</b> coins to User ID <b>{confirmData.userId}</b>?
            </p>
            <div className="acts">
                <button className="btn" type="button" onClick={doSend}>Confirm</button>
                <button className="btn" type="button" onClick={() => setConfirmData(null)}>Cancel</button>
            </div>
            </div>
        </div>
        )}

      <form className="card form" onSubmit={send}>
        <h3>Send coins</h3>
        <div className="grid">
          <label className="field">
            <span>User ID (6 digits)</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="field">
            <span>Amount of coins</span>
            <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
        </div>
        <div className="acts">
          <button className="btn" type="submit" disabled={sending}>{sending ? "Sending..." : "Send"}</button>
          <button className="btn" type="button" onClick={cancel} disabled={sending}>Cancel</button>
        </div>
      </form>

      <form className="search" onSubmit={runSearch}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Search by User ID"
          value={search}
          onChange={(e) => setSearch(e.target.value.replace(/\D/g, ""))}
        />
        <button className="btn" type="submit">Search</button>
        {(search || activeSearch) && <button className="btn" type="button" onClick={clearSearch}>Clear</button>}
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Balance after</th>
              <th>Sent by</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="muted pad">Loading...</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="muted pad">{activeSearch ? "No transactions for this User ID." : "No transactions yet."}</td></tr>
            )}
            {!loading && items.map((it) => (
              <tr key={it.id}>
                <td>{it.userId}</td>
                <td>{it.userName}</td>
                <td className="plus">+{it.amount.toLocaleString()}</td>
                <td>{it.balanceAfter.toLocaleString()}</td>
                <td>{it.sentBy || "-"}</td>
                <td>{fmtDate(it.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}