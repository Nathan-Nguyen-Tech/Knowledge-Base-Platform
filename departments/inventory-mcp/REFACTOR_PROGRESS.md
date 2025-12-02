# Inventory MCP Refactor Progress

## 📌 Context

Đang refactor toàn bộ Inventory MCP để phù hợp với yêu cầu thực tế của hệ thống phòng xét nghiệm y khoa. Yêu cầu chi tiết trong file `MD Knowledge Base/Yêu cầu Inventory MCP.md`.

## ✅ Completed - Phase 1: Foundation (7 files)

### 1. Type Definitions

**File**: `src/types/ServicePackage.ts`
- ✅ Service package enum: `gold`, `basic`, `silver`
- ✅ Column mappings cho VTTH và Chemical sheets
- ✅ Helper functions: `isValidServicePackage()`, `getServicePackageInfo()`

### 2. Utility Functions

**File**: `src/utils/unit-converter.ts`
- ✅ `convertLargeToSmall()` - Quy đổi từ đơn vị lớn sang nhỏ
- ✅ `convertSmallToLarge()` - Quy đổi từ nhỏ sang lớn (ALWAYS round UP)
- ✅ `calculateShortage()` - Tính thiếu hụt: MAX(0, required - stock)
- ✅ `toNumber()` - Safe conversion với error handling
- ✅ `ensureNonNegative()` - Xử lý số âm
- ✅ `validateConversionRatio()` - Validation
- **Implements**: QT001 (Quy đổi đơn vị)

**File**: `src/utils/name-normalizer.ts`
- ✅ `normalizeName()` - Chuẩn hóa tên (lowercase, remove special chars, collapse spaces)
- ✅ `calculateSimilarity()` - Levenshtein distance (0-100)
- ✅ `findBestMatch()` - Fuzzy matching với threshold 85%
- ✅ `containsAnyKeyword()` - Kiểm tra keywords
- **Supports**: Vietnamese characters

**File**: `src/utils/chemical-helpers.ts`
- ✅ `needsQcCalib()` - Kiểm tra hóa chất cần QC/CALIB không
- ✅ `isLargeVolume()` - Kiểm tra hóa chất 20L
- ✅ `getChemicalUnit()` - Trả về "Thùng" hoặc "Hộp"
- ✅ `calculateChemicalPurchaseQuantity()` - Tính số lượng mua (20L vs normal)
- ✅ `getApplicableSupplements()` - Lấy QC/CALIB supplements
- **Constants**:
  - `QC_CALIB_SKIP_KEYWORDS`
  - `LARGE_VOLUME_KEYWORDS`
  - `DEFAULT_QC_TESTS = 2`
  - `DEFAULT_CALIB_TESTS = 4`
  - `QC_CALIB_SUPPLEMENTS` array

### 3. Domain Models

**File**: `src/models/VTTHItem.ts`
- ✅ `VTTHItemData` interface với 3 gói (basic/gold/silver)
- ✅ `VTTHItem` class với methods:
  - `getConsumptionRate(pkg)` - Lấy tỷ lệ tiêu hao theo gói
  - `isInPackage(pkg)` - Kiểm tra sản phẩm có trong gói
  - `calculateRequired(numCustomers, pkg)` - Tính nhu cầu (đơn vị nhỏ)
  - `calculatePurchaseQuantity(numCustomers, pkg)` - Tính số lượng mua (đơn vị lớn, round up)
- ✅ `parseVTTHFromExcel()` - Parse từ sheet "VTTH"
- **Column mapping**: STT(1), Tên(2), ĐVT(4), Quy đổi(5), Gói đồng(8), Gói vàng(10), Gói bạc(12)

**File**: `src/models/ChemicalItem.ts`
- ✅ `ChemicalPrimaryData` - Từ sheet "Hoa Chat Chi Tiet"
- ✅ `ChemicalQcCalibData` - Từ sheet "Hoa Chat"
- ✅ `ChemicalItemData` - Combined với QC/CALIB
- ✅ `ChemicalItem` class với methods:
  - `isInPackage(pkg)` - Kiểm tra có trong gói
  - `calculateTotalTests(numCustomers)` - Total = customer + QC + CALIB
  - `calculateContainersNeeded(numCustomers)` - Số containers (vials)
  - `calculatePurchaseQuantity(numCustomers)` - Số lượng mua (Hộp/Thùng)
  - `getPurchaseUnit()` - Lấy đơn vị mua
