class TreeView {
    constructor(containerId, storageKey) {
        this.container = document.getElementById(containerId);
        this.storageKey = storageKey;
        this.data = []; // Array of nodes
        this.selectedNodeId = null;
        this.load();
    }

    load() {
        chrome.storage.local.get([this.storageKey], (result) => {
            this.data = result[this.storageKey] || [];
            // Restore selection if possible, or select first folder
            this.render();
        });
    }

    save() {
        chrome.storage.local.set({ [this.storageKey]: this.data });
        this.render();
    }

    addFolder(name, parentId = null) {
        const targetId = parentId || this.selectedNodeId;
        const newFolder = {
            id: Date.now().toString(),
            type: 'folder',
            name: name,
            children: [],
            expanded: true
        };

        if (targetId) {
            const parent = this.findNode(targetId, this.data);
            if (parent && parent.type === 'folder') {
                parent.children.push(newFolder);
            } else {
                // If selected is item, find its parent? Or just add to root?
                // For simplicity, if selected is item, add to root or parent of item.
                // Let's just add to root if target is not a folder
                this.data.push(newFolder);
            }
        } else {
            this.data.push(newFolder);
        }
        this.save();
    }

    addItem(item) {
        const targetId = this.selectedNodeId;
        const newItem = {
            id: item.id,
            type: 'item',
            name: item.name || 'Unknown Item',
            data: item
        };

        if (targetId) {
            const parent = this.findNode(targetId, this.data);
            if (parent && parent.type === 'folder') {
                parent.children.push(newItem);
            } else {
                // If selected is not a folder, maybe add to root?
                this.data.push(newItem);
            }
        } else {
            this.data.push(newItem);
        }
        this.save();
    }

    deleteNode(id) {
        const row = document.querySelector(`.row[data-id="${id}"]`);
        if (row) {
            const starBtn = row.querySelector('.poe2-trade-star-btn');
            if (starBtn) {
                starBtn.classList.remove('active');
                starBtn.innerHTML = '☆';
            }
        }

        this.data = this.filterNode(id, this.data);
        if (this.selectedNodeId === id) this.selectedNodeId = null;
        this.save();
    }

    findNode(id, nodes) {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = this.findNode(id, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    filterNode(id, nodes) {
        return nodes.filter(node => {
            if (node.id === id) return false;
            if (node.children) {
                node.children = this.filterNode(id, node.children);
            }
            return true;
        });
    }

    selectNode(id) {
        this.selectedNodeId = id;
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.data.forEach(node => {
            this.container.appendChild(this.createNodeElement(node));
        });
    }

    createNodeElement(node) {
        const el = document.createElement('div');
        el.className = 'tree-node';

        const header = document.createElement('div');
        header.className = 'tree-header';
        if (this.selectedNodeId === node.id) {
            header.classList.add('selected');
        }

        header.onclick = (e) => {
            e.stopPropagation();
            this.selectNode(node.id);
            if (node.data && node.data.url) {
                if (confirm('前往已保存的搜索?')) {
                    window.location.href = node.data.url;
                }
            }
        };

        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.innerHTML = node.type === 'folder' ? (node.expanded ? '▼' : '▶') : '•';
        if (node.type === 'folder') {
            toggle.onclick = (e) => {
                e.stopPropagation();
                node.expanded = !node.expanded;
                this.save();
            };
        }

        const label = document.createElement('span');
        label.className = 'tree-label';

        // Use textContent for folder name, but for Item we might render differently
        if (node.type === 'folder') {
            label.textContent = node.name;
        } else {
            // For Items, we want the name to be part of the header block but maybe styled
            label.textContent = node.name;
        }

        // ============================================
        // ITEM RENDERING LOGIC
        // ============================================
        if (node.type === 'item' && node.data) {
            label.classList.add('item-name');
            if (node.data.nameCss) {
                label.style.cssText = node.data.nameCss;
            }

            const details = document.createElement('div');
            details.className = 'item-details';

            // Price
            if (node.data.price) {
                const price = document.createElement('div');
                price.className = 'item-price';
                price.textContent = node.data.price;
                details.appendChild(price);
            }

            // Affixes
            if (node.data.affixes && node.data.affixes.length > 0) {
                const affixesList = document.createElement('div');
                affixesList.className = 'item-affixes';
                node.data.affixes.forEach(affix => {
                    const affixEl = document.createElement('div');
                    affixEl.className = 'item-affix';

                    // Tier Highlighting Logic
                    if (affix.tier === 1) affixEl.classList.add('item-affix-t1');
                    if (affix.tier === 2) affixEl.classList.add('item-affix-t2');

                    let text = affix.content;
                    let tierTag = '';
                    if (affix.tier > 0) {
                        tierTag = `<span class="affix-tier">T${affix.tier}</span>`;
                    }
                    affixEl.innerHTML = `${tierTag} <span class="affix-text">${text}</span>`;
                    affixesList.appendChild(affixEl);
                });
                details.appendChild(affixesList);
            }

            // Footer Buttons
            const actionsFooter = document.createElement('div');
            actionsFooter.className = 'item-actions-footer';

            // Hideout Button
            if (node.data.id) {
                const whisperBtn = document.createElement('button');
                whisperBtn.className = 'footer-action-btn btn-hideout';
                whisperBtn.innerHTML = '🏠 前往藏身处';
                whisperBtn.onclick = (e) => {
                    e.stopPropagation();
                    const hideoutActionUrl = 'https://poe.game.qq.com/api/trade2/whisper';
                    const url = `https://poe.game.qq.com/api/trade2/fetch/${node.data.id}?query=GvjbmPOUb&realm=poe2`;

                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            if (data.result.length > 0) {
                                const whisper_token = data.result[0].listing.hideout_token;
                                fetch(hideoutActionUrl, {
                                    method: 'POST',
                                    headers: {
                                        "content-type": "application/json",
                                        "x-requested-with": "XMLHttpRequest"
                                    },
                                    body: JSON.stringify({ token: whisper_token })
                                })
                                    .then(r => r.json())
                                    .then(d => {
                                        if (d.status === 200 || !d.error) {
                                            alert('正在前往藏身处...');
                                        } else {
                                            alert('前往失败: ' + (d.error ? d.error.message : 'Unknown error'));
                                        }
                                    });
                            }
                        })
                        .catch(err => console.error(err));
                };
                actionsFooter.appendChild(whisperBtn);
            }

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'footer-action-btn btn-delete';
            deleteBtn.innerHTML = '🗑 删除';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('删除此项目?')) {
                    this.deleteNode(node.id);
                }
            };
            actionsFooter.appendChild(deleteBtn);

