/**
 * Model Validation Script
 * 
 * This script validates that the ONNX model files are properly formatted
 * and compatible with ONNX Runtime Web.
 * 
 * Usage:
 * 1. Place actual ONNX model files in this directory
 * 2. Run this script in a browser environment with ONNX Runtime Web loaded
 * 3. Check console output for validation results
 */

class ModelValidator {
    constructor() {
        this.modelsPath = './';
        this.requiredFiles = [
            'text_det.onnx',
            'text_rec_jp.onnx', 
            'text_angle.onnx',
            'charset_jp.txt'
        ];
    }

    /**
     * Validate all required model files
     */
    async validateAll() {
        console.log('🔍 Starting model validation...');
        
        const results = {
            filesExist: await this.checkFileExistence(),
            charsetValid: await this.validateCharset(),
            modelsValid: await this.validateONNXModels()
        };

        this.printResults(results);
        return results;
    }

    /**
     * Check if all required files exist and are accessible
     */
    async checkFileExistence() {
        const results = {};
        
        for (const filename of this.requiredFiles) {
            try {
                const response = await fetch(this.modelsPath + filename);
                results[filename] = {
                    exists: response.ok,
                    size: response.headers.get('content-length'),
                    contentType: response.headers.get('content-type')
                };
            } catch (error) {
                results[filename] = {
                    exists: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }

    /**
     * Validate the character set file
     */
    async validateCharset() {
        try {
            const response = await fetch(this.modelsPath + 'charset_jp.txt');
            if (!response.ok) {
                return { valid: false, error: 'File not accessible' };
            }

            const text = await response.text();
            const characters = text.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            const validation = {
                valid: true,
                characterCount: characters.length,
                hasNumbers: /[0-9]/.test(text),
                hasHiragana: /[あ-ん]/.test(text),
                hasKatakana: /[ア-ン]/.test(text),
                hasKanji: /[一-龯]/.test(text),
                hasSymbols: /[¥、。]/.test(text)
            };

            // Check for minimum expected character count
            if (characters.length < 100) {
                validation.valid = false;
                validation.warning = 'Character set seems too small for Japanese OCR';
            }

            return validation;
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Validate ONNX model files (basic format check)
     */
    async validateONNXModels() {
        const onnxFiles = this.requiredFiles.filter(f => f.endsWith('.onnx'));
        const results = {};

        for (const filename of onnxFiles) {
            try {
                const response = await fetch(this.modelsPath + filename);
                if (!response.ok) {
                    results[filename] = { valid: false, error: 'File not accessible' };
                    continue;
                }

                const buffer = await response.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);
                
                // Basic ONNX format validation (check magic bytes)
                const isONNX = this.isValidONNXFormat(uint8Array);
                const isPlaceholder = this.isPlaceholderFile(uint8Array);

                results[filename] = {
                    valid: isONNX && !isPlaceholder,
                    size: buffer.byteLength,
                    isPlaceholder: isPlaceholder,
                    formatValid: isONNX
                };

                if (isPlaceholder) {
                    results[filename].warning = 'This is a placeholder file, not an actual ONNX model';
                }

            } catch (error) {
                results[filename] = { valid: false, error: error.message };
            }
        }

        return results;
    }

    /**
     * Check if file has valid ONNX format (simplified check)
     */
    isValidONNXFormat(uint8Array) {
        // ONNX files typically start with protobuf magic bytes
        // This is a simplified check - actual validation would require protobuf parsing
        if (uint8Array.length < 8) return false;
        
        // Check for common ONNX patterns
        const header = Array.from(uint8Array.slice(0, 100))
            .map(b => String.fromCharCode(b))
            .join('');
            
        return header.includes('onnx') || 
               header.includes('ONNX') ||
               uint8Array[0] === 0x08; // Common protobuf start byte
    }

    /**
     * Check if file is a placeholder (text file)
     */
    isPlaceholderFile(uint8Array) {
        // Check if file starts with text characters (placeholder files start with #)
        const firstBytes = Array.from(uint8Array.slice(0, 10))
            .map(b => String.fromCharCode(b))
            .join('');
            
        return firstBytes.startsWith('#') || firstBytes.startsWith('# PLACEHOLDER');
    }

    /**
     * Print validation results to console
     */
    printResults(results) {
        console.log('\n📊 Model Validation Results:');
        console.log('================================');

        // File existence results
        console.log('\n📁 File Existence:');
        for (const [filename, result] of Object.entries(results.filesExist)) {
            const status = result.exists ? '✅' : '❌';
            const size = result.size ? `(${(result.size / 1024 / 1024).toFixed(2)}MB)` : '';
            console.log(`${status} ${filename} ${size}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }

        // Character set validation
        console.log('\n📝 Character Set Validation:');
        const charset = results.charsetValid;
        if (charset.valid) {
            console.log(`✅ charset_jp.txt (${charset.characterCount} characters)`);
            console.log(`   Numbers: ${charset.hasNumbers ? '✅' : '❌'}`);
            console.log(`   Hiragana: ${charset.hasHiragana ? '✅' : '❌'}`);
            console.log(`   Katakana: ${charset.hasKatakana ? '✅' : '❌'}`);
            console.log(`   Kanji: ${charset.hasKanji ? '✅' : '❌'}`);
            console.log(`   Symbols: ${charset.hasSymbols ? '✅' : '❌'}`);
        } else {
            console.log(`❌ charset_jp.txt - ${charset.error || charset.warning}`);
        }

        // ONNX model validation
        console.log('\n🤖 ONNX Model Validation:');
        for (const [filename, result] of Object.entries(results.modelsValid)) {
            const status = result.valid ? '✅' : (result.isPlaceholder ? '⚠️' : '❌');
            const size = result.size ? `(${(result.size / 1024 / 1024).toFixed(2)}MB)` : '';
            console.log(`${status} ${filename} ${size}`);
            
            if (result.warning) {
                console.log(`   Warning: ${result.warning}`);
            }
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }

        // Summary
        const allValid = Object.values(results.modelsValid).every(r => r.valid) && 
                        results.charsetValid.valid;
        
        console.log('\n📋 Summary:');
        if (allValid) {
            console.log('✅ All models are valid and ready for use!');
        } else {
            console.log('⚠️  Some models need attention. See details above.');
            console.log('💡 Tip: Replace placeholder .onnx files with actual trained models.');
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelValidator;
}

// Auto-run validation if script is loaded directly
if (typeof window !== 'undefined') {
    window.ModelValidator = ModelValidator;
    
    // Provide easy validation function
    window.validateModels = async function() {
        const validator = new ModelValidator();
        return await validator.validateAll();
    };
    
    console.log('🔧 Model validation tools loaded.');
    console.log('💡 Run validateModels() to check your model files.');
}