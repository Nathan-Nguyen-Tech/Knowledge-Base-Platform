/**
 * Chemical Calculator
 * Workflow 2: Calculate Chemical requirements with QC/CALIB logic
 */

import { ServicePackage } from '../types/ServicePackage.js';
import {
  ChemicalItem,
  parseChemicalPrimaryFromExcel,
  parseChemicalQcCalibFromExcel,
  combineChemicalData,
  filterChemicalsByPackage
} from '../models/ChemicalItem.js';
import {
  QcCalibSupplement,
  getApplicableSupplements
} from '../utils/chemical-helpers.js';

/**
 * Chemical Requirement Result
 */
export interface ChemicalRequirement {
  testName: string;
  chemicalType: string;
  customerTests: number;  // Số test khách hàng
  qcTests: number;  // Số test QC
  calibTests: number;  // Số test CALIB
  totalTests: number;  // Tổng số test
  testsPerVial: number;  // Test/lọ
  containersNeeded: number;  // Số lọ cần
  vialsPerBox: number;  // Lọ/hộp (hoặc Thùng nếu 20L)
  purchaseQuantity: number;  // Số lượng mua (Hộp hoặc Thùng)
  purchaseUnit: string;  // Đơn vị mua (Hộp hoặc Thùng)
}

/**
 * Supplement Requirement
 */
export interface SupplementRequirement {
  name: string;
  quantity: number;
  unit: string;
}

/**
 * Complete Chemical Calculation Result
 */
export interface ChemicalCalculationResult {
  requirements: ChemicalRequirement[];
  supplements: SupplementRequirement[];
}

/**
 * Calculate Chemical requirements for a service package
 *
 * @param excelBuffer - Excel file buffer containing both chemical sheets
 * @param numCustomers - Number of customers
 * @param servicePackage - Service package (gold/basic/silver)
 * @param includeSupplements - Whether to include QC/CALIB supplements (default: true)
 * @returns Chemical requirements and supplements
 */
export async function calculateChemicalRequirements(
  excelBuffer: Buffer,
  numCustomers: number,
  servicePackage: ServicePackage,
  includeSupplements: boolean = true
): Promise<ChemicalCalculationResult> {
  // Validate inputs
  if (numCustomers <= 0) {
    throw new Error(`Invalid number of customers: ${numCustomers}. Must be > 0`);
  }

  // Parse PRIMARY data (Hoa Chat Chi Tiet)
  const primaryData = await parseChemicalPrimaryFromExcel(excelBuffer);
  console.error(`[Chemical Calculator] Parsed ${primaryData.length} primary items`);

  // Parse SECONDARY data (Hoa Chat) for QC/CALIB lookup
  const qcCalibMap = await parseChemicalQcCalibFromExcel(excelBuffer);
  console.error(`[Chemical Calculator] Parsed ${qcCalibMap.size} QC/CALIB items`);

  // Combine PRIMARY + SECONDARY data
  const chemicals = combineChemicalData(primaryData, qcCalibMap);
  console.error(`[Chemical Calculator] Combined ${chemicals.length} complete items`);

  // Filter by package (QT002: 2-table filtering)
  const relevantChemicals = filterChemicalsByPackage(chemicals, servicePackage);
  console.error(
    `[Chemical Calculator] Filtered to ${relevantChemicals.length} items for package '${servicePackage}'`
  );

  // Calculate requirements
  const requirements: ChemicalRequirement[] = [];

  for (const chem of relevantChemicals) {
    const totalTests = chem.calculateTotalTests(numCustomers);
    const containersNeeded = chem.calculateContainersNeeded(numCustomers);
    const purchaseQuantity = chem.calculatePurchaseQuantity(numCustomers);

    requirements.push({
      testName: chem.data.testName,
      chemicalType: chem.data.chemicalType,
      customerTests: numCustomers,
      qcTests: chem.data.qcTests,
      calibTests: chem.data.calibTests,
      totalTests,
      testsPerVial: chem.data.testsPerVial,
      containersNeeded,
      vialsPerBox: chem.data.vialsPerBox,
      purchaseQuantity,
      purchaseUnit: chem.getPurchaseUnit()
    });
  }

  console.error(`[Chemical Calculator] Calculated ${requirements.length} requirements`);

  // Calculate supplements
  const supplements: SupplementRequirement[] = [];

  if (includeSupplements) {
    const chemicalNames = relevantChemicals.map(c => c.data.testName);
    const applicableSupplements = getApplicableSupplements(chemicalNames);

    for (const supplement of applicableSupplements) {
      supplements.push({
        name: supplement.name,
        quantity: supplement.quantity,
        unit: supplement.unit
      });
    }

    console.error(`[Chemical Calculator] Added ${supplements.length} supplements`);
  }

  return {
    requirements,
    supplements
  };
}

