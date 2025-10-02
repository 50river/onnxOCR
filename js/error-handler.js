/**
 * エラーハンドリングと例外処理システム
 * 権限エラー、リソース不足エラー、ネットワークエラーの統合管理
 */

class ErrorHandler {
    constructor() {
        this.errorRecovery = new ErrorRecovery();
        
        this.errorTypes = {
            PERMISSION_DENIED: 'permission_denied',
            STORAGE_QUOTA_EXCEEDED: 'storage_quota_exceeded',
            MEMORY_ERROR: 'memory_error',
            TIMEOUT_ERROR: 'timeout_error',
            NETWORK_ERROR: 'network_error',
            CAMERA_ERROR: 'camera_error',
            FILE_ERROR: 'file_error',
            OCR_ERROR: 'ocr_error',
            UNKNOWN_ERROR: 'unknown_error'
        };

        this.errorMessages = {
            [this.errorTypes.PERMISSION_DENIED]: {
                title: 'アクセス権限が必要です',
                message: 'この機能を使用するには権限が必要です。',
                suggestions: ['ブラウザの設定を確認してください', '代替手段をお試しください']
            },
            [this.errorTypes.STORAGE_QUOTA_EXCEEDED]: {
                title: 'ストレージ容量が不足しています',
                message: 'デバイスの保存領域が不足しています。',
                suggestions: ['不要なデータを削除してください', '一時的にメモリ保存を使用します']
            },
            [this.errorTypes.MEMORY_ERROR]: {
                title: 'メモリ不足です',
                message: '処理に必要なメモリが不足しています。',
                suggestions: ['画像サイズを縮小して再試行します', '他のアプリを閉じてください']
            },
            [this.errorTypes.TIMEOUT_ERROR]: {
                title: '処理がタイムアウトしました',
                message: '処理に時間がかかりすぎています。',
                suggestions: ['画像品質を下げて再試行します', 'しばらく待ってから再試行してください']
            },
            [this.errorTypes.NETWORK_ERROR]: {
                title: 'ネットワークエラー',
                message: 'ネットワーク接続に問題があります。',
                suggestions: ['オフラインモードで続行します', 'インターネット接続を確認してください']
            },
            [this.errorTypes.CAMERA_ERROR]: {
                title: 'カメラエラー',
                message: 'カメラにアクセスできません。',
                suggestions: ['ファイル選択を使用してください', 'カメラの権限を確認してください']
            },
            [this.errorTypes.FILE_ERROR]: {
                title: 'ファイルエラー',
                message: 'ファイルの処理に失敗しました。',
                suggestions: ['別のファイルを選択してください', 'ファイル形式を確認してください']
            },
            [this.errorTypes.OCR_ERROR]: {
                title: 'OCR処理エラー',
                message: 'テキスト認識に失敗しました。',
                suggestions: ['画像を明るくしてください', '手動で範囲を選択してください']
            },
            [this.errorTypes.UNKNOWN_ERROR]: {
                title: '予期しないエラー',
                message: '予期しないエラーが発生しました。',
                suggestions: ['ページを再読み込みしてください', 'しばらく待ってから再試行してください']
            }
        };

        this.recoveryStrategies = new Map();
        this.initializeRecoveryStrategies();
    }

    /**
     * 復旧戦略の初期化
     */
    initializeRecoveryStrategies() {
        // カメラ権限エラーの復旧戦略
        this.recoveryStrategies.set(this.errorTypes.CAMERA_ERROR, {
            primary: async () => {
                return this.switchToFileInput();
            },
            fallback: async () => {
                return this.showManualInputOption();
            }
        });

        // ストレージ制限エラーの復旧戦略
        this.recoveryStrategies.set(this.errorTypes.STORAGE_QUOTA_EXCEEDED, {
            primary: async () => {
                return this.switchToMemoryStorage();
            },
            fallback: async () => {
                return this.cleanupOldData();
            }
        });

        // メモリ不足エラーの復旧戦略
        this.recoveryStrategies.set(this.errorTypes.MEMORY_ERROR, {
            primary: async () => {
                return this.reduceImageQuality();
            },
            fallback: async () => {
                return this.enableProgressiveProcessing();
            }
        });

        // タイムアウトエラーの復旧戦略
        this.recoveryStrategies.set(this.errorTypes.TIMEOUT_ERROR, {
            primary: async () => {
                return this.reduceProcessingQuality();
            },
            fallback: async () => {
                return this.enableFallbackOCR();
            }
        });
    }

