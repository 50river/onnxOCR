/**
 * リソース監視とメモリ管理システム
 * メモリ不足、処理タイムアウト、段階的品質低下を管理
 */

class ResourceMonitor {
    constructor() {
        this.memoryThresholds = {
            warning: 0.8,    // 80%でワーニング
            critical: 0.9,   // 90%でクリティカル
            emergency: 0.95  // 95%で緊急処理
        };
        
        this.timeoutThresholds = {
            ocr: 30000,      // OCR処理: 30秒
            image: 10000,    // 画像処理: 10秒
            storage: 5000    // ストレージ操作: 5秒
        };
        
        this.qualityLevels = [
            { name: 'high', maxSize: { width: 2048, height: 2048 }, quality: 0.9 },
            { name: 'medium', maxSize: { width: 1024, height: 1024 }, quality: 0.8 },
            { name: 'low', maxSize: { width: 512, height: 512 }, quality: 0.7 },
            { name: 'minimal', maxSize: { width: 256, height: 256 }, quality: 0.6 }
        ];
        
        this.currentQualityLevel = 0; // high から開始
        this.memoryCheckInterval = null;
        this.isMonitoring = false;
        
        this.initializeMonitoring();
    }

    /**
     * リソース監視の初期化
     */
    initializeMonitoring() {
        // メモリ監視の開始
        this.startMemoryMonitoring();
        
        // ページ非表示時の処理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });
        
        // ページアンロード時のクリーンアップ
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * メモリ監視の開始
     */
    startMemoryMonitoring() {
        if (this.memoryCheckInterval) return;
        
        this.isMonitoring = true;
        this.memoryCheckInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 5000); // 5秒間隔でチェック
    }

    /**
     * メモリ監視の停止
     */
    stopMemoryMonitoring() {
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        this.isMonitoring = false;
    }

    /**
     * 監視の一時停止
     */
    pauseMonitoring() {
        this.stopMemoryMonitoring();
    }

    /**
     * 監視の再開
     */
    resumeMonitoring() {
        if (!this.isMonitoring) {
            this.startMemoryMonitoring();
        }
    }

    /**
     * メモリ使用量のチェック
     */
    checkMemoryUsage() {
        try {
            if (!performance.memory) return;
            
            const memory = performance.memory;
            const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
            
            if (usageRatio >= this.memoryThresholds.emergency) {
                this.handleEmergencyMemory();
            } else if (usageRatio >= this.memoryThresholds.critical) {
                this.handleCriticalMemory();
            } else if (usageRatio >= this.memoryThresholds.warning) {
                this.handleWarningMemory();
            }
            
            // メモリ使用量をログ出力（デバッグ用）
            if (usageRatio > 0.7) {
                console.log('メモリ使用量:', {
                    used: this.formatBytes(memory.usedJSHeapSize),
                    total: this.formatBytes(memory.totalJSHeapSize),
                    limit: this.formatBytes(memory.jsHeapSizeLimit),
                    ratio: Math.round(usageRatio * 100) + '%'
                });
            }
        } catch (error) {
            console.warn('メモリ使用量チェックエラー:', error);
        }
    }

    /**
     * 警告レベルのメモリ処理
     */
    handleWarningMemory() {
        console.warn('メモリ使用量が警告レベルに達しました');
        
        // 不要なキャッシュをクリア
        this.clearUnusedCache();
        
        // 品質レベルを1段階下げる
        if (this.currentQualityLevel < this.qualityLevels.length - 1) {
            this.currentQualityLevel++;
            this.notifyQualityReduction();
        }
    }

    /**
     * クリティカルレベルのメモリ処理
     */
    handleCriticalMemory() {
        console.error('メモリ使用量がクリティカルレベルに達しました');
        
        // 強制的にガベージコレクションを促す
        this.forceGarbageCollection();
        
        // 品質レベルを大幅に下げる
        this.currentQualityLevel = Math.min(
            this.currentQualityLevel + 2, 
            this.qualityLevels.length - 1
        );
        
        // 処理中の重い操作をキャンセル
        this.cancelHeavyOperations();
        
        this.notifyQualityReduction();
    }

    /**
     * 緊急レベルのメモリ処理
     */
    handleEmergencyMemory() {
        console.error('メモリ使用量が緊急レベルに達しました');
        
        // 最低品質レベルに設定
        this.currentQualityLevel = this.qualityLevels.length - 1;
        
        // すべての非必須データをクリア
        this.emergencyCleanup();
        
        // ユーザーに通知
        this.notifyEmergencyMemory();
    }

