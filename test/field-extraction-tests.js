/**
 * フィールド抽出機能のユニットテスト
 * 要件: 4.1, 4.2, 4.3, 4.4
 */

// テスト用のモックデータ（統合テスト用）
const mockReceiptBlocks = [
    {
        text: '令和5年12月15日',
        boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 },
        fontSize: 14
    },
    {
        text: '株式会社テストストア',
        boundingBox: { x: 0.1, y: 0.2, width: 0.4, height: 0.06 },
        fontSize: 18
    },
    {
        text: '合計 ¥1,500',
        boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 },
        fontSize: 16
    },
    {
        text: 'コーヒー',
        boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.04 },
        fontSize: 12
    },
    {
        text: 'サンドイッチ',
        boundingBox: { x: 0.1, y: 0.55, width: 0.25, height: 0.04 },
        fontSize: 12
    }
];

// テスト結果の統計
let testStats = {
    total: 0,
    passed: 0,
    failed: 0
};

/**
 * テスト結果の記録
 * @param {string} testName - テスト名
 * @param {boolean} passed - テスト結果
 * @param {string} message - メッセージ
 */
function recordTest(testName, passed, message = '') {
    testStats.total++;
    if (passed) {
        testStats.passed++;
        console.log(`✅ ${testName}: ${message}`);
    } else {
        testStats.failed++;
        console.log(`❌ ${testName}: ${message}`);
    }
}

/**
 * 日付変換の境界値テスト（元号境界年含む）
 * 要件: 4.1
 */
