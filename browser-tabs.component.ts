// File: browser-tabs.component.ts
import { Component, Input, Output, EventEmitter, HostListener, AfterViewInit, ElementRef, ViewChild, ContentChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserTabDirective } from './browser-tab.directive';
import { HttpClient } from '@angular/common/http';

export interface TabItem {
  id: string;
  title: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: {[key: string]: string};
  response?: any;
  isLoading?: boolean;
  error?: any;
}

@Component({
  selector: 'app-browser-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './browser-tabs.component.html',
  styleUrls: ['./browser-tabs.component.scss']
})
export class BrowserTabsComponent implements AfterViewInit {
  @Input() tabs: TabItem[] = [];
  @Input() activeTabId: string | null = null;
  
  @Output() tabChange = new EventEmitter<string>();
  @Output() tabClose = new EventEmitter<string>();
  @Output() tabAdd = new EventEmitter<void>();
  @Output() requestSent = new EventEmitter<{tabId: string, response: any}>();
  
  @ViewChild('tabsContainer') tabsContainer!: ElementRef;
  
  isDragging = false;
  dragTabId: string | null = null;
  dragStartX = 0;
  tabWidth = 200;
  tabsOverflow = false;
  
  constructor(private http: HttpClient, private el: ElementRef) {}
  
  ngAfterViewInit() {
    this.checkTabsOverflow();
    setTimeout(() => this.adjustTabWidth(), 0);
  }
  
  @HostListener('window:resize')
  onResize() {
    this.checkTabsOverflow();
    this.adjustTabWidth();
  }
  
  selectTab(tabId: string, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.activeTabId = tabId;
    this.tabChange.emit(tabId);
  }
  
  closeTab(tabId: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;
    
    // If closing the active tab, activate another tab
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 1) {
        const newActiveIndex = tabIndex === this.tabs.length - 1 ? tabIndex - 1 : tabIndex + 1;
        this.activeTabId = this.tabs[newActiveIndex].id;
        this.tabChange.emit(this.activeTabId);
      } else {
        this.activeTabId = null;
      }
    }
    
    this.tabClose.emit(tabId);
    this.checkTabsOverflow();
  }
  
  addTab() {
    this.tabAdd.emit();
    setTimeout(() => {
      this.checkTabsOverflow();
      if (this.tabsContainer && this.tabsContainer.nativeElement) {
        const container = this.tabsContainer.nativeElement;
        container.scrollLeft = container.scrollWidth;
      }
    }, 0);
  }
  
  startDrag(tabId: string, event: MouseEvent) {
    this.isDragging = true;
    this.dragTabId = tabId;
    this.dragStartX = event.clientX;
    
    event.preventDefault();
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (this.isDragging && this.dragTabId) {
        const deltaX = moveEvent.clientX - this.dragStartX;
        // Implement drag logic here
      }
    };
    
    const onMouseUp = () => {
      this.isDragging = false;
      this.dragTabId = null;
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  
  private checkTabsOverflow() {
    if (!this.tabsContainer || !this.tabsContainer.nativeElement) return;
    
    const container = this.tabsContainer.nativeElement;
    this.tabsOverflow = container.scrollWidth > container.clientWidth;
  }
  
  private adjustTabWidth() {
    if (!this.tabsContainer || !this.tabsContainer.nativeElement) return;
    
    const container = this.tabsContainer.nativeElement;
    const availableWidth = container.clientWidth;
    
    // Min width per tab is 100px, max is 240px
    const minTabWidth = 100;
    const maxTabWidth = 240;
    
    if (this.tabs.length > 0) {
      // Calculate ideal tab width based on available space
      let idealWidth = availableWidth / this.tabs.length;
      
      // Clamp between min and max
      this.tabWidth = Math.min(maxTabWidth, Math.max(minTabWidth, idealWidth));
    } else {
      this.tabWidth = maxTabWidth;
    }
  }
  
  scrollLeft() {
    if (this.tabsContainer && this.tabsContainer.nativeElement) {
      const container = this.tabsContainer.nativeElement;
      container.scrollLeft -= this.tabWidth;
    }
  }
  
  scrollRight() {
    if (this.tabsContainer && this.tabsContainer.nativeElement) {
      const container = this.tabsContainer.nativeElement;
      container.scrollLeft += this.tabWidth;
    }
  }
  
  sendRequest(tab: TabItem) {
    if (!tab.url) return;
    
    tab.isLoading = true;
    tab.error = null;
    
    const options: any = {
      headers: tab.headers || {}
    };
    
    if (tab.body && (tab.method !== 'GET' && tab.method !== 'DELETE')) {
      options.body = tab.body;
    }
    
    this.http.request(tab.method || 'GET', tab.url, options)
      .subscribe({
        next: (response) => {
          tab.response = response;
          tab.isLoading = false;
          this.requestSent.emit({tabId: tab.id, response});
        },
        error: (error) => {
          tab.error = error;
          tab.isLoading = false;
        }
      });
  }
  
  private findBrowserTabsComponent() {
    // This would be implemented to find the BrowserTabsComponent instance
    // In a real implementation, you might use ViewChild or another method
    return null;
  }
}