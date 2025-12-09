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
    const playerEl = row.querySelector('.posted-by');

    // Try to find whisper button/data
    const whisperBtn = row.querySelector('.direct-btn');

    // Fallback: Use full text if specific elements aren't found
    const fullText = row.innerText.split('\n').filter(line => line.trim() !== '').join(' | ');

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
        const rangeMatch = tag.match(/\[(\d+)\s*[—\-]\s*(\d+)\]/);

        if (!tierMatch && !rangeMatch) return null;

        const child = {};

        if (tierMatch) {
            child.isPrefix = tierMatch[1].toUpperCase() === 'P';
            child.tier = parseInt(tierMatch[2], 10);
        } else {
            child.isPrefix = null;
            child.tier = null;
        }

        if (rangeMatch) {
            child.tierRange = {
                min: parseInt(rangeMatch[1], 10),
                max: parseInt(rangeMatch[2], 10)
            };
        } else {
            child.tierRange = null;
        }

        return child;
    }).filter(Boolean);

    const firstChild = affixChildren[0] || { isPrefix: null, tier: null, tierRange: null };

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

// 从content中根据filter提取数值
function extractValuesFromContent(filter, content) {
    if (!filter || !content) {
        return null;
    }

    try {
        // 将filter中的 # 替换为捕获数字的正则表达式
        // 转义特殊字符，但保留 # 用于替换
        const escapedFilter = filter
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // 转义正则特殊字符
            .replace(/#/g, '(\\d+(?:\\.\\d+)?)');   // # 替换为匹配正数和小数的正则

        const regex = new RegExp(escapedFilter);
        const match = content.match(regex);

        if (!match) {
            return null;
        }

        // 提取所有捕获组（跳过第0个，因为它是完整匹配）
        const values = [];
        for (let i = 1; i < match.length; i++) {
            const num = parseFloat(match[i]);
            if (!isNaN(num)) {
                values.push(num);
            }
        }

        return values.length > 0 ? values : null;
    } catch (error) {
        console.error('Error extracting values from content:', error);
        return null;
    }
}
