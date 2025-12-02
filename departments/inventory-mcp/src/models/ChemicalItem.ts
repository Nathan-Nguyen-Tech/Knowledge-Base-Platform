/**
 * Chemical Item Models
 * Represents chemicals with QC/CALIB logic
 */

import { ServicePackage } from '../types/ServicePackage.js';
import { ExcelHandler } from '@mcp/core';
import {
  needsQcCalib,
  isLargeVolume,
  getChemicalUnit,
  calculateChemicalPurchaseQuantity,
  DEFAULT_QC_TESTS,
  DEFAULT_CALIB_TESTS
} from '../utils/chemical-helpers.js';
import { normalizeName, findBestMatch } from '../utils/name-normalizer.js';

/**
 * Chemical from PRIMARY sheet (Hoa Chat Chi Tiet)
 * Used for filtering by package
 */
export interface ChemicalPrimaryData {
  compassCode?: string;  // Mã Compass
  supplierCode?: string;  // Mã NCC
  productType?: string;  // Loại sản phẩm
  testName: string;  // Tên xét nghiệm ⭐
  category?: string;  // Danh mục
  chemicalType: string;  // Loại hóa chất ⭐ (MUST be "Chạy mẫu")
  testType?: string;  // Loại xét nghiệm
  specification?: string;  // Quy cách
  totalCost?: number;  // Tổng thành tiền
  vialsPerBox: number;  // Số lọ (Lọ/hộp) ⭐
  testsPerVial: number;  // Số test (test/lọ) ⭐
  unitPrice?: number;  // Đơn giá

  // Package markers (x = included, empty = not included)
  hasGold: boolean;  // Gói vàng ⭐
  hasBasic: boolean;  // Gói đồng ⭐
  hasSilver: boolean;  // Gói bạc ⭐
}

/**
 * Chemical from SECONDARY sheet (Hoa Chat)
 * Used for QC/CALIB lookup
 */
export interface ChemicalQcCalibData {
  stt?: number;
  category?: string;
  testType: string;  // Loại xét nghiệm ⭐ (for matching)
  description?: string;
  qcTestsPerRun: number;  // Số test cho 1 lần QC ⭐
  calibTestsPerRun: number;  // Số test cho 1 lần calib ⭐
}

/**
 * Complete Chemical Item with QC/CALIB
 */
export interface ChemicalItemData extends ChemicalPrimaryData {
  qcTests: number;  // QC tests per run
  calibTests: number;  // CALIB tests per run
}

export class ChemicalItem {
  data: ChemicalItemData;

  constructor(data: ChemicalItemData) {
    this.data = data;
  }

  /**
   * Check if chemical is in package
   */
  isInPackage(pkg: ServicePackage): boolean {
    switch (pkg) {
      case 'gold':
        return this.data.hasGold;
      case 'basic':
        return this.data.hasBasic;
      case 'silver':
        return this.data.hasSilver;
    }
  }

  /**
   * Calculate total tests needed
   * Total = Customer tests + QC tests + CALIB tests
   */
  calculateTotalTests(numCustomers: number): number {
    return numCustomers + this.data.qcTests + this.data.calibTests;
  }

  /**
   * Calculate containers needed (vials)
   * Containers = ROUND UP(Total tests ÷ Tests per vial)
   */
  calculateContainersNeeded(numCustomers: number): number {
    const totalTests = this.calculateTotalTests(numCustomers);
    return Math.ceil(totalTests / this.data.testsPerVial);
  }

  /**
   * Calculate purchase quantity
   * Large volume: containers
   * Normal: ROUND UP(containers ÷ vials per box)
   */
  calculatePurchaseQuantity(numCustomers: number): number {
    const containersNeeded = this.calculateContainersNeeded(numCustomers);
    return calculateChemicalPurchaseQuantity(
      containersNeeded,
      this.data.vialsPerBox,
      this.data.testName
    );
  }

  /**
   * Get purchase unit
   */
  getPurchaseUnit(): string {
    return getChemicalUnit(this.data.testName);
  }
}

/**
 * Parse Chemical Primary data from "Hoa Chat Chi Tiet" sheet
 */
