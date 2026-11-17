/**
 * ExtensionManager: Handles extension installation, virtual filesystem,
 * background workers, and popup management.
 */
class ExtensionManager {
  constructor() {
    this.extensions = new Map();
    this.badges = new Map();
    this.actionTitles = new Map();
    this.backgroundContexts = new Map();
    this.listeners = [];
    this.activeTabGetter = null;
    this.onTabCreateRequested = null;
    this.onExecuteScriptRequested = null;
    this.onInsertCSSRequested = null;
    this.onPopupRequested = null;
    this.onBadgeUpdated = null;
  }

  async init(activeTabGetter) {
    this.activeTabGetter = activeTabGetter;
    this._loadSavedRegistry();
    await this._startActiveBackgrounds();
  }

  _loadSavedRegistry() {
    try {
      const saved = localStorage.getItem('chrome_installed_extensions');
      if (saved) {
        const list = JSON.parse(saved);
        list.forEach(item => {
          this.extensions.set(item.id, item);
        });
      }
    } catch (e) {
      console.error('Failed to load saved extensions:', e);
    }
  }

  _saveRegistry() {
    try {
      const list = Array.from(this.extensions.values()).map(ext => ({
        id: ext.id,
        name: ext.name,
        version: ext.version,
        description: ext.description,
        enabled: ext.enabled,
        manifest: ext.manifest,
        files: ext.files, // virtual files
        installedAt: ext.installedAt
      }));
      localStorage.setItem('chrome_installed_extensions', JSON.stringify(list));
      this._notifyChange();
    } catch (e) {
      console.error('Failed to save extension registry:', e);
    }
  }

  _notifyChange() {
    this.listeners.forEach(fn => fn(this.getAllExtensions()));
  }

  onRegistryChange(fn) {
    this.listeners.push(fn);
  }

  getAllExtensions() {
    return Array.from(this.extensions.values());
  }

  getActiveExtensions() {
    return Array.from(this.extensions.values()).filter(e => e.enabled);
  }

  getExtension(id) {
    return this.extensions.get(id);
  }

  async toggleExtension(id, enabled) {
    const ext = this.extensions.get(id);
    if (!ext) return;
    ext.enabled = enabled;
    this._saveRegistry();

    if (enabled) {
      await this._startBackground(ext);
    } else {
      this._stopBackground(id);
    }
    this._notifyChange();
  }

  async uninstallExtension(id) {
    this._stopBackground(id);
    this.extensions.delete(id);
    this.badges.delete(id);
    this.actionTitles.delete(id);
    // Clear storage
    localStorage.removeItem(`ext_${id}_local`);
    localStorage.removeItem(`ext_${id}_sync`);
    this._saveRegistry();
    this._notifyChange();
  }

  /**
   * Installs an extension from a ZIP / CRX file
   */
  async installFromZip(arrayBuffer, customName = null) {
    if (!window.JSZip) {
      throw new Error('JSZip library is required to unpack extensions');
    }

    // If it's a CRX file, strip the CRX header
    let zipData = arrayBuffer;
    const view = new DataView(arrayBuffer);
    if (view.getUint32(0, true) === 0x34327243) { // "Cr24" magic header
      const version = view.getUint32(4, true);
      let headerSize = 16;
      if (version === 2) {
        const pubKeyLen = view.getUint32(8, true);
        const sigLen = view.getUint32(12, true);
        headerSize = 16 + pubKeyLen + sigLen;
      } else if (version === 3) {
        const headerLen = view.getUint32(8, true);
        headerSize = 12 + headerLen;
      }
      zipData = arrayBuffer.slice(headerSize);
    }

    const zip = await window.JSZip.loadAsync(zipData);
    const files = {};

    for (const [filename, fileEntry] of Object.entries(zip.files)) {
      if (fileEntry.dir) continue;
      // Strip leading directory if wrapped
      const cleanPath = filename.replace(/^[^\/]+\//, (match) => {
        // Only strip if all files are in a root folder
        return match;
      });

      if (filename.match(/\.(png|jpe?g|gif|webp|ico|woff2?|ttf)$/i)) {
        const base64 = await fileEntry.async('base64');
        const ext = filename.split('.').pop().toLowerCase();
        files[filename] = `data:image/${ext};base64,${base64}`;
      } else {
        files[filename] = await fileEntry.async('string');
      }
    }

    // Look for manifest.json
    let manifestContent = files['manifest.json'];
    let basePath = '';
    if (!manifestContent) {
      const manifestKey = Object.keys(files).find(k => k.endsWith('manifest.json'));
      if (manifestKey) {
        manifestContent = files[manifestKey];
        basePath = manifestKey.replace('manifest.json', '');
      }
    }

