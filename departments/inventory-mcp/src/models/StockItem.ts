export interface StockItemData {
  itemCode: string;
  itemName: string;
  category: 'VTTH' | 'HoaChat';
  currentQuantity: number;
  unit: string;
  minQuantity?: number;
  lastUpdated: Date;
  location?: string;
}

/**
 * Stock Item model - represents current inventory
 */
export class StockItem {
  data: StockItemData;

  constructor(data: StockItemData) {
    this.data = data;
  }

  isLowStock(): boolean {
    if (this.data.minQuantity === undefined) {
      return false;
    }
    return this.data.currentQuantity < this.data.minQuantity;
  }

  canFulfill(requiredQuantity: number): boolean {
    return this.data.currentQuantity >= requiredQuantity;
  }

  getShortfall(requiredQuantity: number): number {
    return Math.max(0, requiredQuantity - this.data.currentQuantity);
  }
}
