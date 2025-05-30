const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const DATA_PATH = path.join(app.getPath('userData'), 'jwt-manager-data.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f3f4f6'
  });

  // Load the Angular app
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/jwt-manager/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for data persistence
ipcMain.handle('get-data', (event, key) => {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      return data[key] || null;
    }
    return null;
  } catch (error) {
    console.error('Error reading data:', error);
    return null;
  }
});

ipcMain.handle('set-data', (event, key, value) => {
  try {
    let data = {};
    if (fs.existsSync(DATA_PATH)) {
      data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
    data[key] = value;
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
});

ipcMain.handle('clear-data', (event, key) => {
  try {
    if (fs.existsSync(DATA_PATH)) {
      let data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      delete data[key];
      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    }
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
});

// File dialog for JKS file selection
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JKS Files', extensions: ['jks'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});