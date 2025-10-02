/**
 * Service Worker for Receipt OCR App
 * オフライン対応とキャッシュ戦略の実装
 */

const CACHE_NAME = 'receipt-ocr-v1';
const CACHE_VERSION = '1.0.0';

// プリキャッシュするリソース
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/js/app.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// 動的にキャッシュするリソースのパターン
const CACHE_PATTERNS = {
  libs: /^\/libs\//,
  models: /^\/models\//,
  assets: /^\/assets\//,
  images: /\.(png|jpg|jpeg|gif|webp|svg)$/i,
  fonts: /\.(woff|woff2|ttf|eot)$/i
};

// キャッシュ戦略の設定
const CACHE_STRATEGIES = {
  // アプリケーションシェル: Cache First
  shell: ['/', '/index.html', '/styles/main.css', '/js/app.js'],
  
  // ライブラリとモデル: Cache First (長期間)
  libs: ['/libs/', '/models/'],
  
  // アセット: Cache First
  assets: ['/assets/'],
  
  // API: Network First (将来の拡張用)
  api: ['/api/']
};

/**
 * Service Worker のインストール
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching resources');
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Precaching completed');
        // 即座に新しいService Workerをアクティブにする
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

/**
 * Service Worker のアクティベーション
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    Promise.all([
      // 古いキャッシュの削除
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 即座にすべてのクライアントを制御下に置く
      self.clients.claim()
    ])
  );
});

/**
 * フェッチイベントの処理
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 同一オリジンのリクエストのみ処理
  if (url.origin !== location.origin) {
    return;
  }
  
  // リクエストタイプに応じた戦略を選択
  const strategy = getStrategyForRequest(request);
  
  event.respondWith(
    executeStrategy(strategy, request)
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        return getFallbackResponse(request);
      })
  );
});

/**
 * リクエストに応じた戦略を決定
 */
function getStrategyForRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // アプリケーションシェル
  if (CACHE_STRATEGIES.shell.some(pattern => pathname === pattern || pathname.startsWith(pattern))) {
    return 'cacheFirst';
  }
  
  // ライブラリとモデル
  if (CACHE_PATTERNS.libs.test(pathname) || CACHE_PATTERNS.models.test(pathname)) {
    return 'cacheFirst';
  }
  
  // アセット（画像、フォントなど）
  if (CACHE_PATTERNS.assets.test(pathname) || 
      CACHE_PATTERNS.images.test(pathname) || 
      CACHE_PATTERNS.fonts.test(pathname)) {
    return 'cacheFirst';
  }
  
  // その他のリソース
  return 'networkFirst';
}

/**
 * Cache First 戦略
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  const networkResponse = await fetch(request);
  
  // 成功したレスポンスをキャッシュに保存
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Network First 戦略
 */
async function networkFirst(request) {
  try {
    console.log('[SW] Network first, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    // 成功したレスポンスをキャッシュに保存
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * 戦略の実行
 */
async function executeStrategy(strategy, request) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    default:
      return fetch(request);
  }
}

/**
 * フォールバック レスポンスの取得
 */
async function getFallbackResponse(request) {
  const url = new URL(request.url);
  
  // HTMLページの場合はオフラインページを返す
  if (request.destination === 'document') {
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
  }
  
  // 画像の場合はプレースホルダーを返す
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#f3f4f6"/>' +
      '<text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="sans-serif" font-size="14" fill="#6b7280">' +
      'オフライン' +
      '</text>' +
      '</svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  // その他の場合は404を返す
  return new Response('Not Found', { status: 404 });
}

/**
 * メッセージイベントの処理
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION',
        payload: { version: CACHE_VERSION, cacheName: CACHE_NAME }
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'CACHE_RESOURCE':
      if (payload && payload.url) {
        cacheResource(payload.url).then(() => {
          event.ports[0].postMessage({ type: 'RESOURCE_CACHED', payload: { url: payload.url } });
        });
      }
      break;
  }
});

/**
 * キャッシュのクリア
 */
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

/**
 * 特定のリソースをキャッシュ
 */
async function cacheResource(url) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(url);
    console.log('[SW] Resource cached:', url);
  } catch (error) {
    console.error('[SW] Failed to cache resource:', url, error);
  }
}

/**
 * 定期的なキャッシュクリーンアップ
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(performCacheCleanup());
  }
});

/**
 * キャッシュクリーンアップの実行
 */
async function performCacheCleanup() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  // 古いエントリの削除（例：1週間以上古い）
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');
    
    if (dateHeader) {
      const responseDate = new Date(dateHeader).getTime();
      if (responseDate < oneWeekAgo) {
        await cache.delete(request);
        console.log('[SW] Cleaned up old cache entry:', request.url);
      }
    }
  }
}

/**
 * プッシュ通知の処理（将来の拡張用）
 */
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      tag: 'receipt-ocr-notification',
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: '開く'
        },
        {
          action: 'close',
          title: '閉じる'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

/**
 * 通知クリックの処理
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker script loaded');