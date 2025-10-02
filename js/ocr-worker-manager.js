/**
 * OCR Worker Manager - Web Workerとの通信を管理
 */

class OCRWorkerManager {
    constructor(config = {}) {
        this.config = {
            workerPath: config.workerPath || './js/ocr-worker.js',
            maxRetries: config.maxRetries || 3,
            timeout: config.timeout || 30000, // 30秒
            ...config
        };
        
        this.worker = null;
        this.isInitialized = false;
        this.messageId = 0;
        this.pendingMessages = new Map();
        this.eventListeners = new Map();
        
        // 初期化状態
        this.initializationPromise = null;
        this.workerStatus = {
            initialized: false,
            backend: null,
            usingFallback: false,
            modelsLoaded: false
        };
    }

    /**
     * Workerの初期化
     */
    async initialize(ocrConfig = {}) {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._performInitialization(ocrConfig);
        return this.initializationPromise;
    }

    /**
     * 実際の初期化処理
     * @private
     */
    async _performInitialization(ocrConfig) {
        const startTime = Date.now();
        
        try {
            console.log('OCR Worker Managerを初期化中...');
            
            // Web Workerの作成
            console.log('Web Workerを作成中...');
            this.worker = new Worker(this.config.workerPath);
            
            // メッセージハンドラーの設定
            this.worker.onmessage = (e) => this._handleWorkerMessage(e);
            this.worker.onerror = (error) => this._handleWorkerError(error);
            
            console.log('OCRエンジンの初期化メッセージを送信中...');
            
            // OCRエンジンの初期化（タイムアウト付き）
            const initResult = await this._sendMessage('INIT', ocrConfig);
            
            console.log('OCRエンジン初期化結果:', initResult);
            
            this.isInitialized = true;
            this.workerStatus = {
                ...this.workerStatus,
                initialized: true,
                backend: initResult.backend,
                usingFallback: initResult.usingFallback
            };
            
            console.log('OCR Worker Manager初期化完了:', this.workerStatus);
            
            // 初期化完了イベントを発火
            this._emit('initialized', this.workerStatus);
            
            return this.workerStatus;
            
        } catch (error) {
            console.error('OCR Worker Manager初期化エラー:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * モデルファイルの読み込み
     */
    async loadModels(progressCallback = null) {
        if (!this.isInitialized) {
            throw new Error('Worker Managerが初期化されていません');
        }
        
        try {
            // 進行状況コールバックを登録
            if (progressCallback) {
                this._on('progress', progressCallback);
            }
            
            const result = await this._sendMessage('LOAD_MODELS', {});
            
            this.workerStatus.modelsLoaded = true;
            
            // 進行状況コールバックを解除
            if (progressCallback) {
                this._off('progress', progressCallback);
            }
            
            return result;
            
        } catch (error) {
            console.error('モデル読み込みエラー:', error);
            throw error;
        }
    }

    /**
     * 画像のOCR処理
     */
    async processImage(imageData, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Worker Managerが初期化されていません');
        }
        
        try {
            // 進行状況コールバックを設定
            const progressCallback = options.progressCallback;
            if (progressCallback) {
                this._on('progress', progressCallback);
            }
            
            const result = await this._sendMessage('PROCESS_IMAGE', {
                imageData,
                options: {
                    ...options,
                    progressCallback: undefined // Workerには関数を送信できないため除外
                }
            });
            
            // 進行状況コールバックを解除
            if (progressCallback) {
                this._off('progress', progressCallback);
            }
            
            return result;
            
        } catch (error) {
            console.error('OCR処理エラー:', error);
            throw error;
        }
    }

    /**
     * 指定領域のOCR処理
     */
    async processRegion(imageData, region, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Worker Managerが初期化されていません');
        }
        
        try {
            // 進行状況コールバックを設定
            const progressCallback = options.progressCallback;
            if (progressCallback) {
                this._on('progress', progressCallback);
            }
            
            const result = await this._sendMessage('PROCESS_REGION', {
                imageData,
                region,
                options: {
                    ...options,
                    progressCallback: undefined
                }
            });
            
            // 進行状況コールバックを解除
            if (progressCallback) {
                this._off('progress', progressCallback);
            }
            
            return result;
            
        } catch (error) {
            console.error('領域OCR処理エラー:', error);
            throw error;
        }
    }

    /**
     * Worker状態の取得
     */
    async getStatus() {
        if (!this.worker) {
            return { initialized: false };
        }
        
        try {
            const status = await this._sendMessage('GET_STATUS', {});
            return status;
        } catch (error) {
            console.error('状態取得エラー:', error);
            return { initialized: false, error: error.message };
        }
    }

    /**
     * Workerの終了とクリーンアップ
     */
    async dispose() {
        try {
            if (this.worker && this.isInitialized) {
                await this._sendMessage('DISPOSE', {});
            }
        } catch (error) {
            console.warn('Worker終了時エラー:', error);
        } finally {
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
            }
            
            this.isInitialized = false;
            this.pendingMessages.clear();
            this.eventListeners.clear();
            this.initializationPromise = null;
            
            console.log('OCR Worker Managerをクリーンアップしました');
        }
    }

