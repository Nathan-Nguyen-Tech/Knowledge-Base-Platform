/**
 * Inventory Comparator
 * Workflow 3: Compare requirements with inventory and calculate shortages
 */

import { InventoryItem, parseInventoryFromExcel } from '../models/InventoryItemV2.js';
import { VTTHRequirement } from './VTTHCalculator.js';
import { ChemicalRequirement, SupplementRequirement } from './ChemicalCalculator.js';
import { normalizeName, findBestMatch } from '../utils/name-normalizer.js';
import { calculateShortage } from '../utils/unit-converter.js';

/**
 * Comparison Status
 */
export type ComparisonStatus = 'sufficient' | 'need_to_purchase' | 'not_found';

/**
 * VTTH Comparison Result
 */
export interface VTTHComparison {
  productName: string;
  specification?: string;  // Quy cách (từ Master Data)
  requiredSmallUnit: number;
  inventorySmallUnit: number;
  shortageSmallUnit: number;
  purchaseQuantity: number;  // Số lượng mua (đơn vị lớn)
  largeUnit: string;
  conversionRatio: number;
  status: ComparisonStatus;
  matchedInventoryName?: string;  // Name in inventory (if fuzzy matched)
  matchSimilarity?: number;  // Similarity score (if fuzzy matched)
}

/**
 * Chemical Comparison Result
 */
export interface ChemicalComparison {
  testName: string;
  specification?: string;  // Quy cách (từ Master Data)
  totalTests: number;
  containersNeeded: number;
  inventoryContainers: number;
  shortageContainers: number;
  purchaseQuantity: number;  // Số lượng mua (Hộp hoặc Thùng)
  purchaseUnit: string;
  vialsPerBox: number;
  status: ComparisonStatus;
  matchedInventoryName?: string;
  matchSimilarity?: number;
}

/**
 * Supplement Comparison Result
 */
export interface SupplementComparison {
  name: string;
  required: number;
  inventory: number;
  shortage: number;
  unit: string;
  status: ComparisonStatus;
  matchedInventoryName?: string;
  matchSimilarity?: number;
}

/**
 * Complete Comparison Result
 */
export interface ComparisonResult {
  vtth: VTTHComparison[];
  chemicals: ChemicalComparison[];
  supplements: SupplementComparison[];
  summary: {
    totalItems: number;
    needToPurchase: number;
    sufficient: number;
    notFound: number;
  };
}

/**
 * Compare VTTH requirements with inventory
 *
 * @param requirements - VTTH requirements from calculator
 * @param excelBuffer - Excel file buffer containing Inventory sheet
 * @param fuzzyThreshold - Similarity threshold for fuzzy matching (default: 85)
 * @returns VTTH comparison results
 */
export async function compareVTTHWithInventory(
  requirements: VTTHRequirement[],
  excelBuffer: Buffer,
  fuzzyThreshold: number = 85
): Promise<VTTHComparison[]> {
  // Parse inventory
  const inventory = await parseInventoryFromExcel(excelBuffer);
  console.error(`[VTTH Comparator] Loaded ${inventory.size} inventory items`);

  const comparisons: VTTHComparison[] = [];

  for (const req of requirements) {
    const normalized = normalizeName(req.productName);

    // Try exact match first
    let inventoryItem = inventory.get(normalized);
    let matchedName: string | undefined;
    let similarity: number | undefined;

    // If no exact match, try fuzzy matching
    if (!inventoryItem) {
      const allNames = Array.from(inventory.values()).map(item => item.data.productName);
      const match = findBestMatch(req.productName, allNames, fuzzyThreshold);

      if (match) {
        const matchedNormalized = normalizeName(match.match);
        inventoryItem = inventory.get(matchedNormalized);
        matchedName = match.match;
        similarity = match.similarity;

        console.error(
          `[VTTH Comparator] Fuzzy matched '${req.productName}' → '${match.match}' (${match.similarity}%)`
        );
      }
    }

    // Calculate comparison
    let inventorySmallUnit = 0;
    let status: ComparisonStatus = 'not_found';

    if (inventoryItem) {
      // Convert inventory to small unit (QT001: always compare in small unit)
      inventorySmallUnit = inventoryItem.getQuantityInSmallUnit(req.conversionRatio, false);

      // Calculate shortage
      const shortageSmallUnit = calculateShortage(req.requiredSmallUnit, inventorySmallUnit);

      if (shortageSmallUnit === 0) {
        status = 'sufficient';
      } else {
        status = 'need_to_purchase';
      }

      // Calculate purchase quantity (always round up)
      const purchaseQuantity = Math.ceil(shortageSmallUnit / req.conversionRatio);

      comparisons.push({
        productName: req.productName,
        specification: req.specification,
        requiredSmallUnit: req.requiredSmallUnit,
        inventorySmallUnit,
        shortageSmallUnit,
        purchaseQuantity,
        largeUnit: req.largeUnit,
        conversionRatio: req.conversionRatio,
        status,
        matchedInventoryName: matchedName,
        matchSimilarity: similarity
      });
    } else {
      // Not found in inventory
      comparisons.push({
        productName: req.productName,
        specification: req.specification,
        requiredSmallUnit: req.requiredSmallUnit,
        inventorySmallUnit: 0,
        shortageSmallUnit: req.requiredSmallUnit,
        purchaseQuantity: req.purchaseQuantity,  // Use original calculation
        largeUnit: req.largeUnit,
        conversionRatio: req.conversionRatio,
        status: 'not_found'
      });
    }
  }

  console.error(`[VTTH Comparator] Compared ${comparisons.length} items`);
  return comparisons;
}

