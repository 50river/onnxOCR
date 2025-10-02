#!/usr/bin/env node

/**
 * PWA機能テスト実行スクリプト
 * Node.js環境でPWA機能の基本的な検証を行う
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PWATestRunner {
    constructor() {
        this.testResults = [];
        this.projectRoot = path.resolve(__dirname, '..');
    }

    /**
     * すべてのテストを実行
     */
    async runAllTests() {
        console.log('🧪 PWA機能テストを開始します...\n');

        try {
            this.testManifestFile();
            this.testServiceWorkerFile();
            this.testHTMLPWAMeta();
            this.testIconFiles();
            this.testProjectStructure();
            this.testCacheConfiguration();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ テスト実行中にエラーが発生しました:', error.message);
            process.exit(1);
        }
    }

    /**
     * Manifestファイルのテスト
     */
    testManifestFile() {
        console.log('📋 Manifestファイルテスト...');
        
        try {
            const manifestPath = path.join(this.projectRoot, 'manifest.json');
            
            if (!fs.existsSync(manifestPath)) {
                throw new Error('manifest.jsonが見つかりません');
            }

            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            // 必須フィールドの確認
            const requiredFields = [
                'name', 'short_name', 'start_url', 'display', 
                'theme_color', 'background_color', 'icons'
            ];

            const missingFields = requiredFields.filter(field => !manifest[field]);
            if (missingFields.length > 0) {
                throw new Error(`必須フィールドが不足: ${missingFields.join(', ')}`);
            }

            // アイコンの確認
            if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
                throw new Error('アイコンが定義されていません');
            }

            const requiredSizes = ['192x192', '512x512'];
            const availableSizes = manifest.icons.map(icon => icon.sizes);
            const missingIconSizes = requiredSizes.filter(size => !availableSizes.includes(size));

            if (missingIconSizes.length > 0) {
                throw new Error(`必要なアイコンサイズが不足: ${missingIconSizes.join(', ')}`);
            }

            // PWA固有の設定確認
            if (manifest.display !== 'standalone' && manifest.display !== 'fullscreen') {
                console.warn('⚠️  displayは"standalone"または"fullscreen"が推奨されます');
            }

            this.addTestResult('Manifestファイル', true, `有効なmanifest.json (${manifest.icons.length}個のアイコン)`);

        } catch (error) {
            this.addTestResult('Manifestファイル', false, error.message);
        }
    }

    /**
     * Service Workerファイルのテスト
     */
    testServiceWorkerFile() {
        console.log('📋 Service Workerファイルテスト...');
        
        try {
            const swPath = path.join(this.projectRoot, 'sw.js');
            
            if (!fs.existsSync(swPath)) {
                throw new Error('sw.jsが見つかりません');
            }

            const swContent = fs.readFileSync(swPath, 'utf8');

            // 必要な機能の確認
            const requiredFeatures = [
                { name: 'install event', pattern: /addEventListener\s*\(\s*['"`]install['"`]/ },
                { name: 'activate event', pattern: /addEventListener\s*\(\s*['"`]activate['"`]/ },
                { name: 'fetch event', pattern: /addEventListener\s*\(\s*['"`]fetch['"`]/ },
                { name: 'caches API', pattern: /caches\.(open|match|keys)/ },
                { name: 'skipWaiting', pattern: /skipWaiting\s*\(\s*\)/ },
                { name: 'clients.claim', pattern: /clients\.claim\s*\(\s*\)/ }
            ];

            const missingFeatures = requiredFeatures.filter(feature => 
                !feature.pattern.test(swContent)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Service Workerに必要な機能が不足: ${missingFeatures.map(f => f.name).join(', ')}`);
            }

            // プリキャッシュリソースの確認
            if (!swContent.includes('PRECACHE_RESOURCES') && !swContent.includes('precache')) {
                console.warn('⚠️  プリキャッシュ設定が見つかりません');
            }

            this.addTestResult('Service Workerファイル', true, 'すべての必要な機能が実装されています');

        } catch (error) {
            this.addTestResult('Service Workerファイル', false, error.message);
        }
    }

    /**
     * HTMLのPWAメタタグテスト
     */
    testHTMLPWAMeta() {
        console.log('📋 HTMLのPWAメタタグテスト...');
        
        try {
            const htmlPath = path.join(this.projectRoot, 'index.html');
            
            if (!fs.existsSync(htmlPath)) {
                throw new Error('index.htmlが見つかりません');
            }

            const htmlContent = fs.readFileSync(htmlPath, 'utf8');

            // 必要なメタタグの確認
            const requiredMeta = [
                { name: 'manifest link', pattern: /<link[^>]+rel\s*=\s*['"`]manifest['"`]/ },
                { name: 'theme-color', pattern: /<meta[^>]+name\s*=\s*['"`]theme-color['"`]/ },
                { name: 'viewport', pattern: /<meta[^>]+name\s*=\s*['"`]viewport['"`]/ },
                { name: 'apple-mobile-web-app-capable', pattern: /<meta[^>]+name\s*=\s*['"`]apple-mobile-web-app-capable['"`]/ }
            ];

            const missingMeta = requiredMeta.filter(meta => 
                !meta.pattern.test(htmlContent)
            );

            if (missingMeta.length > 0) {
                console.warn(`⚠️  推奨メタタグが不足: ${missingMeta.map(m => m.name).join(', ')}`);
            }

            // Service Worker登録スクリプトの確認（HTMLまたはJSファイル内）
            const jsPath = path.join(this.projectRoot, 'js/app.js');
            let hasServiceWorkerRegistration = htmlContent.includes('serviceWorker.register');
            
            if (!hasServiceWorkerRegistration && fs.existsSync(jsPath)) {
                const jsContent = fs.readFileSync(jsPath, 'utf8');
                hasServiceWorkerRegistration = jsContent.includes('serviceWorker.register');
            }
            
            if (!hasServiceWorkerRegistration) {
                throw new Error('Service Worker登録スクリプトが見つかりません');
            }

            this.addTestResult('HTMLのPWAメタタグ', true, 'PWAに必要なメタタグが設定されています');

        } catch (error) {
            this.addTestResult('HTMLのPWAメタタグ', false, error.message);
        }
    }

    /**
     * アイコンファイルのテスト
     */
    testIconFiles() {
        console.log('📋 アイコンファイルテスト...');
        
        try {
            const manifestPath = path.join(this.projectRoot, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            let existingIcons = 0;
            let missingIcons = [];

            for (const icon of manifest.icons) {
                const iconPath = path.join(this.projectRoot, icon.src.replace(/^\//, ''));
                
                if (fs.existsSync(iconPath)) {
                    existingIcons++;
                } else {
                    missingIcons.push(icon.src);
                }
            }

            if (missingIcons.length > 0) {
                console.warn(`⚠️  不足しているアイコン: ${missingIcons.join(', ')}`);
            }

            if (existingIcons === 0) {
                throw new Error('アイコンファイルが1つも見つかりません');
            }

            this.addTestResult('アイコンファイル', true, `${existingIcons}/${manifest.icons.length}個のアイコンが存在します`);

        } catch (error) {
            this.addTestResult('アイコンファイル', false, error.message);
        }
    }

    /**
     * プロジェクト構造のテスト
     */
    testProjectStructure() {
        console.log('📋 プロジェクト構造テスト...');
        
        try {
            const requiredFiles = [
                'index.html',
                'manifest.json',
                'sw.js',
                'js/app.js',
                'styles/main.css'
            ];

            const missingFiles = requiredFiles.filter(file => 
                !fs.existsSync(path.join(this.projectRoot, file))
            );

            if (missingFiles.length > 0) {
                throw new Error(`必要なファイルが不足: ${missingFiles.join(', ')}`);
            }

            // 推奨ディレクトリの確認
            const recommendedDirs = ['assets', 'libs', 'models'];
            const existingDirs = recommendedDirs.filter(dir => 
                fs.existsSync(path.join(this.projectRoot, dir))
            );

            this.addTestResult('プロジェクト構造', true, 
                `必要なファイルが揃っています (推奨ディレクトリ: ${existingDirs.length}/${recommendedDirs.length})`);

        } catch (error) {
            this.addTestResult('プロジェクト構造', false, error.message);
        }
    }

    /**
     * キャッシュ設定のテスト
     */
    testCacheConfiguration() {
        console.log('📋 キャッシュ設定テスト...');
        
        try {
            const swPath = path.join(this.projectRoot, 'sw.js');
            const swContent = fs.readFileSync(swPath, 'utf8');

            // キャッシュ戦略の確認
            const cacheStrategies = [
                { name: 'Cache First', pattern: /cache.*first|cacheFirst/i },
                { name: 'Network First', pattern: /network.*first|networkFirst/i }
            ];

            const implementedStrategies = cacheStrategies.filter(strategy => 
                strategy.pattern.test(swContent)
            );

            if (implementedStrategies.length === 0) {
                console.warn('⚠️  明示的なキャッシュ戦略が見つかりません');
            }

            // プリキャッシュリソースの確認
            const precacheMatch = swContent.match(/PRECACHE_RESOURCES\s*=\s*\[([\s\S]*?)\]/);
            if (precacheMatch) {
                const resourceCount = (precacheMatch[1].match(/['"`][^'"`]+['"`]/g) || []).length;
                this.addTestResult('キャッシュ設定', true, 
                    `${resourceCount}個のリソースがプリキャッシュ設定されています`);
            } else {
                this.addTestResult('キャッシュ設定', false, 'プリキャッシュリソースの設定が見つかりません');
            }

        } catch (error) {
            this.addTestResult('キャッシュ設定', false, error.message);
        }
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
        
        console.log('\n📊 PWAテスト結果サマリー');
        console.log('='.repeat(50));
        console.log(`合格: ${passedTests}/${totalTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (passedTests === totalTests) {
            console.log('\n🎉 すべてのPWAテストに合格しました！');
            console.log('アプリケーションはPWAとして正常に設定されています。');
        } else {
            console.log('\n⚠️  一部のテストが失敗しました。');
            console.log('失敗したテストを確認して修正してください。');
        }

        // 失敗したテストの詳細表示
        const failedTests = this.testResults.filter(result => !result.passed);
        if (failedTests.length > 0) {
            console.log('\n❌ 失敗したテスト:');
            failedTests.forEach(test => {
                console.log(`  • ${test.name}: ${test.message}`);
            });
        }

        // 次のステップの提案
        console.log('\n📝 次のステップ:');
        console.log('1. ブラウザでtest/pwa-test-runner.htmlを開いてブラウザ環境でのテストを実行');
        console.log('2. Chrome DevToolsのLighthouseでPWA監査を実行');
        console.log('3. 実際のモバイルデバイスでオフライン動作を確認');

        // 終了コードの設定
        process.exit(passedTests === totalTests ? 0 : 1);
    }
}

// メイン実行
if (require.main === module) {
    const runner = new PWATestRunner();
    runner.runAllTests().catch(error => {
        console.error('テスト実行エラー:', error);
        process.exit(1);
    });
}

module.exports = PWATestRunner;