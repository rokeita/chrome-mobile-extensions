/**
 * ContentScriptInjector: Injects content scripts and styles into target page contexts
 */
class ContentScriptInjector {
  constructor(extensionManager) {
    this.extensionManager = extensionManager;
  }

  /**
   * Evaluates and injects all matching content scripts into the target document / iframe window
   */
  injectIntoTarget(targetWindow, targetDocument, currentUrl, runAtStage = 'document_idle') {
    if (!targetWindow || !targetDocument) return;

    const activeExtensions = this.extensionManager.getActiveExtensions();

    activeExtensions.forEach(ext => {
      ext.manifest.contentScripts.forEach((cs, csIndex) => {
        // Check stage if needed (or run document_start / document_end)
        const matches = cs.matches.some(pattern => ManifestParser.matchesUrl(pattern, currentUrl));
        const excluded = cs.excludeMatches.some(pattern => ManifestParser.matchesUrl(pattern, currentUrl));

        if (matches && !excluded) {
          this._injectContentScript(ext, cs, csIndex, targetWindow, targetDocument);
        }
      });
    });
  }

  _injectContentScript(ext, cs, csIndex, targetWindow, targetDocument) {
    // 1. Inject CSS
    if (Array.isArray(cs.css)) {
      cs.css.forEach(cssPath => {
        const clean = cssPath.replace(/^\//, '');
        const cssContent = ext.files[clean] || ext.files[cssPath];
        if (cssContent) {
          const styleEl = targetDocument.createElement('style');
          styleEl.setAttribute('data-extension-id', ext.id);
          styleEl.setAttribute('data-extension-src', cssPath);
          styleEl.textContent = cssContent;
          (targetDocument.head || targetDocument.documentElement).appendChild(styleEl);
        }
      });
    }

    // 2. Inject JS Scripts
    if (Array.isArray(cs.js)) {
      cs.js.forEach(jsPath => {
        const clean = jsPath.replace(/^\//, '');
        const jsContent = ext.files[clean] || ext.files[jsPath];
        if (jsContent) {
          try {
            // Provide chrome API in the context
            const chromeApi = ChromeApiFactory.create(ext.id, this.extensionManager, true, () => ({
              id: 1,
              url: currentUrl,
              title: targetDocument.title
            }));

            // Execute script within target window context
            const execFunction = new targetWindow.Function(
              'chrome',
              'browser',
              `/* Extension: ${ext.name} - ${jsPath} */\n` + jsContent
            );
            execFunction(chromeApi, chromeApi);
          } catch (err) {
            console.error(`Error running content script [${ext.name} - ${jsPath}]:`, err);
          }
        }
      });
    }
  }

  /**
   * Helper to execute ad-hoc JavaScript in the active target page
   */
  executeCodeInTarget(targetWindow, code) {
    try {
      return targetWindow.eval(code);
    } catch (e) {
      console.error('executeCodeInTarget error:', e);
      return null;
    }
  }

  /**
   * Helper to insert ad-hoc CSS in the active target page
   */
  insertCssInTarget(targetDocument, cssCode) {
    try {
      const styleEl = targetDocument.createElement('style');
      styleEl.textContent = cssCode;
      (targetDocument.head || targetDocument.documentElement).appendChild(styleEl);
    } catch (e) {
      console.error('insertCssInTarget error:', e);
    }
  }
}

window.ContentScriptInjector = ContentScriptInjector;
