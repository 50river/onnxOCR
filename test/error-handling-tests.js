/**
 * エラーハンドリングシステムの包括的テストスイート
 * 各種エラーケース、フォールバック機能、ユーザビリティのテスト
 */

class ErrorHandlingTests {
    constructor() {
        this.testResults = [];
        this.errorHandler = null;
        this.errorDisplay = null;
        this.resourceMonitor = null;
        this.errorRecovery = null;
        
        this.setupTestEnvironment();
    }

    /**
     * テスト環境のセットアップ
     */
    setupTestEnvironment() {
        // テスト用のDOM要素を作成
        this.createTestDOM();
        
        // エラーハンドリングシステムを初期化
        this.errorHandler = new ErrorHandler();
        this.errorDisplay = new ErrorDisplay();
        this.resourceMonitor = new ResourceMonitor();
        this.errorRecovery = new ErrorRecovery();
        
        console.log('エラーハンドリングテスト環境を初期化しました');
    }

    /**
     * テスト用DOM要素の作成
     */
    createTestDOM() {
        // テスト用の画像入力要素
        if (!document.getElementById('image-input')) {
            const imageInput = document.createElement('input');
            imageInput.type = 'file';
            imageInput.id = 'image-input';
            imageInput.accept = 'image/*';
            imageInput.capture = 'environment';
            imageInput.style.display = 'none';
            document.body.appendChild(imageInput);
        }

        // テスト結果表示用の要素
        if (!document.getElementById('test-results')) {
            const resultsDiv = document.createElement('div');
            resultsDiv.id = 'test-results';
            resultsDiv.style.cssText = `
                margin: 20px;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 5px;
                background: #f9f9f9;
                font-family: monospace;
                white-space: pre-wrap;
            `;
            document.body.appendChild(resultsDiv);
        }
    }

