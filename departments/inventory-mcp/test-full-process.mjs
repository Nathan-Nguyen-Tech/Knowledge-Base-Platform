/**
 * Test script for full_process workflow
 * Test case: 100 customers, basic package
 */

import 'dotenv/config';
import { processWarehouseRequest } from './build/tools/process-warehouse-request.js';
import { OneDriveStorageAdapter, ServicePrincipalAuth, SqliteCache, PollingSync } from '@mcp/core';

// Azure credentials from environment (required)
const azureConfig = {
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  userId: process.env.ONEDRIVE_USER_ID
};

// Validate required environment variables
const requiredEnvVars = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'ONEDRIVE_USER_ID'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set them before running this script.');
  process.exit(1);
}

const rootFolder = process.env.ONEDRIVE_ROOT_FOLDER || '/CompanyResources/Inventory';
const cacheDb = process.env.ONEDRIVE_CACHE_DB || './cache/inventory.db';

console.log('='.repeat(80));
console.log('🧪 TEST: Full Process Workflow');
console.log('='.repeat(80));
console.log('');
console.log('📋 Test Configuration:');
console.log(`   - Customers: 150`);
console.log(`   - Package: basic (Gói đồng)`);
console.log(`   - Include Supplements: Yes`);
console.log(`   - Save to OneDrive: Yes`);
console.log(`   - Root Folder: ${rootFolder}`);
console.log('');

// Test parameters
const testInput = {
  workflow: 'full_process',
  numCustomers: 150,
  servicePackage: 'basic',
  masterDataFile: 'MasterData/Master_Data.xlsx',
  inventoryFile: 'CurrentInventory/Inventory.xlsx',
  includeSupplements: true,
  saveToOneDrive: true,
  outputPath: `PurchaseOrders/PO-150customers-${Date.now()}.xlsx`
};

console.log('📄 Input Parameters:');
console.log(JSON.stringify(testInput, null, 2));
console.log('');
console.log('-'.repeat(80));
console.log('');

try {
  // Initialize Azure authentication
  console.log('🔐 Initializing Azure authentication...');
  const auth = new ServicePrincipalAuth({
    tenantId: azureConfig.tenantId,
    clientId: azureConfig.clientId,
    clientSecret: azureConfig.clientSecret
  });

  // Initialize cache
  console.log('💾 Initializing cache...');
  const cache = new SqliteCache(cacheDb);
  await cache.initialize();

  // Initialize sync strategy
  console.log('🔄 Initializing sync strategy...');
  const syncStrategy = new PollingSync({
    intervalMinutes: 5,
    userId: azureConfig.userId
  });

  // Initialize storage adapter
  console.log('☁️  Initializing OneDrive storage adapter...');
  const storage = new OneDriveStorageAdapter(
    {
      tenantId: azureConfig.tenantId,
      clientId: azureConfig.clientId,
      clientSecret: azureConfig.clientSecret,
      userId: azureConfig.userId,
      rootFolderPath: rootFolder,
      cacheProvider: cache,
      syncStrategy: syncStrategy
    },
    auth
  );

  // Initialize the storage adapter (authenticates and sets up graphClient)
  await storage.initialize();

  console.log('✅ Initialization complete!');
  console.log('');
  console.log('='.repeat(80));
  console.log('🚀 Starting workflow execution...');
  console.log('='.repeat(80));
  console.log('');

  // Execute workflow (storage first, then input)
  const result = await processWarehouseRequest(storage, testInput);

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ WORKFLOW COMPLETED SUCCESSFULLY');
  console.log('='.repeat(80));
  console.log('');
  console.log('📊 Results:');
  console.log('');
  console.log(result);
  console.log('');
  console.log('='.repeat(80));
  console.log('');

  // Cleanup
  await storage.dispose();

  console.log('✅ Test completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('');
  console.error('='.repeat(80));
  console.error('❌ TEST FAILED');
  console.error('='.repeat(80));
  console.error('');
  console.error('Error details:');
  console.error(error);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  console.error('');
  console.error('='.repeat(80));
  process.exit(1);
}
