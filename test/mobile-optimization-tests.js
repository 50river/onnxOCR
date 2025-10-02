/**
 * モバイル最適化テストスイート
 * iOS Safari / Android Chrome での動作確認と性能最適化
 */

class MobileOptimizationTests {
    constructor() {
        this.results = [];
        this.metrics = {};
        this.deviceInfo = this.detectDeviceInfo();
        this.thresholds = {
            // モバイル固有の閾値
            mobileOCRTime: 15000,        // モバイルでは15秒まで許容
            mobileMemoryUsage: 150 * 1024 * 1024, // 150MB
            touchTargetSize: 44,         // 44px minimum (iOS HIG)
            viewportWidth: 320,          // 最小ビューポート幅
            networkTimeout: 30000,       // ネットワークタイムアウト
            batteryLevel: 0.2,           // バッテリー残量20%以下で警告
            thermalState: 'nominal'      // サーマル状態
        };
    }

    /**
     * デバイス情報の検出
     */
    detectDeviceInfo() {
        const ua = navigator.userAgent;
        const info = {
            'User Agent': ua,
            'Platform': navigator.platform,
            'Language': navigator.language,
            'Screen Size': `${screen.width}x${screen.height}`,
            'Viewport Size': `${window.innerWidth}x${window.innerHeight}`,
            'Device Pixel Ratio': window.devicePixelRatio || 1,
            'Touch Support': 'ontouchstart' in window ? 'Yes' : 'No',
            'Orientation': screen.orientation ? screen.orientation.type : 'Unknown'
        };

        // ブラウザ検出
        if (ua.includes('Safari') && ua.includes('Version') && !ua.includes('Chrome')) {
            info['Browser'] = 'Safari';
            info['iOS'] = ua.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
        } else if (ua.includes('Chrome') && ua.includes('Mobile')) {
            info['Browser'] = 'Chrome Mobile';
            info['Android'] = ua.match(/Android (\d+\.?\d*)/)?.[1] || 'Unknown';
        } else if (ua.includes('Chrome')) {
            info['Browser'] = 'Chrome';
        } else {
            info['Browser'] = 'Other';
        }

        // デバイスタイプ検出
        if (ua.includes('iPhone')) {
            info['Device Type'] = 'iPhone';
        } else if (ua.includes('iPad')) {
            info['Device Type'] = 'iPad';
        } else if (ua.includes('Android')) {
            info['Device Type'] = 'Android';
        } else {
            info['Device Type'] = 'Desktop/Other';
        }

        return info;
    }

    /**
     * デバイス情報の取得
     */
    getDeviceInfo() {
        return this.deviceInfo;
    }

