#!/usr/bin/env node

/**
 * PWAテスト用開発サーバー起動スクリプト
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8080;
const PROJECT_ROOT = path.resolve(__dirname, '..');

// MIMEタイプのマッピング
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

/**
 * 静的ファイルサーバー
 */
function createServer() {
    return http.createServer((req, res) => {
        let filePath = path.join(PROJECT_ROOT, req.url === '/' ? 'index.html' : req.url);
        
        // セキュリティ: パストラバーサル攻撃を防ぐ
        if (!filePath.startsWith(PROJECT_ROOT)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        // ファイルの存在確認
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        // ディレクトリの場合はindex.htmlを探す
        if (fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            if (!fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
        }

        // MIMEタイプの決定
        const ext = path.extname(filePath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        // PWA用のヘッダー設定
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache', // テスト用
        };

        // Service Workerファイルの場合は特別なヘッダーを追加
        if (filePath.endsWith('sw.js')) {
            headers['Service-Worker-Allowed'] = '/';
        }

        // ファイルの読み込みと送信
        try {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, headers);
            res.end(content);
            
            console.log(`📄 ${req.method} ${req.url} -> ${path.relative(PROJECT_ROOT, filePath)}`);
        } catch (error) {
            console.error(`❌ ファイル読み込みエラー: ${error.message}`);
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    });
}

/**
 * サーバー起動
 */
function startServer() {
    const server = createServer();
    
    server.listen(PORT, () => {
        console.log('🚀 PWAテスト用サーバーが起動しました');
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`🧪 テストランナー: http://localhost:${PORT}/test/pwa-test-runner.html`);
        console.log(`🔍 自動テスト: http://localhost:${PORT}/?run-pwa-tests`);
        console.log('\n📋 利用可能なテスト:');
        console.log('  • PWA機能テスト (ブラウザ環境)');
        console.log('  • オフライン動作テスト');
        console.log('  • インストール可能性テスト');
        console.log('  • キャッシュ更新テスト');
        console.log('\n⏹️  サーバーを停止するには Ctrl+C を押してください');
    });

    // グレースフルシャットダウン
    process.on('SIGINT', () => {
        console.log('\n🛑 サーバーを停止しています...');
        server.close(() => {
            console.log('✅ サーバーが停止しました');
            process.exit(0);
        });
    });

    return server;
}

/**
 * ブラウザを自動で開く（オプション）
 */
function openBrowser(url) {
    const platform = process.platform;
    let command;

    switch (platform) {
        case 'darwin': // macOS
            command = `open "${url}"`;
            break;
        case 'win32': // Windows
            command = `start "${url}"`;
            break;
        default: // Linux
            command = `xdg-open "${url}"`;
            break;
    }

    try {
        execSync(command);
        console.log(`🌐 ブラウザでテストページを開きました: ${url}`);
    } catch (error) {
        console.log(`⚠️  ブラウザの自動起動に失敗しました。手動で以下のURLを開いてください: ${url}`);
    }
}

// メイン実行
if (require.main === module) {
    const server = startServer();
    
    // コマンドライン引数の処理
    const args = process.argv.slice(2);
    if (args.includes('--open') || args.includes('-o')) {
        setTimeout(() => {
            openBrowser(`http://localhost:${PORT}/test/pwa-test-runner.html`);
        }, 1000);
    }
    
    if (args.includes('--auto-test')) {
        setTimeout(() => {
            openBrowser(`http://localhost:${PORT}/?run-pwa-tests`);
        }, 1000);
    }
}

module.exports = { createServer, startServer };