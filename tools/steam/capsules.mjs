// Images de vitrine Steam (« capsules ») : une vraie scène du jeu, filmée de près, avec le titre par-dessus.
// usage : node tools/steam/capsules.mjs [en|fr] [format…]   (le jeu doit être servi sur http://localhost:8097)
import fs from 'node:fs';
import path from 'node:path';
import { openChrome, sleep } from './cdp.mjs';

const LANG = process.argv[2] || 'en';
const ONLY = process.argv.slice(3);
const OUT = path.resolve('C:/Users/louis/Documents/Itch-Toupie/steam/capsules-' + LANG);
fs.mkdirSync(OUT, { recursive: true });
const TITLE = LANG === 'fr' ? ['Toupie', 'contre Cafards'] : ['Spinning Top', 'vs Roaches'];

// Formats demandés par Steam (taille exacte). cam : position de la caméra et point visé, relatifs à la toupie (en mètres)
const FORMATS = {
  'main-capsule-1232x706': { w: 1232, h: 706, cam: [-0.2, 0.17, 0.42], look: [-0.13, 0.0, -0.07], fov: 40, logo: { x: 0.05, y: 0.11, size: 0.135, align: 'left' } },
  'header-capsule-920x430': { w: 920, h: 430, cam: [-0.2, 0.17, 0.42], look: [-0.14, 0.0, -0.07], fov: 38, logo: { x: 0.05, y: 0.12, size: 0.17, align: 'left' } },
  'small-capsule-462x174': { w: 462, h: 174, cam: [-0.2, 0.17, 0.42], look: [-0.14, 0.0, -0.07], fov: 38, logo: { x: 0.04, y: 0.1, size: 0.28, align: 'left' }, dim: 0.25 },
  'vertical-capsule-748x896': { w: 748, h: 896, cam: [-0.05, 0.26, 0.4], look: [-0.01, 0.06, -0.04], fov: 46, logo: { x: 0.5, y: 0.06, size: 0.1, align: 'center' } },
  'library-capsule-600x900': { w: 600, h: 900, cam: [-0.05, 0.26, 0.4], look: [-0.01, 0.065, -0.04], fov: 48, logo: { x: 0.5, y: 0.06, size: 0.092, align: 'center' } },
  'library-hero-3840x1240': { w: 3840, h: 1240, cam: [-0.06, 0.14, 0.36], look: [0.02, 0.01, -0.06], fov: 36, near: 0.28 },
  'page-background-1438x810': { w: 1438, h: 810, cam: [0.0, 0.3, 0.42], look: [0.0, 0.0, -0.05], fov: 45, dim: 0.55 },
  'community-icon-184x184': { w: 184, h: 184, image: '/presse/logo-1024.png' },
  'library-logo-1280x720': { w: 1280, h: 720, logoOnly: true, logo: { x: 0.5, y: 0.2, size: 0.27, align: 'center' } },
};

// Mise en place : un bureau bien rempli et une toupie améliorée qui fonce dans le tas
const SETUP = `(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.__dbg && window.__dbg.isReady && window.__dbg.isReady()); i++) await W(100);
  const d = __dbg, s = d.state, r = s.savedRuns.histoire, THREE = d.THREE;
  s.introSeen = true; s.tutos = new Proxy({}, { get: () => true });
  Object.assign(r.levels, { diametre: 18, endurance: 20, poids: 22, lames: 20, pointe: 14, inertie: 10, equilibre: 12, puissance: 16, elan: 8, appat: 26, nid: 14 });
  r.wave = 12; r.cash = 1e6; r.infest = 1000;
  d.refreshStats(); d.enterMode('histoire'); await W(12000);
  d.launchTops(new THREE.Vector2(0.04, -1), 0.9, true); await W(1700);
  // Un second rendu de la même scène, sur notre propre toile, avec notre propre caméra
  const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  R.setPixelRatio(1);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  R.outputColorSpace = THREE.SRGBColorSpace;
  // Les reflets de la pièce (même recette que dans le jeu)
  const pm = new THREE.PMREMGenerator(R), room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x2e2118, side: THREE.BackSide })));
  const panel = (w, h, c, k, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m); };
  panel(2.6, 2.6, 0xffd9a8, 5, -2.6, 4, 1.2); panel(4, 2.2, 0xbcd8ff, 2.2, 4.2, 2.2, -3); panel(7, 7, 0xfff1dc, 0.7, 0, 4.9, 0);
  const env = pm.fromScene(room, 0.04).texture;
  const top = d.tops.find(t => !t.dead) || d.tops[0];
  const T = new THREE.Vector3(); top.tilt.getWorldPosition(T);
  window.__art = { R, env, T };
  return [T.x, T.y, T.z].map(v => v.toFixed(3)).join(', ') + ' · insectes : ' + d.bugs.length;
})()`;

