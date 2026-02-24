const tabs = new Map();
let activeSessionId = null;
let terminalBuffer = '';
let aiAssistMode = false;
let currentLine = '';
let appConfig = {};

async function loadSettings() {
  appConfig = await window.api.loadConfig();
  document.getElementById('ai-model-select').value = appConfig.aiModel || 'gemini';
  document.getElementById('ai-version-input').value = appConfig.aiVersion || 'gemini-2.0-flash-exp';
  document.getElementById('api-key-input').value = appConfig.apiKey || '';
  document.getElementById('terminal-font-size').value = appConfig.terminalFontSize || 14;
  document.getElementById('chat-font-size').value = appConfig.chatFontSize || 13;
  applyFontSizes();
}

function applyFontSizes() {
  const terminalSize = parseInt(document.getElementById('terminal-font-size').value);
  const chatSize = parseInt(document.getElementById('chat-font-size').value);
  
  tabs.forEach(tab => {
    tab.terminal.options.fontSize = terminalSize;
    tab.fitAddon.fit();
  });
  
  const textarea = document.getElementById('staging-textarea');
  if (textarea) textarea.style.fontSize = terminalSize + 'px';
  
  const aiMessages = document.getElementById('ai-messages');
  aiMessages.style.fontSize = chatSize + 'px';
  aiMessages.querySelectorAll('.message').forEach(msg => {
    msg.style.fontSize = chatSize + 'px';
  });
  
  document.getElementById('ai-input').style.fontSize = chatSize + 'px';
}

document.getElementById('save-settings').onclick = async () => {
  appConfig = {
    aiModel: document.getElementById('ai-model-select').value,
    aiVersion: document.getElementById('ai-version-input').value,
    apiKey: document.getElementById('api-key-input').value,
    terminalFontSize: parseInt(document.getElementById('terminal-font-size').value),
    chatFontSize: parseInt(document.getElementById('chat-font-size').value)
  };
  
  const success = await window.api.saveConfig(appConfig);
  showStatus(success ? '設定を保存しました' : '設定の保存に失敗しました', success);
  applyFontSizes();
};

document.getElementById('minimize').onclick = () => window.api.windowMinimize();
document.getElementById('maximize').onclick = () => window.api.windowMaximize();
document.getElementById('close').onclick = () => window.api.windowClose();

document.getElementById('settings-icon').onclick = () => {
  const panel = document.getElementById('settings-panel');
  const icon = document.getElementById('settings-icon');
  const infoPanel = document.getElementById('info-panel');
  const infoIcon = document.getElementById('info-icon');
  
  if (panel.classList.contains('visible')) {
    panel.classList.remove('visible');
    icon.classList.remove('active');
  } else {
    infoPanel.classList.remove('visible');
    infoIcon.classList.remove('active');
    panel.classList.add('visible');
    icon.classList.add('active');
  }
};

document.getElementById('info-icon').onclick = () => {
  const panel = document.getElementById('info-panel');
  const icon = document.getElementById('info-icon');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsIcon = document.getElementById('settings-icon');
  
  if (panel.classList.contains('visible')) {
    panel.classList.remove('visible');
    icon.classList.remove('active');
  } else {
    settingsPanel.classList.remove('visible');
    settingsIcon.classList.remove('active');
    panel.classList.add('visible');
    icon.classList.add('active');
  }
};

window.api.onTerminalData(({ sessionId, data }) => {
  const tab = tabs.get(sessionId);
  if (tab) {
    tab.terminal.write(data);
    const plainData = data.replace(/\x1b\[[0-9;]*m/g, '');
    tab.buffer += plainData;
    if (tab.buffer.length > 10000) tab.buffer = tab.buffer.slice(-10000);
    if (sessionId === activeSessionId) terminalBuffer = tab.buffer;
  }
});

window.api.onConnectionStatus(({ sessionId, success, message }) => {
  showStatus(message, success);
});

function showStatus(message, success = true) {
  const statusDiv = document.getElementById('status-message');
  statusDiv.textContent = message;
  statusDiv.style.color = success ? '#4ec9b0' : '#f48771';
  setTimeout(() => statusDiv.textContent = '', 3000);
}

function initStagingArea() {
  const textarea = document.getElementById('staging-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
    });
  }
}

