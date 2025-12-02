/**
 * Template-based Purchase Order Generator
 * Reads template from OneDrive and fills in placeholders
 * Preserves logo, formatting, fonts from template
 */

import ExcelJS from 'exceljs';
import { IStorageAdapter } from '@mcp/core';
import { PurchaseOrder, POMeta, POLineItem } from './POGeneratorV2.js';
import { getPOTemplatePath } from '../paths-config.js';

/**
 * Result of template parsing
 */
interface TemplateParseResult {
  metadataCells: Map<string, { row: number; col: number; address: string }>;
  lineItemRow: number;
  lineItemCells: Map<string, number>; // placeholder -> column number
}

/**
 * Options for template-based PO generation
 */
export interface TemplatePOOptions {
  fallbackToSimple?: boolean;
}

/**
 * Placeholder mapping from template to PO data fields
 * Using non-diacritical placeholders to avoid encoding issues
 */
const METADATA_MAPPING: Record<string, keyof POMeta | 'createdDateFormatted'> = {
  '{Ngaylap}': 'createdDateFormatted',
  '{Nguoidenghi}': 'requestedBy',
  '{Bophan}': 'department',
  '{Noidungyeucau}': 'contentDescription'
};

/**
 * Default values for metadata fields
 */
const METADATA_DEFAULTS: Record<string, string> = {
  '{Nguoidenghi}': 'Thục Bình',
  '{Bophan}': 'Bộ phận Kho'
};

const LINE_ITEM_MAPPING: Record<string, keyof POLineItem | 'specification'> = {
  '{Sothutu}': 'stt',
  '{Tensanpham}': 'productName',
  '{Quycach}': 'specification',
  '{Soluong}': 'quantity',
  '{donvi}': 'unit'
};

/**
 * Parse template worksheet to find all placeholders
 * @param worksheet - ExcelJS worksheet
 * @returns TemplateParseResult with placeholder locations
 */
function parseTemplatePlaceholders(worksheet: ExcelJS.Worksheet): TemplateParseResult {
  const metadataCells = new Map<string, { row: number; col: number; address: string }>();
  const lineItemCells = new Map<string, number>();
  let lineItemRow = -1;

  // Regex to match placeholders like {Ngày lập}, {STT}, etc.
  // Supports Vietnamese characters with diacritics and spaces
  const placeholderRegex = /\{[^}]+\}/g;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      // Safely get cell value - handle null, undefined, and rich text
      let cellValue = '';
      try {
        const rawValue = cell.value;
        if (rawValue != null) {
          // Handle rich text objects (ExcelJS returns { richText: [...] } for formatted text)
          if (typeof rawValue === 'object' && 'richText' in rawValue) {
            cellValue = (rawValue as { richText: Array<{ text: string }> }).richText
              .map(r => r.text)
              .join('');
          } else {
            cellValue = String(rawValue);
          }
        }
      } catch {
        cellValue = '';
      }
      const matches = cellValue.match(placeholderRegex);

      if (matches) {
        for (const match of matches) {
          // Check if this is a line item placeholder (contains {Sothutu})
          if (match === '{Sothutu}') {
            lineItemRow = rowNumber;
          }

          if (lineItemRow === rowNumber) {
            // This is a line item row - store column number
            lineItemCells.set(match, colNumber);
          } else if (lineItemRow === -1) {
            // This is a metadata placeholder (before line item row)
            metadataCells.set(match, {
              row: rowNumber,
              col: colNumber,
              address: cell.address
            });
          }
        }
      }
    });
  });

  if (lineItemRow === -1) {
    throw new Error('Template does not contain line item row (missing {Sothutu} placeholder)');
  }

  return {
    metadataCells,
    lineItemRow,
    lineItemCells
  };
}

/**
 * Replace metadata placeholders with actual values
 * @param worksheet - Target worksheet
 * @param metadataCells - Map of placeholders to cell locations
 * @param meta - PO metadata
 */
function replaceMetadataPlaceholders(
  worksheet: ExcelJS.Worksheet,
  metadataCells: Map<string, { row: number; col: number; address: string }>,
  meta: POMeta
): void {
  // Format date as Vietnamese format
  const createdDateFormatted = meta.createdDate.toLocaleDateString('vi-VN');

  // Build metadata values with defaults
  const metadataValues: Record<string, string> = {
    '{Ngaylap}': createdDateFormatted,
    '{Nguoidenghi}': meta.requestedBy || METADATA_DEFAULTS['{Nguoidenghi}'],
    '{Bophan}': meta.department || METADATA_DEFAULTS['{Bophan}'],
    '{Noidungyeucau}': meta.contentDescription || ''
  };

  for (const [placeholder, location] of metadataCells) {
    const cell = worksheet.getCell(location.address);
    // Safely get current value
    let currentValue = '';
    const rawValue = cell.value;
    if (rawValue != null) {
      if (typeof rawValue === 'object' && 'richText' in rawValue) {
        currentValue = (rawValue as { richText: Array<{ text: string }> }).richText
          .map(r => r.text)
          .join('');
      } else {
        currentValue = String(rawValue);
      }
    }
    const newValue = currentValue.replace(placeholder, metadataValues[placeholder] || '');
    cell.value = newValue;
  }
}

/**
 * Copy cell style from source to target
 */
function copyCellStyle(source: ExcelJS.Cell, target: ExcelJS.Cell): void {
  if (source.font) target.font = { ...source.font };
  if (source.fill) target.fill = { ...source.fill } as ExcelJS.Fill;
  if (source.border) target.border = { ...source.border };
  if (source.alignment) target.alignment = { ...source.alignment };
  if (source.numFmt) target.numFmt = source.numFmt;
}

