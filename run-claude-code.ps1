# PoolPal AI — Claude Code runner
# Run from repo root after bootstrap.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PROMPT = @"
You are working inside the fortunate-founder repo (PoolPal AI, Next.js 14 + Drizzle + Neon + Firebase).
Read CLAUDE.md first, then complete ALL of the following tasks in order.
After each task, verify the file compiles (no TypeScript errors) before moving on.
At the end, run: git add -A && git commit -m "chore: complete build - wire missing features" && git push

## TASKS

### 1. Fix package.json — add @upstash/redis
Ensure "@upstash/redis" is listed under "dependencies" in package.json.
It is already installed; just add the version entry matching what npm installed.

### 2. Fix dynamic import in src/lib/cache.ts
Replace the lazy dynamic require of @upstash/redis with a proper top-level import:
  import { Redis } from '@upstash/redis'
Keep the graceful degradation logic (if env vars absent, cache is a no-op).

### 3. Add requireAuth to api/pools/route.ts
The GET and POST handlers in src/app/api/pools/route.ts skip requireAuth.
Add the standard auth check at the top of each handler (same pattern as other routes):
  const { auth, error } = await requireAuth(req)
  if (error) return error

### 4. Wire homeowner-schema and tasks-schema into db:push
Currently db:push only pushes src/backend/db/schema.ts.
Update drizzle.config.ts so the schema glob includes all three schema files:
  schema: ['src/backend/db/schema.ts', 'src/backend/db/homeowner-schema.ts', 'src/backend/db/tasks-schema.ts']
Then run: npm run db:push

### 5. Fix any TypeScript errors
Run: npx tsc --noEmit
Fix all errors until it exits cleanly.

### 6. Verify build
Run: npm run build
Fix any build errors.

### 7. Update README.md
Add a "Setup" section that documents all required .env.local keys grouped by service
(Firebase, Neon, Upstash, Stripe, Cloudinary/R2, Anthropic, Twilio, etc.).
Pull the key names from .env.example.

### 8. Commit and push
git add -A
git commit -m "chore: complete build - fix auth, cache, schema, types"
git push origin main
"@

Write-Host "`n==> Launching Claude Code with build instructions..." -ForegroundColor Cyan
Write-Host "    (This may take several minutes)" -ForegroundColor Gray
Write-Host ""

# Write prompt to a temp file so it can be passed cleanly
$tmpFile = [System.IO.Path]::GetTempFileName() + ".md"
$PROMPT | Out-File -FilePath $tmpFile -Encoding UTF8

claude --print $tmpFile

Remove-Item $tmpFile -ErrorAction SilentlyContinue

Write-Host "`n==> Claude Code session complete." -ForegroundColor Green
