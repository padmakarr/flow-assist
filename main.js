const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const PREFS_FILENAME = 'flowassist-profile.json';

function getLegacyTasksPath() {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'tasks.json');
  }
  return path.join(__dirname, 'tasks.json');
}

let mainWindow = null;

function getPrefsPath() {
  return path.join(app.getPath('userData'), PREFS_FILENAME);
}

function readPrefs() {
  try {
    const p = getPrefsPath();
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writePrefs(partial) {
  const cur = readPrefs();
  const next = Object.assign({}, cur, partial);
  fs.writeFileSync(getPrefsPath(), JSON.stringify(next, null, 2), 'utf8');
}

function getInitialTaskData() {
  return {
    settings: {
      priorityColors: {
        '1': '#2e4a6e', '2': '#2e4a6e', '3': '#2e4a6e', '4': '#2e4a6e',
        '5': '#7a5c2e', '6': '#7a5c2e', '7': '#7a5c2e', '8': '#7a5c2e',
        '9': '#7a3d3d', '10': '#7a3d3d'
      }
    },
    tasks: []
  };
}

function hasExplicitProfilePath() {
  const prefs = readPrefs();
  return !!(prefs.profilePath && typeof prefs.profilePath === 'string');
}

/** Active JSON file: explicit profile in prefs, else legacy tasks.json beside app. */
function getActiveDataPath() {
  if (hasExplicitProfilePath()) {
    return path.normalize(readPrefs().profilePath);
  }
  return getLegacyTasksPath();
}

function ensureFaJsonPath(userPath) {
  if (!userPath || typeof userPath !== 'string') return '';
  const trimmed = userPath.trim();
  if (/\.fa\.json$/i.test(trimmed)) return trimmed;
  if (/\.json$/i.test(trimmed)) {
    return trimmed.replace(/\.json$/i, '.fa.json');
  }
  return trimmed + '.fa.json';
}

function profileFilter() {
  return [{ name: 'FlowAssist profile', extensions: ['json'] }];
}

function sendFileMenuAction(action) {
  const w = BrowserWindow.getFocusedWindow() || mainWindow;
  if (w && !w.isDestroyed()) w.webContents.send('file-menu', action);
}

function reloadFocusedWindow() {
  const w = BrowserWindow.getFocusedWindow() || mainWindow;
  if (w && !w.isDestroyed()) w.webContents.reload();
}

function openDocumentation() {
  const candidates = [
    path.join(__dirname, 'DOCUMENTATION.md'),
    path.join(__dirname, 'README.md'),
    path.join(__dirname, 'docs', 'index.html')
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) {
      shell.openPath(candidates[i]);
      return;
    }
  }
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Documentation',
    message: 'No documentation file was found.',
    detail: 'Add DOCUMENTATION.md, README.md, or docs/index.html next to the application to open it from this menu.'
  });
}

function readPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

function formatAuthorField(author) {
  if (!author) return '';
  if (typeof author === 'string') return author.trim();
  var name = author.name && String(author.name).trim();
  var email = author.email && String(author.email).trim();
  if (name && email) return name + ' <' + email + '>';
  return name || email || '';
}

function showAbout() {
  var pkg = readPackageJson();
  var version = (pkg && pkg.version) ? String(pkg.version) : '0.4.0';
  var description = (pkg && pkg.description) ? String(pkg.description).trim() : '';
  var author = formatAuthorField(pkg && pkg.author) || 'k-sva';
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  var lines = ['Version ' + version, 'Author: ' + author, 'License: GNU General Public License v3.0 (GPLv3)'];
  if (description) lines.push(description);
  dialog.showMessageBox(win, {
    type: 'none',
    title: 'About FlowAssist',
    message: 'FlowAssist',
    detail: lines.join('\n\n')
  });
}

