import CrudPage from "./CrudPage.jsx";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8790";

const fields = [
  {
    key: "imageUrl",
    label: "Banner image (optional if you add a title)",
    type: "image",
    wide: true,
  },
  { key: "title", label: "Title", type: "text", wide: true },
  { key: "eyebrow", label: "Small text above title", type: "text", wide: true },
  { key: "subtitle", label: "Subtitle", type: "text", wide: true },
  {
    key: "buttonText",
    label: "Button text (leave empty for no button)",
    type: "text",
  },
  {
    key: "theme",
    label: "Colour",
    type: "select",
    options: ["purple", "gold", "blue", "pink"],
  },
  { key: "order", label: "Order (1 shows first)", type: "number" },
  { key: "active", label: "Active (shown in the app)", type: "checkbox" },
];

const columns = [
  { key: "order", label: "Order" },
  {
    key: "imageUrl",
    label: "Image",
    render: (r) =>
      r.imageUrl ? (
        <img className="thumb" src={`${API_URL}${r.imageUrl}`} alt="" />
      ) : (
        "-"
      ),
  },
  { key: "title", label: "Title", render: (r) => r.title || "-" },
  { key: "theme", label: "Colour" },
  { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
];

const samples = [
  {
    eyebrow: "LIVE VOICE COMMUNITY",
    title: "Your voice, your world.",
    subtitle: "Sing · Chat · Play · Connect",
    buttonText: "Explore Rooms",
    theme: "purple",
    order: 1,
    active: true,
  },
  {
    eyebrow: "NEW",
    title: "Send gifts, win rewards",
    subtitle: "Support your favourite hosts",
    buttonText: "",
    theme: "gold",
    order: 2,
    active: true,
  },
];

export default function Banners({ staff }) {
  return (
    <div className="bn-wrap">
      <style>{`
        /* ---------- HEADER ---------- */
        .bn-wrap .head { animation: bn-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        .bn-wrap .head h1, .bn-wrap h3 { text-shadow: 0 2px 12px rgba(0,0,0,0.35); letter-spacing: 0.01em; }

        /* ---------- GLASS CARDS ---------- */
        .bn-wrap .card {
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
          animation: bn-rise .7s cubic-bezier(.2,.8,.2,1) both;
        }
        .bn-wrap .card::before {
          content: "";
          position: absolute;
          left: -8%; right: -8%; top: 0;
          height: 110px;
          border-radius: 0 0 50% 50% / 0 0 60% 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 85%, rgba(255,255,255,0));
          pointer-events: none;
        }
        .bn-wrap .card > * { position: relative; }
        .bn-wrap .card.form { padding: 26px 26px 22px; margin-bottom: 22px; }

        .bn-wrap .card.form .grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 18px 20px;
          align-items: end;
        }

        /* default field = 3 of 12 columns, so four fit in one row */
        .bn-wrap .card.form .grid > .field { grid-column: span 3; }

        /* image picker = full row */
        .bn-wrap .card.form .grid > .wide { grid-column: 1 / -1; }

        /* Title, Small text, Subtitle = three equal fields in one row */
        .bn-wrap .card.form .grid > :nth-child(n+2):nth-child(-n+4) { grid-column: span 4; }

        /* same label height everywhere */
        .bn-wrap .field > span { min-height: 16px; }

        /* Active checkbox: same height as the input fields */
        .bn-wrap .field.check {
          flex-direction: row;
          align-items: center;
          gap: 12px;
          min-height: 40px;
        }

         /* every input, dropdown and file picker gets the same height, so the rows line up */
        .bn-wrap .field input:not([type="checkbox"]):not([type="file"]),
        .bn-wrap .field select {
          height: 44px;
          box-sizing: border-box;
        }

        /* the dropdown text stays vertically centred inside that height */
        .bn-wrap .field select { padding-top: 0; padding-bottom: 0; align-items: center; }

        /* labels: reserve two lines so a long label (Button text) does not push its field down */
        .bn-wrap .field > span { min-height: 30px; display: flex; align-items: flex-end; }

        @media (max-width: 900px) {
          .bn-wrap .card.form .grid > .field,
          .bn-wrap .card.form .grid > :nth-child(n+2):nth-child(-n+4) { grid-column: span 6; }
          .bn-wrap .card.form .grid > .wide { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .bn-wrap .card.form .grid > .field,
          .bn-wrap .card.form .grid > :nth-child(n+2):nth-child(-n+4) { grid-column: 1 / -1; }
        }

        .bn-wrap .card.form .wide { grid-column: 1 / -1; }
        .bn-wrap .card.form .acts { margin-top: 20px; }

        /* ---------- FIELDS ---------- */
        .bn-wrap .field { display: flex; flex-direction: column; gap: 8px; }
        .bn-wrap .field > span {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.75;
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .bn-wrap .field input:not([type="checkbox"]),
        .bn-wrap .field select,
        .bn-wrap .field textarea,
        .bn-wrap .search input {
          width: 100%;
          box-sizing: border-box;
          padding: 9px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.16);
          background-color: rgba(255,255,255,0.05);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%);
          color: inherit;
          font-size: 14px;
          outline: none;
          box-shadow:
            inset 0 3px 8px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 1px 0 rgba(255,255,255,0.10);
          transition: border-color .25s, background-color .25s, box-shadow .25s, transform .25s;
        }
        .bn-wrap .field input:not([type="checkbox"]):focus,
        .bn-wrap .field select:focus,
        .bn-wrap .field textarea:focus,
        .bn-wrap .search input:focus {
          border-color: #f4c542;
          background-color: rgba(255,255,255,0.07);
          box-shadow:
            0 0 0 3px rgba(244,197,66,0.18),
            0 0 22px 2px rgba(244,197,66,0.35),
            0 10px 26px -6px rgba(244,197,66,0.55),
            inset 0 2px 6px rgba(0,0,0,0.25);
        }
        .bn-wrap .field input[type="file"] { padding: 6px 10px; }

        /* glossy checkbox */
        .bn-wrap input[type="checkbox"] {
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
        .bn-wrap input[type="checkbox"]:hover { transform: translateY(-1px); filter: brightness(1.15); }
        .bn-wrap input[type="checkbox"]:checked::after {
          content: "";
          position: absolute;
          left: 6px; top: 2px;
          width: 6px; height: 12px;
          border: solid currentColor;
          border-width: 0 2.5px 2.5px 0;
          transform: rotate(45deg);
          filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));
        }

        /* ---------- GLOSSY BUTTONS ---------- */
        .bn-wrap .btn {
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
        .bn-wrap .btn::before {
          content: "";
          position: absolute;
          top: 1px; left: 3%; right: 3%;
          height: 46%;
          border-radius: 12px 12px 60% 60% / 12px 12px 30% 30%;
          background: linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .bn-wrap .btn::after {
          content: "";
          position: absolute;
          top: 0; left: -130%;
          width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          transition: left .8s ease;
          pointer-events: none;
        }
        .bn-wrap .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.1) saturate(1.05);
          box-shadow:
            0 16px 28px -10px rgba(0,0,0,0.65),
            0 2px 4px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.25),
            inset 0 0 16px rgba(255,255,255,0.12);
        }
        .bn-wrap .btn:hover:not(:disabled)::after { left: 150%; }
        .bn-wrap .btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 4px 10px -6px rgba(0,0,0,0.6),
            inset 0 3px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .bn-wrap .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .bn-wrap .btn:not(.sm) { padding: 13px 24px; }
        .bn-wrap .btn.sm { border-radius: 10px; }
        .bn-wrap .btn.sm::before { border-radius: 9px 9px 60% 60% / 9px 9px 30% 30%; }

        /* ---------- TABLE ---------- */
        .bn-wrap table { position: relative; border-collapse: separate; border-spacing: 0; width: 100%; }
        .bn-wrap thead th {
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
        .bn-wrap tbody td {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 0 rgba(0,0,0,0.25);
          transition: background-color .25s ease;
        }
        .bn-wrap tbody tr { animation: bn-row .5s cubic-bezier(.2,.8,.2,1) both; }
        .bn-wrap tbody tr:nth-child(1) { animation-delay: .04s; }
        .bn-wrap tbody tr:nth-child(2) { animation-delay: .08s; }
        .bn-wrap tbody tr:nth-child(3) { animation-delay: .12s; }
        .bn-wrap tbody tr:nth-child(4) { animation-delay: .16s; }
        .bn-wrap tbody tr:nth-child(5) { animation-delay: .20s; }
        .bn-wrap tbody tr:nth-child(n+6) { animation-delay: .24s; }
        .bn-wrap tbody tr:nth-child(even) td { background-image: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)); }
        .bn-wrap tbody tr:hover td {
          background-image: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 55%, rgba(0,0,0,0.05));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 0 rgba(0,0,0,0.25);
        }
        .bn-wrap tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.14); }
        .bn-wrap tbody tr:last-child td { border-bottom: 0; box-shadow: none; }
        .bn-wrap .pad { padding: 28px 14px; text-align: center; letter-spacing: 0.04em; }

        /* ---------- PILLS / ACTIONS / MESSAGES ---------- */
        .bn-wrap .pill {
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
        .bn-wrap .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .bn-wrap .box {
          position: relative;
          margin-bottom: 16px;
          padding: 13px 16px;
          border-radius: 14px;
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), transparent);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 24px -12px rgba(0,0,0,0.5);
          animation: bn-rise .4s ease both;
        }
        .bn-wrap .error.box { background-color: rgba(255,70,70,0.10); border: 1px solid rgba(255,90,90,0.4); animation: bn-shake .4s ease; }
        .bn-wrap .ok.box { border: 1px solid rgba(255,255,255,0.22); }
        .bn-wrap p.muted.small { line-height: 1.6; margin-bottom: 16px; }
        .bn-wrap .thumb { width: 120px; height: 56px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(255,255,255,0.18); display: block; }
        .bn-wrap .thumb.big { width: 220px; height: 100px; }

        @keyframes bn-rise { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes bn-row { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes bn-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @media (prefers-reduced-motion: reduce) {
          .bn-wrap .head, .bn-wrap .card, .bn-wrap tbody tr, .bn-wrap .box { animation: none; }
        }

        /* ================= GLOSSY DROPDOWNS ================= */
        .bn-wrap .card select,
        .bn-wrap .field select {
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
        .bn-wrap .card select:hover,
        .bn-wrap .field select:hover { filter: brightness(1.12); }

        .bn-wrap select option {
          color: CanvasText;
          background-color: Canvas;
          padding: 10px 14px;
        }

        @supports (appearance: base-select) {
          .bn-wrap .card select,
          .bn-wrap .field select,
          .bn-wrap .card select::picker(select),
          .bn-wrap .field select::picker(select) {
            appearance: base-select;
          }
          .bn-wrap .card select,
          .bn-wrap .field select {
            background-image: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.14));
            background-size: 100% 100%;
            background-position: 0 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .bn-wrap select::picker-icon {
            content: "";
            width: 9px; height: 9px;
            border: solid currentColor;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg) translateY(-2px);
            opacity: 0.75;
            transition: transform .25s ease;
          }
          .bn-wrap select:open::picker-icon { transform: rotate(225deg) translateY(-2px); }

          .bn-wrap select::picker(select) {
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
          .bn-wrap select:open::picker(select) { opacity: 1; transform: none; }
          @starting-style {
            .bn-wrap select:open::picker(select) { opacity: 0; transform: translateY(-8px) scale(.98); }
          }

          .bn-wrap select option {
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
          .bn-wrap select option::checkmark { order: 1; margin-left: auto; opacity: .85; }
          .bn-wrap select option:hover,
          .bn-wrap select option:focus-visible {
            border-color: rgba(255,255,255,0.22);
            background-image: linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.12));
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px -8px rgba(0,0,0,0.6);
            transform: translateX(2px);
            outline: none;
          }
          .bn-wrap select option:checked {
            border-color: rgba(255,255,255,0.3);
            background-image: linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.06) 49%, rgba(0,0,0,0.16) 51%, rgba(0,0,0,0.04) 100%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.25);
            font-weight: 600;
          }
        }
          /* ================= NUMBER FIELD: NO SPINNER ================= */
        .bn-wrap input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
          padding-right: 16px;
        }
        .bn-wrap input[type="number"]::-webkit-outer-spin-button,
        .bn-wrap input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          appearance: none;
          display: none;
          margin: 0;
        }
                  /* ================= GLOSSY NUMBER SPINNER ================= */

        /* hide the native white spinner box */
        .bn-wrap input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
          padding-right: 52px;
        }
        .bn-wrap input[type="number"]::-webkit-inner-spin-button,
        .bn-wrap input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

                /* ===== FORCE ALIGNMENT OF THE FORM ROWS ===== */
        .bn-wrap .card.form .grid { align-items: start !important; }

        /* every label takes the same space (two lines), so all fields start at the same height */
        .bn-wrap .card.form .field > span {
          min-height: 30px !important;
          display: flex !important;
          align-items: flex-end !important;
        }

        /* every input and the dropdown: same height, no extra margin */
        .bn-wrap .card.form .field input:not([type="checkbox"]):not([type="file"]),
        .bn-wrap .card.form .field select {
          height: 44px !important;
          min-height: 44px !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          transform: none !important;
        }

            /* Active checkbox: sits on the same line as the input fields */
            .bn-wrap .card.form .field.check {
              align-self: start !important;
              min-height: 0 !important;
              padding-top: 38px !important;
            }

            /* Active checkbox row: label centred on the checkbox */
            .bn-wrap .card.form .field.check {
              flex-direction: row !important;
              align-items: center !important;
              gap: 12px !important;
              padding-top: 38px !important;
            }
            .bn-wrap .card.form .field.check > span {
              min-height: 0 !important;
              height: auto !important;
              display: block !important;
              line-height: 1 !important;
              align-self: center !important;
              margin: 0 !important;
            }

      `}</style>

      <CrudPage
        staff={staff}
        title="Banners"
        requireOneOf={["title", "imageUrl"]}
        noun="banner"
        collectionName="banners"
        fields={fields}
        columns={columns}
        defaults={{ active: true, theme: "purple", order: 1 }}
        sortFn={(a, b) => (a.order || 0) - (b.order || 0)}
        samples={samples}
        hint="Banners slide at the top of the Home screen. If you add none, the app shows a default banner."
      />
    </div>
  );
}
