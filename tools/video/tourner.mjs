// Tournage automatique de vidéos depuis le vrai jeu (Chrome invisible, temps réel, son du jeu compris).
// usage : node tools/video/tourner.mjs <film> [en|fr]      films : voir films.mjs (bande-annonce, short-vagues, short-200, short-reine…)
// Le jeu doit être servi sur http://localhost:8097 (node C:/Users/louis/Documents/Itch-Toupie/serveur-video.js).
// Chaque plan : une sauvegarde de test (?test=…), une mise en place, puis on filme l'écran (Page.startScreencast, ~60 images/s)
// et le son du jeu (bruitages, enregistrés dans la page). Musique : une piste à part, jouée par le jeu, mixée sous les plans.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { openChrome, sleep } from '../steam/cdp.mjs';
import { FILMS } from './films.mjs';

const FILM = process.argv[2];
const LANG = process.argv[3] || 'en';
const film = FILMS[FILM];
if (!film) { console.error('films :', Object.keys(FILMS).join(', ')); process.exit(1); }
const { width: W, height: H } = film;
const OUT_DIR = 'C:/Users/louis/Documents/Itch-Toupie/videos';
const TMP = path.join(OUT_DIR, 'tmp', `${FILM}-${LANG}`);
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const ff = args => execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

// Avant le chargement du jeu : tout ce qui part vers les haut-parleurs part aussi vers un enregistreur ; outils de texte à l'écran
const INIT = `(() => {
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...a) {
    const r = orig.call(this, dest, ...a);
    try { if (dest instanceof AudioDestinationNode) { const c = this.context; if (!c.__tee) { c.__tee = c.createMediaStreamDestination(); window.__audioStream = c.__tee.stream; } orig.call(this, c.__tee); } } catch (e) {}
    return r;
  };
  window.__rec = { start() { const rec = new MediaRecorder(window.__audioStream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 }); const chunks = []; rec.ondataavailable = e => chunks.push(e.data); rec.start(); this.r = rec; this.c = chunks; return Date.now(); },
    async stop() { if (!this.r) return ''; await new Promise(ok => { this.r.onstop = ok; this.r.stop(); }); const b = new Blob(this.c, { type: 'audio/webm' }); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); } };
  addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = \`#toast, #pickBtn, #menuBtn, #speedBtn, #updateBar, #coach, #cineSub, #cineSkip, #skipIntro { display: none !important; }
      /* pendant une cinématique, le jeu masque tout sauf la scène : nos textes doivent rester visibles */
      html body.cine > .vcap:not(#a):not(#b), html body.cine > .vend:not(#a):not(#b) { visibility: visible !important; }
      /* zoom de l'atelier : une règle CSS, car l'arbre est reconstruit à chaque achat */
      body.vzoomTree #tree .treeIn { transform: scale(1.75) !important; transform-origin: center center !important; }
      .vcap { position: fixed; left: 50%; transform: translateX(-50%); z-index: 99999; text-align: center; pointer-events: none; width: 92%;
        font: 900 var(--s, 64px)/1.08 "Segoe UI Black", "Segoe UI", system-ui, sans-serif; color: #fff; letter-spacing: .01em;
        -webkit-text-stroke: calc(var(--s, 64px) * .09) #2a1203; paint-order: stroke fill; text-shadow: 0 .08em .25em rgba(0,0,0,.55);
        opacity: 0; transition: opacity .25s, transform .25s; }
      .vcap.on { opacity: 1; }
      .vcap .g { color: #ffd23f; }
      .vend { position: fixed; inset: 0; z-index: 99998; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2vh;
        background: radial-gradient(ellipse at center, rgba(30,14,4,.55), rgba(10,4,0,.88)); opacity: 0; transition: opacity .5s; pointer-events: none; }
      .vend.on { opacity: 1; }
      .vend .vcap { position: static; transform: none; opacity: 1; }
      .vend .btn { font: 800 var(--b, 40px) "Segoe UI", system-ui, sans-serif; color: #1a1410; background: linear-gradient(#ffe27a, #ffb531); padding: .45em 1.2em; border-radius: .5em; box-shadow: 0 .2em .8em rgba(0,0,0,.5); }
      .vend .sub { font: 700 var(--u, 30px) "Segoe UI", system-ui, sans-serif; color: #ffe9c9; text-shadow: 0 2px 8px #000; }\`;
    document.head.append(st);
  });
  // Texte à l'écran : __cap(html, { y: '8%' | bottom, s: taille, ms: durée })
  window.__cap = (html, o = {}) => { const e = document.createElement('div'); e.className = 'vcap'; e.innerHTML = html; e.style.setProperty('--s', (o.s || 64) + 'px');
    if (o.bottom !== undefined) e.style.bottom = o.bottom; else e.style.top = o.y || '8%';
    document.body.append(e); requestAnimationFrame(() => requestAnimationFrame(() => e.classList.add('on')));
    if (o.ms) setTimeout(() => { e.classList.remove('on'); setTimeout(() => e.remove(), 400); }, o.ms); return e; };
  // Zoom de l'atelier (×1,75), à réappliquer après chaque achat
  window.__zoomTree = () => document.body.classList.add('vzoomTree');
  window.__end = (html) => { const e = document.createElement('div'); e.className = 'vend'; e.innerHTML = html; document.body.append(e); requestAnimationFrame(() => requestAnimationFrame(() => e.classList.add('on'))); };
})()`;

