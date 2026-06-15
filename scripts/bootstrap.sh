#!/bin/bash
# APEX Bootstrap Script (macOS/Linux)
set -e

echo "=== APEX Bootstrap ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js required. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Installing pnpm..."; npm install -g pnpm; }

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build all packages
echo "Building packages..."
pnpm build

# Compile prompts
echo "Compiling system prompt..."
pnpm compile-prompts

echo "=== Bootstrap Complete ==="
echo ""
echo "Next steps:"
echo "1. Add APEX to your opencode.json:"
echo '   { "plugin": ["apex@git+https://github.com/your-org/apex.git"] }'
echo "2. Restart OpenCode"
echo "3. Try: /brainstorm \"your feature idea\""