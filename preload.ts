
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    loadCollections: () => ipcRenderer.invoke('load-collections'),
    saveCollection: (collection) => ipcRenderer.invoke('save-collection', collection),
    saveCollections: (collections) => ipcRenderer.invoke('save-collections', collections),
    getWorkspacePath: () => ipcRenderer.invoke('get-workspace-path')
  }
);