// Prépare la version CrazyGames du jeu dans le dossier crazygames/
// CrazyGames refuse les .zip et les sous-dossiers posent problème au téléversement :
// tous les fichiers sont donc mis à plat (three.module.js et l'icône à côté d'index.html).
// Différences avec le site : SDK CrazyGames chargé (sauvegardes) et window.PLATFORM = 'crazygames'
// (le jeu masque alors les liens externes : café, partage, page confidentialité).
// usage : node scripts/build-crazygames.js  → téléverser TOUS les fichiers de crazygames/
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'crazygames');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'i18n.js', 'version.json']) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.copyFileSync(path.join(root, 'vendor', 'three.module.js'), path.join(out, 'three.module.js'));
fs.copyFileSync(path.join(root, 'app-assets', 'icon-192.png'), path.join(out, 'icon-192.png'));
// Les sons, à plat eux aussi
for (const f of fs.readdirSync(path.join(root, 'sons'))) if (/\.(wav|mp3)$/.test(f)) fs.copyFileSync(path.join(root, 'sons', f), path.join(out, f));

const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const anchor = '<script type="importmap">';
if (html.split(anchor).length !== 2) throw new Error('importmap introuvable');
html = html.split(anchor).join(
  '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n' +
  "<script>window.PLATFORM = 'crazygames';</script>\n" + anchor);
html = html.split('./vendor/three.module.js').join('./three.module.js');
if (html.split("const SON_DIR = 'sons/';").length !== 2) throw new Error('SON_DIR introuvable');
html = html.split("const SON_DIR = 'sons/';").join("const SON_DIR = '';");
html = html.split('href="app-assets/icon-192.png"').join('href="icon-192.png"');
html = html.split("'app-assets/icon-512.png'").join("'icon-192.png'"); // image de partage (inutilisée : partage masqué sur CrazyGames)
// pas de manifeste d'appli, d'adresse canonique ni d'aperçu de partage vers le site
html = html.replace(/<link rel="(manifest|canonical)"[^>]*>\n?/g, '')
  .replace(/<!-- Aperçu quand le lien est partagé[^\n]*\n/, '')
  .replace(/<meta (property="og:|name="twitter:)[^>]*>\n?/g, '');
if (/vendor\/|app-assets\//.test(html)) throw new Error('il reste un chemin vers un sous-dossier');
fs.writeFileSync(indexPath, html);
console.log('crazygames/ prêt :', fs.readdirSync(out).join(', '));
