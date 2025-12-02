/**
 * Unit Tests for Inventory Comparator
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { calculateVTTHRequirements } from '../../src/calculators/VTTHCalculator.js';
import { calculateChemicalRequirements } from '../../src/calculators/ChemicalCalculator.js';
import {
  compareVTTHWithInventory,
  compareChemicalsWithInventory,
  compareSupplementsWithInventory
} from '../../src/calculators/InventoryComparator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');

async function testInventoryComparator() {
  console.log('🧪 Testing Inventory Comparator...\n');

  try {
    // Read test data
    const masterDataPath = path.join(TEST_DATA_DIR, 'Master_Data.xlsx');
    const inventoryPath = path.join(TEST_DATA_DIR, 'Inventory.xlsx');
    const masterBuffer = fs.readFileSync(masterDataPath);
    const inventoryBuffer = fs.readFileSync(inventoryPath);

    // Test Case 1: VTTH Comparison
    console.log('Test 1: VTTH Comparison');
    const vtthReqs = await calculateVTTHRequirements(masterBuffer, 50, 'gold');
    const vtthComparison = await compareVTTHWithInventory(vtthReqs, inventoryBuffer);

    console.log(`  ✓ Compared ${vtthComparison.length} VTTH items`);

    // Check statuses
    const sufficient = vtthComparison.filter(c => c.status === 'sufficient');
    const needPurchase = vtthComparison.filter(c => c.status === 'need_to_purchase');
    const notFound = vtthComparison.filter(c => c.status === 'not_found');

    console.log(`    - Sufficient: ${sufficient.length}`);
    console.log(`    - Need to purchase: ${needPurchase.length}`);
    console.log(`    - Not found: ${notFound.length}`);

    // Check fuzzy matching
    const fuzzyMatched = vtthComparison.filter(c => c.matchedInventoryName);
    if (fuzzyMatched.length > 0) {
      console.log(`\n  ✓ Fuzzy matching worked for ${fuzzyMatched.length} items`);
      console.log(`    Example: "${fuzzyMatched[0].productName}" → "${fuzzyMatched[0].matchedInventoryName}" (${fuzzyMatched[0].matchSimilarity}%)`);
    }

    // Verify shortage calculation
    if (needPurchase.length > 0) {
      const item = needPurchase[0];
      const expectedShortage = Math.max(0, item.requiredSmallUnit - item.inventorySmallUnit);
      if (item.shortageSmallUnit === expectedShortage) {
        console.log(`\n  ✓ Shortage calculation correct: ${expectedShortage}`);
      } else {
        throw new Error(`Shortage mismatch: expected ${expectedShortage}, got ${item.shortageSmallUnit}`);
      }

      // Verify purchase quantity (round up)
      const expectedPurchase = Math.ceil(item.shortageSmallUnit / item.conversionRatio);
      if (item.purchaseQuantity === expectedPurchase) {
        console.log(`  ✓ Purchase quantity correct (rounded up): ${expectedPurchase} ${item.largeUnit}\n`);
      } else {
        throw new Error(`Purchase mismatch: expected ${expectedPurchase}, got ${item.purchaseQuantity}`);
      }
    }

    // Test Case 2: Chemical Comparison
    console.log('Test 2: Chemical Comparison');
    const chemResult = await calculateChemicalRequirements(masterBuffer, 50, 'gold', true);
    const chemComparison = await compareChemicalsWithInventory(chemResult.requirements, inventoryBuffer);

    console.log(`  ✓ Compared ${chemComparison.length} chemicals`);

    const chemSufficient = chemComparison.filter(c => c.status === 'sufficient');
    const chemNeedPurchase = chemComparison.filter(c => c.status === 'need_to_purchase');
    const chemNotFound = chemComparison.filter(c => c.status === 'not_found');

    console.log(`    - Sufficient: ${chemSufficient.length}`);
    console.log(`    - Need to purchase: ${chemNeedPurchase.length}`);
    console.log(`    - Not found: ${chemNotFound.length}\n`);

    // Test Case 3: Supplement Comparison
    console.log('Test 3: Supplement Comparison');
    const suppComparison = await compareSupplementsWithInventory(chemResult.supplements, inventoryBuffer);

    console.log(`  ✓ Compared ${suppComparison.length} supplements`);
    console.log(`    - Most supplements should be "not_found" (expected behavior)\n`);

    // Test Case 4: Verify fuzzy matching threshold
    console.log('Test 4: Fuzzy matching with different thresholds');
    const strictComparison = await compareVTTHWithInventory(vtthReqs, inventoryBuffer, 95);
    const lenientComparison = await compareVTTHWithInventory(vtthReqs, inventoryBuffer, 70);

    const strictMatches = strictComparison.filter(c => c.matchedInventoryName).length;
    const lenientMatches = lenientComparison.filter(c => c.matchedInventoryName).length;

    console.log(`  ✓ Strict (95%): ${strictMatches} matches`);
    console.log(`  ✓ Lenient (70%): ${lenientMatches} matches`);

    if (lenientMatches >= strictMatches) {
      console.log(`  ✓ Fuzzy matching threshold works correctly\n`);
    } else {
      throw new Error('Fuzzy matching threshold logic error');
    }

    console.log('✅ All Inventory Comparator tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Inventory Comparator test failed:', error);
    return false;
  }
}

// Run test
testInventoryComparator();
