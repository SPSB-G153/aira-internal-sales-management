$ErrorActionPreference = "Stop"
$ReaderRoot = Join-Path $PSScriptRoot "tools\local-booking-ocr"
$RuntimePython = "C:\Users\katherine.chew\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$Python = if (Test-Path -LiteralPath $RuntimePython) { $RuntimePython } else { (Get-Command python -ErrorAction Stop).Source }
$Venv = Join-Path $ReaderRoot ".venv"
$VenvPython = Join-Path $Venv "Scripts\python.exe"

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host "Ollama is required for private handwriting reading. Install it from https://ollama.com/download/windows and run this file again." -ForegroundColor Yellow
  Read-Host "Press Enter to close"
  exit 1
}

if (-not (Test-Path -LiteralPath $VenvPython)) {
  & $Python -m venv $Venv
}
& $VenvPython -m pip install --disable-pip-version-check -r (Join-Path $ReaderRoot "requirements.txt")

$Model = if ($env:BOOKING_OCR_MODEL) { $env:BOOKING_OCR_MODEL } else { "qwen2.5vl:3b" }
$env:BOOKING_FORM_FOLDER = "C:\AIRA Booking"
& ollama pull $Model
Write-Host "Private Booking Form reader is running. Keep this window open while using Upload." -ForegroundColor Green
& $VenvPython -m uvicorn server:app --app-dir $ReaderRoot --host 127.0.0.1 --port 8765
