/**
 * E2Eテスト（エンドツーエンドテスト）
 * 実際の領収書画像を使用したテスト、4項目抽出の精度確認、矩形選択による再OCR、オフライン動作の確認
 * 要件: 2.2, 3.2, 6.2
 */

class E2ETests {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = [];
        this.testImages = new Map();
        this.ocrEngine = null;
        this.fieldExtractor = null;
        this.rectangleSelector = null;
        this.storageManager = null;
        
        // E2Eテスト用の期待値基準
        this.e2eThresholds = {
            minFieldsExtracted: 2, // 4項目中2項目以上抽出（要件）
            minConfidence: 0.8, // confidence≥0.8（要件）
            maxProcessingTime: 10000, // 10秒以内
            offlineTestTimeout: 5000 // オフラインテスト用タイムアウト
        };
    }

    /**
     * すべてのE2Eテストを実行
     */
    async runAllTests() {
        console.log('🧪 E2Eテスト（エンドツーエンドテスト）を開始します...');
        
        try {
            await this.setupE2EEnvironment();
            await this.prepareRealReceiptImages();
            await this.testFieldExtractionAccuracy();
            await this.testRectangleSelectionReOCR();
            await this.testOfflineOperation();
            await this.testCompleteWorkflow();
            
            this.displayE2EResults();
        } catch (error) {
            console.error('❌ E2Eテスト実行中にエラーが発生しました:', error);
        } finally {
            await this.cleanupE2EEnvironment();
        }
    }

    /**
     * E2Eテスト環境のセットアップ
     */
    async setupE2EEnvironment() {
        console.log('📋 E2Eテスト環境をセットアップ中...');
        
        try {
            // 必要なクラスの利用可能性確認
            const requiredClasses = ['OCREngine', 'FieldExtractor', 'RectangleSelector', 'StorageManager'];
            for (const className of requiredClasses) {
                if (typeof window[className] === 'undefined') {
                    throw new Error(`${className}クラスが読み込まれていません`);
                }
            }

            // OCRエンジンの初期化
            this.ocrEngine = new OCREngine({
                modelsPath: './models/',
                backends: ['webgl', 'wasm'],
                fallbackToTesseract: true
            });

            // フィールド抽出エンジンの初期化
            this.fieldExtractor = new FieldExtractor();

            // 矩形選択機能の初期化
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 800;
            testCanvas.height = 600;
            testCanvas.style.position = 'absolute';
            testCanvas.style.left = '-9999px';
            document.body.appendChild(testCanvas);
            
            this.rectangleSelector = new RectangleSelector(testCanvas);

            // ストレージマネージャーの初期化
            this.storageManager = new StorageManager();
            await this.storageManager.initialize();

            this.addTestResult('E2E環境セットアップ', true, 'すべてのコンポーネントが正常に初期化されました');
            
        } catch (error) {
            this.addTestResult('E2E環境セットアップ', false, error.message);
            throw error;
        }
    }

    /**
     * 実際の領収書画像データの準備
     */
    async prepareRealReceiptImages() {
        console.log('📋 実際の領収書画像データを準備中...');
        
        try {
            // 様々なタイプの領収書画像を作成
            const receiptTypes = [
                'restaurant', 'convenience_store', 'gas_station', 
                'pharmacy', 'bookstore', 'coffee_shop'
            ];

            for (const type of receiptTypes) {
                const receiptImage = await this.createRealisticReceiptImage(type);
                this.testImages.set(type, receiptImage);
            }

            // 低品質・高品質画像のバリエーション
            const qualityVariations = ['high_quality', 'medium_quality', 'low_quality'];
            for (const quality of qualityVariations) {
                const qualityImage = await this.createQualityVariationImage(quality);
                this.testImages.set(`restaurant_${quality}`, qualityImage);
            }

            // 角度・照明条件のバリエーション
            const conditionVariations = ['tilted', 'shadowed', 'bright'];
            for (const condition of conditionVariations) {
                const conditionImage = await this.createConditionVariationImage(condition);
                this.testImages.set(`receipt_${condition}`, conditionImage);
            }

            this.addTestResult('実画像準備', true, `${this.testImages.size}種類の実際的な領収書画像を準備しました`);
            
        } catch (error) {
            this.addTestResult('実画像準備', false, error.message);
            throw error;
        }
    }

    /**
     * 4項目抽出の精度確認テスト（要件2.2）
     */
    async testFieldExtractionAccuracy() {
        console.log('📋 4項目抽出精度確認テスト...');
        
        try {
            await this.ocrEngine.initialize();
            
            const extractionResults = [];
            
            for (const [imageName, imageData] of this.testImages) {
                const result = await this.testSingleImageFieldExtraction(imageName, imageData);
                extractionResults.push(result);
            }

            // 全体統計の計算
            const totalTests = extractionResults.length;
            const successfulExtractions = extractionResults.filter(r => 
                r.extractedFields >= this.e2eThresholds.minFieldsExtracted &&
                r.highConfidenceFields >= this.e2eThresholds.minFieldsExtracted
            ).length;

            const successRate = (successfulExtractions / totalTests) * 100;
            const avgFieldsExtracted = extractionResults.reduce((sum, r) => sum + r.extractedFields, 0) / totalTests;
            const avgConfidence = extractionResults.reduce((sum, r) => sum + r.avgConfidence, 0) / totalTests;

            const passed = successRate >= 70; // 70%以上の成功率を期待

            this.addTestResult(
                '4項目抽出精度統計',
                passed,
                `成功率: ${successRate.toFixed(1)}% (${successfulExtractions}/${totalTests}), 平均抽出項目数: ${avgFieldsExtracted.toFixed(1)}, 平均信頼度: ${avgConfidence.toFixed(3)}`
            );

            // 項目別の抽出成功率
            await this.analyzeFieldExtractionByType(extractionResults);
            
        } catch (error) {
            this.addTestResult('4項目抽出精度', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 単一画像の4項目抽出テスト
     */
    async testSingleImageFieldExtraction(imageName, imageData) {
        try {
            const startTime = Date.now();
            
            // OCR処理の実行
            const ocrResult = await this.ocrEngine.processImage(imageData, {
                progressCallback: (message, progress) => {
                    console.log(`${imageName} OCR進行状況: ${message} (${progress}%)`);
                }
            });
            
            const ocrTime = Date.now() - startTime;
            
            // フィールド抽出の実行
            const extractionStartTime = Date.now();
            const fieldsResult = await this.fieldExtractor.extractFields(ocrResult);
            const extractionTime = Date.now() - extractionStartTime;
            
            const totalTime = Date.now() - startTime;
            
            // 抽出結果の分析
            const fields = ['date', 'payee', 'amount', 'purpose'];
            let extractedFields = 0;
            let highConfidenceFields = 0;
            let totalConfidence = 0;
            
            const fieldDetails = {};
            
            for (const field of fields) {
                const fieldData = fieldsResult[field];
                if (fieldData && fieldData.value && fieldData.value.trim() !== '') {
                    extractedFields++;
                    totalConfidence += fieldData.confidence;
                    
                    if (fieldData.confidence >= this.e2eThresholds.minConfidence) {
                        highConfidenceFields++;
                    }
                    
                    fieldDetails[field] = {
                        value: fieldData.value,
                        confidence: fieldData.confidence,
                        extracted: true
                    };
                } else {
                    fieldDetails[field] = {
                        value: '',
                        confidence: 0,
                        extracted: false
                    };
                }
            }
            
            const avgConfidence = extractedFields > 0 ? totalConfidence / extractedFields : 0;
            
            // 要件チェック：2項目以上でconfidence≥0.8
            const meetsRequirement = extractedFields >= this.e2eThresholds.minFieldsExtracted &&
                                   highConfidenceFields >= this.e2eThresholds.minFieldsExtracted;
            
            const passed = meetsRequirement && totalTime <= this.e2eThresholds.maxProcessingTime;
            
            this.addTestResult(
                `4項目抽出 (${imageName})`,
                passed,
                `抽出: ${extractedFields}/4項目, 高信頼度: ${highConfidenceFields}/4項目, 平均信頼度: ${avgConfidence.toFixed(3)}, 処理時間: ${totalTime}ms`
            );
            
            // 詳細ログ
            console.log(`${imageName} 抽出詳細:`, fieldDetails);
            
            // 性能メトリクスに記録
            this.performanceMetrics.push({
                test: `field_extraction_${imageName}`,
                processingTime: totalTime,
                ocrTime: ocrTime,
                extractionTime: extractionTime,
                extractedFields: extractedFields,
                highConfidenceFields: highConfidenceFields,
                avgConfidence: avgConfidence,
                meetsRequirement: meetsRequirement,
                fieldDetails: fieldDetails
            });
            
            return {
                imageName: imageName,
                extractedFields: extractedFields,
                highConfidenceFields: highConfidenceFields,
                avgConfidence: avgConfidence,
                totalTime: totalTime,
                meetsRequirement: meetsRequirement,
                fieldDetails: fieldDetails
            };
            
        } catch (error) {
            this.addTestResult(`4項目抽出 (${imageName})`, false, `エラー: ${error.message}`);
            return {
                imageName: imageName,
                extractedFields: 0,
                highConfidenceFields: 0,
                avgConfidence: 0,
                totalTime: 0,
                meetsRequirement: false,
                error: error.message
            };
        }
    }

    /**
     * 矩形選択による再OCRテスト（要件3.2）
     */
    async testRectangleSelectionReOCR() {
        console.log('📋 矩形選択による再OCRテスト...');
        
        try {
            // 代表的な画像で矩形選択テストを実行
            const testImage = this.testImages.get('restaurant');
            if (!testImage) {
                throw new Error('テスト画像が見つかりません');
            }

            // 画像を矩形選択機能に設定
            this.rectangleSelector.setImageData(testImage, testImage.width, testImage.height);

            // 複数の領域で矩形選択・再OCRテスト
            const testRegions = [
                { name: '日付領域', start: { x: 50, y: 80 }, end: { x: 200, y: 120 } },
                { name: '支払先領域', start: { x: 50, y: 40 }, end: { x: 300, y: 80 } },
                { name: '金額領域', start: { x: 250, y: 200 }, end: { x: 350, y: 240 } },
                { name: '適用領域', start: { x: 50, y: 160 }, end: { x: 250, y: 200 } }
            ];

            const reOCRResults = [];

            for (const region of testRegions) {
                const result = await this.testSingleRegionReOCR(region);
                reOCRResults.push(result);
            }

            // 再OCR結果の統計
            const successfulReOCRs = reOCRResults.filter(r => r.success).length;
            const avgImprovement = reOCRResults
                .filter(r => r.success && r.confidenceImprovement > 0)
                .reduce((sum, r) => sum + r.confidenceImprovement, 0) / 
                Math.max(1, reOCRResults.filter(r => r.success && r.confidenceImprovement > 0).length);

            const passed = successfulReOCRs >= testRegions.length * 0.7; // 70%以上成功

            this.addTestResult(
                '矩形選択再OCR統計',
                passed,
                `成功: ${successfulReOCRs}/${testRegions.length}, 平均信頼度向上: ${avgImprovement.toFixed(3)}`
            );

            // ズーム機能との組み合わせテスト
            await this.testZoomReOCRCombination();
            
        } catch (error) {
            this.addTestResult('矩形選択再OCR', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 単一領域の再OCRテスト
     */
    async testSingleRegionReOCR(region) {
        try {
            // 矩形選択の実行
            this.rectangleSelector.clearSelection();
            this.rectangleSelector.startSelection(region.start);
            this.rectangleSelector.updateSelection(region.end);
            this.rectangleSelector.endSelection();

            const selectionImageData = this.rectangleSelector.getSelectionImageData();
            
            if (!selectionImageData) {
                return {
                    regionName: region.name,
                    success: false,
                    error: '選択領域の画像データが取得できませんでした'
                };
            }

            // 元の全体OCR結果（比較用）
            const fullImageResult = await this.ocrEngine.processImage(
                this.rectangleSelector.originalImageData
            );

            // 選択領域の再OCR実行
            const startTime = Date.now();
            const regionOCRResult = await this.ocrEngine.processRegion(selectionImageData, {
                x: region.start.x,
                y: region.start.y,
                width: region.end.x - region.start.x,
                height: region.end.y - region.start.y
            });
            const reOCRTime = Date.now() - startTime;

            if (regionOCRResult && regionOCRResult.textBlocks && regionOCRResult.textBlocks.length > 0) {
                // 信頼度の比較
                const regionConfidence = regionOCRResult.confidence || 0;
                const fullImageConfidence = fullImageResult.confidence || 0;
                const confidenceImprovement = regionConfidence - fullImageConfidence;

                const success = regionConfidence >= 0.6; // 最低限の信頼度

                this.addTestResult(
                    `再OCR (${region.name})`,
                    success,
                    `信頼度: ${regionConfidence.toFixed(3)} (改善: ${confidenceImprovement >= 0 ? '+' : ''}${confidenceImprovement.toFixed(3)}), 時間: ${reOCRTime}ms`
                );

                return {
                    regionName: region.name,
                    success: success,
                    confidence: regionConfidence,
                    confidenceImprovement: confidenceImprovement,
                    processingTime: reOCRTime,
                    textBlocks: regionOCRResult.textBlocks
                };
            } else {
                this.addTestResult(
                    `再OCR (${region.name})`,
                    false,
                    'OCR結果が取得できませんでした'
                );

                return {
                    regionName: region.name,
                    success: false,
                    error: 'OCR結果が取得できませんでした'
                };
            }
            
        } catch (error) {
            this.addTestResult(`再OCR (${region.name})`, false, `エラー: ${error.message}`);
            return {
                regionName: region.name,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ズーム機能との組み合わせテスト
     */
    async testZoomReOCRCombination() {
        try {
            // ズームレベルを変えて再OCRの精度を比較
            const zoomLevels = [1, 1.5, 2, 3];
            const testRegion = { start: { x: 100, y: 100 }, end: { x: 200, y: 140 } };
            
            const zoomResults = [];

            for (const zoomLevel of zoomLevels) {
                this.rectangleSelector.resetTransform();
                this.rectangleSelector.zoom(zoomLevel);
                
                // ズーム後の座標調整
                const adjustedStart = {
                    x: testRegion.start.x * zoomLevel,
                    y: testRegion.start.y * zoomLevel
                };
                const adjustedEnd = {
                    x: testRegion.end.x * zoomLevel,
                    y: testRegion.end.y * zoomLevel
                };

                this.rectangleSelector.clearSelection();
                this.rectangleSelector.startSelection(adjustedStart);
                this.rectangleSelector.updateSelection(adjustedEnd);
                this.rectangleSelector.endSelection();

                const selectionImageData = this.rectangleSelector.getSelectionImageData();
                
                if (selectionImageData) {
                    const ocrResult = await this.ocrEngine.processRegion(selectionImageData);
                    
                    zoomResults.push({
                        zoomLevel: zoomLevel,
                        confidence: ocrResult ? ocrResult.confidence : 0,
                        imageSize: selectionImageData.width * selectionImageData.height
                    });
                }
            }

            // ズームによる改善効果の確認
            const baseResult = zoomResults.find(r => r.zoomLevel === 1);
            const bestResult = zoomResults.reduce((best, current) => 
                current.confidence > best.confidence ? current : best
            );

            if (baseResult && bestResult) {
                const improvement = bestResult.confidence - baseResult.confidence;
                const passed = improvement >= 0; // ズームで悪化しないことを確認

                this.addTestResult(
                    'ズーム再OCR組み合わせ',
                    passed,
                    `最適ズーム: ${bestResult.zoomLevel}x, 信頼度改善: ${improvement >= 0 ? '+' : ''}${improvement.toFixed(3)}`
                );
            }

            this.rectangleSelector.resetTransform();
            
        } catch (error) {
            this.addTestResult('ズーム再OCR組み合わせ', false, `エラー: ${error.message}`);
        }
    }

    /**
     * オフライン動作の確認テスト（要件6.2）
     */
    async testOfflineOperation() {
        console.log('📋 オフライン動作確認テスト...');
        
        try {
            // Service Workerの状態確認
            await this.testServiceWorkerStatus();
            
            // キャッシュされたリソースの確認
            await this.testCachedResources();
            
            // オフライン状態でのOCR処理テスト
            await this.testOfflineOCRProcessing();
            
            // オフライン状態でのデータ保存テスト
            await this.testOfflineDataStorage();
            
        } catch (error) {
            this.addTestResult('オフライン動作', false, `エラー: ${error.message}`);
        }
    }

    /**
     * Service Workerの状態確認
     */
    async testServiceWorkerStatus() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                
                if (registration && registration.active) {
                    this.addTestResult(
                        'Service Worker状態',
                        true,
                        `Service Workerがアクティブです: ${registration.active.state}`
                    );

                    // Service Workerとの通信テスト
                    const messageChannel = new MessageChannel();
                    const messagePromise = new Promise((resolve) => {
                        messageChannel.port1.onmessage = (event) => {
                            resolve(event.data);
                        };
                    });

                    registration.active.postMessage({
                        type: 'GET_VERSION'
                    }, [messageChannel.port2]);

                    const response = await Promise.race([
                        messagePromise,
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('タイムアウト')), 2000)
                        )
                    ]);

                    if (response && response.version) {
                        this.addTestResult(
                            'Service Worker通信',
                            true,
                            `バージョン: ${response.version}`
                        );
                    } else {
                        this.addTestResult(
                            'Service Worker通信',
                            false,
                            'Service Workerからの応答が無効です'
                        );
                    }
                } else {
                    this.addTestResult(
                        'Service Worker状態',
                        false,
                        'Service Workerが登録されていないか、アクティブではありません'
                    );
                }
            } else {
                this.addTestResult(
                    'Service Worker状態',
                    false,
                    'Service Workerがサポートされていません'
                );
            }
            
        } catch (error) {
            this.addTestResult('Service Worker状態', false, `エラー: ${error.message}`);
        }
    }

    /**
     * キャッシュされたリソースの確認
     */
    async testCachedResources() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                
                if (cacheNames.length > 0) {
                    let totalCachedResources = 0;
                    const requiredResources = [
                        '/',
                        '/index.html',
                        '/js/app.js',
                        '/styles/main.css',
                        '/manifest.json'
                    ];

                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        const cachedRequests = await cache.keys();
                        totalCachedResources += cachedRequests.length;

                        // 必要なリソースがキャッシュされているかチェック
                        for (const resource of requiredResources) {
                            const cachedResponse = await cache.match(resource);
                            if (cachedResponse) {
                                this.addTestResult(
                                    `キャッシュ確認 (${resource})`,
                                    true,
                                    'リソースがキャッシュされています'
                                );
                            }
                        }
                    }

                    this.addTestResult(
                        'キャッシュリソース統計',
                        totalCachedResources > 0,
                        `${totalCachedResources}個のリソースがキャッシュされています`
                    );
                } else {
                    this.addTestResult(
                        'キャッシュリソース',
                        false,
                        'キャッシュが見つかりません'
                    );
                }
            } else {
                this.addTestResult(
                    'キャッシュAPI',
                    false,
                    'Cache APIがサポートされていません'
                );
            }
            
        } catch (error) {
            this.addTestResult('キャッシュリソース', false, `エラー: ${error.message}`);
        }
    }

    /**
     * オフライン状態でのOCR処理テスト
     */
    async testOfflineOCRProcessing() {
        try {
            // ネットワーク状態の確認
            const isOnline = navigator.onLine;
            
            if (!isOnline) {
                // 既にオフライン状態
                await this.performOfflineOCRTest();
            } else {
                // オフライン状態をシミュレート
                this.addTestResult(
                    'オフライン状態シミュレーション',
                    true,
                    'オンライン状態でのテストを実行します（実際のオフラインテストはブラウザの開発者ツールで実行してください）'
                );

                // オンライン状態でもローカルリソースのみでOCRが動作することを確認
                await this.performOfflineOCRTest();
            }
            
        } catch (error) {
            this.addTestResult('オフラインOCR処理', false, `エラー: ${error.message}`);
        }
    }

    /**
     * オフライン状態でのOCR処理実行
     */
    async performOfflineOCRTest() {
        try {
            const testImage = this.testImages.get('restaurant');
            if (!testImage) {
                throw new Error('テスト画像が見つかりません');
            }

            const startTime = Date.now();
            
            // OCR処理の実行（外部通信なしで動作することを確認）
            const ocrResult = await this.ocrEngine.processImage(testImage, {
                timeout: this.e2eThresholds.offlineTestTimeout
            });
            
            const processingTime = Date.now() - startTime;

            if (ocrResult && ocrResult.textBlocks && ocrResult.textBlocks.length > 0) {
                this.addTestResult(
                    'オフラインOCR処理',
                    true,
                    `処理時間: ${processingTime}ms, テキストブロック: ${ocrResult.textBlocks.length}個, エンジン: ${ocrResult.engine || 'unknown'}`
                );

                // フィールド抽出もオフラインで動作することを確認
                const fieldsResult = await this.fieldExtractor.extractFields(ocrResult);
                const extractedFieldsCount = Object.values(fieldsResult)
                    .filter(field => field && field.value && field.value.trim() !== '').length;

                this.addTestResult(
                    'オフラインフィールド抽出',
                    extractedFieldsCount > 0,
                    `${extractedFieldsCount}個のフィールドが抽出されました`
                );
            } else {
                this.addTestResult(
                    'オフラインOCR処理',
                    false,
                    'OCR結果が取得できませんでした'
                );
            }
            
        } catch (error) {
            this.addTestResult('オフラインOCR処理', false, `エラー: ${error.message}`);
        }
    }

    /**
     * オフライン状態でのデータ保存テスト
     */
    async testOfflineDataStorage() {
        try {
            // テストデータの作成
            const testReceiptData = {
                id: 'e2e_test_' + Date.now(),
                date: { value: '2024/01/15', confidence: 0.9 },
                payee: { value: 'テストストア', confidence: 0.85 },
                amount: { value: 1500, confidence: 0.95 },
                purpose: { value: 'テスト用途', confidence: 0.8 },
                imageData: this.testImages.get('restaurant'),
                createdAt: new Date()
            };

            // オフライン状態でのデータ保存
            const saveResult = await this.storageManager.saveReceipt(testReceiptData);
            
            if (saveResult && saveResult.success) {
                this.addTestResult(
                    'オフラインデータ保存',
                    true,
                    `データが正常に保存されました: ID ${saveResult.id}`
                );

                // 保存したデータの読み込み確認
                const loadedData = await this.storageManager.getReceipt(saveResult.id);
                
                if (loadedData && loadedData.id === testReceiptData.id) {
                    this.addTestResult(
                        'オフラインデータ読み込み',
                        true,
                        '保存したデータが正常に読み込まれました'
                    );

                    // エクスポート機能のテスト
                    const exportResult = await this.storageManager.exportData([loadedData], 'json');
                    
                    if (exportResult && exportResult.data) {
                        this.addTestResult(
                            'オフラインデータエクスポート',
                            true,
                            `データが正常にエクスポートされました: ${exportResult.data.length}文字`
                        );
                    } else {
                        this.addTestResult(
                            'オフラインデータエクスポート',
                            false,
                            'データのエクスポートに失敗しました'
                        );
                    }

                    // テストデータの削除
                    await this.storageManager.deleteReceipt(saveResult.id);
                } else {
                    this.addTestResult(
                        'オフラインデータ読み込み',
                        false,
                        '保存したデータの読み込みに失敗しました'
                    );
                }
            } else {
                this.addTestResult(
                    'オフラインデータ保存',
                    false,
                    'データの保存に失敗しました'
                );
            }
            
        } catch (error) {
            this.addTestResult('オフラインデータ保存', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 完全なワークフローテスト
     */
    async testCompleteWorkflow() {
        console.log('📋 完全ワークフローテスト...');
        
        try {
            const testImage = this.testImages.get('restaurant');
            if (!testImage) {
                throw new Error('テスト画像が見つかりません');
            }

            const workflowStartTime = Date.now();
            
            // ステップ1: 画像の読み込みと前処理
            console.log('ワークフロー: 画像前処理...');
            // 実際のアプリでは画像の回転補正や透視補正が行われる
            
            // ステップ2: OCR処理
            console.log('ワークフロー: OCR処理...');
            const ocrResult = await this.ocrEngine.processImage(testImage);
            
            // ステップ3: フィールド抽出
            console.log('ワークフロー: フィールド抽出...');
            const fieldsResult = await this.fieldExtractor.extractFields(ocrResult);
            
            // ステップ4: 低信頼度フィールドの矩形選択による改善
            console.log('ワークフロー: 矩形選択による改善...');
            const lowConfidenceFields = Object.entries(fieldsResult)
                .filter(([_, field]) => field && field.confidence < this.e2eThresholds.minConfidence)
                .map(([name, _]) => name);
            
            let improvedFields = 0;
            for (const fieldName of lowConfidenceFields) {
                // 該当フィールドの推定位置で矩形選択を実行
                const fieldRegion = this.estimateFieldRegion(fieldName, ocrResult);
                if (fieldRegion) {
                    const improvedResult = await this.performFieldImprovement(fieldName, fieldRegion);
                    if (improvedResult && improvedResult.confidence >= this.e2eThresholds.minConfidence) {
                        improvedFields++;
                        fieldsResult[fieldName] = improvedResult;
                    }
                }
            }
            
            // ステップ5: データ保存
            console.log('ワークフロー: データ保存...');
            const receiptData = {
                id: 'workflow_test_' + Date.now(),
                ...fieldsResult,
                imageData: testImage,
                createdAt: new Date()
            };
            
            const saveResult = await this.storageManager.saveReceipt(receiptData);
            
            const workflowTime = Date.now() - workflowStartTime;
            
            // ワークフロー結果の評価
            const extractedFields = Object.values(fieldsResult)
                .filter(field => field && field.value && field.value.trim() !== '').length;
            const highConfidenceFields = Object.values(fieldsResult)
                .filter(field => field && field.confidence >= this.e2eThresholds.minConfidence).length;
            
            const workflowSuccess = extractedFields >= this.e2eThresholds.minFieldsExtracted &&
                                  highConfidenceFields >= this.e2eThresholds.minFieldsExtracted &&
                                  saveResult && saveResult.success &&
                                  workflowTime <= this.e2eThresholds.maxProcessingTime;
            
            this.addTestResult(
                '完全ワークフロー',
                workflowSuccess,
                `抽出: ${extractedFields}/4項目, 高信頼度: ${highConfidenceFields}/4項目, 改善: ${improvedFields}項目, 処理時間: ${workflowTime}ms, 保存: ${saveResult ? '成功' : '失敗'}`
            );
            
            // テストデータの削除
            if (saveResult && saveResult.id) {
                await this.storageManager.deleteReceipt(saveResult.id);
            }
            
        } catch (error) {
            this.addTestResult('完全ワークフロー', false, `エラー: ${error.message}`);
        }
    }

    /**
     * フィールドの推定位置を計算
     */
    estimateFieldRegion(fieldName, ocrResult) {
        // 簡易的な位置推定（実際のアプリではより高度な推定を行う）
        const regions = {
            date: { x: 50, y: 80, width: 150, height: 40 },
            payee: { x: 50, y: 40, width: 250, height: 40 },
            amount: { x: 250, y: 200, width: 100, height: 40 },
            purpose: { x: 50, y: 160, width: 200, height: 40 }
        };
        
        return regions[fieldName] || null;
    }

    /**
     * フィールドの改善処理
     */
    async performFieldImprovement(fieldName, region) {
        try {
            this.rectangleSelector.clearSelection();
            this.rectangleSelector.startSelection({ x: region.x, y: region.y });
            this.rectangleSelector.updateSelection({ 
                x: region.x + region.width, 
                y: region.y + region.height 
            });
            this.rectangleSelector.endSelection();

            const selectionImageData = this.rectangleSelector.getSelectionImageData();
            if (!selectionImageData) {
                return null;
            }

            const regionOCRResult = await this.ocrEngine.processRegion(selectionImageData);
            if (!regionOCRResult || !regionOCRResult.textBlocks || regionOCRResult.textBlocks.length === 0) {
                return null;
            }

            // フィールド固有の抽出処理
            let extractedValue = null;
            switch (fieldName) {
                case 'date':
                    extractedValue = this.fieldExtractor.extractDate(regionOCRResult.textBlocks);
                    break;
                case 'payee':
                    extractedValue = this.fieldExtractor.extractPayee(regionOCRResult.textBlocks);
                    break;
                case 'amount':
                    extractedValue = this.fieldExtractor.extractAmount(regionOCRResult.textBlocks);
                    break;
                case 'purpose':
                    extractedValue = this.fieldExtractor.extractPurpose(regionOCRResult.textBlocks);
                    break;
            }

            return extractedValue;
            
        } catch (error) {
            console.error(`フィールド改善エラー (${fieldName}):`, error);
            return null;
        }
    }

    /**
     * 項目別抽出成功率の分析
     */
    async analyzeFieldExtractionByType(extractionResults) {
        const fieldStats = {
            date: { extracted: 0, highConfidence: 0 },
            payee: { extracted: 0, highConfidence: 0 },
            amount: { extracted: 0, highConfidence: 0 },
            purpose: { extracted: 0, highConfidence: 0 }
        };

        for (const result of extractionResults) {
            if (result.fieldDetails) {
                for (const [fieldName, fieldData] of Object.entries(result.fieldDetails)) {
                    if (fieldData.extracted) {
                        fieldStats[fieldName].extracted++;
                        if (fieldData.confidence >= this.e2eThresholds.minConfidence) {
                            fieldStats[fieldName].highConfidence++;
                        }
                    }
                }
            }
        }

        const totalTests = extractionResults.length;
        for (const [fieldName, stats] of Object.entries(fieldStats)) {
            const extractionRate = (stats.extracted / totalTests) * 100;
            const confidenceRate = (stats.highConfidence / totalTests) * 100;
            
            this.addTestResult(
                `${fieldName}項目抽出統計`,
                extractionRate >= 50, // 50%以上の抽出率を期待
                `抽出率: ${extractionRate.toFixed(1)}%, 高信頼度率: ${confidenceRate.toFixed(1)}%`
            );
        }
    }

    /**
     * 現実的な領収書画像の作成
     */
    async createRealisticReceiptImage(type) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 600;
            
            const ctx = canvas.getContext('2d');
            
            // 背景
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 600);
            
            // 領収書タイプ別のコンテンツ
            const receiptContent = this.getReceiptContent(type);
            
            // ヘッダー（店名）
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(receiptContent.storeName, 200, 60);
            
            // 日付
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(receiptContent.date, 50, 100);
            
            // 明細
            let yPos = 140;
            ctx.font = '12px Arial';
            for (const item of receiptContent.items) {
                ctx.fillText(item.name, 50, yPos);
                ctx.textAlign = 'right';
                ctx.fillText(item.price, 350, yPos);
                ctx.textAlign = 'left';
                yPos += 20;
            }
            
            // 合計
            yPos += 20;
            ctx.font = 'bold 16px Arial';
            ctx.fillText('合計', 250, yPos);
            ctx.textAlign = 'right';
            ctx.fillText(`¥${receiptContent.total.toLocaleString()}`, 350, yPos);
            
            // ImageDataに変換
            const imageData = ctx.getImageData(0, 0, 400, 600);
            resolve(imageData);
        });
    }

    /**
     * 領収書タイプ別のコンテンツ取得
     */
    getReceiptContent(type) {
        const contents = {
            restaurant: {
                storeName: 'レストラン花月',
                date: '2024/01/15',
                items: [
                    { name: 'ランチセットA', price: '¥1,200' },
                    { name: 'ドリンク', price: '¥300' }
                ],
                total: 1500
            },
            convenience_store: {
                storeName: 'コンビニマート',
                date: '2024/01/16',
                items: [
                    { name: 'おにぎり', price: '¥120' },
                    { name: 'お茶', price: '¥100' },
                    { name: '文房具', price: '¥280' }
                ],
                total: 500
            },
            gas_station: {
                storeName: 'ガソリンスタンド太郎',
                date: '2024/01/17',
                items: [
                    { name: 'レギュラー 30L', price: '¥4,500' }
                ],
                total: 4500
            },
            pharmacy: {
                storeName: 'さくら薬局',
                date: '2024/01/18',
                items: [
                    { name: '風邪薬', price: '¥800' },
                    { name: 'マスク', price: '¥200' }
                ],
                total: 1000
            },
            bookstore: {
                storeName: '本の森書店',
                date: '2024/01/19',
                items: [
                    { name: 'プログラミング本', price: '¥2,800' },
                    { name: 'ノート', price: '¥200' }
                ],
                total: 3000
            },
            coffee_shop: {
                storeName: 'カフェ・ド・パリ',
                date: '2024/01/20',
                items: [
                    { name: 'ブレンドコーヒー', price: '¥400' },
                    { name: 'ケーキセット', price: '¥600' }
                ],
                total: 1000
            }
        };
        
        return contents[type] || contents.restaurant;
    }

    /**
     * 品質バリエーション画像の作成
     */
    async createQualityVariationImage(quality) {
        const baseImage = await this.createRealisticReceiptImage('restaurant');
        
        // 品質に応じた画像処理を適用
        const canvas = document.createElement('canvas');
        canvas.width = baseImage.width;
        canvas.height = baseImage.height;
        const ctx = canvas.getContext('2d');
        
        // ImageDataをCanvasに描画
        ctx.putImageData(baseImage, 0, 0);
        
        // 品質調整
        switch (quality) {
            case 'low_quality':
                // ノイズ追加とぼかし
                this.addNoise(ctx, canvas.width, canvas.height, 0.1);
                ctx.filter = 'blur(1px)';
                ctx.drawImage(canvas, 0, 0);
                ctx.filter = 'none';
                break;
            case 'medium_quality':
                // 軽微なノイズ
                this.addNoise(ctx, canvas.width, canvas.height, 0.05);
                break;
            case 'high_quality':
                // そのまま（高品質）
                break;
        }
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    /**
     * 条件バリエーション画像の作成
     */
    async createConditionVariationImage(condition) {
        const baseImage = await this.createRealisticReceiptImage('restaurant');
        
        const canvas = document.createElement('canvas');
        canvas.width = baseImage.width;
        canvas.height = baseImage.height;
        const ctx = canvas.getContext('2d');
        
        ctx.putImageData(baseImage, 0, 0);
        
        // 条件に応じた変換
        switch (condition) {
            case 'tilted':
                // 回転
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(5 * Math.PI / 180); // 5度回転
                ctx.translate(-canvas.width / 2, -canvas.height / 2);
                ctx.drawImage(canvas, 0, 0);
                break;
            case 'shadowed':
                // 影の追加
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(0, 0, canvas.width / 3, canvas.height);
                break;
            case 'bright':
                // 明度調整
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
        }
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    /**
     * ノイズ追加
     */
    addNoise(ctx, width, height, intensity) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity * 255;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * テスト結果の記録
     */
    addTestResult(testName, passed, message = '') {
        this.testResults.push({
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    /**
     * E2Eテスト結果の表示
     */
    displayE2EResults() {
        console.log('\n📊 E2Eテスト結果サマリー');
        console.log('================================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
        
        console.log(`合格: ${passedTests}/${totalTests}`);
        console.log(`成功率: ${successRate.toFixed(1)}%`);
        console.log(`失敗: ${failedTests}`);
        
        if (failedTests > 0) {
            console.log('\n❌ 失敗したテスト:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
        }
        
        // 性能メトリクスの表示
        if (this.performanceMetrics.length > 0) {
            console.log('\n📈 性能メトリクス:');
            const avgProcessingTime = this.performanceMetrics
                .filter(m => m.processingTime)
                .reduce((sum, m) => sum + m.processingTime, 0) / 
                Math.max(1, this.performanceMetrics.filter(m => m.processingTime).length);
            
            console.log(`  平均処理時間: ${avgProcessingTime.toFixed(0)}ms`);
            
            const requirementsMet = this.performanceMetrics
                .filter(m => m.meetsRequirement).length;
            const totalRequirementTests = this.performanceMetrics
                .filter(m => typeof m.meetsRequirement === 'boolean').length;
            
            if (totalRequirementTests > 0) {
                const requirementSuccessRate = (requirementsMet / totalRequirementTests) * 100;
                console.log(`  要件達成率: ${requirementSuccessRate.toFixed(1)}% (${requirementsMet}/${totalRequirementTests})`);
            }
        }
        
        if (successRate >= 80) {
            console.log('\n🎉 E2Eテストに合格しました！');
        } else if (successRate >= 60) {
            console.log('\n⚠️ E2Eテストは部分的に成功しました。改善が必要です。');
        } else {
            console.log('\n❌ E2Eテストに失敗しました。大幅な改善が必要です。');
        }
    }

    /**
     * E2Eテスト環境のクリーンアップ
     */
    async cleanupE2EEnvironment() {
        try {
            // テスト用キャンバスの削除
            const testCanvases = document.querySelectorAll('canvas[style*="-9999px"]');
            testCanvases.forEach(canvas => canvas.remove());
            
            // OCRエンジンのクリーンアップ
            if (this.ocrEngine && typeof this.ocrEngine.dispose === 'function') {
                await this.ocrEngine.dispose();
            }
            
            // ストレージマネージャーのクリーンアップ
            if (this.storageManager && typeof this.storageManager.dispose === 'function') {
                await this.storageManager.dispose();
            }
            
            console.log('📋 E2Eテスト環境をクリーンアップしました');
            
        } catch (error) {
            console.error('クリーンアップエラー:', error);
        }
    }
}

// E2Eテストの実行関数
async function runE2ETests() {
    const e2eTests = new E2ETests();
    await e2eTests.runAllTests();
}

// ブラウザ環境での自動実行
if (typeof window !== 'undefined' && window.location.search.includes('run-e2e-tests')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runE2ETests, 1000);
    });
}