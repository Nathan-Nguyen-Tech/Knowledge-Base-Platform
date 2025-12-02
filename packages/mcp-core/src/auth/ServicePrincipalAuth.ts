import { ClientSecretCredential } from '@azure/identity';
import { IAuthProvider } from './IAuthProvider.js';

export interface ServicePrincipalConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Service Principal (App-only) authentication for Microsoft Graph
 * Production-grade auth without user interaction
 */
export class ServicePrincipalAuth implements IAuthProvider {
  private credential: ClientSecretCredential;
  private accessToken?: string;
  private tokenExpiration?: Date;

  constructor(private config: ServicePrincipalConfig) {
    this.credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );
  }

  async authenticate(): Promise<void> {
    await this.refreshToken();
  }

  async getAccessToken(): Promise<string> {
    // Refresh if expired or expiring soon (5 min buffer)
    if (
      !this.accessToken ||
      !this.tokenExpiration ||
      this.tokenExpiration.getTime() - Date.now() < 5 * 60 * 1000
    ) {
      await this.refreshToken();
    }

    return this.accessToken!;
  }

  /**
   * For @microsoft/microsoft-graph-client compatibility
   */
  async getAccessTokenForRequest(): Promise<string> {
    return await this.getAccessToken();
  }

  private async refreshToken(): Promise<void> {
    try {
      const tokenResponse = await this.credential.getToken([
        'https://graph.microsoft.com/.default'
      ]);

      this.accessToken = tokenResponse.token;
      this.tokenExpiration = new Date(tokenResponse.expiresOnTimestamp);

      console.error(`[Auth] Token refreshed, expires at ${this.tokenExpiration.toISOString()}`);
    } catch (error) {
      console.error('[Auth] Failed to refresh token:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
