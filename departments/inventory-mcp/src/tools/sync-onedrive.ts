import { z } from 'zod';
import { OneDriveStorageAdapter } from '@mcp/core';

export const SyncOneDriveSchema = z.object({
  force: z.boolean().optional().default(false).describe('Force full sync (bỏ qua cache)')
});

export type SyncOneDriveInput = z.infer<typeof SyncOneDriveSchema>;

/**
 * Tool: sync_onedrive
 *
 * Manually trigger OneDrive sync.
 * Useful for immediate updates without waiting for polling interval.
 *
 * Use cases:
 * - Force refresh after uploading files externally
 * - Check for latest changes immediately
 * - Debug sync issues
 */
export async function syncOneDrive(
  storage: OneDriveStorageAdapter,
  input: SyncOneDriveInput
): Promise<string> {
  try {
    const startTime = Date.now();

    console.error(`[sync_onedrive] Starting sync...`);

    // Trigger sync - returns GenericFileMetadata[], not FileChangeEvent[]
    const files = await storage.sync();

    const duration = Date.now() - startTime;

    return JSON.stringify({
      success: true,
      message: `Sync hoàn tất - ${files.length} file(s) đã được đồng bộ`,
      duration: `${duration}ms`,
      fileCount: files.length,
      files: files.map(f => ({
        path: f.path,
        name: f.name,
        size: f.size,
        modified: f.modified.toISOString(),
        mimeType: f.mimeType
      }))
    }, null, 2);

  } catch (error) {
    console.error('[sync_onedrive] Error:', error);
    throw new Error(`Lỗi khi sync OneDrive: ${error instanceof Error ? error.message : String(error)}`);
  }
}
