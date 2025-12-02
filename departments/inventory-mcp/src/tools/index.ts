import { OneDriveStorageAdapter } from '@mcp/core';
import {
  createPurchaseOrder,
  CreatePurchaseOrderSchema,
  CreatePurchaseOrderInput
} from './create-purchase-order.js';
import {
  searchNormTables,
  SearchNormTablesSchema,
  SearchNormTablesInput
} from './search-norm-tables.js';
import {
  listFiles,
  ListFilesSchema,
  ListFilesInput
} from './list-files.js';
import {
  syncOneDrive,
  SyncOneDriveSchema,
  SyncOneDriveInput
} from './sync-onedrive.js';
import {
  processWarehouseRequest,
  ProcessWarehouseRequestInput,
  processWarehouseRequestTool
} from './process-warehouse-request.js';

/**
 * Tool registry for Inventory MCP server
 */
export const tools = {
  // NEW V2 TOOL - Recommended for all warehouse operations
  process_warehouse_request: {
    schema: processWarehouseRequestTool.inputSchema,
    handler: processWarehouseRequest,
    description: processWarehouseRequestTool.description
  },

  // OLD TOOLS - Deprecated, will be removed in future version
  create_purchase_order: {
    schema: CreatePurchaseOrderSchema,
    handler: createPurchaseOrder,
    description: '[DEPRECATED] Tạo phiếu mua hàng dựa trên norm table - Use process_warehouse_request instead'
  },
  search_norm_tables: {
    schema: SearchNormTablesSchema,
    handler: searchNormTables,
    description: '[DEPRECATED] Tìm kiếm và tra cứu thông tin trong norm tables - Use process_warehouse_request instead'
  },
  list_files: {
    schema: ListFilesSchema,
    handler: listFiles,
    description: 'Liệt kê files trong OneDrive Inventory folder'
  },
  sync_onedrive: {
    schema: SyncOneDriveSchema,
    handler: syncOneDrive,
    description: 'Đồng bộ dữ liệu từ OneDrive ngay lập tức'
  }
} as const;

export type ToolName = keyof typeof tools;

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: ToolName,
  storage: OneDriveStorageAdapter,
  args: unknown
): Promise<string> {
  const tool = tools[toolName];

  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  // Validate and parse arguments
  const validatedArgs = tool.schema.parse(args);

  // Execute handler
  return await (tool.handler as any)(storage, validatedArgs);
}

// Export types
export type {
  ProcessWarehouseRequestInput,
  CreatePurchaseOrderInput,
  SearchNormTablesInput,
  ListFilesInput,
  SyncOneDriveInput
};

// Export individual tools
export {
  processWarehouseRequest,
  createPurchaseOrder,
  searchNormTables,
  listFiles,
  syncOneDrive
};
