/**
 * PWAアイコン生成スクリプト
 * テスト用のプレースホルダーアイコンを生成
 */

const fs = require('fs');
const path = require('path');

// 必要なアイコンサイズ
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVGテンプレート
function createSVGIcon(size) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
    </defs>
    
    <!-- 背景 -->
    <rect width="${size}" height="${size}" rx="${size * 0.1}" fill="url(#grad)"/>
    
    <!-- 領収書アイコン -->
    <g transform="translate(${size * 0.2}, ${size * 0.15})">
        <!-- 紙 -->
        <rect x="0" y="0" width="${size * 0.6}" height="${size * 0.7}" rx="${size * 0.02}" fill="white" opacity="0.95"/>
        
        <!-- テキスト行 -->
        <rect x="${size * 0.05}" y="${size * 0.1}" width="${size * 0.5}" height="${size * 0.03}" rx="${size * 0.01}" fill="#2563eb" opacity="0.3"/>
        <rect x="${size * 0.05}" y="${size * 0.18}" width="${size * 0.4}" height="${size * 0.03}" rx="${size * 0.01}" fill="#2563eb" opacity="0.3"/>
        <rect x="${size * 0.05}" y="${size * 0.26}" width="${size * 0.45}" height="${size * 0.03}" rx="${size * 0.01}" fill="#2563eb" opacity="0.3"/>
        
        <!-- 金額部分 -->
        <rect x="${size * 0.05}" y="${size * 0.4}" width="${size * 0.3}" height="${size * 0.05}" rx="${size * 0.01}" fill="#dc2626" opacity="0.6"/>
        
        <!-- OCRスキャンライン -->
        <rect x="0" y="${size * 0.55}" width="${size * 0.6}" height="${size * 0.01}" fill="#10b981" opacity="0.8"/>
    </g>
    
    <!-- サイズ表示 -->
    <text x="${size/2}" y="${size * 0.95}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.08}" fill="white" opacity="0.7">${size}px</text>
</svg>`;
}

// PNG変換用のCanvas実装（Node.js環境用）
function createPNGIcon(size) {
    // 簡単なPNG生成（実際のプロジェクトではより高品質な画像を使用）
    const canvas = `data:image/svg+xml;base64,${Buffer.from(createSVGIcon(size)).toString('base64')}`;
    return canvas;
}

// アイコンファイルの生成
async function generateIcons() {
    console.log('🎨 PWAアイコンを生成中...');
    
    for (const size of iconSizes) {
        const svgContent = createSVGIcon(size);
        const filename = `icon-${size}x${size}.svg`;
        const filepath = path.join(__dirname, filename);
        
        fs.writeFileSync(filepath, svgContent);
        console.log(`✅ 生成完了: ${filename}`);
    }
    
    // PNG版も生成（SVGをPNGに変換するためのプレースホルダー）
    console.log('\n📝 PNG版の生成について:');
    console.log('実際のプロジェクトでは、以下のツールでSVGをPNGに変換してください:');
    console.log('- ImageMagick: convert icon.svg -resize 192x192 icon-192x192.png');
    console.log('- Inkscape: inkscape --export-png=icon-192x192.png --export-width=192 icon.svg');
    console.log('- オンラインツール: https://convertio.co/svg-png/');
    
    console.log('\n🎉 アイコン生成完了！');
}

// スクリプト実行
if (require.main === module) {
    generateIcons().catch(console.error);
}

module.exports = { createSVGIcon, generateIcons };