    /**
     * エラーの分類と処理
     * @param {Error} error - 発生したエラー
     * @param {Object} context - エラーコンテキスト
     * @returns {Promise<Object>} 処理結果
     */
    async handleError(error, context = {}) {
        const errorType = this.classifyError(error, context);
        const errorInfo = this.errorMessages[errorType];
        
        console.error(`[${errorType}]`, error, context);

        // エラーログの記録
        this.logError(errorType, error, context);

        // 自動復旧の試行
        const recoveryResult = await this.errorRecovery.attemptRecovery(errorType, context);
        
        // ユーザーガイダンスの取得
        const guidance = this.errorRecovery.getUserGuidance(errorType);

        // ユーザーへの通知
        const userMessage = this.createUserFriendlyMessage(errorType, errorInfo, recoveryResult, guidance);
        
        return {
            type: errorType,
            message: userMessage,
            recovery: recoveryResult,
            canRetry: this.canRetry(errorType),
            suggestions: guidance.steps || errorInfo.suggestions,
            guidance: guidance
        };
    }

    /**
     * エラーの分類
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - コンテキスト情報
     * @returns {string} エラータイプ
     */
    classifyError(error, context) {
        const message = error.message?.toLowerCase() || '';
        const name = error.name?.toLowerCase() || '';

        // 権限関連エラー
        if (name === 'notallowederror' || message.includes('permission denied') || 
            message.includes('access denied') || message.includes('not allowed')) {
            if (context.operation === 'camera') {
                return this.errorTypes.CAMERA_ERROR;
            }
            return this.errorTypes.PERMISSION_DENIED;
        }

        // ストレージ関連エラー
        if (name === 'quotaexceedederror' || message.includes('quota exceeded') ||
            message.includes('storage full') || message.includes('disk full')) {
            return this.errorTypes.STORAGE_QUOTA_EXCEEDED;
        }

        // メモリ関連エラー
        if (name === 'rangeerror' || message.includes('out of memory') ||
            message.includes('maximum call stack') || message.includes('heap out of memory')) {
            return this.errorTypes.MEMORY_ERROR;
        }

        // タイムアウトエラー
        if (name === 'timeouterror' || message.includes('timeout') ||
            message.includes('timed out') || context.timeout) {
            return this.errorTypes.TIMEOUT_ERROR;
        }

        // ネットワークエラー
        if (name === 'networkerror' || message.includes('network') ||
            message.includes('fetch') || message.includes('connection')) {
            return this.errorTypes.NETWORK_ERROR;
        }

        // ファイル関連エラー
        if (message.includes('file') || message.includes('invalid format') ||
            message.includes('corrupt') || context.operation === 'file') {
            return this.errorTypes.FILE_ERROR;
        }

        // OCR関連エラー
        if (context.operation === 'ocr' || message.includes('ocr') ||
            message.includes('recognition') || message.includes('detection')) {
            return this.errorTypes.OCR_ERROR;
        }

        return this.errorTypes.UNKNOWN_ERROR;
    }

    /**
     * 復旧戦略の実行
     * @param {string} errorType - エラータイプ
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - コンテキスト
     * @returns {Promise<Object>} 復旧結果
     */
    async executeRecoveryStrategy(errorType, error, context) {
        const strategy = this.recoveryStrategies.get(errorType);
        
        if (!strategy) {
            return { success: false, message: '復旧戦略が見つかりません' };
        }

        try {
            // 主要な復旧戦略を試行
            const primaryResult = await strategy.primary();
            if (primaryResult.success) {
                return primaryResult;
            }

            // フォールバック戦略を試行
            if (strategy.fallback) {
                const fallbackResult = await strategy.fallback();
                return fallbackResult;
            }

            return primaryResult;
        } catch (recoveryError) {
            console.error('復旧戦略の実行に失敗:', recoveryError);
            return { 
                success: false, 
                message: '自動復旧に失敗しました',
                error: recoveryError
            };
        }
    }