function testDateBoundaryValues() {
    console.log('\n=== 日付変換境界値テスト ===');
    
    const extractor = new FieldExtractor();
    
    // 元号境界年のテストケース（詳細な境界値テスト）
    const boundaryTestCases = [
        // 令和元年（2019年5月1日開始）
        { input: ['令和', '1', '5', '1'], expected: '2019/05/01', desc: '令和元年開始日' },
        { input: ['令', '1', '5', '1'], expected: '2019/05/01', desc: '令和元年開始日（略記）' },
        { input: ['R', '1', '5', '1'], expected: '2019/05/01', desc: '令和元年開始日（英略記）' },
        { input: ['令和', '1', '12', '31'], expected: '2019/12/31', desc: '令和元年末' },
        { input: ['令和', '6', '1', '1'], expected: '2024/01/01', desc: '令和6年（現在進行中）' },
        
        // 平成最終年（2019年4月30日まで）
        { input: ['平成', '31', '4', '30'], expected: '2019/04/30', desc: '平成最終日' },
        { input: ['平', '31', '4', '30'], expected: '2019/04/30', desc: '平成最終日（略記）' },
        { input: ['H', '31', '4', '30'], expected: '2019/04/30', desc: '平成最終日（英略記）' },
        { input: ['平成', '31', '1', '1'], expected: '2019/01/01', desc: '平成31年初' },
        
        // 平成元年（1989年1月8日開始）
        { input: ['平成', '1', '1', '8'], expected: '1989/01/08', desc: '平成元年開始日' },
        { input: ['平成', '1', '12', '31'], expected: '1989/12/31', desc: '平成元年末' },
        { input: ['平成', '2', '1', '1'], expected: '1990/01/01', desc: '平成2年初' },
        
        // 昭和最終年（1989年1月7日まで）
        { input: ['昭和', '64', '1', '7'], expected: '1989/01/07', desc: '昭和最終日' },
        { input: ['昭', '64', '1', '7'], expected: '1989/01/07', desc: '昭和最終日（略記）' },
        { input: ['S', '64', '1', '7'], expected: '1989/01/07', desc: '昭和最終日（英略記）' },
        { input: ['昭和', '64', '1', '1'], expected: '1989/01/01', desc: '昭和64年初' },
        { input: ['昭和', '63', '12', '31'], expected: '1988/12/31', desc: '昭和63年末' },
        
        // 昭和元年（1926年12月25日開始）
        { input: ['昭和', '1', '12', '25'], expected: '1926/12/25', desc: '昭和元年開始日' },
        { input: ['昭和', '1', '12', '31'], expected: '1926/12/31', desc: '昭和元年末' },
        
        // 大正最終年（1926年12月24日まで）
        { input: ['大正', '15', '12', '24'], expected: '1926/12/24', desc: '大正最終日' },
        { input: ['大', '15', '12', '24'], expected: '1926/12/24', desc: '大正最終日（略記）' },
        { input: ['T', '15', '12', '24'], expected: '1926/12/24', desc: '大正最終日（英略記）' },
        { input: ['大正', '15', '1', '1'], expected: '1926/01/01', desc: '大正15年初' },
        
        // 大正元年（1912年7月30日開始）
        { input: ['大正', '1', '7', '30'], expected: '1912/07/30', desc: '大正元年開始日' },
        { input: ['大正', '1', '12', '31'], expected: '1912/12/31', desc: '大正元年末' },
        
        // 境界値エラーケース（無効な年）
        { input: ['令和', '0', '1', '1'], expected: null, desc: '令和0年（無効）' },
        { input: ['平成', '32', '1', '1'], expected: null, desc: '平成32年（無効）' },
        { input: ['昭和', '65', '1', '1'], expected: null, desc: '昭和65年（無効）' },
        { input: ['大正', '16', '1', '1'], expected: null, desc: '大正16年（無効）' },
        { input: ['平成', '0', '1', '1'], expected: null, desc: '平成0年（無効）' },
        { input: ['昭和', '0', '1', '1'], expected: null, desc: '昭和0年（無効）' },
        { input: ['大正', '0', '1', '1'], expected: null, desc: '大正0年（無効）' },
        
        // 境界値エラーケース（無効な月日）
        { input: ['令和', '5', '13', '1'], expected: null, desc: '13月（無効）' },
        { input: ['令和', '5', '2', '30'], expected: null, desc: '2月30日（無効）' },
        { input: ['令和', '5', '4', '31'], expected: null, desc: '4月31日（無効）' },
        { input: ['令和', '5', '0', '1'], expected: null, desc: '0月（無効）' },
        { input: ['令和', '5', '1', '0'], expected: null, desc: '0日（無効）' },
        { input: ['令和', '5', '1', '32'], expected: null, desc: '32日（無効）' },
        
        // うるう年テスト
        { input: ['令和', '6', '2', '29'], expected: '2024/02/29', desc: '2024年2月29日（うるう年）' },
        { input: ['令和', '5', '2', '29'], expected: null, desc: '2023年2月29日（平年・無効）' }
    ];
    
    for (const testCase of boundaryTestCases) {
        // 正規表現マッチ結果をシミュレート
        const mockMatch = [
            testCase.input.join(''), // 全体マッチ
            testCase.input[0], // 元号
            testCase.input[1], // 年
            testCase.input[2], // 月
            testCase.input[3]  // 日
        ];
        const result = extractor.normalizeDate(mockMatch, 2023);
        const passed = result === testCase.expected;
        recordTest(
            `境界値テスト: ${testCase.desc}`,
            passed,
            passed ? `正常: ${result}` : `期待値: ${testCase.expected}, 実際: ${result}`
        );
    }
    
    // 日付妥当性チェックのテスト（詳細版）
    const validityTestCases = [
        // うるう年テスト
        { year: 2023, month: 2, day: 29, expected: false, desc: '2023年2月29日（平年）' },
        { year: 2024, month: 2, day: 29, expected: true, desc: '2024年2月29日（うるう年）' },
        { year: 2000, month: 2, day: 29, expected: true, desc: '2000年2月29日（400年周期うるう年）' },
        { year: 1900, month: 2, day: 29, expected: false, desc: '1900年2月29日（100年周期平年）' },
        
        // 月末日テスト
        { year: 2023, month: 1, day: 31, expected: true, desc: '1月31日（31日月）' },
        { year: 2023, month: 2, day: 28, expected: true, desc: '2月28日（平年）' },
        { year: 2023, month: 3, day: 31, expected: true, desc: '3月31日（31日月）' },
        { year: 2023, month: 4, day: 30, expected: true, desc: '4月30日（30日月）' },
        { year: 2023, month: 4, day: 31, expected: false, desc: '4月31日（無効）' },
        { year: 2023, month: 5, day: 31, expected: true, desc: '5月31日（31日月）' },
        { year: 2023, month: 6, day: 30, expected: true, desc: '6月30日（30日月）' },
        { year: 2023, month: 6, day: 31, expected: false, desc: '6月31日（無効）' },
        { year: 2023, month: 9, day: 30, expected: true, desc: '9月30日（30日月）' },
        { year: 2023, month: 9, day: 31, expected: false, desc: '9月31日（無効）' },
        { year: 2023, month: 11, day: 30, expected: true, desc: '11月30日（30日月）' },
        { year: 2023, month: 11, day: 31, expected: false, desc: '11月31日（無効）' },
        
        // 境界値テスト
        { year: 2023, month: 0, day: 1, expected: false, desc: '0月（無効）' },
        { year: 2023, month: 13, day: 1, expected: false, desc: '13月（無効）' },
        { year: 2023, month: 1, day: 0, expected: false, desc: '0日（無効）' },
        { year: 2023, month: 1, day: 32, expected: false, desc: '32日（無効）' },
        
        // 年の範囲テスト
        { year: 1899, month: 12, day: 31, expected: false, desc: '1899年（範囲外）' },
        { year: 1900, month: 1, day: 1, expected: true, desc: '1900年（範囲内最小）' },
        { year: 2100, month: 12, day: 31, expected: true, desc: '2100年（範囲内最大）' },
        { year: 2101, month: 1, day: 1, expected: false, desc: '2101年（範囲外）' },
        
        // 負の値テスト
        { year: -1, month: 1, day: 1, expected: false, desc: '負の年（無効）' },
        { year: 2023, month: -1, day: 1, expected: false, desc: '負の月（無効）' },
        { year: 2023, month: 1, day: -1, expected: false, desc: '負の日（無効）' }
    ];
    
    for (const testCase of validityTestCases) {
        const result = extractor.isValidDate(testCase.year, testCase.month, testCase.day);
        const passed = result === testCase.expected;
        recordTest(
            `日付妥当性: ${testCase.desc}`,
            passed,
            passed ? `正常: ${result}` : `期待値: ${testCase.expected}, 実際: ${result}`
        );
    }
    
    // 2桁年の変換テスト
    const twoDigitYearTests = [
        { input: ['23', '12', '15'], expected: '2023/12/15', desc: '23年→2023年' },
        { input: ['49', '1', '1'], expected: '2049/01/01', desc: '49年→2049年' },
        { input: ['50', '1', '1'], expected: '1950/01/01', desc: '50年→1950年' },
        { input: ['99', '12', '31'], expected: '1999/12/31', desc: '99年→1999年' }
    ];
    
    for (const testCase of twoDigitYearTests) {
        // 正規表現マッチ結果をシミュレート（2桁年パターン）
        const mockMatch = [
            testCase.input.join('/'), // 全体マッチ
            testCase.input[0], // 年
            testCase.input[1], // 月
            testCase.input[2]  // 日
        ];
        const result = extractor.normalizeDate(mockMatch, 2023);
        const passed = result === testCase.expected;
        recordTest(
            `2桁年変換: ${testCase.desc}`,
            passed,
            passed ? `正常: ${result}` : `期待値: ${testCase.expected}, 実際: ${result}`
        );
    }
}

