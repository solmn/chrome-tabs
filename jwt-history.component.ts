import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { GeneratedToken } from '../../models/interfaces';
import { JwtService } from '../../services/jwt.service';

@Component({
  selector: 'app-jwt-history',
  templateUrl: './jwt-history.component.html'
})
export class JwtHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tokenHistory: GeneratedToken[] = [];
  filteredHistory: GeneratedToken[] = [];
  sortBy = 'generatedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterStatus: 'all' | 'valid' | 'expired' = 'all';
  searchTerm = '';

  constructor(private jwtService: JwtService) {}

  ngOnInit(): void {
    // Update token expiry status periodically
    setInterval(() => {
      this.jwtService.updateTokenExpiry();
    }, 60000); // Check every minute

    this.jwtService.tokenHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe(history => {
        this.tokenHistory = history;
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.tokenHistory];

    // Apply status filter
    if (this.filterStatus === 'valid') {
      filtered = filtered.filter(t => !t.isExpired);
    } else if (this.filterStatus === 'expired') {
      filtered = filtered.filter(t => t.isExpired);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(token =>
        token.profileName.toLowerCase().includes(term) ||
        token.token.toLowerCase().includes(term) ||
        token.scope.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[this.sortBy as keyof GeneratedToken];
      let bVal: any = b[this.sortBy as keyof GeneratedToken];
      
      // Convert dates to timestamps for comparison
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      
      const order = this.sortOrder === 'asc' ? 1 : -1;
      
      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });

    this.filteredHistory = filtered;
  }

  clearHistory(): void {
    if (confirm('Are you sure you want to clear all token history?')) {
      this.jwtService.clearHistory();
    }
  }

  copyToken(token: GeneratedToken): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(token.token);
    }
  }

  getExpiryStatus(token: GeneratedToken): string {
    if (token.isExpired) return 'Expired';
    
    const now = new Date();
    const timeDiff = new Date(token.expiresAt).getTime() - now.getTime();
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes % 60}m`;
    } else {
      return `Expires in ${minutes}m`;
    }
  }

  getTokenPreview(token: string): { start: string, end: string } {
    return {
      start: token.substring(0, 50),
      end: token.substring(token.length - 20)
    };
  }
}