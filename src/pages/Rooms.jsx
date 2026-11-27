import CrudPage from './CrudPage.jsx';

const fields = [
  { key: 'title', label: 'Room title', type: 'text', required: true, wide: true },
  { key: 'subtitle', label: 'Subtitle', type: 'text', wide: true },
  { key: 'hostName', label: 'Host name', type: 'text' },
  { key: 'category', label: 'Category', type: 'select', options: ['popular', 'music', 'talk', 'friends'] },
  { key: 'listeners', label: 'Listeners (number shown)', type: 'number' },
  { key: 'theme', label: 'Card colour', type: 'select', options: ['violet', 'plum', 'indigo', 'wine'] },
  { key: 'isLive', label: 'Live now (shown on Home)', type: 'checkbox' },
];

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'hostName', label: 'Host' },
  { key: 'category', label: 'Category' },
  { key: 'listeners', label: 'Listeners' },
  { key: 'isLive', label: 'Live', render: (r) => (r.isLive ? 'Yes' : 'No') },
  { key: 'level', label: 'Level', render: (r) => r.level ?? 1 },
  // this week's progress (restarts every Monday, India time): the room goes up a level when a goal is reached (default 20,000 coins / 600 min)
  { key: 'weekGiftCoins', label: 'Gift coins this week', render: (r) => Number(r.weekGiftCoins ?? 0).toLocaleString('en-US') },
  { key: 'weekFullMinutes', label: 'Full-seat min this week', render: (r) => Math.round(Number(r.weekFullMinutes ?? 0)).toLocaleString('en-US') },
  { key: 'giftCoins', label: 'Gift coins (all time)', render: (r) => Number(r.giftCoins ?? 0).toLocaleString('en-US') },
  { key: 'theme', label: 'Colour' },
];

const samples = [
  ['Music Lounge', 'music', 20], ['Late Night Talks', 'talk', 32], ['Friends Zone', 'friends', 44],
  ['Singing Room', 'music', 56], ['Chill & Chat', 'talk', 68],
].map(([title, category, listeners], i) => ({
  title, subtitle: 'Join the conversation', hostName: 'Host', category, listeners, theme: i % 2 ? 'plum' : 'violet', isLive: true,
}));

