// jwt-profiles.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface JwtProfile {
  id: number;
  name: string;
  jksPath: string;
  password: string;
  oauthEndpoint: string;
  scope: string;
  appPin: string;
}

@Component({
  selector: 'app-jwt-profiles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './jwt-profiles.component.html',
  styleUrls: ['./jwt-profiles.component.css']
})
export class JwtProfilesComponent implements OnInit {
  profiles: JwtProfile[] = [
    { 
      id: 1, 
      name: 'Development API', 
      jksPath: '/path/to/dev.jks', 
      password: '••••••••',
      oauthEndpoint: 'https://dev-api.example.com/oauth/token',
      scope: 'openid profile email',
      appPin: '1234'
    },
    { 
      id: 2, 
      name: 'Staging API', 
      jksPath: '/path/to/staging.jks', 
      password: '••••••••',
      oauthEndpoint: 'https://staging-api.example.com/oauth/token',
      scope: 'openid profile',
      appPin: '5678'
    },
    { 
      id: 3, 
      name: 'Production API', 
      jksPath: '/path/to/prod.jks', 
      password: '••••••••',
      oauthEndpoint: 'https://api.example.com/oauth/token',
      scope: 'openid profile admin',
      appPin: '9012'
    }
  ];
  
  selectedProfileId: number | null = null;
  selectedProfile: JwtProfile | null = null;
  isEditing = false;
  isCreating = false;
  profileForm: FormGroup;
  
  constructor(private fb: FormBuilder) {
    this.profileForm = this.createProfileForm();
  }
  
  ngOnInit(): void {
    // Initialize with first profile selected if available
    if (this.profiles.length > 0) {
      this.selectProfile(this.profiles[0].id);
    }
  }
  
  createProfileForm(): FormGroup {
    return this.fb.group({
      id: [null],
      name: ['', Validators.required],
      jksPath: ['', Validators.required],
      password: ['', Validators.required],
      oauthEndpoint: ['', Validators.required],
      scope: [''],
      appPin: ['']
    });
  }
  
  selectProfile(id: number): void {
    this.selectedProfileId = id;
    this.selectedProfile = this.profiles.find(p => p.id === id) || null;
    this.isEditing = false;
    this.isCreating = false;
  }
  
  createNewProfile(): void {
    this.selectedProfileId = null;
    this.selectedProfile = null;
    this.isEditing = false;
    this.isCreating = true;
    this.profileForm.reset();
  }
  
  editProfile(): void {
    if (this.selectedProfile) {
      this.profileForm.setValue({
        id: this.selectedProfile.id,
        name: this.selectedProfile.name,
        jksPath: this.selectedProfile.jksPath,
        password: this.selectedProfile.password,
        oauthEndpoint: this.selectedProfile.oauthEndpoint,
        scope: this.selectedProfile.scope,
        appPin: this.selectedProfile.appPin
      });
      this.isEditing = true;
      this.isCreating = false;
    }
  }
  
  cancelEdit(): void {
    if (this.isCreating) {
      // If we were creating a new profile, return to the previously selected profile
      if (this.profiles.length > 0) {
        this.selectProfile(this.profiles[0].id);
      } else {
        this.selectedProfileId = null;
        this.selectedProfile = null;
      }
    }
    this.isEditing = false;
    this.isCreating = false;
  }
  
  deleteProfile(id: number, event: Event): void {
    event.stopPropagation(); // Prevent profile selection when clicking delete
    if (confirm(`Are you sure you want to delete this profile?`)) {
      this.profiles = this.profiles.filter(p => p.id !== id);
      
      // If deleted profile was selected, select another one
      if (id === this.selectedProfileId) {
        if (this.profiles.length > 0) {
          this.selectProfile(this.profiles[0].id);
        } else {
          this.selectedProfileId = null;
          this.selectedProfile = null;
        }
      }
    }
  }
  
  saveProfile(): void {
    if (this.profileForm.valid) {
      const profileData = this.profileForm.value;
      
      if (this.isCreating) {
        // Generate a new ID for the profile
        const newId = Math.max(0, ...this.profiles.map(p => p.id)) + 1;
        profileData.id = newId;
        this.profiles.push(profileData);
        this.selectProfile(newId);
      } else if (this.isEditing && this.selectedProfileId) {
        // Update existing profile
        const index = this.profiles.findIndex(p => p.id === this.selectedProfileId);
        if (index !== -1) {
          this.profiles[index] = profileData;
          this.selectProfile(profileData.id);
        }
      }
      
      this.isEditing = false;
      this.isCreating = false;
    }
  }
  
  browseJksFile(): void {
    // In a real app, this would use Electron to open a file dialog
    console.log('Browse for JKS file...');
    // After selection, update the form control
    // this.profileForm.get('jksPath').setValue('/selected/path/file.jks');
  }
}