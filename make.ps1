<#
.SYNOPSIS
  FlowAssist task runner for Windows PowerShell (mirrors the repo Makefile).

.DESCRIPTION
  GNU Make is not installed by default on Windows. Use this script from the repo root:

    .\make.ps1 help
    .\make.ps1 install
    .\make.ps1 start

  Same targets as `make` on Linux/macOS/Git Bash.
#>

[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string] $Target = 'help'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = $PSScriptRoot
Set-Location -LiteralPath $Root

function Fail([string] $msg) {
  Write-Host $msg -ForegroundColor Red
  exit 1
}

function Assert-RepoRoot {
  if (-not (Test-Path -LiteralPath (Join-Path $Root 'package.json'))) {
    Fail "package.json not found. Run this script from the FlowAssist repo root (directory containing make.ps1)."
  }
}

function Test-CheckTools {
  Assert-RepoRoot
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { Fail "ERROR: Node.js (node) is not installed or not on PATH." }
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if (-not $npm) { Fail "ERROR: npm is not installed or not on PATH." }
}

function Test-CheckDeps {
  Test-CheckTools
  $nm = Join-Path $Root 'node_modules'
  if (-not (Test-Path -LiteralPath $nm -PathType Container)) {
    Fail "ERROR: node_modules missing. Run: .\make.ps1 install"
  }
  $el = Join-Path $Root 'node_modules\electron\package.json'
  if (-not (Test-Path -LiteralPath $el)) {
    Fail "ERROR: Electron package missing. Run: .\make.ps1 install"
  }
}

function Show-Help {
  $os = [System.Environment]::OSVersion.VersionString
  Write-Host ""
  Write-Host "FlowAssist - $os (PowerShell)"
  Write-Host ""
  Write-Host "Setup:"
  Write-Host "  .\make.ps1 install          Install npm dependencies"
  Write-Host "  .\make.ps1 doctor           Print OS, Node, npm, install status"
  Write-Host "  .\make.ps1 check-tools      Require node + npm"
  Write-Host "  .\make.ps1 check-deps       Require node + npm + node_modules + electron"
  Write-Host ""
  Write-Host "Run app:"
  Write-Host "  .\make.ps1 start            npm run start"
  Write-Host "  .\make.ps1 start-debug      npm run start:debug"
  Write-Host ""
  Write-Host "Build:"
  Write-Host "  .\make.ps1 pack             electron-builder --dir"
  Write-Host "  .\make.ps1 dist             Interactive release + Windows dist"
  Write-Host "  .\make.ps1 dist-local       Dist without bumping version"
  Write-Host ""
  Write-Host "Tests:"
  Write-Host "  .\make.ps1 test-regression  Playwright regression suite"
  Write-Host "  .\make.ps1 test-e2e        Full Playwright config"
  Write-Host "  .\make.ps1 test-ui-map     UI map discovery spec"
  Write-Host ""
  Write-Host "Other:"
  Write-Host "  .\make.ps1 clean-dist       Remove dist\ directory"
  Write-Host ""
  Write-Host "On Linux/macOS (or Git Bash on Windows) you can use: make TARGET"
  Write-Host ""
}

function Invoke-Doctor {
  Test-CheckTools
  Write-Host "== FlowAssist doctor =="
  Write-Host "OS        : $([System.Environment]::OSVersion)"
  Write-Host "PWD       : $(Get-Location)"
  Write-Host "node      : $(node -p 'process.version')"
  Write-Host "npm       : $(npm -v)"
  if (Test-Path -LiteralPath (Join-Path $Root 'node_modules') -PathType Container) {
    Write-Host "node_modules: present"
  } else {
    Write-Host "node_modules: MISSING (.\make.ps1 install)"
  }
  $el = Join-Path $Root 'node_modules\electron\package.json'
  if (Test-Path -LiteralPath $el) {
    Write-Host "electron    : present"
  } elseif (Test-Path -LiteralPath (Join-Path $Root 'node_modules') -PathType Container) {
    Write-Host "electron    : MISSING"
  }
  Write-Host "======================="
}

function Invoke-Npm {
  param([string[]] $NpmArgs)
  & npm @NpmArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Assert-RepoRoot

switch ($Target.ToLowerInvariant()) {
  'help' { Show-Help }
  'check-tools' { Test-CheckTools; Write-Host "check-tools: OK" }
  'check-deps' { Test-CheckDeps; Write-Host "check-deps: OK" }
  'doctor' { Invoke-Doctor }
  'install' {
    Test-CheckTools
    Invoke-Npm @('install')
  }
  'start' {
    Test-CheckDeps
    Invoke-Npm @('run', 'start')
  }
  'start-debug' {
    Test-CheckDeps
    Invoke-Npm @('run', 'start:debug')
  }
  'pack' {
    Test-CheckDeps
    & npx --yes electron-builder --dir
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  'dist' {
    Test-CheckDeps
    Invoke-Npm @('run', 'dist')
  }
  'dist-local' {
    Test-CheckDeps
    Invoke-Npm @('run', 'dist:local')
  }
  'clean-dist' {
    $dist = Join-Path $Root 'dist'
    if (Test-Path -LiteralPath $dist) {
      Write-Host "Removing dist/"
      Remove-Item -LiteralPath $dist -Recurse -Force
    } else {
      Write-Host "dist/ not present"
    }
  }
  'test-e2e' {
    Test-CheckDeps
    Invoke-Npm @('run', 'test:e2e')
  }
  'test-ui-map' {
    Test-CheckDeps
    Invoke-Npm @('run', 'test:ui-map')
  }
  'test-regression' {
    Test-CheckDeps
    Invoke-Npm @('run', 'test:regression')
  }
  'test' {
    Test-CheckDeps
    Invoke-Npm @('run', 'test:regression')
  }
  default {
    Write-Host "Unknown target: $Target"
    Write-Host ""
    Show-Help
    exit 1
  }
}