    /**
     * デバイス機能のテスト
     */
    async testDeviceCapabilities() {
        try {
            // タッチサポートテスト
            const touchSupported = 'ontouchstart' in window;
            this.results.push({
                category: 'Device Capabilities',
                test: 'Touch Support',
                status: touchSupported ? 'PASS' : 'FAIL',
                value: touchSupported ? 'Supported' : 'Not Supported',
                message: touchSupported ? 'タッチ操作がサポートされています' : 'タッチ操作がサポートされていません'
            });

            // カメラサポートテスト
            const cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            this.results.push({
                category: 'Device Capabilities',
                test: 'Camera Support',
                status: cameraSupported ? 'PASS' : 'FAIL',
                value: cameraSupported ? 'Supported' : 'Not Supported',
                message: cameraSupported ? 'カメラアクセスがサポートされています' : 'カメラアクセスがサポートされていません'
            });

            // ジャイロスコープサポートテスト
            const gyroSupported = 'DeviceOrientationEvent' in window;
            this.results.push({
                category: 'Device Capabilities',
                test: 'Gyroscope Support',
                status: gyroSupported ? 'PASS' : 'INFO',
                value: gyroSupported ? 'Supported' : 'Not Supported',
                message: gyroSupported ? 'ジャイロスコープがサポートされています' : 'ジャイロスコープがサポートされていません'
            });

            // バイブレーションサポートテスト
            const vibrationSupported = 'vibrate' in navigator;
            this.results.push({
                category: 'Device Capabilities',
                test: 'Vibration Support',
                status: vibrationSupported ? 'PASS' : 'INFO',
                value: vibrationSupported ? 'Supported' : 'Not Supported',
                message: vibrationSupported ? 'バイブレーションがサポートされています' : 'バイブレーションがサポートされていません'
            });

            // Service Worker サポートテスト
            const swSupported = 'serviceWorker' in navigator;
            this.results.push({
                category: 'Device Capabilities',
                test: 'Service Worker Support',
                status: swSupported ? 'PASS' : 'FAIL',
                value: swSupported ? 'Supported' : 'Not Supported',
                message: swSupported ? 'Service Workerがサポートされています' : 'Service Workerがサポートされていません'
            });

            // IndexedDB サポートテスト
            const idbSupported = 'indexedDB' in window;
            this.results.push({
                category: 'Device Capabilities',
                test: 'IndexedDB Support',
                status: idbSupported ? 'PASS' : 'FAIL',
                value: idbSupported ? 'Supported' : 'Not Supported',
                message: idbSupported ? 'IndexedDBがサポートされています' : 'IndexedDBがサポートされていません'
            });

            // WebGL サポートテスト
            const webglSupported = this.testWebGLSupport();
            this.results.push({
                category: 'Device Capabilities',
                test: 'WebGL Support',
                status: webglSupported ? 'PASS' : 'WARN',
                value: webglSupported ? 'Supported' : 'Not Supported',
                message: webglSupported ? 'WebGLがサポートされています' : 'WebGLがサポートされていません'
            });

            // WebGPU サポートテスト
            const webgpuSupported = 'gpu' in navigator;
            this.results.push({
                category: 'Device Capabilities',
                test: 'WebGPU Support',
                status: webgpuSupported ? 'PASS' : 'INFO',
                value: webgpuSupported ? 'Supported' : 'Not Supported',
                message: webgpuSupported ? 'WebGPUがサポートされています' : 'WebGPUがサポートされていません（実験的機能）'
            });

        } catch (error) {
            this.results.push({
                category: 'Device Capabilities',
                test: 'Device Capabilities Test',
                status: 'ERROR',
                message: `エラー: ${error.message}`
            });
        }
    }

