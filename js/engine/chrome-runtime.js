/**
 * ChromeRuntime: Injects and mocks standard chrome.* APIs for extensions
 */
class ChromeApiFactory {
  static create(extensionId, extensionManager, isContentScript = false, activeTabGetter = null) {
    const ext = extensionManager.getExtension(extensionId);
    const storageLocal = new ExtensionStorageArea(extensionId, 'local');
    const storageSync = new ExtensionStorageArea(extensionId, 'sync');

    const messageListeners = [];
    const storageListeners = [];

    window.addEventListener('chrome-storage-changed', (event) => {
      if (event.detail.extensionId === extensionId) {
        storageListeners.forEach(listener => {
          try {
            listener(event.detail.changes, event.detail.area);
          } catch (e) {
            console.error('Storage listener error:', e);
          }
        });
      }
    });

    // Message hub listener
    window.addEventListener(`chrome-msg-${extensionId}`, (event) => {
      const { message, sender, replyChannel } = event.detail;
      messageListeners.forEach(listener => {
        try {
          const sendResponse = (response) => {
            if (replyChannel) {
              window.dispatchEvent(new CustomEvent(replyChannel, { detail: response }));
            }
          };
          const isAsync = listener(message, sender, sendResponse);
          // If listener returns false or not true, synchronous reply might have already happened
        } catch (e) {
          console.error(`Message listener error in [${extensionId}]:`, e);
        }
      });
    });

    const chromeObj = {
      runtime: {
        id: extensionId,
        lastError: null,
        getManifest: () => ext ? ext.manifest.raw : {},
        getURL: (path) => {
          if (!ext) return path;
          return ext.getFileUrl ? ext.getFileUrl(path) : path;
        },
        sendMessage: (message, responseCallback) => {
          return new Promise((resolve) => {
            const replyChannel = `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const handleReply = (event) => {
              window.removeEventListener(replyChannel, handleReply);
              if (typeof responseCallback === 'function') {
                responseCallback(event.detail);
              }
              resolve(event.detail);
            };

            window.addEventListener(replyChannel, handleReply);

            // Broadcast message to this extension's background and content scripts
            window.dispatchEvent(new CustomEvent(`chrome-msg-${extensionId}`, {
              detail: {
                message,
                sender: { id: extensionId, isContentScript },
                replyChannel
              }
            }));

            // Timeout fallback
            setTimeout(() => {
              window.removeEventListener(replyChannel, handleReply);
              resolve(null);
            }, 3000);
          });
        },
        onMessage: {
          addListener: (fn) => {
            if (typeof fn === 'function' && !messageListeners.includes(fn)) {
              messageListeners.push(fn);
            }
          },
          removeListener: (fn) => {
            const idx = messageListeners.indexOf(fn);
            if (idx > -1) messageListeners.splice(idx, 1);
          },
          hasListener: (fn) => messageListeners.includes(fn)
        }
      },

      storage: {
        local: storageLocal,
        sync: storageSync,
        onChanged: {
          addListener: (fn) => {
            if (typeof fn === 'function' && !storageListeners.includes(fn)) {
              storageListeners.push(fn);
            }
          },
          removeListener: (fn) => {
            const idx = storageListeners.indexOf(fn);
            if (idx > -1) storageListeners.splice(idx, 1);
          }
        }
      },

      tabs: {
        query: (queryInfo, callback) => {
          return new Promise((resolve) => {
            const activeTab = activeTabGetter ? activeTabGetter() : { id: 1, url: 'https://example.com', title: 'Home' };
            const result = [activeTab];
            if (typeof callback === 'function') callback(result);
            resolve(result);
          });
        },
        sendMessage: (tabId, message, callback) => {
          return chromeObj.runtime.sendMessage(message, callback);
        },
        create: (createProps, callback) => {
          return new Promise((resolve) => {
            if (extensionManager.onTabCreateRequested) {
              const tab = extensionManager.onTabCreateRequested(createProps);
              if (typeof callback === 'function') callback(tab);
              resolve(tab);
            }
          });
        },
        executeScript: (tabId, details, callback) => {
          return new Promise((resolve) => {
            if (extensionManager.onExecuteScriptRequested) {
              extensionManager.onExecuteScriptRequested(tabId, details, (res) => {
                if (typeof callback === 'function') callback(res);
                resolve(res);
              });
            } else {
              if (typeof callback === 'function') callback([]);
              resolve([]);
            }
          });
        },
        insertCSS: (tabId, details, callback) => {
          return new Promise((resolve) => {
            if (extensionManager.onInsertCSSRequested) {
              extensionManager.onInsertCSSRequested(tabId, details, () => {
                if (typeof callback === 'function') callback();
                resolve();
              });
            } else {
              if (typeof callback === 'function') callback();
              resolve();
            }
          });
        }
      },

      action: {
        setBadgeText: ({ text }) => {
          extensionManager.updateBadge(extensionId, { text });
        },
        setBadgeBackgroundColor: ({ color }) => {
          extensionManager.updateBadge(extensionId, { color });
        },
        setTitle: ({ title }) => {
          extensionManager.updateActionTitle(extensionId, title);
        },
        setIcon: (details) => {
          extensionManager.updateActionIcon(extensionId, details);
        },
        openPopup: () => {
          extensionManager.openPopup(extensionId);
        }
      }
    };

    // Alias browserAction for Manifest V2 backward compatibility
    chromeObj.browserAction = chromeObj.action;

    return chromeObj;
  }
}

window.ChromeApiFactory = ChromeApiFactory;
