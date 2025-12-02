import ExcelJS from 'exceljs';
import { IFileHandler, SearchResult } from './IFileHandler.js';

export interface ExcelMetadata {
  sheets: SheetMetadata[];
  totalRows: number;
  totalColumns: number;
  author?: string;
  created?: Date;
  modified?: Date;
}

export interface SheetMetadata {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: string[];  // Column headers
}

/**
 * Excel file handler for .xlsx and .xls files
 * Uses ExcelJS for parsing and generation
 */
export class ExcelHandler implements IFileHandler {
  readonly supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // .xlsx
    'application/vnd.ms-excel'                                            // .xls
  ];

  async extractMetadata(content: Buffer, fileName: string): Promise<ExcelMetadata> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(content as any);

    const sheets: SheetMetadata[] = [];
    let totalRows = 0;
    let totalColumns = 0;

    workbook.eachSheet((worksheet) => {
      const columns: string[] = [];
      const headerRow = worksheet.getRow(1);

      headerRow.eachCell((cell) => {
        columns.push(cell.value?.toString() || '');
      });

      sheets.push({
        name: worksheet.name,
        rowCount: worksheet.rowCount,
        columnCount: worksheet.columnCount,
        columns
      });

      totalRows += worksheet.rowCount;
      totalColumns = Math.max(totalColumns, worksheet.columnCount);
    });

    return {
      sheets,
      totalRows,
      totalColumns,
      author: workbook.creator,
      created: workbook.created,
      modified: workbook.modified
    };
  }

  async search(content: Buffer, query: string): Promise<SearchResult[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(content as any);

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          const cellValue = cell.value?.toString() || '';
          if (cellValue.toLowerCase().includes(queryLower)) {
            const columnName = worksheet.getRow(1).getCell(colNumber).value?.toString() || `Column ${colNumber}`;
            results.push({
              snippet: cellValue,
              sheetName: worksheet.name,
              rowNumber,
              columnName,
              score: this.calculateRelevance(cellValue, query)
            });
          }
        });
      });
    });

    return results.sort((a, b) => b.score - a.score);
  }

  async parse(content: Buffer): Promise<Record<string, any[]>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(content as any);

    const data: Record<string, any[]> = {};

    workbook.eachSheet((worksheet) => {
      const rows: any[] = [];
      const headers: string[] = [];

      // Extract headers from first row
      worksheet.getRow(1).eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });

      // Extract data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1] || `Column${colNumber}`;
          rowData[header] = cell.value;
        });
        rows.push(rowData);
      });

      data[worksheet.name] = rows;
    });

    return data;
  }

  async serialize(data: Record<string, any[]>): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    for (const [sheetName, rows] of Object.entries(data)) {
      const worksheet = workbook.addWorksheet(sheetName);

      if (Array.isArray(rows) && rows.length > 0) {
        // Extract headers from first row
        const headers = Object.keys(rows[0]);
        worksheet.addRow(headers);

        // Add data rows
        rows.forEach((row: any) => {
          const values = headers.map(header => row[header]);
          worksheet.addRow(values);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          if (column) {
            column.width = 15;
          }
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private calculateRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match
    if (textLower === queryLower) return 1.0;

    // Starts with query
    if (textLower.startsWith(queryLower)) return 0.8;

    // Contains query
    if (textLower.includes(queryLower)) return 0.6;

    // Fuzzy match (simplified)
    return 0.3;
  }
}
