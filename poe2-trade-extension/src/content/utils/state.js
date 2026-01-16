// 缓存trade2stats数据，避免重复读取localStorage
let trade2StatsCache = null;

export function getTrade2State() {
    try {
        const trade2stateStr = localStorage.getItem('lscache-trade2state');
        if (trade2stateStr) {
            return JSON.parse(trade2stateStr);
        }
    } catch (e) {
        console.warn('Failed to parse lscache-trade2state:', e);
    }
    return null;
}

export function loadTrade2Stats() {
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

export function findFilter(id) {
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
