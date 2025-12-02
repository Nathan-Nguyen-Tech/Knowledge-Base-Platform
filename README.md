# Knowledge Base Platform

Multi-department Knowledge Base platform cho Compass Medical, hỗ trợ nhiều departments với storage backends khác nhau.

## Overview

Knowledge Base Platform là hệ thống MCP (Model Context Protocol) servers giúp Claude Desktop truy cập và quản lý knowledge base của nhiều departments khác nhau. Mỗi department có MCP server riêng, storage backend riêng, và business logic riêng.

### Departments Supported

- **MD (Medical)**: Existing system - Git-based storage (medical-knowledge-mcp)
- **Inventory**: OneDrive Business - Quản lý tồn kho và tạo phiếu mua hàng ✅ **IMPLEMENTED**
- **Purchasing**: OneDrive Business - Quản lý mua sắm (planned)
- **Account**: OneDrive Business - Quản lý tài chính (planned)
- **BD (Business Development)**: OneDrive Business - Quản lý kinh doanh (planned)
- **HR**: OneDrive Business - Quản lý nhân sự (planned)

## Architecture

### Monorepo Structure

```
Knowledge-Base-Platform/
├── packages/
│   └── mcp-core/                  # Shared core abstractions
│       ├── src/
│       │   ├── storage-adapters/  # IStorageAdapter, OneDriveStorageAdapter, etc.
│       │   ├── file-handlers/     # IFileHandler, ExcelHandler, etc.
│       │   ├── auth/              # IAuthProvider, ServicePrincipalAuth
│       │   ├── cache/             # ICacheProvider, SqliteCache
│       │   └── sync/              # ISyncStrategy, PollingSync
│       └── package.json
│
├── departments/
│   ├── inventory-mcp/             # Inventory MCP Server ✅
│   │   ├── src/
│   │   │   ├── index.ts           # Main server entry point
│   │   │   ├── config.ts          # Configuration management
│   │   │   ├── models/            # Domain models (NormTable, PurchaseOrder, StockItem)
│   │   │   ├── utils/             # Utilities (POGenerator, StockCalculator)
│   │   │   └── tools/             # MCP tools
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── purchasing-mcp/            # (planned)
│   ├── account-mcp/               # (planned)
│   ├── bd-mcp/                    # (planned)
│   └── hr-mcp/                    # (planned)
│
├── docs/
│   ├── AZURE_SETUP.md             # Azure AD setup guide
│   └── ARCHITECTURE.md            # Architecture details
│
└── package.json                   # Root workspace config
```

### Clean Architecture

Platform sử dụng **Clean Architecture** với các abstractions core:

1. **IStorageAdapter**: Trừu tượng hóa storage backends (Git, OneDrive, GoogleDrive, etc.)
2. **IFileHandler**: Parse và serialize các loại files (Excel, Markdown, JSON, etc.)
3. **IAuthProvider**: Authentication cho các services khác nhau
4. **ICacheProvider**: Local caching để offline access và giảm API calls
5. **ISyncStrategy**: Đồng bộ với remote storage (Polling, Webhooks, etc.)

### Technology Stack

- **Runtime**: Node.js 20+ với ES Modules
- **Language**: TypeScript 5+
- **MCP SDK**: @modelcontextprotocol/sdk v1.12.0
- **Authentication**: Azure AD Service Principal
- **Storage**: Microsoft Graph API (OneDrive Business)
- **Excel Processing**: ExcelJS
- **Caching**: SQLite (via sqlite3 + sqlite)
- **Sync**: Polling strategy (5-minute intervals)

## Quick Start

### Prerequisites

1. Node.js 20+ và npm
2. Azure AD Service Principal (see [AZURE_SETUP.md](docs/AZURE_SETUP.md))
3. OneDrive Business account với folder structure đã setup

### Installation

```bash
# Clone repo
cd Knowledge-Base-Platform

# Install dependencies
npm install

# Build all packages
npm run build
```

### Setup Inventory MCP

1. **Cấu hình Azure AD**: Follow [AZURE_SETUP.md](docs/AZURE_SETUP.md)

2. **Tạo .env file**:
```bash
cd departments/inventory-mcp
cp .env.example .env
# Edit .env với Azure credentials
```

3. **Create OneDrive folder structure**:
```
/Inventory
  ├── Norm_Table/
  ├── Purchase_Order/
  └── Stock/
```

4. **Run server**:
```bash
npm start
```

### Configure Claude Desktop

