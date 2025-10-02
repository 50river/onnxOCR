/**
 * OCRエンジン初期化テスト
 * 各バックエンドの動作確認、モデルロードの成功/失敗テスト、フォールバック機能のテスト
 */

class OCREngineInitializationTests {
    constructor() {
        this.testResults = [];
        this.originalOrt = null;
        this.originalTesseract = null;
        this.originalFetch = null;
        this.testEngine = null;
    }

    /**
     * すべてのOCRエンジン初期化テストを実行
     */
    async runAllTests() {
        console.log('🧪 OCRエンジン初期化テストを開始します...');
        
        try {
            await this.setupTestEnvironment();
            await this.testBackendAvailability();
            await this.testModelLoadingSuccess();
            await this.testModelLoadingFailure();
            await this.testFallbackFunctionality();
            await this.testInitializationStates();
            await this.testErrorRecovery();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ テスト実行中にエラーが発生しました:', error);
        } finally {
            await this.cleanupTestEnvironment();
        }
    }

    /**
     * テスト環境のセットアップ
     */
    async setupTestEnvironment() {
        console.log('📋 テスト環境をセットアップ中...');
        
        try {
            // 元のグローバル変数を保存
            this.originalOrt = window.ort;
            this.originalTesseract = window.Tesseract;
            this.originalFetch = window.fetch;

            // OCREngineクラスが利用可能かチェック
            if (typeof OCREngine === 'undefined') {
                throw new Error('OCREngineクラスが読み込まれていません');
            }

            this.addTestResult('テスト環境セットアップ', true, 'OCREngineクラスが利用可能です');
            
        } catch (error) {
            this.addTestResult('テスト環境セットアップ', false, error.message);
            throw error;
        }
    }

    /**
     * バックエンド利用可能性のテスト
     */
    async testBackendAvailability() {
        console.log('📋 バックエンド利用可能性テスト...');
        
        // WebGPUサポートのテスト
        await this.testWebGPUSupport();
        
        // WebGLサポートのテスト
        await this.testWebGLSupport();
        
        // WASMサポートのテスト
        await this.testWASMSupport();
        
        // バックエンド自動選択のテスト
        await this.testBackendAutoSelection();
    }

