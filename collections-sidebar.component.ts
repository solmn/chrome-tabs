// collections-sidebar.component.ts
import { Component, OnInit } from '@angular/core';
import { CollectionService } from './collection.service';
import { Collection, CollectionItem, CollectionItemType, FolderItem, HttpMethod, RequestItem } from './collection-item.model';

@Component({
  selector: 'app-collections-sidebar',
  template: `
    <div class="sidebar-container">
      <div class="sidebar-header">
        <h2>Collections</h2>
        <div class="sidebar-actions">
          <button class="icon-button" (click)="openNewCollectionDialog()" title="New Collection">
            <i class="icon-plus"></i>
          </button>
          <button class="icon-button" (click)="openImportDialog()" title="Import Collection">
            <i class="icon-upload"></i>
          </button>
        </div>
      </div>
      
      <div class="collections-list">
        <ng-container *ngFor="let collection of collections">
          <div class="collection-item">
            <div class="collection-header" (click)="toggleCollectionExpansion(collection)">
              <i [class]="collection.expanded ? 'icon-chevron-down' : 'icon-chevron-right'"></i>
              <span class="collection-name">{{ collection.name }}</span>
              <div class="collection-actions">
                <div class="dropdown">
                  <button class="icon-button dropdown-toggle" (click)="$event.stopPropagation(); toggleCollectionDropdown(collection)">
                    <i class="icon-more"></i>
                  </button>
                  <div class="dropdown-menu" [class.show]="collection.showDropdown">
                    <a class="dropdown-item" (click)="createNewRequest(collection.id, null)">
                      <i class="icon-plus"></i>
                      <span>Add Request</span>
                    </a>
                    <a class="dropdown-item" (click)="createNewFolder(collection.id, null)">
                      <i class="icon-folder"></i>
                      <span>Add Folder</span>
                    </a>
                    <a class="dropdown-item" (click)="deleteCollection(collection.id)">
                      <i class="icon-trash"></i>
                      <span>Delete</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="collection-items" *ngIf="collection.expanded">
              <app-collection-item 
                *ngFor="let item of collection.items" 
                [item]="item" 
                [collectionId]="collection.id"
                (selectItem)="onSelectItem($event)">
              </app-collection-item>
            </div>
          </div>
        </ng-container>
        
        <div class="empty-state" *ngIf="collections.length === 0">
          <i class="icon-folder-large"></i>
          <p>No collections yet</p>
          <button class="button" (click)="openNewCollectionDialog()">Create Collection</button>
        </div>
      </div>
      
      <!-- New Collection Modal -->
      <div class="modal" [class.show]="showNewCollectionModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h2>New Collection</h2>
              <button class="close-button" (click)="cancelNewCollection()">&times;</button>
            </div>
            <div class="modal-body">
              <form (submit)="submitNewCollection($event)">
                <div class="form-group">
                  <label for="collectionName">Collection Name</label>
                  <input 
                    type="text" 
                    id="collectionName" 
                    class="form-control" 
                    [(ngModel)]="newCollectionName" 
                    name="collectionName" 
                    required 
                    placeholder="My API Collection"
                    autofocus>
                </div>
                <div class="modal-footer">
                  <button type="button" class="button button-secondary" (click)="cancelNewCollection()">Cancel</button>
                  <button type="submit" class="button button-primary" [disabled]="!newCollectionName">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Import Collection Modal -->
      <div class="modal" [class.show]="showImportModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Import Collection</h2>
              <button class="close-button" (click)="cancelImport()">&times;</button>
            </div>
            <div class="modal-body">
              <p>Paste your collection JSON below:</p>
              <div class="form-group">
                <textarea 
                  class="form-control" 
                  rows="10" 
                  [(ngModel)]="importJson" 
                  placeholder='{"info": {"name": "My Collection"}, "item": []}'
                ></textarea>
              </div>
              
              <p>Or upload a collection file:</p>
              <div class="form-group">
                <input type="file" (change)="onFileSelected($event)" accept=".json">
              </div>
              
              <div *ngIf="importError" class="error-message">
                {{ importError }}
              </div>
              
              <div class="modal-footer">
                <button type="button" class="button button-secondary" (click)="cancelImport()">Cancel</button>
                <button type="button" class="button button-primary" [disabled]="!importJson" (click)="submitImport()">Import</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- New Request Modal -->
      <div class="modal" [class.show]="showNewRequestModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h2>New Request</h2>
              <button class="close-button" (click)="cancelNewRequest()">&times;</button>
            </div>
            <div class="modal-body">
              <form (submit)="submitNewRequest($event)">
                <div class="form-group request-row">
                  <div class="method-select">
                    <label for="requestMethod">Method</label>
                    <select id="requestMethod" class="form-control" [(ngModel)]="newRequest.method" name="method">
                      <option *ngFor="let method of httpMethods" [value]="method">{{ method }}</option>
                    </select>
                  </div>
                  
                  <div class="url-input">
                    <label for="requestUrl">URL</label>
                    <input 
                      type="text" 
                      id="requestUrl" 
                      class="form-control" 
                      [(ngModel)]="newRequest.url" 
                      name="url" 
                      required 
                      placeholder="https://api.example.com/endpoint">
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="requestName">Request Name</label>
                  <input 
                    type="text" 
                    id="requestName" 
                    class="form-control" 
                    [(ngModel)]="newRequest.name" 
                    name="name" 
                    required 
                    placeholder="Get Users">
                </div>
                
                <div class="modal-footer">
                  <button type="button" class="button button-secondary" (click)="cancelNewRequest()">Cancel</button>
                  <button type="submit" class="button button-primary" [disabled]="!newRequest.name || !newRequest.url">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Backdrop for modals -->
      <div class="modal-backdrop" *ngIf="showNewCollectionModal || showImportModal || showNewRequestModal" (click)="closeAllModals()"></div>
    </div>
  `,
  styles: [`
    /* Base Styles */
    .sidebar-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: #f5f5f5;
      border-right: 1px solid #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      color: #333;
    }
    
    /* Header */
    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #fff;
    }
    
    .sidebar-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    /* Button Styles */
    .icon-button {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: #555;
    }
    
    .icon-button:hover {
      background-color: #eaeaea;
      color: #333;
    }
    
    .button {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .button-primary {
      background-color: #FF6C37;
      color: white;
    }
    
    .button-primary:hover {
      background-color: #E05A2B;
    }
    
    .button-primary:disabled {
      background-color: #FFB599;
      cursor: not-allowed;
    }
    
    .button-secondary {
      background-color: #e0e0e0;
      color: #333;
    }
    
    .button-secondary:hover {
      background-color: #d0d0d0;
    }
    
    /* Collection List */
    .collections-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    
    .collection-item {
      margin-bottom: 8px;
    }
    
    .collection-header {
      display: flex;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
      user-select: none;
    }
    
    .collection-header:hover {
      background-color: #eeeeee;
    }
    
    .collection-name {
      margin-left: 8px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .collection-actions {
      visibility: hidden;
    }
    
    .collection-header:hover .collection-actions {
      visibility: visible;
    }
    
    .collection-items {
      margin-left: 24px;
    }
    
    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #757575;
      text-align: center;
      padding: 24px;
    }
    
    .icon-folder-large {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    /* Dropdown Menu */
    .dropdown {
      position: relative;
    }
    
    .dropdown-menu {
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 1000;
      display: none;
      min-width: 160px;
      padding: 8px 0;
      background-color: #fff;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    .dropdown-menu.show {
      display: block;
    }
    
    .dropdown-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      color: #333;
      text-decoration: none;
      cursor: pointer;
    }
    
    .dropdown-item:hover {
      background-color: #f5f5f5;
    }
    
    .dropdown-item i {
      margin-right: 8px;
    }
    
    /* Modal Styles */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1050;
      width: 100%;
      height: 100%;
      overflow: hidden;
      outline: 0;
      display: none;
    }
    
    .modal.show {
      display: block;
    }
    
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1040;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .modal-dialog {
      position: relative;
      width: auto;
      margin: 1.75rem auto;
      max-width: 500px;
      pointer-events: none;
      z-index: 1050;
    }
    
    .modal-content {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      pointer-events: auto;
      background-color: #fff;
      border-radius: 6px;
      outline: 0;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    }
    
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .close-button {
      padding: 0;
      background-color: transparent;
      border: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      color: #000;
      text-shadow: 0 1px 0 #fff;
      opacity: 0.5;
      cursor: pointer;
    }
    
    .close-button:hover {
      opacity: 0.75;
    }
    
    .modal-body {
      position: relative;
      flex: 1 1 auto;
      padding: 16px;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px 0 0;
      gap: 8px;
    }
    
    /* Form Styles */
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
    }
    
    .form-control {
      display: block;
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background-color: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      transition: border-color 0.15s ease-in-out;
    }
    
    .form-control:focus {
      border-color: #FF6C37;
      outline: 0;
    }
    
    textarea.form-control {
      resize: vertical;
    }
    
    .error-message {
      color: #dc3545;
      margin-top: 8px;
    }
    
    /* Request Form */
    .request-row {
      display: flex;
      gap: 8px;
    }
    
    .method-select {
      width: 120px;
      flex-shrink: 0;
    }
    
    .url-input {
      flex: 1;
    }
    
    /* Icons */
    [class^="icon-"] {
      display: inline-block;
      width: 1em;
      height: 1em;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    
    /* You would need to implement these with actual SVG icons or a web font in a real app */
    .icon-plus:before { content: "+"; }
    .icon-upload:before { content: "↑"; }
    .icon-chevron-right:before { content: "›"; }
    .icon-chevron-down:before { content: "⌄"; }
    .icon-more:before { content: "⋮"; }
    .icon-folder:before { content: "📁"; }
    .icon-trash:before { content: "🗑"; }
    .icon-folder-large:before { content: "📁"; font-size: 2em; }
  `]
})
export class CollectionsSidebarComponent implements OnInit {
  collections: any[] = []; // Use any to add UI state properties
  