// Préparation commune d'un plan : pas d'intro ni de tutoriel, son des bruitages allumé, musique coupée (elle est mixée à part)
const PREP = `(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.__dbg && window.__dbg.isReady && window.__dbg.isReady); i++) await W(100);
  const d = window.__dbg, s = d.state;
  s.introSeen = true; s.tutos = new Proxy({}, { get: () => true });
  s.settings.sound = true; s.settings.music = MUSIC;
  d.SFX.init();
  window.__W = W;
  return 'prêt';
})()`;

const { send, evaluate, close, ws } = await openChrome({ lang: LANG, width: W, height: H, port: 9380, args: ['--autoplay-policy=no-user-gesture-required'] });
let frameSink = null;
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method !== 'Page.screencastFrame') return;
  send('Page.screencastFrameAck', { sessionId: m.params.sessionId });
  if (frameSink) frameSink(m.params);
});
await send('Page.addScriptToEvaluateOnNewDocument', { source: INIT });

async function load(test) {
  await send('Page.navigate', { url: `http://localhost:8097/index.html?test=${test}` });
  await sleep(2000);
}
async function zoom(ticks) {
  if (!ticks) return;
  const [cx, cy] = JSON.parse(await evaluate(`(() => { const d = __dbg, v = new d.THREE.Vector3(0, 0, ${film.zoomZ ?? -0.1}).project(d.camera); return JSON.stringify([(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight]); })()`));
  for (let i = 0; i < ticks; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: -120 }); await sleep(60); }
  await sleep(400);
}