            details.appendChild(actionsFooter);
            label.appendChild(details);
        }

        // ============================================
        // HEADER ASSEMBLY
        // ============================================
        header.appendChild(toggle);
        header.appendChild(label);

        // Folder Actions (Hover actions only for folders)
        if (node.type !== 'item') {
            const actions = document.createElement('div');
            actions.className = 'tree-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'tree-action-btn';
            deleteBtn.innerHTML = '🗑';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('删除此文件夹?')) {
                    this.deleteNode(node.id);
                }
            };
            actions.appendChild(deleteBtn);
            header.appendChild(actions);
        }

        el.appendChild(header);

        if (node.type === 'folder' && node.expanded && node.children) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';
            node.children.forEach(child => {
                childrenContainer.appendChild(this.createNodeElement(child));
            });
            el.appendChild(childrenContainer);
        }

        return el;
    }
}

class Sidebar {
    constructor() {
        this.isVisible = false;
        this.activeTab = 'collections';
        this.container = null;
        this.collectionsTree = null;
        this.searchesTree = null;
        this.init();
    }

    init() {
        this.createSidebarElement();
        this.attachEventListeners();

        this.collectionsTree = new TreeView('collections-tree', 'poe2_collections');
        this.searchesTree = new TreeView('searches-tree', 'poe2_searches');

        this.loadState();
    }

    createSidebarElement() {
        // UI Structure
        const sidebarHTML = `
      <div id="poe2-sidebar-toggle" title="切换侧边栏">
        <span>★</span>
      </div>
      <div class="sidebar-header">
        <span>流放之路2助手</span>
      </div>
      <div class="sidebar-tabs">
        <div class="sidebar-tab active" data-tab="collections">物品收藏</div>
        <div class="sidebar-tab" data-tab="searches">搜索存储</div>
      </div>
      <div class="sidebar-content">
        <div id="tab-collections" class="tab-pane active">
          <button id="btn-add-folder-collection" class="btn-primary">+ 新建文件夹</button>
          <div id="collections-tree" class="tree-root"></div>
        </div>
        <div id="tab-searches" class="tab-pane">
          <button id="btn-add-folder-search" class="btn-primary">+ 新建文件夹</button>
          <button id="btn-save-search" class="btn-primary">保存当前搜索</button>
          <div id="searches-tree" class="tree-root"></div>
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
        // Toggle Sidebar
        const toggleBtn = this.container.querySelector('#poe2-sidebar-toggle');
        toggleBtn.addEventListener('click', () => this.toggle());

        // Tabs
        const tabs = this.container.querySelectorAll('.sidebar-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Buttons
        document.getElementById('btn-add-folder-collection').addEventListener('click', () => {
            const name = prompt('文件夹名称:');
            if (name) {
                this.collectionsTree.addFolder(name);
            }
        });

        document.getElementById('btn-add-folder-search').addEventListener('click', () => {
            const name = prompt('文件夹名称:');
            if (name) {
                this.searchesTree.addFolder(name);
            }
        });

        document.getElementById('btn-save-search').addEventListener('click', () => {
            const name = prompt('搜索名称(可选):');
            if (name !== null) {
                const url = window.location.href;
                this.searchesTree.addItem({ id: Date.now().toString(), name: name || '已保存的搜索', url: url });
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.container.classList.remove('collapsed');
        } else {
            this.container.classList.add('collapsed');
        }
        this.saveState();
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update Tab UI
        this.container.querySelectorAll('.sidebar-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        // Update Content UI
        this.container.querySelectorAll('.tab-pane').forEach(p => {
            p.classList.remove('active');
        });
        this.container.querySelector(`#tab-${tabName}`).classList.add('active');
    }

    saveState() {
        // Save collapsed state to local storage if needed
        // chrome.storage.local.set({ sidebarVisible: this.isVisible });
    }

    loadState() {
        // Load state
    }

    addToCollection(itemData) {
        this.collectionsTree.addItem(itemData);
        // Open sidebar if closed so user sees the addition
        if (!this.isVisible) {
            this.toggle();
        }
        this.switchTab('collections');
    }

    removeFromCollection(itemId) {
        this.collectionsTree.deleteNode(itemId);
    }
}

window.PoE2Sidebar = Sidebar;