  // Modal flags
  showNewCollectionModal = false;
  showImportModal = false;
  showNewRequestModal = false;
  
  // Form data
  newCollectionName = '';
  importJson = '';
  importError = '';
  
  newRequest: any = {
    name: '',
    method: HttpMethod.GET,
    url: ''
  };
  
  // Current parent folder for new requests
  currentParentId: string | null = null;
  currentCollectionId: string | null = null;
  
  httpMethods = Object.values(HttpMethod);

  constructor(private collectionService: CollectionService) {}

  ngOnInit(): void {
    this.collectionService.getCollections().subscribe(collections => {
      // Add UI state to collections
      this.collections = collections.map(collection => ({
        ...collection,
        showDropdown: false
      }));
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', this.closeDropdowns.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeDropdowns.bind(this));
  }
  
  closeDropdowns(): void {
    this.collections.forEach(collection => {
      collection.showDropdown = false;
    });
  }

  toggleCollectionExpansion(collection: any): void {
    collection.expanded = !collection.expanded;
  }
  
  toggleCollectionDropdown(collection: any): void {
    // Close all other dropdowns first
    this.collections.forEach(c => {
      if (c !== collection) {
        c.showDropdown = false;
      }
    });
    // Toggle this dropdown
    collection.showDropdown = !collection.showDropdown;
  }

  openNewCollectionDialog(): void {
    this.showNewCollectionModal = true;
  }
  
  cancelNewCollection(): void {
    this.showNewCollectionModal = false;
    this.newCollectionName = '';
  }
  
  submitNewCollection(event: Event): void {
    event.preventDefault();
    if (this.newCollectionName) {
      this.collectionService.createCollection(this.newCollectionName);
      this.showNewCollectionModal = false;
      this.newCollectionName = '';
    }
  }

  openImportDialog(): void {
    this.showImportModal = true;
  }
  
  cancelImport(): void {
    this.showImportModal = false;
    this.importJson = '';
    this.importError = '';
  }
  
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          this.importJson = e.target?.result as string;
          this.importError = '';
        } catch (err) {
          this.importError = 'Invalid file format';
        }
      };
      reader.readAsText(file);
    }
  }
  
  submitImport(): void {
    try {
      const collection = JSON.parse(this.importJson);
      // Here you would typically convert from Postman format to your format
      this.collectionService.importCollection(collection);
      this.showImportModal = false;
      this.importJson = '';
      this.importError = '';
    } catch (error) {
      this.importError = 'Invalid JSON format';
    }
  }

  createNewFolder(collectionId: string, parentFolderId: string | null): void {
    const name = prompt('Enter folder name:');
    if (name) {
      this.collectionService.createFolder(collectionId, parentFolderId, name);
    }
  }

  createNewRequest(collectionId: string, parentFolderId: string | null): void {
    this.currentCollectionId = collectionId;
    this.currentParentId = parentFolderId;
    this.newRequest = {
      name: '',
      method: HttpMethod.GET,
      url: ''
    };
    this.showNewRequestModal = true;
  }
  
  cancelNewRequest(): void {
    this.showNewRequestModal = false;
    this.newRequest = {
      name: '',
      method: HttpMethod.GET,
      url: ''
    };
  }
  
  submitNewRequest(event: Event): void {
    event.preventDefault();
    if (this.currentCollectionId && this.newRequest.name && this.newRequest.url) {
      this.collectionService.createRequest(
        this.currentCollectionId, 
        this.currentParentId, 
        this.newRequest
      );
      this.showNewRequestModal = false;
      this.newRequest = {
        name: '',
        method: HttpMethod.GET,
        url: ''
      };
    }
  }

  deleteCollection(collectionId: string): void {
    if (confirm('Are you sure you want to delete this collection?')) {
      this.collectionService.deleteCollection(collectionId);
    }
  }

  onSelectItem(item: CollectionItem): void {
    this.collectionService.selectItem(item);
  }
  
  closeAllModals(): void {
    this.showNewCollectionModal = false;
    this.showImportModal = false;
    this.showNewRequestModal = false;
  }
}

