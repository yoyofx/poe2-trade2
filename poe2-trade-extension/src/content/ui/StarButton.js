import { extractItemData } from '../logic/parser.js';

export function injectStarButton(row, sidebar) {
    // Find a suitable place to inject. Usually the left-most part of the row.
    const targetContainer = row.querySelector('.left') || row.firstElementChild;

    if (targetContainer) {
        const starBtn = document.createElement('div');
        starBtn.className = 'poe2-trade-star-btn';
        starBtn.innerHTML = '☆'; // Hollow star
        starBtn.setAttribute('data-tooltip', '将此物品添加到流放2网购助手中');

        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStar(starBtn, row, sidebar);
        });

        targetContainer.insertBefore(starBtn, targetContainer.firstChild);
    }
}

function toggleStar(btn, row, sidebar) {
    const isActive = btn.classList.contains('active');
    const itemId = row.getAttribute('data-id');
    
    if (isActive) {
        // btn.classList.remove('active');
        // btn.innerHTML = '☆';
        sidebar.removeFromCollection(itemId);
    } else {
        btn.classList.add('active');
        btn.innerHTML = '★';

        const searchCode = window.location.pathname.split('/').pop();
        const itemData = extractItemData(row, itemId, searchCode);
        sidebar.addToCollection(itemData);
    }
}
