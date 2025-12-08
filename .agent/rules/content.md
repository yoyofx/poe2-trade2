---
trigger: always_on
---

# Project: PoE 2 Trade Helper (流放2网购助手)

## Overview
A Chrome extension designed to enhance the Path of Exile 2 trade site experience. It provides a sidebar interface for collecting items, saving searches, and facilitating trade interactions.

## Core Features
1.  **Sidebar UI**:
    -   Collapsible sidebar on the right side of the page.
    -   Tabbed interface: "Collections" and "Searches".
    -   Tree-based organization (Folders/Items) for both collections and searches.
2.  **Item Collection**:
    -   Injects a star button (☆/★) into trade result rows.
    -   Extracts detailed item data (Name, Type, Price, Seller, Whisper, Affixes).
    -   Preserves item name styling (colors) in the sidebar.
    -   Supports "Copy Whisper" and "Copy Hideout Command" actions directly from the sidebar.
3.  **Search Saving**:
    -   Allows saving the current search URL with a custom name.
    -   Quick navigation to saved searches.
4.  **Data Persistence**:
    -   Uses `chrome.storage.local` to save collections and searches.

## Architecture & File Structure

### Root Directory
-   `README.md`: Project goals and feature list.

### Extension Directory (`poe2-trade-extension/`)
-   `manifest.json`: Extension configuration (Manifest V3).

#### Content Scripts (`content/`)
-   **`content.js`**:
    -   **Entry Point**: Initializes the sidebar and mutation observer.
    -   **Observer**: Watches for new trade results to inject star buttons.
    -   **Data Extraction**: `extractItemData(row)` parses the DOM to get item details.
        -   *Key Logic*: Uses `window.getComputedStyle` for name colors, `parseAffix` for explicit mods.
-   **`sidebar.js`**:
    -   **`Sidebar` Class**: Manages the sidebar DOM, state (visible/collapsed), and tabs.
    -   **`TreeView` Class**: Generic tree component for rendering folders and items. Handles CRUD operations and rendering.
-   **`content.css`**:
    -   Styles for the sidebar, tree view, and injected buttons.

## Data Models

### Item Data
```javascript
{
    name: string,          // Full item name
    nameCss: string,       // CSS string for name color (e.g., "color: rgb(...)")
    price: string,         // Price text
    playerName: string,    // Seller name
    whisperMessage: string,// Whisper text
    fullText: string,      // Fallback full text
    affixes: [             // Array of parsed affixes
        {
            isPrefix: boolean,
            tier: number,
            content: string,
            affixChildren: [{ isPrefix, tier }] // For hybrid mods
        }
    ],
    timestamp: number
}
```

## Development Guidelines
-   **Tech Stack**: Vanilla JavaScript, HTML, CSS. No build step required.
-   **Styling**: Pure CSS.
-   **Testing**: Manual verification on the PoE 2 Trade site (requires login).
-   **Extension Loading**: Load the `poe2-trade-extension` folder as an unpacked extension in Chrome Developer Mode.
