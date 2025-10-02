/**
 * エクスポートマネージャー
 * 領収書データのJSON・CSV形式でのエクスポート機能を提供
 */

class ExportManager {
    constructor() {
        this.supportedFormats = ['json', 'csv'];
    }

    /**
     * データのエクスポート
     * @param {Array} receipts - 領収書データの配列
     * @param {string} format - エクスポート形式 ('json' | 'csv')
     * @param {Object} options - エクスポートオプション
     * @returns {Promise<void>}
     */
    async exportData(receipts, format, options = {}) {
        if (!this.supportedFormats.includes(format)) {
            throw new Error(`サポートされていない形式です: ${format}`);
        }

        if (!receipts || receipts.length === 0) {
            throw new Error('エクスポートするデータがありません');
        }

        try {
            let content, filename, mimeType;

            switch (format) {
                case 'json':
                    ({ content, filename, mimeType } = this.exportToJSON(receipts, options));
                    break;
                case 'csv':
                    ({ content, filename, mimeType } = this.exportToCSV(receipts, options));
                    break;
            }

            await this.downloadFile(content, filename, mimeType);
        } catch (error) {
            throw new Error(`エクスポートに失敗しました: ${error.message}`);
        }
    }

    /**
     * JSON形式でのエクスポート
     * @param {Array} receipts - 領収書データの配列
     * @param {Object} options - エクスポートオプション
     * @returns {Object} エクスポート結果
     */
    exportToJSON(receipts, options = {}) {
        const {
            includeMetadata = true,
            includeCandidates = false,
            prettyPrint = true
        } = options;

        const exportData = {
            exportInfo: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                format: 'json',
                recordCount: receipts.length,
                application: 'Receipt OCR App'
            },
            receipts: receipts.map(receipt => this.formatReceiptForExport(receipt, {
                includeMetadata,
                includeCandidates
            }))
        };

        const content = prettyPrint 
            ? JSON.stringify(exportData, null, 2)
            : JSON.stringify(exportData);

        const timestamp = this.formatTimestamp(new Date());
        const filename = `receipts_export_${timestamp}.json`;
        const mimeType = 'application/json';

