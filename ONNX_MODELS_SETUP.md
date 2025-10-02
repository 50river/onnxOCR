# ONNX モデルセットアップガイド

## 概要

このアプリケーションでONNX Runtime WebのWASMバックエンドを使用して高精度なOCR処理を行うには、実際のONNXモデルファイルが必要です。

## 必要なモデルファイル

以下の4つのファイルを `models/` ディレクトリに配置する必要があります：

1. **text_det.onnx** - テキスト検出モデル（約20-50MB）
2. **text_rec_jp.onnx** - 日本語テキスト認識モデル（約10-30MB）
3. **text_angle.onnx** - テキスト角度分類モデル（約1-5MB）
4. **charset_jp.txt** - 日本語文字セット（約10KB）

## モデルの取得方法

### オプション1: PaddleOCRモデルの使用

PaddleOCRは高品質なオープンソースOCRモデルを提供しています。

```bash
# PaddleOCRモデルのダウンロード
mkdir -p models
cd models

# テキスト検出モデル
wget https://paddleocr.bj.bcebos.com/PP-OCRv3/multilingual/Multilingual_PP-OCRv3_det_infer.tar
tar -xf Multilingual_PP-OCRv3_det_infer.tar
# ONNXに変換が必要

# 日本語認識モデル
wget https://paddleocr.bj.bcebos.com/PP-OCRv3/multilingual/japan_PP-OCRv3_rec_infer.tar
tar -xf japan_PP-OCRv3_rec_infer.tar
# ONNXに変換が必要

# 角度分類モデル
wget https://paddleocr.bj.bcebos.com/dygraph_v2.0/ch/ch_ppocr_mobile_v2.0_cls_infer.tar
tar -xf ch_ppocr_mobile_v2.0_cls_infer.tar
# ONNXに変換が必要
```

### オプション2: 事前変換済みONNXモデルの使用

以下のリポジトリから事前にONNX形式に変換されたモデルを取得できます：

```bash
# 例：RapidOCRのONNXモデル
git clone https://github.com/RapidAI/RapidOCR.git
cp RapidOCR/python/rapidocr_onnxruntime/models/*.onnx models/
```

### オプション3: カスタムモデルの作成

独自のデータセットでトレーニングしたモデルを使用する場合：

1. PyTorchまたはTensorFlowでモデルをトレーニング
2. ONNX形式にエクスポート
3. ONNX Runtime Webで動作することを確認

## モデル変換（PaddleOCRの場合）

PaddleOCRモデルをONNX形式に変換する方法：

```python
import paddle
import paddle2onnx

# PaddleOCRモデルをONNXに変換
def convert_paddle_to_onnx(model_dir, save_file):
    paddle2onnx.command.c_paddle_to_onnx(
        model_file=f"{model_dir}/inference.pdmodel",
        params_file=f"{model_dir}/inference.pdiparams",
        save_file=save_file,
        opset_version=11,
        enable_onnx_checker=True
    )

# 各モデルの変換
convert_paddle_to_onnx("Multilingual_PP-OCRv3_det_infer", "models/text_det.onnx")
convert_paddle_to_onnx("japan_PP-OCRv3_rec_infer", "models/text_rec_jp.onnx")
convert_paddle_to_onnx("ch_ppocr_mobile_v2.0_cls_infer", "models/text_angle.onnx")
```

## 文字セットファイルの作成

日本語文字セットファイル（charset_jp.txt）を作成：

```python
# 日本語文字セットの生成
import unicodedata

def generate_japanese_charset():
    charset = []
    
    # ひらがな
    for i in range(0x3041, 0x3097):
        charset.append(chr(i))
    
    # カタカナ
    for i in range(0x30A1, 0x30F7):
        charset.append(chr(i))
    
    # 漢字（常用漢字の一部）
    common_kanji = "一二三四五六七八九十百千万円年月日時分秒人大小中高低新古好悪美醜..."
    charset.extend(list(common_kanji))
    
    # 英数字
    charset.extend(list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"))
    
    # 記号
    charset.extend(list(".,!?-()[]{}\"'"))
    
    return charset

# ファイルに保存
with open("models/charset_jp.txt", "w", encoding="utf-8") as f:
    for char in generate_japanese_charset():
        f.write(char + "\n")
```

