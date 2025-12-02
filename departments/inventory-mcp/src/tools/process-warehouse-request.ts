/**
 * Process Warehouse Request Tool (Unified)
 * Replaces 4 separate tools with single unified interface
 * Supports all 5 workflows + list PO
 */

import { z } from 'zod';
import { ServicePackage } from '../types/ServicePackage.js';
import { IStorageAdapter } from '@mcp/core';
import { calculateVTTHRequirements, formatVTTHRequirements } from '../calculators/VTTHCalculator.js';
import {
  calculateChemicalRequirements,
  formatChemicalRequirements
} from '../calculators/ChemicalCalculator.js';
import {
  compareVTTHWithInventory,
  compareChemicalsWithInventory,
  compareSupplementsWithInventory,
  formatComparisonResults,
  calculateSummary,
  ComparisonResult
} from '../calculators/InventoryComparator.js';
import {
  generatePurchaseOrder,
  createSimplePO,
  formatPurchaseOrder,
  POMeta
} from '../generators/POGeneratorV2.js';
import { generatePOFromTemplate } from '../generators/TemplatePOGenerator.js';
import { getMasterDataPath, getInventoryPath, getPOPath, getPOFolder } from '../paths-config.js';

/**
 * Workflow types
 */
export const WorkflowType = z.enum([
  'calculate_vtth',           // Workflow 1: Calculate VTTH requirements only
  'calculate_chemicals',      // Workflow 2: Calculate Chemical requirements only
  'compare_with_inventory',   // Workflow 3: Compare requirements with inventory
  'generate_po',              // Workflow 4: Generate purchase order from comparison
  'full_process',             // Workflow 5: Complete process (calculate + compare + PO)
  'list_po'                   // List existing purchase orders
]);

export type WorkflowTypeValue = z.infer<typeof WorkflowType>;

/**
 * Tool input schema
 */
export const ProcessWarehouseRequestInput = z.object({
  workflow: WorkflowType.describe('Type of workflow to execute'),

  // Required for most workflows
  numCustomers: z
    .number()
    .positive()
    .optional()
    .describe('Number of customers (required for calculate workflows)'),

  servicePackage: z
    .enum(['gold', 'basic', 'silver'])
    .optional()
    .describe('Service package: gold (vàng), basic (đồng), or silver (bạc)'),

  // File paths (OneDrive)
  masterDataFile: z
    .string()
    .optional()
    .describe('Path to master data Excel file (contains VTTH, Chemicals sheets)'),

  inventoryFile: z
    .string()
    .optional()
    .describe('Path to inventory Excel file (contains Inventory sheet)'),

  // PO options
  includeSupplements: z
    .boolean()
    .default(true)
    .describe('Include QC/CALIB supplements in chemical calculations'),

  poMetadata: z
    .object({
      poNumber: z.string().optional(),
      department: z.string().optional(),
      requestedBy: z.string().optional(),
      approvedBy: z.string().optional(),
      notes: z.string().optional()
    })
    .optional()
    .describe('Purchase order metadata'),

  // Output options
  saveToOneDrive: z
    .boolean()
    .default(true)
    .describe('Save generated PO to OneDrive'),

  outputPath: z.string().optional().describe('Output path for PO file (if saveToOneDrive=true)')
});

export type ProcessWarehouseRequestInputType = z.infer<typeof ProcessWarehouseRequestInput>;

/**
 * Tool implementation
 */
export async function processWarehouseRequest(
  storage: IStorageAdapter,
  input: ProcessWarehouseRequestInputType
): Promise<string> {
  console.error(`[Process Warehouse] Starting workflow: ${input.workflow}`);

  // Validate required fields based on workflow
  if (input.workflow !== 'list_po') {
    if (!input.numCustomers) {
      throw new Error('numCustomers is required for this workflow');
    }
    if (!input.servicePackage) {
      throw new Error('servicePackage is required for this workflow');
    }
    if (!input.masterDataFile) {
      throw new Error('masterDataFile path is required for this workflow');
    }
  }

  // Execute workflow
  switch (input.workflow) {
    case 'calculate_vtth':
      return await executeCalculateVTTH(input, storage);

    case 'calculate_chemicals':
      return await executeCalculateChemicals(input, storage);

    case 'compare_with_inventory':
      return await executeCompareWithInventory(input, storage);

    case 'generate_po':
      return await executeGeneratePO(input, storage);

    case 'full_process':
      return await executeFullProcess(input, storage);

    case 'list_po':
      return await executeListPO(storage);

    default:
      throw new Error(`Unknown workflow: ${input.workflow}`);
  }
}

/**
 * Workflow 1: Calculate VTTH Requirements
 */
