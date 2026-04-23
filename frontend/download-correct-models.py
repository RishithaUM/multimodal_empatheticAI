#!/usr/bin/env python3
"""
Download models with CORRECT filenames based on manifest
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
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        print(f"  {os.path.basename(filepath)}...", end=" ", flush=True)
        with urllib.request.urlopen(req, context=ssl_context, timeout=30) as r:
            data = r.read()
            if len(data) > 1000:
                Path(filepath).parent.mkdir(parents=True, exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(data)
                print(f"✓ ({len(data):,} bytes)")
                return True
            else:
                print(f"✗ (too small: {len(data)} bytes)")
    except Exception as e:
        print(f"✗ ({type(e).__name__})")
    return False

models_dir = Path("public/models")
models_dir.mkdir(parents=True, exist_ok=True)

print("\n=== DOWNLOADING WITH CORRECT FILENAMES ===\n")

base = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model"

# Files based on what's in the manifests
files = [
    ("tiny_face_detector_model.bin", "tiny_face_detector_model.bin"),
    ("face_expression_model.bin", "face_expression_model.bin"),
]

success = 0
for src, dst in files:
    url = f"{base}/{src}"
    filepath = models_dir / dst
    
    if filepath.exists() and filepath.stat().st_size > 1000:
        print(f"  {dst} (already exists)")
        success += 1
        continue
    
    if download(url, str(filepath)):
        success += 1

print(f"\n✓ Downloaded: {success}/2 files\n")

# List all
print("📁 Files in public/models/:")
for f in sorted(models_dir.glob('*')):
    size = f.stat().st_size
    status = "✓" if size > 1000 else "✗"
    print(f"  {status} {f.name} ({size:,} bytes)")

print()
