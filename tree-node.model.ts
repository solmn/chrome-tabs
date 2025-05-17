// models/tree-node.model.ts
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