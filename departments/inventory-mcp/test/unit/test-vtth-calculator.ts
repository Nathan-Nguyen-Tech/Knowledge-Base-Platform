/**
 * Unit Tests for VTTH Calculator
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { calculateVTTHRequirements } from '../../src/calculators/VTTHCalculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');

async function testVTTHCalculator() {
  console.log('🧪 Testing VTTH Calculator...\n');

  try {
    // Read test data
    const masterDataPath = path.join(TEST_DATA_DIR, 'Master_Data.xlsx');
    const masterBuffer = fs.readFileSync(masterDataPath);

    // Test Case 1: Gold Package with 50 customers
    console.log('Test 1: Gold Package - 50 customers');
    const goldResults = await calculateVTTHRequirements(masterBuffer, 50, 'gold');
    console.log(`  ✓ Found ${goldResults.length} VTTH items`);
    console.log(`  ✓ Sample item: ${goldResults[0].productName}`);
    console.log(`    - Consumption rate: ${goldResults[0].consumptionRate}/customer`);
    console.log(`    - Required (small): ${goldResults[0].requiredSmallUnit}`);
    console.log(`    - Purchase (large): ${goldResults[0].purchaseQuantity} ${goldResults[0].largeUnit}`);

    // Verify calculation
    const expected = goldResults[0].consumptionRate * 50;
    const actualRequired = goldResults[0].requiredSmallUnit;
    if (expected === actualRequired) {
      console.log(`  ✓ Calculation correct: ${expected} === ${actualRequired}`);
    } else {
      throw new Error(`Calculation mismatch: expected ${expected}, got ${actualRequired}`);
    }

    // Verify round-up logic
    const expectedPurchase = Math.ceil(actualRequired / goldResults[0].conversionRatio);
    if (expectedPurchase === goldResults[0].purchaseQuantity) {
      console.log(`  ✓ Round-up correct: ${expectedPurchase} === ${goldResults[0].purchaseQuantity}\n`);
    } else {
      throw new Error(`Round-up mismatch: expected ${expectedPurchase}, got ${goldResults[0].purchaseQuantity}`);
    }

    // Test Case 2: Basic Package with 30 customers
    console.log('Test 2: Basic Package - 30 customers');
    const basicResults = await calculateVTTHRequirements(masterBuffer, 30, 'basic');
    console.log(`  ✓ Found ${basicResults.length} VTTH items`);
    console.log(`  ✓ Items differ from gold: ${basicResults.length !== goldResults.length ? 'Yes' : 'No'}\n`);

    // Test Case 3: Silver Package with 100 customers
    console.log('Test 3: Silver Package - 100 customers');
    const silverResults = await calculateVTTHRequirements(masterBuffer, 100, 'silver');
    console.log(`  ✓ Found ${silverResults.length} VTTH items\n`);

    // Test Case 4: Edge case - 1 customer
    console.log('Test 4: Edge case - 1 customer');
    const edgeResults = await calculateVTTHRequirements(masterBuffer, 1, 'gold');
    console.log(`  ✓ Found ${edgeResults.length} VTTH items`);
    console.log(`  ✓ First item purchase: ${edgeResults[0].purchaseQuantity} ${edgeResults[0].largeUnit}\n`);

    console.log('✅ All VTTH Calculator tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ VTTH Calculator test failed:', error);
    return false;
  }
}

// Run test
testVTTHCalculator();