    if (!manifestContent) {
      throw new Error('No manifest.json found in extension package');
    }

    // Normalize paths if nested
    const cleanFiles = {};
    for (const [k, v] of Object.entries(files)) {
      const cleanKey = basePath ? k.replace(basePath, '') : k;
      cleanFiles[cleanKey] = v;
    }

    const parsedManifest = ManifestParser.parse(manifestContent);
    const id = this._generateId(parsedManifest.name);

    const extension = {
      id,
      name: customName || parsedManifest.name,
      version: parsedManifest.version,
      description: parsedManifest.description,
      enabled: true,
      manifest: parsedManifest,
      files: cleanFiles,
      installedAt: Date.now(),
      getFileUrl: (path) => {
        const clean = path.replace(/^\//, '');
        if (cleanFiles[clean]) return cleanFiles[clean];
        return '';
      }
    };

    this.extensions.set(id, extension);
    this._saveRegistry();
    await this._startBackground(extension);
    this._notifyChange();
    return extension;
  }

  /**
   * Installs directly from an in-memory object (used for sample extensions)
   */
  async installFromObject(obj) {
    const parsedManifest = ManifestParser.parse(obj.manifest);
    const id = obj.id || this._generateId(parsedManifest.name);

    const extension = {
      id,
      name: parsedManifest.name,
      version: parsedManifest.version,
      description: parsedManifest.description,
      enabled: true,
      manifest: parsedManifest,
      files: obj.files || {},
      installedAt: Date.now(),
      getFileUrl: (path) => {
        const clean = path.replace(/^\//, '');
        if (obj.files && obj.files[clean]) return obj.files[clean];
        return '';
      }
    };

    this.extensions.set(id, extension);
    this._saveRegistry();
    await this._startBackground(extension);
    this._notifyChange();
    return extension;
  }

  _generateId(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
    const rand = Math.random().toString(36).substring(2, 10);
    return `${slug || 'ext'}_${rand}`;
  }

  async _startActiveBackgrounds() {
    for (const ext of this.extensions.values()) {
      if (ext.enabled) {
        await this._startBackground(ext);
      }
    }
  }

  async _startBackground(ext) {
    this._stopBackground(ext.id);

    const scripts = ext.manifest.backgroundScripts;
    if (!scripts || scripts.length === 0) return;

    // Build virtual background sandbox
    let combinedScript = '';
    scripts.forEach(scriptPath => {
      const clean = scriptPath.replace(/^\//, '');
      const code = ext.files[clean] || ext.files[scriptPath];
      if (code) {
        combinedScript += `\n/* Script: ${scriptPath} */\n` + code;
      }
    });

    if (!combinedScript) return;

    try {
      // Create isolated sandbox function with mock chrome API
      const chromeApi = ChromeApiFactory.create(ext.id, this, false, this.activeTabGetter);
      const runner = new Function('chrome', 'browser', 'console', `
        try {
          ${combinedScript}
        } catch(err) {
          console.error("Extension [${ext.name}] background error:", err);
        }
      `);
      runner(chromeApi, chromeApi, console);
      this.backgroundContexts.set(ext.id, { active: true });
    } catch (e) {
      console.error(`Failed to execute background worker for ${ext.name}:`, e);
    }
  }

  _stopBackground(id) {
    if (this.backgroundContexts.has(id)) {
      this.backgroundContexts.delete(id);
    }
  }

  updateBadge(id, { text, color }) {
    if (!this.badges.has(id)) this.badges.set(id, {});
    const badge = this.badges.get(id);
    if (text !== undefined) badge.text = text;
    if (color !== undefined) badge.color = color;
    if (this.onBadgeUpdated) this.onBadgeUpdated(id, badge);
  }

  getBadge(id) {
    return this.badges.get(id) || { text: '', color: '#4285F4' };
  }

  updateActionTitle(id, title) {
    this.actionTitles.set(id, title);
  }

  updateActionIcon(id, details) {
    // optional icon update
  }

  openPopup(id) {
    const ext = this.extensions.get(id);
    if (!ext) return;

    const popupPath = ext.manifest.action.popup;
    if (!popupPath) return;

    const clean = popupPath.replace(/^\//, '');
    let popupHtml = ext.files[clean] || ext.files[popupPath];

    if (!popupHtml) {
      console.warn(`Popup file not found: ${popupPath}`);
      return;
    }

    if (this.onPopupRequested) {
      this.onPopupRequested(ext, popupHtml);
    }
  }
}

window.ExtensionManager = ExtensionManager;
