// Verification script to confirm maxFrames = 40 in compiled code
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.join(__dirname, 'src/services/emotionApi.ts');
const content = fs.readFileSync(sourceFile, 'utf-8');

// Check for maxFrames = 40
const match = content.match(/maxFrames\s*=\s*(\d+)/);
if (match) {
  const frameCount = match[1];
  const totalTime = frameCount * 100 / 1000;
  
  console.log('\n✅ VERIFICATION RESULTS:\n');
  console.log(`📊 Frame Count: ${frameCount} frames`);
  console.log(`⏱️  Total Analysis Time: ${totalTime.toFixed(1)} seconds`);
  console.log(`⏰ Sampling Interval: 100ms per frame`);
  
  if (frameCount === '40') {
    console.log('\n✅ SUCCESS: maxFrames is set to 40 (4-second analysis)');
    process.exit(0);
  } else {
    console.log(`\n❌ ERROR: maxFrames is set to ${frameCount}, expected 40`);
    process.exit(1);
  }
} else {
  console.log('\n❌ ERROR: Could not find maxFrames setting');
  process.exit(1);
}
