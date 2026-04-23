#!/usr/bin/env python3
"""
Download face-api.js model files to local storage
Uses multiple CDN sources for reliability
"""

import os
import urllib.request
import urllib.error
import ssl

def download_models():
    models_dir = os.path.join("public", "models")
    os.makedirs(models_dir, exist_ok=True)
    
    print("\n" + "="*70)
    print("📥 DOWNLOADING FACE-API MODELS")
    print("="*70 + "\n")
    
    # Model files we need
    files_to_download = [
        "tiny_face_detector_model-weights_manifest.json",
        "tiny_face_detector_model-weights.weights.bin",
        "face_expression_model-weights_manifest.json",
        "face_expression_model-weights.weights.bin",
    ]
    
    # CDN URLs to try (in order of preference)
    cdn_urls = [
        "https://unpkg.com/face-api.js@0.22.2/dist/models",
        "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/models",
    ]
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    downloaded_count = 0
    
    for filename in files_to_download:
        filepath = os.path.join(models_dir, filename)
        
        # Skip if already exists
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            size = os.path.getsize(filepath)
            print(f"✓ {filename} ({size:,} bytes)")
            downloaded_count += 1
            continue
        
        print(f"↓ {filename}...", end=" ", flush=True)
        
        downloaded = False
        for base_url in cdn_urls:
            if downloaded:
                break
                
            url = f"{base_url}/{filename}"
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
                    content = response.read()
                    if len(content) > 100:  # Models should be > 100 bytes
                        with open(filepath, 'wb') as f:
                            f.write(content)
                        size = len(content)
                        print(f"✓ ({size:,} bytes)")
                        downloaded = True
                        downloaded_count += 1
            except (urllib.error.HTTPError, urllib.error.URLError, OSError):
                continue
        
        if not downloaded:
            print("✗ Not found on CDN")
    
    print("\n" + "="*70)
    print(f"📊 Downloaded: {downloaded_count}/{len(files_to_download)} files")
    print("="*70)
    
    if downloaded_count > 0:
        print(f"\n✅ Models saved to: public/models/")
    else:
        print("\n⚠️  Models not found on CDN")
        print("App will use CDN at runtime with automatic fallback\n")
    
    return downloaded_count > 0

if __name__ == "__main__":
    try:
        download_models()
    except Exception as e:
        print(f"\n❌ Error: {e}")

