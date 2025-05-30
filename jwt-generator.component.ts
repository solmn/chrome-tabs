import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Profile, GeneratedToken } from '../../models/interfaces';
import { ProfileService } from '../../services/profile.service';
import { JwtService } from '../../services/jwt.service';

@Component({
  selector: 'app-jwt-generator',
  templateUrl: './jwt-generator.component.html'
})
export class JwtGeneratorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  profiles: Profile[] = [];
  validProfiles: Profile[] = [];
  selectedProfileId = '';
  selectedScope = '';
  isGenerating = false;
  generatedToken: GeneratedToken | null = null;
  error: string | null = null;
  searchTerm = '';
  showDropdown = false;

  constructor(
    private profileService: ProfileService,
    private jwtService: JwtService
  ) {}

  ngOnInit(): void {
    this.profileService.profiles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profiles => {
        this.profiles = profiles;
        this.validProfiles = profiles.filter(p => p.isValid && !p.isExpired);
        
        // Auto-select active profile if available
        const activeProfile = profiles.find(p => p.isActive);
        if (activeProfile && this.validProfiles.includes(activeProfile)) {
          this.selectedProfileId = activeProfile.id;
          const scopes = activeProfile.scope.split(' ').filter(s => s.trim());
          if (scopes.length > 0) {
            this.selectedScope = scopes[0];
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedProfile(): Profile | undefined {
    return this.profiles.find(p => p.id === this.selectedProfileId);
  }

  get availableScopes(): string[] {
    return this.selectedProfile?.scope.split(' ').filter(s => s.trim()) || [];
  }

  get filteredValidProfiles(): Profile[] {
    if (!this.searchTerm.trim()) {
      return this.validProfiles;
    }
    
    const term = this.searchTerm.toLowerCase();
    return this.validProfiles.filter(profile =>
      profile.profileName.toLowerCase().includes(term) ||
      profile.oauthEndpoint.toLowerCase().includes(term) ||
      profile.scope.toLowerCase().includes(term)
    );
  }

  handleSearch(term: string): void {
    this.searchTerm = term;
    this.showDropdown = true;
  }

  selectProfile(profile: Profile): void {
    this.selectedProfileId = profile.id;
    this.showDropdown = false;
    this.searchTerm = '';
    
    const scopes = profile.scope.split(' ').filter(s => s.trim());
    if (scopes.length > 0) {
      this.selectedScope = scopes[0];
    }
  }

  generateToken(): void {
    const profile = this.selectedProfile;
    if (!profile || !this.selectedScope) return;

    this.isGenerating = true;
    this.error = null;

    // Simulate async token generation
    setTimeout(() => {
      try {
        this.generatedToken = this.jwtService.generateToken(
          profile.id,
          profile.profileName,
          profile.apiPin,
          profile.oauthEndpoint,
          this.selectedScope
        );
        this.error = null;
      } catch (err) {
        this.error = 'Failed to generate JWT token';
        this.generatedToken = null;
      } finally {
        this.isGenerating = false;
      }
    }, 2000);
  }

  copyToken(): void {
    if (this.generatedToken && navigator.clipboard) {
      navigator.clipboard.writeText(this.generatedToken.token);
    }
  }

  getExpiryStatus(): string {
    if (!this.generatedToken) return '';
    
    const now = new Date();
    const timeDiff = new Date(this.generatedToken.expiresAt).getTime() - now.getTime();
    
    if (timeDiff <= 0) return 'Expired';
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes % 60}m`;
    } else {
      return `Expires in ${minutes}m`;
    }
  }

  clearSelection(): void {
    this.selectedProfileId = '';
    this.selectedScope = '';
    this.showDropdown = true;
  }
}