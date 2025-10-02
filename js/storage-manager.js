/**
 * IndexedDBストレージマネージャー
 * 領収書データの保存・読み込み・管理を行う
 */

class StorageManager {
    constructor() {
        this.dbName = 'ReceiptOCRDB';
        this.dbVersion = 1;
        this.db = null;
        this.maxRecords = 50; // LRU方式による上限
        
        // オブジェクトストア名
        this.stores = {
            receipts: 'receipts',
            images: 'images'
        };
    }

    /**
     * データベースの初期化
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            // ストレージ制限の事前チェック
            if (navigator.storage && navigator.storage.estimate) {
                navigator.storage.estimate().then(estimate => {
                    const usageRatio = estimate.usage / estimate.quota;
                    if (usageRatio > 0.9) {
                        console.warn('ストレージ使用量が90%を超えています:', estimate);
                    }
                }).catch(error => {
                    console.warn('ストレージ使用量の確認に失敗:', error);
                });
            }
            
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                const error = request.error;
                let errorMessage = 'IndexedDBの初期化に失敗しました';
                
                // エラータイプに応じたメッセージ
                if (error.name === 'QuotaExceededError') {
                    errorMessage = 'ストレージ容量が不足しています';
                } else if (error.name === 'VersionError') {
                    errorMessage = 'データベースのバージョンに問題があります';
                } else if (error.name === 'InvalidStateError') {
                    errorMessage = 'データベースが無効な状態です';
                }
                
                reject(new Error(errorMessage + ': ' + error.message));
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 領収書データストア
                if (!db.objectStoreNames.contains(this.stores.receipts)) {
                    const receiptStore = db.createObjectStore(this.stores.receipts, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    
                    // インデックスの作成
                    receiptStore.createIndex('createdAt', 'createdAt', { unique: false });
                    receiptStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
                    receiptStore.createIndex('payee', 'data.payee.value', { unique: false });
                    receiptStore.createIndex('date', 'data.date.value', { unique: false });
                }
                
                // 画像データストア
                if (!db.objectStoreNames.contains(this.stores.images)) {
                    const imageStore = db.createObjectStore(this.stores.images, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    
                    imageStore.createIndex('receiptId', 'receiptId', { unique: false });
                    imageStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    /**
     * 領収書データの保存
     * @param {Object} receiptData - 領収書データ
     * @param {Blob} imageBlob - 画像データ（オプション）
     * @returns {Promise<string>} 保存されたレコードのID
     */
    async saveReceipt(receiptData, imageBlob = null) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        // メモリストレージモードの場合は保存をスキップ
        if (window.useMemoryStorage) {
            console.log('メモリストレージモードのため、データは保存されません');
            return 'memory_' + Date.now();
        }

        const id = this.generateId();
        const now = new Date();
        
        const receipt = {
            id,
            data: receiptData,
            createdAt: now,
            lastAccessedAt: now,
            hasImage: !!imageBlob
        };

        const transaction = this.db.transaction([this.stores.receipts, this.stores.images], 'readwrite');
        
