// Les films : une liste de plans. Chaque plan = une sauvegarde de test, une mise en place (setup, avant de filmer),
// une action (pendant qu'on filme), une durée et des textes à l'écran (en / fr).
// Dans setup et action : d = __dbg, s = d.state, r = la partie Histoire, W(ms) = attendre.

const LAUNCH = (x = 0.05, p = 0.95) => `await W(250); d.launchTops(new d.THREE.Vector2(${x}, -1), ${p}, true);`;
// Relance la toupie dès qu'elle tombe, pendant tout le plan
const RELAUNCH = (x = 0.05, p = 1) => `for (let k = 0; k < 12; k++) { for (let i = 0; i < 100 && !d.isReady(); i++) await W(100); await W(150); d.launchTops(new d.THREE.Vector2(${x} + (k % 3 - 1) * 0.15, -1), ${p}, true); await W(400); }`;
const GO =(ms = 8000) => `d.refreshStats(); d.enterMode('histoire'); await W(${ms});`;

// Niveaux d'atelier pour chaque moment de la partie
const L_DEBUT = "Object.assign(r.levels, { diametre: 11, endurance: 14, poids: 9, lames: 10, pointe: 6, puissance: 13, elan: 6, appat: 24, nid: 12, combo: 4 });";
const L_MILIEU = "Object.assign(r.levels, { diametre: 24, endurance: 30, poids: 26, lames: 28, pointe: 18, puissance: 30, elan: 24, appat: 40, nid: 30, critique: 20, combo: 18, inertie: 20, equilibre: 20, prime: 20 });";
const L_MUTANTS = "Object.assign(r.levels, { diametre: 26, endurance: 34, poids: 28, lames: 30, pointe: 20, puissance: 34, elan: 28, appat: 34, nid: 24, feu: 18, eclair: 10, multi: 2, critique: 22, combo: 20, inertie: 22, equilibre: 22 });";
const L_FIN = "s.meta.items = { tirelire: 5, depart: 3, catalogue: 1, doudou: 2, carte: 1, secours: 1, montre: 1, loupe: 2, gants: 1 }; Object.assign(r.levels, { endurance: 46, puissance: 47, diametre: 35, lames: 45, elan: 45, poids: 44, appat: 45, pointe: 40, nid: 32, prime: 42, inertie: 41, precision: 20, rebond: 12, multi: 2, equilibre: 40, combo: 30, critique: 38, agressivite: 25, chance: 10, feu: 20, souffle: 10, trampoline: 16, eclair: 12, tornade: 8 });";

const SCENES = {
  debut: `${L_DEBUT} r.wave = 11; r.cash = 48200; r.infest = 1000; ${GO()}`,
  vague1: `r.wave = 1; r.cash = 0; ${GO(5000)}`,
  milieu: `${L_MILIEU} r.wave = 22; r.cash = 2.4e6; r.infest = 4000; ${GO(9000)}`,
  milieuMulti: `${L_MILIEU} r.levels.multi = 2; r.wave = 22; r.cash = 2.4e6; r.infest = 4000; ${GO(9000)}`,
  atelier: `Object.assign(r.levels, { diametre: 14, endurance: 18, poids: 12, lames: 15, pointe: 9, inertie: 8, rebond: 4, equilibre: 6, critique: 5, puissance: 16, elan: 10, appat: 12, nid: 6 }); r.wave = 14; r.cash = 9e6; d.enterMode('histoire'); await W(2500); document.getElementById('shopBtn').click(); await W(1200); const ti = document.querySelector('.treeIn'); ti.style.transform += ' scale(1.75)'; ti.style.transformOrigin = 'center center'; await W(300);`,
  mutants: `${L_MUTANTS} r.wave = 31; r.cash = 8.7e8; r.toyboxApplied = true; r.infest = 13900; r.stageSeen = 1; ${GO(9000)}`,
  araignees: `${L_FIN} r.infest = 72100; r.stageSeen = 2; r.wave = 43; r.cash = 1.2e9; r.toyboxApplied = true; ${GO(10000)}`,
  essaim: `${L_FIN.replace('multi: 2, ', '')} r.wave = 22; r.cash = 2.4e6; r.infest = 1600; ${GO(9000)}`,
  vague40: `${L_FIN} r.infest = 72100; r.stageSeen = 2; r.wave = 40; r.cash = 9.8e8; r.toyboxApplied = true; ${GO(10000)}`,
  reine: `d.enterMode('histoire'); await W(2500); document.getElementById('cineSkip')?.click(); await W(1500);
    for (let i = 0; i < 14; i++) { document.getElementById('skipIntro')?.click(); document.getElementById('dialog')?.click(); await W(300); } await W(2500);`,
};

// Achats à l'atelier, un toutes les 0,55 s (on filme les cercles qui se remplissent)
const BUY = `for (let k = 0; k < 8; k++) { const n = [...document.querySelectorAll('.tnode:not(.locked):not(.maxed)')][k % 5]; if (n) n.click(); await W(550); }`;

const END = {
  en: (s) => `<div class="vcap" style="--s:${s}px">Spinning Top<br><span class="g">vs Roaches</span></div><div class="btn">Wishlist now on Steam</div><div class="sub">Free demo coming soon</div>`,
  fr: (s) => `<div class="vcap" style="--s:${s}px">Toupie<br><span class="g">contre Cafards</span></div><div class="btn">Ajoute-le à ta liste de souhaits sur Steam</div><div class="sub">Démo gratuite bientôt disponible</div>`,
};
const endCard = (s, dur = 4) => ({ name: 'fin', test: 'vfin', setup: SCENES.milieuMulti, action: LAUNCH(-0.1, 1), dur, end: { en: END.en(s), fr: END.fr(s) }, endAt: 300 });

