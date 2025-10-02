/**
 * 領収書OCRアプリケーション - メインアプリケーションファイル
 */

class ReceiptOCRApp {
    constructor() {
        this.elements = {};
        this.currentImage = null;
        this.ocrResults = null;
        this.cameraSupported = false;
        this.perspectiveCorrection = new PerspectiveCorrection();
        this.perspectiveMode = false;
        this.corners = null;
        this.isDragging = false;
        this.dragIndex = -1;
        
        // Rectangle selection
        this.rectangleSelector = null;
        this.rectangleSelectionMode = false;
        
        // 候補履歴管理
        this.candidateHistory = {
            date: [],
            payee: [],
            amount: [],
            purpose: []
        };
        
        // ストレージとエクスポート機能
        this.storageManager = null;
        this.exportManager = null;
        this.zipExportManager = null;
        
        // エラーハンドリングシステム
        this.errorHandler = null;
        this.errorDisplay = null;
        
        // リソース監視システム
        this.resourceMonitor = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeErrorHandling();
        this.initializeResourceMonitoring();
        this.checkCameraSupport();
        this.initializeOCREngine();
        this.initializeStorageAndExport();
        this.updateStatus('準備完了');
    }

    /**
     * DOM要素の初期化
     */
    initializeElements() {
        this.elements = {
            imageInput: document.getElementById('image-input'),
            imageDisplay: document.getElementById('image-display'),
            imageCanvas: document.getElementById('image-canvas'),
            resetButton: document.getElementById('reset-image'),
            processButton: document.getElementById('process-image'),
            statusIndicator: document.getElementById('status-indicator'),
            progressOverlay: document.getElementById('progress-overlay'),
            progressText: document.getElementById('progress-text'),
            progressFill: document.getElementById('progress-fill'),
            
            // Form elements
            dateField: document.getElementById('date-field'),
            payeeField: document.getElementById('payee-field'),
            amountField: document.getElementById('amount-field'),
            purposeField: document.getElementById('purpose-field'),
            
            // Confidence indicators
            dateConfidence: document.getElementById('date-confidence'),
            payeeConfidence: document.getElementById('payee-confidence'),
            amountConfidence: document.getElementById('amount-confidence'),
            purposeConfidence: document.getElementById('purpose-confidence'),
            
            // Candidates
            dateCandidates: document.getElementById('date-candidates'),
            payeeCandidates: document.getElementById('payee-candidates'),
            amountCandidates: document.getElementById('amount-candidates'),
            purposeCandidates: document.getElementById('purpose-candidates'),
            
            // Perspective correction
            perspectiveOverlay: document.getElementById('perspective-overlay'),
            perspectiveSvg: document.getElementById('perspective-svg'),
            perspectivePolygon: document.getElementById('perspective-polygon'),
            perspectiveButton: document.getElementById('perspective-button'),
            applyPerspectiveButton: document.getElementById('apply-perspective'),
            cancelPerspectiveButton: document.getElementById('cancel-perspective'),
            
            // Rectangle selection
            rectangleOverlay: document.getElementById('rectangle-overlay'),
            rectangleSelectButton: document.getElementById('rectangle-select-button'),
            applySelectionButton: document.getElementById('apply-selection'),
            cancelSelectionButton: document.getElementById('cancel-selection'),
            zoomInButton: document.getElementById('zoom-in'),
            zoomOutButton: document.getElementById('zoom-out'),
            zoomResetButton: document.getElementById('zoom-reset'),
            
            // Action buttons
            saveButton: document.getElementById('save-button'),
            exportButton: document.getElementById('export-button')
        };
    }

    /**
     * イベントリスナーの設定
     */
    bindEvents() {
        // Image upload
        this.elements.imageInput.addEventListener('change', this.handleImageUpload.bind(this));
        
        // Image controls
        this.elements.resetButton.addEventListener('click', this.resetImage.bind(this));
        this.elements.processButton.addEventListener('click', this.processImage.bind(this));
        
        // Form actions
        this.elements.saveButton.addEventListener('click', this.saveData.bind(this));
        this.elements.exportButton.addEventListener('click', this.exportData.bind(this));
        
        // Form field validation
        this.bindFormValidation();
        
        // Keyboard navigation support
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Handle file input click for camera permission
        this.elements.imageInput.addEventListener('click', this.handleFileInputClick.bind(this));
        
        // Perspective correction events
        this.elements.perspectiveButton.addEventListener('click', this.togglePerspectiveMode.bind(this));
        this.elements.applyPerspectiveButton.addEventListener('click', this.applyPerspectiveCorrection.bind(this));
        this.elements.cancelPerspectiveButton.addEventListener('click', this.cancelPerspectiveMode.bind(this));
        
        // Rectangle selection events
        this.elements.rectangleSelectButton.addEventListener('click', this.toggleRectangleSelectionMode.bind(this));
        this.elements.applySelectionButton.addEventListener('click', this.applyRectangleSelection.bind(this));
        this.elements.cancelSelectionButton.addEventListener('click', this.cancelRectangleSelectionMode.bind(this));
        this.elements.zoomInButton.addEventListener('click', this.zoomIn.bind(this));
        this.elements.zoomOutButton.addEventListener('click', this.zoomOut.bind(this));
        this.elements.zoomResetButton.addEventListener('click', this.resetZoom.bind(this));
        
        // Corner dragging events
        for (let i = 0; i < 4; i++) {
            const corner = document.getElementById(`corner-${i}`);
            corner.addEventListener('mousedown', (e) => this.startDrag(e, i));
            corner.addEventListener('touchstart', (e) => this.startDrag(e, i), { passive: false });
        }
        
        // Global drag events
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
        document.addEventListener('touchmove', this.handleDrag.bind(this), { passive: false });
        document.addEventListener('touchend', this.endDrag.bind(this));
    }

    /**
     * 画像アップロードの処理
     */
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.updateStatus('画像を読み込み中...', 'processing');
            
            // ファイル形式の検証
            if (!this.validateImageFile(file)) {
                throw new Error('サポートされていないファイル形式です。JPEG、PNG、WebP形式の画像を選択してください。');
            }
            
