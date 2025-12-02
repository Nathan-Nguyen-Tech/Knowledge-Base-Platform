/**
 * Purchase Order Generator V2
 * Workflow 4: Generate purchase order using template
 * QT003: Use template, large units only, integers only
 */

import ExcelJS from 'exceljs';
import { VTTHComparison } from '../calculators/InventoryComparator.js';
import { ChemicalComparison, SupplementComparison } from '../calculators/InventoryComparator.js';

/**
 * Purchase Order Line Item
 */
export interface POLineItem {
  stt: number;  // STT (row number)
  productName: string;  // Tên sản phẩm
  quantity: number;  // Số lượng (large unit, integer)
  unit: string;  // Đơn vị (Hộp, Thùng, Túi, etc.)
  notes?: string;  // Ghi chú
}

/**
 * Purchase Order Metadata
 */
export interface POMeta {
  poNumber: string;  // Số phiếu
  department: string;  // Khoa/Phòng ban
  createdDate: Date;  // Ngày lập
  requestedBy?: string;  // Người yêu cầu
  approvedBy?: string;  // Người duyệt
  notes?: string;  // Ghi chú chung
}

/**
 * Complete Purchase Order
 */
export interface PurchaseOrder {
  meta: POMeta;
  lineItems: POLineItem[];
}

/**
 * Generate Purchase Order from comparison results
 * Only includes items with status 'need_to_purchase' or 'not_found'
 *
 * @param vtth - VTTH comparison results
 * @param chemicals - Chemical comparison results
 * @param supplements - Supplement comparison results
 * @param meta - PO metadata
 * @returns Purchase Order
 */
export function generatePurchaseOrder(
  vtth: VTTHComparison[],
  chemicals: ChemicalComparison[],
  supplements: SupplementComparison[],
  meta: Partial<POMeta>
): PurchaseOrder {
  const lineItems: POLineItem[] = [];
  let stt = 1;

  // Add VTTH items that need purchase
  for (const item of vtth) {
    if (item.status === 'need_to_purchase' || item.status === 'not_found') {
      // QT003: Large unit only, integer only
      const quantity = Math.ceil(item.purchaseQuantity);

      lineItems.push({
        stt: stt++,
        productName: item.productName,
        quantity,
        unit: item.largeUnit,
        notes: item.status === 'not_found' ? 'Không tìm thấy trong tồn kho' : undefined
      });
    }
  }

  // Add Chemical items that need purchase
  for (const item of chemicals) {
    if (item.status === 'need_to_purchase' || item.status === 'not_found') {
      // QT003: Large unit only, integer only
      const quantity = Math.ceil(item.purchaseQuantity);

      lineItems.push({
        stt: stt++,
        productName: item.testName,
        quantity,
        unit: item.purchaseUnit,
        notes: item.status === 'not_found' ? 'Không tìm thấy trong tồn kho' : undefined
      });
    }
  }

  // Add Supplement items that need purchase
  for (const item of supplements) {
    if (item.status === 'need_to_purchase' || item.status === 'not_found') {
      // QT003: Integer only
      const quantity = Math.ceil(item.shortage);

      lineItems.push({
        stt: stt++,
        productName: item.name,
        quantity,
        unit: item.unit,
        notes: item.status === 'not_found' ? 'Không tìm thấy trong tồn kho (QC/CALIB)' : 'QC/CALIB supplement'
      });
    }
  }

  // Generate PO number if not provided
  const poNumber = meta.poNumber || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const poMeta: POMeta = {
    poNumber,
    department: meta.department || 'Phòng Lab',
    createdDate: meta.createdDate || new Date(),
    requestedBy: meta.requestedBy,
    approvedBy: meta.approvedBy,
    notes: meta.notes
  };

  console.error(`[PO Generator] Generated PO with ${lineItems.length} line items`);

  return {
    meta: poMeta,
    lineItems
  };
}

/**
 * Write Purchase Order to Excel using template
 * QT003: Copy template and fill data
 *
 * @param po - Purchase Order
 * @param templateBuffer - Template Excel file buffer
 * @returns Excel file buffer
 */
