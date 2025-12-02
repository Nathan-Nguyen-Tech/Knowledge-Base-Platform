# OneDrive Structure Migration Guide

## Overview

The inventory-mcp system has migrated from a flat folder structure to organized subfolders for better organization and scalability.

## Changes Summary

| Component | Old Path | New Path |
|-----------|----------|----------|
| Master Data | `Master_Data.xlsx` or `Data/Master_Data.xlsx` | `MasterData/Master_Data.xlsx` |
| Inventory | `Inventory.xlsx` or `Data/Inventory.xlsx` | `CurrentInventory/Inventory.xlsx` |
| Purchase Orders | `PO/` or `Purchase_Order/` | `PurchaseOrders/` |
| Archives | N/A | `Archives/` |

---

## For New Deployments

Simply follow the setup guide in `ONEDRIVE_STRUCTURE_GUIDE.md`. The new structure is the default and no configuration changes are needed.

**Quick Setup:**
1. Run `node setup-onedrive.mjs` to create folder structure
2. System will automatically use new paths (MasterData/, CurrentInventory/, PurchaseOrders/)
3. Start using the system

---

## For Existing Deployments

You have **two options** depending on your situation:

### Option 1: Migrate to New Structure (Recommended)

This is the recommended approach for long-term maintainability.

#### Step 1: Backup Current Data
```bash
# Create a backup of your current OneDrive folder
# Recommended: Use OneDrive web interface to download entire folder
```

- Backup all files from your current structure
- Export current .env configuration file
- Note any custom scripts or integrations

#### Step 2: Create New Folder Structure

Run the automated setup script:
```bash
cd d:\Compass_Coding\Knowledge-Base-Platform\departments\inventory-mcp
node setup-onedrive.mjs
```

This creates:
- `/CompanyResources/Inventory/MasterData/`
- `/CompanyResources/Inventory/CurrentInventory/`
- `/CompanyResources/Inventory/PurchaseOrders/`
- `/CompanyResources/Inventory/Archives/`

#### Step 3: Move Existing Files

**Master Data:**
- Old location: `/CompanyResources/Inventory/Master_Data.xlsx`
- New location: `/CompanyResources/Inventory/MasterData/Master_Data.xlsx`
- Action: Move or copy the file to the new location

**Inventory:**
- Old location: `/CompanyResources/Inventory/Inventory.xlsx`
- New location: `/CompanyResources/Inventory/CurrentInventory/Inventory.xlsx`
- Action: Move or copy the file to the new location

**Purchase Orders:**
If you have existing PO files in multiple folders:
- From `PO/` → Move to `PurchaseOrders/`
- From `Purchase_Order/` → Move to `PurchaseOrders/`
- All future POs will be created in `PurchaseOrders/`

#### Step 4: Update Environment (Optional)

No changes needed! The system defaults to the new structure.

If you want to verify, check your `.env` file - these variables can be left unset (defaults apply):
```env
# These are the defaults - no need to set explicitly
# ONEDRIVE_MASTER_DATA_FOLDER=MasterData
# ONEDRIVE_MASTER_DATA_FILE=Master_Data.xlsx
# ONEDRIVE_INVENTORY_FOLDER=CurrentInventory
# ONEDRIVE_INVENTORY_FILE=Inventory.xlsx
# ONEDRIVE_PO_FOLDER=PurchaseOrders
```

#### Step 5: Test the Migration

```bash
# Rebuild the project
npm run build

# Start the server
npm start

# Test list_files tool to verify structure
# Use the list_po workflow to verify PO folder
```

**Verification Checklist:**
- [ ] MasterData folder contains Master_Data.xlsx
- [ ] CurrentInventory folder contains Inventory.xlsx
- [ ] PurchaseOrders folder contains existing PO files (if any)
- [ ] Tools can read master data file
- [ ] Tools can read inventory file
- [ ] New PO files save to PurchaseOrders/

---

### Option 2: Keep Old Structure (Compatibility Mode)

If you cannot migrate immediately or prefer the old structure, configure environment variables to use old paths.

#### Update .env File

Add these variables to your `.env` file:

```env
# Use old flat folder structure
ONEDRIVE_MASTER_DATA_FOLDER=Data
ONEDRIVE_MASTER_DATA_FILE=Master_Data.xlsx
ONEDRIVE_INVENTORY_FOLDER=Data
ONEDRIVE_INVENTORY_FILE=Inventory.xlsx
ONEDRIVE_PO_FOLDER=PO
```

Or if your files were at root:
```env
# Files at root level (no subfolders)
ONEDRIVE_MASTER_DATA_FOLDER=
ONEDRIVE_MASTER_DATA_FILE=Master_Data.xlsx
ONEDRIVE_INVENTORY_FOLDER=
ONEDRIVE_INVENTORY_FILE=Inventory.xlsx
ONEDRIVE_PO_FOLDER=PO
```

#### Rebuild and Restart

```bash
npm run build
npm start
```

**Result:** System continues working with old folder structure. No file migration needed.

---

## PO Folder Consolidation

### Problem
Previous versions used inconsistent folder names for purchase orders:
- `PO/` (used by process-warehouse-request tool)
- `Purchase_Order/` (used by create-purchase-order tool)

### Solution
The new version unifies to a single configurable folder: **`PurchaseOrders/`** (default)

