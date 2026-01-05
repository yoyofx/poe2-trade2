class SubscriptionManager {
    constructor(maxSubscriptions = 5) {
        this.maxSubscriptions = maxSubscriptions;
        this.subscriptions = new Map(); // id -> WebSocket
    }

    subscribe(id, url, callback) {
        if (this.subscriptions.has(id)) {
            alert('已经订阅了该搜索!');
            return;
        }

        if (this.subscriptions.size >= this.maxSubscriptions) {
            alert(`已达到最大订阅数量 (${this.maxSubscriptions})! 请先取消一些订阅.`);
            return;
        }

        console.log(`[SubscriptionManager] Connecting to: ${url}`);

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log(`[SubscriptionManager] Connected: ${id}`);
                this.subscriptions.set(id, { ws, callback });
                alert(`订阅成功! \nID: ${id}`);
                // Optional: Update UI to reflect active subscription
            };

            ws.onmessage = (event) => {
                // Handle incoming data
                // console.log(`[SubscriptionManager] Message from ${id}:`, event.data);
                if (callback) {
                    try {
                        const data = JSON.parse(event.data);
                        callback(id, data);
                    } catch (e) {
                        // Fallback for non-JSON or raw data
                        callback(id, event.data);
                    }
                }
            };

            ws.onerror = (error) => {
                console.error(`[SubscriptionManager] Error in ${id}:`, error);
            };

            ws.onclose = () => {
                console.log(`[SubscriptionManager] Disconnected: ${id}`);
                this.subscriptions.delete(id);
            };

        } catch (err) {
            console.error(`[SubscriptionManager] Failed to connect ${id}:`, err);
            alert(`无法连接: ${err.message}`);
        }
    }

    unsubscribe(id) {
        if (this.subscriptions.has(id)) {
            const { ws } = this.subscriptions.get(id);
            ws.close();
            this.subscriptions.delete(id);
            console.log(`[SubscriptionManager] Unsubscribed: ${id}`);
        }
    }

    list() {
        return Array.from(this.subscriptions.keys());
    }
}

// Global instance
window.subscriptionManager = new SubscriptionManager();
