param([switch]$Once)

$ErrorActionPreference = "Stop"
$AgentRoot = Join-Path $env:ProgramData "FatiinEndpointAgent"
$ConfigPath = Join-Path $AgentRoot "device.json"
$TokenPath = Join-Path $AgentRoot "device.token"
$LogPath = Join-Path $AgentRoot "agent.log"
$AgentVersion = "0.1.0"

function Write-AgentLog([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"), $Message
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
}

function Get-Percent([double]$Value) {
  if ([double]::IsNaN($Value) -or [double]::IsInfinity($Value)) { return $null }
  return [Math]::Round([Math]::Max(0, [Math]::Min(100, $Value)), 2)
}

function Send-DeviceHeartbeat {
  if (-not (Test-Path -LiteralPath $ConfigPath) -or -not (Test-Path -LiteralPath $TokenPath)) {
    throw "Device configuration is missing. Run Install-FatiinEndpointAgent.ps1 again."
  }

  $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  $token = (Get-Content -LiteralPath $TokenPath -Raw).Trim()
  if (-not $config.apiBaseUrl -or -not $config.deviceId -or -not $token) {
    throw "Device configuration is incomplete. Run Install-FatiinEndpointAgent.ps1 again."
  }

  $processor = Get-CimInstance -ClassName Win32_Processor | Measure-Object -Property LoadPercentage -Average
  $cpuPercent = if ($null -ne $processor.Average) { Get-Percent ([double]$processor.Average) } else { $null }

  $operatingSystem = Get-CimInstance -ClassName Win32_OperatingSystem
  $totalMemory = [double]$operatingSystem.TotalVisibleMemorySize
  $freeMemory = [double]$operatingSystem.FreePhysicalMemory
  $memoryPercent = if ($totalMemory -gt 0) { Get-Percent ((($totalMemory - $freeMemory) / $totalMemory) * 100) } else { $null }

  $systemDrive = $env:SystemDrive
  $disk = Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DeviceID -eq $systemDrive } | Select-Object -First 1
  $diskPercent = if ($disk -and [double]$disk.Size -gt 0) {
    Get-Percent ((([double]$disk.Size - [double]$disk.FreeSpace) / [double]$disk.Size) * 100)
  } else { $null }

  $payload = @{
    deviceId = [string]$config.deviceId
    hostname = $env:COMPUTERNAME
    operatingSystem = [string]$operatingSystem.Caption
    agentVersion = $AgentVersion
    cpuPercent = $cpuPercent
    memoryPercent = $memoryPercent
    diskPercent = $diskPercent
  } | ConvertTo-Json -Compress

  $baseUrl = ([string]$config.apiBaseUrl).TrimEnd("/")
  $heartbeatUrl = "$baseUrl/api/monitoring/heartbeat"
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $null = Invoke-RestMethod -Method Post -Uri $heartbeatUrl -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $payload -TimeoutSec 20
}

if ($Once) {
  try {
    Send-DeviceHeartbeat
    Write-AgentLog "Heartbeat sent successfully."
    exit 0
  } catch {
    Write-AgentLog "Heartbeat failed. Check network access, enrollment, and server configuration."
    exit 1
  }
}

while ($true) {
  try {
    Send-DeviceHeartbeat
    Write-AgentLog "Heartbeat sent successfully."
  } catch {
    # Do not write the request headers, token, or detailed response to the log.
    Write-AgentLog "Heartbeat failed. Check network access, enrollment, and server configuration."
  }
  Start-Sleep -Seconds 300
}
