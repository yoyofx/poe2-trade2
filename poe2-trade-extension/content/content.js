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
    if (isActive) {
        btn.classList.remove('active');
        btn.innerHTML = '☆';
        // TODO: Remove from collection (requires tracking ID)
    } else {
        btn.classList.add('active');
        btn.innerHTML = '★';

        // Extract Data
        const itemData = extractItemData(row);
        sidebar.addToCollection(itemData);
    }
}

function extractItemData(row) {

    // Attempt to extract relevant data
    // This is highly dependent on the actual DOM structure of PoE Trade site
    // get row attribate , data-id
    const itemid = row.getAttribute('data-id');
    console.log(itemid)

    const nameEl = row.querySelector('.itemName') || row.querySelector('.name');
    const typeEl = row.querySelector('.itemType') || row.querySelector('.typeLine');
    const priceEl = row.querySelector('.priceBlock') || row.querySelector('.price');
    const playerEl = row.querySelector('.posted-by');

    // Try to find whisper button/data
    const whisperBtn = row.querySelector('.direct-btn');

    // Fallback: Use full text if specific elements aren't found
    const fullText = row.innerText.split('\n').filter(line => line.trim() !== '').join(' | ');

    const affixes = Array.from(row.querySelectorAll('.explicitMod')).map(el => parseAffix(el.innerText));

    return {
        id: itemid,
        name: (nameEl ? nameEl.innerText : '') + ' ' + (typeEl ? typeEl.innerText : '') || 'Unknown Item',
        nameCss: nameEl ? `color: ${window.getComputedStyle(nameEl).color}` : '',
        price: priceEl ? priceEl.innerText : 'Unknown Price',
        playerName: playerEl ? playerEl.innerText : null,
        whisperBtn: whisperBtn,
        fullText: fullText,
        affixes: affixes,
        timestamp: Date.now()
    };
}

function parseAffix(text) {
    const parts = text.split('\n');
    const tagLine = parts[0];
    const content = parts.slice(1).join('\n');

    const tags = tagLine.split('+').map(t => t.trim());
    const affixChildren = tags.map(tag => {
        const match = tag.match(/([SP])(\d+)/);
        if (match) {
            return {
                isPrefix: match[1] === 'S',
                tier: parseInt(match[2], 10)
            };
        }
        return null;
    }).filter(Boolean);

    const firstChild = affixChildren[0] || { isPrefix: false, tier: 0 };

    return {
        isPrefix: firstChild.isPrefix,
        tier: firstChild.tier,
        content: content,
        affixChildren: affixChildren
    };
}
