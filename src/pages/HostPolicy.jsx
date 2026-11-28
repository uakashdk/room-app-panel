import { useEffect, useState } from 'react';
import { api } from '../api';
import PlanEditor from '../components/PlanEditor.jsx';

// the server keeps money in cents, the admin types dollars
const toCents = (v) => Math.round(Number(String(v).replace(',', '.')) * 100);
const toDollars = (c) => (Number(c || 0) / 100).toFixed(2);
const METHODS = [['upi', 'UPI'], ['bank', 'Bank account'], ['paypal', 'PayPal']];

/* Glossy premium finish. Translucent white/black layers only, so colours and theme stay unchanged. */
const GLOSS_CSS = `
.gloss-page .card{
  position:relative;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.14);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.16),
    inset 0 -1px 0 rgba(0,0,0,.35),
    0 14px 36px rgba(0,0,0,.45);
}
.gloss-page .card::before{
  content:'';
  position:absolute;
  inset:0;
  border-radius:inherit;
  background:linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.03) 38%,rgba(255,255,255,0) 60%);
  pointer-events:none;
}
.gloss-page .card > *{position:relative;}

.gloss-page .btn{
  position:relative;
  overflow:hidden;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.16);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.28),
    inset 0 -6px 10px rgba(0,0,0,.22),
    0 4px 12px rgba(0,0,0,.40);
  transition:transform .15s ease,filter .15s ease,box-shadow .15s ease;
}
.gloss-page .btn::before{
  content:'';
  position:absolute;
  left:0;right:0;top:0;height:52%;
  background:linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,.02));
  pointer-events:none;
}
.gloss-page .btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08);}
.gloss-page .btn:active:not(:disabled){
  transform:translateY(1px);
  box-shadow:inset 0 2px 6px rgba(0,0,0,.40),0 1px 3px rgba(0,0,0,.40);
}
.gloss-page .btn:disabled{opacity:.6;cursor:not-allowed;}
.gloss-page .btn.sm{border-radius:10px;}

/* every text/number input, select and textarea inside a card (also PlanEditor) */
.gloss-page .card input:not([type=checkbox]):not([type=radio]),
.gloss-page .card select,
.gloss-page .card textarea{
  box-sizing:border-box;
  height:46px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.16);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    inset 0 -10px 16px rgba(0,0,0,.25),
    0 2px 6px rgba(0,0,0,.30);
  transition:border-color .15s ease,box-shadow .15s ease;
}
.gloss-page .card textarea{height:auto;}
.gloss-page .card input:not([type=checkbox]):not([type=radio]):focus,
.gloss-page .card select:focus,
.gloss-page .card textarea:focus{
  outline:none;
  border-color:rgba(244,197,66,.85);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.16),
    inset 0 -10px 16px rgba(0,0,0,.25),
    0 0 0 1px rgba(244,197,66,.35),
    0 0 10px rgba(244,197,66,.22);
}
.gloss-page .card input[type=checkbox]{width:18px;height:18px;margin:0;cursor:pointer;flex:none;}

/* field = label on top, control below, so all controls line up */
.gloss-page .card label:not(:has(> input[type=checkbox])){
  display:flex;
  flex-direction:column;
  justify-content:flex-end;
  gap:6px;
}
.gloss-page .card label:has(> input[type=checkbox]){
  display:flex;
  flex-direction:row;
  align-items:center;
  gap:8px;
  min-height:46px;
  cursor:pointer;
}

.gloss-page .box{
  position:relative;
  overflow:hidden;
  border-radius:14px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 6px 16px rgba(0,0,0,.35);
}
.gloss-page .box::before{
  content:'';
  position:absolute;
  inset:0;
  background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0) 55%);
  pointer-events:none;
}

/* Withdrawal rules layout */
.gloss-page .wd{display:flex;flex-direction:column;gap:18px;padding:18px 20px;}
.gloss-page .wd-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 20px;}
.gloss-page .wd-row .wd-check{white-space:nowrap;}
.gloss-page .wd-row .wd-field{flex:1 1 180px;min-width:160px;max-width:260px;}
.gloss-page .wd-row .wd-field input{width:100%;}
.gloss-page .wd-bottom{
  align-items:center;
  padding-top:16px;
  border-top:1px solid rgba(255,255,255,.08);
}
.gloss-page .wd-methods{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;}
.gloss-page .wd-methods label{white-space:nowrap;}
.gloss-page .wd-bottom .btn{margin-left:auto;height:46px;padding:0 22px;}

.gloss-page .btn:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px;}
@media (prefers-reduced-motion:reduce){
  .gloss-page *{transition:none !important;}
}
/* PlanEditor top row: one shared baseline for select, inputs and checkbox */
.gloss-page .card label{
  margin:0 !important;
  align-self:flex-end;
}
.gloss-page .card input:not([type=checkbox]):not([type=radio]),
.gloss-page .card select{
  display:block;
  margin:0 !important;
  height:46px;
  padding-top:0;
  padding-bottom:0;
}
.gloss-page .card label:has(> input[type=checkbox]){
  align-self:flex-end;
  min-height:46px;
}
/* Glossy dropdown (Chrome / Edge 135+). Other browsers keep their normal list. */
@supports (appearance: base-select) {
  .gloss-page .card select,
  .gloss-page .card select::picker(select){
    appearance:base-select;
  }

  /* closed box: text centred, custom chevron */
  .gloss-page .card select{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding:0 16px;
    color:rgba(255,255,255,.92);
    cursor:pointer;
  }
  .gloss-page .card select::picker-icon{
    content:'';
    width:7px;
    height:7px;
    margin-top:-3px;
    border-right:2px solid rgba(255,255,255,.7);
    border-bottom:2px solid rgba(255,255,255,.7);
    rotate:45deg;
    transition:rotate .2s ease,margin .2s ease;
  }
  .gloss-page .card select:open::picker-icon{
    rotate:225deg;
    margin-top:3px;
  }

  /* open panel: frosted dark glass */
  .gloss-page .card select::picker(select){
    margin-top:8px;
    padding:8px;
    border-radius:20px;
    border:1px solid rgba(255,255,255,.2);
    background:
      linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.04) 45%,rgba(255,255,255,.08)),
      rgba(24,18,34,.88);
    backdrop-filter:blur(18px) saturate(1.2);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.28),
      inset 0 -1px 0 rgba(0,0,0,.4),
      0 20px 44px rgba(0,0,0,.65);
  }

  /* options: white text, roomy rows */
  .gloss-page .card select option{
    display:flex;
    align-items:center;
    min-height:48px;
    padding:0 16px;
    border-radius:12px;
    border:1px solid transparent;
    background:transparent;
    color:rgba(255,255,255,.92);
    font-weight:500;
    cursor:pointer;
    transition:background .12s ease;
  }
  .gloss-page .card select option:hover,
  .gloss-page .card select option:focus-visible{
    background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04));
  }

  /* selected: glossy pill, bold text, checkmark on the right */
  .gloss-page .card select option:checked{
    color:#fff;
    font-weight:700;
    border-color:rgba(255,255,255,.28);
    background:linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,.08) 55%,rgba(255,255,255,.12));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.35),
      0 4px 10px rgba(0,0,0,.35);
  }
  .gloss-page .card select option::checkmark{
    order:2;
    margin-left:auto;
    color:#fff;
  }
}
`;

