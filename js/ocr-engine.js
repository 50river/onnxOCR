/**
 * OCRエンジン - ONNX Runtime Webを使用したOCR処理
 */

class OCREngine {
    constructor(config = {}) {
        this.config = {
            modelsPath: config.modelsPath || './models/',
            backends: config.backends || ['webgpu', 'webgl', 'wasm'],
            fallbackToTesseract: config.fallbackToTesseract !== false,
            ...config
        };
        
        this.initialized = false;
        this.initializationError = null;
        this.currentBackend = null;
        this.session = null;
        this.models = {
            detection: null,
            recognition: null,
            angleClassification: null
        };
        this.charset = null;
        this.fallbackEngine = null;
        this.usingFallback = false;
        
        // 初期化状態の管理
        this.initializationPromise = null;
        this.initializationCallbacks = [];
    }

    /**
     * エンジンの初期化
     * @returns {Promise<void>}
     */
    async initialize() {
        // 既に初期化済みの場合
        if (this.initialized) {
            return;
        }
        
        // 初期化中の場合は既存のPromiseを返す
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        // 初期化処理を開始
        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    /**
     * 実際の初期化処理
     * @private
     */
    async _performInitialization() {
        try {
            console.log('OCRエンジンの初期化を開始...');
            
            // GitHub Pages環境またはフォールバック強制モードの検出
            const isGitHubPages = window.location.hostname.includes('github.io') || 
                                 window.location.hostname.includes('github.com');
            const forceFallback = window.FORCE_TESSERACT_FALLBACK || window.GITHUB_PAGES_MODE;
            
            if (isGitHubPages || forceFallback) {
                console.log('GitHub Pages環境またはフォールバック強制モードを検出');
                console.log('ONNXモデルをスキップしてTesseract.jsフォールバックを使用します');
                
                // 直接フォールバックを初期化
                await this._initializeFallback();
                this._notifyInitializationComplete();
                return;
            }
            
            // ONNX Runtime Webの初期化を試行
            const onnxInitialized = await this._initializeONNXRuntime();
            
            if (onnxInitialized) {
                this.initialized = true;
                this.usingFallback = false;
                console.log(`OCRエンジン初期化完了 (バックエンド: ${this.currentBackend})`);
            } else {
                // ONNX初期化に失敗した場合、フォールバックを試行
                await this._initializeFallback();
            }
            
            // 初期化完了コールバックを実行
            this._notifyInitializationComplete();
            
        } catch (error) {
            console.error('OCRエンジン初期化エラー:', error);
            this.initializationError = error;
            
            // フォールバック初期化を試行
            try {
                await this._initializeFallback();
                this._notifyInitializationComplete();
            } catch (fallbackError) {
                console.error('フォールバック初期化も失敗:', fallbackError);
                this.initializationError = fallbackError;
                throw fallbackError;
            }
        }
    }

    /**
     * ONNX Runtime Webの初期化
     * @private
     */
    async _initializeONNXRuntime() {
        try {
            // ONNX Runtime Webが利用可能かチェック
            if (typeof ort === 'undefined') {
                console.warn('ONNX Runtime Webが読み込まれていません');
                return false;
            }
            
            // バックエンドの検出と選択
            const selectedBackend = await this._selectBestBackend();
            if (!selectedBackend) {
                console.warn('利用可能なONNXバックエンドが見つかりません');
                return false;
            }
            
            this.currentBackend = selectedBackend;
            
            // ONNX Runtime Webの設定
            ort.env.wasm.wasmPaths = './libs/';
            ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
            ort.env.wasm.simd = true;
            ort.env.logLevel = 'warning';
            
            // WASMファイルの明示的な指定
            ort.env.wasm.wasmBinary = {
                'ort-wasm.wasm': './libs/ort-wasm.wasm',
                'ort-wasm-simd.wasm': './libs/ort-wasm-simd.wasm',
                'ort-wasm-threaded.wasm': './libs/ort-wasm-threaded.wasm',
                'ort-wasm-simd-threaded.wasm': './libs/ort-wasm-simd-threaded.wasm'
            };
            
            // WASMバックエンド用の追加設定
            if (selectedBackend === 'wasm') {
                // マルチスレッド対応（SharedArrayBufferが利用可能な場合）
                if (typeof SharedArrayBuffer !== 'undefined') {
                    ort.env.wasm.proxy = true;
                }
                // メモリ最適化
                ort.env.wasm.initTimeout = 30000; // 30秒
                
                console.log('WASM設定:', {
                    numThreads: ort.env.wasm.numThreads,
                    simd: ort.env.wasm.simd,
                    proxy: ort.env.wasm.proxy,
                    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
                });
            }
            
            console.log(`ONNX Runtime Web初期化完了 (バックエンド: ${this.currentBackend})`);
            return true;
            
        } catch (error) {
            console.error('ONNX Runtime Web初期化エラー:', error);
            return false;
        }
    }

    /**
     * 最適なバックエンドの選択
     * @private
     */
    async _selectBestBackend() {
        for (const backend of this.config.backends) {
            try {
                const isSupported = await this._checkBackendSupport(backend);
                if (isSupported) {
                    console.log(`バックエンド ${backend} が利用可能です`);
                    return backend;
                }
            } catch (error) {
                console.warn(`バックエンド ${backend} の確認でエラー:`, error);
            }
        }
        return null;
    }

    /**
     * バックエンドサポートの確認
     * @private
     */
    async _checkBackendSupport(backend) {
        try {
            switch (backend) {
                case 'webgpu':
                    return await this._checkWebGPUSupport();
                case 'webgl':
                    return await this._checkWebGLSupport();
                case 'wasm':
                    return await this._checkWASMSupport();
                default:
                    return false;
            }
        } catch (error) {
            console.warn(`バックエンド ${backend} サポート確認エラー:`, error);
            return false;
        }
    }

    /**
     * WebGPUサポートの確認
     * @private
     */
    async _checkWebGPUSupport() {
        if (!navigator.gpu) {
            return false;
        }
        
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                return false;
            }
            
            // 簡単なテストセッションを作成して確認
            const testSession = await ort.InferenceSession.create(
                this._createTestModel(), 
                { executionProviders: ['webgpu'] }
            );
            await testSession.release();
            
            return true;
        } catch (error) {
            console.warn('WebGPUテストエラー:', error);
            return false;
        }
    }

    /**
     * WebGLサポートの確認
     * @private
     */
    async _checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (!gl) {
                return false;
            }
            
            // 簡単なテストセッションを作成して確認
            const testSession = await ort.InferenceSession.create(
                this._createTestModel(), 
                { executionProviders: ['webgl'] }
            );
            await testSession.release();
            
            return true;
        } catch (error) {
            console.warn('WebGLテストエラー:', error);
            return false;
        }
    }

    /**
     * WASMサポートの確認
     * @private
     */
    async _checkWASMSupport() {
        try {
            if (typeof WebAssembly === 'undefined') {
                console.warn('WebAssembly is not supported');
                return false;
            }
            
            // WebAssembly機能の詳細チェック
            const wasmFeatures = {
                basic: typeof WebAssembly.instantiate === 'function',
                streaming: typeof WebAssembly.instantiateStreaming === 'function',
                simd: await this._checkWASMSIMDSupport(),
                threads: await this._checkWASMThreadsSupport()
            };
            
            console.log('WASM Features:', wasmFeatures);
            
            if (!wasmFeatures.basic) {
                return false;
            }
            
            // 簡単なテストセッションを作成して確認
            const testSession = await ort.InferenceSession.create(
                this._createTestModel(), 
                { 
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'all',
                    executionMode: 'sequential'
                }
            );
            await testSession.release();
            
            return true;
        } catch (error) {
            console.warn('WASMテストエラー:', error);
            return false;
        }
    }

    /**
     * WASM SIMD サポートの確認
     * @private
     */
    async _checkWASMSIMDSupport() {
        try {
            // SIMD サポートの確認用のWASMバイナリ
            const simdTestWasm = new Uint8Array([
                0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
                0x03, 0x02, 0x01, 0x00,
                0x0a, 0x0a, 0x01, 0x08, 0x00, 0x41, 0x00, 0xfd, 0x0f, 0x0b
            ]);
            
            const module = await WebAssembly.compile(simdTestWasm);
            return true;
        } catch (error) {
            console.log('WASM SIMD not supported:', error.message);
            return false;
        }
    }

    /**
     * WASM Threads サポートの確認
     * @private
     */
    async _checkWASMThreadsSupport() {
        try {
            // SharedArrayBuffer が利用可能かチェック
            if (typeof SharedArrayBuffer === 'undefined') {
                return false;
            }
            
            // Cross-Origin-Embedder-Policy と Cross-Origin-Opener-Policy の確認
            const headers = {
                'Cross-Origin-Embedder-Policy': 'require-corp',
                'Cross-Origin-Opener-Policy': 'same-origin'
            };
            
            // 実際のスレッドサポートは環境依存なので、基本的な条件のみチェック
            return typeof Worker !== 'undefined' && typeof SharedArrayBuffer !== 'undefined';
        } catch (error) {
            console.log('WASM Threads not supported:', error.message);
            return false;
        }
    }

    /**
     * テスト用の最小モデルを作成
     * @private
     */
    _createTestModel() {
        // 最小限のONNXモデル（恒等関数）をバイナリで作成
        const modelBytes = new Uint8Array([
            0x08, 0x01, 0x12, 0x0c, 0x62, 0x61, 0x63, 0x6b, 0x65, 0x6e, 0x64, 0x2d, 0x74, 0x65, 0x73, 0x74,
            0x3a, 0x20, 0x0a, 0x01, 0x78, 0x12, 0x01, 0x79, 0x22, 0x08, 0x49, 0x64, 0x65, 0x6e, 0x74, 0x69,
            0x74, 0x79, 0x12, 0x0c, 0x74, 0x65, 0x73, 0x74, 0x2d, 0x6d, 0x6f, 0x64, 0x65, 0x6c, 0x2d, 0x76,
            0x31
        ]);
        return modelBytes;
    }

    /**
     * フォールバックエンジンの初期化
     * @private
     */
    async _initializeFallback() {
        if (!this.config.fallbackToTesseract) {
            throw new Error('ONNX Runtime初期化に失敗し、フォールバックが無効です');
        }
        
        try {
            console.log('Tesseract.jsフォールバックを初期化中...');
            
            // Tesseract.jsが利用可能かチェック
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.jsが読み込まれていません');
            }
            
            // Tesseract.jsワーカーの初期化
            this.fallbackEngine = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`Tesseract進行状況: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            await this.fallbackEngine.loadLanguage('jpn+eng');
            await this.fallbackEngine.initialize('jpn+eng');
            
            this.initialized = true;
            this.usingFallback = true;
            this.currentBackend = 'tesseract';
            
            console.log('Tesseract.jsフォールバック初期化完了');
            
        } catch (error) {
            console.error('Tesseract.jsフォールバック初期化エラー:', error);
            throw error;
        }
    }

    /**
     * 初期化完了の通知
     * @private
     */
    _notifyInitializationComplete() {
        this.initializationCallbacks.forEach(callback => {
            try {
                callback(this.initialized, this.usingFallback, this.currentBackend);
            } catch (error) {
                console.error('初期化コールバックエラー:', error);
            }
        });
        this.initializationCallbacks = [];
    }

    /**
     * 初期化完了時のコールバックを登録
     */
    onInitialized(callback) {
        if (this.initialized) {
            // 既に初期化済みの場合は即座に実行
            callback(this.initialized, this.usingFallback, this.currentBackend);
        } else {
            // 初期化待ちの場合はコールバックを登録
            this.initializationCallbacks.push(callback);
        }
    }

    /**
     * 初期化状態の取得
     */
    getInitializationStatus() {
        return {
            initialized: this.initialized,
            usingFallback: this.usingFallback,
            currentBackend: this.currentBackend,
            error: this.initializationError
        };
    }

    /**
     * モデルファイルの動的ロード
     */
    async loadModels(progressCallback = null) {
        if (this.usingFallback) {
            // フォールバック使用時はモデルロード不要
            return;
        }
        
        if (!this.initialized) {
            throw new Error('OCRエンジンが初期化されていません');
        }
        
        try {
            console.log('モデルファイルのロードを開始...');
            
            // 文字セットファイルのロード
            if (progressCallback) progressCallback('文字セットを読み込み中...', 10);
            await this._loadCharset();
            
            // 検出モデルのロード
            if (progressCallback) progressCallback('検出モデルを読み込み中...', 30);
            await this._loadDetectionModel();
            
            // 認識モデルのロード
            if (progressCallback) progressCallback('認識モデルを読み込み中...', 60);
            await this._loadRecognitionModel();
            
            // 角度分類モデルのロード
            if (progressCallback) progressCallback('角度分類モデルを読み込み中...', 90);
            await this._loadAngleClassificationModel();
            
            if (progressCallback) progressCallback('モデルロード完了', 100);
            console.log('全モデルのロードが完了しました');
            
        } catch (error) {
            console.error('モデルロードエラー:', error);
            throw error;
        }
    }

    /**
     * 文字セットファイルの読み込み
     * @private
     */
    async _loadCharset() {
        try {
            const charsetPath = `${this.config.modelsPath}charset_jp.txt`;
            const response = await fetch(charsetPath);
            
            if (!response.ok) {
                throw new Error(`文字セットファイルの読み込みに失敗: ${response.status}`);
            }
            
            const charsetText = await response.text();
            this.charset = charsetText.split('\n').filter(char => char.trim() !== '');
            
            console.log(`文字セットを読み込みました (${this.charset.length}文字)`);
            
        } catch (error) {
            console.error('文字セット読み込みエラー:', error);
            // フォールバック文字セットを使用
            this.charset = this._getDefaultCharset();
            console.warn('デフォルト文字セットを使用します');
        }
    }

    /**
     * 検出モデルの読み込み
     * @private
     */
    async _loadDetectionModel() {
        try {
            const modelPath = `${this.config.modelsPath}text_det.onnx`;
            
            // モデルファイルの存在確認と検証
            const response = await fetch(modelPath, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`検出モデルファイルが見つかりません: ${modelPath}`);
            }
            
            // モデルファイルサイズの確認
            const fileSize = parseInt(response.headers.get('content-length') || '0');
            if (fileSize < 1000000) { // 1MB未満の場合は警告
                console.warn(`検出モデルファイルのサイズが小さすぎます (${fileSize} bytes) - プレースホルダーファイルの可能性があります`);
                log(`⚠️ 検出モデルファイルサイズ: ${Math.round(fileSize / 1024)} KB (実際のモデルは通常20MB以上)`, 'warning');
            } else {
                log(`✅ 検出モデルファイルサイズ: ${Math.round(fileSize / 1024 / 1024)} MB`, 'success');
            }
            
            // ONNXセッションの作成（WASMバックエンド用最適化）
            const sessionOptions = {
                executionProviders: [this.currentBackend],
                graphOptimizationLevel: 'all',
                executionMode: 'sequential'
            };
            
            // WASMバックエンド用の追加設定
            if (this.currentBackend === 'wasm') {
                sessionOptions.enableCpuMemArena = true;
                sessionOptions.enableMemPattern = true;
                sessionOptions.interOpNumThreads = Math.min(4, navigator.hardwareConcurrency || 2);
                sessionOptions.intraOpNumThreads = Math.min(4, navigator.hardwareConcurrency || 2);
            }
            
            this.models.detection = await ort.InferenceSession.create(modelPath, sessionOptions);
            
            console.log('検出モデルを読み込みました');
            
        } catch (error) {
            console.error('検出モデル読み込みエラー:', error);
            throw error;
        }
    }

    /**
     * 認識モデルの読み込み
     * @private
     */
    async _loadRecognitionModel() {
        try {
            const modelPath = `${this.config.modelsPath}text_rec_jp.onnx`;
            
            // モデルファイルの存在確認と検証
            const response = await fetch(modelPath, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`認識モデルファイルが見つかりません: ${modelPath}`);
            }
            
            // モデルファイルサイズの確認
            const fileSize = parseInt(response.headers.get('content-length') || '0');
            if (fileSize < 1000000) { // 1MB未満の場合は警告
                console.warn(`認識モデルファイルのサイズが小さすぎます (${fileSize} bytes) - プレースホルダーファイルの可能性があります`);
                log(`⚠️ 認識モデルファイルサイズ: ${Math.round(fileSize / 1024)} KB (実際のモデルは通常10MB以上)`, 'warning');
            } else {
                log(`✅ 認識モデルファイルサイズ: ${Math.round(fileSize / 1024 / 1024)} MB`, 'success');
            }
            
            // ONNXセッションの作成（WASMバックエンド用最適化）
            const sessionOptions = {
                executionProviders: [this.currentBackend],
                graphOptimizationLevel: 'all',
                executionMode: 'sequential'
            };
            
            // WASMバックエンド用の追加設定
            if (this.currentBackend === 'wasm') {
                sessionOptions.enableCpuMemArena = true;
                sessionOptions.enableMemPattern = true;
                sessionOptions.interOpNumThreads = Math.min(4, navigator.hardwareConcurrency || 2);
                sessionOptions.intraOpNumThreads = Math.min(4, navigator.hardwareConcurrency || 2);
            }
            
            this.models.recognition = await ort.InferenceSession.create(modelPath, sessionOptions);
            
            console.log('認識モデルを読み込みました');
            
        } catch (error) {
            console.error('認識モデル読み込みエラー:', error);
            throw error;
        }
    }

    /**
     * 角度分類モデルの読み込み
     * @private
     */
    async _loadAngleClassificationModel() {
        try {
            const modelPath = `${this.config.modelsPath}text_angle.onnx`;
            
            // モデルファイルの存在確認と検証
            const response = await fetch(modelPath, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`角度分類モデルファイルが見つかりません: ${modelPath}`);
            }
            
            // モデルファイルサイズの確認
            const fileSize = parseInt(response.headers.get('content-length') || '0');
            if (fileSize < 100000) { // 100KB未満の場合は警告
                console.warn(`角度分類モデルファイルのサイズが小さすぎます (${fileSize} bytes) - プレースホルダーファイルの可能性があります`);
                log(`⚠️ 角度分類モデルファイルサイズ: ${Math.round(fileSize / 1024)} KB (実際のモデルは通常1MB以上)`, 'warning');
            } else {
                log(`✅ 角度分類モデルファイルサイズ: ${Math.round(fileSize / 1024)} KB`, 'success');
            }
            
            // ONNXセッションの作成（WASMバックエンド用最適化）
            const sessionOptions = {
                executionProviders: [this.currentBackend],
                graphOptimizationLevel: 'all',
                executionMode: 'sequential'
            };
            
            // WASMバックエンド用の追加設定
            if (this.currentBackend === 'wasm') {
                sessionOptions.enableCpuMemArena = true;
                sessionOptions.enableMemPattern = true;
                sessionOptions.interOpNumThreads = Math.min(4, navigator.hardwareConcurrency || 2);
                sessionOptions.intraOpNumThreads = Math.min(4, navigator.hardwareConcurrency || 2);
            }
            
            this.models.angleClassification = await ort.InferenceSession.create(modelPath, sessionOptions);
            
            console.log('角度分類モデルを読み込みました');
            
        } catch (error) {
            console.error('角度分類モデル読み込みエラー:', error);
            throw error;
        }
    }

    /**
     * デフォルト文字セットの取得
     * @private
     */
    _getDefaultCharset() {
        // 基本的な日本語文字セット（ひらがな、カタカナ、数字、記号）
        const hiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
        const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const numbers = '0123456789';
        const symbols = '、。！？（）「」【】〈〉《》・ー～￥円年月日時分秒';
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        
        return (hiragana + katakana + numbers + symbols + alphabet).split('');
    }

    /**
     * モデルの読み込み状態確認
     */
    areModelsLoaded() {
        if (this.usingFallback) {
            return true; // フォールバック使用時は常にtrue
        }
        
        return !!(this.models.detection && this.models.recognition && this.models.angleClassification && this.charset);
    }

    /**
     * 特定のモデルのみロード（遅延ロード用）
     */
    async loadModelIfNeeded(modelType) {
        if (this.usingFallback) {
            return; // フォールバック使用時は何もしない
        }
        
        if (!this.initialized) {
            throw new Error('OCRエンジンが初期化されていません');
        }
        
        try {
            switch (modelType) {
                case 'detection':
                    if (!this.models.detection) {
                        await this._loadDetectionModel();
                    }
                    break;
                case 'recognition':
                    if (!this.models.recognition) {
                        await this._loadRecognitionModel();
                        if (!this.charset) {
                            await this._loadCharset();
                        }
                    }
                    break;
                case 'angleClassification':
                    if (!this.models.angleClassification) {
                        await this._loadAngleClassificationModel();
                    }
                    break;
                default:
                    throw new Error(`未知のモデルタイプ: ${modelType}`);
            }
        } catch (error) {
            console.error(`モデル ${modelType} の遅延ロードエラー:`, error);
            throw error;
        }
    }

    /**
     * モデルファイルのプリロード（バックグラウンドで実行）
     */
    async preloadModels() {
        if (this.usingFallback) {
            return; // フォールバック使用時は何もしない
        }
        
        try {
            // バックグラウンドでモデルファイルをプリロード
            const modelFiles = [
                'text_det.onnx',
                'text_rec_jp.onnx', 
                'text_angle.onnx',
                'charset_jp.txt'
            ];
            
            const preloadPromises = modelFiles.map(async (filename) => {
                try {
                    const response = await fetch(`${this.config.modelsPath}${filename}`);
                    if (response.ok) {
                        // レスポンスボディを読み込んでキャッシュに保存
                        await response.arrayBuffer();
                        console.log(`プリロード完了: ${filename}`);
                    }
                } catch (error) {
                    console.warn(`プリロード失敗: ${filename}`, error);
                }
            });
            
            await Promise.allSettled(preloadPromises);
            console.log('モデルファイルのプリロードが完了しました');
            
        } catch (error) {
            console.warn('モデルプリロードエラー:', error);
        }
    }

    /**
     * フォールバック処理の実行
     */
    async processWithFallback(imageData, options = {}) {
        if (!this.fallbackEngine) {
            throw new Error('フォールバックエンジンが初期化されていません');
        }
        
        try {
            console.log('Tesseract.jsでOCR処理を実行中...');
            
            // 画像データをTesseract.jsで処理
            const result = await this.fallbackEngine.recognize(imageData, {
                logger: options.progressCallback || null
            });
            
            // 結果を標準形式に変換
            return this._convertTesseractResult(result);
            
        } catch (error) {
            console.error('Tesseract.js処理エラー:', error);
            throw error;
        }
    }

    /**
     * Tesseract.js結果の変換
     * @private
     */
    _convertTesseractResult(tesseractResult) {
        const { data } = tesseractResult;
        
        // テキストブロックの変換
        const textBlocks = [];
        
        if (data.words) {
            data.words.forEach(word => {
                if (word.confidence > 30) { // 低信頼度のワードを除外
                    textBlocks.push({
                        text: word.text,
                        confidence: word.confidence / 100, // 0-1の範囲に正規化
                        boundingBox: {
                            x: word.bbox.x0,
                            y: word.bbox.y0,
                            width: word.bbox.x1 - word.bbox.x0,
                            height: word.bbox.y1 - word.bbox.y0
                        },
                        fontSize: this._estimateFontSize(word.bbox),
                        source: 'tesseract'
                    });
                }
            });
        }
        
        return {
            textBlocks,
            confidence: data.confidence / 100,
            processingTime: tesseractResult.jobId ? Date.now() : 0,
            engine: 'tesseract',
            fallback: true
        };
    }

    /**
     * フォントサイズの推定
     * @private
     */
    _estimateFontSize(bbox) {
        const height = bbox.y1 - bbox.y0;
        // 高さからフォントサイズを推定（簡易的な計算）
        return Math.max(8, Math.min(72, height * 0.8));
    }

    /**
     * フォールバック状態の取得
     */
    getFallbackStatus() {
        return {
            usingFallback: this.usingFallback,
            fallbackAvailable: !!this.fallbackEngine,
            performanceDifference: this._getPerformanceDifference()
        };
    }

    /**
     * 性能差の情報取得
     * @private
     */
    _getPerformanceDifference() {
        if (!this.usingFallback) {
            return null;
        }
        
        return {
            speed: 'ONNXと比較して2-3倍時間がかかる場合があります',
            accuracy: '日本語認識精度が低下する可能性があります',
            features: '一部の高度な機能（角度補正等）が利用できません'
        };
    }

    /**
     * フォールバック切り替えの実行
     */
    async switchToFallback(reason = 'ONNX処理エラー') {
        console.warn(`フォールバックに切り替えます: ${reason}`);
        
        try {
            // まだフォールバックが初期化されていない場合
            if (!this.fallbackEngine) {
                await this._initializeFallback();
            }
            
            this.usingFallback = true;
            this.currentBackend = 'tesseract';
            
            // UI通知用のイベントを発火
            this._notifyFallbackSwitch(reason);
            
            console.log('フォールバックへの切り替えが完了しました');
            
        } catch (error) {
            console.error('フォールバック切り替えエラー:', error);
            throw error;
        }
    }

    /**
     * フォールバック切り替えの通知
     * @private
     */
    _notifyFallbackSwitch(reason) {
        // カスタムイベントを発火してUIに通知
        const event = new CustomEvent('ocrFallbackSwitch', {
            detail: {
                reason,
                performanceDifference: this._getPerformanceDifference(),
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
    }

    /**
     * 処理エンジンの自動選択
     */
    async processImage(imageData, options = {}) {
        if (!this.initialized) {
            throw new Error('OCRエンジンが初期化されていません');
        }
        
        try {
            if (this.usingFallback) {
                // フォールバック使用時
                return await this.processWithFallback(imageData, options);
            } else {
                // ONNX使用時 - 検出→認識パイプライン
                return await this.processWithONNX(imageData, options);
            }
        } catch (error) {
            console.error('OCR処理エラー:', error);
            
            // ONNX処理でエラーが発生した場合、フォールバックを試行
            if (!this.usingFallback && this.config.fallbackToTesseract) {
                console.log('ONNXエラーのためフォールバックを試行します');
                
                try {
                    await this.switchToFallback(error.message);
                    return await this.processWithFallback(imageData, options);
                } catch (fallbackError) {
                    console.error('フォールバック処理も失敗:', fallbackError);
                    throw fallbackError;
                }
            }
            
            throw error;
        }
    }

    /**
     * ONNX Runtime Webを使用したOCR処理
     * @param {ImageData} imageData - 処理対象の画像データ
     * @param {Object} options - オプション設定
     * @returns {Promise<OCRResult>}
     */
    async processWithONNX(imageData, options = {}) {
        const startTime = Date.now();
        
        try {
            // 必要なモデルの遅延ロード
            await this.loadModelIfNeeded('detection');
            await this.loadModelIfNeeded('recognition');
            
            // 進行状況の通知
            if (options.progressCallback) {
                options.progressCallback('テキスト検出を実行中...', 10);
            }
            
            // Step 1: テキスト検出
            const detectionResult = await this.detectText(imageData, options);
            
            if (options.progressCallback) {
                options.progressCallback('テキスト認識を実行中...', 50);
            }
            
            // Step 2: 検出された領域のテキスト認識
            const recognitionResults = await this.recognizeTextRegions(
                imageData, 
                detectionResult.textRegions, 
                options
            );
            
            if (options.progressCallback) {
                options.progressCallback('結果を統合中...', 90);
            }
            
            // Step 3: 結果の統合
            const finalResult = this._combineDetectionAndRecognition(
                detectionResult, 
                recognitionResults
            );
            
            finalResult.processingTime = Date.now() - startTime;
            finalResult.engine = 'onnx';
            finalResult.backend = this.currentBackend;
            
            if (options.progressCallback) {
                options.progressCallback('処理完了', 100);
            }
            
            return finalResult;
            
        } catch (error) {
            console.error('ONNX処理エラー:', error);
            throw error;
        }
    }

    /**
     * テキスト検出処理
     * @param {ImageData} imageData - 画像データ
     * @param {Object} options - オプション設定
     * @returns {Promise<DetectionResult>}
     */
    async detectText(imageData, options = {}) {
        if (!this.models.detection) {
            throw new Error('検出モデルが読み込まれていません');
        }
        
        try {
            // 画像の前処理
            const preprocessedImage = await this._preprocessImageForDetection(imageData);
            
            // 検出モデルの実行
            const detectionOutput = await this._runDetectionModel(preprocessedImage);
            
            // 後処理（バウンディングボックス生成、NMS等）
            const textRegions = await this._postprocessDetection(
                detectionOutput, 
                imageData.width, 
                imageData.height,
                options
            );
            
            return {
                textRegions,
                confidence: this._calculateDetectionConfidence(textRegions),
                originalSize: { width: imageData.width, height: imageData.height }
            };
            
        } catch (error) {
            console.error('テキスト検出エラー:', error);
            throw error;
        }
    }

    /**
     * 検出用画像前処理
     * @private
     */
    async _preprocessImageForDetection(imageData) {
        // 検出モデル用の画像サイズ（通常は640x640や736x736）
        const targetSize = 640;
        
        // Canvas要素を作成して画像をリサイズ
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        // 元画像をCanvasに描画
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // アスペクト比を保持してリサイズ
        const scale = Math.min(targetSize / imageData.width, targetSize / imageData.height);
        const scaledWidth = imageData.width * scale;
        const scaledHeight = imageData.height * scale;
        
        // 中央配置でリサイズ
        const offsetX = (targetSize - scaledWidth) / 2;
        const offsetY = (targetSize - scaledHeight) / 2;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
        
        // ImageDataを取得
        const resizedImageData = ctx.getImageData(0, 0, targetSize, targetSize);
        
        // RGB値を正規化してFloat32Arrayに変換
        const inputTensor = new Float32Array(3 * targetSize * targetSize);
        const data = resizedImageData.data;
        
        for (let i = 0; i < targetSize * targetSize; i++) {
            const pixelIndex = i * 4;
            // RGB値を0-1の範囲に正規化（ImageNetの平均値で正規化）
            inputTensor[i] = (data[pixelIndex] / 255.0 - 0.485) / 0.229;     // R
            inputTensor[i + targetSize * targetSize] = (data[pixelIndex + 1] / 255.0 - 0.456) / 0.224; // G
            inputTensor[i + 2 * targetSize * targetSize] = (data[pixelIndex + 2] / 255.0 - 0.406) / 0.225; // B
        }
        
        return {
            tensor: inputTensor,
            shape: [1, 3, targetSize, targetSize],
            scale,
            offsetX,
            offsetY,
            originalSize: { width: imageData.width, height: imageData.height }
        };
    }

    /**
     * 検出モデルの実行
     * @private
     */
    async _runDetectionModel(preprocessedImage) {
        try {
            // 入力テンソルの作成
            const inputTensor = new ort.Tensor('float32', preprocessedImage.tensor, preprocessedImage.shape);
            
            // モデル実行
            const feeds = { [this.models.detection.inputNames[0]]: inputTensor };
            const results = await this.models.detection.run(feeds);
            
            // 出力テンソルの取得（通常は確率マップとジオメトリマップ）
            const outputNames = this.models.detection.outputNames;
            const probabilityMap = results[outputNames[0]]; // テキスト存在確率
            const geometryMap = results[outputNames[1]];    // バウンディングボックス情報
            
            return {
                probabilityMap,
                geometryMap,
                preprocessInfo: preprocessedImage
            };
            
        } catch (error) {
            console.error('検出モデル実行エラー:', error);
            throw error;
        }
    }

    /**
     * 検出結果の後処理
     * @private
     */
    async _postprocessDetection(detectionOutput, originalWidth, originalHeight, options = {}) {
        const { probabilityMap, geometryMap, preprocessInfo } = detectionOutput;
        const threshold = options.detectionThreshold || 0.5;
        const nmsThreshold = options.nmsThreshold || 0.3;
        
        try {
            // 確率マップから候補領域を抽出
            const candidates = this._extractCandidateRegions(
                probabilityMap, 
                geometryMap, 
                threshold
            );
            
            // Non-Maximum Suppression (NMS) を適用
            const filteredCandidates = this._applyNMS(candidates, nmsThreshold);
            
            // 座標を元画像サイズに変換
            const textRegions = filteredCandidates.map(candidate => {
                return this._transformCoordinates(
                    candidate, 
                    preprocessInfo, 
                    originalWidth, 
                    originalHeight
                );
            });
            
            // 信頼度でソート
            textRegions.sort((a, b) => b.confidence - a.confidence);
            
            return textRegions;
            
        } catch (error) {
            console.error('検出後処理エラー:', error);
            throw error;
        }
    }

    /**
     * 候補領域の抽出
     * @private
     */
    _extractCandidateRegions(probabilityMap, geometryMap, threshold) {
        const candidates = [];
        const probData = probabilityMap.data;
        const geomData = geometryMap.data;
        
        const height = probabilityMap.dims[2];
        const width = probabilityMap.dims[3];
        
        // 確率マップをスキャンして閾値を超える領域を検出
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const probability = probData[index];
                
                if (probability > threshold) {
                    // ジオメトリ情報から境界ボックスを計算
                    const bbox = this._calculateBoundingBox(geomData, index, x, y, width, height);
                    
                    if (bbox && this._isValidBoundingBox(bbox)) {
                        candidates.push({
                            boundingBox: bbox,
                            confidence: probability,
                            centerX: x,
                            centerY: y
                        });
                    }
                }
            }
        }
        
        return candidates;
    }

    /**
     * バウンディングボックスの計算
     * @private
     */
    _calculateBoundingBox(geometryData, baseIndex, centerX, centerY, mapWidth, mapHeight) {
        try {
            // ジオメトリマップから距離情報を取得（EAST形式）
            const stride = mapWidth * mapHeight;
            const top = geometryData[baseIndex];
            const right = geometryData[baseIndex + stride];
            const bottom = geometryData[baseIndex + stride * 2];
            const left = geometryData[baseIndex + stride * 3];
            
            // 中心点から境界ボックスを計算
            const x1 = centerX - left;
            const y1 = centerY - top;
            const x2 = centerX + right;
            const y2 = centerY + bottom;
            
            return {
                x: Math.max(0, x1),
                y: Math.max(0, y1),
                width: Math.max(1, x2 - x1),
                height: Math.max(1, y2 - y1)
            };
            
        } catch (error) {
            console.warn('バウンディングボックス計算エラー:', error);
            return null;
        }
    }

    /**
     * バウンディングボックスの妥当性チェック
     * @private
     */
    _isValidBoundingBox(bbox) {
        const minSize = 5; // 最小サイズ
        const maxAspectRatio = 20; // 最大アスペクト比
        
        if (bbox.width < minSize || bbox.height < minSize) {
            return false;
        }
        
        const aspectRatio = Math.max(bbox.width / bbox.height, bbox.height / bbox.width);
        if (aspectRatio > maxAspectRatio) {
            return false;
        }
        
        return true;
    }

    /**
     * Non-Maximum Suppression (NMS) の適用
     * @private
     */
    _applyNMS(candidates, threshold) {
        if (candidates.length === 0) return [];
        
        // 信頼度でソート
        candidates.sort((a, b) => b.confidence - a.confidence);
        
        const selected = [];
        const suppressed = new Set();
        
        for (let i = 0; i < candidates.length; i++) {
            if (suppressed.has(i)) continue;
            
            const candidate = candidates[i];
            selected.push(candidate);
            
            // 他の候補との重複をチェック
            for (let j = i + 1; j < candidates.length; j++) {
                if (suppressed.has(j)) continue;
                
                const other = candidates[j];
                const iou = this._calculateIoU(candidate.boundingBox, other.boundingBox);
                
                if (iou > threshold) {
                    suppressed.add(j);
                }
            }
        }
        
        return selected;
    }

    /**
     * IoU (Intersection over Union) の計算
     * @private
     */
    _calculateIoU(bbox1, bbox2) {
        const x1 = Math.max(bbox1.x, bbox2.x);
        const y1 = Math.max(bbox1.y, bbox2.y);
        const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
        const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
        
        if (x2 <= x1 || y2 <= y1) return 0;
        
        const intersection = (x2 - x1) * (y2 - y1);
        const area1 = bbox1.width * bbox1.height;
        const area2 = bbox2.width * bbox2.height;
        const union = area1 + area2 - intersection;
        
        return intersection / union;
    }

    /**
     * 座標変換（検出結果を元画像座標系に変換）
     * @private
     */
    _transformCoordinates(candidate, preprocessInfo, originalWidth, originalHeight) {
        const { scale, offsetX, offsetY } = preprocessInfo;
        
        // 前処理時の変換を逆算
        const bbox = candidate.boundingBox;
        const transformedBbox = {
            x: Math.max(0, (bbox.x - offsetX) / scale),
            y: Math.max(0, (bbox.y - offsetY) / scale),
            width: Math.min(originalWidth, bbox.width / scale),
            height: Math.min(originalHeight, bbox.height / scale)
        };
        
        // 境界チェック
        if (transformedBbox.x + transformedBbox.width > originalWidth) {
            transformedBbox.width = originalWidth - transformedBbox.x;
        }
        if (transformedBbox.y + transformedBbox.height > originalHeight) {
            transformedBbox.height = originalHeight - transformedBbox.y;
        }
        
        return {
            boundingBox: transformedBbox,
            confidence: candidate.confidence,
            text: '', // 認識処理で埋める
            fontSize: this._estimateFontSizeFromBbox(transformedBbox),
            source: 'detection'
        };
    }

    /**
     * バウンディングボックスからフォントサイズを推定
     * @private
     */
    _estimateFontSizeFromBbox(bbox) {
        // 高さからフォントサイズを推定
        const estimatedSize = Math.max(8, Math.min(72, bbox.height * 0.8));
        return Math.round(estimatedSize);
    }

    /**
     * 検出信頼度の計算
     * @private
     */
    _calculateDetectionConfidence(textRegions) {
        if (textRegions.length === 0) return 0;
        
        // 全領域の平均信頼度を計算
        const totalConfidence = textRegions.reduce((sum, region) => sum + region.confidence, 0);
        return totalConfidence / textRegions.length;
    }

    /**
     * 検出された領域のテキスト認識
     * @param {ImageData} imageData - 元画像データ
     * @param {Array} textRegions - 検出されたテキスト領域
     * @param {Object} options - オプション設定
     * @returns {Promise<Array>}
     */
    async recognizeTextRegions(imageData, textRegions, options = {}) {
        if (!this.models.recognition) {
            throw new Error('認識モデルが読み込まれていません');
        }
        
        if (!this.charset) {
            throw new Error('文字セットが読み込まれていません');
        }
        
        const recognitionResults = [];
        const batchSize = options.batchSize || 8; // バッチ処理のサイズ
        
        try {
            // 領域を信頼度順にソート
            const sortedRegions = [...textRegions].sort((a, b) => b.confidence - a.confidence);
            
            // バッチ処理で認識を実行
            for (let i = 0; i < sortedRegions.length; i += batchSize) {
                const batch = sortedRegions.slice(i, i + batchSize);
                
                if (options.progressCallback) {
                    const progress = 50 + (i / sortedRegions.length) * 40;
                    options.progressCallback(`テキスト認識中... (${i + 1}/${sortedRegions.length})`, progress);
                }
                
                const batchResults = await this._recognizeTextBatch(imageData, batch, options);
                recognitionResults.push(...batchResults);
            }
            
            return recognitionResults;
            
        } catch (error) {
            console.error('テキスト認識エラー:', error);
            throw error;
        }
    }

    /**
     * バッチでのテキスト認識
     * @private
     */
    async _recognizeTextBatch(imageData, textRegions, options = {}) {
        const batchResults = [];
        
        try {
            // 各領域を個別に処理（実際のバッチ処理は複雑なため、シーケンシャル処理）
            for (const region of textRegions) {
                try {
                    const recognitionResult = await this._recognizeTextRegion(imageData, region, options);
                    batchResults.push(recognitionResult);
                } catch (error) {
                    console.warn('個別領域の認識エラー:', error);
                    // エラーが発生した領域は空のテキストで処理を続行
                    batchResults.push({
                        ...region,
                        text: '',
                        confidence: 0,
                        recognitionError: error.message
                    });
                }
            }
            
            return batchResults;
            
        } catch (error) {
            console.error('バッチ認識エラー:', error);
            throw error;
        }
    }

    /**
     * 単一領域のテキスト認識
     * @private
     */
    async _recognizeTextRegion(imageData, textRegion, options = {}) {
        try {
            // Step 1: 領域の切り出しと前処理
            const croppedImage = await this._cropAndPreprocessRegion(imageData, textRegion);
            
            // Step 2: 角度補正（必要に応じて）
            const correctedImage = await this._correctTextAngle(croppedImage, options);
            
            // Step 3: 認識モデルの実行
            const recognitionOutput = await this._runRecognitionModel(correctedImage);
            
            // Step 4: デコード処理
            const decodedText = await this._decodeRecognitionOutput(recognitionOutput);
            
            return {
                ...textRegion,
                text: decodedText.text,
                confidence: Math.min(textRegion.confidence, decodedText.confidence),
                recognitionConfidence: decodedText.confidence,
                characters: decodedText.characters
            };
            
        } catch (error) {
            console.error('領域認識エラー:', error);
            throw error;
        }
    }

    /**
     * 領域の切り出しと前処理
     * @private
     */
    async _cropAndPreprocessRegion(imageData, textRegion) {
        const bbox = textRegion.boundingBox;
        
        // 元画像からCanvasを作成
        const sourceCanvas = document.createElement('canvas');
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCanvas.width = imageData.width;
        sourceCanvas.height = imageData.height;
        sourceCtx.putImageData(imageData, 0, 0);
        
        // 切り出し領域を少し拡張（パディング）
        const padding = Math.max(2, Math.min(bbox.width, bbox.height) * 0.1);
        const expandedBbox = {
            x: Math.max(0, bbox.x - padding),
            y: Math.max(0, bbox.y - padding),
            width: Math.min(imageData.width - Math.max(0, bbox.x - padding), bbox.width + padding * 2),
            height: Math.min(imageData.height - Math.max(0, bbox.y - padding), bbox.height + padding * 2)
        };
        
        // 認識モデル用の標準サイズ（通常は32x128や48x160など）
        const targetHeight = 48;
        const targetWidth = Math.max(128, Math.round(targetHeight * expandedBbox.width / expandedBbox.height));
        
        // 切り出しとリサイズ
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        cropCanvas.width = targetWidth;
        cropCanvas.height = targetHeight;
        
        // 背景を白で塗りつぶし
        cropCtx.fillStyle = '#FFFFFF';
        cropCtx.fillRect(0, 0, targetWidth, targetHeight);
        
        // アスペクト比を保持してリサイズ
        const scale = Math.min(targetWidth / expandedBbox.width, targetHeight / expandedBbox.height);
        const scaledWidth = expandedBbox.width * scale;
        const scaledHeight = expandedBbox.height * scale;
        const offsetX = (targetWidth - scaledWidth) / 2;
        const offsetY = (targetHeight - scaledHeight) / 2;
        
        cropCtx.drawImage(
            sourceCanvas,
            expandedBbox.x, expandedBbox.y, expandedBbox.width, expandedBbox.height,
            offsetX, offsetY, scaledWidth, scaledHeight
        );
        
        // ImageDataを取得
        const croppedImageData = cropCtx.getImageData(0, 0, targetWidth, targetHeight);
        
        // グレースケール変換と正規化
        const inputTensor = new Float32Array(targetHeight * targetWidth);
        const data = croppedImageData.data;
        
        for (let i = 0; i < targetHeight * targetWidth; i++) {
            const pixelIndex = i * 4;
            // RGB to Grayscale
            const gray = (data[pixelIndex] * 0.299 + data[pixelIndex + 1] * 0.587 + data[pixelIndex + 2] * 0.114) / 255.0;
            // 正規化 (0-1 range)
            inputTensor[i] = gray;
        }
        
        return {
            tensor: inputTensor,
            shape: [1, 1, targetHeight, targetWidth],
            width: targetWidth,
            height: targetHeight,
            originalBbox: expandedBbox
        };
    }

    /**
     * テキスト角度の補正
     * @private
     */
    async _correctTextAngle(croppedImage, options = {}) {
        // 角度分類モデルが利用可能な場合のみ実行
        if (!this.models.angleClassification || options.skipAngleCorrection) {
            return croppedImage;
        }
        
        try {
            // 角度分類モデルの実行
            const inputTensor = new ort.Tensor('float32', croppedImage.tensor, croppedImage.shape);
            const feeds = { [this.models.angleClassification.inputNames[0]]: inputTensor };
            const results = await this.models.angleClassification.run(feeds);
            
            // 角度の予測結果を取得
            const angleOutput = results[this.models.angleClassification.outputNames[0]];
            const angleClass = this._getAngleClass(angleOutput.data);
            
            // 角度補正が必要な場合
            if (angleClass !== 0) {
                return await this._rotateImage(croppedImage, angleClass);
            }
            
            return croppedImage;
            
        } catch (error) {
            console.warn('角度補正エラー:', error);
            return croppedImage; // エラー時は元画像を返す
        }
    }

    /**
     * 角度クラスの取得
     * @private
     */
    _getAngleClass(angleData) {
        let maxIndex = 0;
        let maxValue = angleData[0];
        
        for (let i = 1; i < angleData.length; i++) {
            if (angleData[i] > maxValue) {
                maxValue = angleData[i];
                maxIndex = i;
            }
        }
        
        return maxIndex; // 0: 0度, 1: 90度, 2: 180度, 3: 270度
    }

    /**
     * 画像の回転
     * @private
     */
    async _rotateImage(croppedImage, angleClass) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 回転角度の計算
        const angle = angleClass * 90 * Math.PI / 180;
        
        // 回転後のサイズを計算
        const { width, height } = croppedImage;
        if (angleClass % 2 === 1) {
            // 90度または270度回転の場合、幅と高さが入れ替わる
            canvas.width = height;
            canvas.height = width;
        } else {
            canvas.width = width;
            canvas.height = height;
        }
        
        // 元画像をCanvasに復元
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        const tempImageData = tempCtx.createImageData(width, height);
        for (let i = 0; i < croppedImage.tensor.length; i++) {
            const gray = Math.round(croppedImage.tensor[i] * 255);
            tempImageData.data[i * 4] = gray;     // R
            tempImageData.data[i * 4 + 1] = gray; // G
            tempImageData.data[i * 4 + 2] = gray; // B
            tempImageData.data[i * 4 + 3] = 255;  // A
        }
        tempCtx.putImageData(tempImageData, 0, 0);
        
        // 回転変換を適用
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        ctx.drawImage(tempCanvas, -width / 2, -height / 2);
        
        // 回転後の画像データを取得
        const rotatedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rotatedTensor = new Float32Array(canvas.width * canvas.height);
        
        for (let i = 0; i < canvas.width * canvas.height; i++) {
            const pixelIndex = i * 4;
            const gray = (rotatedImageData.data[pixelIndex] * 0.299 + 
                         rotatedImageData.data[pixelIndex + 1] * 0.587 + 
                         rotatedImageData.data[pixelIndex + 2] * 0.114) / 255.0;
            rotatedTensor[i] = gray;
        }
        
        return {
            tensor: rotatedTensor,
            shape: [1, 1, canvas.height, canvas.width],
            width: canvas.width,
            height: canvas.height,
            rotated: true,
            angleClass
        };
    }

    /**
     * 認識モデルの実行
     * @private
     */
    async _runRecognitionModel(preprocessedImage) {
        try {
            // 入力テンソルの作成
            const inputTensor = new ort.Tensor('float32', preprocessedImage.tensor, preprocessedImage.shape);
            
            // モデル実行
            const feeds = { [this.models.recognition.inputNames[0]]: inputTensor };
            const results = await this.models.recognition.run(feeds);
            
            // 出力テンソルの取得（通常は文字確率のシーケンス）
            const outputTensor = results[this.models.recognition.outputNames[0]];
            
            return {
                logits: outputTensor.data,
                shape: outputTensor.dims,
                inputInfo: preprocessedImage
            };
            
        } catch (error) {
            console.error('認識モデル実行エラー:', error);
            throw error;
        }
    }

    /**
     * 認識結果のデコード処理
     * @private
     */
    async _decodeRecognitionOutput(recognitionOutput) {
        const { logits, shape } = recognitionOutput;
        
        try {
            // CTC (Connectionist Temporal Classification) デコード
            const decodedResult = this._ctcDecode(logits, shape);
            
            // 文字セットを使用してテキストに変換
            const text = this._convertToText(decodedResult.sequence);
            
            // 信頼度の計算
            const confidence = this._calculateRecognitionConfidence(decodedResult.probabilities);
            
            return {
                text: text.trim(),
                confidence,
                characters: decodedResult.characters,
                rawSequence: decodedResult.sequence
            };
            
        } catch (error) {
            console.error('デコード処理エラー:', error);
            throw error;
        }
    }

    /**
     * CTC デコード
     * @private
     */
    _ctcDecode(logits, shape) {
        const [batchSize, seqLength, numClasses] = shape;
        const blankIndex = numClasses - 1; // 通常、最後のインデックスがblank
        
        const sequence = [];
        const probabilities = [];
        const characters = [];
        
        let prevIndex = -1;
        
        // 各時刻での最大確率クラスを取得
        for (let t = 0; t < seqLength; t++) {
            let maxProb = -Infinity;
            let maxIndex = 0;
            
            // 各クラスの確率を確認
            for (let c = 0; c < numClasses; c++) {
                const logit = logits[t * numClasses + c];
                if (logit > maxProb) {
                    maxProb = logit;
                    maxIndex = c;
                }
            }
            
            // Softmax変換で確率に変換
            const probability = Math.exp(maxProb);
            
            // CTC規則に従ってデコード
            if (maxIndex !== blankIndex && maxIndex !== prevIndex) {
                sequence.push(maxIndex);
                probabilities.push(probability);
                
                // 文字情報を保存
                characters.push({
                    index: maxIndex,
                    probability,
                    position: t
                });
            }
            
            prevIndex = maxIndex;
        }
        
        return {
            sequence,
            probabilities,
            characters
        };
    }

    /**
     * インデックスシーケンスをテキストに変換
     * @private
     */
    _convertToText(sequence) {
        if (!this.charset || sequence.length === 0) {
            return '';
        }
        
        let text = '';
        
        for (const index of sequence) {
            if (index >= 0 && index < this.charset.length) {
                text += this.charset[index];
            } else {
                console.warn(`無効な文字インデックス: ${index}`);
                text += '?'; // 未知文字
            }
        }
        
        return text;
    }

    /**
     * 認識信頼度の計算
     * @private
     */
    _calculateRecognitionConfidence(probabilities) {
        if (probabilities.length === 0) return 0;
        
        // 幾何平均を使用して信頼度を計算
        let logSum = 0;
        for (const prob of probabilities) {
            logSum += Math.log(Math.max(prob, 1e-10)); // 数値安定性のため最小値を設定
        }
        
        const geometricMean = Math.exp(logSum / probabilities.length);
        
        // 0-1の範囲に正規化
        return Math.min(1, Math.max(0, geometricMean));
    }

    /**
     * 検出と認識結果の統合
     * @private
     */
    _combineDetectionAndRecognition(detectionResult, recognitionResults) {
        // 認識結果をテキストブロックとして整理
        const textBlocks = recognitionResults
            .filter(result => result.text && result.text.trim().length > 0)
            .map(result => ({
                text: result.text,
                confidence: result.confidence,
                boundingBox: result.boundingBox,
                fontSize: result.fontSize,
                recognitionConfidence: result.recognitionConfidence,
                characters: result.characters,
                source: 'onnx-recognition'
            }));
        
        // 全体の信頼度を計算
        const overallConfidence = this._calculateOverallConfidence(
            detectionResult.confidence,
            textBlocks
        );
        
        // 結果の統計情報
        const statistics = {
            totalRegions: detectionResult.textRegions.length,
            recognizedRegions: textBlocks.length,
            averageConfidence: overallConfidence,
            detectionConfidence: detectionResult.confidence,
            recognitionRate: textBlocks.length / Math.max(1, detectionResult.textRegions.length)
        };
        
        return {
            textBlocks,
            confidence: overallConfidence,
            statistics,
            originalSize: detectionResult.originalSize,
            processingSteps: ['detection', 'recognition']
        };
    }

    /**
     * 全体信頼度の計算
     * @private
     */
    _calculateOverallConfidence(detectionConfidence, textBlocks) {
        if (textBlocks.length === 0) {
            return detectionConfidence * 0.5; // 検出はできたが認識できなかった場合
        }
        
        // 認識結果の平均信頼度
        const recognitionConfidence = textBlocks.reduce((sum, block) => sum + block.confidence, 0) / textBlocks.length;
        
        // 検出と認識の信頼度を組み合わせ（重み付き平均）
        const combinedConfidence = (detectionConfidence * 0.3 + recognitionConfidence * 0.7);
        
        return Math.min(1, Math.max(0, combinedConfidence));
    }

    /**
     * 指定領域の再OCR処理
     * @param {ImageData} imageData - 元画像データ
     * @param {BoundingBox} region - 処理領域
     * @param {Object} options - オプション設定
     * @returns {Promise<OCRResult>}
     */
    async processRegion(imageData, region, options = {}) {
        if (!this.initialized) {
            throw new Error('OCRエンジンが初期化されていません');
        }
        
        try {
            if (this.usingFallback) {
                // フォールバック使用時は領域を切り出してTesseract.jsで処理
                return await this._processRegionWithFallback(imageData, region, options);
            } else {
                // ONNX使用時は認識モデルで直接処理
                return await this._processRegionWithONNX(imageData, region, options);
            }
        } catch (error) {
            console.error('領域OCR処理エラー:', error);
            
            // ONNX処理でエラーが発生した場合、フォールバックを試行
            if (!this.usingFallback && this.config.fallbackToTesseract) {
                console.log('ONNXエラーのため領域処理でフォールバックを試行します');
                
                try {
                    await this.switchToFallback(error.message);
                    return await this._processRegionWithFallback(imageData, region, options);
                } catch (fallbackError) {
                    console.error('フォールバック領域処理も失敗:', fallbackError);
                    throw fallbackError;
                }
            }
            
            throw error;
        }
    }

    /**
     * ONNX使用時の領域処理
     * @private
     */
    async _processRegionWithONNX(imageData, region, options = {}) {
        try {
            // 必要なモデルの遅延ロード
            await this.loadModelIfNeeded('recognition');
            
            if (options.progressCallback) {
                options.progressCallback('領域を切り出し中...', 20);
            }
            
            // 領域を仮想的なテキスト領域として作成
            const textRegion = {
                boundingBox: region,
                confidence: 1.0, // 手動選択なので高信頼度
                fontSize: this._estimateFontSizeFromBbox(region),
                source: 'manual-selection'
            };
            
            if (options.progressCallback) {
                options.progressCallback('テキスト認識中...', 60);
            }
            
            // 認識処理を実行
            const recognitionResult = await this._recognizeTextRegion(imageData, textRegion, options);
            
            if (options.progressCallback) {
                options.progressCallback('処理完了', 100);
            }
            
            // 結果を標準形式で返す
            return {
                textBlocks: [recognitionResult],
                confidence: recognitionResult.confidence,
                statistics: {
                    totalRegions: 1,
                    recognizedRegions: recognitionResult.text ? 1 : 0,
                    averageConfidence: recognitionResult.confidence,
                    recognitionRate: recognitionResult.text ? 1 : 0
                },
                originalSize: { width: imageData.width, height: imageData.height },
                processingSteps: ['manual-region', 'recognition'],
                processingTime: Date.now(),
                engine: 'onnx',
                backend: this.currentBackend
            };
            
        } catch (error) {
            console.error('ONNX領域処理エラー:', error);
            throw error;
        }
    }

    /**
     * フォールバック使用時の領域処理
     * @private
     */
    async _processRegionWithFallback(imageData, region, options = {}) {
        if (!this.fallbackEngine) {
            throw new Error('フォールバックエンジンが初期化されていません');
        }
        
        try {
            if (options.progressCallback) {
                options.progressCallback('領域を切り出し中...', 20);
            }
            
            // 領域を切り出し
            const croppedImageData = this._cropImageRegion(imageData, region);
            
            if (options.progressCallback) {
                options.progressCallback('Tesseract.jsで認識中...', 50);
            }
            
            // Tesseract.jsで処理
            const result = await this.fallbackEngine.recognize(croppedImageData, {
                logger: options.progressCallback ? (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = 50 + (m.progress * 40);
                        options.progressCallback(`認識中... ${Math.round(m.progress * 100)}%`, progress);
                    }
                } : null
            });
            
            if (options.progressCallback) {
                options.progressCallback('処理完了', 100);
            }
            
            // 結果を標準形式に変換
            const textBlock = {
                text: result.data.text.trim(),
                confidence: result.data.confidence / 100,
                boundingBox: region,
                fontSize: this._estimateFontSizeFromBbox(region),
                source: 'tesseract-region'
            };
            
            return {
                textBlocks: textBlock.text ? [textBlock] : [],
                confidence: textBlock.confidence,
                statistics: {
                    totalRegions: 1,
                    recognizedRegions: textBlock.text ? 1 : 0,
                    averageConfidence: textBlock.confidence,
                    recognitionRate: textBlock.text ? 1 : 0
                },
                originalSize: { width: imageData.width, height: imageData.height },
                processingSteps: ['manual-region', 'tesseract'],
                processingTime: Date.now(),
                engine: 'tesseract',
                fallback: true
            };
            
        } catch (error) {
            console.error('フォールバック領域処理エラー:', error);
            throw error;
        }
    }

    /**
     * 画像領域の切り出し
     * @private
     */
    _cropImageRegion(imageData, region) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 領域サイズでCanvasを作成
        canvas.width = Math.round(region.width);
        canvas.height = Math.round(region.height);
        
        // 元画像をCanvasに描画
        const sourceCanvas = document.createElement('canvas');
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCanvas.width = imageData.width;
        sourceCanvas.height = imageData.height;
        sourceCtx.putImageData(imageData, 0, 0);
        
        // 指定領域を切り出し
        ctx.drawImage(
            sourceCanvas,
            Math.round(region.x), Math.round(region.y), 
            Math.round(region.width), Math.round(region.height),
            0, 0, 
            Math.round(region.width), Math.round(region.height)
        );
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    /**
     * エンジン情報の取得
     */
    getEngineInfo() {
        return {
            initialized: this.initialized,
            currentBackend: this.currentBackend,
            usingFallback: this.usingFallback,
            modelsLoaded: this.areModelsLoaded(),
            fallbackAvailable: !!this.fallbackEngine,
            supportedBackends: this.config.backends,
            version: '1.0.0'
        };
    }

    /**
     * エンジンのクリーンアップ
     */
    async dispose() {
        try {
            // ONNXセッションのクリーンアップ
            if (this.models.detection) {
                await this.models.detection.release();
                this.models.detection = null;
            }
            if (this.models.recognition) {
                await this.models.recognition.release();
                this.models.recognition = null;
            }
            if (this.models.angleClassification) {
                await this.models.angleClassification.release();
                this.models.angleClassification = null;
            }
            
            // Tesseractワーカーのクリーンアップ
            if (this.fallbackEngine) {
                await this.fallbackEngine.terminate();
                this.fallbackEngine = null;
            }
            
            this.charset = null;
            this.initialized = false;
            this.currentBackend = null;
            this.usingFallback = false;
            
            console.log('OCRエンジンをクリーンアップしました');
            
        } catch (error) {
            console.error('OCRエンジンクリーンアップエラー:', error);
        }
    }
}

// グローバルに公開
window.OCREngine = OCREngine;