import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Profile } from '../../models/interfaces';

@Component({
  selector: 'app-profile-card',
  templateUrl: './profile-card.component.html'
})
export class ProfileCardComponent {
  @Input() profile!: Profile;
  @Output() edit = new EventEmitter<Profile>();
  @Output() delete = new EventEmitter<Profile>();
  @Output() setActive = new EventEmitter<Profile>();

  showActions = false;

  handleCardClick(): void {
    if (!this.profile.isActive && this.profile.isValid && !this.profile.isExpired) {
      this.setActive.emit(this.profile);
    }
  }

  maskPin(pin: string): string {
    return pin.replace(/./g, '•');
  }

  getFileName(): string {
    return this.profile.jksFilePath.split('/').pop() || '';
  }

  getFilePath(): string {
    const parts = this.profile.jksFilePath.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }

  getStatusIcon(): string {
    if (this.profile.isActive) return 'check-circle';
    if (this.profile.isExpired) return 'alert-circle';
    if (!this.profile.isValid) return 'x-circle';
    return 'circle';
  }

  getStatusClass(): string {
    if (this.profile.isActive) return 'text-green-600';
    if (this.profile.isExpired) return 'text-orange-600';
    if (!this.profile.isValid) return 'text-red-600';
    return 'text-gray-500';
  }

  getStatusText(): string {
    if (this.profile.isActive) return 'Active';
    if (this.profile.isExpired) return 'Expired';
    if (!this.profile.isValid) return 'Invalid';
    return 'Inactive';
  }

  getCardGradient(): string {
    if (this.profile.isActive) return 'from-green-500 to-emerald-600';
    if (this.profile.isExpired) return 'from-orange-500 to-red-500';
    if (!this.profile.isValid) return 'from-red-500 to-pink-600';
    return 'from-slate-500 to-slate-600';
  }

  getScopes(): string[] {
    return this.profile.scope.split(' ').filter(s => s.trim());
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.profile);
    this.showActions = false;
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.profile);
    this.showActions = false;
  }

  onSetActive(event: Event): void {
    event.stopPropagation();
    this.setActive.emit(this.profile);
  }

  toggleActions(event: Event): void {
    event.stopPropagation();
    this.showActions = !this.showActions;
  }
}