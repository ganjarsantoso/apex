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

# Optional companion skills
Write-Host ""
Write-Host "=== Companion Skills ===" -ForegroundColor Cyan
Write-Host "APEX works well with optional companion skills that enhance each phase:"
Write-Host "  DISCOVERY: ask-questions-if-underspecified (Trail of Bits)"
Write-Host "  PLANNING:  security-threat-model (OpenAI)"
Write-Host "  EXECUTING: property-based-testing (Trail of Bits)"
Write-Host "  REVIEW:    differential-review (Trail of Bits)"
Write-Host "  (plan-eng-review from Garry Tan is bundled in gstack - install via 'pnpm setup-gstack')"
Write-Host ""
$installSkills = Read-Host "Install companion skills? (y/N)"
if ($installSkills -eq 'y' -or $installSkills -eq 'Y') {
    Write-Host "Installing companion skills..." -ForegroundColor Yellow
    npx skills add trailofbits/skills@ask-questions-if-underspecified -g -y
    npx skills add openai/skills@security-threat-model -g -y
    npx skills add trailofbits/skills@property-based-testing -g -y
    npx skills add trailofbits/skills@differential-review -g -y
    Write-Host "  Note: plan-eng-review is bundled in gstack (garrytan/gstack) - install separately if needed" -ForegroundColor Yellow
    Write-Host "Companion skills installed." -ForegroundColor Green
}

Write-Host "=== Bootstrap Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add APEX to your opencode.json:"
Write-Host '   { "plugin": ["apex@git+https://github.com/your-org/apex.git"] }'
Write-Host "2. Restart OpenCode"
Write-Host "3. Try: /brainstorm ''your feature idea''"