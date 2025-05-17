// collection-storage.service.ts
import { Injectable } from '@angular/core';
import { CollectionFile, TreeNode } from './collection-sidebar.component';
import { BehaviorSubject, Observable } from 'rxjs';

// This allows us to access Electron APIs safely
declare global {
  interface Window {
    electronAPI?: {
      loadCollections: () => Promise<CollectionFile[]>;
      saveCollection: (collection: CollectionFile) => Promise<void>;
      saveCollections: (collections: CollectionFile[]) => Promise<void>;
      getWorkspacePath: () => Promise<string>;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class CollectionStorageService {
  private collectionsSubject = new BehaviorSubject<TreeNode[]>([]);
  private _isElectron = false;
  private _lastLoadedWorkspace = '';
  
  constructor() {
    // Check if running in Electron
    this._isElectron = !!(window && window.electronAPI);
  }
  
  get collections$(): Observable<TreeNode[]> {
    return this.collectionsSubject.asObservable();
  }
  
  get isElectron(): boolean {
    return this._isElectron;
  }
  
  get lastLoadedWorkspace(): string {
    return this._lastLoadedWorkspace;
  }
  
  /**
   * Load collections from the filesystem (in Electron) or localStorage (in browser)
   */
  async loadCollections(): Promise<TreeNode[]> {
    let loadedCollections: TreeNode[] = [];
    
    if (this.isElectron && window.electronAPI) {
      try {
        // Load collections via Electron IPC
        const collections = await window.electronAPI.loadCollections();
        
        // Get workspace path for display
        this._lastLoadedWorkspace = await window.electronAPI.getWorkspacePath();
        
        // Extract and flatten all items
        loadedCollections = collections.flatMap(collection => collection.items);
      } catch (error) {
        console.error('Error loading collections from Electron:', error);
      }
    } else {
      // When running in browser, use localStorage as fallback
      try {
        const savedCollections = localStorage.getItem('collections');
        if (savedCollections) {
          const parsed = JSON.parse(savedCollections) as CollectionFile[];
          loadedCollections = parsed.flatMap(collection => collection.items);
        }
      } catch (error) {
        console.error('Error loading collections from localStorage:', error);
      }
    }
    
    // Update the collections subject
    this.collectionsSubject.next(loadedCollections);
    return loadedCollections;
  }
  
  /**
   * Save collections to the filesystem (in Electron) or localStorage (in browser)
   */
  async saveCollections(collections: TreeNode[]): Promise<void> {
    // Create a collection file wrapper
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: 'Workspace Collections',
      items: collections,
      exportDate: new Date().toISOString()
    };
    
    if (this.isElectron && window.electronAPI) {
      try {
        // Save via Electron IPC
        await window.electronAPI.saveCollections([collectionFile]);
      } catch (error) {
        console.error('Error saving collections via Electron:', error);
      }
    } else {
      // When running in browser, use localStorage as fallback
      try {
        localStorage.setItem('collections', JSON.stringify([collectionFile]));
      } catch (error) {
        console.error('Error saving collections to localStorage:', error);
      }
    }
  }
  
  /**
   * Save a single collection to a file
   */
  async exportCollection(collection: TreeNode): Promise<void> {
    if (!collection) return;
    
    // Create a collection file wrapper
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: collection.name,
      items: [collection],
      exportDate: new Date().toISOString()
    };
    
    if (this.isElectron && window.electronAPI) {
      try {
        // Save via Electron IPC
        await window.electronAPI.saveCollection(collectionFile);
      } catch (error) {
        console.error('Error exporting collection via Electron:', error);
      }
    } else {
      // In browser, trigger a download
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(collectionFile, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', `${collection.name.toLowerCase().replace(/\s+/g, '-')}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }
}