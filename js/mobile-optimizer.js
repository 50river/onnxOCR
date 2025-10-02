/**
 * モバイル最適化システム
 * iOS Safari / Android Chrome での性能最適化とモバイル固有の問題の修正
 */

class MobileOptimizer {
    constructor() {
        this.deviceInfo = this.detectDevice();
        this.optimizations = {
            imageQualityReduction: false,
            memoryManagement: false,
            touchOptimization: false,
            networkOptimization: false,
            batteryOptimization: false
        };
        
        this.thresholds = {
            lowMemoryDevice: 2 * 1024 * 1024 * 1024, // 2GB
            slowCPU: 1000, // CPU benchmark score
            lowBattery: 0.2, // 20%
            slowNetwork: 1.0 // 1 Mbps
        };
        
        this.initialize();
    }

    /**
     * デバイス検出
     */
    detectDevice() {
        const ua = navigator.userAgent;
        const info = {
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
            isChrome: /Chrome/.test(ua),
            isMobile: /Mobi|Android/i.test(ua),
            isTablet: /iPad|Android(?!.*Mobi)/i.test(ua),
            devicePixelRatio: window.devicePixelRatio || 1,
            screenSize: {
                width: screen.width,
                height: screen.height
            },
            viewportSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        // iOS バージョン検出
        if (info.isIOS) {
            const match = ua.match(/OS (\d+)_(\d+)/);
            if (match) {
                info.iosVersion = parseFloat(`${match[1]}.${match[2]}`);
            }
        }

        // Android バージョン検出
        if (info.isAndroid) {
            const match = ua.match(/Android (\d+\.?\d*)/);
            if (match) {
                info.androidVersion = parseFloat(match[1]);
            }
        }

        return info;
    }

    /**
     * 初期化
     */
    initialize() {
        console.log('🔧 モバイル最適化システムを初期化中...', this.deviceInfo);
        
        // デバイス固有の最適化を適用
        this.applyDeviceSpecificOptimizations();
        
        // パフォーマンス監視の開始
        this.startPerformanceMonitoring();
        
        // バッテリー監視の開始
        this.startBatteryMonitoring();
        
        // ネットワーク監視の開始
        this.startNetworkMonitoring();
        
        // タッチ最適化の適用
        this.applyTouchOptimizations();
        
        // メモリ最適化の適用
        this.applyMemoryOptimizations();
        
        // イベントリスナーの設定
        this.setupEventListeners();
    }

    /**
     * デバイス固有の最適化を適用
     */
    applyDeviceSpecificOptimizations() {
        // iOS Safari 固有の最適化
        if (this.deviceInfo.isIOS && this.deviceInfo.isSafari) {
            this.applyIOSSafariOptimizations();
        }
        
        // Android Chrome 固有の最適化
        if (this.deviceInfo.isAndroid && this.deviceInfo.isChrome) {
            this.applyAndroidChromeOptimizations();
        }
        
        // 低性能デバイス向けの最適化
        if (this.isLowPerformanceDevice()) {
            this.applyLowPerformanceOptimizations();
        }
    }

    /**
     * iOS Safari 固有の最適化
     */
    applyIOSSafariOptimizations() {
        console.log('🍎 iOS Safari 最適化を適用中...');
        
        // iOS 16未満での互換性対応
        if (this.deviceInfo.iosVersion && this.deviceInfo.iosVersion < 16) {
            this.applyLegacyIOSOptimizations();
        }
        
        // Safari固有のメモリ制限対応
        this.applySafariMemoryOptimizations();
        
        // iOS固有のタッチイベント最適化
        this.applyIOSTouchOptimizations();
        
        // ビューポート最適化
        this.applyIOSViewportOptimizations();
    }

    /**
     * Android Chrome 固有の最適化
     */
    applyAndroidChromeOptimizations() {
        console.log('🤖 Android Chrome 最適化を適用中...');
        
        // Android 10未満での互換性対応
        if (this.deviceInfo.androidVersion && this.deviceInfo.androidVersion < 10) {
            this.applyLegacyAndroidOptimizations();
        }
        
        // Chrome固有のパフォーマンス最適化
        this.applyChromePerformanceOptimizations();
        
        // Android固有のメモリ管理
        this.applyAndroidMemoryOptimizations();
    }

    /**
     * 低性能デバイス向けの最適化
     */
    applyLowPerformanceOptimizations() {
        console.log('⚡ 低性能デバイス最適化を適用中...');
        
        // 画像品質の自動削減
        this.optimizations.imageQualityReduction = true;
        window.imageQualityReduction = true;
        
        // アニメーションの削減
        this.reduceAnimations();
        
        // 処理の分割実行
        this.enableChunkedProcessing();
        
        // 不要な機能の無効化
        this.disableNonEssentialFeatures();
    }

    /**
     * 低性能デバイスの判定
     */
    isLowPerformanceDevice() {
        // メモリ情報による判定
        if (performance.memory) {
            const totalMemory = performance.memory.jsHeapSizeLimit;
            if (totalMemory < this.thresholds.lowMemoryDevice) {
                return true;
            }
        }
        
        // CPU性能による判定（簡易ベンチマーク）
        const cpuScore = this.getCPUBenchmarkScore();
        if (cpuScore < this.thresholds.slowCPU) {
            return true;
        }
        
        // 古いデバイスの判定
        if (this.deviceInfo.isIOS && this.deviceInfo.iosVersion < 14) {
            return true;
        }
        
        if (this.deviceInfo.isAndroid && this.deviceInfo.androidVersion < 9) {
            return true;
        }
        
        return false;
    }

    /**
     * CPU ベンチマークスコアの取得
     */
    getCPUBenchmarkScore() {
        const startTime = performance.now();
        let result = 0;
        
        // 簡易CPU性能テスト
        for (let i = 0; i < 100000; i++) {
            result += Math.sqrt(i);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // スコア計算（高いほど高性能）
        return 100000 / duration;
    }

    /**
     * パフォーマンス監視の開始
     */
    startPerformanceMonitoring() {
        // FPS監視
        this.startFPSMonitoring();
        
        // メモリ使用量監視
        this.startMemoryMonitoring();
        
        // 処理時間監視
        this.startProcessingTimeMonitoring();
    }

    /**
     * FPS監視の開始
     */
    startFPSMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                
                // FPSが低い場合の対応
                if (fps < 30) {
                    this.handleLowFPS(fps);
                }
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }

    /**
     * 低FPS時の対応
     */
    handleLowFPS(fps) {
        console.warn(`⚠️ 低FPS検出: ${fps} FPS`);
        
        // アニメーションの削減
        this.reduceAnimations();
        
        // 描画頻度の調整
        this.adjustRenderingFrequency();
        
        // 不要な処理の停止
        this.pauseNonEssentialProcessing();
    }

    /**
     * メモリ監視の開始
     */
    startMemoryMonitoring() {
        if (!performance.memory) return;
        
        setInterval(() => {
            const memory = performance.memory;
            const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
            
            if (usageRatio > 0.8) {
                this.handleHighMemoryUsage(usageRatio);
            }
        }, 5000);
    }

    /**
     * 高メモリ使用量時の対応
     */
    handleHighMemoryUsage(usageRatio) {
        console.warn(`⚠️ 高メモリ使用量検出: ${(usageRatio * 100).toFixed(1)}%`);
        
        // 強制ガベージコレクション
        this.forceGarbageCollection();
        
        // キャッシュのクリア
        this.clearCaches();
        
        // 画像品質の削減
        this.optimizations.imageQualityReduction = true;
        window.imageQualityReduction = true;
    }

    /**
     * バッテリー監視の開始
     */
    async startBatteryMonitoring() {
        if (!('getBattery' in navigator)) return;
        
        try {
            const battery = await navigator.getBattery();
            
            const checkBattery = () => {
                if (battery.level < this.thresholds.lowBattery && !battery.charging) {
                    this.handleLowBattery(battery.level);
                }
            };
            
            battery.addEventListener('levelchange', checkBattery);
            battery.addEventListener('chargingchange', checkBattery);
            
            checkBattery(); // 初回チェック
        } catch (error) {
            console.warn('バッテリー監視の開始に失敗:', error);
        }
    }

    /**
     * 低バッテリー時の対応
     */
    handleLowBattery(level) {
        console.warn(`🔋 低バッテリー検出: ${(level * 100).toFixed(0)}%`);
        
        // バッテリー節約モードの有効化
        this.optimizations.batteryOptimization = true;
        
        // 処理頻度の削減
        this.reducePowerConsumption();
        
        // 不要な機能の無効化
        this.disableNonEssentialFeatures();
        
        // ユーザーに通知
        this.notifyBatteryOptimization(level);
    }

    /**
     * ネットワーク監視の開始
     */
    startNetworkMonitoring() {
        if (!('connection' in navigator)) return;
        
        const connection = navigator.connection;
        
        const checkConnection = () => {
            const effectiveType = connection.effectiveType;
            const downlink = connection.downlink;
            
            if (downlink < this.thresholds.slowNetwork || effectiveType === 'slow-2g' || effectiveType === '2g') {
                this.handleSlowNetwork(effectiveType, downlink);
            }
        };
        
        connection.addEventListener('change', checkConnection);
        checkConnection(); // 初回チェック
    }

    /**
     * 低速ネットワーク時の対応
     */
    handleSlowNetwork(effectiveType, downlink) {
        console.warn(`📶 低速ネットワーク検出: ${effectiveType}, ${downlink} Mbps`);
        
        // ネットワーク最適化の有効化
        this.optimizations.networkOptimization = true;
        
        // 画像品質の削減
        this.optimizations.imageQualityReduction = true;
        window.imageQualityReduction = true;
        
        // プリロードの無効化
        this.disablePreloading();
    }

    /**
     * タッチ最適化の適用
     */
    applyTouchOptimizations() {
        // タッチ遅延の削除
        this.removeTouchDelay();
        
        // タッチターゲットサイズの調整
        this.adjustTouchTargetSizes();
        
        // スクロール最適化
        this.optimizeScrolling();
        
        // ジェスチャー最適化
        this.optimizeGestures();
    }

    /**
     * タッチ遅延の削除
     */
    removeTouchDelay() {
        // FastClick の代替実装
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const target = touch.target;
                
                if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.onclick) {
                    e.preventDefault();
                    target.click();
                }
            }
        }, { passive: false });
    }

    /**
     * タッチターゲットサイズの調整
     */
    adjustTouchTargetSizes() {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                button, .btn, a, input[type="button"], input[type="submit"] {
                    min-height: 44px !important;
                    min-width: 44px !important;
                    padding: 12px 16px !important;
                }
                
                .control-button {
                    min-height: 48px !important;
                    padding: 12px 20px !important;
                }
                
                .candidate-action {
                    min-width: 44px !important;
                    min-height: 44px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * スクロール最適化
     */
    optimizeScrolling() {
        // iOS Safari のバウンススクロール対応
        if (this.deviceInfo.isIOS) {
            document.body.style.webkitOverflowScrolling = 'touch';
        }
        
        // スクロール性能の最適化
        const scrollableElements = document.querySelectorAll('.scrollable, .candidates-content');
        scrollableElements.forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overflowScrolling = 'touch';
        });
    }

    /**
     * メモリ最適化の適用
     */
    applyMemoryOptimizations() {
        // 画像メモリの最適化
        this.optimizeImageMemory();
        
        // DOM要素の最適化
        this.optimizeDOMMemory();
        
        // イベントリスナーの最適化
        this.optimizeEventListeners();
    }

    /**
     * 画像メモリの最適化
     */
    optimizeImageMemory() {
        // 画像の遅延読み込み
        this.implementLazyLoading();
        
        // 画像サイズの制限
        this.limitImageSizes();
        
        // 不要な画像の解放
        this.releaseUnusedImages();
    }

    /**
     * アニメーションの削減
     */
    reduceAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 電力消費の削減
     */
    reducePowerConsumption() {
        // 処理間隔の延長
        this.extendProcessingIntervals();
        
        // 不要な計算の停止
        this.pauseNonEssentialCalculations();
        
        // 描画頻度の削減
        this.reduceRenderingFrequency();
    }

    /**
     * 不要な機能の無効化
     */
    disableNonEssentialFeatures() {
        // アニメーションの無効化
        this.disableAnimations();
        
        // 自動更新の停止
        this.pauseAutoUpdates();
        
        // バックグラウンド処理の停止
        this.pauseBackgroundProcessing();
    }

    /**
     * iOS Safari 固有のメモリ最適化
     */
    applySafariMemoryOptimizations() {
        // Safari の厳しいメモリ制限に対応
        const originalCreateCanvas = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateCanvas.call(this, tagName);
            
            if (tagName.toLowerCase() === 'canvas') {
                // Canvas サイズの制限
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'width' && parseInt(value) > 2048) {
                        value = '2048';
                    }
                    if (name === 'height' && parseInt(value) > 2048) {
                        value = '2048';
                    }
                    return originalSetAttribute.call(this, name, value);
                };
            }
            
            return element;
        };
    }

    /**
     * iOS 固有のタッチ最適化
     */
    applyIOSTouchOptimizations() {
        // iOS の300msタッチ遅延対策
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1, user-scalable=no';
        document.head.appendChild(meta);
        
        // iOS Safari のタッチイベント最適化
        document.addEventListener('touchstart', () => {}, { passive: true });
    }

    /**
     * iOS ビューポート最適化
     */
    applyIOSViewportOptimizations() {
        // iOS Safari のビューポート問題対応
        const fixViewport = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        window.addEventListener('resize', fixViewport);
        window.addEventListener('orientationchange', fixViewport);
        fixViewport();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // ページの可視性変更時の処理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseOptimizations();
            } else {
                this.resumeOptimizations();
            }
        });
        
        // メモリ警告時の処理
        window.addEventListener('memorywarning', () => {
            this.handleMemoryWarning();
        });
        
        // 画面の向き変更時の処理
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }

    /**
     * メモリ警告時の処理
     */
    handleMemoryWarning() {
        console.warn('⚠️ メモリ警告を受信');
        
        // 緊急メモリ解放
        this.emergencyMemoryCleanup();
        
        // 最低品質モードに切り替え
        this.switchToMinimalQualityMode();
    }

    /**
     * 画面の向き変更時の処理
     */
    handleOrientationChange() {
        // ビューポートの再計算
        this.recalculateViewport();
        
        // レイアウトの再調整
        this.adjustLayoutForOrientation();
    }

    /**
     * 最適化の一時停止
     */
    pauseOptimizations() {
        // バックグラウンドでの最適化処理を停止
        this.pauseBackgroundOptimizations();
    }

    /**
     * 最適化の再開
     */
    resumeOptimizations() {
        // フォアグラウンドでの最適化処理を再開
        this.resumeBackgroundOptimizations();
    }

    /**
     * 緊急メモリクリーンアップ
     */
    emergencyMemoryCleanup() {
        // すべてのキャッシュをクリア
        this.clearAllCaches();
        
        // 不要なDOM要素を削除
        this.removeUnusedDOMElements();
        
        // 強制ガベージコレクション
        this.forceGarbageCollection();
    }

    /**
     * 強制ガベージコレクション
     */
    forceGarbageCollection() {
        // 大きな配列を作成・削除してGCを促す
        const dummy = new Array(1000000).fill(0);
        dummy.length = 0;
        
        // 明示的なGC（開発環境でのみ利用可能）
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * 最適化状況の取得
     */
    getOptimizationStatus() {
        return {
            deviceInfo: this.deviceInfo,
            optimizations: this.optimizations,
            isLowPerformanceDevice: this.isLowPerformanceDevice(),
            memoryUsage: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                usageRatio: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
            } : null
        };
    }

    /**
     * バッテリー最適化の通知
     */
    notifyBatteryOptimization(level) {
        if (window.app && window.app.updateStatus) {
            window.app.updateStatus(
                `バッテリー節約モードを有効にしました (${(level * 100).toFixed(0)}%)`,
                'warning'
            );
        }
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        // 監視処理の停止
        this.stopAllMonitoring();
        
        // イベントリスナーの削除
        this.removeEventListeners();
        
        console.log('MobileOptimizer クリーンアップ完了');
    }
}

// グローバルに公開
window.MobileOptimizer = MobileOptimizer;