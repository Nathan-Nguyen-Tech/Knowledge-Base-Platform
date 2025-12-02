import { Client } from '@microsoft/microsoft-graph-client';
import { IStorageAdapter, GenericFileMetadata, SearchCriteria, FileChangeEvent } from './IStorageAdapter.js';
import { ICacheProvider } from '../cache/ICacheProvider.js';
import { IAuthProvider } from '../auth/IAuthProvider.js';
import { ISyncStrategy } from '../sync/ISyncStrategy.js';

export interface OneDriveConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userId: string;                // User email or ID (for Service Principal auth)
  rootFolderPath: string;        // e.g., '/Inventory'
  cacheProvider: ICacheProvider;
  syncStrategy: ISyncStrategy;
}

/**
 * OneDrive Business storage adapter
 * Uses Microsoft Graph API with Service Principal authentication
 */
export class OneDriveStorageAdapter implements IStorageAdapter {
  private graphClient!: Client;
  private config: OneDriveConfig;
  private authProvider: IAuthProvider;
  private cache: ICacheProvider;
  private syncStrategy: ISyncStrategy;
  private watchCallback?: (event: FileChangeEvent) => void;
  private unsubscribe?: () => Promise<void>;

  constructor(config: OneDriveConfig, authProvider: IAuthProvider) {
    this.config = config;
    this.authProvider = authProvider;
    this.cache = config.cacheProvider;
    this.syncStrategy = config.syncStrategy;
  }

