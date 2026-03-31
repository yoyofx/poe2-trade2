# 解析与词缀工具

范围：DOM 解析、词缀处理、筛选增强。

## 已实现功能
1. 解析交易结果 DOM：名称、类型、价格、玩家、插槽、词缀、符文、技能等。
2. 词缀解析：前后缀识别、Tier 与范围解析。
3. ModsView JSON 解析（来自 poe2db.tw），汇总前后缀并做签名化处理。
4. 词缀预览与筛选：在侧边栏选择物品类型后过滤多选词缀列表。

## 主要实现位置
1. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/logic/parser.js`
2. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/utils/api.js`
3. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/utils/state.js`
4. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/src/content/utils/constants.js`
