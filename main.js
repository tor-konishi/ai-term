const { app, BrowserWindow, ipcMain } = require('electron');
const pty = require('node-pty');
const path = require('path');
const fs = require('fs');
const { SerialPort } = require('serialport');
const { Client } = require('ssh2');
require('dotenv').config();

let mainWindow;
const sessions = new Map();
let sessionIdCounter = 0;
// 設定ファイルをexeと同じフォルダに保存
const configPath = app.isPackaged 
  ? path.join(path.dirname(app.getPath('exe')), 'config.json')
  : path.join(app.getPath('userData'), 'config.json');
const skillsPath = path.join(__dirname, 'skills');

function loadSkillFiles() {
  const skills = {};
  try {
    if (!fs.existsSync(skillsPath)) return skills;
    const vendors = fs.readdirSync(skillsPath);
    vendors.forEach(vendor => {
      const vendorPath = path.join(skillsPath, vendor);
      if (fs.statSync(vendorPath).isDirectory()) {
        skills[vendor.toLowerCase()] = [];
        const files = fs.readdirSync(vendorPath).filter(f => f.endsWith('.md'));
        files.forEach(file => {
          const content = fs.readFileSync(path.join(vendorPath, file), 'utf8');
          skills[vendor.toLowerCase()].push({ file, content });
        });
      }
    });
  } catch (error) {
    console.error('スキルファイル読み込みエラー:', error);
  }
  return skills;
}

function detectVendor(prompt) {
  const lower = prompt.toLowerCase();
  if (/cisco|ios|catalyst/.test(lower)) return 'cisco';
  if (/vyos/.test(lower)) return 'vyos';
  return null;
}

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('設定読み込みエラー:', error);
  }
  return {
    aiModel: 'gemini',
    aiVersion: 'gemini-2.0-flash-exp',
    apiKey: process.env.GEMINI_API_KEY || '',
    terminalFontSize: 14,
    chatFontSize: 13
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('設定保存エラー:', error);
    return false;
  }
}

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile('index.html');
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-serial-ports', async () => {
  try {
    const ports = await SerialPort.list();
    console.log('検出されたポート:', ports);
    return ports.map(p => ({ 
      path: p.path, 
      manufacturer: p.manufacturer || '',
      vendorId: p.vendorId || '',
      productId: p.productId || ''
    }));
  } catch (error) {
    console.error('ポート取得エラー:', error);
    return [];
  }
});

ipcMain.handle('create-session', () => {
  const sessionId = ++sessionIdCounter;
  sessions.set(sessionId, { type: null, connection: null, lineBuffer: '' });
  return sessionId;
});

ipcMain.on('close-session', (event, sessionId) => {
  const session = sessions.get(sessionId);
  if (session && session.connection) {
    if (session.type === 'serial' && session.connection.isOpen) session.connection.close();
    else if (session.type === 'pty') session.connection.kill();
    else if (session.type === 'ssh') session.connection.end();
    sessions.delete(sessionId);
  }
});

ipcMain.on('terminal-input', (event, { sessionId, data }) => {
  const session = sessions.get(sessionId);
  if (session && session.connection) {
    if (session.type === 'serial' && session.connection.isOpen) session.connection.write(data);
    else if (session.type === 'pty') session.connection.write(data);
    else if (session.type === 'ssh' && session.stream) session.stream.write(data);
  }
});

ipcMain.on('commit-config', (event, { sessionId, commands }) => {
  const session = sessions.get(sessionId);
  if (session && session.connection) {
    commands.forEach((cmd, index) => {
      setTimeout(() => {
        const line = cmd + '\r';
        if (session.type === 'serial' && session.connection.isOpen) {
          session.connection.write(line);
        } else if (session.type === 'pty') {
          session.connection.write(line);
        } else if (session.type === 'ssh' && session.stream) {
          session.stream.write(line);
        }
      }, index * 100);
    });
  }
});

let colorConfig = null;

