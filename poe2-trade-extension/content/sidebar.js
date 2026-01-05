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

    createNodeElement(node, parentId = null) {
        const el = document.createElement('div');
        el.className = 'tree-node';
        if (node.type === 'item') {
            el.classList.add('item-node');
        }

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

            // Rename Button
            const renameBtn = document.createElement('button');
            renameBtn.className = 'tree-action-btn btn-rename';
            renameBtn.innerHTML = '✎';
            renameBtn.title = '重命名文件夹';
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                const newName = prompt('重命名文件夹:', node.name);
                if (newName && newName.trim() !== '') {
                    node.name = newName;
                    this.save();
                }
            };
            actions.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'tree-action-btn btn-delete';
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
                    childrenContainer.appendChild(this.createNodeElement(child, node.id));
                });
                el.appendChild(childrenContainer);
            }
        }

        // ============================================
        // ITEM LOGIC
        // ============================================
        else if (node.type === 'item' && node.data) {

            // Auto-select parent folder on click
            el.onclick = (e) => {
                e.stopPropagation();
                if (parentId) {
                    this.selectNode(parentId);
                }
            };

            // CHECK IF THIS IS A SAVED SEARCH OR A TRADE ITEM
            // const isSavedSearch = node.data.url !== undefined;
            const isSavedSearch = this.storageKey === 'poe2_searches';

            if (isSavedSearch) {
                // --- RENDER SAVED SEARCH ---
                const itemName = document.createElement('div');
                itemName.className = 'tree-label item-name saved-search-name';
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

                // Actions (Inline)
                const actions = document.createElement('div');
                actions.className = 'search-actions';

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

                // Share Button (Copy URL)
                const shareBtn = document.createElement('button');
                shareBtn.className = 'footer-action-btn btn-share tooltip-btn';
                shareBtn.innerHTML = '🔗';
                shareBtn.setAttribute('data-tooltip', '分享');
                shareBtn.onclick = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(node.data.url).then(() => {
                        alert('链接已复制到剪切板!');
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                    });
                };
                actions.appendChild(shareBtn);

                // Subscribe Button (Log URL)
                const subscribeBtn = document.createElement('button');
                subscribeBtn.className = 'footer-action-btn btn-subscribe tooltip-btn';
                subscribeBtn.innerHTML = '📡';
                subscribeBtn.setAttribute('data-tooltip', '订阅');
                subscribeBtn.onclick = (e) => {
                    e.stopPropagation();

                    const trade2statejson = localStorage.getItem('lscache-trade2state');
                    const trade2state = JSON.parse(trade2statejson);
                    const liveSearchApiUrl = `wss://poe.game.qq.com/api/trade2/live/${trade2state.realm}/${trade2state.league}/`;

                    let searchCode = node.data.url;
                    // Remove trailing slash if exists to avoid double slash issues or easy check
                    if (searchCode.endsWith('/')) {
                        searchCode = searchCode.slice(0, -1);
                    }

                    // Check if ends with /live
                    if (searchCode.endsWith('/live')) {
                        //remove /live
                        searchCode = searchCode.slice(0, -5);
                    }
                    //取最后/后面的字符串
                    searchCode = searchCode.slice(searchCode.lastIndexOf('/') + 1);

                    console.log('searchCode:', searchCode);


                    // Replace protocol for WebSocket
                    // Assuming original is https or http
                    let wsUrl = liveSearchApiUrl + searchCode;

                    console.log('Connecting to WebSocket:', wsUrl);

                    if (window.subscriptionManager) {
                        window.subscriptionManager.subscribe(searchCode, wsUrl, (sourceId, data) => {
                            console.log(`[Callback] Message from ${sourceId}:`, data);
                            // TODO: Add notification logic here
                            // if (data.new && data.new.length > 0) ...
                        });
                    } else {
                        console.error('SubscriptionManager not found!');
                        alert('订阅管理器未加载，请刷新页面重试。');
                    }
                };
                actions.appendChild(subscribeBtn);

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

                nameRow.appendChild(actions);
                details.appendChild(nameRow);
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

                // Image with Wrapper
                if (node.data.imageUrl) {
                    const iconWrapper = document.createElement('div');
                    iconWrapper.className = 'item-icon-wrapper';

                    const icon = document.createElement('img');
                    icon.src = node.data.imageUrl;
                    icon.className = 'item-icon';

                    iconWrapper.appendChild(icon);
                    nameRow.appendChild(iconWrapper);
                }

                // Add name after category
                nameRow.appendChild(itemName);

                // Socket Count
                if (node.data.sockets && node.data.sockets > 0) {
                    const socketSpan = document.createElement('span');
                    socketSpan.textContent = ` (孔数: ${node.data.sockets})`;
                    socketSpan.style.color = '#888';
                    socketSpan.style.fontSize = '12px';
                    socketSpan.style.marginLeft = '4px';
                    nameRow.appendChild(socketSpan);
                }

                details.appendChild(nameRow);

                // Dynamic separator style based on item color
                if (node.data.nameCss) {
                    // Extract color value (e.g., from "color: rgb(...)")
                    const match = node.data.nameCss.match(/color\s*:\s*([^;]+)/);
                    if (match && match[1]) {
                        const color = match[1];
                        nameRow.style.borderBottom = `1px solid ${color}`;
                        // Add a subtle gradient background for "Grand" feel
                        nameRow.style.background = `linear-gradient(90deg, ${color.replace(')', ', 0.1)')} 0%, transparent 100%)`;
                    }
                }

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

                            if (affix.tier == null) {
                                affix.tier = 0;
                            }
                            // Add tier class for highlighting
                            if (affix.tier === 0) {
                                affixEl.classList.add('item-affix-t0');
                            } else if (affix.tier === 1) {
                                affixEl.classList.add('item-affix-t1');
                            } else if (affix.tier === 2) {
                                affixEl.classList.add('item-affix-t2');
                            }

                            // Add type class
                            if (affix.isPrefix !== null) {
                                affixEl.classList.add(affix.isPrefix ? 'type-prefix' : 'type-suffix');
                            }

                            // Type tag (前缀/后缀)
                            var type_tag = null;
                            if (affix.isPrefix != null) {
                                type_tag = affix.isPrefix ? '前缀' : '后缀';
                            } else {
                                type_tag = '暗金';
                            }

                            // Type tag (前缀/后缀)
                            const typeTag = document.createElement('span');
                            typeTag.className = 'affix-type-tag';
                            typeTag.textContent = type_tag;
                            affixEl.appendChild(typeTag);


                            // Tier tag (T1/T2/T3...) default to 1

                            const tierTag = document.createElement('span');
                            tierTag.className = 'affix-tier';
                            tierTag.textContent = `T${affix.tier}`;
                            affixEl.appendChild(tierTag);


                            // Content text
                            const text = document.createElement('span');
                            text.className = 'affix-text';
                            text.textContent = affix.content;
                            affixEl.appendChild(text);

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

                // const testBtn = document.createElement('button');
                // testBtn.className = 'footer-action-btn btn-find-similar tooltip-btn';
                // testBtn.innerHTML = '🔍';
                // testBtn.title = ''; // Ensure no native title
                // testBtn.setAttribute('data-tooltip', '测试');
                // testBtn.onclick = (e) => {
                //     const elements = getMultiselectElements()


                //     // console.log('-------------------------------------------');
                //     console.log(elements.length)
                //     let noDisplayCount = 0;
                //     fetchAndAnalyze(`https://poe2db.tw/cn/${itemTypeMap.get(node.data.category)}`).then(r => {
                //         elements.forEach(element => {
                //             //element元素span下的span下有text
                //             const text = element.querySelector('span').querySelector('span').textContent

                //             //合并r.prefixes和r.suffixes
                //             const allixes = [...r.prefixes, ...r.suffixes]


                //             // 如果 text 没有匹配任何allixes中的 sign , 将element的 class 设置为 display:none
                //             if (!allixes.some(prefix => prefix.sign === text)) {
                //                 element.style.display = 'none'
                //                 noDisplayCount++
                //             }


                //         })

                //     });

                //     console.log(elements.length - noDisplayCount)

                // }

                // actions.appendChild(testBtn);


                details.appendChild(actions);
                el.appendChild(details);
            }
        }

        return el;
    }


}

