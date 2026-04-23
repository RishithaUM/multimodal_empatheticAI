#!/usr/bin/env python3
"""
Download all face-api models - Try multiple file name variations
"""

import os
import urllib.request
import ssl
from pathlib import Path

def download(url, filepath, silent=False):
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ssl_context, timeout=20) as r:
            data = r.read()
            if len(data) > 50:
                Path(filepath).parent.mkdir(parents=True, exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(data)
                if not silent:
                    print(f"✓ {os.path.basename(filepath)} ({len(data):,} bytes)")
                return True
    except:
        pass
    return False

models_dir = Path("public/models")
models_dir.mkdir(parents=True, exist_ok=True)

print("\n=== DOWNLOADING FACE-API MODELS ===\n")

base = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model"

# Try different naming variations
attempts = [
    # Manifest files
    ("tiny_face_detector_model-weights_manifest.json", "tiny_face_detector_model-weights_manifest.json"),
    ("face_expression_model-weights_manifest.json", "face_expression_model-weights_manifest.json"),
    
    # Binary weights - try multiple variations
    ("tiny_face_detector_model-weights.weights.bin", "tiny_face_detector_model-weights.weights.bin"),
    ("tinyFaceDetector_model-weights.weights.bin", "tinyFaceDetector_model-weights.weights.bin"),
    ("tiny_face_detector_model-weights.bin", "tiny_face_detector_model-weights.weights.bin"),
    ("tinyFaceDetector_weights.bin", "tiny_face_detector_model-weights.weights.bin"),
    
    ("face_expression_model-weights.weights.bin", "face_expression_model-weights.weights.bin"),
    ("faceExpressionNet_model-weights.weights.bin", "face_expression_model-weights.weights.bin"),
    ("face_expression_model-weights.bin", "face_expression_model-weights.weights.bin"),
    ("faceExpressionNet_weights.bin", "face_expression_model-weights.weights.bin"),
]

success = 0
for src, dst in attempts:
    url = f"{base}/{src}"
    filepath = models_dir / dst
    
    # Skip if already exists
    if filepath.exists() and filepath.stat().st_size > 100:
        continue
    
    if download(url, str(filepath)):
        success += 1

print("\n=== RESULT ===\n")
print(f"Downloaded: {success} files\n")

# List all files
print("📁 Files in public/models/:")
for f in sorted(models_dir.glob('*')):
    size = f.stat().st_size
    status = "✓" if size > 100 else "⚠️"
    print(f"  {status} {f.name} ({size:,} bytes)")

print()
