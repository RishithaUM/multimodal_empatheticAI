#!/usr/bin/env python3
"""
Download face-api.js model files - Try all possible sources and methods
"""

import os
import urllib.request
import urllib.error
import ssl
import shutil
from pathlib import Path

def setup_ssl():
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context

def try_download(url, filepath):
    """Try to download a file"""
    try:
        ssl_context = setup_ssl()
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ssl_context, timeout=20) as response:
            content = response.read()
            if len(content) > 100:
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(content)
                return True
    except:
        pass
    return False

def main():
    models_dir = Path("public") / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "="*70)
    print("📥 DOWNLOADING FACE-API.JS MODELS TO PUBLIC/MODELS")
    print("="*70 + "\n")
    
    files_to_download = {
        "tiny_face_detector_model-weights_manifest.json": [],
        "tiny_face_detector_model-weights.weights.bin": [],
        "face_expression_model-weights_manifest.json": [],
        "face_expression_model-weights.weights.bin": [],
    }
    
    # Add multiple URLs for each file
    base_urls = [
        "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/models",
        "https://unpkg.com/face-api.js@0.22.2/dist/models",
        "https://raw.githubusercontent.com/vladmandic/face-api/main/model",
    ]
    
    for filename in files_to_download:
        for base_url in base_urls:
            files_to_download[filename].append(f"{base_url}/{filename}")
    
    success_count = 0
    
    for filename, urls in files_to_download.items():
        filepath = models_dir / filename
        
        if filepath.exists() and filepath.stat().st_size > 100:
            print(f"✓ {filename} (exists)")
            success_count += 1
            continue
        
        print(f"↓ {filename}")
        downloaded = False
        
        for url in urls:
            if try_download(url, str(filepath)):
                size = filepath.stat().st_size
                print(f"  ✓ Downloaded from {url.split('/')[2]} ({size:,} bytes)")
                success_count += 1
                downloaded = True
                break
        
        if not downloaded:
            print(f"  ✗ Failed to download from all sources")
    
    print("\n" + "="*70)
    print(f"Result: {success_count}/4 files downloaded")
    print("="*70 + "\n")
    
    # List files
    if list(models_dir.glob('*')):
        print("📁 Files in public/models/:")
        for f in sorted(models_dir.glob('*')):
            size = f.stat().st_size
            print(f"  {f.name} ({size:,} bytes)")
    
    print()

if __name__ == "__main__":
    main()
