# 物品收藏

范围：收藏入口、树形结构管理与本地存储。

## 已实现功能
1. 交易列表左侧注入星标按钮，点击收藏。
2. 收藏数据解析并写入收藏树。
3. 收藏树支持新建文件夹、删除、重命名（F2/按钮）。
4. 收藏树支持拖拽移动、选中高亮。
5. 收藏支持导入/导出 JSON。
6. 收藏物品卡片展示：名称、分类、价格、词缀/符文/技能等详情。
7. 收藏物品支持“跳转藏身处”按钮与删除按钮。

## 主要实现位置
1. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/ui/StarButton.js`
2. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/ui/TreeView.js`
3. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/ui/Sidebar.js`
4. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/logic/parser.js`
