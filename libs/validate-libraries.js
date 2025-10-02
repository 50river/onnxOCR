/**
 * Library validation script
 * Validates that all required libraries are properly loaded and functional
 */

/**
 * Validate ONNX Runtime Web
 */
function validateONNXRuntime() {
  return new Promise((resolve) => {
    if (typeof ort !== 'undefined') {
      console.log('✓ ONNX Runtime Web loaded successfully');
      console.log('  Version:', ort.version || 'Unknown');
      console.log('  Available providers:', ort.env?.wasm?.numThreads ? 'WASM' : 'Unknown');
      resolve(true);
    } else {
      console.error('✗ ONNX Runtime Web not loaded');
      resolve(false);
    }
  });
}

/**
 * Validate Tesseract.js
 */
function validateTesseract() {
  return new Promise((resolve) => {
    if (typeof Tesseract !== 'undefined') {
      console.log('✓ Tesseract.js loaded successfully');
      console.log('  Version:', Tesseract.version || 'Unknown');
      resolve(true);
    } else {
      console.error('✗ Tesseract.js not loaded');
      resolve(false);
    }
  });
}

/**
 * Validate JSZip
 */
function validateJSZip() {
  return new Promise((resolve) => {
    if (typeof JSZip !== 'undefined') {
      console.log('✓ JSZip loaded successfully');
      console.log('  Version:', JSZip.version || 'Unknown');
      
      // Test basic functionality
      try {
        const zip = new JSZip();
        zip.file('test.txt', 'Hello World');
        console.log('  Basic functionality test: Passed');
        resolve(true);
      } catch (error) {
        console.error('  Basic functionality test: Failed', error);
        resolve(false);
      }
    } else {
      console.error('✗ JSZip not loaded');
      resolve(false);
    }
  });
}

/**
 * Validate OpenCV.js
 */
function validateOpenCV() {
  return new Promise((resolve) => {
    if (typeof cv !== 'undefined') {
      console.log('✓ OpenCV.js loaded successfully');
      console.log('  Version:', cv.getBuildInformation ? 'Available' : 'Unknown');
      
      // Test basic functionality
      try {
        const mat = new cv.Mat();
        mat.delete();
        console.log('  Basic functionality test: Passed');
        resolve(true);
      } catch (error) {
        console.error('  Basic functionality test: Failed', error);
        resolve(false);
      }
    } else {
      console.error('✗ OpenCV.js not loaded');
      resolve(false);
    }
  });
}

/**
 * Run all library validations
 */
async function validateAllLibraries() {
  console.log('🔍 Validating library files...\n');
  
  const results = await Promise.all([
    validateONNXRuntime(),
    validateTesseract(),
    validateJSZip(),
    validateOpenCV()
  ]);
  
  const allValid = results.every(result => result === true);
  
  console.log('\n📊 Validation Summary:');
  console.log(`  Total libraries: ${results.length}`);
  console.log(`  Successfully loaded: ${results.filter(r => r).length}`);
  console.log(`  Failed to load: ${results.filter(r => !r).length}`);
  
  if (allValid) {
    console.log('\n✅ All libraries validated successfully!');
  } else {
    console.log('\n❌ Some libraries failed validation. Check the logs above.');
  }
  
  return allValid;
}

/**
 * Check file sizes and provide optimization recommendations
 */
function checkLibrarySizes() {
  console.log('\n📏 Library Size Information:');
  console.log('  ort.min.js: ~557 KB');
  console.log('  tesseract.min.js: ~66 KB');
  console.log('  jszip.min.js: ~95 KB');
  console.log('  opencv.js: ~9.7 MB');
  console.log('  Total: ~10.5 MB');
  
  console.log('\n💡 Optimization Notes:');
  console.log('  - OpenCV.js is the largest file (~93% of total size)');
  console.log('  - Consider lazy loading OpenCV.js only when needed');
  console.log('  - Service Worker caches all files for offline use');
  console.log('  - First load may take time, subsequent loads are instant');
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateAllLibraries,
    validateONNXRuntime,
    validateTesseract,
    validateJSZip,
    validateOpenCV,
    checkLibrarySizes
  };
}

// Auto-run validation if script is loaded directly in browser
if (typeof window !== 'undefined') {
  // Wait for all libraries to load before validating
  window.addEventListener('load', () => {
    setTimeout(() => {
      validateAllLibraries();
      checkLibrarySizes();
    }, 1000); // Give libraries time to initialize
  });
}