import { z } from 'zod';
import { OneDriveStorageAdapter } from '@mcp/core';

export const ListFilesSchema = z.object({
  folder: z.string().optional().describe('Thư mục cần list (mặc định: root, ví dụ: Norm_Table, Purchase_Order, Stock)'),
  fileType: z.enum(['excel', 'all']).optional().default('all').describe('Loại file (excel hoặc all)')
});

export type ListFilesInput = z.infer<typeof ListFilesSchema>;

/**
 * Tool: list_files
 *
 * List files in OneDrive Inventory folder.
 * Provides file browser functionality.
 *
 * Use cases:
 * - Browse folder structure
 * - Find recently modified files
 * - Check file sizes and metadata
 * - Explore available resources
 */
export async function listFiles(
  storage: OneDriveStorageAdapter,
  input: ListFilesInput
): Promise<string> {
  try {
    const folder = input.folder || '';
    const fileType = input.fileType || 'all';

    // Build search criteria
    const mimeType = fileType === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : undefined;

    const files = await storage.search({
      path: folder,
      mimeType
    });

    // Sort by modified date descending
    files.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    if (files.length === 0) {
      return JSON.stringify({
        success: true,
        message: folder
          ? `Không tìm thấy file nào trong thư mục: ${folder}`
          : 'Không tìm thấy file nào',
        folder: folder || 'root',
        fileCount: 0,
        files: []
      }, null, 2);
    }

    // Group by folder
    const folderGroups = new Map<string, typeof files>();
    for (const file of files) {
      const folderPath = file.path.includes('/')
        ? file.path.substring(0, file.path.lastIndexOf('/'))
        : 'root';

      if (!folderGroups.has(folderPath)) {
        folderGroups.set(folderPath, []);
      }
      folderGroups.get(folderPath)!.push(file);
    }

    // Format results
    const result = {
      success: true,
      message: `Tìm thấy ${files.length} file(s) trong ${folder || 'root'}`,
      folder: folder || 'root',
      fileCount: files.length,
      filters: {
        fileType: input.fileType
      },
      files: files.map(f => ({
        name: f.name,
        path: f.path,
        size: f.size,
        sizeFormatted: formatFileSize(f.size),
        modified: f.modified.toISOString(),
        modifiedRelative: getRelativeTime(f.modified),
        mimeType: f.mimeType,
        customMetadata: f.customMetadata
      })),
      folderStructure: Array.from(folderGroups.entries()).map(([folder, files]) => ({
        folder,
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        totalSizeFormatted: formatFileSize(files.reduce((sum, f) => sum + f.size, 0))
      }))
    };

    return JSON.stringify(result, null, 2);

  } catch (error) {
    console.error('[list_files] Error:', error);
    throw new Error(`Lỗi khi list files: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 30) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN');
}
