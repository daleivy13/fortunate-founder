# PoolPal AI — Launch Claude Code for autonomous build
# Run after bootstrap.ps1 and filling in .env.local

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "`n==> Starting Claude Code..." -ForegroundColor Cyan
Write-Host "    Claude will read CLAUDE.md and continue building from where it left off." -ForegroundColor Gray
Write-Host "    Press Ctrl+C to stop at any time.`n" -ForegroundColor Gray

claude