function processLine(line, config) {
  if (line.includes('\x1b[')) return line;
  const lower = line.toLowerCase();
  
  const keywords = config?.colorKeywords || colorConfig?.colorKeywords;
  if (!keywords) return line;
  
  const trimmed = line.trim();
  if (!trimmed) return line;
  
  if (keywords.red) {
    const redWords = keywords.red.split(',').map(w => w.trim()).filter(w => w);
    if (redWords.length > 0) {
      const redPattern = new RegExp('\\b(' + redWords.join('|') + ')\\b', 'i');
      if (redPattern.test(lower)) return '\x1b[91m' + line + '\x1b[0m';
    }
  }
  
  if (keywords.yellow) {
    const yellowWords = keywords.yellow.split(',').map(w => w.trim()).filter(w => w);
    if (yellowWords.length > 0) {
      const yellowPattern = new RegExp('\\b(' + yellowWords.join('|') + ')\\b', 'i');
      if (yellowPattern.test(lower)) return '\x1b[93m' + line + '\x1b[0m';
    }
  }
  
  if (keywords.cyan) {
    const cyanWords = keywords.cyan.split(',').map(w => w.trim()).filter(w => w);
    if (cyanWords.length > 0) {
      const cyanPattern = new RegExp('\\b(' + cyanWords.join('|') + ')\\b', 'i');
      if (cyanPattern.test(lower)) return '\x1b[96m' + line + '\x1b[0m';
    }
  }
  
  return line;
}

function colorizeData(data, session, config) {
  return data;
}

ipcMain.on('shell-connect', (event, sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (session.connection) {
    if (session.type === 'serial' && session.connection.isOpen) session.connection.close();
    else if (session.type === 'pty') session.connection.kill();
  }
  const ptyProcess = pty.spawn('powershell.exe', ['-NoLogo'], { 
    name: 'xterm-256color', 
    cols: 80,
    rows: 24,
    cwd: process.env.HOME, 
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
  });
  ptyProcess.onData((data) => {
    const coloredData = colorizeData(data, session, colorConfig);
    event.sender.send('terminal-data', { sessionId, data: coloredData });
  });
  session.type = 'pty';
  session.connection = ptyProcess;
});

ipcMain.on('serial-connect', async (event, { sessionId, port, baudRate }) => {
  const session = sessions.get(sessionId);
  if (!session) return;
  try {
    if (session.connection) {
      if (session.type === 'serial' && session.connection.isOpen) {
        await new Promise(resolve => session.connection.close(resolve));
      } else if (session.type === 'pty') {
        session.connection.kill();
      }
    }
    
    console.log(`接続試行: ${port} @ ${baudRate}`);
    const serialPort = new SerialPort({ 
      path: port, 
      baudRate: parseInt(baudRate),
      autoOpen: true
    });
    
    serialPort.on('open', () => {
      console.log(`${port} オープン成功`);
      event.sender.send('connection-status', { sessionId, success: true, message: `${port} に接続しました` });
    });
    
    serialPort.on('data', (data) => {
      const coloredData = colorizeData(data.toString(), session, colorConfig);
      event.sender.send('terminal-data', { sessionId, data: coloredData });
    });
    
    serialPort.on('error', (err) => {
      console.error('シリアルポートエラー:', err);
      event.sender.send('connection-status', { sessionId, success: false, message: err.message });
    });
    
    session.type = 'serial';
    session.connection = serialPort;
  } catch (error) {
    console.error('接続エラー:', error);
    event.sender.send('connection-status', { sessionId, success: false, message: error.message });
  }
});

ipcMain.on('ssh-connect', (event, { sessionId, host, port, user, pass }) => {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (session.connection) {
    if (session.type === 'serial' && session.connection.isOpen) session.connection.close();
    else if (session.type === 'pty') session.connection.kill();
    else if (session.type === 'ssh') session.connection.end();
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('SSH接続成功');
    event.sender.send('connection-status', { sessionId, success: true, message: `${host}に接続しました` });
    
    conn.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        console.error('シェル起動エラー:', err);
        event.sender.send('connection-status', { sessionId, success: false, message: err.message });
        return;
      }
      
      session.stream = stream;
      
      stream.on('data', (data) => {
        const coloredData = colorizeData(data.toString(), session, colorConfig);
        event.sender.send('terminal-data', { sessionId, data: coloredData });
      });
      
      stream.on('close', () => {
        console.log('SSHストリーム切断');
        conn.end();
      });
      
      stream.stderr.on('data', (data) => {
        event.sender.send('terminal-data', { sessionId, data: data.toString() });
      });
    });
  });
  
  conn.on('error', (err) => {
    console.error('SSH接続エラー:', err);
    event.sender.send('connection-status', { sessionId, success: false, message: err.message });
  });
  
  conn.on('close', () => {
    console.log('SSH接続終了');
  });
  
  conn.connect({
    host: host,
    port: parseInt(port) || 22,
    username: user,
    password: pass,
    readyTimeout: 10000
  });
  
  session.type = 'ssh';
  session.connection = conn;
});

