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

# 3. Optional companion skills
echo ""
echo "=== Companion Skills ==="
echo "APEX works well with optional companion skills that enhance each phase:"
echo "  DISCOVERY: ask-questions-if-underspecified (Trail of Bits)"
echo "  PLANNING:  security-threat-model (OpenAI)"
echo "  EXECUTING: property-based-testing (Trail of Bits)"
echo "  REVIEW:    differential-review (Trail of Bits)"
echo "  (plan-eng-review from Garry Tan is bundled in gstack - install via 'pnpm setup-gstack')"
echo ""
read -p "Install companion skills? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing companion skills..."
    npx skills add trailofbits/skills@ask-questions-if-underspecified -g -y
    npx skills add openai/skills@security-threat-model -g -y
    npx skills add trailofbits/skills@property-based-testing -g -y
    npx skills add trailofbits/skills@differential-review -g -y
    echo "  Note: plan-eng-review is bundled in gstack (garrytan/gstack) - install separately if needed"
    echo "Companion skills installed."
fi

echo "✅ APEX installed successfully in $DEST_DIR!"
echo "To use it, add '$PWD/apps/cli' to your OpenCode plugin configuration."
