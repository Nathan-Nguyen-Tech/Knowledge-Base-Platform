/**
 * Search result from file content search
 */
export interface SearchResult {
  snippet: string;           // Matching text snippet
  lineNumber?: number;       // Line number (for text files)
  sheetName?: string;        // Sheet name (for Excel)
  rowNumber?: number;        // Row number (for Excel)
  columnName?: string;       // Column name (for Excel)
  score: number;             // Relevance score (0-1)
}

/**
 * File handler interface for different file types
 * Handles parsing, searching, and metadata extraction
 */
export interface IFileHandler {
  /**
   * MIME types this handler supports
   */
  readonly supportedMimeTypes: string[];

  /**
   * Extract metadata from file content
   * @param content - Raw file content
   * @param fileName - File name (for context)
   * @returns Custom metadata object specific to file type
   */
  extractMetadata(content: Buffer, fileName: string): Promise<Record<string, any>>;

  /**
   * Search within file content
   * @param content - Raw file content
   * @param query - Search query
   * @returns Search results with snippets and locations
   */
  search(content: Buffer, query: string): Promise<SearchResult[]>;

  /**
   * Parse file content into structured data
   * @param content - Raw file content
   * @returns Parsed data (type depends on handler implementation)
   */
  parse(content: Buffer): Promise<any>;

  /**
   * Serialize structured data back to file content
   * @param data - Structured data
   * @returns File content as Buffer
   */
  serialize(data: any): Promise<Buffer>;
}
