$ErrorActionPreference = "Stop"
$ReaderRoot = Join-Path $PSScriptRoot "tools\local-booking-ocr"
$ReaderPython = Join-Path $ReaderRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $ReaderPython)) {
  exit 1
}

$env:AIRA_UPLOAD_FOLDER = Join-Path $env:USERPROFILE "Documents\Codex\AIRA Sales Management\Uploads"
while ($true) {
  & $ReaderPython -m uvicorn server:app --app-dir $ReaderRoot --host 127.0.0.1 --port 8765
  Start-Sleep -Seconds 3
}
