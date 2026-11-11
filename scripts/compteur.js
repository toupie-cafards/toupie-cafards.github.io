// Résumé du compteur anonyme de joueurs (données publiques de /stats/j dans Firebase)
// usage : node scripts/compteur.js
const DB = 'https://toupie-cafards-default-rtdb.europe-west1.firebasedatabase.app';
(async () => {
  const all = (await (await fetch(`${DB}/stats/j.json`)).json()) || {};
  const ids = new Set(), sites = {}, refs = {}, waves = { '0': 0, '1-4': 0, '5-9': 0, '10-19': 0, '20+': 0 };
  let nouveaux = 0, defis = 0;
  const etapes = [0, 0, 0, 0, 0, 0]; // nouveaux joueurs arrivés au moins à l'étape k (depuis le 12/11)
  const days = Object.keys(all).filter(d => d >= '2026-01-01').sort();
  console.log('Jour        joueurs  nouveaux  vague moy.');
  for (const d of days) {
    const e = Object.entries(all[d]);
    let n = 0, w = 0;
    for (const [id, v] of e) {
      ids.add(id); w += v.w || 0;
      if (v.n) { n++; nouveaux++; if (d >= '2026-11-12') for (let k = 0; k <= Math.max(v.e || 0, v.w >= 2 ? 4 : 0); k++) etapes[k]++; }
      if (v.d) defis++;
      sites[v.s] = (sites[v.s] || 0) + 1;
      if (v.r) refs[v.r] = (refs[v.r] || 0) + 1;
      const x = v.w || 0;
      waves[x === 0 ? '0' : x < 5 ? '1-4' : x < 10 ? '5-9' : x < 20 ? '10-19' : '20+']++;
    }
    console.log(`${d}  ${String(e.length).padStart(7)}  ${String(n).padStart(8)}  ${(w / e.length).toFixed(1).padStart(10)}`);
  }
  console.log(`\nJoueurs différents : ${ids.size} (dont ${nouveaux} vus pour la première fois)`);
  console.log('Par site (joueurs-jours) :', sites);
  console.log('Venus de :', refs);
  console.log('Arrivés par un lien de défi :', defis);
  console.log('Vague la plus haute du jour :', waves);
  const NOMS = ['ouvert le jeu', 'entré en partie', 'lancé la toupie', 'écrasé un insecte', 'fini la vague 1', 'acheté une amélioration'];
  console.log('\nNouveaux joueurs depuis le 12/11, combien ont…');
  NOMS.forEach((nom, k) => console.log(`  ${nom.padEnd(24)} ${String(etapes[k]).padStart(4)}${etapes[0] ? '  (' + Math.round(100 * etapes[k] / etapes[0]) + ' %)' : ''}`));
})();
