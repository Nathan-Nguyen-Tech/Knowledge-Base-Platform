# Hướng dẫn Cấu trúc OneDrive cho Inventory System

## 📁 Cấu trúc Thư mục

Tạo cấu trúc sau trong OneDrive tại `/CompanyResources/Inventory`:

```
/CompanyResources/Inventory/
├── MasterData/
│   └── Master_Data.xlsx          # ⭐ BẮT BUỘC - Dữ liệu master
├── CurrentInventory/
│   └── Inventory.xlsx            # ⭐ BẮT BUỘC - Tồn kho hiện tại
├── PurchaseOrders/                # Thư mục PO (tự động tạo)
│   ├── PO-2025-001.xlsx
│   └── PO-2025-002.xlsx
└── Archives/
    ├── 2024/
    └── 2025/
```

---

## 📊 File 1: Master_Data.xlsx

File này chứa **3 sheets** trong một workbook:

### Sheet 1: "VTTH" (Vật tư tiêu hao)

| Cột | Tên | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|-----|--------------|----------|-------|
| A | STT | Number | ✅ | Số thứ tự |
| B | Tên vật tư | Text | ✅ | Tên sản phẩm |
| C | Giá | Number | ✅ | Giá 1 ĐVT lớn |
| D | Đơn vị tính | Text | ✅ | ĐVT lớn (Hộp, Túi, Chai...) |
| E | Số lượng trong 1 ĐVT | Number | ✅ | Hệ số quy đổi (100 = 1 Hộp có 100 cái) |
| F | Quy cách | Text | | Mô tả quy cách |
| G | Đơn giá | Number | ✅ | Giá 1 đơn vị nhỏ |
| H | Gói đồng - Tiêu hao | Number | ✅ | Số lượng/khách (basic package) |
| I | Gói đồng - Thành tiền | Number | | Tự tính |
| J | Gói vàng - Tiêu hao | Number | ✅ | Số lượng/khách (gold package) |
| K | Gói vàng - Thành tiền | Number | | Tự tính |
| L | Gói bạc - Tiêu hao | Number | ✅ | Số lượng/khách (silver package) |
| M | Gói bạc - Thành tiền | Number | | Tự tính |
| N | Ghi chú | Text | | Ghi chú |

**Ví dụ dữ liệu:**

| STT | Tên vật tư | Giá | Đơn vị tính | Số lượng trong 1 ĐVT | Quy cách | Đơn giá | Gói đồng - Tiêu hao | Gói vàng - Tiêu hao | Gói bạc - Tiêu hao |
|-----|------------|-----|-------------|----------------------|----------|---------|---------------------|---------------------|---------------------|
| 1 | Kim tiêm 23G | 50000 | Hộp | 100 | 23G x 1" | 500 | 2 | 3 | 2 |
| 2 | Bông y tế | 80000 | Túi | 500 | 500g/túi | 160 | 5 | 10 | 7 |
| 3 | Ống nghiệm máu | 120000 | Hộp | 100 | EDTA 3ml | 1200 | 3 | 5 | 4 |

---

### Sheet 2: "Hoa Chat Chi Tiet" (Primary - Thông tin hóa chất chi tiết)

| Cột | Tên | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|-----|--------------|----------|-------|
| A | Mã Compass | Text | ✅ | Mã nội bộ |
| B | Mã NCC | Text | | Mã nhà cung cấp |
| C | Loại sản phẩm | Text | ✅ | "Hóa chất", "Dung dịch"... |
| D | Tên xét nghiệm | Text | ✅ | Tên test (dùng để match) |
| E | Danh mục | Text | ✅ | "Sinh hóa", "Miễn dịch"... |
| F | Loại hóa chất | Text | ✅ | "Chạy mẫu", "QC", "CALIB" |
| G | Loại xét nghiệm | Text | ✅ | Tên chuẩn hóa (Glucose, HDL...) |
| H | Quy cách | Text | ✅ | "2x50ml", "1x100ml"... |
| I | Tổng thành tiền | Number | ✅ | Giá 1 hộp |
| J | Số lọ (Lọ/hộp) | Number | ✅ | Số lọ trong 1 hộp |
| K | Số test (test/lọ) | Number | ✅ | Số test trong 1 lọ |
| L | Đơn giá | Number | ✅ | Giá/test |
| M | Gói vàng | Text | | "x" = có, trống = không |
| N | Gói đồng | Text | | "x" = có, trống = không |
| O | Gói bạc | Text | | "x" = có, trống = không |

