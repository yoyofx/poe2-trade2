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
            id: Date.now().toString(),
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
                // It's a saved search, navigate to it?
                // Or maybe just show details. For now, let's just select.
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
        label.textContent = node.name;
        // Item Details (Price & Affixes)
        if (node.type === 'item' && node.data) {
            const details = document.createElement('div');
            details.className = 'item-details';

            if (node.data.price) {
                const price = document.createElement('div');
                price.className = 'item-price';
                price.textContent = node.data.price;
                details.appendChild(price);
            }

            if (node.data.affixes && node.data.affixes.length > 0) {
                const affixesList = document.createElement('div');
                affixesList.className = 'item-affixes';
                node.data.affixes.forEach(affix => {
                    const affixEl = document.createElement('div');
                    affixEl.className = 'item-affix';
                    // affix is an object { isPrefix, tier, content, affixChildren }
                    // We can format it nicely.
                    let text = affix.content;
                    if (affix.tier > 0) {
                        text = `[T${affix.tier}] ${text}`;
                    }
                    affixEl.textContent = text;
                    affixesList.appendChild(affixEl);
                });
                details.appendChild(affixesList);
            }
            label.appendChild(details);
        }

        // Actions
        const actions = document.createElement('div');
        actions.className = 'tree-actions';

        if (node.type === 'item' && node.data) {
            if (node.data.id) {
                const whisperBtn = document.createElement('button');
                whisperBtn.className = 'tree-action-btn';
                whisperBtn.innerHTML = '🏠';
                whisperBtn.title = '前往藏身处';
                whisperBtn.onclick = (e) => {
                    e.stopPropagation();
                    //go to the hideout of the item of url
                    const hideoutActionUrl = 'https://poe.game.qq.com/api/trade2/whisper'

                    const url = `https://poe.game.qq.com/api/trade2/fetch/${node.data.id}?query=GvjbmPOUb&realm=poe2`;
                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            if (data.result.length > 0) {
                                const whisper_token = data.result[0].listing.hideout_token;
                                //alert('前往藏身处: ' + whisper_token);
                                //post to hideout
                                fetch(hideoutActionUrl, {
                                    method: 'POST',
                                    mode: "cors",
                                    credentials: "include",
                                    headers: {
                                        accept: "*/*",
                                        "accept-language": "zh-CN,zh;q=0.9",
                                        "cache-control": "no-cache",
                                        "content-type": "application/json",
                                        pragma: "no-cache",
                                        priority: "u=1, i",
                                        "sec-fetch-dest": "empty",
                                        "sec-fetch-mode": "cors",
                                        "sec-fetch-site": "same-origin",
                                        "x-requested-with": "XMLHttpRequest"
                                    },
                                    body: JSON.stringify({
                                        token: whisper_token
                                    })
                                })
                                    .then(response => response.json())
                                    .then(data => {
                                        //status
                                        if (data.status === 200) {
                                            alert('正在前往藏身处...');
                                        } else {
                                            alert('前往藏身处失败: ' + data.error.message);
                                        }
                                    })



                            }
                        })
                        .catch(error => {
                            console.error('Error fetching item:', error);
                        });

                };
                actions.appendChild(whisperBtn);
            }

        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'tree-action-btn';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('删除此项目?')) {
                this.deleteNode(node.id);
            }
        };
        actions.appendChild(deleteBtn);

        header.appendChild(toggle);
        header.appendChild(label);
        header.appendChild(actions);
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
            const name = prompt('搜索名称(可选):') || '已保存的搜索';
            const url = window.location.href;
            this.searchesTree.addItem({ name: name, url: url });
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
}

window.PoE2Sidebar = Sidebar;
