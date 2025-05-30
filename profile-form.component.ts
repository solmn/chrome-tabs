import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Profile } from '../../models/interfaces';

@Component({
  selector: 'app-profile-form',
  templateUrl: './profile-form.component.html'
})
export class ProfileFormComponent implements OnInit {
  @Input() profile: Profile | null = null;
  @Output() save = new EventEmitter<Profile>();
  @Output() cancel = new EventEmitter<void>();

  profileForm!: FormGroup;
  showPassword = false;
  showApiPin = false;
  isSubmitting = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      profileName: [this.profile?.profileName || '', Validators.required],
      jksFilePath: [this.profile?.jksFilePath || '', Validators.required],
      apiPin: [this.profile?.apiPin || '', Validators.required],
      password: [this.profile?.password || '', Validators.required],
      oauthEndpoint: [this.profile?.oauthEndpoint || '', [Validators.required, Validators.pattern('https?://.+')]],
      scope: [this.profile?.scope || '', Validators.required]
    });
  }

  selectJKSFile(): void {
    // In Electron, this would open a file dialog
    // For now, we'll simulate it
    if ((window as any).electronAPI) {
      (window as any).electronAPI.selectFile().then((filePath: string) => {
        if (filePath) {
          this.profileForm.patchValue({ jksFilePath: filePath });
        }
      });
    } else {
      // Fallback for web
      this.profileForm.patchValue({ jksFilePath: '/path/to/selected-keystore.jks' });
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isSubmitting = true;
      
      const profileData: Profile = {
        ...this.profile,
        ...this.profileForm.value,
        id: this.profile?.id || Date.now().toString(),
        isActive: this.profile?.isActive || false,
        isValid: true,
        isExpired: false,
        createdAt: this.profile?.createdAt || new Date(),
        updatedAt: new Date()
      };

      // Simulate async save
      setTimeout(() => {
        this.save.emit(profileData);
        this.isSubmitting = false;
      }, 1000);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}