    /**
     * イベントリスナーの登録
     */
    on(event, callback) {
        this._on(event, callback);
    }

    /**
     * イベントリスナーの解除
     */
    off(event, callback) {
        this._off(event, callback);
    }

    /**
     * 初期化状態の取得
     */
    getInitializationStatus() {
        const status = {
            ...this.workerStatus,
            isInitialized: this.isInitialized,
            hasWorker: !!this.worker,
            pendingMessages: this.pendingMessages.size,
            initializationPromise: !!this.initializationPromise
        };
        
        console.log('Worker初期化状態:', status);
        return status;
    }

    /**
     * Workerにメッセージを送信
     * @private
     */
    async _sendMessage(type, data) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Workerが初期化されていません'));
                return;
            }
            
            const id = ++this.messageId;
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error(`メッセージタイムアウト: ${type}`));
            }, this.config.timeout);
            
            this.pendingMessages.set(id, {
                resolve,
                reject,
                timeout,
                type
            });
            
            this.worker.postMessage({
                type,
                data,
                id
            });
        });
    }

    /**
     * Workerからのメッセージ処理
     * @private
     */
    _handleWorkerMessage(e) {
        const { type, id, data, error } = e.data;
        
        switch (type) {
            case 'SUCCESS':
                this._handleSuccess(id, data);
                break;
                
            case 'ERROR':
                this._handleError(id, error);
                break;
                
            case 'PROGRESS':
                this._handleProgress(id, data);
                break;
                
            case 'LOG':
                this._handleLog(data);
                break;
                
            case 'WORKER_ERROR':
                this._handleWorkerError(error);
                break;
                
            default:
                console.warn('未知のWorkerメッセージタイプ:', type);
        }
    }

    /**
     * 成功レスポンスの処理
     * @private
     */
    _handleSuccess(id, data) {
        const pending = this.pendingMessages.get(id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingMessages.delete(id);
            pending.resolve(data);
        }
    }

    /**
     * エラーレスポンスの処理
     * @private
     */
    _handleError(id, error) {
        const pending = this.pendingMessages.get(id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingMessages.delete(id);
            pending.reject(new Error(error));
        }
    }

    /**
     * 進行状況の処理
     * @private
     */
    _handleProgress(id, data) {
        this._emit('progress', data.message, data.progress);
    }

    /**
     * ログメッセージの処理
     * @private
     */
    _handleLog(data) {
        const { level, message, timestamp } = data;
        console[level](`[OCR Worker ${new Date(timestamp).toLocaleTimeString()}]`, message);
    }

    /**
     * Workerエラーの処理
     * @private
     */
    _handleWorkerError(error) {
        console.error('Worker内エラー:', error);
        this._emit('error', error);
        
        // 保留中のメッセージをすべてエラーで終了
        for (const [id, pending] of this.pendingMessages) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(`Workerエラー: ${error}`));
        }
        this.pendingMessages.clear();
    }

    /**
     * イベントリスナーの内部登録
     * @private
     */
    _on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    /**
     * イベントリスナーの内部解除
     * @private
     */
    _off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.eventListeners.delete(event);
            }
        }
    }

    /**
     * イベントの発火
     * @private
     */
    _emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`イベント ${event} のコールバックエラー:`, error);
                }
            }
        }
    }
}

// グローバルに公開
window.OCRWorkerManager = OCRWorkerManager;