/**
 * 金額抽出の精度テスト
 * 要件: 4.2
 */
function testAmountExtractionPrecision() {
    console.log('\n=== 金額抽出精度テスト ===');
    
    const extractor = new FieldExtractor();
    
    // 様々な金額パターンのテストケース（精度テスト強化）
    const amountTestCases = [
        // 基本パターン
        { text: '¥1,500', expected: 1500, desc: '¥記号付き3桁区切り' },
        { text: '1,500円', expected: 1500, desc: '円記号付き3桁区切り' },
        { text: '¥500', expected: 500, desc: '¥記号付き単純' },
        { text: '500円', expected: 500, desc: '円記号付き単純' },
        { text: '1500', expected: 1500, desc: '数字のみ' },
        
        // 大きな金額
        { text: '¥123,456', expected: 123456, desc: '6桁金額' },
        { text: '1,234,567円', expected: 1234567, desc: '7桁金額' },
        { text: '¥12,345,678', expected: 12345678, desc: '8桁金額' },
        
        // 小さな金額
        { text: '¥1', expected: 1, desc: '1円' },
        { text: '¥10', expected: 10, desc: '10円' },
        { text: '¥100', expected: 100, desc: '100円' },
        
        // スペース入り
        { text: '¥ 1,500', expected: 1500, desc: 'スペース入り¥' },
        { text: '1,500 円', expected: 1500, desc: 'スペース入り円' },
        { text: '¥　1,500', expected: 1500, desc: '全角スペース入り¥' },
        
        // 不正な3桁区切り
        { text: '¥1,50', expected: 0, desc: '不正な3桁区切り（2桁）' },
        { text: '¥12,34', expected: 0, desc: '不正な3桁区切り（2桁×2）' },
        { text: '¥1,2345', expected: 0, desc: '不正な3桁区切り（4桁）' },
        
        // 複数カンマ
        { text: '¥1,234,567,890', expected: 1234567890, desc: '10桁金額（複数カンマ）' },
        
        // 特殊文字混入
        { text: '¥1,500-', expected: 1500, desc: 'ハイフン付き' },
        { text: '¥1,500*', expected: 1500, desc: 'アスタリスク付き' },
        { text: '¥1,500税込', expected: 1500, desc: '税込文字付き' },
        
        // エラーケース
        { text: '¥abc', expected: 0, desc: '無効文字列' },
        { text: '', expected: 0, desc: '空文字列' },
        { text: '¥', expected: 0, desc: '記号のみ' },
        { text: '円', expected: 0, desc: '円のみ' },
        { text: '¥-100', expected: 0, desc: '負の金額' },
        { text: '¥0', expected: 0, desc: '0円' },
        { text: '¥00', expected: 0, desc: '00円' },
        { text: '¥,500', expected: 0, desc: 'カンマで開始' },
        { text: '¥500,', expected: 500, desc: 'カンマで終了' }
    ];
    
    for (const testCase of amountTestCases) {
        const result = extractor.normalizeAmount(testCase.text.replace(/[¥円]/g, '').replace(/\s/g, ''));
        const passed = result === testCase.expected;
        recordTest(
            `金額正規化: ${testCase.desc}`,
            passed,
            passed ? `正常: ${result}` : `期待値: ${testCase.expected}, 実際: ${result}`
        );
    }
    
    // 近傍キーワードによるスコアリングテスト
    const keywordTestCases = [
        {
            blocks: [
                { text: '合計', boundingBox: { x: 0.5, y: 0.7, width: 0.1, height: 0.05 } },
                { text: '¥1,500', boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 } }
            ],
            expectedHighConfidence: true,
            desc: '合計キーワード近傍'
        },
        {
            blocks: [
                { text: '税込', boundingBox: { x: 0.5, y: 0.7, width: 0.1, height: 0.05 } },
                { text: '¥2,000', boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 } }
            ],
            expectedHighConfidence: true,
            desc: '税込キーワード近傍'
        },
        {
            blocks: [
                { text: '¥500', boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 } }
            ],
            expectedHighConfidence: false,
            desc: 'キーワードなし'
        }
    ];
    
    for (const testCase of keywordTestCases) {
        const result = extractor.extractAmount(testCase.blocks);
        const highConfidence = result.confidence > 0.7;
        const passed = highConfidence === testCase.expectedHighConfidence;
        recordTest(
            `金額信頼度: ${testCase.desc}`,
            passed,
            passed ? `正常: ${result.confidence.toFixed(2)}` : `期待値: ${testCase.expectedHighConfidence ? '高' : '低'}, 実際: ${result.confidence.toFixed(2)}`
        );
    }
    
    // 複数候補からの最適値選択テスト
    const multipleAmountBlocks = [
        { text: '小計 ¥800', boundingBox: { x: 0.6, y: 0.6, width: 0.2, height: 0.05 } },
        { text: '税 ¥80', boundingBox: { x: 0.6, y: 0.65, width: 0.2, height: 0.05 } },
        { text: '合計 ¥880', boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 } },
        { text: '¥100', boundingBox: { x: 0.1, y: 0.5, width: 0.1, height: 0.05 } } // 明細の一部
    ];
    
    const multiResult = extractor.extractAmount(multipleAmountBlocks);
    const passed = multiResult.value === 880; // 合計が最も信頼度が高いはず
    recordTest(
        '複数金額選択',
        passed,
        passed ? `正常: 合計金額${multiResult.value}を選択` : `期待値: 880, 実際: ${multiResult.value}`
    );
}

/**
 * 支払先推定の精度テスト
 * 要件: 4.3
 */
