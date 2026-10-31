$ErrorActionPreference = "Stop"

$projectRoot = (Get-Location).Path
$source = Join-Path $projectRoot "public/images/marivest.png"
$appDir = Join-Path $projectRoot "src/app"

if (-not (Test-Path $source -PathType Leaf)) {
  throw "File public/images/marivest.png tidak ditemukan. Jalankan script dari root project MARIVEST."
}

New-Item -ItemType Directory -Force -Path $appDir | Out-Null

# Next.js App Router file-based metadata icons.
# Root app icons apply across all routes unless a nested layout overrides them.
Copy-Item -LiteralPath $source -Destination (Join-Path $appDir "icon.png") -Force
Copy-Item -LiteralPath $source -Destination (Join-Path $appDir "apple-icon.png") -Force

# Remove competing legacy App Router icons (commonly the default Next.js icon).
$legacyIcons = @(
  (Join-Path $appDir "favicon.ico"),
  (Join-Path $appDir "icon.svg")
)

foreach ($file in $legacyIcons) {
  if (Test-Path $file -PathType Leaf) {
    Remove-Item -LiteralPath $file -Force
    Write-Host "Removed competing icon: $file"
  }
}

Write-Host ""
Write-Host "MARIVEST favicon installed:"
Write-Host " - src/app/icon.png"
Write-Host " - src/app/apple-icon.png"
Write-Host ""
Write-Host "Restart Next.js, then hard-refresh the browser (Ctrl+Shift+R)."
