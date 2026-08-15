# ==============================================================================
# WattWise AI — Vercel ML Staging Preparation Script
# AI-VERCEL-01
# ==============================================================================
param (
    [string]$StageDir = "d:\LOMBA\MVP PROTOTIPE start-up\.vercel-ml-stage",
    [string]$SourceRoot = "d:\LOMBA\MVP PROTOTIPE start-up",
    [string]$DataRoot = "D:\WattWiseMLData"
)

$ErrorActionPreference = "Stop"

Write-Host "==> WattWise AI: Preparing Vercel ML Staging Directory..." -ForegroundColor Cyan

# Expected Authority Hashes
$EXPECTED_LIGHTGBM_HASH = "85F325153810E2611F6D364C81E7CA6F13948B68FEEE6F491A3015DF3F3CF1C0"
$EXPECTED_NBEATS_HASH   = "541905740B790D39434774679CE3120338ECDABD3F13A8D95385F1D6272191D6"
$EXPECTED_MANIFEST_HASH = "CFE22E725856BC12884B0A842E0E84760B3CF9B40D7D2D84F0EF479BFADA44EE"

# Clean & Create Staging Directory
if (Test-Path $StageDir) {
    Write-Host "--> Cleaning existing staging files in: $StageDir"
    Get-ChildItem -Path $StageDir -Exclude ".vercel", ".env.local" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $StageDir -Force | Out-Null
}
New-Item -ItemType Directory -Path "$StageDir\api" -Force | Out-Null
New-Item -ItemType Directory -Path "$StageDir\models\lightgbm\ai02-1.0.0" -Force | Out-Null
New-Item -ItemType Directory -Path "$StageDir\models\nbeats\ai02-1.0.0" -Force | Out-Null

# 1. Copy Authoritative Python Packages
Write-Host "--> Copying wattwise_serving..."
Copy-Item -Path "$SourceRoot\ml\benchmark\src\wattwise_serving" -Destination "$StageDir\wattwise_serving" -Recurse -Force

Write-Host "--> Copying wattwise_benchmark..."
Copy-Item -Path "$SourceRoot\ml\benchmark\src\wattwise_benchmark" -Destination "$StageDir\wattwise_benchmark" -Recurse -Force

# 2. Copy Model Artifacts and Serving Manifest
Write-Host "--> Copying model artifacts and manifest from $DataRoot..."
Copy-Item -Path "$DataRoot\models\ai-02\serving-manifest.json" -Destination "$StageDir\models\serving-manifest.json" -Force
Copy-Item -Path "$DataRoot\models\ai-02\lightgbm\ai02-1.0.0\model.joblib" -Destination "$StageDir\models\lightgbm\ai02-1.0.0\model.joblib" -Force
Copy-Item -Path "$DataRoot\models\ai-02\nbeats\ai02-1.0.0\model.ckpt" -Destination "$StageDir\models\nbeats\ai02-1.0.0\model.ckpt" -Force

# 3. Copy Infrastructure Support Files
Write-Host "--> Copying deployment configuration files..."
Copy-Item -Path "$SourceRoot\infra\vercel-ml\requirements-serving.txt" -Destination "$StageDir\requirements.txt" -Force
Copy-Item -Path "$SourceRoot\infra\vercel-ml\vercel.json" -Destination "$StageDir\vercel.json" -Force
Copy-Item -Path "$SourceRoot\infra\vercel-ml\api\index.py" -Destination "$StageDir\api\index.py" -Force
Copy-Item -Path "$SourceRoot\infra\vercel-ml\.python-version" -Destination "$StageDir\.python-version" -Force
Copy-Item -Path "$SourceRoot\infra\vercel-ml\pyproject.toml" -Destination "$StageDir\pyproject.toml" -Force

# 4. Create .vercelignore
$VercelIgnoreContent = @"
.git
.gitignore
.venv
__pycache__
*.pyc
*.pyo
*.pyd
.pytest_cache
.mypy_cache
.ruff_cache
tests
docs
*.md
"@
Set-Content -Path "$StageDir\.vercelignore" -Value $VercelIgnoreContent -Encoding utf8

# 5. Clean Python byte-code caches from staging
Get-ChildItem -Path $StageDir -Include "__pycache__", "*.pyc" -Recurse -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 6. Verify Hashes
Write-Host "--> Verifying SHA256 checksums in staging..." -ForegroundColor Cyan

$StagedLightGBM = (Get-FileHash -Algorithm SHA256 "$StageDir\models\lightgbm\ai02-1.0.0\model.joblib").Hash
$StagedNBeats   = (Get-FileHash -Algorithm SHA256 "$StageDir\models\nbeats\ai02-1.0.0\model.ckpt").Hash
$StagedManifest = (Get-FileHash -Algorithm SHA256 "$StageDir\models\serving-manifest.json").Hash

Write-Host "Staged LightGBM SHA256: $StagedLightGBM"
Write-Host "Staged N-BEATS  SHA256: $StagedNBeats"
Write-Host "Staged Manifest SHA256: $StagedManifest"

if ($StagedLightGBM -ne $EXPECTED_LIGHTGBM_HASH) {
    throw "STAGING_LIGHTGBM_HASH_MISMATCH: Expected $EXPECTED_LIGHTGBM_HASH, got $StagedLightGBM"
}
if ($StagedNBeats -ne $EXPECTED_NBEATS_HASH) {
    throw "STAGING_NBEATS_HASH_MISMATCH: Expected $EXPECTED_NBEATS_HASH, got $StagedNBeats"
}
if ($StagedManifest -ne $EXPECTED_MANIFEST_HASH) {
    throw "STAGING_MANIFEST_HASH_MISMATCH: Expected $EXPECTED_MANIFEST_HASH, got $StagedManifest"
}

Write-Host "`n✅ SUCCESS: Vercel ML Staging prepared and verified at: $StageDir" -ForegroundColor Green
