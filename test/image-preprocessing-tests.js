/**
 * 画像前処理ユニットテスト
 * EXIF補正、透視補正、エラーケースの処理確認
 */

class ImagePreprocessingTests {
    constructor() {
        this.testResults = [];
        this.testImages = new Map();
    }

    /**
     * すべての画像前処理テストを実行
     */
    async runAllTests() {
        console.log('🧪 画像前処理テストを開始します...');
        
        try {
            await this.setupTestImages();
            await this.testEXIFRotationCorrection();
            await this.testPerspectiveCorrection();
            await this.testErrorHandling();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ テスト実行中にエラーが発生しました:', error);
        }
    }

    /**
     * テスト用画像データの準備
     */
    async setupTestImages() {
        console.log('📋 テスト用画像データを準備中...');
        
        try {
            // 各回転角度のテスト用EXIF付き画像データを作成
            const orientations = [1, 3, 6, 8, 2, 4, 5, 7];
            
            for (const orientation of orientations) {
                const imageData = await this.createTestImageWithEXIF(orientation);
                this.testImages.set(`orientation_${orientation}`, imageData);
            }

            // 透視補正テスト用の画像
            const perspectiveTestImage = await this.createPerspectiveTestImage();
            this.testImages.set('perspective_test', perspectiveTestImage);

            // エラーテスト用の不正な画像データ
            this.testImages.set('invalid_jpeg', new Uint8Array([0xFF, 0xD8, 0xFF])); // 不完全なJPEG
            this.testImages.set('non_jpeg', new Uint8Array([0x89, 0x50, 0x4E, 0x47])); // PNG header

            this.addTestResult('テスト画像準備', true, `${this.testImages.size}個のテスト画像を準備しました`);
            
        } catch (error) {
            this.addTestResult('テスト画像準備', false, error.message);
            throw error;
        }
    }

    /**
     * EXIF回転補正のテスト
     */
    async testEXIFRotationCorrection() {
        console.log('📋 EXIF回転補正テスト...');
        
        // 各回転角度のテスト
        const orientationTests = [
            { orientation: 1, expectedAngle: 0, description: '正常（回転なし）' },
            { orientation: 3, expectedAngle: 180, description: '180度回転' },
            { orientation: 6, expectedAngle: 90, description: '時計回りに90度回転' },
            { orientation: 8, expectedAngle: 270, description: '反時計回りに90度回転' },
            { orientation: 2, expectedAngle: 0, description: '水平反転（回転なし）' },
            { orientation: 4, expectedAngle: 180, description: '垂直反転 + 180度回転' },
            { orientation: 5, expectedAngle: 270, description: '水平反転 + 反時計回りに90度回転' },
            { orientation: 7, expectedAngle: 90, description: '水平反転 + 時計回りに90度回転' }
        ];

        for (const test of orientationTests) {
            await this.testSingleOrientation(test);
        }

        // 反転情報のテスト
        await this.testFlipInformation();

        // EXIF情報が存在しない場合のテスト
        await this.testNoEXIFData();

        // 不正なEXIFデータのテスト
        await this.testInvalidEXIFData();
    }

    /**
     * 単一のOrientation値のテスト
     */
    async testSingleOrientation(test) {
        try {
            const { orientation, expectedAngle, description } = test;
            
            // EXIFReaderの回転角度取得をテスト
            const actualAngle = EXIFReader.getRotationAngle(orientation);
            
            if (actualAngle === expectedAngle) {
                this.addTestResult(
                    `EXIF回転角度 (${orientation})`, 
                    true, 
                    `${description}: ${actualAngle}度`
                );
            } else {
                this.addTestResult(
                    `EXIF回転角度 (${orientation})`, 
                    false, 
                    `期待値: ${expectedAngle}度, 実際: ${actualAngle}度`
                );
            }

            // 実際のEXIF読み取りテスト
            if (this.testImages.has(`orientation_${orientation}`)) {
                const imageData = this.testImages.get(`orientation_${orientation}`);
                const file = new File([imageData], 'test.jpg', { type: 'image/jpeg' });
                
                const exifData = await EXIFReader.readEXIF(file);
                
                if (exifData.orientation === orientation) {
                    this.addTestResult(
                        `EXIF読み取り (${orientation})`, 
                        true, 
                        `正しいOrientation値を読み取りました: ${exifData.orientation}`
                    );
                } else {
                    this.addTestResult(
                        `EXIF読み取り (${orientation})`, 
                        false, 
                        `期待値: ${orientation}, 実際: ${exifData.orientation}`
                    );
                }
            }

        } catch (error) {
            this.addTestResult(
                `EXIF処理 (${test.orientation})`, 
                false, 
                `エラー: ${error.message}`
            );
        }
    }

