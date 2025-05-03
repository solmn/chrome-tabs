// File: browser-tab.directive.ts
import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appBrowserTab]',
  standalone: true
})
export class BrowserTabDirective implements OnChanges {
  @Input() isActive = false;
  @Input() tabIndex = 0;
  
  constructor(private el: ElementRef, private renderer: Renderer2) {}
  
  ngOnChanges() {
    // Set position
    this.renderer.setStyle(this.el.nativeElement, 'z-index', this.isActive ? 10 : (10 - this.tabIndex));
    
    // Set active state
    if (this.isActive) {
      this.renderer.addClass(this.el.nativeElement, 'active');
    } else {
      this.renderer.removeClass(this.el.nativeElement, 'active');
    }
  }
}