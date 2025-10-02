/**
 * 矩形選択とズーム・パン機能を提供するクラス
 */
class RectangleSelector {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            strokeColor: '#2563eb',
            fillColor: 'rgba(37, 99, 235, 0.2)',
            strokeWidth: 2,
            minSelectionSize: 20,
            ...options
        };
        
        // 状態管理
        this.isSelecting = false;
        this.isSelected = false;
        this.isDragging = false;
        this.isPanning = false;
        this.startPoint = null;
        this.endPoint = null;
        this.selection = null;
        this.lastPanPoint = null;
        
        // ズーム・パン状態
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.minScale = 0.5;
        this.maxScale = 5;
        
        // 元画像データ
        this.originalImageData = null;
        this.imageWidth = 0;
        this.imageHeight = 0;
        
        // イベントリスナー
        this.boundEventListeners = {};
        
        this.initializeEventListeners();
    }
    
    /**
     * イベントリスナーの初期化
     */
    initializeEventListeners() {
        // マウスイベント
        this.boundEventListeners.mousedown = this.handleMouseDown.bind(this);
        this.boundEventListeners.mousemove = this.handleMouseMove.bind(this);
        this.boundEventListeners.mouseup = this.handleMouseUp.bind(this);
        this.boundEventListeners.wheel = this.handleWheel.bind(this);
        
        // タッチイベント
        this.boundEventListeners.touchstart = this.handleTouchStart.bind(this);
        this.boundEventListeners.touchmove = this.handleTouchMove.bind(this);
        this.boundEventListeners.touchend = this.handleTouchEnd.bind(this);
        
        // キーボードイベント
        this.boundEventListeners.keydown = this.handleKeyDown.bind(this);
        
        this.attachEventListeners();
    }
    
    /**
     * イベントリスナーをアタッチ
     */
    attachEventListeners() {
        // マウスイベント
        this.canvas.addEventListener('mousedown', this.boundEventListeners.mousedown);
        document.addEventListener('mousemove', this.boundEventListeners.mousemove);
        document.addEventListener('mouseup', this.boundEventListeners.mouseup);
        this.canvas.addEventListener('wheel', this.boundEventListeners.wheel, { passive: false });
        
        // タッチイベント
        this.canvas.addEventListener('touchstart', this.boundEventListeners.touchstart, { passive: false });
        document.addEventListener('touchmove', this.boundEventListeners.touchmove, { passive: false });
        document.addEventListener('touchend', this.boundEventListeners.touchend);
        
        // キーボードイベント
        document.addEventListener('keydown', this.boundEventListeners.keydown);
    }
    
    /**
     * イベントリスナーをデタッチ
     */
    detachEventListeners() {
        // マウスイベント
        this.canvas.removeEventListener('mousedown', this.boundEventListeners.mousedown);
        document.removeEventListener('mousemove', this.boundEventListeners.mousemove);
        document.removeEventListener('mouseup', this.boundEventListeners.mouseup);
        this.canvas.removeEventListener('wheel', this.boundEventListeners.wheel);
        
        // タッチイベント
        this.canvas.removeEventListener('touchstart', this.boundEventListeners.touchstart);
        document.removeEventListener('touchmove', this.boundEventListeners.touchmove);
        document.removeEventListener('touchend', this.boundEventListeners.touchend);
        
        // キーボードイベント
        document.removeEventListener('keydown', this.boundEventListeners.keydown);
    }
    
    /**
     * 画像データを設定
     */
    setImageData(imageData, width, height) {
        this.originalImageData = imageData;
        this.imageWidth = width;
        this.imageHeight = height;
        this.resetTransform();
        this.redraw();
    }
    
    /**
     * 変換をリセット
     */
    resetTransform() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.clearSelection();
    }
    
    /**
     * 選択をクリア
     */
    clearSelection() {
        this.isSelected = false;
        this.selection = null;
        this.redraw();
    }
    
    /**
     * マウスダウンイベントの処理
     */
    handleMouseDown(event) {
        event.preventDefault();
        const point = this.getCanvasPoint(event.clientX, event.clientY);
        
        if (event.shiftKey || event.ctrlKey) {
            // パンモード
            this.startPan(point);
        } else {
            // 選択モード
            this.startSelection(point);
        }
    }
    
    /**
     * マウス移動イベントの処理
     */
    handleMouseMove(event) {
        if (this.isPanning) {
            this.updatePan(this.getCanvasPoint(event.clientX, event.clientY));
        } else if (this.isSelecting) {
            this.updateSelection(this.getCanvasPoint(event.clientX, event.clientY));
        }
    }
    
    /**
     * マウスアップイベントの処理
     */
    handleMouseUp(event) {
        if (this.isPanning) {
            this.endPan();
        } else if (this.isSelecting) {
            this.endSelection();
        }
    }
    
    /**
     * ホイールイベントの処理（ズーム）
     */
    handleWheel(event) {
        event.preventDefault();
        
        const point = this.getCanvasPoint(event.clientX, event.clientY);
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        
        this.zoom(delta, point);
    }
    
    /**
     * タッチスタートイベントの処理
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // 単一タッチ - 選択またはパン
            const touch = event.touches[0];
            const point = this.getCanvasPoint(touch.clientX, touch.clientY);
            
            if (this.scale > 1) {
                // ズーム中はパンモード
                this.startPan(point);
            } else {
                // 通常は選択モード
                this.startSelection(point);
            }
        } else if (event.touches.length === 2) {
            // ピンチズーム
            this.startPinchZoom(event.touches);
        }
    }
    
    /**
     * タッチ移動イベントの処理
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const point = this.getCanvasPoint(touch.clientX, touch.clientY);
            
            if (this.isPanning) {
                this.updatePan(point);
            } else if (this.isSelecting) {
                this.updateSelection(point);
            }
        } else if (event.touches.length === 2) {
            this.updatePinchZoom(event.touches);
        }
    }
    
    /**
     * タッチエンドイベントの処理
     */
    handleTouchEnd(event) {
        if (this.isPanning) {
            this.endPan();
        } else if (this.isSelecting) {
            this.endSelection();
        }
        
        if (this.pinchZoom) {
            this.endPinchZoom();
        }
    }
    
    /**
     * キーボードイベントの処理
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'Escape':
                this.clearSelection();
                break;
            case '+':
            case '=':
                this.zoom(1.1);
                break;
            case '-':
                this.zoom(0.9);
                break;
            case '0':
                this.resetTransform();
                break;
        }
    }
    
    /**
     * Canvas座標を取得
     */
    getCanvasPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    /**
     * 画像座標に変換
     */
    canvasToImageCoordinates(canvasPoint) {
        return {
            x: (canvasPoint.x - this.translateX) / this.scale,
            y: (canvasPoint.y - this.translateY) / this.scale
        };
    }
    
    /**
     * Canvas座標に変換
     */
    imageToCanvasCoordinates(imagePoint) {
        return {
            x: imagePoint.x * this.scale + this.translateX,
            y: imagePoint.y * this.scale + this.translateY
        };
    }
    
    /**
     * 選択開始
     */
    startSelection(point) {
        this.isSelecting = true;
        this.startPoint = this.canvasToImageCoordinates(point);
        this.endPoint = { ...this.startPoint };
        this.canvas.style.cursor = 'crosshair';
    }
    
    /**
     * 選択更新
     */
    updateSelection(point) {
        if (!this.isSelecting) return;
        
        this.endPoint = this.canvasToImageCoordinates(point);
        this.redraw();
    }
    
    /**
     * 選択終了
     */
    endSelection() {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        this.canvas.style.cursor = 'default';
        
        // 最小サイズチェック
        const width = Math.abs(this.endPoint.x - this.startPoint.x);
        const height = Math.abs(this.endPoint.y - this.startPoint.y);
        
        if (width >= this.options.minSelectionSize && height >= this.options.minSelectionSize) {
            this.selection = {
                x: Math.min(this.startPoint.x, this.endPoint.x),
                y: Math.min(this.startPoint.y, this.endPoint.y),
                width: width,
                height: height
            };
            this.isSelected = true;
            
            // 選択完了イベントを発火
            this.dispatchSelectionEvent();
        } else {
            this.clearSelection();
        }
        
        this.redraw();
    }
    
    /**
     * パン開始
     */
    startPan(point) {
        this.isPanning = true;
        this.lastPanPoint = point;
        this.canvas.style.cursor = 'grabbing';
    }
    
    /**
     * パン更新
     */
    updatePan(point) {
        if (!this.isPanning || !this.lastPanPoint) return;
        
        const deltaX = point.x - this.lastPanPoint.x;
        const deltaY = point.y - this.lastPanPoint.y;
        
        this.translateX += deltaX;
        this.translateY += deltaY;
        
        this.lastPanPoint = point;
        this.redraw();
    }
    
    /**
     * パン終了
     */
    endPan() {
        this.isPanning = false;
        this.lastPanPoint = null;
        this.canvas.style.cursor = 'default';
    }
    
    /**
     * ズーム処理
     */
    zoom(factor, center = null) {
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        
        if (newScale === this.scale) return;
        
        if (center) {
            // 指定点を中心にズーム
            const imagePoint = this.canvasToImageCoordinates(center);
            this.scale = newScale;
            const newCanvasPoint = this.imageToCanvasCoordinates(imagePoint);
            
            this.translateX += center.x - newCanvasPoint.x;
            this.translateY += center.y - newCanvasPoint.y;
        } else {
            // 中央を中心にズーム
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const imagePoint = this.canvasToImageCoordinates({ x: centerX, y: centerY });
            
            this.scale = newScale;
            const newCanvasPoint = this.imageToCanvasCoordinates(imagePoint);
            
            this.translateX += centerX - newCanvasPoint.x;
            this.translateY += centerY - newCanvasPoint.y;
        }
        
        this.redraw();
    }
    
    /**
     * ピンチズーム開始
     */
    startPinchZoom(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        this.pinchZoom = {
            initialDistance: this.getTouchDistance(touch1, touch2),
            initialScale: this.scale,
            center: this.getTouchCenter(touch1, touch2)
        };
    }
    
    /**
     * ピンチズーム更新
     */
    updatePinchZoom(touches) {
        if (!this.pinchZoom) return;
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        const currentDistance = this.getTouchDistance(touch1, touch2);
        const scale = (currentDistance / this.pinchZoom.initialDistance) * this.pinchZoom.initialScale;
        
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
        if (newScale !== this.scale) {
            this.scale = newScale;
            this.redraw();
        }
    }
    
    /**
     * ピンチズーム終了
     */
    endPinchZoom() {
        this.pinchZoom = null;
    }
    
    /**
     * タッチ間の距離を取得
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * タッチの中心点を取得
     */
    getTouchCenter(touch1, touch2) {
        return this.getCanvasPoint(
            (touch1.clientX + touch2.clientX) / 2,
            (touch1.clientY + touch2.clientY) / 2
        );
    }
    
    /**
     * 再描画
     */
    redraw() {
        if (!this.originalImageData) return;
        
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 変換を適用
        this.ctx.save();
        this.ctx.translate(this.translateX, this.translateY);
        this.ctx.scale(this.scale, this.scale);
        
        // 画像を描画
        this.ctx.putImageData(this.originalImageData, 0, 0);
        
        // 変換を元に戻す
        this.ctx.restore();
        
        // 選択矩形を描画
        this.drawSelection();
    }
    
    /**
     * 選択矩形の描画
     */
    drawSelection() {
        if (this.isSelecting && this.startPoint && this.endPoint) {
            // 選択中の矩形
            const start = this.imageToCanvasCoordinates(this.startPoint);
            const end = this.imageToCanvasCoordinates(this.endPoint);
            
            this.drawRectangle(start, end, true);
        } else if (this.isSelected && this.selection) {
            // 確定した選択矩形
            const topLeft = this.imageToCanvasCoordinates({
                x: this.selection.x,
                y: this.selection.y
            });
            const bottomRight = this.imageToCanvasCoordinates({
                x: this.selection.x + this.selection.width,
                y: this.selection.y + this.selection.height
            });
            
            this.drawRectangle(topLeft, bottomRight, false);
        }
    }
    
    /**
     * 矩形の描画
     */
    drawRectangle(start, end, isSelecting) {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        this.ctx.save();
        
        // 塗りつぶし
        this.ctx.fillStyle = this.options.fillColor;
        this.ctx.fillRect(x, y, width, height);
        
        // 枠線
        this.ctx.strokeStyle = this.options.strokeColor;
        this.ctx.lineWidth = this.options.strokeWidth;
        this.ctx.setLineDash(isSelecting ? [5, 5] : []);
        this.ctx.strokeRect(x, y, width, height);
        
        this.ctx.restore();
    }
    
    /**
     * 選択領域を取得（画像座標系）
     */
    getSelection() {
        return this.selection;
    }
    
    /**
     * 選択領域の画像データを取得
     */
    getSelectionImageData() {
        if (!this.selection || !this.originalImageData) return null;
        
        const { x, y, width, height } = this.selection;
        
        // 境界チェック
        const clampedX = Math.max(0, Math.min(this.imageWidth - 1, Math.floor(x)));
        const clampedY = Math.max(0, Math.min(this.imageHeight - 1, Math.floor(y)));
        const clampedWidth = Math.min(this.imageWidth - clampedX, Math.ceil(width));
        const clampedHeight = Math.min(this.imageHeight - clampedY, Math.ceil(height));
        
        if (clampedWidth <= 0 || clampedHeight <= 0) return null;
        
        // 選択領域の画像データを抽出
        const selectionCanvas = document.createElement('canvas');
        selectionCanvas.width = clampedWidth;
        selectionCanvas.height = clampedHeight;
        const selectionCtx = selectionCanvas.getContext('2d');
        
        // 元画像データから選択領域をコピー
        const imageData = selectionCtx.createImageData(clampedWidth, clampedHeight);
        const sourceData = this.originalImageData.data;
        const targetData = imageData.data;
        
        for (let row = 0; row < clampedHeight; row++) {
            for (let col = 0; col < clampedWidth; col++) {
                const sourceIndex = ((clampedY + row) * this.imageWidth + (clampedX + col)) * 4;
                const targetIndex = (row * clampedWidth + col) * 4;
                
                targetData[targetIndex] = sourceData[sourceIndex];         // R
                targetData[targetIndex + 1] = sourceData[sourceIndex + 1]; // G
                targetData[targetIndex + 2] = sourceData[sourceIndex + 2]; // B
                targetData[targetIndex + 3] = sourceData[sourceIndex + 3]; // A
            }
        }
        
        selectionCtx.putImageData(imageData, 0, 0);
        return selectionCanvas;
    }
    
    /**
     * 選択完了イベントを発火
     */
    dispatchSelectionEvent() {
        const event = new CustomEvent('rectangleSelected', {
            detail: {
                selection: this.selection,
                imageData: this.getSelectionImageData()
            }
        });
        this.canvas.dispatchEvent(event);
    }
    
    /**
     * 破棄処理
     */
    destroy() {
        this.detachEventListeners();
        this.clearSelection();
        this.originalImageData = null;
    }
}