/**
 * エラー復旧システム
 * ユーザーフレンドリーなエラーメッセージと自動復旧機能を提供
 */

class ErrorRecovery {
    constructor() {
        this.recoveryHistory = [];
        this.maxRecoveryAttempts = 3;
        this.recoveryStrategies = new Map();
        this.userGuidance = new Map();
        
        this.initializeRecoveryStrategies();
        this.initializeUserGuidance();
    }

    /**
     * 復旧戦略の初期化
     */
    initializeRecoveryStrategies() {
        // カメラエラーの復旧戦略
        this.recoveryStrategies.set('camera_error', [
            {
                name: 'switch_to_file',
                description: 'ファイル選択に切り替え',
                action: async () => {
                    const fileInput = document.getElementById('image-input');
                    if (fileInput) {
                        fileInput.removeAttribute('capture');
                        return { success: true, message: 'ファイル選択モードに切り替えました' };
                    }
                    return { success: false, message: 'ファイル入力要素が見つかりません' };
                },
                userMessage: 'カメラの代わりにファイル選択を使用します'
            },
            {
                name: 'request_permission',
                description: '権限の再要求',
                action: async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        stream.getTracks().forEach(track => track.stop());
                        return { success: true, message: 'カメラ権限が許可されました' };
                    } catch (error) {
                        return { success: false, message: 'カメラ権限の取得に失敗しました' };
                    }
                },
                userMessage: 'カメラの権限を再度要求します'
            }
        ]);

        // ストレージエラーの復旧戦略
        this.recoveryStrategies.set('storage_quota_exceeded', [
            {
                name: 'cleanup_old_data',
                description: '古いデータの削除',
                action: async () => {
                    if (window.storageManager) {
                        try {
                            const deletedCount = await window.storageManager.emergencyCleanup();
                            return { 
                                success: true, 
                                message: `${deletedCount}件の古いデータを削除しました` 
                            };
                        } catch (error) {
                            return { success: false, message: 'データクリーンアップに失敗しました' };
                        }
                    }
                    return { success: false, message: 'ストレージマネージャーが利用できません' };
                },
                userMessage: '古いデータを自動削除してスペースを確保します'
            },
            {
                name: 'switch_to_memory',
                description: 'メモリストレージに切り替え',
                action: async () => {
                    window.useMemoryStorage = true;
                    return { 
                        success: true, 
                        message: '一時的にメモリ保存を使用します（ページを閉じるとデータは失われます）' 
                    };
                },
                userMessage: 'データを一時的にメモリに保存します'
            }
        ]);

        // メモリエラーの復旧戦略
        this.recoveryStrategies.set('memory_error', [
            {
                name: 'reduce_quality',
                description: '画像品質の削減',
                action: async () => {
                    window.imageQualityReduction = true;
                    window.maxImageSize = { width: 512, height: 512 };
                    return { 
                        success: true, 
                        message: '画像品質を下げて処理を続行します' 
                    };
                },
                userMessage: '画像品質を下げてメモリ使用量を削減します'
            },
            {
                name: 'clear_cache',
                description: 'キャッシュのクリア',
                action: async () => {
                    if (window.resourceMonitor) {
                        window.resourceMonitor.clearUnusedCache();
                        window.resourceMonitor.forceGarbageCollection();
                        return { success: true, message: 'キャッシュをクリアしました' };
                    }
                    return { success: false, message: 'リソース監視システムが利用できません' };
                },
                userMessage: '不要なデータをクリアしてメモリを解放します'
            }
        ]);

        // タイムアウトエラーの復旧戦略
        this.recoveryStrategies.set('timeout_error', [
            {
                name: 'reduce_processing_quality',
                description: '処理品質の削減',
                action: async () => {
                    window.processingQualityReduction = true;
                    return { 
                        success: true, 
                        message: '処理品質を下げて高速化します' 
                    };
                },
                userMessage: '処理速度を優先して品質を調整します'
            },
            {
                name: 'enable_fallback_ocr',
                description: 'フォールバックOCRの使用',
                action: async () => {
                    window.useFallbackOCR = true;
                    return { 
                        success: true, 
                        message: 'より軽量なOCRエンジンを使用します' 
                    };
                },
                userMessage: '軽量なOCRエンジンに切り替えます'
            }
        ]);

        // ファイルエラーの復旧戦略
        this.recoveryStrategies.set('file_error', [
            {
                name: 'retry_with_compression',
                description: '圧縮して再試行',
                action: async () => {
                    window.compressImages = true;
                    return { 
                        success: true, 
                        message: '画像を圧縮して再処理します' 
                    };
                },
                userMessage: '画像を圧縮して再度処理します'
            }
        ]);
    }

    /**
     * ユーザーガイダンスの初期化
     */
    initializeUserGuidance() {
        this.userGuidance.set('camera_error', {
            title: 'カメラが使用できません',
            explanation: 'カメラへのアクセスに問題があります。以下の方法で解決できる可能性があります。',
            steps: [
                'ブラウザの設定でカメラの使用を許可する',
                'ページを再読み込みして権限を再要求する',
                'ファイル選択を使用して画像をアップロードする'
            ],
            prevention: [
                '初回アクセス時にカメラの使用を許可してください',
                'プライベートブラウジングモードでは制限がある場合があります'
            ]
        });

        this.userGuidance.set('storage_quota_exceeded', {
            title: 'ストレージ容量が不足しています',
            explanation: 'デバイスの保存領域が不足しているため、データを保存できません。',
            steps: [
                '不要なファイルやアプリを削除してスペースを確保する',
                'ブラウザのキャッシュをクリアする',
                '一時的にメモリ保存を使用する（データは保存されません）'
            ],
            prevention: [
                '定期的に不要なデータを削除してください',
                '大きな画像ファイルは事前に圧縮してください'
            ]
        });

        this.userGuidance.set('memory_error', {
            title: 'メモリが不足しています',
            explanation: 'デバイスのメモリが不足しているため、処理を完了できません。',
            steps: [
                '他のアプリやブラウザタブを閉じる',
                '画像サイズを小さくして再試行する',
                'デバイスを再起動する'
            ],
            prevention: [
                '大きな画像ファイルは事前にリサイズしてください',
                '同時に複数の重い処理を実行しないでください'
            ]
        });

        this.userGuidance.set('timeout_error', {
            title: '処理に時間がかかりすぎています',
            explanation: '処理が予想以上に時間がかかっているため、タイムアウトしました。',
            steps: [
                '画像品質を下げて再試行する',
                'より軽量な処理モードを使用する',
                'インターネット接続を確認する（オンライン機能使用時）'
            ],
            prevention: [
                '高解像度の画像は事前にリサイズしてください',
                '複雑な画像よりもシンプルな画像の方が処理が早くなります'
            ]
        });

        this.userGuidance.set('file_error', {
            title: 'ファイルの処理に失敗しました',
            explanation: '選択されたファイルに問題があるか、サポートされていない形式です。',
            steps: [
                'JPEG、PNG、WebP形式の画像を使用する',
                'ファイルサイズを10MB以下にする',
                '別の画像ファイルを試す'
            ],
            prevention: [
                'サポートされている画像形式を使用してください',
                '破損していないファイルを使用してください'
            ]
        });
    }

    /**
     * エラーの自動復旧を試行
     * @param {string} errorType - エラータイプ
     * @param {Object} context - エラーコンテキスト
     * @returns {Promise<Object>} 復旧結果
     */
    async attemptRecovery(errorType, context = {}) {
        const strategies = this.recoveryStrategies.get(errorType);
        if (!strategies || strategies.length === 0) {
            return { success: false, message: '利用可能な復旧戦略がありません' };
        }

        // 復旧履歴をチェック
        const attemptCount = this.getRecoveryAttemptCount(errorType);
        if (attemptCount >= this.maxRecoveryAttempts) {
            return { 
                success: false, 
                message: '最大復旧試行回数に達しました',
                requiresManualIntervention: true
            };
        }

        // 復旧戦略を順次試行
        for (const strategy of strategies) {
            try {
                console.log(`復旧戦略を実行中: ${strategy.name}`);
                
                const result = await strategy.action();
                
                if (result.success) {
                    this.recordRecoveryAttempt(errorType, strategy.name, true);
                    return {
                        success: true,
                        message: result.message,
                        strategy: strategy.name,
                        userMessage: strategy.userMessage
                    };
                } else {
                    console.warn(`復旧戦略が失敗: ${strategy.name} - ${result.message}`);
                }
            } catch (error) {
                console.error(`復旧戦略でエラー: ${strategy.name}`, error);
            }
        }

        this.recordRecoveryAttempt(errorType, 'all_strategies', false);
        return { 
            success: false, 
            message: 'すべての復旧戦略が失敗しました',
            requiresManualIntervention: true
        };
    }

    /**
     * ユーザーガイダンスの取得
     * @param {string} errorType - エラータイプ
     * @returns {Object} ガイダンス情報
     */
    getUserGuidance(errorType) {
        return this.userGuidance.get(errorType) || {
            title: '予期しないエラー',
            explanation: '予期しないエラーが発生しました。',
            steps: [
                'ページを再読み込みしてください',
                'ブラウザを再起動してください',
                '別のブラウザを試してください'
            ],
            prevention: [
                '最新のブラウザを使用してください',
                'JavaScriptが有効になっていることを確認してください'
            ]
        };
    }

    /**
     * 復旧試行回数の取得
     * @param {string} errorType - エラータイプ
     * @returns {number} 試行回数
     */
    getRecoveryAttemptCount(errorType) {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        // 1時間以内の試行回数をカウント
        return this.recoveryHistory.filter(record => 
            record.errorType === errorType && 
            (now - record.timestamp) < oneHour
        ).length;
    }

    /**
     * 復旧試行の記録
     * @param {string} errorType - エラータイプ
     * @param {string} strategy - 使用した戦略
     * @param {boolean} success - 成功したかどうか
     */
    recordRecoveryAttempt(errorType, strategy, success) {
        this.recoveryHistory.push({
            errorType,
            strategy,
            success,
            timestamp: Date.now()
        });

        // 履歴を最新100件に制限
        if (this.recoveryHistory.length > 100) {
            this.recoveryHistory = this.recoveryHistory.slice(-100);
        }
    }

    /**
     * 復旧履歴のクリア
     */
    clearRecoveryHistory() {
        this.recoveryHistory = [];
    }

    /**
     * 復旧統計の取得
     * @returns {Object} 統計情報
     */
    getRecoveryStats() {
        const stats = {
            totalAttempts: this.recoveryHistory.length,
            successfulAttempts: this.recoveryHistory.filter(r => r.success).length,
            errorTypes: {},
            strategies: {}
        };

        this.recoveryHistory.forEach(record => {
            // エラータイプ別統計
            if (!stats.errorTypes[record.errorType]) {
                stats.errorTypes[record.errorType] = { total: 0, successful: 0 };
            }
            stats.errorTypes[record.errorType].total++;
            if (record.success) {
                stats.errorTypes[record.errorType].successful++;
            }

            // 戦略別統計
            if (!stats.strategies[record.strategy]) {
                stats.strategies[record.strategy] = { total: 0, successful: 0 };
            }
            stats.strategies[record.strategy].total++;
            if (record.success) {
                stats.strategies[record.strategy].successful++;
            }
        });

        stats.successRate = stats.totalAttempts > 0 
            ? (stats.successfulAttempts / stats.totalAttempts * 100).toFixed(1) + '%'
            : '0%';

        return stats;
    }

    /**
     * エラー復旧レポートの生成
     * @returns {string} レポート文字列
     */
    generateRecoveryReport() {
        const stats = this.getRecoveryStats();
        
        let report = `エラー復旧レポート\n`;
        report += `================\n`;
        report += `総試行回数: ${stats.totalAttempts}\n`;
        report += `成功回数: ${stats.successfulAttempts}\n`;
        report += `成功率: ${stats.successRate}\n\n`;
        
        report += `エラータイプ別統計:\n`;
        Object.entries(stats.errorTypes).forEach(([type, data]) => {
            const rate = data.total > 0 ? (data.successful / data.total * 100).toFixed(1) : '0';
            report += `  ${type}: ${data.successful}/${data.total} (${rate}%)\n`;
        });
        
        report += `\n戦略別統計:\n`;
        Object.entries(stats.strategies).forEach(([strategy, data]) => {
            const rate = data.total > 0 ? (data.successful / data.total * 100).toFixed(1) : '0';
            report += `  ${strategy}: ${data.successful}/${data.total} (${rate}%)\n`;
        });
        
        return report;
    }
}

// グローバルに公開
window.ErrorRecovery = ErrorRecovery;