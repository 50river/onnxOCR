/**
 * ユーザーフレンドリーなエラー表示コンポーネント
 * エラーメッセージ、解決方法の提案、復旧機能を提供
 */

class ErrorDisplay {
    constructor() {
        this.container = null;
        this.currentError = null;
        this.retryCallback = null;
        this.dismissCallback = null;
        
        this.createContainer();
        this.bindEvents();
    }

    /**
     * エラー表示コンテナの作成
     */
    createContainer() {
        // 既存のコンテナがある場合は削除
        const existing = document.getElementById('error-display-container');
        if (existing) {
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'error-display-container';
        this.container.className = 'error-display-container';
        this.container.setAttribute('role', 'alert');
        this.container.setAttribute('aria-live', 'assertive');
        this.container.style.display = 'none';

        document.body.appendChild(this.container);
    }

    /**
     * イベントリスナーの設定
     */
    bindEvents() {
        // ESCキーでエラー表示を閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.container.style.display !== 'none') {
                this.hide();
            }
        });

        // オーバーレイクリックで閉じる
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hide();
            }
        });
    }

    /**
     * エラーの表示
     * @param {Object} errorResult - ErrorHandlerからの結果
     * @param {Function} retryCallback - 再試行コールバック
     * @param {Function} dismissCallback - 閉じるコールバック
     */
    show(errorResult, retryCallback = null, dismissCallback = null) {
        this.currentError = errorResult;
        this.retryCallback = retryCallback;
        this.dismissCallback = dismissCallback;

        const errorHtml = this.createErrorHtml(errorResult);
        this.container.innerHTML = errorHtml;
        this.container.style.display = 'flex';

        // アニメーション
        requestAnimationFrame(() => {
            this.container.classList.add('show');
        });

        // イベントリスナーを追加
        this.bindErrorEvents();

        // 音声通知（オプション）
        this.playErrorSound(errorResult.message.type);

        // 自動非表示（情報レベルのエラーのみ）
        if (errorResult.message.type === 'info') {
            setTimeout(() => {
                this.hide();
            }, 5000);
        }
    }

    /**
     * エラー表示の非表示
     */
    hide() {
        if (this.container.style.display === 'none') return;

        this.container.classList.remove('show');
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.container.innerHTML = '';
            
            if (this.dismissCallback) {
                this.dismissCallback();
            }
            
            this.currentError = null;
            this.retryCallback = null;
            this.dismissCallback = null;
        }, 300);
    }

    /**
     * エラー表示HTMLの作成
     * @param {Object} errorResult - エラー結果
     * @returns {string} HTML文字列
     */
    createErrorHtml(errorResult) {
        const { message, recovery, canRetry, suggestions } = errorResult;
        const iconClass = this.getIconClass(message.type);
        const typeClass = `error-${message.type}`;

        return `
            <div class="error-overlay">
                <div class="error-dialog ${typeClass}">
                    <div class="error-header">
                        <div class="error-icon">
                            <i class="${iconClass}" aria-hidden="true"></i>
                        </div>
                        <div class="error-title">
                            <h2>${this.escapeHtml(message.title)}</h2>
                            <button type="button" class="error-close" aria-label="エラーダイアログを閉じる">
                                <i class="icon-close" aria-hidden="true">×</i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="error-content">
                        <div class="error-message">
                            <p>${this.escapeHtml(message.message)}</p>
                        </div>
                        
                        ${recovery.success ? this.createRecoverySection(recovery) : ''}
                        
                        ${suggestions && suggestions.length > 0 ? this.createSuggestionsSection(suggestions, errorResult.message.prevention) : ''}
                        
                        <div class="error-actions">
                            ${canRetry && this.retryCallback ? `
                                <button type="button" class="btn btn-primary error-retry">
                                    <i class="icon-retry" aria-hidden="true">🔄</i>
                                    再試行
                                </button>
                            ` : ''}
                            
                            <button type="button" class="btn btn-secondary error-dismiss">
                                <i class="icon-check" aria-hidden="true">✓</i>
                                了解
                            </button>
                            
                            ${this.createAdditionalActions(errorResult)}
                        </div>
                        
                        <div class="error-details">
                            <button type="button" class="error-details-toggle" aria-expanded="false">
                                <i class="icon-chevron" aria-hidden="true">▼</i>
                                詳細情報
                            </button>
                            <div class="error-details-content" style="display: none;">
                                <div class="error-technical">
                                    <h4>技術的な詳細</h4>
                                    <p><strong>エラータイプ:</strong> ${errorResult.type}</p>
                                    ${recovery.action ? `<p><strong>実行された復旧処理:</strong> ${recovery.action}</p>` : ''}
                                    <p><strong>発生時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
                                </div>
                                
                                <div class="error-help">
                                    <h4>さらなるサポート</h4>
                                    <p>問題が解決しない場合は、以下をお試しください：</p>
                                    <ul>
                                        <li>ブラウザを再起動する</li>
                                        <li>デバイスを再起動する</li>
                                        <li>別のブラウザを使用する</li>
                                        <li>アプリのキャッシュをクリアする</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 復旧セクションの作成
     * @param {Object} recovery - 復旧結果
     * @returns {string} HTML文字列
     */
    createRecoverySection(recovery) {
        return `
            <div class="error-recovery">
                <div class="recovery-status success">
                    <i class="icon-success" aria-hidden="true">✓</i>
                    <span>自動復旧が完了しました</span>
                </div>
                <p class="recovery-message">${this.escapeHtml(recovery.message)}</p>
            </div>
        `;
    }

    /**
     * 提案セクションの作成
     * @param {Array} suggestions - 提案リスト
     * @param {Array} prevention - 予防策リスト
     * @returns {string} HTML文字列
     */
    createSuggestionsSection(suggestions, prevention = []) {
        const suggestionItems = suggestions.map(suggestion => 
            `<li>${this.escapeHtml(suggestion)}</li>`
        ).join('');

        let html = `
            <div class="error-suggestions">
                <h4>解決方法</h4>
                <ul class="solution-steps">
                    ${suggestionItems}
                </ul>
        `;

        if (prevention && prevention.length > 0) {
            const preventionItems = prevention.map(item => 
                `<li>${this.escapeHtml(item)}</li>`
            ).join('');
            
            html += `
                <div class="prevention-tips">
                    <h5>今後の予防策</h5>
                    <ul class="prevention-steps">
                        ${preventionItems}
                    </ul>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    }

    /**
     * 追加アクションの作成
     * @param {Object} errorResult - エラー結果
     * @returns {string} HTML文字列
     */
    createAdditionalActions(errorResult) {
        const actions = [];

        // エラータイプに応じた特別なアクション
        switch (errorResult.type) {
            case 'camera_error':
                actions.push(`
                    <button type="button" class="btn btn-outline error-action" data-action="switch-to-file">
                        <i class="icon-file" aria-hidden="true">📁</i>
                        ファイル選択に切り替え
                    </button>
                `);
                break;
                
            case 'storage_quota_exceeded':
                actions.push(`
                    <button type="button" class="btn btn-outline error-action" data-action="cleanup-storage">
                        <i class="icon-cleanup" aria-hidden="true">🧹</i>
                        ストレージをクリーンアップ
                    </button>
                `);
                break;
                
            case 'memory_error':
                actions.push(`
                    <button type="button" class="btn btn-outline error-action" data-action="reduce-quality">
                        <i class="icon-quality" aria-hidden="true">⚡</i>
                        品質を下げて続行
                    </button>
                `);
                break;
        }

        return actions.join('');
    }

    /**
     * エラーイベントのバインド
     */
    bindErrorEvents() {
        // 閉じるボタン
        const closeButton = this.container.querySelector('.error-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hide());
        }

        // 了解ボタン
        const dismissButton = this.container.querySelector('.error-dismiss');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => this.hide());
        }

        // 再試行ボタン
        const retryButton = this.container.querySelector('.error-retry');
        if (retryButton && this.retryCallback) {
            retryButton.addEventListener('click', () => {
                this.hide();
                this.retryCallback();
            });
        }

        // 詳細情報の切り替え
        const detailsToggle = this.container.querySelector('.error-details-toggle');
        const detailsContent = this.container.querySelector('.error-details-content');
        if (detailsToggle && detailsContent) {
            detailsToggle.addEventListener('click', () => {
                const isExpanded = detailsToggle.getAttribute('aria-expanded') === 'true';
                detailsToggle.setAttribute('aria-expanded', !isExpanded);
                detailsContent.style.display = isExpanded ? 'none' : 'block';
                
                const icon = detailsToggle.querySelector('.icon-chevron');
                if (icon) {
                    icon.textContent = isExpanded ? '▼' : '▲';
                }
            });
        }

        // 追加アクション
        const actionButtons = this.container.querySelectorAll('.error-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAdditionalAction(action);
            });
        });
    }

    /**
     * 追加アクションの処理
     * @param {string} action - アクション名
     */
    async handleAdditionalAction(action) {
        try {
            switch (action) {
                case 'switch-to-file':
                    await this.switchToFileInput();
                    break;
                case 'cleanup-storage':
                    await this.cleanupStorage();
                    break;
                case 'reduce-quality':
                    await this.reduceQuality();
                    break;
                default:
                    console.warn('未知のアクション:', action);
            }
            
            this.hide();
        } catch (error) {
            console.error('追加アクション実行エラー:', error);
        }
    }

    /**
     * ファイル入力への切り替え
     */
    async switchToFileInput() {
        const fileInput = document.getElementById('image-input');
        if (fileInput) {
            fileInput.removeAttribute('capture');
            fileInput.click();
        }
    }

    /**
     * ストレージクリーンアップ
     */
    async cleanupStorage() {
        if (window.storageManager) {
            const receipts = await window.storageManager.getAllReceipts({
                sortBy: 'lastAccessedAt',
                order: 'asc'
            });
            
            const toDelete = receipts.slice(0, Math.floor(receipts.length / 2));
            for (const receipt of toDelete) {
                await window.storageManager.deleteReceipt(receipt.id);
            }
            
            this.showSuccessMessage(`${toDelete.length}件のデータを削除しました`);
        }
    }

    /**
     * 品質削減
     */
    async reduceQuality() {
        window.imageQualityReduction = true;
        window.maxImageSize = { width: 1024, height: 1024 };
        this.showSuccessMessage('画像品質を下げました');
    }

    /**
     * 成功メッセージの表示
     * @param {string} message - メッセージ
     */
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-toast';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 10001;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    /**
     * アイコンクラスの取得
     * @param {string} type - メッセージタイプ
     * @returns {string} アイコンクラス
     */
    getIconClass(type) {
        const icons = {
            error: 'icon-error',
            warning: 'icon-warning', 
            info: 'icon-info'
        };
        return icons[type] || 'icon-info';
    }

    /**
     * エラー音の再生
     * @param {string} type - エラータイプ
     */
    playErrorSound(type) {
        // ユーザー設定で音声が有効な場合のみ再生
        if (!window.enableErrorSounds) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // エラータイプに応じた音程
            const frequencies = {
                error: 220,    // 低い音
                warning: 330,  // 中間の音
                info: 440      // 高い音
            };

            oscillator.frequency.setValueAtTime(frequencies[type] || 330, audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // 音声再生に失敗しても処理を続行
            console.warn('エラー音の再生に失敗:', error);
        }
    }

    /**
     * HTMLエスケープ
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 現在のエラー情報の取得
     * @returns {Object|null} 現在のエラー
     */
    getCurrentError() {
        return this.currentError;
    }

    /**
     * エラー表示の状態確認
     * @returns {boolean} 表示中かどうか
     */
    isVisible() {
        return this.container.style.display !== 'none';
    }
}

// グローバルに公開
window.ErrorDisplay = ErrorDisplay;