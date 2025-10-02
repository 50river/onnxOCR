#!/usr/bin/env node

/**
 * Script to download required library files for the receipt OCR app
 * Downloads ONNX Runtime Web, Tesseract.js, JSZip, and OpenCV.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Library URLs and their target filenames
const libraries = [
  {
    name: 'ONNX Runtime Web',
    url: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js',
    filename: 'ort.min.js'
  },
  {
    name: 'Tesseract.js',
    url: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js',
    filename: 'tesseract.min.js'
  },
  {
    name: 'JSZip',
    url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    filename: 'jszip.min.js'
  },
  {
    name: 'OpenCV.js',
    url: 'https://docs.opencv.org/4.8.0/opencv.js',
    filename: 'opencv.js'
  }
];

/**
 * Download a file from URL to local path
 * @param {string} url - Source URL
 * @param {string} filepath - Target file path
 * @returns {Promise<void>}
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${path.basename(filepath)}...`);
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded ${path.basename(filepath)}`);
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete partial file
          reject(err);
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        file.close();
        fs.unlink(filepath, () => {});
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlink(filepath, () => {});
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

/**
 * Main function to download all libraries
 */
async function downloadLibraries() {
  console.log('Starting library downloads...\n');
  
  const libsDir = path.join(__dirname);
  
  // Ensure libs directory exists
  if (!fs.existsSync(libsDir)) {
    fs.mkdirSync(libsDir, { recursive: true });
  }
  
  try {
    for (const lib of libraries) {
      const filepath = path.join(libsDir, lib.filename);
      
      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`⚠ ${lib.filename} already exists, skipping...`);
        continue;
      }
      
      await downloadFile(lib.url, filepath);
    }
    
    console.log('\n✅ All libraries downloaded successfully!');
    console.log('\nDownloaded files:');
    
    // List downloaded files with sizes
    for (const lib of libraries) {
      const filepath = path.join(libsDir, lib.filename);
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`  - ${lib.filename} (${sizeKB} KB)`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error downloading libraries:', error.message);
    process.exit(1);
  }
}

// Run the download process
if (require.main === module) {
  downloadLibraries();
}

module.exports = { downloadLibraries };