function createAppMenu() {
  const fileSubmenu = [
    { label: 'Load Profile…', accelerator: 'CmdOrCtrl+O', click: () => sendFileMenuAction('load-profile') },
    { label: 'New Profile…', click: () => sendFileMenuAction('new-profile') },
    { type: 'separator' },
    { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendFileMenuAction('save-as') }
  ];

  const template = [
    {
      label: 'File',
      submenu: fileSubmenu
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload Window', accelerator: 'CmdOrCtrl+R', click: () => reloadFocusedWindow() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => openDocumentation() },
        { label: 'About', click: () => showAbout() }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  const debugMode = process.argv.includes('--flowassist-debug');
  mainWindow.webContents.on('did-finish-load', function () {
    if (debugMode) {
      mainWindow.webContents.executeJavaScript('window.__FLOWASSIST_DEBUG__ = true');
    }
  });
  if (debugMode) {
    mainWindow.webContents.openDevTools();
  }
}

ipcMain.handle('get-app-metadata', async () => {
  const pkg = readPackageJson();
  if (!pkg) {
    return { version: '0.4.0', author: '', description: '' };
  }
  return {
    version: pkg.version != null ? String(pkg.version) : '',
    author: formatAuthorField(pkg.author),
    description: pkg.description != null ? String(pkg.description).trim() : ''
  };
});

ipcMain.handle('load-tasks', async () => {
  const explicit = hasExplicitProfilePath();
  const filePath = getActiveDataPath();
  if (!fs.existsSync(filePath)) {
    if (!explicit) {
      const initialData = getInitialTaskData();
      const legacyPath = getLegacyTasksPath();
      fs.writeFileSync(legacyPath, JSON.stringify(initialData, null, 2));
      return { success: true, data: initialData, path: legacyPath };
    }
    return {
      success: false,
      code: 'FILE_NOT_FOUND',
      path: filePath,
      message: 'The saved profile file could not be found. Please use File → Load Profile to choose a valid .fa.json file.'
    };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return { success: true, data: data, path: filePath };
  } catch (err) {
    return {
      success: false,
      code: 'READ_ERROR',
      path: filePath,
      message: err.message || String(err)
    };
  }
});

ipcMain.handle('save-tasks', async (event, data) => {
  const filePath = getActiveDataPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-active-profile-path', async () => {
  return { path: getActiveDataPath() };
});

ipcMain.handle('dialog-open-profile', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const result = await dialog.showOpenDialog(win, {
    title: 'Load profile',
    properties: ['openFile'],
    filters: profileFilter()
  });
  if (result.canceled || !result.filePaths || !result.filePaths[0]) {
    return { canceled: true };
  }
  return { canceled: false, filePath: result.filePaths[0] };
});

ipcMain.handle('dialog-new-profile', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const result = await dialog.showSaveDialog(win, {
    title: 'New profile',
    defaultPath: 'profile.fa.json',
    filters: profileFilter()
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  const outPath = ensureFaJsonPath(result.filePath);
  return { canceled: false, filePath: outPath };
});

ipcMain.handle('profile-activate-from-path', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, message: 'Invalid path' };
  }
  const normalized = path.normalize(filePath);
  if (!fs.existsSync(normalized)) {
    return { success: false, code: 'NOT_FOUND', path: normalized, message: 'File not found.' };
  }
  try {
    const raw = fs.readFileSync(normalized, 'utf8');
    const data = JSON.parse(raw);
    writePrefs({ profilePath: normalized });
    return { success: true, data: data, path: normalized };
  } catch (err) {
    return { success: false, message: err.message || String(err) };
  }
});

ipcMain.handle('profile-create-new', async (event, filePath) => {
  const outPath = ensureFaJsonPath(filePath);
  const initial = getInitialTaskData();
  try {
    fs.writeFileSync(outPath, JSON.stringify(initial, null, 2), 'utf8');
    writePrefs({ profilePath: outPath });
    return { success: true, data: initial, path: outPath };
  } catch (err) {
    return { success: false, message: err.message || String(err) };
  }
});

ipcMain.handle('show-error-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const opts = options && typeof options === 'object' ? options : {};
  await dialog.showMessageBox(win, {
    type: 'error',
    title: opts.title || 'FlowAssist',
    message: opts.message || 'An error occurred.',
    detail: opts.detail || ''
  });
});

ipcMain.handle('profile-save-as', async (event, data) => {
  const result = await dialog.showSaveDialog(
    BrowserWindow.fromWebContents(event.sender) || mainWindow,
    {
      title: 'Save profile as',
      defaultPath: 'profile.fa.json',
      filters: profileFilter()
    }
  );
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  const outPath = ensureFaJsonPath(result.filePath);
  try {
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    writePrefs({ profilePath: outPath });
    return { success: true, path: outPath, canceled: false };
  } catch (err) {
    return { success: false, message: err.message || String(err), canceled: false };
  }
});

app.whenReady().then(function () {
  createAppMenu();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