    /**
     * タイムアウト付き処理の実行
     * @param {Function} operation - 実行する処理
     * @param {string} operationType - 処理タイプ
     * @param {number} customTimeout - カスタムタイムアウト（オプション）
     * @returns {Promise} 処理結果
     */
    async executeWithTimeout(operation, operationType, customTimeout = null) {
        const timeout = customTimeout || this.timeoutThresholds[operationType] || 10000;
        
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const error = new Error(`処理がタイムアウトしました (${timeout}ms)`);
                error.name = 'TimeoutError';
                error.operationType = operationType;
                reject(error);
            }, timeout);
            
            try {
                const result = await operation();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * 段階的品質低下の実行
     * @param {HTMLCanvasElement} canvas - 処理対象のキャンバス
     * @returns {Promise<HTMLCanvasElement>} 品質調整されたキャンバス
     */
    async applyQualityReduction(canvas) {
        const qualityLevel = this.qualityLevels[this.currentQualityLevel];
        
        if (qualityLevel.name === 'high') {
            return canvas; // 品質低下不要
        }
        
        console.log(`品質レベルを${qualityLevel.name}に調整中...`);
        
        const { width, height } = canvas;
        const { maxSize, quality } = qualityLevel;
        
        // サイズ調整が必要かチェック
        if (width <= maxSize.width && height <= maxSize.height) {
            return canvas; // サイズ調整不要
        }
        
        // アスペクト比を保持してリサイズ
        const ratio = Math.min(maxSize.width / width, maxSize.height / height);
        const newWidth = Math.floor(width * ratio);
        const newHeight = Math.floor(height * ratio);
        
        // 新しいキャンバスを作成
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        
        // 品質設定を適用
        ctx.imageSmoothingEnabled = quality > 0.8;
        ctx.imageSmoothingQuality = quality > 0.8 ? 'high' : 'medium';
        
        // リサイズして描画
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        console.log(`画像サイズを調整: ${width}x${height} → ${newWidth}x${newHeight} (品質: ${qualityLevel.name})`);
        
        return newCanvas;
    }

    /**
     * 現在の品質レベル情報の取得
     * @returns {Object} 品質レベル情報
     */
    getCurrentQualityLevel() {
        return {
            ...this.qualityLevels[this.currentQualityLevel],
            index: this.currentQualityLevel
        };
    }

    /**
     * 品質レベルのリセット
     */
    resetQualityLevel() {
        this.currentQualityLevel = 0;
        console.log('品質レベルを高品質にリセットしました');
    }

    /**
     * 不要なキャッシュのクリア
     */
    clearUnusedCache() {
        try {
            // 候補履歴の古いデータをクリア
            if (window.app && window.app.candidateHistory) {
                Object.keys(window.app.candidateHistory).forEach(field => {
                    const history = window.app.candidateHistory[field];
                    if (history.length > 10) {
                        window.app.candidateHistory[field] = history.slice(-5); // 最新5件のみ保持
                    }
                });
            }
            
            // ブラウザキャッシュのクリア（可能な場合）
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        if (name.includes('temp') || name.includes('cache')) {
                            caches.delete(name);
                        }
                    });
                });
            }
        } catch (error) {
            console.warn('キャッシュクリアエラー:', error);
        }
    }

    /**
     * ガベージコレクションの促進
     */
    forceGarbageCollection() {
        try {
            // 大きなオブジェクトを作成・削除してGCを促す
            const dummy = new Array(1000000).fill(0);
            dummy.length = 0;
            
            // 明示的なGC（開発環境でのみ利用可能）
            if (window.gc) {
                window.gc();
            }
        } catch (error) {
            console.warn('ガベージコレクション促進エラー:', error);
        }
    }

    /**
     * 重い処理のキャンセル
     */
    cancelHeavyOperations() {
        try {
            // OCR処理のキャンセル
            if (window.ocrWorker) {
                window.ocrWorker.terminate();
                window.ocrWorker = null;
            }
            
            // 進行中のタイマーをクリア
            const highestTimeoutId = setTimeout(() => {}, 0);
            for (let i = 0; i < highestTimeoutId; i++) {
                clearTimeout(i);
            }
        } catch (error) {
            console.warn('重い処理のキャンセルエラー:', error);
        }
    }

    /**
     * 緊急クリーンアップ
     */
    emergencyCleanup() {
        try {
            // すべてのキャンバスをクリア
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            });
            
            // 大きなオブジェクトをクリア
            if (window.app) {
                window.app.currentImage = null;
                window.app.ocrResults = null;
            }
            
            // 強制的なガベージコレクション
            this.forceGarbageCollection();
        } catch (error) {
            console.warn('緊急クリーンアップエラー:', error);
        }
    }

    /**
     * 品質低下の通知
     */
    notifyQualityReduction() {
        const qualityLevel = this.qualityLevels[this.currentQualityLevel];
        
        if (window.app && window.app.updateStatus) {
            window.app.updateStatus(
                `処理品質を${qualityLevel.name}に調整しました`, 
                'warning'
            );
        }
        
        console.log(`品質レベルを${qualityLevel.name}に調整しました`);
    }

    /**
     * 緊急メモリ状況の通知
     */
    notifyEmergencyMemory() {
        if (window.app && window.app.errorDisplay) {
            const errorResult = {
                type: 'memory_error',
                message: {
                    title: 'メモリ不足',
                    message: 'デバイスのメモリが不足しています。処理品質を最低レベルに調整しました。',
                    type: 'error'
                },
                recovery: {
                    success: true,
                    message: '品質を最低レベルに調整し、不要なデータをクリアしました'
                },
                canRetry: true,
                suggestions: [
                    '他のアプリを閉じてください',
                    'ブラウザを再起動してください',
                    '小さな画像を使用してください'
                ]
            };
            
            window.app.errorDisplay.show(errorResult);
        }
    }

    /**
     * バイト数のフォーマット
     * @param {number} bytes - バイト数
     * @returns {string} フォーマットされた文字列
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * パフォーマンス測定の開始
     * @param {string} name - 測定名
     * @returns {string} 測定ID
     */
    startPerformanceMeasure(name) {
        const measureName = `measure_${name}`;
        performance.mark(`${measureName}_start`);
        return measureName;
    }

    /**
     * パフォーマンス測定の終了
     * @param {string} measureName - 測定ID
     * @returns {number} 処理時間（ミリ秒）
     */
    endPerformanceMeasure(measureName) {
        try {
            const startMark = `${measureName}_start`;
            const endMark = `${measureName}_end`;
            
            performance.mark(endMark);
            performance.measure(measureName, startMark, endMark);
            
            const measure = performance.getEntriesByName(measureName)[0];
            const duration = measure.duration;

            // マークとメジャーをクリーンアップ
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
            performance.clearMeasures(measureName);

            return duration;
        } catch (error) {
            console.warn('パフォーマンス測定エラー:', error);
            return null;
        }
    }

    /**
     * OCRパフォーマンスの記録
     * @param {Object} ocrData - OCR処理データ
     */
    recordOCRPerformance(ocrData) {
        const processingTime = ocrData.processingTime;
        
        // パフォーマンス閾値チェック
        if (processingTime > 10000) { // 10秒以上
            console.warn(`OCR処理時間が長すぎます: ${processingTime}ms`);
            
            if (window.app && window.app.updateStatus) {
                window.app.updateStatus(
                    `OCR処理に${Math.round(processingTime/1000)}秒かかりました`, 
                    'warning'
                );
            }
        }
        
        // 処理時間が長い場合は品質レベルを下げる
        if (processingTime > 15000 && this.currentQualityLevel < this.qualityLevels.length - 1) {
            this.currentQualityLevel++;
            this.notifyQualityReduction();
        }
    }

    /**
     * バンドルサイズの測定
     * @returns {Object} バンドルサイズ情報
     */
    measureBundleSize() {
        try {
            const resourceEntries = performance.getEntriesByType('resource');
            let totalSize = 0;
            const resourceBreakdown = {};

            resourceEntries.forEach(entry => {
                if (entry.transferSize) {
                    totalSize += entry.transferSize;
                    const resourceType = this.getResourceType(entry.name);
                    if (!resourceBreakdown[resourceType]) {
                        resourceBreakdown[resourceType] = 0;
                    }
                    resourceBreakdown[resourceType] += entry.transferSize;
                }
            });

            const bundleInfo = {
                total: totalSize,
                breakdown: resourceBreakdown,
                resourceCount: resourceEntries.length,
                formattedTotal: this.formatBytes(totalSize)
            };

            // バンドルサイズ警告
            if (totalSize > 50 * 1024 * 1024) { // 50MB以上
                console.warn(`バンドルサイズが大きすぎます: ${this.formatBytes(totalSize)}`);
            }

            return bundleInfo;
        } catch (error) {
            console.error('バンドルサイズ測定エラー:', error);
            return null;
        }
    }

    /**
     * リソースタイプの判定
     * @param {string} url - リソースURL
     * @returns {string} リソースタイプ
     */
    getResourceType(url) {
        if (url.includes('.js')) return 'JavaScript';
        if (url.includes('.css')) return 'CSS';
        if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'Images';
        if (url.includes('.wasm')) return 'WebAssembly';
        if (url.includes('.onnx')) return 'ONNX Models';
        if (url.includes('.json')) return 'JSON';
        if (url.includes('.html')) return 'HTML';
        return 'Other';
    }

    /**
     * 初回読み込み時間の測定
     * @returns {Object} 読み込み時間情報
     */
    measureInitialLoadTime() {
        try {
            const navigationTiming = performance.getEntriesByType('navigation')[0];
            if (!navigationTiming) return null;

            const loadTime = navigationTiming.loadEventEnd - navigationTiming.navigationStart;
            const domContentLoadedTime = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
            const firstPaintTime = this.getFirstPaintTime();

            const loadInfo = {
                totalLoadTime: loadTime,
                domContentLoadedTime: domContentLoadedTime,
                firstPaintTime: firstPaintTime,
                formattedLoadTime: `${Math.round(loadTime)}ms`
            };

            // 読み込み時間警告
            if (loadTime > 5000) { // 5秒以上
                console.warn(`初回読み込み時間が長すぎます: ${Math.round(loadTime)}ms`);
            }

            return loadInfo;
        } catch (error) {
            console.error('読み込み時間測定エラー:', error);
            return null;
        }
    }

    /**
     * First Paint時間の取得
     * @returns {number|null} First Paint時間
     */
    getFirstPaintTime() {
        try {
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            return firstPaint ? firstPaint.startTime : null;
        } catch {
            return null;
        }
    }

    /**
     * パフォーマンス最適化提案の生成
     * @returns {Array} 最適化提案リスト
     */
    generateOptimizationSuggestions() {
        const suggestions = [];
        const resourceInfo = this.getResourceInfo();

        // メモリ最適化提案
        if (resourceInfo.memory && resourceInfo.memory.usageRatio > 0.8) {
            suggestions.push({
                category: 'Memory',
                priority: 'HIGH',
                issue: 'メモリ使用率が高い',
                suggestion: '不要なオブジェクトの解放、画像サイズの制限を検討してください'
            });
        }

        // 品質レベル最適化提案
        if (this.currentQualityLevel > 0) {
            suggestions.push({
                category: 'Quality',
                priority: 'MEDIUM',
                issue: '処理品質が低下している',
                suggestion: 'メモリを解放するか、より小さな画像を使用してください'
            });
        }

        // バンドルサイズ最適化提案
        const bundleInfo = this.measureBundleSize();
        if (bundleInfo && bundleInfo.total > 40 * 1024 * 1024) {
            suggestions.push({
                category: 'Bundle Size',
                priority: 'MEDIUM',
                issue: 'バンドルサイズが大きい',
                suggestion: 'コード分割、遅延ロード、不要なライブラリの削除を検討してください'
            });
        }

        return suggestions;
    }

    /**
     * リソース使用状況の取得
     * @returns {Object} リソース情報
     */
    getResourceInfo() {
        const info = {
            qualityLevel: this.getCurrentQualityLevel(),
            isMonitoring: this.isMonitoring,
            bundleSize: this.measureBundleSize(),
            loadTime: this.measureInitialLoadTime()
        };
        
        if (performance.memory) {
            const memory = performance.memory;
            info.memory = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
                formattedUsed: this.formatBytes(memory.usedJSHeapSize),
                formattedLimit: this.formatBytes(memory.jsHeapSizeLimit)
            };
        }
        
        return info;
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        this.stopMemoryMonitoring();
        console.log('ResourceMonitor クリーンアップ完了');
    }
}

// グローバルに公開
window.ResourceMonitor = ResourceMonitor;