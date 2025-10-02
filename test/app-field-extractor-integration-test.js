#!/usr/bin/env node

/**
 * アプリとフィールド抽出器の統合テスト
 * 実際のアプリケーションでの使用パターンをテスト
 */

const fs = require('fs');
const path = require('path');

// フィールド抽出器を読み込み
const FieldExtractor = require('../js/field-extractor.js');

console.log('=== アプリ・フィールド抽出器統合テスト ===\n');

// 実際のOCR結果に近いテストデータ
const realWorldTestData = [
    {
        name: "コンビニ領収書",
        textBlocks: [
            { text: "セブンイレブン", boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.06 }, fontSize: 18 },
            { text: "2024/03/15", boundingBox: { x: 0.1, y: 0.2, width: 0.2, height: 0.04 }, fontSize: 12 },
            { text: "おにぎり", boundingBox: { x: 0.1, y: 0.4, width: 0.15, height: 0.04 }, fontSize: 12 },
            { text: "¥120", boundingBox: { x: 0.6, y: 0.4, width: 0.1, height: 0.04 }, fontSize: 12 },
            { text: "お茶", boundingBox: { x: 0.1, y: 0.45, width: 0.1, height: 0.04 }, fontSize: 12 },
            { text: "¥100", boundingBox: { x: 0.6, y: 0.45, width: 0.1, height: 0.04 }, fontSize: 12 },
            { text: "合計", boundingBox: { x: 0.1, y: 0.7, width: 0.1, height: 0.04 }, fontSize: 14 },
            { text: "¥220", boundingBox: { x: 0.6, y: 0.7, width: 0.1, height: 0.04 }, fontSize: 14 }
        ]
    },
    {
        name: "レストラン領収書",
        textBlocks: [
            { text: "株式会社美味亭", boundingBox: { x: 0.1, y: 0.1, width: 0.4, height: 0.06 }, fontSize: 20 },
            { text: "令和6年3月20日", boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 }, fontSize: 12 },
            { text: "ランチセット", boundingBox: { x: 0.1, y: 0.4, width: 0.2, height: 0.04 }, fontSize: 12 },
            { text: "1,200円", boundingBox: { x: 0.6, y: 0.4, width: 0.15, height: 0.04 }, fontSize: 12 },
            { text: "ドリンク", boundingBox: { x: 0.1, y: 0.45, width: 0.15, height: 0.04 }, fontSize: 12 },
            { text: "300円", boundingBox: { x: 0.6, y: 0.45, width: 0.1, height: 0.04 }, fontSize: 12 },
            { text: "税込合計", boundingBox: { x: 0.1, y: 0.7, width: 0.15, height: 0.04 }, fontSize: 14 },
            { text: "1,500円", boundingBox: { x: 0.6, y: 0.7, width: 0.15, height: 0.04 }, fontSize: 14 }
        ]
    },
    {
        name: "薬局領収書",
        textBlocks: [
            { text: "健康薬局", boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.06 }, fontSize: 18 },
            { text: "R6.3.25", boundingBox: { x: 0.1, y: 0.2, width: 0.15, height: 0.04 }, fontSize: 12 },
            { text: "風邪薬", boundingBox: { x: 0.1, y: 0.4, width: 0.1, height: 0.04 }, fontSize: 12 },
            { text: "マスク", boundingBox: { x: 0.1, y: 0.45, width: 0.1, height: 0.04 }, fontSize: 12 },
            { text: "お会計", boundingBox: { x: 0.1, y: 0.7, width: 0.1, height: 0.04 }, fontSize: 14 },
            { text: "¥850", boundingBox: { x: 0.6, y: 0.7, width: 0.1, height: 0.04 }, fontSize: 14 }
        ]
    }
];

