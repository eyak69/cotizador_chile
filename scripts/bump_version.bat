@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0.."

set PACKAGE_JSON=package.json
if not exist "%PACKAGE_JSON%" (
    echo [ERROR] package.json not found in %CD%
    exit /b 1
)

:: Extraer version usando una serie de finds porque no tenemos jq instalado por defecto
for /f "tokens=2 delims=:, " %%a in ('findstr /c:"\"version\":" "%PACKAGE_JSON%"') do (
    set CURRENT_VERSION=%%~a
)

if "%CURRENT_VERSION%"=="" (
    echo [ERROR] Could not extract version
    exit /b 1
)

echo Current Version: %CURRENT_VERSION%

:: Parsear X.Y.Z
for /f "tokens=1,2,3 delims=." %%a in ("%CURRENT_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

:: Incrementar Patch
set /a NEW_PATCH=PATCH+1
set NEW_VERSION=%MAJOR%.%MINOR%.%NEW_PATCH%

echo Bumping to: %NEW_VERSION%

:: Reemplazar en archivo (PowerShell helper porque batch es horrible para esto)
powershell -Command "(gc %PACKAGE_JSON%) -replace '\"version\": \"%CURRENT_VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Out-File -Encoding utf8 %PACKAGE_JSON%"

echo Done.
