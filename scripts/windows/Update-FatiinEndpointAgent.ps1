$ErrorActionPreference = "Stop"

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Open PowerShell as Administrator, then run this update again."
  }
}

function Set-AgentFilePermissions([string]$Path) {
  $security = Get-Acl -LiteralPath $Path
  $security.SetSecurityDescriptorSddlForm("O:BA G:BA D:P(A;;FA;;;BA)(A;;FA;;;SY)")
  Set-Acl -LiteralPath $Path -AclObject $security
}

Assert-Administrator

$sourcePath = Join-Path $PSScriptRoot "FatiinEndpointAgent.ps1"
$installRoot = Join-Path $env:ProgramData "FatiinEndpointAgent"
$installedPath = Join-Path $installRoot "FatiinEndpointAgent.ps1"
$taskName = "Fatiin Endpoint Agent"

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "FatiinEndpointAgent.ps1 must be in the same folder as this updater."
}
if (-not (Test-Path -LiteralPath $installRoot)) {
  throw "The Fatiin agent is not installed at $installRoot. Run the installer first."
}
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $task) { throw "The Fatiin Endpoint Agent scheduled task was not found." }

if ($task.State -eq "Running") {
  Stop-ScheduledTask -TaskName $taskName
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    $task = Get-ScheduledTask -TaskName $taskName
    if ($task.State -ne "Running") { break }
  }
  if ($task.State -eq "Running") { throw "The agent did not stop. Try again after restarting Windows." }
}

Copy-Item -LiteralPath $sourcePath -Destination $installedPath -Force
Set-AgentFilePermissions $installedPath
Start-ScheduledTask -TaskName $taskName

Write-Host "Fatiin Endpoint Agent updated. The existing device ID and token were kept."
Write-Host "Check Staff > Monitoring after the next heartbeat, which can take up to five minutes."
