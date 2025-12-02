export interface PurchaseOrderItem {
  itemCode: string;
  name: string;
  category: 'VTTH' | 'HoaChat';
  quantity: number;
  unit: string;
  estimatedCost: number;
  supplier?: string;
  notes?: string;
}

export interface PurchaseOrderData {
  id: string;
  teamName: string;
  teamSize: number;
  examDate: Date;
  createdDate: Date;
  items: PurchaseOrderItem[];
  status?: 'draft' | 'submitted' | 'approved' | 'ordered';
  totalCost?: number;
  notes?: string;
}

/**
 * Purchase Order model
 */
export class PurchaseOrder {
  data: PurchaseOrderData;

  constructor(data: PurchaseOrderData) {
    this.data = data;
    this.data.totalCost = this.getTotalCost();
  }

  getTotalCost(): number {
    return this.data.items.reduce((sum, item) => sum + item.estimatedCost, 0);
  }

  getItemsByCategory(category: 'VTTH' | 'HoaChat'): PurchaseOrderItem[] {
    return this.data.items.filter(item => item.category === category);
  }

  getItemCount(): number {
    return this.data.items.length;
  }

  toJSON() {
    return {
      teamName: this.data.teamName,
      teamSize: this.data.teamSize,
      examDate: this.data.examDate.toISOString().split('T')[0],
      createdDate: this.data.createdDate.toISOString(),
      itemCount: this.getItemCount(),
      totalCost: this.getTotalCost(),
      items: this.data.items,
      status: this.data.status || 'draft'
    };
  }
}
