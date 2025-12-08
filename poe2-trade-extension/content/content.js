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
    const results = document.querySelectorAll('.row:not(.poe2-processed)');

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
    return {
        isPrefix: firstChild.isPrefix,
        tier: firstChild.tier,
        tierRange: firstChild.tierRange,
        type: type,
        content: content,
        affixChildren: affixChildren.length > 1 ? affixChildren : null
    };
}
