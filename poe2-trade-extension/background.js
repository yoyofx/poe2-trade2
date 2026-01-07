chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request)
    if (request.action === 'fetchUrl') {
        fetch(request.url)
            .then(response => response.text())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.toString() }));
        return true; // Keep the message channel open for sendResponse
    } else if (request.action === 'notify') {
        //now to string
        const now = new Date();
        // 1. 完整的 ISO 格式（国际标准，带时区）
        const isoString = now.toISOString();
        chrome.notifications.create('poe2-notify-' + isoString, {
            type: 'basic',
            iconUrl: 'poe2_icon.png',
            title: request.title || '新物品提醒',
            message: request.message || '发现新物品!',
            buttons: [
                { title: '取消' },
                { title: '立即跳转到藏身处' }
            ],
            requireInteraction: true
        }, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error("Notification Error:", chrome.runtime.lastError);
            }
        });

        // Save the context (itemId) for this notification
        // We can use a Map, but for simplicity assuming single item for now or encoding ID in notificationId
        // Ideally: request.notificationId should encapsulate itemId
    }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 1) { // 立即跳转
        // notificationId should contain the item ID or we need to look it up.
        // Let's assume notificationId IS the itemId for simplicity, or "notify-[itemId]"
        const itemId = notificationId.replace('notify-', '');

        // Send message to active tab to perform jump
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'jumpToHideout', itemId: itemId });
            }
        });
    }
    // Always clear notification on button click?
    chrome.notifications.clear(notificationId);
});