/**
 * Compare Chemical requirements with inventory
 */
export async function compareChemicalsWithInventory(
  requirements: ChemicalRequirement[],
  excelBuffer: Buffer,
  fuzzyThreshold: number = 85
): Promise<ChemicalComparison[]> {
  // Parse inventory
  const inventory = await parseInventoryFromExcel(excelBuffer);
  console.error(`[Chemical Comparator] Loaded ${inventory.size} inventory items`);

  const comparisons: ChemicalComparison[] = [];

  for (const req of requirements) {
    const normalized = normalizeName(req.testName);

    // Try exact match
    let inventoryItem = inventory.get(normalized);
    let matchedName: string | undefined;
    let similarity: number | undefined;

    // Try fuzzy matching
    if (!inventoryItem) {
      const allNames = Array.from(inventory.values()).map(item => item.data.productName);
      const match = findBestMatch(req.testName, allNames, fuzzyThreshold);

      if (match) {
        const matchedNormalized = normalizeName(match.match);
        inventoryItem = inventory.get(matchedNormalized);
        matchedName = match.match;
        similarity = match.similarity;

        console.error(
          `[Chemical Comparator] Fuzzy matched '${req.testName}' → '${match.match}' (${match.similarity}%)`
        );
      }
    }

    // Calculate comparison
    let inventoryContainers = 0;
    let status: ComparisonStatus = 'not_found';

    if (inventoryItem) {
      // Inventory is in containers (vials)
      inventoryContainers = Math.floor(inventoryItem.data.quantity);

      // Calculate shortage in containers
      const shortageContainers = calculateShortage(req.containersNeeded, inventoryContainers);

      if (shortageContainers === 0) {
        status = 'sufficient';
      } else {
        status = 'need_to_purchase';
      }

      // Calculate purchase quantity in large unit (Hộp or Thùng)
      const purchaseQuantity = Math.ceil(shortageContainers / req.vialsPerBox);

      comparisons.push({
        testName: req.testName,
        specification: req.specification,
        totalTests: req.totalTests,
        containersNeeded: req.containersNeeded,
        inventoryContainers,
        shortageContainers,
        purchaseQuantity,
        purchaseUnit: req.purchaseUnit,
        vialsPerBox: req.vialsPerBox,
        status,
        matchedInventoryName: matchedName,
        matchSimilarity: similarity
      });
    } else {
      // Not found
      comparisons.push({
        testName: req.testName,
        specification: req.specification,
        totalTests: req.totalTests,
        containersNeeded: req.containersNeeded,
        inventoryContainers: 0,
        shortageContainers: req.containersNeeded,
        purchaseQuantity: req.purchaseQuantity,
        purchaseUnit: req.purchaseUnit,
        vialsPerBox: req.vialsPerBox,
        status: 'not_found'
      });
    }
  }

  console.error(`[Chemical Comparator] Compared ${comparisons.length} items`);
  return comparisons;
}

/**
 * Compare Supplements with inventory
 */
export async function compareSupplementsWithInventory(
  supplements: SupplementRequirement[],
  excelBuffer: Buffer,
  fuzzyThreshold: number = 85
): Promise<SupplementComparison[]> {
  // Parse inventory
  const inventory = await parseInventoryFromExcel(excelBuffer);
  console.error(`[Supplement Comparator] Loaded ${inventory.size} inventory items`);

  const comparisons: SupplementComparison[] = [];

  for (const supp of supplements) {
    const normalized = normalizeName(supp.name);

    // Try exact match
    let inventoryItem = inventory.get(normalized);
    let matchedName: string | undefined;
    let similarity: number | undefined;

    // Try fuzzy matching
    if (!inventoryItem) {
      const allNames = Array.from(inventory.values()).map(item => item.data.productName);
      const match = findBestMatch(supp.name, allNames, fuzzyThreshold);

      if (match) {
        const matchedNormalized = normalizeName(match.match);
        inventoryItem = inventory.get(matchedNormalized);
        matchedName = match.match;
        similarity = match.similarity;

        console.error(
          `[Supplement Comparator] Fuzzy matched '${supp.name}' → '${match.match}' (${match.similarity}%)`
        );
      }
    }

    // Calculate comparison
    let inventoryQuantity = 0;
    let status: ComparisonStatus = 'not_found';

    if (inventoryItem) {
      inventoryQuantity = Math.floor(inventoryItem.data.quantity);
      const shortage = calculateShortage(supp.quantity, inventoryQuantity);

      if (shortage === 0) {
        status = 'sufficient';
      } else {
        status = 'need_to_purchase';
      }

      comparisons.push({
        name: supp.name,
        required: supp.quantity,
        inventory: inventoryQuantity,
        shortage,
        unit: supp.unit,
        status,
        matchedInventoryName: matchedName,
        matchSimilarity: similarity
      });
    } else {
      // Not found
      comparisons.push({
        name: supp.name,
        required: supp.quantity,
        inventory: 0,
        shortage: supp.quantity,
        unit: supp.unit,
        status: 'not_found'
      });
    }
  }

  console.error(`[Supplement Comparator] Compared ${comparisons.length} items`);
  return comparisons;
}

