// Application Windows pour Steam : une fenêtre qui affiche le jeu (copié dans jeu/ par scripts/build-steam.js).
// Le jeu est servi par une adresse interne app://jeu/ : les modules JavaScript et la sauvegarde (localStorage) y fonctionnent normalement.
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Même dossier de données pour la démo et le jeu complet : la progression de la démo est gardée dans le jeu complet
app.setPath('userData', path.join(app.getPath('appData'), 'ToupieContreCafards'));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

const ROOT = path.join(__dirname, 'jeu');
const OPEN_OUTSIDE = /^(https:|steam:)/; // liens ouverts dans le navigateur du joueur (ou dans Steam)

// Une seule fenêtre à la fois
if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(() => {
  protocol.handle('app', req => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname);
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT + path.sep)) return new Response('', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  Menu.setApplicationMenu(null);

  const deck = process.env.SteamDeck === '1'; // Steam Deck : plein écran direct
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 500,
    fullscreen: deck, show: false, backgroundColor: '#140c06',
    title: app.getName(), icon: path.join(ROOT, 'app-assets', 'icon-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.once('ready-to-show', () => { if (!deck) win.maximize(); win.show(); });

  // Les liens externes (liste de souhaits, confidentialité) s'ouvrent hors de l'application ; rien d'autre n'est chargé dans la fenêtre
  win.webContents.setWindowOpenHandler(({ url }) => { if (OPEN_OUTSIDE.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('app://jeu/')) return;
    e.preventDefault();
    if (OPEN_OUTSIDE.test(url)) shell.openExternal(url);
  });
  // F11 ou Alt+Entrée : plein écran
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11' || (input.alt && input.key === 'Enter'))) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
  win.loadURL('app://jeu/index.html');
});

app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => app.quit());
