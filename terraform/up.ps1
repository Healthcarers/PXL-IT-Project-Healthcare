# Spins up Azure Container Registry, builds & pushes API + Frontend images, and deploys full Azure stack
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
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

# Load variables from .env (TF_VAR_<name> for Terraform vars, regular env for backend config)
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $name = $parts[0].Trim()
            $val  = $parts[1].Trim()
            if ($name -cmatch '^(TF_VAR_|TF_STATE_|ARM_)') {
                $varName = $name
            } else {
                $varName = "TF_VAR_" + $name.ToLower()
            }
            [System.Environment]::SetEnvironmentVariable($varName, $val, "Process")
        }
    }
}

$overridePath = Join-Path $scriptDir "backend_override.tf"
$useRemoteBackend = -not [string]::IsNullOrWhiteSpace($env:TF_STATE_STORAGE_ACCOUNT)

if ($useRemoteBackend) {
    if (Test-Path $overridePath) {
        Remove-Item $overridePath -Force
    }
    $rg = if ($env:TF_STATE_RESOURCE_GROUP) { $env:TF_STATE_RESOURCE_GROUP } else { "rg-healthcare-dev" }
    $container = if ($env:TF_STATE_CONTAINER) { $env:TF_STATE_CONTAINER } else { "tfstate" }
    Write-Host "Initializing Terraform with remote Azure backend..." -ForegroundColor Cyan
    terraform init -reconfigure `
        -backend-config="resource_group_name=$rg" `
        -backend-config="storage_account_name=$($env:TF_STATE_STORAGE_ACCOUNT)" `
        -backend-config="container_name=$container" `
        -backend-config="key=healthcare.database.tfstate" `
        -backend-config="use_azuread_auth=true"
} else {
    Write-Host "No TF_STATE_STORAGE_ACCOUNT set in .env; using local Terraform state (backend_override.tf)." -ForegroundColor DarkYellow
    $overrideContent = @"
terraform {
  backend "local" {}
}
"@
    Set-Content -Path $overridePath -Value $overrideContent
    terraform init -reconfigure
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Terraform init failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Stage 1: Provision ACR & Managed Identity AcrPull permissions when using ACR (default)
if ($env:TF_VAR_use_acr -ne "false" -and [string]::IsNullOrWhiteSpace($env:TF_VAR_api_image)) {
    Write-Host "`n[1/3] Provisioning Azure Container Registry & Managed Identities..." -ForegroundColor Cyan
    terraform apply -auto-approve `
        -target="azurerm_container_registry.acr" `
        -target="azurerm_role_assignment.api_acr_pull" `
        -target="azurerm_role_assignment.web_acr_pull" `
        -target="azurerm_key_vault.kv" `
        -target="azurerm_role_assignment.deployer_secrets_officer" `
        -target="azurerm_role_assignment.api_secrets_user"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] ACR provisioning failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    $acrName   = terraform output -raw acr_name 2>$null
    $acrServer = terraform output -raw acr_login_server 2>$null

    Write-Host "`n[2/3] Logging into ACR ($acrName) and building/pushing API & Web Gateway images..." -ForegroundColor Cyan
    az acr login --name $acrName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] az acr login failed. Ensure 'az login' is active and Docker is running." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    $imageTag = Get-Date -Format "yyyyMMddHHmmss"
    $apiImage = "$acrServer/healthcare-api:$imageTag"
    $webImage = "$acrServer/healthcare-web:$imageTag"

    docker build -t $apiImage -t "$acrServer/healthcare-api:latest" (Join-Path $repoRoot "Api")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    docker push $apiImage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    docker push "$acrServer/healthcare-api:latest"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    docker build -t $webImage -t "$acrServer/healthcare-web:latest" (Join-Path $repoRoot "Frontend")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    docker push $webImage
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    docker push "$acrServer/healthcare-web:latest"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "`n[3/3] Deploying full Azure Infrastructure, Web Gateway, API, and Monitoring..." -ForegroundColor Cyan
if (-not $imageTag) { $imageTag = "latest" }
terraform apply -auto-approve -var="image_tag=$imageTag"
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Terraform apply failed. Check the error message above." -ForegroundColor Red
    exit $LASTEXITCODE
}

$webUrl       = terraform output -raw web_url 2>$null
$apiInternal  = terraform output -raw api_url 2>$null
$hostName     = terraform output -raw host 2>$null
$db           = terraform output -raw database 2>$null
$user         = terraform output -raw user 2>$null
$kvName       = terraform output -raw key_vault_name 2>$null
$aiName       = terraform output -raw application_insights_name 2>$null
$acrNameOut   = terraform output -raw acr_name 2>$null
$dashboardUrl = terraform output -raw dashboard_url 2>$null

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  PXL HEALTHCARE INFRASTRUCTURE READY!                    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

Write-Host "Web App URL:       $webUrl" -ForegroundColor Cyan
Write-Host "Dashboard URL:     $dashboardUrl" -ForegroundColor Cyan
Write-Host "Container Reg:     $acrNameOut" -ForegroundColor Yellow
Write-Host "API (Internal):    $apiInternal" -ForegroundColor Yellow
Write-Host "Database Host:     $hostName" -ForegroundColor Yellow
Write-Host "Database Port:     5432" -ForegroundColor Yellow
Write-Host "Database Name:     $db" -ForegroundColor Yellow
Write-Host "DB User:           $user" -ForegroundColor Yellow
Write-Host "Key Vault:         $kvName" -ForegroundColor Yellow
Write-Host "App Insights:      $aiName" -ForegroundColor Yellow

Write-Host "`nRun .\down.ps1 when you are finished to stop all Azure charges (`$0.00/hr).`n" -ForegroundColor DarkGray
