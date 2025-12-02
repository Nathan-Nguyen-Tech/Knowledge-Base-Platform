import { Client } from '@microsoft/microsoft-graph-client';
import { ISyncStrategy } from './ISyncStrategy.js';
import { FileChangeEvent } from '../storage-adapters/IStorageAdapter.js';

export interface PollingSyncConfig {
  intervalMinutes: number;  // Polling interval in minutes
  userId: string;           // User email or ID (for Service Principal auth)
}

/**
 * Polling-based sync strategy
 * Periodically checks OneDrive for changes using delta queries
 * Simple and reliable, no webhooks required
 */
export class PollingSync implements ISyncStrategy {
  private graphClient!: Client;
  private rootPath!: string;
  private config: PollingSyncConfig;
  private changeCallbacks: Array<(changes: FileChangeEvent[]) => void> = [];
  private intervalHandle?: NodeJS.Timeout;
  private deltaLink?: string;

  constructor(config: PollingSyncConfig) {
    this.config = config;
  }

  async initialize(graphClient: Client, rootPath: string): Promise<void> {
    this.graphClient = graphClient;
    this.rootPath = rootPath;

    console.error(`[PollingSync] Initialized with ${this.config.intervalMinutes} minute interval`);
  }

  async subscribe(callback: (changes: FileChangeEvent[]) => void): Promise<{ unsubscribe: () => Promise<void> }> {
    this.changeCallbacks.push(callback);

    // Start polling if not already started
    if (!this.intervalHandle) {
      this.startPolling();
    }

    return {
      unsubscribe: async () => {
        const index = this.changeCallbacks.indexOf(callback);
        if (index > -1) {
          this.changeCallbacks.splice(index, 1);
        }

        // Stop polling if no more subscribers
        if (this.changeCallbacks.length === 0 && this.intervalHandle) {
          clearInterval(this.intervalHandle);
          this.intervalHandle = undefined;
        }
      }
    };
  }

  async getChanges(): Promise<FileChangeEvent[]> {
    try {
      // Use delta query API to get changes
      const deltaUrl = this.deltaLink || `/users/${this.config.userId}/drive/root:${this.rootPath}:/delta`;

      const response = await this.graphClient
        .api(deltaUrl)
        .get();

      // Save delta link for next query
      this.deltaLink = response['@odata.deltaLink'];

      const changes: FileChangeEvent[] = [];

      for (const item of response.value) {
        if (item.deleted) {
          changes.push({
            type: 'deleted',
            path: item.name
          });
        } else if (item.file) {
          // Determine if created or updated based on presence in cache
          // For now, treat all as updated
          changes.push({
            type: 'updated',
            path: item.name,
            metadata: {
              path: item.name,
              name: item.name,
              size: item.size,
              modified: new Date(item.lastModifiedDateTime),
              mimeType: item.file.mimeType || 'application/octet-stream'
            }
          });
        }
      }

      if (changes.length > 0) {
        console.error(`[PollingSync] Detected ${changes.length} changes`);
      }

      return changes;
    } catch (error) {
      console.error('[PollingSync] Error getting changes:', error);
      // Reset delta link on error to force full scan next time
      this.deltaLink = undefined;
      return [];
    }
  }

  private startPolling(): void {
    const intervalMs = this.config.intervalMinutes * 60 * 1000;

    this.intervalHandle = setInterval(async () => {
      try {
        const changes = await this.getChanges();

        if (changes.length > 0) {
          // Notify all subscribers
          this.changeCallbacks.forEach(callback => {
            callback(changes);
          });
        }
      } catch (error) {
        console.error('[PollingSync] Polling error:', error);
      }
    }, intervalMs);

    console.error(`[PollingSync] Started polling every ${this.config.intervalMinutes} minutes`);
  }

  async dispose(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
    this.changeCallbacks = [];
    console.error('[PollingSync] Disposed');
  }
}
