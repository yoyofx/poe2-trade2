import { TreeView } from './TreeView.js';
import { subscriptionManager } from '../logic/subscription-manager.js';
import { getTrade2State } from '../utils/state.js';
import { itemTypeMap } from '../utils/constants.js';
import { getMultiselectElements, toSign } from '../logic/parser.js';
import { fetchAndAnalyze } from '../utils/api.js';

export class Sidebar {
    constructor() {
        this.isVisible = false;
        this.isPinned = false;
        this.activeTab = 'collections';
        this.container = null;
        this.collectionsTree = null;
        this.searchesTree = null;
        this.init();
        window.poe2SidebarInstance = this;
    }

    init() {
        this.createSidebarElement();
        this.attachEventListeners();
        this.checkVersion().then(() => {
            this.collectionsTree = new TreeView('collections-tree', 'poe2_collections', this);
            this.searchesTree = new TreeView('searches-tree', 'poe2_searches', this);
            this.renderAffixLimitGrid();
        });
    }

    checkVersion() {
        return new Promise((resolve) => {
            const trade2state = getTrade2State();
            const currentLeague = trade2state ? trade2state.league : null;
            if (!currentLeague) return resolve();

            chrome.storage.local.get(['version'], (result) => {
                const storedVersion = result.version;
                if (!storedVersion) {
                    chrome.storage.local.set({ version: currentLeague });
                    resolve();
                } else if (storedVersion !== currentLeague) {
                    if (confirm(`数据过期 (缓存: ${storedVersion}, 当前: ${currentLeague})，是否清空?`)) {
                        chrome.storage.local.remove(['poe2_collections', 'poe2_searches', 'version'], () => {
                            chrome.storage.local.set({ version: currentLeague });
                            resolve();
                        });
                    } else resolve();
                } else resolve();
            });
        });
    }

