/**
 * Chemical-specific Helper Functions
 * Các hàm hỗ trợ cho logic hóa chất
 */

import { containsAnyKeyword, findBestMatch } from './name-normalizer.js';

/**
 * Keywords to skip QC/CALIB
 * Các từ khóa bỏ qua QC/CALIB
 */
export const QC_CALIB_SKIP_KEYWORDS = [
  'wash',
  'dung dịch',
  'diluit',
  'lyse',
  'clean',
  'dye',
  'tiểu'
];

/**
 * Keywords for large volume chemicals (20L)
 * Hóa chất thể tích lớn
 */
export const LARGE_VOLUME_KEYWORDS = [
  '20L',
  '20l',
  '20 L',
  '20 l'
];

/**
 * Default QC/CALIB values
 */
export const DEFAULT_QC_TESTS = 2;
export const DEFAULT_CALIB_TESTS = 4;

/**
 * Check if chemical needs QC/CALIB
 * Return false if chemical contains skip keywords
 */
export function needsQcCalib(chemicalName: string): boolean {
  return !containsAnyKeyword(chemicalName, QC_CALIB_SKIP_KEYWORDS);
}

/**
 * Check if chemical is large volume (20L)
 * Should be purchased by "Thùng" (container) instead of "Hộp" (box)
 */
export function isLargeVolume(chemicalName: string): boolean {
  return containsAnyKeyword(chemicalName, LARGE_VOLUME_KEYWORDS);
}

/**
 * Get unit name for chemical
 * Returns "Thùng" for large volume, "Hộp" for normal
 */
export function getChemicalUnit(chemicalName: string): string {
  return isLargeVolume(chemicalName) ? 'Thùng' : 'Hộp';
}

/**
 * Calculate purchase quantity for chemical
 * Large volume: containers needed (no division by vials/box)
 * Normal: ROUND UP(containers ÷ vials per box)
 */
export function calculateChemicalPurchaseQuantity(
  containersNeeded: number,
  vialsPerBox: number,
  chemicalName: string
): number {
  if (isLargeVolume(chemicalName)) {
    // Large volume: buy by container directly
    return containersNeeded;
  } else {
    // Normal: convert containers to boxes (round up)
    return Math.ceil(containersNeeded / vialsPerBox);
  }
}

/**
 * QC/CALIB Supplements Configuration
 */
export interface QcCalibSupplement {
  name: string;
  quantity: number;
  unit: string;
  specification?: string;  // Quy cách (từ Master Data)
  condition?: (chemicals: string[]) => boolean;
}

export const QC_CALIB_SUPPLEMENTS: QcCalibSupplement[] = [
  {
    name: 'ERBA PATH',  // Matches Master Data exactly
    quantity: 2,
    unit: 'vial'
  },
  {
    name: 'ERBA NORM (Control Level-2)',  // Updated to match Master Data
    quantity: 2,
    unit: 'vial'
  },
  {
    name: 'XL MULTICAL-Calib chung cho hóa chất',  // Updated to match Master Data
    quantity: 2,
    unit: 'vial'
  },
  {
    name: 'HDL/LDL Cal',  // Matches Master Data exactly
    quantity: 1,
    unit: 'vial',
    condition: (chemicals: string[]) => {
      // Only add if there's HDL or LDL test
      return chemicals.some(name => {
        const normalized = name.toLowerCase();
        return normalized.includes('hdl') || normalized.includes('ldl');
      });
    }
  }
];

/**
 * Get applicable supplements based on chemicals list
 */
export function getApplicableSupplements(chemicals: string[]): QcCalibSupplement[] {
  return QC_CALIB_SUPPLEMENTS.filter(supplement => {
    if (supplement.condition) {
      return supplement.condition(chemicals);
    }
    return true;
  });
}

/**
 * Chemical data interface for lookup (simplified)
 */
export interface ChemicalLookupData {
  testName: string;
  specification?: string;
  largeUnit?: string;  // Đơn vị lớn (Hộp, Thùng, etc.)
}

/**
 * Enrich supplements with data from Master Data (Hoa Chat Chi Tiet)
 * Looks up each supplement name in the chemical data to get specification and unit
 *
 * @param supplements - Applicable supplements
 * @param chemicalData - Parsed chemical data from Master Data
 * @returns Enriched supplements with specification and proper unit
 */
export function enrichSupplementsWithChemicalData(
  supplements: QcCalibSupplement[],
  chemicalData: ChemicalLookupData[]
): QcCalibSupplement[] {
  return supplements.map(supplement => {
    // Try to find matching chemical in Master Data
    const allNames = chemicalData.map(c => c.testName);
    const match = findBestMatch(supplement.name, allNames, 70);  // Lower threshold for supplements

    if (match) {
      const matchedChemical = chemicalData.find(c => c.testName === match.match);
      if (matchedChemical) {
        console.error(
          `[Supplement] Enriched '${supplement.name}' → '${match.match}' (${match.similarity}%)`
        );
        return {
          ...supplement,
          specification: matchedChemical.specification,
          unit: matchedChemical.largeUnit || supplement.unit  // Use largeUnit from Master Data if available
        };
      }
    }

    console.error(`[Supplement] No match found for '${supplement.name}', keeping defaults`);
    return supplement;
  });
}
