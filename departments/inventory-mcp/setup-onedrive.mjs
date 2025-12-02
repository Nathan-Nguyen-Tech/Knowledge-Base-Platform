#!/usr/bin/env node

/**
 * Setup OneDrive Structure and Upload Files
 *
 * This script will:
 * 1. Create folder structure: /CompanyResources/Inventory
 * 2. Upload Master_Data.xlsx
 * 3. Upload Inventory.xlsx
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - Load from environment variables
const config = {
  tenantId: process.env.AZURE_TENANT_ID || 'YOUR_TENANT_ID',
  clientId: process.env.AZURE_CLIENT_ID || 'YOUR_CLIENT_ID',
  clientSecret: process.env.AZURE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  userId: process.env.ONEDRIVE_USER_ID || 'YOUR_USER_ID',
  rootFolder: process.env.ONEDRIVE_ROOT_FOLDER || '/CompanyResources/Inventory'
};

/**
 * Initialize Graph Client
 */
function createGraphClient() {
  console.log('🔐 Authenticating with Microsoft Graph API...');

  const credential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret
  );

  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken(['https://graph.microsoft.com/.default']);
        return token.token;
      }
    }
  });

  console.log('   ✓ Authentication successful\n');
  return client;
}

/**
 * Check if a folder exists
 */
async function checkFolder(client, folderPath) {
  try {
    const url = `/users/${config.userId}/drive/root:${folderPath}`;
    const result = await client.api(url).get();
    return { exists: true, item: result };
  } catch (error) {
    if (error.statusCode === 404) {
      return { exists: false };
    }
    throw error;
  }
}

/**
 * Create a single folder
 */
async function createFolder(client, parentPath, folderName) {
  try {
    const parentUrl = parentPath === ''
      ? `/users/${config.userId}/drive/root/children`
      : `/users/${config.userId}/drive/root:${parentPath}:/children`;

    const result = await client.api(parentUrl).post({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'replace'
    });

    return { success: true, item: result };
  } catch (error) {
    if (error.statusCode === 409) {
      // Folder already exists
      return { success: true, alreadyExists: true };
    }
    throw error;
  }
}

/**
 * Create folder structure recursively
 */
async function createFolderStructure(client) {
  console.log('📁 Creating folder structure...\n');

  const folders = [
    // Root
    { path: '/CompanyResources', name: 'CompanyResources' },
    { path: '/CompanyResources/Inventory', name: 'Inventory', parent: '/CompanyResources' },

    // Main folders
    { path: '/CompanyResources/Inventory/MasterData', name: 'MasterData', parent: '/CompanyResources/Inventory' },
    { path: '/CompanyResources/Inventory/CurrentInventory', name: 'CurrentInventory', parent: '/CompanyResources/Inventory' },
    { path: '/CompanyResources/Inventory/PurchaseOrders', name: 'PurchaseOrders', parent: '/CompanyResources/Inventory' },
    { path: '/CompanyResources/Inventory/Archives', name: 'Archives', parent: '/CompanyResources/Inventory' },

    // Archive subfolders
    { path: '/CompanyResources/Inventory/Archives/2024', name: '2024', parent: '/CompanyResources/Inventory/Archives' },
    { path: '/CompanyResources/Inventory/Archives/2025', name: '2025', parent: '/CompanyResources/Inventory/Archives' }
  ];

  for (const folder of folders) {
    console.log(`   Checking: ${folder.path}`);

    const check = await checkFolder(client, folder.path);

    if (check.exists) {
      console.log(`   ✓ Already exists`);
    } else {
      console.log(`   Creating folder...`);
      const parent = folder.parent || '';
      const result = await createFolder(client, parent, folder.name);

      if (result.success) {
        console.log(`   ✓ Created successfully`);
      }
    }
  }

  console.log('\n✓ Folder structure ready\n');
}

/**
 * Upload a file to OneDrive
 */
