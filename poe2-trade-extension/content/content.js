// Main entry point
console.log('PoE 2 Trade Extension Loaded');

// Initialize Sidebar
const sidebar = new window.PoE2Sidebar();

// Observer for Trade Results to inject Star buttons
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            checkForTradeResults();
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

function checkForTradeResults() {
    // Selector for trade result rows (needs to be verified against actual DOM)
    // Assuming a standard structure, but might need adjustment based on actual site
    const results = document.querySelectorAll('.row:not(.poe2-processed):not(.row-total):not(.controls)');

    results.forEach(row => {
        row.classList.add('poe2-processed');
        injectStarButton(row);
    });
}

function injectStarButton(row) {
    // Find a suitable place to inject. Usually the left-most part of the row.
    // This is a guess, will need to be refined by inspecting the actual page.
    const targetContainer = row.querySelector('.left') || row.firstElementChild;

    if (targetContainer) {
        const starBtn = document.createElement('div');
        starBtn.className = 'poe2-trade-star-btn';
        starBtn.innerHTML = '☆'; // Hollow star
        starBtn.setAttribute('data-tooltip', '将此物品添加到流放2网购助手中');

        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStar(starBtn, row);
        });

        targetContainer.insertBefore(starBtn, targetContainer.firstChild);
    }
}

function toggleStar(btn, row) {
    const isActive = btn.classList.contains('active');
    const itemId = row.getAttribute('data-id');
    if (isActive) {
        // btn.classList.remove('active');
        // btn.innerHTML = '☆';
        // TODO: Remove from collection (requires tracking ID)
        sidebar.removeFromCollection(itemId);

    } else {
        btn.classList.add('active');
        btn.innerHTML = '★';

        // Extract Data
        const itemData = extractItemData(row, itemId);
        sidebar.addToCollection(itemData);
    }
}

function extractItemData(row, itemId) {
    // Attempt to extract relevant data
    // This is highly dependent on the actual DOM structure of PoE Trade site
    // get row attribate , data-id
    console.log(itemId)

    const nameEl = row.querySelector('.itemName') || row.querySelector('.name');
    const typeEl = row.querySelector('.itemType') || row.querySelector('.typeLine');
    const priceEl = row.querySelector('.priceBlock') || row.querySelector('.price');
    const playerEl = row.querySelector('.posted-by') || row.querySelector('.profile-link > a');

    // Try to find whisper button/data
    const whisperBtn = row.querySelector('.direct-btn');

    // Fallback: Use full text if specific elements aren't found
    const fullText = row.innerText.split('\n').filter(line => line.trim() !== '').join(' | ');
    const category = row.querySelector('.content .property').innerText;
    const affixes = Array.from(row.querySelectorAll('.explicitMod')).map(el => parseAffix(el));
    const implicits = Array.from(row.querySelectorAll('.implicitMod')).map(el => parseAffix(el));
    const runes = Array.from(row.querySelectorAll('.runeMod')).map(el => parseAffix(el));
    const desecrates = Array.from(row.querySelectorAll('.desecratedMod')).map(el => parseAffix(el));
    const skills = Array.from(row.querySelectorAll('.skills .skill')).map(el => parseSkill(el));

    let name = (nameEl ? nameEl.innerText : '');
    let typeName = (typeEl ? typeEl.innerText : '');

    let a = {
        id: itemId,
        name: (name === typeName) ? name : name + ' ' + typeName,
        nameCss: nameEl ? `color: ${window.getComputedStyle(nameEl).color}` : '',
        price: priceEl ? priceEl.innerText : 'Unknown Price',
        playerName: playerEl ? playerEl.innerText : null,
        whisperBtn: whisperBtn,
        fullText: fullText,
        affixes: affixes,
        base: implicits,
        runes: runes,
        desecrates: desecrates,
        skills: skills,
        category: category,
        timestamp: Date.now()
    };
    console.log(a);
    return a;
}

// 缓存trade2stats数据，避免重复读取localStorage
let trade2StatsCache = null;

