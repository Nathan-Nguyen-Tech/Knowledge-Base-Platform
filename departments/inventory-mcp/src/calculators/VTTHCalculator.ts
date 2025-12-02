/**
 * VTTH Calculator
 * Workflow 1: Calculate VTTH (Vật tư tiêu hao) requirements
 */

import { ServicePackage } from '../types/ServicePackage.js';
import { VTTHItem, parseVTTHFromExcel } from '../models/VTTHItem.js';

/**
 * VTTH Requirement Result
 */
export interface VTTHRequirement {
  productName: string;
  specification?: string;  // Quy cách (từ Master Data)
  requiredSmallUnit: number;  // Số lượng cần (đơn vị nhỏ)
  purchaseQuantity: number;  // Số lượng mua (đơn vị lớn, làm tròn lên)
  largeUnit: string;  // Đơn vị lớn (Túi, Hộp, Chai)
  conversionRatio: number;  // Tỷ lệ quy đổi
  consumptionRate: number;  // Tiêu hao/khách (đơn vị nhỏ)
}

/**
 * Calculate VTTH requirements for a service package
 *
 * @param excelBuffer - Excel file buffer containing VTTH sheet
 * @param numCustomers - Number of customers
 * @param servicePackage - Service package (gold/basic/silver)
 * @returns Array of VTTH requirements
 */
export async function calculateVTTHRequirements(
  excelBuffer: Buffer,
  numCustomers: number,
  servicePackage: ServicePackage
): Promise<VTTHRequirement[]> {
  // Validate inputs
  if (numCustomers <= 0) {
    throw new Error(`Invalid number of customers: ${numCustomers}. Must be > 0`);
  }

  // Parse VTTH data from Excel
  const vtthItems = await parseVTTHFromExcel(excelBuffer);
  console.error(`[VTTH Calculator] Parsed ${vtthItems.length} items`);

  // Filter items for this package
  const relevantItems = vtthItems.filter(item => item.isInPackage(servicePackage));
  console.error(
    `[VTTH Calculator] Filtered to ${relevantItems.length} items for package '${servicePackage}'`
  );

  // Calculate requirements
  const requirements: VTTHRequirement[] = [];

  for (const item of relevantItems) {
    const consumptionRate = item.getConsumptionRate(servicePackage);
    const requiredSmallUnit = item.calculateRequired(numCustomers, servicePackage);
    const purchaseQuantity = item.calculatePurchaseQuantity(numCustomers, servicePackage);

    requirements.push({
      productName: item.data.name,
      specification: item.data.specification,
      requiredSmallUnit,
      purchaseQuantity,
      largeUnit: item.data.largeUnit,
      conversionRatio: item.data.conversionRatio,
      consumptionRate
    });
  }

  console.error(`[VTTH Calculator] Calculated ${requirements.length} requirements`);
  return requirements;
}

/**
 * Format VTTH requirements as human-readable text
 */
export function formatVTTHRequirements(
  requirements: VTTHRequirement[],
  numCustomers: number,
  servicePackage: ServicePackage
): string {
  const lines: string[] = [];

  lines.push(`# VTTH Requirements - ${servicePackage.toUpperCase()} Package`);
  lines.push(`Number of Customers: ${numCustomers}`);
  lines.push(`Total Items: ${requirements.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const req of requirements) {
    lines.push(`## ${req.productName}`);
    lines.push(`- Consumption Rate: ${req.consumptionRate} (per customer)`);
    lines.push(`- Required: ${req.requiredSmallUnit} (small unit)`);
    lines.push(
      `- Purchase: ${req.purchaseQuantity} ${req.largeUnit} (${req.conversionRatio} per ${req.largeUnit})`
    );
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format VTTH requirements as table data for Excel export
 */
export interface VTTHTableRow {
  'Tên vật tư': string;
  'Tiêu hao/khách': number;
  'Số lượng cần (nhỏ)': number;
  'Số lượng mua (lớn)': number;
  'Đơn vị': string;
  'Quy đổi': number;
}

export function formatVTTHAsTable(requirements: VTTHRequirement[]): VTTHTableRow[] {
  return requirements.map(req => ({
    'Tên vật tư': req.productName,
    'Tiêu hao/khách': req.consumptionRate,
    'Số lượng cần (nhỏ)': req.requiredSmallUnit,
    'Số lượng mua (lớn)': req.purchaseQuantity,
    'Đơn vị': req.largeUnit,
    'Quy đổi': req.conversionRatio
  }));
}
