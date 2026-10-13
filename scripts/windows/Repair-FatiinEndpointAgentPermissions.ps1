$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Open PowerShell as Administrator, then run this repair script again."
}

$installRoot = Join-Path $env:ProgramData "FatiinEndpointAgent"
if (-not (Test-Path -LiteralPath $installRoot)) { throw "The Fatiin agent folder was not found at $installRoot." }

$paths = @($installRoot) + @(
  Get-ChildItem -LiteralPath $installRoot -Force -Recurse | ForEach-Object { $_.FullName }
)
$securityDescriptor = "O:BA G:BA D:P(A;;FA;;;BA)(A;;FA;;;SY)"
foreach ($path in $paths) {
  $security = Get-Acl -LiteralPath $path
  $security.SetSecurityDescriptorSddlForm($securityDescriptor)
  Set-Acl -LiteralPath $path -AclObject $security
}

Write-Host "Agent files now allow access only to local Administrators and SYSTEM."
Write-Host "Permission check for the agent script:"
(Get-Acl -LiteralPath (Join-Path $installRoot "FatiinEndpointAgent.ps1")).Access |
  Format-Table IdentityReference, FileSystemRights, AccessControlType -AutoSize
