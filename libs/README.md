# Library Files

This directory contains the required JavaScript libraries for the receipt OCR application.

## Included Libraries

### ONNX Runtime Web (ort.min.js)
- **Version**: 1.16.3
- **Size**: ~557 KB
- **Purpose**: Runs ONNX models in the browser for text detection and recognition
- **Source**: https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js
- **Requirements**: 7.2, 8.4

### Tesseract.js (tesseract.min.js)
- **Version**: 4.1.4
- **Size**: ~66 KB
- **Purpose**: Fallback OCR engine when ONNX Runtime fails
- **Source**: https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js
- **Requirements**: 8.4

### JSZip (jszip.min.js)
- **Version**: 3.10.1
- **Size**: ~95 KB
- **Purpose**: Creates ZIP files for exporting images with extracted data
- **Source**: https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
- **Requirements**: 5.2

### OpenCV.js (opencv.js)
- **Version**: 4.8.0
- **Size**: ~9.7 MB
- **Purpose**: Image processing (EXIF correction, perspective correction, preprocessing)
- **Source**: https://docs.opencv.org/4.8.0/opencv.js
- **Requirements**: 1.3, 1.4

## Usage

These libraries are loaded by the main application and cached by the service worker for offline operation. The service worker preloads all files in the `libs/` directory to ensure complete offline functionality.

## Updating Libraries

To update the libraries to newer versions:

1. Edit the URLs in `download-libraries.js`
2. Delete the existing library files
3. Run `node download-libraries.js` to download the updated versions
4. Update version information in this README

## File Integrity

All library files are downloaded from official CDN sources. For production use, consider:

- Verifying file integrity with checksums
- Using Subresource Integrity (SRI) hashes in HTML
- Hosting libraries locally for better security control