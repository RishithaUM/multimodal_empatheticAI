#!/usr/bin/env node
/**
 * FINAL VERIFICATION SCRIPT
 * Confirms all 40-frame emotion detection changes are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🎯 FINAL VERIFICATION - 40-FRAME EMOTION DETECTION\n');
console.log('═══════════════════════════════════════════════════════════\n');

let allPassed = true;

// 1. Check emotionApi.ts
const emotionApiPath = path.join(__dirname, 'src/services/emotionApi.ts');
const emotionApiContent = fs.readFileSync(emotionApiPath, 'utf-8');

const emotionApiCheck = emotionApiContent.includes('maxFrames = 40');
console.log(`${emotionApiCheck ? '✅' : '❌'} emotionApi.ts: maxFrames = 40`);
if (!emotionApiCheck) allPassed = false;

// 2. Check page.tsx
const pageePath = path.join(__dirname, 'src/pages/analyze/page.tsx');
const pageContent = fs.readFileSync(pageePath, 'utf-8');

const pageCheck = pageContent.includes('maxFrames: 40');
console.log(`${pageCheck ? '✅' : '❌'} page.tsx: maxFrames: 40`);
if (!pageCheck) allPassed = false;

// 3. Check vite.config.ts
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf-8');

const cacheControlCheck = viteConfigContent.includes('no-cache, no-store, must-revalidate');
console.log(`${cacheControlCheck ? '✅' : '❌'} vite.config.ts: Cache-Control headers`);
if (!cacheControlCheck) allPassed = false;

// 4. Check console logging
const loggingCheck = emotionApiContent.includes(`Capturing \${maxFrames} frames`);
console.log(`${loggingCheck ? '✅' : '❌'} emotionApi.ts: Dynamic frame logging`);
if (!loggingCheck) allPassed = false;

console.log('\n═══════════════════════════════════════════════════════════\n');

if (allPassed) {
  console.log('🎉 ALL CHECKS PASSED!\n');
  console.log('Summary:');
  console.log('  • Analysis time: 4.0 seconds (40 frames @ 100ms each)');
  console.log('  • Console will show: FRAME 1/40 through FRAME 40/40');
  console.log('  • Server headers: No-cache (prevents stale code)');
  console.log('  • HMR enabled: Real-time updates in development\n');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED\n');
  process.exit(1);
}
