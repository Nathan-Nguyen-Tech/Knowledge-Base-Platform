/**
 * Generate Test Data
 * Creates sample Excel files for testing
 */

import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.join(__dirname, 'data');

/**
 * Generate Combined Master Data (VTTH + Chemicals)
 * All in one workbook with multiple sheets
 */
async function generateMasterData() {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: VTTH
  const vtthSheet = workbook.addWorksheet('VTTH');
  vtthSheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Tên vật tư', key: 'name', width: 40 },
    { header: 'Giá', key: 'price', width: 12 },
    { header: 'Đơn vị tính', key: 'largeUnit', width: 12 },
    { header: 'Số lượng trong 1 ĐVT', key: 'conversionRatio', width: 20 },
    { header: 'Quy cách', key: 'specification', width: 20 },
    { header: 'Đơn giá', key: 'unitPrice', width: 15 },
    { header: 'Gói đồng - Tiêu hao', key: 'basicConsumption', width: 20 },
    { header: 'Gói đồng - Thành tiền', key: 'basicCost', width: 20 },
    { header: 'Gói vàng - Tiêu hao', key: 'goldConsumption', width: 20 },
    { header: 'Gói vàng - Thành tiền', key: 'goldCost', width: 20 },
    { header: 'Gói bạc - Tiêu hao', key: 'silverConsumption', width: 20 },
    { header: 'Gói bạc - Thành tiền', key: 'silverCost', width: 20 },
    { header: 'Ghi chú', key: 'notes', width: 30 }
  ];

  const vtthData = [
    {
      stt: 1,
      name: 'Kim tiêm 23G',
      price: 50000,
      largeUnit: 'Hộp',
      conversionRatio: 100,
      specification: '23G x 1"',
      unitPrice: 500,
      basicConsumption: 2,
      basicCost: 1000,
      goldConsumption: 3,
      goldCost: 1500,
      silverConsumption: 2,
      silverCost: 1000,
      notes: 'Kim tiêm dùng 1 lần'
    },
    {
      stt: 2,
      name: 'Bông y tế',
      price: 80000,
      largeUnit: 'Túi',
      conversionRatio: 500,
      specification: '500g/túi',
      unitPrice: 160,
      basicConsumption: 5,
      basicCost: 800,
      goldConsumption: 10,
      goldCost: 1600,
      silverConsumption: 7,
      silverCost: 1120,
      notes: 'Bông y tế vô trùng'
    },
    {
      stt: 3,
      name: 'Ống nghiệm máu',
      price: 120000,
      largeUnit: 'Hộp',
      conversionRatio: 100,
      specification: 'EDTA 3ml',
      unitPrice: 1200,
      basicConsumption: 3,
      basicCost: 3600,
      goldConsumption: 5,
      goldCost: 6000,
      silverConsumption: 4,
      silverCost: 4800,
      notes: 'Ống EDTA chống đông'
    },
    {
      stt: 4,
      name: 'Cồn y tế 90%',
      price: 150000,
      largeUnit: 'Chai',
      conversionRatio: 1,
      specification: '1L/chai',
      unitPrice: 150000,
      basicConsumption: 0,
      basicCost: 0,
      goldConsumption: 1,
      goldCost: 150000,
      silverConsumption: 0,
      silverCost: 0,
      notes: 'Chỉ có trong gói vàng'
    }
  ];

  vtthData.forEach(row => vtthSheet.addRow(row));

  // Sheet 2: Hoa Chat Chi Tiet (PRIMARY)
  const primarySheet = workbook.addWorksheet('Hoa Chat Chi Tiet');
  primarySheet.columns = [
    { header: 'Mã Compass', key: 'compassCode', width: 15 },
    { header: 'Mã NCC', key: 'supplierCode', width: 15 },
    { header: 'Loại sản phẩm', key: 'productType', width: 20 },
    { header: 'Tên xét nghiệm', key: 'testName', width: 30 },
    { header: 'Danh mục', key: 'category', width: 20 },
    { header: 'Loại hóa chất', key: 'chemicalType', width: 15 },
    { header: 'Loại xét nghiệm', key: 'testType', width: 20 },
    { header: 'Quy cách', key: 'specification', width: 20 },
    { header: 'Tổng thành tiền', key: 'totalCost', width: 15 },
    { header: 'Số lọ (Lọ/hộp)', key: 'vialsPerBox', width: 15 },
    { header: 'Số test (test/lọ)', key: 'testsPerVial', width: 15 },
    { header: 'Đơn giá', key: 'unitPrice', width: 15 },
    { header: 'Gói vàng', key: 'hasGold', width: 12 },
    { header: 'Gói đồng', key: 'hasBasic', width: 12 },
    { header: 'Gói bạc', key: 'hasSilver', width: 12 }
  ];

  const chemicalPrimaryData = [
    {
      compassCode: 'CH001',
      supplierCode: 'SUP001',
      productType: 'Hóa chất',
      testName: 'Glucose',
      category: 'Sinh hóa',
      chemicalType: 'Chạy mẫu',
      testType: 'Glucose',
      specification: '2x50ml',
      totalCost: 2500000,
      vialsPerBox: 2,
      testsPerVial: 250,
      unitPrice: 1250000,
      hasGold: 'x',
      hasBasic: 'x',
      hasSilver: 'x'
    },
    {
      compassCode: 'CH002',
      supplierCode: 'SUP001',
      productType: 'Hóa chất',
      testName: 'Cholesterol',
      category: 'Sinh hóa',
      chemicalType: 'Chạy mẫu',
      testType: 'Cholesterol',
      specification: '2x50ml',
      totalCost: 2800000,
      vialsPerBox: 2,
      testsPerVial: 300,
      unitPrice: 1400000,
      hasGold: 'x',
      hasBasic: '',
      hasSilver: 'x'
    },
    {
      compassCode: 'CH003',
      supplierCode: 'SUP002',
      productType: 'Hóa chất',
      testName: 'HDL Cholesterol',
      category: 'Sinh hóa',
      chemicalType: 'Chạy mẫu',
      testType: 'HDL',
      specification: '2x25ml',
      totalCost: 3500000,
      vialsPerBox: 2,
      testsPerVial: 200,
      unitPrice: 1750000,
      hasGold: 'x',
      hasBasic: '',
      hasSilver: ''
    },
    {
      compassCode: 'CH004',
      supplierCode: 'SUP002',
      productType: 'Dung dịch',
      testName: 'Wash Solution 20L',
      category: 'Phụ trợ',
      chemicalType: 'Chạy mẫu',
      testType: 'Wash',
      specification: '20L',
      totalCost: 1500000,
      vialsPerBox: 1,
      testsPerVial: 5000,
      unitPrice: 1500000,
      hasGold: 'x',
      hasBasic: 'x',
      hasSilver: 'x'
    }
  ];

  chemicalPrimaryData.forEach(row => primarySheet.addRow(row));

  // Sheet 3: Hoa Chat (SECONDARY - QC/CALIB)
  const secondarySheet = workbook.addWorksheet('Hoa Chat');
  secondarySheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Danh mục', key: 'category', width: 20 },
    { header: 'Loại xét nghiệm', key: 'testType', width: 25 },
    { header: 'Diễn giải', key: 'description', width: 30 },
    { header: 'Số test cho 1 lần QC', key: 'qcTestsPerRun', width: 20 },
    { header: 'Số test cho 1 lần calib', key: 'calibTestsPerRun', width: 20 }
  ];

  const qcCalibData = [
    {
      stt: 1,
      category: 'Sinh hóa',
      testType: 'Glucose',
      description: 'Đo đường huyết',
      qcTestsPerRun: 2,
      calibTestsPerRun: 4
    },
    {
      stt: 2,
      category: 'Sinh hóa',
      testType: 'Cholesterol',
      description: 'Đo cholesterol toàn phần',
      qcTestsPerRun: 2,
      calibTestsPerRun: 4
    },
    {
      stt: 3,
      category: 'Sinh hóa',
      testType: 'HDL',
      description: 'Đo HDL cholesterol',
      qcTestsPerRun: 2,
      calibTestsPerRun: 6
    }
  ];

  qcCalibData.forEach(row => secondarySheet.addRow(row));

  // Save all sheets to one file
  const filePath = path.join(TEST_DATA_DIR, 'Master_Data.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Created Master Data with 3 sheets: ${filePath}`);
  console.log(`   - VTTH (${vtthData.length} items)`);
  console.log(`   - Hoa Chat Chi Tiet (${chemicalPrimaryData.length} items)`);
  console.log(`   - Hoa Chat (${qcCalibData.length} items)`);
}

