# Azure AD Setup Guide

Hướng dẫn cấu hình Azure AD Service Principal để truy cập OneDrive Business cho các department MCP servers.

## Prerequisites

- Azure AD tenant (tenant của Compass: compass247.onmicrosoft.com)
- Quyền Global Administrator hoặc Application Administrator
- OneDrive Business account: admin@compass247.vn

## Step 1: Đăng ký Azure AD App Registration

### 1.1 Truy cập Azure Portal
1. Đăng nhập vào [Azure Portal](https://portal.azure.com)
2. Tìm kiếm **Azure Active Directory** hoặc **Microsoft Entra ID**
3. Vào **App registrations** > **New registration**

### 1.2 Tạo App Registration
**Name:** Knowledge Base Platform - Inventory MCP
**Supported account types:** Accounts in this organizational directory only
**Redirect URI:** Để trống (không cần cho Service Principal)

Click **Register**

### 1.3 Lưu thông tin quan trọng
Sau khi tạo xong, lưu lại các thông tin sau (cần cho cấu hình):
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Step 2: Tạo Client Secret

### 2.1 Tạo Secret
1. Trong App registration vừa tạo, vào **Certificates & secrets**
2. Click **New client secret**
3. **Description:** `Inventory MCP Server Secret`
4. **Expires:** Chọn thời hạn (khuyến nghị: 24 months)
5. Click **Add**

### 2.2 Lưu Secret Value
⚠️ **QUAN TRỌNG:** Copy ngay **Value** của secret (chỉ hiện 1 lần duy nhất!)
- **Client Secret Value:** `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Cấu hình API Permissions

### 3.1 Thêm Microsoft Graph Permissions
1. Vào **API permissions** > **Add a permission**
2. Chọn **Microsoft Graph** > **Application permissions**
3. Tìm và thêm các permissions sau:

**OneDrive Permissions:**
- `Files.Read.All` - Đọc files từ tất cả OneDrive
- `Files.ReadWrite.All` - Đọc và ghi files (cần cho create purchase orders)
- `Sites.Read.All` - Đọc thông tin SharePoint sites (bổ sung)

### 3.2 Grant Admin Consent
⚠️ **BẮT BUỘC:** Sau khi thêm permissions:
1. Click **Grant admin consent for [Tenant Name]**
2. Xác nhận **Yes**
3. Kiểm tra status chuyển sang **Granted for [Tenant Name]** (màu xanh)

## Step 4: Cấu hình OneDrive Access

### 4.1 Tạo Folder Structure
Trên OneDrive account `admin@compass247.vn`, tạo cấu trúc thư mục:

```
/Inventory
  ├── Norm_Table/
  │   └── (các file norm table Excel)
  ├── Purchase_Order/
  │   └── (các file purchase order được tạo ra)
  └── Stock/
      └── current_stock.xlsx
```

### 4.2 Kiểm tra Path
1. Truy cập OneDrive Web: https://compass247-my.sharepoint.com/
2. Vào thư mục Inventory
3. URL sẽ có dạng: `.../Documents/Inventory`
4. Root path cần dùng: `/Inventory`

## Step 5: Cấu hình Environment Variables

### 5.1 Tạo .env file
Tạo file `.env` trong thư mục `departments/inventory-mcp/`:

```bash
# Azure AD Service Principal
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OneDrive Configuration
ONEDRIVE_ROOT_FOLDER=/Inventory
ONEDRIVE_CACHE_DB=./cache/inventory.db

# Sync Configuration
SYNC_INTERVAL_MINUTES=5
```

### 5.2 Bảo mật .env
⚠️ **QUAN TRỌNG:**
- File `.env` đã được thêm vào `.gitignore`
- KHÔNG bao giờ commit `.env` vào Git
- Backup `.env` ở nơi an toàn (ví dụ: password manager)

## Step 6: Testing

### 6.1 Build và Run
```bash
cd Knowledge-Base-Platform
npm run build
cd departments/inventory-mcp
npm start
```

### 6.2 Kiểm tra Output
Server khởi động thành công sẽ hiển thị:
```
============================================================
Inventory MCP Server v1.0.0
============================================================

[Inventory] Initializing...
[OneDriveStorageAdapter] Authenticating...
[OneDriveStorageAdapter] ✓ Authenticated
[Cache] Initialized SQLite cache at ./cache/inventory.db
[PollingSync] Initialized with 5 minute interval
[OneDriveStorageAdapter] Syncing with OneDrive...
[OneDriveStorageAdapter] ✓ Synced X files

[Inventory] ✓ Initialization complete

✓ Server running on stdio
✓ OneDrive folder: /Inventory
✓ Sync interval: 5 minutes

Ready to manage inventory!
============================================================
```

### 6.3 Test với Claude Desktop
1. Cấu hình trong Claude Desktop settings
2. Restart Claude Desktop
3. Thử câu lệnh: "List files trong Inventory folder"

## Common Issues & Troubleshooting

### Issue: "Authentication failed"
**Nguyên nhân:**
- Client ID/Secret sai
- Tenant ID sai
- Secret đã hết hạn

**Giải pháp:**
1. Kiểm tra lại `.env` file
2. Kiểm tra secret trong Azure Portal chưa hết hạn
3. Tạo secret mới nếu cần

### Issue: "Insufficient privileges"
**Nguyên nhân:**
- Chưa grant admin consent
- Permissions chưa đủ

**Giải pháp:**
1. Vào Azure Portal > App registrations
2. Kiểm tra API permissions có status "Granted" (màu xanh)
3. Click "Grant admin consent" nếu chưa

### Issue: "Folder not found"
**Nguyên nhân:**
- Path sai
- Folder chưa tồn tại
- Service Principal chưa có quyền truy cập

**Giải pháp:**
1. Kiểm tra `ONEDRIVE_ROOT_FOLDER` trong `.env`
2. Đảm bảo folder tồn tại trên OneDrive
3. Thử với path đơn giản trước: `/Documents`

## Security Best Practices

### 1. Secret Rotation
- Rotate client secrets định kỳ (khuyến nghị: 6-12 tháng)
- Tạo secret mới trước khi secret cũ hết hạn
- Update `.env` file với secret mới

### 2. Least Privilege
- Chỉ cấp permissions tối thiểu cần thiết
- Xem xét lại permissions định kỳ
- Revoke permissions không dùng

### 3. Monitoring
- Theo dõi sign-in logs trong Azure AD
- Kiểm tra unusual activity
- Alert khi có lỗi authentication nhiều lần

## Next Steps

Sau khi setup xong Inventory MCP:
1. Tạo App Registration riêng cho các department khác (Purchasing, Account, BD, HR)
2. Mỗi department nên có client secret riêng
3. Cấu hình folder structure riêng cho mỗi department
4. Follow cùng quy trình setup này

## References

- [Microsoft Graph API - Files](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Service Principal Authentication](https://learn.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals)