    /**
     * 反転情報のテスト
     */
    async testFlipInformation() {
        const flipTests = [
            { orientation: 1, expectedFlip: { horizontal: false, vertical: false } },
            { orientation: 2, expectedFlip: { horizontal: true, vertical: false } },
            { orientation: 4, expectedFlip: { horizontal: false, vertical: true } },
            { orientation: 5, expectedFlip: { horizontal: true, vertical: false } },
            { orientation: 7, expectedFlip: { horizontal: true, vertical: false } }
        ];

        for (const test of flipTests) {
            try {
                const actualFlip = EXIFReader.getFlipInfo(test.orientation);
                
                const isCorrect = actualFlip.horizontal === test.expectedFlip.horizontal &&
                                actualFlip.vertical === test.expectedFlip.vertical;
                
                if (isCorrect) {
                    this.addTestResult(
                        `EXIF反転情報 (${test.orientation})`, 
                        true, 
                        `水平: ${actualFlip.horizontal}, 垂直: ${actualFlip.vertical}`
                    );
                } else {
                    this.addTestResult(
                        `EXIF反転情報 (${test.orientation})`, 
                        false, 
                        `期待値: H${test.expectedFlip.horizontal}/V${test.expectedFlip.vertical}, 実際: H${actualFlip.horizontal}/V${actualFlip.vertical}`
                    );
                }
            } catch (error) {
                this.addTestResult(
                    `EXIF反転情報 (${test.orientation})`, 
                    false, 
                    `エラー: ${error.message}`
                );
            }
        }
    }

