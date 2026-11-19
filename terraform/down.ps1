# Breaks down Azure Cloud infrastructure so you are billed $0.00/hr while not in use
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$envPath = Join-Path $scriptDir ".env"
if (Test-Path $envPath) {
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
}

$overridePath = Join-Path $scriptDir "backend_override.tf"
$useRemoteBackend = -not [string]::IsNullOrWhiteSpace($env:TF_STATE_STORAGE_ACCOUNT)

if (-not $useRemoteBackend -and -not (Test-Path $overridePath)) {
    $overrideContent = @"
terraform {
  backend "local" {}
}
"@
    Set-Content -Path $overridePath -Value $overrideContent
    terraform init -reconfigure
}

Write-Host "`nTearing down PXL Healthcare Azure infrastructure (Web Gateway, API, Database, Key Vault, Monitoring)..." -ForegroundColor Red
terraform destroy -auto-approve
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Terraform destroy failed. Check the error message above." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`nAll resources deleted. Ongoing cost: `$0.00/hour." -ForegroundColor Green
Write-Host "Run .\up.ps1 or wait for GitHub Actions next time you need the infrastructure again.`n" -ForegroundColor Cyan
