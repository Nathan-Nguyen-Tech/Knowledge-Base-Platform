import ExcelJS from 'exceljs';
import { PurchaseOrder } from '../models/PurchaseOrder.js';

/**
 * Purchase Order Generator utility
 * Generates formatted Excel purchase orders
 */
export class POGenerator {
  static async generateExcel(po: PurchaseOrder): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Phiếu Mua Hàng');

    // Title
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'PHIẾU MUA HÀNG';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Metadata section
    worksheet.getCell('A3').value = 'Tên đoàn khám:';
    worksheet.getCell('B3').value = po.data.teamName;
    worksheet.getCell('A4').value = 'Số lượng người:';
    worksheet.getCell('B4').value = po.data.teamSize;
    worksheet.getCell('A5').value = 'Ngày khám:';
    worksheet.getCell('B5').value = po.data.examDate.toLocaleDateString('vi-VN');
    worksheet.getCell('A6').value = 'Ngày tạo phiếu:';
    worksheet.getCell('B6').value = po.data.createdDate.toLocaleDateString('vi-VN');
    worksheet.getCell('A7').value = 'Trạng thái:';
    worksheet.getCell('B7').value = po.data.status || 'draft';

    // Style metadata
    for (let row = 3; row <= 7; row++) {
      worksheet.getCell(`A${row}`).font = { bold: true };
    }

    // Headers
    const headerRow = worksheet.getRow(9);
    headerRow.values = [
      'STT',
      'Mã hàng',
      'Tên hàng',
      'Loại',
      'Số lượng',
      'Đơn vị',
      'Ước tính giá',
      'Ghi chú'
    ];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Data rows
    let rowIndex = 10;
    po.data.items.forEach((item, index) => {
      const row = worksheet.getRow(rowIndex++);
      row.values = [
        index + 1,
        item.itemCode,
        item.name,
        item.category,
        item.quantity,
        item.unit,
        item.estimatedCost,
        item.notes || ''
      ];
      row.alignment = { vertical: 'middle' };
    });

    // Total row
    const totalRow = worksheet.getRow(rowIndex + 1);
    totalRow.getCell(1).value = 'TỔNG CỘNG:';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(5).value = po.data.items.reduce((sum, item) => sum + item.quantity, 0);
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(7).value = po.getTotalCost();
    totalRow.getCell(7).font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' }
    };

    // Column widths
    worksheet.columns = [
      { width: 6 },   // STT
      { width: 12 },  // Mã hàng
      { width: 35 },  // Tên hàng
      { width: 10 },  // Loại
      { width: 12 },  // Số lượng
      { width: 10 },  // Đơn vị
      { width: 15 },  // Ước tính giá
      { width: 40 }   // Ghi chú
    ];

    // Borders for data table
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    for (let i = 9; i <= rowIndex + 1; i++) {
      worksheet.getRow(i).eachCell((cell) => {
        cell.border = borderStyle;
      });
    }

    // Number formatting
    worksheet.getColumn(7).numFmt = '#,##0';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
