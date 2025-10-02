# PWA機能テスト

このディレクトリには、領収書OCRアプリのPWA機能をテストするためのツールが含まれています。

## テスト対象

- **要件6.1**: PWA機能（manifest.json、Service Worker、インストール可能性）
- **要件6.2**: オフライン動作（キャッシュ戦略、プリキャッシュ）
- **要件6.3**: キャッシュ更新（skipWaiting、clientsClaim）
- **要件6.4**: 即座更新機能

## テストファイル

### 1. `pwa-tests.js`
ブラウザ環境で実行される包括的なPWAテストスイート。

**機能:**
- Service Worker登録の確認
- Manifestファイルの検証
- インストール可能性のテスト
- オフライン機能のテスト
- キャッシュ戦略のテスト
- キャッシュ更新のテスト

### 2. `pwa-test-runner.html`
ブラウザでPWAテストを実行するためのGUIテストランナー。

**機能:**
- 視覚的なテスト実行インターフェース
- リアルタイムテスト結果表示
- 要件確認チェックリスト
- コンソール出力の表示

### 3. `run-pwa-tests.js`
Node.js環境で実行される静的ファイル検証テスト。

**機能:**
- プロジェクト構造の確認
- Manifestファイルの検証
- Service Workerファイルの検証
- HTMLメタタグの確認
- アイコンファイルの存在確認

## テスト実行方法

### 1. ブラウザ環境でのテスト（推奨）

```bash
# 開発サーバーを起動（例：Python）
python -m http.server 8000

# または Node.js
npx http-server

# ブラウザで以下のURLを開く
http://localhost:8000/test/pwa-test-runner.html
```

**手順:**
1. 「要件確認」で前提条件をチェック
2. 「PWAテストを実行」ボタンをクリック
3. テスト結果を確認

### 2. Node.js環境でのテスト

```bash
# プロジェクトルートで実行
node test/run-pwa-tests.js

# または実行権限を付与して直接実行
chmod +x test/run-pwa-tests.js
./test/run-pwa-tests.js
```

### 3. 自動テスト実行

URLパラメータを使用してページ読み込み時に自動実行:

```
http://localhost:8000/?run-pwa-tests
```

## テスト項目詳細

### Service Worker機能テスト

- [x] Service Worker登録の確認
- [x] install/activate/fetchイベントの実装確認
- [x] skipWaiting/clientsClaimの動作確認
- [x] メッセージング機能のテスト

### Manifest機能テスト

- [x] manifest.jsonの存在と有効性
- [x] 必須フィールドの確認（name, short_name, start_url, display, icons）
- [x] アイコンサイズの確認（192x192, 512x512）
- [x] PWA固有設定の確認

### オフライン機能テスト

- [x] プリキャッシュリソースの確認
- [x] キャッシュ戦略の動作確認（Cache First, Network First）
- [x] オフライン時のフォールバック動作
- [x] 動的キャッシュの動作

### インストール可能性テスト

- [x] PWA条件の確認（HTTPS、Service Worker、Manifest）
- [x] beforeinstallpromptイベントの監視
- [x] インストールプロンプトの表示確認

### キャッシュ更新テスト

- [x] Service Workerの更新検出
- [x] 即座更新機能（skipWaiting/clientsClaim）
- [x] キャッシュバージョン管理
- [x] 古いキャッシュの削除

## 期待される結果

### 成功時の出力例

```
🧪 PWA機能テストを開始します...

✅ Service Worker登録: Service Workerが正常に登録されました
✅ Service Worker状態: 状態: activated
✅ Manifest検証: Manifestファイルが有効です
✅ PWA条件: すべての条件を満たしています
✅ キャッシュ存在確認: キャッシュ数: 1
✅ プリキャッシュ: 7個のリソースがキャッシュされています
✅ Cache First (/styles/main.css): 読み込み時間: 2.34ms
✅ Cache First (/js/app.js): 読み込み時間: 1.89ms
✅ Service Worker通信: バージョン: 1.0.0

📊 PWAテスト結果サマリー
合格: 9/9
成功率: 100.0%

🎉 すべてのPWAテストに合格しました！
```

## トラブルシューティング

### よくある問題

1. **Service Workerが登録されない**
   - HTTPSまたはlocalhostで実行しているか確認
   - sw.jsファイルが正しいパスに存在するか確認

2. **キャッシュが動作しない**
   - Service Workerがアクティブ状態か確認
   - ブラウザの開発者ツールでキャッシュを確認

3. **インストールプロンプトが表示されない**
   - PWA条件をすべて満たしているか確認
   - 既にインストール済みでないか確認

4. **オフライン動作しない**
   - プリキャッシュリソースが正しく設定されているか確認
   - fetchイベントが適切に処理されているか確認

### デバッグ方法

1. **Chrome DevTools**
   - Application > Service Workers でSW状態を確認
   - Application > Storage でキャッシュ内容を確認
   - Network タブでオフライン動作をテスト

2. **Lighthouse監査**
   - PWAスコアと改善提案を確認
   - インストール可能性の詳細確認

3. **コンソールログ**
   - Service Workerのログを確認
   - エラーメッセージの詳細確認

## 次のステップ

テストが完了したら、以下を実行してください：

1. **実機テスト**: 実際のモバイルデバイスでテスト
2. **Lighthouse監査**: PWAスコアの確認
3. **パフォーマンステスト**: 初回読み込み時間の測定
4. **ユーザビリティテスト**: インストールフローの確認

## 関連ファイル

- `../manifest.json` - PWA Manifest
- `../sw.js` - Service Worker
- `../index.html` - メインHTML（PWAメタタグ含む）
- `../js/app.js` - Service Worker登録コード