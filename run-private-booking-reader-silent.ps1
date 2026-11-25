$ErrorActionPreference = "Stop"
$ReaderRoot = Join-Path $PSScriptRoot "tools\local-booking-ocr"
$ReaderPython = Join-Path $ReaderRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $ReaderPython)) {
  # Worktrees share the same private reader dependencies. Use an already
  # installed sibling environment while always loading server.py from this
  # active worktree, so an older worktree cannot keep serving stale code.
  $RepositoryRoot = Split-Path -Parent $PSScriptRoot
  $ReaderPython = Get-ChildItem -LiteralPath $RepositoryRoot -Directory -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "tools\local-booking-ocr\.venv\Scripts\python.exe" } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
  if (-not $ReaderPython) { exit 1 }
}

$env:AIRA_UPLOAD_FOLDER = Join-Path $env:USERPROFILE "Documents\Codex\AIRA Sales Management\Uploads"
while ($true) {
  & $ReaderPython -m uvicorn server:app --app-dir $ReaderRoot --host 127.0.0.1 --port 8765
  Start-Sleep -Seconds 3
}
