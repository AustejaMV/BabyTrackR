# Bumps the patch version in package.json and src/app/version.ts.
# Uses only built-in PowerShell — no Node required.

$root = Split-Path $PSScriptRoot -Parent
$pkgPath = Join-Path $root "package.json"
$versionPath = Join-Path $root "src\app\version.ts"

$pkgContent = [System.IO.File]::ReadAllText($pkgPath)

if ($pkgContent -match '"version":\s*"(\d+)\.(\d+)\.(\d+)"') {
    $major = $Matches[1]
    $minor = $Matches[2]
    $patch = [int]$Matches[3] + 1
    $newVersion = "$major.$minor.$patch"

    # Replace only the version field — preserves all other formatting
    $pkgContent = $pkgContent -replace '"version":\s*"\d+\.\d+\.\d+"', "`"version`": `"$newVersion`""
    [System.IO.File]::WriteAllText($pkgPath, $pkgContent)

    [System.IO.File]::WriteAllText($versionPath, "export const APP_VERSION = `"$newVersion`";`n")

    Write-Host "Bumped to v$newVersion"
} else {
    Write-Host "ERROR: could not find version field in package.json"
    exit 1
}
