/**
 * PNG アイコン生成スクリプト（プレースホルダー）
 * 実際のプロジェクトでは高品質な画像を使用してください
 */

const fs = require('fs');
const path = require('path');

// 最小限のPNGファイル（1x1ピクセルの透明PNG）のBase64データ
const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';

// 簡単な色付きPNGを生成する関数
function createColoredPNG(size, color = '#2563eb') {
    // 実際のプロジェクトでは、Canvas APIやImageライブラリを使用
    // ここではプレースホルダーとして最小限のPNGを返す
    return Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');
}

// 必要なアイコンサイズ
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generatePNGIcons() {
    console.log('🖼️  PNG アイコンを生成中...');
    
    for (const size of iconSizes) {
        const pngData = createColoredPNG(size);
        const filename = `icon-${size}x${size}.png`;
        const filepath = path.join(__dirname, filename);
        
        fs.writeFileSync(filepath, pngData);
        console.log(`✅ 生成完了: ${filename} (${pngData.length} bytes)`);
    }
    
    console.log('\n⚠️  注意: これらはテスト用のプレースホルダーアイコンです');
    console.log('実際のプロジェクトでは、以下を実行してください:');
    console.log('1. デザイナーに依頼して高品質なアイコンを作成');
    console.log('2. PWA Icon Generatorなどのツールを使用');
    console.log('3. 各サイズに最適化されたアイコンを配置');
    
    console.log('\n🎉 プレースホルダーアイコン生成完了！');
}

// スクリプト実行
if (require.main === module) {
    generatePNGIcons().catch(console.error);
}

module.exports = { generatePNGIcons };