function testPayeeEstimationPrecision() {
    console.log('\n=== 支払先推定精度テスト ===');
    
    const extractor = new FieldExtractor();
    
    // 企業語尾パターンのテスト（精度テスト強化）
    const companyPatternTests = [
        // 前置パターン（株式会社系）
        { text: '株式会社テストストア', expected: true, desc: '株式会社（前置）' },
        { text: '有限会社サンプル商店', expected: true, desc: '有限会社（前置）' },
        { text: '合同会社デモカンパニー', expected: true, desc: '合同会社（前置）' },
        { text: '合資会社テスト', expected: true, desc: '合資会社（前置）' },
        
        // 後置パターン（店舗系）
        { text: 'テストストア店', expected: true, desc: '店（後置）' },
        { text: 'サンプル商店', expected: true, desc: '商店（後置）' },
        { text: 'デモ薬局', expected: true, desc: '薬局（後置）' },
        { text: 'テスト堂', expected: true, desc: '堂（後置）' },
        { text: 'サンプル院', expected: true, desc: '院（後置）' },
        { text: 'デモ館', expected: true, desc: '館（後置）' },
        { text: 'テスト屋', expected: true, desc: '屋（後置）' },
        
        // 複雑な企業名
        { text: '株式会社東京テストカンパニー', expected: true, desc: '長い株式会社名' },
        { text: 'ABC株式会社', expected: true, desc: '英語+株式会社' },
        { text: 'テスト123株式会社', expected: true, desc: '数字+株式会社' },
        { text: 'サンプル・テスト有限会社', expected: true, desc: '記号入り有限会社' },
        
        // 特殊な店舗名
        { text: 'カフェ・ド・テスト店', expected: true, desc: '記号入り店名' },
        { text: 'TEST COFFEE店', expected: true, desc: '英語店名' },
        { text: 'テスト123薬局', expected: true, desc: '数字入り薬局' },
        { text: 'サンプル整骨院', expected: true, desc: '整骨院' },
        { text: 'デモ歯科医院', expected: true, desc: '歯科医院' },
        { text: 'テスト美容院', expected: true, desc: '美容院' },
        
        // 境界ケース
        { text: '株式会社', expected: false, desc: '株式会社のみ（企業名なし）' },
        { text: '店', expected: false, desc: '店のみ（店名なし）' },
        { text: 'テスト株式', expected: false, desc: '不完全な企業語尾' },
        { text: 'サンプル会社', expected: false, desc: '会社（株式なし）' },
        
        // 非企業パターン
        { text: 'コーヒー', expected: false, desc: '一般名詞' },
        { text: '2023/12/15', expected: false, desc: '日付' },
        { text: '¥1,500', expected: false, desc: '金額' },
        { text: '123', expected: false, desc: '数字のみ' },
        { text: 'AB', expected: false, desc: '短すぎる文字列' },
        { text: 'テスト', expected: false, desc: '企業語尾なし' },
        { text: '領収書', expected: false, desc: '文書タイトル' },
        { text: '合計', expected: false, desc: '計算用語' },
        { text: '税込', expected: false, desc: '税務用語' },
        
        // 誤認識しやすいパターン
        { text: '店長', expected: false, desc: '店を含むが企業名ではない' },
        { text: '薬局前', expected: false, desc: '薬局を含むが企業名ではない' },
        { text: '会社員', expected: false, desc: '会社を含むが企業名ではない' },
        { text: '株価', expected: false, desc: '株を含むが企業名ではない' }
    ];
    
    for (const testCase of companyPatternTests) {
        const block = {
            text: testCase.text,
            boundingBox: { x: 0.1, y: 0.2, width: 0.4, height: 0.06 },
            fontSize: 16
        };
        
        const isPotential = extractor.isPotentialPayee(testCase.text, block);
        let isCompanyPattern = false;
        for (const pattern of extractor.companyPatterns) {
            if (pattern.test(testCase.text)) {
                isCompanyPattern = true;
                break;
            }
        }
        
        const result = isPotential || isCompanyPattern;
        const passed = result === testCase.expected;
        recordTest(
            `企業パターン: ${testCase.desc}`,
            passed,
            passed ? `正常: ${result}` : `期待値: ${testCase.expected}, 実際: ${result}`
        );
    }
    
    // 位置とフォントサイズによる信頼度テスト
    const positionTests = [
        {
            text: 'テストストア',
            boundingBox: { x: 0.1, y: 0.1, width: 0.4, height: 0.06 }, // 上部
            fontSize: 20,
            expectedHighConfidence: true,
            desc: '上部・大フォント'
        },
        {
            text: 'テストストア',
            boundingBox: { x: 0.1, y: 0.8, width: 0.4, height: 0.06 }, // 下部
            fontSize: 12,
            expectedHighConfidence: false,
            desc: '下部・小フォント'
        },
        {
            text: '株式会社テストストア',
            boundingBox: { x: 0.1, y: 0.5, width: 0.4, height: 0.06 }, // 中央
            fontSize: 14,
            expectedHighConfidence: true, // 企業語尾があるので高信頼度
            desc: '中央・企業語尾あり'
        }
    ];
    
    for (const testCase of positionTests) {
        const block = {
            text: testCase.text,
            boundingBox: testCase.boundingBox,
            fontSize: testCase.fontSize
        };
        
        const confidence = extractor.calculatePayeeConfidence(testCase.text, block);
        const highConfidence = confidence > 0.6;
        const passed = highConfidence === testCase.expectedHighConfidence;
        recordTest(
            `支払先信頼度: ${testCase.desc}`,
            passed,
            passed ? `正常: ${confidence.toFixed(2)}` : `期待値: ${testCase.expectedHighConfidence ? '高' : '低'}, 実際: ${confidence.toFixed(2)}`
        );
    }
    
    // 複数候補からの最適選択テスト
    const multiplePayeeBlocks = [
        {
            text: '領収書', // 一般的な単語
            boundingBox: { x: 0.1, y: 0.05, width: 0.2, height: 0.04 },
            fontSize: 14
        },
        {
            text: '株式会社メインストア', // 企業名（上部）
            boundingBox: { x: 0.1, y: 0.15, width: 0.5, height: 0.06 },
            fontSize: 18
        },
        {
            text: 'サブ店舗', // 企業名（下部）
            boundingBox: { x: 0.1, y: 0.9, width: 0.3, height: 0.04 },
            fontSize: 12
        }
    ];
    
    const payeeResult = extractor.extractPayee(multiplePayeeBlocks);
    const passed = payeeResult.value === '株式会社メインストア';
    recordTest(
        '複数支払先選択',
        passed,
        passed ? `正常: ${payeeResult.value}を選択` : `期待値: 株式会社メインストア, 実際: ${payeeResult.value}`
    );
}

