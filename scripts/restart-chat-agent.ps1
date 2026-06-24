$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $env:CHAT_AGENT_LOG_DIR) {
  $env:CHAT_AGENT_LOG_DIR = Join-Path $env:TEMP 'Samuel Studio'
}

if (-not $env:LOCAL_CALENDAR_ROOT_DIR) {
  $env:LOCAL_CALENDAR_ROOT_DIR = Join-Path $env:TEMP 'Samuel Studio'
}

function Get-ChatAgentListenerPids {
  $pids = foreach ($line in (netstat -ano)) {
    if ($line -match '^\s*TCP\s+\S+:8787\s+\S+\s+LISTENING\s+(\d+)\s*$') {
      [int]$matches[1]
    }
  }

  @($pids | Select-Object -Unique)
}

$listenerPids = Get-ChatAgentListenerPids
foreach ($listenerPid in $listenerPids) {
  try {
    Stop-Process -Id $listenerPid -Force -ErrorAction Stop
  } catch {
    & taskkill /F /T /PID $listenerPid | Out-Null
  }
}

for ($i = 0; $i -lt 40; $i++) {
  if (-not (Get-ChatAgentListenerPids)) {
    break
  }

  Start-Sleep -Milliseconds 250
}

$logPath = Join-Path $repoRoot 'chat-agent.log'
$errorLogPath = Join-Path $repoRoot 'chat-agent.error.log'
if (Test-Path $logPath) {
  Remove-Item $logPath -Force
}
if (Test-Path $errorLogPath) {
  Remove-Item $errorLogPath -Force
}

$nodePath = (Get-Command node).Source

Start-Process -WindowStyle Hidden -FilePath $nodePath -ArgumentList @(
  'scripts\start-chat-agent.js'
) -WorkingDirectory $repoRoot | Out-Null

Write-Host 'Waiting for the chat agent to become available...'

$urls = @('http://localhost:8787/health', 'http://127.0.0.1:8787/health')
$readyUrl = $null

for ($i = 0; $i -lt 60 -and -not $readyUrl; $i++) {
  foreach ($url in $urls) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
      if ($response.StatusCode -ge 200) {
        $readyUrl = $url
        break
      }
    } catch {
    }
  }

  if (-not $readyUrl) {
    Start-Sleep -Seconds 1
  }
}

if ($readyUrl) {
  Write-Host "Chat agent is ready at $readyUrl"
  exit 0
}

Write-Host 'The chat agent did not become ready.'
exit 1
