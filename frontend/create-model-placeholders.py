#!/usr/bin/env python3
"""
Last resort: Create dummy/minimal model files so app can at least load
Then app will work with CDN fallback, and at least local fallback doesn't fail
"""

import os
import json
from pathlib import Path

models_dir = Path("public/models")
models_dir.mkdir(parents=True, exist_ok=True)

print("\n=== CREATING MINIMAL MODEL FILES ===\n")

# Create minimal manifest files if they don't exist
manifest_files = {
    "tiny_face_detector_model-weights_manifest.json": [
        {
            "weights": [
                {"name": "tinyFaceDetector", "dtype": "float32"}
            ],
            "paths": ["tiny_face_detector_model-weights.weights.bin"]
        }
    ],
    "face_expression_model-weights_manifest.json": [
        {
            "weights": [
                {"name": "faceExpressionNet", "dtype": "float32"}
            ],
            "paths": ["face_expression_model-weights.weights.bin"]
        }
    ]
}

for filename, content in manifest_files.items():
    filepath = models_dir / filename
    if not filepath.exists():
        with open(filepath, 'w') as f:
            json.dump(content, f)
        print(f"Created: {filename}")
    else:
        print(f"Exists: {filename}")

# Create empty weight files (placeholders)
weight_files = [
    "tiny_face_detector_model-weights.weights.bin",
    "face_expression_model-weights.weights.bin",
]

for filename in weight_files:
    filepath = models_dir / filename
    if not filepath.exists() or filepath.stat().st_size == 0:
        with open(filepath, 'wb') as f:
            f.write(b'')
        print(f"Created placeholder: {filename}")

print("\n📁 Files in public/models/:")
for f in sorted(models_dir.glob('*')):
    size = f.stat().st_size
    print(f"  {f.name} ({size:,} bytes)")

print("\n⚠️  NOTE: Weight files are placeholders")
print("App will use CDN for actual model loading\n")
