const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  runPsAction: (params) => ipcRenderer.invoke('run-ps-action', params),
  cancelActiveAction: () => ipcRenderer.invoke('cancel-active-action'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  checkRateLimit: (tokenOverride) => ipcRenderer.invoke('check-rate-limit', tokenOverride),
  openExplorer: (folderPath) => ipcRenderer.invoke('open-explorer', folderPath),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  selectFolderDialog: () => ipcRenderer.invoke('select-folder-dialog'),
  getDocContent: (docId) => ipcRenderer.invoke('get-doc-content', docId),
  saveGameNote: (params) => ipcRenderer.invoke('save-game-note', params),

  onLog: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('ps-log', handler);
    return () => ipcRenderer.removeListener('ps-log', handler);
  }
});