        try {
            // ストレージ容量の事前チェック
            if (imageBlob && imageBlob.size > 5 * 1024 * 1024) { // 5MB以上
                await this.checkStorageQuota(imageBlob.size);
            }
            
            // 領収書データの保存
            const receiptStore = transaction.objectStore(this.stores.receipts);
            await this.promisifyRequest(receiptStore.add(receipt));
            
            // 画像データの保存（存在する場合）
            if (imageBlob) {
                const imageStore = transaction.objectStore(this.stores.images);
                const imageRecord = {
                    id: `img_${id}`,
                    receiptId: id,
                    imageData: imageBlob,
                    createdAt: now
                };
                await this.promisifyRequest(imageStore.add(imageRecord));
            }
            
            // LRU管理の実行
            await this.enforceLRULimit();
            
            return id;
        } catch (error) {
            // エラータイプに応じた詳細なメッセージ
            if (error.name === 'QuotaExceededError') {
                throw new Error('ストレージ容量が不足しています。古いデータを削除してください。');
            } else if (error.name === 'DataError') {
                throw new Error('データ形式に問題があります。');
            } else if (error.name === 'ConstraintError') {
                throw new Error('データの制約に違反しています。');
            } else {
                throw new Error('データの保存に失敗しました: ' + error.message);
            }
        }
    }

    /**
     * 領収書データの読み込み
     * @param {string} id - レコードID
     * @returns {Promise<Object|null>} 領収書データ
     */
    async getReceipt(id) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        const transaction = this.db.transaction([this.stores.receipts], 'readwrite');
        const store = transaction.objectStore(this.stores.receipts);
        
        try {
            const receipt = await this.promisifyRequest(store.get(id));
            
            if (receipt) {
                // 最終アクセス時刻を更新
                receipt.lastAccessedAt = new Date();
                await this.promisifyRequest(store.put(receipt));
                
                return receipt;
            }
            
            return null;
        } catch (error) {
            throw new Error('データの読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * 画像データの読み込み
     * @param {string} receiptId - 領収書ID
     * @returns {Promise<Blob|null>} 画像データ
     */
    async getImage(receiptId) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        const transaction = this.db.transaction([this.stores.images], 'readonly');
        const store = transaction.objectStore(this.stores.images);
        const index = store.index('receiptId');
        
        try {
            const imageRecord = await this.promisifyRequest(index.get(receiptId));
            return imageRecord ? imageRecord.imageData : null;
        } catch (error) {
            throw new Error('画像データの読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * 全領収書データの一覧取得
     * @param {Object} options - オプション
     * @param {number} options.limit - 取得件数制限
     * @param {string} options.sortBy - ソート基準 ('createdAt' | 'lastAccessedAt')
     * @param {string} options.order - ソート順 ('asc' | 'desc')
     * @returns {Promise<Array>} 領収書データの配列
     */
    async getAllReceipts(options = {}) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        const {
            limit = this.maxRecords,
            sortBy = 'createdAt',
            order = 'desc'
        } = options;

        const transaction = this.db.transaction([this.stores.receipts], 'readonly');
        const store = transaction.objectStore(this.stores.receipts);
        const index = store.index(sortBy);
        
        try {
            const direction = order === 'desc' ? 'prev' : 'next';
            const receipts = [];
            
            return new Promise((resolve, reject) => {
                const request = index.openCursor(null, direction);
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor && receipts.length < limit) {
                        receipts.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(receipts);
                    }
                };
                
                request.onerror = () => {
                    reject(new Error('データの取得に失敗しました: ' + request.error));
                };
            });
        } catch (error) {
            throw new Error('データの一覧取得に失敗しました: ' + error.message);
        }
    }

    /**
     * 領収書データの削除
     * @param {string} id - レコードID
     * @returns {Promise<void>}
     */
    async deleteReceipt(id) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        const transaction = this.db.transaction([this.stores.receipts, this.stores.images], 'readwrite');
        
        try {
            // 領収書データの削除
            const receiptStore = transaction.objectStore(this.stores.receipts);
            await this.promisifyRequest(receiptStore.delete(id));
            
            // 関連する画像データの削除
            const imageStore = transaction.objectStore(this.stores.images);
            const imageIndex = imageStore.index('receiptId');
            const imageRecord = await this.promisifyRequest(imageIndex.get(id));
            
            if (imageRecord) {
                await this.promisifyRequest(imageStore.delete(imageRecord.id));
            }
        } catch (error) {
            throw new Error('データの削除に失敗しました: ' + error.message);
        }
    }

    /**
     * データベースのクリア
     * @returns {Promise<void>}
     */
    async clearAll() {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        const transaction = this.db.transaction([this.stores.receipts, this.stores.images], 'readwrite');
        
        try {
            await this.promisifyRequest(transaction.objectStore(this.stores.receipts).clear());
            await this.promisifyRequest(transaction.objectStore(this.stores.images).clear());
        } catch (error) {
            throw new Error('データベースのクリアに失敗しました: ' + error.message);
        }
    }

    /**
     * LRU方式による上限管理
     * @returns {Promise<void>}
     */
    async enforceLRULimit() {
        const receipts = await this.getAllReceipts({
            sortBy: 'lastAccessedAt',
            order: 'asc' // 古いものから取得
        });

        if (receipts.length > this.maxRecords) {
            const excessCount = receipts.length - this.maxRecords;
            const toDelete = receipts.slice(0, excessCount);
            
            for (const receipt of toDelete) {
                await this.deleteReceipt(receipt.id);
            }
        }
    }

    /**
     * ストレージ使用量の取得
     * @returns {Promise<Object>} 使用量情報
     */
    async getStorageInfo() {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        try {
            const receipts = await this.getAllReceipts();
            const receiptCount = receipts.length;
            
            // 画像データのサイズを計算
            let totalImageSize = 0;
            const transaction = this.db.transaction([this.stores.images], 'readonly');
            const imageStore = transaction.objectStore(this.stores.images);
            
            const imageSizes = await new Promise((resolve, reject) => {
                const sizes = [];
                const request = imageStore.openCursor();
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        sizes.push(cursor.value.imageData.size || 0);
                        cursor.continue();
                    } else {
                        resolve(sizes);
                    }
                };
                
                request.onerror = () => {
                    reject(new Error('画像サイズの計算に失敗しました'));
                };
            });
            
            totalImageSize = imageSizes.reduce((sum, size) => sum + size, 0);
            
            return {
                receiptCount,
                maxRecords: this.maxRecords,
                totalImageSize,
                formattedImageSize: this.formatBytes(totalImageSize),
                usagePercentage: Math.round((receiptCount / this.maxRecords) * 100)
            };
        } catch (error) {
            throw new Error('ストレージ情報の取得に失敗しました: ' + error.message);
        }
    }

    /**
     * 検索機能
     * @param {Object} criteria - 検索条件
     * @param {string} criteria.payee - 支払先での検索
     * @param {string} criteria.dateFrom - 開始日
     * @param {string} criteria.dateTo - 終了日
     * @param {number} criteria.amountMin - 最小金額
     * @param {number} criteria.amountMax - 最大金額
     * @returns {Promise<Array>} 検索結果
     */
    async searchReceipts(criteria) {
        const allReceipts = await this.getAllReceipts();
        
        return allReceipts.filter(receipt => {
            const data = receipt.data;
            
            // 支払先での検索
            if (criteria.payee) {
                const payee = data.payee?.value || '';
                if (!payee.toLowerCase().includes(criteria.payee.toLowerCase())) {
                    return false;
                }
            }
            
            // 日付範囲での検索
            if (criteria.dateFrom || criteria.dateTo) {
                const receiptDate = data.date?.value;
                if (!receiptDate) return false;
                
                const date = new Date(receiptDate);
                
                if (criteria.dateFrom && date < new Date(criteria.dateFrom)) {
                    return false;
                }
                
                if (criteria.dateTo && date > new Date(criteria.dateTo)) {
                    return false;
                }
            }
            
            // 金額範囲での検索
            if (criteria.amountMin !== undefined || criteria.amountMax !== undefined) {
                const amount = parseInt(data.amount?.value) || 0;
                
                if (criteria.amountMin !== undefined && amount < criteria.amountMin) {
                    return false;
                }
                
                if (criteria.amountMax !== undefined && amount > criteria.amountMax) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * ユニークIDの生成
     * @returns {string} ユニークID
     */
    generateId() {
        return 'receipt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * IndexedDBリクエストのPromise化
     * @param {IDBRequest} request - IndexedDBリクエスト
     * @returns {Promise} Promise化されたリクエスト
     */
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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
     * ストレージ容量の事前チェック
     * @param {number} requiredSize - 必要なサイズ（バイト）
     * @returns {Promise<void>}
     */
    async checkStorageQuota(requiredSize) {
        if (!navigator.storage || !navigator.storage.estimate) {
            return; // APIが利用できない場合はスキップ
        }

        try {
            const estimate = await navigator.storage.estimate();
            const availableSpace = estimate.quota - estimate.usage;
            
            if (requiredSize > availableSpace) {
                throw new Error('ストレージ容量が不足しています');
            }
            
            // 使用率が90%を超える場合は警告
            const usageRatio = (estimate.usage + requiredSize) / estimate.quota;
            if (usageRatio > 0.9) {
                console.warn('ストレージ使用率が90%を超えます:', {
                    current: estimate.usage,
                    required: requiredSize,
                    quota: estimate.quota,
                    ratio: usageRatio
                });
            }
        } catch (error) {
            if (error.message.includes('ストレージ容量')) {
                throw error; // 容量不足エラーは再スロー
            }
            console.warn('ストレージ容量の確認に失敗:', error);
        }
    }

    /**
     * 緊急時のデータクリーンアップ
     * @param {number} targetFreeSpace - 確保したい空き容量（バイト）
     * @returns {Promise<number>} 削除されたレコード数
     */
    async emergencyCleanup(targetFreeSpace = 10 * 1024 * 1024) { // デフォルト10MB
        try {
            const receipts = await this.getAllReceipts({
                sortBy: 'lastAccessedAt',
                order: 'asc' // 古いものから取得
            });

            let deletedCount = 0;
            let freedSpace = 0;

            for (const receipt of receipts) {
                if (freedSpace >= targetFreeSpace) break;

                // 画像サイズを推定
                if (receipt.hasImage) {
                    const imageData = await this.getImage(receipt.id);
                    if (imageData) {
                        freedSpace += imageData.size;
                    }
                }

                await this.deleteReceipt(receipt.id);
                deletedCount++;
                
                // データサイズも推定（JSON文字列として）
                freedSpace += JSON.stringify(receipt.data).length * 2; // UTF-16想定
            }

            console.log(`緊急クリーンアップ完了: ${deletedCount}件削除, 約${this.formatBytes(freedSpace)}解放`);
            return deletedCount;
        } catch (error) {
            console.error('緊急クリーンアップに失敗:', error);
            throw new Error('データクリーンアップに失敗しました: ' + error.message);
        }
    }

    /**
     * データベースの接続を閉じる
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// グローバルに公開
window.StorageManager = StorageManager;