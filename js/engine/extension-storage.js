/**
 * ExtensionStorage: Emulates chrome.storage.local / sync using browser storage
 */
class ExtensionStorageArea {
  constructor(extensionId, areaName = 'local') {
    this.extensionId = extensionId;
    this.areaName = areaName;
    this.storageKey = `ext_${extensionId}_${areaName}`;
    this.listeners = [];
  }

  _read() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Storage read error:', e);
      return {};
    }
  }

  _write(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  get(keys, callback) {
    return new Promise((resolve) => {
      const all = this._read();
      let result = {};

      if (keys === null || keys === undefined) {
        result = { ...all };
      } else if (typeof keys === 'string') {
        result[keys] = all[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach(k => {
          if (all.hasOwnProperty(k)) result[k] = all[k];
        });
      } else if (typeof keys === 'object') {
        // Defaults object { key: defaultVal }
        Object.keys(keys).forEach(k => {
          result[k] = all.hasOwnProperty(k) ? all[k] : keys[k];
        });
      }

      if (typeof callback === 'function') {
        callback(result);
      }
      resolve(result);
    });
  }

  set(items, callback) {
    return new Promise((resolve) => {
      const all = this._read();
      const changes = {};

      for (const [key, val] of Object.entries(items)) {
        changes[key] = {
          oldValue: all[key],
          newValue: val
        };
        all[key] = val;
      }

      this._write(all);
      this._notifyListeners(changes);

      if (typeof callback === 'function') {
        callback();
      }
      resolve();
    });
  }

  remove(keys, callback) {
    return new Promise((resolve) => {
      const all = this._read();
      const keyList = Array.isArray(keys) ? keys : [keys];
      const changes = {};

      keyList.forEach(k => {
        if (all.hasOwnProperty(k)) {
          changes[k] = { oldValue: all[k], newValue: undefined };
          delete all[k];
        }
      });

      this._write(all);
      this._notifyListeners(changes);

      if (typeof callback === 'function') {
        callback();
      }
      resolve();
    });
  }

  clear(callback) {
    return new Promise((resolve) => {
      this._write({});
      if (typeof callback === 'function') {
        callback();
      }
      resolve();
    });
  }

  _notifyListeners(changes) {
    window.dispatchEvent(new CustomEvent('chrome-storage-changed', {
      detail: { extensionId: this.extensionId, area: this.areaName, changes }
    }));
  }
}

window.ExtensionStorageArea = ExtensionStorageArea;
