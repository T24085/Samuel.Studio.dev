Option Explicit

Dim fso, shell, scriptDir, repoRoot, serverPath, command

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoRoot = fso.GetParentFolderName(scriptDir)
serverPath = repoRoot & "\server\local-calendar-server.js"
command = "node """ & serverPath & """"

shell.Run command, 0, False