    /**
     * WebGLサポートのテスト
     */
    testWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch {
            return false;
        }
    }

    /**
     * ブラウザ互換性のテスト
     */
    async testBrowserCompatibility() {
        try {
            // iOS Safari 16+ のテスト
            const isIOSSafari = this.deviceInfo['Browser'] === 'Safari' && this.deviceInfo['iOS'];
            if (isIOSSafari) {
                const iosVersion = parseFloat(this.deviceInfo['iOS']);
                const iosSupported = iosVersion >= 16.0;
                this.results.push({
                    category: 'Browser Compatibility',
                    test: 'iOS Safari Version',
                    status: iosSupported ? 'PASS' : 'WARN',
                    value: `iOS ${this.deviceInfo['iOS']}`,
                    message: iosSupported ? 'サポートされているiOSバージョンです' : 'iOS 16以上を推奨します'
                });
            }

            // Android Chrome 10+ のテスト
            const isAndroidChrome = this.deviceInfo['Browser'] === 'Chrome Mobile' && this.deviceInfo['Android'];
            if (isAndroidChrome) {
                const androidVersion = parseFloat(this.deviceInfo['Android']);
                const androidSupported = androidVersion >= 10.0;
                this.results.push({
                    category: 'Browser Compatibility',
                    test: 'Android Chrome Version',
                    status: androidSupported ? 'PASS' : 'WARN',
                    value: `Android ${this.deviceInfo['Android']}`,
                    message: androidSupported ? 'サポートされているAndroidバージョンです' : 'Android 10以上を推奨します'
                });
            }

            // ES2020 機能のテスト
            const es2020Features = this.testES2020Features();
            this.results.push({
                category: 'Browser Compatibility',
                test: 'ES2020 Features',
                status: es2020Features.supported ? 'PASS' : 'WARN',
                value: `${es2020Features.supportedCount}/${es2020Features.totalCount}`,
                message: `ES2020機能の${es2020Features.supportedCount}/${es2020Features.totalCount}がサポートされています`
            });

            // CSS Grid サポートテスト
            const cssGridSupported = CSS.supports('display', 'grid');
            this.results.push({
                category: 'Browser Compatibility',
                test: 'CSS Grid Support',
                status: cssGridSupported ? 'PASS' : 'WARN',
                value: cssGridSupported ? 'Supported' : 'Not Supported',
                message: cssGridSupported ? 'CSS Gridがサポートされています' : 'CSS Gridがサポートされていません'
            });

            // CSS Flexbox サポートテスト
            const flexboxSupported = CSS.supports('display', 'flex');
            this.results.push({
                category: 'Browser Compatibility',
                test: 'CSS Flexbox Support',
                status: flexboxSupported ? 'PASS' : 'FAIL',
                value: flexboxSupported ? 'Supported' : 'Not Supported',
                message: flexboxSupported ? 'CSS Flexboxがサポートされています' : 'CSS Flexboxがサポートされていません'
            });

        } catch (error) {
            this.results.push({
                category: 'Browser Compatibility',
                test: 'Browser Compatibility Test',
                status: 'ERROR',
                message: `エラー: ${error.message}`
            });
        }
    }

    /**
     * ES2020機能のテスト
     */
    testES2020Features() {
        const features = [
            { name: 'Optional Chaining', test: () => eval('({})?.test') === undefined },
            { name: 'Nullish Coalescing', test: () => eval('null ?? "default"') === "default" },
            { name: 'BigInt', test: () => typeof BigInt === 'function' },
            { name: 'Dynamic Import', test: () => typeof import === 'function' },
            { name: 'Promise.allSettled', test: () => typeof Promise.allSettled === 'function' }
        ];

        let supportedCount = 0;
        features.forEach(feature => {
            try {
                if (feature.test()) {
                    supportedCount++;
                }
            } catch {
                // テストに失敗した場合はサポートされていないとみなす
            }
        });

        return {
            supported: supportedCount === features.length,
            supportedCount,
            totalCount: features.length
        };
    }

    /**
     * モバイルパフォーマンステスト
     */
    async testMobilePerformance() {
        try {
            // CPU パフォーマンステスト
            const cpuPerformance = await this.testCPUPerformance();
            this.results.push({
                category: 'Mobile Performance',
                test: 'CPU Performance',
                status: cpuPerformance.score > 1000 ? 'PASS' : 'WARN',
                value: `${cpuPerformance.score.toFixed(0)} ops/ms`,
                message: `CPU性能スコア: ${cpuPerformance.score.toFixed(0)}`
            });

            // GPU パフォーマンステスト
            const gpuPerformance = await this.testGPUPerformance();
            this.results.push({
                category: 'Mobile Performance',
                test: 'GPU Performance',
                status: gpuPerformance.fps > 30 ? 'PASS' : 'WARN',
                value: `${gpuPerformance.fps.toFixed(1)} FPS`,
                message: `GPU描画性能: ${gpuPerformance.fps.toFixed(1)} FPS`
            });

            // メモリ使用量テスト
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize;
                const memoryPassed = memoryUsage <= this.thresholds.mobileMemoryUsage;
                this.results.push({
                    category: 'Mobile Performance',
                    test: 'Memory Usage',
                    status: memoryPassed ? 'PASS' : 'WARN',
                    value: this.formatBytes(memoryUsage),
                    threshold: this.formatBytes(this.thresholds.mobileMemoryUsage),
                    message: memoryPassed ? 'メモリ使用量が適切です' : 'メモリ使用量が多すぎます'
                });
            }

            // バッテリー状態テスト（利用可能な場合）
            if ('getBattery' in navigator) {
                try {
                    const battery = await navigator.getBattery();
                    const batteryLevel = battery.level;
                    const batteryCharging = battery.charging;
                    
                    this.results.push({
                        category: 'Mobile Performance',
                        test: 'Battery Level',
                        status: batteryLevel > this.thresholds.batteryLevel ? 'PASS' : 'WARN',
                        value: `${(batteryLevel * 100).toFixed(0)}%`,
                        message: `バッテリー残量: ${(batteryLevel * 100).toFixed(0)}% ${batteryCharging ? '(充電中)' : ''}`
                    });
                } catch (error) {
                    console.warn('バッテリー情報の取得に失敗:', error);
                }
            }

        } catch (error) {
            this.results.push({
                category: 'Mobile Performance',
                test: 'Mobile Performance Test',
                status: 'ERROR',
                message: `エラー: ${error.message}`
            });
        }
    }

    /**
     * CPU パフォーマンステスト
     */
    async testCPUPerformance() {
        const startTime = performance.now();
        const iterations = 100000;
        let result = 0;

        // CPU集約的な計算を実行
        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        const score = iterations / duration; // operations per millisecond

        return { score, duration, result };
    }

    /**
     * GPU パフォーマンステスト
     */
    async testGPUPerformance() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 300;
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            if (!gl) {
                resolve({ fps: 0, error: 'WebGL not supported' });
                return;
            }

            let frameCount = 0;
            const startTime = performance.now();
            const testDuration = 1000; // 1秒間テスト

            function render() {
                // 簡単な描画処理
                gl.clearColor(Math.random(), Math.random(), Math.random(), 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                
                frameCount++;
                const currentTime = performance.now();
                
                if (currentTime - startTime < testDuration) {
                    requestAnimationFrame(render);
                } else {
                    const fps = frameCount / (testDuration / 1000);
                    resolve({ fps, frameCount });
                }
            }

            render();
        });
    }

    /**
     * メモリ制約テスト
     */
    async testMemoryConstraints() {
        try {
            // 大きな配列を作成してメモリ制限をテスト
            const testSizes = [1, 5, 10, 25, 50]; // MB
            let maxAllocatedSize = 0;

            for (const size of testSizes) {
                try {
                    const arraySize = size * 1024 * 1024 / 4; // 4 bytes per number
                    const testArray = new Array(arraySize).fill(1);
                    maxAllocatedSize = size;
                    
                    // メモリを解放
                    testArray.length = 0;
                } catch (error) {
                    break;
                }
            }

            this.results.push({
                category: 'Memory Constraints',
                test: 'Maximum Array Allocation',
                status: maxAllocatedSize >= 10 ? 'PASS' : 'WARN',
                value: `${maxAllocatedSize} MB`,
                message: `最大${maxAllocatedSize}MBの配列を割り当て可能`
            });

            // Canvas メモリテスト
            const canvasMemoryTest = this.testCanvasMemoryLimits();
            this.results.push({
                category: 'Memory Constraints',
                test: 'Canvas Memory Limits',
                status: canvasMemoryTest.maxSize >= 2048 ? 'PASS' : 'WARN',
                value: `${canvasMemoryTest.maxSize}x${canvasMemoryTest.maxSize}`,
                message: `最大${canvasMemoryTest.maxSize}x${canvasMemoryTest.maxSize}のCanvasを作成可能`
            });

            // メモリ使用量の監視
            if (performance.memory) {
                const memoryBefore = performance.memory.usedJSHeapSize;
                
                // 一時的に大きなオブジェクトを作成
                const tempData = new Array(1000000).fill('test');
                const memoryAfter = performance.memory.usedJSHeapSize;
                
                // メモリを解放
                tempData.length = 0;
                
                const memoryIncrease = memoryAfter - memoryBefore;
                this.results.push({
                    category: 'Memory Constraints',
                    test: 'Memory Allocation Speed',
                    status: memoryIncrease > 0 ? 'PASS' : 'WARN',
                    value: this.formatBytes(memoryIncrease),
                    message: `メモリ割り当て量: ${this.formatBytes(memoryIncrease)}`
                });
            }

        } catch (error) {
            this.results.push({
                category: 'Memory Constraints',
                test: 'Memory Constraints Test',
                status: 'ERROR',
                message: `エラー: ${error.message}`
            });
        }
    }

    /**
     * Canvas メモリ制限テスト
     */
    testCanvasMemoryLimits() {
        const testSizes = [512, 1024, 2048, 4096, 8192];
        let maxSize = 0;

        for (const size of testSizes) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // 実際に描画してメモリ使用を確認
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, size, size);
                
                maxSize = size;
            } catch (error) {
                break;
            }
        }

        return { maxSize };
    }

    /**
     * タッチインタラクションテスト
     */
    async testTouchInteractions() {
        try {
            // タッチターゲットサイズのテスト
            const touchTargets = document.querySelectorAll('button, a, input, [onclick]');
            let minTouchTargetSize = Infinity;
            let touchTargetsPassed = 0;

            touchTargets.forEach(target => {
                const rect = target.getBoundingClientRect();
                const size = Math.min(rect.width, rect.height);
                minTouchTargetSize = Math.min(minTouchTargetSize, size);
                
                if (size >= this.thresholds.touchTargetSize) {
                    touchTargetsPassed++;
                }
            });

            if (touchTargets.length > 0) {
                const passRate = touchTargetsPassed / touchTargets.length;
                this.results.push({
                    category: 'Touch Interactions',
                    test: 'Touch Target Size',
                    status: passRate >= 0.9 ? 'PASS' : 'WARN',
                    value: `${touchTargetsPassed}/${touchTargets.length}`,
                    message: `${(passRate * 100).toFixed(0)}%のタッチターゲットが44px以上です`
                });
            }

            // タッチイベントのテスト
            const touchEventsSupported = this.testTouchEvents();
            this.results.push({
                category: 'Touch Interactions',
                test: 'Touch Events Support',
                status: touchEventsSupported ? 'PASS' : 'FAIL',
                value: touchEventsSupported ? 'Supported' : 'Not Supported',
                message: touchEventsSupported ? 'タッチイベントがサポートされています' : 'タッチイベントがサポートされていません'
            });

            // ジェスチャーサポートのテスト
            const gestureSupported = 'ongesturestart' in window;
            this.results.push({
                category: 'Touch Interactions',
                test: 'Gesture Support',
                status: gestureSupported ? 'PASS' : 'INFO',
                value: gestureSupported ? 'Supported' : 'Not Supported',
                message: gestureSupported ? 'ジェスチャーイベントがサポートされています' : 'ジェスチャーイベントがサポートされていません'
            });

            // ポインターイベントのテスト
            const pointerEventsSupported = 'onpointerdown' in window;
            this.results.push({
                category: 'Touch Interactions',
                test: 'Pointer Events Support',
                status: pointerEventsSupported ? 'PASS' : 'INFO',
                value: pointerEventsSupported ? 'Supported' : 'Not Supported',
                message: pointerEventsSupported ? 'ポインターイベントがサポートされています' : 'ポインターイベントがサポートされていません'
            });

        } catch (error) {
            this.results.push({
                category: 'Touch Interactions',
                test: 'Touch Interactions Test',
                status: 'ERROR',
                message: `エラー: ${error.message}`
            });
        }
    }

    /**
     * タッチイベントのテスト
     */
    testTouchEvents() {
        const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
        return touchEvents.every(event => `on${event}` in window);
    }

    /**
     * ネットワークパフォーマンステスト
     */
    async testNetworkPerformance() {
        try {
            // Connection API のテスト
            if ('connection' in navigator) {
                const connection = navigator.connection;
                const effectiveType = connection.effectiveType;
                const downlink = connection.downlink;
                const rtt = connection.rtt;

                this.results.push({
                    category: 'Network Performance',
                    test: 'Connection Type',
                    status: effectiveType === '4g' ? 'PASS' : 'INFO',
                    value: effectiveType,
                    message: `接続タイプ: ${effectiveType}`
                });

                this.results.push({
                    category: 'Network Performance',
                    test: 'Download Speed',
                    status: downlink >= 1.0 ? 'PASS' : 'WARN',
                    value: `${downlink} Mbps`,
                    message: `推定ダウンロード速度: ${downlink} Mbps`
                });

                this.results.push({
                    category: 'Network Performance',
                    test: 'Round Trip Time',
                    status: rtt <= 300 ? 'PASS' : 'WARN',
                    value: `${rtt} ms`,
                    message: `往復遅延時間: ${rtt} ms`
                });
            }

            // オフライン対応のテスト
            const onlineStatus = navigator.onLine;
            this.results.push({
                category: 'Network Performance',
                test: 'Online Status',
                status: 'INFO',
                value: onlineStatus ? 'Online' : 'Offline',
                message: `現在の接続状態: ${onlineStatus ? 'オンライン' : 'オフライン'}`
            });

            // Service Worker のキャッシュテスト
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                this.results.push({
                    category: 'Network Performance',
                    test: 'Service Worker Cache',
                    status: registration ? 'PASS' : 'WARN',
                    value: registration ? 'Active' : 'Not Active',
                    message: registration ? 'Service Workerが有効です' : 'Service Workerが無効です'
                });
            }

        } catch (error) {
            this.results.push({
                category: 'Network Performance',
                test: 'Network Performance Test',
                status: 'ERROR',
                message: `エラー: ${error.message}`
            });
        }
    }

    /**
     * ビューポートとレスポンシブデザインのテスト
     */
    async testViewportAndResponsive() {
        try {
            // ビューポート幅のテスト
            const viewportWidth = window.innerWidth;
            const viewportPassed = viewportWidth >= this.thresholds.viewportWidth;
            this.results.push({
                category: 'Viewport & Responsive',
                test: 'Viewport Width',
                status: viewportPassed ? 'PASS' : 'WARN',
                value: `${viewportWidth}px`,
                threshold: `${this.thresholds.viewportWidth}px`,
                message: viewportPassed ? 'ビューポート幅が適切です' : 'ビューポート幅が狭すぎます'
            });

            // デバイスピクセル比のテスト
            const devicePixelRatio = window.devicePixelRatio || 1;
            this.results.push({
                category: 'Viewport & Responsive',
                test: 'Device Pixel Ratio',
                status: devicePixelRatio >= 1 ? 'PASS' : 'INFO',
                value: devicePixelRatio.toString(),
                message: `デバイスピクセル比: ${devicePixelRatio}`
            });

            // 画面の向きのテスト
            const orientation = screen.orientation ? screen.orientation.type : 'unknown';
            this.results.push({
                category: 'Viewport & Responsive',
                test: 'Screen Orientation',
                status: 'INFO',
                value: orientation,
                message: `画面の向き: ${orientation}`
            });

            // CSS メディアクエリのテスト
            const mediaQueries = [
                { query: '(max-width: 768px)', name: 'Mobile' },
                { query: '(min-width: 769px) and (max-width: 1024px)', name: 'Tablet' },
                { query: '(min-width: 1025px)', name: 'Desktop' }
            ];

            mediaQueries.forEach(({ query, name }) => {
                const matches = window.matchMedia(query).matches;
                this.results.push({
                    category: 'Viewport & Responsive',
                    test: `${name} Media Query`,
                    status: 'INFO',
                    value: matches ? 'Matches' : 'No Match',
                    message: `${name}メディアクエリ: ${matches ? '適用' : '非適用'}`
                });
            });

        } catch (error) {
            this.results.push({
                category: 'Viewport & Responsive',
                test: 'Viewport & Responsive Test',
                status: 'ERROR',
                message: `エラー: ${error.message}`
            });
        }
    }

    /**
     * すべてのテストを実行
     */
    async runAllTests() {
        console.log('📱 モバイル最適化テストを開始します...');
        
        this.results = [];
        this.metrics = {};

        await this.testDeviceCapabilities();
        await this.testBrowserCompatibility();
        await this.testMobilePerformance();
        await this.testMemoryConstraints();
        await this.testTouchInteractions();
        await this.testNetworkPerformance();
        await this.testViewportAndResponsive();

        return this.generateReport();
    }

    /**
     * レポートを生成
     */
    generateReport() {
        const categories = [...new Set(this.results.map(r => r.category))];
        const report = {
            timestamp: new Date().toISOString(),
            deviceInfo: this.deviceInfo,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.status === 'PASS').length,
                failed: this.results.filter(r => r.status === 'FAIL').length,
                warnings: this.results.filter(r => r.status === 'WARN').length,
                errors: this.results.filter(r => r.status === 'ERROR').length,
                info: this.results.filter(r => r.status === 'INFO').length
            },
            categories: {},
            results: this.results,
            metrics: this.metrics,
            thresholds: this.thresholds
        };

        // カテゴリ別の集計
        categories.forEach(category => {
            const categoryResults = this.results.filter(r => r.category === category);
            report.categories[category] = {
                total: categoryResults.length,
                passed: categoryResults.filter(r => r.status === 'PASS').length,
                failed: categoryResults.filter(r => r.status === 'FAIL').length,
                warnings: categoryResults.filter(r => r.status === 'WARN').length,
                errors: categoryResults.filter(r => r.status === 'ERROR').length,
                info: categoryResults.filter(r => r.status === 'INFO').length
            };
        });

        // モバイル最適化スコアの計算
        report.mobileOptimizationScore = this.calculateMobileOptimizationScore(report);
        report.recommendations = this.generateMobileOptimizationRecommendations(report);

        return report;
    }

    /**
     * モバイル最適化スコアを計算
     */
    calculateMobileOptimizationScore(report) {
        const totalTests = report.summary.total;
        const passedTests = report.summary.passed;
        const failedTests = report.summary.failed;
        const warningTests = report.summary.warnings;
        
        // 重み付きスコア計算
        const score = (passedTests * 1.0 + warningTests * 0.5 - failedTests * 0.5) / totalTests * 100;
        
        return {
            score: Math.max(0, Math.min(100, score)),
            grade: this.getGradeFromScore(score),
            breakdown: {
                passed: passedTests,
                warnings: warningTests,
                failed: failedTests,
                total: totalTests
            }
        };
    }

    /**
     * スコアからグレードを取得
     */
    getGradeFromScore(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * モバイル最適化推奨事項を生成
     */
    generateMobileOptimizationRecommendations(report) {
        const recommendations = [];

        // デバイス機能の推奨事項
        const failedCapabilities = report.results.filter(r => 
            r.category === 'Device Capabilities' && r.status === 'FAIL'
        );
        if (failedCapabilities.length > 0) {
            recommendations.push({
                category: 'Device Capabilities',
                priority: 'HIGH',
                issue: '重要なデバイス機能がサポートされていません',
                solution: 'フォールバック機能の実装、プログレッシブエンハンスメントの適用を検討してください'
            });
        }

        // パフォーマンスの推奨事項
        const performanceWarnings = report.results.filter(r => 
            r.category === 'Mobile Performance' && (r.status === 'WARN' || r.status === 'FAIL')
        );
        if (performanceWarnings.length > 0) {
            recommendations.push({
                category: 'Performance',
                priority: 'HIGH',
                issue: 'モバイルパフォーマンスが低下しています',
                solution: '画像の最適化、コードの軽量化、レンダリングの最適化を検討してください'
            });
        }

        // タッチインタラクションの推奨事項
        const touchIssues = report.results.filter(r => 
            r.category === 'Touch Interactions' && r.status === 'WARN'
        );
        if (touchIssues.length > 0) {
            recommendations.push({
                category: 'Touch Interactions',
                priority: 'MEDIUM',
                issue: 'タッチインタラクションに改善の余地があります',
                solution: 'タッチターゲットサイズの拡大、ジェスチャーサポートの改善を検討してください'
            });
        }

        // ネットワークの推奨事項
        const networkIssues = report.results.filter(r => 
            r.category === 'Network Performance' && r.status === 'WARN'
        );
        if (networkIssues.length > 0) {
            recommendations.push({
                category: 'Network',
                priority: 'MEDIUM',
                issue: 'ネットワークパフォーマンスに問題があります',
                solution: 'オフライン対応の強化、キャッシュ戦略の見直しを検討してください'
            });
        }

        return recommendations;
    }

    /**
     * バイト数を人間が読みやすい形式に変換
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 結果をクリア
     */
    clearResults() {
        this.results = [];
        this.metrics = {};
    }
}

// グローバルに公開
window.MobileOptimizationTests = MobileOptimizationTests;