export async function writePOToExcel(
  po: PurchaseOrder,
  templateBuffer: Buffer
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer as any);

  // Get template sheet
  const templateSheet = workbook.getWorksheet('Phiếu mua hàng mẫu version 1');
  if (!templateSheet) {
    throw new Error('Template sheet "Phiếu mua hàng mẫu version 1" not found');
  }

  // Create new sheet by copying template
  const newSheet = workbook.addWorksheet('Phiếu Mua Hàng');

  // Copy template structure (assuming template has headers and format)
  // Note: This is a simplified version, actual implementation may need more sophisticated copying
  templateSheet.eachRow((row, rowNumber) => {
    const newRow = newSheet.getRow(rowNumber);
    row.eachCell((cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      newCell.value = cell.value;
      newCell.style = cell.style;
    });
  });

  // Fill metadata (assuming standard positions)
  // These row/column positions should match the template structure
  const metaStartRow = 2;
  newSheet.getCell(`B${metaStartRow}`).value = po.meta.poNumber;
  newSheet.getCell(`B${metaStartRow + 1}`).value = po.meta.department;
  newSheet.getCell(`B${metaStartRow + 2}`).value = po.meta.createdDate.toISOString().slice(0, 10);

  if (po.meta.requestedBy) {
    newSheet.getCell(`B${metaStartRow + 3}`).value = po.meta.requestedBy;
  }
  if (po.meta.approvedBy) {
    newSheet.getCell(`B${metaStartRow + 4}`).value = po.meta.approvedBy;
  }

  // Fill line items (assuming table starts at row 8)
  const lineItemStartRow = 8;

  for (let i = 0; i < po.lineItems.length; i++) {
    const item = po.lineItems[i];
    const rowNum = lineItemStartRow + i;

    newSheet.getCell(`A${rowNum}`).value = item.stt;
    newSheet.getCell(`B${rowNum}`).value = item.productName;
    newSheet.getCell(`C${rowNum}`).value = item.quantity;  // QT003: Integer
    newSheet.getCell(`D${rowNum}`).value = item.unit;

    if (item.notes) {
      newSheet.getCell(`E${rowNum}`).value = item.notes;
    }
  }

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  console.error(`[PO Generator] Excel file generated with ${po.lineItems.length} items`);

  return buffer as unknown as Buffer;
}

/**
 * Format Purchase Order as human-readable text
 */
export function formatPurchaseOrder(po: PurchaseOrder): string {
  const lines: string[] = [];

  lines.push('# Purchase Order');
  lines.push('');
  lines.push('## Metadata');
  lines.push(`- PO Number: ${po.meta.poNumber}`);
  lines.push(`- Department: ${po.meta.department}`);
  lines.push(`- Created Date: ${po.meta.createdDate.toISOString().slice(0, 10)}`);

  if (po.meta.requestedBy) {
    lines.push(`- Requested By: ${po.meta.requestedBy}`);
  }
  if (po.meta.approvedBy) {
    lines.push(`- Approved By: ${po.meta.approvedBy}`);
  }
  if (po.meta.notes) {
    lines.push(`- Notes: ${po.meta.notes}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Line Items');
  lines.push('');
  lines.push(`Total Items: ${po.lineItems.length}`);
  lines.push('');

  for (const item of po.lineItems) {
    lines.push(`${item.stt}. **${item.productName}**`);
    lines.push(`   - Quantity: ${item.quantity} ${item.unit}`);

    if (item.notes) {
      lines.push(`   - Notes: ${item.notes}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Simple template-based PO generation without reading template
 * Creates a basic Excel structure for PO
 *
 * @param po - Purchase Order
 * @returns Excel file buffer
 */
export async function createSimplePO(po: PurchaseOrder): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Phiếu Mua Hàng');

  // Set column widths
  sheet.columns = [
    { width: 8 },   // STT
    { width: 40 },  // Tên sản phẩm
    { width: 12 },  // Số lượng
    { width: 12 },  // Đơn vị
    { width: 30 }   // Ghi chú
  ];

  // Add metadata
  sheet.addRow(['Phiếu Mua Hàng']);
  sheet.addRow([]);
  sheet.addRow(['Số phiếu:', po.meta.poNumber]);
  sheet.addRow(['Khoa/Phòng ban:', po.meta.department]);
  sheet.addRow(['Ngày lập:', po.meta.createdDate.toISOString().slice(0, 10)]);

  if (po.meta.requestedBy) {
    sheet.addRow(['Người yêu cầu:', po.meta.requestedBy]);
  }
  if (po.meta.approvedBy) {
    sheet.addRow(['Người duyệt:', po.meta.approvedBy]);
  }

  sheet.addRow([]);

  // Add header row
  const headerRow = sheet.addRow(['STT', 'Tên sản phẩm', 'Số lượng', 'Đơn vị', 'Ghi chú']);
  headerRow.font = { bold: true };

  // Add line items
  for (const item of po.lineItems) {
    sheet.addRow([item.stt, item.productName, item.quantity, item.unit, item.notes || '']);
  }

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  console.error(`[PO Generator] Simple PO generated with ${po.lineItems.length} items`);

  return buffer as unknown as Buffer;
}
