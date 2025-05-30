import { Injectable } from '@angular/core';
import { Profile, GeneratedToken } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private isElectron = !!(window && window.process && window.process.type);

  constructor() {}

  // Profile methods
  getProfiles(): Profile[] {
    const data = this.getData('jwt_profiles');
    return data ? JSON.parse(data) : [];
  }

  saveProfiles(profiles: Profile[]): void {
    this.setData('jwt_profiles', JSON.stringify(profiles));
  }

  // Token history methods
  getTokenHistory(): GeneratedToken[] {
    const data = this.getData('jwt_token_history');
    return data ? JSON.parse(data) : [];
  }

  saveTokenHistory(tokens: GeneratedToken[]): void {
    this.setData('jwt_token_history', JSON.stringify(tokens));
  }

  // Base storage methods
  private getData(key: string): string | null {
    if (this.isElectron) {
      // Use Electron's IPC to save to file
      return (window as any).electronAPI?.getData(key) || localStorage.getItem(key);
    }
    return localStorage.getItem(key);
  }

  private setData(key: string, value: string): void {
    if (this.isElectron) {
      // Use Electron's IPC to save to file
      (window as any).electronAPI?.setData(key, value);
    }
    localStorage.setItem(key, value);
  }

  clearData(key: string): void {
    if (this.isElectron) {
      (window as any).electronAPI?.clearData(key);
    }
    localStorage.removeItem(key);
  }
}