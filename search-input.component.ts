import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-search-input',
  templateUrl: './search-input.component.html'
})
export class SearchInputComponent {
  @Input() placeholder = 'Search...';
  @Output() searchChange = new EventEmitter<string>();
  
  searchTerm = '';

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchChange.emit(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchChange.emit('');
  }
}