function loadTrade2Stats() {
    if (trade2StatsCache !== null) {
        return trade2StatsCache;
    }

    try {
        const jsonData = localStorage.getItem('lscache-trade2stats');
        if (!jsonData) {
            console.warn('lscache-trade2stats not found in localStorage');
            trade2StatsCache = [];
            return trade2StatsCache;
        }

        const dataArray = JSON.parse(jsonData);
        if (!Array.isArray(dataArray)) {
            console.warn('lscache-trade2stats is not an array');
            trade2StatsCache = [];
            return trade2StatsCache;
        }

        trade2StatsCache = dataArray;
        return trade2StatsCache;
    } catch (error) {
        console.error('Error loading trade2stats:', error);
        trade2StatsCache = [];
        return trade2StatsCache;
    }
}

function findFilter(id) {
    try {
        // 从id中提取type（以.分割后的第二个元素）
        const parts = id.split('.');
        if (parts.length < 2) {
            console.warn('Invalid id format, expected at least 2 parts separated by "."');
            return null;
        }
        const type = parts[1];

        // 使用缓存的数据
        const dataArray = loadTrade2Stats();
        if (dataArray.length === 0) {
            return null;
        }

        // 从数组中找到第一个id为type的元素
        const typeElement = dataArray.find(item => item.id === type);
        if (!typeElement) {
            console.warn(`Type element with id "${type}" not found`);
            return null;
        }

        // 获取entries字段
        const entries = typeElement.entries;
        if (!Array.isArray(entries)) {
            console.warn('entries field is not an array');
            return null;
        }

        // 从entries中找到第一个id匹配的元素（匹配id中第一个.之后的部分）
        const idAfterFirstDot = parts.slice(1).join('.');
        const entry = entries.find(item => item.id === idAfterFirstDot);
        if (!entry) {
            console.warn(`Entry with id "${id}" not found in entries`);
            return null;
        }

        // 返回text字段
        return entry.text || null;
    } catch (error) {
        console.error('Error in findFilter:', error);
        return null;
    }
}

function parseSkill(div) {
    const lcs = div.querySelector('.lc.s');
    const img = div.querySelector('img');
    const type = lcs ? lcs.dataset.field : null;
    const imageUrl = img ? img.src : null;

    let level = null;
    let name = '';

    if (lcs) {
        const spans = lcs.querySelectorAll('span');
        const textSpan = spans.length > 0 ? spans[spans.length - 1] : null;

        if (textSpan) {
            const text = textSpan.innerText;
            const levelMatch = text.match(/等级\s*(\d+)/);
            if (levelMatch) {
                level = parseInt(levelMatch[1], 10);
                name = text.replace(levelMatch[0], '').trim();
            } else {
                name = text;
            }
        }
    }

    return {
        type,
        imageUrl,
        level,
        name
    };
}

function parseAffix(div) {
    const lcl = div.querySelector('.lc.l');
    const lcs = div.querySelector('.lc.s');

    const content = lcs ? lcs.innerText : '';
    const type = lcs ? lcs.dataset.field : null;

    const tagText = lcl ? lcl.innerHTML : '';
    const parts = tagText.split('+').map(t => t.trim());

    const affixChildren = parts.map(tag => {
        const tierMatch = tag.match(/([PS])(\d+)/i);

        // 支持小数、负数和多个范围（用"到"分隔）
        // 匹配格式：[数字—数字] 或 [数字—数字 到 数字—数字]，数字可以是负数或小数
        // 正则更新：增加对 \u2013 (en-dash), \u2014 (em-dash) 等各种破折号的支持
        // 去掉外层的 \[ \] 限制，以便匹配 "数字-数字" 模式多次 appearing inside the string
        const rangePattern = /(-?\d+(?:\.\d+)?)\s*[—\-\u2013\u2014]\s*(-?\d+(?:\.\d+)?)/g;
        const rangeMatches = [...tag.matchAll(rangePattern)];

        if (!tierMatch && rangeMatches.length === 0) return null;

        const child = {};

        if (tierMatch) {
            child.isPrefix = tierMatch[1].toUpperCase() === 'P';
            child.tier = parseInt(tierMatch[2], 10);
        } else {
            child.isPrefix = null;
            child.tier = null;
        }

        if (rangeMatches.length > 0) {
            // 总是保存为数组
            child.tierRange = rangeMatches.map(match => ({
                min: parseFloat(match[1]),
                max: parseFloat(match[2])
            }));
        } else {
            child.tierRange = []; // 默认为空数组
        }

        return child;
    }).filter(Boolean);

    const firstChild = affixChildren[0] || { isPrefix: null, tier: null, tierRange: [] };

    // 根据filter从content中提取数值
    const filter = findFilter(type);
    const values = extractValuesFromContent(filter, content);

    return {
        isPrefix: firstChild.isPrefix,
        tier: firstChild.tier,
        tierRange: firstChild.tierRange,
        type: type,
        filter: filter,
        content: content,
        values: values,
        affixChildren: affixChildren.length > 1 ? affixChildren : null
    };
}

