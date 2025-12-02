/**
 * Inventory Item V2 Model
 * Represents current stock with unit conversion support
 */

import { ExcelHandler } from '@mcp/core';
import { normalizeName } from '../utils/name-normalizer.js';

/**
 * Inventory item from Excel "Inventory" sheet
 */
export interface InventoryItemData {
  productName: string;  // Tên sản phẩm
  quantity: number;  // Số lượng (có thể là đơn vị nhỏ hoặc lớn)
  unit?: string;  // Đơn vị tính
  lastUpdated?: Date;  // Ngày cập nhật
  notes?: string;  // Ghi chú
}

export class InventoryItem {
  data: InventoryItemData;
  normalizedName: string;  // For matching

  constructor(data: InventoryItemData) {
    this.data = data;
    this.normalizedName = normalizeName(data.productName);
  }

  /**
   * Get quantity in small unit
   * If inventory is in large unit, convert to small unit
   *
   * @param conversionRatio - Number of small units per large unit (e.g., 100 lọ/túi)
   * @param isLargeUnit - Whether inventory is stored in large unit
   */
  getQuantityInSmallUnit(
    conversionRatio: number,
    isLargeUnit: boolean = false
  ): number {
    if (isLargeUnit) {
      // Inventory is in large unit, convert to small
      return this.data.quantity * conversionRatio;
    } else {
      // Inventory is already in small unit
      return this.data.quantity;
    }
  }

  /**
   * Get quantity in large unit (rounded down)
   * If inventory is in small unit, convert to large unit
   *
   * @param conversionRatio - Number of small units per large unit
   * @param isLargeUnit - Whether inventory is stored in large unit
   */
  getQuantityInLargeUnit(
    conversionRatio: number,
    isLargeUnit: boolean = false
  ): number {
    if (isLargeUnit) {
      // Inventory is already in large unit
      return this.data.quantity;
    } else {
      // Inventory is in small unit, convert to large (round down)
      return Math.floor(this.data.quantity / conversionRatio);
    }
  }
}

/**
 * Parse Inventory data from Excel "Inventory" sheet
 * Returns a Map with normalized name as key for fast lookup
 *
 * Expected columns:
 * - Tên sản phẩm (Product name)
 * - Số lượng (Quantity)
 * - Đơn vị tính (Unit - optional)
 * - Ngày cập nhật (Last updated - optional)
 * - Ghi chú (Notes - optional)
 */
export async function parseInventoryFromExcel(
  buffer: Buffer
): Promise<Map<string, InventoryItem>> {
  const handler = new ExcelHandler();
  const data = await handler.parse(buffer);

  const sheetName = 'Inventory';
  if (!data[sheetName]) {
    console.error(`[Inventory] Sheet '${sheetName}' not found, returning empty inventory`);
    return new Map();
  }

  const rows = data[sheetName];
  const inventory = new Map<string, InventoryItem>();

  for (const row of rows) {
    const productName = row['Tên sản phẩm']?.toString() || '';
    if (!productName) continue;

    const quantity = parseFloat(row['Số lượng']?.toString() || '0');

    // Parse date if available
    let lastUpdated: Date | undefined;
    const dateStr = row['Ngày cập nhật']?.toString();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        lastUpdated = parsed;
      }
    }

    const item = new InventoryItem({
      productName,
      quantity,
      unit: row['Đơn vị tính']?.toString(),
      lastUpdated,
      notes: row['Ghi chú']?.toString()
    });

    // Store with normalized name as key for fast lookup
    inventory.set(item.normalizedName, item);
  }

  console.error(`[Inventory] Parsed ${inventory.size} items from Excel`);
  return inventory;
}

/**
 * Find inventory item by name (with fallback to fuzzy match)
 * Returns the item if found, or null if not found
 *
 * @param inventory - Inventory map
 * @param productName - Product name to search
 * @param allowFuzzy - Whether to allow fuzzy matching (default: false for exact match only)
 */
export function findInventoryItem(
  inventory: Map<string, InventoryItem>,
  productName: string,
  allowFuzzy: boolean = false
): InventoryItem | null {
  // Try exact match first
  const normalized = normalizeName(productName);
  const exactMatch = inventory.get(normalized);
  if (exactMatch) {
    return exactMatch;
  }

  // Fuzzy matching will be handled by InventoryComparator
  // This function only does exact normalized match
  if (!allowFuzzy) {
    return null;
  }

  return null;
}
