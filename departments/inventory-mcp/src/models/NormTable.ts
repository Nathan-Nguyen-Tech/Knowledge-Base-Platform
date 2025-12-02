import { ExcelHandler } from '@mcp/core';

export interface NormTableItem {
  category: 'VTTH' | 'HoaChat';  // Vật tư tiêu hao hoặc Hóa chất
  itemCode: string;
  itemName: string;
  unit: string;
  quantityPerPerson: number;
  notes?: string;
}

/**
 * Norm Table model - defines standard quantities per person
 * Excel format:
 * Row 1: Category | Item Code | Item Name | Unit | Qty/Person | Notes
 * Row 2+: Data
 */
export class NormTable {
  items: NormTableItem[];

  constructor(items: NormTableItem[]) {
    this.items = items;
  }

  static async parseFromExcel(buffer: Buffer): Promise<NormTable> {
    const handler = new ExcelHandler();
    const data = await handler.parse(buffer);

    // Get first sheet
    const sheetName = Object.keys(data)[0];
    if (!sheetName) {
      throw new Error('Norm table file is empty');
    }

    const rows = data[sheetName];
    const items: NormTableItem[] = [];

    for (const row of rows) {
      // Expected columns: Category, Item Code, Item Name, Unit, Qty/Person, Notes
      const category = row['Category']?.toString() as 'VTTH' | 'HoaChat';
      const itemCode = row['Item Code']?.toString() || row['Mã hàng']?.toString() || '';
      const itemName = row['Item Name']?.toString() || row['Tên hàng']?.toString() || '';
      const unit = row['Unit']?.toString() || row['Đơn vị']?.toString() || '';
      const quantityPerPerson = parseFloat(row['Qty/Person']?.toString() || row['SL/Người']?.toString() || '0');
      const notes = row['Notes']?.toString() || row['Ghi chú']?.toString();

      if (itemCode && itemName) {
        items.push({
          category,
          itemCode,
          itemName,
          unit,
          quantityPerPerson,
          notes
        });
      }
    }

    return new NormTable(items);
  }

  getTotalQuantityForTeam(teamSize: number): Map<string, { item: NormTableItem; totalQty: number }> {
    const totals = new Map<string, { item: NormTableItem; totalQty: number }>();

    for (const item of this.items) {
      const totalQty = item.quantityPerPerson * teamSize;
      totals.set(item.itemCode, {
        item,
        totalQty
      });
    }

    return totals;
  }

  getItemsByCategory(category: 'VTTH' | 'HoaChat'): NormTableItem[] {
    return this.items.filter(item => item.category === category);
  }
}
