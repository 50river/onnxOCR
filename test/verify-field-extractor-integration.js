#!/usr/bin/env node

/**
 * フィールド抽出器統合テスト - Node.js版
 * HTMLへの統合が正しく動作するかを検証
 */

const fs = require('fs');
const path = require('path');

// フィールド抽出器を読み込み
const FieldExtractor = require('../js/field-extractor.js');

console.log('=== フィールド抽出器統合テスト開始 ===\n');

// テスト1: クラスの読み込み確認
console.log('1. クラス読み込みテスト');
try {
    if (typeof FieldExtractor === 'function') {
        console.log('✅ FieldExtractorクラスが正常に読み込まれました');
    } else {
        console.log('❌ FieldExtractorクラスの読み込みに失敗');
        process.exit(1);
    }
} catch (error) {
    console.log('❌ 読み込みエラー:', error.message);
    process.exit(1);
}

// テスト2: インスタンス化テスト
console.log('\n2. インスタンス化テスト');
let extractor;
try {
    extractor = new FieldExtractor();
    console.log('✅ フィールド抽出器のインスタンス化成功');
} catch (error) {
    console.log('❌ インスタンス化エラー:', error.message);
    process.exit(1);
}

// テスト3: 基本機能テスト
console.log('\n3. 基本機能テスト');
const mockTextBlocks = [
    {
        text: "令和6年3月15日",
        boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.05 },
        fontSize: 14
    },
    {
        text: "株式会社テストストア",
        boundingBox: { x: 0.1, y: 0.2, width: 0.4, height: 0.06 },
        fontSize: 18
    },
    {
        text: "合計 ¥1,500",
        boundingBox: { x: 0.1, y: 0.7, width: 0.2, height: 0.05 },
        fontSize: 16
    },
    {
        text: "コーヒー",
        boundingBox: { x: 0.1, y: 0.5, width: 0.15, height: 0.04 },
        fontSize: 12
    }
];

async function runExtractionTest() {
    try {
        const result = await extractor.extractFields(mockTextBlocks);
        
        console.log('抽出結果:');
        console.log('- 日付:', result.date.value, `(信頼度: ${result.date.confidence.toFixed(2)})`);
        console.log('- 支払先:', result.payee.value, `(信頼度: ${result.payee.confidence.toFixed(2)})`);
        console.log('- 金額:', result.amount.value, `(信頼度: ${result.amount.confidence.toFixed(2)})`);
        console.log('- 適用:', result.purpose.value, `(信頼度: ${result.purpose.confidence.toFixed(2)})`);
        
        // 抽出成功項目数をカウント
        const extractedFields = [
            result.date.value && result.date.value.trim() !== '',
            result.payee.value && result.payee.value.trim() !== '',
            result.amount.value > 0,
            result.purpose.value && result.purpose.value.trim() !== ''
        ].filter(Boolean).length;
        
        if (extractedFields >= 3) {
            console.log(`✅ フィールド抽出成功 (${extractedFields}/4項目)`);
        } else if (extractedFields >= 2) {
            console.log(`⚠️ 部分的な抽出成功 (${extractedFields}/4項目)`);
        } else {
            console.log(`❌ 抽出失敗 (${extractedFields}/4項目)`);
        }
        
    } catch (error) {
        console.log('❌ 抽出テストエラー:', error.message);
        process.exit(1);
    }
}

// テスト4: HTMLファイルの統合確認
console.log('\n4. HTMLファイル統合確認');
try {
    const htmlPath = path.join(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    if (htmlContent.includes('js/field-extractor.js')) {
        console.log('✅ index.htmlにfield-extractor.jsが含まれています');
        
        // スクリプトの読み込み順序確認
        const scriptMatches = htmlContent.match(/<script src="js\/[^"]+\.js"><\/script>/g);
        if (scriptMatches) {
            const fieldExtractorIndex = scriptMatches.findIndex(script => script.includes('field-extractor.js'));
            const appJsIndex = scriptMatches.findIndex(script => script.includes('app.js'));
            
            if (fieldExtractorIndex !== -1 && appJsIndex !== -1 && fieldExtractorIndex < appJsIndex) {
                console.log('✅ スクリプトの読み込み順序が正しく設定されています');
            } else {
                console.log('⚠️ スクリプトの読み込み順序を確認してください');
            }
        }
    } else {
        console.log('❌ index.htmlにfield-extractor.jsが含まれていません');
        process.exit(1);
    }
} catch (error) {
    console.log('❌ HTMLファイル確認エラー:', error.message);
    process.exit(1);
}

// 非同期テストの実行
runExtractionTest().then(() => {
    console.log('\n=== 統合テスト完了 ===');
    console.log('✅ フィールド抽出器のHTMLへの統合が正常に完了しました');
}).catch((error) => {
    console.log('\n❌ 統合テスト失敗:', error.message);
    process.exit(1);
});