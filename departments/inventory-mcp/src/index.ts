#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import {
  OneDriveStorageAdapter,
  ServicePrincipalAuth,
  SqliteCache,
  PollingSync,
  ExcelHandler
} from '@mcp/core';

import { zodToJsonSchema } from 'zod-to-json-schema';
import { config } from './config.js';
import { executeTool, tools } from './tools/index.js';

/**
 * Inventory MCP Server
 * Manages inventory data on OneDrive Business
 */
class InventoryMCPServer {
  private server: Server;
  private storageAdapter!: OneDriveStorageAdapter;
  private excelHandler: ExcelHandler;

  constructor() {
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.excelHandler = new ExcelHandler();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List tools handler - Dynamically generate from tools registry
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolsList = Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.schema, {
          $refStrategy: 'none' // Inline all schemas instead of using $ref
        })
      }));

      return {
        tools: toolsList
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;

      try {
        // Check if tool exists
        if (!(toolName in tools)) {
          throw new Error(`Unknown tool: ${toolName}`);
        }

        // Execute tool
        const result = await executeTool(
          toolName as keyof typeof tools,
          this.storageAdapter,
          request.params.arguments || {}
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: result
            }
          ]
        };
      } catch (error) {
        console.error(`[CallTool] Error executing ${toolName}:`, error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });

    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const files = await this.storageAdapter.scan();
        return {
          resources: files.map(file => ({
            uri: `inventory://${file.path}`,
            name: file.name,
            mimeType: file.mimeType,
            description: `Inventory file: ${file.path}`
          }))
        };
      } catch (error) {
        console.error('Error listing resources:', error);
        return { resources: [] };
      }
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const path = request.params.uri.replace('inventory://', '');
        const content = await this.storageAdapter.getFileContentAsString(path);

        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: 'text/plain',
              text: content
            }
          ]
        };
      } catch (error) {
        throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  async initialize() {
    console.error('='.repeat(60));
    console.error(`${config.server.name} v${config.server.version}`);
    console.error('='.repeat(60));
    console.error('');

    console.error('[Inventory] Initializing...');

    // Setup authentication
    const auth = new ServicePrincipalAuth({
      tenantId: config.azure.tenantId,
      clientId: config.azure.clientId,
      clientSecret: config.azure.clientSecret
    });

    // Setup cache
    const cache = new SqliteCache(config.onedrive.cacheDb);

    // Setup sync strategy
    const syncStrategy = new PollingSync({
      intervalMinutes: config.sync.intervalMinutes,
      userId: config.onedrive.userId
    });

    // Setup OneDrive storage
    this.storageAdapter = new OneDriveStorageAdapter(
      {
        tenantId: config.azure.tenantId,
        clientId: config.azure.clientId,
        clientSecret: config.azure.clientSecret,
        userId: config.onedrive.userId,
        rootFolderPath: config.onedrive.rootFolder,
        cacheProvider: cache,
        syncStrategy: syncStrategy
      },
      auth
    );

    await this.storageAdapter.initialize();

    console.error('');
    console.error('[Inventory] ✓ Initialization complete');
  }

  async start() {
    try {
      await this.initialize();

      // Connect via stdio
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error('');
      console.error('✓ Server running on stdio');
      console.error(`✓ OneDrive folder: ${config.onedrive.rootFolder}`);
      console.error(`✓ Sync interval: ${config.sync.intervalMinutes} minutes`);
      console.error('');
      console.error('Ready to manage inventory!');
      console.error('='.repeat(60));

      // Handle shutdown
      process.on('SIGINT', async () => {
        console.error('\n\nShutting down...');
        await this.storageAdapter.dispose();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.error('\n\nShutting down...');
        await this.storageAdapter.dispose();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new InventoryMCPServer();
server.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