        return { content, filename, mimeType };
    }

    /**
     * CSV形式でのエクスポート
     * @param {Array} receipts - 領収書データの配列
     * @param {Object} options - エクスポートオプション
     * @returns {Object} エクスポート結果
     */
    exportToCSV(receipts, options = {}) {
        const {
            includeConfidence = true,
            includeMetadata = true,
            delimiter = ',',
            encoding = 'utf-8'
        } = options;

        // CSVヘッダーの定義
        const headers = [
            'ID',
            '日付',
            '支払先',
            '金額',
            '適用'
        ];

        if (includeConfidence) {
            headers.push('日付信頼度', '支払先信頼度', '金額信頼度', '適用信頼度');
        }

        if (includeMetadata) {
            headers.push('作成日時', '最終アクセス日時', '画像有無');
        }

        // CSVデータの生成
        const csvRows = [headers];

        receipts.forEach(receipt => {
            const row = [
                this.escapeCsvValue(receipt.id),
                this.escapeCsvValue(receipt.data.date?.value || ''),
                this.escapeCsvValue(receipt.data.payee?.value || ''),
                this.escapeCsvValue(receipt.data.amount?.value || ''),
                this.escapeCsvValue(receipt.data.purpose?.value || '')
            ];

            if (includeConfidence) {
                row.push(
                    this.formatConfidence(receipt.data.date?.confidence),
                    this.formatConfidence(receipt.data.payee?.confidence),
                    this.formatConfidence(receipt.data.amount?.confidence),
                    this.formatConfidence(receipt.data.purpose?.confidence)
                );
            }

            if (includeMetadata) {
                row.push(
                    this.formatDateTime(receipt.createdAt),
                    this.formatDateTime(receipt.lastAccessedAt),
                    receipt.hasImage ? 'あり' : 'なし'
                );
            }

            csvRows.push(row);
        });

        // BOM付きUTF-8でエンコード（Excelでの文字化け防止）
        const csvContent = csvRows.map(row => row.join(delimiter)).join('\n');
        const content = encoding === 'utf-8' ? '\uFEFF' + csvContent : csvContent;

        const timestamp = this.formatTimestamp(new Date());
        const filename = `receipts_export_${timestamp}.csv`;
        const mimeType = 'text/csv;charset=utf-8';

        return { content, filename, mimeType };
    }

    /**
     * 単一領収書データのエクスポート
     * @param {Object} receipt - 領収書データ
     * @param {string} format - エクスポート形式
     * @param {Object} options - エクスポートオプション
     * @returns {Promise<void>}
     */
    async exportSingleReceipt(receipt, format, options = {}) {
        await this.exportData([receipt], format, {
            ...options,
            singleRecord: true
        });
    }

    /**
     * 期間指定エクスポート
     * @param {Array} receipts - 領収書データの配列
     * @param {string} format - エクスポート形式
     * @param {Date} startDate - 開始日
     * @param {Date} endDate - 終了日
     * @param {Object} options - エクスポートオプション
     * @returns {Promise<void>}
     */
    async exportByDateRange(receipts, format, startDate, endDate, options = {}) {
        const filteredReceipts = receipts.filter(receipt => {
            const receiptDate = new Date(receipt.data.date?.value);
            return receiptDate >= startDate && receiptDate <= endDate;
        });

        if (filteredReceipts.length === 0) {
            throw new Error('指定された期間にデータがありません');
        }

        await this.exportData(filteredReceipts, format, {
            ...options,
            dateRange: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            }
        });
    }

    /**
     * エクスポート用の領収書データフォーマット
     * @param {Object} receipt - 領収書データ
     * @param {Object} options - フォーマットオプション
     * @returns {Object} フォーマット済みデータ
     */
    formatReceiptForExport(receipt, options = {}) {
        const { includeMetadata = true, includeCandidates = false } = options;

        const formatted = {
            id: receipt.id,
            data: {
                date: this.formatFieldForExport(receipt.data.date, includeCandidates),
                payee: this.formatFieldForExport(receipt.data.payee, includeCandidates),
                amount: this.formatFieldForExport(receipt.data.amount, includeCandidates),
                purpose: this.formatFieldForExport(receipt.data.purpose, includeCandidates)
            }
        };

        if (includeMetadata) {
            formatted.metadata = {
                createdAt: receipt.createdAt,
                lastAccessedAt: receipt.lastAccessedAt,
                hasImage: receipt.hasImage
            };
        }

        return formatted;
    }

    /**
     * フィールドデータのエクスポート用フォーマット
     * @param {Object} field - フィールドデータ
     * @param {boolean} includeCandidates - 候補データを含めるか
     * @returns {Object} フォーマット済みフィールドデータ
     */
    formatFieldForExport(field, includeCandidates = false) {
        if (!field) return null;

        const formatted = {
            value: field.value,
            confidence: field.confidence
        };

        if (includeCandidates && field.candidates && field.candidates.length > 0) {
            formatted.candidates = field.candidates.map(candidate => ({
                value: candidate.value,
                confidence: candidate.confidence,
                originalText: candidate.originalText
            }));
        }

        return formatted;
    }

    /**
     * CSV値のエスケープ処理
     * @param {string} value - エスケープする値
     * @returns {string} エスケープ済みの値
     */
    escapeCsvValue(value) {
        if (value === null || value === undefined) {
            return '';
        }

        const stringValue = String(value);
        
        // カンマ、改行、ダブルクォートが含まれる場合はダブルクォートで囲む
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            // ダブルクォートをエスケープ（""に変換）
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }

        return stringValue;
    }

    /**
     * 信頼度のフォーマット
     * @param {number} confidence - 信頼度
     * @returns {string} フォーマット済み信頼度
     */
    formatConfidence(confidence) {
        if (confidence === null || confidence === undefined) {
            return '';
        }
        return Math.round(confidence * 100) + '%';
    }

    /**
     * 日時のフォーマット
     * @param {Date|string} dateTime - 日時
     * @returns {string} フォーマット済み日時
     */
    formatDateTime(dateTime) {
        if (!dateTime) return '';
        
        const date = new Date(dateTime);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * タイムスタンプのフォーマット（ファイル名用）
     * @param {Date} date - 日時
     * @returns {string} フォーマット済みタイムスタンプ
     */
    formatTimestamp(date) {
        return date.toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];
    }

    /**
     * ファイルのダウンロード
     * @param {string} content - ファイル内容
     * @param {string} filename - ファイル名
     * @param {string} mimeType - MIMEタイプ
     * @returns {Promise<void>}
     */
    async downloadFile(content, filename, mimeType) {
        try {
            // Blobオブジェクトの作成
            const blob = new Blob([content], { type: mimeType });
            
            // ダウンロードリンクの作成
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            // ダウンロードの実行
            document.body.appendChild(link);
            link.click();
            
            // クリーンアップ
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            throw new Error(`ファイルのダウンロードに失敗しました: ${error.message}`);
        }
    }

    /**
     * エクスポート可能な形式の取得
     * @returns {Array} サポートされている形式の配列
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }

    /**
     * エクスポートプレビューの生成
     * @param {Array} receipts - 領収書データの配列
     * @param {string} format - エクスポート形式
     * @param {Object} options - エクスポートオプション
     * @returns {Object} プレビュー情報
     */
    generatePreview(receipts, format, options = {}) {
        if (!receipts || receipts.length === 0) {
            return {
                recordCount: 0,
                estimatedSize: '0 KB',
                preview: 'エクスポートするデータがありません'
            };
        }

        let preview, estimatedSize;

        switch (format) {
            case 'json':
                const jsonResult = this.exportToJSON(receipts.slice(0, 3), options);
                preview = jsonResult.content.substring(0, 500) + (jsonResult.content.length > 500 ? '...' : '');
                estimatedSize = this.estimateFileSize(jsonResult.content);
                break;
                
            case 'csv':
                const csvResult = this.exportToCSV(receipts.slice(0, 3), options);
                const lines = csvResult.content.split('\n');
                preview = lines.slice(0, 5).join('\n') + (lines.length > 5 ? '\n...' : '');
                estimatedSize = this.estimateFileSize(csvResult.content);
                break;
                
            default:
                preview = 'プレビューを生成できません';
                estimatedSize = '不明';
        }

        return {
            recordCount: receipts.length,
            estimatedSize,
            preview,
            format
        };
    }

    /**
     * ファイルサイズの推定
     * @param {string} content - ファイル内容
     * @returns {string} 推定サイズ
     */
    estimateFileSize(content) {
        const bytes = new Blob([content]).size;
        
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            return Math.round(bytes / 1024) + ' KB';
        } else {
            return Math.round(bytes / (1024 * 1024)) + ' MB';
        }
    }

    /**
     * バッチエクスポート（複数形式同時）
     * @param {Array} receipts - 領収書データの配列
     * @param {Array} formats - エクスポート形式の配列
     * @param {Object} options - エクスポートオプション
     * @returns {Promise<void>}
     */
    async batchExport(receipts, formats, options = {}) {
        const results = [];
        
        for (const format of formats) {
            try {
                await this.exportData(receipts, format, options);
                results.push({ format, success: true });
            } catch (error) {
                results.push({ format, success: false, error: error.message });
            }
        }
        
        return results;
    }
}

// グローバルに公開
window.ExportManager = ExportManager;