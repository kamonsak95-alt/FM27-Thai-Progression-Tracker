#ifndef AppVersion
  #error AppVersion is required
#endif
#ifndef InnoLicense
  #error InnoLicense is required
#endif
#ifndef AppSource
  #error AppSource is required
#endif
#ifndef OutputFolder
  #error OutputFolder is required
#endif
#ifndef AppIcon
  #error AppIcon is required
#endif

[Setup]
AppId=FM27-Thai-Progression-Tracker
AppName=FM27 Tracker
AppVersion={#AppVersion}
DefaultDirName={autopf}\FM27 Tracker
DefaultGroupName=FM27 Tracker
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile={#AppIcon}
UninstallDisplayIcon={app}\FM27-Tracker.exe
OutputDir={#OutputFolder}
OutputBaseFilename=FM27-Tracker-Setup-v{#AppVersion}
Compression=lzma2
SolidCompression=yes
CloseApplications=yes

[Files]
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#AppSource}\bin\FM27-Tracker.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#InnoLicense}"; DestDir: "{app}\bin\notices"; DestName: "INNO-SETUP-LICENSE.TXT"; Flags: ignoreversion

[INI]
Filename: "{app}\installation.ini"; Section: "Tracker"; Key: "Mode"; String: "Setup"; Flags: uninsdeletesection

[Icons]
Name: "{group}\FM27 Tracker"; Filename: "{app}\FM27-Tracker.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\FM27-Tracker.exe"; Description: "Open FM27 Tracker"; Flags: postinstall nowait skipifsilent
