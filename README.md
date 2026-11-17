# Mobile Chrome Browser with Extension Support (Prototype)

A mobile web browser modeled after **Google Chrome for Android** featuring a full **WebExtension engine** that runs Chrome extensions on mobile devices.

## 🚀 Live Server
The application is running locally at:
- **URL:** [http://localhost:8080/](http://localhost:8080/) (or `http://127.0.0.1:8080/`)

---

## 📱 Features

### 1. Google Chrome Mobile UI
- **Omnibox (Address & Search Bar):** Autocomplete, URL validation, secure lock indicator, search queries.
- **Chrome Puzzle Piece (🧩):** Dedicated extensions quick-access button with live active badge count.
- **Tab Manager:** Chrome Android 2-column card grid switcher with live tab previews.
- **Chrome 3-Dots Menu (`⋮`):** New Tab, Incognito, Desktop site toggle, and direct access to `chrome://extensions`.

### 2. Chrome Extension Engine (`chrome.*` API Bridge)
- **Manifest V2 & V3 Support:** Parses `manifest.json`, extracts content scripts, background workers, action popups, and permissions.
- **`chrome.runtime`:** Bidirectional messaging (`sendMessage`, `onMessage`), `getManifest`, `getURL`.
- **`chrome.storage`:** `chrome.storage.local` and `sync` persisted across app sessions via localStorage/IndexedDB.
- **`chrome.tabs`:** Tab queries, content script execution, and style injection.
- **`chrome.action` / `browserAction`:** Dynamic badges (`setBadgeText`), titles, and popup dialog triggers.
- **ZIP & CRX Unpacker:** Upload any `.zip` or `.crx` file to extract and run desktop Chrome extensions on mobile.

### 3. Pre-Loaded Sample Extensions
1. **🌙 Dark Reader Mobile:** Instant OLED dark mode inversion for any web page with customizable contrast and brightness.
2. **🛡️ Ad & Overlay Cleaner:** Removes sticky banners, floating video overlays, and cookie modals, displaying blocked item badges.
3. **🦊 Web3 Mobile Wallet:** Injects `window.ethereum` into web pages to let dApps connect and sign transactions on mobile.
4. **📝 Page Notes & Highlighter:** Saves sticky notes and annotations tied to individual URLs.

---

## 📂 Architecture & Files
- [index.html](file:///data/data/com.termux/files/home/chrome-mobile-extensions/index.html): Main browser shell and Chrome mobile layout
- [test-page.html](file:///data/data/com.termux/files/home/chrome-mobile-extensions/test-page.html): Interactive playground for testing extension injection
- [css/chrome.css](file:///data/data/com.termux/files/home/chrome-mobile-extensions/css/chrome.css): Google Chrome Android Material Design 3 styles
- [js/engine/manifest-parser.js](file:///data/data/com.termux/files/home/chrome-mobile-extensions/js/engine/manifest-parser.js): Manifest V2 & V3 normalizer
- [js/engine/extension-storage.js](file:///data/data/com.termux/files/home/chrome-mobile-extensions/js/engine/extension-storage.js): Asynchronous extension storage emulator
- [js/engine/chrome-runtime.js](file:///data/data/com.termux/files/home/chrome-mobile-extensions/js/engine/chrome-runtime.js): Mock `chrome.*` API factory
- [js/engine/extension-manager.js](file:///data/data/com.termux/files/home/chrome-mobile-extensions/js/engine/extension-manager.js): Registry, ZIP/CRX extractor, background runner
- [js/engine/content-script-injector.js](file:///data/data/com.termux/files/home/chrome-mobile-extensions/js/engine/content-script-injector.js): Content script & stylesheet injector
- [js/sample-extensions-data.js](file:///data/data/com.termux/files/home/chrome-mobile-extensions/js/sample-extensions-data.js): Pre-bundled extensions
- [js/app.js](file:///data/data/com.termux/files/home/chrome-mobile-extensions/js/app.js): Application lifecycle controller
