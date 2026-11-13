param(
    [Parameter(Mandatory)] [string] $ReleaseZip,
    [Parameter(Mandatory)] [string] $OutputFolder,
    [Parameter(Mandatory)] [string] $InnoCompiler
)

$ErrorActionPreference = 'Stop'
$archive = (Resolve-Path -LiteralPath $ReleaseZip).Path
$compiler = (Resolve-Path -LiteralPath $InnoCompiler).Path
$output = (New-Item -ItemType Directory -Path $OutputFolder -Force).FullName
$stage = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('fm27-setup-' + [guid]::NewGuid()))
Expand-Archive -LiteralPath $archive -DestinationPath $stage.FullName
$app = Join-Path $stage.FullName 'FM27-Tracker'
$runtime = Join-Path $app 'bin/node-runtime/node.exe'
if ((Get-FileHash -LiteralPath $runtime).Hash -ne '86fc4785327db5f5c7558dc6156c543b433c313e813a222e088086222ab4afa6') {
    throw 'Unexpected SHA-256 for Node.js executable in the release ZIP'
}
& $runtime (Join-Path $PSScriptRoot 'verify-notices.js') $app --require-node
if ($LASTEXITCODE) { throw 'Release ZIP license verification failed' }
$version = (Get-Content -LiteralPath (Join-Path $app 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release version' }

$icon = Join-Path $PSScriptRoot 'Tracker.ico'
if (!(Test-Path -LiteralPath (Join-Path $app 'bin/FM27-Tracker.exe') -PathType Leaf)) { throw 'Release ZIP launcher is missing' }
$innoLicense = Join-Path (Split-Path $compiler) 'license.txt'
if (!(Test-Path -LiteralPath $innoLicense -PathType Leaf)) { throw 'Inno Setup license.txt is missing' }
& $compiler "/DAppVersion=$version" "/DAppSource=$app" "/DOutputFolder=$output" "/DAppIcon=$icon" "/DInnoLicense=$innoLicense" (Join-Path $PSScriptRoot 'Tracker.iss')
if ($LASTEXITCODE) { throw 'Installer compilation failed' }