// Filme un plan : renvoie le fichier vidéo du plan (images à 60 i/s + son des bruitages)
async function shoot(i, shot) {
  const T = (k) => typeof k === 'string' ? k : (k[LANG] || k.en);
  await load(shot.test);
  await evaluate(PREP.replace('MUSIC', shot.music ? 'true' : 'false'));
  if (shot.setup) await evaluate(`(async () => { const d = __dbg, s = d.state, r = s.savedRuns.histoire, W = __W; ${shot.setup} })()`);
  await zoom(shot.zoom);
  const dir = path.join(TMP, `plan${i}`);
  fs.mkdirSync(dir);
  const frames = [];
  frameSink = p => { const f = path.join(dir, `${String(frames.length).padStart(5, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(p.data, 'base64')); frames.push({ f, t: p.metadata.timestamp }); };
  const audioStart = await evaluate('__rec.start()');
  await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  // L'action et les textes, minutés depuis le début du plan
  const caps = (shot.caps || []).map(c => `setTimeout(() => __cap(${JSON.stringify(T(c.text))}, ${JSON.stringify({ ...c.o, ms: c.ms })}), ${c.at || 0});`).join('\n');
  const end = shot.end ? `setTimeout(() => __end(${JSON.stringify(T(shot.end))}), ${shot.endAt || 0});` : '';
  await evaluate(`(() => { const d = __dbg, s = d.state, r = s.savedRuns.histoire; ${caps} ${end} (async () => { const W = __W; ${shot.action || ''} })(); return 1; })()`);
  await sleep(shot.dur * 1000 + 600);
  await send('Page.stopScreencast');
  frameSink = null;
  const audio = await evaluate('__rec.stop()');
  const aFile = path.join(dir, 'son.webm');
  fs.writeFileSync(aFile, Buffer.from(audio, 'base64'));
  // Les images avec leur vraie durée → vidéo à 60 images/s régulières
  const t0 = frames[0].t;
  const list = frames.map((fr, k) => `file '${fr.f.replace(/\\/g, '/')}'\nduration ${((frames[k + 1]?.t ?? fr.t + 1 / 60) - fr.t).toFixed(5)}`).join('\n') + `\nfile '${frames.at(-1).f.replace(/\\/g, '/')}'\n`;
  fs.writeFileSync(path.join(dir, 'images.txt'), list);
  const offset = audioStart / 1000 - t0; // > 0 : le son a commencé après la première image
  const seg = path.join(TMP, `plan${i}.mp4`);
  const aFilter = offset >= 0 ? `adelay=${Math.round(offset * 1000)}:all=1` : `atrim=start=${(-offset).toFixed(3)},asetpts=PTS-STARTPTS`;
  const fadeOut = Math.max(0, shot.dur - 0.25);
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'images.txt'), '-i', aFile,
    '-filter_complex', `[0:v]fps=60,scale=${W}:${H},setsar=1,trim=duration=${shot.dur},fade=t=in:st=0:d=${shot.fadeIn ?? 0.2},fade=t=out:st=${fadeOut}:d=0.25,format=yuv420p[v];[1:a]${aFilter},apad,atrim=duration=${shot.dur},aformat=sample_rates=48000:channel_layouts=stereo[a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-r', '60', '-c:a', 'aac', '-b:a', '192k', seg]);
  console.log(`✔ plan ${i} (${shot.name}) : ${frames.length} images, ${(frames.length / ((frames.at(-1).t - t0) || 1)).toFixed(0)} i/s, décalage son ${(offset * 1000).toFixed(0)} ms`);
  return seg;
}

// La musique du jeu, enregistrée d'une traite pour toute la durée du film
async function music(total) {
  await load(film.musicTest || 'vmusique');
  await evaluate(PREP.replace('MUSIC', 'true'));
  await evaluate(`(async () => { const d = __dbg; d.state.settings.sound = false; ${film.musicSetup || "d.enterMode('histoire');"} })()`);
  await sleep(1500);
  await evaluate('__rec.start()');
  await sleep((total + 1) * 1000);
  const a = await evaluate('__rec.stop()');
  const f = path.join(TMP, 'musique.webm');
  fs.writeFileSync(f, Buffer.from(a, 'base64'));
  console.log('✔ musique');
  return f;
}

try {
  const segs = [];
  for (const [i, shot] of film.shots.entries()) segs.push(await shoot(i, shot));
  const total = film.shots.reduce((a, s) => a + s.dur, 0);
  const mus = film.music === false ? null : await music(total);
  // Montage : plans bout à bout, musique dessous (fondu à la fin)
  fs.writeFileSync(path.join(TMP, 'plans.txt'), segs.map(s => `file '${s.replace(/\\/g, '/')}'`).join('\n'));
  const joined = path.join(TMP, 'plans.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'plans.txt'), '-c', 'copy', joined]);
  const out = path.join(OUT_DIR, `${FILM}-${LANG}.mp4`);
  if (mus) {
    ff(['-i', joined, '-i', mus, '-filter_complex',
      `[1:a]atrim=start=0.5,asetpts=PTS-STARTPTS,volume=${film.musicVol ?? 0.8},afade=t=in:d=0.6,afade=t=out:st=${(total - 2).toFixed(2)}:d=2[m];[0:a]volume=${film.sfxVol ?? 1}[s];[s][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  } else ff(['-i', joined, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  console.log('🎬', out, `(${total.toFixed(1)} s)`);
} catch (e) {
  console.error('✖', e.message);
  process.exitCode = 1;
} finally {
  await close();
}
