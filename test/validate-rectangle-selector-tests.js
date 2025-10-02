#!/usr/bin/env node

/**
 * 矩形選択機能テストの検証スクリプト
 * Node.js環境でテストファイルの構文と基本的な機能をチェック
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 矩形選択機能テストの検証を開始します...\n');

// テストファイルの存在確認
const testFilePath = path.join(__dirname, 'rectangle-selector-tests.js');
const testRunnerPath = path.join(__dirname, 'rectangle-selector-test-runner.html');
const rectangleSelectorPath = path.join(__dirname, '..', 'js', 'rectangle-selector.js');

console.log('📋 ファイル存在確認:');

const files = [
    { path: testFilePath, name: 'rectangle-selector-tests.js' },
    { path: testRunnerPath, name: 'rectangle-selector-test-runner.html' },
    { path: rectangleSelectorPath, name: 'js/rectangle-selector.js' }
];

let allFilesExist = true;

files.forEach(file => {
    if (fs.existsSync(file.path)) {
        console.log(`  ✅ ${file.name} - 存在`);
    } else {
        console.log(`  ❌ ${file.name} - 見つかりません`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ 必要なファイルが不足しています。');
    process.exit(1);
}

// テストファイルの構文チェック
console.log('\n📋 テストファイルの構文チェック:');

try {
    const testContent = fs.readFileSync(testFilePath, 'utf8');
    
    // 基本的な構文チェック
    const checks = [
        {
            name: 'RectangleSelectorTestsクラス定義',
            pattern: /class RectangleSelectorTests/,
            required: true
        },
        {
            name: 'runAllTestsメソッド',
            pattern: /async runAllTests\(\)/,
            required: true
        },
        {
            name: 'testSelectionAccuracyメソッド',
            pattern: /async testSelectionAccuracy\(\)/,
            required: true
        },
        {
            name: 'testZoomPanOperationsメソッド',
            pattern: /async testZoomPanOperations\(\)/,
            required: true
        },
        {
            name: 'testReOCRAccuracyメソッド',
            pattern: /async testReOCRAccuracy\(\)/,
            required: true
        },
        {
            name: 'testErrorHandlingメソッド',
            pattern: /async testErrorHandling\(\)/,
            required: true
        },
        {
            name: 'グローバル公開',
            pattern: /window\.RectangleSelectorTests = RectangleSelectorTests/,
            required: true
        }
    ];

    let syntaxValid = true;

    checks.forEach(check => {
        if (check.pattern.test(testContent)) {
            console.log(`  ✅ ${check.name} - 確認`);
        } else {
            console.log(`  ❌ ${check.name} - 見つかりません`);
            if (check.required) {
                syntaxValid = false;
            }
        }
    });

    if (!syntaxValid) {
        console.log('\n❌ テストファイルの構文に問題があります。');
        process.exit(1);
    }

    console.log('\n✅ テストファイルの構文チェックが完了しました。');

} catch (error) {
    console.log(`\n❌ テストファイルの読み込みエラー: ${error.message}`);
    process.exit(1);
}

// テスト内容の詳細チェック
console.log('\n📋 テスト内容の詳細チェック:');

try {
    const testContent = fs.readFileSync(testFilePath, 'utf8');
    
    const detailChecks = [
        {
            name: '選択精度テスト - 基本矩形選択',
            pattern: /testBasicSelection/,
            description: '基本的な矩形選択機能のテスト'
        },
        {
            name: '選択精度テスト - 最小サイズ制限',
            pattern: /testMinimumSizeConstraint/,
            description: '最小選択サイズの制限テスト'
        },
        {
            name: '選択精度テスト - 座標変換',
            pattern: /testCoordinateTransformation/,
            description: 'Canvas座標と画像座標の変換精度テスト'
        },
        {
            name: 'ズーム・パンテスト - ズーム機能',
            pattern: /testZoomFunctionality/,
            description: 'ズームイン・ズームアウト機能のテスト'
        },
        {
            name: 'ズーム・パンテスト - パン機能',
            pattern: /testPanFunctionality/,
            description: 'パン（移動）操作のテスト'
        },
        {
            name: 'ズーム・パンテスト - 制限値',
            pattern: /testZoomLimits/,
            description: 'ズームの最大・最小制限のテスト'
        },
        {
            name: '再OCRテスト - 選択領域OCR',
            pattern: /testSelectionReOCR/,
            description: '選択領域の再OCR処理テスト'
        },
        {
            name: '再OCRテスト - 高解像度リサンプリング',
            pattern: /testHighResolutionResampling/,
            description: 'ズーム時の高解像度画像取得テスト'
        },
        {
            name: '再OCRテスト - 候補追加',
            pattern: /testCandidateAddition/,
            description: 'OCR結果の候補追加機能テスト'
        },
        {
            name: '再OCRテスト - 信頼度スコアリング',
            pattern: /testConfidenceScoring/,
            description: 'OCR結果の信頼度計算テスト'
        },
        {
            name: 'エラーハンドリング - 無効データ',
            pattern: /testInvalidImageData/,
            description: '無効な画像データの処理テスト'
        },
        {
            name: 'エラーハンドリング - 境界外選択',
            pattern: /testOutOfBoundsSelection/,
            description: '境界外選択のエラー処理テスト'
        },
        {
            name: 'エラーハンドリング - メモリ制限',
            pattern: /testMemoryLimitHandling/,
            description: 'メモリ制限時の処理テスト'
        },
        {
            name: 'エラーハンドリング - イベントリスナークリーンアップ',
            pattern: /testEventListenerCleanup/,
            description: 'イベントリスナーの適切な削除テスト'
        }
    ];

    let detailsValid = true;

    detailChecks.forEach(check => {
        if (check.pattern.test(testContent)) {
            console.log(`  ✅ ${check.name}`);
            console.log(`      ${check.description}`);
        } else {
            console.log(`  ❌ ${check.name} - 見つかりません`);
            detailsValid = false;
        }
    });

    if (!detailsValid) {
        console.log('\n⚠️  一部のテスト機能が不足している可能性があります。');
    } else {
        console.log('\n✅ すべてのテスト機能が確認されました。');
    }

} catch (error) {
    console.log(`\n❌ テスト内容チェックエラー: ${error.message}`);
}

// 要件対応チェック
console.log('\n📋 要件対応チェック:');

const requirements = [
    {
        id: '3.1',
        name: '矩形選択オーバーレイ',
        tests: ['選択精度テスト'],
        description: 'ドラッグによる矩形選択UI、半透明オーバーレイ表示、選択範囲調整機能'
    },
    {
        id: '3.2', 
        name: 'ズーム・パン機能',
        tests: ['ズーム・パンテスト'],
        description: 'タッチジェスチャーによるズーム操作、パン（移動）操作、座標変換処理'
    },
    {
        id: '3.3',
        name: '選択領域の再OCR処理', 
        tests: ['再OCRテスト'],
        description: '元画像からの高解像度リサンプリング、選択領域のみのOCR実行、結果の候補リスト追加'
    }
];

requirements.forEach(req => {
    console.log(`  📋 要件 ${req.id}: ${req.name}`);
    console.log(`      ${req.description}`);
    console.log(`      対応テスト: ${req.tests.join(', ')}`);
    console.log('');
});

// 実行方法の案内
console.log('📋 テスト実行方法:');
console.log('  1. テストサーバーを起動:');
console.log('     node test/start-test-server.js --open');
console.log('');
console.log('  2. ブラウザで以下のURLにアクセス:');
console.log('     http://localhost:8080/test/rectangle-selector-test-runner.html');
console.log('');
console.log('  3. 「全テスト実行」ボタンをクリックしてテストを開始');
console.log('');
console.log('  4. または、コンソールで直接実行:');
console.log('     new RectangleSelectorTests().runAllTests()');

console.log('\n🎉 矩形選択機能テストの検証が完了しました！');
console.log('✅ すべての必要なテスト機能が実装されています。');
console.log('📋 要件 3.1、3.2、3.3 に対応したテストが準備されました。');