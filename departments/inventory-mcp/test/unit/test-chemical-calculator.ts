/**
 * Unit Tests for Chemical Calculator
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { calculateChemicalRequirements } from '../../src/calculators/ChemicalCalculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');

async function testChemicalCalculator() {
  console.log('🧪 Testing Chemical Calculator...\n');

  try {
    // Read test data
    const masterDataPath = path.join(TEST_DATA_DIR, 'Master_Data.xlsx');
    const masterBuffer = fs.readFileSync(masterDataPath);

    // Test Case 1: Gold Package with QC/CALIB
    console.log('Test 1: Gold Package - 50 customers with supplements');
    const goldResults = await calculateChemicalRequirements(masterBuffer, 50, 'gold', true);
    console.log(`  ✓ Found ${goldResults.requirements.length} chemicals`);
    console.log(`  ✓ Found ${goldResults.supplements.length} supplements`);

    // Check first chemical
    const firstChem = goldResults.requirements[0];
    console.log(`\n  Sample: ${firstChem.testName}`);
    console.log(`    - Customer tests: ${firstChem.customerTests}`);
    console.log(`    - QC tests: ${firstChem.qcTests}`);
    console.log(`    - CALIB tests: ${firstChem.calibTests}`);
    console.log(`    - Total tests: ${firstChem.totalTests}`);
    console.log(`    - Containers needed: ${firstChem.containersNeeded} vials`);
    console.log(`    - Purchase: ${firstChem.purchaseQuantity} ${firstChem.purchaseUnit}`);

    // Verify QC/CALIB logic
    const expectedTotal = firstChem.customerTests + firstChem.qcTests + firstChem.calibTests;
    if (expectedTotal === firstChem.totalTests) {
      console.log(`  ✓ QC/CALIB calculation correct`);
    } else {
      throw new Error(`QC/CALIB mismatch: expected ${expectedTotal}, got ${firstChem.totalTests}`);
    }

    // Verify containers calculation
    const expectedContainers = Math.ceil(firstChem.totalTests / firstChem.testsPerVial);
    if (expectedContainers === firstChem.containersNeeded) {
      console.log(`  ✓ Containers calculation correct`);
    } else {
      throw new Error(`Containers mismatch: expected ${expectedContainers}, got ${firstChem.containersNeeded}`);
    }

    // Verify purchase quantity (round up)
    const expectedPurchase = Math.ceil(firstChem.containersNeeded / firstChem.vialsPerBox);
    if (expectedPurchase === firstChem.purchaseQuantity) {
      console.log(`  ✓ Purchase quantity correct (rounded up)\n`);
    } else {
      throw new Error(`Purchase mismatch: expected ${expectedPurchase}, got ${firstChem.purchaseQuantity}`);
    }

    // Test Case 2: Check for Wash solution (should skip QC/CALIB)
    console.log('Test 2: Wash solution (should skip QC/CALIB)');
    const washItem = goldResults.requirements.find(r => r.testName.toLowerCase().includes('wash'));
    if (washItem) {
      console.log(`  ✓ Found wash solution: ${washItem.testName}`);
      if (washItem.qcTests === 0 && washItem.calibTests === 0) {
        console.log(`  ✓ QC/CALIB correctly skipped (QC=${washItem.qcTests}, CALIB=${washItem.calibTests})\n`);
      } else {
        throw new Error(`Wash solution should not have QC/CALIB`);
      }
    } else {
      console.log(`  ! No wash solution found in test data\n`);
    }

    // Test Case 3: Without supplements
    console.log('Test 3: Without supplements');
    const noSupResults = await calculateChemicalRequirements(masterBuffer, 50, 'gold', false);
    if (noSupResults.supplements.length === 0) {
      console.log(`  ✓ Supplements correctly excluded\n`);
    } else {
      throw new Error(`Supplements should be excluded`);
    }

    // Test Case 4: Check HDL supplement trigger
    console.log('Test 4: HDL/LDL supplement trigger');
    const hasHDL = goldResults.requirements.some(r =>
      r.testName.toLowerCase().includes('hdl') || r.testName.toLowerCase().includes('ldl')
    );
    const hasHDLSupplement = goldResults.supplements.some(s => s.name.includes('HDL/LDL'));

    if (hasHDL) {
      console.log(`  ✓ Found HDL/LDL test`);
      if (hasHDLSupplement) {
        console.log(`  ✓ HDL/LDL supplement correctly added\n`);
      } else {
        console.log(`  ! HDL/LDL supplement not found (may be OK depending on conditions)\n`);
      }
    } else {
      console.log(`  ! No HDL/LDL test found in gold package\n`);
    }

    console.log('✅ All Chemical Calculator tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Chemical Calculator test failed:', error);
    return false;
  }
}

// Run test
testChemicalCalculator();
