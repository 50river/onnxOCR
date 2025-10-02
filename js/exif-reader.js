/**
 * EXIF情報読み取りユーティリティ
 * 軽量なEXIF読み取り実装（Orientationタグのみ対応）
 */

class EXIFReader {
    /**
     * ファイルからEXIF情報を読み取り
     * @param {File} file - 画像ファイル
     * @returns {Promise<Object>} EXIF情報
     */
    static async readEXIF(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const dataView = new DataView(arrayBuffer);
                    const exifData = this.parseEXIF(dataView);
                    resolve(exifData);
                } catch (error) {
                    // EXIF読み取りエラーは致命的ではないので、デフォルト値を返す
                    resolve({ orientation: 1 });
                }
            };
            
            reader.onerror = () => {
                resolve({ orientation: 1 });
            };
            
            // ファイルの最初の64KBのみ読み取り（EXIFは通常この範囲内）
            const blob = file.slice(0, 65536);
            reader.readAsArrayBuffer(blob);
        });
    }

    /**
     * EXIF情報の解析
     * @param {DataView} dataView - ファイルデータ
     * @returns {Object} EXIF情報
     */
    static parseEXIF(dataView) {
        // JPEG形式の確認
        if (dataView.getUint16(0) !== 0xFFD8) {
            return { orientation: 1 }; // JPEG以外はそのまま
        }

        let offset = 2;
        let marker;
        
        // APP1セグメント（EXIF）を探す
        while (offset < dataView.byteLength) {
            marker = dataView.getUint16(offset);
            
            if (marker === 0xFFE1) { // APP1マーカー
                return this.parseAPP1Segment(dataView, offset);
            }
            
            if (marker === 0xFFDA) { // Start of Scan - これ以降はEXIFなし
                break;
            }
            
            // 次のセグメントへ
            offset += 2 + dataView.getUint16(offset + 2);
        }
        
        return { orientation: 1 };
    }

    /**
     * APP1セグメント（EXIF）の解析
     * @param {DataView} dataView - ファイルデータ
     * @param {number} offset - APP1セグメントの開始位置
     * @returns {Object} EXIF情報
     */
    static parseAPP1Segment(dataView, offset) {
        const segmentLength = dataView.getUint16(offset + 2);
        const segmentStart = offset + 4;
        
        // "Exif\0\0" 識別子の確認
        if (dataView.getUint32(segmentStart) !== 0x45786966 || 
            dataView.getUint16(segmentStart + 4) !== 0x0000) {
            return { orientation: 1 };
        }
        
        const tiffStart = segmentStart + 6;
        
        // TIFFヘッダーの解析
        const byteOrder = dataView.getUint16(tiffStart);
        const isLittleEndian = byteOrder === 0x4949;
        
        if (!isLittleEndian && byteOrder !== 0x4D4D) {
            return { orientation: 1 };
        }
        
        // IFD0の位置を取得
        const ifd0Offset = this.getUint32(dataView, tiffStart + 4, isLittleEndian);
        
        return this.parseIFD(dataView, tiffStart + ifd0Offset, tiffStart, isLittleEndian);
    }

    /**
     * IFD（Image File Directory）の解析
     * @param {DataView} dataView - ファイルデータ
     * @param {number} ifdOffset - IFDの開始位置
     * @param {number} tiffStart - TIFFヘッダーの開始位置
     * @param {boolean} isLittleEndian - エンディアン
     * @returns {Object} EXIF情報
     */
    static parseIFD(dataView, ifdOffset, tiffStart, isLittleEndian) {
        const entryCount = this.getUint16(dataView, ifdOffset, isLittleEndian);
        
        for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdOffset + 2 + (i * 12);
            const tag = this.getUint16(dataView, entryOffset, isLittleEndian);
            
            // Orientationタグ（0x0112）を探す
            if (tag === 0x0112) {
                const type = this.getUint16(dataView, entryOffset + 2, isLittleEndian);
                const count = this.getUint32(dataView, entryOffset + 4, isLittleEndian);
                
                if (type === 3 && count === 1) { // SHORT型、1個
                    const orientation = this.getUint16(dataView, entryOffset + 8, isLittleEndian);
                    return { orientation };
                }
            }
        }
        
        return { orientation: 1 };
    }

    /**
     * エンディアンを考慮したUint16読み取り
     */
    static getUint16(dataView, offset, isLittleEndian) {
        return dataView.getUint16(offset, isLittleEndian);
    }

    /**
     * エンディアンを考慮したUint32読み取り
     */
    static getUint32(dataView, offset, isLittleEndian) {
        return dataView.getUint32(offset, isLittleEndian);
    }

    /**
     * Orientation値から回転角度を取得
     * @param {number} orientation - EXIF Orientation値
     * @returns {number} 回転角度（度）
     */
    static getRotationAngle(orientation) {
        switch (orientation) {
            case 1: return 0;   // 正常
            case 3: return 180; // 180度回転
            case 6: return 90;  // 時計回りに90度回転
            case 8: return 270; // 反時計回りに90度回転
            case 2: return 0;   // 水平反転（回転なし）
            case 4: return 180; // 垂直反転 + 180度回転
            case 5: return 270; // 水平反転 + 反時計回りに90度回転
            case 7: return 90;  // 水平反転 + 時計回りに90度回転
            default: return 0;
        }
    }

    /**
     * Orientation値から反転情報を取得
     * @param {number} orientation - EXIF Orientation値
     * @returns {Object} 反転情報
     */
    static getFlipInfo(orientation) {
        switch (orientation) {
            case 2: return { horizontal: true, vertical: false };   // 水平反転
            case 4: return { horizontal: false, vertical: true };   // 垂直反転
            case 5: return { horizontal: true, vertical: false };   // 水平反転 + 回転
            case 7: return { horizontal: true, vertical: false };   // 水平反転 + 回転
            default: return { horizontal: false, vertical: false };
        }
    }
}

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EXIFReader;
} else {
    window.EXIFReader = EXIFReader;
}