import { Component } from '@angular/core';
import { JwtService } from '../../services/jwt.service';
import { DecodedToken } from '../../models/interfaces';

@Component({
  selector: 'app-jwt-decoder',
  templateUrl: './jwt-decoder.component.html'
})
export class JwtDecoderComponent {
  tokenInput = '';
  decodedToken: DecodedToken | null = null;
  error: string | null = null;
  sampleToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwiYXVkIjoiaHR0cHM6Ly9vYXV0aC5leGFtcGxlLmNvbS90b2tlbiIsImlhdCI6MTczNzUxMjQwNiwiZXhwIjoxNzM3NTE2MDA2LCJzY29wZSI6InVzZXItc2VydmljZSJ9.sample_signature_here";

  constructor(private jwtService: JwtService) {}

  onTokenInputChange(value: string): void {
    this.tokenInput = value;
    this.decodeToken();
  }

  private decodeToken(): void {
    if (!this.tokenInput.trim()) {
      this.decodedToken = null;
      this.error = null;
      return;
    }

    const result = this.jwtService.decodeToken(this.tokenInput);
    if (result) {
      this.decodedToken = result;
      this.error = null;
    } else {
      this.error = 'Invalid JWT format - must have 3 parts separated by dots';
      this.decodedToken = null;
    }
  }

  useSampleToken(): void {
    this.tokenInput = this.sampleToken;
    this.decodeToken();
  }

  clearToken(): void {
    this.tokenInput = '';
    this.decodedToken = null;
    this.error = null;
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  getFormattedJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}