### Migration Steps

1. **Identify all PO files:**
   - Check `PO/` folder
   - Check `Purchase_Order/` folder
   - Check any other custom locations

2. **Consolidate to PurchaseOrders/:**
   - Create `/CompanyResources/Inventory/PurchaseOrders/` folder
   - Move all PO files from both old folders to new folder
   - Optionally archive old empty folders

3. **Verify:**
   - Use `list_po` workflow
   - Should see all PO files in one location

---

## Rollback Plan

If you encounter issues after migration:

### Quick Rollback (Option 2 Users)

1. Edit `.env` file to use old paths (see Option 2 above)
2. Restart the server: `npm start`
3. System immediately reverts to old structure
4. No code changes needed

### Full Rollback (Option 1 Users)

1. Restore files from backup to original locations
2. Add old path environment variables to `.env`:
   ```env
   ONEDRIVE_MASTER_DATA_FOLDER=Data
   ONEDRIVE_INVENTORY_FOLDER=Data
   ONEDRIVE_PO_FOLDER=PO
   ```
3. Rebuild and restart: `npm run build && npm start`
4. System uses old structure

---

## Troubleshooting

### Issue: "File not found" errors

**Cause:** Files are in old location but system expects new location

**Solution:**
- **Option A:** Move files to new locations (see Option 1)
- **Option B:** Configure .env to use old paths (see Option 2)

### Issue: PO files saving to wrong folder

**Cause:** ONEDRIVE_PO_FOLDER not set correctly

**Solution:**
```env
# Add to .env
ONEDRIVE_PO_FOLDER=PurchaseOrders
```

### Issue: Cannot find purchase orders with list_po

**Cause:** PO files in old folder (`PO/` or `Purchase_Order/`)

**Solution:**
- Move PO files to configured folder (default: `PurchaseOrders/`)
- Or set `ONEDRIVE_PO_FOLDER=PO` in .env to use old folder

### Issue: Tool examples show old paths

**Cause:** Documentation examples updated but you're referencing old docs

**Solution:**
- Update to latest README.md
- Use new paths: `MasterData/Master_Data.xlsx` and `CurrentInventory/Inventory.xlsx`
- Or override paths in tool parameters

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ONEDRIVE_MASTER_DATA_FOLDER` | `MasterData` | Folder containing master data files |
| `ONEDRIVE_MASTER_DATA_FILE` | `Master_Data.xlsx` | Master data file name |
| `ONEDRIVE_INVENTORY_FOLDER` | `CurrentInventory` | Folder containing inventory files |
| `ONEDRIVE_INVENTORY_FILE` | `Inventory.xlsx` | Inventory file name |
| `ONEDRIVE_PO_FOLDER` | `PurchaseOrders` | Folder for purchase orders |
| `ONEDRIVE_ARCHIVE_FOLDER` | `Archives` | Folder for archived data |

### Path Examples

**New Structure (Default):**
- Master Data: `MasterData/Master_Data.xlsx`
- Inventory: `CurrentInventory/Inventory.xlsx`
- PO Output: `PurchaseOrders/PO-20251127.xlsx`

**Old Structure (Compatibility):**
- Master Data: `Data/Master_Data.xlsx`
- Inventory: `Data/Inventory.xlsx`
- PO Output: `PO/PO-20251127.xlsx`

**Custom Structure:**
```env
ONEDRIVE_MASTER_DATA_FOLDER=Company/MasterData
ONEDRIVE_INVENTORY_FOLDER=Company/Inventory
ONEDRIVE_PO_FOLDER=Company/Orders
```

---

## Support

### Getting Help

1. **Check logs:** Server logs show detailed path information
2. **Verify configuration:** Review your `.env` file settings
3. **Test structure:** Use `list_files` tool to inspect OneDrive structure
4. **Review documentation:** See `ONEDRIVE_STRUCTURE_GUIDE.md` for setup details

### Common Questions

**Q: Do I have to migrate?**
A: No. You can use Option 2 to keep your old structure indefinitely.

**Q: Can I use a custom folder structure?**
A: Yes! Set environment variables to any paths you prefer.

**Q: Will my existing tools/scripts break?**
A: Not if you configure environment variables correctly. The system is fully backward compatible.

**Q: What if I have files in multiple locations?**
A: Consolidate them to one location, then configure that location in .env.

**Q: Can I mix old and new paths?**
A: Yes, though not recommended. For example:
```env
ONEDRIVE_MASTER_DATA_FOLDER=MasterData  # New
ONEDRIVE_INVENTORY_FOLDER=Data          # Old
ONEDRIVE_PO_FOLDER=PurchaseOrders       # New
```

---

## Best Practices

1. **Backup First:** Always backup before migrating
2. **Test in Staging:** If possible, test migration in non-production environment
3. **Document Custom Paths:** If using custom structure, document your .env settings
4. **Consolidate POs:** Move all PO files to single folder for consistency
5. **Archive Old Folders:** After successful migration, archive (don't delete) old folders
6. **Update Integrations:** Update any external scripts/tools that reference old paths

---

**Last Updated:** 2025-11-27
**Version:** 1.0.0
**Related Docs:** `ONEDRIVE_STRUCTURE_GUIDE.md`, `README.md`, `.env.example`
