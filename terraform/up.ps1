# Spins up the cheapest Azure PostgreSQL database and shows connection info for the team
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$envPath = Join-Path $scriptDir ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[WARNING] No .env file found in $scriptDir." -ForegroundColor Yellow
    Write-Host "Creating .env from .env.example..." -ForegroundColor Cyan
    Copy-Item (Join-Path $scriptDir ".env.example") $envPath
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

Write-Host "`nSpinning up cheapest Azure PostgreSQL server (~$0.017/hour)..." -ForegroundColor Cyan
terraform apply -auto-approve
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Terraform apply failed. Check the error message above." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  DATABASE READY! Share these details with the team:      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

$hostName = terraform output -raw host
$db       = terraform output -raw database
$user     = terraform output -raw user
$pw       = $env:TF_VAR_db_password

Write-Host "Host:     $hostName" -ForegroundColor Yellow
Write-Host "Port:     5432" -ForegroundColor Yellow
Write-Host "Database: $db" -ForegroundColor Yellow
Write-Host "User:     $user" -ForegroundColor Yellow
Write-Host "Password: $pw" -ForegroundColor Yellow

Write-Host "`nJava / Spring Boot (application.properties):" -ForegroundColor White
Write-Host "spring.datasource.url=jdbc:postgresql://${hostName}:5432/${db}?sslmode=require" -ForegroundColor Cyan
Write-Host "spring.datasource.username=${user}" -ForegroundColor Cyan
Write-Host "spring.datasource.password=${pw}" -ForegroundColor Cyan

Write-Host "`nStandard Connection URL:" -ForegroundColor White
Write-Host "postgresql://${user}:${pw}@${hostName}:5432/${db}?sslmode=require" -ForegroundColor Cyan

Write-Host "`nRun .\down.ps1 when you are finished to stop all Azure charges ($0.00).`n" -ForegroundColor DarkGray
