import { z } from 'zod';
import { OneDriveStorageAdapter } from '@mcp/core';
import { NormTable } from '../models/NormTable.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { PurchaseOrder as POV2, POLineItem } from '../generators/POGeneratorV2.js';
import { StockCalculator } from '../utils/stock-calculator.js';
import { POGenerator } from '../utils/po-generator.js';
import { generatePOFromTemplate } from '../generators/TemplatePOGenerator.js';
import { getPOPath } from '../paths-config.js';

export const CreatePurchaseOrderSchema = z.object({
  teamName: z.string().describe('Tên đoàn khám'),
  teamSize: z.number().positive().describe('Số lượng người trong đoàn'),
  examDate: z.string().describe('Ngày khám dự kiến (format: YYYY-MM-DD)'),
  normTableFile: z.string().optional().describe('Tên file norm table (mặc định: sẽ tìm file mới nhất trong Norm_Table/)'),
  notes: z.string().optional().describe('Ghi chú thêm cho phiếu mua hàng')
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

/**
 * Tool: create_purchase_order
 *
 * Main business logic tool for Inventory department.
 * Creates a purchase order based on norm table, team size, and current stock levels.
 *
 * Process:
 * 1. Find and load norm table from OneDrive
 * 2. Calculate requirements (norm × team size)
 * 3. Check current stock levels
 * 4. Calculate purchase quantities (required - stock)
 * 5. Generate formatted Excel purchase order
 * 6. Save to OneDrive PurchaseOrders/ folder (configurable)
 */
export async function createPurchaseOrder(
  storage: OneDriveStorageAdapter,
  input: CreatePurchaseOrderInput
): Promise<string> {
  try {
    // Step 1: Find norm table file
    let normTablePath: string;

    if (input.normTableFile) {
      normTablePath = `Norm_Table/${input.normTableFile}`;
    } else {
      // Find most recent norm table
      const normFiles = await storage.search({
        path: 'Norm_Table',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      if (normFiles.length === 0) {
        throw new Error('Không tìm thấy norm table nào trong thư mục Norm_Table/');
      }

      // Sort by modified date manually and get most recent
      normFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
      normTablePath = normFiles[0].path;
      console.error(`[create_purchase_order] Using norm table: ${normTablePath}`);
    }

    // Step 2: Load and parse norm table
    const normTableBuffer = await storage.getFileContent(normTablePath);
    const normTable = await NormTable.parseFromExcel(normTableBuffer);
    console.error(`[create_purchase_order] Loaded norm table with ${normTable.items.length} items`);

    // Step 3: Calculate requirements
    const requirements = StockCalculator.calculateRequirements(normTable, input.teamSize);
    console.error(`[create_purchase_order] Calculated requirements for ${requirements.size} items`);

    // Step 4: Get current stock levels
    const stockLevels = await StockCalculator.getCurrentStockLevels(storage);
    console.error(`[create_purchase_order] Loaded stock levels for ${stockLevels.size} items`);

    // Step 5: Calculate purchase quantities
    const itemsToPurchase = StockCalculator.calculatePurchaseQuantities(requirements, stockLevels);

    if (itemsToPurchase.length === 0) {
      return JSON.stringify({
        success: true,
        message: 'Không cần mua hàng - tồn kho đủ đáp ứng nhu cầu',
        teamName: input.teamName,
        teamSize: input.teamSize,
        examDate: input.examDate
      }, null, 2);
    }

    // Step 6: Create purchase order
    const examDate = new Date(input.examDate);
    const po = new PurchaseOrder({
      id: `PO-${Date.now()}`,
      teamName: input.teamName,
      teamSize: input.teamSize,
      examDate: examDate,
      createdDate: new Date(),
      status: 'draft',
      items: itemsToPurchase,
      notes: input.notes
    });

    console.error(`[create_purchase_order] Created PO with ${po.data.items.length} items, total cost: ${po.getTotalCost().toLocaleString('vi-VN')} VND`);

    // Step 7: Convert to POV2 format and generate Excel using template
    const poV2: POV2 = {
      meta: {
        poNumber: po.data.id,
        department: 'Phòng Lab',
        createdDate: po.data.createdDate,
        requestedBy: input.teamName,
        approvedBy: undefined,
        notes: po.data.notes
      },
      lineItems: po.data.items.map((item, index): POLineItem => ({
        stt: index + 1,
        productName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes
      }))
    };

    const excelBuffer = await generatePOFromTemplate(storage, poV2, { fallbackToSimple: true });

    // Step 8: Save to OneDrive
    const fileName = `PO_${input.teamName.replace(/\s+/g, '_')}_${examDate.toISOString().split('T')[0]}_${Date.now()}.xlsx`;
    const savePath = getPOPath(fileName);

    await storage.writeFile(savePath, excelBuffer);

    console.error(`[create_purchase_order] Saved purchase order to ${savePath}`);

    // Return detailed result
    return JSON.stringify({
      success: true,
      message: 'Đã tạo phiếu mua hàng thành công',
      purchaseOrder: {
        id: po.data.id,
        fileName: fileName,
        path: savePath,
        teamName: input.teamName,
        teamSize: input.teamSize,
        examDate: examDate.toISOString().split('T')[0],
        status: po.data.status,
        itemCount: po.data.items.length,
        totalCost: po.getTotalCost(),
        totalCostFormatted: `${po.getTotalCost().toLocaleString('vi-VN')} VND`
      },
      items: po.data.items.map(item => ({
        itemCode: item.itemCode,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        estimatedCost: item.estimatedCost,
        notes: item.notes
      })),
      breakdown: {
        vtth: po.getItemsByCategory('VTTH').length,
        hoaChat: po.getItemsByCategory('HoaChat').length
      }
    }, null, 2);

  } catch (error) {
    console.error('[create_purchase_order] Error:', error);
    throw new Error(`Lỗi khi tạo phiếu mua hàng: ${error instanceof Error ? error.message : String(error)}`);
  }
}