  async initialize(): Promise<void> {
    console.error('[OneDrive] Initializing...');

    // 1. Authenticate
    await this.authProvider.authenticate();
    console.error('[OneDrive] ✓ Authenticated');

    // 2. Initialize Graph Client
    this.graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          return await this.authProvider.getAccessToken();
        }
      }
    });

    // 3. Verify folder access
    await this.verifyFolderAccess();
    console.error(`[OneDrive] ✓ Verified access to ${this.config.rootFolderPath}`);

    // 4. Initialize cache
    await this.cache.initialize();
    console.error('[OneDrive] ✓ Cache initialized');

    // 5. Initialize sync strategy
    await this.syncStrategy.initialize(this.graphClient, this.config.rootFolderPath);
    console.error('[OneDrive] ✓ Sync strategy initialized');

    // 6. Initial sync
    console.error('[OneDrive] Performing initial sync...');
    await this.sync();
    console.error('[OneDrive] ✓ Initial sync complete');
  }

  async scan(): Promise<GenericFileMetadata[]> {
    // Check cache first
    const cached = await this.cache.getAllMetadata();
    if (cached.length > 0) {
      console.error(`[OneDrive] Returning ${cached.length} files from cache`);
      return cached;
    }

    // Fetch from OneDrive
    console.error('[OneDrive] Cache empty, fetching from OneDrive...');
    const files = await this.fetchAllFilesFromOneDrive();

    // Cache results
    await this.cache.setMany(files);

    return files;
  }

  async getFileContent(relativePath: string): Promise<Buffer> {
    // Check cache first
    const cached = await this.cache.getFileContent(relativePath);
    if (cached) {
      return cached;
    }

    // Fetch from OneDrive
    console.error(`[OneDrive] Downloading ${relativePath}...`);
    const content = await this.downloadFileFromOneDrive(relativePath);

    // Cache content
    await this.cache.setFileContent(relativePath, content);

    return content;
  }

  async getFileContentAsString(relativePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const buffer = await this.getFileContent(relativePath);
    return buffer.toString(encoding);
  }

  async writeFile(relativePath: string, content: Buffer | string): Promise<GenericFileMetadata> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    console.error(`[OneDrive] Uploading ${relativePath}...`);

    // Upload to OneDrive
    const metadata = await this.uploadFileToOneDrive(relativePath, buffer);

    // Update cache
    await this.cache.setFileContent(relativePath, buffer);
    await this.cache.setMetadata(relativePath, metadata);

    console.error(`[OneDrive] ✓ Uploaded ${relativePath}`);

    return metadata;
  }

  async deleteFile(relativePath: string): Promise<void> {
    console.error(`[OneDrive] Deleting ${relativePath}...`);

    // Delete from OneDrive
    const fileUrl = `/users/${this.config.userId}/drive/root:${this.config.rootFolderPath}/${relativePath}`;
    await this.graphClient.api(fileUrl).delete();

    // Delete from cache
    await this.cache.delete(relativePath);

    console.error(`[OneDrive] ✓ Deleted ${relativePath}`);
  }

  async search(criteria: SearchCriteria): Promise<GenericFileMetadata[]> {
    let results = await this.scan();

    // Filter by path pattern
    if (criteria.path) {
      const pattern = new RegExp(criteria.path.replace(/\*/g, '.*'));
      results = results.filter(f => pattern.test(f.path));
    }

    // Filter by MIME type
    if (criteria.mimeType) {
      results = results.filter(f => f.mimeType === criteria.mimeType);
    }

    // Filter by date
    if (criteria.modifiedAfter) {
      results = results.filter(f => f.modified >= criteria.modifiedAfter!);
    }
    if (criteria.modifiedBefore) {
      results = results.filter(f => f.modified <= criteria.modifiedBefore!);
    }

    // Text search in file names
    if (criteria.query) {
      const queryLower = criteria.query.toLowerCase();
      results = results.filter(f => f.name.toLowerCase().includes(queryLower));
    }

    return results;
  }

  async watch(callback: (event: FileChangeEvent) => void): Promise<() => void> {
    this.watchCallback = callback;

    // Subscribe to sync strategy
    const subscription = await this.syncStrategy.subscribe(async (changes) => {
      // Update cache with changes
      for (const change of changes) {
        if (change.type === 'deleted') {
          await this.cache.delete(change.path);
        } else if (change.metadata) {
          await this.cache.setMetadata(change.path, change.metadata);
        }
      }

      // Notify callback
      if (this.watchCallback) {
        changes.forEach(change => this.watchCallback!(change));
      }
    });

    this.unsubscribe = subscription.unsubscribe;

    // Return cleanup function
    return async () => {
      if (this.unsubscribe) {
        await this.unsubscribe();
        this.unsubscribe = undefined;
      }
      this.watchCallback = undefined;
    };
  }

  async sync(): Promise<GenericFileMetadata[]> {
    const changes = await this.syncStrategy.getChanges();

    // Update cache with changes
    for (const change of changes) {
      if (change.type === 'deleted') {
        await this.cache.delete(change.path);
      } else if (change.metadata) {
        // Download content if needed
        try {
          const content = await this.downloadFileFromOneDrive(change.path);
          await this.cache.setFileContent(change.path, content);
          await this.cache.setMetadata(change.path, change.metadata);
        } catch (error) {
          console.error(`[OneDrive] Error syncing ${change.path}:`, error);
        }
      }
    }

    return changes.map(c => c.metadata).filter((m): m is GenericFileMetadata => m !== undefined);
  }

  async getMetadata(relativePath: string): Promise<GenericFileMetadata> {
    // Check cache first
    const cached = await this.cache.getMetadata(relativePath);
    if (cached) {
      return cached;
    }

    // Fetch from OneDrive
    const fileUrl = `/users/${this.config.userId}/drive/root:${this.config.rootFolderPath}/${relativePath}`;
    const item = await this.graphClient.api(fileUrl).get();

    const metadata: GenericFileMetadata = {
      path: relativePath,
      name: item.name,
      size: item.size,
      modified: new Date(item.lastModifiedDateTime),
      mimeType: item.file?.mimeType || 'application/octet-stream'
    };

    // Cache metadata
    await this.cache.setMetadata(relativePath, metadata);

    return metadata;
  }

  async dispose(): Promise<void> {
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
    await this.cache.dispose();
    await this.syncStrategy.dispose();
    console.error('[OneDrive] Disposed');
  }

  // Private helper methods
  private async fetchAllFilesFromOneDrive(subPath: string = ''): Promise<GenericFileMetadata[]> {
    const files: GenericFileMetadata[] = [];
    const fullPath = subPath
      ? `${this.config.rootFolderPath}/${subPath}`
      : this.config.rootFolderPath;
    const folderUrl = `/users/${this.config.userId}/drive/root:${fullPath}:/children`;

    try {
      let response = await this.graphClient.api(folderUrl).get();

      while (response) {
        for (const item of response.value) {
          if (item.file) {
            // It's a file - add with full relative path
            const relativePath = subPath ? `${subPath}/${item.name}` : item.name;
            files.push({
              path: relativePath,
              name: item.name,
              size: item.size,
              modified: new Date(item.lastModifiedDateTime),
              mimeType: item.file.mimeType || 'application/octet-stream'
            });
          } else if (item.folder) {
            // It's a folder - recursively scan
            const folderSubPath = subPath ? `${subPath}/${item.name}` : item.name;
            const subFiles = await this.fetchAllFilesFromOneDrive(folderSubPath);
            files.push(...subFiles);
          }
        }

        // Handle pagination
        if (response['@odata.nextLink']) {
          response = await this.graphClient.api(response['@odata.nextLink']).get();
        } else {
          break;
        }
      }
    } catch (error) {
      console.error(`[OneDrive] Error fetching files from ${fullPath}:`, error);
      throw error;
    }

    return files;
  }

  private async downloadFileFromOneDrive(relativePath: string): Promise<Buffer> {
    const downloadUrl = `/users/${this.config.userId}/drive/root:${this.config.rootFolderPath}/${relativePath}:/content`;

    try {
      const response = await this.graphClient.api(downloadUrl).getStream();

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of response) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`[OneDrive] Error downloading ${relativePath}:`, error);
      throw error;
    }
  }

  private async uploadFileToOneDrive(relativePath: string, content: Buffer): Promise<GenericFileMetadata> {
    const uploadUrl = `/users/${this.config.userId}/drive/root:${this.config.rootFolderPath}/${relativePath}:/content`;

    try {
      const item = await this.graphClient
        .api(uploadUrl)
        .put(content);

      return {
        path: relativePath,
        name: item.name,
        size: item.size,
        modified: new Date(item.lastModifiedDateTime),
        mimeType: item.file?.mimeType || 'application/octet-stream'
      };
    } catch (error) {
      console.error(`[OneDrive] Error uploading ${relativePath}:`, error);
      throw error;
    }
  }

  private async verifyFolderAccess(): Promise<void> {
    try {
      const folderUrl = `/users/${this.config.userId}/drive/root:${this.config.rootFolderPath}`;
      await this.graphClient.api(folderUrl).get();
    } catch (error) {
      throw new Error(`Cannot access folder ${this.config.rootFolderPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
