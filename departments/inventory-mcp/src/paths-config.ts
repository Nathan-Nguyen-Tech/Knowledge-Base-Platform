/**
 * Centralized Path Configuration for OneDrive Folders
 *
 * This module provides a single source of truth for all OneDrive folder paths.
 * All paths are relative to ONEDRIVE_ROOT_FOLDER configured in the environment.
 *
 * Environment variables can override defaults for deployment flexibility.
 */

/**
 * Path configuration object
 * Loads from environment variables with sensible defaults
 */
export const pathConfig = {
  // Master data configuration
  masterDataFolder: process.env.ONEDRIVE_MASTER_DATA_FOLDER || 'MasterData',
  masterDataFile: process.env.ONEDRIVE_MASTER_DATA_FILE || 'Master_Data.xlsx',

  // Inventory configuration
  inventoryFolder: process.env.ONEDRIVE_INVENTORY_FOLDER || 'CurrentInventory',
  inventoryFile: process.env.ONEDRIVE_INVENTORY_FILE || 'Inventory.xlsx',

  // Purchase Orders configuration (unified folder name)
  poFolder: process.env.ONEDRIVE_PO_FOLDER || 'PurchaseOrders',

  // Archives configuration
  archiveFolder: process.env.ONEDRIVE_ARCHIVE_FOLDER || 'Archives',

  // Template configuration
  templateFolder: process.env.ONEDRIVE_TEMPLATE_FOLDER || 'Templates',
  poTemplateFile: process.env.ONEDRIVE_PO_TEMPLATE_FILE || 'Template_Order.xlsx'
};

/**
 * Get the full path to the master data file
 * @returns {string} Path relative to root folder (e.g., "MasterData/Master_Data.xlsx")
 */
export function getMasterDataPath(): string {
  return `${pathConfig.masterDataFolder}/${pathConfig.masterDataFile}`;
}

/**
 * Get the full path to the inventory file
 * @returns {string} Path relative to root folder (e.g., "CurrentInventory/Inventory.xlsx")
 */
export function getInventoryPath(): string {
  return `${pathConfig.inventoryFolder}/${pathConfig.inventoryFile}`;
}

/**
 * Get the full path to a purchase order file
 * @param fileName - The PO file name (e.g., "PO-20251127.xlsx")
 * @returns {string} Path relative to root folder (e.g., "PurchaseOrders/PO-20251127.xlsx")
 */
export function getPOPath(fileName: string): string {
  return `${pathConfig.poFolder}/${fileName}`;
}

/**
 * Get the purchase orders folder path
 * @returns {string} Folder path (e.g., "PurchaseOrders")
 */
export function getPOFolder(): string {
  return pathConfig.poFolder;
}

/**
 * Get the master data folder path
 * @returns {string} Folder path (e.g., "MasterData")
 */
export function getMasterDataFolder(): string {
  return pathConfig.masterDataFolder;
}

/**
 * Get the inventory folder path
 * @returns {string} Folder path (e.g., "CurrentInventory")
 */
export function getInventoryFolder(): string {
  return pathConfig.inventoryFolder;
}

/**
 * Get the archives folder path
 * @returns {string} Folder path (e.g., "Archives")
 */
export function getArchiveFolder(): string {
  return pathConfig.archiveFolder;
}

/**
 * Get the full path to the PO template file
 * @returns {string} Path relative to root folder (e.g., "Templates/Template_Order.xlsx")
 */
export function getPOTemplatePath(): string {
  return `${pathConfig.templateFolder}/${pathConfig.poTemplateFile}`;
}

/**
 * Get the templates folder path
 * @returns {string} Folder path (e.g., "Templates")
 */
export function getTemplateFolder(): string {
  return pathConfig.templateFolder;
}
