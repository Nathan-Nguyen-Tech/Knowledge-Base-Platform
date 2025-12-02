#!/bin/bash
cd "$(dirname "$0")"

export MSYS_NO_PATHCONV=1
export AZURE_TENANT_ID=YOUR_TENANT_ID
export AZURE_CLIENT_ID=YOUR_CLIENT_ID
export AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET
export ONEDRIVE_USER_ID=YOUR_USER_ID
export ONEDRIVE_ROOT_FOLDER=/CompanyResources/Inventory
export ONEDRIVE_CACHE_DB=./cache/inventory.db
export SYNC_INTERVAL_MINUTES=5
export SERVER_NAME=inventory-knowledge
export SERVER_VERSION=1.0.0
export LOG_LEVEL=info

node build/index.js
