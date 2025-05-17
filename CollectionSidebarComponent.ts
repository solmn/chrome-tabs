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
  
  constructor() {
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
    this.resetEditingStates();
    
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
    this.resetEditingStates();
    
    // Make sure folder is expanded
    node.expanded = true;
    
    // Create new item state
    node.newItem = { 
      type, 
      name: '', 
      ...(type === 'request' ? { method: 'GET' as const } : {})
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
      id: this.generateId(),
      type: node.newItem.type,
      name: node.newItem.name.trim() || `New ${node.newItem.type}`,
      ...(node.newItem.type === 'request' ? { method: node.newItem.method || 'GET' } : { children: [], expanded: false })
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
    const parent = this.findParentNode(node);
    
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
  
  getMethodClass(method?: string): string {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800';
      case 'POST':
        return 'bg-blue-100 text-blue-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
            const collection = this.convertOpenAPIToCollection(openAPIDoc);
            
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
  
  convertOpenAPIToCollection(openAPIDoc: OpenAPIDocument): TreeNode[] {
    // Create a collection from OpenAPI specification
    const baseUrl = openAPIDoc.servers && openAPIDoc.servers.length > 0 
      ? openAPIDoc.servers[0].url 
      : '';
    
    // Create main collection folder
    const mainCollection: TreeNode = {
      id: this.generateId(),
      type: 'folder',
      name: openAPIDoc.info.title || 'API Collection',
      expanded: true,
      children: []
    };
    
    // Group endpoints by tags if available
    const tagFolders: {[tag: string]: TreeNode} = {};
    const untaggedRequests: TreeNode[] = [];
    
    // Create tag folders first if tags are defined
    if (openAPIDoc.tags && openAPIDoc.tags.length > 0) {
      openAPIDoc.tags.forEach(tag => {
        tagFolders[tag.name] = {
          id: this.generateId(),
          type: 'folder',
          name: tag.name,
          description: tag.description,
          expanded: false,
          children: []
        };
        mainCollection.children!.push(tagFolders[tag.name]);
      });
    }
    
    // Process all paths and operations
    Object.entries(openAPIDoc.paths).forEach(([path, pathItem]) => {
      // Get all HTTP methods for this path
      Object.entries(pathItem).forEach(([method, operation]) => {
        // Skip if not an HTTP method
        if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
          return;
        }
        
        // Create request node
        const requestNode: TreeNode = {
          id: this.generateId(),
          type: 'request',
          name: operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
          method: this.normalizeMethod(method.toUpperCase()),
          url: `${baseUrl}${path}`,
          description: operation.description,
          headers: {}
        };
        
        // Add request body if available
        if (operation.requestBody) {
          const contentType = Object.keys(operation.requestBody.content)[0] || 'application/json';
          requestNode.headers!['Content-Type'] = contentType;
          
          // Add example body if schema is available
          if (operation.requestBody.content[contentType]?.schema) {
            requestNode.body = this.generateExampleFromSchema(
              operation.requestBody.content[contentType].schema,
              openAPIDoc.components?.schemas
            );
          }
        }
        
        // Determine where to place this request
        if (operation.tags && operation.tags.length > 0 && tagFolders[operation.tags[0]]) {
          // Add to appropriate tag folder
          tagFolders[operation.tags[0]].children!.push(requestNode);
        } else {
          // Add to untagged list
          untaggedRequests.push(requestNode);
        }
      });
    });
    
    // If there are untagged requests, create a default folder for them
    if (untaggedRequests.length > 0) {
      const defaultFolder: TreeNode = {
        id: this.generateId(),
        type: 'folder',
        name: 'General',
        expanded: false,
        children: untaggedRequests
      };
      mainCollection.children!.push(defaultFolder);
    }
    
    return [mainCollection];
  }
  
  normalizeMethod(method: string): 'GET' | 'POST' | 'PUT' | 'DELETE' {
    switch (method) {
      case 'GET': return 'GET';
      case 'POST': return 'POST';
      case 'PUT': return 'PUT';
      case 'DELETE': return 'DELETE';
      case 'PATCH': return 'PUT'; // Map PATCH to PUT for simplicity
      case 'OPTIONS': return 'GET'; // Map OPTIONS to GET
      case 'HEAD': return 'GET'; // Map HEAD to GET
      default: return 'GET';
    }
  }
  
  generateExampleFromSchema(schema: any, schemas?: {[schema: string]: any}): any {
    if (!schema) return {};
    
    // Handle $ref
    if (schema.$ref && schemas) {
      const refName = schema.$ref.split('/').pop();
      if (refName && schemas[refName]) {
        return this.generateExampleFromSchema(schemas[refName], schemas);
      }
    }
    
    // Handle different types
    switch (schema.type) {
      case 'object':
        const result: any = {};
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
            result[propName] = this.generateExampleFromSchema(propSchema, schemas);
          });
        }
        return result;
        
      case 'array':
        if (schema.items) {
          return [this.generateExampleFromSchema(schema.items, schemas)];
        }
        return [];
        
      case 'string':
        if (schema.enum && schema.enum.length) {
          return schema.enum[0];
        }
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.format === 'email') return 'user@example.com';
        return schema.example || schema.default || 'string';
        
      case 'number':
      case 'integer':
        return schema.example || schema.default || 0;
        
      case 'boolean':
        return schema.example || schema.default || false;
        
      default:
        return schema.example || schema.default || null;
    }
  }
  
  exportCollection(): void {
    // Create collection file structure
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: 'Postman Collection Export',
      items: this.cleanNodesForExport([...this.nodes]),
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON and download
    this.downloadObjectAsJson(collectionFile, 'postman-collection-export');
  }
  
  exportSingleCollection(node: TreeNode | null): void {
    if (!node || node.type !== 'folder') return;
    
    // Create collection file structure for a single collection
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: node.name,
      items: this.cleanNodesForExport([{...node}]),
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON and download
    this.downloadObjectAsJson(collectionFile, node.name.toLowerCase().replace(/\s+/g, '-'));
  }
  
  addNewCollection(): void {
    // Add a new top-level folder
    const newCollection: TreeNode = {
      id: this.generateId(),
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
  
  isTopLevelFolder(node: TreeNode | null): boolean {
    if (!node) return false;
    
    // Check if the node is a top-level folder
    return node.type === 'folder' && this.nodes.some(n => n.id === node.id);
  }
  
  private downloadObjectAsJson(exportObj: any, exportName: string): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', exportName + '.json');
    document.body.appendChild(downloadAnchorNode); // Required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
  
  private cleanNodesForExport(nodes: TreeNode[]): TreeNode[] {
    // Create a deep copy and remove UI-specific properties
    return nodes.map(node => {
      const cleanNode: TreeNode = {
        id: node.id,
        type: node.type,
        name: node.name
      };
      
      if (node.type === 'request') {
        if (node.method) cleanNode.method = node.method;
        if (node.url) cleanNode.url = node.url;
        if (node.headers) cleanNode.headers = {...node.headers};
        if (node.body) cleanNode.body = node.body;
        if (node.description) cleanNode.description = node.description;
      }
      
      if (node.type === 'folder' && node.children) {
        cleanNode.children = this.cleanNodesForExport(node.children);
        cleanNode.expanded = node.expanded; // Keep expanded state
        if (node.description) cleanNode.description = node.description;
      }
      
      return cleanNode;
    });
  }
  
  private resetEditingStates(): void {
    // Reset any editing or new item states
    this.traverseNodes(this.nodes, (node) => {
      node.editing = false;
      node.newItem = undefined;
    });
  }
  
  private traverseNodes(nodes: TreeNode[], callback: (node: TreeNode) => void): void {
    for (const node of nodes) {
      callback(node);
      if (node.children && node.children.length > 0) {
        this.traverseNodes(node.children, callback);
      }
    }
  }
  
  private findParentNode(node: TreeNode, nodes = this.nodes): TreeNode | null {
    for (const current of nodes) {
      if (current.children && current.children.some(child => child.id === node.id)) {
        return current;
      }
      
      if (current.children && current.children.length) {
        const found = this.findParentNode(node, current.children);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}export class CollectionSidebarComponent {
  @Input() set treeData(data: TreeNode[]) {
    this.nodes = data;
  }
  @Output() nodeChanged = new EventEmitter<{ action: string; node: TreeNode; parent?: TreeNode }>();
  @Output() widthChanged = new EventEmitter<number>();
  @Output() importData = new EventEmitter<CollectionFile>();
  
  @ViewChild('fileInput') fileInput!: ElementRef;
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
  
  constructor() {
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
    this.resetEditingStates();
    
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
    this.resetEditingStates();
    
    // Make sure folder is expanded
    node.expanded = true;
    
    // Create new item state
    node.newItem = { 
      type, 
      name: '', 
      ...(type === 'request' ? { method: 'GET' as const } : {})
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
      id: this.generateId(),
      type: node.newItem.type,
      name: node.newItem.name.trim() || `New ${node.newItem.type}`,
      ...(node.newItem.type === 'request' ? { method: node.newItem.method || 'GET' } : { children: [], expanded: false })
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
    const parent = this.findParentNode(node);
    
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
  
  getMethodClass(method?: string): string {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800';
      case 'POST':
        return 'bg-blue-100 text-blue-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  // Import/Export functions
  triggerImportDialog(): void {
    this.fileInput.nativeElement.click();
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
  
  exportCollection(): void {
    // Create collection file structure
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: 'Postman Collection Export',
      items: this.cleanNodesForExport([...this.nodes]),
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON and download
    this.downloadObjectAsJson(collectionFile, 'postman-collection-export');
  }
  
  exportSingleCollection(node: TreeNode | null): void {
    if (!node || node.type !== 'folder') return;
    
    // Create collection file structure for a single collection
    const collectionFile: CollectionFile = {
      version: '1.0',
      name: node.name,
      items: this.cleanNodesForExport([{...node}]),
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON and download
    this.downloadObjectAsJson(collectionFile, node.name.toLowerCase().replace(/\s+/g, '-'));
  }
  
  addNewCollection(): void {
    // Add a new top-level folder
    const newCollection: TreeNode = {
      id: this.generateId(),
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
  
  isTopLevelFolder(node: TreeNode | null): boolean {
    if (!node) return false;
    
    // Check if the node is a top-level folder
    return node.type === 'folder' && this.nodes.some(n => n.id === node.id);
  }
  
  private downloadObjectAsJson(exportObj: any, exportName: string): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', exportName + '.json');
    document.body.appendChild(downloadAnchorNode); // Required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
  
  private cleanNodesForExport(nodes: TreeNode[]): TreeNode[] {
    // Create a deep copy and remove UI-specific properties
    return nodes.map(node => {
      const cleanNode: TreeNode = {
        id: node.id,
        type: node.type,
        name: node.name
      };
      
      if (node.type === 'request' && node.method) {
        cleanNode.method = node.method;
      }
      
      if (node.type === 'folder' && node.children) {
        cleanNode.children = this.cleanNodesForExport(node.children);
        cleanNode.expanded = node.expanded; // Keep expanded state
      }
      
      return cleanNode;
    });
  }
  
  private resetEditingStates(): void {
    // Reset any editing or new item states
    this.traverseNodes(this.nodes, (node) => {
      node.editing = false;
      node.newItem = undefined;
    });
  }
  
  private traverseNodes(nodes: TreeNode[], callback: (node: TreeNode) => void): void {
    for (const node of nodes) {
      callback(node);
      if (node.children && node.children.length > 0) {
        this.traverseNodes(node.children, callback);
      }
    }
  }
  
  private findParentNode(node: TreeNode, nodes = this.nodes): TreeNode | null {
    for (const current of nodes) {
      if (current.children && current.children.some(child => child.id === node.id)) {
        return current;
      }
      
      if (current.children && current.children.length) {
        const found = this.findParentNode(node, current.children);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}'// collection-sidebar.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

export interface TreeNode {
  id: string;
  type: 'folder' | 'request';
  name: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; // only for request
  children?: TreeNode[]; // only for folder
  expanded?: boolean; // UI state
  editing?: boolean; // UI state for rename
  newItem?: {
    type: 'folder' | 'request',
    name: string,
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  }; // UI state for adding new item
  // Additional properties for requests
  url?: string;
  headers?: {[key: string]: string};
  body?: any;
  description?: string;
}

export interface CollectionFile {
  version: string;
  name: string;
  items: TreeNode[];
  exportDate: string;
}

// OpenAPI interfaces
export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: {
        summary?: string;
        description?: string;
        operationId?: string;
        parameters?: Array<{
          name: string;
          in: string;
          description?: string;
          required?: boolean;
          schema?: any;
        }>;
        requestBody?: {
          content: {
            [contentType: string]: {
              schema: any;
            };
          };
        };
        responses?: {
          [statusCode: string]: {
            description: string;
            content?: {
              [contentType: string]: {
                schema: any;
              };
            };
          };
        };
        tags?: string[];
      };
    };
  };
  components?: {
    schemas?: {
      [schema: string]: any;
    };
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

@Component({
  selector: 'app-collection-sidebar',
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sidebar-wrapper flex h-full">
      <!-- Main Sidebar Container -->
      <div class="sidebar-container bg-gray-50 h-full overflow-auto border-r border-gray-200 flex flex-col"
           [style.width.px]="collapsed() ? 64 : sidebarWidth">
        
        <!-- Sidebar Header -->
        <div class="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 class="font-medium text-gray-800 truncate" [class.hidden]="collapsed()">Collections</h2>
          <div class="flex items-center" [class.hidden]="collapsed()">
            <button class="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 mr-1" 
                    title="Import Collection"
                    (click)="triggerImportDialog('json')">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            <button class="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 mr-1" 
                    title="Import from OpenAPI"
                    (click)="triggerImportDialog('openapi')">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button class="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 mr-1" 
                    title="Export Collection"
                    (click)="exportCollection()">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button class="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200" 
                    title="Collapse Sidebar"
                    (click)="toggleSidebar()">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <button *ngIf="collapsed()" class="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200" 
                  (click)="toggleSidebar()"
                  title="Expand Sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <!-- Tree Structure -->
        <div class="flex-1 overflow-y-auto">
          <ng-container *ngIf="!collapsed()">
            <ng-container *ngTemplateOutlet="treeTemplate; context: { nodes: nodes, level: 0 }"></ng-container>
          </ng-container>
          <div *ngIf="collapsed()" class="py-2">
            <!-- Collapsed view with just icons -->
            <div *ngFor="let node of nodes; trackBy: trackByFn" 
                 class="flex justify-center p-2 hover:bg-gray-200 cursor-pointer" 
                 [title]="node.name"
                 (click)="toggleSidebar()">
              <ng-container [ngSwitch]="node.type">
                <svg *ngSwitchCase="'folder'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <div *ngSwitchCase="'request'" [ngClass]="getMethodClass(node.method)" class="text-xs font-bold rounded px-1.5 py-0.5">
                  {{node.method}}
                </div>
              </ng-container>
            </div>
          </div>
        </div>
        
        <!-- Add New Collection Button -->
        <div *ngIf="!collapsed()" class="border-t border-gray-200 p-2">
          <button class="w-full flex items-center justify-center p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors"
                  (click)="addNewCollection()">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>New Collection</span>
          </button>
        </div>
      </div>
      
      <!-- Resizable Handle -->
      <div *ngIf="!collapsed()" 
           class="resize-handle cursor-col-resize h-full w-1 bg-gray-300 hover:bg-blue-400 active:bg-blue-500"
           (mousedown)="startResize($event)">
      </div>
    </div>
    
    <!-- Hidden File Inputs for Import -->
    <input 
      type="file" 
      #jsonFileInput 
      style="display: none" 
      accept=".json"
      (change)="importCollection($event)"
    >
    
    <input 
      type="file" 
      #openapiFileInput 
      style="display: none" 
      accept=".json,.yaml,.yml"
      (change)="importOpenAPI($event)"
    >

    <!-- Tree Node Template -->
    <ng-template #treeTemplate let-nodes="nodes" let-level="level">
      <div cdkDropList (cdkDropListDropped)="drop($event)" class="w-full">
        <div *ngFor="let node of nodes; trackBy: trackByFn" 
             cdkDrag [cdkDragData]="node"
             class="node-container"
             [class.drag-placeholder]="dragPlaceholder">
          <!-- Node Item -->
          <div class="flex items-center cursor-pointer hover:bg-gray-200 pr-2 relative" 
               [style.paddingLeft.px]="level * 12 + 8"
               [cdkContextMenuTriggerFor]="nodeMenu"
               (contextmenu)="onContextMenu($event, node)">
            
            <!-- Expand/Collapse for folders -->
            <div *ngIf="node.type === 'folder'" class="w-5 h-5 flex items-center justify-center" (click)="toggleExpand(node, $event)">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 transition-transform duration-200"
                   [class.rotate-90]="node.expanded" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div *ngIf="node.type !== 'folder'" class="w-5 h-5"></div>
            
            <!-- Icon based on type -->
            <div class="mr-2 flex items-center">
              <svg *ngIf="node.type === 'folder'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      [attr.d]="node.expanded ? 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z' : 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'" />
              </svg>
              <div *ngIf="node.type === 'request'" [ngClass]="getMethodClass(node.method)" class="text-xs font-bold rounded px-1.5 py-0.5">
                {{node.method}}
              </div>
            </div>
            
            <!-- Node Name -->
            <ng-container *ngIf="!node.editing; else editNameTemplate">
              <div class="flex-1 py-2 truncate">{{node.name}}</div>
            </ng-container>
            
            <!-- Edit Name Template -->
            <ng-template #editNameTemplate>
              <input 
                type="text" 
                class="flex-1 py-1 px-1 rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                [(ngModel)]="node.name"
                (keydown.enter)="finishRenaming(node)"
                (keydown.escape)="cancelRenaming(node)"
                (blur)="finishRenaming(node)"
                #renameInput
              >
            </ng-template>
            
            <!-- Context Menu Dots -->
            <button class="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100" 
                    [cdkContextMenuTriggerFor]="nodeMenu"
                    (click)="onContextMenu($event, node)">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
          
          <!-- New Item Input (when adding folder or request) -->
          <div *ngIf="node.newItem" 
               class="flex items-center pr-2" 
               [style.paddingLeft.px]="(level + 1) * 12 + 8">
            <div class="w-5 h-5"></div>
            <div class="mr-2">
              <svg *ngIf="node.newItem.type === 'folder'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <select *ngIf="node.newItem.type === 'request'" 
                      class="text-xs font-bold rounded px-1 py-0.5"
                      [(ngModel)]="node.newItem.method"
                      [ngClass]="getMethodClass(node.newItem.method)">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <input 
              type="text" 
              class="flex-1 py-1 px-1 rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
              [(ngModel)]="node.newItem.name"
              (keydown.enter)="addNewItem(node)"
              (keydown.escape)="cancelAddingItem(node)"
              (blur)="addNewItem(node)"
              placeholder="{{node.newItem.type === 'folder' ? 'New Folder' : 'New Request'}}"
              #newItemInput
            >
          </div>
          
          <!-- Children (for folders) -->
          <div *ngIf="node.type === 'folder' && node.expanded" class="folder-children">
            <ng-container *ngIf="node.children && node.children.length">
              <ng-container *ngTemplateOutlet="treeTemplate; context: { nodes: node.children, level: level + 1 }"></ng-container>
            </ng-container>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Context Menu -->
    <ng-template #nodeMenu>
      <div class="bg-white shadow-lg rounded-md py-1 border border-gray-200 w-40" cdkMenu>
        <button cdkMenuItem class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                (click)="startRenaming(activeNode)">
          Rename
        </button>
        <button *ngIf="activeNode?.type === 'folder'" cdkMenuItem 
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                (click)="startAddingItem(activeNode, 'folder')">
          Add Folder
        </button>
        <button *ngIf="activeNode?.type === 'folder'" cdkMenuItem 
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                (click)="startAddingItem(activeNode, 'request')">
          Add Request
        </button>
        <button *ngIf="isTopLevelFolder(activeNode)" cdkMenuItem 
                class="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100" 
                (click)="exportSingleCollection(activeNode)">
          Export
        </button>
        <button cdkMenuItem class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100" 
                (click)="deleteNode(activeNode)">
          Delete
        </button>
      </div>
    </ng-template>
  `,

    <!-- Tree Node Template -->
    <ng-template #treeTemplate let-nodes="nodes" let-level="level">
      <div cdkDropList (cdkDropListDropped)="drop($event)" class="w-full">
        <div *ngFor="let node of nodes; trackBy: trackByFn" 
             cdkDrag [cdkDragData]="node"
             class="node-container"
             [class.drag-placeholder]="dragPlaceholder">
          <!-- Node Item -->
          <div class="flex items-center cursor-pointer hover:bg-gray-200 pr-2 relative" 
               [style.paddingLeft.px]="level * 12 + 8"
               [cdkContextMenuTriggerFor]="nodeMenu"
               (contextmenu)="onContextMenu($event, node)">
            
            <!-- Expand/Collapse for folders -->
            <div *ngIf="node.type === 'folder'" class="w-5 h-5 flex items-center justify-center" (click)="toggleExpand(node, $event)">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 transition-transform duration-200"
                   [class.rotate-90]="node.expanded" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div *ngIf="node.type !== 'folder'" class="w-5 h-5"></div>
            
            <!-- Icon based on type -->
            <div class="mr-2 flex items-center">
              <svg *ngIf="node.type === 'folder'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      [attr.d]="node.expanded ? 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z' : 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'" />
              </svg>
              <div *ngIf="node.type === 'request'" [ngClass]="getMethodClass(node.method)" class="text-xs font-bold rounded px-1.5 py-0.5">
                {{node.method}}
              </div>
            </div>
            
            <!-- Node Name -->
            <ng-container *ngIf="!node.editing; else editNameTemplate">
              <div class="flex-1 py-2 truncate">{{node.name}}</div>
            </ng-container>
            
            <!-- Edit Name Template -->
            <ng-template #editNameTemplate>
              <input 
                type="text" 
                class="flex-1 py-1 px-1 rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                [(ngModel)]="node.name"
                (keydown.enter)="finishRenaming(node)"
                (keydown.escape)="cancelRenaming(node)"
                (blur)="finishRenaming(node)"
                #renameInput
              >
            </ng-template>
            
            <!-- Context Menu Dots -->
            <button class="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100" 
                    [cdkContextMenuTriggerFor]="nodeMenu"
                    (click)="onContextMenu($event, node)">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
          
          <!-- New Item Input (when adding folder or request) -->
          <div *ngIf="node.newItem" 
               class="flex items-center pr-2" 
               [style.paddingLeft.px]="(level + 1) * 12 + 8">
            <div class="w-5 h-5"></div>
            <div class="mr-2">
              <svg *ngIf="node.newItem.type === 'folder'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <select *ngIf="node.newItem.type === 'request'" 
                      class="text-xs font-bold rounded px-1 py-0.5"
                      [(ngModel)]="node.newItem.method"
                      [ngClass]="getMethodClass(node.newItem.method)">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <input 
              type="text" 
              class="flex-1 py-1 px-1 rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
              [(ngModel)]="node.newItem.name"
              (keydown.enter)="addNewItem(node)"
              (keydown.escape)="cancelAddingItem(node)"
              (blur)="addNewItem(node)"
              placeholder="{{node.newItem.type === 'folder' ? 'New Folder' : 'New Request'}}"
              #newItemInput
            >
          </div>
          
          <!-- Children (for folders) -->
          <div *ngIf="node.type === 'folder' && node.expanded" class="folder-children">
            <ng-container *ngIf="node.children && node.children.length">
              <ng-container *ngTemplateOutlet="treeTemplate; context: { nodes: node.children, level: level + 1 }"></ng-container>
            </ng-container>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- Context Menu -->
    <ng-template #nodeMenu>
      <div class="bg-white shadow-lg rounded-md py-1 border border-gray-200 w-40" cdkMenu>
        <button cdkMenuItem class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                (click)="startRenaming(activeNode)">
          Rename
        </button>
        <button *ngIf="activeNode?.type === 'folder'" cdkMenuItem 
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                (click)="startAddingItem(activeNode, 'folder')">
          Add Folder
        </button>
        <button *ngIf="activeNode?.type === 'folder'" cdkMenuItem 
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                (click)="startAddingItem(activeNode, 'request')">
          Add Request
        </button>
        <button cdkMenuItem class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100" 
                (click)="deleteNode(activeNode)">
          Delete
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .sidebar-wrapper {
      position: relative;
    }
    
    .sidebar-container {
      min-width: 64px;
      max-width: 600px;
      transition: width 0.2s ease;
    }
    
    .resize-handle {
      cursor: col-resize;
      transition: background-color 0.2s ease;
      user-select: none;
    }
    
    .node-container {
      @apply relative mb-0.5 hover:bg-gray-200 group;
      transition: all 0.2s ease;
    }
    
    .folder-children {
      @apply overflow-hidden;
      animation: expandAnimation 0.3s ease-out;
    }
    
    @keyframes expandAnimation {
      from { max-height: 0; }
      to { max-height: 1000px; }
    }
    
    .drag-placeholder {
      @apply border-dotted border-2 border-blue-300 bg-blue-50;
      min-height: 20px;
    }
  `]
})
export class CollectionSidebarComponent {
  @Input() set treeData(data: TreeNode[]) {
    this.nodes = data;
  }
  @Output() nodeChanged = new EventEmitter<{ action: string; node: TreeNode; parent?: TreeNode }>();
  @Output() widthChanged = new EventEmitter<number>();
  
  nodes: TreeNode[] = [];
  activeNode: TreeNode | null = null;
  collapsed = signal(false);
  dragPlaceholder = false;
  
  // Sidebar resizing
  sidebarWidth = 256; // Default width in pixels
  minWidth = 180; // Minimum width in pixels
  maxWidth = 600; // Maximum width in pixels
  isResizing = false;
  
  // Used to focus on input elements when they appear
  newItemInput: any;
  renameInput: any;
  
  constructor() {
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
    this.resetEditingStates();
    
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
    this.resetEditingStates();
    
    // Make sure folder is expanded
    node.expanded = true;
    
    // Create new item state
    node.newItem = { 
      type, 
      name: '', 
      ...(type === 'request' ? { method: 'GET' as const } : {})
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
      id: this.generateId(),
      type: node.newItem.type,
      name: node.newItem.name.trim() || `New ${node.newItem.type}`,
      ...(node.newItem.type === 'request' ? { method: node.newItem.method || 'GET' } : { children: [], expanded: false })
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
    const parent = this.findParentNode(node);
    
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
  
  getMethodClass(method?: string): string {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800';
      case 'POST':
        return 'bg-blue-100 text-blue-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  private resetEditingStates(): void {
    // Reset any editing or new item states
    this.traverseNodes(this.nodes, (node) => {
      node.editing = false;
      node.newItem = undefined;
    });
  }
  
  private traverseNodes(nodes: TreeNode[], callback: (node: TreeNode) => void): void {
    for (const node of nodes) {
      callback(node);
      if (node.children && node.children.length > 0) {
        this.traverseNodes(node.children, callback);
      }
    }
  }
  
  private findParentNode(node: TreeNode, nodes = this.nodes): TreeNode | null {
    for (const current of nodes) {
      if (current.children && current.children.some(child => child.id === node.id)) {
        return current;
      }
      
      if (current.children && current.children.length) {
        const found = this.findParentNode(node, current.children);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}