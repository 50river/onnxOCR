/**
 * ストレージ機能のユニットテスト
 * 要件: 5.1, 5.2, 5.3, 5.4
 * 
 * テスト対象:
 * - データ保存・読み込みのテスト
 * - エクスポート機能のテスト
 * - 上限管理のテスト
 */

class StorageFunctionalityTests {
    constructor() {
        this.testResults = [];
        this.storageManager = null;
        this.exportManager = null;
        this.zipExportManager = null;
        this.testDbName = 'TestReceiptOCRDB';
    }

    /**
     * すべてのストレージ機能テストを実行
     */
    async runAllTests() {
        console.log('🧪 ストレージ機能テストを開始します...');
        
        try {
            await this.setupTestEnvironment();
            await this.testDataSaveLoad();
            await this.testExportFunctionality();
            await this.testLimitManagement();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ テスト実行中にエラーが発生しました:', error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * テスト環境の準備
     */
    async setupTestEnvironment() {
        console.log('📋 テスト環境を準備中...');
        
        try {
            // テスト用ストレージマネージャーの作成
            this.storageManager = new StorageManager();
            this.storageManager.dbName = this.testDbName; // テスト用DB名に変更
            
            // エクスポートマネージャーの作成
            this.exportManager = new ExportManager();
            this.zipExportManager = new ZipExportManager();
            
            // データベースの初期化
            await this.storageManager.initialize();
            
            // テスト用データベースのクリア
            await this.storageManager.clearAll();

            this.addTestResult('テスト環境準備', true, 'ストレージテスト環境が正常に準備されました');
            
        } catch (error) {
            this.addTestResult('テスト環境準備', false, error.message);
            throw error;
        }
    }

    /**
     * データ保存・読み込みのテスト
     */
    async testDataSaveLoad() {
        console.log('📋 データ保存・読み込みテスト...');
        
        // 基本的な保存・読み込みテスト
        await this.testBasicSaveLoad();
        
        // 画像付きデータの保存・読み込みテスト
        await this.testImageSaveLoad();
        
        // 複数データの保存・読み込みテスト
        await this.testMultipleDataSaveLoad();
        
        // データ削除テスト
        await this.testDataDeletion();
        
        // 検索機能テスト
        await this.testSearchFunctionality();
        
        // ストレージ情報取得テスト
        await this.testStorageInfo();
    }

    /**
     * 基本的な保存・読み込みテスト
     */
    async testBasicSaveLoad() {
        try {
            const testReceiptData = {
                date: { 
                    value: '2024/03/15', 
                    confidence: 0.95,
                    candidates: [
                        { value: '2024/03/15', confidence: 0.95, originalText: '2024年3月15日' }
                    ]
                },
                payee: { 
                    value: '株式会社テスト', 
                    confidence: 0.88,
                    candidates: [
                        { value: '株式会社テスト', confidence: 0.88, originalText: '株式会社テスト' }
                    ]
                },
                amount: { 
                    value: '1500', 
                    confidence: 0.92,
                    candidates: [
                        { value: '1500', confidence: 0.92, originalText: '¥1,500' }
                    ]
                },
                purpose: { 
                    value: '会議費', 
                    confidence: 0.85,
                    candidates: [
                        { value: '会議費', confidence: 0.85, originalText: '会議費' }
                    ]
                }
            };

            // データの保存
            const savedId = await this.storageManager.saveReceipt(testReceiptData);
            const saveSuccess = savedId && typeof savedId === 'string';

            // データの読み込み
            const loadedReceipt = await this.storageManager.getReceipt(savedId);
            const loadSuccess = loadedReceipt && loadedReceipt.id === savedId;

            // データ内容の確認
            const dataMatches = loadedReceipt && 
                               loadedReceipt.data.date.value === testReceiptData.date.value &&
                               loadedReceipt.data.payee.value === testReceiptData.payee.value &&
                               loadedReceipt.data.amount.value === testReceiptData.amount.value &&
                               loadedReceipt.data.purpose.value === testReceiptData.purpose.value;

            // メタデータの確認
            const hasMetadata = loadedReceipt && 
                              loadedReceipt.createdAt &&
                              loadedReceipt.lastAccessedAt &&
                              loadedReceipt.hasImage === false;

            this.addTestResult(
                '基本保存・読み込み',
                saveSuccess && loadSuccess && dataMatches && hasMetadata,
                `保存: ${saveSuccess}, 読み込み: ${loadSuccess}, データ: ${dataMatches}, メタデータ: ${hasMetadata}`
            );

        } catch (error) {
            this.addTestResult('基本保存・読み込み', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 画像付きデータの保存・読み込みテスト
     */
    async testImageSaveLoad() {
        try {
            const testReceiptData = {
                date: { value: '2024/03/16', confidence: 0.90 },
                payee: { value: 'テスト商店', confidence: 0.85 },
                amount: { value: '2500', confidence: 0.88 },
                purpose: { value: '交通費', confidence: 0.82 }
            };

            // テスト用画像データの作成（小さなPNG画像）
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, 100, 100);
            
            const imageBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });

            // 画像付きデータの保存
            const savedId = await this.storageManager.saveReceipt(testReceiptData, imageBlob);
            const saveSuccess = savedId && typeof savedId === 'string';

            // データの読み込み
            const loadedReceipt = await this.storageManager.getReceipt(savedId);
            const loadSuccess = loadedReceipt && loadedReceipt.hasImage === true;

            // 画像データの読み込み
            const loadedImage = await this.storageManager.getImage(savedId);
            const imageLoadSuccess = loadedImage && loadedImage instanceof Blob && loadedImage.size > 0;

            this.addTestResult(
                '画像付き保存・読み込み',
                saveSuccess && loadSuccess && imageLoadSuccess,
                `保存: ${saveSuccess}, データ読み込み: ${loadSuccess}, 画像読み込み: ${imageLoadSuccess}`
            );

        } catch (error) {
            this.addTestResult('画像付き保存・読み込み', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 複数データの保存・読み込みテスト
     */
    async testMultipleDataSaveLoad() {
        try {
            const testData = [
                {
                    date: { value: '2024/03/10', confidence: 0.95 },
                    payee: { value: 'A商店', confidence: 0.90 },
                    amount: { value: '1000', confidence: 0.92 },
                    purpose: { value: '食費', confidence: 0.88 }
                },
                {
                    date: { value: '2024/03/11', confidence: 0.87 },
                    payee: { value: 'B株式会社', confidence: 0.85 },
                    amount: { value: '3000', confidence: 0.90 },
                    purpose: { value: '会議費', confidence: 0.82 }
                },
                {
                    date: { value: '2024/03/12', confidence: 0.93 },
                    payee: { value: 'Cストア', confidence: 0.88 },
                    amount: { value: '500', confidence: 0.95 },
                    purpose: { value: '消耗品', confidence: 0.85 }
                }
            ];

            // 複数データの保存
            const savedIds = [];
            for (const data of testData) {
                const id = await this.storageManager.saveReceipt(data);
                savedIds.push(id);
            }
            const allSaved = savedIds.length === testData.length && savedIds.every(id => id);

            // 全データの取得
            const allReceipts = await this.storageManager.getAllReceipts();
            const correctCount = allReceipts.length >= testData.length;

            // ソート機能のテスト
            const sortedByDate = await this.storageManager.getAllReceipts({
                sortBy: 'createdAt',
                order: 'desc'
            });
            const sortingWorks = sortedByDate.length > 1 && 
                               new Date(sortedByDate[0].createdAt) >= new Date(sortedByDate[1].createdAt);

            this.addTestResult(
                '複数データ保存・読み込み',
                allSaved && correctCount && sortingWorks,
                `保存: ${allSaved}, 取得: ${correctCount}, ソート: ${sortingWorks}`
            );

        } catch (error) {
            this.addTestResult('複数データ保存・読み込み', false, `エラー: ${error.message}`);
        }
    }

    /**
     * データ削除テスト
     */
    async testDataDeletion() {
        try {
            const testData = {
                date: { value: '2024/03/20', confidence: 0.90 },
                payee: { value: '削除テスト店', confidence: 0.85 },
                amount: { value: '1200', confidence: 0.88 },
                purpose: { value: 'テスト', confidence: 0.80 }
            };

            // データの保存
            const savedId = await this.storageManager.saveReceipt(testData);
            
            // 削除前の確認
            const beforeDeletion = await this.storageManager.getReceipt(savedId);
            const existsBeforeDeletion = beforeDeletion !== null;

            // データの削除
            await this.storageManager.deleteReceipt(savedId);

            // 削除後の確認
            const afterDeletion = await this.storageManager.getReceipt(savedId);
            const deletedSuccessfully = afterDeletion === null;

            this.addTestResult(
                'データ削除',
                existsBeforeDeletion && deletedSuccessfully,
                `削除前存在: ${existsBeforeDeletion}, 削除後不存在: ${deletedSuccessfully}`
            );

        } catch (error) {
            this.addTestResult('データ削除', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 検索機能テスト
     */
    async testSearchFunctionality() {
        try {
            // テスト用データの準備
            const searchTestData = [
                {
                    date: { value: '2024/03/01', confidence: 0.95 },
                    payee: { value: '検索テスト商店', confidence: 0.90 },
                    amount: { value: '1500', confidence: 0.92 },
                    purpose: { value: '会議費', confidence: 0.88 }
                },
                {
                    date: { value: '2024/03/05', confidence: 0.87 },
                    payee: { value: '別の店舗', confidence: 0.85 },
                    amount: { value: '3000', confidence: 0.90 },
                    purpose: { value: '交通費', confidence: 0.82 }
                }
            ];

            // データの保存
            for (const data of searchTestData) {
                await this.storageManager.saveReceipt(data);
            }

            // 支払先での検索
            const payeeResults = await this.storageManager.searchReceipts({ payee: '検索テスト' });
            const payeeSearchWorks = payeeResults.length === 1 && 
                                   payeeResults[0].data.payee.value.includes('検索テスト');

            // 金額範囲での検索
            const amountResults = await this.storageManager.searchReceipts({ 
                amountMin: 2000, 
                amountMax: 4000 
            });
            const amountSearchWorks = amountResults.length === 1 && 
                                    parseInt(amountResults[0].data.amount.value) === 3000;

            // 日付範囲での検索
            const dateResults = await this.storageManager.searchReceipts({
                dateFrom: '2024/03/01',
                dateTo: '2024/03/03'
            });
            const dateSearchWorks = dateResults.length === 1 && 
                                  dateResults[0].data.date.value === '2024/03/01';

            this.addTestResult(
                '検索機能',
                payeeSearchWorks && amountSearchWorks && dateSearchWorks,
                `支払先: ${payeeSearchWorks}, 金額: ${amountSearchWorks}, 日付: ${dateSearchWorks}`
            );

        } catch (error) {
            this.addTestResult('検索機能', false, `エラー: ${error.message}`);
        }
    }

    /**
     * ストレージ情報取得テスト
     */
    async testStorageInfo() {
        try {
            // ストレージ情報の取得
            const storageInfo = await this.storageManager.getStorageInfo();
            
            const hasRequiredFields = storageInfo &&
                                    typeof storageInfo.receiptCount === 'number' &&
                                    typeof storageInfo.maxRecords === 'number' &&
                                    typeof storageInfo.totalImageSize === 'number' &&
                                    typeof storageInfo.formattedImageSize === 'string' &&
                                    typeof storageInfo.usagePercentage === 'number';

            const validValues = storageInfo &&
                              storageInfo.receiptCount >= 0 &&
                              storageInfo.maxRecords > 0 &&
                              storageInfo.totalImageSize >= 0 &&
                              storageInfo.usagePercentage >= 0 &&
                              storageInfo.usagePercentage <= 100;

            this.addTestResult(
                'ストレージ情報取得',
                hasRequiredFields && validValues,
                `必須フィールド: ${hasRequiredFields}, 値の妥当性: ${validValues}`
            );

        } catch (error) {
            this.addTestResult('ストレージ情報取得', false, `エラー: ${error.message}`);
        }
    }

    /**
     * エクスポート機能のテスト
     */
    async testExportFunctionality() {
        console.log('📋 エクスポート機能テスト...');
        
        // JSON エクスポートテスト
        await this.testJsonExport();
        
        // CSV エクスポートテスト
        await this.testCsvExport();
        
        // ZIP エクスポートテスト
        await this.testZipExport();
        
        // エクスポートプレビューテスト
        await this.testExportPreview();
        
        // バッチエクスポートテスト
        await this.testBatchExport();
    }

    /**
     * JSON エクスポートテスト
     */
    async testJsonExport() {
        try {
            const testReceipts = [
                {
                    id: 'test_001',
                    data: {
                        date: { value: '2024/03/15', confidence: 0.95 },
                        payee: { value: 'テスト商店', confidence: 0.88 },
                        amount: { value: '1500', confidence: 0.92 },
                        purpose: { value: '会議費', confidence: 0.85 }
                    },
                    createdAt: new Date(),
                    lastAccessedAt: new Date(),
                    hasImage: false
                }
            ];

            // JSON エクスポートの実行
            const jsonResult = this.exportManager.exportToJSON(testReceipts);
            
            // 結果の検証
            const hasContent = jsonResult.content && jsonResult.content.length > 0;
            const hasFilename = jsonResult.filename && jsonResult.filename.includes('.json');
            const hasMimeType = jsonResult.mimeType === 'application/json';
            
            // JSON の妥当性確認
            let validJson = false;
            try {
                const parsed = JSON.parse(jsonResult.content);
                validJson = parsed.exportInfo && parsed.receipts && parsed.receipts.length === 1;
            } catch (e) {
                validJson = false;
            }

            this.addTestResult(
                'JSON エクスポート',
                hasContent && hasFilename && hasMimeType && validJson,
                `内容: ${hasContent}, ファイル名: ${hasFilename}, MIME: ${hasMimeType}, JSON妥当性: ${validJson}`
            );

        } catch (error) {
            this.addTestResult('JSON エクスポート', false, `エラー: ${error.message}`);
        }
    }

    /**
     * CSV エクスポートテスト
     */
    async testCsvExport() {
        try {
            const testReceipts = [
                {
                    id: 'test_002',
                    data: {
                        date: { value: '2024/03/16', confidence: 0.90 },
                        payee: { value: 'CSV テスト店', confidence: 0.85 },
                        amount: { value: '2500', confidence: 0.88 },
                        purpose: { value: '交通費', confidence: 0.82 }
                    },
                    createdAt: new Date(),
                    lastAccessedAt: new Date(),
                    hasImage: true
                }
            ];

            // CSV エクスポートの実行
            const csvResult = this.exportManager.exportToCSV(testReceipts);
            
            // 結果の検証
            const hasContent = csvResult.content && csvResult.content.length > 0;
            const hasFilename = csvResult.filename && csvResult.filename.includes('.csv');
            const hasMimeType = csvResult.mimeType.includes('text/csv');
            
            // CSV の構造確認
            const lines = csvResult.content.split('\n');
            const hasHeader = lines.length > 0 && lines[0].includes('ID');
            const hasData = lines.length > 1 && lines[1].includes('test_002');
            const hasBom = csvResult.content.charCodeAt(0) === 0xFEFF; // BOM確認

            this.addTestResult(
                'CSV エクスポート',
                hasContent && hasFilename && hasMimeType && hasHeader && hasData && hasBom,
                `内容: ${hasContent}, ファイル名: ${hasFilename}, MIME: ${hasMimeType}, 構造: ${hasHeader && hasData}, BOM: ${hasBom}`
            );

        } catch (error) {
            this.addTestResult('CSV エクスポート', false, `エラー: ${error.message}`);
        }
    }

    /**
     * ZIP エクスポートテスト
     */
    async testZipExport() {
        try {
            // JSZip の利用可能性確認
            if (!this.zipExportManager.isAvailable()) {
                this.addTestResult('ZIP エクスポート', false, 'JSZipライブラリが利用できません');
                return;
            }

            const testReceipts = [
                {
                    id: 'test_003',
                    data: {
                        date: { value: '2024/03/17', confidence: 0.93 },
                        payee: { value: 'ZIP テスト店', confidence: 0.87 },
                        amount: { value: '3500', confidence: 0.90 },
                        purpose: { value: '消耗品', confidence: 0.85 }
                    },
                    createdAt: new Date(),
                    lastAccessedAt: new Date(),
                    hasImage: false
                }
            ];

            // ZIP プレビューの生成
            const preview = this.zipExportManager.generateZipPreview(testReceipts, {
                includeImages: false,
                folderStructure: 'flat'
            });

            const previewValid = preview &&
                                preview.recordCount === 1 &&
                                preview.fileCount > 0 &&
                                preview.estimatedSize &&
                                preview.structure;

            // メタデータファイル生成のテスト
            const summary = this.zipExportManager.generateSummary(testReceipts);
            const summaryValid = summary &&
                               summary.totalRecords === 1 &&
                               summary.totalAmount === 3500 &&
                               summary.averageConfidence;

            this.addTestResult(
                'ZIP エクスポート',
                previewValid && summaryValid,
                `プレビュー: ${previewValid}, サマリー: ${summaryValid}`
            );

        } catch (error) {
            this.addTestResult('ZIP エクスポート', false, `エラー: ${error.message}`);
        }
    }

    /**
     * エクスポートプレビューテスト
     */
    async testExportPreview() {
        try {
            const testReceipts = [
                {
                    id: 'preview_001',
                    data: {
                        date: { value: '2024/03/18', confidence: 0.95 },
                        payee: { value: 'プレビューテスト店', confidence: 0.90 },
                        amount: { value: '1200', confidence: 0.88 },
                        purpose: { value: 'テスト費用', confidence: 0.85 }
                    },
                    createdAt: new Date(),
                    lastAccessedAt: new Date(),
                    hasImage: false
                }
            ];

            // JSON プレビュー
            const jsonPreview = this.exportManager.generatePreview(testReceipts, 'json');
            const jsonPreviewValid = jsonPreview &&
                                   jsonPreview.recordCount === 1 &&
                                   jsonPreview.estimatedSize &&
                                   jsonPreview.preview &&
                                   jsonPreview.format === 'json';

            // CSV プレビュー
            const csvPreview = this.exportManager.generatePreview(testReceipts, 'csv');
            const csvPreviewValid = csvPreview &&
                                  csvPreview.recordCount === 1 &&
                                  csvPreview.estimatedSize &&
                                  csvPreview.preview &&
                                  csvPreview.format === 'csv';

            // 空データのプレビュー
            const emptyPreview = this.exportManager.generatePreview([], 'json');
            const emptyPreviewValid = emptyPreview &&
                                    emptyPreview.recordCount === 0 &&
                                    emptyPreview.estimatedSize === '0 KB';

            this.addTestResult(
                'エクスポートプレビュー',
                jsonPreviewValid && csvPreviewValid && emptyPreviewValid,
                `JSON: ${jsonPreviewValid}, CSV: ${csvPreviewValid}, 空データ: ${emptyPreviewValid}`
            );

        } catch (error) {
            this.addTestResult('エクスポートプレビュー', false, `エラー: ${error.message}`);
        }
    }

    /**
     * バッチエクスポートテスト
     */
    async testBatchExport() {
        try {
            const testReceipts = [
                {
                    id: 'batch_001',
                    data: {
                        date: { value: '2024/03/19', confidence: 0.92 },
                        payee: { value: 'バッチテスト店', confidence: 0.88 },
                        amount: { value: '2200', confidence: 0.90 },
                        purpose: { value: 'バッチテスト', confidence: 0.85 }
                    },
                    createdAt: new Date(),
                    lastAccessedAt: new Date(),
                    hasImage: false
                }
            ];

            // バッチエクスポートの実行（実際のダウンロードは行わない）
            const formats = ['json', 'csv'];
            
            // 各形式でのエクスポート可能性をテスト
            let allFormatsWork = true;
            for (const format of formats) {
                try {
                    const result = format === 'json' 
                        ? this.exportManager.exportToJSON(testReceipts)
                        : this.exportManager.exportToCSV(testReceipts);
                    
                    if (!result.content || !result.filename || !result.mimeType) {
                        allFormatsWork = false;
                        break;
                    }
                } catch (e) {
                    allFormatsWork = false;
                    break;
                }
            }

            this.addTestResult(
                'バッチエクスポート',
                allFormatsWork,
                allFormatsWork ? '全形式でエクスポート可能' : '一部形式でエラー'
            );

        } catch (error) {
            this.addTestResult('バッチエクスポート', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 上限管理のテスト
     */
    async testLimitManagement() {
        console.log('📋 上限管理テスト...');
        
        // LRU上限管理テスト
        await this.testLRULimitManagement();
        
        // 最終アクセス時刻更新テスト
        await this.testLastAccessUpdate();
        
        // 上限超過時の削除テスト
        await this.testExcessDeletion();
        
        // ストレージ使用量監視テスト
        await this.testStorageUsageMonitoring();
    }

    /**
     * LRU上限管理テスト
     */
    async testLRULimitManagement() {
        try {
            // テスト用に上限を小さく設定
            const originalLimit = this.storageManager.maxRecords;
            this.storageManager.maxRecords = 3;

            // 上限を超えるデータを保存
            const testData = [];
            for (let i = 1; i <= 5; i++) {
                const data = {
                    date: { value: `2024/03/${i.toString().padStart(2, '0')}`, confidence: 0.90 },
                    payee: { value: `テスト店${i}`, confidence: 0.85 },
                    amount: { value: `${i * 1000}`, confidence: 0.88 },
                    purpose: { value: `テスト${i}`, confidence: 0.80 }
                };
                
                const id = await this.storageManager.saveReceipt(data);
                testData.push({ id, data });
                
                // 少し時間をおいて最終アクセス時刻に差をつける
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // 上限管理の実行
            await this.storageManager.enforceLRULimit();

            // 残存データの確認
            const remainingReceipts = await this.storageManager.getAllReceipts();
            const correctCount = remainingReceipts.length === 3;

            // 最新のデータが残っていることを確認
            const latestDataExists = remainingReceipts.some(r => 
                r.data.payee.value === 'テスト店5'
            );

            // 古いデータが削除されていることを確認
            const oldestDataDeleted = !remainingReceipts.some(r => 
                r.data.payee.value === 'テスト店1'
            );

            // 上限を元に戻す
            this.storageManager.maxRecords = originalLimit;

            this.addTestResult(
                'LRU上限管理',
                correctCount && latestDataExists && oldestDataDeleted,
                `件数: ${correctCount}, 最新保持: ${latestDataExists}, 古い削除: ${oldestDataDeleted}`
            );

        } catch (error) {
            this.addTestResult('LRU上限管理', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 最終アクセス時刻更新テスト
     */
    async testLastAccessUpdate() {
        try {
            const testData = {
                date: { value: '2024/03/25', confidence: 0.90 },
                payee: { value: 'アクセステスト店', confidence: 0.85 },
                amount: { value: '1800', confidence: 0.88 },
                purpose: { value: 'アクセステスト', confidence: 0.80 }
            };

            // データの保存
            const savedId = await this.storageManager.saveReceipt(testData);
            
            // 初回読み込み
            const firstLoad = await this.storageManager.getReceipt(savedId);
            const firstAccessTime = new Date(firstLoad.lastAccessedAt);

            // 少し時間をおく
            await new Promise(resolve => setTimeout(resolve, 100));

            // 再読み込み
            const secondLoad = await this.storageManager.getReceipt(savedId);
            const secondAccessTime = new Date(secondLoad.lastAccessedAt);

            // 最終アクセス時刻が更新されていることを確認
            const accessTimeUpdated = secondAccessTime > firstAccessTime;

            this.addTestResult(
                '最終アクセス時刻更新',
                accessTimeUpdated,
                accessTimeUpdated ? '最終アクセス時刻が正常に更新されました' : '最終アクセス時刻が更新されませんでした'
            );

        } catch (error) {
            this.addTestResult('最終アクセス時刻更新', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 上限超過時の削除テスト
     */
    async testExcessDeletion() {
        try {
            // 現在のデータ数を取得
            const initialReceipts = await this.storageManager.getAllReceipts();
            const initialCount = initialReceipts.length;

            // テスト用に上限を現在の数+2に設定
            const originalLimit = this.storageManager.maxRecords;
            this.storageManager.maxRecords = initialCount + 2;

            // 上限を超えるデータを追加
            const excessData = [];
            for (let i = 1; i <= 5; i++) {
                const data = {
                    date: { value: `2024/04/${i.toString().padStart(2, '0')}`, confidence: 0.90 },
                    payee: { value: `超過テスト店${i}`, confidence: 0.85 },
                    amount: { value: `${i * 500}`, confidence: 0.88 },
                    purpose: { value: `超過テスト${i}`, confidence: 0.80 }
                };
                
                await this.storageManager.saveReceipt(data);
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // 最終的なデータ数を確認
            const finalReceipts = await this.storageManager.getAllReceipts();
            const finalCount = finalReceipts.length;
            const limitEnforced = finalCount === this.storageManager.maxRecords;

            // 上限を元に戻す
            this.storageManager.maxRecords = originalLimit;

            this.addTestResult(
                '上限超過時削除',
                limitEnforced,
                limitEnforced ? `上限${this.storageManager.maxRecords}件が正常に適用されました` : '上限管理が機能していません'
            );

        } catch (error) {
            this.addTestResult('上限超過時削除', false, `エラー: ${error.message}`);
        }
    }

    /**
     * ストレージ使用量監視テスト
     */
    async testStorageUsageMonitoring() {
        try {
            // 現在のストレージ情報を取得
            const storageInfo = await this.storageManager.getStorageInfo();
            
            // 使用量情報の妥当性確認
            const hasValidUsageInfo = storageInfo &&
                                    typeof storageInfo.receiptCount === 'number' &&
                                    typeof storageInfo.usagePercentage === 'number' &&
                                    storageInfo.usagePercentage >= 0 &&
                                    storageInfo.usagePercentage <= 100;

            // 使用量計算の正確性確認
            const calculatedPercentage = Math.round((storageInfo.receiptCount / storageInfo.maxRecords) * 100);
            const percentageAccurate = Math.abs(storageInfo.usagePercentage - calculatedPercentage) <= 1;

            // フォーマット済みサイズの妥当性確認
            const hasFormattedSize = storageInfo.formattedImageSize &&
                                   typeof storageInfo.formattedImageSize === 'string' &&
                                   (storageInfo.formattedImageSize.includes('B') || 
                                    storageInfo.formattedImageSize.includes('KB') || 
                                    storageInfo.formattedImageSize.includes('MB'));

            this.addTestResult(
                'ストレージ使用量監視',
                hasValidUsageInfo && percentageAccurate && hasFormattedSize,
                `使用量情報: ${hasValidUsageInfo}, 計算精度: ${percentageAccurate}, フォーマット: ${hasFormattedSize}`
            );

        } catch (error) {
            this.addTestResult('ストレージ使用量監視', false, `エラー: ${error.message}`);
        }
    }

    /**
     * テスト結果の追加
     */
    addTestResult(testName, success, details) {
        this.testResults.push({
            name: testName,
            success,
            details,
            timestamp: new Date()
        });
        
        const status = success ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
    }

    /**
     * テスト結果の表示
     */
    displayResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        console.log('\n📊 ストレージ機能テスト結果サマリー');
        console.log('='.repeat(50));
        console.log(`総テスト数: ${totalTests}`);
        console.log(`成功: ${passedTests}`);
        console.log(`失敗: ${failedTests}`);
        console.log(`成功率: ${successRate}%`);
        console.log('='.repeat(50));

        if (failedTests > 0) {
            console.log('\n❌ 失敗したテスト:');
            this.testResults
                .filter(r => !r.success)
                .forEach(r => {
                    console.log(`  - ${r.name}: ${r.details}`);
                });
        }

        // テスト結果をグローバルに保存（他のテストから参照可能）
        window.storageTestResults = {
            totalTests,
            passedTests,
            failedTests,
            successRate,
            details: this.testResults
        };
    }

    /**
     * テスト環境のクリーンアップ
     */
    async cleanup() {
        try {
            if (this.storageManager) {
                // テスト用データベースのクリア
                await this.storageManager.clearAll();
                
                // データベース接続を閉じる
                this.storageManager.close();
            }
            
            console.log('🧹 テスト環境をクリーンアップしました');
        } catch (error) {
            console.error('⚠️ クリーンアップ中にエラーが発生しました:', error);
        }
    }
}

// グローバルに公開
window.StorageFunctionalityTests = StorageFunctionalityTests;