#!/bin/bash

# PWA機能テスト実行スクリプト
# 要件6.1, 6.2の検証を行う

set -e

echo "🧪 PWA機能テスト実行スクリプト"
echo "================================"
echo ""

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

echo "📋 1. 静的ファイル検証テスト"
echo "----------------------------"
node test/run-pwa-tests.js

echo ""
echo "📋 2. アイコンファイル確認"
echo "----------------------------"
if [ ! -f "assets/icons/icon-192x192.png" ]; then
    echo "⚠️  アイコンファイルが見つかりません。生成します..."
    node assets/icons/create-png-icons.js
else
    echo "✅ アイコンファイルが存在します"
fi

echo ""
echo "📋 3. Service Worker構文チェック"
echo "----------------------------"
if command -v node >/dev/null 2>&1; then
    node -c sw.js && echo "✅ Service Worker構文OK" || echo "❌ Service Worker構文エラー"
else
    echo "⚠️  Node.jsが見つかりません。構文チェックをスキップします"
fi

echo ""
echo "📋 4. Manifest構文チェック"
echo "----------------------------"
if command -v jq >/dev/null 2>&1; then
    jq . manifest.json > /dev/null && echo "✅ Manifest JSON構文OK" || echo "❌ Manifest JSON構文エラー"
else
    # jqがない場合はNode.jsで検証
    node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('✅ Manifest JSON構文OK')" 2>/dev/null || echo "❌ Manifest JSON構文エラー"
fi

echo ""
echo "📋 5. ブラウザテスト用サーバー起動"
echo "----------------------------"
echo "ブラウザテストを実行するには、以下のコマンドを実行してください:"
echo ""
echo "  # サーバー起動"
echo "  node test/start-test-server.js"
echo ""
echo "  # ブラウザを自動で開く"
echo "  node test/start-test-server.js --open"
echo ""
echo "  # 自動テスト実行"
echo "  node test/start-test-server.js --auto-test"
echo ""

echo "📋 6. 画像前処理テスト確認"
echo "----------------------------"
if [ -f "test/image-preprocessing-tests.js" ]; then
    echo "✅ 画像前処理テストファイルが存在します"
    if [ -f "test/image-preprocessing-test-runner.html" ]; then
        echo "✅ 画像前処理テストランナーが存在します"
    else
        echo "⚠️  画像前処理テストランナーが見つかりません"
    fi
else
    echo "❌ 画像前処理テストファイルが見つかりません"
fi

echo ""
echo "📋 7. OCRエンジン初期化テスト確認"
echo "----------------------------"
if [ -f "test/ocr-engine-initialization-tests.js" ]; then
    echo "✅ OCRエンジン初期化テストファイルが存在します"
    if [ -f "test/ocr-engine-initialization-test-runner.html" ]; then
        echo "✅ OCRエンジン初期化テストランナーが存在します"
    else
        echo "⚠️  OCRエンジン初期化テストランナーが見つかりません"
    fi
else
    echo "❌ OCRエンジン初期化テストファイルが見つかりません"
fi

echo ""
echo "📋 8. OCRパイプラインテスト確認"
echo "----------------------------"
if [ -f "test/ocr-pipeline-tests.js" ]; then
    echo "✅ OCRパイプラインテストファイルが存在します"
    if [ -f "test/ocr-pipeline-test-runner.html" ]; then
        echo "✅ OCRパイプラインテストランナーが存在します"
    else
        echo "⚠️  OCRパイプラインテストランナーが見つかりません"
    fi
else
    echo "❌ OCRパイプラインテストファイルが見つかりません"
fi

echo ""
echo "📋 9. E2Eテスト確認"
echo "----------------------------"
if [ -f "test/e2e-tests.js" ]; then
    echo "✅ E2Eテストファイルが存在します"
    if [ -f "test/e2e-test-runner.html" ]; then
        echo "✅ E2Eテストランナーが存在します"
    else
        echo "⚠️  E2Eテストランナーが見つかりません"
    fi
else
    echo "❌ E2Eテストファイルが見つかりません"
fi

echo ""
echo "📋 10. 推奨テスト手順"
echo "----------------------------"
echo "1. 上記コマンドでサーバーを起動"
echo "2. ブラウザでテストランナーを開く:"
echo "   - PWAテスト: http://localhost:3000/test/pwa-test-runner.html"
echo "   - 画像前処理テスト: http://localhost:3000/test/image-preprocessing-test-runner.html"
echo "   - OCRエンジン初期化テスト: http://localhost:3000/test/ocr-engine-initialization-test-runner.html"
echo "   - OCRパイプラインテスト: http://localhost:3000/test/ocr-pipeline-test-runner.html"
echo "   - E2Eテスト: http://localhost:3000/test/e2e-test-runner.html"
echo "3. 各テストランナーで対応するテストを実行"
echo "4. Chrome DevToolsでLighthouse監査を実行"
echo "5. オフライン動作を確認（DevTools > Network > Offline）"
echo "6. インストール可能性を確認（アドレスバーのインストールアイコン）"
echo "7. E2Eテストで完全なワークフローを検証"
echo ""

echo "🎉 静的テストが完了しました！"
echo "ブラウザ環境でのテストを実行してPWA機能、画像前処理機能、OCRエンジン初期化機能、OCRパイプライン機能、E2E機能を完全に検証してください。"