    createSidebarElement() {
        const sidebarHTML = `
            <div id="poe2-sidebar-toggle" title="切换侧边栏">★</div>
            <div class="sidebar-header">
                <span>流放之路2助手</span>
                <div id="btn-pin-sidebar" class="sidebar-pin-btn" title="固定侧边栏">📌</div>
            </div>
            <div class="sidebar-tabs">
                <div class="sidebar-tab active" data-tab="collections">物品收藏</div>
                <div class="sidebar-tab" data-tab="searches">搜索</div>
            </div>
            <div class="sidebar-content">
                <div id="tab-collections" class="tab-pane active">
                    <div class="tab-actions-sticky">
                        <button id="btn-add-folder-collection" class="btn-primary">+ 新建文件夹</button>
                        <div class="config-actions-row">
                            <button id="btn-export-collection" class="btn-secondary">导出配置</button>
                            <button id="btn-import-collection" class="btn-secondary">导入配置</button>
                            <input type="file" id="file-import-collection" accept=".json" style="display: none;" />
                        </div>
                    </div>
                    <div id="collections-tree" class="tree-root"></div>
                </div>
                <div id="tab-searches" class="tab-pane">
                    <div class="sidebar-section" id="section-subscription-management" style="display:none; flex-direction: column;">
                        <div class="sidebar-section-header">
                            <span>订阅管理</span>
                            <span class="section-toggle">▶</span>
                        </div>
                        <div class="sidebar-section-content">
                            <div class="subscription-list"></div>
                        </div>
                    </div>
                    <div class="sidebar-section expanded" id="section-search-collections">
                        <div class="sidebar-section-header">
                            <span>搜索收藏</span>
                            <span class="section-toggle">▼</span>
                        </div>
                        <div class="sidebar-section-content open" style="display: flex; flex-direction: column;">
                            <div class="tab-actions-sticky">
                                <button id="btn-add-folder-search" class="btn-primary">+ 新建文件夹</button>
                                <button id="btn-save-search" class="btn-primary">保存当前搜索</button>
                            </div>
                            <div id="searches-tree" class="tree-root"></div>
                        </div>
                    </div>
                    <div class="sidebar-section expanded" id="section-search-enhancements">
                        <div class="sidebar-section-header">
                            <span>搜索词缀预览</span>
                            <span class="section-toggle">▼</span>
                        </div>
                        <div class="sidebar-section-content open">
                            <div id="affix-limit-section">
                                <div class="affix-limit-header">
                                    <div class="affix-limit-title-group">
                                        <span class="affix-limit-title">物品词缀限制</span>
                                        <span class="affix-limit-subtitle">词缀限制来源于流放编年史</span>
                                    </div>
                                    <span class="affix-limit-toggle">▶</span>
                                </div>
                                <div class="affix-limit-content" style="display: none;"></div>
                            </div>
                            <div id="affix-info-panel" class="affix-info-panel" style="display: none;">
                                <div class="affix-info-header">
                                    <span>词缀预览</span>
                                </div>
                                <div class="affix-info-scroll"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.container = document.createElement('div');
        this.container.id = 'poe2-trade-sidebar';
        this.container.className = 'collapsed';
        this.container.innerHTML = sidebarHTML;
        document.body.appendChild(this.container);
    }

    attachEventListeners() {
        this.container.querySelector('#poe2-sidebar-toggle').onclick = () => this.toggle();
        this.container.querySelector('#btn-pin-sidebar').onclick = () => this.togglePin();
        
        this.container.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });

        document.getElementById('btn-add-folder-collection').onclick = () => {
            const name = prompt('文件夹名称:');
            if (name) this.collectionsTree.addFolder(name);
        };

        const btnExport = document.getElementById('btn-export-collection');
        if (btnExport) {
            btnExport.onclick = () => {
                chrome.storage.local.get(['poe2_collections'], (result) => {
                    const data = result['poe2_collections'] || [];
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `poe2_collections_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                });
            };
        }

        const btnImport = document.getElementById('btn-import-collection');
        const fileInput = document.getElementById('file-import-collection');
        if (btnImport && fileInput) {
            btnImport.onclick = () => confirm('导入配置将覆盖当前的收藏物品，确定继续吗?') && fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (Array.isArray(data)) {
                            chrome.storage.local.set({ 'poe2_collections': data }, () => {
                                alert('配置导入成功!');
                                this.collectionsTree.load();
                            });
                        } else alert('无效格式');
                    } catch (err) { alert('解析失败: ' + err.message); }
                    fileInput.value = '';
                };
                reader.readAsText(file);
            };
        }

        document.getElementById('btn-add-folder-search').onclick = () => {
            const name = prompt('文件夹名称:');
            if (name) this.searchesTree.addFolder(name);
        };

        document.getElementById('btn-save-search').onclick = () => {
            const name = prompt('搜索名称:');
            if (name !== null) this.searchesTree.addItem({ id: Date.now().toString(), name: name || '已保存的搜索', url: window.location.href });
        };

        this.container.querySelectorAll('.sidebar-section-header').forEach(header => {
            header.onclick = () => {
                const content = header.nextElementSibling;
                const toggleBtn = header.querySelector('.section-toggle');
                const section = header.parentElement;
                const isOpen = content.classList.contains('open');

                content.classList.toggle('open', !isOpen);
                section.classList.toggle('expanded', !isOpen);
                content.style.display = isOpen ? 'none' : (section.id === 'section-search-collections' ? 'flex' : 'block');
                if (toggleBtn) toggleBtn.textContent = isOpen ? '▶' : '▼';
            };
        });

        const affixHeader = this.container.querySelector('.affix-limit-header');
        if (affixHeader) {
            affixHeader.onclick = () => {
                const content = this.container.querySelector('.affix-limit-content');
                const toggleBtn = this.container.querySelector('.affix-limit-toggle');
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'grid' : 'none';
                toggleBtn.textContent = isHidden ? '▼' : '▶';
            };
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.classList.toggle('collapsed', !this.isVisible);
        if (this.isVisible && !this.isPinned) this.togglePin();
        else if (!this.isVisible && this.isPinned) this.togglePin();
    }

    togglePin() {
        this.isPinned = !this.isPinned;
        this.container.querySelector('#btn-pin-sidebar').classList.toggle('active', this.isPinned);
        document.body.style.marginRight = this.isPinned ? '476px' : '';
        if (this.isPinned && !this.isVisible) {
            this.isVisible = true;
            this.container.classList.remove('collapsed');
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        this.container.querySelectorAll('.sidebar-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        this.container.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
        if (tabName === 'searches') {
            chrome.storage.local.get(['subscription_guide_shown'], (res) => {
                if (!res.subscription_guide_shown) setTimeout(() => this.showSubscriptionGuide(), 300);
            });
        }
    }

    addToCollection(itemData) {
        this.collectionsTree.addItem(itemData);
        if (!this.isVisible) this.toggle();
        this.switchTab('collections');
    }

    removeFromCollection(itemId) {
        this.collectionsTree.deleteNode(itemId);
    }

    renderAffixInfoPanel(allixes) {
        const panel = this.container.querySelector('#affix-info-panel');
        const scroll = panel.querySelector('.affix-info-scroll');
        if (!allixes) { panel.style.display = 'none'; return; }
        scroll.innerHTML = '';
        allixes.forEach(affix => {
            const row = document.createElement('div');
            row.className = `affix-info-item mod-source-${affix.source}`;
            const sourceMap = { 'normal': '普通', 'desecrated': '亵渎', 'essence': '精华', 'perfect_essence': '完美精华', 'bonded': '绑定词缀', 'corrupted': '腐化词缀', 'socketable': '增幅器词缀' };
            row.textContent = affix.source === 'normal' ? affix.sign : `【${sourceMap[affix.source] || affix.source}】${affix.sign}`;
            scroll.appendChild(row);
        });
        panel.style.display = 'flex';
    }

    renderAffixLimitGrid() {
        const grid = this.container.querySelector('.affix-limit-content');
        if (!grid) return;
        grid.innerHTML = '';
        itemTypeMap.forEach((val, key) => {
            const el = document.createElement('div');
            el.className = 'affix-limit-item';
            el.textContent = key;
            el.style.backgroundColor = `hsl(${Math.random() * 360}, 60%, 30%)`;
            el.onclick = () => {
                const isSelected = el.classList.contains('selected');
                grid.querySelectorAll('.affix-limit-item').forEach(i => i.classList.remove('selected'));
                const els = getMultiselectElements();
                if (isSelected) {
                    els.forEach(e => e.style.display = '');
                    this.renderAffixInfoPanel(null);
                    return;
                }
                el.classList.add('selected');
                fetchAndAnalyze(`https://poe2db.tw/cn/${val}`).then(r => {
                    if (!el.classList.contains('selected')) return;
                    const all = [...r.prefixes, ...r.suffixes];
                    this.renderAffixInfoPanel(all);
                    els.forEach(e => {
                        const text = e.querySelector('span')?.querySelector('span')?.textContent || e.innerText.trim();
                        e.style.display = all.some(a => a.sign === toSign(text)) ? 'block' : 'none';
                    });
                });
            };
            grid.appendChild(el);
        });
    }

    addSubscriptionToUI(id, url, name) {
        const section = this.container.querySelector('#section-subscription-management');
        const list = section.querySelector('.subscription-list');
        section.style.display = 'flex';
        if (!section.classList.contains('expanded')) section.querySelector('.sidebar-section-header').click();
        if (list.querySelector(`.subscription-item[data-id="${id}"]`)) return;
        const item = document.createElement('div');
        item.className = 'subscription-item';
        item.dataset.id = id;
        item.innerHTML = `<div class="sub-icon-wrapper"><svg class="sub-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div><div class="sub-info"><div class="sub-name" title="${name}">${name}</div><div class="sub-status">正在监听...</div></div><button class="sub-close-btn" title="取消订阅">×</button>`;
        item.querySelector('.sub-close-btn').onclick = (e) => { e.stopPropagation(); subscriptionManager.unsubscribe(id); item.remove(); };
        list.appendChild(item);
        list.style.display = 'block';
    }

    showSubscriptionGuide() {
        const steps = [
            { title: '保存搜索', icon: '💾', content: '首先,点击"保存当前搜索"按钮,可以保存搜索条件。', target: '#btn-save-search', position: 'bottom' },
            { title: '订阅搜索', icon: '📡', content: '点击搜索项右侧的订阅按钮 📡,即可开启实时监控。', target: '.btn-subscribe', position: 'left' },
            { title: '订阅管理', icon: '📋', content: '已订阅的搜索会显示在顶部的"订阅管理"区域。', target: '#section-subscription-management', position: 'bottom' },
            { title: '重要提示', icon: '💡', content: '需要保持浏览器标签页打开才能正常工作。', target: null, position: 'center' }
        ];
        let current = 0;
        const overlay = document.createElement('div'); overlay.className = 'subscription-guide-overlay';
        const highlight = document.createElement('div'); highlight.className = 'subscription-guide-highlight';
        const tooltip = document.createElement('div'); tooltip.className = 'subscription-guide-tooltip';
        document.body.append(overlay, highlight, tooltip);
        const update = () => {
            const step = steps[current];
            tooltip.innerHTML = `<div class="guide-tooltip-header"><div class="guide-tooltip-icon">${step.icon}</div><div class="guide-tooltip-title">${step.title}</div></div><div class="guide-step-indicator">${steps.map((_, i) => `<div class="guide-step-dot ${i === current ? 'active' : ''}"></div>`).join('')}</div><div class="guide-tooltip-content"><p>${step.content}</p></div><div class="guide-tooltip-footer"><div class="guide-step-counter">${current + 1} / ${steps.length}</div><button class="guide-tooltip-btn">${current === steps.length - 1 ? '完成' : '下一步'}</button></div>`;
            tooltip.querySelector('.guide-tooltip-btn').onclick = () => { if (current < steps.length - 1) { current++; update(); } else { overlay.remove(); highlight.remove(); tooltip.remove(); chrome.storage.local.set({ subscription_guide_shown: true }); } };
            if (step.target) {
                const el = this.container.querySelector(step.target);
                if (el) {
                    const r = el.getBoundingClientRect();
                    highlight.style.display = 'block'; highlight.style.top = `${r.top - 4}px`; highlight.style.left = `${r.left - 4}px`; highlight.style.width = `${r.width + 8}px`; highlight.style.height = `${r.height + 8}px`;
                    tooltip.className = 'subscription-guide-tooltip arrow-' + (step.position === 'bottom' ? 'top' : step.position === 'top' ? 'bottom' : step.position === 'left' ? 'right' : 'left');
                    if (step.position === 'bottom') { tooltip.style.top = `${r.bottom + 20}px`; tooltip.style.left = `${r.left + r.width / 2 - 180}px`; }
                    else if (step.position === 'left') { tooltip.style.top = `${r.top}px`; tooltip.style.left = `${r.left - 380}px`; }
                } else { highlight.style.display = 'none'; tooltip.style.top = '50%'; tooltip.style.left = '50%'; tooltip.style.transform = 'translate(-50%, -50%)'; }
            } else { highlight.style.display = 'none'; tooltip.style.top = '50%'; tooltip.style.left = '50%'; tooltip.style.transform = 'translate(-50%, -50%)'; }
        };
        update();
    }

    executeSubscription(node) {
        const state = getTrade2State();
        if (!state) return alert('无法获取状态');
        let code = node.data.url.endsWith('/') ? node.data.url.slice(0, -1) : node.data.url;
        if (code.endsWith('/live')) code = code.slice(0, -5);
        code = code.slice(code.lastIndexOf('/') + 1);
        const wsUrl = `wss://poe.game.qq.com/api/trade2/live/${state.realm}/${state.league}/${code}`;
        subscriptionManager.subscribe(code, wsUrl, (id, data) => {
            if (data.result) chrome.runtime.sendMessage({ action: 'notify', title: node.name, message: `订阅发现了 ${data.count} 个新物品`, notificationId: code, queryItemId: data.result, searchCode: code });
        });
        this.addSubscriptionToUI(code, wsUrl, node.name);
    }

    jumpToHideout(itemId, searchCode) {
        const code = searchCode || 'GvjbmPOUb';
        fetch(`https://poe.game.qq.com/api/trade2/fetch/${itemId}?query=${code}&realm=poe2`).then(r => r.json()).then(data => {
            if (data.result?.length > 0) {
                const token = data.result[0].listing.hideout_token;
                fetch('https://poe.game.qq.com/api/trade2/whisper', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' }, body: JSON.stringify({ token }) }).then(r => r.json()).then(d => { if (d.status === 200 || !d.error) alert('正在前往藏身处...'); else alert('失败: ' + (d.error?.message || '未知错误')); });
            }
        });
    }

    funcjumpToHideout(request) {
        fetch(`https://poe.game.qq.com/api/trade2/fetch/${request.queryItemId}?query=${request.searchCode}&realm=poe2`).then(r => r.json()).then(data => {
            if (data.result?.length > 0) this.jumpToHideoutByToken(data.result[0].listing.hideout_token);
        });
    }

    jumpToHideoutByToken(token) {
        fetch('https://poe.game.qq.com/api/trade2/whisper', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' }, body: JSON.stringify({ token }) }).then(r => r.json()).then(data => {
            if (data.status === 200 || !data.error) alert('正在前往藏身处...');
            else alert('失败: ' + (data.error?.message || '未知错误'));
        });
    }
}