async function createTab() {
  const sessionId = await window.api.createSession();
  
  const fontSize = appConfig.terminalFontSize || 14;
  const term = new Terminal({ 
    cursorBlink: true, 
    fontSize: fontSize, 
    theme: { 
      background: '#1e1e1e', 
      foreground: '#cccccc',
      cursor: '#cccccc',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff'
    },
    allowTransparency: false,
    cols: 80,
    rows: 24,
    rightClickSelectsWord: true,
    windowsMode: true
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  
  const container = document.createElement('div');
  container.className = 'terminal-container';
  container.dataset.sessionId = sessionId;
  
  document.getElementById('terminals').appendChild(container);
  term.open(container);
  
  term.attachCustomKeyEventHandler((event) => {
    if (event.ctrlKey && event.key === 'c' && term.hasSelection()) {
      const selection = term.getSelection();
      navigator.clipboard.writeText(selection);
      return false;
    }
    if (event.ctrlKey && event.key === 'v') {
      navigator.clipboard.readText().then(text => {
        if (!aiAssistMode) {
          window.api.terminalInput(sessionId, text);
        }
      });
      return false;
    }
    return true;
  });
  
  container.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (term.hasSelection()) {
      const selection = term.getSelection();
      navigator.clipboard.writeText(selection);
      showStatus('コピーしました');
    } else {
      navigator.clipboard.readText().then(text => {
        if (!aiAssistMode && text) {
          window.api.terminalInput(sessionId, text);
          showStatus('貼り付けました');
        }
      });
    }
  });
  
  setTimeout(() => fitAddon.fit(), 100);
  
  term.onData((data) => {
    if (!aiAssistMode) {
      window.api.terminalInput(sessionId, data);
    }
  });
  
  const tabElement = document.createElement('div');
  tabElement.className = 'tab';
  tabElement.innerHTML = `<span>Session ${sessionId}</span><span class="tab-close">×</span>`;
  tabElement.dataset.sessionId = sessionId;
  
  tabElement.querySelector('span:first-child').onclick = () => switchTab(sessionId);
  tabElement.querySelector('.tab-close').onclick = (e) => {
    e.stopPropagation();
    closeTab(sessionId);
  };
  
  document.getElementById('tabs-bar').insertBefore(tabElement, document.getElementById('new-tab'));
  
  tabs.set(sessionId, { 
    terminal: term,
    fitAddon, 
    container, 
    tabElement, 
    buffer: ''
  });
  switchTab(sessionId);
  window.api.shellConnect(sessionId);
}

function switchTab(sessionId) {
  tabs.forEach((tab, id) => {
    tab.container.classList.toggle('active', id === sessionId);
    tab.tabElement.classList.toggle('active', id === sessionId);
  });
  activeSessionId = sessionId;
  const tab = tabs.get(sessionId);
  if (tab) {
    setTimeout(() => tab.fitAddon.fit(), 50);
    terminalBuffer = tab.buffer;
  }
}

function closeTab(sessionId) {
  const tab = tabs.get(sessionId);
  if (tab) {
    window.api.closeSession(sessionId);
    tab.container.remove();
    tab.tabElement.remove();
    tabs.delete(sessionId);
    
    if (activeSessionId === sessionId) {
      const remaining = Array.from(tabs.keys());
      if (remaining.length > 0) switchTab(remaining[0]);
      else activeSessionId = null;
    }
  }
}

document.getElementById('new-tab').onclick = createTab;

const connectionType = document.getElementById('connection-type');
const serialOptions = document.getElementById('serial-options');
const sshOptions = document.getElementById('ssh-options');
const rloginOptions = document.getElementById('rlogin-options');

connectionType.onchange = () => {
  serialOptions.style.display = 'none';
  sshOptions.style.display = 'none';
  rloginOptions.style.display = 'none';
  
  if (connectionType.value === 'serial') {
    serialOptions.style.display = 'flex';
  } else if (connectionType.value === 'ssh') {
    sshOptions.style.display = 'flex';
  } else if (connectionType.value === 'rlogin') {
    rloginOptions.style.display = 'flex';
  }
};

async function loadSerialPorts() {
  try {
    const ports = await window.api.getSerialPorts();
    const select = document.getElementById('com-port');
    
    if (ports.length === 0) {
      select.innerHTML = '<option>ポートなし</option>';
    } else {
      select.innerHTML = ports.map(p => {
        const label = p.manufacturer ? `${p.path} - ${p.manufacturer}` : p.path;
        return `<option value="${p.path}">${label}</option>`;
      }).join('');
    }
  } catch (error) {
    document.getElementById('com-port').innerHTML = '<option>エラー</option>';
  }
}

loadSerialPorts();
document.getElementById('refresh-ports').onclick = loadSerialPorts;

document.getElementById('connect').onclick = () => {
  if (!activeSessionId) return;
  if (connectionType.value === 'serial') {
    const port = document.getElementById('com-port').value;
    const baudRate = document.getElementById('baud-rate').value;
    if (port && port !== 'ポート選択' && port !== 'ポートなし') {
      window.api.serialConnect(activeSessionId, port, baudRate);
    }
  } else if (connectionType.value === 'ssh') {
    const host = document.getElementById('ssh-host').value;
    const port = document.getElementById('ssh-port').value || '22';
    const user = document.getElementById('ssh-user').value;
    const pass = document.getElementById('ssh-pass').value;
    if (host && user) {
      window.api.sshConnect(activeSessionId, host, port, user, pass);
    }
  } else if (connectionType.value === 'rlogin') {
    const host = document.getElementById('host').value;
    const port = document.getElementById('port').value;
    if (host) window.api.rloginConnect(activeSessionId, host, port);
  }
  
  setTimeout(() => {
    if (aiAssistMode && stagingTerminal) {
      const textarea = document.getElementById('staging-textarea');
      if (textarea) textarea.focus();
    } else if (activeSessionId) {
      const tab = tabs.get(activeSessionId);
      if (tab) tab.terminal.focus();
    }
  }, 100);
};