const itemTypeMap = new Map([
    // ["爪", "Claws"],
    // ["匕首", "Daggers"],
    // ["单手剑", "One_Hand_Swords"],
    // ["单手斧", "One_Hand_Axes"],
    // ["连枷", "Flails"],
    // ["双手剑", "Two_Hand_Swords"],
    // ["双手斧", "Two_Hand_Axes"],
    // ["鱼竿", "Fishing_Rods"],
    // ["陷阱", "Traps"],
    ["法杖", "Wands"],
    ["法器", "Foci"],
    ["长杖", "Staves"],
    ["短杖", "Sceptres"],
    ["节杖", "Quarterstaves"],
    ["战矛", "Spears"],
    ["战弩", "Crossbows"],
    ["弓", "Bows"],
    ["箭袋", "Quivers"],

    ["项链", "Amulets"],
    ["戒指", "Rings"],
    ["腰带", "Belts"],
    ["咒符", "Charms"],
    ["生命药剂", "Life_Flasks"],
    ["魔力药剂", "Mana_Flasks"],

    ["单手锤", "One_Hand_Maces"],
    ["双手锤", "Two_Hand_Maces"],
    ["盾牌", "Shields"],
    ["轻盾", "Bucklers"],

    ["手套(护甲)", "Gloves_str"],
    ["鞋子(护甲)", "Boots_str"],
    ["胸甲(护甲)", "Body_Armours_str"],
    ["头部(护甲)", "Helmets_str"],

    ["手套(闪避)", "Gloves_dex"],
    ["鞋子(闪避)", "Boots_dex"],
    ["胸甲(闪避)", "Body_Armours_dex"],
    ["头部(闪避)", "Helmets_dex"],

    ["手套(护盾)", "Gloves_int"],
    ["鞋子(护盾)", "Boots_int"],
    ["胸甲(护盾)", "Body_Armours_int"],
    ["头部(护盾)", "Helmets_int"],



    // ["咒符", "Charms"],
    // ["可堆叠通货", "Stackable_Currency"],
    // ["可镶嵌", "Socketable"],
    // ["预兆", "Omen"],
    // ["液化情感", "Liquid_Emotions"],
    // ["精华", "Essence"],
    // ["裂片", "Splinter"],
    // ["催化剂", "Catalysts"],
    // ["引路石", "Waystones"],
    // ["地图碎片", "Map_Fragments"],
    // ["先祖秘藏日志", "Expedition_Logbooks"],
    // ["贪婪战书", "Inscribed_Ultimatum"],
    // ["石板", "Tablet"],
    // ["试炼硬币", "Trial_Coins"],
    // ["巅峰钥匙", "Pinnacle_Keys"],
    // ["珠宝", "Jewels"],
    // ["宝库钥匙", "Vault_Keys"],
    // ["遗物", "Relics"],
    // ["藏身处", "Hideout"],
    // ["保险箱", "Strongbox"]
]);

