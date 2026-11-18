# Local development launcher: binds exclusively to 127.0.0.1.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:BTI_LOCAL_MODE = '1'
Remove-Item Env:BTI_ACCESS_TOKEN -ErrorAction SilentlyContinue
if (-not $env:OPENAI_API_KEY) {
    $secret = Read-Host 'Optional: enter OpenAI API key to enable five agents; press Enter to skip (input hidden)' -AsSecureString
    $env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
}
if (-not $env:OPENAI_API_KEY) { Write-Host 'No API key supplied. The evidence discovery and curated graph will work; paid AI agents will be unavailable.' }
Write-Host 'Starting Bacterial Therapeutics Intelligence locally at http://127.0.0.1:8015'
Write-Host 'Keep this window open. Press Ctrl+C to stop. No BTI access token needed in local mode.'
Start-Process 'http://127.0.0.1:8015'
py -m uvicorn backend.main:app --host 127.0.0.1 --port 8015
