import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Profile } from '../../models/interfaces';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile-list',
  templateUrl: './profile-list.component.html'
})
export class ProfileListComponent implements OnInit {
  profiles$: Observable<Profile[]>;
  filteredProfiles: Profile[] = [];
  showForm = false;
  editingProfile: Profile | null = null;
  showDeleteConfirmation = false;
  profileToDelete: Profile | null = null;

  constructor(private profileService: ProfileService) {
    this.profiles$ = this.profileService.profiles$;
  }

  ngOnInit(): void {
    this.profiles$.subscribe(profiles => {
      this.filteredProfiles = profiles;
    });
  }

  onSearch(searchTerm: string): void {
    this.profiles$.subscribe(profiles => {
      if (!searchTerm.trim()) {
        this.filteredProfiles = profiles;
        return;
      }

      const term = searchTerm.toLowerCase();
      this.filteredProfiles = profiles.filter(profile =>
        profile.profileName.toLowerCase().includes(term) ||
        profile.oauthEndpoint.toLowerCase().includes(term) ||
        profile.scope.toLowerCase().includes(term)
      );
    });
  }

  openCreateForm(): void {
    this.editingProfile = null;
    this.showForm = true;
  }

  openEditForm(profile: Profile): void {
    this.editingProfile = profile;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingProfile = null;
  }

  handleSave(profileData: Profile): void {
    if (this.editingProfile) {
      this.profileService.updateProfile(profileData);
    } else {
      this.profileService.addProfile(profileData);
    }
    this.closeForm();
  }

  confirmDelete(profile: Profile): void {
    this.profileToDelete = profile;
    this.showDeleteConfirmation = true;
  }

  handleDelete(): void {
    if (this.profileToDelete) {
      this.profileService.deleteProfile(this.profileToDelete.id);
      this.showDeleteConfirmation = false;
      this.profileToDelete = null;
    }
  }

  handleSetActive(profile: Profile): void {
    this.profileService.setActiveProfile(profile.id);
  }

  getStatusIcon(profile: Profile): string {
    if (profile.isActive) return 'check-circle';
    if (profile.isExpired) return 'alert-circle';
    if (!profile.isValid) return 'x-circle';
    return 'circle';
  }

  getStatusClass(profile: Profile): string {
    if (profile.isActive) return 'text-green-600';
    if (profile.isExpired) return 'text-orange-600';
    if (!profile.isValid) return 'text-red-600';
    return 'text-gray-500';
  }

  getStatusText(profile: Profile): string {
    if (profile.isActive) return 'Active';
    if (profile.isExpired) return 'Expired';
    if (!profile.isValid) return 'Invalid';
    return 'Inactive';
  }

  getCardGradient(profile: Profile): string {
    if (profile.isActive) return 'from-green-500 to-emerald-600';
    if (profile.isExpired) return 'from-orange-500 to-red-500';
    if (!profile.isValid) return 'from-red-500 to-pink-600';
    return 'from-slate-500 to-slate-600';
  }
}