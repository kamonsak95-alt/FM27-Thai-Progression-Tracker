Option Explicit
Dim sh, fso, launcher
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
launcher = fso.GetParentFolderName(WScript.ScriptFullName) & "\bin\FM27-Tracker.exe"
If Not fso.FileExists(launcher) Then
    MsgBox "FM27 Tracker launcher is missing. Extract the full Windows ZIP or run Setup again.", vbCritical, "FM27 Tracker"
    WScript.Quit 1
End If
sh.Run """" & launcher & """", 1, False