    /**
     * すべてのテストを実行
     */
    async runAllTests() {
        console.log('🧪 エラーハンドリングテストを開始します...');
        this.testResults = [];

        try {
            // 1. エラー分類テスト
            await this.testErrorClassification();
            
            // 2. 権限エラーテスト
            await this.testPermissionErrors();
            
            // 3. リソースエラーテスト
            await this.testResourceErrors();
            
            // 4. ファイルエラーテスト
            await this.testFileErrors();
            
            // 5. ネットワークエラーテスト
            await this.testNetworkErrors();
            
            // 6. フォールバック機能テスト
            await this.testFallbackFunctionality();
            
            // 7. 復旧戦略テスト
            await this.testRecoveryStrategies();
            
            // 8. ユーザビリティテスト
            await this.testUsability();
            
            // 9. エラー表示テスト
            await this.testErrorDisplay();
            
            // 10. リソース監視テスト
            await this.testResourceMonitoring();
            
            // 11. 統合テスト
            await this.testIntegration();
            
            // テスト結果の表示
            this.displayTestResults();
            
        } catch (error) {
            console.error('テスト実行中にエラーが発生しました:', error);
            this.addTestResult('テスト実行', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * エラー分類テスト
     */
    async testErrorClassification() {
        console.log('📋 エラー分類テストを実行中...');

        const testCases = [
            {
                name: 'カメラ権限エラー',
                error: new Error('User denied camera access'),
                context: { operation: 'camera' },
                expectedType: 'camera_error'
            },
            {
                name: 'ストレージ制限エラー',
                error: new Error('QuotaExceededError'),
                context: { operation: 'storage' },
                expectedType: 'storage_quota_exceeded'
            },
            {
                name: 'メモリ不足エラー',
                error: new Error('RangeError: Maximum call stack size exceeded'),
                context: { operation: 'ocr' },
                expectedType: 'memory_error'
            },
            {
                name: 'タイムアウトエラー',
                error: new Error('Operation timed out'),
                context: { timeout: true },
                expectedType: 'timeout_error'
            },
            {
                name: 'ネットワークエラー',
                error: new Error('NetworkError: Failed to fetch'),
                context: { operation: 'network' },
                expectedType: 'network_error'
            }
        ];

        for (const testCase of testCases) {
            try {
                testCase.error.name = testCase.error.message.includes('QuotaExceededError') ? 'QuotaExceededError' :
                                    testCase.error.message.includes('RangeError') ? 'RangeError' :
                                    testCase.error.message.includes('NetworkError') ? 'NetworkError' :
                                    testCase.error.message.includes('denied') ? 'NotAllowedError' :
                                    testCase.error.message.includes('timed out') ? 'TimeoutError' : 'Error';

                const classifiedType = this.errorHandler.classifyError(testCase.error, testCase.context);
                const success = classifiedType === testCase.expectedType;
                
                this.addTestResult(
                    `エラー分類: ${testCase.name}`,
                    success,
                    success ? `正しく${testCase.expectedType}として分類` : `期待値: ${testCase.expectedType}, 実際: ${classifiedType}`
                );
            } catch (error) {
                this.addTestResult(`エラー分類: ${testCase.name}`, false, `テストエラー: ${error.message}`);
            }
        }
    }

    /**
     * 権限エラーテスト
     */
    async testPermissionErrors() {
        console.log('🔐 権限エラーテストを実行中...');

        // カメラ権限エラーのテスト
        try {
            const cameraError = new Error('User denied camera access');
            cameraError.name = 'NotAllowedError';
            
            const result = await this.errorHandler.handleError(cameraError, { 
                operation: 'camera',
                permissionState: 'denied'
            });
            
            const success = result.type === 'camera_error' && 
                           result.message.title.includes('カメラ') &&
                           result.suggestions.length > 0;
            
            this.addTestResult(
                '権限エラー: カメラアクセス拒否',
                success,
                success ? 'カメラエラーとして正しく処理' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('権限エラー: カメラアクセス拒否', false, `テストエラー: ${error.message}`);
        }

        // ストレージ権限エラーのテスト
        try {
            const storageError = new Error('Storage access denied');
            storageError.name = 'NotAllowedError';
            
            const result = await this.errorHandler.handleError(storageError, { 
                operation: 'storage',
                type: 'permission'
            });
            
            const success = result.type === 'permission_denied' && 
                           result.message.title.includes('権限') &&
                           result.canRetry === false;
            
            this.addTestResult(
                '権限エラー: ストレージアクセス拒否',
                success,
                success ? '権限エラーとして正しく処理' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('権限エラー: ストレージアクセス拒否', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * リソースエラーテスト
     */
    async testResourceErrors() {
        console.log('💾 リソースエラーテストを実行中...');

        // メモリ不足エラーのテスト
        try {
            const memoryError = new Error('Out of memory');
            memoryError.name = 'RangeError';
            
            const result = await this.errorHandler.handleError(memoryError, { 
                operation: 'ocr',
                memoryUsage: { used: 900000000, limit: 1000000000 }
            });
            
            const success = result.type === 'memory_error' && 
                           result.recovery.success &&
                           result.canRetry === true;
            
            this.addTestResult(
                'リソースエラー: メモリ不足',
                success,
                success ? 'メモリエラーとして正しく処理され復旧戦略が実行' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('リソースエラー: メモリ不足', false, `テストエラー: ${error.message}`);
        }

        // ストレージ制限エラーのテスト
        try {
            const quotaError = new Error('Quota exceeded');
            quotaError.name = 'QuotaExceededError';
            
            const result = await this.errorHandler.handleError(quotaError, { 
                operation: 'storage',
                requiredSize: 50000000
            });
            
            const success = result.type === 'storage_quota_exceeded' && 
                           result.recovery.success &&
                           result.canRetry === false;
            
            this.addTestResult(
                'リソースエラー: ストレージ制限',
                success,
                success ? 'ストレージエラーとして正しく処理され復旧戦略が実行' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('リソースエラー: ストレージ制限', false, `テストエラー: ${error.message}`);
        }

        // タイムアウトエラーのテスト
        try {
            const timeoutError = new Error('Operation timed out');
            timeoutError.name = 'TimeoutError';
            
            const result = await this.errorHandler.handleError(timeoutError, { 
                operation: 'ocr',
                timeout: true,
                duration: 30000
            });
            
            const success = result.type === 'timeout_error' && 
                           result.recovery.success &&
                           result.canRetry === true;
            
            this.addTestResult(
                'リソースエラー: タイムアウト',
                success,
                success ? 'タイムアウトエラーとして正しく処理され復旧戦略が実行' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('リソースエラー: タイムアウト', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * ファイルエラーテスト
     */
    async testFileErrors() {
        console.log('📁 ファイルエラーテストを実行中...');

        // サポートされていないファイル形式のテスト
        try {
            const fileError = new Error('Unsupported file format');
            fileError.name = 'TypeError';
            
            const result = await this.errorHandler.handleError(fileError, { 
                operation: 'file',
                fileType: 'image/bmp',
                fileSize: 5000000
            });
            
            const success = result.type === 'file_error' && 
                           result.message.title.includes('ファイル') &&
                           result.suggestions.some(s => s.includes('JPEG') || s.includes('PNG'));
            
            this.addTestResult(
                'ファイルエラー: サポートされていない形式',
                success,
                success ? 'ファイルエラーとして正しく処理' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('ファイルエラー: サポートされていない形式', false, `テストエラー: ${error.message}`);
        }

        // ファイル破損エラーのテスト
        try {
            const corruptError = new Error('File is corrupted');
            corruptError.name = 'TypeError';
            
            const result = await this.errorHandler.handleError(corruptError, { 
                operation: 'file',
                fileType: 'image/jpeg',
                fileSize: 2000000
            });
            
            const success = result.type === 'file_error' && 
                           result.canRetry === true;
            
            this.addTestResult(
                'ファイルエラー: ファイル破損',
                success,
                success ? 'ファイルエラーとして正しく処理' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('ファイルエラー: ファイル破損', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * ネットワークエラーテスト
     */
    async testNetworkErrors() {
        console.log('🌐 ネットワークエラーテストを実行中...');

        // ネットワーク接続エラーのテスト
        try {
            const networkError = new Error('Network connection failed');
            networkError.name = 'NetworkError';
            
            const result = await this.errorHandler.handleError(networkError, { 
                operation: 'network',
                url: 'https://example.com/api'
            });
            
            const success = result.type === 'network_error' && 
                           result.message.title.includes('ネットワーク') &&
                           result.suggestions.some(s => s.includes('オフライン'));
            
            this.addTestResult(
                'ネットワークエラー: 接続失敗',
                success,
                success ? 'ネットワークエラーとして正しく処理' : `予期しない結果: ${JSON.stringify(result)}`
            );
        } catch (error) {
            this.addTestResult('ネットワークエラー: 接続失敗', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * フォールバック機能テスト
     */
    async testFallbackFunctionality() {
        console.log('🔄 フォールバック機能テストを実行中...');

        // OCRフォールバックのテスト
        try {
            // ONNX失敗をシミュレート
            window.useFallbackOCR = false;
            
            const ocrError = new Error('ONNX Runtime initialization failed');
            const result = await this.errorHandler.handleError(ocrError, { 
                operation: 'ocr',
                engine: 'onnx'
            });
            
            const fallbackEnabled = window.useFallbackOCR === true;
            
            this.addTestResult(
                'フォールバック: OCRエンジン切り替え',
                fallbackEnabled,
                fallbackEnabled ? 'フォールバックOCRが有効化された' : 'フォールバックOCRが有効化されなかった'
            );
        } catch (error) {
            this.addTestResult('フォールバック: OCRエンジン切り替え', false, `テストエラー: ${error.message}`);
        }

        // ストレージフォールバックのテスト
        try {
            window.useMemoryStorage = false;
            
            const storageError = new Error('Storage quota exceeded');
            storageError.name = 'QuotaExceededError';
            
            const result = await this.errorHandler.handleError(storageError, { 
                operation: 'storage'
            });
            
            const memoryStorageEnabled = window.useMemoryStorage === true;
            
            this.addTestResult(
                'フォールバック: メモリストレージ切り替え',
                memoryStorageEnabled,
                memoryStorageEnabled ? 'メモリストレージが有効化された' : 'メモリストレージが有効化されなかった'
            );
        } catch (error) {
            this.addTestResult('フォールバック: メモリストレージ切り替え', false, `テストエラー: ${error.message}`);
        }

        // 画像品質フォールバックのテスト
        try {
            window.imageQualityReduction = false;
            
            const memoryError = new Error('Out of memory');
            memoryError.name = 'RangeError';
            
            const result = await this.errorHandler.handleError(memoryError, { 
                operation: 'ocr'
            });
            
            const qualityReduced = window.imageQualityReduction === true;
            
            this.addTestResult(
                'フォールバック: 画像品質削減',
                qualityReduced,
                qualityReduced ? '画像品質削減が有効化された' : '画像品質削減が有効化されなかった'
            );
        } catch (error) {
            this.addTestResult('フォールバック: 画像品質削減', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * 復旧戦略テスト
     */
    async testRecoveryStrategies() {
        console.log('🛠️ 復旧戦略テストを実行中...');

        // カメラエラー復旧戦略のテスト
        try {
            const recoveryResult = await this.errorRecovery.attemptRecovery('camera_error', {
                operation: 'camera'
            });
            
            const success = recoveryResult.success && 
                           recoveryResult.strategy &&
                           recoveryResult.userMessage;
            
            this.addTestResult(
                '復旧戦略: カメラエラー',
                success,
                success ? `復旧戦略 ${recoveryResult.strategy} が成功` : `復旧失敗: ${recoveryResult.message}`
            );
        } catch (error) {
            this.addTestResult('復旧戦略: カメラエラー', false, `テストエラー: ${error.message}`);
        }

        // メモリエラー復旧戦略のテスト
        try {
            const recoveryResult = await this.errorRecovery.attemptRecovery('memory_error', {
                operation: 'ocr'
            });
            
            const success = recoveryResult.success && 
                           recoveryResult.strategy &&
                           recoveryResult.userMessage;
            
            this.addTestResult(
                '復旧戦略: メモリエラー',
                success,
                success ? `復旧戦略 ${recoveryResult.strategy} が成功` : `復旧失敗: ${recoveryResult.message}`
            );
        } catch (error) {
            this.addTestResult('復旧戦略: メモリエラー', false, `テストエラー: ${error.message}`);
        }

        // 復旧試行回数制限のテスト
        try {
            // 同じエラーを複数回発生させる
            for (let i = 0; i < 5; i++) {
                await this.errorRecovery.attemptRecovery('timeout_error', {
                    operation: 'ocr'
                });
            }
            
            const finalResult = await this.errorRecovery.attemptRecovery('timeout_error', {
                operation: 'ocr'
            });
            
            const limitReached = finalResult.requiresManualIntervention === true;
            
            this.addTestResult(
                '復旧戦略: 試行回数制限',
                limitReached,
                limitReached ? '最大試行回数に達して手動介入が必要' : '試行回数制限が正しく動作していない'
            );
        } catch (error) {
            this.addTestResult('復旧戦略: 試行回数制限', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * ユーザビリティテスト
     */
    async testUsability() {
        console.log('👤 ユーザビリティテストを実行中...');

        // エラーメッセージの分かりやすさテスト
        try {
            const error = new Error('Camera access denied');
            error.name = 'NotAllowedError';
            
            const result = await this.errorHandler.handleError(error, { 
                operation: 'camera'
            });
            
            const messageQuality = result.message.title.length > 0 &&
                                 result.message.message.length > 0 &&
                                 result.suggestions.length > 0 &&
                                 !result.message.title.includes('Error') &&
                                 !result.message.message.includes('undefined');
            
            this.addTestResult(
                'ユーザビリティ: エラーメッセージの品質',
                messageQuality,
                messageQuality ? 'ユーザーフレンドリーなメッセージが生成された' : 'メッセージの品質に問題がある'
            );
        } catch (error) {
            this.addTestResult('ユーザビリティ: エラーメッセージの品質', false, `テストエラー: ${error.message}`);
        }

        // 解決方法の提案テスト
        try {
            const error = new Error('Storage quota exceeded');
            error.name = 'QuotaExceededError';
            
            const result = await this.errorHandler.handleError(error, { 
                operation: 'storage'
            });
            
            const hasSuggestions = result.suggestions && 
                                 result.suggestions.length > 0 &&
                                 result.suggestions.every(s => typeof s === 'string' && s.length > 0);
            
            this.addTestResult(
                'ユーザビリティ: 解決方法の提案',
                hasSuggestions,
                hasSuggestions ? '適切な解決方法が提案された' : '解決方法の提案に問題がある'
            );
        } catch (error) {
            this.addTestResult('ユーザビリティ: 解決方法の提案', false, `テストエラー: ${error.message}`);
        }

        // 再試行可能性の判定テスト
        try {
            const retryableError = new Error('Timeout');
            retryableError.name = 'TimeoutError';
            
            const nonRetryableError = new Error('Permission denied');
            nonRetryableError.name = 'NotAllowedError';
            
            const retryableResult = await this.errorHandler.handleError(retryableError, { 
                operation: 'ocr'
            });
            
            const nonRetryableResult = await this.errorHandler.handleError(nonRetryableError, { 
                operation: 'permission'
            });
            
            const retryLogicCorrect = retryableResult.canRetry === true && 
                                    nonRetryableResult.canRetry === false;
            
            this.addTestResult(
                'ユーザビリティ: 再試行可能性の判定',
                retryLogicCorrect,
                retryLogicCorrect ? '再試行可能性が正しく判定された' : '再試行可能性の判定に問題がある'
            );
        } catch (error) {
            this.addTestResult('ユーザビリティ: 再試行可能性の判定', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * エラー表示テスト
     */
    async testErrorDisplay() {
        console.log('🖥️ エラー表示テストを実行中...');

        // エラー表示の作成テスト
        try {
            const errorResult = {
                type: 'camera_error',
                message: {
                    title: 'カメラエラー',
                    message: 'カメラにアクセスできません',
                    type: 'error'
                },
                recovery: {
                    success: true,
                    message: 'ファイル選択に切り替えました'
                },
                canRetry: true,
                suggestions: ['ファイル選択を使用してください', 'カメラの権限を確認してください']
            };
            
            // エラー表示を作成（実際には表示しない）
            const errorHtml = this.errorDisplay.createErrorHtml(errorResult);
            
            const hasRequiredElements = errorHtml.includes('error-dialog') &&
                                      errorHtml.includes('カメラエラー') &&
                                      errorHtml.includes('再試行') &&
                                      errorHtml.includes('解決方法');
            
            this.addTestResult(
                'エラー表示: HTML生成',
                hasRequiredElements,
                hasRequiredElements ? '必要な要素を含むHTMLが生成された' : 'HTMLに必要な要素が不足している'
            );
        } catch (error) {
            this.addTestResult('エラー表示: HTML生成', false, `テストエラー: ${error.message}`);
        }

        // アクセシビリティ属性のテスト
        try {
            const container = this.errorDisplay.container;
            
            const hasAccessibilityAttributes = container.getAttribute('role') === 'alert' &&
                                             container.getAttribute('aria-live') === 'assertive';
            
            this.addTestResult(
                'エラー表示: アクセシビリティ',
                hasAccessibilityAttributes,
                hasAccessibilityAttributes ? 'アクセシビリティ属性が正しく設定されている' : 'アクセシビリティ属性に問題がある'
            );
        } catch (error) {
            this.addTestResult('エラー表示: アクセシビリティ', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * リソース監視テスト
     */
    async testResourceMonitoring() {
        console.log('📊 リソース監視テストを実行中...');

        // メモリ監視の開始/停止テスト
        try {
            const wasMonitoring = this.resourceMonitor.isMonitoring;
            
            this.resourceMonitor.stopMemoryMonitoring();
            const stoppedCorrectly = !this.resourceMonitor.isMonitoring;
            
            this.resourceMonitor.startMemoryMonitoring();
            const startedCorrectly = this.resourceMonitor.isMonitoring;
            
            const monitoringControlWorks = stoppedCorrectly && startedCorrectly;
            
            this.addTestResult(
                'リソース監視: 開始/停止制御',
                monitoringControlWorks,
                monitoringControlWorks ? 'メモリ監視の開始/停止が正しく動作' : 'メモリ監視の制御に問題がある'
            );
        } catch (error) {
            this.addTestResult('リソース監視: 開始/停止制御', false, `テストエラー: ${error.message}`);
        }

        // 品質レベル調整テスト
        try {
            const initialLevel = this.resourceMonitor.currentQualityLevel;
            
            // 品質レベルを下げる
            this.resourceMonitor.handleWarningMemory();
            const levelAfterWarning = this.resourceMonitor.currentQualityLevel;
            
            // さらに品質レベルを下げる
            this.resourceMonitor.handleCriticalMemory();
            const levelAfterCritical = this.resourceMonitor.currentQualityLevel;
            
            const qualityAdjustmentWorks = levelAfterWarning > initialLevel && 
                                         levelAfterCritical > levelAfterWarning;
            
            // 品質レベルをリセット
            this.resourceMonitor.resetQualityLevel();
            
            this.addTestResult(
                'リソース監視: 品質レベル調整',
                qualityAdjustmentWorks,
                qualityAdjustmentWorks ? '品質レベルが段階的に調整された' : '品質レベルの調整に問題がある'
            );
        } catch (error) {
            this.addTestResult('リソース監視: 品質レベル調整', false, `テストエラー: ${error.message}`);
        }

        // リソース情報取得テスト
        try {
            const resourceInfo = this.resourceMonitor.getResourceInfo();
            
            const hasRequiredInfo = resourceInfo.qualityLevel &&
                                  typeof resourceInfo.isMonitoring === 'boolean' &&
                                  resourceInfo.qualityLevel.name &&
                                  resourceInfo.qualityLevel.maxSize;
            
            this.addTestResult(
                'リソース監視: 情報取得',
                hasRequiredInfo,
                hasRequiredInfo ? 'リソース情報が正しく取得された' : 'リソース情報の取得に問題がある'
            );
        } catch (error) {
            this.addTestResult('リソース監視: 情報取得', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * 統合テスト
     */
    async testIntegration() {
        console.log('🔗 統合テストを実行中...');

        // エラーハンドラーとエラー表示の統合テスト
        try {
            const error = new Error('Integration test error');
            error.name = 'TestError';
            
            const result = await this.errorHandler.handleError(error, { 
                operation: 'test'
            });
            
            // エラー表示を短時間表示してすぐ非表示にする
            this.errorDisplay.show(result);
            
            const isVisible = this.errorDisplay.isVisible();
            
            setTimeout(() => {
                this.errorDisplay.hide();
            }, 100);
            
            this.addTestResult(
                '統合テスト: エラーハンドラー + 表示',
                isVisible,
                isVisible ? 'エラーハンドラーと表示の統合が正常' : 'エラーハンドラーと表示の統合に問題がある'
            );
        } catch (error) {
            this.addTestResult('統合テスト: エラーハンドラー + 表示', false, `テストエラー: ${error.message}`);
        }

        // エラーログ機能のテスト
        try {
            const initialLogCount = this.errorHandler.getErrorLogs().length;
            
            const testError = new Error('Log test error');
            await this.errorHandler.handleError(testError, { operation: 'log_test' });
            
            const finalLogCount = this.errorHandler.getErrorLogs().length;
            const logWasRecorded = finalLogCount > initialLogCount;
            
            this.addTestResult(
                '統合テスト: エラーログ記録',
                logWasRecorded,
                logWasRecorded ? 'エラーログが正しく記録された' : 'エラーログの記録に問題がある'
            );
        } catch (error) {
            this.addTestResult('統合テスト: エラーログ記録', false, `テストエラー: ${error.message}`);
        }

        // 復旧統計の生成テスト
        try {
            const stats = this.errorRecovery.getRecoveryStats();
            const report = this.errorRecovery.generateRecoveryReport();
            
            const statsValid = typeof stats.totalAttempts === 'number' &&
                             typeof stats.successRate === 'string' &&
                             typeof stats.errorTypes === 'object';
            
            const reportValid = typeof report === 'string' && 
                              report.includes('エラー復旧レポート') &&
                              report.includes('総試行回数');
            
            const statisticsWork = statsValid && reportValid;
            
            this.addTestResult(
                '統合テスト: 復旧統計生成',
                statisticsWork,
                statisticsWork ? '復旧統計とレポートが正しく生成された' : '復旧統計の生成に問題がある'
            );
        } catch (error) {
            this.addTestResult('統合テスト: 復旧統計生成', false, `テストエラー: ${error.message}`);
        }
    }

    /**
     * テスト結果の追加
     * @param {string} testName - テスト名
     * @param {boolean} passed - 成功したかどうか
     * @param {string} details - 詳細情報
     */
    addTestResult(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
    }

    /**
     * テスト結果の表示
     */
    displayTestResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';
        
        const summary = `
🧪 エラーハンドリングテスト結果
=====================================
総テスト数: ${totalTests}
成功: ${passedTests}
失敗: ${failedTests}
成功率: ${successRate}%

詳細結果:
${this.testResults.map(result => {
    const status = result.passed ? '✅' : '❌';
    return `${status} ${result.name}\n   ${result.details}`;
}).join('\n\n')}

テスト完了時刻: ${new Date().toLocaleString('ja-JP')}
        `;
        
        console.log(summary);
        
        // DOM要素に結果を表示
        const resultsElement = document.getElementById('test-results');
        if (resultsElement) {
            resultsElement.textContent = summary;
        }
        
        // テスト結果をローカルストレージに保存
        try {
            localStorage.setItem('errorHandlingTestResults', JSON.stringify({
                summary: { totalTests, passedTests, failedTests, successRate },
                results: this.testResults,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('テスト結果の保存に失敗:', error);
        }
        
        return { totalTests, passedTests, failedTests, successRate };
    }

    /**
     * 特定のエラータイプのテストのみ実行
     * @param {string} errorType - テストするエラータイプ
     */
    async runSpecificTest(errorType) {
        console.log(`🎯 ${errorType} の特定テストを実行中...`);
        
        const testMethods = {
            'classification': () => this.testErrorClassification(),
            'permission': () => this.testPermissionErrors(),
            'resource': () => this.testResourceErrors(),
            'file': () => this.testFileErrors(),
            'network': () => this.testNetworkErrors(),
            'fallback': () => this.testFallbackFunctionality(),
            'recovery': () => this.testRecoveryStrategies(),
            'usability': () => this.testUsability(),
            'display': () => this.testErrorDisplay(),
            'monitoring': () => this.testResourceMonitoring(),
            'integration': () => this.testIntegration()
        };
        
        const testMethod = testMethods[errorType];
        if (testMethod) {
            this.testResults = [];
            await testMethod();
            this.displayTestResults();
        } else {
            console.error(`未知のテストタイプ: ${errorType}`);
        }
    }
}

// グローバルに公開
window.ErrorHandlingTests = ErrorHandlingTests;

// テスト実行用の便利関数
window.runErrorHandlingTests = async () => {
    const tests = new ErrorHandlingTests();
    return await tests.runAllTests();
};

window.runSpecificErrorTest = async (errorType) => {
    const tests = new ErrorHandlingTests();
    return await tests.runSpecificTest(errorType);
};