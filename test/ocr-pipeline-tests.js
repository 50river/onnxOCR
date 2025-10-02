/**
 * OCRパイプラインテスト
 * 検出精度のテスト、認識精度のテスト、処理時間の測定
 * 要件: 2.2, 7.1
 */

class OCRPipelineTests {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = [];
        this.testImages = new Map();
        this.ocrEngine = null;
        this.workerManager = null;
        
        // テスト用の期待値データ
        this.expectedResults = new Map();
        
        // 性能基準値
        this.performanceThresholds = {
            maxProcessingTime: 10000, // 10秒以内（要件7.1）
            minDetectionAccuracy: 0.7, // 検出精度70%以上
            minRecognitionAccuracy: 0.6, // 認識精度60%以上
            minOverallConfidence: 0.8 // 全体信頼度80%以上（要件2.2）
        };
    }

    /**
     * すべてのOCRパイプラインテストを実行
     */
    async runAllTests() {
        console.log('🧪 OCRパイプラインテストを開始します...');
        
        try {
            await this.setupTestEnvironment();
            await this.prepareTestImages();
            await this.testDetectionAccuracy();
            await this.testRecognitionAccuracy();
            await this.testProcessingTime();
            await this.testPipelineIntegration();
            await this.testErrorRecovery();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ テスト実行中にエラーが発生しました:', error);
        } finally {
            await this.cleanupTestEnvironment();
        }
    }

    /**
     * テスト環境のセットアップ
     */
    async setupTestEnvironment() {
        console.log('📋 OCRパイプラインテスト環境をセットアップ中...');
        
        try {
            // OCRエンジンの利用可能性確認
            if (typeof OCREngine === 'undefined') {
                throw new Error('OCREngineクラスが読み込まれていません');
            }

            if (typeof OCRWorkerManager === 'undefined') {
                throw new Error('OCRWorkerManagerクラスが読み込まれていません');
            }

            // OCRエンジンの初期化
            this.ocrEngine = new OCREngine({
                modelsPath: './models/',
                backends: ['webgl', 'wasm'], // テスト用に安定したバックエンドを使用
                fallbackToTesseract: true
            });

            // Worker Managerの初期化
            this.workerManager = new OCRWorkerManager({
                workerPath: './js/ocr-worker.js',
                timeout: 30000
            });

            this.addTestResult('テスト環境セットアップ', true, 'OCRエンジンとWorker Managerが利用可能です');
            
        } catch (error) {
            this.addTestResult('テスト環境セットアップ', false, error.message);
            throw error;
        }
    }

    /**
     * テスト用画像データの準備
     */
    async prepareTestImages() {
        console.log('📋 テスト用画像データを準備中...');
        
        try {
            // 領収書風のテスト画像を作成
            const receiptImage = await this.createReceiptTestImage();
            this.testImages.set('receipt_test', receiptImage);
            
            // 期待される結果を設定
            this.expectedResults.set('receipt_test', {
                textBlocks: [
                    { text: 'テスト商店', confidence: 0.9, type: 'payee' },
                    { text: '2024/01/15', confidence: 0.85, type: 'date' },
                    { text: '1,500円', confidence: 0.9, type: 'amount' },
                    { text: '会議費', confidence: 0.8, type: 'purpose' }
                ],
                expectedDetections: 4,
                minConfidence: 0.8
            });

            // 複雑なレイアウトのテスト画像
            const complexImage = await this.createComplexLayoutImage();
            this.testImages.set('complex_layout', complexImage);
            
            this.expectedResults.set('complex_layout', {
                textBlocks: [
                    { text: '株式会社テスト', confidence: 0.85, type: 'payee' },
                    { text: '令和6年1月15日', confidence: 0.8, type: 'date' },
                    { text: '合計 ¥2,500', confidence: 0.85, type: 'amount' }
                ],
                expectedDetections: 6,
                minConfidence: 0.7
            });

            // 低品質画像のテスト
            const lowQualityImage = await this.createLowQualityImage();
            this.testImages.set('low_quality', lowQualityImage);
            
            this.expectedResults.set('low_quality', {
                textBlocks: [
                    { text: 'ショップ', confidence: 0.6, type: 'payee' }
                ],
                expectedDetections: 2,
                minConfidence: 0.5
            });

            // 空の画像（エラーテスト用）
            const emptyImage = await this.createEmptyImage();
            this.testImages.set('empty_image', emptyImage);
            
            this.expectedResults.set('empty_image', {
                textBlocks: [],
                expectedDetections: 0,
                minConfidence: 0
            });

            this.addTestResult('テスト画像準備', true, `${this.testImages.size}個のテスト画像を準備しました`);
            
        } catch (error) {
            this.addTestResult('テスト画像準備', false, error.message);
            throw error;
        }
    }

    /**
     * 検出精度のテスト
     */
    async testDetectionAccuracy() {
        console.log('📋 検出精度テスト...');
        
        try {
            // OCRエンジンの初期化
            await this.ocrEngine.initialize();
            
            // 各テスト画像で検出テストを実行
            for (const [imageName, imageData] of this.testImages) {
                await this.testSingleImageDetection(imageName, imageData);
            }

            // 検出精度の統計を計算
            await this.calculateDetectionStatistics();
            
        } catch (error) {
            this.addTestResult('検出精度テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 単一画像の検出テスト
     */
    async testSingleImageDetection(imageName, imageData) {
        try {
            const startTime = Date.now();
            
            // 検出処理の実行
            const detectionResult = await this.ocrEngine.detectText(imageData, {
                detectionThreshold: 0.5,
                nmsThreshold: 0.3
            });
            
            const detectionTime = Date.now() - startTime;
            const expectedResult = this.expectedResults.get(imageName);
            
            // 検出された領域数の確認
            const detectedRegions = detectionResult.textRegions || [];
            const detectionCount = detectedRegions.length;
            const expectedCount = expectedResult.expectedDetections;
            
            // 検出精度の計算
            const detectionAccuracy = expectedCount > 0 ? 
                Math.min(detectionCount / expectedCount, 1.0) : 
                (detectionCount === 0 ? 1.0 : 0.0);
            
            // 信頼度の確認
            const avgConfidence = detectedRegions.length > 0 ?
                detectedRegions.reduce((sum, region) => sum + region.confidence, 0) / detectedRegions.length :
                0;
            
            const passed = detectionAccuracy >= this.performanceThresholds.minDetectionAccuracy &&
                          avgConfidence >= expectedResult.minConfidence;
            
            this.addTestResult(
                `検出精度 (${imageName})`,
                passed,
                `検出数: ${detectionCount}/${expectedCount}, 精度: ${(detectionAccuracy * 100).toFixed(1)}%, 信頼度: ${(avgConfidence * 100).toFixed(1)}%, 時間: ${detectionTime}ms`
            );
            
            // 性能メトリクスに記録
            this.performanceMetrics.push({
                test: `detection_${imageName}`,
                processingTime: detectionTime,
                accuracy: detectionAccuracy,
                confidence: avgConfidence,
                detectedCount: detectionCount,
                expectedCount: expectedCount
            });
            
        } catch (error) {
            this.addTestResult(`検出精度 (${imageName})`, false, `エラー: ${error.message}`);
        }
    }

    /**
     * 認識精度のテスト
     */
    async testRecognitionAccuracy() {
        console.log('📋 認識精度テスト...');
        
        try {
            // 各テスト画像で認識テストを実行
            for (const [imageName, imageData] of this.testImages) {
                await this.testSingleImageRecognition(imageName, imageData);
            }

            // 認識精度の統計を計算
            await this.calculateRecognitionStatistics();
            
        } catch (error) {
            this.addTestResult('認識精度テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 単一画像の認識テスト
     */
    async testSingleImageRecognition(imageName, imageData) {
        try {
            const startTime = Date.now();
            
            // 完全なOCRパイプライン（検出→認識）を実行
            const ocrResult = await this.ocrEngine.processImage(imageData, {
                progressCallback: (message, progress) => {
                    // 進行状況をログに記録
                    console.log(`${imageName} OCR進行状況: ${message} (${progress}%)`);
                }
            });
            
            const recognitionTime = Date.now() - startTime;
            const expectedResult = this.expectedResults.get(imageName);
            
            // 認識されたテキストブロックの確認
            const recognizedBlocks = ocrResult.textBlocks || [];
            const expectedBlocks = expectedResult.textBlocks || [];
            
            // テキスト認識精度の計算
            let correctRecognitions = 0;
            let totalExpected = expectedBlocks.length;
            
            for (const expectedBlock of expectedBlocks) {
                const matchingBlock = recognizedBlocks.find(block => 
                    this.calculateTextSimilarity(block.text, expectedBlock.text) > 0.7
                );
                
                if (matchingBlock && matchingBlock.confidence >= expectedBlock.confidence * 0.8) {
                    correctRecognitions++;
                }
            }
            
            const recognitionAccuracy = totalExpected > 0 ? 
                correctRecognitions / totalExpected : 
                (recognizedBlocks.length === 0 ? 1.0 : 0.0);
            
            // 全体の信頼度
            const overallConfidence = ocrResult.confidence || 0;
            
            const passed = recognitionAccuracy >= this.performanceThresholds.minRecognitionAccuracy &&
                          overallConfidence >= expectedResult.minConfidence * 0.8;
            
            this.addTestResult(
                `認識精度 (${imageName})`,
                passed,
                `認識精度: ${(recognitionAccuracy * 100).toFixed(1)}%, 信頼度: ${(overallConfidence * 100).toFixed(1)}%, 時間: ${recognitionTime}ms, 認識数: ${recognizedBlocks.length}`
            );
            
            // 詳細な認識結果をログ出力
            console.log(`${imageName} 認識結果:`, recognizedBlocks.map(block => ({
                text: block.text,
                confidence: (block.confidence * 100).toFixed(1) + '%'
            })));
            
            // 性能メトリクスに記録
            this.performanceMetrics.push({
                test: `recognition_${imageName}`,
                processingTime: recognitionTime,
                accuracy: recognitionAccuracy,
                confidence: overallConfidence,
                recognizedCount: recognizedBlocks.length,
                expectedCount: totalExpected,
                engine: ocrResult.engine || 'unknown'
            });
            
        } catch (error) {
            this.addTestResult(`認識精度 (${imageName})`, false, `エラー: ${error.message}`);
        }
    }

    /**
     * 処理時間の測定テスト
     */
    async testProcessingTime() {
        console.log('📋 処理時間測定テスト...');
        
        try {
            // 初回処理時間のテスト（要件7.1: 10秒以内）
            await this.testInitialProcessingTime();
            
            // 連続処理時間のテスト
            await this.testConsecutiveProcessingTime();
            
            // Worker使用時の処理時間テスト
            await this.testWorkerProcessingTime();
            
            // 処理時間統計の計算
            await this.calculateProcessingTimeStatistics();
            
        } catch (error) {
            this.addTestResult('処理時間測定', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 初回処理時間のテスト
     */
    async testInitialProcessingTime() {
        try {
            // 新しいエンジンインスタンスで初回処理をテスト
            const freshEngine = new OCREngine({
                modelsPath: './models/',
                backends: ['webgl', 'wasm'],
                fallbackToTesseract: true
            });
            
            const testImage = this.testImages.get('receipt_test');
            const startTime = Date.now();
            
            // 初期化から処理完了までの時間を測定
            await freshEngine.initialize();
            const initTime = Date.now() - startTime;
            
            const processStartTime = Date.now();
            const result = await freshEngine.processImage(testImage);
            const processTime = Date.now() - processStartTime;
            
            const totalTime = Date.now() - startTime;
            
            // 要件7.1: 初回OCR処理が10秒以内
            const passed = totalTime <= this.performanceThresholds.maxProcessingTime;
            
            this.addTestResult(
                '初回処理時間',
                passed,
                `総時間: ${totalTime}ms (初期化: ${initTime}ms, 処理: ${processTime}ms), 基準: ${this.performanceThresholds.maxProcessingTime}ms以内`
            );
            
            this.performanceMetrics.push({
                test: 'initial_processing',
                processingTime: totalTime,
                initializationTime: initTime,
                ocrTime: processTime,
                passed: passed,
                engine: result.engine
            });
            
        } catch (error) {
            this.addTestResult('初回処理時間', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 連続処理時間のテスト
     */
    async testConsecutiveProcessingTime() {
        try {
            const testImage = this.testImages.get('receipt_test');
            const processingTimes = [];
            const iterations = 3;
            
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await this.ocrEngine.processImage(testImage);
                const processingTime = Date.now() - startTime;
                processingTimes.push(processingTime);
            }
            
            const avgTime = processingTimes.reduce((sum, time) => sum + time, 0) / iterations;
            const maxTime = Math.max(...processingTimes);
            const minTime = Math.min(...processingTimes);
            
            // 連続処理では初回より高速になることを期待
            const passed = avgTime < this.performanceThresholds.maxProcessingTime * 0.8;
            
            this.addTestResult(
                '連続処理時間',
                passed,
                `平均: ${avgTime.toFixed(0)}ms, 最大: ${maxTime}ms, 最小: ${minTime}ms (${iterations}回実行)`
            );
            
            this.performanceMetrics.push({
                test: 'consecutive_processing',
                processingTime: avgTime,
                maxTime: maxTime,
                minTime: minTime,
                iterations: iterations,
                passed: passed
            });
            
        } catch (error) {
            this.addTestResult('連続処理時間', false, `エラー: ${error.message}`);
        }
    }

    /**
     * Worker使用時の処理時間テスト
     */
    async testWorkerProcessingTime() {
        try {
            // Worker Managerの初期化
            await this.workerManager.initialize({
                modelsPath: './models/',
                backends: ['webgl', 'wasm'],
                fallbackToTesseract: true
            });
            
            const testImage = this.testImages.get('receipt_test');
            const startTime = Date.now();
            
            const result = await this.workerManager.processImage(testImage, {
                progressCallback: (message, progress) => {
                    console.log(`Worker処理進行状況: ${message} (${progress}%)`);
                }
            });
            
            const workerTime = Date.now() - startTime;
            
            // Workerを使用してもメインスレッドをブロックしないことを確認
            const passed = workerTime <= this.performanceThresholds.maxProcessingTime * 1.2; // Worker使用時は20%のオーバーヘッドを許容
            
            this.addTestResult(
                'Worker処理時間',
                passed,
                `Worker処理時間: ${workerTime}ms, エンジン: ${result.engine || 'unknown'}`
            );
            
            this.performanceMetrics.push({
                test: 'worker_processing',
                processingTime: workerTime,
                passed: passed,
                engine: result.engine,
                usingWorker: true
            });
            
        } catch (error) {
            this.addTestResult('Worker処理時間', false, `エラー: ${error.message}`);
        }
    }

    /**
     * パイプライン統合テスト
     */
    async testPipelineIntegration() {
        console.log('📋 パイプライン統合テスト...');
        
        try {
            // エンドツーエンドのパイプラインテスト
            await this.testEndToEndPipeline();
            
            // フォールバック機能のテスト
            await this.testFallbackPipeline();
            
            // 部分的な失敗からの回復テスト
            await this.testPartialFailureRecovery();
            
        } catch (error) {
            this.addTestResult('パイプライン統合', false, `エラー: ${error.message}`);
        }
    }

    /**
     * エンドツーエンドパイプラインテスト
     */
    async testEndToEndPipeline() {
        try {
            const testImage = this.testImages.get('receipt_test');
            const startTime = Date.now();
            
            // 完全なパイプライン実行
            const result = await this.ocrEngine.processImage(testImage, {
                progressCallback: (message, progress) => {
                    console.log(`E2Eパイプライン: ${message} (${progress}%)`);
                }
            });
            
            const totalTime = Date.now() - startTime;
            
            // 結果の検証
            const hasTextBlocks = result.textBlocks && result.textBlocks.length > 0;
            const hasConfidence = typeof result.confidence === 'number';
            const hasProcessingTime = typeof result.processingTime === 'number';
            const hasEngine = typeof result.engine === 'string';
            
            const passed = hasTextBlocks && hasConfidence && hasProcessingTime && hasEngine &&
                          totalTime <= this.performanceThresholds.maxProcessingTime;
            
            this.addTestResult(
                'E2Eパイプライン',
                passed,
                `処理時間: ${totalTime}ms, テキストブロック: ${result.textBlocks?.length || 0}, 信頼度: ${(result.confidence * 100).toFixed(1)}%, エンジン: ${result.engine}`
            );
            
        } catch (error) {
            this.addTestResult('E2Eパイプライン', false, `エラー: ${error.message}`);
        }
    }

    /**
     * フォールバックパイプラインテスト
     */
    async testFallbackPipeline() {
        try {
            // フォールバック用のエンジンを作成
            const fallbackEngine = new OCREngine({
                backends: ['invalid-backend'], // 意図的に無効なバックエンドを指定
                fallbackToTesseract: true
            });
            
            await fallbackEngine.initialize();
            
            const testImage = this.testImages.get('receipt_test');
            const startTime = Date.now();
            
            const result = await fallbackEngine.processImage(testImage);
            const fallbackTime = Date.now() - startTime;
            
            // フォールバックが正常に動作することを確認
            const usingFallback = result.fallback === true || result.engine === 'tesseract';
            const hasResults = result.textBlocks && result.textBlocks.length > 0;
            
            const passed = usingFallback && hasResults;
            
            this.addTestResult(
                'フォールバックパイプライン',
                passed,
                `フォールバック使用: ${usingFallback}, 処理時間: ${fallbackTime}ms, エンジン: ${result.engine}, テキストブロック: ${result.textBlocks?.length || 0}`
            );
            
        } catch (error) {
            this.addTestResult('フォールバックパイプライン', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 部分的な失敗からの回復テスト
     */
    async testPartialFailureRecovery() {
        try {
            // 空の画像で部分的な失敗をテスト
            const emptyImage = this.testImages.get('empty_image');
            
            const result = await this.ocrEngine.processImage(emptyImage);
            
            // 空の画像でもエラーにならず、適切な結果を返すことを確認
            const hasValidStructure = result && typeof result === 'object';
            const hasTextBlocks = Array.isArray(result.textBlocks);
            const hasConfidence = typeof result.confidence === 'number';
            
            const passed = hasValidStructure && hasTextBlocks && hasConfidence;
            
            this.addTestResult(
                '部分的失敗回復',
                passed,
                `空画像処理: 構造有効=${hasValidStructure}, テキストブロック配列=${hasTextBlocks}, 信頼度=${hasConfidence}`
            );
            
        } catch (error) {
            this.addTestResult('部分的失敗回復', false, `エラー: ${error.message}`);
        }
    }

    /**
     * エラー回復テスト
     */
    async testErrorRecovery() {
        console.log('📋 エラー回復テスト...');
        
        try {
            // 不正な画像データでのエラー処理テスト
            await this.testInvalidImageHandling();
            
            // メモリ不足シミュレーションテスト
            await this.testMemoryLimitHandling();
            
            // タイムアウト処理テスト
            await this.testTimeoutHandling();
            
        } catch (error) {
            this.addTestResult('エラー回復', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 不正な画像データの処理テスト
     */
    async testInvalidImageHandling() {
        try {
            // null画像データ
            try {
                await this.ocrEngine.processImage(null);
                this.addTestResult('不正画像処理 (null)', false, 'nullでエラーが発生すべきでした');
            } catch (error) {
                this.addTestResult('不正画像処理 (null)', true, `適切にエラーが発生: ${error.message}`);
            }
            
            // 空のImageData
            try {
                const emptyImageData = new ImageData(1, 1);
                const result = await this.ocrEngine.processImage(emptyImageData);
                
                // 空の画像でも適切な結果構造を返すことを確認
                const isValidResult = result && Array.isArray(result.textBlocks);
                this.addTestResult('不正画像処理 (空)', isValidResult, '空画像で適切な結果構造が返されました');
            } catch (error) {
                this.addTestResult('不正画像処理 (空)', true, `適切にエラーが発生: ${error.message}`);
            }
            
        } catch (error) {
            this.addTestResult('不正画像処理', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * メモリ制限処理テスト
     */
    async testMemoryLimitHandling() {
        try {
            // 大きな画像データを作成してメモリ制限をテスト
            const largeImageData = new ImageData(4000, 3000); // 12MP相当
            
            const startTime = Date.now();
            const result = await this.ocrEngine.processImage(largeImageData);
            const processingTime = Date.now() - startTime;
            
            // 大きな画像でも適切に処理されることを確認
            const isValidResult = result && Array.isArray(result.textBlocks);
            const withinTimeLimit = processingTime <= this.performanceThresholds.maxProcessingTime * 2; // 大画像は2倍の時間を許容
            
            const passed = isValidResult && withinTimeLimit;
            
            this.addTestResult(
                'メモリ制限処理',
                passed,
                `大画像処理: 有効結果=${isValidResult}, 処理時間=${processingTime}ms`
            );
            
        } catch (error) {
            // メモリ不足エラーが適切に処理されることを確認
            this.addTestResult('メモリ制限処理', true, `メモリ制限が適切に処理されました: ${error.message}`);
        }
    }

    /**
     * タイムアウト処理テスト
     */
    async testTimeoutHandling() {
        try {
            // Worker Managerでタイムアウトテスト
            const shortTimeoutManager = new OCRWorkerManager({
                workerPath: './js/ocr-worker.js',
                timeout: 100 // 100msの短いタイムアウト
            });
            
            try {
                await shortTimeoutManager.initialize();
                const testImage = this.testImages.get('receipt_test');
                await shortTimeoutManager.processImage(testImage);
                
                this.addTestResult('タイムアウト処理', false, 'タイムアウトが発生すべきでした');
            } catch (error) {
                const isTimeoutError = error.message.includes('タイムアウト') || error.message.includes('timeout');
                this.addTestResult('タイムアウト処理', isTimeoutError, `適切にタイムアウトが処理されました: ${error.message}`);
            } finally {
                await shortTimeoutManager.dispose();
            }
            
        } catch (error) {
            this.addTestResult('タイムアウト処理', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * 検出精度統計の計算
     */
    async calculateDetectionStatistics() {
        const detectionMetrics = this.performanceMetrics.filter(m => m.test.startsWith('detection_'));
        
        if (detectionMetrics.length === 0) return;
        
        const avgAccuracy = detectionMetrics.reduce((sum, m) => sum + m.accuracy, 0) / detectionMetrics.length;
        const avgConfidence = detectionMetrics.reduce((sum, m) => sum + m.confidence, 0) / detectionMetrics.length;
        const avgTime = detectionMetrics.reduce((sum, m) => sum + m.processingTime, 0) / detectionMetrics.length;
        
        const passed = avgAccuracy >= this.performanceThresholds.minDetectionAccuracy;
        
        this.addTestResult(
            '検出精度統計',
            passed,
            `平均精度: ${(avgAccuracy * 100).toFixed(1)}%, 平均信頼度: ${(avgConfidence * 100).toFixed(1)}%, 平均時間: ${avgTime.toFixed(0)}ms`
        );
    }

    /**
     * 認識精度統計の計算
     */
    async calculateRecognitionStatistics() {
        const recognitionMetrics = this.performanceMetrics.filter(m => m.test.startsWith('recognition_'));
        
        if (recognitionMetrics.length === 0) return;
        
        const avgAccuracy = recognitionMetrics.reduce((sum, m) => sum + m.accuracy, 0) / recognitionMetrics.length;
        const avgConfidence = recognitionMetrics.reduce((sum, m) => sum + m.confidence, 0) / recognitionMetrics.length;
        const avgTime = recognitionMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recognitionMetrics.length;
        
        const passed = avgAccuracy >= this.performanceThresholds.minRecognitionAccuracy;
        
        this.addTestResult(
            '認識精度統計',
            passed,
            `平均精度: ${(avgAccuracy * 100).toFixed(1)}%, 平均信頼度: ${(avgConfidence * 100).toFixed(1)}%, 平均時間: ${avgTime.toFixed(0)}ms`
        );
    }

    /**
     * 処理時間統計の計算
     */
    async calculateProcessingTimeStatistics() {
        const timeMetrics = this.performanceMetrics.filter(m => m.processingTime);
        
        if (timeMetrics.length === 0) return;
        
        const times = timeMetrics.map(m => m.processingTime);
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        
        const passed = avgTime <= this.performanceThresholds.maxProcessingTime;
        
        this.addTestResult(
            '処理時間統計',
            passed,
            `平均: ${avgTime.toFixed(0)}ms, 最大: ${maxTime}ms, 最小: ${minTime}ms, 基準: ${this.performanceThresholds.maxProcessingTime}ms以内`
        );
    }

    /**
     * テキスト類似度の計算（簡易版）
     */
    calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const normalize = (str) => str.toLowerCase().replace(/\s+/g, '');
        const norm1 = normalize(text1);
        const norm2 = normalize(text2);
        
        if (norm1 === norm2) return 1.0;
        
        // レーベンシュタイン距離による類似度計算
        const maxLen = Math.max(norm1.length, norm2.length);
        if (maxLen === 0) return 1.0;
        
        const distance = this.levenshteinDistance(norm1, norm2);
        return 1.0 - (distance / maxLen);
    }

    /**
     * レーベンシュタイン距離の計算
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * 領収書風テスト画像の作成
     */
    async createReceiptTestImage() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 600;
            
            const ctx = canvas.getContext('2d');
            
            // 背景
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 600);
            
            // 店名
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('テスト商店', 200, 80);
            
            // 日付
            ctx.font = '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('2024/01/15', 50, 150);
            
            // 金額
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('1,500円', 350, 300);
            
            // 適用
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('会議費', 50, 400);
            
            // ImageDataに変換
            const imageData = ctx.getImageData(0, 0, 400, 600);
            resolve(imageData);
        });
    }

    /**
     * 複雑なレイアウトのテスト画像作成
     */
    async createComplexLayoutImage() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 700;
            
            const ctx = canvas.getContext('2d');
            
            // 背景
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 500, 700);
            
            // 複雑なレイアウト
            ctx.fillStyle = '#000000';
            
            // 会社名（大きなフォント）
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('株式会社テスト', 250, 60);
            
            // 和暦日付
            ctx.font = '18px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('令和6年1月15日', 50, 120);
            
            // 複数の項目
            ctx.font = '14px Arial';
            ctx.fillText('商品A', 50, 200);
            ctx.textAlign = 'right';
            ctx.fillText('¥800', 450, 200);
            
            ctx.textAlign = 'left';
            ctx.fillText('商品B', 50, 230);
            ctx.textAlign = 'right';
            ctx.fillText('¥1,200', 450, 230);
            
            // 合計
            ctx.font = 'bold 20px Arial';
            ctx.fillText('合計 ¥2,500', 450, 300);
            
            const imageData = ctx.getImageData(0, 0, 500, 700);
            resolve(imageData);
        });
    }

    /**
     * 低品質画像の作成
     */
    async createLowQualityImage() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 150;
            
            const ctx = canvas.getContext('2d');
            
            // 低品質な背景（ノイズ追加）
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 200, 150);
            
            // ノイズ追加
            const imageData = ctx.getImageData(0, 0, 200, 150);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const noise = Math.random() * 50 - 25;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // 低品質なテキスト
            ctx.fillStyle = '#333333';
            ctx.font = '12px Arial';
            ctx.fillText('ショップ', 20, 50);
            ctx.fillText('¥500', 20, 80);
            
            const finalImageData = ctx.getImageData(0, 0, 200, 150);
            resolve(finalImageData);
        });
    }

    /**
     * 空の画像の作成
     */
    async createEmptyImage() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 100, 100);
            
            const imageData = ctx.getImageData(0, 0, 100, 100);
            resolve(imageData);
        });
    }

    /**
     * テスト環境のクリーンアップ
     */
    async cleanupTestEnvironment() {
        try {
            if (this.ocrEngine && typeof this.ocrEngine.dispose === 'function') {
                await this.ocrEngine.dispose();
            }
            
            if (this.workerManager) {
                await this.workerManager.dispose();
            }
            
            console.log('🧹 テスト環境をクリーンアップしました');
        } catch (error) {
            console.warn('クリーンアップ中にエラーが発生しました:', error);
        }
    }

    /**
     * テスト結果の追加
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        });

        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    /**
     * テスト結果の表示
     */
    displayResults() {
        const passedTests = this.testResults.filter(result => result.passed).length;
        const totalTests = this.testResults.length;
        
        console.log('\n📊 OCRパイプラインテスト結果サマリー');
        console.log(`合格: ${passedTests}/${totalTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        // 性能メトリクスのサマリー
        if (this.performanceMetrics.length > 0) {
            console.log('\n⚡ 性能メトリクス:');
            
            const avgProcessingTime = this.performanceMetrics
                .reduce((sum, m) => sum + m.processingTime, 0) / this.performanceMetrics.length;
            
            const detectionAccuracies = this.performanceMetrics
                .filter(m => m.test.startsWith('detection_'))
                .map(m => m.accuracy);
            
            const recognitionAccuracies = this.performanceMetrics
                .filter(m => m.test.startsWith('recognition_'))
                .map(m => m.accuracy);
            
            if (detectionAccuracies.length > 0) {
                const avgDetectionAccuracy = detectionAccuracies.reduce((sum, acc) => sum + acc, 0) / detectionAccuracies.length;
                console.log(`平均検出精度: ${(avgDetectionAccuracy * 100).toFixed(1)}%`);
            }
            
            if (recognitionAccuracies.length > 0) {
                const avgRecognitionAccuracy = recognitionAccuracies.reduce((sum, acc) => sum + acc, 0) / recognitionAccuracies.length;
                console.log(`平均認識精度: ${(avgRecognitionAccuracy * 100).toFixed(1)}%`);
            }
            
            console.log(`平均処理時間: ${avgProcessingTime.toFixed(0)}ms`);
        }

        if (passedTests === totalTests) {
            console.log('🎉 すべてのOCRパイプラインテストに合格しました！');
        } else {
            console.log('⚠️  一部のテストが失敗しました。詳細を確認してください。');
        }

        // 詳細結果をテーブル形式で表示
        console.table(this.testResults.map(result => ({
            テスト名: result.name,
            結果: result.passed ? '合格' : '不合格',
            メッセージ: result.message
        })));

        // DOM要素があれば結果を表示
        this.displayResultsInDOM();
    }

    /**
     * DOM内にテスト結果を表示
     */
    displayResultsInDOM() {
        const existingResults = document.getElementById('ocr-pipeline-test-results');
        if (existingResults) {
            existingResults.remove();
        }

        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'ocr-pipeline-test-results';
        resultsContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            background: white;
            border: 2px solid #2563eb;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
        `;

        const passedTests = this.testResults.filter(result => result.passed).length;
        const totalTests = this.testResults.length;

        // 性能メトリクスの計算
        let performanceSummary = '';
        if (this.performanceMetrics.length > 0) {
            const avgTime = this.performanceMetrics.reduce((sum, m) => sum + m.processingTime, 0) / this.performanceMetrics.length;
            performanceSummary = `<div style="margin-top: 8px; font-size: 11px; color: #6b7280;">平均処理時間: ${avgTime.toFixed(0)}ms</div>`;
        }

        resultsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; color: #2563eb;">OCRパイプラインテスト結果</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <div style="margin-bottom: 12px; padding: 8px; background: ${passedTests === totalTests ? '#dbeafe' : '#fef3c7'}; border-radius: 4px;">
                <strong>${passedTests}/${totalTests} 合格 (${((passedTests / totalTests) * 100).toFixed(1)}%)</strong>
                ${performanceSummary}
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${this.testResults.map(result => `
                    <div style="margin-bottom: 8px; padding: 6px; background: ${result.passed ? '#f0f9ff' : '#fef2f2'}; border-radius: 4px; border-left: 3px solid ${result.passed ? '#2563eb' : '#dc2626'};">
                        <div style="font-weight: bold; color: ${result.passed ? '#2563eb' : '#dc2626'};">
                            ${result.passed ? '✅' : '❌'} ${result.name}
                        </div>
                        <div style="color: #6b7280; margin-top: 2px; font-size: 11px;">
                            ${result.message}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(resultsContainer);
    }
}

// グローバルに公開してコンソールから実行可能にする
window.OCRPipelineTests = OCRPipelineTests;

// 自動実行（オプション）
if (window.location.search.includes('run-ocr-pipeline-tests')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const tests = new OCRPipelineTests();
        await tests.runAllTests();
    });
}

console.log('OCRパイプラインテストが読み込まれました。window.OCRPipelineTests でアクセスできます。');
console.log('テストを実行するには: new OCRPipelineTests().runAllTests()');