    /**
     * EXIF情報が存在しない場合のテスト
     */
    async testNoEXIFData() {
        try {
            // EXIF情報のない画像データ
            const simpleJpeg = new Uint8Array([
                0xFF, 0xD8, // JPEG SOI
                0xFF, 0xDA, // Start of Scan (EXIF情報なし)
                0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00,
                0xFF, 0xD9  // JPEG EOI
            ]);
            
            const file = new File([simpleJpeg], 'no-exif.jpg', { type: 'image/jpeg' });
            const exifData = await EXIFReader.readEXIF(file);
            
            if (exifData.orientation === 1) {
                this.addTestResult(
                    'EXIF情報なし処理', 
                    true, 
                    'デフォルト値(1)が正しく返されました'
                );
            } else {
                this.addTestResult(
                    'EXIF情報なし処理', 
                    false, 
                    `期待値: 1, 実際: ${exifData.orientation}`
                );
            }
        } catch (error) {
            this.addTestResult('EXIF情報なし処理', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 不正なEXIFデータのテスト
     */
    async testInvalidEXIFData() {
        try {
            // 不正なJPEGヘッダー
            const invalidData = this.testImages.get('invalid_jpeg');
            const file = new File([invalidData], 'invalid.jpg', { type: 'image/jpeg' });
            
            const exifData = await EXIFReader.readEXIF(file);
            
            if (exifData.orientation === 1) {
                this.addTestResult(
                    '不正EXIF処理', 
                    true, 
                    '不正データでもデフォルト値が返されました'
                );
            } else {
                this.addTestResult(
                    '不正EXIF処理', 
                    false, 
                    `期待値: 1, 実際: ${exifData.orientation}`
                );
            }

            // 非JPEGファイル
            const nonJpegData = this.testImages.get('non_jpeg');
            const pngFile = new File([nonJpegData], 'test.png', { type: 'image/png' });
            
            const pngExifData = await EXIFReader.readEXIF(pngFile);
            
            if (pngExifData.orientation === 1) {
                this.addTestResult(
                    '非JPEG処理', 
                    true, 
                    'PNG画像でもデフォルト値が返されました'
                );
            } else {
                this.addTestResult(
                    '非JPEG処理', 
                    false, 
                    `期待値: 1, 実際: ${pngExifData.orientation}`
                );
            }

        } catch (error) {
            this.addTestResult('不正EXIF処理', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 透視補正のテスト
     */
    async testPerspectiveCorrection() {
        console.log('📋 透視補正テスト...');
        
        try {
            // PerspectiveCorrectionクラスのインスタンス作成
            const perspectiveCorrection = new PerspectiveCorrection();
            
            // OpenCV.jsの利用可能性テスト
            await this.testOpenCVAvailability(perspectiveCorrection);
            
            // デフォルト四隅座標の生成テスト
            await this.testDefaultCorners(perspectiveCorrection);
            
            // 四隅座標のソート機能テスト
            await this.testCornerSorting(perspectiveCorrection);
            
            // 距離計算のテスト
            await this.testDistanceCalculation(perspectiveCorrection);
            
            // 透視補正処理のテスト（OpenCV.jsが利用可能な場合）
            if (typeof cv !== 'undefined' && cv.Mat) {
                await this.testPerspectiveCorrectionProcess(perspectiveCorrection);
            } else {
                this.addTestResult(
                    '透視補正処理', 
                    false, 
                    'OpenCV.jsが利用できないため、処理テストをスキップしました'
                );
            }
            
        } catch (error) {
            this.addTestResult('透視補正', false, `エラー: ${error.message}`);
        }
    }

    /**
     * OpenCV.jsの利用可能性テスト
     */
    async testOpenCVAvailability(perspectiveCorrection) {
        try {
            const isAvailable = await perspectiveCorrection.waitForOpenCV();
            
            this.addTestResult(
                'OpenCV.js利用可能性', 
                true, 
                `OpenCV.js: ${isAvailable ? '利用可能' : '利用不可'}`
            );
            
            // 内部状態の確認
            if (isAvailable && perspectiveCorrection.isOpenCVReady) {
                this.addTestResult(
                    'OpenCV.js内部状態', 
                    true, 
                    'isOpenCVReadyフラグが正しく設定されました'
                );
            } else if (!isAvailable && !perspectiveCorrection.isOpenCVReady) {
                this.addTestResult(
                    'OpenCV.js内部状態', 
                    true, 
                    'OpenCV.js未利用時の状態が正しく設定されました'
                );
            } else {
                this.addTestResult(
                    'OpenCV.js内部状態', 
                    false, 
                    '内部状態フラグが不正です'
                );
            }
            
        } catch (error) {
            this.addTestResult('OpenCV.js利用可能性', false, `エラー: ${error.message}`);
        }
    }

    /**
     * デフォルト四隅座標の生成テスト
     */
    async testDefaultCorners(perspectiveCorrection) {
        try {
            const testCases = [
                { width: 800, height: 600 },
                { width: 1920, height: 1080 },
                { width: 100, height: 100 }
            ];

            for (const testCase of testCases) {
                const corners = perspectiveCorrection.getDefaultCorners(testCase.width, testCase.height);
                
                // 4つの角があることを確認
                if (corners.length !== 4) {
                    this.addTestResult(
                        `デフォルト四隅 (${testCase.width}x${testCase.height})`, 
                        false, 
                        `角の数が不正: ${corners.length}`
                    );
                    continue;
                }

                // 各角が画像範囲内にあることを確認
                const isValid = corners.every(corner => 
                    corner.x >= 0 && corner.x <= testCase.width &&
                    corner.y >= 0 && corner.y <= testCase.height
                );

                // マージンが適切に設定されていることを確認
                const expectedMargin = Math.min(testCase.width, testCase.height) * 0.1;
                const actualMargin = Math.min(corners[0].x, corners[0].y);
                const marginIsCorrect = Math.abs(actualMargin - expectedMargin) < 1;

                if (isValid && marginIsCorrect) {
                    this.addTestResult(
                        `デフォルト四隅 (${testCase.width}x${testCase.height})`, 
                        true, 
                        `正しい四隅座標が生成されました (マージン: ${actualMargin.toFixed(1)})`
                    );
                } else {
                    this.addTestResult(
                        `デフォルト四隅 (${testCase.width}x${testCase.height})`, 
                        false, 
                        `座標が不正: 範囲内=${isValid}, マージン正確=${marginIsCorrect}`
                    );
                }
            }
            
        } catch (error) {
            this.addTestResult('デフォルト四隅', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 四隅座標のソート機能テスト
     */
    async testCornerSorting(perspectiveCorrection) {
        try {
            // テスト用の四隅座標（時計回りでない順序）
            const unsortedCorners = [
                { x: 100, y: 300 }, // 左下
                { x: 100, y: 100 }, // 左上
                { x: 300, y: 300 }, // 右下
                { x: 300, y: 100 }  // 右上
            ];

            const sortedCorners = perspectiveCorrection.sortCorners(unsortedCorners);

            // 時計回りに並んでいることを確認
            // 重心を計算
            const center = {
                x: sortedCorners.reduce((sum, p) => sum + p.x, 0) / 4,
                y: sortedCorners.reduce((sum, p) => sum + p.y, 0) / 4
            };

            // 各点の角度を計算
            const angles = sortedCorners.map(corner => 
                Math.atan2(corner.y - center.y, corner.x - center.x)
            );

            // 角度が昇順（時計回り）になっているかチェック
            let isClockwise = true;
            for (let i = 1; i < angles.length; i++) {
                if (angles[i] < angles[i - 1]) {
                    // 角度が-πから+πの範囲で折り返す場合を考慮
                    if (!(angles[i - 1] > Math.PI / 2 && angles[i] < -Math.PI / 2)) {
                        isClockwise = false;
                        break;
                    }
                }
            }

            if (isClockwise && sortedCorners.length === 4) {
                this.addTestResult(
                    '四隅座標ソート', 
                    true, 
                    '四隅が時計回りに正しくソートされました'
                );
            } else {
                this.addTestResult(
                    '四隅座標ソート', 
                    false, 
                    `ソート結果が不正: 時計回り=${isClockwise}, 座標数=${sortedCorners.length}`
                );
            }
            
        } catch (error) {
            this.addTestResult('四隅座標ソート', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 距離計算のテスト
     */
    async testDistanceCalculation(perspectiveCorrection) {
        try {
            const testCases = [
                { p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 }, expected: 5 },      // 3-4-5三角形
                { p1: { x: 0, y: 0 }, p2: { x: 0, y: 10 }, expected: 10 },     // 垂直線
                { p1: { x: 0, y: 0 }, p2: { x: 10, y: 0 }, expected: 10 },     // 水平線
                { p1: { x: 1, y: 1 }, p2: { x: 1, y: 1 }, expected: 0 }        // 同じ点
            ];

            for (const testCase of testCases) {
                const actualDistance = perspectiveCorrection.distance(testCase.p1, testCase.p2);
                const isCorrect = Math.abs(actualDistance - testCase.expected) < 0.001;

                if (isCorrect) {
                    this.addTestResult(
                        `距離計算 (${testCase.p1.x},${testCase.p1.y})-(${testCase.p2.x},${testCase.p2.y})`, 
                        true, 
                        `正しい距離: ${actualDistance.toFixed(3)}`
                    );
                } else {
                    this.addTestResult(
                        `距離計算 (${testCase.p1.x},${testCase.p1.y})-(${testCase.p2.x},${testCase.p2.y})`, 
                        false, 
                        `期待値: ${testCase.expected}, 実際: ${actualDistance.toFixed(3)}`
                    );
                }
            }
            
        } catch (error) {
            this.addTestResult('距離計算', false, `エラー: ${error.message}`);
        }
    }

    /**
     * 透視補正処理のテスト（OpenCV.js利用時）
     */
    async testPerspectiveCorrectionProcess(perspectiveCorrection) {
        try {
            // テスト用の画像を作成
            const testImage = await this.createTestImageElement();
            
            // テスト用の四隅座標
            const corners = [
                { x: 50, y: 50 },
                { x: 250, y: 60 },
                { x: 240, y: 190 },
                { x: 60, y: 180 }
            ];

            // 透視補正を実行
            const correctedImage = await perspectiveCorrection.correctPerspective(testImage, corners);

            if (correctedImage instanceof HTMLImageElement) {
                this.addTestResult(
                    '透視補正処理', 
                    true, 
                    `補正画像が生成されました (${correctedImage.width}x${correctedImage.height})`
                );

                // 補正後の画像サイズが妥当かチェック
                const expectedWidth = perspectiveCorrection.distance(corners[0], corners[1]);
                const expectedHeight = perspectiveCorrection.distance(corners[1], corners[2]);
                
                const sizeIsReasonable = 
                    Math.abs(correctedImage.width - expectedWidth) < expectedWidth * 0.1 &&
                    Math.abs(correctedImage.height - expectedHeight) < expectedHeight * 0.1;

                if (sizeIsReasonable) {
                    this.addTestResult(
                        '透視補正サイズ', 
                        true, 
                        `補正後のサイズが適切です`
                    );
                } else {
                    this.addTestResult(
                        '透視補正サイズ', 
                        false, 
                        `サイズが不適切: 期待値≈${expectedWidth.toFixed(0)}x${expectedHeight.toFixed(0)}, 実際: ${correctedImage.width}x${correctedImage.height}`
                    );
                }
            } else {
                this.addTestResult(
                    '透視補正処理', 
                    false, 
                    '補正画像の生成に失敗しました'
                );
            }
            
        } catch (error) {
            this.addTestResult('透視補正処理', false, `エラー: ${error.message}`);
        }
    }

    /**
     * エラーハンドリングのテスト
     */
    async testErrorHandling() {
        console.log('📋 エラーハンドリングテスト...');
        
        try {
            // EXIFReader のエラーハンドリング
            await this.testEXIFErrorHandling();
            
            // PerspectiveCorrection のエラーハンドリング
            await this.testPerspectiveErrorHandling();
            
        } catch (error) {
            this.addTestResult('エラーハンドリング', false, `テスト実行エラー: ${error.message}`);
        }
    }

    /**
     * EXIFReaderのエラーハンドリングテスト
     */
    async testEXIFErrorHandling() {
        try {
            // null/undefinedファイルの処理
            try {
                const result = await EXIFReader.readEXIF(null);
                this.addTestResult(
                    'EXIF nullファイル処理', 
                    result.orientation === 1, 
                    'nullファイルでもデフォルト値が返されました'
                );
            } catch (error) {
                this.addTestResult(
                    'EXIF nullファイル処理', 
                    true, 
                    'nullファイルで適切にエラーハンドリングされました'
                );
            }

            // 空のファイルの処理
            const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
            const emptyResult = await EXIFReader.readEXIF(emptyFile);
            
            this.addTestResult(
                'EXIF 空ファイル処理', 
                emptyResult.orientation === 1, 
                '空ファイルでもデフォルト値が返されました'
            );

            // 巨大ファイルの処理（64KB制限のテスト）
            const largeData = new Uint8Array(100000).fill(0xFF);
            largeData[0] = 0xFF;
            largeData[1] = 0xD8; // JPEG header
            const largeFile = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
            
            const largeResult = await EXIFReader.readEXIF(largeFile);
            
            this.addTestResult(
                'EXIF 大容量ファイル処理', 
                largeResult.orientation === 1, 
                '大容量ファイルでも適切に処理されました'
            );

        } catch (error) {
            this.addTestResult('EXIFエラーハンドリング', false, `エラー: ${error.message}`);
        }
    }

    /**
     * PerspectiveCorrectionのエラーハンドリングテスト
     */
    async testPerspectiveErrorHandling() {
        try {
            const perspectiveCorrection = new PerspectiveCorrection();

            // OpenCV.jsが利用できない場合のテスト
            const originalCV = window.cv;
            window.cv = undefined;

            try {
                await perspectiveCorrection.detectRectangle(await this.createTestImageElement());
                this.addTestResult(
                    '透視補正 OpenCV未利用', 
                    false, 
                    'OpenCV.js未利用時にエラーが発生すべきでした'
                );
            } catch (error) {
                this.addTestResult(
                    '透視補正 OpenCV未利用', 
                    true, 
                    'OpenCV.js未利用時に適切にエラーが発生しました'
                );
            }

            // OpenCV.jsを復元
            window.cv = originalCV;

            // 不正な四隅座標での透視補正テスト
            if (typeof cv !== 'undefined' && cv.Mat) {
                try {
                    const testImage = await this.createTestImageElement();
                    const invalidCorners = [
                        { x: 0, y: 0 },
                        { x: 0, y: 0 },  // 重複座標
                        { x: 0, y: 0 },
                        { x: 0, y: 0 }
                    ];

                    await perspectiveCorrection.correctPerspective(testImage, invalidCorners);
                    this.addTestResult(
                        '透視補正 不正座標', 
                        false, 
                        '不正座標でエラーが発生すべきでした'
                    );
                } catch (error) {
                    this.addTestResult(
                        '透視補正 不正座標', 
                        true, 
                        '不正座標で適切にエラーが発生しました'
                    );
                }
            }

        } catch (error) {
            this.addTestResult('透視補正エラーハンドリング', false, `エラー: ${error.message}`);
        }
    }

    /**
     * テスト用のEXIF付き画像データを作成
     */
    async createTestImageWithEXIF(orientation) {
        // 簡単なJPEGヘッダーとEXIFデータを作成
        const exifData = new Uint8Array([
            0xFF, 0xD8, // JPEG SOI
            0xFF, 0xE1, // APP1 marker
            0x00, 0x16, // APP1 length (22 bytes)
            0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
            0x49, 0x49, // Little endian
            0x2A, 0x00, // TIFF magic
            0x08, 0x00, 0x00, 0x00, // IFD offset
            0x01, 0x00, // Number of entries
            0x12, 0x01, // Orientation tag
            0x03, 0x00, // SHORT type
            0x01, 0x00, 0x00, 0x00, // Count = 1
            orientation, 0x00, 0x00, 0x00, // Orientation value
            0x00, 0x00, 0x00, 0x00, // Next IFD offset
            0xFF, 0xD9  // JPEG EOI
        ]);

        return exifData;
    }

    /**
     * 透視補正テスト用の画像を作成
     */
    async createPerspectiveTestImage() {
        // 簡単な矩形を含む画像データ（実際の実装では実際の画像データが必要）
        return new Uint8Array([
            0xFF, 0xD8, // JPEG SOI
            0xFF, 0xDA, // Start of Scan
            0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00,
            0xFF, 0xD9  // JPEG EOI
        ]);
    }

    /**
     * テスト用のHTMLImageElementを作成
     */
    async createTestImageElement() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 200;
            
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 300, 200);
            
            // テスト用の矩形を描画
            ctx.fillStyle = '#000000';
            ctx.fillRect(50, 50, 200, 100);
            
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = canvas.toDataURL('image/jpeg', 0.9);
        });
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
        
        console.log('\n📊 画像前処理テスト結果サマリー');
        console.log(`合格: ${passedTests}/${totalTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (passedTests === totalTests) {
            console.log('🎉 すべての画像前処理テストに合格しました！');
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
        const existingResults = document.getElementById('image-preprocessing-test-results');
        if (existingResults) {
            existingResults.remove();
        }

        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'image-preprocessing-test-results';
        resultsContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 450px;
            max-height: 80vh;
            overflow-y: auto;
            background: white;
            border: 2px solid #059669;
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
                <h3 style="margin: 0; color: #059669;">画像前処理テスト結果</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <div style="margin-bottom: 12px; padding: 8px; background: ${passedTests === totalTests ? '#dcfce7' : '#fef3c7'}; border-radius: 4px;">
                <strong>${passedTests}/${totalTests} 合格 (${((passedTests / totalTests) * 100).toFixed(1)}%)</strong>
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${this.testResults.map(result => `
                    <div style="margin-bottom: 8px; padding: 6px; background: ${result.passed ? '#f0fdf4' : '#fef2f2'}; border-radius: 4px; border-left: 3px solid ${result.passed ? '#059669' : '#dc2626'};">
                        <div style="font-weight: bold; color: ${result.passed ? '#059669' : '#dc2626'};">
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
window.ImagePreprocessingTests = ImagePreprocessingTests;

// 自動実行（オプション）
if (window.location.search.includes('run-image-tests')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const tests = new ImagePreprocessingTests();
        await tests.runAllTests();
    });
}

console.log('画像前処理テストが読み込まれました。window.ImagePreprocessingTests でアクセスできます。');
console.log('テストを実行するには: new ImagePreprocessingTests().runAllTests()');