const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),
  createSession: () => ipcRenderer.invoke('create-session'),
  closeSession: (sessionId) => ipcRenderer.send('close-session', sessionId),
  terminalInput: (sessionId, data) => ipcRenderer.send('terminal-input', { sessionId, data }),
  commitConfig: (sessionId, commands) => ipcRenderer.send('commit-config', { sessionId, commands }),
  onTerminalData: (callback) => ipcRenderer.on('terminal-data', (event, data) => callback(data)),
  onConnectionStatus: (callback) => ipcRenderer.on('connection-status', (event, data) => callback(data)),
  serialConnect: (sessionId, port, baudRate) => ipcRenderer.send('serial-connect', { sessionId, port, baudRate }),
  sshConnect: (sessionId, host, port, user, pass) => ipcRenderer.send('ssh-connect', { sessionId, host, port, user, pass }),
  rloginConnect: (sessionId, host, port) => ipcRenderer.send('rlogin-connect', { sessionId, host, port }),
  shellConnect: (sessionId) => ipcRenderer.send('shell-connect', sessionId),
  aiRequest: (prompt, context, config) => ipcRenderer.invoke('ai-request', { prompt, context, config })
});