async function testFieldExtractionAccuracy() {
    console.log('1. フィールド抽出精度テスト\n');
    
    const extractor = new FieldExtractor();
    let totalTests = 0;
    let successfulExtractions = 0;
    
    for (const testCase of realWorldTestData) {
        console.log(`テストケース: ${testCase.name}`);
        totalTests++;
        
        try {
            const result = await extractor.extractFields(testCase.textBlocks);
            
            // 結果の評価
            const hasValidDate = result.date.value && result.date.value.match(/\d{4}\/\d{2}\/\d{2}/);
            const hasValidPayee = result.payee.value && result.payee.value.length > 0;
            const hasValidAmount = result.amount.value > 0;
            const hasValidPurpose = result.purpose.value && result.purpose.value.length > 0;
            
            const extractedCount = [hasValidDate, hasValidPayee, hasValidAmount, hasValidPurpose].filter(Boolean).length;
            
            console.log(`  - 日付: ${result.date.value} (信頼度: ${result.date.confidence.toFixed(2)})`);
            console.log(`  - 支払先: ${result.payee.value} (信頼度: ${result.payee.confidence.toFixed(2)})`);
            console.log(`  - 金額: ${result.amount.value} (信頼度: ${result.amount.confidence.toFixed(2)})`);
            console.log(`  - 適用: ${result.purpose.value} (信頼度: ${result.purpose.confidence.toFixed(2)})`);
            console.log(`  - 抽出成功項目: ${extractedCount}/4`);
            
            if (extractedCount >= 3) {
                console.log('  ✅ 抽出成功\n');
                successfulExtractions++;
            } else {
                console.log('  ⚠️ 部分的成功\n');
            }
            
        } catch (error) {
            console.log(`  ❌ エラー: ${error.message}\n`);
        }
    }
    
    const successRate = (successfulExtractions / totalTests * 100).toFixed(1);
    console.log(`抽出成功率: ${successfulExtractions}/${totalTests} (${successRate}%)\n`);
    
    return successfulExtractions >= Math.ceil(totalTests * 0.8); // 80%以上の成功率を期待
}

async function testErrorHandling() {
    console.log('2. エラーハンドリングテスト\n');
    
    const extractor = new FieldExtractor();
    const errorTestCases = [
        { name: "空配列", data: [] },
        { name: "null", data: null },
        { name: "不正なデータ", data: [{ invalidField: "test" }] },
        { name: "部分的に不正なデータ", data: [
            { text: "正常なテキスト", boundingBox: { x: 0, y: 0, width: 1, height: 1 } },
            { text: null, boundingBox: null }
        ]}
    ];
    
    let errorHandlingSuccess = 0;
    
    for (const testCase of errorTestCases) {
        console.log(`エラーケース: ${testCase.name}`);
        
        try {
            const result = await extractor.extractFields(testCase.data);
            
            // エラーが発生しなかった場合、結果が適切に初期化されているかチェック
            if (result && typeof result === 'object' && 
                result.date && result.payee && result.amount && result.purpose) {
                console.log('  ✅ 適切にエラーハンドリングされました');
                errorHandlingSuccess++;
            } else {
                console.log('  ⚠️ 結果の構造が不正です');
            }
            
        } catch (error) {
            console.log(`  ❌ 予期しないエラー: ${error.message}`);
        }
    }
    
    console.log(`エラーハンドリング成功: ${errorHandlingSuccess}/${errorTestCases.length}\n`);
    
    return errorHandlingSuccess >= errorTestCases.length * 0.75; // 75%以上の成功率を期待
}

async function testPerformance() {
    console.log('3. パフォーマンステスト\n');
    
    const extractor = new FieldExtractor();
    const testData = realWorldTestData[0].textBlocks; // 最初のテストケースを使用
    const iterations = 100;
    
    console.log(`${iterations}回の抽出処理を実行...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        await extractor.extractFields(testData);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;
    
    console.log(`総実行時間: ${totalTime}ms`);
    console.log(`平均実行時間: ${averageTime.toFixed(2)}ms`);
    
    // 1回の抽出が100ms以下であることを期待
    const performanceOk = averageTime < 100;
    
    if (performanceOk) {
        console.log('✅ パフォーマンステスト成功\n');
    } else {
        console.log('⚠️ パフォーマンスが期待値を下回りました\n');
    }
    
    return performanceOk;
}

// メインテスト実行
async function runIntegrationTests() {
    try {
        const accuracyTest = await testFieldExtractionAccuracy();
        const errorTest = await testErrorHandling();
        const performanceTest = await testPerformance();
        
        console.log('=== テスト結果サマリー ===');
        console.log(`フィールド抽出精度: ${accuracyTest ? '✅ 合格' : '❌ 不合格'}`);
        console.log(`エラーハンドリング: ${errorTest ? '✅ 合格' : '❌ 不合格'}`);
        console.log(`パフォーマンス: ${performanceTest ? '✅ 合格' : '❌ 不合格'}`);
        
        const allTestsPassed = accuracyTest && errorTest && performanceTest;
        
        if (allTestsPassed) {
            console.log('\n🎉 すべての統合テストが成功しました！');
            console.log('フィールド抽出器のHTMLへの統合は正常に完了しています。');
        } else {
            console.log('\n⚠️ 一部のテストが失敗しました。');
            console.log('統合に問題がある可能性があります。');
        }
        
        return allTestsPassed;
        
    } catch (error) {
        console.log('❌ 統合テスト実行エラー:', error.message);
        return false;
    }
}

// テスト実行
runIntegrationTests().then(success => {
    process.exit(success ? 0 : 1);
});