async function executeCalculateVTTH(
  input: ProcessWarehouseRequestInputType,
  storage: IStorageAdapter
): Promise<string> {
  console.error('[Workflow 1] Calculate VTTH Requirements');

  // Read master data file
  const masterBuffer = await storage.getFileContent(input.masterDataFile!);

  // Calculate requirements
  const requirements = await calculateVTTHRequirements(
    masterBuffer,
    input.numCustomers!,
    input.servicePackage as ServicePackage
  );

  // Format results
  const result = formatVTTHRequirements(requirements, input.numCustomers!, input.servicePackage as ServicePackage);

  console.error(`[Workflow 1] Complete - ${requirements.length} items`);
  return result;
}

/**
 * Workflow 2: Calculate Chemical Requirements
 */
async function executeCalculateChemicals(
  input: ProcessWarehouseRequestInputType,
  storage: IStorageAdapter
): Promise<string> {
  console.error('[Workflow 2] Calculate Chemical Requirements');

  // Read master data file
  const masterBuffer = await storage.getFileContent(input.masterDataFile!);

  // Calculate requirements
  const result = await calculateChemicalRequirements(
    masterBuffer,
    input.numCustomers!,
    input.servicePackage as ServicePackage,
    input.includeSupplements
  );

  // Format results
  const formatted = formatChemicalRequirements(result, input.numCustomers!, input.servicePackage as ServicePackage);

  console.error(`[Workflow 2] Complete - ${result.requirements.length} chemicals, ${result.supplements.length} supplements`);
  return formatted;
}

/**
 * Workflow 3: Compare with Inventory
 */
async function executeCompareWithInventory(
  input: ProcessWarehouseRequestInputType,
  storage: IStorageAdapter
): Promise<string> {
  console.error('[Workflow 3] Compare Requirements with Inventory');

  if (!input.inventoryFile) {
    throw new Error('inventoryFile path is required for compare workflow');
  }

  // Read files
  const masterBuffer = await storage.getFileContent(input.masterDataFile!);
  const inventoryBuffer = await storage.getFileContent(input.inventoryFile);

  // Calculate requirements
  const vtthReqs = await calculateVTTHRequirements(
    masterBuffer,
    input.numCustomers!,
    input.servicePackage as ServicePackage
  );

  const chemicalResult = await calculateChemicalRequirements(
    masterBuffer,
    input.numCustomers!,
    input.servicePackage as ServicePackage,
    input.includeSupplements
  );

  // Compare with inventory
  const vtthComparison = await compareVTTHWithInventory(vtthReqs, inventoryBuffer);
  const chemicalComparison = await compareChemicalsWithInventory(chemicalResult.requirements, inventoryBuffer);
  const supplementComparison = await compareSupplementsWithInventory(chemicalResult.supplements, inventoryBuffer);

  // Calculate summary
  const summary = calculateSummary(vtthComparison, chemicalComparison, supplementComparison);

  const comparisonResult: ComparisonResult = {
    vtth: vtthComparison,
    chemicals: chemicalComparison,
    supplements: supplementComparison,
    summary
  };

  // Format results
  const formatted = formatComparisonResults(comparisonResult);

  console.error(`[Workflow 3] Complete - ${summary.totalItems} items compared`);
  return formatted;
}

/**
 * Workflow 4: Generate Purchase Order
 */
async function executeGeneratePO(
  input: ProcessWarehouseRequestInputType,
  storage: IStorageAdapter
): Promise<string> {
  console.error('[Workflow 4] Generate Purchase Order');

  if (!input.inventoryFile) {
    throw new Error('inventoryFile path is required for PO generation');
  }

  // Read files
  const masterBuffer = await storage.getFileContent(input.masterDataFile!);
  const inventoryBuffer = await storage.getFileContent(input.inventoryFile);

  // Calculate requirements
  const vtthReqs = await calculateVTTHRequirements(
    masterBuffer,
    input.numCustomers!,
    input.servicePackage as ServicePackage
  );

  const chemicalResult = await calculateChemicalRequirements(
    masterBuffer,
    input.numCustomers!,
    input.servicePackage as ServicePackage,
    input.includeSupplements
  );

  // Compare with inventory
  const vtthComparison = await compareVTTHWithInventory(vtthReqs, inventoryBuffer);
  const chemicalComparison = await compareChemicalsWithInventory(chemicalResult.requirements, inventoryBuffer);
  const supplementComparison = await compareSupplementsWithInventory(chemicalResult.supplements, inventoryBuffer);

  // Generate PO
  const po = generatePurchaseOrder(
    vtthComparison,
    chemicalComparison,
    supplementComparison,
    input.poMetadata || {}
  );

  // Create Excel file using template (with fallback to simple generation)
  const poBuffer = await generatePOFromTemplate(storage, po, { fallbackToSimple: true });

  // Save to OneDrive if requested
  if (input.saveToOneDrive) {
    const outputPath = input.outputPath || getPOPath(`${po.meta.poNumber}.xlsx`);
    await storage.writeFile(outputPath, Buffer.from(poBuffer));
    console.error(`[Workflow 4] Saved PO to ${outputPath}`);
  }

  // Format results
  const formatted = formatPurchaseOrder(po);

  console.error(`[Workflow 4] Complete - ${po.lineItems.length} items in PO`);
  return formatted + '\n\n---\n\n' + (input.saveToOneDrive ? `✅ Purchase order saved to OneDrive: ${input.outputPath || getPOPath(`${po.meta.poNumber}.xlsx`)}` : '📄 Purchase order generated (not saved)');
}

