/**
 * VTTH (Vật Tư Tiêu Hao) Item Model
 * Represents consumable medical supplies
 */

import { ServicePackage } from '../types/ServicePackage.js';
import { ExcelHandler } from '@mcp/core';

export interface VTTHItemData {
  stt: number;  // STT (Row number)
  name: string;  // Tên vật tư
  price?: number;  // Giá
  largeUnit: string;  // Đơn vị lớn (Túi, Hộp, Chai)
  conversionRatio: number;  // Số lượng trong 1 ĐVT (VD: 100 lọ/túi)
  specification?: string;  // Quy cách
  unitPrice?: number;  // Đơn giá

  // Consumption rates per package
  basicConsumption: number;  // Gói đồng - Tiêu hao
  goldConsumption: number;  // Gói vàng - Tiêu hao
  silverConsumption: number;  // Gói bạc - Tiêu hao

  notes?: string;  // Ghi chú
}

export class VTTHItem {
  data: VTTHItemData;

  constructor(data: VTTHItemData) {
    this.data = data;
  }

  /**
   * Get consumption rate for a specific package
   */
  getConsumptionRate(pkg: ServicePackage): number {
    switch (pkg) {
      case 'gold':
        return this.data.goldConsumption;
      case 'basic':
        return this.data.basicConsumption;
      case 'silver':
        return this.data.silverConsumption;
    }
  }

  /**
   * Check if item is used in package
   */
  isInPackage(pkg: ServicePackage): boolean {
    return this.getConsumptionRate(pkg) > 0;
  }

  /**
   * Calculate required quantity (small unit) for given customers
   */
  calculateRequired(numCustomers: number, pkg: ServicePackage): number {
    const rate = this.getConsumptionRate(pkg);
    return numCustomers * rate;
  }

  /**
   * Calculate purchase quantity (large unit, rounded up)
   */
  calculatePurchaseQuantity(numCustomers: number, pkg: ServicePackage): number {
    const requiredSmall = this.calculateRequired(numCustomers, pkg);
    return Math.ceil(requiredSmall / this.data.conversionRatio);
  }
}

/**
 * Parse VTTH data from Excel sheet
 *
 * Expected columns:
 * 1. STT
 * 2. Tên vật tư
 * 3. Giá
 * 4. Đơn vị tính
 * 5. Số lượng trong 1 ĐVT ⭐
 * 6. Quy cách
 * 7. Đơn giá
 * 8. Gói đồng - Tiêu hao ⭐
 * 9. Gói đồng - Thành tiền
 * 10. Gói vàng - Tiêu hao ⭐
 * 11. Gói vàng - Thành tiền
 * 12. Gói bạc - Tiêu hao ⭐
 * 13. Gói bạc - Thành tiền
 * 14. Ghi chú
 */
export async function parseVTTHFromExcel(buffer: Buffer): Promise<VTTHItem[]> {
  const handler = new ExcelHandler();
  const data = await handler.parse(buffer);

  // Get VTTH sheet
  const sheetName = 'VTTH';
  if (!data[sheetName]) {
    throw new Error(`Sheet 'VTTH' not found in Excel file`);
  }

  const rows = data[sheetName];
  const items: VTTHItem[] = [];

  for (const row of rows) {
    // Skip rows without name
    const name = row['Tên vật tư']?.toString() || '';
    if (!name) continue;

    // Parse data
    const stt = parseInt(row['STT']?.toString() || '0');
    const largeUnit = row['Đơn vị tính']?.toString() || '';
    const conversionRatio = parseFloat(row['Số lượng trong 1 ĐVT']?.toString() || '0');

    // Skip if invalid conversion ratio
    if (conversionRatio <= 0) {
      console.error(`[VTTH] Skipping '${name}': Invalid conversion ratio ${conversionRatio}`);
      continue;
    }

    // Parse consumption rates
    const basicConsumption = parseFloat(row['Gói đồng - Tiêu hao']?.toString() || '0');
    const goldConsumption = parseFloat(row['Gói vàng - Tiêu hao']?.toString() || '0');
    const silverConsumption = parseFloat(row['Gói bạc - Tiêu hao']?.toString() || '0');

    items.push(new VTTHItem({
      stt,
      name,
      price: parseFloat(row['Giá']?.toString() || '0'),
      largeUnit,
      conversionRatio,
      specification: row['Quy cách']?.toString(),
      unitPrice: parseFloat(row['Đơn giá']?.toString() || '0'),
      basicConsumption,
      goldConsumption,
      silverConsumption,
      notes: row['Ghi chú']?.toString()
    }));
  }

  console.error(`[VTTH] Parsed ${items.length} items from Excel`);
  return items;
}
