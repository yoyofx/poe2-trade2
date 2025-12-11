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
        // Check for duplicates
        if (this.findNode(item.id, this.data)) {
            alert('该物品已在收藏中！');
            return;
        }

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

        // ============================================
        // FOLDER LOGIC
        // ============================================
        if (node.type === 'folder') {
            const header = document.createElement('div');
            header.className = 'tree-header';

            // Selection Logic (Folders Only)
            if (this.selectedNodeId === node.id) {
                header.classList.add('selected');
            }

            header.onclick = (e) => {
                e.stopPropagation();
                this.selectNode(node.id);
            };

            // Double click to rename folder
            header.ondblclick = (e) => {
                e.stopPropagation();
                const newName = prompt('重命名文件夹:', node.name);
                if (newName && newName.trim() !== '') {
                    node.name = newName;
                    this.save();
                }
            };

            // Toggle
            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle';
            toggle.innerHTML = node.expanded ? '▼' : '▶';
            toggle.onclick = (e) => {
                e.stopPropagation();
                node.expanded = !node.expanded;
                this.save();
            };

            // Label
            const label = document.createElement('span');
            label.className = 'tree-label';
            label.textContent = node.name;

            // Folder Actions
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

            // Accessorizes
            header.appendChild(toggle);
            header.appendChild(label);
            header.appendChild(actions);
            el.appendChild(header);

            // Children Logic
            if (node.expanded && node.children && node.children.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';
                node.children.forEach(child => {
                    childrenContainer.appendChild(this.createNodeElement(child));
                });
                el.appendChild(childrenContainer);
            }
        }

        // ============================================
        // ITEM LOGIC
        // ============================================
        else if (node.type === 'item' && node.data) {

            // CHECK IF THIS IS A SAVED SEARCH OR A TRADE ITEM
            // const isSavedSearch = node.data.url !== undefined;
            const isSavedSearch = this.storageKey === 'poe2_searches';

            if (isSavedSearch) {
                // --- RENDER SAVED SEARCH ---
                const itemName = document.createElement('div');
                itemName.className = 'tree-label item-name';
                itemName.textContent = node.name;

                const details = document.createElement('div');
                details.className = 'item-details';

                // Name Row
                const nameRow = document.createElement('div');
                nameRow.className = 'item-name-row';
                // Icon or label for search?
                const typeTag = document.createElement('div');
                typeTag.className = 'item-category'; // reusing class for style
                typeTag.textContent = 'Search';
                nameRow.appendChild(typeTag);
                nameRow.appendChild(itemName);
                details.appendChild(nameRow);

                // Actions Footer
                const actions = document.createElement('div');
                actions.className = 'item-actions-footer';

                // Go to Search Button
                const gotoBtn = document.createElement('button');
                gotoBtn.className = 'footer-action-btn btn-jump tooltip-btn';
                gotoBtn.innerHTML = '➜'; // Arrow icon
                gotoBtn.setAttribute('data-tooltip', '前往已保存的搜索');
                gotoBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('前往已保存的搜索?')) {
                        window.location.href = node.data.url;
                    }
                };
                actions.appendChild(gotoBtn);

                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'footer-action-btn btn-delete tooltip-btn';
                deleteBtn.innerHTML = '🗑';
                deleteBtn.setAttribute('data-tooltip', '删除');
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个搜索吗?')) {
                        this.deleteNode(node.id);
                    }
                };
                actions.appendChild(deleteBtn);

                details.appendChild(actions);
                el.appendChild(details);

            } else {
                // --- RENDER TRADE ITEM --- (Existing Logic)
                // Create item name element
                const itemName = document.createElement('div');
                itemName.className = 'tree-label item-name';
                itemName.textContent = node.name;
                if (node.data.nameCss) {
                    itemName.style.cssText = node.data.nameCss;
                }

                const details = document.createElement('div');
                details.className = 'item-details';

                // Create a wrapper for category and name to display on same line
                const nameRow = document.createElement('div');
                nameRow.className = 'item-name-row';

                // Category (first - fixed length)
                if (node.data.category) {
                    const category = document.createElement('div');
                    category.className = 'item-category';
                    category.textContent = node.data.category;
                    nameRow.appendChild(category);
                }

                // Add name after category
                nameRow.appendChild(itemName);
                details.appendChild(nameRow);

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

                            // Range tag (always an array now)
                            if (affix.tierRange && affix.tierRange.length > 0) {
                                const rangeTag = document.createElement('span');
                                rangeTag.className = 'affix-range';
                                const rangeTexts = affix.tierRange.map(range => {
                                    // Only show range if min !== max
                                    if (range.min === range.max) return null;
                                    const minFormatted = range.min % 1 === 0 ? range.min : range.min.toFixed(1);
                                    const maxFormatted = range.max % 1 === 0 ? range.max : range.max.toFixed(1);
                                    return `[${minFormatted}-${maxFormatted}]`;
                                }).filter(Boolean); // remove nulls

                                if (rangeTexts.length > 0) {
                                    rangeTag.textContent = rangeTexts.join(' ');
                                    affixEl.appendChild(rangeTag);
                                }
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
                hideoutBtn.className = 'footer-action-btn btn-hideout tooltip-btn';
                hideoutBtn.innerHTML = '🏠';
                hideoutBtn.setAttribute('data-tooltip', '跳转到藏身处');
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
                deleteBtn.className = 'footer-action-btn btn-delete tooltip-btn';
                deleteBtn.innerHTML = '🗑';
                deleteBtn.setAttribute('data-tooltip', '删除');
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个物品吗?')) {
                        this.deleteNode(node.id);
                    }
                };
                actions.appendChild(deleteBtn);

                // Find Similar button (Replaces Jump)
                const findSimilarBtn = document.createElement('button');
                findSimilarBtn.className = 'footer-action-btn btn-find-similar tooltip-btn';
                findSimilarBtn.innerHTML = '🔍';
                findSimilarBtn.title = ''; // Ensure no native title
                findSimilarBtn.setAttribute('data-tooltip', '找相似');
                findSimilarBtn.onclick = (e) => {
                    e.stopPropagation();
                    //console.log(node.data);
                    const trade2statejson = localStorage.getItem('lscache-trade2state');
                    const trade2state = JSON.parse(trade2statejson);
                    //format url https://poe.game.qq.com/api/trade2/search/{trade2state.realm}/{trade2state.league}
                    const searchApiUrl = `https://poe.game.qq.com/api/trade2/search/${trade2state.realm}/${trade2state.league}`;
                    const searchUrl = `https://poe.game.qq.com/trade2/search/${trade2state.realm}/${trade2state.league}/`;

                    //foreach node.data.affixes and add filters , that item id equal by each item.type
                    console.log(node.data);
                    const filters = [];
                    node.data.affixes.forEach(affix => {
                        var value = 0;
                        if (affix.values !== null) {
                            value = affix.values[0];
                        }
                        const type = affix.type.replace('stat.', '');
                        filters.push({
                            "id": type,
                            "value": {
                                "min": value
                            },
                            "disabled": false
                        });
                    });

                    const json = {
                        "query": {
                            "status": {
                                "option": "any"
                            },
                            "stats": [
                                {
                                    "type": "and",
                                    "filters": filters,
                                    "disabled": false
                                }
                            ]
                        },
                        "sort": {
                            "price": "asc"
                        }
                    }
                    console.log(json);

                    fetch(searchApiUrl, {
                        method: 'POST',
                        headers: {
                            "content-type": "application/json",
                            "x-requested-with": "XMLHttpRequest"
                        },
                        body: JSON.stringify(json)
                    })
                        .then(response => response.json())
                        .then(data => {
                            console.log(data);
                            // 页面跳转到searchUrl + data.id, 本页刷新跳转
                            window.location.href = searchUrl + data.id;
                        })
                        .catch(err => console.error(err));
                };
                actions.appendChild(findSimilarBtn);

                const testBtn = document.createElement('button');
                testBtn.className = 'footer-action-btn btn-find-similar tooltip-btn';
                testBtn.innerHTML = '🔍';
                testBtn.title = ''; // Ensure no native title
                testBtn.setAttribute('data-tooltip', '测试');
                testBtn.onclick = (e) => {
                    const elements = getMultiselectElements()


                    // console.log('-------------------------------------------');
                    console.log(elements.length)
                    let noDisplayCount = 0;
                    fetchAndAnalyze(`https://poe2db.tw/cn/${itemTypeMap.get(node.data.category)}`).then(r => {
                        elements.forEach(element => {
                            //element元素span下的span下有text
                            const text = element.querySelector('span').querySelector('span').textContent

                            //合并r.prefixes和r.suffixes
                            const allixes = [...r.prefixes, ...r.suffixes]


                            // 如果 text 没有匹配任何allixes中的 sign , 将element的 class 设置为 display:none
                            if (!allixes.some(prefix => prefix.sign === text)) {
                                element.style.display = 'none'
                                noDisplayCount++
                            }


                        })

                    });

                    console.log(elements.length - noDisplayCount)

                }

                actions.appendChild(testBtn);


                details.appendChild(actions);
                el.appendChild(details);
            }
        }

        return el;
    }


}

