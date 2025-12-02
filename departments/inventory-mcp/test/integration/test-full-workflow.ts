/**
 * Integration Test - Full Workflow
 * Tests the complete process from calculation to PO generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { calculateVTTHRequirements } from '../../src/calculators/VTTHCalculator.js';
import { calculateChemicalRequirements } from '../../src/calculators/ChemicalCalculator.js';
import {
  compareVTTHWithInventory,
  compareChemicalsWithInventory,
  compareSupplementsWithInventory,
  calculateSummary
} from '../../src/calculators/InventoryComparator.js';
import { generatePurchaseOrder, createSimplePO } from '../../src/generators/POGeneratorV2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

async function testFullWorkflow() {
  console.log('🧪 Testing Full Workflow Integration...\n');

  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Read test data
    const masterDataPath = path.join(TEST_DATA_DIR, 'Master_Data.xlsx');
    const inventoryPath = path.join(TEST_DATA_DIR, 'Inventory.xlsx');
    const masterBuffer = fs.readFileSync(masterDataPath);
    const inventoryBuffer = fs.readFileSync(inventoryPath);

    const numCustomers = 50;
    const servicePackage = 'gold';

    console.log(`📋 Test Parameters:`);
    console.log(`   - Customers: ${numCustomers}`);
    console.log(`   - Package: ${servicePackage}\n`);

    // Step 1: Calculate VTTH Requirements
    console.log('Step 1: Calculating VTTH requirements...');
    const vtthReqs = await calculateVTTHRequirements(masterBuffer, numCustomers, servicePackage);
    console.log(`  ✓ Calculated ${vtthReqs.length} VTTH items\n`);

    // Step 2: Calculate Chemical Requirements
    console.log('Step 2: Calculating Chemical requirements with QC/CALIB...');
    const chemResult = await calculateChemicalRequirements(masterBuffer, numCustomers, servicePackage, true);
    console.log(`  ✓ Calculated ${chemResult.requirements.length} chemicals`);
    console.log(`  ✓ Added ${chemResult.supplements.length} supplements\n`);

    // Step 3: Compare with Inventory
    console.log('Step 3: Comparing with inventory...');
    const vtthComparison = await compareVTTHWithInventory(vtthReqs, inventoryBuffer);
    const chemComparison = await compareChemicalsWithInventory(chemResult.requirements, inventoryBuffer);
    const suppComparison = await compareSupplementsWithInventory(chemResult.supplements, inventoryBuffer);

    const summary = calculateSummary(vtthComparison, chemComparison, suppComparison);

    console.log(`  ✓ Comparison complete:`);
    console.log(`    - Total items: ${summary.totalItems}`);
    console.log(`    - Sufficient: ${summary.sufficient}`);
    console.log(`    - Need to purchase: ${summary.needToPurchase}`);
    console.log(`    - Not found: ${summary.notFound}\n`);

    // Step 4: Generate Purchase Order
    console.log('Step 4: Generating purchase order...');
    const po = generatePurchaseOrder(
      vtthComparison,
      chemComparison,
      suppComparison,
      {
        poNumber: `PO-TEST-${Date.now()}`,
        department: 'Phòng Lab - Test',
        requestedBy: 'Test Script'
      }
    );

    console.log(`  ✓ PO generated:`);
    console.log(`    - PO Number: ${po.meta.poNumber}`);
    console.log(`    - Line items: ${po.lineItems.length}`);
    console.log(`    - Department: ${po.meta.department}\n`);

    // Verify PO line items
    if (po.lineItems.length !== summary.needToPurchase + summary.notFound) {
      throw new Error(`PO line items mismatch: expected ${summary.needToPurchase + summary.notFound}, got ${po.lineItems.length}`);
    }
    console.log(`  ✓ PO line items count correct\n`);

    // Step 5: Create Excel PO
    console.log('Step 5: Creating Excel purchase order...');
    const poBuffer = await createSimplePO(po);
    const poPath = path.join(OUTPUT_DIR, `${po.meta.poNumber}.xlsx`);
    fs.writeFileSync(poPath, poBuffer);
    console.log(`  ✓ Excel PO saved: ${poPath}\n`);

    // Verify all quantities are integers (QT003)
    console.log('Step 6: Verifying business rules...');
    const allIntegers = po.lineItems.every(item => Number.isInteger(item.quantity));
    if (allIntegers) {
      console.log(`  ✓ QT003: All quantities are integers`);
    } else {
      throw new Error('QT003 violation: Found non-integer quantities');
    }

    // Verify no small units in PO (QT003)
    const hasSmallUnits = po.lineItems.some(item =>
      item.unit.toLowerCase().includes('cái') ||
      item.unit.toLowerCase().includes('test') ||
      item.unit.toLowerCase().includes('g')
    );
    if (!hasSmallUnits) {
      console.log(`  ✓ QT003: Only large units in PO\n`);
    } else {
      console.log(`  ! Warning: Some items may have small units (may be OK for supplements)\n`);
    }

    // Display summary
    console.log('📊 Workflow Summary:');
    console.log(`   ✓ VTTH items: ${vtthReqs.length} calculated`);
    console.log(`   ✓ Chemicals: ${chemResult.requirements.length} calculated`);
    console.log(`   ✓ Supplements: ${chemResult.supplements.length} added`);
    console.log(`   ✓ Inventory comparison: ${summary.totalItems} items`);
    console.log(`   ✓ Purchase order: ${po.lineItems.length} items to purchase`);
    console.log(`   ✓ Excel file: ${poPath}\n`);

    console.log('✅ Full Workflow Integration test passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Full Workflow test failed:', error);
    return false;
  }
}

// Run test
testFullWorkflow();
