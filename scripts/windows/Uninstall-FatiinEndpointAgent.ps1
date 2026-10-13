$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Open PowerShell as Administrator, then run this uninstaller again."
}

$confirmation = Read-Host "Type REMOVE to remove the Fatiin agent and its local token/configuration"
if ($confirmation -cne "REMOVE") {
  Write-Host "Uninstall cancelled."
  exit 0
}

$taskName = "Fatiin Endpoint Agent"
$installRoot = Join-Path $env:ProgramData "FatiinEndpointAgent"
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $installRoot) {
  & icacls.exe $installRoot /grant:r '*S-1-5-32-544:(OI)(CI)F' /T /C | Out-Null
  Remove-Item -LiteralPath $installRoot -Recurse -Force
}
Write-Host "Fatiin endpoint agent and its local token/configuration were removed."
