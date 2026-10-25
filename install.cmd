@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.12 ou superior e necessario. Instale-o antes de continuar.
  exit /b 1
)
node "%~dp0scripts\install.mjs" %*
exit /b %ERRORLEVEL%
