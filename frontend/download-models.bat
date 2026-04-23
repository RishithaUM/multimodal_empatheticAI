@echo off
REM Download face-api.js models from jsdelivr CDN
REM Direct download of model files with proper URLs

setlocal enabledelayedexpansion

set "MODELS_DIR=public\models"
if not exist "%MODELS_DIR%" mkdir "%MODELS_DIR%"

echo Downloading face-api.js models...
echo.

REM Try different CDN URLs for face-api.js models
REM The models are bundled in the npm package

REM Method: Download directly from unpkg CDN which is more reliable
set "CDN_URL=https://unpkg.com/face-api.js@0.22.2/dist/models"

set "FILES[0]=tiny_face_detector_model-weights_manifest.json"
set "FILES[1]=tiny_face_detector_model-weights.weights.bin"
set "FILES[2]=face_expression_model-weights_manifest.json"
set "FILES[3]=face_expression_model-weights.weights.bin"

for /l %%i in (0,1,3) do (
    set "FILE=!FILES[%%i]!"
    set "OUTPUT=%MODELS_DIR%\!FILE!"
    
    if exist "!OUTPUT!" (
        echo [OK] !FILE!
    ) else (
        echo [DL] !FILE!
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%CDN_URL%/!FILE!' -OutFile '!OUTPUT!' -UseBasicParsing" 2>nul
        if !errorlevel! equ 0 (
            echo [OK] !FILE!
        ) else (
            echo [FAIL] !FILE!
        )
    )
)

echo.
echo Done! Models in %MODELS_DIR%\
pause