## モデルの最適化

ONNX Runtime Web用にモデルを最適化：

```python
import onnx
from onnxruntime.tools import optimizer

def optimize_model(input_path, output_path):
    # モデルの読み込み
    model = onnx.load(input_path)
    
    # 最適化の実行
    optimized_model = optimizer.optimize_model(
        model,
        model_type='bert',  # または適切なモデルタイプ
        num_heads=0,
        hidden_size=0,
        optimization_options=None,
        opt_level=99
    )
    
    # 最適化されたモデルの保存
    onnx.save(optimized_model, output_path)

# 各モデルの最適化
optimize_model("models/text_det.onnx", "models/text_det_optimized.onnx")
optimize_model("models/text_rec_jp.onnx", "models/text_rec_jp_optimized.onnx")
optimize_model("models/text_angle.onnx", "models/text_angle_optimized.onnx")
```

## モデルサイズの確認

```bash
# モデルファイルのサイズを確認
ls -lh models/*.onnx

# 期待されるサイズ：
# text_det.onnx: 20-50MB
# text_rec_jp.onnx: 10-30MB  
# text_angle.onnx: 1-5MB
# charset_jp.txt: ~10KB
```

## テスト方法

モデルが正しく配置されているかテスト：

```bash
# テストページでモデルファイルを確認
open debug.html

# または直接ファイルの存在確認
curl -I http://localhost:8000/models/text_det.onnx
curl -I http://localhost:8000/models/text_rec_jp.onnx
curl -I http://localhost:8000/models/text_angle.onnx
curl -I http://localhost:8000/models/charset_jp.txt
```

## パフォーマンス最適化

### WASMバックエンドの設定

アプリケーションは自動的に以下の最適化を適用します：

- マルチスレッド処理（利用可能な場合）
- SIMD命令の使用
- メモリアリーナの有効化
- グラフ最適化レベル：all

### メモリ使用量の最適化

大きなモデルを使用する場合のメモリ最適化：

```javascript
// js/ocr-engine.js で設定済み
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
ort.env.wasm.simd = true;
ort.env.wasm.proxy = true;
```

## トラブルシューティング

### よくある問題

1. **モデルファイルが見つからない**
   ```
   Error: 検出モデルファイルが見つかりません: models/text_det.onnx
   ```
   → モデルファイルが正しい場所に配置されているか確認

2. **モデルサイズが小さすぎる**
   ```
   Warning: モデルファイルのサイズが小さすぎます
   ```
   → プレースホルダーファイルではなく実際のONNXモデルを配置

3. **WASM初期化エラー**
   ```
   Error: WebAssembly instantiation failed
   ```
   → ブラウザのWebAssembly対応状況を確認

4. **メモリ不足エラー**
   ```
   Error: Cannot allocate memory
   ```
   → より小さなモデルを使用するか、メモリ設定を調整

### デバッグ方法

```javascript
// ブラウザコンソールでの確認
console.log('ONNX Runtime Version:', ort.version);
console.log('Available Backends:', ort.env.backends);
console.log('WASM Features:', {
    simd: ort.env.wasm.simd,
    threads: ort.env.wasm.numThreads,
    proxy: ort.env.wasm.proxy
});
```

## ライセンスと利用規約

使用するモデルのライセンスを必ず確認してください：

- **PaddleOCR**: Apache License 2.0
- **RapidOCR**: Apache License 2.0
- **カスタムモデル**: 独自のライセンス

商用利用の場合は、各モデルのライセンス条項に従ってください。