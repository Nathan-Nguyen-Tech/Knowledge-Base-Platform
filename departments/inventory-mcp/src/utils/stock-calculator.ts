import { NormTable, NormTableItem } from '../models/NormTable.js';
import { PurchaseOrderItem } from '../models/PurchaseOrder.js';
import { StockItem } from '../models/StockItem.js';
import { OneDriveStorageAdapter, ExcelHandler } from '@mcp/core';

/**
 * Stock Calculator utility
 * Calculates requirements and purchase quantities
 */
export class StockCalculator {
  /**
   * Calculate total requirements based on norm table and team size
   */
  static calculateRequirements(
    normTable: NormTable,
    teamSize: number
  ): Map<string, { item: NormTableItem; requiredQty: number }> {
    const requirements = new Map();

    for (const item of normTable.items) {
      const requiredQty = item.quantityPerPerson * teamSize;
      requirements.set(item.itemCode, {
        item,
        requiredQty
      });
    }

    return requirements;
  }

  /**
   * Get current stock levels from OneDrive
   * Reads from Stock/current_stock.xlsx if available
   */
  static async getCurrentStockLevels(
    storage: OneDriveStorageAdapter
  ): Promise<Map<string, StockItem>> {
    const stockLevels = new Map<string, StockItem>();

    try {
      // Try to read stock file
      const stockFile = await storage.getFileContent('Stock/current_stock.xlsx');
      const handler = new ExcelHandler();
      const data = await handler.parse(stockFile);

      const sheetName = Object.keys(data)[0];
      if (sheetName) {
        const rows = data[sheetName];

        for (const row of rows) {
          const itemCode = row['Item Code']?.toString() || row['Mã hàng']?.toString();
          const itemName = row['Item Name']?.toString() || row['Tên hàng']?.toString();
          const category = row['Category']?.toString() as 'VTTH' | 'HoaChat';
          const currentQty = parseFloat(row['Current Quantity']?.toString() || row['Tồn kho']?.toString() || '0');
          const unit = row['Unit']?.toString() || row['Đơn vị']?.toString() || '';

          if (itemCode) {
            stockLevels.set(itemCode, new StockItem({
              itemCode,
              itemName: itemName || '',
              category: category || 'VTTH',
              currentQuantity: currentQty,
              unit,
              lastUpdated: new Date()
            }));
          }
        }
      }

      console.error(`[StockCalculator] Loaded ${stockLevels.size} stock items`);
    } catch (error) {
      console.error('[StockCalculator] Could not load stock levels, assuming all items need purchase:', error);
    }

    return stockLevels;
  }

  /**
   * Calculate purchase quantities based on requirements and current stock
   */
  static calculatePurchaseQuantities(
    requirements: Map<string, { item: NormTableItem; requiredQty: number }>,
    stockLevels: Map<string, StockItem>
  ): PurchaseOrderItem[] {
    const itemsToPurchase: PurchaseOrderItem[] = [];

    for (const [itemCode, { item, requiredQty }] of requirements) {
      const stock = stockLevels.get(itemCode);
      const currentStock = stock?.data.currentQuantity || 0;

      const quantityNeeded = Math.max(0, requiredQty - currentStock);

      if (quantityNeeded > 0) {
        itemsToPurchase.push({
          itemCode: item.itemCode,
          name: item.itemName,
          category: item.category,
          quantity: quantityNeeded,
          unit: item.unit,
          estimatedCost: this.estimateCost(item, quantityNeeded),
          notes: `Required: ${requiredQty}, Stock: ${currentStock}, Need: ${quantityNeeded}`
        });
      }
    }

    console.error(`[StockCalculator] Calculated ${itemsToPurchase.length} items to purchase`);

    return itemsToPurchase;
  }

  /**
   * Estimate cost for an item
   * TODO: Implement actual cost lookup from price list
   */
  private static estimateCost(item: NormTableItem, quantity: number): number {
    // Placeholder: 10,000 VND per unit
    // In production, this should look up from a price list or supplier data
    const unitPrice = 10000;
    return unitPrice * quantity;
  }
}
