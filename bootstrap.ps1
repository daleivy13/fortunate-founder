# PoolPal AI — Bootstrap Script
# Run from any directory: .\bootstrap.ps1
# Requires: git, node >= 18, npm

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$REPO_URL = "https://github.com/daleivy13/fortunate-founder.git"
$DIR      = "fortunate-founder"

Write-Host "`n==> Cloning repo..." -ForegroundColor Cyan
if (Test-Path $DIR) {
    Write-Host "    Directory exists — pulling latest instead"
    Set-Location $DIR
    git pull --rebase
} else {
    git clone $REPO_URL $DIR
    Set-Location $DIR
}

Write-Host "`n==> Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "`n==> Adding missing package: @upstash/redis..." -ForegroundColor Cyan
npm install @upstash/redis

Write-Host "`n==> Setting up .env.local from .env.example..." -ForegroundColor Cyan
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host "    Created .env.local — FILL IN YOUR KEYS before continuing" -ForegroundColor Yellow
} else {
    Write-Host "    .env.local already exists — skipping"
}

Write-Host "`n==> Checking Claude Code CLI..." -ForegroundColor Cyan
$claudeInstalled = $null
try { $claudeInstalled = Get-Command claude -ErrorAction Stop } catch {}

if (-not $claudeInstalled) {
    Write-Host "    Claude Code not found. Installing via npm..." -ForegroundColor Yellow
    npm install -g @anthropic-ai/claude-code
}

Write-Host "`n==> All prerequisites ready." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor White
Write-Host "  1. Fill in .env.local (DATABASE_URL, FIREBASE_*, UPSTASH_*, STRIPE_*, etc.)" -ForegroundColor Yellow
Write-Host "  2. Run: npm run db:push          (push main schema.ts to Neon)" -ForegroundColor Yellow
Write-Host "  3. Run: .\run-claude-code.ps1    (let Claude Code finish the build)" -ForegroundColor Yellow
Write-Host "  4. Run: git push                  (after Claude Code commits)" -ForegroundColor Yellow
Write-Host ""
