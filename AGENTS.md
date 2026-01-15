# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-15
**Type:** Chrome Extension (Manifest V3)
**Stack:** Vanilla JavaScript, HTML, CSS (No build step)

## OVERVIEW
PoE 2 Trade Helper (CN) is a browser extension for the Path of Exile 2 trade site (poe.game.qq.com). It injects a sidebar and "Star" buttons into the trade interface to allow item collection and live search subscriptions.

## STRUCTURE
```
.
├── .github/workflows/    # CI/CD: Zips extension for release
├── poe2-trade-extension/ # SOURCE CODE (Load this folder in Chrome)
│   ├── background.js     # Service Worker
│   ├── manifest.json     # Extension Config (V3)
│   └── content/          # Content Scripts & UI
└── resources/            # External assets/screenshots
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Entry Point** | `poe2-trade-extension/manifest.json` | Definitions for background/content scripts |
| **DOM Injection** | `poe2-trade-extension/content/content.js` | `MutationObserver`, button injection |
| **Data Parsing** | `poe2-trade-extension/content/content.js` | `extractItemData()` parses DOM to JSON |
| **State Logic** | `poe2-trade-extension/content/subscription_manager.js` | WebSocket handling |
| **UI Logic** | `poe2-trade-extension/content/sidebar.js` | Sidebar interaction (inferred) |

## CONVENTIONS
- **No Build Step**: Edit files directly. No `npm`, `webpack`, or `typescript`.
- **Global Scope**: Classes often attached to `window` (e.g., `window.subscriptionManager`).
- **Language**: Code comments and UI strings are primarily in **Chinese**.
- **DOM Interaction**: Heavily relies on `querySelector` and specific class names (fragile to site updates).

## COMMANDS
```bash
# Packaging (Manual)
cd poe2-trade-extension && zip -r ../extension.zip ./*

# CI/CD
# Push tag 'v*' -> Releases official zip
# Push to 'main' -> Releases dev zip
```

## NOTES
- **Fragility**: `extractItemData` depends on specific CSS classes (`.row`, `.itemName`, etc.). Verify these if site updates.
- **Storage**: Uses `localStorage` for persisting collections (via `sidebar.js` likely).
