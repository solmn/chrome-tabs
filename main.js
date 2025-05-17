// electron/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

let mainWindow;
let workspacePath = path.join(app.getPath('userData'), 'collections');

// Ensure the collections directory exists
try {
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create collections directory:', err);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the Angular app
  if (process.env.NODE_ENV === 'development') {
    // Dev mode - load from dev server
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from built files
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// IPC handlers for collection operations
ipcMain.handle('load-collections', async () => {
  try {
    const files = fs.readdirSync(workspacePath);
    const collections = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(workspacePath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        try {
          const collection = JSON.parse(content);
          if (collection.version && collection.items) {
            collections.push(collection);
          }
        } catch (err) {
          console.error(`Error parsing collection file ${file}:`, err);
        }
      }
    }
    
    return collections;
  } catch (err) {
    console.error('Error loading collections:', err);
    return [];
  }
});

ipcMain.handle('save-collection', async (event, collection) => {
  try {
    const options = {
      title: 'Save Collection',
      defaultPath: path.join(app.getPath('downloads'), `${collection.name.toLowerCase().replace(/\s+/g, '-')}.json`),
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ]
    };
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, options);
    
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(collection, null, 2));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error saving collection:', err);
    return false;
  }
});

ipcMain.handle('save-collections', async (event, collections) => {
  try {
    for (const collection of collections) {
      const fileName = `${collection.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      const filePath = path.join(workspacePath, fileName);
      fs.writeFileSync(filePath, JSON.stringify(collection, null, 2));
    }
    return true;
  } catch (err) {
    console.error('Error saving collections:', err);
    return false;
  }
});

ipcMain.handle('get-workspace-path', () => {
  return workspacePath;
});