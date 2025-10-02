/**
 * フィールド抽出エンジン
 * OCR結果から領収書の4項目（日付・支払先・金額・適用）を抽出・正規化する
 */
class FieldExtractor {
    constructor() {
        // 和暦変換テーブル
        this.eraConversions = {
            '令和': { startYear: 2019, maxYear: 99, abbrev: ['令', 'R'] }, // 現在進行中
            '平成': { startYear: 1989, maxYear: 31, abbrev: ['平', 'H'] }, // 1989-2019 (31年間)
            '昭和': { startYear: 1926, maxYear: 64, abbrev: ['昭', 'S'] }, // 1926-1989 (64年間)
            '大正': { startYear: 1912, maxYear: 15, abbrev: ['大', 'T'] }  // 1912-1926 (15年間)
        };

        // 日付パターン（正規表現）
        this.datePatterns = [
            // 西暦パターン
            /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})[日]?/,
            /(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
            
            // 和暦パターン
            /(令和|平成|昭和|大正|令|平|昭|大|R|H|S|T)(\d{1,2})[年]?[\/\-]?(\d{1,2})[月]?[\/\-]?(\d{1,2})[日]?/,
            
            // 月日のみ
            /(\d{1,2})[月\/\-](\d{1,2})[日]?/
        ];

        // 金額パターン
        this.amountPatterns = [
            /¥\s*(\d{1,3}(?:,\d{3})*)/,
            /(\d{1,3}(?:,\d{3})*)\s*円/,
            /(\d+)\s*円/,
            /¥\s*(\d+)/,
            /(\d{1,3}(?:,\d{3})*)/
        ];

        // 金額近傍キーワード（重み付け）
        this.amountKeywords = {
            '合計': 1.0,
            '税込': 0.9,
            'お会計': 0.9,
            '総額': 0.8,
            '小計': 0.7,
            '計': 0.6,
            '金額': 0.5
        };

