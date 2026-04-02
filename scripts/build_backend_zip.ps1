# as a devops engineer this method pains me but it'll work for now

param(
    [string]$PythonVersion = "3.14",
    [string]$FunctionName = "wids-backend"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Resolve-Path (Join-Path $ScriptDir "..\backend")
$BuildDir = Join-Path $BackendDir ".lambda-build"
$PackageDir = Join-Path $BuildDir "package"
$DistDir = Join-Path $BackendDir "dist"
$ZipPath = Join-Path $DistDir "backend-lambda.zip"

Write-Host "Is $BackendDir the correct backend directory? (Y/N)"
$confirmation = Read-Host
if ($confirmation -ne "Y") {
    Write-Host "Aborted."
    exit 1
}

if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}
New-Item -ItemType Directory -Path $PackageDir | Out-Null

Write-Host "Installing dependencies with Docker Amazon Linux image..."
docker --version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker is not available" }

$dockerBackendPath = (Resolve-Path $BackendDir).Path -replace "\\", "/"
if ($dockerBackendPath -match "^[A-Za-z]:") {
    $drive = $dockerBackendPath.Substring(0,1).ToLower()
    $rest = $dockerBackendPath.Substring(2)
    $dockerBackendPath = "/$drive$rest"
}

$dockerCommand = "python -m pip install --upgrade pip && python -m pip install -r /var/task/requirements.txt -t /var/task/.lambda-build/package --no-cache-dir"

docker run --rm `
    -v "${dockerBackendPath}:/var/task" `
    -w /var/task `
    --entrypoint /bin/sh `
    "public.ecr.aws/lambda/python:$PythonVersion" `
    -lc $dockerCommand
if ($LASTEXITCODE -ne 0) { throw "Docker-based dependency install failed" }

if (-not (Test-Path (Join-Path $PackageDir "serverless_wsgi.py"))) {
    throw "Dependency check failed: serverless_wsgi.py not found in build package"
}

$excludedTopLevel = @(
    ".env",
    "credentials.json",
    "serviceAccountKey.json",
    "venv",
    ".venv",
    "dist",
    ".lambda-build",
    "__pycache__"
)

Get-ChildItem -Path $BackendDir -Force | ForEach-Object {
    if ($excludedTopLevel -contains $_.Name) {
        return
    }

    $destination = Join-Path $PackageDir $_.Name
    Copy-Item -Path $_.FullName -Destination $destination -Recurse -Force
}

Get-ChildItem -Path $PackageDir -Recurse -Force |
    Where-Object { $_.Name -eq "__pycache__" -or $_.Extension -in @(".pyc", ".pyo") } |
    Remove-Item -Recurse -Force

if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}
Compress-Archive -Path (Join-Path $PackageDir "*") -DestinationPath $ZipPath -Force

Write-Host "Created artifact: $ZipPath"

if ($FunctionName) {
    Write-Host ""
    Write-Host "Zip successful, would you like to deploy to AWS Lambda now? (Y/N)"
    $deployConfirmation = Read-Host
    if ($deployConfirmation -eq "Y") {
        aws lambda update-function-code --function-name $FunctionName --zip-file fileb://$ZipPath | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "AWS CLI command failed" }
    }
}
