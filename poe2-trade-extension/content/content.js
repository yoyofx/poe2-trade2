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
        starBtn.title = 'Add to Collection';

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

    const nameEl = row.querySelector('.itemName') || row.querySelector('.name');
    const typeEl = row.querySelector('.itemType') || row.querySelector('.typeLine');
    const priceEl = row.querySelector('.priceBlock') || row.querySelector('.currency-text');
    const playerEl = row.querySelector('.posted-by');

    // Try to find whisper button/data
    const whisperBtn = row.querySelector('.whisper-btn') || row.querySelector('button.contact');
    const whisperMessage = whisperBtn ? whisperBtn.getAttribute('data-whisper') : null;

    // Fallback: Use full text if specific elements aren't found
    const fullText = row.innerText.split('\n').filter(line => line.trim() !== '').join(' | ');

    return {
        name: (nameEl ? nameEl.innerText : '') + ' ' + (typeEl ? typeEl.innerText : '') || 'Unknown Item',
        nameCss: nameEl ? `color: ${window.getComputedStyle(nameEl).color}` : '',
        price: priceEl ? priceEl.innerText : 'Unknown Price',
        playerName: playerEl ? playerEl.innerText : null,
        whisperMessage: whisperMessage,
        fullText: fullText,
        timestamp: Date.now()
    };
}
