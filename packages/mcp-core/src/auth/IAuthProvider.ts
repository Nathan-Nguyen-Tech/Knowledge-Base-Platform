/**
 * Authentication provider interface
 * Supports different auth methods (Service Principal, OAuth, etc.)
 */
export interface IAuthProvider {
  /**
   * Authenticate with the service
   * @throws Error if authentication fails
   */
  authenticate(): Promise<void>;

  /**
   * Get current access token
   * @returns Valid access token
   * @throws Error if not authenticated or token expired
   */
  getAccessToken(): Promise<string>;

  /**
   * Get access token for Microsoft Graph Client
   * This method is specifically for @microsoft/microsoft-graph-client compatibility
   * @returns Valid access token
   */
  getAccessTokenForRequest?(): Promise<string>;
}
