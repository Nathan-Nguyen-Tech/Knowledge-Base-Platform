import { z } from 'zod';
import { OneDriveStorageAdapter } from '@mcp/core';
import { NormTable } from '../models/NormTable.js';

export const SearchNormTablesSchema = z.object({
  fileName: z.string().optional().describe('Tên file norm table cụ thể (nếu có)'),
  category: z.enum(['VTTH', 'HoaChat']).optional().describe('Lọc theo loại hàng'),
  itemCode: z.string().optional().describe('Tìm theo mã hàng'),
  itemName: z.string().optional().describe('Tìm theo tên hàng (tìm kiếm gần đúng)')
});

export type SearchNormTablesInput = z.infer<typeof SearchNormTablesSchema>;

/**
 * Tool: search_norm_tables
 *
 * Search and query norm tables in OneDrive.
 * Can search by file name, category, item code, or item name.
 *
 * Use cases:
 * - List all available norm tables
 * - Find specific items in norm tables
 * - Check standard quantities for items
 * - Browse norm table contents
 */
export async function searchNormTables(
  storage: OneDriveStorageAdapter,
  input: SearchNormTablesInput
): Promise<string> {
  try {
    // Step 1: Get list of norm table files
    const normFiles = await storage.search({
      path: 'Norm_Table',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Sort by modified date manually
    normFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    if (normFiles.length === 0) {
      return JSON.stringify({
        success: true,
        message: 'Không tìm thấy norm table nào',
        files: [],
        items: []
      }, null, 2);
    }

    // Step 2: Filter by file name if specified
    let filesToSearch = normFiles;
    if (input.fileName) {
      filesToSearch = normFiles.filter(f =>
        f.name.toLowerCase().includes(input.fileName!.toLowerCase())
      );

      if (filesToSearch.length === 0) {
        return JSON.stringify({
          success: true,
          message: `Không tìm thấy file norm table với tên: ${input.fileName}`,
          availableFiles: normFiles.map(f => ({
            name: f.name,
            path: f.path,
            modified: f.modified.toISOString(),
            size: f.size
          })),
          items: []
        }, null, 2);
      }
    }

    // Step 3: If no search filters, just return file list
    if (!input.category && !input.itemCode && !input.itemName) {
      return JSON.stringify({
        success: true,
        message: `Tìm thấy ${filesToSearch.length} norm table(s)`,
        files: filesToSearch.map(f => ({
          name: f.name,
          path: f.path,
          modified: f.modified.toISOString(),
          size: f.size
        })),
        items: []
      }, null, 2);
    }

    // Step 4: Search within norm table contents
    const allItems: Array<{
      file: string;
      itemCode: string;
      itemName: string;
      category: string;
      unit: string;
      quantityPerPerson: number;
      notes?: string;
    }> = [];

    for (const file of filesToSearch) {
      try {
        const buffer = await storage.getFileContent(file.path);
        const normTable = await NormTable.parseFromExcel(buffer);

        let items = normTable.items;

        // Apply filters
        if (input.category) {
          items = items.filter(item => item.category === input.category);
        }

        if (input.itemCode) {
          items = items.filter(item =>
            item.itemCode.toLowerCase().includes(input.itemCode!.toLowerCase())
          );
        }

        if (input.itemName) {
          items = items.filter(item =>
            item.itemName.toLowerCase().includes(input.itemName!.toLowerCase())
          );
        }

        // Add to results
        for (const item of items) {
          allItems.push({
            file: file.name,
            itemCode: item.itemCode,
            itemName: item.itemName,
            category: item.category,
            unit: item.unit,
            quantityPerPerson: item.quantityPerPerson,
            notes: item.notes
          });
        }
      } catch (error) {
        console.error(`[search_norm_tables] Error parsing ${file.name}:`, error);
      }
    }

    // Step 5: Return results
    return JSON.stringify({
      success: true,
      message: `Tìm thấy ${allItems.length} item(s) trong ${filesToSearch.length} norm table(s)`,
      searchFilters: {
        fileName: input.fileName,
        category: input.category,
        itemCode: input.itemCode,
        itemName: input.itemName
      },
      files: filesToSearch.map(f => ({
        name: f.name,
        path: f.path,
        modified: f.modified.toISOString()
      })),
      items: allItems,
      summary: {
        totalItems: allItems.length,
        vtthItems: allItems.filter(i => i.category === 'VTTH').length,
        hoaChatItems: allItems.filter(i => i.category === 'HoaChat').length
      }
    }, null, 2);

  } catch (error) {
    console.error('[search_norm_tables] Error:', error);
    throw new Error(`Lỗi khi tìm kiếm norm tables: ${error instanceof Error ? error.message : String(error)}`);
  }
}