    /**
     * WebGPUサポートのテスト
     */
    async testWebGPUSupport() {
        try {
            // WebGPU利用可能性の確認
            const hasWebGPU = !!navigator.gpu;
            
            if (hasWebGPU) {
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) {
                        this.addTestResult('WebGPU基本サポート', true, 'WebGPUアダプターが利用可能です');
                        
                        // OCREngineでのWebGPU確認をテスト
                        await this.testEngineBackendSupport('webgpu');
                    } else {
                        this.addTestResult('WebGPU基本サポート', false, 'WebGPUアダプターが取得できません');
                    }
                } catch (error) {
                    this.addTestResult('WebGPU基本サポート', false, `WebGPUアダプター取得エラー: ${error.message}`);
                }
            } else {
                this.addTestResult('WebGPU基本サポート', false, 'WebGPUがサポートされていません');
            }
            
        } catch (error) {
            this.addTestResult('WebGPUサポートテスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * WebGLサポートのテスト
     */
    async testWebGLSupport() {
        try {
            // WebGL利用可能性の確認
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (gl) {
                this.addTestResult('WebGL基本サポート', true, `WebGL${gl instanceof WebGL2RenderingContext ? '2' : ''}が利用可能です`);
                
                // OCREngineでのWebGL確認をテスト
                await this.testEngineBackendSupport('webgl');
            } else {
                this.addTestResult('WebGL基本サポート', false, 'WebGLコンテキストが取得できません');
            }
            
        } catch (error) {
            this.addTestResult('WebGLサポートテスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * WASMサポートのテスト
     */
    async testWASMSupport() {
        try {
            // WebAssembly利用可能性の確認
            const hasWASM = typeof WebAssembly !== 'undefined';
            
            if (hasWASM) {
                this.addTestResult('WASM基本サポート', true, 'WebAssemblyが利用可能です');
                
                // OCREngineでのWASM確認をテスト
                await this.testEngineBackendSupport('wasm');
            } else {
                this.addTestResult('WASM基本サポート', false, 'WebAssemblyがサポートされていません');
            }
            
        } catch (error) {
            this.addTestResult('WASMサポートテスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * エンジンでのバックエンドサポート確認
     */
    async testEngineBackendSupport(backend) {
        try {
            // モックONNX Runtime Webを設定
            this.setupMockONNXRuntime();
            
            const engine = new OCREngine({
                backends: [backend],
                fallbackToTesseract: false
            });
            
            // バックエンドサポート確認メソッドを直接テスト
            const isSupported = await engine._checkBackendSupport(backend);
            
            this.addTestResult(
                `${backend.toUpperCase()}エンジンサポート`, 
                isSupported, 
                isSupported ? `${backend}バックエンドが利用可能です` : `${backend}バックエンドが利用できません`
            );
            
        } catch (error) {
            this.addTestResult(`${backend.toUpperCase()}エンジンサポート`, false, `エラー: ${error.message}`);
        }
    }

    /**
     * バックエンド自動選択のテスト
     */
    async testBackendAutoSelection() {
        try {
            this.setupMockONNXRuntime();
            
            const engine = new OCREngine({
                backends: ['webgpu', 'webgl', 'wasm'],
                fallbackToTesseract: false
            });
            
            // 最適なバックエンドの選択をテスト
            const selectedBackend = await engine._selectBestBackend();
            
            if (selectedBackend) {
                this.addTestResult(
                    'バックエンド自動選択', 
                    true, 
                    `最適なバックエンドが選択されました: ${selectedBackend}`
                );
            } else {
                this.addTestResult(
                    'バックエンド自動選択', 
                    false, 
                    '利用可能なバックエンドが見つかりませんでした'
                );
            }
            
        } catch (error) {
            this.addTestResult('バックエンド自動選択', false, `エラー: ${error.message}`);
        }
    }

    /**
     * モデルロード成功のテスト
     */
    async testModelLoadingSuccess() {
        console.log('📋 モデルロード成功テスト...');
        
        try {
            // 成功シナリオ用のモックを設定
            this.setupMockONNXRuntime();
            this.setupMockFetchSuccess();
            
            const engine = new OCREngine({
                modelsPath: './test-models/',
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            // 初期化テスト
            await engine.initialize();
            
            const initStatus = engine.getInitializationStatus();
            this.addTestResult(
                'エンジン初期化成功', 
                initStatus.initialized && !initStatus.usingFallback, 
                `初期化状態: ${initStatus.initialized}, バックエンド: ${initStatus.currentBackend}`
            );
            
            // モデルロードテスト
            await engine.loadModels((message, progress) => {
                console.log(`モデルロード進行状況: ${message} (${progress}%)`);
            });
            
            const modelsLoaded = engine.areModelsLoaded();
            this.addTestResult(
                'モデルロード成功', 
                modelsLoaded, 
                modelsLoaded ? '全モデルが正常にロードされました' : 'モデルロードが不完全です'
            );
            
            // 個別モデルの確認
            await this.testIndividualModelLoading(engine);
            
        } catch (error) {
            this.addTestResult('モデルロード成功テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 個別モデルロードのテスト
     */
    async testIndividualModelLoading(engine) {
        const modelTypes = ['detection', 'recognition', 'angleClassification'];
        
        for (const modelType of modelTypes) {
            try {
                await engine.loadModelIfNeeded(modelType);
                this.addTestResult(
                    `${modelType}モデル個別ロード`, 
                    true, 
                    `${modelType}モデルが正常にロードされました`
                );
            } catch (error) {
                this.addTestResult(
                    `${modelType}モデル個別ロード`, 
                    false, 
                    `エラー: ${error.message}`
                );
            }
        }
    }

    /**
     * モデルロード失敗のテスト
     */
    async testModelLoadingFailure() {
        console.log('📋 モデルロード失敗テスト...');
        
        // 404エラーのテスト
        await this.testModelLoadingWith404();
        
        // ネットワークエラーのテスト
        await this.testModelLoadingWithNetworkError();
        
        // 不正なモデルファイルのテスト
        await this.testModelLoadingWithInvalidFile();
        
        // ONNX Runtime未利用時のテスト
        await this.testModelLoadingWithoutONNX();
    }

    /**
     * 404エラーでのモデルロードテスト
     */
    async testModelLoadingWith404() {
        try {
            this.setupMockONNXRuntime();
            this.setupMockFetch404();
            
            const engine = new OCREngine({
                modelsPath: './non-existent-models/',
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            await engine.initialize();
            
            try {
                await engine.loadModels();
                this.addTestResult('モデル404エラー処理', false, '404エラーが適切に処理されませんでした');
            } catch (error) {
                this.addTestResult(
                    'モデル404エラー処理', 
                    true, 
                    `404エラーが適切に処理されました: ${error.message}`
                );
            }
            
        } catch (error) {
            this.addTestResult('モデル404エラーテスト', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * ネットワークエラーでのモデルロードテスト
     */
    async testModelLoadingWithNetworkError() {
        try {
            this.setupMockONNXRuntime();
            this.setupMockFetchNetworkError();
            
            const engine = new OCREngine({
                modelsPath: './models/',
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            await engine.initialize();
            
            try {
                await engine.loadModels();
                this.addTestResult('ネットワークエラー処理', false, 'ネットワークエラーが適切に処理されませんでした');
            } catch (error) {
                this.addTestResult(
                    'ネットワークエラー処理', 
                    true, 
                    `ネットワークエラーが適切に処理されました: ${error.message}`
                );
            }
            
        } catch (error) {
            this.addTestResult('ネットワークエラーテスト', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * 不正なモデルファイルでのテスト
     */
    async testModelLoadingWithInvalidFile() {
        try {
            this.setupMockONNXRuntime(true); // 不正ファイル用のモック
            this.setupMockFetchSuccess();
            
            const engine = new OCREngine({
                modelsPath: './models/',
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            await engine.initialize();
            
            try {
                await engine.loadModels();
                this.addTestResult('不正モデルファイル処理', false, '不正ファイルエラーが適切に処理されませんでした');
            } catch (error) {
                this.addTestResult(
                    '不正モデルファイル処理', 
                    true, 
                    `不正ファイルエラーが適切に処理されました: ${error.message}`
                );
            }
            
        } catch (error) {
            this.addTestResult('不正モデルファイルテスト', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * ONNX Runtime未利用時のテスト
     */
    async testModelLoadingWithoutONNX() {
        try {
            // ONNX Runtime Webを無効化
            window.ort = undefined;
            
            const engine = new OCREngine({
                modelsPath: './models/',
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            try {
                await engine.initialize();
                this.addTestResult('ONNX未利用時処理', false, 'ONNX未利用エラーが適切に処理されませんでした');
            } catch (error) {
                this.addTestResult(
                    'ONNX未利用時処理', 
                    true, 
                    `ONNX未利用エラーが適切に処理されました: ${error.message}`
                );
            }
            
        } catch (error) {
            this.addTestResult('ONNX未利用テスト', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * フォールバック機能のテスト
     */
    async testFallbackFunctionality() {
        console.log('📋 フォールバック機能テスト...');
        
        // Tesseract.jsフォールバックのテスト
        await this.testTesseractFallback();
        
        // 自動フォールバック切り替えのテスト
        await this.testAutoFallbackSwitch();
        
        // フォールバック状態の確認テスト
        await this.testFallbackStatus();
        
        // フォールバック無効時のテスト
        await this.testFallbackDisabled();
    }

    /**
     * Tesseract.jsフォールバックのテスト
     */
    async testTesseractFallback() {
        try {
            // モックTesseract.jsを設定
            this.setupMockTesseract();
            
            const engine = new OCREngine({
                backends: ['webgpu'], // 利用できないバックエンドを指定
                fallbackToTesseract: true
            });
            
            // ONNX初期化を失敗させる
            window.ort = undefined;
            
            await engine.initialize();
            
            const initStatus = engine.getInitializationStatus();
            this.addTestResult(
                'Tesseractフォールバック初期化', 
                initStatus.initialized && initStatus.usingFallback, 
                `フォールバック状態: ${initStatus.usingFallback}, バックエンド: ${initStatus.currentBackend}`
            );
            
            // フォールバック処理のテスト
            const testImageData = this.createTestImageData();
            const result = await engine.processWithFallback(testImageData);
            
            this.addTestResult(
                'Tesseractフォールバック処理', 
                result && result.engine === 'tesseract', 
                `処理結果: エンジン=${result?.engine}, テキストブロック数=${result?.textBlocks?.length || 0}`
            );
            
        } catch (error) {
            this.addTestResult('Tesseractフォールバックテスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 自動フォールバック切り替えのテスト
     */
    async testAutoFallbackSwitch() {
        try {
            this.setupMockONNXRuntime();
            this.setupMockTesseract();
            
            const engine = new OCREngine({
                backends: ['wasm'],
                fallbackToTesseract: true
            });
            
            await engine.initialize();
            
            // 初期状態はONNX使用
            let initStatus = engine.getInitializationStatus();
            this.addTestResult(
                '初期状態確認', 
                initStatus.initialized && !initStatus.usingFallback, 
                `初期バックエンド: ${initStatus.currentBackend}`
            );
            
            // フォールバック切り替えを実行
            await engine.switchToFallback('テスト用切り替え');
            
            // フォールバック状態を確認
            initStatus = engine.getInitializationStatus();
            this.addTestResult(
                '自動フォールバック切り替え', 
                initStatus.usingFallback && initStatus.currentBackend === 'tesseract', 
                `切り替え後バックエンド: ${initStatus.currentBackend}`
            );
            
        } catch (error) {
            this.addTestResult('自動フォールバック切り替えテスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * フォールバック状態確認のテスト
     */
    async testFallbackStatus() {
        try {
            this.setupMockTesseract();
            
            const engine = new OCREngine({
                backends: ['invalid-backend'],
                fallbackToTesseract: true
            });
            
            // ONNX初期化を失敗させてフォールバックを発動
            window.ort = undefined;
            await engine.initialize();
            
            const fallbackStatus = engine.getFallbackStatus();
            
            this.addTestResult(
                'フォールバック状態取得', 
                fallbackStatus.usingFallback && fallbackStatus.fallbackAvailable, 
                `フォールバック使用: ${fallbackStatus.usingFallback}, 利用可能: ${fallbackStatus.fallbackAvailable}`
            );
            
            // 性能差情報の確認
            if (fallbackStatus.performanceDifference) {
                this.addTestResult(
                    'フォールバック性能差情報', 
                    true, 
                    `性能差情報が提供されました: ${Object.keys(fallbackStatus.performanceDifference).join(', ')}`
                );
            } else {
                this.addTestResult('フォールバック性能差情報', false, '性能差情報が提供されませんでした');
            }
            
        } catch (error) {
            this.addTestResult('フォールバック状態確認テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * フォールバック無効時のテスト
     */
    async testFallbackDisabled() {
        try {
            const engine = new OCREngine({
                backends: ['invalid-backend'],
                fallbackToTesseract: false
            });
            
            // ONNX初期化を失敗させる
            window.ort = undefined;
            
            try {
                await engine.initialize();
                this.addTestResult('フォールバック無効時処理', false, 'フォールバック無効時にエラーが発生すべきでした');
            } catch (error) {
                this.addTestResult(
                    'フォールバック無効時処理', 
                    true, 
                    `フォールバック無効時に適切にエラーが発生しました: ${error.message}`
                );
            }
            
        } catch (error) {
            this.addTestResult('フォールバック無効テスト', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * 初期化状態のテスト
     */
    async testInitializationStates() {
        console.log('📋 初期化状態テスト...');
        
        // 初期化前の状態テスト
        await this.testPreInitializationState();
        
        // 初期化中の状態テスト
        await this.testDuringInitializationState();
        
        // 初期化完了後の状態テスト
        await this.testPostInitializationState();
        
        // 初期化コールバックのテスト
        await this.testInitializationCallbacks();
    }

    /**
     * 初期化前状態のテスト
     */
    async testPreInitializationState() {
        try {
            const engine = new OCREngine();
            
            const initStatus = engine.getInitializationStatus();
            
            this.addTestResult(
                '初期化前状態', 
                !initStatus.initialized && !initStatus.usingFallback && !initStatus.currentBackend, 
                `初期化済み: ${initStatus.initialized}, フォールバック: ${initStatus.usingFallback}`
            );
            
            // モデルロード状態の確認
            const modelsLoaded = engine.areModelsLoaded();
            this.addTestResult(
                '初期化前モデル状態', 
                !modelsLoaded, 
                `モデルロード済み: ${modelsLoaded}`
            );
            
        } catch (error) {
            this.addTestResult('初期化前状態テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 初期化中状態のテスト
     */
    async testDuringInitializationState() {
        try {
            this.setupMockONNXRuntime();
            
            const engine = new OCREngine({
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            // 初期化を開始（完了を待たない）
            const initPromise = engine.initialize();
            
            // 初期化中の重複呼び出しテスト
            const initPromise2 = engine.initialize();
            
            // 同じPromiseが返されることを確認
            this.addTestResult(
                '初期化中重複呼び出し', 
                initPromise === initPromise2, 
                '初期化中の重複呼び出しが適切に処理されました'
            );
            
            // 初期化完了を待つ
            await initPromise;
            
        } catch (error) {
            this.addTestResult('初期化中状態テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 初期化完了後状態のテスト
     */
    async testPostInitializationState() {
        try {
            this.setupMockONNXRuntime();
            
            const engine = new OCREngine({
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            await engine.initialize();
            
            const initStatus = engine.getInitializationStatus();
            
            this.addTestResult(
                '初期化完了後状態', 
                initStatus.initialized && !initStatus.error, 
                `初期化済み: ${initStatus.initialized}, エラー: ${!!initStatus.error}`
            );
            
            // エンジン情報の取得テスト
            const engineInfo = engine.getEngineInfo();
            
            this.addTestResult(
                'エンジン情報取得', 
                engineInfo.initialized && engineInfo.version, 
                `バージョン: ${engineInfo.version}, バックエンド: ${engineInfo.currentBackend}`
            );
            
        } catch (error) {
            this.addTestResult('初期化完了後状態テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 初期化コールバックのテスト
     */
    async testInitializationCallbacks() {
        try {
            this.setupMockONNXRuntime();
            
            const engine = new OCREngine({
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            let callbackCalled = false;
            let callbackParams = null;
            
            // コールバックを登録
            engine.onInitialized((initialized, usingFallback, currentBackend) => {
                callbackCalled = true;
                callbackParams = { initialized, usingFallback, currentBackend };
            });
            
            await engine.initialize();
            
            this.addTestResult(
                '初期化コールバック呼び出し', 
                callbackCalled, 
                `コールバック呼び出し: ${callbackCalled}`
            );
            
            if (callbackParams) {
                this.addTestResult(
                    '初期化コールバックパラメータ', 
                    callbackParams.initialized && !callbackParams.usingFallback, 
                    `パラメータ: 初期化=${callbackParams.initialized}, フォールバック=${callbackParams.usingFallback}, バックエンド=${callbackParams.currentBackend}`
                );
            }
            
        } catch (error) {
            this.addTestResult('初期化コールバックテスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * エラー回復のテスト
     */
    async testErrorRecovery() {
        console.log('📋 エラー回復テスト...');
        
        // 初期化エラーからの回復テスト
        await this.testInitializationErrorRecovery();
        
        // モデルロードエラーからの回復テスト
        await this.testModelLoadErrorRecovery();
        
        // 部分的な失敗からの回復テスト
        await this.testPartialFailureRecovery();
    }

    /**
     * 初期化エラーからの回復テスト
     */
    async testInitializationErrorRecovery() {
        try {
            // 最初は失敗するように設定
            window.ort = undefined;
            this.setupMockTesseract();
            
            const engine = new OCREngine({
                backends: ['wasm'],
                fallbackToTesseract: true
            });
            
            await engine.initialize();
            
            // フォールバックで初期化されることを確認
            let initStatus = engine.getInitializationStatus();
            this.addTestResult(
                '初期化エラー回復', 
                initStatus.initialized && initStatus.usingFallback, 
                `回復状態: 初期化=${initStatus.initialized}, フォールバック=${initStatus.usingFallback}`
            );
            
        } catch (error) {
            this.addTestResult('初期化エラー回復テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * モデルロードエラーからの回復テスト
     */
    async testModelLoadErrorRecovery() {
        try {
            this.setupMockONNXRuntime();
            this.setupMockTesseract();
            
            const engine = new OCREngine({
                backends: ['wasm'],
                fallbackToTesseract: true
            });
            
            await engine.initialize();
            
            // モデルロードを失敗させる
            this.setupMockFetch404();
            
            try {
                await engine.loadModels();
                this.addTestResult('モデルロードエラー回復', false, 'モデルロードエラーが発生すべきでした');
            } catch (error) {
                // エラーが発生した後、フォールバックが利用可能かテスト
                const fallbackStatus = engine.getFallbackStatus();
                this.addTestResult(
                    'モデルロードエラー回復', 
                    fallbackStatus.fallbackAvailable, 
                    `フォールバック利用可能: ${fallbackStatus.fallbackAvailable}`
                );
            }
            
        } catch (error) {
            this.addTestResult('モデルロードエラー回復テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 部分的な失敗からの回復テスト
     */
    async testPartialFailureRecovery() {
        try {
            this.setupMockONNXRuntime();
            this.setupMockFetchPartialFailure();
            
            const engine = new OCREngine({
                backends: ['wasm'],
                fallbackToTesseract: false
            });
            
            await engine.initialize();
            
            // 一部のモデルのみロードを試行
            try {
                await engine.loadModelIfNeeded('detection');
                this.addTestResult('部分モデルロード成功', true, '検出モデルが正常にロードされました');
            } catch (error) {
                this.addTestResult('部分モデルロード成功', false, `検出モデルロードエラー: ${error.message}`);
            }
            
            try {
                await engine.loadModelIfNeeded('recognition');
                this.addTestResult('部分モデルロード失敗', false, '認識モデルロードが成功すべきではありませんでした');
            } catch (error) {
                this.addTestResult('部分モデルロード失敗', true, `認識モデルロードが適切に失敗しました: ${error.message}`);
            }
            
        } catch (error) {
            this.addTestResult('部分的失敗回復テスト', false, `エラー: ${error.message}`);
        }
    }

    /**
     * モックONNX Runtime Webのセットアップ
     */
    setupMockONNXRuntime(shouldFail = false) {
        window.ort = {
            env: {
                wasm: { wasmPaths: '' },
                logLevel: 'warning'
            },
            InferenceSession: {
                create: async (modelPath, options) => {
                    if (shouldFail) {
                        throw new Error('モックONNXセッション作成エラー');
                    }
                    return {
                        release: async () => {}
                    };
                }
            },
            Tensor: function(type, data, dims) {
                this.type = type;
                this.data = data;
                this.dims = dims;
            }
        };
    }

    /**
     * モックTesseract.jsのセットアップ
     */
    setupMockTesseract() {
        window.Tesseract = {
            createWorker: async (options) => {
                return {
                    loadLanguage: async (lang) => {},
                    initialize: async (lang) => {},
                    recognize: async (image, options) => {
                        return {
                            data: {
                                text: 'モックOCR結果',
                                confidence: 85,
                                words: [
                                    {
                                        text: 'テスト',
                                        confidence: 90,
                                        bbox: { x0: 10, y0: 10, x1: 50, y1: 30 }
                                    }
                                ]
                            },
                            jobId: 'mock-job-id'
                        };
                    },
                    terminate: async () => {}
                };
            }
        };
    }

    /**
     * 成功用モックFetchのセットアップ
     */
    setupMockFetchSuccess() {
        window.fetch = async (url, options) => {
            if (url.includes('.txt')) {
                return {
                    ok: true,
                    status: 200,
                    text: async () => 'あいうえお\nかきくけこ\n123456789'
                };
            } else {
                return {
                    ok: true,
                    status: 200,
                    arrayBuffer: async () => new ArrayBuffer(1024)
                };
            }
        };
    }

    /**
     * 404エラー用モックFetchのセットアップ
     */
    setupMockFetch404() {
        window.fetch = async (url, options) => {
            return {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            };
        };
    }

    /**
     * ネットワークエラー用モックFetchのセットアップ
     */
    setupMockFetchNetworkError() {
        window.fetch = async (url, options) => {
            throw new Error('ネットワークエラー: 接続できません');
        };
    }

    /**
     * 部分的失敗用モックFetchのセットアップ
     */
    setupMockFetchPartialFailure() {
        window.fetch = async (url, options) => {
            if (url.includes('text_det.onnx')) {
                return {
                    ok: true,
                    status: 200,
                    arrayBuffer: async () => new ArrayBuffer(1024)
                };
            } else {
                return {
                    ok: false,
                    status: 404,
                    statusText: 'Not Found'
                };
            }
        };
    }

    /**
     * テスト用画像データの作成
     */
    createTestImageData() {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText('テスト', 10, 30);
        return ctx.getImageData(0, 0, 100, 50);
    }

    /**
     * テスト環境のクリーンアップ
     */
    async cleanupTestEnvironment() {
        try {
            // グローバル変数を復元
            window.ort = this.originalOrt;
            window.Tesseract = this.originalTesseract;
            window.fetch = this.originalFetch;
            
            // テストエンジンのクリーンアップ
            if (this.testEngine) {
                await this.testEngine.dispose();
                this.testEngine = null;
            }
            
            console.log('テスト環境をクリーンアップしました');
            
        } catch (error) {
            console.error('テスト環境クリーンアップエラー:', error);
        }
    }

    /**
     * テスト結果の追加
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        });

        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    /**
     * テスト結果の表示
     */
    displayResults() {
        const passedTests = this.testResults.filter(result => result.passed).length;
        const totalTests = this.testResults.length;
        
        console.log('\n📊 OCRエンジン初期化テスト結果サマリー');
        console.log(`合格: ${passedTests}/${totalTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (passedTests === totalTests) {
            console.log('🎉 すべてのOCRエンジン初期化テストに合格しました！');
        } else {
            console.log('⚠️  一部のテストが失敗しました。詳細を確認してください。');
        }

        // 詳細結果をテーブル形式で表示
        console.table(this.testResults.map(result => ({
            テスト名: result.name,
            結果: result.passed ? '合格' : '不合格',
            メッセージ: result.message
        })));

        // DOM要素があれば結果を表示
        this.displayResultsInDOM();
    }

    /**
     * DOM内にテスト結果を表示
     */
    displayResultsInDOM() {
        const existingResults = document.getElementById('ocr-engine-test-results');
        if (existingResults) {
            existingResults.remove();
        }

        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'ocr-engine-test-results';
        resultsContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            background: white;
            border: 2px solid #7c3aed;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
        `;

        const passedTests = this.testResults.filter(result => result.passed).length;
        const totalTests = this.testResults.length;

        resultsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; color: #7c3aed;">OCRエンジン初期化テスト結果</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <div style="margin-bottom: 12px; padding: 8px; background: ${passedTests === totalTests ? '#dcfce7' : '#fef3c7'}; border-radius: 4px;">
                <strong>${passedTests}/${totalTests} 合格 (${((passedTests / totalTests) * 100).toFixed(1)}%)</strong>
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${this.testResults.map(result => `
                    <div style="margin-bottom: 8px; padding: 6px; background: ${result.passed ? '#f3f4f6' : '#fef2f2'}; border-radius: 4px; border-left: 3px solid ${result.passed ? '#7c3aed' : '#dc2626'};">
                        <div style="font-weight: bold; color: ${result.passed ? '#7c3aed' : '#dc2626'};">
                            ${result.passed ? '✅' : '❌'} ${result.name}
                        </div>
                        <div style="color: #6b7280; margin-top: 2px;">
                            ${result.message}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(resultsContainer);
    }
}

// グローバルに公開してコンソールから実行可能にする
window.OCREngineInitializationTests = OCREngineInitializationTests;

// 自動実行（オプション）
if (window.location.search.includes('run-ocr-tests')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const tests = new OCREngineInitializationTests();
        await tests.runAllTests();
    });
}

console.log('OCRエンジン初期化テストが読み込まれました。window.OCREngineInitializationTests でアクセスできます。');
console.log('テストを実行するには: new OCREngineInitializationTests().runAllTests()');