const BOTTOM = (text, at = 250, ms) => ({ text, at, ms, o: { bottom: '8%', s: 70 } });
const TOP = (text, at = 0, ms, s = 84) => ({ text, at, ms, o: { y: '9%', s } });

export const FILMS = {
  // Bande-annonce Steam, 1920×1080, environ 40 s
  'bande-annonce': {
    width: 1920, height: 1080, musicVol: 0.7,
    shots: [
      { name: 'debut', test: 'v1', setup: SCENES.debut, zoom: 2, action: LAUNCH(), dur: 4.5, caps: [BOTTOM({ en: 'Your desk is overrun with cockroaches.', fr: 'Mon bureau est envahi de cafards.' }, 300, 3800)] },
      { name: 'milieu', test: 'v2', setup: SCENES.milieuMulti, zoom: 1, action: LAUNCH(0.1, 1), dur: 5.5, caps: [BOTTOM({ en: 'My only weapon: an old <span class="g">spinning top</span>.', fr: 'Ma seule arme : une vieille <span class="g">toupie</span>.' }, 300, 4800)] },
      { name: 'atelier', test: 'v3', setup: SCENES.atelier, action: BUY, dur: 4.5, caps: [BOTTOM({ en: 'Upgrade it. Again. And again.', fr: 'Je l’améliore. Encore. Et encore.' }, 200, 4000)] },
      { name: 'mutants', test: 'v4', setup: SCENES.mutants, zoom: 1, action: LAUNCH(-0.2, 1), dur: 6, caps: [BOTTOM({ en: 'Then the bugs <span class="g">mutate</span>…', fr: 'Puis les insectes <span class="g">mutent</span>…' }, 300, 5200)] },
      { name: 'araignees', test: 'v5', setup: SCENES.araignees, zoom: 1, action: LAUNCH(0.25, 1), dur: 6, caps: [BOTTOM({ en: '…and the <span class="g">spiders</span> arrive.', fr: '…et les <span class="g">araignées</span> débarquent.' }, 300, 5200)] },
      { name: 'reine', test: 'boss', setup: SCENES.reine, action: LAUNCH(0, 1), dur: 7, caps: [BOTTOM({ en: 'Storm the <span class="g">Queen’s nest</span>.', fr: 'Il faut détruire le <span class="g">nid de la Reine</span>.' }, 300, 6200)] },
      endCard(130, 5),
    ],
  },
  // L'intro du jeu (cinématique d'arrivée au bureau), telle que la voit un nouveau joueur
  'intro': {
    width: 1280, height: 720,
    shots: [{ name: 'intro', test: 'vintro', setup: "d.enterMode('histoire', { forceIntro: true });", dur: 10.5, fadeIn: 0 }],
  },
  // Écoute des sons : une toupie seule (souffle, contacts, écrasements), puis trois toupies en pleine foule (pas d'empilement)
  'test-son': {
    width: 1280, height: 720,
    shots: [
      { name: 'seule', test: 'ts1', setup: SCENES.debut, zoom: 2, action: LAUNCH(), dur: 7, caps: [BOTTOM({ en: 'One top', fr: 'Une toupie' }, 200, 2500)] },
      { name: 'foule', test: 'ts2', setup: SCENES.milieuMulti, zoom: 1, action: RELAUNCH(0.05, 1), dur: 12, caps: [BOTTOM({ en: 'Three tops in a crowd', fr: 'Trois toupies dans la foule' }, 200, 2500)] },
    ],
  },
  // Vidéos courtes verticales (TikTok, Shorts, Reels), 1080×1920
  'short-vagues': {
    width: 1080, height: 1920, zoomZ: -0.05,
    shots: [
      { name: 'vague1', test: 'sv1', setup: SCENES.vague1, zoom: 3, action: LAUNCH(0, 0.95), dur: 4, caps: [TOP({ en: 'Wave 1 <span class="g">vs</span> wave 40', fr: 'Vague 1 <span class="g">contre</span> vague 40' }, 0, 1700, 80), TOP({ en: 'WAVE 1', fr: 'VAGUE 1' }, 1800, 2000, 110)] },
      { name: 'vague15', test: 'sv2', setup: SCENES.debut.replace('r.wave = 11', 'r.wave = 15'), zoom: 3, action: LAUNCH(), dur: 4, caps: [TOP({ en: 'WAVE 15', fr: 'VAGUE 15' }, 100, 3600, 110)] },
      { name: 'vague40', test: 'sv3', setup: SCENES.vague40, zoom: 2, action: LAUNCH(0.2, 1), dur: 6.5, caps: [TOP({ en: 'WAVE 40', fr: 'VAGUE 40' }, 100, 6000, 110)] },
      endCard(120, 3.5),
    ],
  },
  'short-200': {
    width: 1080, height: 1920, zoomZ: -0.05,
    shots: [
      { name: 'essaim', test: 's200', setup: SCENES.essaim, zoom: 2, action: RELAUNCH(0.05, 1), dur: 11, caps: [TOP({ en: '200 cockroaches<br><span class="g">vs 1 spinning top</span>', fr: '200 cafards<br><span class="g">contre 1 toupie</span>' }, 0, 4500, 84)] },
      endCard(120, 3.5),
    ],
  },
  'short-reine': {
    width: 1080, height: 1920,
    shots: [
      { name: 'reine', test: 'boss', setup: SCENES.reine, zoom: 1, action: LAUNCH(0, 1), dur: 11, caps: [TOP({ en: 'The <span class="g">final boss</span><br>of my game', fr: 'Le <span class="g">boss final</span><br>de mon jeu' }, 0, 4500, 84)] },
      endCard(120, 3.5),
    ],
  },
};
