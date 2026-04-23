/**
 * Download face-api.js models locally
 * Run: node download-models.js
 * This will download all required model files to ./public/models/
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, 'public', 'models');

// Ensure directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`✅ Created directory: ${MODELS_DIR}`);
}

// List of model files to download
const MODEL_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-weights.weights.bin',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-weights.weights.bin',
];

const BASE_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/models';

/**
 * Download a file from URL
 */
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(filePath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete incomplete file
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete incomplete file
      reject(err);
    });
  });
}

/**
 * Download all models
 */
async function downloadAllModels() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📥 DOWNLOADING FACE-API MODELS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    for (const file of MODEL_FILES) {
      const url = `${BASE_URL}/${file}`;
      const filePath = path.join(MODELS_DIR, file);

      // Skip if already exists
      if (fs.existsSync(filePath)) {
        console.log(`⏭️  Already exists: ${file}`);
        continue;
      }

      console.log(`📥 Downloading: ${file}...`);
      await downloadFile(url, filePath);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ ALL MODELS DOWNLOADED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📁 Models location: ./public/models/');
    console.log('\nModels are now ready for local use.');
    console.log('The app will use: /models/ (local) instead of CDN\n');
  } catch (error) {
    console.error('\n❌ ERROR downloading models:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run download
downloadAllModels();
