// File: rest-api-client.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserTabsComponent, TabItem } from './browser-tabs.component';
import { BrowserTabDirective } from './browser-tab.directive';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-rest-api-client',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, BrowserTabsComponent, BrowserTabDirective],
  template: `
    <div class="rest-api-client">
      <app-browser-tabs 
        [tabs]="tabs" 
        [activeTabId]="activeTabId"
        (tabChange)="onTabChange($event)"
        (tabClose)="onTabClose($event)"
        (tabAdd)="onTabAdd()"
        (requestSent)="onRequestSent($event)"
      >
        <ng-container *ngFor="let tab of tabs">
          <div class="tab-panel" *ngIf="tab.id === activeTabId">
            <div class="request-panel">
              <div class="url-bar">
                <select [(ngModel)]="tab.method" class="method-select">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input type="text" [(ngModel)]="tab.url" placeholder="Enter URL" class="url-input">
                <button (click)="sendRequest(tab)" class="send-button" [disabled]="!tab.url">Send</button>
              </div>
              
              <div class="request-config">
                <div class="config-tabs">
                  <button class="config-tab" [class.active]="tab.configTab === 'headers'" (click)="tab.configTab = 'headers'">Headers</button>
                  <button class="config-tab" [class.active]="tab.configTab === 'body'" (click)="tab.configTab = 'body'">Body</button>
                </div>
                
                <div class="config-content">
                  <div *ngIf="tab.configTab === 'headers'" class="headers-editor">
                    <div *ngFor="let header of getHeadersArray(tab); let i = index" class="header-row">
                      <input type="text" [(ngModel)]="header.key" placeholder="Header name" class="header-key">
                      <input type="text" [(ngModel)]="header.value" placeholder="Value" class="header-value">
                      <button (click)="removeHeader(tab, i)" class="remove-header">×</button>
                    </div>
                    <button (click)="addHeader(tab)" class="add-header">Add Header</button>
                  </div>
                  
                  <div *ngIf="tab.configTab === 'body'" class="body-editor">
                    <textarea [(ngModel)]="tab.bodyText" placeholder="Request body" class="body-textarea"></textarea>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="response-panel">
              <div class="response-header">
                <span class="response-title">Response</span>
                <span *ngIf="tab.isLoading" class="response-loading">Loading...</span>
                <span *ngIf="tab.response && !tab.isLoading" class="response-status">Status: {{ tab.responseStatus }}</span>
              </div>
              
              <div class="response-body">
                <pre *ngIf="tab.response">{{ getFormattedResponse(tab) }}</pre>
                <div *ngIf="tab.error" class="response-error">{{ tab.error.message }}</div>
              </div>
            </div>
          </div>
        </ng-container>
      </app-browser-tabs>
    </div>
  `,
  styles: [`
    .rest-api-client {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .tab-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .request-panel {
      flex: 0 0 auto;
      padding: 16px;
      border-bottom: 1px solid #dee1e6;
    }
    
    .url-bar {
      display: flex;
      margin-bottom: 16px;
    }
    
    .method-select {
      width: 100px;
      height: 36px;
      border: 1px solid #dee1e6;
      border-radius: 4px 0 0 4px;
      padding: 0 8px;
      font-size: 14px;
      background-color: #f8f9fa;
    }
    
    .url-input {
      flex: 1;
      height: 36px;
      border: 1px solid #dee1e6;
      border-left: none;
      border-right: none;
      padding: 0 12px;
      font-size: 14px;
    }
    
    .send-button {
      width: 80px;
      height: 36px;
      border: 1px solid #dee1e6;
      border-radius: 0 4px 4px 0;
      background-color: #1a73e8;
      color: white;
      font-size: 14px;
      cursor: pointer;
      
      &:disabled {
        background-color: #b3d1ff;
        cursor: default;
      }
    }
    
    .request-config {
      border: 1px solid #dee1e6;
      border-radius: 4px;
    }
    
    .config-tabs {
      display: flex;
      border-bottom: 1px solid #dee1e6;
    }
    
    .config-tab {
      padding: 8px 16px;
      border: none;
      background: none;
      font-size: 14px;
      cursor: pointer;
      
      &.active {
        border-bottom: 2px solid #1a73e8;
        color: #1a73e8;
        font-weight: 500;
      }
    }
    
    .config-content {
      padding: 16px;
    }
    
    .headers-editor {
      .header-row {
        display: flex;
        margin-bottom: 8px;
      }
      
      .header-key, .header-value {
        height: 32px;
        padding: 0 8px;
        border: 1px solid #dee1e6;
        font-size: 14px;
      }
      
      .header-key {
        width: 30%;
        border-radius: 4px 0 0 4px;
      }
      
      .header-value {
        flex: 1;
        border-left: none;
        border-radius: 0;
      }
      
      .remove-header {
        width: 32px;
        height: 32px;
        border: 1px solid #dee1e6;
        border-left: none;
        border-radius: 0 4px 4px 0;
        background: none;
        font-size: 18px;
        cursor: pointer;
        
        &:hover {
          background-color: #f8f9fa;
        }
      }
      
      .add-header {
        margin-top: 8px;
        padding: 6px 12px;
        border: 1px solid #dee1e6;
        border-radius: 4px;
        background-color: #f8f9fa;
        font-size: 14px;
        cursor: pointer;
        
        &:hover {
          background-color: #e8eaed;
        }
      }
    }
    
    .body-editor {
      .body-textarea {
        width: 100%;
        min-height: 150px;
        padding: 8px;
        border: 1px solid #dee1e6;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
        resize: vertical;
      }
    }
    
    .response-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
      overflow: hidden;
    }
    
    .response-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .response-title {
      font-size: 16px;
      font-weight: 500;
      margin-right: 16px;
    }
    
    .response-loading {
      color: #5f6368;
      font-style: italic;
    }
    
    .response-status {
      font-size: 14px;
      color: #1a73e8;
    }
    
    .response-body {
      flex: 1;
      overflow: auto;
      background-color: #f8f9fa;
      border: 1px solid #dee1e6;
      border-radius: 4px;
      padding: 16px;
      font-family: monospace;
      font-size: 14px;
    }
    
    .response-error {
      color: #d93025;
    }
  `]
})
export class RestApiClientComponent implements OnInit {
  tabs: (TabItem & { configTab: string, bodyText: string, responseStatus?: number, headers: { key: string, value: string }[] })[] = [];
  activeTabId: string | null = null;
  
