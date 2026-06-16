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

# Optional companion skills
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

echo "=== Bootstrap Complete ==="
echo ""
echo "Next steps:"
echo "1. Add APEX to your opencode.json:"
echo '   { "plugin": ["apex@git+https://github.com/your-org/apex.git"] }'
echo "2. Restart OpenCode"
echo "3. Try: /brainstorm \"your feature idea\""