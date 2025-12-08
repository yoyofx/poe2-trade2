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
        if (this.selectedNodeId === id) {
            this.selectedNodeId = null; // Toggle off
        } else {
            this.selectedNodeId = id;
        }
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

        // Double click to rename folder
        if (node.type === 'folder') {
            header.ondblclick = (e) => {
                e.stopPropagation();
                const newName = prompt('重命名文件夹:', node.name);
                if (newName && newName.trim() !== '') {
                    node.name = newName;
                    this.save();
                }
            };
        }

        // Toggle only for folders
        let toggle = null;
        if (node.type === 'folder') {
            toggle = document.createElement('span');
            toggle.className = 'tree-toggle';
            toggle.innerHTML = node.expanded ? '▼' : '▶';
            toggle.onclick = (e) => {
                e.stopPropagation();
                node.expanded = !node.expanded;
                this.save();
            };
        }

        // ============================================
        // ITEM RENDERING LOGIC
        // ============================================
        if (node.type === 'item' && node.data) {
            // Create item name element
            const itemName = document.createElement('div');
            itemName.className = 'tree-label item-name';
            itemName.textContent = node.name;
            if (node.data.nameCss) {
                itemName.style.cssText = node.data.nameCss;
            }

            const details = document.createElement('div');
            details.className = 'item-details';

            // Add name as first element in details
            details.appendChild(itemName);

            // Price
            if (node.data.price) {
                const price = document.createElement('div');
                price.className = 'item-price';
                price.textContent = node.data.price;
                details.appendChild(price);
            }

            // Skills
            if (node.data.skills && node.data.skills.length > 0) {
                const skillsList = document.createElement('div');
                skillsList.className = 'item-section item-skills';
                node.data.skills.forEach(skill => {
                    const skillEl = document.createElement('div');
                    skillEl.className = 'item-skill-row';

                    let iconHtml = '';
                    if (skill.imageUrl) {
                        iconHtml = `<img src="${skill.imageUrl}" class="skill-icon" />`;
                    }

                    skillEl.innerHTML = `${iconHtml}<span class="skill-text">${skill.level ? `Lv: ${skill.level} ` : ''}${skill.name}</span>`;
                    skillsList.appendChild(skillEl);
                });
                details.appendChild(skillsList);
            }

            // Helper function to render affixes
            const renderAffixSection = (affixArray, sectionClass, sectionLabel) => {
                if (affixArray && affixArray.length > 0) {
                    const section = document.createElement('div');
                    section.className = `item-section ${sectionClass}`;

                    if (sectionLabel) {
                        const label = document.createElement('div');
                        label.className = 'section-label';
                        label.textContent = sectionLabel;
                        section.appendChild(label);
                    }

                    affixArray.forEach(affix => {
                        const affixEl = document.createElement('div');
                        affixEl.className = 'item-affix';

                        // Add tier class for highlighting
                        if (affix.tier === 1) {
                            affixEl.classList.add('item-affix-t1');
                        } else if (affix.tier === 2) {
                            affixEl.classList.add('item-affix-t2');
                        }

                        // Add type class
                        if (affix.isPrefix !== null) {
                            affixEl.classList.add(affix.isPrefix ? 'type-prefix' : 'type-suffix');
                        }

                        // Type tag (前缀/后缀)
                        if (affix.isPrefix !== null) {
                            const typeTag = document.createElement('span');
                            typeTag.className = 'affix-type-tag';
                            typeTag.textContent = affix.isPrefix ? '前缀' : '后缀';
                            affixEl.appendChild(typeTag);
                        }

                        // Tier tag (T1/T2/T3...)
                        if (affix.tier !== null) {
                            const tierTag = document.createElement('span');
                            tierTag.className = 'affix-tier';
                            tierTag.textContent = `T${affix.tier}`;
                            affixEl.appendChild(tierTag);
                        }

                        // Range tag (only if min !== max)
                        if (affix.tierRange && affix.tierRange.min !== affix.tierRange.max) {
                            const rangeTag = document.createElement('span');
                            rangeTag.className = 'affix-range';
                            rangeTag.textContent = `[${affix.tierRange.min}-${affix.tierRange.max}]`;
                            affixEl.appendChild(rangeTag);
                        }

                        // Content text
                        const text = document.createElement('span');
                        text.className = 'affix-text';
                        text.textContent = affix.content;
                        affixEl.appendChild(text);

                        section.appendChild(affixEl);
                    });

                    details.appendChild(section);
                }
            };


            // Render base/implicits (first)
            renderAffixSection(node.data.base, 'item-base', '基底:');

            // Render runes (second)
            renderAffixSection(node.data.runes, 'item-runes', '符文:');

            // Render affixes (third)
            renderAffixSection(node.data.affixes, 'item-affixes', null);

            // Render desecrates (last)
            renderAffixSection(node.data.desecrates, 'item-desecrates', null);

            // Action buttons
            const actions = document.createElement('div');
            actions.className = 'item-actions-footer';

            // Copy Hideout button
            const hideoutBtn = document.createElement('button');
            hideoutBtn.className = 'footer-action-btn btn-hideout';
            hideoutBtn.innerHTML = '🏠';
            hideoutBtn.title = '复制藏身处命令';
            hideoutBtn.onclick = (e) => {
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

            actions.appendChild(hideoutBtn);

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'footer-action-btn btn-delete';
            deleteBtn.innerHTML = '🗑';
            deleteBtn.title = '删除';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个物品吗?')) {
                    this.deleteNode(node.id);
                }
            };
            actions.appendChild(deleteBtn);

            // // Copy Whisper button
            // const whisperBtn = document.createElement('button');
            // whisperBtn.className = 'footer-action-btn btn-whisper';
            // whisperBtn.innerHTML = '💬';
            // whisperBtn.title = '复制密语';
            // whisperBtn.onclick = (e) => {
            //     e.stopPropagation();
            //     if (node.data.whisperBtn) {
            //         node.data.whisperBtn.click();
            //     }
            // };
            // actions.appendChild(whisperBtn);

            // Jump to item button
            const jumpBtn = document.createElement('button');
            jumpBtn.className = 'footer-action-btn btn-jump';
            jumpBtn.innerHTML = '🔍';
            jumpBtn.title = '跳转到物品';
            jumpBtn.onclick = (e) => {
                e.stopPropagation();
                const targetRow = document.querySelector(`.row[data-id="${node.id}"]`);
                if (targetRow) {
                    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetRow.style.outline = '2px solid var(--accent-gold)';
                    setTimeout(() => {
                        targetRow.style.outline = '';
                    }, 2000);
                }
            };
            actions.appendChild(jumpBtn);



            details.appendChild(actions);
            el.appendChild(details);
        }

        // Folder delete action
        if (node.type === 'folder') {
            // Create folder label
            const label = document.createElement('span');
            label.className = 'tree-label';
            label.textContent = node.name;

            const actions = document.createElement('div');
            actions.className = 'tree-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'tree-action-btn';
            deleteBtn.innerHTML = '🗑';
            deleteBtn.title = '删除文件夹';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个文件夹及其所有内容吗?')) {
                    this.deleteNode(node.id);
                }
            };
            actions.appendChild(deleteBtn);

            if (toggle) header.appendChild(toggle);
            header.appendChild(label);
            header.appendChild(actions);
        }

        el.appendChild(header);

        // Children (only for folders)
        if (node.type === 'folder' && node.expanded && node.children && node.children.length > 0) {
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

// ============================================
// SIDEBAR CLASS
// ============================================
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
        <div class="sidebar-tab" data-tab="searches">搜索收藏</div>
      </div>
      <div class="sidebar-content">
        <div id="tab-collections" class="tab-pane active">
          <div class="tab-actions-sticky">
             <button id="btn-add-folder-collection" class="btn-primary">+ 新建文件夹</button>
          </div>
          <div id="collections-tree" class="tree-root"></div>
        </div>
        <div id="tab-searches" class="tab-pane">
          <div class="tab-actions-sticky">
             <button id="btn-add-folder-search" class="btn-primary">+ 新建文件夹</button>
             <button id="btn-save-search" class="btn-primary">保存当前搜索</button>
          </div>
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