// collection-item.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CollectionItem, CollectionItemType, FolderItem, HttpMethod, RequestItem } from './collection-item.model';
import { CollectionService } from './collection.service';

@Component({
  selector: 'app-collection-item',
  template: `
    <div [ngClass]="{'item-container': true, 'selected': isSelected}">
      <!-- Folder Item -->
      <div *ngIf="item.type === 'folder'" class="item-header" (click)="toggleFolderExpansion()">
        <i [class]="(item as FolderItem).expanded ? 'icon-chevron-down' : 'icon-chevron-right'"></i>
        <i class="icon-folder"></i>
        <span class="item-name">{{ item.name }}</span>
        <div class="item-actions">
          <div class="dropdown">
            <button class="icon-button dropdown-toggle" (click)="$event.stopPropagation(); toggleDropdown()">
              <i class="icon-more"></i>
            </button>
            <div class="dropdown-menu" [class.show]="showDropdown">
              <a class="dropdown-item" (click)="createNewRequest(item.id)">
                <i class="icon-plus"></i>
                <span>Add Request</span>
              </a>
              <a class="dropdown-item" (click)="createNewFolder(item.id)">
                <i class="icon-folder"></i>
                <span>Add Folder</span>
              </a>
              <a class="dropdown-item" (click)="deleteItem()">
                <i class="icon-trash"></i>
                <span>Delete</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Request Item -->
      <div *ngIf="item.type === 'request'" class="item-header request-item" (click)="onItemSelect()">
        <div class="method-badge" [ngClass]="getMethodClass(item as RequestItem)">
          {{ (item as RequestItem).method }}
        </div>
        <span class="item-name">{{ item.name }}</span>
        <div class="item-actions">
          <div class="dropdown">
            <button class="icon-button dropdown-toggle" (click)="$event.stopPropagation(); toggleDropdown()">
              <i class="icon-more"></i>
            </button>
            <div class="dropdown-menu" [class.show]="showDropdown">
              <a class="dropdown-item" (click)="editRequest()">
                <i class="icon-edit"></i>
                <span>Edit</span>
              </a>
              <a class="dropdown-item" (click)="duplicateRequest()">
                <i class="icon-copy"></i>
                <span>Duplicate</span>
              </a>
              <a class="dropdown-item" (click)="deleteItem()">
                <i class="icon-trash"></i>
                <span>Delete</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Child items for folders -->
      <div class="nested-items" *ngIf="item.type === 'folder' && (item as FolderItem).expanded">
        <app-collection-item 
          *ngFor="let childItem of (item as FolderItem).items" 
          [item]="childItem"
          [collectionId]="collectionId"
          (selectItem)="selectItem.emit($event)">
        </app-collection-item>
      </div>
      
      <!-- Edit Request Modal -->
      <div class="modal" [class.show]="showEditModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Edit Request</h2>
              <button class="close-button" (click)="cancelEdit()">&times;</button>
            </div>
            <div class="modal-body">
              <form (submit)="submitEdit($event)" *ngIf="editingRequest">
                <div class="form-group request-row">
                  <div class="method-select">
                    <label for="editMethod">Method</label>
                    <select id="editMethod" class="form-control" [(ngModel)]="editingRequest.method" name="method">
                      <option *ngFor="let method of httpMethods" [value]="method">{{ method }}</option>
                    </select>
                  </div>
                  
                  <div class="url-input">
                    <label for="editUrl">URL</label>
                    <input 
                      type="text" 
                      id="editUrl" 
                      class="form-control" 
                      [(ngModel)]="editingRequest.url" 
                      name="url" 
                      required 
                      placeholder="https://api.example.com/endpoint">
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="editName">Request Name</label>
                  <input 
                    type="text" 
                    id="editName" 
                    class="form-control" 
                    [(ngModel)]="editingRequest.name" 
                    name="name" 
                    required 
                    placeholder="Get Users">
                </div>
                
                <div class="modal-footer">
                  <button type="button" class="button button-secondary" (click)="cancelEdit()">Cancel</button>
                  <button type="submit" class="button button-primary" 
                    [disabled]="!editingRequest.name || !editingRequest.url">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .item-container {
      margin-bottom: 2px;
    }
    
    .item-header {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
    }
    
    .item-header:hover {
      background-color: #eeeeee;
    }
    
    .selected > .item-header {
      background-color: #e3f2fd;
    }
    
    .item-name {
      margin-left: 8px;
      flex