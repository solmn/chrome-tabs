import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Profile } from '../models/interfaces';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private profilesSubject = new BehaviorSubject<Profile[]>([]);
  public profiles$ = this.profilesSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadProfiles();
  }

  private loadProfiles(): void {
    const profiles = this.storageService.getProfiles();
    this.profilesSubject.next(profiles);
  }

  getProfiles(): Observable<Profile[]> {
    return this.profiles$;
  }

  getActiveProfile(): Profile | undefined {
    return this.profilesSubject.value.find(p => p.isActive);
  }

  getValidProfiles(): Profile[] {
    return this.profilesSubject.value.filter(p => p.isValid && !p.isExpired);
  }

  addProfile(profile: Profile): void {
    const profiles = [...this.profilesSubject.value, profile];
    this.updateProfiles(profiles);
  }

  updateProfile(profile: Profile): void {
    const profiles = this.profilesSubject.value.map(p => 
      p.id === profile.id ? profile : p
    );
    this.updateProfiles(profiles);
  }

  deleteProfile(id: string): void {
    const profiles = this.profilesSubject.value.filter(p => p.id !== id);
    this.updateProfiles(profiles);
  }

  setActiveProfile(id: string): void {
    const profiles = this.profilesSubject.value.map(p => ({
      ...p,
      isActive: p.id === id
    }));
    this.updateProfiles(profiles);
  }

  private updateProfiles(profiles: Profile[]): void {
    this.profilesSubject.next(profiles);
    this.storageService.saveProfiles(profiles);
  }
}