$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$PSScriptRoot\..\LX Music.lnk")
$sc.TargetPath = "$PSScriptRoot\..\node_modules\electron\dist\electron.exe"
$sc.Arguments = "."
$sc.WorkingDirectory = "$PSScriptRoot\.."
$sc.IconLocation = "$PSScriptRoot\..\node_modules\electron\dist\electron.exe,0"
$sc.Description = "LX Music Desktop"
$sc.Save()
Write-Host "Shortcut created! Find LX Music.lnk in the project root folder."
Write-Host "Right-click it -> Pin to taskbar"