/**
 * Generate Inventory Test Data
 */
async function generateInventoryData() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventory');

  sheet.columns = [
    { header: 'Tên sản phẩm', key: 'productName', width: 40 },
    { header: 'Số lượng', key: 'quantity', width: 12 },
    { header: 'Đơn vị tính', key: 'unit', width: 12 },
    { header: 'Ngày cập nhật', key: 'lastUpdated', width: 15 },
    { header: 'Ghi chú', key: 'notes', width: 30 }
  ];

  const inventoryData = [
    {
      productName: 'Kim tiêm 23G',
      quantity: 150,
      unit: 'cái',
      lastUpdated: '2025-11-20',
      notes: 'Tồn kho đủ'
    },
    {
      productName: 'Bông y tế',
      quantity: 200,
      unit: 'g',
      lastUpdated: '2025-11-20',
      notes: 'Cần mua thêm'
    },
    {
      productName: 'Ống nghiệm máu',
      quantity: 50,
      unit: 'cái',
      lastUpdated: '2025-11-21',
      notes: 'Sắp hết'
    },
    {
      productName: 'Glucose',
      quantity: 300,
      unit: 'test',
      lastUpdated: '2025-11-22',
      notes: 'Đủ dùng'
    },
    {
      productName: 'Cholesterol',
      quantity: 100,
      unit: 'test',
      lastUpdated: '2025-11-22',
      notes: 'Cần mua thêm'
    },
    {
      productName: 'HDL Cholesterol',
      quantity: 50,
      unit: 'test',
      lastUpdated: '2025-11-23',
      notes: 'Sắp hết'
    }
  ];

  inventoryData.forEach(row => sheet.addRow(row));

  const filePath = path.join(TEST_DATA_DIR, 'Inventory.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Created Inventory data: ${filePath}`);
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Generating test data...\n');

  // Ensure data directory exists
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  try {
    await generateMasterData();
    await generateInventoryData();

    console.log('\n✅ All test data generated successfully!');
    console.log(`📁 Location: ${TEST_DATA_DIR}`);
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

main();
