// Fabrique l'application Windows pour Steam (démo par défaut).
// usage : node scripts/build-steam.js [--full] [--appid=1234567]
//   --full     : le jeu complet (sans --full : la démo, qui s'arrête à la première mutation des insectes)
//   --appid=N  : l'App ID Steam du JEU COMPLET, pour que le bouton « liste de souhaits » ouvre sa page dans Steam
// Résultat : C:/Users/louis/Documents/Itch-Toupie/steam/builds/<nom>-win32-x64/ (c'est ce dossier qu'on envoie à Steam)
// Il faut avoir fait une fois : cd steam-app && npm install
const fs = require('fs');
const path = require('path');

const FULL = process.argv.includes('--full');
const APPID = (process.argv.find(a => a.startsWith('--appid=')) || '').split('=')[1] || '';
const root = path.join(__dirname, '..');
const appDir = path.join(root, 'steam-app');
const jeu = path.join(appDir, 'jeu');
const OUT = 'C:/Users/louis/Documents/Itch-Toupie/steam/builds';

// 1. Les fichiers du jeu (les mêmes que pour les applications mobiles), copiés dans steam-app/jeu
const FILES = ['index.html', 'i18n.js', 'version.json', 'confidentialite.html'];
const DIRS = ['vendor', 'app-assets', 'sons'];
fs.rmSync(jeu, { recursive: true, force: true });
fs.mkdirSync(jeu, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(jeu, f));
for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(jeu, d), { recursive: true });

// 2. index.html : plateforme Steam (pas de liens vers d'autres sites, ni de dons, ni de mise à jour par le web), démo ou non
const indexPath = path.join(jeu, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const anchor = '<script type="importmap">';
if (html.split(anchor).length !== 2) throw new Error('importmap introuvable');
const storeUrl = APPID ? `steam://store/${APPID}` : 'https://store.steampowered.com/search/?term=Spinning%20Top%20vs%20Roaches';
html = html.split(anchor).join(
  `<script>window.PLATFORM = 'steam'; window.DEMO = ${!FULL}; window.STEAM_URL = ${JSON.stringify(storeUrl)};</script>\n` + anchor);
// pas de manifeste d'appli web, d'adresse canonique ni d'aperçu de partage
html = html.replace(/<link rel="(manifest|canonical)"[^>]*>\n?/g, '')
  .replace(/<!-- Aperçu quand le lien est partagé[^\n]*\n/, '')
  .replace(/<meta (property="og:|name="twitter:)[^>]*>\n?/g, '');
fs.writeFileSync(indexPath, html);
console.log(`jeu/ prêt (${FULL ? 'jeu complet' : 'démo'}, liste de souhaits : ${storeUrl})`);

// 3. L'application Windows
(async () => {
  const { pathToFileURL } = require('url');
  const { packager } = await import(pathToFileURL(path.join(appDir, 'node_modules', '@electron', 'packager', 'dist', 'index.js')).href);
  const name = FULL ? 'Toupie contre Cafards' : 'Toupie contre Cafards Demo';
  const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).version;
  const paths = await packager({
    dir: appDir,
    name,
    executableName: FULL ? 'ToupieContreCafards' : 'ToupieContreCafardsDemo',
    platform: 'win32',
    arch: 'x64',
    out: OUT,
    overwrite: true,
    asar: true,
    prune: true,
    icon: path.join(appDir, 'icon.ico'),
    appVersion: '1.0.0',
    buildVersion: version.replace(/-/g, '.'),
    appCopyright: 'Toupie contre Cafards',
    ignore: [/^\/node_modules($|\/)/, /^\/icon\.ico$/],
    win32metadata: { CompanyName: 'Toupie contre Cafards', FileDescription: name, ProductName: name, InternalName: name },
  });
  // Seulement les langues du jeu pour les textes de Chromium (49 Mo → 3 Mo)
  const KEEP = ['en-US.pak', 'en-GB.pak', 'fr.pak', 'es.pak', 'es-419.pak', 'de.pak'];
  for (const p of paths) {
    const loc = path.join(p, 'locales');
    for (const f of fs.readdirSync(loc)) if (!KEEP.includes(f)) fs.rmSync(path.join(loc, f));
  }
  console.log('application prête :', paths.join(', '));
})().catch(e => { console.error('✖', e.message); process.exitCode = 1; });
