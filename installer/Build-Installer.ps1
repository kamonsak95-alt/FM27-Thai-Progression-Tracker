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
$version = (Get-Content -LiteralPath (Join-Path $app 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release version' }

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$launcher = Join-Path $app 'FM27-Tracker.exe'
& $csc /nologo /target:winexe /reference:System.Windows.Forms.dll "/out:$launcher" (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE) { throw 'Launcher compilation failed' }
& $compiler "/DAppVersion=$version" "/DAppSource=$app" "/DOutputFolder=$output" (Join-Path $PSScriptRoot 'Tracker.iss')
if ($LASTEXITCODE) { throw 'Installer compilation failed' }