// Rendu d'un format : la scène 3D, puis le titre dessiné par-dessus ; renvoie l'image PNG (data URL)
const shot = (f, title) => f.image ? `(async () => {
  const F = ${JSON.stringify(f)}, img = new Image(); img.src = F.image; await img.decode();
  const c = document.createElement('canvas'); c.width = F.w; c.height = F.h;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, F.w, F.h);
  return c.toDataURL('image/png');
})()` : `(() => {
  const d = __dbg, THREE = d.THREE, { R, env, T } = window.__art, F = ${JSON.stringify(f)}, TITLE = ${JSON.stringify(title)};
  const out = document.createElement('canvas'); out.width = F.w; out.height = F.h;
  const g = out.getContext('2d');
  if (!F.logoOnly) {
    R.setSize(F.w, F.h, false);
    const cam = new THREE.PerspectiveCamera(F.fov, F.w / F.h, 0.01, 30);
    cam.position.set(T.x + F.cam[0], T.y + F.cam[1], T.z + F.cam[2]);
    cam.lookAt(T.x + F.look[0], T.y + F.look[1], T.z + F.look[2]);
    const sc = d.scene, envWas = sc.environment, fogWas = sc.fog;
    sc.environment = env; sc.fog = null;
    const hidden = [];
    for (const t of d.tops) if (t.trail && t.trail.visible) { t.trail.visible = false; hidden.push(t.trail); }
    const P = new THREE.Vector3();
    for (const b of d.bugs) { const o = b.group || b.root || b.mesh; if (!o) continue; o.getWorldPosition(P); if (P.distanceTo(cam.position) < (F.near || 0.33) && o.visible) { o.visible = false; hidden.push(o); } }
    for (const b of d.bugs) { const h = b.hpBar && (b.hpBar.g || b.hpBar); if (h && h.visible) { h.visible = false; hidden.push(h); } }
    const L = d.launcher && (d.launcher.group || d.launcher.root || d.launcher); if (L && L.isObject3D && L.visible) { L.visible = false; hidden.push(L); }
    // Ni taches d'écrasement ni insectes en train de mourir : une image nette
    sc.traverse(o => { const p = o.geometry && o.geometry.type === 'CircleGeometry' && o.geometry.parameters; if (p && p.radius === 1 && p.segments === 10 && o.visible) { o.visible = false; hidden.push(o); } });
    for (const b of d.bugs) if (b.dying > 0 && b.group && b.group.visible) { b.group.visible = false; hidden.push(b.group); }
    R.render(sc, cam);
    hidden.forEach(o => { o.visible = true; });
    sc.environment = envWas; sc.fog = fogWas;
    g.drawImage(R.domElement, 0, 0);
    // Vignettage chaud, et un voile sombre derrière le titre pour qu'il se lise bien
    const v = g.createRadialGradient(F.w * 0.6, F.h * 0.55, Math.min(F.w, F.h) * 0.25, F.w * 0.5, F.h * 0.5, Math.max(F.w, F.h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,8,0,0.55)');
    g.fillStyle = v; g.fillRect(0, 0, F.w, F.h);
    if (F.dim) { g.fillStyle = 'rgba(15,6,0,' + F.dim + ')'; g.fillRect(0, 0, F.w, F.h); }
    if (F.logo) {
      const L = F.logo;
      const grd = L.align === 'left' ? g.createLinearGradient(0, 0, F.w * 0.75, 0) : g.createLinearGradient(0, 0, 0, F.h * 0.45);
      grd.addColorStop(0, 'rgba(18,7,0,0.62)'); grd.addColorStop(1, 'rgba(18,7,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, F.w, F.h);
    }
  }
  if (F.logo) {
    const L = F.logo, size = L.size * F.h * (F.w / F.h < 1 ? F.w / F.h * 1.5 : 1);
    const font = s => '900 ' + s + 'px "Segoe UI Black", "Segoe UI", system-ui, sans-serif';
    // Le titre doit tenir dans la largeur : on réduit si besoin
    let s1 = size, s2 = size * 0.92;
    g.font = font(s1); let w1 = g.measureText(TITLE[0]).width; g.font = font(s2); let w2 = g.measureText(TITLE[1]).width;
    const maxW = F.w * (L.align === 'left' ? 0.6 : 0.9), k = Math.min(1, maxW / Math.max(w1, w2));
    s1 *= k; s2 *= k;
    const x = L.x * F.w, y1 = L.y * F.h + s1, y2 = y1 + s2 * 1.02;
    g.textAlign = L.align; g.lineJoin = 'round';
    const line = (txt, s, y, fill) => {
      g.font = font(s);
      g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = s * 0.18; g.shadowOffsetY = s * 0.08;
      g.lineWidth = s * 0.2; g.strokeStyle = '#2a1203'; g.strokeText(txt, x, y); g.restore();
      g.lineWidth = s * 0.2; g.strokeStyle = '#2a1203'; g.strokeText(txt, x, y);
      g.fillStyle = fill; g.fillText(txt, x, y);
    };
    const gold = g.createLinearGradient(0, y2 - s2, 0, y2);
    gold.addColorStop(0, '#fff2a8'); gold.addColorStop(0.55, '#ffd45a'); gold.addColorStop(1, '#f59a1c');
    const white = g.createLinearGradient(0, y1 - s1, 0, y1);
    white.addColorStop(0, '#ffffff'); white.addColorStop(1, '#f1e6d8');
    line(TITLE[0], s1, y1, white);
    line(TITLE[1], s2, y2, gold);
  }
  return out.toDataURL('image/png');
})()`;

const { send, evaluate, close } = await openChrome({ lang: LANG, port: 9341 });
try {
  await send('Page.navigate', { url: 'http://localhost:8097/index.html?test=steamart' });
  await sleep(2500);
  console.log('scène :', await evaluate(SETUP));
  for (const [name, f] of Object.entries(FORMATS)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    const data = await evaluate(shot(f, TITLE));
    const file = path.join(OUT, name + '.png');
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log('✔', file);
  }
} catch (e) {
  console.error('✖', e.message);
  process.exitCode = 1;
} finally {
  await close();
}