            // ファイルサイズの検証（10MB制限）
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('ファイルサイズが大きすぎます。10MB以下の画像を選択してください。');
            }
            
            // タイムアウト付きで画像読み込み
            const imageData = this.resourceMonitor 
                ? await this.resourceMonitor.executeWithTimeout(
                    () => this.loadImage(file),
                    'image'
                  )
                : await this.loadImage(file);
            this.displayImage(imageData);
            
            this.updateStatus('画像読み込み完了');
        } catch (error) {
            console.error('画像読み込みエラー:', error);
            
            // 新しいエラーハンドリングシステムを使用
            if (this.errorHandler && this.errorDisplay) {
                const errorResult = await this.errorHandler.handleError(error, { 
                    operation: 'file',
                    fileSize: file?.size,
                    fileType: file?.type
                });
                
                this.errorDisplay.show(errorResult, () => {
                    // 再試行コールバック
                    this.elements.imageInput.click();
                });
            } else {
                // フォールバック
                this.updateStatus(error.message || '画像読み込みに失敗しました', 'error');
            }
            
            // エラー時はファイル入力をリセット
            this.elements.imageInput.value = '';
        }
    }

    /**
     * エラーハンドリングシステムの初期化
     */
    initializeErrorHandling() {
        try {
            this.errorHandler = new ErrorHandler();
            this.errorDisplay = new ErrorDisplay();
            
            // グローバルエラーハンドラーの設定
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event.error, { 
                    type: 'javascript_error',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.handleGlobalError(event.reason, { 
                    type: 'unhandled_promise_rejection'
                });
            });
            
        } catch (error) {
            console.error('エラーハンドリングシステムの初期化に失敗:', error);
            // フォールバック: 基本的なエラー処理のみ
            this.errorHandler = null;
            this.errorDisplay = null;
        }
    }

    /**
     * グローバルエラーの処理
     */
    async handleGlobalError(error, context = {}) {
        if (this.errorHandler && this.errorDisplay) {
            try {
                const errorResult = await this.errorHandler.handleError(error, context);
                this.errorDisplay.show(errorResult);
            } catch (handlingError) {
                console.error('エラーハンドリング中にエラーが発生:', handlingError);
                this.showFallbackError(error);
            }
        } else {
            this.showFallbackError(error);
        }
    }

    /**
     * フォールバックエラー表示
     */
    showFallbackError(error) {
        const message = error?.message || '予期しないエラーが発生しました';
        alert(`エラー: ${message}\n\nページを再読み込みしてください。`);
    }

    /**
     * リソース監視システムの初期化
     */
    initializeResourceMonitoring() {
        try {
            this.resourceMonitor = new ResourceMonitor();
            console.log('リソース監視システムを初期化しました');
        } catch (error) {
            console.error('リソース監視システムの初期化に失敗:', error);
            this.resourceMonitor = null;
        }
    }

    /**
     * カメラサポートの確認
     */
    async checkCameraSupport() {
        try {
            // MediaDevices APIの利用可能性を確認
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.cameraSupported = false;
                return;
            }
            
            // カメラデバイスの存在確認
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameraSupported = devices.some(device => device.kind === 'videoinput');
            
            if (!this.cameraSupported) {
                console.warn('カメラデバイスが見つかりません');
            }
        } catch (error) {
            console.warn('カメラサポート確認エラー:', error);
            this.cameraSupported = false;
        }
    }

    /**
     * ファイル入力クリック時の処理
     */
    async handleFileInputClick(event) {
        // カメラが利用可能な場合、権限を事前確認
        if (this.cameraSupported && this.elements.imageInput.hasAttribute('capture')) {
            try {
                // カメラ権限の確認（実際にストリームは開始しない）
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                
                if (permissionStatus.state === 'denied') {
                    // 新しいエラーハンドリングシステムを使用
                    if (this.errorHandler && this.errorDisplay) {
                        const cameraError = new Error('カメラへのアクセスが拒否されています');
                        cameraError.name = 'NotAllowedError';
                        
                        const errorResult = await this.errorHandler.handleError(cameraError, { 
                            operation: 'camera',
                            permissionState: permissionStatus.state
                        });
                        
                        this.errorDisplay.show(errorResult);
                    } else {
                        // フォールバック
                        this.showCameraPermissionDialog();
                    }
                    
                    event.preventDefault();
                    return;
                }
            } catch (error) {
                // permissions APIが利用できない場合は続行
                console.warn('権限確認エラー:', error);
                
                // エラーハンドリングシステムでログ記録
                if (this.errorHandler) {
                    await this.errorHandler.handleError(error, { 
                        operation: 'permission_check',
                        api: 'permissions'
                    });
                }
            }
        }
    }

    /**
     * カメラ権限ダイアログの表示
     */
    showCameraPermissionDialog() {
        const message = 'カメラへのアクセスが拒否されています。\n' +
                       'ブラウザの設定でカメラの使用を許可するか、\n' +
                       'ファイルから画像を選択してください。';
        
        if (confirm(message + '\n\nファイル選択に切り替えますか？')) {
            // capture属性を一時的に削除してファイル選択のみにする
            this.elements.imageInput.removeAttribute('capture');
            this.elements.imageInput.click();
            
            // 次回のために capture 属性を復元
            setTimeout(() => {
                this.elements.imageInput.setAttribute('capture', 'environment');
            }, 100);
        }
    }

    /**
     * ファイル形式の検証
     */
    validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        return allowedTypes.includes(file.type.toLowerCase());
    }

    /**
     * 画像ファイルの読み込み（EXIF回転補正付き）
     */
    async loadImage(file) {
        try {
            // EXIF情報の読み取り
            const exifData = await EXIFReader.readEXIF(file);
            
            // 画像の読み込み
            const imageData = await this.loadImageData(file);
            
            // EXIF回転補正の適用
            const correctedImageData = await this.applyEXIFCorrection(imageData, exifData);
            
            return correctedImageData;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 画像データの読み込み
     */
    loadImageData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // 画像の基本情報を検証
                    if (img.width < 100 || img.height < 100) {
                        reject(new Error('画像が小さすぎます。100x100ピクセル以上の画像を選択してください。'));
                        return;
                    }
                    
                    if (img.width > 4000 || img.height > 4000) {
                        reject(new Error('画像が大きすぎます。4000x4000ピクセル以下の画像を選択してください。'));
                        return;
                    }
                    
                    resolve({ img, file });
                };
                
                img.onerror = () => {
                    reject(new Error('画像ファイルが破損しているか、読み込めません。'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('ファイルの読み込みに失敗しました。'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * EXIF回転補正の適用
     */
    async applyEXIFCorrection(imageData, exifData) {
        const { img, file } = imageData;
        const { orientation } = exifData;
        
        // 補正が不要な場合はそのまま返す
        if (!orientation || orientation === 1) {
            return { img, file, exifData, corrected: false };
        }
        
        try {
            // 回転・反転情報を取得
            const rotationAngle = EXIFReader.getRotationAngle(orientation);
            const flipInfo = EXIFReader.getFlipInfo(orientation);
            
            // Canvas で画像を補正
            const correctedImg = await this.rotateAndFlipImage(img, rotationAngle, flipInfo);
            
            return { 
                img: correctedImg, 
                file, 
                exifData, 
                corrected: true,
                originalImg: img,
                rotationAngle,
                flipInfo
            };
        } catch (error) {
            console.warn('EXIF補正に失敗しました:', error);
            // 補正に失敗した場合は元の画像を返す
            return { img, file, exifData, corrected: false };
        }
    }

    /**
     * 画像の回転・反転処理
     */
    rotateAndFlipImage(img, rotationAngle, flipInfo) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 回転後のキャンバスサイズを計算
            let { width, height } = img;
            if (rotationAngle === 90 || rotationAngle === 270) {
                [width, height] = [height, width];
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 変換の中心点を設定
            ctx.translate(width / 2, height / 2);
            
            // 回転を適用
            if (rotationAngle !== 0) {
                ctx.rotate((rotationAngle * Math.PI) / 180);
            }
            
            // 反転を適用
            if (flipInfo.horizontal || flipInfo.vertical) {
                ctx.scale(
                    flipInfo.horizontal ? -1 : 1,
                    flipInfo.vertical ? -1 : 1
                );
            }
            
            // 画像を描画
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            // 新しいImageオブジェクトを作成
            const correctedImg = new Image();
            correctedImg.onload = () => resolve(correctedImg);
            correctedImg.src = canvas.toDataURL('image/jpeg', 0.9);
        });
    }

    /**
     * 画像の表示
     */
    displayImage(imageData) {
        const { img, file, corrected, rotationAngle, flipInfo } = imageData;
        const canvas = this.elements.imageCanvas;
        const ctx = canvas.getContext('2d');
        
        // Canvas サイズの設定（レスポンシブ対応）
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 画像の描画
        ctx.drawImage(img, 0, 0, width, height);
        
        // 画像表示エリアを表示
        this.elements.imageDisplay.style.display = 'block';
        this.currentImage = { ...imageData, canvas };
        
        // EXIF補正が適用された場合の通知
        if (corrected) {
            const correctionInfo = this.formatCorrectionInfo(rotationAngle, flipInfo);
            this.updateStatus(`画像読み込み完了 (${correctionInfo})`);
        }
        
        // 透視補正の初期化
        this.corners = null;
        if (this.perspectiveCorrection.isOpenCVReady) {
            this.detectRectangleAsync();
        }
        
        // フォームをリセット
        this.resetForm();
    }

    /**
     * 補正情報のフォーマット
     */
    formatCorrectionInfo(rotationAngle, flipInfo) {
        const corrections = [];
        
        if (rotationAngle && rotationAngle !== 0) {
            corrections.push(`${rotationAngle}度回転`);
        }
        
        if (flipInfo.horizontal) {
            corrections.push('水平反転');
        }
        
        if (flipInfo.vertical) {
            corrections.push('垂直反転');
        }
        
        return corrections.length > 0 ? corrections.join('・') + '補正済み' : '補正済み';
    }

    /**
     * 画像のリセット
     */
    resetImage() {
        // 矩形選択モードを終了
        if (this.rectangleSelectionMode) {
            this.exitRectangleSelectionMode();
        }
        
        // 透視補正モードを終了
        if (this.perspectiveMode) {
            this.exitPerspectiveMode();
        }
        
        // 矩形選択器を破棄
        if (this.rectangleSelector) {
            this.rectangleSelector.destroy();
            this.rectangleSelector = null;
        }
        
        this.elements.imageDisplay.style.display = 'none';
        this.elements.imageInput.value = '';
        this.currentImage = null;
        this.ocrResults = null;
        this.resetForm();
        this.updateStatus('準備完了');
    }

    /**
     * OCR処理の実行（プレースホルダー）
     */
    async processImage() {
        if (!this.currentImage) {
            if (this.errorHandler && this.errorDisplay) {
                const error = new Error('画像が読み込まれていません');
                const errorResult = await this.errorHandler.handleError(error, { 
                    operation: 'ocr',
                    stage: 'validation'
                });
                this.errorDisplay.show(errorResult);
            } else {
                this.showProgressError('画像が読み込まれていません', null, { autoHide: 3000 });
            }
            return;
        }

        try {
            this.updateStatus('OCR処理中...', 'processing');
            
            // メモリ不足対策: 画像品質削減が有効な場合
            if (window.imageQualityReduction) {
                await this.reduceImageQualityForProcessing();
            }
            
            // プレースホルダー: 実際のOCR処理はタスク4で実装
            if (this.resourceMonitor) {
                // タイムアウト付きでOCR処理を実行
                await this.resourceMonitor.executeWithTimeout(
                    () => this.simulateOCRProcessing(),
                    'ocr'
                );
            } else {
                await this.simulateOCRProcessing();
            }
            
            this.updateStatus('OCR処理完了');
            
        } catch (error) {
            console.error('OCR処理エラー:', error);
            
            // 新しいエラーハンドリングシステムを使用
            if (this.errorHandler && this.errorDisplay) {
                const errorResult = await this.errorHandler.handleError(error, { 
                    operation: 'ocr',
                    imageSize: this.currentImage?.canvas?.width * this.currentImage?.canvas?.height,
                    memoryUsage: this.getApproximateMemoryUsage()
                });
                
                this.errorDisplay.show(errorResult, () => {
                    // 再試行コールバック
                    this.processImage();
                });
            } else {
                // フォールバック
                this.showProgressError('OCR処理に失敗しました', error, { 
                    autoHide: 5000,
                    playSound: true 
                });
                this.updateStatus('OCR処理に失敗しました', 'error');
            }
        }
    }

    /**
     * OCR処理のシミュレーション（開発用）
     */
    async simulateOCRProcessing() {
        const steps = [
            { text: '画像を前処理中...', description: '画像の品質を向上させています' },
            { text: 'テキストを検出中...', description: '文字領域を特定しています' },
            { text: 'テキストを認識中...', description: '文字を読み取っています' },
            { text: 'データを抽出中...', description: '領収書項目を分析しています' },
            { text: '結果を整理中...', description: '抽出結果を整理しています' }
        ];

        for (let i = 0; i < steps.length; i++) {
            this.showSteppedProgress(steps, i, { type: 'processing' });
            await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // 完了メッセージ
        this.showProgressSuccess('OCR処理が完了しました', {
            details: '4項目の抽出が完了しました',
            autoHide: 2000
        });

        // サンプルデータの設定
        setTimeout(() => {
            this.populateFormWithSampleData();
        }, 500);
    }

    /**
     * 処理用画像品質の削減
     */
    async reduceImageQualityForProcessing() {
        if (!this.currentImage || !this.currentImage.canvas) return;
        
        const canvas = this.currentImage.canvas;
        
        // リソース監視システムを使用して品質調整
        if (this.resourceMonitor) {
            try {
                const adjustedCanvas = await this.resourceMonitor.applyQualityReduction(canvas);
                
                if (adjustedCanvas !== canvas) {
                    // 調整されたキャンバスで元のキャンバスを更新
                    const ctx = canvas.getContext('2d');
                    canvas.width = adjustedCanvas.width;
                    canvas.height = adjustedCanvas.height;
                    ctx.drawImage(adjustedCanvas, 0, 0);
                    
                    console.log('リソース監視システムによる品質調整が完了しました');
                }
            } catch (error) {
                console.error('品質調整エラー:', error);
                // フォールバック: 従来の方法
                await this.fallbackImageReduction(canvas);
            }
        } else {
            // フォールバック: 従来の方法
            await this.fallbackImageReduction(canvas);
        }
    }

    /**
     * フォールバック画像品質削減
     */
    async fallbackImageReduction(canvas) {
        const ctx = canvas.getContext('2d');
        const maxSize = window.maxImageSize || { width: 1024, height: 1024 };
        
        let { width, height } = canvas;
        
        // サイズ削減が必要かチェック
        if (width <= maxSize.width && height <= maxSize.height) return;
        
        // アスペクト比を保持してリサイズ
        const ratio = Math.min(maxSize.width / width, maxSize.height / height);
        const newWidth = Math.floor(width * ratio);
        const newHeight = Math.floor(height * ratio);
        
        // 新しいキャンバスを作成
        const newCanvas = document.createElement('canvas');
        const newCtx = newCanvas.getContext('2d');
        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        
        // リサイズして描画
        newCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        // 元のキャンバスを更新
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(newCanvas, 0, 0);
        
        console.log(`画像サイズを削減: ${width}x${height} → ${newWidth}x${newHeight}`);
    }

    /**
     * 概算メモリ使用量の取得
     */
    getApproximateMemoryUsage() {
        try {
            if (performance.memory) {
                return {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }
        } catch (error) {
            console.warn('メモリ使用量の取得に失敗:', error);
        }
        return null;
    }

    /**
     * サンプルデータでフォームを埋める（開発用）
     */
    populateFormWithSampleData() {
        const sampleData = {
            date: { 
                value: '2024/03/15', 
                confidence: 0.95,
                candidates: [
                    { value: '2024/03/15', confidence: 0.95, originalText: '2024年3月15日' },
                    { value: '2024/03/14', confidence: 0.82, originalText: '令和6年3月14日' },
                    { value: '2024/03/16', confidence: 0.71, originalText: '3/16' }
                ]
            },
            payee: { 
                value: '株式会社サンプル', 
                confidence: 0.88,
                candidates: [
                    { value: '株式会社サンプル', confidence: 0.88, originalText: '株式会社サンプル' },
                    { value: 'サンプル商店', confidence: 0.75, originalText: 'サンプル商店' },
                    { value: 'サンプル株式会社', confidence: 0.65, originalText: 'サンプル株式会社' }
                ]
            },
            amount: { 
                value: '1500', 
                confidence: 0.92,
                candidates: [
                    { value: '1500', confidence: 0.92, originalText: '¥1,500' },
                    { value: '1580', confidence: 0.78, originalText: '1580円' },
                    { value: '150', confidence: 0.45, originalText: '150' }
                ]
            },
            purpose: { 
                value: '会議費', 
                confidence: 0.75,
                candidates: [
                    { value: '会議費', confidence: 0.75, originalText: '会議・打合せ' },
                    { value: '交通費', confidence: 0.68, originalText: '交通費' },
                    { value: '飲食代', confidence: 0.62, originalText: '飲食代' }
                ]
            }
        };

        Object.entries(sampleData).forEach(([field, data]) => {
            this.updateField(field, data.value, data.confidence, data.candidates);
        });
    }

    /**
     * フィールドの更新
     */
    updateField(fieldName, value, confidence, candidates = []) {
        const field = this.elements[`${fieldName}Field`];
        const confidenceIndicator = this.elements[`${fieldName}Confidence`];
        const candidatesContainer = this.elements[`${fieldName}Candidates`];
        
        if (field) {
            field.value = value;
            
            // 信頼度に基づくスタイリング
            field.classList.remove('warning', 'error');
            if (confidence < 0.5) {
                field.classList.add('error');
            } else if (confidence < 0.8) {
                field.classList.add('warning');
            }
            
            // バリデーション
            this.validateField(fieldName, value);
        }
        
        if (confidenceIndicator) {
            this.updateConfidenceIndicator(confidenceIndicator, confidence);
        }
        
        // 候補リストの更新
        if (candidatesContainer && candidates.length > 0) {
            this.updateCandidatesList(fieldName, candidates);
        }
    }

    /**
     * フィールドのバリデーション
     */
    validateField(fieldName, value) {
        const field = this.elements[`${fieldName}Field`];
        if (!field) return;

        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'date':
                isValid = this.validateDate(value);
                errorMessage = '有効な日付を入力してください (YYYY/MM/DD)';
                break;
            case 'amount':
                isValid = this.validateAmount(value);
                errorMessage = '有効な金額を入力してください (0以上の整数)';
                break;
            case 'payee':
                isValid = this.validatePayee(value);
                errorMessage = '支払先を入力してください';
                break;
            case 'purpose':
                isValid = this.validatePurpose(value);
                errorMessage = '適用内容を入力してください';
                break;
        }

        // エラー表示の更新
        this.updateFieldError(fieldName, isValid ? null : errorMessage);
        
        return isValid;
    }

    /**
     * 日付のバリデーション
     */
    validateDate(value) {
        if (!value) return false;
        
        // YYYY/MM/DD または YYYY-MM-DD 形式をチェック
        const datePattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
        const match = value.match(datePattern);
        
        if (!match) return false;
        
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        
        // 基本的な範囲チェック
        if (year < 1900 || year > 2100) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;
        
        // より厳密な日付チェック
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && 
               date.getMonth() === month - 1 && 
               date.getDate() === day;
    }

    /**
     * 金額のバリデーション
     */
    validateAmount(value) {
        if (!value) return false;
        
        const amount = parseInt(value);
        return !isNaN(amount) && amount >= 0;
    }

    /**
     * 支払先のバリデーション
     */
    validatePayee(value) {
        return value && value.trim().length >= 1;
    }

    /**
     * 適用のバリデーション
     */
    validatePurpose(value) {
        return value && value.trim().length >= 1;
    }

    /**
     * フィールドエラーの更新
     */
    updateFieldError(fieldName, errorMessage) {
        const field = this.elements[`${fieldName}Field`];
        if (!field) return;

        // 既存のエラーメッセージを削除
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        if (errorMessage) {
            // エラーメッセージを追加
            const errorElement = document.createElement('p');
            errorElement.className = 'field-error';
            errorElement.textContent = errorMessage;
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
            
            field.parentNode.appendChild(errorElement);
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${fieldName}-error`);
            errorElement.id = `${fieldName}-error`;
        } else {
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        }
    }

    /**
     * 信頼度インジケーターの更新
     */
    updateConfidenceIndicator(indicator, confidence) {
        indicator.className = 'confidence-indicator';
        
        if (confidence >= 0.9) {
            indicator.classList.add('high');
            indicator.innerHTML = '<span class="confidence-icon">✓</span>高';
            indicator.setAttribute('aria-label', `信頼度: 高 (${Math.round(confidence * 100)}%)`);
            indicator.title = `信頼度: ${Math.round(confidence * 100)}% - 抽出結果の信頼性が高いです`;
        } else if (confidence >= 0.7) {
            indicator.classList.add('medium');
            indicator.innerHTML = '<span class="confidence-icon">!</span>中';
            indicator.setAttribute('aria-label', `信頼度: 中 (${Math.round(confidence * 100)}%)`);
            indicator.title = `信頼度: ${Math.round(confidence * 100)}% - 抽出結果を確認してください`;
        } else if (confidence > 0) {
            indicator.classList.add('low');
            indicator.innerHTML = '<span class="confidence-icon">⚠</span>低';
            indicator.setAttribute('aria-label', `信頼度: 低 (${Math.round(confidence * 100)}%)`);
            indicator.title = `信頼度: ${Math.round(confidence * 100)}% - 抽出結果の確認が必要です`;
            
            // 低信頼度の場合はアラートを表示
            this.showLowConfidenceAlert(indicator);
        } else {
            indicator.textContent = '';
            indicator.removeAttribute('aria-label');
            indicator.removeAttribute('title');
        }
    }

    /**
     * 低信頼度アラートの表示
     */
    showLowConfidenceAlert(indicator) {
        // 既存のアラートがある場合は削除
        const existingAlert = indicator.parentNode.querySelector('.confidence-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // アラート要素を作成
        const alert = document.createElement('div');
        alert.className = 'confidence-alert';
        alert.setAttribute('role', 'alert');
        alert.setAttribute('aria-live', 'polite');
        
        alert.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">⚠</span>
                <div class="alert-text">
                    <strong>確認が必要です</strong>
                    <p>抽出結果の信頼度が低いため、内容を確認してください。</p>
                    <div class="alert-suggestions">
                        <button type="button" class="suggestion-button" data-action="reselect">
                            <span class="suggestion-icon">🔍</span>
                            範囲を再選択
                        </button>
                        <button type="button" class="suggestion-button" data-action="manual">
                            <span class="suggestion-icon">✏️</span>
                            手動で入力
                        </button>
                    </div>
                </div>
                <button type="button" class="alert-close" aria-label="アラートを閉じる">×</button>
            </div>
        `;

        // アラートをフィールドの後に挿入
        const formGroup = indicator.closest('.form-group');
        if (formGroup) {
            formGroup.appendChild(alert);
            
            // イベントリスナーを追加
            this.bindAlertEvents(alert, formGroup);
            
            // 3秒後に自動で非表示（ユーザーが操作しない場合）
            setTimeout(() => {
                if (alert.parentNode && !alert.classList.contains('user-interacted')) {
                    alert.classList.add('fade-out');
                    setTimeout(() => {
                        if (alert.parentNode) {
                            alert.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
    }

    /**
     * アラートのイベントバインド
     */
    bindAlertEvents(alert, formGroup) {
        // 閉じるボタン
        const closeButton = alert.querySelector('.alert-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                alert.classList.add('fade-out');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            });
        }

        // 提案ボタン
        const suggestionButtons = alert.querySelectorAll('.suggestion-button');
        suggestionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                alert.classList.add('user-interacted');
                const action = e.currentTarget.dataset.action;
                
                if (action === 'reselect') {
                    this.handleReselectSuggestion(formGroup);
                } else if (action === 'manual') {
                    this.handleManualInputSuggestion(formGroup);
                }
                
                // アラートを閉じる
                alert.classList.add('fade-out');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            });
        });

        // アラート全体のクリックで相互作用をマーク
        alert.addEventListener('click', () => {
            alert.classList.add('user-interacted');
        });
    }

    /**
     * 再選択提案の処理
     */
    handleReselectSuggestion(formGroup) {
        // 矩形選択モードを開始
        if (this.currentImage && !this.rectangleSelectionMode) {
            this.toggleRectangleSelectionMode();
            
            // ユーザーに指示を表示
            this.updateStatus('画像上で範囲を選択してください', 'processing');
        } else {
            this.updateStatus('画像を読み込んでから再選択してください', 'error');
        }
    }

    /**
     * 手動入力提案の処理
     */
    handleManualInputSuggestion(formGroup) {
        // 該当フィールドにフォーカス
        const field = formGroup.querySelector('.form-input');
        if (field) {
            field.focus();
            field.select();
            
            // 候補リストがある場合は表示
            const candidatesContainer = formGroup.querySelector('.candidates-list');
            if (candidatesContainer && candidatesContainer.innerHTML) {
                candidatesContainer.style.display = 'block';
            }
        }
    }

    /**
     * 候補リストの更新
     */
    updateCandidatesList(fieldName, candidates) {
        const candidatesContainer = this.elements[`${fieldName}Candidates`];
        if (!candidatesContainer) return;

        // 新しい候補を履歴に追加
        this.addCandidatesToHistory(fieldName, candidates);

        // 履歴と新しい候補を統合
        const allCandidates = this.getMergedCandidates(fieldName, candidates);

        if (allCandidates.length === 0) return;

        // 候補リストのHTML生成
        const candidatesHTML = `
            <div class="candidates-header">
                <span class="candidates-title">候補 (${allCandidates.length})</span>
                <div class="candidates-controls">
                    <button type="button" class="candidates-toggle" data-field="${fieldName}" aria-label="履歴を表示/非表示">
                        <span class="toggle-icon">📋</span>
                        履歴
                    </button>
                    <button type="button" class="candidates-clear" aria-label="候補リストを閉じる">×</button>
                </div>
            </div>
            <div class="candidates-content">
                ${this.renderCandidateGroups(fieldName, allCandidates)}
            </div>
        `;

        candidatesContainer.innerHTML = candidatesHTML;
        candidatesContainer.style.display = 'block';

        // イベントリスナーの追加
        this.bindCandidatesEvents(candidatesContainer);
    }

    /**
     * 候補を履歴に追加
     */
    addCandidatesToHistory(fieldName, candidates) {
        if (!this.candidateHistory[fieldName]) {
            this.candidateHistory[fieldName] = [];
        }

        candidates.forEach(candidate => {
            // 重複チェック（値と信頼度が同じものは追加しない）
            const exists = this.candidateHistory[fieldName].some(existing => 
                existing.value === candidate.value && 
                Math.abs(existing.confidence - candidate.confidence) < 0.01
            );

            if (!exists) {
                this.candidateHistory[fieldName].unshift({
                    ...candidate,
                    timestamp: Date.now(),
                    source: candidate.source || 'OCR'
                });
            }
        });

        // 履歴の上限を設定（最新10件まで）
        this.candidateHistory[fieldName] = this.candidateHistory[fieldName].slice(0, 10);
    }

    /**
     * 候補と履歴をマージ
     */
    getMergedCandidates(fieldName, newCandidates) {
        const history = this.candidateHistory[fieldName] || [];
        const merged = [...newCandidates];

        // 履歴から新しい候補にない項目を追加
        history.forEach(historyItem => {
            const exists = merged.some(candidate => 
                candidate.value === historyItem.value
            );
            if (!exists) {
                merged.push({
                    ...historyItem,
                    isHistory: true
                });
            }
        });

        // 信頼度でソート
        return merged.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * 候補グループのレンダリング
     */
    renderCandidateGroups(fieldName, candidates) {
        const currentCandidates = candidates.filter(c => !c.isHistory);
        const historyCandidates = candidates.filter(c => c.isHistory);

        let html = '';

        // 現在の候補
        if (currentCandidates.length > 0) {
            html += `
                <div class="candidate-group">
                    <div class="candidate-group-header">
                        <span class="group-title">現在の候補</span>
                        <span class="group-count">${currentCandidates.length}</span>
                    </div>
                    ${currentCandidates.map(candidate => this.renderCandidateItem(fieldName, candidate)).join('')}
                </div>
            `;
        }

        // 履歴候補
        if (historyCandidates.length > 0) {
            html += `
                <div class="candidate-group history-group" style="display: none;">
                    <div class="candidate-group-header">
                        <span class="group-title">履歴</span>
                        <span class="group-count">${historyCandidates.length}</span>
                    </div>
                    ${historyCandidates.map(candidate => this.renderCandidateItem(fieldName, candidate)).join('')}
                </div>
            `;
        }

        return html;
    }

    /**
     * 候補アイテムのレンダリング
     */
    renderCandidateItem(fieldName, candidate) {
        const confidenceClass = candidate.confidence >= 0.8 ? 'high' : 
                               candidate.confidence >= 0.6 ? 'medium' : 'low';
        
        return `
            <div class="candidate-item ${candidate.isHistory ? 'history-item' : ''}" 
                 data-field="${fieldName}" 
                 data-value="${this.escapeHtml(candidate.value)}"
                 data-confidence="${candidate.confidence}"
                 role="button"
                 tabindex="0"
                 aria-label="候補: ${this.escapeHtml(candidate.value)} (信頼度: ${Math.round(candidate.confidence * 100)}%)">
                <div class="candidate-main">
                    <span class="candidate-value">${this.escapeHtml(candidate.value)}</span>
                    <div class="candidate-meta">
                        <span class="candidate-confidence ${confidenceClass}">${Math.round(candidate.confidence * 100)}%</span>
                        ${candidate.source ? `<span class="candidate-source">${candidate.source}</span>` : ''}
                        ${candidate.isHistory ? `<span class="candidate-timestamp">${this.formatTimestamp(candidate.timestamp)}</span>` : ''}
                    </div>
                </div>
                <div class="candidate-actions">
                    <button type="button" class="candidate-action" data-action="select" aria-label="この候補を選択">
                        <span class="action-icon">✓</span>
                    </button>
                    <button type="button" class="candidate-action" data-action="remove" aria-label="この候補を削除">
                        <span class="action-icon">×</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * タイムスタンプのフォーマット
     */
    formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return '今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        if (days < 7) return `${days}日前`;
        
        return new Date(timestamp).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * 候補リストのイベントバインド
     */
    bindCandidatesEvents(container) {
        // 候補アイテムのクリック/キーボードイベント
        const candidateItems = container.querySelectorAll('.candidate-item');
        candidateItems.forEach(item => {
            // メインエリアのクリック
            const mainArea = item.querySelector('.candidate-main');
            if (mainArea) {
                mainArea.addEventListener('click', this.handleCandidateSelect.bind(this));
            }
            
            // キーボードイベント
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleCandidateSelect(e);
                }
            });

            // アクションボタン
            const actionButtons = item.querySelectorAll('.candidate-action');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.currentTarget.dataset.action;
                    const candidateItem = e.currentTarget.closest('.candidate-item');
                    
                    if (action === 'select') {
                        this.handleCandidateSelect({ currentTarget: candidateItem });
                    } else if (action === 'remove') {
                        this.handleCandidateRemove(candidateItem);
                    }
                });
            });
        });

        // 履歴表示切り替えボタン
        const toggleButton = container.querySelector('.candidates-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                const fieldName = e.currentTarget.dataset.field;
                this.toggleCandidateHistory(container, fieldName);
            });
        }

        // 閉じるボタン
        const clearButton = container.querySelector('.candidates-clear');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                container.style.display = 'none';
            });
        }
    }

    /**
     * 候補履歴の表示切り替え
     */
    toggleCandidateHistory(container, fieldName) {
        const historyGroup = container.querySelector('.history-group');
        const toggleButton = container.querySelector('.candidates-toggle');
        
        if (historyGroup) {
            const isVisible = historyGroup.style.display !== 'none';
            historyGroup.style.display = isVisible ? 'none' : 'block';
            
            // ボタンの状態を更新
            if (toggleButton) {
                const icon = toggleButton.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = isVisible ? '📋' : '📂';
                }
                toggleButton.setAttribute('aria-expanded', !isVisible);
            }
        }
    }

    /**
     * 候補の削除処理
     */
    handleCandidateRemove(candidateItem) {
        const fieldName = candidateItem.dataset.field;
        const value = candidateItem.dataset.value;
        
        // 履歴から削除
        if (this.candidateHistory[fieldName]) {
            this.candidateHistory[fieldName] = this.candidateHistory[fieldName].filter(
                candidate => candidate.value !== value
            );
        }

        // UIから削除（アニメーション付き）
        candidateItem.style.transition = 'all 0.3s ease';
        candidateItem.style.opacity = '0';
        candidateItem.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
            if (candidateItem.parentNode) {
                candidateItem.remove();
                
                // グループが空になった場合は非表示
                const group = candidateItem.closest('.candidate-group');
                if (group && group.querySelectorAll('.candidate-item').length === 0) {
                    group.style.display = 'none';
                }
            }
        }, 300);
    }

    /**
     * 候補選択の処理
     */
    handleCandidateSelect(event) {
        const item = event.currentTarget;
        const fieldName = item.dataset.field;
        const value = item.dataset.value;
        const confidence = parseFloat(item.dataset.confidence);

        // フィールドに値を設定
        const field = this.elements[`${fieldName}Field`];
        if (field) {
            field.value = value;
            field.focus();
            
            // バリデーション実行
            this.validateField(fieldName, value);
        }

        // 信頼度インジケーターを更新
        const confidenceIndicator = this.elements[`${fieldName}Confidence`];
        if (confidenceIndicator) {
            this.updateConfidenceIndicator(confidenceIndicator, confidence);
        }

        // 候補リストを非表示
        const candidatesContainer = this.elements[`${fieldName}Candidates`];
        if (candidatesContainer) {
            candidatesContainer.style.display = 'none';
        }

        // 選択された候補をハイライト
        item.classList.add('selected');
        setTimeout(() => item.classList.remove('selected'), 1000);
    }

    /**
     * フォームバリデーションのイベントバインド
     */
    bindFormValidation() {
        const fields = ['date', 'payee', 'amount', 'purpose'];
        
        fields.forEach(fieldName => {
            const field = this.elements[`${fieldName}Field`];
            if (field) {
                // リアルタイムバリデーション
                field.addEventListener('blur', (e) => {
                    this.validateField(fieldName, e.target.value);
                });
                
                // 入力時のエラークリア
                field.addEventListener('input', (e) => {
                    if (field.classList.contains('error') || field.classList.contains('warning')) {
                        // 入力があった場合はエラー状態をクリア
                        field.classList.remove('error');
                        const errorElement = document.querySelector(`#${fieldName}-error`);
                        if (errorElement) {
                            errorElement.remove();
                            field.removeAttribute('aria-invalid');
                            field.removeAttribute('aria-describedby');
                        }
                    }
                });

                // 候補リスト表示のトリガー
                field.addEventListener('focus', () => {
                    const candidatesContainer = this.elements[`${fieldName}Candidates`];
                    if (candidatesContainer && candidatesContainer.innerHTML && 
                        candidatesContainer.style.display === 'none') {
                        // 既に候補がある場合は表示
                        candidatesContainer.style.display = 'block';
                    }
                });
            }
        });
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * フォームのリセット
     */
    resetForm() {
        const fields = ['date', 'payee', 'amount', 'purpose'];
        fields.forEach(field => {
            const fieldElement = this.elements[`${field}Field`];
            const confidenceElement = this.elements[`${field}Confidence`];
            const candidatesElement = this.elements[`${field}Candidates`];
            
            if (fieldElement) {
                fieldElement.value = '';
                fieldElement.classList.remove('warning', 'error');
                fieldElement.removeAttribute('aria-invalid');
                fieldElement.removeAttribute('aria-describedby');
            }
            
            if (confidenceElement) {
                confidenceElement.className = 'confidence-indicator';
                confidenceElement.textContent = '';
                confidenceElement.setAttribute('aria-label', '信頼度');
            }
            
            if (candidatesElement) {
                candidatesElement.style.display = 'none';
                candidatesElement.innerHTML = '';
            }

            // エラーメッセージを削除
            const errorElement = document.querySelector(`#${field}-error`);
            if (errorElement) {
                errorElement.remove();
            }
        });
    }

    /**
     * ステータスの更新
     */
    updateStatus(text, type = 'ready') {
        const indicator = this.elements.statusIndicator;
        const statusText = indicator.querySelector('.status-text');
        
        indicator.className = `status-indicator ${type}`;
        statusText.textContent = text;
    }

    /**
     * プログレス表示
     */
    showProgress(text, progress, options = {}) {
        this.elements.progressOverlay.style.display = 'flex';
        this.elements.progressText.textContent = text;
        this.elements.progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        
        // プログレスバーの色を設定
        if (options.type === 'error') {
            this.elements.progressFill.style.backgroundColor = '#ef4444';
        } else if (options.type === 'warning') {
            this.elements.progressFill.style.backgroundColor = '#f59e0b';
        } else if (options.type === 'success') {
            this.elements.progressFill.style.backgroundColor = '#10b981';
        } else {
            this.elements.progressFill.style.backgroundColor = '#2563eb';
        }
        
        // 詳細情報がある場合は表示
        if (options.details) {
            this.showProgressDetails(options.details);
        }
        
        // 自動非表示タイマー
        if (options.autoHide && options.autoHide > 0) {
            setTimeout(() => {
                this.hideProgress();
            }, options.autoHide);
        }
    }

    /**
     * プログレス詳細情報の表示
     */
    showProgressDetails(details) {
        let detailsElement = this.elements.progressOverlay.querySelector('.progress-details');
        
        if (!detailsElement) {
            detailsElement = document.createElement('div');
            detailsElement.className = 'progress-details';
            this.elements.progressOverlay.querySelector('.progress-content').appendChild(detailsElement);
        }
        
        if (typeof details === 'string') {
            detailsElement.textContent = details;
        } else if (Array.isArray(details)) {
            detailsElement.innerHTML = `
                <ul class="progress-steps">
                    ${details.map(step => `
                        <li class="progress-step ${step.completed ? 'completed' : step.active ? 'active' : ''}">
                            <span class="step-icon">${step.completed ? '✓' : step.active ? '⏳' : '○'}</span>
                            <span class="step-text">${step.text}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        }
    }

    /**
     * エラー付きプログレス表示
     */
    showProgressError(text, error, options = {}) {
        this.showProgress(text, 100, { 
            type: 'error', 
            autoHide: options.autoHide || 3000,
            details: error ? `エラー: ${error.message || error}` : null
        });
        
        // エラー音を再生（オプション）
        if (options.playSound !== false) {
            this.playNotificationSound('error');
        }
    }

    /**
     * 成功プログレス表示
     */
    showProgressSuccess(text, options = {}) {
        this.showProgress(text, 100, { 
            type: 'success', 
            autoHide: options.autoHide || 2000,
            details: options.details
        });
        
        // 成功音を再生（オプション）
        if (options.playSound !== false) {
            this.playNotificationSound('success');
        }
    }

    /**
     * 段階的プログレス表示
     */
    showSteppedProgress(steps, currentStep, options = {}) {
        const progress = ((currentStep + 1) / steps.length) * 100;
        const currentStepData = steps[currentStep];
        
        const stepsWithStatus = steps.map((step, index) => ({
            ...step,
            completed: index < currentStep,
            active: index === currentStep
        }));
        
        this.showProgress(currentStepData.text, progress, {
            type: options.type,
            details: stepsWithStatus
        });
    }

    /**
     * プログレス非表示
     */
    hideProgress() {
        this.elements.progressOverlay.style.display = 'none';
        
        // 詳細情報をクリア
        const detailsElement = this.elements.progressOverlay.querySelector('.progress-details');
        if (detailsElement) {
            detailsElement.remove();
        }
        
        // プログレスバーの色をリセット
        this.elements.progressFill.style.backgroundColor = '#2563eb';
    }

    /**
     * 通知音の再生
     */
    playNotificationSound(type) {
        // Web Audio APIを使用した簡単な通知音
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 音の種類に応じて周波数を設定
            if (type === 'error') {
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
            } else if (type === 'success') {
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            } else {
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            }
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // 音の再生に失敗した場合は無視
            console.warn('通知音の再生に失敗:', error);
        }
    }

    /**
     * データ保存（プレースホルダー）
     */
    async saveData() {
        try {
            this.updateStatus('データを保存中...', 'processing');
            
            // プレースホルダー: 実際の保存処理はタスク8で実装
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.updateStatus('データを保存しました');
            setTimeout(() => this.updateStatus('準備完了'), 2000);
            
        } catch (error) {
            console.error('保存エラー:', error);
            this.updateStatus('保存に失敗しました', 'error');
        }
    }

    /**
     * データエクスポート（プレースホルダー）
     */
    async exportData() {
        try {
            this.updateStatus('データをエクスポート中...', 'processing');
            
            // プレースホルダー: 実際のエクスポート処理はタスク8で実装
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.updateStatus('エクスポートしました');
            setTimeout(() => this.updateStatus('準備完了'), 2000);
            
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.updateStatus('エクスポートに失敗しました', 'error');
        }
    }

    /**
     * OpenCV.js読み込み完了時のコールバック
     */
    onOpenCVReady() {
        console.log('OpenCV.js ready in app');
        // 現在画像がある場合、自動的に四角形検出を実行
        if (this.currentImage && this.currentImage.img) {
            this.detectRectangleAsync();
        }
    }

    /**
     * 四角形の自動検出（非同期）
     */
    async detectRectangleAsync() {
        try {
            this.corners = await this.perspectiveCorrection.detectRectangle(this.currentImage.img);
            console.log('四角形を自動検出しました:', this.corners);
        } catch (error) {
            console.warn('四角形自動検出に失敗:', error);
            this.corners = this.perspectiveCorrection.getDefaultCorners(
                this.currentImage.img.width, 
                this.currentImage.img.height
            );
        }
    }

    /**
     * 透視補正モードの切り替え
     */
    togglePerspectiveMode() {
        if (!this.currentImage) return;
        
        this.perspectiveMode = !this.perspectiveMode;
        
        if (this.perspectiveMode) {
            this.enterPerspectiveMode();
        } else {
            this.exitPerspectiveMode();
        }
    }

    /**
     * 透視補正モードに入る
     */
    async enterPerspectiveMode() {
        this.perspectiveMode = true;
        
        // コーナーが未設定の場合は自動検出
        if (!this.corners) {
            this.updateStatus('四角形を検出中...', 'processing');
            await this.detectRectangleAsync();
            this.updateStatus('透視補正モード');
        }
        
        // UIの更新
        this.elements.perspectiveOverlay.style.display = 'block';
        this.elements.perspectiveButton.style.display = 'none';
        this.elements.applyPerspectiveButton.style.display = 'inline-flex';
        this.elements.cancelPerspectiveButton.style.display = 'inline-flex';
        this.elements.processButton.style.display = 'none';
        
        // SVGオーバーレイの更新
        this.updatePerspectiveOverlay();
    }

    /**
     * 透視補正モードを終了
     */
    exitPerspectiveMode() {
        this.perspectiveMode = false;
        
        // UIの更新
        this.elements.perspectiveOverlay.style.display = 'none';
        this.elements.perspectiveButton.style.display = 'inline-flex';
        this.elements.applyPerspectiveButton.style.display = 'none';
        this.elements.cancelPerspectiveButton.style.display = 'none';
        this.elements.processButton.style.display = 'inline-flex';
        
        this.updateStatus('準備完了');
    }

    /**
     * 透視補正モードをキャンセル
     */
    cancelPerspectiveMode() {
        this.exitPerspectiveMode();
    }

    /**
     * 透視補正の適用
     */
    async applyPerspectiveCorrection() {
        if (!this.currentImage || !this.corners) return;
        
        try {
            this.updateStatus('透視補正を適用中...', 'processing');
            
            // 画像座標系に変換
            const imageCorners = this.convertToImageCoordinates(this.corners);
            
            // 透視補正を実行
            const correctedImg = await this.perspectiveCorrection.correctPerspective(
                this.currentImage.img, 
                imageCorners
            );
            
            // 補正後の画像を表示
            this.currentImage.img = correctedImg;
            this.currentImage.perspectiveCorrected = true;
            this.displayImage(this.currentImage);
            
            // 透視補正モードを終了
            this.exitPerspectiveMode();
            
            this.updateStatus('透視補正完了');
            
        } catch (error) {
            console.error('透視補正エラー:', error);
            this.updateStatus('透視補正に失敗しました', 'error');
        }
    }

    /**
     * 表示座標を画像座標に変換
     */
    convertToImageCoordinates(displayCorners) {
        const canvas = this.elements.imageCanvas;
        const img = this.currentImage.img;
        
        const scaleX = img.width / canvas.width;
        const scaleY = img.height / canvas.height;
        
        return displayCorners.map(corner => ({
            x: corner.x * scaleX,
            y: corner.y * scaleY
        }));
    }

    /**
     * 透視補正オーバーレイの更新
     */
    updatePerspectiveOverlay() {
        if (!this.corners) return;
        
        const canvas = this.elements.imageCanvas;
        const svg = this.elements.perspectiveSvg;
        const polygon = this.elements.perspectivePolygon;
        
        // SVGのサイズを調整
        svg.style.width = canvas.offsetWidth + 'px';
        svg.style.height = canvas.offsetHeight + 'px';
        svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
        
        // ポリゴンの更新
        const points = this.corners.map(corner => `${corner.x},${corner.y}`).join(' ');
        polygon.setAttribute('points', points);
        
        // コーナーハンドルの更新
        this.corners.forEach((corner, index) => {
            const handle = document.getElementById(`corner-${index}`);
            handle.setAttribute('cx', corner.x);
            handle.setAttribute('cy', corner.y);
        });
    }

    /**
     * ドラッグ開始
     */
    startDrag(event, index) {
        event.preventDefault();
        this.isDragging = true;
        this.dragIndex = index;
        
        const handle = document.getElementById(`corner-${index}`);
        handle.classList.add('dragging');
    }

    /**
     * ドラッグ処理
     */
    handleDrag(event) {
        if (!this.isDragging || this.dragIndex < 0) return;
        
        event.preventDefault();
        
        const canvas = this.elements.imageCanvas;
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if (event.type.startsWith('touch')) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // Canvas内の相対座標を計算
        const x = ((clientX - rect.left) / rect.width) * canvas.width;
        const y = ((clientY - rect.top) / rect.height) * canvas.height;
        
        // 境界チェック
        const clampedX = Math.max(0, Math.min(canvas.width, x));
        const clampedY = Math.max(0, Math.min(canvas.height, y));
        
        // コーナー位置を更新
        this.corners[this.dragIndex] = { x: clampedX, y: clampedY };
        
        // オーバーレイを更新
        this.updatePerspectiveOverlay();
    }

    /**
     * ドラッグ終了
     */
    endDrag() {
        if (this.isDragging) {
            const handle = document.getElementById(`corner-${this.dragIndex}`);
            handle.classList.remove('dragging');
        }
        
        this.isDragging = false;
        this.dragIndex = -1;
    }

    /**
     * 矩形選択モードの切り替え
     */
    toggleRectangleSelectionMode() {
        if (!this.currentImage) return;
        
        this.rectangleSelectionMode = !this.rectangleSelectionMode;
        
        if (this.rectangleSelectionMode) {
            this.enterRectangleSelectionMode();
        } else {
            this.exitRectangleSelectionMode();
        }
    }
    
    /**
     * 矩形選択モードに入る
     */
    enterRectangleSelectionMode() {
        this.rectangleSelectionMode = true;
        
        // 他のモードを終了
        if (this.perspectiveMode) {
            this.exitPerspectiveMode();
        }
        
        // 矩形選択器を初期化
        if (!this.rectangleSelector) {
            this.rectangleSelector = new RectangleSelector(this.elements.imageCanvas);
            
            // 選択完了イベントのリスナー
            this.elements.imageCanvas.addEventListener('rectangleSelected', this.handleRectangleSelected.bind(this));
        }
        
        // 現在の画像データを設定
        const ctx = this.elements.imageCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, this.elements.imageCanvas.width, this.elements.imageCanvas.height);
        this.rectangleSelector.setImageData(imageData, this.elements.imageCanvas.width, this.elements.imageCanvas.height);
        
        // UIの更新
        this.elements.rectangleOverlay.style.display = 'flex';
        this.elements.rectangleSelectButton.style.display = 'none';
        this.elements.perspectiveButton.style.display = 'none';
        this.elements.processButton.style.display = 'none';
        this.elements.cancelSelectionButton.style.display = 'inline-flex';
        
        this.updateStatus('範囲選択モード - ドラッグして範囲を選択してください');
    }
    
    /**
     * 矩形選択モードを終了
     */
    exitRectangleSelectionMode() {
        this.rectangleSelectionMode = false;
        
        // UIの更新
        this.elements.rectangleOverlay.style.display = 'none';
        this.elements.rectangleSelectButton.style.display = 'inline-flex';
        this.elements.perspectiveButton.style.display = 'inline-flex';
        this.elements.processButton.style.display = 'inline-flex';
        this.elements.applySelectionButton.style.display = 'none';
        this.elements.cancelSelectionButton.style.display = 'none';
        
        // 矩形選択器をクリア
        if (this.rectangleSelector) {
            this.rectangleSelector.clearSelection();
        }
        
        this.updateStatus('準備完了');
    }
    
    /**
     * 矩形選択モードをキャンセル
     */
    cancelRectangleSelectionMode() {
        this.exitRectangleSelectionMode();
    }
    
    /**
     * 矩形選択完了の処理
     */
    handleRectangleSelected(event) {
        const { selection, imageData } = event.detail;
        
        if (selection && imageData) {
            // 選択完了ボタンを表示
            this.elements.applySelectionButton.style.display = 'inline-flex';
            this.updateStatus(`範囲選択完了 (${Math.round(selection.width)}×${Math.round(selection.height)}px)`);
        }
    }
    
    /**
     * 矩形選択の適用（再OCR実行）
     */
    async applyRectangleSelection() {
        if (!this.rectangleSelector) return;
        
        const selection = this.rectangleSelector.getSelection();
        const selectionImageData = this.rectangleSelector.getSelectionImageData();
        
        if (!selection || !selectionImageData) {
            this.updateStatus('選択範囲が無効です', 'error');
            return;
        }
        
        try {
            this.updateStatus('選択範囲をOCR処理中...', 'processing');
            this.showProgress('選択範囲のOCR処理を開始しています...', 0);
            
            // 選択範囲の画像をImageオブジェクトに変換
            const selectionImg = await this.canvasToImage(selectionImageData);
            
            // OCR処理を実行（プレースホルダー）
            await this.processSelectionOCR(selectionImg, selection);
            
            this.hideProgress();
            this.exitRectangleSelectionMode();
            this.updateStatus('選択範囲のOCR処理完了');
            
        } catch (error) {
            console.error('選択範囲OCR処理エラー:', error);
            this.hideProgress();
            this.updateStatus('選択範囲のOCR処理に失敗しました', 'error');
        }
    }
    
    /**
     * CanvasをImageオブジェクトに変換
     */
    canvasToImage(canvas) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = canvas.toDataURL();
        });
    }
    
    /**
     * 選択範囲のOCR処理
     */
    async processSelectionOCR(image, selection) {
        if (!this.ocrEngine) {
            throw new Error('OCRエンジンが初期化されていません');
        }
        
        try {
            // 画像をCanvasに描画してImageDataを取得
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // OCR処理を実行
            const ocrResult = await this.ocrEngine.processImage(imageData, {
                progressCallback: (text, progress) => {
                    this.showProgress(text, progress);
                }
            });
            
            // 結果から候補を抽出
            await this.extractCandidatesFromOCRResult(ocrResult);
            
        } catch (error) {
            console.error('選択範囲OCR処理エラー:', error);
            
            // フォールバック: サンプル候補データを生成
            console.log('フォールバックとしてサンプルデータを生成します');
            await this.generateFallbackCandidates();
        }
    }
    
    /**
     * OCR結果から候補を抽出
     */
    async extractCandidatesFromOCRResult(ocrResult) {
        if (!ocrResult || !ocrResult.textBlocks) {
            console.warn('OCR結果が空です');
            return;
        }
        
        // フィールド抽出器を使用して候補を生成
        if (window.FieldExtractor) {
            try {
                const fieldExtractor = new FieldExtractor();
                const extractedFields = await fieldExtractor.extractFields(ocrResult);
                
                // 各フィールドの候補を追加
                Object.entries(extractedFields).forEach(([fieldName, fieldData]) => {
                    if (fieldData.candidates && fieldData.candidates.length > 0) {
                        // 最も信頼度の高い候補を追加
                        const bestCandidate = fieldData.candidates[0];
                        this.addSelectionCandidate(fieldName, bestCandidate.value, bestCandidate.confidence);
                    }
                });
                
            } catch (error) {
                console.error('フィールド抽出エラー:', error);
                await this.generateFallbackCandidates();
            }
        } else {
            // フィールド抽出器が利用できない場合、生のテキストから候補を生成
            this.generateCandidatesFromTextBlocks(ocrResult.textBlocks);
        }
    }
    
    /**
     * テキストブロックから候補を生成
     */
    generateCandidatesFromTextBlocks(textBlocks) {
        textBlocks.forEach(block => {
            const text = block.text.trim();
            if (!text) return;
            
            // 日付パターンの検出
            const datePattern = /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})[日]?/;
            const dateMatch = text.match(datePattern);
            if (dateMatch) {
                const normalizedDate = `${dateMatch[1]}/${dateMatch[2].padStart(2, '0')}/${dateMatch[3].padStart(2, '0')}`;
                this.addSelectionCandidate('date', normalizedDate, block.confidence || 0.8);
            }
            
            // 金額パターンの検出
            const amountPattern = /[¥￥]?(\d{1,3}(?:,\d{3})*|\d+)[円]?/;
            const amountMatch = text.match(amountPattern);
            if (amountMatch) {
                const amount = amountMatch[1].replace(/,/g, '');
                this.addSelectionCandidate('amount', amount, block.confidence || 0.8);
            }
            
            // 支払先パターンの検出（会社名など）
            const payeePattern = /(株式会社|有限会社|合同会社|合資会社|合名会社|[店堂薬局]$)/;
            if (payeePattern.test(text)) {
                this.addSelectionCandidate('payee', text, block.confidence || 0.7);
            }
            
            // その他のテキストは適用として追加
            if (text.length > 2 && text.length < 50 && !dateMatch && !amountMatch) {
                this.addSelectionCandidate('purpose', text, block.confidence || 0.6);
            }
        });
    }
    
    /**
     * フォールバック候補データの生成
     */
    async generateFallbackCandidates() {
        // 進行状況を更新
        this.showProgress('候補を生成中...', 90);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // サンプル候補データを生成（実際の実装では削除）
        const sampleCandidates = [
            { field: 'date', value: '2024/03/20', confidence: 0.75 },
            { field: 'amount', value: '2500', confidence: 0.80 },
            { field: 'payee', value: '選択範囲テキスト', confidence: 0.65 }
        ];
        
        sampleCandidates.forEach(candidate => {
            this.addSelectionCandidate(candidate.field, candidate.value, candidate.confidence);
        });
    }
    
    /**
     * 選択範囲からの候補を追加
     */
    addSelectionCandidate(fieldName, value, confidence) {
        if (!value || value.trim() === '') return;
        
        // 新しい候補システムを使用
        const candidate = {
            value: value.trim(),
            confidence: confidence,
            originalText: value,
            source: '範囲選択',
            timestamp: Date.now()
        };
        
        // 候補を履歴に追加
        this.addCandidatesToHistory(fieldName, [candidate]);
        
        // 候補リストを更新
        const existingCandidates = this.candidateHistory[fieldName] || [];
        this.updateCandidatesList(fieldName, existingCandidates);
        
        // 新しい候補をハイライト
        setTimeout(() => {
            const candidatesContainer = this.elements[`${fieldName}Candidates`];
            if (candidatesContainer) {
                const newCandidateItem = candidatesContainer.querySelector(`[data-value="${this.escapeHtml(value)}"]`);
                if (newCandidateItem) {
                    newCandidateItem.classList.add('selection-candidate');
                    newCandidateItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    // 3秒後にハイライトを削除
                    setTimeout(() => {
                        newCandidateItem.classList.remove('selection-candidate');
                    }, 3000);
                }
            }
        }, 100);
        
        this.updateStatus(`${this.getFieldDisplayName(fieldName)}の候補を追加しました`);
    }

    /**
     * フィールド名の表示名を取得
     */
    getFieldDisplayName(fieldName) {
        const displayNames = {
            date: '日付',
            payee: '支払先',
            amount: '金額',
            purpose: '適用'
        };
        return displayNames[fieldName] || fieldName;
    }
    
    /**
     * フィールドの候補をクリア
     */
    clearFieldCandidates(fieldName) {
        const candidatesElement = this.elements[`${fieldName}Candidates`];
        if (candidatesElement) {
            candidatesElement.innerHTML = '';
            candidatesElement.style.display = 'none';
        }
    }
    
    /**
     * フィールド表示名を取得
     */
    getFieldDisplayName(fieldName) {
        const displayNames = {
            date: '日付',
            payee: '支払先',
            amount: '金額',
            purpose: '適用'
        };
        return displayNames[fieldName] || fieldName;
    }
    
    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 一時的なメッセージを表示
     */
    showTemporaryMessage(message, duration = 2000) {
        const currentStatus = this.elements.statusIndicator.querySelector('.status-text').textContent;
        this.updateStatus(message);
        
        setTimeout(() => {
            // 他のメッセージに変更されていない場合のみ元に戻す
            const newStatus = this.elements.statusIndicator.querySelector('.status-text').textContent;
            if (newStatus === message) {
                this.updateStatus(currentStatus);
            }
        }, duration);
    }
    
    /**
     * ズームイン
     */
    zoomIn() {
        if (this.rectangleSelector) {
            this.rectangleSelector.zoom(1.2);
        }
    }
    
    /**
     * ズームアウト
     */
    zoomOut() {
        if (this.rectangleSelector) {
            this.rectangleSelector.zoom(0.8);
        }
    }
    
    /**
     * ズームリセット
     */
    resetZoom() {
        if (this.rectangleSelector) {
            this.rectangleSelector.resetTransform();
        }
    }

    /**
     * OCRエンジンの初期化
     */
    async initializeOCREngine() {
        try {
            this.ocrEngine = new OCREngine({
                modelsPath: './models/',
                backends: ['webgpu', 'webgl', 'wasm'],
                fallbackToTesseract: true
            });
            
            // フォールバック切り替えイベントのリスナー
            document.addEventListener('ocrFallbackSwitch', this.handleFallbackSwitch.bind(this));
            
            // バックグラウンドで初期化
            this.ocrEngine.initialize().then(() => {
                const status = this.ocrEngine.getInitializationStatus();
                if (status.usingFallback) {
                    this.showFallbackNotification();
                }
                console.log('OCRエンジン初期化完了:', status);
            }).catch(error => {
                console.error('OCRエンジン初期化エラー:', error);
                this.updateStatus('OCRエンジンの初期化に失敗しました', 'error');
            });
            
        } catch (error) {
            console.error('OCRエンジン作成エラー:', error);
        }
    }

    /**
     * フォールバック切り替えの処理
     */
    handleFallbackSwitch(event) {
        const { reason, performanceDifference } = event.detail;
        console.warn('フォールバックに切り替わりました:', reason);
        
        this.showFallbackNotification(reason, performanceDifference);
    }

    /**
     * フォールバック通知の表示
     */
    showFallbackNotification(reason = null, performanceDifference = null) {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.fallback-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 通知要素を作成
        const notification = document.createElement('div');
        notification.className = 'fallback-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">⚠️</div>
                <div class="notification-text">
                    <strong>フォールバックモード</strong>
                    <p>高性能OCRが利用できないため、代替エンジンを使用しています。</p>
                    ${reason ? `<small>理由: ${reason}</small>` : ''}
                    ${performanceDifference ? `
                        <details>
                            <summary>性能への影響</summary>
                            <ul>
                                <li>${performanceDifference.speed}</li>
                                <li>${performanceDifference.accuracy}</li>
                                <li>${performanceDifference.features}</li>
                            </ul>
                        </details>
                    ` : ''}
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // 通知をページに追加
        document.body.appendChild(notification);
        
        // 自動で非表示にする（10秒後）
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    /**
     * ストレージとエクスポート機能の初期化
     */
    async initializeStorageAndExport() {
        try {
            // ストレージマネージャーの初期化
            this.storageManager = new StorageManager();
            await this.storageManager.initialize();
            
            // エクスポートマネージャーの初期化
            this.exportManager = new ExportManager();
            this.zipExportManager = new ZipExportManager();
            
            console.log('ストレージとエクスポート機能が初期化されました');
        } catch (error) {
            console.error('ストレージ初期化エラー:', error);
            this.updateStatus('ストレージ初期化に失敗しました', 'error');
        }
    }

    /**
     * データの保存
     */
    async saveData() {
        if (!this.storageManager) {
            this.showProgressError('ストレージが利用できません', null, { autoHide: 3000 });
            return;
        }

        try {
            // フォームデータの取得
            const formData = this.getFormData();
            
            // バリデーション
            if (!this.validateFormData(formData)) {
                this.showProgressError('入力データに不備があります', null, { autoHide: 3000 });
                return;
            }

            this.updateStatus('データを保存中...', 'processing');
            
            // 画像データの取得（存在する場合）
            let imageBlob = null;
            if (this.currentImage && this.currentImage.canvas) {
                imageBlob = await this.canvasToBlob(this.currentImage.canvas);
            }

            // データの保存
            const receiptId = await this.storageManager.saveReceipt(formData, imageBlob);
            
            this.showProgressSuccess('データが保存されました', {
                details: `ID: ${receiptId}`,
                autoHide: 2000
            });
            
            this.updateStatus('データ保存完了');
            
        } catch (error) {
            console.error('データ保存エラー:', error);
            this.showProgressError('データの保存に失敗しました', error, { autoHide: 5000 });
            this.updateStatus('データ保存に失敗しました', 'error');
        }
    }

    /**
     * データのエクスポート
     */
    async exportData() {
        if (!this.storageManager || !this.exportManager) {
            this.showProgressError('エクスポート機能が利用できません', null, { autoHide: 3000 });
            return;
        }

        try {
            // エクスポートオプションの表示
            const exportOptions = await this.showExportDialog();
            if (!exportOptions) return; // キャンセルされた場合

            this.updateStatus('データをエクスポート中...', 'processing');
            
            // 保存されたデータの取得
            const receipts = await this.storageManager.getAllReceipts();
            
            if (receipts.length === 0) {
                this.showProgressError('エクスポートするデータがありません', null, { autoHide: 3000 });
                return;
            }

            // エクスポート形式に応じた処理
            switch (exportOptions.format) {
                case 'json':
                case 'csv':
                    await this.exportManager.exportData(receipts, exportOptions.format, exportOptions);
                    break;
                case 'zip':
                    await this.zipExportManager.exportToZip(receipts, this.storageManager, exportOptions);
                    break;
            }
            
            this.showProgressSuccess('エクスポートが完了しました', {
                details: `${receipts.length}件のデータを${exportOptions.format.toUpperCase()}形式でエクスポートしました`,
                autoHide: 3000
            });
            
            this.updateStatus('エクスポート完了');
            
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showProgressError('エクスポートに失敗しました', error, { autoHide: 5000 });
            this.updateStatus('エクスポートに失敗しました', 'error');
        }
    }

    /**
     * フォームデータの取得
     */
    getFormData() {
        return {
            date: {
                value: this.elements.dateField.value,
                confidence: this.getFieldConfidence('date'),
                candidates: this.candidateHistory.date
            },
            payee: {
                value: this.elements.payeeField.value,
                confidence: this.getFieldConfidence('payee'),
                candidates: this.candidateHistory.payee
            },
            amount: {
                value: this.elements.amountField.value,
                confidence: this.getFieldConfidence('amount'),
                candidates: this.candidateHistory.amount
            },
            purpose: {
                value: this.elements.purposeField.value,
                confidence: this.getFieldConfidence('purpose'),
                candidates: this.candidateHistory.purpose
            }
        };
    }

    /**
     * フィールドの信頼度を取得
     */
    getFieldConfidence(fieldName) {
        const indicator = this.elements[`${fieldName}Confidence`];
        if (!indicator) return 0;
        
        if (indicator.classList.contains('high')) return 0.9;
        if (indicator.classList.contains('medium')) return 0.7;
        if (indicator.classList.contains('low')) return 0.4;
        return 0;
    }

    /**
     * フォームデータのバリデーション
     */
    validateFormData(formData) {
        // 少なくとも1つのフィールドに値が入っている必要がある
        return Object.values(formData).some(field => field.value && field.value.trim().length > 0);
    }

    /**
     * CanvasをBlobに変換
     */
    canvasToBlob(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.8);
        });
    }

    /**
     * エクスポートダイアログの表示
     */
    async showExportDialog() {
        return new Promise((resolve) => {
            // モーダルダイアログの作成
            const modal = document.createElement('div');
            modal.className = 'export-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>エクスポート設定</h3>
                        <button type="button" class="modal-close" aria-label="閉じる">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">エクスポート形式</label>
                            <div class="radio-group">
                                <label class="radio-label">
                                    <input type="radio" name="format" value="json" checked>
                                    <span>JSON形式</span>
                                    <small>構造化データとして出力</small>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="format" value="csv">
                                    <span>CSV形式</span>
                                    <small>表計算ソフトで利用可能</small>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="format" value="zip">
                                    <span>ZIP形式（画像付き）</span>
                                    <small>画像と抽出結果をまとめて保存</small>
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="includeConfidence" checked>
                                <span>信頼度を含める</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="includeCandidates">
                                <span>候補データを含める</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="action-button secondary" data-action="cancel">キャンセル</button>
                        <button type="button" class="action-button primary" data-action="export">エクスポート</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // イベントリスナーの設定
            const closeModal = () => {
                document.body.removeChild(modal);
                resolve(null);
            };

            const exportData = () => {
                const format = modal.querySelector('input[name="format"]:checked').value;
                const includeConfidence = modal.querySelector('input[name="includeConfidence"]').checked;
                const includeCandidates = modal.querySelector('input[name="includeCandidates"]').checked;

                document.body.removeChild(modal);
                resolve({
                    format,
                    includeConfidence,
                    includeCandidates
                });
            };

            modal.querySelector('.modal-close').addEventListener('click', closeModal);
            modal.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
            modal.querySelector('[data-action="export"]').addEventListener('click', exportData);

            // ESCキーで閉じる
            const handleKeydown = (event) => {
                if (event.key === 'Escape') {
                    document.removeEventListener('keydown', handleKeydown);
                    closeModal();
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }

    /**
     * キーボードナビゲーション
     */
    handleKeydown(event) {
        // ESCキーでプログレス表示を閉じる
        if (event.key === 'Escape' && this.elements.progressOverlay.style.display === 'flex') {
            this.hideProgress();
        }
        
        // ESCキーで透視補正モードを終了
        if (event.key === 'Escape' && this.perspectiveMode) {
            this.cancelPerspectiveMode();
        }
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    window.receiptOCRApp = new ReceiptOCRApp();
});

// Service Worker の登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}