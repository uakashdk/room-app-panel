// Admin panel. Games: who played, how much was bet and won, and the game settings (super admin).
// Sessions are written ONLY by the server (arcade_sessions). This page reads them and cannot change them.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { api } from '../api';

const PERIODS = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All loaded' };
const PRESETS = [100, 500, 1000, 2000, 5000, 10000];
const n = (v) => Number(v || 0);
const fmt = (v) => n(v).toLocaleString('en-IN');
const when = (s) => (s.createdAt?.toDate ? s.createdAt.toDate() : null);
const parseStakes = (s) => String(s).split(/[,\s]+/).filter(Boolean).map(Number).filter((x) => Number.isInteger(x) && x > 0);
const blankGame = () => ({ id: '', name: '', image: '' });

const GLOSS_CSS = `
/* ================= PAGE ================= */
.gm h1 { text-shadow: 0 2px 12px rgba(0,0,0,.6); }
.gm .box {
  border-radius: 16px; padding: 12px 18px; margin-bottom: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
}
.gm .error.box { border-color: rgba(255,90,100,.4); background-color: rgba(255,70,70,.08); }

/* ================= TABS ================= */
.gm-tabs {
  display: inline-flex; gap: 6px; padding: 6px; margin: 10px 0 22px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,.2);
  background: linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.25));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.25);
}
.gm .gm-tab {
  padding: 10px 28px; border-radius: 15px; cursor: pointer; font-size: 15px; font-weight: 700; letter-spacing: .02em;
  color: inherit !important; opacity: .6;
  border: 1px solid transparent !important; background: transparent !important; box-shadow: none !important;
  transition: opacity .2s, filter .2s;
}
.gm .gm-tab:hover { opacity: 1; }
.gm .gm-tab.on {
  opacity: 1; color: #1a1200 !important;
  border: 1px solid rgba(255,232,160,.85) !important;
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%) !important;
  text-shadow: 0 1px 0 rgba(255,255,255,.35);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 4px rgba(120,80,0,.35), 0 6px 16px rgba(0,0,0,.5), 0 0 16px rgba(240,190,70,.25) !important;
}

/* ================= BUTTONS ================= */
.gm .btn:not(.ghost) {
  padding: 14px 28px !important; border-radius: 16px !important; font-weight: 700; cursor: pointer;
  color: #1a1200 !important;
  border: 1px solid rgba(255,232,160,.85) !important;
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%) !important;
  text-shadow: 0 1px 0 rgba(255,255,255,.35);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 4px rgba(120,80,0,.35), 0 8px 20px rgba(0,0,0,.55), 0 0 18px rgba(240,190,70,.25) !important;
  transition: transform .15s, filter .15s;
}
.gm .btn.ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 24px !important; border-radius: 16px !important; font-weight: 700; cursor: pointer;
  border: 1px solid rgba(255,255,255,.3) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.05) 50%, rgba(0,0,0,.25) 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), inset 0 -2px 4px rgba(0,0,0,.4), 0 6px 16px rgba(0,0,0,.5) !important;
  transition: transform .15s, filter .15s;
}
.gm .btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.gm .btn:active:not(:disabled) { transform: translateY(1px); filter: brightness(.96); }
.gm .btn:disabled { opacity: .55; cursor: not-allowed; }
.gm .gm-grid > .btn { justify-self: start; align-self: center; }
.gm .acts { margin-top: 26px; }

/* ================= FILTER BAR ================= */
.gm-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 18px; }

.gm-find {
  display: flex; align-items: center; gap: 8px; width: 290px; max-width: 100%; padding: 5px 5px 5px 6px; border-radius: 18px;
  border: 1px solid rgba(255,255,255,.22);
  background-image: radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85);
  transition: border-color .25s, box-shadow .25s;
}
.gm-find:hover { border-color: rgba(255,255,255,.4); }
.gm-find:focus-within { border-color: rgba(240,190,70,.9); box-shadow: inset 0 3px 10px rgba(0,0,0,.4), 0 0 0 4px rgba(240,190,70,.14), 0 14px 28px -10px rgba(240,190,70,.35); }
.gm-ic {
  flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 12px; color: #f2c445;
  border: 1px solid rgba(255,255,255,.28);
  background-image: linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,.06) 50%, rgba(0,0,0,.25));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), inset 0 -2px 4px rgba(0,0,0,.35);
  transition: color .25s, background .25s, border-color .25s;
}
.gm-find:focus-within .gm-ic {
  color: #1a1200; border-color: rgba(255,232,160,.85);
  background-image: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%);
}
.gm-find input {
  flex: 1; min-width: 0; height: auto; font-size: 15px; font-weight: 600; letter-spacing: .04em; color: inherit;
  padding: 8px 4px !important; border: 0 !important; border-radius: 0 !important; outline: none;
  background: transparent !important; box-shadow: none !important;
}
.gm-find input::placeholder { color: inherit; opacity: .4; font-weight: 500; letter-spacing: .02em; }
.gm .gm-find .btn { padding: 10px 20px !important; border-radius: 13px !important; font-size: 14px; }

/* ---- custom dropdown ---- */
.gm-dd { position: relative; }
.gm .gm-dd-btn {
  display: inline-flex; align-items: center; gap: 10px; padding: 6px 14px 6px 6px; border-radius: 18px; cursor: pointer;
  font-size: 14px; font-weight: 600; letter-spacing: .02em; color: inherit !important; white-space: nowrap;
  border: 1px solid rgba(255,255,255,.24) !important;
  background-color: rgba(255,255,255,.03) !important;
  background-image: radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2)) !important;
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85) !important;
  transition: border-color .25s, box-shadow .25s, transform .2s;
}
.gm .gm-dd-btn:hover { border-color: rgba(255,255,255,.42) !important; transform: translateY(-1px); }
.gm .gm-dd.open .gm-dd-btn {
  border-color: rgba(240,190,70,.9) !important;
  box-shadow: inset 0 3px 10px rgba(0,0,0,.4), 0 0 0 4px rgba(240,190,70,.14), 0 14px 28px -10px rgba(240,190,70,.35) !important;
}
.gm .gm-dd.open .gm-dd-btn .gm-ic {
  color: #1a1200; border-color: rgba(255,232,160,.85);
  background-image: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%);
}
.gm-dd-btn .chev { opacity: .7; transition: transform .2s; }
.gm-dd.open .chev { transform: rotate(180deg); opacity: 1; color: #f2c445; }
.gm-dd-list {
  position: absolute; z-index: 60; top: calc(100% + 8px); left: 0; min-width: 100%; width: max-content; max-height: 300px; overflow-y: auto;
  margin: 0; padding: 6px; list-style: none; color: #fff; border-radius: 18px;
  border: 1px solid rgba(255,255,255,.22);
  background-color: #1a1028;
  background-image: radial-gradient(130% 30% at 50% -4%, rgba(255,255,255,.2), rgba(255,255,255,.04) 55%, transparent 75%), linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 40%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.38), inset 0 -1px 0 rgba(0,0,0,.5), 0 18px 40px rgba(0,0,0,.65);
  animation: gmIn .16s ease-out;
}
@keyframes gmIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.gm-dd-list li {
  position: relative; padding: 10px 40px 10px 14px; border-radius: 12px; cursor: pointer; white-space: nowrap;
  font-size: 14px; font-weight: 600; letter-spacing: .02em; border: 1px solid transparent;
}
.gm-dd-list li + li { margin-top: 2px; }
.gm-dd-list li:hover {
  border-color: rgba(255,255,255,.2);
  background-image: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.05) 55%, rgba(0,0,0,.08));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.32);
}
.gm-dd-list li.on {
  color: #1a1200; border-color: rgba(255,232,160,.85); font-weight: 800;
  background-image: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 4px 12px -4px rgba(0,0,0,.7);
}
.gm-dd-list li.on::after {
  content: ''; position: absolute; right: 12px; top: 50%; width: 16px; height: 16px; transform: translateY(-50%);
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231a1200' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5 9-10'/%3E%3C/svg%3E") center / contain no-repeat;
}

/* ================= STAT CARDS ================= */
.gm-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin: 4px 0 20px; }
.gm-stat {
  position: relative; overflow: hidden; padding: 18px 20px; border-radius: 22px;
  border: 1px solid rgba(255,255,255,.24);
  background: linear-gradient(160deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.04) 30%, rgba(20,12,30,.88) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.5), 0 16px 34px -14px rgba(0,0,0,.75);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
}
.gm-stat::before {
  content: ''; position: absolute; top: -80%; left: -20%; width: 140%; height: 120%;
  background: radial-gradient(ellipse at 35% 100%, rgba(255,255,255,.13), rgba(255,255,255,.03) 55%, transparent 70%);
  border-radius: 0 0 50% 50%; pointer-events: none;
}
.gm-stat > * { position: relative; }
.gm-stat .l { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; opacity: .65; }
.gm-stat .v { font-size: 27px; font-weight: 800; margin-top: 8px; text-shadow: 0 2px 10px rgba(0,0,0,.5); }
.gm-stat .h { font-size: 12.5px; opacity: .55; margin-top: 4px; line-height: 1.4; }

/* ================= TABLES ================= */
.gm-tw {
  position: relative; overflow-x: auto; margin-bottom: 20px; border-radius: 22px;
  border: 1px solid rgba(255,255,255,.18);
  background-image: linear-gradient(155deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.04) 30%, rgba(255,255,255,0) 55%, rgba(255,255,255,.06) 100%);
  box-shadow: 0 30px 60px -28px rgba(0,0,0,.65), inset 0 1.5px 0 rgba(255,255,255,.42), inset 0 -1.5px 0 rgba(0,0,0,.35);
}
.gm-tw table { border-collapse: separate; border-spacing: 0; width: 100%; }
.gm-tw thead th {
  padding: 16px 14px; font-size: 11.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; opacity: .9; white-space: nowrap; text-align: left;
  background-image: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02) 60%, rgba(0,0,0,.12));
  border-bottom: 1px solid rgba(255,255,255,.14);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 1px 0 rgba(0,0,0,.35);
}
.gm-tw tbody td { padding: 14px; border-bottom: 1px solid rgba(255,255,255,.06); box-shadow: 0 1px 0 rgba(0,0,0,.25); transition: background-color .25s; }
.gm-tw tbody tr:nth-child(even) td { background-image: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.01)); }
.gm-tw tbody tr:hover td { background-image: linear-gradient(180deg, rgba(255,255,255,.13), rgba(255,255,255,.03) 55%, rgba(0,0,0,.05)); }
.gm-tw tbody tr:last-child td { border-bottom: 0; box-shadow: none; }
.gm-tw .pad { padding: 28px 14px; text-align: center; letter-spacing: .04em; }
.gm .pill {
  position: relative; display: inline-block; padding: 5px 13px; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: .04em;
  border: 1px solid rgba(255,255,255,.22);
  background-image: linear-gradient(180deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.06) 50%, rgba(0,0,0,.14) 51%, rgba(0,0,0,.02) 100%);
  text-shadow: 0 1px 1px rgba(0,0,0,.3);
  box-shadow: 0 4px 10px -4px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 2px rgba(0,0,0,.25);
}

/* ================= SETTINGS CARD ================= */
.gm-card {
  position: relative; overflow: hidden; padding: 32px; margin-bottom: 24px; border-radius: 28px;
  background: linear-gradient(160deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.05) 28%, rgba(20,12,30,.88) 100%);
  border: 1px solid rgba(255,255,255,.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.38), inset 0 -1px 0 rgba(0,0,0,.55), 0 20px 50px rgba(0,0,0,.6);
  -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
}
.gm-card::before {
  content: ''; position: absolute; top: -70%; left: -25%; width: 150%; height: 110%;
  background: radial-gradient(ellipse at 35% 100%, rgba(255,255,255,.13), rgba(255,255,255,.03) 55%, transparent 70%);
  border-radius: 0 0 50% 50%; pointer-events: none;
}
.gm-card > * { position: relative; z-index: 1; }
.gm-card h3 { font-size: 18px; letter-spacing: .02em; margin: 22px 0 10px; }
.gm-card h3:first-child { margin-top: 0; }
.gm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px 28px; margin-top: 18px; }

/* ================= FANCY FIELDS ================= */
.gm .fxf { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.gm .fxf-label { font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; opacity: .7; }
.gm .fxf-hint { font-size: 13px; opacity: .55; line-height: 1.5; }
.gm .fxf.off { opacity: .55; pointer-events: none; }

.gm .fx-fl {
  position: relative; border-radius: 16px; border: 1px solid rgba(255,255,255,.22); background-color: rgba(255,255,255,.03);
  background-image: radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85);
  transition: border-color .25s, box-shadow .25s, transform .25s;
}
.gm .fx-fl:hover { border-color: rgba(255,255,255,.4); }
.gm .fx-fl input {
  width: 100%; box-sizing: border-box; height: auto; padding: 26px 18px 9px !important;
  font-size: 16px; font-weight: 500; letter-spacing: .02em; color: inherit;
  border: 0 !important; border-radius: 0 !important; outline: none; background: transparent !important; box-shadow: none !important;
}
.gm .fx-fl label { position: absolute; left: 18px; top: 19px; font-size: 15px; opacity: .5; pointer-events: none; transition: top .2s, font-size .2s, opacity .2s, color .2s, letter-spacing .2s; }
.gm .fx-fl input:focus + label,
.gm .fx-fl input:not(:placeholder-shown) + label { top: 8px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; opacity: 1; color: #f2c445; }
.gm .fx-fl:focus-within {
  transform: translateY(-2px); border-color: rgba(240,190,70,.9);
  box-shadow: inset 0 3px 10px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.35), 0 0 0 4px rgba(240,190,70,.14), 0 16px 30px -10px rgba(240,190,70,.35);
}
.gm .fx-fl::after { content: ''; position: absolute; left: 18px; right: 18px; bottom: -1px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, #f2c445, transparent); transform: scaleX(0); transition: transform .4s ease; pointer-events: none; }
.gm .fx-fl:focus-within::after { transform: scaleX(1); }

.gm .fx-st {
  display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 20px; border: 1px solid rgba(255,255,255,.22);
  background-image: radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85);
  transition: border-color .25s, box-shadow .25s;
}
.gm .fx-st:focus-within { border-color: rgba(240,190,70,.9); box-shadow: inset 0 3px 10px rgba(0,0,0,.4), 0 0 0 4px rgba(240,190,70,.14), 0 16px 30px -10px rgba(240,190,70,.35); }
.gm .fx-st button {
  flex: none; width: 46px; height: 46px; padding: 0; border-radius: 14px; cursor: pointer; font-size: 24px; font-weight: 500; line-height: 1; color: #1a1200 !important;
  border: 1px solid rgba(255,232,160,.85) !important;
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 4px rgba(120,80,0,.35), 0 6px 14px -6px rgba(0,0,0,.8) !important;
  transition: transform .15s, filter .15s;
}
.gm .fx-st button:hover { filter: brightness(1.1); transform: translateY(-1px); }
.gm .fx-st button:active { transform: translateY(1px); }
.gm .fx-st input {
  flex: 1; min-width: 0; height: auto; text-align: center; font-size: 22px; font-weight: 600; letter-spacing: .04em; color: inherit;
  padding: 8px 4px !important; border: 0 !important; outline: none; background: transparent !important; box-shadow: none !important; -moz-appearance: textfield;
}
.gm .fx-st input::-webkit-outer-spin-button, .gm .fx-st input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.gm .fx-st small { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; opacity: .55; margin-right: 4px; }

.gm .fx-pk { display: flex; flex-wrap: wrap; gap: 8px; }
.gm .fx-pk button {
  padding: 8px 17px; border-radius: 999px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: .02em; color: inherit !important;
  border: 1px solid rgba(255,255,255,.25) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.03)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3) !important; opacity: .8;
  transition: opacity .2s, box-shadow .2s, border-color .2s, transform .15s;
}
.gm .fx-pk button:hover { opacity: 1; border-color: rgba(240,190,70,.6) !important; }
.gm .fx-pk button.on {
  opacity: 1; color: #1a1200 !important; font-weight: 700;
  border: 1px solid rgba(255,232,160,.85) !important;
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 3px rgba(120,80,0,.35), 0 0 14px rgba(242,196,69,.4), 0 4px 10px -4px rgba(0,0,0,.7) !important;
}
.gm .fx-pk button:active { transform: translateY(1px); }
.gm .fx-add {
  display: flex; align-items: center; gap: 8px; max-width: 320px; padding: 5px 5px 5px 16px; border-radius: 999px;
  border: 1px dashed rgba(255,255,255,.3); background: rgba(255,255,255,.04); transition: border-color .25s, box-shadow .25s;
}
.gm .fx-add:focus-within { border-color: rgba(240,190,70,.9); border-style: solid; box-shadow: 0 0 0 4px rgba(240,190,70,.14); }
.gm .fx-add input {
  flex: 1; min-width: 0; height: auto; min-height: 0; line-height: 1.2; font-size: 14px; color: inherit; padding: 8px 0 !important;
  border: 0 !important; outline: none; background: transparent !important; box-shadow: none !important; -moz-appearance: textfield;
}
.gm .fx-add input::-webkit-outer-spin-button, .gm .fx-add input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.gm .fx-add input::placeholder, .gm .fx-pf input::placeholder { color: inherit; opacity: .35; }
.gm .fx-add button {
  flex: none; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; color: inherit !important;
  border: 1px solid rgba(255,255,255,.3) !important;
  background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.04)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4) !important;
}
.gm .fx-add button:hover { filter: brightness(1.2); }

.gm .fx-sl { display: flex; align-items: center; gap: 16px; }
.gm .fx-sl input[type=range] {
  -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 12px; padding: 0 !important; margin: 0; border-radius: 99px; outline: none; cursor: pointer;
  border: 1px solid rgba(255,255,255,.2) !important; box-shadow: inset 0 2px 6px rgba(0,0,0,.65) !important;
  background: linear-gradient(90deg, #c9962b, #f2c445 var(--p, 20%), rgba(255,255,255,.08) var(--p, 20%)) !important;
}
.gm .fx-sl input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; cursor: grab; border: 1px solid #ffe8a0;
  background: radial-gradient(circle at 35% 30%, #fff3c2, #f2c445 55%, #c9962b); box-shadow: 0 0 16px rgba(242,196,69,.65), 0 4px 8px rgba(0,0,0,.8);
}
.gm .fx-sl input[type=range]::-moz-range-thumb { width: 28px; height: 28px; border-radius: 50%; cursor: grab; border: 1px solid #ffe8a0; background: #f2c445; box-shadow: 0 0 16px rgba(242,196,69,.65); }
.gm .fx-sl output {
  flex: none; min-width: 70px; text-align: center; padding: 9px 14px; border-radius: 14px; font-weight: 800; color: #1a1200;
  border: 1px solid rgba(255,232,160,.85);
  background: linear-gradient(180deg, #ffe38f 0%, #f2c445 48%, #c9962b 52%, #e6b83e 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 6px 14px -6px rgba(0,0,0,.8);
}

.gm .fx-pf {
  display: flex; align-items: stretch; overflow: hidden; border-radius: 16px; border: 1px solid rgba(255,255,255,.22);
  background-image: radial-gradient(120% 100% at 50% -40%, rgba(255,255,255,.2), rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.2));
  box-shadow: inset 0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.28), 0 12px 24px -14px rgba(0,0,0,.85);
  transition: border-color .25s, box-shadow .25s, transform .25s;
}
.gm .fx-pf:hover { border-color: rgba(255,255,255,.4); }
.gm .fx-pf:focus-within { transform: translateY(-2px); border-color: rgba(240,190,70,.9); box-shadow: 0 0 0 4px rgba(240,190,70,.14), 0 16px 30px -10px rgba(240,190,70,.35); }
.gm .fx-pf em { display: flex; align-items: center; padding: 0 14px; font-style: normal; font-size: 13px; font-weight: 700; color: #f2c445; border-right: 1px solid rgba(255,255,255,.18); background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.03)); }
.gm .fx-pf input {
  flex: 1; min-width: 0; height: auto; font-size: 15px; font-weight: 500; color: inherit; padding: 18px 14px !important;
  border: 0 !important; border-radius: 0 !important; outline: none; background: transparent !important; box-shadow: none !important;
}
.gm .fx-pf svg { align-self: center; margin-right: 14px; color: #f2c445; flex: none; }

.gm .fx-sw { display: inline-flex; align-items: center; gap: 16px; padding: 0; cursor: pointer; color: inherit !important; border: 0 !important; background: transparent !important; box-shadow: none !important; text-align: left; }
.gm .fx-sw:disabled { opacity: .55; cursor: not-allowed; }
.gm .fx-sw i {
  position: relative; flex: none; width: 68px; height: 36px; border-radius: 99px; border: 1px solid rgba(255,255,255,.25);
  background: linear-gradient(180deg, rgba(0,0,0,.45), rgba(255,255,255,.06)); box-shadow: inset 0 3px 8px rgba(0,0,0,.65);
  transition: background .3s, box-shadow .3s, border-color .3s;
}
.gm .fx-sw i::after { content: ''; position: absolute; top: 3px; left: 3px; width: 28px; height: 28px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, #b9b9c4 70%); box-shadow: 0 3px 8px rgba(0,0,0,.8); transition: left .3s; }
.gm .fx-sw.on i { border-color: #ffe8a0; background: linear-gradient(180deg, #c9962b, #f2c445); box-shadow: inset 0 2px 6px rgba(120,80,0,.5), 0 0 20px rgba(242,196,69,.45); }
.gm .fx-sw.on i::after { left: 35px; }
.gm .fx-sw b { font-size: 16px; font-weight: 600; }
.gm .fx-sw span { font-size: 13px; opacity: .6; font-weight: 400; display: block; }

.gm-pre { margin: 0; padding: 16px; border-radius: 16px; white-space: pre-wrap; border: 1px solid rgba(255,255,255,.14); background: rgba(0,0,0,.35); box-shadow: inset 0 3px 10px rgba(0,0,0,.5); }
`;

