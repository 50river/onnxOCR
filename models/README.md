# ONNX Models Directory

This directory contains the ONNX model files required for the receipt OCR application. Currently, placeholder files are provided that need to be replaced with actual trained models.

## Required Model Files

### 1. text_det.onnx - Text Detection Model
- **Purpose**: Detects text regions in receipt images
- **Architecture**: DBNet, EAST, or similar text detection model
- **Input**: RGB image [1, 3, height, width]
- **Output**: Text region probability maps
- **Expected Size**: 10-50MB
- **Requirements**:
  - Compatible with ONNX Runtime Web
  - Optimized for mobile browsers
  - Supports variable input sizes

### 2. text_rec_jp.onnx - Japanese Text Recognition Model
- **Purpose**: Recognizes Japanese text from detected regions
- **Architecture**: CRNN, Transformer, or similar sequence-to-sequence model
- **Input**: Normalized text line image [1, 3, 32, width]
- **Output**: Character sequence probabilities [sequence_length, num_classes]
- **Expected Size**: 20-100MB
- **Requirements**:
  - Trained on Japanese text (hiragana, katakana, kanji)
  - Compatible with charset_jp.txt character set
  - Optimized for ONNX Runtime Web

### 3. text_angle.onnx - Text Angle Classification Model
- **Purpose**: Classifies text orientation (0°, 90°, 180°, 270°)
- **Architecture**: CNN classifier
- **Input**: Text region image [1, 3, height, width]
- **Output**: 4-class probability distribution [1, 4]
- **Expected Size**: 1-10MB
- **Requirements**:
  - 4-class output for angle classification
  - Compatible with ONNX Runtime Web

### 4. charset_jp.txt - Japanese Character Set
- **Purpose**: Maps model output indices to characters
- **Format**: One character per line
- **Content**: Numbers, Latin letters, hiragana, katakana, common kanji, symbols
- **Requirements**:
  - Character order must match model training
  - Includes all characters the model can recognize

## How to Obtain Actual Models

### Option 1: Use Pre-trained Models
1. Download compatible ONNX models from:
   - PaddleOCR ONNX exports
   - EasyOCR ONNX conversions
   - TrOCR models converted to ONNX
   - Custom trained models from research papers

2. Ensure models are optimized for ONNX Runtime Web:
   ```bash
   # Example optimization command
   python -m onnxruntime.tools.convert_onnx_models_to_ort \
     --input_dir ./models \
     --output_dir ./models_optimized \
     --optimization_level all
   ```

### Option 2: Train Custom Models
1. **Text Detection Model**:
   - Use datasets like ICDAR, COCO-Text, or custom receipt datasets
   - Train DBNet, EAST, or similar architecture
   - Convert to ONNX format
   - Test with ONNX Runtime Web

2. **Text Recognition Model**:
   - Use Japanese text datasets (receipt-specific if available)
   - Train CRNN or Transformer model
   - Ensure character set matches charset_jp.txt
   - Convert to ONNX format

3. **Angle Classification Model**:
   - Create dataset with rotated text images
   - Train simple CNN classifier
   - Convert to ONNX format

### Option 3: Use Existing OCR Services (Development Only)
For development and testing purposes, you can:
1. Use the Tesseract.js fallback (already implemented)
2. Mock the ONNX models with dummy outputs
3. Use cloud OCR APIs temporarily (note: this breaks offline functionality)

## Model Validation

Before deploying models, validate them using the test suite:

```bash
# Run OCR engine initialization tests
open test/ocr-engine-initialization-test-runner.html

# Run OCR pipeline tests
open test/ocr-pipeline-test-runner.html

# Run E2E tests with actual receipt images
open test/e2e-test-runner.html
```

## Performance Considerations

- **Model Size**: Keep total model size under 100MB for reasonable download times
- **Inference Speed**: Target <10 seconds for full OCR pipeline on mobile devices
- **Memory Usage**: Monitor memory consumption, especially on mobile browsers
- **Backend Selection**: Models should work with WebGPU, WebGL, and WASM backends

## Security Notes

- Models are cached locally by the service worker
- No external network requests are made during inference
- Models should be served over HTTPS in production
- Consider model integrity verification (checksums)

## Troubleshooting

### Common Issues:
1. **Model Loading Fails**: Check file paths and CORS headers
2. **Inference Errors**: Verify input/output shapes match expectations
3. **Performance Issues**: Try different ONNX Runtime backends
4. **Memory Errors**: Reduce model size or implement batch processing

### Debug Steps:
1. Check browser console for detailed error messages
2. Verify model files are accessible via network tab
3. Test with different browsers and devices
4. Use ONNX Runtime Web debugging tools

## Development Workflow

1. Replace placeholder files with actual models
2. Update charset_jp.txt if needed
3. Test model loading and inference
4. Validate OCR accuracy with test images
5. Optimize performance for target devices
6. Update service worker cache if model files change

## File Structure
```
models/
├── README.md                 # This file
├── text_det.onnx            # Text detection model
├── text_rec_jp.onnx         # Japanese text recognition model
├── text_angle.onnx          # Angle classification model
└── charset_jp.txt           # Japanese character set
```