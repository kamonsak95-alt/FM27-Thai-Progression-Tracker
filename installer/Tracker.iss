#ifndef AppVersion
  #error AppVersion is required
#endif
#ifndef AppSource
  #error AppSource is required
#endif
#ifndef OutputFolder
  #error OutputFolder is required
#endif

[Setup]
AppId=FM27-Thai-Progression-Tracker
AppName=FM27 Tracker
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\FM27 Tracker
DefaultGroupName=FM27 Tracker
PrivilegesRequired=lowest
OutputDir={#OutputFolder}
OutputBaseFilename=FM27-Tracker-Setup-v{#AppVersion}
Compression=lzma2
SolidCompression=yes
CloseApplications=yes

[Files]
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\FM27 Tracker"; Filename: "{app}\FM27-Tracker.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\FM27-Tracker.exe"; Description: "Open FM27 Tracker"; Flags: postinstall nowait skipifsilent
