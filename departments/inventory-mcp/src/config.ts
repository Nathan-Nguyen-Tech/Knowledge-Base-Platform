export interface InventoryConfig {
  server: {
    name: string;
    version: string;
  };
  azure: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  };
  onedrive: {
    userId: string;
    rootFolder: string;
    cacheDb: string;
  };
  sync: {
    intervalMinutes: number;
  };
  logLevel: string;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: InventoryConfig = {
  server: {
    name: getEnvVar('SERVER_NAME', 'inventory-knowledge'),
    version: getEnvVar('SERVER_VERSION', '1.0.0')
  },
  azure: {
    tenantId: getEnvVar('AZURE_TENANT_ID'),
    clientId: getEnvVar('AZURE_CLIENT_ID'),
    clientSecret: getEnvVar('AZURE_CLIENT_SECRET')
  },
  onedrive: {
    userId: getEnvVar('ONEDRIVE_USER_ID'),
    rootFolder: getEnvVar('ONEDRIVE_ROOT_FOLDER', '/Inventory'),
    cacheDb: getEnvVar('ONEDRIVE_CACHE_DB', './cache/inventory.db')
  },
  sync: {
    intervalMinutes: parseInt(getEnvVar('SYNC_INTERVAL_MINUTES', '5'), 10)
  },
  logLevel: getEnvVar('LOG_LEVEL', 'info')
};
