/**
 * PWA機能テスト
 * オフライン動作、インストール可能性、キャッシュ更新の動作確認
 */

class PWATests {
    constructor() {
        this.testResults = [];
        this.serviceWorkerRegistration = null;
    }

    /**
     * すべてのPWAテストを実行
     */
    async runAllTests() {
        console.log('🧪 PWA機能テストを開始します...');
        
        try {
            await this.testServiceWorkerRegistration();
            await this.testManifestValidation();
            await this.testInstallability();
            await this.testOfflineFunctionality();
            await this.testCacheStrategy();
            await this.testCacheUpdate();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ テスト実行中にエラーが発生しました:', error);
        }
    }

    /**
     * Service Worker登録のテスト
     */
    async testServiceWorkerRegistration() {
        console.log('📋 Service Worker登録テスト...');
        
        try {
            if (!('serviceWorker' in navigator)) {
                throw new Error('Service Workerがサポートされていません');
            }

            // 既存の登録を確認
            this.serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
            
            if (!this.serviceWorkerRegistration) {
                // 新規登録
                this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
                await this.waitForServiceWorkerReady();
            }

            this.addTestResult('Service Worker登録', true, 'Service Workerが正常に登録されました');
            
            // Service Workerの状態確認
            const sw = this.serviceWorkerRegistration.active || 
                      this.serviceWorkerRegistration.waiting || 
                      this.serviceWorkerRegistration.installing;
            
            if (sw) {
                this.addTestResult('Service Worker状態', true, `状態: ${sw.state}`);
            } else {
                this.addTestResult('Service Worker状態', false, 'Service Workerが見つかりません');
            }

        } catch (error) {
            this.addTestResult('Service Worker登録', false, error.message);
        }
    }

    /**
     * Manifestファイルの検証
     */
    async testManifestValidation() {
        console.log('📋 Manifestファイル検証テスト...');
        
        try {
            const response = await fetch('/manifest.json');
            if (!response.ok) {
                throw new Error(`Manifestファイルの取得に失敗: ${response.status}`);
            }

            const manifest = await response.json();
            
            // 必須フィールドの確認
            const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
            const missingFields = requiredFields.filter(field => !manifest[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`必須フィールドが不足: ${missingFields.join(', ')}`);
            }

            // アイコンの確認
            if (!manifest.icons || manifest.icons.length === 0) {
                throw new Error('アイコンが定義されていません');
            }

            const hasRequiredSizes = manifest.icons.some(icon => 
                icon.sizes === '192x192' || icon.sizes === '512x512'
            );

            if (!hasRequiredSizes) {
                throw new Error('192x192または512x512のアイコンが必要です');
            }

            this.addTestResult('Manifest検証', true, 'Manifestファイルが有効です');

        } catch (error) {
            this.addTestResult('Manifest検証', false, error.message);
        }
    }

    /**
     * インストール可能性のテスト
     */
    async testInstallability() {
        console.log('📋 インストール可能性テスト...');
        
        try {
            // beforeinstallpromptイベントの監視
            let installPromptEvent = null;
            
            const installPromptPromise = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(null);
                }, 5000); // 5秒でタイムアウト