**Ví dụ dữ liệu:**

| Mã Compass | Tên xét nghiệm | Loại xét nghiệm | Quy cách | Tổng thành tiền | Số lọ | Số test/lọ | Gói vàng | Gói đồng | Gói bạc |
|-----------|----------------|----------------|----------|----------------|-------|-----------|----------|----------|---------|
| CH001 | Glucose | Glucose | 2x50ml | 2500000 | 2 | 250 | x | x | x |
| CH002 | Cholesterol | Cholesterol | 2x50ml | 2800000 | 2 | 300 | x | | x |
| CH003 | HDL Cholesterol | HDL | 2x25ml | 3500000 | 2 | 200 | x | | |

---

### Sheet 3: "Hoa Chat" (Secondary - QC/CALIB Configuration)

| Cột | Tên | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|-----|--------------|----------|-------|
| A | STT | Number | ✅ | Số thứ tự |
| B | Danh mục | Text | ✅ | "Sinh hóa", "Miễn dịch"... |
| C | Loại xét nghiệm | Text | ✅ | Phải match với sheet 2 |
| D | Diễn giải | Text | | Mô tả |
| E | Số test cho 1 lần QC | Number | ✅ | Số test QC mỗi lần chạy |
| F | Số test cho 1 lần calib | Number | ✅ | Số test CALIB mỗi lần chạy |

**Ví dụ dữ liệu:**

| STT | Danh mục | Loại xét nghiệm | Diễn giải | Số test cho 1 lần QC | Số test cho 1 lần calib |
|-----|----------|----------------|-----------|----------------------|------------------------|
| 1 | Sinh hóa | Glucose | Đo đường huyết | 2 | 4 |
| 2 | Sinh hóa | Cholesterol | Đo cholesterol | 2 | 4 |
| 3 | Sinh hóa | HDL | Đo HDL cholesterol | 2 | 6 |

**⚠️ Lưu ý:**
- Cột "Loại xét nghiệm" trong sheet "Hoa Chat" phải **khớp chính xác** với cột "Loại xét nghiệm" trong sheet "Hoa Chat Chi Tiet"
- Hệ thống sẽ kết hợp 2 sheets này để tính toán

---

## 📦 File 2: Inventory.xlsx

File này chứa **1 sheet duy nhất** tên "Inventory":

| Cột | Tên | Kiểu dữ liệu | Bắt buộc | Mô tả |
|-----|-----|--------------|----------|-------|
| A | Tên sản phẩm | Text | ✅ | Tên sản phẩm (fuzzy match) |
| B | Số lượng | Number | ✅ | Số lượng tồn kho |
| C | Đơn vị tính | Text | ✅ | ĐVT nhỏ (cái, test, g...) |
| D | Ngày cập nhật | Date | | Ngày cập nhật gần nhất |
| E | Ghi chú | Text | | Ghi chú |

**Ví dụ dữ liệu:**

| Tên sản phẩm | Số lượng | Đơn vị tính | Ngày cập nhật | Ghi chú |
|-------------|----------|------------|---------------|---------|
| Kim tiêm 23G | 150 | cái | 2025-11-20 | Tồn kho đủ |
| Bông y tế | 200 | g | 2025-11-20 | Cần mua thêm |
| Glucose | 300 | test | 2025-11-22 | Đủ dùng |
| Cholesterol | 100 | test | 2025-11-22 | Cần mua thêm |

**⚠️ Fuzzy Matching:**
- System sẽ tự động match tên sản phẩm với độ chính xác ~80%
- Ví dụ: "Kim tiem 23G" sẽ match với "Kim tiêm 23G"
- Không cần viết chính xác 100%