  ngOnInit() {
    this.addTab();
  }
  
  onTabChange(tabId: string) {
    this.activeTabId = tabId;
  }
  
  onTabClose(tabId: string) {
    this.tabs = this.tabs.filter(tab => tab.id !== tabId);
    if (this.tabs.length === 0) {
      this.addTab();
    }
  }
  
  onTabAdd() {
    this.addTab();
  }
  
  addTab() {
    const id = uuidv4();
    this.tabs.push({
      id,
      title: 'New Tab',
      url: '',
      method: 'GET',
      configTab: 'headers',
      bodyText: '',
      headers: [],
      isLoading: false
    });
    this.activeTabId = id;
  }
  
  sendRequest(tab: TabItem & { bodyText: string }) {
    if (!tab.url) return;
    
    tab.isLoading = true;
    tab.error = null;
    
    try {
      // Parse headers
      const headers: {[key: string]: string} = {};
      (tab as any).headers.forEach((h: { key: string, value: string }) => {
        if (h.key && h.value) {
          headers[h.key] = h.value;
        }
      });
      
      // Parse body
      let body = null;
      if (tab.bodyText && tab.method !== 'GET' && tab.method !== 'DELETE') {
        try {
          body = JSON.parse(tab.bodyText);
        } catch {
          body = tab.bodyText;
        }
      }
      
      // Update tab
      tab.headers = headers;
      tab.body = body;
      
      // Use the BrowserTabsComponent to send the request
      const browserTabsComponent = this.findBrowserTabsComponent();
      if (browserTabsComponent) {
        browserTabsComponent.sendRequest(tab);
      }
    } catch (error) {
      tab.error = error;
      tab.isLoading = false;
    }
  }
  
  onRequestSent(event: {tabId: string, response: any}) {
    const tab = this.tabs.find(t => t.id === event.tabId);
    if (tab) {
      tab.response = event.response;
      tab.responseStatus = 200; // This would be set from the actual response in a real implementation
    }
  }
  
  getHeadersArray(tab: any) {
    if (!tab.headers) {
      tab.headers = [];
    }
    return tab.headers;
  }
  
  addHeader(tab: any) {
    if (!tab.headers) {
      tab.headers = [];
    }
    tab.headers.push({ key: '', value: '' });
  }
  
  removeHeader(tab: any, index: number) {
    tab.headers.splice(index, 1);
  }
  
  getFormattedResponse(tab: any) {
    try {
      return JSON.stringify(tab.response, null, 2);
    } catch {
      return tab.response;
    }
  }