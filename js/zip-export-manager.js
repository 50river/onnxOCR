/**
 * ZIP形式エクスポートマネージャー
 * 画像と抽出結果を組み合わせたZIPファイルの生成・ダウンロード機能を提供
 */

class ZipExportManager {
    constructor() {
        this.jsZipLoaded = false;
        this.loadJSZip();
    }

    /**
     * JSZipライブラリの動的ロード
     * @returns {Promise<void>}
     */
    async loadJSZip() {
        if (this.jsZipLoaded || window.JSZip) {
            this.jsZipLoaded = true;
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer';
            
            script.onload = () => {
                this.jsZipLoaded = true;
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error('JSZipライブラリの読み込みに失敗しました'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * ZIP形式でのエクスポート
     * @param {Array} receipts - 領収書データの配列
     * @param {StorageManager} storageManager - ストレージマネージャーのインスタンス
     * @param {Object} options - エクスポートオプション
     * @returns {Promise<void>}
     */
    async exportToZip(receipts, storageManager, options = {}) {
        if (!this.jsZipLoaded) {
            await this.loadJSZip();
        }

        if (!window.JSZip) {
            throw new Error('JSZipライブラリが利用できません');
        }

        if (!receipts || receipts.length === 0) {
            throw new Error('エクスポートするデータがありません');
        }

        const {
            includeImages = true,
            includeMetadata = true,
            compressionLevel = 6,
            folderStructure = 'date' // 'date' | 'flat' | 'payee'
        } = options;

        try {
            const zip = new JSZip();
            const timestamp = this.formatTimestamp(new Date());
            
            // メタデータファイルの追加
            if (includeMetadata) {
                await this.addMetadataFiles(zip, receipts, options);
            }

            // 各領収書データの処理
            for (let i = 0; i < receipts.length; i++) {
                const receipt = receipts[i];
                const folderName = this.getFolderName(receipt, folderStructure, i + 1);
                const receiptFolder = zip.folder(folderName);

                // 領収書データ（JSON）の追加
                const receiptJson = this.formatReceiptForZip(receipt);
                receiptFolder.file('receipt_data.json', JSON.stringify(receiptJson, null, 2));

                // 画像データの追加
                if (includeImages && receipt.hasImage) {
                    try {
                        const imageBlob = await storageManager.getImage(receipt.id);
                        if (imageBlob) {
                            const imageExtension = this.getImageExtension(imageBlob.type);
                            receiptFolder.file(`receipt_image${imageExtension}`, imageBlob);
                        }
                    } catch (error) {
                        console.warn(`画像の取得に失敗しました (ID: ${receipt.id}):`, error);
                        // 画像が取得できない場合はエラーファイルを作成
                        receiptFolder.file('image_error.txt', `画像の取得に失敗しました: ${error.message}`);
                    }
                }

                // 進行状況の通知（オプション）
                if (options.onProgress) {
                    options.onProgress({
                        current: i + 1,
                        total: receipts.length,
                        phase: 'processing'
                    });
                }
            }

            // ZIPファイルの生成
            if (options.onProgress) {
                options.onProgress({
                    current: receipts.length,
                    total: receipts.length,
                    phase: 'compressing'
                });
            }

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: compressionLevel
                }
            });

            // ダウンロード
            const filename = `receipts_export_${timestamp}.zip`;
            await this.downloadZipFile(zipBlob, filename);

            if (options.onProgress) {
                options.onProgress({
                    current: receipts.length,
                    total: receipts.length,
                    phase: 'completed'
                });
            }

        } catch (error) {
            throw new Error(`ZIPエクスポートに失敗しました: ${error.message}`);
        }
    }

    /**
     * 単一領収書のZIPエクスポート
     * @param {Object} receipt - 領収書データ
     * @param {StorageManager} storageManager - ストレージマネージャー
     * @param {Object} options - エクスポートオプション
     * @returns {Promise<void>}
     */
    async exportSingleReceiptToZip(receipt, storageManager, options = {}) {
        await this.exportToZip([receipt], storageManager, {
            ...options,
            folderStructure: 'flat'
        });
    }

    /**
     * メタデータファイルの追加
     * @param {JSZip} zip - ZIPオブジェクト
     * @param {Array} receipts - 領収書データの配列
     * @param {Object} options - オプション
     */
    async addMetadataFiles(zip, receipts, options) {
        // エクスポート情報
        const exportInfo = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            format: 'zip',
            recordCount: receipts.length,
            application: 'Receipt OCR App',
            options: {
                includeImages: options.includeImages,
                folderStructure: options.folderStructure,
                compressionLevel: options.compressionLevel
            }
        };

        zip.file('export_info.json', JSON.stringify(exportInfo, null, 2));

        // サマリー情報
        const summary = this.generateSummary(receipts);
        zip.file('summary.json', JSON.stringify(summary, null, 2));

        // CSV形式のサマリー
        const csvSummary = this.generateCsvSummary(receipts);
        zip.file('summary.csv', csvSummary);

        // README
        const readme = this.generateReadme(receipts, options);
        zip.file('README.txt', readme);
    }