---

## 📋 File 3: Purchase Orders (Tự động tạo)

System sẽ **tự động tạo** các file PO trong format:

**File name:** `PO-{DEPARTMENT}-{TIMESTAMP}.xlsx`
- Ví dụ: `PO-PhongLab-1732700000000.xlsx`

**Cấu trúc 1 sheet:**

| Cột | Tên | Nội dung |
|-----|-----|----------|
| A | STT | Số thứ tự |
| B | Tên sản phẩm | Tên đầy đủ |
| C | Số lượng cần mua | Số lượng (đã làm tròn lên) |
| D | Đơn vị tính | ĐVT lớn (Hộp, Túi...) |
| E | Lý do | "Không đủ", "Không có trong kho" |
| F | Loại | "VTTH", "Chemical", "Supplement" |

---

## 🚀 Quick Start - Setup OneDrive

### Bước 1: Tạo cấu trúc thư mục

1. Đăng nhập OneDrive với account `admin@compass247.vn`
2. Truy cập `/CompanyResources/Inventory`
3. Tạo file `Master_Data.xlsx` với 3 sheets như hướng dẫn
4. Tạo file `Inventory.xlsx` với 1 sheet

### Bước 2: Upload template files

Bạn có thể dùng test data có sẵn:

```bash
cd d:\Compass_Coding\Knowledge-Base-Platform\departments\inventory-mcp
npx tsx test/generate-test-data.ts
```

Files sẽ được tạo tại: `test/data/`
- `Master_Data.xlsx` - Template có sẵn dữ liệu mẫu
- `Inventory.xlsx` - Template inventory

Upload 2 files này lên:
- `Master_Data.xlsx` → `/CompanyResources/Inventory/MasterData/`
- `Inventory.xlsx` → `/CompanyResources/Inventory/CurrentInventory/`

### Bước 3: Test connection

```bash
bash start-test.sh
```

Nếu thành công, bạn sẽ thấy:
```
✓ Server running on stdio
✓ OneDrive folder: /CompanyResources/Inventory
✓ Sync interval: 5 minutes
Ready to manage inventory!
```

---

## 📝 Business Rules Quan trọng

### QT001: Round Up Rule
- **Tất cả** số lượng phải làm tròn **LÊN**
- Ví dụ: Cần 150.3 → Mua 151

### QT002: Chemical 2-Table Logic
- Hóa chất dùng **2 sheets** để tính:
  - Sheet "Hoa Chat Chi Tiet": Thông tin sản phẩm
  - Sheet "Hoa Chat": QC/CALIB config
- System tự động merge 2 tables

### QT003: PO Integer & Large Unit Only
- PO chỉ chứa **số nguyên**
- PO chỉ dùng **ĐVT lớn** (Hộp, Túi, Chai...)
- Không có đơn vị nhỏ (cái, test, g...)

---

## 🔍 Troubleshooting

### Lỗi: "Cannot find file"
- ✅ Kiểm tra file có đúng tên không
- ✅ Kiểm tra file có trong folder `/CompanyResources/Inventory/` không
- ✅ Kiểm tra quyền truy cập file

### Lỗi: "Cannot parse Excel"
- ✅ Kiểm tra sheet name đúng không ("VTTH", "Hoa Chat Chi Tiet", "Hoa Chat", "Inventory")
- ✅ Kiểm tra header row (row 1) có đúng tên cột không
- ✅ Kiểm tra định dạng file là `.xlsx` (không phải `.xls`)

### Lỗi: "Chemical not found"
- ✅ Kiểm tra "Loại xét nghiệm" trong 2 sheets "Hoa Chat Chi Tiet" và "Hoa Chat" có khớp không
- ✅ System phân biệt hoa thường

---

## 📞 Support

Nếu cần hỗ trợ:
1. Kiểm tra logs: Server sẽ in ra error messages chi tiết
2. Kiểm tra file format theo template trên
3. Test với file mẫu trước khi dùng data thật

---

**Last Updated:** 2025-11-27
**Version:** 1.0.0