- ✅ `parseChemicalPrimaryFromExcel()` - Parse PRIMARY sheet
- ✅ `parseChemicalQcCalibFromExcel()` - Parse SECONDARY sheet
- ✅ `combineChemicalData()` - Kết hợp 2 sheets với fuzzy matching
- ✅ `filterChemicalsByPackage()` - Lọc theo QT002 (2 điều kiện)
- **Implements**: QT002 (Lọc hóa chất 2 bảng)

## 🔄 Next Steps - Phase 2: Calculators & Comparators

### 1. Additional Models (30 minutes)

**File**: `src/models/InventoryItemV2.ts` (CREATE NEW)
```typescript
// Tồn kho với unit conversion support
interface InventoryItemData {
  productName: string;
  quantity: number;  // Có thể là đơn vị nhỏ hoặc lớn
  unit?: string;  // Từ Excel "unit" column
  lastUpdated?: Date;
  notes?: string;
}

class InventoryItem {
  // Normalize name for matching
  // Convert quantity based on unit type (small/large)
  // Methods: getQuantityInSmallUnit(conversionRatio, unitType)
}

// Parse from "Inventory" sheet
function parseInventoryFromExcel(buffer: Buffer): Map<string, InventoryItem>
```

**File**: `src/models/PurchaseOrderV2.ts` (CREATE NEW - don't modify old one yet)
```typescript
// Updated PO với template format
// Row 1-8: Header metadata
// Row 9+: Line items
// Columns: STT, Tên, (blank), Đặc điểm, ĐVT, Số lượng, Mục đích
```

### 2. Calculators (1 hour)

**File**: `src/calculators/VTTHCalculator.ts` (CREATE NEW)
```typescript
// Workflow 1: Tính nhu cầu VTTH
class VTTHCalculator {
  static async calculateRequirements(
    storage: OneDriveStorageAdapter,
    numCustomers: number,
    servicePackage: ServicePackage
  ): Promise<VTTHRequirement[]>

  // Steps:
  // 1. Read VTTH Excel from OneDrive
  // 2. Parse with parseVTTHFromExcel()
  // 3. Filter items by package (isInPackage)
  // 4. Calculate for each item
  // 5. Return results
}

interface VTTHRequirement {
  name: string;
  requiredSmall: number;
  purchaseQuantity: number;
  smallUnit: string;
  largeUnit: string;
  conversionRatio: number;
  consumptionRate: number;
}
```

**File**: `src/calculators/ChemicalCalculator.ts` (CREATE NEW)
```typescript
// Workflow 2: Tính nhu cầu hóa chất
class ChemicalCalculator {
  static async calculateRequirements(
    storage: OneDriveStorageAdapter,
    numCustomers: number,
    servicePackage: ServicePackage,
    includeSupplements: boolean = false
  ): Promise<ChemicalRequirement[]>

  // Steps:
  // 1. Read both Excel sheets from OneDrive
  // 2. Parse PRIMARY with parseChemicalPrimaryFromExcel()
  // 3. Parse SECONDARY with parseChemicalQcCalibFromExcel()
  // 4. Combine with combineChemicalData()
  // 5. Filter by package and type with filterChemicalsByPackage()
  // 6. Calculate for each chemical
  // 7. Add supplements if requested
  // 8. Return results
}

interface ChemicalRequirement {
  name: string;
  customerTests: number;
  qcTests: number;
  calibTests: number;
  totalTests: number;
  containersNeeded: number;
  purchaseQuantity: number;
  unit: string;  // "Hộp" or "Thùng"
  isLargeVolume: boolean;
}
```

**File**: `src/calculators/InventoryComparator.ts` (CREATE NEW)
```typescript
// Workflow 3: So sánh với tồn kho
class InventoryComparator {
  static async compareWithInventory(
    storage: OneDriveStorageAdapter,
    requirements: (VTTHRequirement | ChemicalRequirement)[],
    inventoryUnitType: 'small' | 'large' = 'small'
  ): Promise<ComparisonResult>

  // Steps:
  // 1. Read Inventory sheet
  // 2. Parse with parseInventoryFromExcel()
  // 3. For each requirement:
  //    a. Find in inventory (exact match or fuzzy)
  //    b. Convert inventory to small unit if needed
  //    c. Calculate shortage
  //    d. Convert shortage to purchase quantity (large unit, round up)
  // 4. Categorize: need_to_purchase, sufficient, not_found
  // 5. Return results
}

interface ComparisonResult {
  needToPurchase: PurchaseItem[];
  sufficient: SufficientItem[];
  notFound: NotFoundItem[];
  summary: {
    totalItems: number;
    needPurchaseCount: number;
    sufficientCount: number;
    notFoundCount: number;
  };
}

interface PurchaseItem {
  name: string;
  requiredSmall: number;
  stockSmall: number;
  shortageSmall: number;
  purchaseQuantity: number;
  largeUnit: string;
  inventoryUnit?: string;
  matchedName?: string;  // If fuzzy matched
  similarity?: number;
}
```

### 3. PO Generator (30 minutes)

**File**: `src/generators/POGeneratorV2.ts` (CREATE NEW)
```typescript
// Workflow 4: Tạo phiếu mua hàng
class POGeneratorV2 {
  static async generatePurchaseOrder(
    storage: OneDriveStorageAdapter,
    items: PurchaseItem[],
    context: {
      numCustomers: number;
      servicePackage: ServicePackage;
      requester?: string;
      department?: string;
    }
  ): Promise<POResult>

  // Steps:
  // 1. Generate PO ID: Phiếu_YYYYMMDD_HHMMSS
  // 2. Find template: "Phiếu mua hàng mẫu version 1"
  // 3. Copy template sheet → new sheet with PO ID name
  // 4. Prepare line items (STT, Name, blank, Unit, Quantity, Purpose)
  // 5. Write to sheet starting row 9
  // 6. Save metadata to "Phiếu Mua Hàng" sheet
  // 7. Save line details to "Chi Tiết Phiếu Mua Hàng" sheet
  // 8. Return result with PO ID and OneDrive link
}

interface POResult {
  success: boolean;
  poId: string;
  fileName: string;
  oneDriveUrl: string;
  summary: {
    date: string;
    requester: string;
    department: string;
    totalItems: number;
    totalQuantity: number;
  };
}
```

### 4. Tool Refactor (1 hour)

**File**: `src/tools/process-warehouse-request.ts` (CREATE NEW - replace all old tools)
```typescript
// Single unified tool
export const ProcessWarehouseRequestSchema = z.object({
  workflow: z.enum([
    'create_purchase_order',    // Workflow 5: One-step (RECOMMENDED)
    'calculate_vtth',           // Workflow 1: VTTH only
    'calculate_chemicals',      // Workflow 2: Chemicals only
    'compare_inventory',        // Workflow 3: Compare only
    'generate_po',              // Workflow 4: Generate PO only
    'list_po'                   // List existing POs
  ]),
  num_customers: z.number().positive().optional(),
  service_package: z.enum(['gold', 'basic', 'silver']).optional(),
  include_qc_calib_supplements: z.boolean().default(false),
  inventory_unit_type: z.enum(['small', 'large']).default('small'),
  requester_name: z.string().optional(),
  department: z.string().optional()
});

export async function processWarehouseRequest(
  storage: OneDriveStorageAdapter,
  input: ProcessWarehouseRequestInput
): Promise<string>

// Workflow orchestration:
// - 'create_purchase_order': Run workflow 1 → 3 → 4
// - 'calculate_vtth': Run workflow 1 only
// - 'calculate_chemicals': Run workflow 2 only
// - 'compare_inventory': Need requirements, run workflow 3
// - 'generate_po': Need shortage list, run workflow 4
// - 'list_po': Read "Phiếu Mua Hàng" sheet
```

**File**: `src/tools/index.ts` (UPDATE)
```typescript
// Replace old tools with new single tool
export const tools = {
  process_warehouse_request: {
    schema: ProcessWarehouseRequestSchema,
    handler: processWarehouseRequest,
    description: 'Xử lý yêu cầu kho: tính nhu cầu, so sánh tồn kho, tạo phiếu mua hàng'
  }
} as const;
```

**File**: `src/index.ts` (UPDATE)
```typescript
// Update ListToolsRequestSchema to show new tool
// Update tool descriptions with Vietnamese examples
```

## 📝 Implementation Notes

### Critical Business Rules to Follow

**QT001 - Unit Conversion**:
```typescript
// ALWAYS compare in small units
// ALWAYS round UP when converting to large units
// Example: 83 lọ ÷ 100 lọ/túi = 0.83 → ROUND UP → 1 túi
```

**QT002 - Chemical Filtering**:
```typescript
// Two conditions (AND):
// 1. chemicalType === "Chạy mẫu"
// 2. hasPackageMarker === true (x in package column)
```

**QT003 - PO Format**:
```typescript
// Use template copy (preserve formatting)
// Large units only (Hộp, Túi, Thùng)
// Integer quantities only (no decimals)
// Column D: unit from inventory
```

### Excel Sheet Names (EXACT)
- `VTTH` - Vật tư sheet
- `Hoa Chat Chi Tiet` - PRIMARY chemical sheet
- `Hoa Chat` - SECONDARY QC/CALIB sheet
- `Inventory` - Stock sheet
- `Phiếu Mua Hàng` - PO metadata sheet
- `Chi Tiết Phiếu Mua Hàng` - PO line items sheet
- `Phiếu mua hàng mẫu version 1` - Template sheet

### Error Handling Patterns

```typescript
try {
  // Parse Excel
  const items = await parseVTTHFromExcel(buffer);
} catch (error) {
  console.error(`[Module] Error:`, error);
  throw new Error(`User-friendly message: ${error.message}`);
}

// Skip invalid items with warning
if (conversionRatio <= 0) {
  console.error(`[Module] Skipping '${name}': Invalid ratio ${ratio}`);
  continue;
}
```

### Testing Strategy

**Unit Tests** (create in Phase 2):
```typescript
// test/unit-converter.test.ts
// test/name-normalizer.test.ts
// test/chemical-helpers.test.ts
```

**Integration Tests** (create in Phase 3):
```typescript
// test/vtth-calculator.test.ts - with mock Excel data
// test/chemical-calculator.test.ts - with mock 2 sheets
// test/inventory-comparator.test.ts - with mock inventory
```

**E2E Tests** (create in Phase 4):
```typescript
// test/purchase-order-workflow.test.ts - full workflow
```

## 🎯 Session Continuation Checklist

**When starting next session**:

1. ✅ Read this file completely
2. ✅ Check all 7 created files are present and compile
3. ✅ Start with `src/models/InventoryItemV2.ts`
4. ✅ Then `src/calculators/VTTHCalculator.ts`
5. ✅ Then `src/calculators/ChemicalCalculator.ts`
6. ✅ Then `src/calculators/InventoryComparator.ts`
7. ✅ Then `src/generators/POGeneratorV2.ts`
8. ✅ Then `src/tools/process-warehouse-request.ts`
9. ✅ Update `src/tools/index.ts`
10. ✅ Update `src/index.ts` tool descriptions
11. ✅ Build: `npm run build`
12. ✅ Test with mock data
13. ✅ Clean up old files (after everything works)

## 🚀 Quick Start Command

```bash
# Next session start
cd d:\Compass_Coding\Knowledge-Base-Platform\departments\inventory-mcp

# Verify existing files
ls src/types/
ls src/utils/
ls src/models/

# Start implementing Phase 2
# File 1: src/models/InventoryItemV2.ts
```

## 📚 Reference Documents

- **Business Requirements**: `d:\Compass_Coding\MD Knowledge Base\Yêu cầu Inventory MCP.md`
- **Current Progress**: This file
- **Old Implementation**:
  - `src/models/NormTable.ts` (OLD - will deprecate)
  - `src/models/PurchaseOrder.ts` (OLD - will update)
  - `src/models/StockItem.ts` (OLD - will deprecate)
  - `src/utils/stock-calculator.ts` (OLD - will deprecate)
  - `src/utils/po-generator.ts` (OLD - will deprecate)
  - `src/tools/*.ts` (OLD - will replace with single tool)

## ⚠️ Important Notes

1. **DO NOT delete old files yet** - Keep them until new implementation is tested
2. **All new files use V2 suffix** where needed to avoid conflicts
3. **Build incrementally** - Test each phase before moving to next
4. **Keep business logic pure** - No storage logic in calculators
5. **Error messages in Vietnamese** - User-facing text should be Vietnamese
6. **Log messages in English** - Internal logs can be English for debugging

## 💡 Tips for Next Session

- Start fresh, read this file first
- Each calculator is independent - can build in parallel if needed
- Test with console.error() logs heavily
- Use TypeScript strict mode - fix all type errors
- Follow existing code style (ES modules, async/await, no callbacks)

---

**Last Updated**: 2025-01-26
**Status**: Phase 1 Complete ✅ | Phase 2 Ready to Start 🚀
**Estimated Time to Complete Phase 2**: 3-4 hours
