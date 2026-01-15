# COMPONENT KNOWLEDGE BASE

## OVERVIEW
Core extension source. Contains manifest, background workers, and content scripts.

## STRUCTURE
```
poe2-trade-extension/
├── manifest.json         # V3 Config
├── background.js         # Service worker (minimal logic)
└── content/
    ├── content.js        # Main DOM injector & Parser
    ├── content.css       # Styles for Sidebar & Buttons
    ├── sidebar.js        # Sidebar UI Class
    ├── subscription_manager.js # WebSocket client
    └── trade2state.*.json # Localization data
```

## KEY COMPONENTS

### `content.js`
- **Observer**: Monitors `document.body` for new `.row` elements (trade results).
- **Injection**: Adds `.poe2-trade-star-btn` to trade rows.
- **Parsing**: `extractItemData(row)` scrapes item details (sockets, price, mods) from DOM.
- **Mod Parsing**: `extractPrefixesAndSuffixes` parses JSON from `ModsView` (if available) or DOM.

### `subscription_manager.js`
- **Class**: `SubscriptionManager`
- **Role**: Manages WebSockets for live search.
- **Limits**: Max 5 subscriptions by default.
- **Instance**: `window.subscriptionManager`.

### `sidebar.js`
- **Role**: Manages the persistent right-side UI.
- **Storage**: Handles `localStorage` operations for collections.

## DATA FLOW
1. `MutationObserver` detects new trade row.
2. `injectStarButton` adds UI.
3. User clicks Star -> `toggleStar`.
4. `extractItemData` scrapes DOM -> returns JSON object.
5. `sidebar.addToCollection(data)` saves to storage.

## ANTI-PATTERNS
- **Do not assume DOM is static**: Always use Observer.
- **Do not use ES Modules**: Currently using standard script loading (no `<script type="module">` in manifest for content scripts).