/**
 * 获取页面中 .search-advanced-pane.brown 下 .filter.filter-padded 中的所有 .multiselect__element 元素
 * @returns {NodeList} 所有符合条件的 multiselect__element 元素
 */
function getMultiselectElements() {
    const advancedPane = document.querySelector('.search-advanced-pane.brown');
    if (!advancedPane) {
        console.warn('未找到 .search-advanced-pane.brown 元素');
        return [];
    }

    const filterPadded = advancedPane.querySelector('.filter.filter-padded');
    if (!filterPadded) {
        console.warn('未找到 .filter.filter-padded 元素');
        return [];
    }

    const multiselectElements = filterPadded.querySelectorAll('.multiselect__element');
    console.log(`找到 ${multiselectElements.length} 个 .multiselect__element 元素`);
    return multiselectElements;
}

// 从content中根据filter提取数值
function extractValuesFromContent(filter, content) {
    if (!filter || !content) {
        return null;
    }

    try {
        // 将filter中的 # 替换为捕获数字的正则表达式
        // 先移除括号中的内容（如 (区域)），因为这些在content中不存在
        // 然后替换 #，最后转义正则特殊字符
        const cleanedFilter = filter.replace(/\s*\([^)]*\)/g, '');  // 移除括号及其内容

        // 特殊处理：如果filter包含 "+#"，而content可能是负数（即 "+" 变成了 "-" 或消失）
        // 我们需要把 filter 中的 "+" 视为可选的或者可变的

        let processedFilter = cleanedFilter;

        // 预处理：将 "#" 替换为特殊占位符
        processedFilter = processedFilter.replace(/#/g, '\x00PLACEHOLDER\x00');

        // 检查是否存在 "提高"/"降低" 反转的情况
        let isInverted = false;
        if (cleanedFilter.includes('提高') && content.includes('降低')) {
            processedFilter = processedFilter.replace('提高', '降低');
            isInverted = true;
        } else if (cleanedFilter.includes('降低') && content.includes('提高')) {
            processedFilter = processedFilter.replace('降低', '提高');
            isInverted = true;
        }

        // 转义正则特殊字符
        let escapedFilter = processedFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 处理空格：将所有空格替换为 \s+ 以匹配 &nbsp; 等
        escapedFilter = escapedFilter.replace(/\s+/g, '\\s+');

        // 关键修复：处理 "+#" 结构。在正则转义后，"+" 变成了 "\+"
        // 我们将 "\+\x00PLACEHOLDER\x00" (即原本的 +#) 替换为能匹配正负数的正则
        // 这样 "+#%" 可以匹配 "+10%" 也可以匹配 "-10%"
        escapedFilter = escapedFilter.replace(/\\\+\x00PLACEHOLDER\x00/g, '[+\\-]?(\\d+(?:\\.\\d+)?)');

        // 处理剩余的占位符（即原本就没有 + 号的 #）
        escapedFilter = escapedFilter.replace(/\x00PLACEHOLDER\x00/g, '[+\\-]?(\\d+(?:\\.\\d+)?)');

        const regex = new RegExp(escapedFilter);

        const match = content.match(regex);

        if (!match) {
            // No match found
            return null;
        }

        // 提取所有捕获组（跳过第0个，因为它是完整匹配）
        const values = [];
        for (let i = 1; i < match.length; i++) {
            let num = parseFloat(match[i]);
            if (!isNaN(num)) {
                // 如果是反转属性（提高 -> 降低），则数值取反
                if (isInverted) {
                    num = -num;
                }
                values.push(num);
            }
        }
        return values.length > 0 ? values : null;
    } catch (error) {
        console.error('Error extracting values from content:', error);
        return null;
    }
}
