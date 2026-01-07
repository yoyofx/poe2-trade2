// Cache to store request data by notificationId
const notificationData = new Map();

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
        const notificationId = request.notificationId || ('poe2-notify-' + isoString);

        // Store the request object for later use in button handlers
        request._sourceTabId = sender.tab ? sender.tab.id : null;
        notificationData.set(notificationId, request);

        chrome.notifications.create(notificationId, {
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
                // Clean up if creation failed
                notificationData.delete(notificationId);
            }
        });
    }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    // Retrieve the original request data
    const request = notificationData.get(notificationId);
    console.log("Notification Clicked. Request Data:", request);

    if (buttonIndex === 1) { // 立即跳转

        // Send message to active tab to perform jump
        if (request && request._sourceTabId) {
            chrome.tabs.update(request._sourceTabId, { active: true });
            chrome.tabs.sendMessage(request._sourceTabId, { action: 'jumpToHideout', request: request });
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'jumpToHideout', request: request });
                }
            });
        }
    }
    // Always clear notification on button click?
    chrome.notifications.clear(notificationId);
    // Clean up data
    notificationData.delete(notificationId);
});

// Also clean up on closed
chrome.notifications.onClosed.addListener((notificationId) => {
    notificationData.delete(notificationId);
});
