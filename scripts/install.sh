#!/bin/bash
# APEX One-Command Installation Script
# Usage: curl -sL https://raw.githubusercontent.com/ganjarsantoso/apex/main/scripts/install.sh | bash

set -e

echo "🚀 Installing APEX..."

# 1. Clone the repository
REPO_URL="https://github.com/ganjarsantoso/apex.git"
DEST_DIR="apex-framework"

if [ -d "$DEST_DIR" ]; then
    echo "⚠️ Directory $DEST_DIR already exists. Please remove it or choose a different location."
    exit 1
fi

git clone $REPO_URL $DEST_DIR
cd $DEST_DIR

# 2. Build the project
echo "📦 Building APEX..."
pnpm install
pnpm build

echo "✅ APEX installed successfully in $DEST_DIR!"
echo "To use it, add '$PWD/apps/cli' to your OpenCode plugin configuration."
