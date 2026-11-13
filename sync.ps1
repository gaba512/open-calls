# Tikorix 1-Click Synchronization Script
# Synchronizes Google Apps Script, commits & pushes to GitHub (triggering GitHub Pages & Cloudflare)

param (
    [string]$CommitMessage = "Update Tikorix: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$GitExe = "C:\Users\hazel\Documents\Claude\tools\git\cmd\git.exe"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Tikorix Automated Sync Workflow       " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Synchronize Root Web App Files for GitHub Pages
# NOTE: Copy-Item does NOT prune files that were deleted from frontend/. If you
# rename or delete a file in frontend/, delete the stale root copy by hand (or
# switch this to `robocopy "$ProjectDir\frontend" "$ProjectDir" /MIR /XD .git`).
Copy-Item -Path "$ProjectDir\frontend\*" -Destination "$ProjectDir\" -Recurse -Force

# 2. Google Apps Script Push via Clasp
Write-Host "`n[1/3] Updating Google Apps Script..." -ForegroundColor Yellow
$ClaspScript = "C:\Users\hazel\Documents\Claude\tools\node\clasp.ps1"
if (Test-Path $ClaspScript) {
    try {
        & powershell -ExecutionPolicy Bypass -File $ClaspScript push --force
        Write-Host "✔ Google Apps Script synchronized successfully." -ForegroundColor Green
    } catch {
        Write-Warning "Clasp push encountered an issue: $_"
        Write-Host "You can also deploy via Apps Script editor at:" -ForegroundColor Gray
        Write-Host "https://script.google.com/u/0/home/projects/1ogoRLEPCLPrF1jtt4L2VXCCq16kCUA8TH30ulVNpndQ00PqLZhJuBcDO/edit" -ForegroundColor Cyan
    }
} else {
    Write-Warning "Clasp tool not found at $ClaspScript. Skipping automatic gas push."
}

# 3. Stage & Commit Git Changes
Write-Host "`n[2/3] Committing changes to local Git repository..." -ForegroundColor Yellow
& $GitExe -C $ProjectDir add -A
$Status = & $GitExe -C $ProjectDir status --porcelain
if ($Status) {
    & $GitExe -C $ProjectDir commit -m "$CommitMessage"
    Write-Host "✔ Changes committed: '$CommitMessage'" -ForegroundColor Green
} else {
    Write-Host "✔ Working tree clean, no new changes to commit." -ForegroundColor Green
}

# 4. Push to GitHub
Write-Host "`n[3/3] Pushing to GitHub (origin main)..." -ForegroundColor Yellow
try {
    & $GitExe -C $ProjectDir push origin main
    Write-Host "✔ Pushed to GitHub repository: https://github.com/gaba512/open-calls" -ForegroundColor Green
    Write-Host "✔ GitHub Pages is deploying automatically at: https://gaba512.github.io/open-calls" -ForegroundColor Green
} catch {
    Write-Error "Failed to push to GitHub: $_"
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "✔ Synchronization complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
