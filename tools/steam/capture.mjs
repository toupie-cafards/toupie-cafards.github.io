// Captures d'écran pour la page Steam : ouvre le jeu dans un Chrome invisible (1920×1080),
// met en place chaque scène avec window.__dbg et enregistre une image PNG en pleine résolution.
// usage : node tools/steam/capture.mjs [en|fr] [scène…]   (le jeu doit être servi sur http://localhost:8097)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LANG = process.argv[2] || 'en';
const ONLY = process.argv.slice(3);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8097/index.html';
const OUT = path.resolve('C:/Users/louis/Documents/Itch-Toupie/steam/captures-' + LANG);
fs.mkdirSync(OUT, { recursive: true });
const W = 1920, H = 1080, PORT = 9333 + (LANG === 'fr' ? 1 : 0);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'toupie-steam-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Préparation commune : pas d'intro, pas de tutoriels, langue choisie
const PREP = `(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.__dbg && window.__dbg.isReady && window.__dbg.isReady()); i++) await W(100);
  const d = window.__dbg, s = d.state;
  s.introSeen = true;
  s.tutos = new Proxy({}, { get: () => true });
  window.__W = W;
  const st = document.createElement('style'); st.textContent = '#toast, #banner { display: none !important; }'; document.head.append(st);
  return 'prêt';
})()`;

// Chaque scène : un lien (?test=… = sauvegarde de test séparée), puis un script qui met le jeu dans l'état voulu
const SCENES = {
  // Le début : le bureau envahi de cafards, la toupie fonce dans le tas
  '1-lancer': { test: 'steam1', js: `(async () => { const d = __dbg, s = d.state, r = s.savedRuns.histoire;
    Object.assign(r.levels, { diametre: 11, endurance: 14, poids: 9, lames: 10, pointe: 6, puissance: 13, elan: 6, appat: 24, nid: 12, combo: 4 }); r.wave = 11; r.cash = 48200; r.infest = 1000;
    d.refreshStats(); d.enterMode('histoire'); await __W(11000);
    d.launchTops(new d.THREE.Vector2(0.05, -1), 0.95, true); await __W(1500); })()` },
  // Milieu de partie : les insectes ont muté (perce-oreilles, mille-pattes, lucanes), traînée de feu et éclairs
  '2-mutation': { test: 'steam2', js: `(async () => { const d = __dbg, s = d.state, r = s.savedRuns.histoire;
    Object.assign(r.levels, { diametre: 26, endurance: 34, poids: 28, lames: 30, pointe: 20, puissance: 34, elan: 28, appat: 34, nid: 24, feu: 18, eclair: 10, multi: 2, critique: 22, combo: 20, inertie: 22, equilibre: 22 });
    r.wave = 31; r.cash = 8.7e8; r.toyboxApplied = true; r.infest = 13900; r.stageSeen = 1;
    d.refreshStats(); d.enterMode('histoire'); await __W(9000);
    d.launchTops(new d.THREE.Vector2(-0.2, -1), 1, true); await __W(1000); })()` },
  // L'atelier : l'arbre de la toupie
  '3-atelier': { test: 'steam3', js: `(async () => { const d = __dbg, s = d.state, r = s.savedRuns.histoire;
    Object.assign(r.levels, { diametre: 14, endurance: 18, poids: 12, lames: 15, pointe: 9, inertie: 8, rebond: 4, equilibre: 6, critique: 5, feu: 3, puissance: 16, elan: 10, appat: 12, nid: 6 });
    r.wave = 14; r.cash = 3.6e5;
    d.enterMode('histoire'); await __W(2500);
    document.getElementById('shopBtn').click(); await __W(1500); })()` },
  // Fin de partie : tout au maximum, les araignées sont arrivées
  '4-araignees': { test: 'steam4', js: `(async () => { const d = __dbg, s = d.state, r = s.savedRuns.histoire;
    s.meta.items = { tirelire: 5, depart: 3, catalogue: 1, doudou: 2, carte: 1, secours: 1, montre: 1, loupe: 2, gants: 1 };
    Object.assign(r.levels, { endurance: 46, puissance: 47, diametre: 35, lames: 45, elan: 45, poids: 44, appat: 45, pointe: 40, nid: 32,
      prime: 42, inertie: 41, precision: 20, rebond: 12, multi: 2, equilibre: 40, combo: 30, critique: 38, agressivite: 25, chance: 10,
      feu: 20, souffle: 10, trampoline: 16, eclair: 12, tornade: 8 });
    const spider = d.BUG_TYPES.findIndex(t => t.stage === 2);
    r.infest = 72100; r.stageSeen = 2; r.wave = 43; r.cash = 1.2e9; r.toyboxApplied = true;
    d.refreshStats(); d.enterMode('histoire'); await __W(10000);
    d.launchTops(new d.THREE.Vector2(0.25, -1), 1, true); await __W(900); })()` },
  // Le nid de la Reine
  '5-nid': { test: 'boss', js: `(async () => { const d = __dbg;
    d.enterMode('histoire'); await __W(2500); document.getElementById('cineSkip')?.click(); await __W(1500);
    for (let i = 0; i < 12; i++) { document.getElementById('skipIntro')?.click(); document.getElementById('dialog')?.click(); await __W(300); }
    await __W(3000);
    d.launchTops(new d.THREE.Vector2(0, -1), 1, true); await __W(1300); })()` },
  // Le défi du jour
  '6-defi': { test: 'steam6', js: `(async () => { const d = __dbg;
    d.openMenu(); await __W(400); document.getElementById('dailyBtn').click(); await __W(3500);
    d.launchTops(new d.THREE.Vector2(-0.1, -1), 0.95, true); await __W(900); })()` },
};

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `--lang=${LANG}`,
  '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio', '--no-first-run',
  '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });

let ws, id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((ok, ko) => { const i = ++id; pending.set(i, { ok, ko }); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* Chrome démarre */ }
  }
  if (!target) throw new Error('Chrome ne répond pas');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.ko(new Error(m.error.message)) : p.ok(m.result); }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  for (const [name, sc] of Object.entries(SCENES)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    await send('Page.navigate', { url: `${BASE}?test=${sc.test}` });
    await sleep(2500);
    await evaluate(PREP);
    await evaluate(sc.js);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('✔', file);
  }
} catch (e) {
  console.error('✖', e.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* déjà fermé */ }
  chrome.kill();
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome tient encore le dossier */ }
}
