$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $env:LOCAL_CALENDAR_ROOT_DIR) {
  $env:LOCAL_CALENDAR_ROOT_DIR = Join-Path $env:TEMP 'Samuel Studio'
}

$env:LOCAL_CALENDAR_HOST = '0.0.0.0'

function Get-NodePath {
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    return $nodeCommand.Source
  }

  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    return $nodeCommand.Source
  }

  throw 'Node.js was not found on PATH. Install Node or add it to PATH before starting the local calendar.'
}

$nodePath = Get-NodePath
$tailscaleIp = $null
try {
  $tailscaleIp = (& tailscale ip -4 2>$null | Select-Object -First 1).Trim()
} catch {
  $tailscaleIp = $null
}

if ($tailscaleIp) {
  $launchHost = $tailscaleIp
} else {
  $launchHost = '127.0.0.1'
}

$launchUrl = "http://${launchHost}:8790/?site=all"
$launchUrlPath = Join-Path $repoRoot 'local-calendar.launch-url'
Set-Content -Path $launchUrlPath -Value $launchUrl -Encoding ASCII

function Get-LocalCalendarListenerPids {
  $pids = foreach ($line in (netstat -ano)) {
    if ($line -match '^\s*TCP\s+\S+:8790\s+\S+\s+LISTENING\s+(\d+)\s*$') {
      [int]$matches[1]
    }
  }

  @($pids | Select-Object -Unique)
}

foreach ($listenerPid in (Get-LocalCalendarListenerPids)) {
  try {
    Stop-Process -Id $listenerPid -Force -ErrorAction Stop
  } catch {
    & taskkill /F /T /PID $listenerPid | Out-Null
  }
}

$logPath = Join-Path $repoRoot 'local-calendar.log'
$errorLogPath = Join-Path $repoRoot 'local-calendar.error.log'
if (Test-Path $logPath) {
  Remove-Item $logPath -Force
}
if (Test-Path $errorLogPath) {
  Remove-Item $errorLogPath -Force
}

Start-Process -WindowStyle Hidden -FilePath $nodePath -ArgumentList @(
  'server\local-calendar-server.js'
) -WorkingDirectory $repoRoot -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath | Out-Null

for ($i = 0; $i -lt 10; $i++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8790/health' -TimeoutSec 2
    if ($response.StatusCode -ge 200) {
      Write-Host "Local calendar server launch requested at $launchUrl."
      exit 0
    }
  } catch {
  }

  Start-Sleep -Seconds 1
}

Write-Error 'Local calendar server did not become ready. Check local-calendar.log and local-calendar.error.log for details.'
exit 1
