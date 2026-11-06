// Lojas Cloud - Aplicativo Desktop (Windows)
// Abre o sistema numa janela própria (Electron), SEM precisar do Google Chrome instalado.
// Um servidor local (127.0.0.1) serve o sistema + as rotas /api. Os dados ficam no
// IndexedDB (offline) e sincronizam com o Supabase quando houver internet.
const { app, BrowserWindow, session, shell, dialog, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

const isDev = !app.isPackaged;
let mainWindow = null;
let serverPort = null;

// ---------- instância única ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ---------- porta fixa (mantém o mesmo "origin" => IndexedDB/localStorage preservados) ----------
const PREFERRED_PORT = 38417;
function isPortFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}
async function pickPort() {
  if (await isPortFree(PREFERRED_PORT)) return PREFERRED_PORT;
  // se estiver ocupada, usa outra (o cache offline ficará separado nesse caso)
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

// ---------- .env (chaves) ----------
// Procura em: %APPDATA%\Lojas Cloud\.env  (edite aqui sem recompilar)
// Se não existir, copia o .env que foi empacotado junto.
function prepareEnvFile() {
  const userEnv = path.join(app.getPath('userData'), '.env');
  if (!fs.existsSync(userEnv)) {
    const bundled = isDev
      ? path.join(__dirname, '..', '.env')
      : path.join(process.resourcesPath, 'env.default');
    try { if (fs.existsSync(bundled)) fs.copyFileSync(bundled, userEnv); } catch (e) { console.warn(e); }
  }
  // completa a cópia do %APPDATA% com chaves LC_* que existam só no .env do projeto/instalador
  try {
    const bundled = isDev
      ? path.join(__dirname, '..', '.env')
      : path.join(process.resourcesPath, 'env.default');
    if (fs.existsSync(bundled) && fs.existsSync(userEnv)) {
      const src = fs.readFileSync(bundled, 'utf8');
      let dst = fs.readFileSync(userEnv, 'utf8');
      for (const key of ['LC_UPDATE_URL', 'LC_GITHUB_REPO', 'LC_GITHUB_BRANCH', 'LC_GITHUB_TOKEN']) {
        const m = src.match(new RegExp('^\\s*' + key + '\\s*=\\s*(.+?)\\s*$', 'm'));
        const has = new RegExp('^\\s*' + key + '\\s*=\\s*\\S', 'm').test(dst);
        if (m && !has) {
          dst = dst.replace(new RegExp('^\\s*' + key + '\\s*=.*$\\r?\\n?', 'm'), '');
          dst += (dst.endsWith('\n') || !dst ? '' : '\n') + key + '=' + m[1].replace(/^["']|["']$/g, '') + '\n';
          fs.writeFileSync(userEnv, dst);
        }
      }
    }
  } catch (e) { console.warn('Não foi possível sincronizar o .env:', e); }
  return userEnv;
}


// ---------- ATUALIZAÇÃO A PARTIR DO SITE (Vercel) ----------
// O botão "Forçar Atualização" baixa os arquivos publicados no site e passa a usá-los
// no lugar dos que vieram dentro do .exe. Os dados (OS, vendas...) NÃO são tocados.
// Endereço do site: variável LC_UPDATE_URL no .env (ex.: https://meusistema.vercel.app)
const UPDATE_DIR = () => path.join(app.getPath('userData'), 'web-update');
const UPDATE_TMP = () => path.join(app.getPath('userData'), 'web-update-tmp');
const UPDATE_OLD = () => path.join(app.getPath('userData'), 'web-update-old');

function rmrf(p) { try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) {} }

let updatedServerDir = null; // pasta com server.cjs baixado do GitHub (se houver)

function resolveWebRoot(bundledDist) {
  const dir = UPDATE_DIR();
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, '_update.json'), 'utf8'));
    // se o .exe foi reinstalado numa versão nova, descarta a atualização antiga
    if (meta.baseVersion !== app.getVersion()) { rmrf(dir); return bundledDist; }
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      const proxy = meta.proxy || (meta.kind === 'site' ? meta.source : '');
      if (proxy) process.env.LC_PROXY_URL = proxy; // /api passa a usar o backend do site
      if (fs.existsSync(path.join(dir, '_server', 'server.cjs'))) updatedServerDir = path.join(dir, '_server');
      return dir;
    }
  } catch (_) {}
  return bundledDist;
}

