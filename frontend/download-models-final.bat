@echo off
REM Download face-api.js models directly to public/models folder
setlocal enabledelayedexpansion

set "DIR=public\models"
if not exist "%DIR%" mkdir "%DIR%"

echo.
echo ============================================================
echo DOWNLOADING FACE-API.JS MODELS TO LOCAL FOLDER
echo ============================================================
echo.

REM Download using PowerShell with direct URLs
REM These are the actual model files from unpkg

set "BASE=https://unpkg.com/face-api.js@0.22.2/dist/models"

REM File 1
set "FILE1=tiny_face_detector_model-weights_manifest.json"
set "URL1=%BASE%/tiny_face_detector_model-weights_manifest.json"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%URL1%' -OutFile '%DIR%\%FILE1%' -UseBasicParsing; Write-Host 'Downloaded: %FILE1%' } catch { Write-Host 'Failed to download: %FILE1%' }"

REM File 2
set "FILE2=tiny_face_detector_model-weights.weights.bin"
set "URL2=%BASE%/tiny_face_detector_model-weights.weights.bin"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%URL2%' -OutFile '%DIR%\%FILE2%' -UseBasicParsing; Write-Host 'Downloaded: %FILE2%' } catch { Write-Host 'Failed to download: %FILE2%' }"

REM File 3
set "FILE3=face_expression_model-weights_manifest.json"
set "URL3=%BASE%/face_expression_model-weights_manifest.json"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%URL3%' -OutFile '%DIR%\%FILE3%' -UseBasicParsing; Write-Host 'Downloaded: %FILE3%' } catch { Write-Host 'Failed to download: %FILE3%' }"

REM File 4
set "FILE4=face_expression_model-weights.weights.bin"
set "URL4=%BASE%/face_expression_model-weights.weights.bin"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%URL4%' -OutFile '%DIR%\%FILE4%' -UseBasicParsing; Write-Host 'Downloaded: %FILE4%' } catch { Write-Host 'Failed to download: %FILE4%' }"

echo.
echo ============================================================
echo DOWNLOAD COMPLETE
echo ============================================================
echo.
echo Files saved to: %DIR%\
echo.
dir "%DIR%"
echo.
