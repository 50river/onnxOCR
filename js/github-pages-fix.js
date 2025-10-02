/**
 * GitHub Pages 対応修正スクリプト
 * ONNXモデルが利用できない場合のフォールバック処理
 */

// GitHub Pages環境の検出
const isGitHubPages = window.location.hostname.includes('github.io') || 
                     window.location.hostname.includes('github.com');

// フォールバックモードの強制有効化
if (isGitHubPages) {
    window.FORCE_TESSERACT_FALLBACK = true;
    window.GITHUB_PAGES_MODE = true;
    console.log('GitHub Pages環境を検出: Tesseract.jsフォールバックモードを有効化');
    
    // デバッグ情報の出力
    console.log('GitHub Pages環境情報:', {
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        protocol: window.location.protocol,
        forceFallback: window.FORCE_TESSERACT_FALLBACK
    });
}

// アプリ初期化の改善
document.addEventListener('DOMContentLoaded', function() {
    // 既存のアプリが初期化される前に設定を適用
    if (window.FORCE_TESSERACT_FALLBACK) {
        // ユーザーに軽量版であることを通知
        showLightweightModeNotice();
        
        // OCRエンジンの初期化をオーバーライド
        overrideOCRInitialization();
    }
});

/**
 * 軽量版モードの通知表示
 */
function showLightweightModeNotice() {
    const notice = document.createElement('div');
    notice.id = 'lightweight-notice';
    notice.style.cssText = `
        background: #e3f2fd;
        border: 1px solid #2196f3;
        border-radius: 8px;
        padding: 12px;
        margin: 10px;
        color: #1565c0;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    notice.innerHTML = `
        <strong>📱 軽量版モード</strong><br>
        現在、Tesseract.jsエンジンを使用した軽量版として動作しています。<br>
        基本的なOCR機能をご利用いただけます。処理には少し時間がかかる場合があります。
    `;
    
    // ヘッダーの後に挿入
    const header = document.querySelector('.app-header');
    if (header && header.nextSibling) {
        header.parentNode.insertBefore(notice, header.nextSibling);
    }
}

/**
 * OCRエンジン初期化のオーバーライド
 */
function overrideOCRInitialization() {
    // OCR Worker Manager の初期化をオーバーライド
    const originalOCRWorkerManager = window.OCRWorkerManager;
    
    if (originalOCRWorkerManager && window.FORCE_TESSERACT_FALLBACK) {
        window.OCRWorkerManager = class extends originalOCRWorkerManager {
            async initialize(ocrConfig = {}) {
                console.log('GitHub Pages: OCR Worker Manager初期化をオーバーライド');
                
                // フォールバックモードを強制
                const forcedConfig = {
                    ...ocrConfig,
                    fallbackToTesseract: true,
                    forceTestseractOnly: true
                };
                
                try {
                    // 親クラスの初期化を試行するが、エラーを無視してフォールバックに切り替え
                    await super.initialize(forcedConfig);
                } catch (error) {
                    console.log('ONNX初期化失敗（予期された動作）、Tesseract.jsフォールバックを使用');
                    
                    // フォールバック状態を設定
                    this.workerStatus = {
                        initialized: true,
                        backend: 'tesseract',
                        usingFallback: true,
                        modelsLoaded: true
                    };
                    
                    this.isInitialized = true;
                    this._emit('initialized', this.workerStatus);
                }
                
                return this.workerStatus;
            }
            
            async processImage(imageData, options = {}) {
                console.log('GitHub Pages: 画像処理をTesseract.jsで実行');
                
                try {
                    // Tesseract.jsで直接処理
                    if (!this.tesseractWorker) {
                        this.tesseractWorker = await Tesseract.createWorker({
                            logger: m => {
                                if (m.status === 'recognizing text' && options.progressCallback) {
                                    const progress = Math.round(m.progress * 100);
                                    options.progressCallback(`OCR処理中... ${progress}%`, progress);
                                }
                            }
                        });
                        
                        await this.tesseractWorker.loadLanguage('jpn+eng');
                        await this.tesseractWorker.initialize('jpn+eng');
                    }
                    
                    const result = await this.tesseractWorker.recognize(imageData);
                    return this.convertTesseractResult(result);
                    
                } catch (error) {
                    console.error('Tesseract.js処理エラー:', error);
                    throw error;
                }
            }
            
            convertTesseractResult(tesseractResult) {
                const { data } = tesseractResult;
                const textBlocks = [];
                
                if (data.words) {
                    data.words.forEach(word => {
                        if (word.confidence > 30) {
                            textBlocks.push({
                                text: word.text,
                                confidence: word.confidence / 100,
                                boundingBox: {
                                    x: word.bbox.x0,
                                    y: word.bbox.y0,
                                    width: word.bbox.x1 - word.bbox.x0,
                                    height: word.bbox.y1 - word.bbox.y0
                                },
                                fontSize: Math.max(8, Math.min(72, (word.bbox.y1 - word.bbox.y0) * 0.8)),
                                source: 'tesseract'
                            });
                        }
                    });
                }
                
                return {
                    textBlocks,
                    confidence: data.confidence / 100,
                    processingTime: Date.now(),
                    engine: 'tesseract',
                    fallback: true
                };
            }
        };
        
        console.log('OCR Worker Manager をGitHub Pages対応版に置き換えました');
    }
}

// エラーハンドリングの改善
window.addEventListener('error', function(event) {
    if (event.message.includes('ort') || event.message.includes('ONNX')) {
        console.warn('ONNX関連エラーを検出しましたが、フォールバックモードで継続します:', event.message);
        event.preventDefault(); // エラーの伝播を停止
    }
});

window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && (event.reason.toString().includes('ort') || event.reason.toString().includes('ONNX'))) {
        console.warn('ONNX関連Promise拒否を検出しましたが、フォールバックモードで継続します:', event.reason);
        event.preventDefault(); // エラーの伝播を停止
    }
});

console.log('GitHub Pages修正スクリプトが読み込まれました');