$ErrorActionPreference = "Stop"

function Read-RequiredValue([string]$Prompt) {
  do { $value = (Read-Host $Prompt).Trim() } while ([string]::IsNullOrWhiteSpace($value))
  return $value
}

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Open PowerShell as Administrator, then run this installer again."
  }
}

function Set-AgentFilePermissions([string]$Path) {
  $security = Get-Acl -LiteralPath $Path
  $security.SetSecurityDescriptorSddlForm("O:BA G:BA D:P(A;;FA;;;BA)(A;;FA;;;SY)")
  Set-Acl -LiteralPath $Path -AclObject $security
}

Assert-Administrator

$AgentSource = Join-Path $PSScriptRoot "FatiinEndpointAgent.ps1"
if (-not (Test-Path -LiteralPath $AgentSource)) {
  throw "FatiinEndpointAgent.ps1 must be in the same folder as this installer."
}

$apiBaseUrl = Read-RequiredValue "Fatiin Helpdesk base URL (for example https://helpdesk.example.com)"
$parsedUrl = $null
if (-not [Uri]::TryCreate($apiBaseUrl, [UriKind]::Absolute, [ref]$parsedUrl)) {
  throw "Enter a valid absolute URL."
}
if ($parsedUrl.Scheme -ne "https" -and -not ($parsedUrl.Scheme -eq "http" -and $parsedUrl.IsLoopback)) {
  throw "Use an HTTPS URL. HTTP is allowed only for localhost testing."
}
if ($parsedUrl.Query -or $parsedUrl.Fragment) { throw "The base URL must not contain a query or fragment." }
$apiBaseUrl = $parsedUrl.AbsoluteUri.TrimEnd("/")

$deviceId = Read-RequiredValue "Device ID from the one-time enrollment screen"
if ($deviceId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
  throw "The device ID does not look like a valid UUID."
}

$secureToken = Read-Host "One-time device token (input is hidden)" -AsSecureString
if ($secureToken.Length -lt 40 -or $secureToken.Length -gt 128) { throw "The token length is invalid." }
$credential = New-Object System.Management.Automation.PSCredential("FatiinDevice", $secureToken)
$plainToken = $credential.GetNetworkCredential().Password

$installRoot = Join-Path $env:ProgramData "FatiinEndpointAgent"
$taskName = "Fatiin Endpoint Agent"
New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
# Lock down the directory before writing the one-time token to disk.
Set-AgentFilePermissions $installRoot
Get-ChildItem -LiteralPath $installRoot -Force -Recurse | ForEach-Object { Set-AgentFilePermissions $_.FullName }

Copy-Item -LiteralPath $AgentSource -Destination (Join-Path $installRoot "FatiinEndpointAgent.ps1") -Force
$config = @{ apiBaseUrl = $apiBaseUrl; deviceId = $deviceId } | ConvertTo-Json -Compress
Set-Content -LiteralPath (Join-Path $installRoot "device.json") -Value $config -Encoding ASCII
Set-Content -LiteralPath (Join-Path $installRoot "device.token") -Value $plainToken -NoNewline -Encoding ASCII
$plainToken = $null
$secureToken.Dispose()

# Protect every installed file so only SYSTEM and local Administrators can read them.
Get-ChildItem -LiteralPath $installRoot -Force -Recurse | ForEach-Object { Set-AgentFilePermissions $_.FullName }

$agentPath = Join-Path $installRoot "FatiinEndpointAgent.ps1"
$powershellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$agentPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Sends basic device health to Fatiin Helpdesk every five minutes." -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Host "Fatiin endpoint agent installed. It runs at startup and sends a heartbeat every five minutes."
Write-Host "Check the device at /staff/monitoring. The first check-in may take up to one minute."
Write-Host "Protected agent files: $installRoot"
