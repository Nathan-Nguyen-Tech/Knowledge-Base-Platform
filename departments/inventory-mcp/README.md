# Inventory MCP Server

**Medical Laboratory Inventory Management System**

MCP (Model Context Protocol) server for managing medical laboratory inventory with support for VTTH (consumables), chemicals, QC/CALIB calculations, and automated purchase order generation.

## 🎯 Features

- ✅ **3 Service Packages**: Gold (Vàng), Basic (Đồng), Silver (Bạc)
- ✅ **VTTH Management**: Consumable supplies with package-specific consumption rates
- ✅ **Chemical Management**: 2-table filtering with QC/CALIB logic
- ✅ **Intelligent Inventory**: Fuzzy name matching for comparison
- ✅ **Automated PO Generation**: Excel-based purchase orders
- ✅ **6 Workflows**: From granular to fully automated
- ✅ **Business Rules Compliant**: QT001, QT002, QT003

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- TypeScript 5+
- Azure AD Service Principal (for OneDrive access)

### Installation

```bash
npm install
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Azure credentials
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
ONEDRIVE_ROOT_FOLDER=/Inventory
```

### Build

```bash
npm run build
```

### Run Tests

```bash
# Generate test data
npx tsx test/generate-test-data.ts

# Run all tests
npx tsx test/run-all-tests.ts
```

### Start Server

```bash
npm start
```

## 📊 Workflows

### 1. Calculate VTTH Requirements
Calculate consumable requirements for a service package.

```json
{
  "workflow": "calculate_vtth",
  "numCustomers": 50,
  "servicePackage": "gold",
  "masterDataFile": "MasterData/Master_Data.xlsx"
}
```

### 2. Calculate Chemical Requirements
Calculate chemical requirements with automatic QC/CALIB.

```json
{
  "workflow": "calculate_chemicals",
  "numCustomers": 50,
  "servicePackage": "gold",
  "masterDataFile": "MasterData/Master_Data.xlsx",
  "includeSupplements": true
}
```

### 3. Compare with Inventory
Compare requirements against current stock.

```json
{
  "workflow": "compare_with_inventory",
  "numCustomers": 50,
  "servicePackage": "gold",
  "masterDataFile": "MasterData/Master_Data.xlsx",
  "inventoryFile": "CurrentInventory/Inventory.xlsx"
}
```

### 4. Generate Purchase Order
Create Excel purchase order for items needed.

```json
{
  "workflow": "generate_po",
  "numCustomers": 50,
  "servicePackage": "gold",
  "masterDataFile": "MasterData/Master_Data.xlsx",
  "inventoryFile": "CurrentInventory/Inventory.xlsx",
  "saveToOneDrive": true
}
```

### 5. Full Process (Recommended) ⭐

Complete automated workflow from calculation to PO generation.

```json
{
  "workflow": "full_process",
  "numCustomers": 50,
  "servicePackage": "gold",
  "masterDataFile": "MasterData/Master_Data.xlsx",
  "inventoryFile": "CurrentInventory/Inventory.xlsx",
  "includeSupplements": true,
  "saveToOneDrive": true
}
```

**Note:** These paths match the recommended OneDrive folder structure. You can customize paths via environment variables or override them in tool parameters. See `.env.example` for configuration options.

### 6. List Purchase Orders

```json
{
  "workflow": "list_po"
}
```

## 🏗️ Architecture

```
src/
├── types/          # Type definitions
├── utils/          # Helper functions (QC/CALIB, fuzzy matching, unit conversion)
├── models/         # Data models (VTTH, Chemicals, Inventory)
├── calculators/    # Business logic (Requirements, Comparison)
├── generators/     # PO generation
└── tools/          # MCP tool interface
```

## 🧪 Testing

### Test Structure

```
test/
├── data/           # Test Excel files
├── output/         # Generated PO files
├── unit/           # Unit tests
├── integration/    # Integration tests
└── run-all-tests.ts
```

### Run Tests

```bash
# All tests (4 test suites)
npx tsx test/run-all-tests.ts

# Individual tests
npx tsx test/unit/test-vtth-calculator.ts
npx tsx test/unit/test-chemical-calculator.ts
npx tsx test/unit/test-inventory-comparator.ts
npx tsx test/integration/test-full-workflow.ts
```

### Test Results

```
✅ PASS | VTTH Calculator (5.33s)
✅ PASS | Chemical Calculator (5.59s)
✅ PASS | Inventory Comparator (5.32s)
✅ PASS | Full Workflow Integration (5.27s)
Total: 4 | Passed: 4 | Failed: 0
```

## 📋 Business Rules

### QT001: Unit Conversion
- Always compare in **small units**
- Always **round UP** when converting to large units for purchase
- Example: 150 items ÷ 100/box = 2 boxes (not 1.5)