async function uploadFile(client, localPath, remotePath, description) {
  console.log(`📤 Uploading: ${path.basename(remotePath)}`);
  console.log(`   Local: ${localPath}`);
  console.log(`   Remote: ${config.rootFolder}/${remotePath}`);
  console.log(`   Description: ${description}`);

  // Check if file exists locally
  if (!fs.existsSync(localPath)) {
    console.error(`   ✗ File not found locally!`);
    return false;
  }

  // Read file
  const fileContent = fs.readFileSync(localPath);
  const fileSize = fileContent.length;
  console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB`);

  try {
    // Upload
    const uploadUrl = `/users/${config.userId}/drive/root:${config.rootFolder}/${remotePath}:/content`;

    const response = await client
      .api(uploadUrl)
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .put(fileContent);

    console.log(`   ✓ Upload successful!`);
    console.log(`   File ID: ${response.id}`);

    return true;
  } catch (error) {
    console.error(`   ✗ Upload failed: ${error.message}`);
    return false;
  }
}

/**
 * List files in folder
 */
async function listFiles(client) {
  console.log(`\n📋 Files in ${config.rootFolder}:\n`);

  try {
    const url = `/users/${config.userId}/drive/root:${config.rootFolder}:/children`;
    const response = await client.api(url).get();

    if (response.value.length === 0) {
      console.log('   (empty)');
    } else {
      response.value.forEach(item => {
        const type = item.folder ? '📁' : '📄';
        const size = item.size ? ` (${(item.size / 1024).toFixed(2)} KB)` : '';
        const date = new Date(item.lastModifiedDateTime).toLocaleString();
        console.log(`   ${type} ${item.name}${size}`);
        console.log(`      Modified: ${date}`);
      });
    }

    return true;
  } catch (error) {
    console.error(`   ✗ Cannot list files: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('============================================================');
  console.log('🚀 OneDrive Setup Tool');
  console.log('============================================================\n');

  console.log('Configuration:');
  console.log(`  Tenant: ${config.tenantId}`);
  console.log(`  User: ${config.userId}`);
  console.log(`  Target Folder: ${config.rootFolder}\n`);

  try {
    // Step 1: Authenticate
    const client = createGraphClient();

    // Step 2: Create folder structure
    await createFolderStructure(client);

    // Step 3: Upload files
    console.log('📤 Uploading template files...\n');

    const files = [
      {
        local: path.join(__dirname, 'test/data/Master_Data.xlsx'),
        remote: 'MasterData/Master_Data.xlsx',
        description: 'Master data (VTTH, Chemicals, QC/CALIB)'
      },
      {
        local: path.join(__dirname, 'test/data/Inventory.xlsx'),
        remote: 'CurrentInventory/Inventory.xlsx',
        description: 'Current inventory'
      }
    ];

    let successCount = 0;
    for (const file of files) {
      const success = await uploadFile(client, file.local, file.remote, file.description);
      if (success) successCount++;
      console.log('');
    }

    // Step 4: Verify
    await listFiles(client);

    // Summary
    console.log('\n============================================================');
    console.log('📊 Setup Summary');
    console.log('============================================================');
    console.log(`Files uploaded: ${successCount}/${files.length}`);

    if (successCount === files.length) {
      console.log('\n✅ OneDrive setup completed successfully!');
      console.log(`\n🌐 Access your files:`);
      console.log(`   1. Go to: https://compass247-my.sharepoint.com`);
      console.log(`   2. Navigate to: ${config.rootFolder}`);
      console.log(`   3. Folder structure:`);
      console.log(`      📁 MasterData/`);
      console.log(`         - Master_Data.xlsx`);
      console.log(`      📁 CurrentInventory/`);
      console.log(`         - Inventory.xlsx`);
      console.log(`      📁 PurchaseOrders/`);
      console.log(`      📁 Archives/`);
      console.log(`         📁 2024/`);
      console.log(`         📁 2025/`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Review the uploaded files`);
      console.log(`   2. Customize data for your needs`);
      console.log(`   3. Update config to point to MasterData/ folder`);
      console.log(`   4. Test MCP server`);
    } else {
      console.log('\n⚠️  Some files failed. Check errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
