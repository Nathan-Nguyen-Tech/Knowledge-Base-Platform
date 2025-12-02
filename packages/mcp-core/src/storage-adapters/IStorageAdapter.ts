/**
 * Generic file metadata that works for all file types and storage backends
 */
export interface GenericFileMetadata {
  path: string;                    // Relative path from storage root
  name: string;                    // File name
  size: number;                    // Size in bytes
  modified: Date;                  // Last modified timestamp
  mimeType: string;                // MIME type (e.g., 'text/markdown', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  customMetadata?: Record<string, any>;  // Type-specific metadata (e.g., Excel sheets, markdown headings)
}

/**
 * Search criteria for querying files
 */
export interface SearchCriteria {
  query?: string;                  // Text search query
  path?: string;                   // Path filter (glob pattern)
  mimeType?: string;               // MIME type filter
  modifiedAfter?: Date;            // Date filter
  modifiedBefore?: Date;
  customFilters?: Record<string, any>;  // Type-specific filters
}

/**
 * File change event types
 */
export interface FileChangeEvent {
  type: 'created' | 'updated' | 'deleted';
  path: string;
  metadata?: GenericFileMetadata;
}

/**
 * Core storage adapter interface
 * All storage backends (Git, OneDrive, Google Drive, etc.) must implement this
 */
export interface IStorageAdapter {
  /**
   * Initialize the storage adapter
   * Performs authentication, verification, and initial sync
   * @throws Error if initialization fails
   */
  initialize(): Promise<void>;

  /**
   * Scan and index all files in the storage
   * @returns Array of file metadata
   */
  scan(): Promise<GenericFileMetadata[]>;

  /**
   * Get file content as Buffer (raw bytes)
   * @param relativePath - Relative path to the file
   * @returns File content as Buffer
   * @throws Error if file not found or cannot be read
   */
  getFileContent(relativePath: string): Promise<Buffer>;

  /**
   * Get file content as string (for text files)
   * @param relativePath - Relative path to the file
   * @param encoding - Text encoding (default: 'utf-8')
   * @returns File content as string
   * @throws Error if file not found or cannot be read
   */
  getFileContentAsString(relativePath: string, encoding?: BufferEncoding): Promise<string>;

  /**
   * Write/update file content
   * @param relativePath - Relative path to the file
   * @param content - File content (Buffer or string)
   * @returns Updated file metadata
   * @throws Error if write fails
   */
  writeFile(relativePath: string, content: Buffer | string): Promise<GenericFileMetadata>;

  /**
   * Delete a file
   * @param relativePath - Relative path to the file
   * @throws Error if delete fails
   */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * Search files based on criteria
   * @param criteria - Search criteria
   * @returns Array of matching file metadata
   */
  search(criteria: SearchCriteria): Promise<GenericFileMetadata[]>;

  /**
   * Watch for file changes
   * @param callback - Called when files change
   * @returns Cleanup function to stop watching
   */
  watch(callback: (event: FileChangeEvent) => void): Promise<() => void>;

  /**
   * Sync with remote storage (pull changes)
   * @returns Array of changed files
   */
  sync(): Promise<GenericFileMetadata[]>;

  /**
   * Get storage-specific metadata for a file
   * @param relativePath - Relative path to the file
   * @returns File metadata
   * @throws Error if file not found
   */
  getMetadata(relativePath: string): Promise<GenericFileMetadata>;

  /**
   * Dispose resources and cleanup
   */
  dispose(): Promise<void>;
}
