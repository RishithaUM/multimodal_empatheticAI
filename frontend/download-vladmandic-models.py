#!/usr/bin/env python3
"""
Download face-api models from vladmandic/face-api GitHub repo
This is the source where face-api.js gets its models
"""

import os
import urllib.request
import ssl
from pathlib import Path

def download(url, filepath):
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        print(f"Downloading: {os.path.basename(filepath)}")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ssl_context, timeout=30) as r:
            data = r.read()
            if len(data) > 100:
                Path(filepath).parent.mkdir(parents=True, exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(data)
                print(f"✓ {os.path.basename(filepath)} ({len(data):,} bytes)\n")
                return True
    except Exception as e:
        print(f"✗ {e}\n")
    return False

models_dir = Path("public/models")
models_dir.mkdir(parents=True, exist_ok=True)

print("\n=== DOWNLOADING FROM VLADMANDIC/FACE-API (OFFICIAL SOURCE) ===\n")

# Official face-api models from vladmandic repo
base = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model"

files = [
    ("tiny_face_detector_model-weights_manifest.json", "tiny_face_detector_model-weights_manifest.json"),
    ("tiny_face_detector_model-weights.weights.bin", "tiny_face_detector_model-weights.weights.bin"),
    ("face_expression_model-weights_manifest.json", "face_expression_model-weights_manifest.json"),
    ("face_expression_model-weights.weights.bin", "face_expression_model-weights.weights.bin"),
]

success = 0
for src, dst in files:
    url = f"{base}/{src}"
    filepath = models_dir / dst
    if download(url, str(filepath)):
        success += 1

print(f"Result: {success}/4 files\n")