export async function parseChemicalPrimaryFromExcel(
  buffer: Buffer
): Promise<ChemicalPrimaryData[]> {
  const handler = new ExcelHandler();
  const data = await handler.parse(buffer);

  const sheetName = 'Hoa Chat Chi Tiet';
  if (!data[sheetName]) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const rows = data[sheetName];
  const items: ChemicalPrimaryData[] = [];

  for (const row of rows) {
    const testName = row['Tên xét nghiệm']?.toString() || '';
    const chemicalType = row['Loại hóa chất']?.toString() || '';

    if (!testName) continue;

    // Parse numeric values
    const vialsPerBox = parseFloat(row['Số lọ (Lọ/hộp)']?.toString() || '0');
    const testsPerVial = parseFloat(row['Số test (test/lọ)']?.toString() || '0');

    // Skip if invalid data
    if (vialsPerBox <= 0 || testsPerVial <= 0) {
      console.error(`[Chemical] Skipping '${testName}': Invalid vials/tests`);
      continue;
    }

    // Parse package markers (x = included)
    const hasGold = (row['Gói vàng']?.toString() || '').toLowerCase().includes('x');
    const hasBasic = (row['Gói đồng']?.toString() || '').toLowerCase().includes('x');
    const hasSilver = (row['Gói bạc']?.toString() || '').toLowerCase().includes('x');

    items.push({
      compassCode: row['Mã Compass']?.toString(),
      supplierCode: row['Mã NCC']?.toString(),
      productType: row['Loại sản phẩm']?.toString(),
      testName,
      category: row['Danh mục']?.toString(),
      chemicalType,
      testType: row['Loại xét nghiệm']?.toString(),
      specification: row['Quy cách']?.toString(),
      totalCost: parseFloat(row['Tổng thành tiền']?.toString() || '0'),
      vialsPerBox,
      testsPerVial,
      unitPrice: parseFloat(row['Đơn giá']?.toString() || '0'),
      hasGold,
      hasBasic,
      hasSilver
    });
  }

  console.error(`[Chemical Primary] Parsed ${items.length} items`);
  return items;
}

/**
 * Parse QC/CALIB data from "Hoa Chat" sheet
 */
export async function parseChemicalQcCalibFromExcel(
  buffer: Buffer
): Promise<Map<string, ChemicalQcCalibData>> {
  const handler = new ExcelHandler();
  const data = await handler.parse(buffer);

  const sheetName = 'Hoa Chat';
  if (!data[sheetName]) {
    console.error(`[Chemical QC/CALIB] Sheet '${sheetName}' not found, will use defaults`);
    return new Map();
  }

  const rows = data[sheetName];
  const qcCalibMap = new Map<string, ChemicalQcCalibData>();

  for (const row of rows) {
    const testType = row['Loại xét nghiệm']?.toString() || '';
    if (!testType) continue;

    const qcTests = parseFloat(row['Số test cho 1 lần QC']?.toString() || DEFAULT_QC_TESTS.toString());
    const calibTests = parseFloat(row['Số test cho 1 lần calib']?.toString() || DEFAULT_CALIB_TESTS.toString());

    // Normalize name for matching
    const normalizedName = normalizeName(testType);

    qcCalibMap.set(normalizedName, {
      stt: parseInt(row['STT']?.toString() || '0'),
      category: row['Danh mục']?.toString(),
      testType,
      description: row['Diễn giải']?.toString(),
      qcTestsPerRun: qcTests,
      calibTestsPerRun: calibTests
    });
  }

  console.error(`[Chemical QC/CALIB] Parsed ${qcCalibMap.size} items`);
  return qcCalibMap;
}

/**
 * Combine PRIMARY and SECONDARY data
 * Returns complete ChemicalItem with QC/CALIB
 */
export function combineChemicalData(
  primary: ChemicalPrimaryData[],
  qcCalibMap: Map<string, ChemicalQcCalibData>
): ChemicalItem[] {
  const items: ChemicalItem[] = [];

  for (const prim of primary) {
    // Check if needs QC/CALIB
    const needsQc = needsQcCalib(prim.testName);

    let qcTests = 0;
    let calibTests = 0;

    if (needsQc) {
      // Try exact match first
      const normalizedName = normalizeName(prim.testName);
      const qcCalib = qcCalibMap.get(normalizedName);

      if (qcCalib) {
        // Found exact match
        qcTests = qcCalib.qcTestsPerRun;
        calibTests = qcCalib.calibTestsPerRun;
      } else {
        // Try fuzzy match
        const allNames = Array.from(qcCalibMap.values()).map(v => v.testType);
        const match = findBestMatch(prim.testName, allNames, 85);

        if (match) {
          const matchedData = qcCalibMap.get(normalizeName(match.match));
          if (matchedData) {
            qcTests = matchedData.qcTestsPerRun;
            calibTests = matchedData.calibTestsPerRun;
            console.error(
              `[Chemical] Fuzzy matched '${prim.testName}' → '${match.match}' (${match.similarity}%)`
            );
          }
        } else {
          // Use defaults
          qcTests = DEFAULT_QC_TESTS;
          calibTests = DEFAULT_CALIB_TESTS;
          console.error(
            `[Chemical] No match for '${prim.testName}', using defaults (QC=${qcTests}, CALIB=${calibTests})`
          );
        }
      }
    }

    items.push(new ChemicalItem({
      ...prim,
      qcTests,
      calibTests
    }));
  }

  console.error(`[Chemical] Combined ${items.length} complete items`);
  return items;
}

/**
 * Filter chemicals by package and type
 * QT002: 2-table filtering process
 */
export function filterChemicalsByPackage(
  chemicals: ChemicalItem[],
  pkg: ServicePackage
): ChemicalItem[] {
  return chemicals.filter(chem => {
    // Condition 1: Chemical type must be "Chạy mẫu"
    const isRunSample = chem.data.chemicalType === 'Chạy mẫu';

    // Condition 2: Must have package marker
    const hasPackage = chem.isInPackage(pkg);

    return isRunSample && hasPackage;
  });
}
