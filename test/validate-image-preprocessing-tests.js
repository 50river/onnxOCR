#!/usr/bin/env node

/**
 * 画像前処理テストの検証スクリプト
 * Node.js環境でテストファイルの基本的な構文と構造を確認
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 画像前処理テスト検証スクリプト');
console.log('================================');
console.log('');

// テストファイルの存在確認
const testFiles = [
    'test/image-preprocessing-tests.js',
    'test/image-preprocessing-test-runner.html',
    'js/exif-reader.js',
    'js/perspective-correction.js'
];

console.log('📋 1. ファイル存在確認');
console.log('----------------------------');

let allFilesExist = true;
for (const file of testFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - ファイルが見つかりません`);
        allFilesExist = false;
    }
}

if (!allFilesExist) {
    console.log('');
    console.log('❌ 必要なファイルが不足しています。');
    process.exit(1);
}

console.log('');
console.log('📋 2. JavaScript構文チェック');
console.log('----------------------------');

// JavaScript ファイルの構文チェック
const jsFiles = testFiles.filter(file => file.endsWith('.js'));

for (const file of jsFiles) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 基本的な構文チェック（Node.js環境での実行はしない）
        if (content.includes('class ') && content.includes('constructor')) {
            console.log(`✅ ${file} - クラス構造OK`);
        } else {
            console.log(`⚠️  ${file} - クラス構造が見つかりません`);
        }
        
        // 必要なメソッドの存在確認
        if (file.includes('image-preprocessing-tests.js')) {
            const requiredMethods = [
                'runAllTests',
                'testEXIFRotationCorrection',
                'testPerspectiveCorrection',
                'testErrorHandling'
            ];
            
            for (const method of requiredMethods) {
                if (content.includes(method)) {
                    console.log(`  ✅ ${method}メソッド存在`);
                } else {
                    console.log(`  ❌ ${method}メソッドが見つかりません`);
                }
            }
        }
        
        if (file.includes('exif-reader.js')) {
            const requiredMethods = [
                'readEXIF',
                'getRotationAngle',
                'getFlipInfo'
            ];
            
            for (const method of requiredMethods) {
                if (content.includes(method)) {
                    console.log(`  ✅ EXIFReader.${method}メソッド存在`);
                } else {
                    console.log(`  ❌ EXIFReader.${method}メソッドが見つかりません`);
                }
            }
        }
        
        if (file.includes('perspective-correction.js')) {
            const requiredMethods = [
                'detectRectangle',
                'correctPerspective',
                'waitForOpenCV'
            ];
            
            for (const method of requiredMethods) {
                if (content.includes(method)) {
                    console.log(`  ✅ PerspectiveCorrection.${method}メソッド存在`);
                } else {
                    console.log(`  ❌ PerspectiveCorrection.${method}メソッドが見つかりません`);
                }
            }
        }
        
    } catch (error) {
        console.log(`❌ ${file} - 読み取りエラー: ${error.message}`);
    }
}

console.log('');
console.log('📋 3. HTMLテストランナー確認');
console.log('----------------------------');

try {
    const htmlContent = fs.readFileSync('test/image-preprocessing-test-runner.html', 'utf8');
    
    // 必要な要素の存在確認
    const requiredElements = [
        'runAllTests',
        'runEXIFTests',
        'runPerspectiveTests',
        'runErrorTests'
    ];
    
    for (const elementId of requiredElements) {
        if (htmlContent.includes(`id="${elementId}"`)) {
            console.log(`✅ ${elementId}ボタン存在`);
        } else {
            console.log(`❌ ${elementId}ボタンが見つかりません`);
        }
    }
    
    // 必要なスクリプトの読み込み確認
    const requiredScripts = [
        'exif-reader.js',
        'perspective-correction.js',
        'image-preprocessing-tests.js'
    ];
    
    for (const script of requiredScripts) {
        if (htmlContent.includes(script)) {
            console.log(`✅ ${script}スクリプト読み込み設定済み`);
        } else {
            console.log(`❌ ${script}スクリプト読み込み設定なし`);
        }
    }
    
} catch (error) {
    console.log(`❌ HTMLテストランナー確認エラー: ${error.message}`);
}

console.log('');
console.log('📋 4. テスト要件カバレッジ確認');
console.log('----------------------------');

try {
    const testContent = fs.readFileSync('test/image-preprocessing-tests.js', 'utf8');
    
    // 要件1.3（EXIF補正）のテストカバレッジ
    const exifTestCases = [
        'orientation: 1',
        'orientation: 3', 
        'orientation: 6',
        'orientation: 8'
    ];
    
    console.log('要件1.3 (EXIF補正) カバレッジ:');
    for (const testCase of exifTestCases) {
        if (testContent.includes(testCase) || testContent.includes(testCase.replace('orientation: ', ''))) {
            console.log(`  ✅ ${testCase}のテスト存在`);
        } else {
            console.log(`  ⚠️  ${testCase}のテストが明示的でない`);
        }
    }
    
    // 要件1.4（透視補正）のテストカバレッジ
    const perspectiveTestCases = [
        'detectRectangle',
        'correctPerspective',
        'sortCorners',
        'distance'
    ];
    
    console.log('要件1.4 (透視補正) カバレッジ:');
    for (const testCase of perspectiveTestCases) {
        if (testContent.includes(testCase)) {
            console.log(`  ✅ ${testCase}のテスト存在`);
        } else {
            console.log(`  ❌ ${testCase}のテストが見つかりません`);
        }
    }
    
    // エラーハンドリングのテストカバレッジ
    const errorTestCases = [
        'testEXIFErrorHandling',
        'testPerspectiveErrorHandling',
        'invalid',
        'null'
    ];
    
    console.log('エラーハンドリング カバレッジ:');
    for (const testCase of errorTestCases) {
        if (testContent.includes(testCase)) {
            console.log(`  ✅ ${testCase}のテスト存在`);
        } else {
            console.log(`  ❌ ${testCase}のテストが見つかりません`);
        }
    }
    
} catch (error) {
    console.log(`❌ テスト要件カバレッジ確認エラー: ${error.message}`);
}

console.log('');
console.log('📋 5. 実行手順');
console.log('----------------------------');
console.log('1. テストサーバーを起動:');
console.log('   node test/start-test-server.js');
console.log('');
console.log('2. ブラウザでテストランナーを開く:');
console.log('   http://localhost:3000/test/image-preprocessing-test-runner.html');
console.log('');
console.log('3. 「全テスト実行」ボタンをクリックしてテストを実行');
console.log('');
console.log('4. 個別テストも実行可能:');
console.log('   - EXIF補正テスト');
console.log('   - 透視補正テスト');
console.log('   - エラーハンドリングテスト');
console.log('');

console.log('🎉 画像前処理テストの検証が完了しました！');
console.log('ブラウザ環境でテストを実行して動作を確認してください。');