    /**
     * ファイル入力への切り替え
     * @returns {Promise<Object>} 復旧結果
     */
    async switchToFileInput() {
        try {
            const fileInput = document.getElementById('image-input');
            if (fileInput) {
                fileInput.removeAttribute('capture');
                return {
                    success: true,
                    message: 'ファイル選択モードに切り替えました',
                    action: 'switched_to_file_input'
                };
            }
            return { success: false, message: 'ファイル入力要素が見つかりません' };
        } catch (error) {
            return { success: false, message: 'ファイル入力への切り替えに失敗', error };
        }
    }

    /**
     * メモリストレージへの切り替え
     * @returns {Promise<Object>} 復旧結果
     */
    async switchToMemoryStorage() {
        try {
            // メモリストレージフラグを設定
            window.useMemoryStorage = true;
            return {
                success: true,
                message: '一時的にメモリ保存を使用します',
                action: 'switched_to_memory_storage'
            };
        } catch (error) {
            return { success: false, message: 'メモリストレージへの切り替えに失敗', error };
        }
    }

    /**
     * 古いデータのクリーンアップ
     * @returns {Promise<Object>} 復旧結果
     */
    async cleanupOldData() {
        try {
            if (window.storageManager) {
                const info = await window.storageManager.getStorageInfo();
                if (info.receiptCount > 10) {
                    // 古いデータを削除（実装は StorageManager に依存）
                    const receipts = await window.storageManager.getAllReceipts({
                        sortBy: 'lastAccessedAt',
                        order: 'asc'
                    });
                    
                    const toDelete = receipts.slice(0, Math.floor(receipts.length / 2));
                    for (const receipt of toDelete) {
                        await window.storageManager.deleteReceipt(receipt.id);
                    }
                    
                    return {
                        success: true,
                        message: `${toDelete.length}件の古いデータを削除しました`,
                        action: 'cleaned_old_data'
                    };
                }
            }
            return { success: false, message: '削除可能なデータがありません' };
        } catch (error) {
            return { success: false, message: 'データクリーンアップに失敗', error };
        }
    }

    /**
     * 画像品質の削減
     * @returns {Promise<Object>} 復旧結果
     */
    async reduceImageQuality() {
        try {
            // グローバル設定で画像品質を下げる
            window.imageQualityReduction = true;
            window.maxImageSize = { width: 1024, height: 1024 };
            
            return {
                success: true,
                message: '画像品質を下げて処理を続行します',
                action: 'reduced_image_quality'
            };
        } catch (error) {
            return { success: false, message: '画像品質の削減に失敗', error };
        }
    }

    /**
     * 段階的処理の有効化
     * @returns {Promise<Object>} 復旧結果
     */
    async enableProgressiveProcessing() {
        try {
            window.progressiveProcessing = true;
            return {
                success: true,
                message: '段階的処理モードを有効にしました',
                action: 'enabled_progressive_processing'
            };
        } catch (error) {
            return { success: false, message: '段階的処理の有効化に失敗', error };
        }
    }

    /**
     * 処理品質の削減
     * @returns {Promise<Object>} 復旧結果
     */
    async reduceProcessingQuality() {
        try {
            window.processingQualityReduction = true;
            return {
                success: true,
                message: '処理品質を下げて高速化します',
                action: 'reduced_processing_quality'
            };
        } catch (error) {
            return { success: false, message: '処理品質の削減に失敗', error };
        }
    }

    /**
     * フォールバックOCRの有効化
     * @returns {Promise<Object>} 復旧結果
     */
    async enableFallbackOCR() {
        try {
            window.useFallbackOCR = true;
            return {
                success: true,
                message: 'フォールバックOCRを使用します',
                action: 'enabled_fallback_ocr'
            };
        } catch (error) {
            return { success: false, message: 'フォールバックOCRの有効化に失敗', error };
        }
    }

