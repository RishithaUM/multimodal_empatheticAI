# Download face-api.js models
$dir = ".\public\models"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

$url = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/models"
$files = "tiny_face_detector_model-weights_manifest.json","tiny_face_detector_model-weights.weights.bin","face_expression_model-weights_manifest.json","face_expression_model-weights.weights.bin"

foreach ($f in $files) {
    $path = "$dir\$f"
    if (Test-Path $path) { 
        Write-Host "OK: $f"
    } else {
        Write-Host "Downloading: $f"
        $uri = "$url/$f"
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $uri -OutFile $path -UseBasicParsing
        Write-Host "Done: $f"
    }
}

Write-Host "All models ready in public/models"