function getUpdateUrl() {
  let u = (process.env.LC_UPDATE_URL || '').trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

// Origem da atualização: GitHub (LC_GITHUB_REPO) tem prioridade; senão o site (LC_UPDATE_URL)
function getSource() {
  const repo = (process.env.LC_GITHUB_REPO || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
  const branch = (process.env.LC_GITHUB_BRANCH || 'desktop-dist').trim();
  const token = (process.env.LC_GITHUB_TOKEN || '').trim();
  const site = getUpdateUrl();
  if (repo) {
    return {
      kind: 'github',
      base: `https://raw.githubusercontent.com/${repo}/${branch}`,
      headers: token ? { Authorization: `token ${token}` } : {},
      proxy: site || '',
    };
  }
  if (site) return { kind: 'site', base: site, headers: {}, proxy: site };
  return null;
}

async function fetchText(url, headers) {
  const r = await fetch(url, { headers: headers || {}, cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
}

async function downloadSiteUpdate() {
  const src = getSource();
  if (!src) throw new Error('Origem da atualização não configurada. Defina LC_GITHUB_REPO=usuario/repositorio (ou LC_UPDATE_URL) no arquivo .env.');
  const base = src.base;

  // sw.js lista todos os arquivos da versão publicada (gerado pelo vite-plugin-pwa)
  const sw = await fetchText(`${base}/sw.js?t=${Date.now()}`, src.headers);
  if (!sw.includes('precacheAndRoute')) throw new Error('Não foi possível ler a lista de arquivos do site (sw.js inválido).');

  const files = new Set(['index.html', 'sw.js']);
  for (const m of sw.matchAll(/url:\s*"([^"]+)"/g)) files.add(m[1]);
  for (const m of sw.matchAll(/importScripts\(\s*"([^"]+)"/g)) files.add(m[1]);
  files.add('manifest.webmanifest');
  const optional = new Set(['manifest.webmanifest']);
  if (src.kind === 'github') {
    // backend (server.cjs) e página legada publicados pela rotina do GitHub
    for (const f of ['_server/server.cjs', '_server/legacy-ipad1.html']) { files.add(f); optional.add(f); }
  }

  const tmp = UPDATE_TMP();
  rmrf(tmp);
  fs.mkdirSync(tmp, { recursive: true });

  let count = 0;
  for (let rel of files) {
    rel = rel.replace(/^\.?\//, '');
    if (!rel || rel.includes('..') || /^[a-z]+:/i.test(rel)) continue; // segurança
    const dest = path.join(tmp, rel);
    if (!dest.startsWith(tmp)) continue;
    const r = await fetch(`${base}/${rel}`, { headers: src.headers, cache: 'no-store', signal: AbortSignal.timeout(120000) });
    if (!r.ok) {
      if (optional.has(rel)) continue; // opcional
      throw new Error(`Falha ao baixar ${rel} (HTTP ${r.status})`);
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) throw new Error(`Arquivo vazio: ${rel}`);
    // a Vercel devolve index.html para arquivos inexistentes: bloqueia esse engano
    if (/\.(js|cjs|css)$/i.test(rel) && buf.subarray(0, 15).toString().toLowerCase().includes('<!doctype')) {
      throw new Error(`O site devolveu uma página no lugar de ${rel}.`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    count++;
  }
  if (!fs.existsSync(path.join(tmp, 'index.html'))) throw new Error('index.html não foi baixado.');

  fs.writeFileSync(path.join(tmp, '_update.json'), JSON.stringify({
    baseVersion: app.getVersion(), source: base, kind: src.kind, proxy: src.proxy, updatedAt: new Date().toISOString(), files: count,
  }));

  // troca atômica: só substitui a versão atual depois de tudo baixado com sucesso
  rmrf(UPDATE_OLD());
  if (fs.existsSync(UPDATE_DIR())) fs.renameSync(UPDATE_DIR(), UPDATE_OLD());
  fs.renameSync(tmp, UPDATE_DIR());
  rmrf(UPDATE_OLD());
  return count;
}

ipcMain.handle('lc:info', () => {
  let meta = null;
  try { meta = JSON.parse(fs.readFileSync(path.join(UPDATE_DIR(), '_update.json'), 'utf8')); } catch (_) {}
  return { appVersion: app.getVersion(), updateSource: (getSource() || {}).base || null, lastUpdate: meta };
});

ipcMain.handle('lc:force-update', async () => {
  try {
    const count = await downloadSiteUpdate();
    // limpa só o cache de arquivos antigos (service worker); IndexedDB e login ficam intactos
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
    await session.defaultSession.clearCache();
    setTimeout(() => { app.relaunch(); app.exit(0); }, 800);
    return { ok: true, files: count };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
});

// ---------- servidor embutido ----------
async function startEmbeddedServer() {
  serverPort = await pickPort();
  const root = isDev ? path.join(__dirname, '..') : app.getAppPath();

  process.env.NODE_ENV = 'production';
  process.env.LC_EMBEDDED = '1';
  process.env.DEFAULT_APP_PORT = String(serverPort);
  process.env.LC_ENV_PATH = prepareEnvFile();
  process.env.LC_DIST_PATH = resolveWebRoot(path.join(root, 'dist'));
  process.env.LC_ASSETS_PATH = updatedServerDir || path.join(root, 'dist-server');

  // dist-server/server.cjs é gerado por: npm run build:server
  if (updatedServerDir) {
    try {
      require(path.join(updatedServerDir, 'server.cjs'));
    } catch (e) {
      // servidor baixado com problema: descarta a atualização e volta ao que veio no instalador
      console.error('server.cjs atualizado falhou, voltando ao original:', e);
      rmrf(UPDATE_DIR()); updatedServerDir = null;
      process.env.LC_DIST_PATH = path.join(root, 'dist');
      process.env.LC_ASSETS_PATH = path.join(root, 'dist-server');
      require(path.join(root, 'dist-server', 'server.cjs'));
    }
  } else {
    require(path.join(root, 'dist-server', 'server.cjs'));
  }

  // espera o servidor responder
  const url = `http://127.0.0.1:${serverPort}/`;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok || r.status < 500) return url;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('O servidor interno não iniciou.');
}

// ---------- permissões (câmera, USB/ADB, impressão, etc.) ----------
function setupPermissions() {
  const ses = session.defaultSession;
  const allowed = new Set(['media', 'usb', 'clipboard-read', 'clipboard-sanitized-write', 'notifications', 'fullscreen', 'midi']);
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(allowed.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
  ses.setDevicePermissionHandler((details) => details.deviceType === 'usb');

  // WebUSB (diagnóstico ADB de celulares): seleciona o dispositivo automaticamente
  // quando só há um; se houver vários, mostra um seletor simples.
  ses.on('select-usb-device', async (event, details, callback) => {
    event.preventDefault();
    const list = details.deviceList || [];
    if (list.length === 0) return callback();
    if (list.length === 1) return callback(list[0].deviceId);
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Selecionar dispositivo USB',
      message: 'Vários dispositivos encontrados. Escolha um:',
      buttons: [...list.map((d) => d.productName || `USB ${d.vendorId}:${d.productId}`), 'Cancelar'],
      cancelId: list.length,
    });
    callback(response < list.length ? list[response].deviceId : undefined);
  });
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'Lojas Cloud',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null); // sem barra de menu (F12 abre DevTools só em desenvolvimento)
  mainWindow.once('ready-to-show', () => { mainWindow.maximize(); mainWindow.show(); });
  mainWindow.loadURL(url);

  // links externos (WhatsApp, Mercado Pago etc.) abrem no navegador padrão do Windows
  mainWindow.webContents.setWindowOpenHandler(({ url: u }) => {
    if (!u.startsWith(`http://127.0.0.1:${serverPort}`)) { shell.openExternal(u); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  mainWindow.webContents.on('will-navigate', (e, u) => {
    if (!u.startsWith(`http://127.0.0.1:${serverPort}`)) { e.preventDefault(); shell.openExternal(u); }
  });
  if (isDev) mainWindow.webContents.on('before-input-event', (_e, i) => {
    if (i.key === 'F12' && i.type === 'keyDown') mainWindow.webContents.toggleDevTools();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    setupPermissions();
    const url = await startEmbeddedServer();
    createWindow(url);
  } catch (err) {
    dialog.showErrorBox('Lojas Cloud', 'Falha ao iniciar o sistema:\n' + (err && err.message ? err.message : err));
    app.quit();
  }
});
app.on('window-all-closed', () => app.quit());