const IC = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>,
  pad: <><rect x="2" y="7" width="20" height="11" rx="5" /><path d="M7 10.5v4M5 12.5h4" /><circle cx="16" cy="11.5" r=".7" /><circle cx="18.5" cy="13.5" r=".7" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  down: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  chev: <path d="M6 9l6 6 6-6" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>,
};

function Ico({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {IC[name]}
    </svg>
  );
}

// Glossy dropdown (replaces the plain <select>)
function Select({ icon, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const key = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', key); };
  }, [open]);
  const cur = options.find((o) => o.value === value);
  return (
    <div className={`gm-dd ${open ? 'open' : ''}`} ref={ref}>
      <button type="button" className="gm-dd-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="gm-ic"><Ico name={icon} size={17} /></span>
        <span>{cur ? cur.label : String(value)}</span>
        <span className="chev"><Ico name="chev" size={16} /></span>
      </button>
      {open && (
        <ul className="gm-dd-list" role="listbox">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone, hint }) {
  return (
    <div className="gm-stat">
      <div className="l">{label}</div>
      <div className="v" style={tone ? { color: tone } : undefined}>{value}</div>
      {hint && <div className="h">{hint}</div>}
    </div>
  );
}

function FloatInput({ id, label, ...props }) {
  return (
    <div className="fx-fl">
      <input id={id} placeholder=" " {...props} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function UrlInput({ value, onChange, disabled }) {
  const shown = String(value || '').replace(/^https?:\/\//i, '');
  return (
    <div className="fx-pf">
      <em>https://</em>
      <input
        placeholder="cdn.example.com/ludo.png"
        value={shown}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.trim().replace(/^https?:\/\//i, '');
          onChange(v ? `https://${v}` : '');
        }}
      />
      <Ico name="image" size={20} />
    </div>
  );
}

export default function Games({ role }) {
  const canEdit = role === 'super_admin';
  const [tab, setTab] = useState('report');
  return (
    <div className="gm">
      <style>{GLOSS_CSS}</style>
      <div className="head"><h1>Games</h1></div>
      <div className="gm-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'report'} className={`gm-tab ${tab === 'report' ? 'on' : ''}`} onClick={() => setTab('report')}>Report</button>
        <button type="button" role="tab" aria-selected={tab === 'settings'} className={`gm-tab ${tab === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}>Settings</button>
      </div>
      {tab === 'report' ? <Report /> : <Settings canEdit={canEdit} />}
    </div>
  );
}

// ------------------------------------------------------------------ report
function Report() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(200);
  const [period, setPeriod] = useState('7d');
  const [status, setStatus] = useState('all');
  const [game, setGame] = useState('all');
  const [userIdText, setUserIdText] = useState('');
  const [uidFilter, setUidFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'arcade_sessions'), orderBy('createdAt', 'desc'), limit(count)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [count]);
  useEffect(() => { load(); }, [load]);

  const findUser = async (e) => {
    e.preventDefault();
    setError('');
    const t = userIdText.trim();
    if (!t) return setUidFilter(null);
    if (!/^[0-9]{6}$/.test(t)) return setError('User ID is 6 digits.');
    try {
      const s = await getDoc(doc(db, 'userIds', t));
      if (!s.exists()) { setUidFilter('none'); return setError(`No user has the ID ${t}.`); }
      setUidFilter(s.data().uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const games = useMemo(() => [...new Set(rows.map((r) => r.gameId).filter(Boolean))], [rows]);
  const shown = useMemo(() => {
    const since = { today: new Date().setHours(0, 0, 0, 0), '7d': Date.now() - 7 * 864e5, '30d': Date.now() - 30 * 864e5, all: 0 }[period];
    return rows.filter((r) => {
      const t = when(r)?.getTime() ?? 0;
      return t >= since && (status === 'all' || r.status === status || (status === 'suspicious' && r.suspicious)) && (game === 'all' || r.gameId === game) && (!uidFilter || r.uid === uidFilter);
    });
  }, [rows, period, status, game, uidFilter]);

  // numbers: "bet" and "win" are what the players did inside the games; GGR = bet - win (what the house kept)
  const sum = useMemo(() => {
    const done = shown.filter((r) => r.status === 'settled');
    const bet = shown.reduce((a, r) => a + n(r.totalBet), 0);
    const win = shown.reduce((a, r) => a + n(r.totalWin), 0);
    const stake = shown.reduce((a, r) => a + n(r.stake), 0);
    const paid = done.reduce((a, r) => a + n(r.payout), 0);
    const stakeDone = done.reduce((a, r) => a + n(r.stake), 0);
    return { sessions: shown.length, players: new Set(shown.map((r) => r.uid)).size, stake, bet, win, ggr: bet - win, netCoins: stakeDone - paid, sus: shown.filter((r) => r.suspicious).length, open: shown.filter((r) => r.status === 'active').length };
  }, [shown]);

  const byGame = useMemo(() => {
    const m = new Map();
    for (const r of shown) {
      const g = m.get(r.gameId) ?? { gameId: r.gameId, sessions: 0, bet: 0, win: 0 };
      g.sessions += 1; g.bet += n(r.totalBet); g.win += n(r.totalWin);
      m.set(r.gameId, g);
    }
    return [...m.values()].sort((a, b) => b.bet - a.bet);
  }, [shown]);

  const exportCsv = () => {
    const head = ['time', 'user', 'userId', 'uid', 'game', 'room', 'stake', 'rounds', 'bet', 'win', 'payout', 'net', 'status', 'suspicious', 'session'];
    const lines = shown.map((r) => [when(r)?.toISOString() ?? '', JSON.stringify(r.name ?? ''), r.userId, r.uid, r.gameId, r.roomId ?? '', n(r.stake), n(r.rounds), n(r.totalBet), n(r.totalWin), r.status === 'settled' ? n(r.payout) : '', r.status === 'settled' ? n(r.payout) - n(r.stake) : '', r.status, r.suspicious ? 'yes' : '', r.id].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
    a.download = `games-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const periodOpts = Object.entries(PERIODS).map(([value, label]) => ({ value, label }));
  const statusOpts = ['all', 'active', 'settled', 'failed', 'suspicious'].map((value) => ({ value, label: value === 'all' ? 'All statuses' : value[0].toUpperCase() + value.slice(1) }));
  const gameOpts = [{ value: 'all', label: 'All games' }, ...games.map((g) => ({ value: g, label: g }))];
  const countOpts = [200, 500, 1000].map((c) => ({ value: c, label: `Latest ${c}` }));

  return (
    <>
      <div className="gm-bar">
        <form className="gm-find" onSubmit={findUser}>
          <span className="gm-ic"><Ico name="search" size={18} /></span>
          <input placeholder="User ID (6 digits)" inputMode="numeric" maxLength={6} value={userIdText} onChange={(e) => setUserIdText(e.target.value)} />
          <button className="btn" type="submit">Find</button>
        </form>
        <Select icon="calendar" value={period} options={periodOpts} onChange={setPeriod} />
        <Select icon="flag" value={status} options={statusOpts} onChange={setStatus} />
        <Select icon="pad" value={game} options={gameOpts} onChange={setGame} />
        <Select icon="list" value={count} options={countOpts} onChange={setCount} />
        <button className="btn ghost" type="button" onClick={exportCsv} disabled={!shown.length}><Ico name="down" size={17} />Export CSV</button>
      </div>
      {error && (
        <div className="error box">
          {error}
          {/permission/i.test(error) && <div className="small" style={{ opacity: .75, marginTop: 6 }}>Staff are not allowed to read this data yet. That needs a change in firestore.rules, not on this page.</div>}
        </div>
      )}

      <div className="gm-stats">
        <Stat label="Game sessions" value={fmt(sum.sessions)} hint={`${fmt(sum.players)} players · ${fmt(sum.open)} open now`} />
        <Stat label="Total bet" value={`🪙 ${fmt(sum.bet)}`} />
        <Stat label="Total win" value={`🪙 ${fmt(sum.win)}`} />
        <Stat label="GGR (bet − win)" value={`${sum.ggr >= 0 ? '+' : ''}${fmt(sum.ggr)}`} tone={sum.ggr >= 0 ? 'var(--ok)' : 'var(--danger)'} hint="what the games kept from the players" />
        <Stat label="Coins out of wallets" value={`🪙 ${fmt(sum.netCoins)}`} hint="stake − payout, closed games" tone={sum.netCoins >= 0 ? undefined : 'var(--danger)'} />
        <Stat label="Suspicious" value={fmt(sum.sus)} tone={sum.sus ? 'var(--danger)' : undefined} hint="bet or balance did not add up" />
      </div>

      <div className="gm-tw">
        <table>
          <thead><tr><th>Game</th><th>Sessions</th><th>Bet</th><th>Win</th><th>GGR</th></tr></thead>
          <tbody>
            {byGame.length === 0 && <tr><td colSpan={5} className="muted pad">No data.</td></tr>}
            {byGame.map((g) => (
              <tr key={g.gameId}><td><b>{g.gameId}</b></td><td>{fmt(g.sessions)}</td><td>{fmt(g.bet)}</td><td>{fmt(g.win)}</td>
                <td style={{ color: g.bet - g.win >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>{g.bet - g.win >= 0 ? '+' : ''}{fmt(g.bet - g.win)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gm-tw">
        <table>
          <thead><tr><th>Time</th><th>Player</th><th>Game</th><th>Room</th><th>Stake</th><th>Rounds</th><th>Bet</th><th>Win</th><th>Returned</th><th>Player result</th><th>Status</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="muted pad">Loading...</td></tr>}
            {!loading && shown.length === 0 && <tr><td colSpan={11} className="muted pad">No game sessions.</td></tr>}
            {!loading && shown.map((r) => {
              const net = r.status === 'settled' ? n(r.payout) - n(r.stake) : null;
              return (
                <tr key={r.id}>
                  <td>{when(r)?.toLocaleString() ?? '-'}</td>
                  <td><div>{r.name || '-'}</div><div className="muted small mono">ID {r.userId || String(r.uid || '').slice(0, 8)}</div></td>
                  <td><span className="pill plain">{r.gameId}</span></td>
                  <td className="mono small">{r.roomId ? `${String(r.roomId).slice(0, 8)}…` : '-'}</td>
                  <td>{fmt(r.stake)}</td>
                  <td>{fmt(r.rounds)}</td>
                  <td>{fmt(r.totalBet)}</td>
                  <td>{fmt(r.totalWin)}</td>
                  <td>{r.status === 'settled' ? fmt(r.payout) : '-'}</td>
                  <td style={{ color: net === null ? undefined : net >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>{net === null ? '-' : `${net >= 0 ? '+' : ''}${fmt(net)}`}</td>
                  <td>
                    <span className={`pill ${r.status === 'settled' ? 'active' : r.status === 'failed' ? 'banned' : 'suspended'}`}>{r.status}</span>
                    {r.suspicious && <span className="pill banned" style={{ marginLeft: 6 }}>suspicious</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ settings
function Settings({ canEdit }) {
  const [form, setForm] = useState({ enabled: false, stakes: '100, 500, 1000, 5000', maxStake: '5000', maxPayoutMultiplier: '20', games: [blankGame()] });
  const [custom, setCustom] = useState('');
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'app_settings', 'arcade'));
      const d = snap.exists() ? snap.data() : {};
      const seen = new Set();
      const list = (Array.isArray(d.games) ? d.games : [])
        .filter((g) => {
          const k = String(g.id || '').trim().toLowerCase();
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map((g) => ({ id: g.id, name: g.name || '', image: g.image || '' }));
      setForm({
        enabled: d.enabled === true,
        stakes: (Array.isArray(d.stakes) ? d.stakes : [100, 500, 1000, 5000]).join(', '),
        maxStake: String(d.maxStake ?? 5000),
        maxPayoutMultiplier: String(d.maxPayoutMultiplier ?? 20),
        games: list.length ? list : [blankGame()],
      });
      if (canEdit) api('/admin/arcade/overview').then((r) => setAccount(r.account)).catch((e) => setAccount({ error: e.message }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [canEdit]);
  useEffect(() => { load(); }, [load]);

  const setGame = (i, patch) => setForm((f) => ({ ...f, games: f.games.map((g, k) => (k === i ? { ...g, ...patch } : g)) }));
  const addGame = () => setForm((f) => {
    const last = f.games[f.games.length - 1];
    if (last && !last.id.trim() && !last.name.trim() && !last.image.trim()) return f;
    return { ...f, games: [...f.games, blankGame()] };
  });
  const delGame = (i) => setForm((f) => {
    const left = f.games.filter((_, k) => k !== i);
    return { ...f, games: left.length ? left : [blankGame()] };
  });

  const selected = parseStakes(form.stakes);
  const options = [...new Set([...PRESETS, ...selected])].sort((a, b) => a - b);
  const writeStakes = (arr) => setForm((f) => ({ ...f, stakes: [...new Set(arr)].sort((a, b) => a - b).join(', ') }));
  const toggleStake = (v) => writeStakes(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const addCustom = () => {
    const v = Number(custom);
    if (Number.isInteger(v) && v > 0) writeStakes([...selected, v]);
    setCustom('');
  };
  const step = (field, delta) => setForm((f) => ({ ...f, [field]: String(Math.max(1, (Number(f[field]) || 0) + delta)) }));
  const mult = Math.max(1, Number(form.maxPayoutMultiplier) || 1);
  const multMax = Math.max(100, Math.ceil(mult));
  const off = !canEdit || loading;

  const save = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    const stakes = parseStakes(form.stakes);
    if (!stakes.length) return setError('Pick at least one amount.');
    const maxStake = Number(form.maxStake);
    const multiplier = Number(form.maxPayoutMultiplier);
    if (!Number.isInteger(maxStake) || maxStake < 1) return setError('Maximum amount: a whole number.');
    if (!(multiplier >= 1)) return setError('Maximum payout multiplier must be 1 or more.');
    const rows = form.games
      .map((g) => ({ id: g.id.trim(), name: g.name.trim(), image: g.image.trim() }))
      .filter((g) => g.id || g.name || g.image);
    if (rows.some((g) => !/^[A-Za-z0-9_-]{1,40}$/.test(g.id))) return setError('Every game needs an id (letters, numbers, - _).');
    if (new Set(rows.map((g) => g.id.toLowerCase())).size !== rows.length) return setError('Each game id must be different.');
    const games = rows.length ? rows.map((g) => ({ id: g.id, name: g.name || g.id, ...(g.image ? { image: g.image } : {}) })) : null;
    if (form.enabled && !window.confirm('Games will be OPEN for every player and coins can be lost. Are you sure?')) return;
    setSaving(true);
    try {
      await api('/admin/arcade/settings', 'PUT', { enabled: form.enabled, stakes, maxStake, maxPayoutMultiplier: multiplier, games });
      setOk('Saved. The app uses the new settings within a minute.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className="muted small">{canEdit ? 'Only a Super admin can change these. Every change is written to the audit log.' : 'You can only view this page. A Super admin can change the settings.'}</p>
      {error && <div className="error box">{error}</div>}
      {ok && <div className="ok box">{ok}</div>}

      <form className="gm-card" onSubmit={save}>
        <button
          type="button"
          className={`fx-sw ${form.enabled ? 'on' : ''}`}
          role="switch"
          aria-checked={form.enabled}
          disabled={off}
          onClick={() => setForm({ ...form, enabled: !form.enabled })}
        >
          <i />
          <b>{form.enabled ? 'Games are open' : 'Games are closed'}<span>Off = players see &quot;Games are not open right now&quot;.</span></b>
        </button>

        <div className="gm-grid">
          <div className={`fxf ${off ? 'off' : ''}`}>
            <span className="fxf-label">Amounts a player can choose (coins)</span>
            <div className="fx-pk">
              {options.map((v) => (
                <button type="button" key={v} className={selected.includes(v) ? 'on' : ''} aria-pressed={selected.includes(v)} onClick={() => toggleStake(v)}>
                  {fmt(v)}
                </button>
              ))}
            </div>
            <div className="fx-add">
              <input
                type="number" min="1" placeholder="Other amount" value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              />
              <button type="button" onClick={addCustom}>+ Add</button>
            </div>
            <span className="fxf-hint">{selected.length} selected. Tap an amount to turn it on or off.</span>
          </div>

          <div className={`fxf ${off ? 'off' : ''}`}>
            <span className="fxf-label">Maximum amount (coins)</span>
            <div className="fx-st">
              <button type="button" aria-label="Decrease" onClick={() => step('maxStake', -500)}>−</button>
              <input type="number" min="1" value={form.maxStake} onChange={(e) => setForm({ ...form, maxStake: e.target.value })} />
              <small>coins</small>
              <button type="button" aria-label="Increase" onClick={() => step('maxStake', 500)}>+</button>
            </div>
            <span className="fxf-hint">Amounts above this are never offered.</span>
          </div>

          <div className={`fxf ${off ? 'off' : ''}`}>
            <span className="fxf-label">Maximum payout multiplier (×)</span>
            <div className="fx-sl">
              <input
                type="range" min="1" max={multMax} value={mult}
                style={{ '--p': `${((mult - 1) / (multMax - 1)) * 100}%` }}
                onChange={(e) => setForm({ ...form, maxPayoutMultiplier: e.target.value })}
              />
              <output>{mult}x</output>
            </div>
            <span className="fxf-hint">A player can take out at most amount × this number. Protects you from tampering.</span>
          </div>
        </div>

        <h3>Game list (optional)</h3>
        <p className="muted small">Leave it empty to use the list from PrimeArcade. Or add the games you want to show.</p>
        {form.games.map((g, i) => (
          <div key={i} className="gm-grid" style={{ alignItems: 'center' }}>
            <div className={`fxf ${!canEdit ? 'off' : ''}`}>
              <FloatInput id={`gid-${i}`} label="Game id" value={g.id} disabled={!canEdit} onChange={(e) => setGame(i, { id: e.target.value })} />
            </div>
            <div className={`fxf ${!canEdit ? 'off' : ''}`}>
              <FloatInput id={`gname-${i}`} label="Name" value={g.name} disabled={!canEdit} onChange={(e) => setGame(i, { name: e.target.value })} />
            </div>
            <div className={`fxf ${!canEdit ? 'off' : ''}`}>
              <UrlInput value={g.image} disabled={!canEdit} onChange={(v) => setGame(i, { image: v })} />
            </div>
            {canEdit && <button type="button" className="btn ghost" onClick={() => delGame(i)}>Remove</button>}
          </div>
        ))}
        {canEdit && <div className="acts"><button type="button" className="btn ghost" onClick={addGame}>+ Add a game</button></div>}

        {canEdit && <div className="acts"><button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving...' : 'Save settings'}</button></div>}
      </form>

      {canEdit && (
        <div className="gm-card">
          <h3>PrimeArcade account</h3>
          <p className="muted small">The numbers PrimeArcade keeps for you (GGR charge, amount owed, settlements).</p>
          {!account ? <div className="muted">Loading...</div>
            : account.error ? <div className="error box">{account.error}</div>
            : <pre className="small mono gm-pre">{JSON.stringify(Object.fromEntries(Object.entries(account).filter(([k]) => !/key|secret|token/i.test(k))), null, 2)}</pre>}
        </div>
      )}
    </>
  );
}


// // NEW FILE (admin panel). Games: who played, how much was bet and won, and the game settings (super admin).
// // Sessions are written ONLY by the server (arcade_sessions). This page reads them and cannot change them.
// import { useCallback, useEffect, useMemo, useState } from 'react';
// import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
// import { db } from '../firebase';
// import { api } from '../api';

// const PERIODS = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All loaded' };
// const n = (v) => Number(v || 0);
// const fmt = (v) => n(v).toLocaleString('en-IN');
// const when = (s) => (s.createdAt?.toDate ? s.createdAt.toDate() : null);

// function Stat({ label, value, tone, hint }) {
//   return (
//     <div className="card" style={{ padding: '14px 16px', minWidth: 160, flex: '1 1 160px' }}>
//       <div className="muted small">{label}</div>
//       <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: tone || 'var(--text)' }}>{value}</div>
//       {hint && <div className="muted small" style={{ marginTop: 2 }}>{hint}</div>}
//     </div>
//   );
// }

// export default function Games({ role }) {
//   const canEdit = role === 'super_admin';
//   const [tab, setTab] = useState('report');
//   return (
//     <>
//       <div className="head"><h1>Games</h1></div>
//       <div className="tabs">
//         <a className={`tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>Report</a>
//         <a className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</a>
//       </div>
//       {tab === 'report' ? <Report /> : <Settings canEdit={canEdit} />}
//     </>
//   );
// }

// // ------------------------------------------------------------------ report
// function Report() {
//   const [rows, setRows] = useState([]);
//   const [count, setCount] = useState(200);
//   const [period, setPeriod] = useState('7d');
//   const [status, setStatus] = useState('all');
//   const [game, setGame] = useState('all');
//   const [userIdText, setUserIdText] = useState('');
//   const [uidFilter, setUidFilter] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const load = useCallback(async () => {
//     setLoading(true);
//     setError('');
//     try {
//       const snap = await getDocs(query(collection(db, 'arcade_sessions'), orderBy('createdAt', 'desc'), limit(count)));
//       setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [count]);
//   useEffect(() => { load(); }, [load]);

//   const findUser = async (e) => {
//     e.preventDefault();
//     setError('');
//     const t = userIdText.trim();
//     if (!t) return setUidFilter(null);
//     if (!/^[0-9]{6}$/.test(t)) return setError('User ID is 6 digits.');
//     try {
//       const s = await getDoc(doc(db, 'userIds', t));
//       if (!s.exists()) { setUidFilter('none'); return setError(`No user has the ID ${t}.`); }
//       setUidFilter(s.data().uid);
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const games = useMemo(() => [...new Set(rows.map((r) => r.gameId).filter(Boolean))], [rows]);
//   const shown = useMemo(() => {
//     const since = { today: new Date().setHours(0, 0, 0, 0), '7d': Date.now() - 7 * 864e5, '30d': Date.now() - 30 * 864e5, all: 0 }[period];
//     return rows.filter((r) => {
//       const t = when(r)?.getTime() ?? 0;
//       return t >= since && (status === 'all' || r.status === status || (status === 'suspicious' && r.suspicious)) && (game === 'all' || r.gameId === game) && (!uidFilter || r.uid === uidFilter);
//     });
//   }, [rows, period, status, game, uidFilter]);

//   // numbers: "bet" and "win" are what the players did inside the games; GGR = bet - win (what the house kept)
//   const sum = useMemo(() => {
//     const done = shown.filter((r) => r.status === 'settled');
//     const bet = shown.reduce((a, r) => a + n(r.totalBet), 0);
//     const win = shown.reduce((a, r) => a + n(r.totalWin), 0);
//     const stake = shown.reduce((a, r) => a + n(r.stake), 0);
//     const paid = done.reduce((a, r) => a + n(r.payout), 0);
//     const stakeDone = done.reduce((a, r) => a + n(r.stake), 0);
//     return { sessions: shown.length, players: new Set(shown.map((r) => r.uid)).size, stake, bet, win, ggr: bet - win, netCoins: stakeDone - paid, sus: shown.filter((r) => r.suspicious).length, open: shown.filter((r) => r.status === 'active').length };
//   }, [shown]);

//   const byGame = useMemo(() => {
//     const m = new Map();
//     for (const r of shown) {
//       const g = m.get(r.gameId) ?? { gameId: r.gameId, sessions: 0, bet: 0, win: 0 };
//       g.sessions += 1; g.bet += n(r.totalBet); g.win += n(r.totalWin);
//       m.set(r.gameId, g);
//     }
//     return [...m.values()].sort((a, b) => b.bet - a.bet);
//   }, [shown]);

//   const exportCsv = () => {
//     const head = ['time', 'user', 'userId', 'uid', 'game', 'room', 'stake', 'rounds', 'bet', 'win', 'payout', 'net', 'status', 'suspicious', 'session'];
//     const lines = shown.map((r) => [when(r)?.toISOString() ?? '', JSON.stringify(r.name ?? ''), r.userId, r.uid, r.gameId, r.roomId ?? '', n(r.stake), n(r.rounds), n(r.totalBet), n(r.totalWin), r.status === 'settled' ? n(r.payout) : '', r.status === 'settled' ? n(r.payout) - n(r.stake) : '', r.status, r.suspicious ? 'yes' : '', r.id].join(','));
//     const a = document.createElement('a');
//     a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
//     a.download = `games-${new Date().toISOString().slice(0, 10)}.csv`;
//     a.click();
//   };

//   return (
//     <>
//       <div className="head" style={{ marginTop: 0 }}>
//         <div className="search" style={{ flexWrap: 'wrap' }}>
//           <form className="search" onSubmit={findUser}>
//             <input placeholder="User ID (6 digits)" value={userIdText} onChange={(e) => setUserIdText(e.target.value)} style={{ width: 170 }} />
//             <button className="btn ghost" type="submit">Find</button>
//           </form>
//           <select className="btn ghost" value={period} onChange={(e) => setPeriod(e.target.value)}>{Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
//           <select className="btn ghost" value={status} onChange={(e) => setStatus(e.target.value)}>
//             {['all', 'active', 'settled', 'failed', 'suspicious'].map((t) => <option key={t} value={t}>{t}</option>)}
//           </select>
//           <select className="btn ghost" value={game} onChange={(e) => setGame(e.target.value)}>
//             <option value="all">all games</option>{games.map((g) => <option key={g} value={g}>{g}</option>)}
//           </select>
//           <select className="btn ghost" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[200, 500, 1000].map((c) => <option key={c} value={c}>Latest {c}</option>)}</select>
//           <button className="btn ghost" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
//         </div>
//       </div>
//       {error && <div className="error box">{error}</div>}

//       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '4px 0 16px' }}>
//         <Stat label="Game sessions" value={fmt(sum.sessions)} hint={`${fmt(sum.players)} players · ${fmt(sum.open)} open now`} />
//         <Stat label="Total bet" value={`🪙 ${fmt(sum.bet)}`} />
//         <Stat label="Total win" value={`🪙 ${fmt(sum.win)}`} />
//         <Stat label="GGR (bet − win)" value={`${sum.ggr >= 0 ? '+' : ''}${fmt(sum.ggr)}`} tone={sum.ggr >= 0 ? 'var(--ok)' : 'var(--danger)'} hint="what the games kept from the players" />
//         <Stat label="Coins out of wallets" value={`🪙 ${fmt(sum.netCoins)}`} hint="stake − payout, closed games" tone={sum.netCoins >= 0 ? 'var(--text)' : 'var(--danger)'} />
//         <Stat label="Suspicious" value={fmt(sum.sus)} tone={sum.sus ? 'var(--danger)' : undefined} hint="bet or balance did not add up" />
//       </div>

//       <div className="card table-wrap" style={{ marginBottom: 16 }}>
//         <table>
//           <thead><tr><th>Game</th><th>Sessions</th><th>Bet</th><th>Win</th><th>GGR</th></tr></thead>
//           <tbody>
//             {byGame.length === 0 && <tr><td colSpan={5} className="muted pad">No data.</td></tr>}
//             {byGame.map((g) => (
//               <tr key={g.gameId}><td><b>{g.gameId}</b></td><td>{fmt(g.sessions)}</td><td>{fmt(g.bet)}</td><td>{fmt(g.win)}</td>
//                 <td style={{ color: g.bet - g.win >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>{g.bet - g.win >= 0 ? '+' : ''}{fmt(g.bet - g.win)}</td></tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <div className="card table-wrap">
//         <table>
//           <thead><tr><th>Time</th><th>Player</th><th>Game</th><th>Room</th><th>Stake</th><th>Rounds</th><th>Bet</th><th>Win</th><th>Returned</th><th>Player result</th><th>Status</th></tr></thead>
//           <tbody>
//             {loading && <tr><td colSpan={11} className="muted pad">Loading...</td></tr>}
//             {!loading && shown.length === 0 && <tr><td colSpan={11} className="muted pad">No game sessions.</td></tr>}
//             {!loading && shown.map((r) => {
//               const net = r.status === 'settled' ? n(r.payout) - n(r.stake) : null;
//               return (
//                 <tr key={r.id}>
//                   <td>{when(r)?.toLocaleString() ?? '-'}</td>
//                   <td><div>{r.name || '-'}</div><div className="muted small mono">ID {r.userId || String(r.uid || '').slice(0, 8)}</div></td>
//                   <td><span className="pill plain">{r.gameId}</span></td>
//                   <td className="mono small">{r.roomId ? `${String(r.roomId).slice(0, 8)}…` : '-'}</td>
//                   <td>{fmt(r.stake)}</td>
//                   <td>{fmt(r.rounds)}</td>
//                   <td>{fmt(r.totalBet)}</td>
//                   <td>{fmt(r.totalWin)}</td>
//                   <td>{r.status === 'settled' ? fmt(r.payout) : '-'}</td>
//                   <td style={{ color: net === null ? undefined : net >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>{net === null ? '-' : `${net >= 0 ? '+' : ''}${fmt(net)}`}</td>
//                   <td>
//                     <span className={`pill ${r.status === 'settled' ? 'active' : r.status === 'failed' ? 'banned' : 'suspended'}`}>{r.status}</span>
//                     {r.suspicious && <span className="pill banned" style={{ marginLeft: 6 }}>suspicious</span>}
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </>
//   );
// }

// // ------------------------------------------------------------------ settings
// function Settings({ canEdit }) {
//   const [form, setForm] = useState({ enabled: false, stakes: '100, 500, 1000, 5000', maxStake: '5000', maxPayoutMultiplier: '20', games: '' });
//   const [account, setAccount] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');
//   const [ok, setOk] = useState('');

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const snap = await getDoc(doc(db, 'app_settings', 'arcade'));
//       const d = snap.exists() ? snap.data() : {};
//       setForm({
//         enabled: d.enabled === true,
//         stakes: (Array.isArray(d.stakes) ? d.stakes : [100, 500, 1000, 5000]).join(', '),
//         maxStake: String(d.maxStake ?? 5000),
//         maxPayoutMultiplier: String(d.maxPayoutMultiplier ?? 20),
//         games: Array.isArray(d.games) ? d.games.map((g) => [g.id, g.name, g.image || ''].join(' | ')).join('\n') : '',
//       });
//       if (canEdit) api('/admin/arcade/overview').then((r) => setAccount(r.account)).catch((e) => setAccount({ error: e.message }));
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [canEdit]);
//   useEffect(() => { load(); }, [load]);

//   const save = async (e) => {
//     e.preventDefault();
//     setError(''); setOk('');
//     const stakes = form.stakes.split(',').map((x) => Number(x.trim())).filter((x) => x);
//     if (!stakes.length || stakes.some((x) => !Number.isInteger(x) || x < 1)) return setError('Amounts: whole numbers like 100, 500, 1000.');
//     const maxStake = Number(form.maxStake);
//     const mult = Number(form.maxPayoutMultiplier);
//     if (!Number.isInteger(maxStake) || maxStake < 1) return setError('Maximum amount: a whole number.');
//     if (!(mult >= 1)) return setError('Maximum payout multiplier must be 1 or more.');
//     let games = null;
//     const lines = form.games.split('\n').map((l) => l.trim()).filter(Boolean);
//     if (lines.length) {
//       games = lines.map((l) => { const [id, name, image] = l.split('|').map((x) => x.trim()); return { id, name: name || id, ...(image ? { image } : {}) }; });
//     }
//     if (form.enabled && !window.confirm('Games will be OPEN for every player and coins can be lost. Are you sure?')) return;
//     setSaving(true);
//     try {
//       await api('/admin/arcade/settings', 'PUT', { enabled: form.enabled, stakes, maxStake, maxPayoutMultiplier: mult, games });
//       setOk('Saved. The app uses the new settings within a minute.');
//       await load();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <>
//       <p className="muted small">{canEdit ? 'Only a Super admin can change these. Every change is written to the audit log.' : 'You can only view this page. A Super admin can change the settings.'}</p>
//       {error && <div className="error box">{error}</div>}
//       {ok && <div className="ok box">{ok}</div>}
//       <form className="card form" onSubmit={save}>
//         <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
//           <input type="checkbox" disabled={!canEdit || loading} checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
//           <span><b>Games are open</b> <span className="muted small">(off = players see "Games are not open right now")</span></span>
//         </label>
//         <div className="grid">
//           <label className="field"><span>Amounts a player can choose (coins)</span>
//             <input disabled={!canEdit || loading} value={form.stakes} onChange={(e) => setForm({ ...form, stakes: e.target.value })} />
//             <span className="small">Separated by commas. Example: 100, 500, 1000, 5000</span></label>
//           <label className="field"><span>Maximum amount (coins)</span>
//             <input type="number" min="1" disabled={!canEdit || loading} value={form.maxStake} onChange={(e) => setForm({ ...form, maxStake: e.target.value })} />
//             <span className="small">Amounts above this are never offered.</span></label>
//           <label className="field"><span>Maximum payout multiplier (×)</span>
//             <input type="number" min="1" step="any" disabled={!canEdit || loading} value={form.maxPayoutMultiplier} onChange={(e) => setForm({ ...form, maxPayoutMultiplier: e.target.value })} />
//             <span className="small">A player can take out at most amount × this number. Protects you from tampering.</span></label>
//         </div>
//         <label className="field"><span>Game list (optional)</span>
//           <textarea rows={4} disabled={!canEdit || loading} value={form.games} onChange={(e) => setForm({ ...form, games: e.target.value })} placeholder={'delicious | Delicious | https://...image.png'} />
//           <span className="small">One game per line: <code>id | name | image link (optional)</code>. Leave empty to use the list from PrimeArcade.</span></label>
//         {canEdit && <div className="acts"><button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving...' : 'Save settings'}</button></div>}
//       </form>

//       {canEdit && (
//         <div className="card" style={{ padding: 16, marginTop: 16 }}>
//           <h3 style={{ marginTop: 0 }}>PrimeArcade account</h3>
//           <p className="muted small">The numbers PrimeArcade keeps for you (GGR charge, amount owed, settlements).</p>
//           {!account ? <div className="muted">Loading...</div>
//             : account.error ? <div className="error box">{account.error}</div>
//             : <pre className="small mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(Object.fromEntries(Object.entries(account).filter(([k]) => !/key|secret|token/i.test(k))), null, 2)}</pre>}
//         </div>
//       )}
//     </>
//   );
// }

// // NEW FILE (admin panel). Games: who played, how much was bet and won, and the game settings (super admin).
// // Sessions are written ONLY by the server (arcade_sessions). This page reads them and cannot change them.
// import { useCallback, useEffect, useMemo, useState } from 'react';
// import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
// import { db } from '../firebase';
// import { api } from '../api';

// const PERIODS = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All loaded' };
// const n = (v) => Number(v || 0);
// const fmt = (v) => n(v).toLocaleString('en-IN');
// const when = (s) => (s.createdAt?.toDate ? s.createdAt.toDate() : null);

// function Stat({ label, value, tone, hint }) {
//   return (
//     <div className="card" style={{ padding: '14px 16px', minWidth: 160, flex: '1 1 160px' }}>
//       <div className="muted small">{label}</div>
//       <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: tone || 'var(--text)' }}>{value}</div>
//       {hint && <div className="muted small" style={{ marginTop: 2 }}>{hint}</div>}
//     </div>
//   );
// }

// export default function Games({ role }) {
//   const canEdit = role === 'super_admin';
//   const [tab, setTab] = useState('report');
//   return (
//     <>
//       <div className="head"><h1>Games</h1></div>
//       <div className="tabs">
//         <a className={`tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>Report</a>
//         <a className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</a>
//       </div>
//       {tab === 'report' ? <Report /> : <Settings canEdit={canEdit} />}
//     </>
//   );
// }

// // ------------------------------------------------------------------ report
// function Report() {
//   const [rows, setRows] = useState([]);
//   const [count, setCount] = useState(200);
//   const [period, setPeriod] = useState('7d');
//   const [status, setStatus] = useState('all');
//   const [game, setGame] = useState('all');
//   const [userIdText, setUserIdText] = useState('');
//   const [uidFilter, setUidFilter] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const load = useCallback(async () => {
//     setLoading(true);
//     setError('');
//     try {
//       const snap = await getDocs(query(collection(db, 'arcade_sessions'), orderBy('createdAt', 'desc'), limit(count)));
//       setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [count]);
//   useEffect(() => { load(); }, [load]);

//   const findUser = async (e) => {
//     e.preventDefault();
//     setError('');
//     const t = userIdText.trim();
//     if (!t) return setUidFilter(null);
//     if (!/^[0-9]{6}$/.test(t)) return setError('User ID is 6 digits.');
//     try {
//       const s = await getDoc(doc(db, 'userIds', t));
//       if (!s.exists()) { setUidFilter('none'); return setError(`No user has the ID ${t}.`); }
//       setUidFilter(s.data().uid);
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   const games = useMemo(() => [...new Set(rows.map((r) => r.gameId).filter(Boolean))], [rows]);
//   const shown = useMemo(() => {
//     const since = { today: new Date().setHours(0, 0, 0, 0), '7d': Date.now() - 7 * 864e5, '30d': Date.now() - 30 * 864e5, all: 0 }[period];
//     return rows.filter((r) => {
//       const t = when(r)?.getTime() ?? 0;
//       return t >= since && (status === 'all' || r.status === status || (status === 'suspicious' && r.suspicious)) && (game === 'all' || r.gameId === game) && (!uidFilter || r.uid === uidFilter);
//     });
//   }, [rows, period, status, game, uidFilter]);

//   // numbers: "bet" and "win" are what the players did inside the games; GGR = bet - win (what the house kept)
//   const sum = useMemo(() => {
//     const done = shown.filter((r) => r.status === 'settled');
//     const bet = shown.reduce((a, r) => a + n(r.totalBet), 0);
//     const win = shown.reduce((a, r) => a + n(r.totalWin), 0);
//     const stake = shown.reduce((a, r) => a + n(r.stake), 0);
//     const paid = done.reduce((a, r) => a + n(r.payout), 0);
//     const stakeDone = done.reduce((a, r) => a + n(r.stake), 0);
//     return { sessions: shown.length, players: new Set(shown.map((r) => r.uid)).size, stake, bet, win, ggr: bet - win, netCoins: stakeDone - paid, sus: shown.filter((r) => r.suspicious).length, open: shown.filter((r) => r.status === 'active').length };
//   }, [shown]);

//   const byGame = useMemo(() => {
//     const m = new Map();
//     for (const r of shown) {
//       const g = m.get(r.gameId) ?? { gameId: r.gameId, sessions: 0, bet: 0, win: 0 };
//       g.sessions += 1; g.bet += n(r.totalBet); g.win += n(r.totalWin);
//       m.set(r.gameId, g);
//     }
//     return [...m.values()].sort((a, b) => b.bet - a.bet);
//   }, [shown]);

//   const exportCsv = () => {
//     const head = ['time', 'user', 'userId', 'uid', 'game', 'room', 'stake', 'rounds', 'bet', 'win', 'payout', 'net', 'status', 'suspicious', 'session'];
//     const lines = shown.map((r) => [when(r)?.toISOString() ?? '', JSON.stringify(r.name ?? ''), r.userId, r.uid, r.gameId, r.roomId ?? '', n(r.stake), n(r.rounds), n(r.totalBet), n(r.totalWin), r.status === 'settled' ? n(r.payout) : '', r.status === 'settled' ? n(r.payout) - n(r.stake) : '', r.status, r.suspicious ? 'yes' : '', r.id].join(','));
//     const a = document.createElement('a');
//     a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
//     a.download = `games-${new Date().toISOString().slice(0, 10)}.csv`;
//     a.click();
//   };

//   return (
//     <>
//       <div className="head" style={{ marginTop: 0 }}>
//         <div className="search" style={{ flexWrap: 'wrap' }}>
//           <form className="search" onSubmit={findUser}>
//             <input placeholder="User ID (6 digits)" value={userIdText} onChange={(e) => setUserIdText(e.target.value)} style={{ width: 170 }} />
//             <button className="btn ghost" type="submit">Find</button>
//           </form>
//           <select className="btn ghost" value={period} onChange={(e) => setPeriod(e.target.value)}>{Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
//           <select className="btn ghost" value={status} onChange={(e) => setStatus(e.target.value)}>
//             {['all', 'active', 'settled', 'failed', 'suspicious'].map((t) => <option key={t} value={t}>{t}</option>)}
//           </select>
//           <select className="btn ghost" value={game} onChange={(e) => setGame(e.target.value)}>
//             <option value="all">all games</option>{games.map((g) => <option key={g} value={g}>{g}</option>)}
//           </select>
//           <select className="btn ghost" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[200, 500, 1000].map((c) => <option key={c} value={c}>Latest {c}</option>)}</select>
//           <button className="btn ghost" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
//         </div>
//       </div>
//       {error && <div className="error box">{error}</div>}

//       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '4px 0 16px' }}>
//         <Stat label="Game sessions" value={fmt(sum.sessions)} hint={`${fmt(sum.players)} players · ${fmt(sum.open)} open now`} />
//         <Stat label="Total bet" value={`🪙 ${fmt(sum.bet)}`} />
//         <Stat label="Total win" value={`🪙 ${fmt(sum.win)}`} />
//         <Stat label="GGR (bet − win)" value={`${sum.ggr >= 0 ? '+' : ''}${fmt(sum.ggr)}`} tone={sum.ggr >= 0 ? 'var(--ok)' : 'var(--danger)'} hint="what the games kept from the players" />
//         <Stat label="Coins out of wallets" value={`🪙 ${fmt(sum.netCoins)}`} hint="stake − payout, closed games" tone={sum.netCoins >= 0 ? 'var(--text)' : 'var(--danger)'} />
//         <Stat label="Suspicious" value={fmt(sum.sus)} tone={sum.sus ? 'var(--danger)' : undefined} hint="bet or balance did not add up" />
//       </div>

//       <div className="card table-wrap" style={{ marginBottom: 16 }}>
//         <table>
//           <thead><tr><th>Game</th><th>Sessions</th><th>Bet</th><th>Win</th><th>GGR</th></tr></thead>
//           <tbody>
//             {byGame.length === 0 && <tr><td colSpan={5} className="muted pad">No data.</td></tr>}
//             {byGame.map((g) => (
//               <tr key={g.gameId}><td><b>{g.gameId}</b></td><td>{fmt(g.sessions)}</td><td>{fmt(g.bet)}</td><td>{fmt(g.win)}</td>
//                 <td style={{ color: g.bet - g.win >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>{g.bet - g.win >= 0 ? '+' : ''}{fmt(g.bet - g.win)}</td></tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <div className="card table-wrap">
//         <table>
//           <thead><tr><th>Time</th><th>Player</th><th>Game</th><th>Room</th><th>Stake</th><th>Rounds</th><th>Bet</th><th>Win</th><th>Returned</th><th>Player result</th><th>Status</th></tr></thead>
//           <tbody>
//             {loading && <tr><td colSpan={11} className="muted pad">Loading...</td></tr>}
//             {!loading && shown.length === 0 && <tr><td colSpan={11} className="muted pad">No game sessions.</td></tr>}
//             {!loading && shown.map((r) => {
//               const net = r.status === 'settled' ? n(r.payout) - n(r.stake) : null;
//               return (
//                 <tr key={r.id}>
//                   <td>{when(r)?.toLocaleString() ?? '-'}</td>
//                   <td><div>{r.name || '-'}</div><div className="muted small mono">ID {r.userId || String(r.uid || '').slice(0, 8)}</div></td>
//                   <td><span className="pill plain">{r.gameId}</span></td>
//                   <td className="mono small">{r.roomId ? `${String(r.roomId).slice(0, 8)}…` : '-'}</td>
//                   <td>{fmt(r.stake)}</td>
//                   <td>{fmt(r.rounds)}</td>
//                   <td>{fmt(r.totalBet)}</td>
//                   <td>{fmt(r.totalWin)}</td>
//                   <td>{r.status === 'settled' ? fmt(r.payout) : '-'}</td>
//                   <td style={{ color: net === null ? undefined : net >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>{net === null ? '-' : `${net >= 0 ? '+' : ''}${fmt(net)}`}</td>
//                   <td>
//                     <span className={`pill ${r.status === 'settled' ? 'active' : r.status === 'failed' ? 'banned' : 'suspended'}`}>{r.status}</span>
//                     {r.suspicious && <span className="pill banned" style={{ marginLeft: 6 }}>suspicious</span>}
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </>
//   );
// }

// // ------------------------------------------------------------------ settings
// function Settings({ canEdit }) {
//   const [form, setForm] = useState({ enabled: false, stakes: '100, 500, 1000, 5000', maxStake: '5000', maxPayoutMultiplier: '20', games: '' });
//   const [account, setAccount] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');
//   const [ok, setOk] = useState('');

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const snap = await getDoc(doc(db, 'app_settings', 'arcade'));
//       const d = snap.exists() ? snap.data() : {};
//       setForm({
//         enabled: d.enabled === true,
//         stakes: (Array.isArray(d.stakes) ? d.stakes : [100, 500, 1000, 5000]).join(', '),
//         maxStake: String(d.maxStake ?? 5000),
//         maxPayoutMultiplier: String(d.maxPayoutMultiplier ?? 20),
//         games: Array.isArray(d.games) ? d.games.map((g) => [g.id, g.name, g.image || ''].join(' | ')).join('\n') : '',
//       });
//       if (canEdit) api('/admin/arcade/overview').then((r) => setAccount(r.account)).catch((e) => setAccount({ error: e.message }));
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [canEdit]);
//   useEffect(() => { load(); }, [load]);

//   const save = async (e) => {
//     e.preventDefault();
//     setError(''); setOk('');
//     const stakes = form.stakes.split(',').map((x) => Number(x.trim())).filter((x) => x);
//     if (!stakes.length || stakes.some((x) => !Number.isInteger(x) || x < 1)) return setError('Amounts: whole numbers like 100, 500, 1000.');
//     const maxStake = Number(form.maxStake);
//     const mult = Number(form.maxPayoutMultiplier);
//     if (!Number.isInteger(maxStake) || maxStake < 1) return setError('Maximum amount: a whole number.');
//     if (!(mult >= 1)) return setError('Maximum payout multiplier must be 1 or more.');
//     let games = null;
//     const lines = form.games.split('\n').map((l) => l.trim()).filter(Boolean);
//     if (lines.length) {
//       games = lines.map((l) => { const [id, name, image] = l.split('|').map((x) => x.trim()); return { id, name: name || id, ...(image ? { image } : {}) }; });
//     }
//     if (form.enabled && !window.confirm('Games will be OPEN for every player and coins can be lost. Are you sure?')) return;
//     setSaving(true);
//     try {
//       await api('/admin/arcade/settings', 'PUT', { enabled: form.enabled, stakes, maxStake, maxPayoutMultiplier: mult, games });
//       setOk('Saved. The app uses the new settings within a minute.');
//       await load();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <>
//       <p className="muted small">{canEdit ? 'Only a Super admin can change these. Every change is written to the audit log.' : 'You can only view this page. A Super admin can change the settings.'}</p>
//       {error && <div className="error box">{error}</div>}
//       {ok && <div className="ok box">{ok}</div>}
//       <form className="card form" onSubmit={save}>
//         <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
//           <input type="checkbox" disabled={!canEdit || loading} checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
//           <span><b>Games are open</b> <span className="muted small">(off = players see "Games are not open right now")</span></span>
//         </label>
//         <div className="grid">
//           <label className="field"><span>Amounts a player can choose (coins)</span>
//             <input disabled={!canEdit || loading} value={form.stakes} onChange={(e) => setForm({ ...form, stakes: e.target.value })} />
//             <span className="small">Separated by commas. Example: 100, 500, 1000, 5000</span></label>
//           <label className="field"><span>Maximum amount (coins)</span>
//             <input type="number" min="1" disabled={!canEdit || loading} value={form.maxStake} onChange={(e) => setForm({ ...form, maxStake: e.target.value })} />
//             <span className="small">Amounts above this are never offered.</span></label>
//           <label className="field"><span>Maximum payout multiplier (×)</span>
//             <input type="number" min="1" step="any" disabled={!canEdit || loading} value={form.maxPayoutMultiplier} onChange={(e) => setForm({ ...form, maxPayoutMultiplier: e.target.value })} />
//             <span className="small">A player can take out at most amount × this number. Protects you from tampering.</span></label>
//         </div>
//         <label className="field"><span>Game list (optional)</span>
//           <textarea rows={4} disabled={!canEdit || loading} value={form.games} onChange={(e) => setForm({ ...form, games: e.target.value })} placeholder={'delicious | Delicious | https://...image.png'} />
//           <span className="small">One game per line: <code>id | name | image link (optional)</code>. Leave empty to use the list from PrimeArcade.</span></label>
//         {canEdit && <div className="acts"><button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving...' : 'Save settings'}</button></div>}
//       </form>

//       {canEdit && (
//         <div className="card" style={{ padding: 16, marginTop: 16 }}>
//           <h3 style={{ marginTop: 0 }}>PrimeArcade account</h3>
//           <p className="muted small">The numbers PrimeArcade keeps for you (GGR charge, amount owed, settlements).</p>
//           {!account ? <div className="muted">Loading...</div>
//             : account.error ? <div className="error box">{account.error}</div>
//             : <pre className="small mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(Object.fromEntries(Object.entries(account).filter(([k]) => !/key|secret|token/i.test(k))), null, 2)}</pre>}
//         </div>
//       )}
//     </>
//   );
// }