### QT002: Chemical Filtering
- Use **2-table process**: PRIMARY (Hoa Chat Chi Tiet) + SECONDARY (Hoa Chat)
- Condition 1: `chemicalType === "Chạy mẫu"`
- Condition 2: Package marker must be present
- QC/CALIB lookup with fuzzy matching fallback

### QT003: Purchase Order Format
- **Integers only** (no decimals)
- **Large units only** (Hộp, Thùng, Túi, etc.)
- Use Excel template format

## 🔧 Configuration

### Environment Variables

```env
# Azure AD Service Principal
AZURE_TENANT_ID=xxx
AZURE_CLIENT_ID=xxx
AZURE_CLIENT_SECRET=xxx

# OneDrive Configuration
ONEDRIVE_ROOT_FOLDER=/Inventory
ONEDRIVE_CACHE_DB=./cache/inventory.db

# Sync Configuration
SYNC_INTERVAL_MINUTES=5

# Server Configuration
SERVER_NAME=inventory-knowledge
SERVER_VERSION=1.0.0
LOG_LEVEL=info
```

### Excel File Structure

#### Master Data (Master_Data.xlsx)

**Sheet 1: VTTH**
- Columns: STT, Tên vật tư, Số lượng trong 1 ĐVT, Gói đồng/vàng/bạc - Tiêu hao

**Sheet 2: Hoa Chat Chi Tiet (PRIMARY)**
- Columns: Tên xét nghiệm, Loại hóa chất, Số lọ, Số test, Gói vàng/đồng/bạc

**Sheet 3: Hoa Chat (SECONDARY)**
- Columns: Loại xét nghiệm, Số test cho 1 lần QC, Số test cho 1 lần calib

#### Inventory (Inventory.xlsx)

**Sheet: Inventory**
- Columns: Tên sản phẩm, Số lượng, Đơn vị tính, Ngày cập nhật

## 🤖 Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "inventory": {
      "command": "node",
      "args": ["path/to/inventory-mcp/build/index.js"],
      "env": {
        "AZURE_TENANT_ID": "xxx",
        "AZURE_CLIENT_ID": "xxx",
        "AZURE_CLIENT_SECRET": "xxx"
      }
    }
  }
}
```

## 📚 Documentation

- **[SESSION_SUMMARY.md](SESSION_SUMMARY.md)** - Complete session summary with implementation details
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Phase 2 implementation documentation
- **[TEST_SUITE_COMPLETE.md](TEST_SUITE_COMPLETE.md)** - Testing documentation
- **[REFACTOR_PROGRESS.md](REFACTOR_PROGRESS.md)** - Phase 1 and refactor plan
- **[QUICK_START_NEXT_SESSION.md](QUICK_START_NEXT_SESSION.md)** - Quick reference for next session

## 🎓 Key Concepts

### Service Packages

| Package | Vietnamese | VTTH Column | Chemical Column |
|---------|------------|-------------|-----------------|
| Gold    | Gói vàng   | 10          | 13              |
| Basic   | Gói đồng   | 8           | 14              |
| Silver  | Gói bạc    | 12          | 15              |

### QC/CALIB Logic

- **QC Tests**: Quality Control (default: 2 per run)
- **CALIB Tests**: Calibration (default: 4 per run)
- **Skip Keywords**: wash, dung dịch, diluit, lyse, clean, dye, tiểu
- **Supplements**: ERBA PATH, ERBA NORM, XL MULTICAL, HDL/LDL Cal (conditional)

### Fuzzy Matching

- **Algorithm**: Levenshtein distance
- **Threshold**: 85% similarity (configurable)
- **Use Case**: Match inventory names with requirement names
- **Supports**: Vietnamese characters

## 🚧 Development Status

### ✅ Complete
- [x] Core implementation (Phase 1 + 2)
- [x] Unit tests (4/4 passing)
- [x] Integration tests (1/1 passing)
- [x] Business rules verification
- [x] Mock data testing
- [x] Build pipeline

### ⚠️ Pending
- [ ] Azure OneDrive integration testing
- [ ] Claude Desktop integration
- [ ] Real data testing
- [ ] End-user documentation
- [ ] Performance optimization
- [ ] Old code cleanup

## 🤝 Contributing

### Code Style
- TypeScript strict mode
- ES modules
- Clean architecture
- Comprehensive error handling

### Testing
- Write unit tests for new features
- Update integration tests
- Maintain 100% business rule coverage

### Documentation
- Update relevant .md files
- Add inline code comments
- Update examples

## 📝 License

See LICENSE file.

## 👥 Team

Medical Laboratory Inventory Management System
Built with MCP SDK v1.12.0

## 📞 Support

For issues or questions:
1. Check documentation in `docs/` folder
2. Review test cases in `test/` folder
3. Check `SESSION_SUMMARY.md` for implementation details

---

**Version**: 1.0.0
**Status**: ✅ Ready for Production Testing
**Last Updated**: 2025-11-26