/**
 * 適用要約の品質テスト
 * 要件: 4.4
 */
function testPurposeSummaryQuality() {
    console.log('\n=== 適用要約品質テスト ===');
    
    const extractor = new FieldExtractor();
    
    // 明細行抽出のテスト
    const itemExtractionTests = [
        {
            blocks: [
                { text: '2023/12/15', boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 } }, // 日付（除外）
                { text: '¥1,500', boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 } }, // 金額（除外）
                { text: 'コーヒー', boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.04 } }, // 明細
                { text: 'サンドイッチ', boundingBox: { x: 0.1, y: 0.55, width: 0.25, height: 0.04 } }, // 明細
                { text: 'A', boundingBox: { x: 0.1, y: 0.6, width: 0.05, height: 0.04 } } // 短すぎる（除外）
            ],
            expectedItems: ['コーヒー', 'サンドイッチ'],
            desc: '基本的な明細行抽出'
        },
        {
            blocks: [
                { text: '会議用お弁当', boundingBox: { x: 0.1, y: 0.4, width: 0.3, height: 0.04 } },
                { text: 'ペットボトル茶', boundingBox: { x: 0.1, y: 0.45, width: 0.3, height: 0.04 } },
                { text: 'おしぼり', boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.04 } }
            ],
            expectedItems: ['会議用お弁当', 'ペットボトル茶', 'おしぼり'],
            desc: '会議関連明細'
        }
    ];
    
    for (const testCase of itemExtractionTests) {
        const itemLines = extractor.extractItemLines(testCase.blocks);
        const passed = itemLines.length === testCase.expectedItems.length &&
                      testCase.expectedItems.every(item => itemLines.includes(item));
        recordTest(
            `明細行抽出: ${testCase.desc}`,
            passed,
            passed ? `正常: [${itemLines.join(', ')}]` : `期待値: [${testCase.expectedItems.join(', ')}], 実際: [${itemLines.join(', ')}]`
        );
    }
    
    // 名詞句抽出のテスト
    const nounExtractionTests = [
        {
            itemLines: ['コーヒー', 'サンドイッチ', 'ケーキ'],
            expectedNouns: ['コーヒー', 'サンドイッチ', 'ケーキ'],
            desc: 'カタカナ名詞'
        },
        {
            itemLines: ['会議用弁当', '資料印刷代', '交通費'],
            expectedNouns: ['会議用弁当', '資料印刷代', '交通費'],
            desc: '漢字名詞'
        },
        {
            itemLines: ['Coffee', 'Sandwich', 'Tea'],
            expectedNouns: ['Coffee', 'Sandwich', 'Tea'],
            desc: '英語名詞'
        }
    ];
    
    for (const testCase of nounExtractionTests) {
        const nouns = extractor.extractNouns(testCase.itemLines);
        const hasExpectedNouns = testCase.expectedNouns.every(noun => nouns.includes(noun));
        recordTest(
            `名詞抽出: ${testCase.desc}`,
            hasExpectedNouns,
            hasExpectedNouns ? `正常: [${nouns.join(', ')}]` : `期待値含む: [${testCase.expectedNouns.join(', ')}], 実際: [${nouns.join(', ')}]`
        );
    }
    
    // 要約生成の品質テスト
    const summaryTests = [
        {
            importantTerms: ['コーヒー'],
            expected: 'コーヒー',
            desc: '単一項目'
        },
        {
            importantTerms: ['コーヒー', 'サンドイッチ'],
            expected: 'コーヒー・サンドイッチ',
            desc: '2項目'
        },
        {
            importantTerms: ['コーヒー', 'サンドイッチ', 'ケーキ'],
            expected: 'コーヒー・サンドイッチ等',
            desc: '3項目以上'
        },
        {
            importantTerms: [],
            expected: '',
            desc: '項目なし'
        }
    ];
    
    for (const testCase of summaryTests) {
        const summary = extractor.generateSummary(testCase.importantTerms);
        const passed = summary === testCase.expected;
        recordTest(
            `要約生成: ${testCase.desc}`,
            passed,
            passed ? `正常: "${summary}"` : `期待値: "${testCase.expected}", 実際: "${summary}"`
        );
    }
    
    // 統合的な適用項目抽出テスト（品質テスト強化）
    const integratedTests = [
        {
            blocks: [
                { text: '株式会社テストカフェ', boundingBox: { x: 0.1, y: 0.1, width: 0.4, height: 0.06 } },
                { text: 'ブレンドコーヒー', boundingBox: { x: 0.1, y: 0.4, width: 0.3, height: 0.04 } },
                { text: 'チーズケーキ', boundingBox: { x: 0.1, y: 0.45, width: 0.3, height: 0.04 } },
                { text: '合計 ¥800', boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 } }
            ],
            expectedContains: ['コーヒー', 'ケーキ'],
            desc: 'カフェ利用'
        },
        {
            blocks: [
                { text: '会議室利用料', boundingBox: { x: 0.1, y: 0.4, width: 0.3, height: 0.04 } },
                { text: 'プロジェクター使用料', boundingBox: { x: 0.1, y: 0.45, width: 0.4, height: 0.04 } },
                { text: '資料印刷代', boundingBox: { x: 0.1, y: 0.5, width: 0.3, height: 0.04 } }
            ],
            expectedContains: ['会議', '資料'],
            desc: '会議関連費用'
        },
        {
            blocks: [
                { text: 'ランチセットA', boundingBox: { x: 0.1, y: 0.4, width: 0.3, height: 0.04 } },
                { text: 'ドリンクバー', boundingBox: { x: 0.1, y: 0.45, width: 0.3, height: 0.04 } },
                { text: 'サラダ', boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.04 } }
            ],
            expectedContains: ['ランチ', 'ドリンク'],
            desc: 'レストラン利用'
        },
        {
            blocks: [
                { text: '交通費', boundingBox: { x: 0.1, y: 0.4, width: 0.2, height: 0.04 } },
                { text: '電車賃', boundingBox: { x: 0.1, y: 0.45, width: 0.2, height: 0.04 } },
                { text: 'バス代', boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.04 } }
            ],
            expectedContains: ['交通', '電車'],
            desc: '交通費'
        },
        {
            blocks: [
                { text: '文房具', boundingBox: { x: 0.1, y: 0.4, width: 0.2, height: 0.04 } },
                { text: 'ボールペン', boundingBox: { x: 0.1, y: 0.45, width: 0.3, height: 0.04 } },
                { text: 'ノート', boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.04 } },
                { text: 'クリアファイル', boundingBox: { x: 0.1, y: 0.55, width: 0.3, height: 0.04 } }
            ],
            expectedContains: ['文房具', 'ボールペン'],
            desc: '事務用品購入'
        },
        {
            blocks: [
                { text: '医療費', boundingBox: { x: 0.1, y: 0.4, width: 0.2, height: 0.04 } },
                { text: '診察料', boundingBox: { x: 0.1, y: 0.45, width: 0.2, height: 0.04 } },
                { text: '薬代', boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.04 } }
            ],
            expectedContains: ['医療', '診察'],
            desc: '医療費'
        },
        {
            blocks: [
                { text: 'ガソリン代', boundingBox: { x: 0.1, y: 0.4, width: 0.3, height: 0.04 } },
                { text: 'レギュラー', boundingBox: { x: 0.1, y: 0.45, width: 0.3, height: 0.04 } },
                { text: '30L', boundingBox: { x: 0.1, y: 0.5, width: 0.1, height: 0.04 } }
            ],
            expectedContains: ['ガソリン', 'レギュラー'],
            desc: 'ガソリン代'
        },
        {
            blocks: [
                { text: '書籍', boundingBox: { x: 0.1, y: 0.4, width: 0.2, height: 0.04 } },
                { text: 'プログラミング入門', boundingBox: { x: 0.1, y: 0.45, width: 0.4, height: 0.04 } },
                { text: 'JavaScript本', boundingBox: { x: 0.1, y: 0.5, width: 0.3, height: 0.04 } }
            ],
            expectedContains: ['書籍', 'プログラミング'],
            desc: '書籍購入'
        },
        {
            blocks: [
                { text: 'タクシー代', boundingBox: { x: 0.1, y: 0.4, width: 0.3, height: 0.04 } },
                { text: '深夜料金', boundingBox: { x: 0.1, y: 0.45, width: 0.3, height: 0.04 } },
                { text: '迎車料金', boundingBox: { x: 0.1, y: 0.5, width: 0.3, height: 0.04 } }
            ],
            expectedContains: ['タクシー', '深夜'],
            desc: 'タクシー利用'
        },
        {
            blocks: [
                { text: 'ホテル宿泊費', boundingBox: { x: 0.1, y: 0.4, width: 0.3, height: 0.04 } },
                { text: 'シングルルーム', boundingBox: { x: 0.1, y: 0.45, width: 0.4, height: 0.04 } },
                { text: '朝食付き', boundingBox: { x: 0.1, y: 0.5, width: 0.3, height: 0.04 } }
            ],
            expectedContains: ['ホテル', 'シングル'],
            desc: 'ホテル宿泊'
        }
    ];
    
    for (const testCase of integratedTests) {
        const result = extractor.extractPurpose(testCase.blocks);
        const containsExpected = testCase.expectedContains.some(term => 
            result.value.includes(term)
        );
        recordTest(
            `統合適用抽出: ${testCase.desc}`,
            containsExpected,
            containsExpected ? `正常: "${result.value}"` : `期待値含む: [${testCase.expectedContains.join(', ')}], 実際: "${result.value}"`
        );
    }
}