        // 企業語尾パターン
        this.companyPatterns = [
            /(.+)(株式会社|有限会社|合同会社|合資会社)/,
            /(.+)(店|商店|薬局|堂|院|館|屋)/,
            /(株式会社|有限会社|合同会社|合資会社)(.+)/
        ];
    }

    /**
     * OCR結果から構造化データを抽出
     * @param {Array} textBlocks - OCR結果のテキストブロック配列
     * @returns {Object} 抽出された領収書データ
     */
    async extractFields(textBlocks) {
        // 入力データの検証
        if (!textBlocks || !Array.isArray(textBlocks)) {
            console.warn('Invalid textBlocks provided, using empty array');
            textBlocks = [];
        }

        // 不正なブロックをフィルタリング
        const validBlocks = textBlocks.filter(block => 
            block && 
            typeof block === 'object' && 
            typeof block.text === 'string' && 
            block.text.trim().length > 0
        );

        const result = {
            date: this.extractDate(validBlocks),
            amount: this.extractAmount(validBlocks),
            payee: this.extractPayee(validBlocks),
            purpose: this.extractPurpose(validBlocks)
        };

        return result;
    }

    /**
     * 日付の抽出と正規化
     * @param {Array} textBlocks - テキストブロック配列
     * @returns {Object} 日付フィールドデータ
     */
    extractDate(textBlocks) {
        const candidates = [];
        const currentYear = new Date().getFullYear();

        if (!Array.isArray(textBlocks)) {
            return {
                value: '',
                confidence: 0,
                candidates: []
            };
        }

        for (const block of textBlocks) {
            if (!block || !block.text) continue;
            
            const text = block.text;
            
            for (const pattern of this.datePatterns) {
                try {
                    const match = text.match(pattern);
                    if (match) {
                        const normalizedDate = this.normalizeDate(match, currentYear);
                        if (normalizedDate) {
                            candidates.push({
                                value: normalizedDate,
                                confidence: this.calculateDateConfidence(match, block),
                                boundingBox: block.boundingBox || null,
                                originalText: match[0]
                            });
                        }
                    }
                } catch (error) {
                    console.warn('Date pattern matching error:', error);
                    continue;
                }
            }
        }

        // 信頼度でソート
        candidates.sort((a, b) => b.confidence - a.confidence);

        return {
            value: candidates.length > 0 ? candidates[0].value : '',
            confidence: candidates.length > 0 ? candidates[0].confidence : 0,
            candidates: candidates.slice(0, 3) // 上位3候補
        };
    }

    /**
     * 日付の正規化処理
     * @param {Array} match - 正規表現マッチ結果
     * @param {number} currentYear - 現在年
     * @returns {string} YYYY/MM/DD形式の日付
     */
    normalizeDate(match, currentYear) {
        try {
            // 和暦パターンの処理
            if (match[1] && this.isEraName(match[1])) {
                const era = this.getEraInfo(match[1]);
                if (era) {
                    const eraYear = parseInt(match[2]);
                    const month = parseInt(match[3]);
                    const day = parseInt(match[4]);
                    
                    // 0年は無効
                    if (eraYear === 0) {
                        return null;
                    }
                    
                    const westernYear = era.startYear + eraYear - 1;
                    
                    // 元号の有効期間をチェック
                    if (this.isValidEraYear(match[1], eraYear) && this.isValidDate(westernYear, month, day)) {
                        return `${westernYear}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                    }
                }
            }
            // 西暦4桁パターン
            else if (match[1] && match[1].length === 4) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                
                if (this.isValidDate(year, month, day)) {
                    return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                }
            }
            // 西暦2桁パターン
            else if (match[1] && match[1].length === 2) {
                let year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                
                // 2桁年の場合、現在年を基準に判定
                if (year < 50) {
                    year += 2000;
                } else {
                    year += 1900;
                }
                
                if (this.isValidDate(year, month, day)) {
                    return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                }
            }
            // 月日のみパターン
            else if (match[1] && match[2] && !match[3]) {
                const month = parseInt(match[1]);
                const day = parseInt(match[2]);
                
                if (this.isValidDate(currentYear, month, day)) {
                    return `${currentYear}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                }
            }
        } catch (error) {
            console.warn('Date normalization error:', error);
        }
        
        return null;
    }

    /**
     * 和暦名の判定
     * @param {string} text - テキスト
     * @returns {boolean} 和暦名かどうか
     */
    isEraName(text) {
        for (const era in this.eraConversions) {
            if (text === era || this.eraConversions[era].abbrev.includes(text)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 和暦情報の取得
     * @param {string} text - 和暦テキスト
     * @returns {Object} 和暦情報
     */
    getEraInfo(text) {
        for (const era in this.eraConversions) {
            if (text === era || this.eraConversions[era].abbrev.includes(text)) {
                return this.eraConversions[era];
            }
        }
        return null;
    }

    /**
     * 元号年の有効性チェック
     * @param {string} eraName - 元号名
     * @param {number} eraYear - 元号年
     * @returns {boolean} 有効な元号年かどうか
     */
    isValidEraYear(eraName, eraYear) {
        const era = this.getEraInfo(eraName);
        if (!era) return false;
        
        // 元年（1年）から最大年まで
        return eraYear >= 1 && eraYear <= era.maxYear;
    }

    /**
     * 日付の妥当性チェック
     * @param {number} year - 年
     * @param {number} month - 月
     * @param {number} day - 日
     * @returns {boolean} 妥当な日付かどうか
     */
    isValidDate(year, month, day) {
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
     * 日付の信頼度計算
     * @param {Array} match - マッチ結果
     * @param {Object} block - テキストブロック
     * @returns {number} 信頼度 (0-1)
     */
    calculateDateConfidence(match, block) {
        let confidence = 0.5;
        
        // 完全な日付形式の場合は高い信頼度
        if (match[0].includes('年') && match[0].includes('月') && match[0].includes('日')) {
            confidence += 0.3;
        }
        
        // 和暦の場合は信頼度を上げる
        if (this.isEraName(match[1])) {
            confidence += 0.2;
        }
        
        // 位置による調整（上部にある場合は信頼度を上げる）
        if (block.boundingBox && block.boundingBox.y < 0.3) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 金額の抽出とスコアリング
     * @param {Array} textBlocks - テキストブロック配列
     * @returns {Object} 金額フィールドデータ
     */
    extractAmount(textBlocks) {
        const candidates = [];
        const seenTexts = new Set(); // 重複除去用

        if (!Array.isArray(textBlocks)) {
            return {
                value: 0,
                confidence: 0,
                candidates: []
            };
        }

        for (const block of textBlocks) {
            if (!block || !block.text) continue;
            
            const text = block.text;
            
            // 既に処理済みのテキストはスキップ
            if (seenTexts.has(text)) continue;
            seenTexts.add(text);
            
            for (const pattern of this.amountPatterns) {
                try {
                    const match = text.match(pattern);
                    if (match) {
                        const amount = this.normalizeAmount(match[1]);
                        if (amount > 0) {
                            const confidence = this.calculateAmountConfidence(text, block, textBlocks);
                            candidates.push({
                                value: amount,
                                confidence: confidence,
                                boundingBox: block.boundingBox || null,
                                originalText: match[0],
                                fullText: text
                            });
                            break; // 最初にマッチしたパターンのみ使用
                        }
                    }
                } catch (error) {
                    console.warn('Amount pattern matching error:', error);
                    continue;
                }
            }
        }

        // 信頼度でソート（同じ信頼度の場合は金額の大きい順）
        candidates.sort((a, b) => {
            if (Math.abs(a.confidence - b.confidence) < 0.01) {
                return b.value - a.value;
            }
            return b.confidence - a.confidence;
        });

        return {
            value: candidates.length > 0 ? candidates[0].value : 0,
            confidence: candidates.length > 0 ? candidates[0].confidence : 0,
            candidates: candidates.slice(0, 3)
        };
    }

    /**
     * 金額の正規化
     * @param {string} amountText - 金額テキスト
     * @returns {number} 整数値の金額
     */
    normalizeAmount(amountText) {
        if (!amountText) return 0;
        
        // カンマを除去して数値に変換
        const cleanText = amountText.replace(/,/g, '');
        const amount = parseInt(cleanText);
        
        // 負の金額や無効な値は0を返す
        return isNaN(amount) || amount < 0 ? 0 : amount;
    }

    /**
     * 金額の信頼度計算
     * @param {string} text - テキスト
     * @param {Object} block - テキストブロック
     * @param {Array} allBlocks - 全テキストブロック
     * @returns {number} 信頼度 (0-1)
     */
    calculateAmountConfidence(text, block, allBlocks) {
        let confidence = 0.3;
        
        // 金額記号がある場合
        if (text.includes('¥') || text.includes('円')) {
            confidence += 0.2;
        }
        
        // テキスト内にキーワードが含まれている場合の直接チェック
        let directKeywordScore = 0;
        for (const keyword in this.amountKeywords) {
            if (text.includes(keyword)) {
                directKeywordScore = Math.max(directKeywordScore, this.amountKeywords[keyword]);
            }
        }
        
        // 近傍キーワードによる重み付け
        const nearbyKeywordScore = this.findNearbyKeywords(block, allBlocks, this.amountKeywords);
        
        // 直接キーワードと近傍キーワードの最大値を使用
        const keywordScore = Math.max(directKeywordScore, nearbyKeywordScore);
        confidence += keywordScore * 0.5;
        
        // 3桁区切りカンマがある場合
        if (text.includes(',')) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 支払先の推定
     * @param {Array} textBlocks - テキストブロック配列
     * @returns {Object} 支払先フィールドデータ
     */
    extractPayee(textBlocks) {
        const candidates = [];

        if (!Array.isArray(textBlocks)) {
            return {
                value: '',
                confidence: 0,
                candidates: []
            };
        }

        for (const block of textBlocks) {
            if (!block || !block.text) continue;
            
            const text = block.text.trim();
            if (text.length < 2) continue;

            try {
                // 企業語尾パターンのチェック
                for (const pattern of this.companyPatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        const confidence = this.calculatePayeeConfidence(text, block);
                        candidates.push({
                            value: text,
                            confidence: confidence,
                            boundingBox: block.boundingBox || null,
                            originalText: text
                        });
                        break;
                    }
                }

                // 位置とフォントサイズによる推定
                if (this.isPotentialPayee(text, block)) {
                    const confidence = this.calculatePayeeConfidence(text, block);
                    candidates.push({
                        value: text,
                        confidence: confidence,
                        boundingBox: block.boundingBox || null,
                        originalText: text
                    });
                }
            } catch (error) {
                console.warn('Payee pattern matching error:', error);
                continue;
            }
        }

        // 信頼度でソート
        candidates.sort((a, b) => b.confidence - a.confidence);

        return {
            value: candidates.length > 0 ? candidates[0].value : '',
            confidence: candidates.length > 0 ? candidates[0].confidence : 0,
            candidates: candidates.slice(0, 3)
        };
    }

    /**
     * 支払先候補の判定
     * @param {string} text - テキスト
     * @param {Object} block - テキストブロック
     * @returns {boolean} 支払先候補かどうか
     */
    isPotentialPayee(text, block) {
        // 短すぎるテキストは除外
        if (text.length < 3) return false;
        
        // 数字のみは除外
        if (/^\d+$/.test(text)) return false;
        
        // 日付パターンは除外
        for (const pattern of this.datePatterns) {
            if (pattern.test(text)) return false;
        }
        
        // 金額パターンは除外
        for (const pattern of this.amountPatterns) {
            if (pattern.test(text)) return false;
        }
        
        // 企業語尾がある場合のみ支払先候補とする
        for (const pattern of this.companyPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        
        // 企業語尾がない場合は、位置とフォントサイズで判定
        if (block.boundingBox && block.boundingBox.y < 0.3 && block.fontSize && block.fontSize > 16) {
            return true;
        }
        
        return false;
    }

    /**
     * 支払先の信頼度計算
     * @param {string} text - テキスト
     * @param {Object} block - テキストブロック
     * @returns {number} 信頼度 (0-1)
     */
    calculatePayeeConfidence(text, block) {
        let confidence = 0.3;
        
        // 企業語尾がある場合
        for (const pattern of this.companyPatterns) {
            if (pattern.test(text)) {
                confidence += 0.4;
                break;
            }
        }
        
        // 位置による調整（上部にある場合は信頼度を上げる）
        if (block.boundingBox && block.boundingBox.y < 0.4) {
            confidence += 0.3; // 位置の重要度を上げる
        }
        
        // フォントサイズによる調整（大きい場合は信頼度を上げる）
        if (block.fontSize && block.fontSize > 16) {
            confidence += 0.2; // フォントサイズの重要度を上げる
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 適用項目の要約
     * @param {Array} textBlocks - テキストブロック配列
     * @returns {Object} 適用フィールドデータ
     */
    extractPurpose(textBlocks) {
        if (!Array.isArray(textBlocks)) {
            return {
                value: '',
                confidence: 0,
                candidates: []
            };
        }

        try {
            // 明細行の抽出
            const itemLines = this.extractItemLines(textBlocks);
            
            // 名詞句の抽出
            const nouns = this.extractNouns(itemLines);
            
            // TF-IDFスコアによる重要語句選択
            const importantTerms = this.selectImportantTerms(nouns);
            
            // 要約生成
            const summary = this.generateSummary(importantTerms);
            
            return {
                value: summary,
                confidence: summary ? 0.7 : 0,
                candidates: summary ? [{ value: summary, confidence: 0.7, originalText: itemLines.join(' ') }] : []
            };
        } catch (error) {
            console.warn('Purpose extraction error:', error);
            return {
                value: '',
                confidence: 0,
                candidates: []
            };
        }
    }

    /**
     * 明細行の抽出
     * @param {Array} textBlocks - テキストブロック配列
     * @returns {Array} 明細行テキスト配列
     */
    extractItemLines(textBlocks) {
        const itemLines = [];
        
        if (!Array.isArray(textBlocks)) {
            return itemLines;
        }
        
        for (const block of textBlocks) {
            if (!block || !block.text) continue;
            
            const text = block.text.trim();
            
            // 金額や日付は除外
            if (this.isAmountOrDate(text)) continue;
            
            // 短すぎるテキストは除外
            if (text.length < 2) continue;
            
            // 中央部分の行を優先（明細行は通常中央部にある）
            if (block.boundingBox && 
                block.boundingBox.y > 0.3 && 
                block.boundingBox.y < 0.8) {
                itemLines.push(text);
            }
        }
        
        return itemLines;
    }

    /**
     * 金額または日付の判定
     * @param {string} text - テキスト
     * @returns {boolean} 金額または日付かどうか
     */
    isAmountOrDate(text) {
        // 金額パターンのチェック
        for (const pattern of this.amountPatterns) {
            if (pattern.test(text)) return true;
        }
        
        // 日付パターンのチェック
        for (const pattern of this.datePatterns) {
            if (pattern.test(text)) return true;
        }
        
        return false;
    }

    /**
     * 名詞句の抽出
     * @param {Array} itemLines - 明細行配列
     * @returns {Array} 名詞句配列
     */
    extractNouns(itemLines) {
        const nouns = [];
        
        // 簡易的な名詞抽出（日本語の特徴を利用）
        const nounPatterns = [
            /([ぁ-んァ-ヶー一-龠]+)/g, // ひらがな・カタカナ・漢字
            /([A-Za-z]+)/g // アルファベット
        ];
        
        for (const line of itemLines) {
            for (const pattern of nounPatterns) {
                const matches = line.match(pattern);
                if (matches) {
                    nouns.push(...matches.filter(match => match.length >= 2));
                }
            }
        }
        
        return nouns;
    }

    /**
     * 重要語句の選択（簡易TF-IDF）
     * @param {Array} nouns - 名詞配列
     * @returns {Array} 重要語句配列
     */
    selectImportantTerms(nouns) {
        // 語句の出現頻度を計算
        const termFreq = {};
        for (const noun of nouns) {
            termFreq[noun] = (termFreq[noun] || 0) + 1;
        }
        
        // 頻度でソートして上位を選択
        const sortedTerms = Object.entries(termFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);
        
        return sortedTerms;
    }

    /**
     * 要約の生成
     * @param {Array} importantTerms - 重要語句配列
     * @returns {string} 要約文
     */
    generateSummary(importantTerms) {
        if (importantTerms.length === 0) return '';
        
        // 簡単な要約生成
        if (importantTerms.length === 1) {
            return importantTerms[0];
        } else if (importantTerms.length === 2) {
            return importantTerms.join('・');
        } else {
            return importantTerms.slice(0, 2).join('・') + '等';
        }
    }

    /**
     * 近傍キーワードの検索
     * @param {Object} targetBlock - 対象ブロック
     * @param {Array} allBlocks - 全ブロック
     * @param {Object} keywords - キーワード辞書
     * @returns {number} 最大スコア
     */
    findNearbyKeywords(targetBlock, allBlocks, keywords) {
        let maxScore = 0;
        const threshold = 0.1; // 近傍判定の閾値
        
        for (const block of allBlocks) {
            // 距離計算
            const distance = this.calculateDistance(targetBlock.boundingBox, block.boundingBox);
            if (distance > threshold) continue;
            
            // キーワードマッチング
            for (const keyword in keywords) {
                if (block.text.includes(keyword)) {
                    maxScore = Math.max(maxScore, keywords[keyword]);
                }
            }
        }
        
        return maxScore;
    }

    /**
     * バウンディングボックス間の距離計算
     * @param {Object} box1 - バウンディングボックス1
     * @param {Object} box2 - バウンディングボックス2
     * @returns {number} 距離
     */
    calculateDistance(box1, box2) {
        if (!box1 || !box2 || 
            typeof box1.x !== 'number' || typeof box1.y !== 'number' ||
            typeof box2.x !== 'number' || typeof box2.y !== 'number') {
            return Infinity;
        }
        
        const dx = Math.abs(box1.x - box2.x);
        const dy = Math.abs(box1.y - box2.y);
        
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldExtractor;
} else if (typeof window !== 'undefined') {
    window.FieldExtractor = FieldExtractor;
}