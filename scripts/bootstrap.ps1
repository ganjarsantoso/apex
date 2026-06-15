# APEX Bootstrap Script (Windows PowerShell)
Write-Host "=== APEX Bootstrap ===" -ForegroundColor Cyan

# Check prerequisites
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "Node.js required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js $nodeVersion detected" -ForegroundColor Green

$pnpmVersion = pnpm --version 2>$null
if (-not $pnpmVersion) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}
Write-Host "pnpm $pnpmVersion detected" -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Build all packages
Write-Host "Building packages..." -ForegroundColor Yellow
pnpm build

# Compile prompts
Write-Host "Compiling system prompt..." -ForegroundColor Yellow
pnpm compile-prompts

Write-Host "=== Bootstrap Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add APEX to your opencode.json:"
Write-Host '   { "plugin": ["apex@git+https://github.com/your-org/apex.git"] }'
Write-Host "2. Restart OpenCode"
Write-Host "3. Try: /brainstorm 'your feature idea'"