/**
 * Workflow 5: Full Process (Recommended)
 */
async function executeFullProcess(
  input: ProcessWarehouseRequestInputType,
  storage: IStorageAdapter
): Promise<string> {
  console.error('[Workflow 5] Full Process (Calculate + Compare + Generate PO)');

  if (!input.inventoryFile) {
    throw new Error('inventoryFile path is required for full process');
  }

  const results: string[] = [];

  // Step 1: Calculate VTTH
  results.push('# Step 1: VTTH Requirements\n');
  const vtthResult = await executeCalculateVTTH(input, storage);
  results.push(vtthResult);
  results.push('\n\n');

  // Step 2: Calculate Chemicals
  results.push('# Step 2: Chemical Requirements\n');
  const chemicalResult = await executeCalculateChemicals(input, storage);
  results.push(chemicalResult);
  results.push('\n\n');

  // Step 3: Compare with Inventory
  results.push('# Step 3: Inventory Comparison\n');
  const comparisonResult = await executeCompareWithInventory(input, storage);
  results.push(comparisonResult);
  results.push('\n\n');

  // Step 4: Generate PO
  results.push('# Step 4: Purchase Order\n');
  const poResult = await executeGeneratePO(input, storage);
  results.push(poResult);

  console.error('[Workflow 5] Full process complete');
  return results.join('');
}

/**
 * List existing Purchase Orders
 */
async function executeListPO(storage: IStorageAdapter): Promise<string> {
  console.error('[List PO] Listing purchase orders');

  try {
    // Search for files in PO directory
    const files = await storage.search({ path: `${getPOFolder()}/*` });

    if (files.length === 0) {
      return `No purchase orders found in OneDrive (${getPOFolder()}/ folder is empty)`;
    }

    const lines: string[] = [];
    lines.push('# Purchase Orders');
    lines.push('');
    lines.push(`Found ${files.length} purchase order(s):\n`);

    for (const file of files) {
      lines.push(`- ${file.name} (${file.size} bytes, modified: ${file.modified.toISOString().slice(0, 10)})`);
    }

    return lines.join('\n');
  } catch (error) {
    console.error('[List PO] Error listing files:', error);
    return `Error listing purchase orders: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Tool definition for MCP
 */
export const processWarehouseRequestTool = {
  name: 'process_warehouse_request',
  description: `Process warehouse/inventory requests with 6 workflows:

1. **calculate_vtth**: Calculate VTTH (consumables) requirements for a service package
2. **calculate_chemicals**: Calculate Chemical requirements with QC/CALIB logic
3. **compare_with_inventory**: Compare requirements with current inventory and identify shortages
4. **generate_po**: Generate purchase order for items that need to be purchased
5. **full_process**: Complete process (calculate + compare + generate PO) - RECOMMENDED
6. **list_po**: List existing purchase orders

**Service Packages:**
- gold (Gói vàng): Premium package
- basic (Gói đồng): Basic package
- silver (Gói bạc): Standard package

**Required Files:**
- Master data Excel: Contains VTTH and Chemical sheets
- Inventory Excel: Contains current stock data

**Example Usage:**
\`\`\`json
{
  "workflow": "full_process",
  "numCustomers": 50,
  "servicePackage": "gold",
  "masterDataFile": "MasterData/Master_Data.xlsx",
  "inventoryFile": "CurrentInventory/Inventory.xlsx",
  "includeSupplements": true,
  "saveToOneDrive": true
}
\`\`\`

**Note:** File paths are relative to ONEDRIVE_ROOT_FOLDER. Default structure uses MasterData/ and CurrentInventory/ folders. You can override these via environment variables or parameters.`,
  inputSchema: ProcessWarehouseRequestInput
};
