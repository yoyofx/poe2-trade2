# 搜索收藏与订阅

范围：搜索保存、跳转与实时订阅。

## 已实现功能
1. 保存当前搜索 URL 为搜索项。
2. 搜索树支持新建文件夹、删除、重命名、拖拽。
3. 搜索项支持一键跳转回搜索页面。
4. 搜索项支持订阅（WebSocket 实时监听）。
5. 订阅列表展示与取消订阅。
6. 默认订阅数量上限 5。

## 主要实现位置
1. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/ui/Sidebar.js`
2. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/ui/TreeView.js`
3. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/logic/subscription-manager.js`
