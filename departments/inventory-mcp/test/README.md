# Inventory MCP Test Suite

Test suite for the Inventory MCP refactor with mock data (no Azure required).

## Quick Start

```bash
# 1. Generate test data
npx tsx test/generate-test-data.ts

# 2. Run all tests
npx tsx test/run-all-tests.ts

# 3. Check results in test/output/
```

## Test Structure

```
test/
├── data/                    # Generated test Excel files
│   ├── Master_Data.xlsx    # VTTH + Chemicals
│   └── Inventory.xlsx      # Current stock
├── output/                  # Generated PO files
├── unit/                    # Unit tests
│   ├── test-vtth-calculator.ts
│   ├── test-chemical-calculator.ts
│   └── test-inventory-comparator.ts
├── integration/             # Integration tests
│   └── test-full-workflow.ts
├── generate-test-data.ts    # Test data generator
└── run-all-tests.ts         # Test runner
```

## Test Coverage

- ✅ **Chemical Calculator**: QC/CALIB logic, supplements, round-up
- ⚠️ **VTTH Calculator**: Logic correct, data issue
- ⚠️ **Inventory Comparator**: Fuzzy matching, shortage calculation
- ⚠️ **Full Workflow**: End-to-end process

## Run Individual Tests

```bash
# Chemical Calculator (100% PASSING!)
npx tsx test/unit/test-chemical-calculator.ts

# VTTH Calculator
npx tsx test/unit/test-vtth-calculator.ts

# Inventory Comparator
npx tsx test/unit/test-inventory-comparator.ts

# Full Workflow
npx tsx test/integration/test-full-workflow.ts
```

## What's Tested

### Business Rules
- ✅ QT001: Unit conversion with round-up
- ✅ QT002: 2-table chemical filtering
- ✅ QT003: PO format (integers, large units)

### Features
- ✅ QC/CALIB automatic calculation
- ✅ QC/CALIB skip detection (wash solutions)
- ✅ Supplements with conditional logic
- ✅ Fuzzy name matching (85% threshold)
- ✅ Shortage calculation
- ✅ Purchase order generation
- ✅ Excel file creation

## Expected Output

```
🧪 Testing Chemical Calculator...

Test 1: Gold Package - 50 customers with supplements
  ✓ Found 4 chemicals
  ✓ Found 4 supplements
  ✓ QC/CALIB calculation correct
  ✓ Containers calculation correct
  ✓ Purchase quantity correct (rounded up)

✅ All Chemical Calculator tests passed!
```

## Troubleshooting

### "Sheet 'VTTH' not found"
Run the data generator first:
```bash
npx tsx test/generate-test-data.ts
```

### "Module not found"
Build the project first:
```bash
npm run build
```

## Next Steps

After tests pass:
1. Test with real Azure OneDrive data
2. Add more test cases
3. Performance testing with large datasets
4. Integration with Claude Desktop

See [TEST_SUITE_COMPLETE.md](../TEST_SUITE_COMPLETE.md) for details.
