$ErrorActionPreference = "Stop"

function Check($name, $url) {
  try {
    $res = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5
    Write-Host "✅ $name OK -> $url"
    return $true
  } catch {
    Write-Host "❌ $name FAIL -> $url"
    Write-Host "   $($_.Exception.Message)"
    return $false
  }
}

$ok = $true
$ok = (Check "Chroma heartbeat" "http://127.0.0.1:8000/api/v2/heartbeat") -and $ok
$ok = (Check "RAG service health" "http://127.0.0.1:8001/health") -and $ok
$ok = (Check "Node API health" "http://localhost:5000/health") -and $ok
$ok = (Check "Metrics endpoint" "http://localhost:5000/metrics") -and $ok

if ($ok) {
  Write-Host "`n✅ SYSTEM CHECK PASSED (all services healthy)"
  exit 0
} else {
  Write-Host "`n❌ SYSTEM CHECK FAILED (one or more services unhealthy)"
  exit 1
}# scripts/system-check.ps1
$ErrorActionPreference = "Stop"

# Fix weird emoji encoding in some terminals
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$results = @()

function Check($name, $url) {
  try {
    $res = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5
    Write-Host "✅ $name OK -> $url"
    $script:results += [PSCustomObject]@{ Service = $name; Url = $url; Status = "OK" }
    return $true
  } catch {
    Write-Host "❌ $name FAIL -> $url"
    Write-Host "   $($_.Exception.Message)"
    $script:results += [PSCustomObject]@{ Service = $name; Url = $url; Status = "FAIL" }
    return $false
  }
}

$ok = $true

$ok = (Check "Chroma heartbeat" "http://127.0.0.1:8000/api/v2/heartbeat") -and $ok
$ok = (Check "RAG service health" "http://127.0.0.1:8001/health") -and $ok
$ok = (Check "Node API health" "http://localhost:5000/health") -and $ok
$ok = (Check "Metrics endpoint" "http://localhost:5000/metrics") -and $ok

Write-Host "`n--- Summary ---"
$results | Format-Table -AutoSize

if ($ok) {
  Write-Host "`n✅ SYSTEM CHECK PASSED (all services healthy)"
  exit 0
} else {
  Write-Host "`n❌ SYSTEM CHECK FAILED (one or more services unhealthy)"
  exit 1
}