    /**
     * 手動入力オプションの表示
     * @returns {Promise<Object>} 復旧結果
     */
    async showManualInputOption() {
        try {
            return {
                success: true,
                message: '手動入力をご利用ください',
                action: 'show_manual_input_option'
            };
        } catch (error) {
            return { success: false, message: '手動入力オプションの表示に失敗', error };
        }
    }

    /**
     * ユーザーフレンドリーなメッセージの作成
     * @param {string} errorType - エラータイプ
     * @param {Object} errorInfo - エラー情報
     * @param {Object} recoveryResult - 復旧結果
     * @param {Object} guidance - ユーザーガイダンス
     * @returns {Object} ユーザーメッセージ
     */
    createUserFriendlyMessage(errorType, errorInfo, recoveryResult, guidance) {
        let message = guidance.explanation || errorInfo.message;
        
        if (recoveryResult.success) {
            message += ` ${recoveryResult.userMessage || recoveryResult.message}`;
        } else if (recoveryResult.requiresManualIntervention) {
            message += ' 手動での対応が必要です。';
        }

        return {
            title: guidance.title || errorInfo.title,
            message: message,
            type: this.getMessageType(errorType),
            recoveryAction: recoveryResult.strategy,
            suggestions: guidance.steps || errorInfo.suggestions,
            prevention: guidance.prevention || [],
            requiresManualIntervention: recoveryResult.requiresManualIntervention || false
        };
    }

    /**
     * メッセージタイプの取得
     * @param {string} errorType - エラータイプ
     * @returns {string} メッセージタイプ
     */
    getMessageType(errorType) {
        const criticalErrors = [
            this.errorTypes.MEMORY_ERROR,
            this.errorTypes.STORAGE_QUOTA_EXCEEDED
        ];

        const warningErrors = [
            this.errorTypes.PERMISSION_DENIED,
            this.errorTypes.CAMERA_ERROR,
            this.errorTypes.TIMEOUT_ERROR
        ];

        if (criticalErrors.includes(errorType)) {
            return 'error';
        } else if (warningErrors.includes(errorType)) {
            return 'warning';
        } else {
            return 'info';
        }
    }

    /**
     * 再試行可能かどうかの判定
     * @param {string} errorType - エラータイプ
     * @returns {boolean} 再試行可能かどうか
     */
    canRetry(errorType) {
        const nonRetryableErrors = [
            this.errorTypes.PERMISSION_DENIED,
            this.errorTypes.STORAGE_QUOTA_EXCEEDED
        ];

        return !nonRetryableErrors.includes(errorType);
    }

    /**
     * エラーログの記録
     * @param {string} errorType - エラータイプ
     * @param {Error} error - エラーオブジェクト
     * @param {Object} context - コンテキスト
     */
    logError(errorType, error, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: errorType,
            message: error.message,
            stack: error.stack,
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // コンソールに詳細ログを出力
        console.group(`🚨 Error Handler: ${errorType}`);
        console.error('Error:', error);
        console.log('Context:', context);
        console.log('Log Entry:', logEntry);
        console.groupEnd();

        // 必要に応じてローカルストレージにログを保存
        try {
            const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            logs.push(logEntry);
            
            // 最新100件のみ保持
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('errorLogs', JSON.stringify(logs));
        } catch (storageError) {
            console.warn('エラーログの保存に失敗:', storageError);
        }
    }

    /**
     * エラーログの取得
     * @returns {Array} エラーログの配列
     */
    getErrorLogs() {
        try {
            return JSON.parse(localStorage.getItem('errorLogs') || '[]');
        } catch (error) {
            console.warn('エラーログの取得に失敗:', error);
            return [];
        }
    }

    /**
     * エラーログのクリア
     */
    clearErrorLogs() {
        try {
            localStorage.removeItem('errorLogs');
        } catch (error) {
            console.warn('エラーログのクリアに失敗:', error);
        }
    }
}

// グローバルに公開
window.ErrorHandler = ErrorHandler;