/**
 * Get value for a line item placeholder
 */
function getLineItemValue(placeholder: string, item: POLineItem): string | number {
  switch (placeholder) {
    case '{Sothutu}':
      return item.stt;
    case '{Tensanpham}':
      return item.productName;
    case '{Quycach}':
      return item.specification || ''; // Quy cách từ Master Data
    case '{Soluong}':
      return item.quantity;
    case '{donvi}':
      return item.unit;
    default:
      return '';
  }
}

/**
 * Populate line items by copying template row and replacing placeholders
 * @param worksheet - Target worksheet
 * @param templateRowNum - Original template row number containing placeholders
 * @param lineItemCells - Map of placeholders to column numbers
 * @param lineItems - Array of line items
 */
function populateLineItems(
  worksheet: ExcelJS.Worksheet,
  templateRowNum: number,
  lineItemCells: Map<string, number>,
  lineItems: POLineItem[]
): void {
  const templateRow = worksheet.getRow(templateRowNum);

  // Store template row styles and column count
  const templateStyles: Map<number, ExcelJS.Cell> = new Map();
  const maxCol = Math.max(...Array.from(lineItemCells.values()), 1);

  for (let col = 1; col <= maxCol + 2; col++) {
    const cell = templateRow.getCell(col);
    templateStyles.set(col, cell);
  }

  // If no line items, clear the template row placeholders
  if (lineItems.length === 0) {
    for (const [placeholder, colNumber] of lineItemCells) {
      const cell = templateRow.getCell(colNumber);
      cell.value = '';
    }
    return;
  }

  // Populate each line item
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const targetRowNum = templateRowNum + i;
    const targetRow = worksheet.getRow(targetRowNum);

    // Copy styles from template row if not the first row (which already has styles)
    if (i > 0) {
      for (const [colNumber, templateCell] of templateStyles) {
        const targetCell = targetRow.getCell(colNumber);
        copyCellStyle(templateCell, targetCell);
      }
    }

    // Replace placeholders with actual values
    for (const [placeholder, colNumber] of lineItemCells) {
      const cell = targetRow.getCell(colNumber);
      const value = getLineItemValue(placeholder, item);
      cell.value = value;
    }

    targetRow.commit();
  }

  // Clear any remaining placeholder rows after data
  // (in case template had example data that we need to remove)
  let cleanupRowNum = templateRowNum + lineItems.length;
  let maxCleanupAttempts = 10; // Prevent infinite loop

  while (maxCleanupAttempts > 0) {
    const row = worksheet.getRow(cleanupRowNum);
    let hasPlaceholder = false;

    row.eachCell({ includeEmpty: false }, (cell) => {
      let text = '';
      const rawValue = cell.value;
      if (rawValue != null) {
        if (typeof rawValue === 'object' && 'richText' in rawValue) {
          text = (rawValue as { richText: Array<{ text: string }> }).richText
            .map(r => r.text)
            .join('');
        } else {
          text = String(rawValue);
        }
      }
      if (text.match(/\{[^}]+\}/)) {
        hasPlaceholder = true;
        cell.value = '';
      }
    });

    if (!hasPlaceholder) break;
    cleanupRowNum++;
    maxCleanupAttempts--;
  }
}

/**
 * Generate Purchase Order Excel using template from OneDrive
 *
 * @param storage - OneDrive storage adapter
 * @param po - Purchase Order data
 * @param options - Generation options
 * @returns Excel file buffer
 */
export async function generatePOFromTemplate(
  storage: IStorageAdapter,
  po: PurchaseOrder,
  options: TemplatePOOptions = {}
): Promise<Buffer> {
  const templatePath = getPOTemplatePath();

  try {
    // Step 1: Read template from OneDrive
    console.error(`[TemplatePOGenerator] Loading template from ${templatePath}...`);
    const templateBuffer = await storage.getFileContent(templatePath);

    // Step 2: Load template into ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer as any);

    // Step 3: Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Template has no worksheets');
    }

    console.error(`[TemplatePOGenerator] Parsing template placeholders...`);

    // Step 4: Parse template to find placeholders
    const parseResult = parseTemplatePlaceholders(worksheet);

    console.error(`[TemplatePOGenerator] Found ${parseResult.metadataCells.size} metadata placeholders`);
    console.error(`[TemplatePOGenerator] Line item row: ${parseResult.lineItemRow} with ${parseResult.lineItemCells.size} columns`);

    // Step 5: Replace metadata placeholders
    replaceMetadataPlaceholders(worksheet, parseResult.metadataCells, po.meta);

    // Step 6: Populate line items
    populateLineItems(
      worksheet,
      parseResult.lineItemRow,
      parseResult.lineItemCells,
      po.lineItems
    );

    // Step 7: Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    console.error(`[TemplatePOGenerator] Generated PO with ${po.lineItems.length} items using template`);

    return Buffer.from(buffer);

  } catch (error) {
    console.error(`[TemplatePOGenerator] Error: ${error instanceof Error ? error.message : String(error)}`);

    // Fallback to simple generation if enabled
    if (options.fallbackToSimple) {
      console.error('[TemplatePOGenerator] Falling back to simple PO generation...');
      const { createSimplePO } = await import('./POGeneratorV2.js');
      return await createSimplePO(po);
    }

    throw error;
  }
}

/**
 * Check if template file exists on OneDrive
 * @param storage - OneDrive storage adapter
 * @returns true if template exists
 */
export async function templateExists(storage: IStorageAdapter): Promise<boolean> {
  const templatePath = getPOTemplatePath();

  try {
    await storage.getFileContent(templatePath);
    return true;
  } catch {
    return false;
  }
}