/**
 * エラーケースと例外処理のテスト（強化版）
 */
function testErrorCases() {
    console.log('\n=== エラーケース・例外処理テスト ===');
    
    const extractor = new FieldExtractor();
    
    // 空データのテスト
    const emptyResult = extractor.extractDate([]);
    recordTest(
        'エラーケース: 空配列',
        emptyResult.value === '' && emptyResult.confidence === 0,
        `日付抽出結果: "${emptyResult.value}", 信頼度: ${emptyResult.confidence}`
    );
    
    // null/undefined データのテスト
    try {
        const nullResult = extractor.extractAmount(null);
        recordTest(
            'エラーケース: null配列',
            false,
            `null配列で例外が発生すべき`
        );
    } catch (error) {
        recordTest(
            'エラーケース: null配列',
            true,
            `正常に例外処理: ${error.message}`
        );
    }
    
    // 不正なバウンディングボックスのテスト
    const invalidBoundingBoxBlocks = [
        { text: '2023/12/15', boundingBox: null, fontSize: 14 },
        { text: '¥1,500', boundingBox: undefined, fontSize: 16 },
        { text: '株式会社テスト', boundingBox: {}, fontSize: 18 }, // 空オブジェクト
        { text: 'コーヒー', boundingBox: { x: 'invalid', y: 0.5 }, fontSize: 12 } // 不正な座標
    ];
    
    try {
        const result = extractor.extractAmount(invalidBoundingBoxBlocks);
        recordTest(
            'エラーケース: 不正バウンディングボックス',
            typeof result.value === 'number',
            `金額抽出結果: ${result.value}`
        );
    } catch (error) {
        recordTest(
            'エラーケース: 不正バウンディングボックス',
            false,
            `例外発生: ${error.message}`
        );
    }
    
    // 極端に長いテキストのテスト
    const longTextBlock = {
        text: 'あ'.repeat(1000),
        boundingBox: { x: 0.1, y: 0.5, width: 0.8, height: 0.1 },
        fontSize: 12
    };
    
    try {
        const result = extractor.extractPayee([longTextBlock]);
        recordTest(
            'エラーケース: 極端に長いテキスト',
            true,
            `支払先抽出完了: "${result.value.substring(0, 20)}..."`
        );
    } catch (error) {
        recordTest(
            'エラーケース: 極端に長いテキスト',
            false,
            `例外発生: ${error.message}`
        );
    }
    
    // 特殊文字を含むテキストのテスト
    const specialCharBlocks = [
        { text: '🍕ピザ🍕', boundingBox: { x: 0.1, y: 0.4, width: 0.2, height: 0.04 }, fontSize: 12 },
        { text: '¥1,500💰', boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 }, fontSize: 14 },
        { text: '株式会社テスト🏢', boundingBox: { x: 0.1, y: 0.2, width: 0.4, height: 0.06 }, fontSize: 18 },
        { text: '2023/12/15📅', boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 }, fontSize: 14 }
    ];
    
    try {
        const result = extractor.extractFields(specialCharBlocks);
        recordTest(
            'エラーケース: 特殊文字（絵文字）',
            true,
            `特殊文字処理完了`
        );
    } catch (error) {
        recordTest(
            'エラーケース: 特殊文字（絵文字）',
            false,
            `例外発生: ${error.message}`
        );
    }
    
    // 不正な日付形式のテスト
    const invalidDateBlocks = [
        { text: '2023/13/45', boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 }, fontSize: 14 },
        { text: '令和100年1月1日', boundingBox: { x: 0.1, y: 0.15, width: 0.4, height: 0.05 }, fontSize: 14 },
        { text: '平成0年12月31日', boundingBox: { x: 0.1, y: 0.2, width: 0.4, height: 0.05 }, fontSize: 14 },
        { text: '昭和999年1月1日', boundingBox: { x: 0.1, y: 0.25, width: 0.4, height: 0.05 }, fontSize: 14 }
    ];
    
    const invalidDateResult = extractor.extractDate(invalidDateBlocks);
    recordTest(
        'エラーケース: 不正な日付形式',
        invalidDateResult.confidence < 0.5,
        `不正日付の信頼度: ${invalidDateResult.confidence.toFixed(2)}`
    );
    
    // 不正な金額形式のテスト
    const invalidAmountBlocks = [
        { text: '¥-1,500', boundingBox: { x: 0.6, y: 0.7, width: 0.2, height: 0.05 }, fontSize: 14 },
        { text: '¥1,500,000,000,000', boundingBox: { x: 0.6, y: 0.75, width: 0.3, height: 0.05 }, fontSize: 14 },
        { text: '¥abc,def', boundingBox: { x: 0.6, y: 0.8, width: 0.2, height: 0.05 }, fontSize: 14 }
    ];
    
    const invalidAmountResult = extractor.extractAmount(invalidAmountBlocks);
    recordTest(
        'エラーケース: 不正な金額形式',
        invalidAmountResult.value === 0 || invalidAmountResult.confidence < 0.5,
        `不正金額の結果: ${invalidAmountResult.value}, 信頼度: ${invalidAmountResult.confidence.toFixed(2)}`
    );
    
    // メモリ不足シミュレーション（大量データ）
    const massiveBlocks = [];
    for (let i = 0; i < 10000; i++) {
        massiveBlocks.push({
            text: `テストデータ${i}`,
            boundingBox: { x: Math.random(), y: Math.random(), width: 0.1, height: 0.05 },
            fontSize: 12
        });
    }
    
    try {
        const startTime = performance.now();
        const result = extractor.extractFields(massiveBlocks);
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        recordTest(
            'エラーケース: 大量データ処理',
            processingTime < 5000, // 5秒以内
            `大量データ処理時間: ${processingTime.toFixed(2)}ms`
        );
    } catch (error) {
        recordTest(
            'エラーケース: 大量データ処理',
            false,
            `大量データで例外発生: ${error.message}`
        );
    }
    
    // 循環参照オブジェクトのテスト
    const circularBlock = {
        text: 'テスト',
        boundingBox: { x: 0.1, y: 0.5, width: 0.2, height: 0.05 },
        fontSize: 12
    };
    circularBlock.self = circularBlock; // 循環参照
    
    try {
        const result = extractor.extractPayee([circularBlock]);
        recordTest(
            'エラーケース: 循環参照オブジェクト',
            true,
            `循環参照処理完了`
        );
    } catch (error) {
        recordTest(
            'エラーケース: 循環参照オブジェクト',
            false,
            `循環参照で例外発生: ${error.message}`
        );
    }
}

