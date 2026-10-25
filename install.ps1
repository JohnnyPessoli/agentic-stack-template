param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$ErrorActionPreference = "Stop"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js 20.12 ou superior é necessário. Instale-o antes de continuar."
    exit 1
}

& node (Join-Path $PSScriptRoot "scripts\install.mjs") @Arguments
exit $LASTEXITCODE