/**
 * Format comparison results as human-readable text
 */
export function formatComparisonResults(result: ComparisonResult): string {
  const lines: string[] = [];

  lines.push('# Inventory Comparison Results');
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total Items: ${result.summary.totalItems}`);
  lines.push(`- Need to Purchase: ${result.summary.needToPurchase}`);
  lines.push(`- Sufficient: ${result.summary.sufficient}`);
  lines.push(`- Not Found in Inventory: ${result.summary.notFound}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // VTTH
  if (result.vtth.length > 0) {
    lines.push('## VTTH (Consumables)');
    lines.push('');

    for (const comp of result.vtth) {
      const statusIcon =
        comp.status === 'sufficient' ? '✅' : comp.status === 'need_to_purchase' ? '⚠️' : '❌';

      lines.push(`### ${statusIcon} ${comp.productName}`);

      if (comp.matchedInventoryName) {
        lines.push(`- Matched to: "${comp.matchedInventoryName}" (${comp.matchSimilarity}%)`);
      }

      lines.push(`- Required: ${comp.requiredSmallUnit} (small unit)`);
      lines.push(`- Inventory: ${comp.inventorySmallUnit} (small unit)`);
      lines.push(`- Shortage: ${comp.shortageSmallUnit} (small unit)`);

      if (comp.status === 'need_to_purchase' || comp.status === 'not_found') {
        lines.push(`- **Purchase: ${comp.purchaseQuantity} ${comp.largeUnit}**`);
      }

      lines.push('');
    }
  }

  // Chemicals
  if (result.chemicals.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Chemicals');
    lines.push('');

    for (const comp of result.chemicals) {
      const statusIcon =
        comp.status === 'sufficient' ? '✅' : comp.status === 'need_to_purchase' ? '⚠️' : '❌';

      lines.push(`### ${statusIcon} ${comp.testName}`);

      if (comp.matchedInventoryName) {
        lines.push(`- Matched to: "${comp.matchedInventoryName}" (${comp.matchSimilarity}%)`);
      }

      lines.push(`- Total Tests: ${comp.totalTests}`);
      lines.push(`- Containers Needed: ${comp.containersNeeded} vials`);
      lines.push(`- Inventory: ${comp.inventoryContainers} vials`);
      lines.push(`- Shortage: ${comp.shortageContainers} vials`);

      if (comp.status === 'need_to_purchase' || comp.status === 'not_found') {
        lines.push(`- **Purchase: ${comp.purchaseQuantity} ${comp.purchaseUnit}**`);
      }

      lines.push('');
    }
  }

  // Supplements
  if (result.supplements.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## QC/CALIB Supplements');
    lines.push('');

    for (const comp of result.supplements) {
      const statusIcon =
        comp.status === 'sufficient' ? '✅' : comp.status === 'need_to_purchase' ? '⚠️' : '❌';

      lines.push(`### ${statusIcon} ${comp.name}`);

      if (comp.matchedInventoryName) {
        lines.push(`- Matched to: "${comp.matchedInventoryName}" (${comp.matchSimilarity}%)`);
      }

      lines.push(`- Required: ${comp.required} ${comp.unit}`);
      lines.push(`- Inventory: ${comp.inventory} ${comp.unit}`);
      lines.push(`- Shortage: ${comp.shortage} ${comp.unit}`);

      if (comp.status === 'need_to_purchase' || comp.status === 'not_found') {
        lines.push(`- **Purchase: ${comp.shortage} ${comp.unit}**`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Calculate summary statistics
 */
export function calculateSummary(
  vtth: VTTHComparison[],
  chemicals: ChemicalComparison[],
  supplements: SupplementComparison[]
): ComparisonResult['summary'] {
  const allItems = [...vtth, ...chemicals, ...supplements];

  return {
    totalItems: allItems.length,
    needToPurchase: allItems.filter(item => item.status === 'need_to_purchase').length,
    sufficient: allItems.filter(item => item.status === 'sufficient').length,
    notFound: allItems.filter(item => item.status === 'not_found').length
  };
}