/**
 * 統合テストと性能テスト
 */
function testIntegrationAndPerformance() {
    console.log('\n=== 統合・性能テスト ===');
    
    const extractor = new FieldExtractor();
    
    // 複雑な領収書データでの統合テスト
    const complexReceiptBlocks = [
        { text: '領収書', boundingBox: { x: 0.4, y: 0.05, width: 0.2, height: 0.05 }, fontSize: 16 },
        { text: '令和5年12月15日', boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 }, fontSize: 14 },
        { text: '株式会社テストレストラン', boundingBox: { x: 0.1, y: 0.15, width: 0.5, height: 0.06 }, fontSize: 18 },
        { text: '〒123-4567 東京都テスト区', boundingBox: { x: 0.1, y: 0.21, width: 0.4, height: 0.04 }, fontSize: 10 },
        { text: 'ランチセットA', boundingBox: { x: 0.1, y: 0.35, width: 0.3, height: 0.04 }, fontSize: 12 },
        { text: '¥1,200', boundingBox: { x: 0.6, y: 0.35, width: 0.15, height: 0.04 }, fontSize: 12 },
        { text: 'ドリンク', boundingBox: { x: 0.1, y: 0.4, width: 0.2, height: 0.04 }, fontSize: 12 },
        { text: '¥300', boundingBox: { x: 0.6, y: 0.4, width: 0.1, height: 0.04 }, fontSize: 12 },
        { text: '小計', boundingBox: { x: 0.5, y: 0.5, width: 0.1, height: 0.04 }, fontSize: 12 },
        { text: '¥1,500', boundingBox: { x: 0.6, y: 0.5, width: 0.15, height: 0.04 }, fontSize: 12 },
        { text: '消費税(10%)', boundingBox: { x: 0.45, y: 0.55, width: 0.15, height: 0.04 }, fontSize: 12 },
        { text: '¥150', boundingBox: { x: 0.6, y: 0.55, width: 0.1, height: 0.04 }, fontSize: 12 },
        { text: '合計', boundingBox: { x: 0.5, y: 0.65, width: 0.1, height: 0.05 }, fontSize: 14 },
        { text: '¥1,650', boundingBox: { x: 0.6, y: 0.65, width: 0.15, height: 0.05 }, fontSize: 14 }
    ];
    
    const startTime = performance.now();
    
    extractor.extractFields(complexReceiptBlocks).then(result => {
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        // 性能テスト（100ms以内での処理を期待）
        recordTest(
            '性能テスト: 処理時間',
            processingTime < 100,
            `処理時間: ${processingTime.toFixed(2)}ms`
        );
        
        // 統合テスト結果の検証
        const integrationChecks = [
            { field: 'date', expected: '2023/12/15', desc: '日付抽出' },
            { field: 'amount', expected: 1650, desc: '合計金額抽出' },
            { field: 'payee', expected: '株式会社テストレストラン', desc: '支払先抽出' }
        ];
        
        for (const check of integrationChecks) {
            const passed = result[check.field].value === check.expected;
            recordTest(
                `統合テスト: ${check.desc}`,
                passed,
                passed ? `正常: ${result[check.field].value}` : `期待値: ${check.expected}, 実際: ${result[check.field].value}`
            );
        }
        
        // 信頼度テスト（全フィールドで0.5以上を期待）
        const confidenceChecks = ['date', 'amount', 'payee', 'purpose'];
        for (const field of confidenceChecks) {
            const confidence = result[field].confidence;
            const passed = confidence >= 0.5;
            recordTest(
                `信頼度テスト: ${field}`,
                passed,
                `信頼度: ${confidence.toFixed(2)}`
            );
        }
        
        // 候補数テスト（各フィールドで候補が生成されることを確認）
        for (const field of confidenceChecks) {
            const candidateCount = result[field].candidates ? result[field].candidates.length : 0;
            const passed = candidateCount > 0;
            recordTest(
                `候補生成テスト: ${field}`,
                passed,
                `候補数: ${candidateCount}`
            );
        }
        
        // 最終結果の表示
        console.log('\n=== テスト結果サマリー ===');
        console.log(`総テスト数: ${testStats.total}`);
        console.log(`成功: ${testStats.passed}`);
        console.log(`失敗: ${testStats.failed}`);
        console.log(`成功率: ${((testStats.passed / testStats.total) * 100).toFixed(1)}%`);
        
        if (testStats.failed === 0) {
            console.log('🎉 全てのテストが成功しました！');
        } else {
            console.log(`⚠️  ${testStats.failed}件のテストが失敗しました。`);
        }
    }).catch(error => {
        recordTest(
            '統合テスト: 例外処理',
            false,
            `例外発生: ${error.message}`
        );
    });
}

