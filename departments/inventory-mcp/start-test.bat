@echo off
cd /d "%~dp0"

set AZURE_TENANT_ID=YOUR_TENANT_ID
set AZURE_CLIENT_ID=YOUR_CLIENT_ID
set AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET
set ONEDRIVE_USER_ID=YOUR_USER_ID
set ONEDRIVE_ROOT_FOLDER=/CompanyResources/Inventory
set ONEDRIVE_CACHE_DB=./cache/inventory.db
set SYNC_INTERVAL_MINUTES=5
set SERVER_NAME=inventory-knowledge
set SERVER_VERSION=1.0.0
set LOG_LEVEL=info

node build\index.js