    /**
     * 領収書データのZIP用フォーマット
     * @param {Object} receipt - 領収書データ
     * @returns {Object} フォーマット済みデータ
     */
    formatReceiptForZip(receipt) {
        return {
            id: receipt.id,
            extractedData: {
                date: {
                    value: receipt.data.date?.value || '',
                    confidence: receipt.data.date?.confidence || 0,
                    candidates: receipt.data.date?.candidates || []
                },
                payee: {
                    value: receipt.data.payee?.value || '',
                    confidence: receipt.data.payee?.confidence || 0,
                    candidates: receipt.data.payee?.candidates || []
                },
                amount: {
                    value: receipt.data.amount?.value || '',
                    confidence: receipt.data.amount?.confidence || 0,
                    candidates: receipt.data.amount?.candidates || []
                },
                purpose: {
                    value: receipt.data.purpose?.value || '',
                    confidence: receipt.data.purpose?.confidence || 0,
                    candidates: receipt.data.purpose?.candidates || []
                }
            },
            metadata: {
                createdAt: receipt.createdAt,
                lastAccessedAt: receipt.lastAccessedAt,
                hasImage: receipt.hasImage
            }
        };
    }

    /**
     * フォルダ名の生成
     * @param {Object} receipt - 領収書データ
     * @param {string} structure - フォルダ構造 ('date' | 'flat' | 'payee')
     * @param {number} index - インデックス
     * @returns {string} フォルダ名
     */
    getFolderName(receipt, structure, index) {
        const paddedIndex = String(index).padStart(3, '0');
        
        switch (structure) {
            case 'date':
                const date = receipt.data.date?.value || 'unknown_date';
                const sanitizedDate = date.replace(/[\/\\:*?"<>|]/g, '-');
                return `${paddedIndex}_${sanitizedDate}`;
                
            case 'payee':
                const payee = receipt.data.payee?.value || 'unknown_payee';
                const sanitizedPayee = payee.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 50);
                return `${paddedIndex}_${sanitizedPayee}`;
                
            case 'flat':
            default:
                return `receipt_${paddedIndex}`;
        }
    }

    /**
     * 画像ファイルの拡張子を取得
     * @param {string} mimeType - MIMEタイプ
     * @returns {string} ファイル拡張子
     */
    getImageExtension(mimeType) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
            'image/bmp': '.bmp'
        };
        
