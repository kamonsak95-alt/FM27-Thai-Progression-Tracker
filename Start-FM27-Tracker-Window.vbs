' FM27 Thai Progression Tracker - Silent Desktop Launcher
Option Explicit
Dim sh, fso, base, edgePath

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)

' Start background node server silently (0 = hidden window)
sh.CurrentDirectory = base
sh.Run "node """ & base & "\server\index.js""", 0, False

WScript.Sleep 1200

' Launch as Standalone Desktop App Window
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edgePath) Then
    edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If

If fso.FileExists(edgePath) Then
    sh.Run """" & edgePath & """ --app=""http://localhost:3000"" --window-size=1440,900 --no-first-run", 1, False
Else
    sh.Run "http://localhost:3000", 1, False
End If