// ============================================
// SIDEBAR CLASS
// ============================================
class Sidebar {
    constructor() {
        this.isVisible = false;
        this.isPinned = false;
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

    renderAffixInfoPanel(allixes) {
        const panel = this.container.querySelector('#affix-info-panel');
        const scroll = panel.querySelector('.affix-info-scroll');

        // Clear logic
        if (!allixes) {
            panel.style.display = 'none';
            return;
        }

        scroll.innerHTML = '';
        allixes.forEach(affix => {
            const row = document.createElement('div');
            row.className = 'affix-info-item';

            // Set source-based class
            if (affix.source === 'normal') {
                row.classList.add('mod-source-normal');
            } else if (affix.source === 'desecrated') {
                row.classList.add('mod-source-desecrated');
            }

            row.textContent = affix.sign;
            scroll.appendChild(row);
        });

        panel.style.display = 'block';

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
                const isSelected = itemEl.classList.contains('selected');
                const elements = getMultiselectElements();

                // Clear previous selection
                const prevSelected = container.querySelector('.affix-limit-item.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }

                // If clicking an already selected item, we just deselected it above. 
                // Restore visibility and return.
                if (isSelected) {
                    elements.forEach(element => element.style.display = '');
                    this.renderAffixInfoPanel(null); // Hide panel
                    return;
                }

                // New Selection
                itemEl.classList.add('selected');

                console.log(value);
                console.log(elements.length);

                fetchAndAnalyze(`https://poe2db.tw/cn/${value}`).then(r => {
                    // Check if this item is still selected (user might have clicked another one quickly)
                    if (!itemEl.classList.contains('selected')) return;

                    //合并r.prefixes和r.suffixes
                    const allixes = [...r.prefixes, ...r.suffixes]
                    console.log(allixes)

                    // Show Info Panel
                    this.renderAffixInfoPanel(allixes);

                    elements.forEach(element => {
                        //element元素span下的span下有text
                        const text = element.querySelector('span').querySelector('span').textContent;
                        // text 如果 不在 allixes 中，将element的class设置为display:none 
                        if (!allixes.some(allix => allix.sign === text)) {
                            element.style.display = 'none'
                        } else {
                            element.style.display = 'block'
                            // console.log(text)
                        }
                    })
                });
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

          <!-- Section 2: Search Enhancements -->
          <div class="sidebar-section expanded" id="section-search-enhancements">
              <div class="sidebar-section-header">
                  <span>搜索词缀预览</span>
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
                  
                  <!-- Affix Info Panel (Hidden by default) -->
                  <div id="affix-info-panel" class="affix-info-panel" style="display: none;">
                      <div class="affix-info-header">
                          <span>词缀预览</span>
                      </div>
                      <div class="affix-info-scroll"></div>
                  </div>
              </div>
          </div>


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

        // Config Export
        const btnExport = document.getElementById('btn-export-collection');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                chrome.storage.local.get(['poe2_collections'], (result) => {
                    const data = result['poe2_collections'] || [];
                    const jsonStr = JSON.stringify(data, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const date = new Date();
                    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `poe2_collections_${dateStr}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                });
            });
        }

        // Config Import Trigger
        const btnImport = document.getElementById('btn-import-collection');
        const fileInput = document.getElementById('file-import-collection');
        if (btnImport && fileInput) {
            btnImport.addEventListener('click', () => {
                if (confirm('导入配置将覆盖当前的收藏物品，确定继续吗?')) {
                    fileInput.click();
                }
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (Array.isArray(data)) {
                            chrome.storage.local.set({ 'poe2_collections': data }, () => {
                                alert('配置导入成功!');
                                this.collectionsTree.load(); // Reload tree
                            });
                        } else {
                            alert('无效的配置文件格式 (必须是数组)');
                        }
                    } catch (err) {
                        alert('JSON 解析失败: ' + err.message);
                    }
                    // Reset input so same file can be selected again if needed
                    fileInput.value = '';
                };
                reader.readAsText(file);
            });
        }

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

        // Pin Button
        const pinBtn = this.container.querySelector('#btn-pin-sidebar');
        if (pinBtn) {
            pinBtn.addEventListener('click', () => this.togglePin());
        }
    }

    togglePin() {
        this.isPinned = !this.isPinned;
        const pinBtn = this.container.querySelector('#btn-pin-sidebar');

        if (this.isPinned) {
            pinBtn.classList.add('active');
            document.body.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
            document.body.style.marginRight = '476px';

            // Ensure sidebar is open
            if (!this.isVisible) {
                this.isVisible = true;
                this.container.classList.remove('collapsed');
            }
        } else {
            pinBtn.classList.remove('active');
            document.body.style.marginRight = '';
        }
        this.saveState();
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.container.classList.remove('collapsed');
            // Auto-pin on expand
            if (!this.isPinned) {
                this.togglePin();
            }
        } else {
            this.container.classList.add('collapsed');
            // If closing, we must unpin because pinned implies visible space
            if (this.isPinned) {
                this.togglePin(); // This will flip isPinned to false and reset layout
                // But togglePin tries to open it if !isVisible?
                // Wait, togglePin: if(this.isPinned) -> open. 
                // calling list.togglePin() flips isPinned to false.
                // else branch of togglePin: resets layout.
                // So calling togglePin() is correct.
            }
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