/** The host salary levels (the "host policy") and the withdrawal rules. Nothing about salary or commission is fixed in the code: it is set here. */
export default function HostPolicy({ role }) {
  const canEdit = role === 'super_admin';
  const [policy, setPolicy] = useState(null);
  const [w, setW] = useState({ enabled: true, min: '10.00', max: '5000.00', daily: '5000.00', methods: ['upi', 'bank', 'paypal'] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const fail = (e) => { setNote(''); setError(e.message || String(e)); };
  const ok = (m) => { setError(''); setNote(m); };

  useEffect(() => {
    if (!canEdit) return setLoading(false);
    (async () => {
      try {
        const r = await api('/admin/host-policy');
        setPolicy(r.policy);
        setW({ enabled: r.withdrawal.enabled, min: toDollars(r.withdrawal.minCents), max: toDollars(r.withdrawal.maxCents), daily: toDollars(r.withdrawal.dailyLimitCents), methods: r.withdrawal.methods });
      } catch (e) {
        fail(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [canEdit]);

  const savePolicy = async (body) => {
    if (!window.confirm('Save the default targets? Agencies that have no targets of their own use them from now on (periods already calculated do not change).')) return;
    setBusy(true);
    try {
      const r = await api('/admin/host-policy', 'PUT', body);
      setPolicy(r.policy);
      ok('Default targets saved.');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const saveWithdrawal = async () => {
    const body = { enabled: w.enabled, minCents: toCents(w.min), maxCents: toCents(w.max), dailyLimitCents: toCents(w.daily), methods: w.methods };
    if ([body.minCents, body.maxCents, body.dailyLimitCents].some((n) => !Number.isFinite(n) || n < 1)) return fail(new Error('The amounts must be more than 0.'));
    if (body.methods.length === 0) return fail(new Error('Choose at least one payment method.'));
    setBusy(true);
    try {
      await api('/admin/withdrawal-settings', 'PUT', body);
      ok('Withdrawal rules saved.');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return (
    <div className="gloss-page">
      <style>{GLOSS_CSS}</style>
      <div className="head"><h1>Host policy</h1></div>
      <p className="muted pad">Only a Super admin can change the host policy.</p>
    </div>
  );
  
    return (
    <div className="gloss-page">
      <style>{GLOSS_CSS}</style>

      <div className="head"><h1>Host policy</h1></div>
      {error && <div className="error box">{error}</div>}
      {note && <div className="ok box">{note}</div>}
      {loading && <p className="muted pad">Loading...</p>}

      {!loading && (
        <>
          <p className="muted small">
            These are the <b>default targets</b>, used by every agency that has no targets of its own. To give one agency its own targets (weekly or monthly, its own levels),
            open <b>Agencies</b> and press <b>Targets</b> on that agency. A host who receives the target number of gift coins before the deadline reaches that level and earns its
            host salary. The <b>agency commission</b> is not a second salary: it is a % of the host's withdrawal, paid to the agency owner's PayPal (set per agency).
          </p>
          <PlanEditor policy={policy} onSave={savePolicy} busy={busy} saveLabel="Save default targets" />
          <div style={{ height: 24 }} />

          <div className="head"><h1 style={{ fontSize: 20 }}>Withdrawal rules</h1></div>
          <div className="card form" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={w.enabled} onChange={(e) => setW({ ...w, enabled: e.target.checked })} /> Withdrawals are on
            </label>
            <label>Smallest (USD)<input value={w.min} onChange={(e) => setW({ ...w, min: e.target.value })} style={{ width: 110 }} /></label>
            <label>Largest single (USD)<input value={w.max} onChange={(e) => setW({ ...w, max: e.target.value })} style={{ width: 110 }} /></label>
            <label>Most per person per day (USD)<input value={w.daily} onChange={(e) => setW({ ...w, daily: e.target.value })} style={{ width: 110 }} /></label>
            <div style={{ display: 'flex', gap: 14 }}>
              {METHODS.map(([k, label]) => (
                <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox" checked={w.methods.includes(k)}
                    onChange={(e) => setW({ ...w, methods: e.target.checked ? [...w.methods, k] : w.methods.filter((m) => m !== k) })}
                  /> {label}
                </label>
              ))}
            </div>
            <button className="btn" onClick={saveWithdrawal} disabled={busy}>Save withdrawal rules</button>
          </div>
        </>
      )}
    </div>
  );
}

