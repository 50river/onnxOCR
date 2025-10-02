/**
 * 透視補正処理クラス
 * OpenCV.jsを使用した透視補正機能
 */

class PerspectiveCorrection {
    constructor() {
        this.isOpenCVReady = false;
        this.corners = null;
        this.originalImage = null;
    }

    /**
     * OpenCV.jsの初期化確認
     */
    async waitForOpenCV() {
        if (typeof cv !== 'undefined' && cv.Mat) {
            this.isOpenCVReady = true;
            return true;
        }

        // OpenCV.jsの読み込み待ち（最大10秒）
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkOpenCV = () => {
                attempts++;
                if (typeof cv !== 'undefined' && cv.Mat) {
                    this.isOpenCVReady = true;
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    console.warn('OpenCV.jsの読み込みがタイムアウトしました');
                    resolve(false);
                } else {
                    setTimeout(checkOpenCV, 100);
                }
            };
            
            checkOpenCV();
        });
    }

    /**
     * 四角形の自動検出
     * @param {HTMLImageElement} img - 入力画像
     * @returns {Promise<Array>} 検出された四隅の座標
     */
    async detectRectangle(img) {
        if (!await this.waitForOpenCV()) {
            throw new Error('OpenCV.jsが利用できません');
        }

        try {
            // 画像をOpenCV Matに変換
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const src = cv.imread(canvas);
            const gray = new cv.Mat();
            const blur = new cv.Mat();
            const edges = new cv.Mat();
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            // グレースケール変換
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            
            // ガウシアンブラー
            cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
            
            // エッジ検出
            cv.Canny(blur, edges, 50, 150);
            
            // 輪郭検出
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            // 最大面積の四角形を探す
            let maxArea = 0;
            let bestContour = null;
            
            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                
                if (area > maxArea && area > img.width * img.height * 0.1) {
                    // 輪郭を近似
                    const approx = new cv.Mat();
                    const epsilon = 0.02 * cv.arcLength(contour, true);
                    cv.approxPolyDP(contour, approx, epsilon, true);
                    
                    // 四角形（4つの頂点）かチェック
                    if (approx.rows === 4) {
                        maxArea = area;
                        if (bestContour) bestContour.delete();
                        bestContour = approx.clone();
                    }
                    approx.delete();
                }
                contour.delete();
            }
            
            let corners = null;
            if (bestContour) {
                corners = this.extractCorners(bestContour);
                bestContour.delete();
            }
            
            // メモリクリーンアップ
            src.delete();
            gray.delete();
            blur.delete();
            edges.delete();
            contours.delete();
            hierarchy.delete();
            
            return corners || this.getDefaultCorners(img.width, img.height);
            
        } catch (error) {
            console.warn('四角形自動検出に失敗:', error);
            return this.getDefaultCorners(img.width, img.height);
        }
    }

    /**
     * 輪郭から四隅の座標を抽出
     */
    extractCorners(contour) {
        const points = [];
        for (let i = 0; i < contour.rows; i++) {
            const point = contour.data32S.slice(i * 2, i * 2 + 2);
            points.push({ x: point[0], y: point[1] });
        }
        
        // 四隅を時計回りに並び替え
        return this.sortCorners(points);
    }

    /**
     * 四隅の座標を時計回りに並び替え
     */
    sortCorners(points) {
        // 重心を計算
        const center = points.reduce((acc, p) => ({
            x: acc.x + p.x / points.length,
            y: acc.y + p.y / points.length
        }), { x: 0, y: 0 });

        // 角度でソート（時計回り）
        return points.sort((a, b) => {
            const angleA = Math.atan2(a.y - center.y, a.x - center.x);
            const angleB = Math.atan2(b.y - center.y, b.x - center.x);
            return angleA - angleB;
        });
    }

    /**
     * デフォルトの四隅座標を取得
     */
    getDefaultCorners(width, height) {
        const margin = Math.min(width, height) * 0.1;
        return [
            { x: margin, y: margin },                    // 左上
            { x: width - margin, y: margin },            // 右上
            { x: width - margin, y: height - margin },   // 右下
            { x: margin, y: height - margin }            // 左下
        ];
    }

    /**
     * 透視補正の実行
     * @param {HTMLImageElement} img - 入力画像
     * @param {Array} corners - 四隅の座標
     * @returns {Promise<HTMLImageElement>} 補正後の画像
     */
    async correctPerspective(img, corners) {
        if (!await this.waitForOpenCV()) {
            throw new Error('OpenCV.jsが利用できません');
        }

        try {
            // 画像をOpenCV Matに変換
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const src = cv.imread(canvas);
            
            // 出力サイズを計算
            const outputWidth = Math.max(
                this.distance(corners[0], corners[1]),
                this.distance(corners[2], corners[3])
            );
            const outputHeight = Math.max(
                this.distance(corners[1], corners[2]),
                this.distance(corners[3], corners[0])
            );
            
            // 変換行列を作成
            const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                corners[0].x, corners[0].y,
                corners[1].x, corners[1].y,
                corners[2].x, corners[2].y,
                corners[3].x, corners[3].y
            ]);
            
            const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                outputWidth, 0,
                outputWidth, outputHeight,
                0, outputHeight
            ]);
            
            const transformMatrix = cv.getPerspectiveTransform(srcPoints, dstPoints);
            
            // 透視変換を適用
            const dst = new cv.Mat();
            cv.warpPerspective(src, dst, transformMatrix, new cv.Size(outputWidth, outputHeight));
            
            // 結果をCanvasに描画
            const outputCanvas = document.createElement('canvas');
            cv.imshow(outputCanvas, dst);
            
            // 新しいImageオブジェクトを作成
            const correctedImg = new Image();
            await new Promise((resolve) => {
                correctedImg.onload = resolve;
                correctedImg.src = outputCanvas.toDataURL('image/jpeg', 0.9);
            });
            
            // メモリクリーンアップ
            src.delete();
            dst.delete();
            srcPoints.delete();
            dstPoints.delete();
            transformMatrix.delete();
            
            return correctedImg;
            
        } catch (error) {
            console.error('透視補正に失敗:', error);
            throw error;
        }
    }

    /**
     * 2点間の距離を計算
     */
    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
}

// OpenCV.js読み込み完了時のコールバック
function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    if (window.receiptOCRApp && window.receiptOCRApp.onOpenCVReady) {
        window.receiptOCRApp.onOpenCVReady();
    }
}

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerspectiveCorrection;
} else {
    window.PerspectiveCorrection = PerspectiveCorrection;
}