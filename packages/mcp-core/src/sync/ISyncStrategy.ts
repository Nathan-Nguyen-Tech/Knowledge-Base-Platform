import { Client } from '@microsoft/microsoft-graph-client';
import { FileChangeEvent } from '../storage-adapters/IStorageAdapter.js';

/**
 * Sync strategy interface for different synchronization methods
 * Supports polling, webhooks, delta queries, etc.
 */
export interface ISyncStrategy {
  /**
   * Initialize the sync strategy
   * @param graphClient - Microsoft Graph client instance
   * @param rootPath - Root path to monitor
   */
  initialize(graphClient: Client, rootPath: string): Promise<void>;

  /**
   * Subscribe to change notifications
   * @param callback - Called when changes are detected
   * @returns Unsubscribe function
   */
  subscribe(callback: (changes: FileChangeEvent[]) => void): Promise<{ unsubscribe: () => Promise<void> }>;

  /**
   * Get changes since last sync
   * @returns Array of file change events
   */
  getChanges(): Promise<FileChangeEvent[]>;

  /**
   * Dispose resources and cleanup
   */
  dispose(): Promise<void>;
}
