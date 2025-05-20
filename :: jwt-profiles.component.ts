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
  status: 'active' | 'inactive';
  created: string;
  lastUsed?: string;
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
      appPin: '1234',
      status: 'active',
      created: 'May 18, 2025',
      lastUsed: 'May 20, 2025 at 10:45 AM'
    },
    { 
      id: 2, 
      name: 'Staging API', 
      jksPath: '/path/to/staging.jks', 
      password: '••••••••',
      oauthEndpoint: 'https://staging-api.example.com/oauth/token',
      scope: 'openid profile',
      appPin: '5678',
      status: 'inactive',
      created: 'May 15, 2025',
      lastUsed: 'May 19, 2025 at 3:22 PM'
    },
    { 
      id: 3, 
      name: 'Production API', 
      jksPath: '/path/to/prod.jks', 
      password: '••••••••',
      oauthEndpoint: 'https://api.example.com/oauth/token',
      scope: 'openid profile admin',
      appPin: '9012',
      status: 'active',
      created: 'May 10, 2025'
    }
  ];
  
  filteredProfiles: JwtProfile[] = [];
  selectedProfileId: number | null = null;
  selectedProfile: JwtProfile | null = null;
  isEditing = false;
  isCreating = false;
  searchTerm = '';
  profileForm: FormGroup;
  
  constructor(private fb: FormBuilder) {
    this.profileForm = this.createProfileForm();
  }
  
  ngOnInit(): void {
    this.filteredProfiles = [...this.profiles];
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
      appPin: [''],
      status: ['active']
    });
  }
  
  searchProfiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();
    
    if (!this.searchTerm) {
      this.filteredProfiles = [...this.profiles];
      return;
    }
    
    this.filteredProfiles = this.profiles.filter(profile => 
      profile.name.toLowerCase().includes(this.searchTerm) || 
      profile.oauthEndpoint.toLowerCase().includes(this.searchTerm)
    );
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
    this.profileForm.reset({
      status: 'active'
    });
  }
  
  editProfile(id?: number): void {
    const profileToEdit = id ? 
      this.profiles.find(p => p.id === id) : 
      this.selectedProfile;
      
    if (profileToEdit) {
      this.selectedProfileId = profileToEdit.id;
      this.selectedProfile = profileToEdit;
      
      this.profileForm.setValue({
        id: profileToEdit.id,
        name: profileToEdit.name,
        jksPath: profileToEdit.jksPath,
        password: profileToEdit.password,
        oauthEndpoint: profileToEdit.oauthEndpoint,
        scope: profileToEdit.scope,
        appPin: profileToEdit.appPin,
        status: profileToEdit.status
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
  
  deleteProfile(id: number, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent profile selection when clicking delete
    }
    
    if (confirm(`Are you sure you want to delete this profile?`)) {
      this.profiles = this.profiles.filter(p => p.id !== id);
      this.filteredProfiles = this.filteredProfiles.filter(p => p.id !== id);
      
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
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      if (this.isCreating) {
        // Generate a new ID for the profile
        const newId = Math.max(0, ...this.profiles.map(p => p.id)) + 1;
        const newProfile = {
          ...profileData,
          id: newId,
          created: formattedDate
        };
        
        this.profiles.push(newProfile);
        this.filteredProfiles = [...this.profiles];
        this.selectProfile(newId);
      } else if (this.isEditing && this.selectedProfileId) {
        // Update existing profile
        const index = this.profiles.findIndex(p => p.id === this.selectedProfileId);
        if (index !== -1) {
          // Keep created and lastUsed values
          const updatedProfile = {
            ...this.profiles[index],
            ...profileData
          };
          
          this.profiles[index] = updatedProfile;
          this.filteredProfiles = [...this.profiles];
          this.selectProfile(updatedProfile.id);
        }
      }
      
      this.isEditing = false;
      this.isCreating = false;
    }
  }
  
  useProfile(id: number): void {
    // Simulate using the profile and updating lastUsed
    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const index = this.profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      this.profiles[index] = {
        ...this.profiles[index],
        lastUsed: formattedDateTime
      };
      
      if (this.selectedProfileId === id) {
        this.selectedProfile = this.profiles[index];
      }
    }
    
    // In a real app, you would use this profile for JWT operations
    console.log('Using profile:', id);
  }
  
  testConnection(id: number): void {
    // In a real app, you would test the OAuth connection
    console.log('Testing connection for profile:', id);
  }
  
  browseJksFile(): void {
    // In a real app, this would use Electron to open a file dialog
    console.log('Browse for JKS file...');
    // After selection, update the form control
    // this.profileForm.get('jksPath').setValue('/selected/path/file.jks');
  }
}