# 領収書OCR - Receipt OCR App

スマートフォンのブラウザ上で完全にオフライン動作する領収書OCRアプリケーション。

## 🌟 特徴

- **完全オフライン動作**: インターネット接続不要でOCR処理を実行
- **PWA対応**: スマートフォンにインストール可能
- **自動フィールド抽出**: 日付・支払先・金額・適用の4項目を自動抽出
- **手動範囲選択**: 精度が低い箇所を手動で再OCR可能
- **データエクスポート**: JSON・CSV・ZIP形式での保存

## 🚀 デプロイメント状況

### GitHub Pages版（軽量版）
- **URL**: https://50river.github.io/onnxOCR/
- **エンジン**: Tesseract.js（軽量版）
- **状態**: ✅ 動作中（基本機能）

### 機能比較

| 機能 | GitHub Pages版 | フル版 |
|------|----------------|--------|
| OCRエンジン | Tesseract.js | ONNX Runtime Web + Tesseract.js |
| 処理速度 | 標準 | 高速 |
| 精度 | 標準 | 高精度 |
| オフライン動作 | ✅ | ✅ |
| PWA機能 | ✅ | ✅ |
| フィールド抽出 | ✅ | ✅ |
| 範囲選択OCR | ✅ | ✅ |

## 📱 使用方法

1. **画像の取り込み**
   - カメラで領収書を撮影、または既存画像を選択
   - 自動的にEXIF回転補正と透視補正を実行

2. **OCR処理**
   - 「OCR実行」ボタンをクリック
   - 自動的に4項目（日付・支払先・金額・適用）を抽出

3. **結果の確認・修正**
   - 抽出結果をフォームで確認
   - 精度が低い箇所は画像上で範囲選択して再OCR

4. **データの保存・エクスポート**
   - ローカルストレージに保存
   - JSON・CSV・ZIP形式でエクスポート

## 🛠️ 技術仕様

### アーキテクチャ
- **フロントエンド**: Vanilla JavaScript (ES6+)
- **OCRエンジン**: ONNX Runtime Web (WASM) / Tesseract.js
- **画像処理**: OpenCV.js
- **PWA**: Service Worker + Web App Manifest
- **ストレージ**: IndexedDB

### ONNX Runtime Web WASM対応
- **バックエンド**: WebGPU > WebGL > WASM の優先順位で自動選択
- **WASM最適化**: SIMD、マルチスレッド対応（環境に応じて自動設定）
- **モデル形式**: ONNX v1.11+ 対応
- **パフォーマンス**: Tesseract.jsの3-5倍高速（環境依存）

### 対応ブラウザ
- iOS Safari 16+
- Android Chrome 90+
- Desktop Chrome/Firefox/Safari

## 🔧 開発・テスト

### テストページ
- **基本動作テスト**: [test-basic.html](test-basic.html)
- **GitHub Pages テスト**: [github-pages-test.html](github-pages-test.html)
- **ONNX WASM テスト**: [test-onnx-wasm.html](test-onnx-wasm.html)
- **デバッグ診断**: [debug.html](debug.html)

### ローカル開発
```bash
# 必要なライブラリのダウンロード（初回のみ）
cd libs
node download-libraries.js

# 簡易HTTPサーバーの起動
python -m http.server 8000
# または
npx serve .

# ブラウザでアクセス
open http://localhost:8000

# ONNX Runtime Web WASM テスト
open http://localhost:8000/test-onnx-wasm.html
```

### 実際のONNXモデルの使用
GitHub Pages版では軽量なTesseract.jsを使用していますが、実際のONNXモデルを使用することで高精度・高速なOCR処理が可能です。

詳細は [ONNX_MODELS_SETUP.md](ONNX_MODELS_SETUP.md) を参照してください。

### テスト実行
```bash
# 全テストの実行
cd test
./run-all-tests.sh

# 個別テストの実行
open test/e2e-test-runner.html
open test/pwa-test-runner.html
```

## 📋 GitHub Pages デプロイメント

### 現在の状況
GitHub Pages環境では、大容量のONNXモデルファイルが利用できないため、Tesseract.jsフォールバックモードで動作しています。

### 自動対応機能
- GitHub Pages環境の自動検出
- Tesseract.jsフォールバックモードの自動有効化
- ユーザーへの軽量版モード通知
- エラーハンドリングの強化

### 対応ファイル
- `js/github-pages-fix.js` - GitHub Pages対応スクリプト
- `github-pages-test.html` - デプロイメントテストページ
- `debug.html` - 診断ページ
- `test-basic.html` - 基本動作確認ページ

## 🐛 トラブルシューティング

### よくある問題

1. **OCRが動作しない**
   - [debug.html](debug.html) で診断を実行
   - ブラウザのコンソールでエラーを確認
   - Tesseract.jsが正常に読み込まれているか確認

2. **画像が表示されない**
   - ファイル形式がサポートされているか確認（JPEG, PNG, WebP）
   - ファイルサイズが適切か確認（推奨: 10MB以下）

3. **PWAがインストールできない**
   - HTTPS環境で実行されているか確認
   - Service Workerが正常に登録されているか確認

### デバッグ方法
```javascript
// ブラウザコンソールでの診断
console.log('GitHub Pages Mode:', window.GITHUB_PAGES_MODE);
console.log('Force Fallback:', window.FORCE_TESSERACT_FALLBACK);
console.log('Tesseract Available:', typeof Tesseract !== 'undefined');
```

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

### 開発ガイドライン
1. コードスタイルの統一
2. テストの追加
3. ドキュメントの更新
4. ブラウザ互換性の確認

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesページでお知らせください。