const itemTypeMap = new Map([
    ["长杖", "Staves"],
]);

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

        this.renderAffixLimitGrid();
        this.loadState();
    }

    renderAffixLimitGrid() {
        const container = this.container.querySelector('.affix-limit-content');
        if (!container) return;
        container.innerHTML = '';

        itemTypeMap.forEach((value, key) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'affix-limit-item';
            itemEl.textContent = key;

            // Random dark/muted color for background
            const hue = Math.floor(Math.random() * 360);
            itemEl.style.backgroundColor = `hsl(${hue}, 60%, 30%)`;

            itemEl.onclick = () => {
                console.log(value);
            };

            container.appendChild(itemEl);
        });
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
        <div class="sidebar-tab" data-tab="searches">搜索</div>
      </div>
      <div class="sidebar-content">
        <div id="tab-collections" class="tab-pane active">
          <div class="tab-actions-sticky">
             <button id="btn-add-folder-collection" class="btn-primary">+ 新建文件夹</button>
          </div>
          <div id="collections-tree" class="tree-root"></div>
        </div>
        <div id="tab-searches" class="tab-pane">
          <!-- Section 1: Search Collections -->
          <div class="sidebar-section expanded" id="section-search-collections">
              <div class="sidebar-section-header">
                  <span>搜索收藏</span>
                  <span class="section-toggle">▼</span>
              </div>
              <div class="sidebar-section-content open">
                  <div class="tab-actions-sticky">
                     <button id="btn-add-folder-search" class="btn-primary">+ 新建文件夹</button>
                     <button id="btn-save-search" class="btn-primary">保存当前搜索</button>
                  </div>
                  <div id="searches-tree" class="tree-root"></div>
              </div>
          </div>
          
          <!-- Section 2: Search Enhancements -->
          <div class="sidebar-section expanded" id="section-search-enhancements">
              <div class="sidebar-section-header">
                  <span>搜索增强</span>
                  <span class="section-toggle">▼</span>
              </div>
              <div class="sidebar-section-content open">
                  <!-- Affix Limit Section -->
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

        // Toggle Sidebar Section Headers
        this.container.querySelectorAll('.sidebar-section-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const toggleBtn = header.querySelector('.section-toggle');
                const section = header.parentElement;

                if (content.classList.contains('open')) {
                    content.classList.remove('open');
                    section.classList.remove('expanded');
                    content.style.display = 'none';
                    toggleBtn.textContent = '▶';
                } else {
                    content.classList.add('open');
                    section.classList.add('expanded');
                    content.style.display = 'block'; // Or flex, handled by CSS usually but inline override for toggle
                    // Better to clean style and let class handle it, but for simple toggle:
                    if (header.parentElement.id === 'section-search-collections') {
                        content.style.display = 'flex'; // Needs flex for tree root growth
                    } else {
                        content.style.display = 'block';
                    }
                    toggleBtn.textContent = '▼';
                }
            });
        });

        // Toggle Affix Limit Section
        const affixHeader = this.container.querySelector('.affix-limit-header');
        if (affixHeader) {
            affixHeader.addEventListener('click', () => {
                const content = this.container.querySelector('.affix-limit-content');
                const toggleBtn = this.container.querySelector('.affix-limit-toggle');
                if (content.style.display === 'none') {
                    content.style.display = 'grid';
                    toggleBtn.textContent = '▼';
                } else {
                    content.style.display = 'none';
                    toggleBtn.textContent = '▶';
                }
            });
        }
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