document.getElementById('shell').onclick = () => {
  if (activeSessionId) {
    window.api.shellConnect(activeSessionId);
    setTimeout(() => {
      if (aiAssistMode) {
        const textarea = document.getElementById('staging-textarea');
        if (textarea) textarea.focus();
      } else {
        const tab = tabs.get(activeSessionId);
        if (tab) tab.terminal.focus();
      }
    }, 100);
  }
};

document.getElementById('mode-toggle').onclick = () => {
  aiAssistMode = !aiAssistMode;
  document.getElementById('mode-toggle').textContent = aiAssistMode ? '🤖 AI支援モード' : '⚡ 直接編集モード';
  document.getElementById('mode-toggle').style.background = aiAssistMode ? '#4ec9b0' : '#0e639c';
  showStatus(aiAssistMode ? 'AI支援モードに切り替えました' : '直接編集モードに切り替えました');
  
  const stagingArea = document.getElementById('staging-area');
  const terminals = document.getElementById('terminals');
  
  if (aiAssistMode) {
    initStagingArea();
    stagingArea.classList.add('visible');
    terminals.classList.add('staging-mode');
    setTimeout(() => {
      const textarea = document.getElementById('staging-textarea');
      if (textarea) textarea.focus();
    }, 400);
  } else {
    stagingArea.classList.remove('visible');
    terminals.classList.remove('staging-mode');
    if (activeSessionId) {
      const tab = tabs.get(activeSessionId);
      if (tab) setTimeout(() => tab.terminal.focus(), 400);
    }
  }
  
  setTimeout(() => {
    tabs.forEach(tab => tab.fitAddon.fit());
  }, 350);
};

document.getElementById('commit-btn').onclick = () => {
  if (!activeSessionId) return;
  const textarea = document.getElementById('staging-textarea');
  const text = textarea.value.trim();
  if (text) {
    const commands = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    if (commands.length > 0) {
      window.api.commitConfig(activeSessionId, commands);
      showStatus(`${commands.length}件のコマンドを実行しました`);
      textarea.value = '';
      textarea.focus();
    }
  }
};

document.getElementById('cancel-btn').onclick = () => {
  const textarea = document.getElementById('staging-textarea');
  if (textarea) {
    textarea.value = '';
    textarea.focus();
  }
};

document.getElementById('ai-send').onclick = sendAIMessage;
document.getElementById('ai-input').onkeypress = (e) => {
  if (e.key === 'Enter') sendAIMessage();
};

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const prompt = input.value.trim();
  if (!prompt) return;

  addMessage('user', prompt);
  input.value = '';

  const response = await window.api.aiRequest(prompt, terminalBuffer.slice(-2000), appConfig);
  
  const lines = response.split('\n');
  let commandLines = [];
  let commentLines = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('```')) continue;
    
    const isCommand = /^[a-z][a-z0-9-]*\s+/i.test(trimmed) || 
                     trimmed.includes('(config') || 
                     trimmed.startsWith('interface ') ||
                     trimmed.startsWith('ip ') ||
                     trimmed.startsWith('no ') ||
                     trimmed.startsWith('show ') ||
                     trimmed.startsWith('enable') ||
                     trimmed.startsWith('configure') ||
                     trimmed.startsWith('exit') ||
                     trimmed.startsWith('end');
    
    if (isCommand) {
      commandLines.push(line);
    } else {
      commentLines.push(line);
    }
  }
  
  if (commandLines.length > 0) {
    const commandText = commandLines.join('\n');
    addMessage('ai', commandText);
    
    if (aiAssistMode) {
      const textarea = document.getElementById('staging-textarea');
      if (textarea) {
        textarea.value = commandText;
      }
    }
  }
  
  if (commentLines.length > 0) {
    addMessage('ai-comment', commentLines.join('\n'));
  }
  
  if (commandLines.length === 0 && commentLines.length === 0) {
    addMessage('ai', response);
  }
}

function addMessage(type, text) {
  const messagesDiv = document.getElementById('ai-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  const chatSize = parseInt(document.getElementById('chat-font-size').value) || 13;
  messageDiv.style.fontSize = chatSize + 'px';
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

window.onresize = () => {
  tabs.forEach(tab => tab.fitAddon.fit());
  if (window.stagingFit) window.stagingFit.fit();
};

loadSettings().then(() => createTab());