Edit Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "inventory": {
      "command": "node",
      "args": [
        "D:\\Compass_Coding\\Knowledge-Base-Platform\\departments\\inventory-mcp\\dist\\index.js"
      ],
      "env": {
        "AZURE_TENANT_ID": "your-tenant-id",
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-client-secret",
        "ONEDRIVE_ROOT_FOLDER": "/Inventory"
      }
    }
  }
}
```

Restart Claude Desktop để load MCP server.

## Inventory MCP Tools

### 1. create_purchase_order

Tạo phiếu mua hàng dựa trên norm table, số lượng người khám, và tồn kho hiện tại.

**Example usage in Claude:**
```
Tạo phiếu mua hàng cho đoàn "Công ty ABC", 50 người, khám ngày 2025-02-15
```

**Process:**
1. Đọc norm table từ OneDrive (Norm_Table/)
2. Tính toán requirements (norm × số người)
3. Kiểm tra tồn kho hiện tại (Stock/current_stock.xlsx)
4. Tính số lượng cần mua (required - stock)
5. Generate Excel purchase order với formatting
6. Save vào OneDrive (Purchase_Order/)

### 2. search_norm_tables

Tìm kiếm và tra cứu thông tin trong norm tables.

**Example usage:**
```
Tìm các mặt hàng Hóa chất trong norm table
```

### 3. list_files

Liệt kê files trong OneDrive Inventory folder.

**Example usage:**
```
List các purchase orders đã tạo
```

### 4. sync_onedrive

Đồng bộ dữ liệu từ OneDrive ngay lập tức (không chờ polling interval).

**Example usage:**
```
Sync OneDrive để lấy dữ liệu mới nhất
```

## Development

### Adding a New Department

1. **Create department folder**:
```bash
mkdir -p departments/new-dept-mcp/src
cd departments/new-dept-mcp
```

2. **Copy Inventory template**:
```bash
cp -r ../inventory-mcp/package.json .
cp -r ../inventory-mcp/tsconfig.json .
cp -r ../inventory-mcp/.env.example .
```

3. **Update package.json**:
- Change name to `@departments/new-dept-mcp`
- Update description

4. **Implement domain logic**:
- Create models in `src/models/`
- Create utils in `src/utils/`
- Create tools in `src/tools/`

5. **Update index.ts**:
- Define MCP server
- Register tools
- Setup storage adapter

6. **Build and test**:
```bash
npm run build
npm start
```

### Core Package Development

The `@mcp/core` package provides shared abstractions. To add new features:

1. **Storage Adapters**: Implement `IStorageAdapter` for new backends
2. **File Handlers**: Implement `IFileHandler` for new file types
3. **Auth Providers**: Implement `IAuthProvider` for new auth methods
4. **Cache Providers**: Implement `ICacheProvider` for new cache strategies
5. **Sync Strategies**: Implement `ISyncStrategy` for new sync methods

## Testing

### Manual Testing

1. **Build project**:
```bash
npm run build
```

2. **Run server standalone**:
```bash
cd departments/inventory-mcp
npm start
```

3. **Test in Claude Desktop**:
- Configure MCP server in settings
- Restart Claude Desktop
- Try tool commands

### Common Issues

See [AZURE_SETUP.md - Troubleshooting](docs/AZURE_SETUP.md#common-issues--troubleshooting)

## Security

### Credentials Management

- **NEVER** commit `.env` files
- Use Azure Key Vault cho production
- Rotate secrets định kỳ (6-12 tháng)
- Follow least privilege principle

### Permissions

Inventory MCP cần các Microsoft Graph permissions:
- `Files.Read.All` - Đọc files
- `Files.ReadWrite.All` - Ghi files
- `Sites.Read.All` - Đọc SharePoint (optional)

### Auditing

- Theo dõi Azure AD sign-in logs
- Monitor unusual activity
- Alert on authentication failures

## Roadmap

### Phase 1: Inventory (COMPLETED ✅)
- [x] Core abstractions (@mcp/core)
- [x] OneDrive storage adapter
- [x] Excel file handler
- [x] Service Principal auth
- [x] SQLite caching
- [x] Polling sync
- [x] Inventory MCP server
- [x] Purchase order creation
- [x] Documentation

### Phase 2: Additional Departments (PLANNED)
- [ ] Purchasing MCP
- [ ] Account MCP
- [ ] BD MCP
- [ ] HR MCP

### Phase 3: Enhancements (PLANNED)
- [ ] Real-time webhooks (optional)
- [ ] Google Drive adapter
- [ ] SharePoint adapter
- [ ] Advanced search with AI
- [ ] Analytics dashboard
- [ ] Mobile access

## Contributing

### Code Style

- TypeScript with strict mode
- ES Modules
- Async/await (no callbacks)
- Error handling với try/catch
- Console.error cho logs (stdout reserved for MCP protocol)

### Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Include issue numbers
- Keep commits atomic

## License

Internal use only - Compass Medical

## Support

For issues and questions:
1. Check documentation: [docs/](docs/)
2. Review existing issues
3. Contact team lead

## Acknowledgments

- Built on [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol)
- Inspired by existing medical-knowledge-mcp system
- Uses Microsoft Graph API for OneDrive access
