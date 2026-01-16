import { getTrade2State } from '../utils/state.js';

export class TreeView {
    constructor(containerId, storageKey, sidebarInstance) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.storageKey = storageKey;
        this.sidebarInstance = sidebarInstance;
        this.data = []; 
        this.selectedNodeId = null;
        this.draggedNodeId = null;
        this.load();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2' && this.selectedNodeId && this.container && this.container.offsetParent !== null) {
                this.renameNode(this.selectedNodeId);
            }
        });
    }

    load() {
        chrome.storage.local.get([this.storageKey], (result) => {
            this.data = result[this.storageKey] || [];
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
            this.selectedNodeId = null;
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
        if (!this.container) this.container = document.getElementById(this.containerId);
        if (!this.container) return;

        this.container.innerHTML = '';
        
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
            
            const header = document.createElement('div');
            header.className = 'tree-header';
            if (this.selectedNodeId === node.id) header.classList.add('selected');

            header.onclick = (e) => {
                e.stopPropagation();
                this.selectNode(node.id);
            };

            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle';
            toggle.innerHTML = node.expanded ? '▼' : '▶';
            toggle.onclick = (e) => {
                e.stopPropagation();
                node.expanded = !node.expanded;
                this.save();
            };

            const label = document.createElement('span');
            label.className = 'tree-label';
            label.textContent = node.name;

            const actions = document.createElement('div');
            actions.className = 'tree-actions';

            const renameBtn = document.createElement('button');
            renameBtn.className = 'tree-action-btn btn-rename';
            renameBtn.innerHTML = '✎';
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                this.renameNode(node.id);
            };
            actions.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'tree-action-btn btn-delete';
            deleteBtn.innerHTML = '🗑';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('确定要删除吗?')) this.deleteNode(node.id);
            };
            actions.appendChild(deleteBtn);

            header.appendChild(toggle);
            header.appendChild(label);
            header.appendChild(actions);
            el.appendChild(header);

            if (node.expanded && node.children && node.children.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';
                node.children.forEach(child => {
                    childrenContainer.appendChild(this.createNodeElement(child, node.id));
                });
                el.appendChild(childrenContainer);
            }
        } else if (node.type === 'item' && node.data) {
             el.onclick = (e) => {
                e.stopPropagation();
                if (parentId) this.selectNode(parentId);
            };

            const isSavedSearch = this.storageKey === 'poe2_searches';
            if (isSavedSearch) {
                el.classList.add('saved-search-node');
                const nameRow = document.createElement('div');
                nameRow.className = 'item-name-row';
                
                const typeTag = document.createElement('div');
                typeTag.className = 'item-category';
                typeTag.textContent = 'Search';
                
                const itemName = document.createElement('div');
                itemName.className = 'tree-label item-name saved-search-name';
                itemName.textContent = node.name;

                const actions = document.createElement('div');
                actions.className = 'search-actions';

                const gotoBtn = document.createElement('button');
                gotoBtn.className = 'footer-action-btn btn-jump tooltip-btn';
                gotoBtn.innerHTML = '➜';
                gotoBtn.setAttribute('data-tooltip', '前往搜索');
                gotoBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.location.href = node.data.url;
                };
                
                const subscribeBtn = document.createElement('button');
                subscribeBtn.className = 'footer-action-btn btn-subscribe tooltip-btn';
                subscribeBtn.innerHTML = '📡';
                subscribeBtn.setAttribute('data-tooltip', '订阅');
                subscribeBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.sidebarInstance) this.sidebarInstance.executeSubscription(node);
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'footer-action-btn btn-delete tooltip-btn';
                deleteBtn.innerHTML = '🗑';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('删除搜索?')) this.deleteNode(node.id);
                };

                actions.appendChild(gotoBtn);
                actions.appendChild(subscribeBtn);
                actions.appendChild(deleteBtn);
                
                nameRow.appendChild(typeTag);
                nameRow.appendChild(itemName);
                nameRow.appendChild(actions);
                el.appendChild(nameRow);
            } else {
                const nameRow = document.createElement('div');
                nameRow.className = 'item-name-row';
                if (node.data.nameCss) nameRow.style.cssText += `; border-bottom: 1px solid ${node.data.nameCss.split(':')[1]}`;

                if (node.data.category) {
                    const cat = document.createElement('div');
                    cat.className = 'item-category';
                    cat.textContent = node.data.category;
                    nameRow.appendChild(cat);
                }

                const itemName = document.createElement('div');
                itemName.className = 'tree-label item-name';
                itemName.textContent = node.name;
                if (node.data.nameCss) itemName.style.cssText = node.data.nameCss;
                nameRow.appendChild(itemName);
                
                const details = document.createElement('div');
                details.className = 'item-details';
                if (node.data.price) {
                    const price = document.createElement('div');
                    price.className = 'item-price';
                    price.textContent = node.data.price;
                    details.appendChild(price);
                }

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
                            if (affix.tier === 0) {
                                affixEl.classList.add('item-affix-t0');
                            } else if (affix.tier === 1) {
                                affixEl.classList.add('item-affix-t1');
                            } else if (affix.tier === 2) {
                                affixEl.classList.add('item-affix-t2');
                            }

                            if (affix.isPrefix !== null) {
                                affixEl.classList.add(affix.isPrefix ? 'type-prefix' : 'type-suffix');
                            }

                            var type_tag = null;
                            if (affix.isPrefix != null) {
                                type_tag = affix.isPrefix ? '前缀' : '后缀';
                            } else {
                                type_tag = '暗金';
                            }

                            const typeTag = document.createElement('span');
                            typeTag.className = 'affix-type-tag';
                            typeTag.textContent = type_tag;
                            affixEl.appendChild(typeTag);

                            const tierTag = document.createElement('span');
                            tierTag.className = 'affix-tier';
                            tierTag.textContent = `T${affix.tier}`;
                            affixEl.appendChild(tierTag);

                            const text = document.createElement('span');
                            text.className = 'affix-text';
                            text.textContent = affix.content;
                            affixEl.appendChild(text);

                            if (affix.tierRange && affix.tierRange.length > 0) {
                                const rangeTag = document.createElement('span');
                                rangeTag.className = 'affix-range';
                                const rangeTexts = affix.tierRange.map(range => {
                                    if (range.min === range.max) return null;
                                    const minFormatted = range.min % 1 === 0 ? range.min : range.min.toFixed(1);
                                    const maxFormatted = range.max % 1 === 0 ? range.max : range.max.toFixed(1);
                                    return `[${minFormatted}-${maxFormatted}]`;
                                }).filter(Boolean);

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

                renderAffixSection(node.data.base, 'item-base', '基底:');
                renderAffixSection(node.data.runes, 'item-runes', '符文:');
                renderAffixSection(node.data.affixes, 'item-affixes', null);
                renderAffixSection(node.data.desecrates, 'item-desecrates', null);

                const actions = document.createElement('div');
                actions.className = 'item-actions-footer';
                const hideoutBtn = document.createElement('button');
                hideoutBtn.className = 'footer-action-btn btn-hideout tooltip-btn';
                hideoutBtn.innerHTML = '🏠';
                hideoutBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (this.sidebarInstance) this.sidebarInstance.jumpToHideout(node.data.id, node.data.searchCode);
                };
                actions.appendChild(hideoutBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'footer-action-btn btn-delete tooltip-btn';
                deleteBtn.innerHTML = '🗑';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('删除物品?')) this.deleteNode(node.id);
                };
                actions.appendChild(deleteBtn);

                el.appendChild(nameRow);
                el.appendChild(details);
                el.appendChild(actions);
            }
        }
        return el;
    }
}