        return extensions[mimeType] || '.jpg';
    }

    /**
     * サマリー情報の生成
     * @param {Array} receipts - 領収書データの配列
     * @returns {Object} サマリー情報
     */
    generateSummary(receipts) {
        const totalAmount = receipts.reduce((sum, receipt) => {
            const amount = parseInt(receipt.data.amount?.value) || 0;
            return sum + amount;
        }, 0);

        const payeeStats = {};
        const purposeStats = {};
        const dateRange = { earliest: null, latest: null };

        receipts.forEach(receipt => {
            // 支払先統計
            const payee = receipt.data.payee?.value;
            if (payee) {
                payeeStats[payee] = (payeeStats[payee] || 0) + 1;
            }

            // 適用統計
            const purpose = receipt.data.purpose?.value;
            if (purpose) {
                purposeStats[purpose] = (purposeStats[purpose] || 0) + 1;
            }

            // 日付範囲
            const date = receipt.data.date?.value;
            if (date) {
                const dateObj = new Date(date);
                if (!dateRange.earliest || dateObj < new Date(dateRange.earliest)) {
                    dateRange.earliest = date;
                }
                if (!dateRange.latest || dateObj > new Date(dateRange.latest)) {
                    dateRange.latest = date;
                }
            }
        });

        return {
            totalRecords: receipts.length,
            totalAmount,
            dateRange,
            topPayees: Object.entries(payeeStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([payee, count]) => ({ payee, count })),
            topPurposes: Object.entries(purposeStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([purpose, count]) => ({ purpose, count })),
            averageConfidence: {
                date: this.calculateAverageConfidence(receipts, 'date'),
                payee: this.calculateAverageConfidence(receipts, 'payee'),
                amount: this.calculateAverageConfidence(receipts, 'amount'),
                purpose: this.calculateAverageConfidence(receipts, 'purpose')
            }
        };
    }

    /**
     * CSV形式サマリーの生成
     * @param {Array} receipts - 領収書データの配列
     * @returns {string} CSV形式のサマリー
     */
    generateCsvSummary(receipts) {
        const headers = ['ID', '日付', '支払先', '金額', '適用', '作成日時'];
        const rows = [headers];

        receipts.forEach(receipt => {
            rows.push([
                receipt.id,
                receipt.data.date?.value || '',
                receipt.data.payee?.value || '',
                receipt.data.amount?.value || '',
                receipt.data.purpose?.value || '',
                new Date(receipt.createdAt).toLocaleString('ja-JP')
            ]);
        });

        return rows.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    /**
     * READMEファイルの生成
     * @param {Array} receipts - 領収書データの配列
     * @param {Object} options - エクスポートオプション
     * @returns {string} README内容
     */
    generateReadme(receipts, options) {
        const timestamp = new Date().toLocaleString('ja-JP');
        
        return `領収書OCRアプリ - エクスポートデータ
========================================

エクスポート日時: ${timestamp}
レコード数: ${receipts.length}件
形式: ZIP形式（画像付き）

ファイル構成:
- export_info.json: エクスポート情報
- summary.json: データサマリー（JSON形式）
- summary.csv: データサマリー（CSV形式）
- receipt_XXX/: 各領収書のフォルダ
  - receipt_data.json: 抽出されたデータ
  - receipt_image.*: 領収書画像（存在する場合）

データ形式:
各領収書フォルダ内のreceipt_data.jsonには以下の情報が含まれます：
- extractedData: OCRで抽出されたデータ（日付、支払先、金額、適用）
- metadata: 作成日時、最終アクセス日時、画像有無

注意事項:
- 画像ファイルは元の形式で保存されています
- 信頼度が低いデータは内容を確認してください
- このデータは領収書OCRアプリで生成されました

アプリケーション: 領収書OCRアプリ
バージョン: 1.0
`;
    }

    /**
     * 平均信頼度の計算
     * @param {Array} receipts - 領収書データの配列
     * @param {string} field - フィールド名
     * @returns {number} 平均信頼度
     */
    calculateAverageConfidence(receipts, field) {
        const confidences = receipts
            .map(receipt => receipt.data[field]?.confidence)
            .filter(conf => conf !== undefined && conf !== null);
        
        if (confidences.length === 0) return 0;
        
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
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
     * ZIPファイルのダウンロード
     * @param {Blob} zipBlob - ZIPファイルのBlob
     * @param {string} filename - ファイル名
     * @returns {Promise<void>}
     */
    async downloadZipFile(zipBlob, filename) {
        try {
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            
            // クリーンアップ
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            throw new Error(`ZIPファイルのダウンロードに失敗しました: ${error.message}`);
        }
    }

    /**
     * ZIPエクスポートのプレビュー情報生成
     * @param {Array} receipts - 領収書データの配列
     * @param {Object} options - エクスポートオプション
     * @returns {Object} プレビュー情報
     */
    generateZipPreview(receipts, options = {}) {
        if (!receipts || receipts.length === 0) {
            return {
                recordCount: 0,
                estimatedSize: '0 KB',
                fileCount: 0,
                structure: 'エクスポートするデータがありません'
            };
        }

        const { includeImages = true, folderStructure = 'date' } = options;
        
        // ファイル数の計算
        let fileCount = receipts.length; // receipt_data.json files
        fileCount += 4; // metadata files (export_info.json, summary.json, summary.csv, README.txt)
        
        if (includeImages) {
            const imagesCount = receipts.filter(r => r.hasImage).length;
            fileCount += imagesCount;
        }

        // 推定サイズの計算
        const jsonSize = receipts.length * 2; // 約2KB per receipt JSON
        const metadataSize = 10; // 約10KB for metadata files
        const imageSize = includeImages ? receipts.filter(r => r.hasImage).length * 500 : 0; // 約500KB per image
        const totalSizeKB = jsonSize + metadataSize + imageSize;

        // フォルダ構造の説明
        const structureDescription = this.getStructureDescription(folderStructure, receipts.length);

        return {
            recordCount: receipts.length,
            fileCount,
            estimatedSize: this.formatSize(totalSizeKB * 1024),
            structure: structureDescription,
            includeImages,
            folderStructure
        };
    }

    /**
     * フォルダ構造の説明生成
     * @param {string} structure - フォルダ構造
     * @param {number} count - レコード数
     * @returns {string} 構造の説明
     */
    getStructureDescription(structure, count) {
        switch (structure) {
            case 'date':
                return `日付別フォルダ構成 (${count}個のフォルダ)`;
            case 'payee':
                return `支払先別フォルダ構成 (${count}個のフォルダ)`;
            case 'flat':
            default:
                return `フラット構成 (${count}個のフォルダ)`;
        }
    }

    /**
     * ファイルサイズのフォーマット
     * @param {number} bytes - バイト数
     * @returns {string} フォーマット済みサイズ
     */
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / (1024 * 1024)) + ' MB';
    }

    /**
     * JSZipライブラリの利用可能性確認
     * @returns {boolean} 利用可能かどうか
     */
    isAvailable() {
        return this.jsZipLoaded && !!window.JSZip;
    }
}

// グローバルに公開
window.ZipExportManager = ZipExportManager;