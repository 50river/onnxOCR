/**
 * OCR Web Worker - メインスレッドをブロックしないOCR処理
 */

// Worker内でのOCRエンジンインスタンス
let ocrEngine = null;
let isInitialized = false;

/**
 * メインスレッドからのメッセージ処理
 */
self.onmessage = async function(e) {
    const { type, data, id } = e.data;
    
    try {
        switch (type) {
            case 'INIT':
                await handleInit(data, id);
                break;
                
            case 'LOAD_MODELS':
                await handleLoadModels(data, id);
                break;
                
            case 'PROCESS_IMAGE':
                await handleProcessImage(data, id);
                break;
                
            case 'PROCESS_REGION':
                await handleProcessRegion(data, id);
                break;
                
            case 'GET_STATUS':
                handleGetStatus(id);
                break;
                
            case 'DISPOSE':
                await handleDispose(id);
                break;
                
            default:
                sendError(id, `未知のメッセージタイプ: ${type}`);
        }
    } catch (error) {
        console.error('Worker処理エラー:', error);
        sendError(id, error.message);
    }
};

/**
 * OCRエンジンの初期化
 */
async function handleInit(config, id) {
    try {
        sendProgress(id, 'OCRエンジンを初期化中...', 10);
        
        // 必要なライブラリの動的インポート
        await loadRequiredLibraries();
        
        sendProgress(id, 'エンジン設定中...', 30);
        
        // OCRエンジンのインスタンス作成
        ocrEngine = new OCREngine(config);
        
        sendProgress(id, 'バックエンドを初期化中...', 50);
        
        // エンジンの初期化
        await ocrEngine.initialize();
        
        isInitialized = true;
        
        sendProgress(id, '初期化完了', 100);
        sendSuccess(id, {
            initialized: true,
            backend: ocrEngine.currentBackend,
            usingFallback: ocrEngine.usingFallback
        });
        
    } catch (error) {
        console.error('初期化エラー:', error);
        sendError(id, `初期化に失敗しました: ${error.message}`);
    }
}

/**
 * 必要なライブラリの読み込み
 */
async function loadRequiredLibraries() {
    try {
        // ONNX Runtime Webの読み込み
        if (typeof ort === 'undefined') {
            importScripts('./libs/ort.min.js');
        }
        
        // OCRエンジンクラスの読み込み
        if (typeof OCREngine === 'undefined') {
            importScripts('./js/ocr-engine.js');
        }
        
        // Tesseract.js（フォールバック用）
        if (typeof Tesseract === 'undefined') {
            try {
                importScripts('./libs/tesseract.min.js');
            } catch (error) {
                console.warn('Tesseract.js読み込み失敗:', error);
            }
        }
        
    } catch (error) {
        console.error('ライブラリ読み込みエラー:', error);
        throw error;
    }
}

/**
 * モデルファイルの読み込み
 */
async function handleLoadModels(options, id) {
    if (!isInitialized) {
        sendError(id, 'OCRエンジンが初期化されていません');
        return;
    }
    
    try {
        await ocrEngine.loadModels((message, progress) => {
            sendProgress(id, message, progress);
        });
        
        sendSuccess(id, {
            modelsLoaded: true,
            usingFallback: ocrEngine.usingFallback
        });
        
    } catch (error) {
        console.error('モデル読み込みエラー:', error);
        sendError(id, `モデル読み込みに失敗しました: ${error.message}`);
    }
}

/**
 * 画像のOCR処理
 */
async function handleProcessImage(data, id) {
    if (!isInitialized) {
        sendError(id, 'OCRエンジンが初期化されていません');
        return;
    }
    
    try {
        const { imageData, options = {} } = data;
        
        // 進行状況コールバックを設定
        const progressCallback = (message, progress) => {
            sendProgress(id, message, progress);
        };
        
        // OCR処理の実行
        const result = await ocrEngine.processImage(imageData, {
            ...options,
            progressCallback
        });
        
        sendSuccess(id, result);
        
    } catch (error) {
        console.error('OCR処理エラー:', error);
        sendError(id, `OCR処理に失敗しました: ${error.message}`);
    }
}

/**
 * 指定領域のOCR処理
 */
async function handleProcessRegion(data, id) {
    if (!isInitialized) {
        sendError(id, 'OCRエンジンが初期化されていません');
        return;
    }
    
    try {
        const { imageData, region, options = {} } = data;
        
        // 進行状況コールバックを設定
        const progressCallback = (message, progress) => {
            sendProgress(id, message, progress);
        };
        
        // 領域OCR処理の実行
        const result = await ocrEngine.processRegion(imageData, region, {
            ...options,
            progressCallback
        });
        
        sendSuccess(id, result);
        
    } catch (error) {
        console.error('領域OCR処理エラー:', error);
        sendError(id, `領域OCR処理に失敗しました: ${error.message}`);
    }
}

/**
 * エンジン状態の取得
 */
function handleGetStatus(id) {
    const status = {
        initialized: isInitialized,
        engineInfo: ocrEngine ? ocrEngine.getEngineInfo() : null
    };
    
    sendSuccess(id, status);
}

/**
 * リソースのクリーンアップ
 */
async function handleDispose(id) {
    try {
        if (ocrEngine) {
            await ocrEngine.dispose();
            ocrEngine = null;
        }
        
        isInitialized = false;
        
        sendSuccess(id, { disposed: true });
        
    } catch (error) {
        console.error('クリーンアップエラー:', error);
        sendError(id, `クリーンアップに失敗しました: ${error.message}`);
    }
}

/**
 * 成功レスポンスの送信
 */
function sendSuccess(id, data) {
    self.postMessage({
        type: 'SUCCESS',
        id,
        data
    });
}

/**
 * エラーレスポンスの送信
 */
function sendError(id, message) {
    self.postMessage({
        type: 'ERROR',
        id,
        error: message
    });
}

/**
 * 進行状況の送信
 */
function sendProgress(id, message, progress) {
    self.postMessage({
        type: 'PROGRESS',
        id,
        data: {
            message,
            progress
        }
    });
}

/**
 * ログメッセージの送信
 */
function sendLog(level, message) {
    self.postMessage({
        type: 'LOG',
        data: {
            level,
            message,
            timestamp: Date.now()
        }
    });
}

// エラーハンドリング
self.onerror = function(error) {
    console.error('Worker内エラー:', error);
    self.postMessage({
        type: 'WORKER_ERROR',
        error: error.message
    });
};

// 未処理のPromise拒否をキャッチ
self.addEventListener('unhandledrejection', function(event) {
    console.error('Worker内未処理Promise拒否:', event.reason);
    self.postMessage({
        type: 'WORKER_ERROR',
        error: event.reason.toString()
    });
});

console.log('OCR Worker初期化完了');