// テスト実行関数
function runAllFieldExtractionTests() {
    console.log('🧪 フィールド抽出ユニットテスト開始');
    console.log('要件: 4.1 (日付), 4.2 (金額), 4.3 (支払先), 4.4 (適用)');
    
    // テスト統計をリセット
    testStats = { total: 0, passed: 0, failed: 0 };
    
    // 各テストを実行
    testDateBoundaryValues();
    testAmountExtractionPrecision();
    testPayeeEstimationPrecision();
    testPurposeSummaryQuality();
    testErrorCases();
    testIntegrationAndPerformance();
}

// テスト実行
if (typeof window !== 'undefined') {
    // ブラウザ環境での実行
    window.runFieldExtractionTests = runAllFieldExtractionTests;
    
    // 個別テスト関数もエクスポート
    window.testDateBoundaryValues = testDateBoundaryValues;
    window.testAmountExtractionPrecision = testAmountExtractionPrecision;
    window.testPayeeEstimationPrecision = testPayeeEstimationPrecision;
    window.testPurposeSummaryQuality = testPurposeSummaryQuality;
    window.testErrorCases = testErrorCases;
    window.testIntegrationAndPerformance = testIntegrationAndPerformance;
} else {
    // Node.js環境での実行
    const FieldExtractor = require('../js/field-extractor.js');
    runAllFieldExtractionTests();
}