ipcMain.on('rlogin-connect', (event, { sessionId, host, port }) => {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (session.connection) {
    if (session.type === 'serial' && session.connection.isOpen) session.connection.close();
    else if (session.type === 'pty') session.connection.kill();
  }
  const ptyProcess = pty.spawn('powershell.exe', ['-Command', `rlogin ${host} ${port || ''}`], { 
    name: 'xterm-256color', 
    cols: 80,
    rows: 24,
    cwd: process.env.HOME, 
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
  });
  ptyProcess.onData((data) => {
    const coloredData = colorizeData(data, session, colorConfig);
    event.sender.send('terminal-data', { sessionId, data: coloredData });
  });
  session.type = 'pty';
  session.connection = ptyProcess;
});

ipcMain.handle('load-config', () => {
  colorConfig = loadConfig();
  return colorConfig;
});

ipcMain.handle('save-config', (event, config) => {
  colorConfig = config;
  return saveConfig(config);
});

ipcMain.handle('ai-request', async (event, { prompt, context, config }) => {
  try {
    const { aiModel, aiVersion, apiKey } = config;
    if (!apiKey) {
      return 'エラー: APIキーが設定されていません。';
    }
    
    const skills = loadSkillFiles();
    const vendor = detectVendor(prompt);
    let skillContext = '';
    
    if (vendor && skills[vendor]) {
      skillContext = '\n\n【参考スキル情報】\n';
      skills[vendor].forEach(skill => {
        skillContext += skill.content + '\n\n';
      });
    }
    
    let url, requestBody;
    
    if (aiModel === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${aiVersion}:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{
          parts: [{
            text: `あなたはネットワーク機器設定のエキスパートです。返信は2つのチャットに分けて、１つ目：推奨するコマンドを端的に返信。２つ目：その解説も簡単に記述。${skillContext}${context ? '\n\nターミナル出力:\n' + context + '\n\n' : ''}\n質問: ${prompt}`
          }]
        }]
      };
    } else if (aiModel === 'claude') {
      url = 'https://api.anthropic.com/v1/messages';
      requestBody = {
        model: aiVersion,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `あなたはネットワーク機器設定のエキスパートです。返信は2つのチャットに分けて、１つ目：推奨するコマンドを端的に返信。２つ目：その解説も簡単に記述。${skillContext}${context ? '\n\nターミナル出力:\n' + context + '\n\n' : ''}\n質問: ${prompt}`
        }]
      };
    } else {
      return 'エラー: サポートされていないAIモデルです。';
    }
    
    const headers = { 'Content-Type': 'application/json' };
    if (aiModel === 'claude') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log('AI API Response:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      return `エラー: ${data.error.message || JSON.stringify(data.error)}`;
    }
    
    if (aiModel === 'gemini') {
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
      }
    } else if (aiModel === 'claude') {
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      }
    }
    
    return 'エラー: AIからの応答を解析できませんでした。';
  } catch (error) {
    console.error('AI Request Error:', error);
    return `エラー: ${error.message}`;
  }
});

app.on('window-all-closed', () => {
  sessions.forEach(session => {
    if (session.connection) {
      try {
        if (session.type === 'serial' && session.connection.isOpen) {
          session.connection.close();
        } else if (session.type === 'pty') {
          session.connection.kill();
        } else if (session.type === 'ssh') {
          session.connection.end();
        }
      } catch (e) {
        console.error('クリーンアップエラー:', e);
      }
    }
  });
  app.quit();
});
