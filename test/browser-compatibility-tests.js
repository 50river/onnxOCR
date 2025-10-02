/**
 * ブラウザ互換性テストスイート
 * iOS Safari 16+ / Android Chrome 10+ での動作確認
 */

class BrowserCompatibilityTests {
    constructor() {
        this.results = [];
        this.userAgent = navigator.userAgent;
        this.browserInfo = this.detectBrowser();
        this.features = {};
    }

    /**
     * ブラウザ検出
     */
    detectBrowser() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        let os = 'Unknown';

        // iOS Safari検出
        if (/iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
            browser = 'Safari';
            const match = ua.match(/Version\/(\d+\.\d+)/);
            version = match ? match[1] : 'Unknown';
            os = 'iOS';
        }
        // Android Chrome検出
        else if (/Android/.test(ua) && /Chrome/.test(ua) && !/Edge/.test(ua)) {
            browser = 'Chrome';
            const match = ua.match(/Chrome\/(\d+\.\d+)/);
            version = match ? match[1] : 'Unknown';
            os = 'Android';
        }
        // その他のブラウザ
        else if (/Chrome/.test(ua)) {
            browser = 'Chrome';
            const match = ua.match(/Chrome\/(\d+\.\d+)/);
            version = match ? match[1] : 'Unknown';
            os = navigator.platform;
        }
        else if (/Safari/.test(ua)) {
            browser = 'Safari';
            const match = ua.match(/Version\/(\d+\.\d+)/);
            version = match ? match[1] : 'Unknown';
            os = navigator.platform;
        }