/**
 * Format Chemical requirements as human-readable text
 */
export function formatChemicalRequirements(
  result: ChemicalCalculationResult,
  numCustomers: number,
  servicePackage: ServicePackage
): string {
  const lines: string[] = [];

  lines.push(`# Chemical Requirements - ${servicePackage.toUpperCase()} Package`);
  lines.push(`Number of Customers: ${numCustomers}`);
  lines.push(`Total Chemicals: ${result.requirements.length}`);
  lines.push(`Supplements: ${result.supplements.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Chemicals');
  lines.push('');

  for (const req of result.requirements) {
    lines.push(`### ${req.testName}`);
    lines.push(`- Type: ${req.chemicalType}`);
    lines.push(`- Customer Tests: ${req.customerTests}`);
    lines.push(`- QC Tests: ${req.qcTests}`);
    lines.push(`- CALIB Tests: ${req.calibTests}`);
    lines.push(`- **Total Tests: ${req.totalTests}**`);
    lines.push(`- Tests per Vial: ${req.testsPerVial}`);
    lines.push(`- Containers Needed: ${req.containersNeeded} vials`);
    lines.push(`- Vials per Box: ${req.vialsPerBox}`);
    lines.push(`- **Purchase: ${req.purchaseQuantity} ${req.purchaseUnit}**`);
    lines.push('');
  }

  if (result.supplements.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## QC/CALIB Supplements');
    lines.push('');

    for (const supp of result.supplements) {
      lines.push(`- ${supp.name}: ${supp.quantity} ${supp.unit}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format Chemical requirements as table data for Excel export
 */
export interface ChemicalTableRow {
  'Tên xét nghiệm': string;
  'Loại hóa chất': string;
  'Test khách': number;
  'Test QC': number;
  'Test CALIB': number;
  'Tổng test': number;
  'Test/lọ': number;
  'Số lọ cần': number;
  'Lọ/hộp': number;
  'Số lượng mua': number;
  'Đơn vị': string;
}

export function formatChemicalAsTable(requirements: ChemicalRequirement[]): ChemicalTableRow[] {
  return requirements.map(req => ({
    'Tên xét nghiệm': req.testName,
    'Loại hóa chất': req.chemicalType,
    'Test khách': req.customerTests,
    'Test QC': req.qcTests,
    'Test CALIB': req.calibTests,
    'Tổng test': req.totalTests,
    'Test/lọ': req.testsPerVial,
    'Số lọ cần': req.containersNeeded,
    'Lọ/hộp': req.vialsPerBox,
    'Số lượng mua': req.purchaseQuantity,
    'Đơn vị': req.purchaseUnit
  }));
}

export interface SupplementTableRow {
  'Tên sản phẩm': string;
  'Số lượng': number;
  'Đơn vị': string;
}

export function formatSupplementsAsTable(supplements: SupplementRequirement[]): SupplementTableRow[] {
  return supplements.map(supp => ({
    'Tên sản phẩm': supp.name,
    'Số lượng': supp.quantity,
    'Đơn vị': supp.unit
  }));
}
