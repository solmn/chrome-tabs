  onNewItemInputBlur(node: TreeNode, event: FocusEvent): void {
    // Check if the related target is the method dropdown
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.tagName === 'SELECT') {
      // If focus shifted to the dropdown, don't complete the action yet
      return;
    }
    
    // Otherwise, add the item
    this.addNewItem(node);
  }// collection-sidebar.component.ts (complete)
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { TreeNode, CollectionFile, OpenAPIDocument } from './models/tree-node.model';
import { CollectionSidebarService } from './collection-sidebar.service';

@Component({
  selector: 'app-collection-sidebar',
  templateUrl: './collection-sidebar.component.html',
  styleUrls: ['./collection-sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CdkContextMenuTrigger, 
    CdkMenu, 
    CdkMenuItem,
    CdkDrag,
    CdkDropList
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionSidebarComponent {
  @Input() set treeData(data: TreeNode[]) {
    this.nodes = data;
  }
  @Output() nodeChanged = new EventEmitter<{ action: string; node: TreeNode; parent?: TreeNode }>();
  @Output() widthChanged = new EventEmitter<number>();
  @Output() importData = new EventEmitter<CollectionFile>();
  @Output() importOpenAPIData = new EventEmitter<{ openapi: OpenAPIDocument, collection: TreeNode[] }>();
  
  @ViewChild('jsonFileInput') jsonFileInput!: ElementRef;
  @ViewChild('openapiFileInput') openapiFileInput!: ElementRef;
  @ViewChild('renameInput') renameInput!: ElementRef;
  @ViewChild('newItemInput') newItemInput!: ElementRef;
  
  nodes: TreeNode[] = [];
  activeNode: TreeNode | null = null;
  collapsed = signal(false);
  dragPlaceholder = false;
  
  // Sidebar resizing
  sidebarWidth = 256; // Default width in pixels
  minWidth = 180; // Minimum width in pixels
  maxWidth = 600; // Maximum width in pixels
  isResizing = false;
  
  constructor(public sidebarService: CollectionSidebarService) {
    // Listen for mouse move and up events for resizing
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
  }
  
  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    document.body.classList.add('cursor-col-resize');
    document.body.style.userSelect = 'none';
  }
  
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;
    
    // Calculate new width based on mouse position
    let newWidth = event.clientX;
    
    // Apply constraints
    if (newWidth < this.minWidth) newWidth = this.minWidth;
    if (newWidth > this.maxWidth) newWidth = this.maxWidth;
    
    this.sidebarWidth = newWidth;
  }
  
  onMouseUp(): void {
    if (this.isResizing) {
      this.isResizing = false;
      document.body.classList.remove('cursor-col-resize');
      document.body.style.userSelect = '';
      this.widthChanged.emit(this.sidebarWidth);
    }
  }
  
  toggleSidebar(): void {
    this.collapsed.update(state => !state);
    if (!this.collapsed()) {
      // When expanding, respect the previous width
      setTimeout(() => {
        this.widthChanged.emit(this.sidebarWidth);
      });
    } else {
      this.widthChanged.emit(64); // Collapsed width
    }
  }
  
  trackByFn(index: number, node: TreeNode): string {
    return node.id;
  }
  
  toggleExpand(node: TreeNode, event: MouseEvent): void {
    event.stopPropagation();
    if (node.type === 'folder') {
      node.expanded = !node.expanded;
      this.nodeChanged.emit({ action: 'expand', node });
    }
  }
  
  onContextMenu(event: MouseEvent, node: TreeNode): void {
    event.preventDefault();
    this.activeNode = node;
  }
  
  startRenaming(node: TreeNode | null): void {
    if (!node) return;
    
    // Close any other editing states
    this.sidebarService.resetEditingStates(this.nodes);
    
    node.editing = true;
    setTimeout(() => {
      if (this.renameInput) {
        this.renameInput.nativeElement.focus();
        this.renameInput.nativeElement.select();
      }
    });
  }
  
  finishRenaming(node: TreeNode): void {
    if (!node.name.trim()) {
      // Don't allow empty names
      node.name = 'Unnamed ' + node.type;
    }
    
    node.editing = false;
    this.nodeChanged.emit({ action: 'rename', node });
  }
  
  cancelRenaming(node: TreeNode): void {
    node.editing = false;
  }
  
  startAddingItem(node: TreeNode | null, type: 'folder' | 'request'): void {
    if (!node || node.type !== 'folder') return;
    
    // Close any other editing states
    this.sidebarService.resetEditingStates(this.nodes);
    
    // Make sure folder is expanded
    node.expanded = true;
    
    // Create new item state with default method for requests
    node.newItem = { 
      type, 
      name: '', 
      method: type === 'request' ? 'GET' : undefined
    };
    
    setTimeout(() => {
      if (this.newItemInput) {
        this.newItemInput.nativeElement.focus();
      }
    });
  }
  
  addNewItem(node: TreeNode): void {
    if (!node.newItem || !node.newItem.name.trim()) {
      node.newItem = undefined;
      return;
    }
    
    const newNode: TreeNode = {
      id: this.sidebarService.generateId(),
      type: node.newItem.type,
      name: node.newItem.name.trim() || `New ${node.newItem.type}`,
      ...(node.newItem.type === 'request' ? { 
        method: node.newItem.method || 'GET',
        url: '',
        headers: { 'Content-Type': 'application/json' }
      } : { 
        children: [], 
        expanded: false 
      })
    };
    
    if (!node.children) {
      node.children = [];
    }
    
    node.children.push(newNode);
    node.newItem = undefined;
    
    this.nodeChanged.emit({ action: 'add', node: newNode, parent: node });
  }
  
  cancelAddingItem(node: TreeNode): void {
    node.newItem = undefined;
  }
  
  deleteNode(node: TreeNode | null): void {
    if (!node) return;
    
    // Find parent node
    const parent = this.sidebarService.findParentNode(node, this.nodes);
    
    if (parent && parent.children) {
      const index = parent.children.findIndex(child => child.id === node.id);
      if (index !== -1) {
        parent.children.splice(index, 1);
        this.nodeChanged.emit({ action: 'delete', node, parent });
      }
    } else {
      // Top-level node
      const index = this.nodes.findIndex(item => item.id === node.id);
      if (index !== -1) {
        this.nodes.splice(index, 1);
        this.nodeChanged.emit({ action: 'delete', node });
      }
    }
  }
  
  drop(event: CdkDragDrop<TreeNode[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      
      const node = event.container.data[event.currentIndex];
      this.nodeChanged.emit({ action: 'reorder', node });
    }
  }
  
  isTopLevelFolder(node: TreeNode | null): boolean {
    return this.sidebarService.isTopLevelFolder(node, this.nodes);
  }
  
  // Import/Export functions
  triggerImportDialog(type: 'json' | 'openapi'): void {
    if (type === 'json') {
      this.jsonFileInput.nativeElement.click();
    } else {
      this.openapiFileInput.nativeElement.click();
    }
  }
  
  importCollection(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content) as CollectionFile;
          
          // Validate format
          if (
            importedData && 
            importedData.version && 
            importedData.name && 
            Array.isArray(importedData.items)
          ) {
            // Emit the imported data
            this.importData.emit(importedData);
            
            // Reset file input
            input.value = '';
          } else {
            alert('Invalid collection file format');
          }
        } catch (error) {
          console.error('Error parsing JSON', error);
          alert('Error importing collection: Invalid JSON format');
        }
      };
      reader.readAsText(file);
    }
  }
  
  importOpenAPI(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const content = e.target?.result as string;
          let openAPIDoc: OpenAPIDocument;
          
          // Check if YAML or JSON
          if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
            // Parse YAML - You would need to add a YAML parser library 
            // For this example, we'll assume it's JSON for simplicity
            alert('YAML parsing requires a library like js-yaml. For this example, please use JSON format.');
            input.value = '';
            return;
          } else {
            // Parse JSON
            openAPIDoc = JSON.parse(content) as OpenAPIDocument;
          }
          
          // Validate OpenAPI format
          if (
            openAPIDoc && 
            openAPIDoc.openapi && 
            openAPIDoc.info && 
            openAPIDoc.paths
          ) {
            // Convert OpenAPI to Collection
            const collection = this.sidebarService.convertOpenAPIToCollection(openAPIDoc);
            
            // Emit the imported data
            this.importOpenAPIData.emit({ 
              openapi: openAPIDoc, 
              collection 
            });
            
            // Reset file input
            input.value = '';
          } else {
            alert('Invalid OpenAPI file format');
          }
        } catch (error) {
          console.error('Error parsing OpenAPI', error);
          alert('Error importing OpenAPI: Invalid format');
        }
      };
      reader.readAsText(file);
    }
  }
  
  exportCollection(): void {
    // Create collection file structure
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: 'Postman Collection Export',
      items: this.sidebarService.cleanNodesForExport([...this.nodes]),
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON and download
    this.sidebarService.downloadObjectAsJson(collectionFile, 'postman-collection-export');
  }
  
  exportSingleCollection(node: TreeNode | null): void {
    if (!node || node.type !== 'folder') return;
    
    // Create collection file structure for a single collection
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: node.name,
      items: this.sidebarService.cleanNodesForExport([{...node}]),
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON and download
    this.sidebarService.downloadObjectAsJson(collectionFile, node.name.toLowerCase().replace(/\s+/g, '-'));
  }
  
  addNewCollection(): void {
    // Add a new top-level folder
    const newCollection: TreeNode = {
      id: this.sidebarService.generateId(),
      type: 'folder',
      name: 'New Collection',
      children: [],
      expanded: true
    };
    
    this.nodes.push(newCollection);
    this.nodeChanged.emit({ action: 'add', node: newCollection });
    
    // Start renaming the new collection
    setTimeout(() => {
      this.startRenaming(newCollection);
    }, 100);
  }
}