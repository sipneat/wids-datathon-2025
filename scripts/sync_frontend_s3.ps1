param(
    [string]$BucketName = "wids-frontend-source"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Resolve-Path (Join-Path $ScriptDir "..\frontend")
$DistDir = Join-Path $FrontendDir "dist"

Write-Host "Is $FrontendDir the correct frontend directory? (Y/N)"
$confirmation = Read-Host
if ($confirmation -ne "Y") {
    Write-Host "Aborted."
    exit 1
}

if (Test-Path $DistDir) {
    Remove-Item -Recurse -Force $DistDir
}

Write-Host "Building frontend with npm..."

Push-Location $FrontendDir
npm --version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "npm is not available" }

npm ci | Out-Null
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { throw "npm build failed" }
Pop-Location

Write-Host "Created artifact: $DistDir"

Write-Host "Successful build, would you like to sync to S3 bucket $BucketName? (Y/N)"
$syncConfirmation = Read-Host
if ($syncConfirmation -eq "Y") {
    aws s3 sync $DistDir "s3://$BucketName/" --delete | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "AWS CLI command failed" }
}
