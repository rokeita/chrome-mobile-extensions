/**
 * Chrome Mobile Application Controller
 */
(function() {
  'use strict';

  // State
  let tabs = [
    {
      id: 1,
      title: 'Extensions Playground',
      url: 'test-page.html',
      isHome: false
    }
  ];
  let activeTabId = 1;
  let isDesktopMode = false;

  // Engine Instances
  const extensionManager = new ExtensionManager();
  const contentScriptInjector = new ContentScriptInjector(extensionManager);

  // DOM Elements
  const omniboxInput = document.getElementById('omniboxInput');
  const reloadBtn = document.getElementById('reloadBtn');
  const homeBtn = document.getElementById('homeBtn');
  const extensionsBtn = document.getElementById('extensionsBtn');
  const activeExtBadge = document.getElementById('activeExtBadge');
  const tabsBtn = document.getElementById('tabsBtn');
  const tabCounter = document.getElementById('tabCounter');
  const menuBtn = document.getElementById('menuBtn');
  const menuOverlay = document.getElementById('menuOverlay');
  const pageProgress = document.getElementById('pageProgress');
  const browserFrame = document.getElementById('browserFrame');
  const homeView = document.getElementById('homeView');
  const homeSearchPill = document.getElementById('homeSearchPill');

  // Sheets & Modals
  const extensionsSheet = document.getElementById('extensionsSheet');
  const closeExtSheetBtn = document.getElementById('closeExtSheetBtn');
  const quickExtensionsList = document.getElementById('quickExtensionsList');
  const manageExtensionsBtn = document.getElementById('manageExtensionsBtn');
  const uploadZipQuickBtn = document.getElementById('uploadZipQuickBtn');

  const extensionPopupSheet = document.getElementById('extensionPopupSheet');
  const closePopupSheetBtn = document.getElementById('closePopupSheetBtn');
  const popupHeaderTitle = document.getElementById('popupHeaderTitle');
  const popupExtIcon = document.getElementById('popupExtIcon');
  const popupExtName = document.getElementById('popupExtName');
  const extensionPopupFrame = document.getElementById('extensionPopupFrame');

  const extensionManagerModal = document.getElementById('extensionManagerModal');
  const closeManagerModalBtn = document.getElementById('closeManagerModalBtn');
  const installedExtensionsList = document.getElementById('installedExtensionsList');
  const loadUnpackedBtn = document.getElementById('loadUnpackedBtn');
  const extFileInput = document.getElementById('extFileInput');
  const installSamplePackBtn = document.getElementById('installSamplePackBtn');

  const tabGridOverlay = document.getElementById('tabGridOverlay');
  const tabGridContainer = document.getElementById('tabGridContainer');
  const newTabFromGridBtn = document.getElementById('newTabFromGridBtn');
  const closeGridBtn = document.getElementById('closeGridBtn');

  // Menu items
  const menuNewTab = document.getElementById('menuNewTab');
  const menuIncognito = document.getElementById('menuIncognito');
  const menuExtensions = document.getElementById('menuExtensions');
  const menuDesktopSite = document.getElementById('menuDesktopSite');
  const desktopModeCheckbox = document.getElementById('desktopModeCheckbox');

  // Banner buttons
  const openExtManagerBannerBtn = document.getElementById('openExtManagerBannerBtn');
  const installSampleExtBtn = document.getElementById('installSampleExtBtn');
  const extStoreShortcut = document.getElementById('extStoreShortcut');

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  async function init() {
    setupEventListeners();

    // Setup extension callbacks
    extensionManager.onPopupRequested = (ext, popupHtml) => {
      openExtensionPopup(ext, popupHtml);
    };

    extensionManager.onBadgeUpdated = (id, badge) => {
      updateExtensionBadgeDisplay();
    };

    extensionManager.onTabCreateRequested = (createProps) => {
      return createNewTab(createProps.url || '');
    };

    extensionManager.onExecuteScriptRequested = (tabId, details, cb) => {
      try {
        const frameWin = browserFrame.contentWindow;
        if (details.code) {
          const res = frameWin.eval(details.code);
          if (cb) cb([res]);
        }
      } catch (e) {
        console.error('ExecuteScript error:', e);
        if (cb) cb([]);
      }
    };

    extensionManager.onInsertCSSRequested = (tabId, details, cb) => {
      try {
        const frameDoc = browserFrame.contentDocument || browserFrame.contentWindow.document;
        if (details.code) {
          contentScriptInjector.insertCssInTarget(frameDoc, details.code);
        }
        if (cb) cb();
      } catch (e) {
        console.error('InsertCSS error:', e);
        if (cb) cb();
      }
    };

    // Initialize extension manager
    await extensionManager.init(() => getActiveTab());

    // Auto-install sample extensions if first launch
    if (extensionManager.getAllExtensions().length === 0 && window.SAMPLE_EXTENSIONS) {
      for (const sample of window.SAMPLE_EXTENSIONS) {
        await extensionManager.installFromObject(sample);
      }
    }

    // Subscribe to registry changes
    extensionManager.onRegistryChange(() => {
      renderQuickExtensionsList();
      renderInstalledExtensionsList();
      updateExtensionBadgeDisplay();
    });

    renderQuickExtensionsList();
    renderInstalledExtensionsList();
    updateExtensionBadgeDisplay();

    // Load initial tab
    loadTab(activeTabId);
  }

  // -------------------------------------------------------------
  // Tab Management
  // -------------------------------------------------------------
  function getActiveTab() {
    return tabs.find(t => t.id === activeTabId) || tabs[0];
  }

  function createNewTab(url = '') {
    const newId = Date.now();
    const isHome = !url;
    const newTab = {
      id: newId,
      title: isHome ? 'New Tab' : 'Loading...',
      url: url || 'home',
      isHome: isHome
    };
    tabs.push(newTab);
    switchTab(newId);
    updateTabCounter();
    return newTab;
  }

  function switchTab(id) {
    activeTabId = id;
    loadTab(id);
    updateTabCounter();
    closeTabGrid();
  }

  function closeTab(id, e) {
    if (e) e.stopPropagation();
    if (tabs.length === 1) {
      // Don't close last tab, reset to home
      tabs[0].url = 'home';
      tabs[0].title = 'New Tab';
      tabs[0].isHome = true;
      loadTab(tabs[0].id);
      renderTabGrid();
      return;
    }

    const idx = tabs.findIndex(t => t.id === id);
    if (idx !== -1) {
      tabs.splice(idx, 1);
      if (activeTabId === id) {
        const nextTab = tabs[Math.max(0, idx - 1)];
        activeTabId = nextTab.id;
      }
      loadTab(activeTabId);
      updateTabCounter();
      renderTabGrid();
    }
  }

  function updateTabCounter() {
    tabCounter.textContent = tabs.length;
  }

  function loadTab(id) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;

    if (tab.isHome || !tab.url || tab.url === 'home') {
      homeView.style.display = 'flex';
      browserFrame.style.display = 'none';
      omniboxInput.value = '';
      omniboxInput.placeholder = 'Search or type URL';
    } else {
      homeView.style.display = 'none';
      browserFrame.style.display = 'block';
      omniboxInput.value = tab.url;

      startProgressBar();
      browserFrame.src = tab.url;
    }
  }

  // -------------------------------------------------------------
  // Omnibox & Navigation
  // -------------------------------------------------------------
  function navigate(input) {
    let url = input.trim();
    if (!url) return;

    // Check if it's chrome://extensions
    if (url === 'chrome://extensions' || url === 'chrome:extensions') {
      openExtensionManager();
      return;
    }

    // Format URL
    if (url.startsWith('http://') || url.startsWith('https://') || url.endsWith('.html')) {
      // valid url / path
    } else if (url.includes('.') && !url.includes(' ')) {
      url = 'https://' + url;
    } else {
      // Search query
      url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }

    const tab = getActiveTab();
    tab.url = url;
    tab.isHome = false;
    tab.title = url;
    loadTab(tab.id);
  }

  function startProgressBar() {
    pageProgress.style.transition = 'none';
    pageProgress.style.width = '15%';
    setTimeout(() => {
      pageProgress.style.transition = 'width 0.4s ease';
      pageProgress.style.width = '70%';
    }, 50);
  }

  function completeProgressBar() {
    pageProgress.style.width = '100%';
    setTimeout(() => {
      pageProgress.style.width = '0%';
    }, 300);
  }

  // -------------------------------------------------------------
  // Content Script Injection into Active Frame
  // -------------------------------------------------------------
  browserFrame.addEventListener('load', () => {
    completeProgressBar();
    try {
      const frameDoc = browserFrame.contentDocument || browserFrame.contentWindow.document;
      const frameWin = browserFrame.contentWindow;
      const currentUrl = browserFrame.src;

      const activeTab = getActiveTab();
      if (frameDoc.title) {
        activeTab.title = frameDoc.title;
      }

      // Inject active extensions content scripts!
      contentScriptInjector.injectIntoTarget(frameWin, frameDoc, currentUrl);
    } catch (e) {
      // Cross-origin restriction on external site iframes
      console.warn('Sandbox origin restriction on external site:', e);
    }
  });

  // -------------------------------------------------------------
  // Extension UI & Popups
  // -------------------------------------------------------------
  function updateExtensionBadgeDisplay() {
    const active = extensionManager.getActiveExtensions();
    if (active.length > 0) {
      activeExtBadge.textContent = active.length;
      activeExtBadge.style.display = 'flex';
    } else {
      activeExtBadge.style.display = 'none';
    }
  }

  function renderQuickExtensionsList() {
    quickExtensionsList.innerHTML = '';
    const active = extensionManager.getActiveExtensions();

    if (active.length === 0) {
      quickExtensionsList.innerHTML = `
        <div style="text-align: center; padding: 24px 0; color: var(--chrome-text-secondary);">
          <div style="font-size: 32px; margin-bottom: 8px;">🧩</div>
          <div>No active extensions. Tap "Manage Extensions" to enable or install some!</div>
        </div>
      `;
      return;
    }

    active.forEach(ext => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; background:var(--chrome-surface); border-radius:12px; margin-bottom:8px; cursor:pointer;';
      
      const iconUrl = ext.manifest.iconUrl ? ext.getFileUrl(ext.manifest.iconUrl) : '';
      const iconEl = iconUrl ? `<img src="${iconUrl}" style="width:24px; height:24px; border-radius:4px;">` : '🧩';

      const badge = extensionManager.getBadge(ext.id);
      const badgeHtml = badge && badge.text ? `<span style="background:${badge.color || '#ef4444'}; color:white; font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px;">${badge.text}</span>` : '';

      row.innerHTML = `
        <div style="width: 28px; height: 28px; display:flex; align-items:center; justify-content:center;">${iconEl}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; display:flex; align-items:center; gap:6px;">
            ${ext.name}
            ${badgeHtml}
          </div>
          <div style="font-size: 12px; color: var(--chrome-text-secondary);">${ext.description.slice(0, 48)}...</div>
        </div>
        <div style="color: var(--chrome-primary); font-size: 14px; font-weight: 500;">Open ▸</div>
      `;

      row.addEventListener('click', () => {
        closeQuickExtensionsSheet();
        extensionManager.openPopup(ext.id);
      });

      quickExtensionsList.appendChild(row);
    });
  }

  function renderInstalledExtensionsList() {
    installedExtensionsList.innerHTML = '';
    const all = extensionManager.getAllExtensions();

    if (all.length === 0) {
      installedExtensionsList.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:var(--chrome-text-secondary);">
          <div style="font-size:36px; margin-bottom:10px;">📦</div>
          <div style="font-size:15px; font-weight:600;">No extensions installed</div>
          <div style="font-size:13px; margin-top:4px;">Load a .zip / .crx file or install sample extensions.</div>
        </div>
      `;
      return;
    }

    all.forEach(ext => {
      const card = document.createElement('div');
      card.className = 'extension-item-card';

      const iconUrl = ext.manifest.iconUrl ? ext.getFileUrl(ext.manifest.iconUrl) : '';
      const iconEl = iconUrl ? `<img src="${iconUrl}">` : '🧩';

      card.innerHTML = `
        <div class="extension-item-header">
          <div class="extension-item-icon">${iconEl}</div>
          <div class="extension-item-info">
            <div class="extension-item-name">${ext.name}</div>
            <div class="extension-item-version">Version ${ext.version} | ID: ${ext.id.slice(0, 10)}...</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${ext.enabled ? 'checked' : ''} class="toggle-ext-checkbox" data-id="${ext.id}">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="extension-item-desc">${ext.description}</div>
        <div class="extension-actions-row">
          <button class="banner-btn" style="background:transparent; color:var(--chrome-primary); border:none; padding:4px 0; font-size:13px;" data-open-popup="${ext.id}">
            ▶ Open Popup
          </button>
          <button class="banner-btn" style="background:transparent; color:var(--chrome-danger); border:none; padding:4px 0; font-size:13px;" data-uninstall="${ext.id}">
            🗑 Remove
          </button>
        </div>
      `;

      // Toggle switch
      card.querySelector('.toggle-ext-checkbox').addEventListener('change', (e) => {
        extensionManager.toggleExtension(ext.id, e.target.checked);
      });

      // Open popup
      card.querySelector('[data-open-popup]').addEventListener('click', () => {
        closeExtensionManager();
        extensionManager.openPopup(ext.id);
      });

      // Uninstall
      card.querySelector('[data-uninstall]').addEventListener('click', () => {
        if (confirm(`Remove extension "${ext.name}"?`)) {
          extensionManager.uninstallExtension(ext.id);
        }
      });

      installedExtensionsList.appendChild(card);
    });
  }

  function openExtensionPopup(ext, popupHtml) {
    popupExtName.textContent = ext.name;
    const iconUrl = ext.manifest.iconUrl ? ext.getFileUrl(ext.manifest.iconUrl) : '';
    popupExtIcon.innerHTML = iconUrl ? `<img src="${iconUrl}" style="width:20px; height:20px; vertical-align:middle; margin-right:6px;">` : '🧩 ';

    // Open sheet
    extensionPopupSheet.classList.add('active');

    // Write popup document into isolated iframe
    const doc = extensionPopupFrame.contentDocument || extensionPopupFrame.contentWindow.document;
    doc.open();
    doc.write(popupHtml);
    doc.close();

    // Inject chrome API polyfill into popup context!
    const frameWin = extensionPopupFrame.contentWindow;
    const chromeApi = ChromeApiFactory.create(ext.id, extensionManager, false, () => getActiveTab());
    frameWin.chrome = chromeApi;
    frameWin.browser = chromeApi;
  }

  function closeExtensionPopup() {
    extensionPopupSheet.classList.remove('active');
  }

  function openQuickExtensionsSheet() {
    renderQuickExtensionsList();
    extensionsSheet.classList.add('active');
  }

  function closeQuickExtensionsSheet() {
    extensionsSheet.classList.remove('active');
  }

  function openExtensionManager() {
    closeMenu();
    closeQuickExtensionsSheet();
    renderInstalledExtensionsList();
    extensionManagerModal.classList.add('active');
  }

  function closeExtensionManager() {
    extensionManagerModal.classList.remove('active');
  }

  // -------------------------------------------------------------
  // Tab Grid Switcher Overlay
  // -------------------------------------------------------------
  function openTabGrid() {
    renderTabGrid();
    tabGridOverlay.classList.add('active');
  }

  function closeTabGrid() {
    tabGridOverlay.classList.remove('active');
  }

  function renderTabGrid() {
    tabGridContainer.innerHTML = '';
    tabs.forEach(tab => {
      const card = document.createElement('div');
      card.className = `tab-card ${tab.id === activeTabId ? 'active-tab' : ''}`;

      card.innerHTML = `
        <div class="tab-card-header">
          <div class="tab-card-title">${tab.title}</div>
          <button class="tab-card-close" data-close-tab="${tab.id}">✕</button>
        </div>
        <div class="tab-card-preview">
          ${tab.isHome ? '🌐' : '📄'}
        </div>
      `;

      card.addEventListener('click', () => {
        switchTab(tab.id);
      });

      card.querySelector('[data-close-tab]').addEventListener('click', (e) => {
        closeTab(tab.id, e);
      });

      tabGridContainer.appendChild(card);
    });
  }

  // -------------------------------------------------------------
  // Chrome Menu
  // -------------------------------------------------------------
  function toggleMenu() {
    menuOverlay.style.display = menuOverlay.style.display === 'block' ? 'none' : 'block';
  }

  function closeMenu() {
    menuOverlay.style.display = 'none';
  }

  // -------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------
  function setupEventListeners() {
    // Omnibox
    omniboxInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        navigate(omniboxInput.value);
        omniboxInput.blur();
      }
    });

    reloadBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      if (!tab.isHome) {
        startProgressBar();
        browserFrame.src = tab.url;
      }
    });

    homeBtn.addEventListener('click', () => {
      const tab = getActiveTab();
      tab.isHome = true;
      tab.url = 'home';
      tab.title = 'New Tab';
      loadTab(tab.id);
    });

    homeSearchPill.addEventListener('click', () => {
      omniboxInput.focus();
    });

    // Shortcuts
    document.querySelectorAll('.shortcut-item[data-url]').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        navigate(url);
      });
    });

    extStoreShortcut.addEventListener('click', () => {
      openExtensionManager();
    });

    // Extensions buttons
    extensionsBtn.addEventListener('click', openQuickExtensionsSheet);
    closeExtSheetBtn.addEventListener('click', closeQuickExtensionsSheet);
    manageExtensionsBtn.addEventListener('click', openExtensionManager);
    uploadZipQuickBtn.addEventListener('click', () => extFileInput.click());

    closePopupSheetBtn.addEventListener('click', closeExtensionPopup);

    openExtManagerBannerBtn.addEventListener('click', openExtensionManager);
    installSampleExtBtn.addEventListener('click', async () => {
      if (window.SAMPLE_EXTENSIONS) {
        for (const sample of window.SAMPLE_EXTENSIONS) {
          await extensionManager.installFromObject(sample);
        }
        alert('All sample extensions installed successfully!');
      }
    });

    installSamplePackBtn.addEventListener('click', async () => {
      if (window.SAMPLE_EXTENSIONS) {
        for (const sample of window.SAMPLE_EXTENSIONS) {
          await extensionManager.installFromObject(sample);
        }
        alert('All sample extensions re-installed!');
      }
    });

    closeManagerModalBtn.addEventListener('click', closeExtensionManager);

    // Unpack ZIP / CRX
    loadUnpackedBtn.addEventListener('click', () => {
      extFileInput.click();
    });

    extFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        await extensionManager.installFromZip(arrayBuffer, file.name.replace(/\.(zip|crx)$/i, ''));
        alert(`Successfully installed extension from "${file.name}"!`);
        extFileInput.value = '';
      } catch (err) {
        alert(`Error installing extension: ${err.message}`);
        console.error(err);
      }
    });

    // Tabs
    tabsBtn.addEventListener('click', openTabGrid);
    closeGridBtn.addEventListener('click', closeTabGrid);
    newTabFromGridBtn.addEventListener('click', () => {
      createNewTab();
    });

    // Menu
    menuBtn.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) closeMenu();
    });

    menuNewTab.addEventListener('click', () => {
      closeMenu();
      createNewTab();
    });

    menuIncognito.addEventListener('click', () => {
      closeMenu();
      createNewTab();
      document.body.setAttribute('data-theme', 'dark');
    });

    menuExtensions.addEventListener('click', () => {
      openExtensionManager();
    });

    menuDesktopSite.addEventListener('click', () => {
      isDesktopMode = !isDesktopMode;
      desktopModeCheckbox.checked = isDesktopMode;
      browserFrame.style.width = isDesktopMode ? '1280px' : '100%';
      browserFrame.style.transform = isDesktopMode ? 'scale(0.3)' : 'none';
      browserFrame.style.transformOrigin = 'top left';
      closeMenu();
    });

    // Backdrop dismissal
    extensionsSheet.addEventListener('click', (e) => {
      if (e.target === extensionsSheet) closeQuickExtensionsSheet();
    });
    extensionPopupSheet.addEventListener('click', (e) => {
      if (e.target === extensionPopupSheet) closeExtensionPopup();
    });
    extensionManagerModal.addEventListener('click', (e) => {
      if (e.target === extensionManagerModal) closeExtensionManager();
    });
  }

  // Start app on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
