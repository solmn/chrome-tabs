import { Component } from '@angular/core';
import { NavigationItem } from './models/interfaces';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  activeView = 'profiles';
  
  navigationItems: NavigationItem[] = [
    { 
      id: 'profiles', 
      label: 'API Gateway Profiles', 
      icon: 'user',
      description: 'Manage API gateway JWT profiles' 
    },
    { 
      id: 'generator', 
      label: 'JWT Generator', 
      icon: 'key',
      description: 'Generate tokens for API-to-API calls' 
    },
    { 
      id: 'decoder', 
      label: 'JWT Decoder', 
      icon: 'shield',
      description: 'Decode and inspect JWT tokens' 
    },
    { 
      id: 'history', 
      label: 'JWT History', 
      icon: 'clock',
      description: 'View generated token history' 
    }
  ];

  setActiveView(viewId: string): void {
    this.activeView = viewId;
  }
}