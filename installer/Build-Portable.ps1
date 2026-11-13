param(
    [Parameter(Mandatory)] [string] $OutputFolder,
    [string] $NodeArchive,
    [string] $Version
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$versionFile = Join-Path $root 'package.json'
if (!$Version) { $Version = (Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json).version }
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release version' }
$output = (New-Item -ItemType Directory -Path $OutputFolder -Force).FullName
$stage = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('fm27-zip-' + [guid]::NewGuid()))
try {
    $asset = 'node-v24.22.3-win-x64.zip'
    if (!$NodeArchive) {
        $NodeArchive = Join-Path $stage.FullName $asset
        Invoke-WebRequest "https://nodejs.org/dist/v24.22.3/$asset" -OutFile $NodeArchive -UseBasicParsing
    }
    if ((Get-FileHash -LiteralPath $NodeArchive).Hash -ne 'e612af99f626ab415ea225af6bce5c971feb448cb5cae250bb1c3fa50c5f7d9f') {
        throw 'Unexpected SHA-256 for the official Node.js ZIP'
    }

    $app = (New-Item -ItemType Directory -Path (Join-Path $stage.FullName 'FM27-Tracker')).FullName
    foreach ($item in @('LICENSE','PRIVACY.md','README.md','package.json','Start-FM27-Tracker-Window.vbs','Start-FM27-Tracker.bat','public','server')) {
        Copy-Item -LiteralPath (Join-Path $root $item) -Destination $app -Recurse
    }
    $bin = (New-Item -ItemType Directory -Path (Join-Path $app 'bin')).FullName
    Copy-Item -LiteralPath (Join-Path $root 'bin/FMSuperScout.Scanner.exe'),(Join-Path $root 'bin/notices') -Destination $bin -Recurse
    $pkg = Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
    $pkg.version = $Version
    [IO.File]::WriteAllText((Join-Path $app 'package.json'), ($pkg | ConvertTo-Json -Depth 30))
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $commit = git -C $root rev-parse --verify HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $commit -match '^[a-f0-9]{40}$') {
            $changes = git -C $root status --porcelain
            if ($LASTEXITCODE -eq 0 -and !$changes) {
                $buildInfo = @{ commit = $commit } | ConvertTo-Json -Compress
                [IO.File]::WriteAllText((Join-Path $app 'server/build-info.json'), $buildInfo)
            }
        }
    }
    $unpacked = Join-Path $stage.FullName 'node'
    Expand-Archive -LiteralPath $NodeArchive -DestinationPath $unpacked
    $distribution = Join-Path $unpacked 'node-v24.22.3-win-x64'
    $runtime = (New-Item -ItemType Directory -Path (Join-Path $bin 'node-runtime')).FullName
    Copy-Item -LiteralPath (Join-Path $distribution 'node.exe'),(Join-Path $distribution 'LICENSE') -Destination $runtime
    $node = Join-Path $runtime 'node.exe'
    if ((Get-FileHash -LiteralPath $node).Hash -ne '86fc4785327db5f5c7558dc6156c543b433c313e813a222e088086222ab4afa6') {
        throw 'Unexpected SHA-256 for Node.js executable'
    }
    & $node (Join-Path $PSScriptRoot 'verify-notices.js') $app --require-node
    if ($LASTEXITCODE) { throw 'Release license verification failed' }

    $csc = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
    $icon = Join-Path $PSScriptRoot 'Tracker.ico'
    & $csc /nologo /codepage:65001 /target:winexe /reference:System.Windows.Forms.dll "/win32icon:$icon" "/out:$bin/FM27-Tracker.exe" (Join-Path $PSScriptRoot 'Launcher.cs')
    if ($LASTEXITCODE) { throw 'Launcher compilation failed' }
    $zip = Join-Path $output "FM27-Tracker-Windows-v$Version.zip"
    Compress-Archive -LiteralPath $app -DestinationPath $zip -Force
    if ((Get-Item -LiteralPath $zip).Length -gt 100MB) { throw 'Release ZIP exceeds the updater size limit' }
    $zip
} finally {
    Remove-Item -LiteralPath $stage.FullName -Recurse -Force
}
