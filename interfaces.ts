export interface Profile {
  id: string;
  profileName: string;
  jksFilePath: string;
  apiPin: string;
  password: string;
  oauthEndpoint: string;
  scope: string;
  isActive: boolean;
  isValid: boolean;
  isExpired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedToken {
  id: string;
  token: string;
  profileId: string;
  profileName: string;
  scope: string;
  generatedAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  status: string;
}

export interface DecodedToken {
  header: any;
  payload: any;
  signature: string;
  isValid: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
  issuedAt: Date | null;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  description: string;
}