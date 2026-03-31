# 扩展基础与注入

范围：扩展基础配置、注入入口与运行环境。

## 已实现功能
1. Manifest V3 配置，匹配 `*://poe.game.qq.com/trade2/*` 并注入内容脚本与样式。
2. 后台 Service Worker 启用（用于跨域抓取与通知等能力）。
3. 扩展图标与 web 可访问资源配置。

## 主要实现位置
1. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/manifest.json`
2. `/Users/yoyofx/Documents/github/poe2-trade2/poe2-trade-extension/background.js`