        return { browser, version, os };
    }

    /**
     * 基本的なWeb API互換性テスト
     */
    async testWebAPICompatibility() {
        const tests = [
            {
                name: 'File API',
                test: () => typeof File !== 'undefined' && typeof FileReader !== 'undefined'
            },
            {
                name: 'Canvas API',
                test: () => {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext && canvas.getContext('2d'));
                }
            },
            {
                name: 'Web Workers',
                test: () => typeof Worker !== 'undefined'
            },
            {
                name: 'IndexedDB',
                test: () => 'indexedDB' in window
            },
            {
                name: 'Service Worker',
                test: () => 'serviceWorker' in navigator
            },
            {
                name: 'WebAssembly',
                test: () => typeof WebAssembly !== 'undefined'
            },
            {
                name: 'WebGL',
                test: () => {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                }
            },
            {
                name: 'WebGL2',
                test: () => {
                    const canvas = document.createElement('canvas');
                    return !!canvas.getContext('webgl2');
                }
            },
            {
                name: 'WebGPU',
                test: () => 'gpu' in navigator
            },
            {
                name: 'Camera API',
                test: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
            },
            {
                name: 'Touch Events',
                test: () => 'ontouchstart' in window
            },
            {
                name: 'Pointer Events',
                test: () => 'onpointerdown' in window
            },
            {
                name: 'Intersection Observer',
                test: () => 'IntersectionObserver' in window
            },
            {
                name: 'Resize Observer',
                test: () => 'ResizeObserver' in window
            }
        ];

        for (const test of tests) {
            try {
                const supported = test.test();
                this.features[test.name] = supported;
                this.results.push({
                    category: 'Web API',
                    test: test.name,
                    status: supported ? 'PASS' : 'FAIL',
                    message: supported ? 'サポートされています' : 'サポートされていません'
                });
            } catch (error) {
                this.features[test.name] = false;
                this.results.push({
                    category: 'Web API',
                    test: test.name,
                    status: 'ERROR',
                    message: `エラー: ${error.message}`
                });
            }
        }
    }

    /**
     * PWA機能の互換性テスト
     */
    async testPWACompatibility() {
        const tests = [
            {
                name: 'Manifest Support',
                test: async () => {
                    try {
                        const response = await fetch('/manifest.json');
                        return response.ok;
                    } catch {
                        return false;
                    }
                }
            },
            {
                name: 'Add to Home Screen',
                test: () => {
                    return new Promise((resolve) => {
                        let supported = false;
                        const handler = (e) => {
                            supported = true;
                            e.preventDefault();
                            window.removeEventListener('beforeinstallprompt', handler);
                            resolve(true);
                        };
                        window.addEventListener('beforeinstallprompt', handler);
                        
                        // 2秒後にタイムアウト
                        setTimeout(() => {
                            window.removeEventListener('beforeinstallprompt', handler);
                            resolve(supported);
                        }, 2000);
                    });
                }
            },
            {
                name: 'Offline Support',
                test: async () => {
                    if (!('serviceWorker' in navigator)) return false;
                    
                    try {
                        const registration = await navigator.serviceWorker.getRegistration();
                        return registration && registration.active;
                    } catch {
                        return false;
                    }
                }
            }
        ];

        for (const test of tests) {
            try {
                const supported = await test.test();
                this.results.push({
                    category: 'PWA',
                    test: test.name,
                    status: supported ? 'PASS' : 'FAIL',
                    message: supported ? 'サポートされています' : 'サポートされていません'
                });
            } catch (error) {
                this.results.push({
                    category: 'PWA',
                    test: test.name,
                    status: 'ERROR',
                    message: `エラー: ${error.message}`
                });
            }
        }
    }

    /**
     * OCR関連機能の互換性テスト
     */
    async testOCRCompatibility() {
        const tests = [
            {
                name: 'ONNX Runtime Web',
                test: async () => {
                    try {
                        // ONNX Runtime Webの基本的な読み込みテスト
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js';
                        
                        return new Promise((resolve) => {
                            script.onload = () => {
                                resolve(typeof window.ort !== 'undefined');
                            };
                            script.onerror = () => resolve(false);
                            document.head.appendChild(script);
                            
                            setTimeout(() => resolve(false), 5000);
                        });
                    } catch {
                        return false;
                    }
                }
            },
            {
                name: 'OpenCV.js',
                test: async () => {
                    try {
                        const script = document.createElement('script');
                        script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
                        
                        return new Promise((resolve) => {
                            script.onload = () => {
                                setTimeout(() => {
                                    resolve(typeof window.cv !== 'undefined');
                                }, 1000);
                            };
                            script.onerror = () => resolve(false);
                            document.head.appendChild(script);
                            
                            setTimeout(() => resolve(false), 10000);
                        });
                    } catch {
                        return false;
                    }
                }
            },
            {
                name: 'Image Processing',
                test: () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 100;
                        canvas.height = 100;
                        
                        // ImageDataの作成テスト
                        const imageData = ctx.createImageData(100, 100);
                        return imageData instanceof ImageData;
                    } catch {
                        return false;
                    }
                }
            }
        ];

        for (const test of tests) {
            try {
                const supported = await test.test();
                this.results.push({
                    category: 'OCR',
                    test: test.name,
                    status: supported ? 'PASS' : 'FAIL',
                    message: supported ? 'サポートされています' : 'サポートされていません'
                });
            } catch (error) {
                this.results.push({
                    category: 'OCR',
                    test: test.name,
                    status: 'ERROR',
                    message: `エラー: ${error.message}`
                });
            }
        }
    }

    /**
     * パフォーマンス関連の互換性テスト
     */
    async testPerformanceCompatibility() {
        const tests = [
            {
                name: 'Performance API',
                test: () => 'performance' in window && 'now' in performance
            },
            {
                name: 'Memory Info',
                test: () => 'memory' in performance
            },
            {
                name: 'Navigation Timing',
                test: () => 'getEntriesByType' in performance
            },
            {
                name: 'Resource Timing',
                test: () => {
                    try {
                        const entries = performance.getEntriesByType('resource');
                        return Array.isArray(entries);
                    } catch {
                        return false;
                    }
                }
            }
        ];

        for (const test of tests) {
            try {
                const supported = test.test();
                this.results.push({
                    category: 'Performance',
                    test: test.name,
                    status: supported ? 'PASS' : 'FAIL',
                    message: supported ? 'サポートされています' : 'サポートされていません'
                });
            } catch (error) {
                this.results.push({
                    category: 'Performance',
                    test: test.name,
                    status: 'ERROR',
                    message: `エラー: ${error.message}`
                });
            }
        }
    }

    /**
     * ブラウザ固有の問題をテスト
     */
    async testBrowserSpecificIssues() {
        const { browser, version, os } = this.browserInfo;
        
        // iOS Safari固有のテスト
        if (browser === 'Safari' && os === 'iOS') {
            await this.testIOSSafariIssues();
        }
        
        // Android Chrome固有のテスト
        if (browser === 'Chrome' && os === 'Android') {
            await this.testAndroidChromeIssues();
        }
    }

    /**
     * iOS Safari固有の問題をテスト
     */
    async testIOSSafariIssues() {
        const tests = [
            {
                name: 'iOS Safari - WebGL Context',
                test: () => {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl');
                    if (!gl) return false;
                    
                    // iOS Safariでのコンテキスト制限をテスト
                    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                    return maxTextureSize >= 2048;
                }
            },
            {
                name: 'iOS Safari - File Input',
                test: () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    
                    // captureプロパティがサポートされているかテスト
                    return 'capture' in input;
                }
            },
            {
                name: 'iOS Safari - Viewport Meta',
                test: () => {
                    const viewport = document.querySelector('meta[name="viewport"]');
                    return viewport && viewport.content.includes('user-scalable=no');
                }
            },
            {
                name: 'iOS Safari - Touch Events',
                test: () => {
                    return 'ontouchstart' in window && 'ontouchmove' in window && 'ontouchend' in window;
                }
            }
        ];

        for (const test of tests) {
            try {
                const supported = test.test();
                this.results.push({
                    category: 'iOS Safari',
                    test: test.name,
                    status: supported ? 'PASS' : 'FAIL',
                    message: supported ? '正常に動作します' : '問題が検出されました'
                });
            } catch (error) {
                this.results.push({
                    category: 'iOS Safari',
                    test: test.name,
                    status: 'ERROR',
                    message: `エラー: ${error.message}`
                });
            }
        }
    }

    /**
     * Android Chrome固有の問題をテスト
     */
    async testAndroidChromeIssues() {
        const tests = [
            {
                name: 'Android Chrome - WebGPU',
                test: () => {
                    return 'gpu' in navigator;
                }
            },
            {
                name: 'Android Chrome - File System Access',
                test: () => {
                    return 'showOpenFilePicker' in window;
                }
            },
            {
                name: 'Android Chrome - Memory Pressure',
                test: () => {
                    if ('memory' in performance) {
                        const memory = performance.memory;
                        return memory.jsHeapSizeLimit > 100 * 1024 * 1024; // 100MB以上
                    }
                    return false;
                }
            },
            {
                name: 'Android Chrome - WebAssembly SIMD',
                test: () => {
                    try {
                        return WebAssembly.validate(new Uint8Array([
                            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                            0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
                            0x03, 0x02, 0x01, 0x00,
                            0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x0b
                        ]));
                    } catch {
                        return false;
                    }
                }
            }
        ];

        for (const test of tests) {
            try {
                const supported = test.test();
                this.results.push({
                    category: 'Android Chrome',
                    test: test.name,
                    status: supported ? 'PASS' : 'FAIL',
                    message: supported ? '正常に動作します' : '問題が検出されました'
                });
            } catch (error) {
                this.results.push({
                    category: 'Android Chrome',
                    test: test.name,
                    status: 'ERROR',
                    message: `エラー: ${error.message}`
                });
            }
        }
    }

    /**
     * すべてのテストを実行
     */
    async runAllTests() {
        console.log('🧪 ブラウザ互換性テストを開始します...');
        console.log(`📱 検出されたブラウザ: ${this.browserInfo.browser} ${this.browserInfo.version} (${this.browserInfo.os})`);

        this.results = [];

        await this.testWebAPICompatibility();
        await this.testPWACompatibility();
        await this.testOCRCompatibility();
        await this.testPerformanceCompatibility();
        await this.testBrowserSpecificIssues();

        return this.generateReport();
    }

    /**
     * テスト結果レポートを生成
     */
    generateReport() {
        const categories = [...new Set(this.results.map(r => r.category))];
        const report = {
            browserInfo: this.browserInfo,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.status === 'PASS').length,
                failed: this.results.filter(r => r.status === 'FAIL').length,
                errors: this.results.filter(r => r.status === 'ERROR').length
            },
            categories: {},
            results: this.results,
            features: this.features
        };

        // カテゴリ別の集計
        categories.forEach(category => {
            const categoryResults = this.results.filter(r => r.category === category);
            report.categories[category] = {
                total: categoryResults.length,
                passed: categoryResults.filter(r => r.status === 'PASS').length,
                failed: categoryResults.filter(r => r.status === 'FAIL').length,
                errors: categoryResults.filter(r => r.status === 'ERROR').length
            };
        });

        // 互換性判定
        const isCompatible = this.isCompatibleBrowser(report);
        report.compatible = isCompatible;
        report.recommendations = this.generateRecommendations(report);

        return report;
    }

    /**
     * ブラウザ互換性を判定
     */
    isCompatibleBrowser(report) {
        const { browser, version, os } = this.browserInfo;
        const criticalFeatures = [
            'File API', 'Canvas API', 'Web Workers', 'IndexedDB', 
            'Service Worker', 'WebAssembly', 'WebGL'
        ];

        // 最小バージョン要件
        const minVersions = {
            'Safari': { iOS: 16.0 },
            'Chrome': { Android: 100.0 }
        };

        // バージョンチェック
        if (browser in minVersions && os in minVersions[browser]) {
            const minVersion = minVersions[browser][os];
            const currentVersion = parseFloat(version);
            if (currentVersion < minVersion) {
                return false;
            }
        }

        // 重要機能のチェック
        const missingCriticalFeatures = criticalFeatures.filter(feature => !this.features[feature]);
        if (missingCriticalFeatures.length > 0) {
            return false;
        }

        // エラー率のチェック
        const errorRate = report.summary.errors / report.summary.total;
        if (errorRate > 0.2) { // 20%以上のエラー率は非互換
            return false;
        }

        return true;
    }

    /**
     * 推奨事項を生成
     */
    generateRecommendations(report) {
        const recommendations = [];
        const { browser, version, os } = this.browserInfo;

        // ブラウザ固有の推奨事項
        if (browser === 'Safari' && os === 'iOS') {
            if (!this.features['WebGPU']) {
                recommendations.push('WebGPUが利用できません。WebGLフォールバックを使用してください。');
            }
            if (!this.features['WebGL2']) {
                recommendations.push('WebGL2が利用できません。WebGL 1.0を使用してください。');
            }
        }

        if (browser === 'Chrome' && os === 'Android') {
            if (this.features['Memory Info'] && performance.memory.jsHeapSizeLimit < 200 * 1024 * 1024) {
                recommendations.push('メモリ制限が低いです。画像サイズの制限を検討してください。');
            }
        }

        // 一般的な推奨事項
        if (!this.features['WebGPU'] && !this.features['WebGL2']) {
            recommendations.push('高性能なGPU処理が利用できません。処理時間が長くなる可能性があります。');
        }

        if (!this.features['Intersection Observer']) {
            recommendations.push('Intersection Observerが利用できません。ポリフィルの使用を検討してください。');
        }

        if (report.summary.failed > 0) {
            recommendations.push(`${report.summary.failed}個の機能テストが失敗しました。詳細を確認してください。`);
        }

        return recommendations;
    }
}

// グローバルに公開
window.BrowserCompatibilityTests = BrowserCompatibilityTests;