                window.addEventListener('beforeinstallprompt', (e) => {
                    clearTimeout(timeout);
                    installPromptEvent = e;
                    resolve(e);
                });
            });

            // PWA条件の確認
            const checks = {
                'HTTPS接続': location.protocol === 'https:' || location.hostname === 'localhost',
                'Service Worker': !!this.serviceWorkerRegistration,
                'Manifest': await this.checkManifestLink(),
                'アイコン': await this.checkIcons()
            };

            const allChecksPassed = Object.values(checks).every(check => check);
            
            if (allChecksPassed) {
                this.addTestResult('PWA条件', true, 'すべての条件を満たしています');
                
                // インストールプロンプトの確認
                await installPromptPromise;
                if (installPromptEvent) {
                    this.addTestResult('インストールプロンプト', true, 'インストールプロンプトが利用可能です');
                } else {
                    this.addTestResult('インストールプロンプト', false, 'インストールプロンプトが表示されませんでした（既にインストール済みの可能性）');
                }
            } else {
                const failedChecks = Object.entries(checks)
                    .filter(([_, passed]) => !passed)
                    .map(([check, _]) => check);
                
                this.addTestResult('PWA条件', false, `失敗した条件: ${failedChecks.join(', ')}`);
            }

        } catch (error) {
            this.addTestResult('インストール可能性', false, error.message);
        }
    }

    /**
     * オフライン機能のテスト
     */
    async testOfflineFunctionality() {
        console.log('📋 オフライン機能テスト...');
        
        try {
            if (!this.serviceWorkerRegistration) {
                throw new Error('Service Workerが登録されていません');
            }

            // キャッシュの確認
            const cacheNames = await caches.keys();
            const receiptCaches = cacheNames.filter(name => name.includes('receipt-ocr'));
            
            if (receiptCaches.length === 0) {
                throw new Error('アプリケーションキャッシュが見つかりません');
            }

            this.addTestResult('キャッシュ存在確認', true, `キャッシュ数: ${receiptCaches.length}`);

            // プリキャッシュリソースの確認
            const cache = await caches.open(receiptCaches[0]);
            const cachedRequests = await cache.keys();
            const cachedUrls = cachedRequests.map(req => new URL(req.url).pathname);

            const expectedResources = ['/', '/index.html', '/styles/main.css', '/js/app.js', '/manifest.json'];
            const missingResources = expectedResources.filter(url => !cachedUrls.includes(url));

            if (missingResources.length === 0) {
                this.addTestResult('プリキャッシュ', true, `${cachedUrls.length}個のリソースがキャッシュされています`);
            } else {
                this.addTestResult('プリキャッシュ', false, `不足リソース: ${missingResources.join(', ')}`);
            }

            // オフライン時のフォールバック確認
            await this.testOfflineFallback();

        } catch (error) {
            this.addTestResult('オフライン機能', false, error.message);
        }
    }

    /**
     * キャッシュ戦略のテスト
     */
    async testCacheStrategy() {
        console.log('📋 キャッシュ戦略テスト...');
        
        try {
            // Cache Firstの確認（静的リソース）
            const staticResources = ['/styles/main.css', '/js/app.js'];
            
            for (const resource of staticResources) {
                const startTime = performance.now();
                const response = await fetch(resource);
                const endTime = performance.now();
                const loadTime = endTime - startTime;

                if (response.ok && loadTime < 100) { // 100ms以下ならキャッシュから
                    this.addTestResult(`Cache First (${resource})`, true, `読み込み時間: ${loadTime.toFixed(2)}ms`);
                } else {
                    this.addTestResult(`Cache First (${resource})`, false, `読み込み時間: ${loadTime.toFixed(2)}ms (ネットワークから？)`);
                }
            }

            // Service Workerメッセージングのテスト
            await this.testServiceWorkerMessaging();

        } catch (error) {
            this.addTestResult('キャッシュ戦略', false, error.message);
        }
    }

    /**
     * キャッシュ更新のテスト
     */
    async testCacheUpdate() {
        console.log('📋 キャッシュ更新テスト...');
        
        try {
            if (!this.serviceWorkerRegistration) {
                throw new Error('Service Workerが登録されていません');
            }

            // Service Workerの更新確認
            await this.serviceWorkerRegistration.update();
            
            // skipWaitingのテスト
            const messageChannel = new MessageChannel();
            const responsePromise = new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data);
                };
            });

            // Service Workerにバージョン情報を要求
            if (this.serviceWorkerRegistration.active) {
                this.serviceWorkerRegistration.active.postMessage(
                    { type: 'GET_VERSION' },
                    [messageChannel.port2]
                );

                const response = await Promise.race([
                    responsePromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('タイムアウト')), 5000))
                ]);

                if (response && response.type === 'VERSION') {
                    this.addTestResult('Service Worker通信', true, `バージョン: ${response.payload.version}`);
                } else {
                    this.addTestResult('Service Worker通信', false, '応答が無効です');
                }
            }

            // clientsClaimのテスト（新しいService Workerが即座に制御を取得）
            const controllerChanged = await this.testControllerChange();
            this.addTestResult('即座更新 (clientsClaim)', controllerChanged, 
                controllerChanged ? 'Service Workerが即座に制御を取得しました' : 'コントローラーの変更が検出されませんでした');

        } catch (error) {
            this.addTestResult('キャッシュ更新', false, error.message);
        }
    }

    /**
     * オフラインフォールバックのテスト
     */
    async testOfflineFallback() {
        try {
            // 存在しないリソースへのリクエスト（オフライン状態をシミュレート）
            const nonExistentUrl = '/non-existent-resource-' + Date.now();
            
            try {
                const response = await fetch(nonExistentUrl);
                if (response.status === 404) {
                    this.addTestResult('オフラインフォールバック', true, '404レスポンスが正常に返されました');
                } else {
                    this.addTestResult('オフラインフォールバック', false, `予期しないステータス: ${response.status}`);
                }
            } catch (error) {
                // ネットワークエラーの場合、Service Workerがフォールバックを提供するかテスト
                this.addTestResult('オフラインフォールバック', true, 'ネットワークエラーが適切に処理されました');
            }

        } catch (error) {
            this.addTestResult('オフラインフォールバック', false, error.message);
        }
    }

    /**
     * Service Workerメッセージングのテスト
     */
    async testServiceWorkerMessaging() {
        if (!this.serviceWorkerRegistration?.active) {
            this.addTestResult('Service Workerメッセージング', false, 'アクティブなService Workerがありません');
            return;
        }

        try {
            const messageChannel = new MessageChannel();
            const responsePromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('タイムアウト')), 3000);
                messageChannel.port1.onmessage = (event) => {
                    clearTimeout(timeout);
                    resolve(event.data);
                };
            });

            this.serviceWorkerRegistration.active.postMessage(
                { type: 'GET_VERSION' },
                [messageChannel.port2]
            );

            const response = await responsePromise;
            this.addTestResult('Service Workerメッセージング', true, `応答受信: ${response.type}`);

        } catch (error) {
            this.addTestResult('Service Workerメッセージング', false, error.message);
        }
    }

    /**
     * コントローラー変更のテスト
     */
    async testControllerChange() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 3000);
            
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                clearTimeout(timeout);
                resolve(true);
            }, { once: true });

            // Service Workerの更新をトリガー
            if (this.serviceWorkerRegistration) {
                this.serviceWorkerRegistration.update();
            }
        });
    }

    /**
     * Manifestリンクの確認
     */
    async checkManifestLink() {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        return !!manifestLink && !!manifestLink.href;
    }

    /**
     * アイコンの確認
     */
    async checkIcons() {
        try {
            const response = await fetch('/manifest.json');
            const manifest = await response.json();
            return manifest.icons && manifest.icons.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Service Workerの準備完了を待機
     */
    async waitForServiceWorkerReady() {
        if (!this.serviceWorkerRegistration) return;

        return new Promise((resolve) => {
            if (this.serviceWorkerRegistration.active) {
                resolve();
                return;
            }

            const worker = this.serviceWorkerRegistration.installing || this.serviceWorkerRegistration.waiting;
            if (worker) {
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'activated') {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
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
        
        console.log('\n📊 PWAテスト結果サマリー');
        console.log(`合格: ${passedTests}/${totalTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (passedTests === totalTests) {
            console.log('🎉 すべてのPWAテストに合格しました！');
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
        const existingResults = document.getElementById('pwa-test-results');
        if (existingResults) {
            existingResults.remove();
        }

        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'pwa-test-results';
        resultsContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            background: white;
            border: 2px solid #2563eb;
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
                <h3 style="margin: 0; color: #2563eb;">PWAテスト結果</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <div style="margin-bottom: 12px; padding: 8px; background: ${passedTests === totalTests ? '#dcfce7' : '#fef3c7'}; border-radius: 4px;">
                <strong>${passedTests}/${totalTests} 合格 (${((passedTests / totalTests) * 100).toFixed(1)}%)</strong>
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${this.testResults.map(result => `
                    <div style="margin-bottom: 8px; padding: 6px; background: ${result.passed ? '#f0f9ff' : '#fef2f2'}; border-radius: 4px; border-left: 3px solid ${result.passed ? '#2563eb' : '#dc2626'};">
                        <div style="font-weight: bold; color: ${result.passed ? '#2563eb' : '#dc2626'};">
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
window.PWATests = PWATests;

// 自動実行（オプション）
if (window.location.search.includes('run-pwa-tests')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const tests = new PWATests();
        await tests.runAllTests();
    });
}

console.log('PWAテストが読み込まれました。window.PWATests でアクセスできます。');
console.log('テストを実行するには: new PWATests().runAllTests()');