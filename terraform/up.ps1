# Spins up Azure Cloud infrastructure and API for the team
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$envPath = Join-Path $scriptDir ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[WARNING] No .env file found in $scriptDir." -ForegroundColor Yellow
    $examplePath = Join-Path $scriptDir ".env.example"
    if (Test-Path $examplePath) {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Cyan
        Copy-Item $examplePath $envPath
    } else {
        Set-Content -Path $envPath -Value "DB_PASSWORD=CHANGE_ME_SecretPassword2026!"
    }
    Write-Host "Please edit $envPath to set your DB_PASSWORD before running this script again." -ForegroundColor Yellow
    exit 1
}

# Load variables from .env as TF_VAR_<name>
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $name = $parts[0].Trim()
            $val  = $parts[1].Trim()
            if ($name -cmatch '^TF_VAR_') {
                $varName = $name
            } else {
                $varName = "TF_VAR_" + $name.ToLower()
            }
            [System.Environment]::SetEnvironmentVariable($varName, $val, "Process")
        }
    }
}

# Ensure terraform is initialized
if (-not (Test-Path ".terraform")) {
    Write-Host "Initializing Terraform..." -ForegroundColor Cyan
    terraform init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] Terraform init failed. If you have configured a remote backend, ensure credentials are set." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "`nSpinning up Azure Infrastructure and API..." -ForegroundColor Cyan
terraform apply -auto-approve
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Terraform apply failed. Check the error message above." -ForegroundColor Red
    exit $LASTEXITCODE
}

$hostName = terraform output -raw host 2>$null
$db       = terraform output -raw database 2>$null
$user     = terraform output -raw user 2>$null
$pw       = $env:TF_VAR_db_password
$apiUrl       = terraform output -raw api_url 2>$null
$kvName       = terraform output -raw key_vault_name 2>$null
$aiName       = terraform output -raw application_insights_name 2>$null
$dashboardUrl = terraform output -raw dashboard_url 2>$null

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  INFRASTRUCTURE & API READY! Share these details:        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

Write-Host "API URL:       $apiUrl" -ForegroundColor Cyan
Write-Host "Dashboard URL: $dashboardUrl" -ForegroundColor Cyan
Write-Host "Database Host: $hostName" -ForegroundColor Yellow
Write-Host "Database Port: 5432" -ForegroundColor Yellow
Write-Host "Database Name: $db" -ForegroundColor Yellow
Write-Host "DB User:       $user" -ForegroundColor Yellow
Write-Host "Key Vault:     $kvName" -ForegroundColor Yellow
Write-Host "App Insights:  $aiName" -ForegroundColor Yellow

Write-Host "`nRun .\down.ps1 when you are finished to stop all Azure charges ($0.00).`n" -ForegroundColor DarkGray