export default function Rooms({ staff }) {
  return (
    <div className="rm-wrap">
      <style>{`
        /* ---------- HEADER ---------- */
        .rm-wrap .head { animation: rm-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .rm-wrap .head h1, .rm-wrap h3 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }

        /* ---------- GLASS CARDS ---------- */
        .rm-wrap .card {
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          background-image: linear-gradient(155deg,
            rgba(255,255,255,0.14) 0%,
            rgba(255,255,255,0.04) 30%,
            rgba(255,255,255,0) 55%,
            rgba(255,255,255,0.06) 100%);
          box-shadow:
            0 40px 80px -28px rgba(0,0,0,0.65),
            0 14px 30px rgba(0,0,0,0.28),
            0 0 0 1px rgba(0,0,0,0.25),
            inset 0 1.5px 0 rgba(255,255,255,0.42),
            inset 0 -1.5px 0 rgba(0,0,0,0.35),
            inset 0 0 40px rgba(255,255,255,0.035);
          animation: rm-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        .rm-wrap .card::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 110px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        .rm-wrap .card > * { position: relative; }
        .rm-wrap .card.form { padding: 26px 26px 22px; margin-bottom: 22px; }
        .rm-wrap .card.form .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .rm-wrap .card.form .wide { grid-column: 1 / -1; }
        .rm-wrap .card.form .acts { margin-top: 20px; }

        /* ---------- FIELDS: text, number, select, textarea ---------- */
        .rm-wrap .field { display: flex; flex-direction: column; gap: 8px; }
        .rm-wrap .field > span {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.75;
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .rm-wrap .field input:not([type="checkbox"]),
        .rm-wrap .field select,
        .rm-wrap .field textarea,
        .rm-wrap .search input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          border-radius: 14px;
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
        .rm-wrap .field select option { color: initial; }
        .rm-wrap .field input:not([type="checkbox"]):focus,
        .rm-wrap .field select:focus,
        .rm-wrap .field textarea:focus,
        .rm-wrap .search input:focus {
          border-color: #f4c542;
          background-color: rgba(255,255,255,0.07);
          transform: none;
          box-shadow:
            0 0 0 3px rgba(244,197,66,0.18),
            0 0 22px 2px rgba(244,197,66,0.35),
            0 10px 26px -6px rgba(244,197,66,0.55),
            inset 0 2px 6px rgba(0,0,0,0.25);
        }

        /* glossy checkbox (for "Live now") */
        .rm-wrap input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 22px; height: 22px;
          border-radius: 7px;
          cursor: pointer;
          position: relative;
          border: 1px solid rgba(255,255,255,0.28);
          background-color: rgba(255,255,255,0.06);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.14));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.45),
            inset 0 -2px 4px rgba(0,0,0,0.3),
            0 4px 10px -4px rgba(0,0,0,0.5);
          transition: transform .2s ease, filter .2s ease;
          vertical-align: middle;
        }
        .rm-wrap input[type="checkbox"]:hover { transform: translateY(-1px); filter: brightness(1.15); }
        .rm-wrap input[type="checkbox"]:checked::after {
          content: "";
          position: absolute;
          left: 6px; top: 2px;
          width: 6px; height: 12px;
          border: solid currentColor;
          border-width: 0 2.5px 2.5px 0;
          transform: rotate(45deg);
          filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));
        }

        /* ---------- GLOSSY BUTTONS (theme color stays from .btn) ---------- */
        .rm-wrap .btn {
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
        .rm-wrap .btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .rm-wrap .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .rm-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 16px 28px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 16px rgba(255,255,255,0.12);
        }
        .rm-wrap .btn:hover:not(:disabled)::after { left: 150%; }
        .rm-wrap .btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 4px 10px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .rm-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rm-wrap .btn:not(.sm) { padding: 13px 24px; }
        .rm-wrap .btn.sm { border-radius: 10px; }
        .rm-wrap .btn.sm::before { border-radius: 9px 9px 60% 60% / 9px 9px 30% 30%; }

        /* ---------- TABLE ---------- */
        .rm-wrap table { position: relative; border-collapse: separate; border-spacing: 0; width: 100%; }
        .rm-wrap thead th {
          position: relative;
          padding: 16px 14px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.85;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.12));
          border-bottom: 1px solid rgba(255,255,255,0.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.35);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .rm-wrap tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 0 rgba(0,0,0,0.25);
          transition: background-color .25s ease;
        }
        .rm-wrap tbody tr { animation: rm-row .5s cubic-bezier(.2,.8,.2,1) both; }
        .rm-wrap tbody tr:nth-child(1) { animation-delay: .04s; }
        .rm-wrap tbody tr:nth-child(2) { animation-delay: .08s; }
        .rm-wrap tbody tr:nth-child(3) { animation-delay: .12s; }
        .rm-wrap tbody tr:nth-child(4) { animation-delay: .16s; }
        .rm-wrap tbody tr:nth-child(5) { animation-delay: .20s; }
        .rm-wrap tbody tr:nth-child(n+6) { animation-delay: .24s; }
        .rm-wrap tbody tr:nth-child(even) td { background-image: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)); }
        .rm-wrap tbody tr:hover td {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 0 rgba(0,0,0,0.25);
        }
        .rm-wrap tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.14); }
        .rm-wrap tbody tr:last-child td { border-bottom: 0; box-shadow: none; }
        .rm-wrap .pad { padding: 28px 14px; text-align: center; letter-spacing: 0.04em; }

        /* ---------- PILLS / ACTIONS / MESSAGES ---------- */
        .rm-wrap .pill {
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
        .rm-wrap .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .rm-wrap .box {
          position: relative;
          margin-bottom: 16px;
          padding: 13px 16px;
          border-radius: 14px;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5);
          animation: rm-rise .4s ease both;
        }
        .rm-wrap .error.box { background-color: rgba(255,70,70,0.10); border: 1px solid rgba(255,90,90,0.4); animation: rm-shake .4s ease; }
        .rm-wrap .ok.box { border: 1px solid rgba(255,255,255,0.22); }
        .rm-wrap p.muted.small { line-height: 1.6; margin-bottom: 16px; }

        @keyframes rm-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes rm-row { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes rm-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .rm-wrap .head, .rm-wrap .card, .rm-wrap tbody tr, .rm-wrap .box { animation: none; }
        }
          /* ================= GLOSSY DROPDOWNS ================= */

        /* closed select box: custom glossy arrow, no native chrome */
        .rm-wrap .card select,
        .rm-wrap .field select {
          color-scheme: dark;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          padding-right: 46px;
          background-color: rgba(255,255,255,0.05);
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none' stroke='%23ffffff' stroke-opacity='.75' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5l6 6 6-6'/%3E%3C/svg%3E"),
            linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.14));
          background-repeat: no-repeat, no-repeat;
          background-position: right 18px center, 0 0;
          background-size: 14px 9px, 100% 100%;
        }
        .rm-wrap .card select:hover,
        .rm-wrap .field select:hover { filter: brightness(1.12); }

        /* fallback list (browsers without styleable pickers): dark, readable */
        .rm-wrap select option {
          color: CanvasText;
          background-color: Canvas;
          padding: 10px 14px;
        }

        /* ===== full glossy list in browsers that support styleable selects (Chrome/Edge) ===== */
        @supports (appearance: base-select) {
          .rm-wrap .card select,
          .rm-wrap .field select,
          .rm-wrap .card select::picker(select),
          .rm-wrap .field select::picker(select) {
            appearance: base-select;
          }

          /* arrow now comes from ::picker-icon, so drop the background arrow */
          .rm-wrap .card select,
          .rm-wrap .field select {
            background-image: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.14));
            background-size: 100% 100%;
            background-position: 0 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .rm-wrap select::picker-icon {
            content: "";
            width: 9px; height: 9px;
            border: solid currentColor;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg) translateY(-2px);
            opacity: 0.75;
            transition: transform .25s ease;
          }
          .rm-wrap select:open::picker-icon { transform: rotate(225deg) translateY(-2px); }

          /* the dropdown panel */
          .rm-wrap select::picker(select) {
            margin-top: 8px;
            padding: 8px;
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.22);
            background-color: rgba(10,8,16,0.72);
            background-image: linear-gradient(155deg,
              rgba(255,255,255,0.16) 0%,
              rgba(255,255,255,0.04) 35%,
              rgba(255,255,255,0) 60%,
              rgba(255,255,255,0.06) 100%);
            backdrop-filter: blur(22px) saturate(160%);
            -webkit-backdrop-filter: blur(22px) saturate(160%);
            box-shadow:
              0 30px 60px -20px rgba(0,0,0,0.7),
              0 10px 24px rgba(0,0,0,0.4),
              0 0 0 1px rgba(0,0,0,0.3),
              inset 0 1.5px 0 rgba(255,255,255,0.4),
              inset 0 -1.5px 0 rgba(0,0,0,0.35);
            opacity: 0;
            transform: translateY(-8px) scale(.98);
            transition: opacity .2s ease, transform .2s ease, display .2s allow-discrete, overlay .2s allow-discrete;
          }
          .rm-wrap select:open::picker(select) { opacity: 1; transform: none; }
          @starting-style {
            .rm-wrap select:open::picker(select) { opacity: 0; transform: translateY(-8px) scale(.98); }
          }

          /* each option */
          .rm-wrap select option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 11px 14px;
            margin: 2px 0;
            border-radius: 11px;
            border: 1px solid transparent;
            color: inherit;
            background: transparent;
            font-size: 15px;
            cursor: pointer;
            transition: background .2s ease, transform .2s ease, border-color .2s ease;
          }
          .rm-wrap select option::checkmark { order: 1; margin-left: auto; opacity: .85; }
          .rm-wrap select option:hover,
          .rm-wrap select option:focus-visible {
            border-color: rgba(255,255,255,0.22);
            background-image: linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.12));
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px -8px rgba(0,0,0,0.6);
            transform: translateX(2px);
            outline: none;
          }
          .rm-wrap select option:checked {
            border-color: rgba(255,255,255,0.3);
            background-image: linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.06) 49%, rgba(0,0,0,0.16) 51%, rgba(0,0,0,0.04) 100%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.25);
            font-weight: 600;
          }
        }
      `}
      </style>

      <CrudPage
        staff={staff}
        title="Rooms"
        noun="room"
        collectionName="rooms"
        fields={fields}
        columns={columns}
        defaults={{ isLive: true, category: 'popular', theme: 'violet' }}
        sortFn={(a, b) => (b.listeners || 0) - (a.listeners || 0)}
        samples={samples}
        hint="These rooms appear on the Home screen of the app. Real rooms created by users and voice come in the voice-room step."
      />
    </div>
  );
}
