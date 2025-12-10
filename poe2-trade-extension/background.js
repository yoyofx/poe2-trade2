chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchUrl') {
        fetch(request.url)
            .then(response => response.text())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.toString() }));
        return true; // Keep the message channel open for sendResponse
    }
});
