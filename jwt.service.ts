import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GeneratedToken, DecodedToken } from '../models/interfaces';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class JwtService {
  private tokenHistorySubject = new BehaviorSubject<GeneratedToken[]>([]);
  public tokenHistory$ = this.tokenHistorySubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadTokenHistory();
  }

  private loadTokenHistory(): void {
    const tokens = this.storageService.getTokenHistory();
    this.tokenHistorySubject.next(tokens);
  }

  generateToken(profileId: string, profileName: string, apiPin: string, 
                oauthEndpoint: string, scope: string): GeneratedToken {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour

    const token: GeneratedToken = {
      id: Date.now().toString(),
      token: this.createMockJWT(apiPin, oauthEndpoint, scope, profileName),
      profileId,
      profileName,
      scope,
      generatedAt: now,
      expiresAt,
      isExpired: false,
      status: 'success'
    };

    this.addTokenToHistory(token);
    return token;
  }

  private createMockJWT(apiPin: string, endpoint: string, scope: string, profileName: string): string {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: apiPin,
      aud: endpoint,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: scope
    }));
    const signature = `${profileName.replace(/\s+/g, '')}_${scope}_signature_${Date.now()}`;
    
    return `${header}.${payload}.${signature}`;
  }

  decodeToken(token: string): DecodedToken | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp && payload.exp < now;

      return {
        header,
        payload,
        signature: parts[2],
        isValid: !isExpired,
        isExpired,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
        issuedAt: payload.iat ? new Date(payload.iat * 1000) : null
      };
    } catch (error) {
      return null;
    }
  }

  private addTokenToHistory(token: GeneratedToken): void {
    const history = [token, ...this.tokenHistorySubject.value];
    this.tokenHistorySubject.next(history);
    this.storageService.saveTokenHistory(history);
  }

  clearHistory(): void {
    this.tokenHistorySubject.next([]);
    this.storageService.clearData('jwt_token_history');
  }

  updateTokenExpiry(): void {
    const now = new Date();
    const history = this.tokenHistorySubject.value.map(token => ({
      ...token,
      isExpired: now > new Date(token.expiresAt)
    }));
    this.tokenHistorySubject.next(history);
    this.storageService.saveTokenHistory(history);
  }
}