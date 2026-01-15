class TreeView {
    constructor(containerId, storageKey) {
        this.container = document.getElementById(containerId);
        this.storageKey = storageKey;
        this.data = []; // Array of nodes
        this.selectedNodeId = null;
        this.draggedNodeId = null;
        this.load();

        // F2 Rename Listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2' && this.selectedNodeId && this.container.offsetParent !== null) {
                this.renameNode(this.selectedNodeId);
            }
        });
    }

    load() {
        chrome.storage.local.get([this.storageKey], (result) => {
            this.data = result[this.storageKey] || [];
            // Restore selection if possible, or select first folder
            this.render();
        });
    }

    save() {
        const dataToSave = { [this.storageKey]: this.data };
        const trade2state = getTrade2State();
        if (trade2state && trade2state.league) {
            dataToSave['version'] = trade2state.league;
        }
        chrome.storage.local.set(dataToSave);
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

    renameNode(id) {
        const node = this.findNode(id, this.data);
        if (node) {
            const newName = prompt('重命名:', node.name);
            if (newName && newName.trim() !== '') {
                node.name = newName;
                this.save();
            }
        }
    }

    findNodeAndParent(id, nodes) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) {
                return { node: nodes[i], parentArray: nodes };
            }
            if (nodes[i].children) {
                const result = this.findNodeAndParent(id, nodes[i].children);
                if (result) return result;
            }
        }
        return null;
    }

    isDescendant(parentId, childId) {
        const parent = this.findNode(parentId, this.data);
        if (!parent || !parent.children) return false;
        return this.findNode(childId, parent.children) !== null;
    }

    moveNode(nodeId, targetId) {
        if (nodeId === targetId) return;
        if (this.isDescendant(nodeId, targetId)) {
            alert('无法将文件夹移动到其子文件夹中');
            return;
        }

        const source = this.findNodeAndParent(nodeId, this.data);
        if (!source) return;

        let targetParentChildren = null;
        let targetNode = null;

        if (targetId === 'root') {
            targetParentChildren = this.data;
        } else {
            targetNode = this.findNode(targetId, this.data);
            if (!targetNode || targetNode.type !== 'folder') return;
            if (!targetNode.children) targetNode.children = [];
            targetParentChildren = targetNode.children;
        }

        const index = source.parentArray.indexOf(source.node);
        if (index > -1) {
            source.parentArray.splice(index, 1);
        }

        targetParentChildren.push(source.node);
        if (targetNode) targetNode.expanded = true;
        this.save();
    }

    render() {
        this.container.innerHTML = '';
        
        // Root Drop Zone
        this.container.ondragover = (e) => {
            e.preventDefault();
        };
        this.container.ondrop = (e) => {
            e.preventDefault();
            if (e.target === this.container) {
                 const draggedId = this.draggedNodeId;
                 if (draggedId) this.moveNode(draggedId, 'root');
            }
        };

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

        // Drag and Drop Logic
        el.setAttribute('draggable', 'true');
        el.ondragstart = (e) => {
            this.draggedNodeId = node.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', node.id);
            e.stopPropagation();
            setTimeout(() => el.classList.add('dragging'), 0);
        };
        el.ondragend = (e) => {
            el.classList.remove('dragging');
            this.draggedNodeId = null;
        };

        if (node.type === 'folder') {
            el.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.draggedNodeId !== node.id) {
                     el.classList.add('drag-over');
                }
            };
            el.ondragleave = (e) => {
                el.classList.remove('drag-over');
            };
            el.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                el.classList.remove('drag-over');
                if (this.draggedNodeId) {
                    this.moveNode(this.draggedNodeId, node.id);
                }
            };
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
                el.classList.add('saved-search-node');
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
                    // 直接执行订阅
                    if (window.poe2SidebarInstance) {
                        window.poe2SidebarInstance.executeSubscription(node);
                    }
                };

                actions.appendChild(subscribeBtn);

                // Rename Button
                const renameBtn = document.createElement('button');
                renameBtn.className = 'footer-action-btn btn-rename tooltip-btn';
                renameBtn.innerHTML = '✎';
                renameBtn.setAttribute('data-tooltip', '重命名');
                renameBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.renameNode(node.id);
                };
                actions.appendChild(renameBtn);

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
                    if (window.poe2SidebarInstance) {
                        window.poe2SidebarInstance.jumpToHideout(node.data.id, node.data.searchCode);
                    }
                };

                actions.appendChild(hideoutBtn);

                // Rename button
                const renameBtn = document.createElement('button');
                renameBtn.className = 'footer-action-btn btn-rename tooltip-btn';
                renameBtn.innerHTML = '✎';
                renameBtn.setAttribute('data-tooltip', '重命名');
                renameBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.renameNode(node.id);
                };
                actions.appendChild(renameBtn);

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
                    const trade2state = getTrade2State();
                    if (!trade2state) {
                        alert('无法获取当前赛季信息，请刷新页面重试。');
                        return;
                    }
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

        this.checkVersion().then(() => {
            this.collectionsTree = new TreeView('collections-tree', 'poe2_collections');
            this.searchesTree = new TreeView('searches-tree', 'poe2_searches');

            this.renderAffixLimitGrid();
            this.loadState();
            window.poe2SidebarInstance = this;
        });
    }

    checkVersion() {
        return new Promise((resolve) => {
            const trade2state = getTrade2State();
            const currentLeague = trade2state ? trade2state.league : null;

            if (!currentLeague) {
                resolve();
                return;
            }

            chrome.storage.local.get(['version'], (result) => {
                const storedVersion = result.version;

                if (!storedVersion) {
                    // Initialize version if missing
                    chrome.storage.local.set({ version: currentLeague });
                    console.log(`Version initialized to ${currentLeague}`);
                    resolve();
                } else if (storedVersion !== currentLeague) {
                    if (confirm(`流放2助手 缓存数据已过期 (缓存版本: ${storedVersion}, 当前版本: ${currentLeague})，是否一键清空?`)) {
                        chrome.storage.local.remove(['poe2_collections', 'poe2_searches', 'version'], () => {
                            chrome.storage.local.set({ version: currentLeague });
                            alert('流放2助手 缓存已清空');
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                } else {
                    resolve();
                }
            });
        });
    }

    addSubscriptionToUI(id, url, name) {
        // Show the panel
        const section = this.container.querySelector('#section-subscription-management');
        const list = section.querySelector('.subscription-list');
        section.style.display = 'flex'; // Make visible

        // Expand if needed
        if (!section.classList.contains('expanded')) {
            section.querySelector('.sidebar-section-header').click();
        }

        // Check for duplicate
        if (list.querySelector(`.subscription-item[data-id="${id}"]`)) return;

        const item = document.createElement('div');
        item.className = 'subscription-item';
        item.dataset.id = id;

        item.innerHTML = `
            <div class="sub-icon-wrapper">
                <svg class="sub-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
            </div>
            <div class="sub-info">
                <div class="sub-name" title="${name}">${name}</div>
                <div class="sub-status">正在监听...</div>
            </div>
            <button class="sub-close-btn" title="取消订阅">×</button>
        `;

        item.querySelector('.sub-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.subscriptionManager) {
                window.subscriptionManager.unsubscribe(id);
            }
            this.removeSubscriptionFromUI(id);
        });

        list.appendChild(item);
        list.style.display = 'block'; // Ensure list is visible
    }

    removeSubscriptionFromUI(id) {
        const list = this.container.querySelector('#section-subscription-management .subscription-list');
        const item = list.querySelector(`.subscription-item[data-id="${id}"]`);
        if (item) {
            item.remove();
        }

        // Hide section if empty? Optional
        if (list.children.length === 0) {
            const section = this.container.querySelector('#section-subscription-management');
            // section.style.display = 'none'; // Maybe keep it visible but empty?
        }
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
            } else if (affix.source === 'essence') {
                row.classList.add('mod-source-essence');
            } else if (affix.source === 'perfect_essence') {
                row.classList.add('mod-source-perfect_essence');
            } else if (affix.source === 'bonded') {
                row.classList.add('mod-source-bonded');
            } else if (affix.source === 'corrupted') {
                row.classList.add('mod-source-corrupted');
            } else if (affix.source === 'socketable') {
                row.classList.add('mod-source-socketable');
            }

            // 映射 source 到中文
            const sourceMap = {
                'normal': '普通',
                'desecrated': '亵渎',
                'essence': '精华',
                'perfect_essence': '完美精华',
                'bonded': '绑定词缀',
                'corrupted': '腐化词缀',
                'socketable': '增幅器词缀'
            };
            const sourceCN = sourceMap[affix.source] || affix.source;
            row.textContent = affix.source === 'normal' ? affix.sign : `【${sourceCN}】${affix.sign}`;
            scroll.appendChild(row);
        });

        // 使用 flex 而不是 block,保持弹性布局
        panel.style.display = 'flex';

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
           
           <!-- Section 0: Subscription Management -->
           <div class="sidebar-section" id="section-subscription-management" style="display: flex; flex-direction: column;">
               <div class="sidebar-section-header">
                   <span>订阅管理</span>
                   <span class="section-toggle">▶</span>
               </div>
               <div class="sidebar-section-content">
                   <div class="subscription-list"></div>
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

        // 首次切换到搜索标签页时显示引导
        if (tabName === 'searches') {
            chrome.storage.local.get(['subscription_guide_shown'], (result) => {
                if (!result.subscription_guide_shown) {
                    // 延迟显示,确保 DOM 已渲染
                    setTimeout(() => {
                        this.showSubscriptionGuide();
                    }, 300);
                }
            });
        }
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

    funcjumpToHideout(request) {
        //fetch url by https://poe.game.qq.com/api/trade2/fetch/{request.queryItemId}?query=Rry0VrOi7&realm=poe2
        const fetchUrl = `https://poe.game.qq.com/api/trade2/fetch/${request.queryItemId}?query=${request.searchCode}&realm=poe2`;
        fetch(fetchUrl)
            .then(response => response.json())
            .then(data => {

                if (data.result) {
                    const top1Item = data.result[0]
                    this.jumpToHideoutByToken(top1Item.listing.hideout_token)
                }

            })
            .catch(error => {
                console.error('Error in fetch:', error);
            });


    }


    jumpToHideoutByToken(token) {
        const hideoutActionUrl = 'https://poe.game.qq.com/api/trade2/whisper';
        fetch(hideoutActionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "x-requested-with": "XMLHttpRequest"
            },
            body: JSON.stringify({
                token: token
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 200 || !data.error) {
                    alert('正在前往藏身处...');
                } else {
                    alert('前往失败: ' + (data.error ? data.error.message : 'Unknown error'));
                }
            })

    }

    jumpToHideout(itemId, searchCode) {
        const hideoutActionUrl = 'https://poe.game.qq.com/api/trade2/whisper';
        // Note: The query ID 'GvjbmPOUb' might need to be dynamic or fetched from state.
        // For now, using the one present in original code or try to get it from local storage state if possible?
        // trade2state usually has request ID? No. 
        // Using a generic fetch might work if the session is valid. 
        // Actually, the query parameter is required by the API to link the fetch to a search context.
        // We will try without it or use a placeholder if the original code had it hardcoded.
        // Original: query=GvjbmPOUb
        if (!searchCode) {
            searchCode = 'GvjbmPOUb';
        }
        const url = `https://poe.game.qq.com/api/trade2/fetch/${itemId}?query=${searchCode}&realm=poe2`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.result && data.result.length > 0) {
                    const listing = data.result[0].listing;
                    if (!listing) {
                        console.error('No listing found');
                        return;
                    }
                    const whisper_token = listing.hideout_token;

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
            .catch(err => console.error('Fetch error:', err));
    }

    // 显示订阅功能分步骤引导
    showSubscriptionGuide() {
        const steps = [
            {
                title: '保存搜索',
                icon: '💾',
                content: '首先,点击<span class="guide-tooltip-highlight">"保存当前搜索"</span>按钮,可以将当前页面的搜索条件保存到收藏夹中,方便下次快速访问。',
                target: '#btn-save-search',
                position: 'bottom'
            },
            {
                title: '订阅搜索',
                icon: '📡',
                content: '保存搜索后,点击搜索项右侧的<span class="guide-tooltip-highlight">订阅按钮 📡</span>,即可开启实时监控功能。',
                target: '.btn-subscribe',
                position: 'left'
            },
            {
                title: '订阅管理',
                icon: '📋',
                content: '所有已订阅的搜索会显示在顶部的<span class="guide-tooltip-highlight">"订阅管理"</span>区域,您可以随时查看和取消订阅。',
                target: '#section-subscription-management',
                position: 'bottom'
            },
            {
                title: '重要提示',
                icon: '💡',
                content: '订阅功能通过 WebSocket 实时监听搜索结果,当有新物品符合条件时会立即通知您。<br><br><span class="guide-tooltip-highlight">注意:需要保持浏览器标签页打开才能正常工作。</span>',
                target: null,
                position: 'center'
            }
        ];

        let currentStep = 0;
        let overlay, highlight, tooltip;

        const createGuideUI = () => {
            // 创建遮罩层
            overlay = document.createElement('div');
            overlay.className = 'subscription-guide-overlay';

            // 创建高亮框
            highlight = document.createElement('div');
            highlight.className = 'subscription-guide-highlight';

            // 创建提示气泡
            tooltip = document.createElement('div');
            tooltip.className = 'subscription-guide-tooltip';

            document.body.appendChild(overlay);
            document.body.appendChild(highlight);
            document.body.appendChild(tooltip);
        };

        const updateStep = () => {
            const step = steps[currentStep];

            // 更新气泡内容
            tooltip.innerHTML = `
                <div class="guide-tooltip-header">
                    <div class="guide-tooltip-icon">${step.icon}</div>
                    <div class="guide-tooltip-title">${step.title}</div>
                </div>
                <div class="guide-step-indicator">
                    ${steps.map((_, i) => `<div class="guide-step-dot ${i === currentStep ? 'active' : ''}"></div>`).join('')}
                </div>
                <div class="guide-tooltip-content">
                    <p>${step.content}</p>
                </div>
                <div class="guide-tooltip-footer">
                    <div class="guide-step-counter">${currentStep + 1} / ${steps.length}</div>
                    <button class="guide-tooltip-btn">${currentStep === steps.length - 1 ? '完成' : '下一步'}</button>
                </div>
            `;

            // 绑定按钮事件
            const btn = tooltip.querySelector('.guide-tooltip-btn');
            btn.onclick = () => {
                if (currentStep < steps.length - 1) {
                    currentStep++;
                    updateStep();
                } else {
                    closeGuide();
                }
            };

            // 更新高亮位置
            if (step.target) {
                const targetEl = this.container.querySelector(step.target);
                if (targetEl) {
                    const rect = targetEl.getBoundingClientRect();
                    highlight.style.display = 'block';
                    highlight.style.top = `${rect.top - 4}px`;
                    highlight.style.left = `${rect.left - 4}px`;
                    highlight.style.width = `${rect.width + 8}px`;
                    highlight.style.height = `${rect.height + 8}px`;

                    // 定位气泡
                    positionTooltip(rect, step.position);
                } else {
                    highlight.style.display = 'none';
                    positionTooltipCenter();
                }
            } else {
                highlight.style.display = 'none';
                positionTooltipCenter();
            }
        };

        const positionTooltip = (targetRect, position) => {
            tooltip.className = 'subscription-guide-tooltip';
            const tooltipRect = tooltip.getBoundingClientRect();

            switch (position) {
                case 'bottom':
                    tooltip.classList.add('arrow-top');
                    tooltip.style.top = `${targetRect.bottom + 20}px`;
                    tooltip.style.left = `${targetRect.left + targetRect.width / 2 - tooltipRect.width / 2}px`;
                    break;
                case 'top':
                    tooltip.classList.add('arrow-bottom');
                    tooltip.style.top = `${targetRect.top - tooltipRect.height - 20}px`;
                    tooltip.style.left = `${targetRect.left + targetRect.width / 2 - tooltipRect.width / 2}px`;
                    break;
                case 'left':
                    tooltip.classList.add('arrow-right');
                    tooltip.style.top = `${targetRect.top + targetRect.height / 2 - tooltipRect.height / 2}px`;
                    tooltip.style.left = `${targetRect.left - tooltipRect.width - 20}px`;
                    break;
                case 'right':
                    tooltip.classList.add('arrow-left');
                    tooltip.style.top = `${targetRect.top + targetRect.height / 2 - tooltipRect.height / 2}px`;
                    tooltip.style.left = `${targetRect.right + 20}px`;
                    break;
            }
        };

        const positionTooltipCenter = () => {
            tooltip.className = 'subscription-guide-tooltip';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        };

        const closeGuide = () => {
            overlay.remove();
            highlight.remove();
            tooltip.remove();
            // 标记用户已完成引导
            chrome.storage.local.set({ subscription_guide_shown: true });
        };

        // 初始化
        createGuideUI();
        updateStep();
    }

    // 执行订阅操作
    executeSubscription(node) {
        const trade2state = getTrade2State();
        if (!trade2state) {
            alert('无法获取当前赛季信息,请刷新页面重试。');
            return;
        }
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

        // Replace protocol for WebSocket
        // Assuming original is https or http
        let wsUrl = liveSearchApiUrl + searchCode;

        console.log('Connecting to WebSocket:', wsUrl);

        if (window.subscriptionManager) {
            window.subscriptionManager.subscribe(searchCode, wsUrl, (sourceId, data) => {
                console.log(`[Callback] Message from ${sourceId}:`, data);

                if (data.result) {
                    // Notify Background
                    const itemId = data.result;
                    chrome.runtime.sendMessage({
                        action: 'notify',
                        title: node.name,
                        message: `订阅发现了 ${data.count} 个符合条件新物品`,
                        notificationId: searchCode,
                        queryItemId: data.result,
                        searchCode: searchCode
                    });
                }

            });

            if (window.poe2SidebarInstance) {
                window.poe2SidebarInstance.addSubscriptionToUI(searchCode, wsUrl, node.name);
            }
        } else {
            console.error('SubscriptionManager not found!');
            alert('订阅管理器未加载,请刷新页面重试。');
        }
    }
}


// Global Message Listener for Notification Actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'jumpToHideout' && request.request) {
        if (window.poe2SidebarInstance) {
            window.poe2SidebarInstance.funcjumpToHideout(request.request);
        }
    }
});

window.PoE2Sidebar = Sidebar;

function getTrade2State() {
    try {
        const trade2stateStr = localStorage.getItem('lscache-trade2state');
        if (trade2stateStr) {
            return JSON.parse(trade2stateStr);
        }
    } catch (e) {
        console.warn('Failed to parse lscache-trade2state:', e);
    }
    return null;
}
