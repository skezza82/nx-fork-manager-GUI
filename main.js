const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
const ROOT_DIR = __dirname;
const SCRIPT_PATH = path.join(ROOT_DIR, 'fork-manager.ps1');

function readJsonFile(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, filePath);
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    throw err;
  }
}

function getAppConfig() {
  const cfgPath = path.join(ROOT_DIR, 'config.json');
  const existing = readJsonFile(cfgPath);
  if (existing) return existing;
  return {
    gpu: '',
    install_dir: 'forks',
    check_interval_minutes: 60,
    github_token: ''
  };
}

function getFullAppState() {
  const config = getAppConfig();
  const catalog = readJsonFile(path.join(ROOT_DIR, 'forks.json'), { forks: [] });
  const myForks = readJsonFile(path.join(ROOT_DIR, 'my-forks.json'), { forks: [] });
  const state = readJsonFile(path.join(ROOT_DIR, 'data', 'state.json'), {});
  const checks = readJsonFile(path.join(ROOT_DIR, 'data', 'checks.json'), {});
  const notes = readJsonFile(path.join(ROOT_DIR, 'data', 'my-notes.json'), {});
  const guideSource = readJsonFile(path.join(ROOT_DIR, 'data', 'wichforks', 'source.json'), null);
  const guideForks = readJsonFile(path.join(ROOT_DIR, 'data', 'wichforks', 'forks.json'), null);

  const customIds = (myForks.forks || []).map(f => f.id);
  const allForks = [...(catalog.forks || []), ...(myForks.forks || [])];

  // Resolve install dir
  const installDirRaw = config.install_dir || 'forks';
  const installDir = path.isAbsolute(installDirRaw)
    ? installDirRaw
    : path.resolve(ROOT_DIR, installDirRaw);

  // Parse games from GAMES.md if available
  let games = [];
  const gamesMdPath = path.join(ROOT_DIR, 'GAMES.md');
  if (fs.existsSync(gamesMdPath)) {
    try {
      const content = fs.readFileSync(gamesMdPath, 'utf8');
      const lines = content.split(/\r?\n/);
      let inTable = false;
      for (const line of lines) {
        if (line.includes('| Game | Recommended |')) {
          inTable = true;
          continue;
        }
        if (inTable) {
          if (!line.startsWith('|')) continue;
          if (line.startsWith('|---|') || line.startsWith('| --- |')) continue;
          const parts = line.split('|').map(s => s.trim()).filter(Boolean);
          if (parts.length >= 4) {
            games.push({
              name: parts[0],
              recommended: parts[1],
              installed: parts[2],
              alternatives: parts[3],
              evidence: parts[4] || ''
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing GAMES.md:', e);
    }
  }

  // Available docs in data/wichforks
  let availableDocs = [];
  const docsDir = path.join(ROOT_DIR, 'data', 'wichforks');
  if (fs.existsSync(docsDir)) {
    try {
      const files = fs.readdirSync(docsDir);
      availableDocs = files.filter(f => f.endsWith('.md')).map(f => ({
        id: f,
        name: f.replace(/\.md$/, '').replace(/-/g, ' ')
      }));
    } catch (e) {
      console.error('Error reading docs dir:', e);
    }
  }

  return {
    config,
    forks: allForks,
    customIds,
    state,
    checks,
    notes,
    guideSource,
    guideForks,
    games,
    installDir,
    availableDocs
  };
}

// Spawns fork-manager.ps1 with specified arguments and streams output
let activeProcess = null;

function runPowerShellAction(args, eventSender) {
  return new Promise((resolve, reject) => {
    if (activeProcess) {
      return reject(new Error('Another operation is already in progress. Please wait for it to finish.'));
    }

    const config = getAppConfig();
    const env = { ...process.env };
    if (config.github_token && config.github_token.trim()) {
      env.GITHUB_TOKEN = config.github_token.trim();
    }

    const psArgs = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', SCRIPT_PATH,
      ...args
    ];

    const child = spawn('powershell.exe', psArgs, {
      cwd: ROOT_DIR,
      env,
      windowsHide: true
    });

    activeProcess = child;

    const sendLog = (text, isError = false) => {
      if (eventSender && !eventSender.isDestroyed()) {
        eventSender.send('ps-log', { text, isError, time: new Date().toLocaleTimeString() });
      }
    };

    sendLog(`> powershell -File fork-manager.ps1 ${args.join(' ')}`);

    child.stdout.on('data', data => {
      const str = data.toString('utf8');
      sendLog(str, false);
    });

    child.stderr.on('data', data => {
      const str = data.toString('utf8');
      sendLog(str, true);
    });

    child.on('error', err => {
      activeProcess = null;
      sendLog(`Failed to start PowerShell: ${err.message}`, true);
      reject(err);
    });

    child.on('close', code => {
      activeProcess = null;
      sendLog(`[Process completed with exit code ${code}]`);
      if (code === 0) {
        resolve({ success: true, code });
      } else {
        resolve({ success: false, code, error: `Process exited with code ${code}` });
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#0b0d13',
    show: true,
    frame: true,
    titleBarStyle: 'default',
    title: 'NX Fork Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Log] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer Fail Load] ${errorCode}: ${errorDescription} (${validatedURL})`);
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Endpoints
ipcMain.handle('get-app-state', async () => {
  return getFullAppState();
});

ipcMain.handle('run-ps-action', async (event, { action, fork, tag, url }) => {
  const args = ['-Action', action];
  if (fork) args.push('-Fork', fork);
  if (tag) args.push('-Tag', tag);
  if (url) args.push('-Url', url);

  const res = await runPowerShellAction(args, event.sender);
  return { ...res, state: getFullAppState() };
});

ipcMain.handle('cancel-active-action', async () => {
  if (activeProcess) {
    try {
      activeProcess.kill();
      activeProcess = null;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'No active process' };
});

ipcMain.handle('save-config', async (event, newConfig) => {
  const cfgPath = path.join(ROOT_DIR, 'config.json');
  const current = getAppConfig();
  const merged = { ...current, ...newConfig };
  writeJsonFile(cfgPath, merged);
  return { success: true, config: merged };
});

ipcMain.handle('check-rate-limit', async (event, tokenOverride) => {
  const config = getAppConfig();
  const token = tokenOverride !== undefined ? tokenOverride : (config.github_token || process.env.GITHUB_TOKEN);
  const headers = {
    'User-Agent': 'nx-fork-manager-gui',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  try {
    const res = await fetch('https://api.github.com/rate_limit', { headers });
    const data = await res.json();
    if (res.status === 401) {
      return { success: false, status: 401, error: 'Invalid or expired GitHub token' };
    }
    return {
      success: true,
      rate: data.rate || null,
      tokenUsed: Boolean(token && token.trim())
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-explorer', async (event, targetPath) => {
  let fullPath = targetPath;
  if (!path.isAbsolute(fullPath)) {
    fullPath = path.resolve(ROOT_DIR, fullPath);
  }
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  shell.openPath(fullPath);
  return { success: true };
});

ipcMain.handle('open-external-url', async (event, url) => {
  shell.openExternal(url);
  return { success: true };
});

ipcMain.handle('select-folder-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Forks Installation Directory'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-doc-content', async (event, docId) => {
  try {
    const docPath = path.join(ROOT_DIR, 'data', 'wichforks', docId);
    if (fs.existsSync(docPath)) {
      return { success: true, content: fs.readFileSync(docPath, 'utf8') };
    }
    return { success: false, error: 'File not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-game-note', async (event, { game, forkId, text, prefer }) => {
  // We can call powershell to add note and write base cleanly
  // or write my-notes.json directly then trigger Write-Base
  const notesPath = path.join(ROOT_DIR, 'data', 'my-notes.json');
  const notes = readJsonFile(notesPath, {});
  const state = readJsonFile(path.join(ROOT_DIR, 'data', 'state.json'), {});
  const entry = state[forkId];
  const tag = entry ? entry.tag : '?';

  const newItem = {
    date: new Date().toISOString().split('T')[0],
    fork: forkId,
    tag,
    note: text
  };

  if (notes[game]) {
    notes[game].history = [newItem, ...(notes[game].history || [])];
    if (prefer) {
      notes[game].fork = forkId;
    }
  } else {
    notes[game] = {
      fork: prefer ? forkId : null,
      history: [newItem]
    };
  }

  writeJsonFile(notesPath, notes);

  // Run powershell to refresh GAMES.md
  try {
    const psCmd = `$s = (Get-Content '${SCRIPT_PATH.replace(/'/g, "''")}' -Raw); Invoke-Command -ScriptBlock ([scriptblock]::Create($s + [char]10 + 'Write-Base'))`;
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCmd], {
      cwd: ROOT_DIR,
      windowsHide: true
    });
    await new Promise(r => child.on('close', r));
  } catch (e) {
    console.error('Error running Write-Base:', e);
  }

  return { success: true, state: getFullAppState() };
});
