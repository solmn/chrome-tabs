// collection-sidebar.service.ts
import { Injectable } from '@angular/core';
import { TreeNode, CollectionFile, OpenAPIDocument } from './models/tree-node.model';

@Injectable({
  providedIn: 'root'
})
export class CollectionSidebarService {
  
  constructor() {}
  
  /**
   * Generate a unique ID for new nodes
   */
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * Find the parent node of a given node
   */
  findParentNode(node: TreeNode, nodes: TreeNode[]): TreeNode | null {
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
  
  /**
   * Check if node is a top-level folder
   */
  isTopLevelFolder(node: TreeNode | null, nodes: TreeNode[]): boolean {
    if (!node) return false;
    
    // Check if the node is a top-level folder
    return node.type === 'folder' && nodes.some(n => n.id === node.id);
  }
  
  /**
   * Traverse all nodes and apply a callback to each
   */
  traverseNodes(nodes: TreeNode[], callback: (node: TreeNode) => void): void {
    for (const node of nodes) {
      callback(node);
      if (node.children && node.children.length > 0) {
        this.traverseNodes(node.children, callback);
      }
    }
  }
  
  /**
   * Reset all editing states in the tree
   */
  resetEditingStates(nodes: TreeNode[]): void {
    this.traverseNodes(nodes, (node) => {
      node.editing = false;
      node.newItem = undefined;
    });
  }
  
  /**
   * Clean nodes for export by removing UI-specific properties
   */
  cleanNodesForExport(nodes: TreeNode[]): TreeNode[] {
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
  
  /**
   * Get CSS class for HTTP method
   */
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
  
  /**
   * Create JSON download from export data
   */
  downloadObjectAsJson(exportObj: any, exportName: string): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', exportName + '.json');
    document.body.appendChild(downloadAnchorNode); // Required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
  
  /**
   * Convert OpenAPI to Postman Collection format
   */
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
      children: [],
      description: openAPIDoc.info.description
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
  
  /**
   * Normalize HTTP method to ones supported by the component
   */
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
  
  /**
   * Generate example request body from OpenAPI schema
   */
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
}