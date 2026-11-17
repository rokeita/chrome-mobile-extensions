/**
 * Sample extensions for instant testing out-of-the-box
 */
const SAMPLE_EXTENSIONS = [
  {
    id: "ext_dark_reader",
    manifest: {
      manifest_version: 3,
      name: "Dark Reader Mobile",
      version: "1.2.0",
      description: "Dark mode for every website. Inverts harsh bright colors to protect your eyes on mobile.",
      action: {
        default_popup: "popup.html",
        default_title: "Dark Reader Mobile",
        default_icon: "icon.png"
      },
      permissions: ["storage", "activeTab"],
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content.js"],
          css: ["content.css"],
          run_at: "document_idle"
        }
      ]
    },
    files: {
      "icon.png": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><path d='M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'/></svg>",
      "content.css": `
        body.dark-reader-active {
          background-color: #121212 !important;
          color: #e0e0e0 !important;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        body.dark-reader-active p,
        body.dark-reader-active h1,
        body.dark-reader-active h2,
        body.dark-reader-active h3,
        body.dark-reader-active h4,
        body.dark-reader-active span,
        body.dark-reader-active div {
          color: #e0e0e0 !important;
          background-color: transparent !important;
        }
        body.dark-reader-active a {
          color: #8ab4f8 !important;
        }
        body.dark-reader-active img,
        body.dark-reader-active video,
        body.dark-reader-active canvas {
          filter: brightness(0.85) contrast(1.1);
        }
      `,
      "content.js": `
        (function() {
          function applyTheme(enabled) {
            if (enabled) {
              document.body.classList.add('dark-reader-active');
            } else {
              document.body.classList.remove('dark-reader-active');
            }
          }

          chrome.storage.local.get({ enabled: true }, (res) => {
            applyTheme(res.enabled);
          });

          chrome.storage.onChanged.addListener((changes) => {
            if (changes.enabled) {
              applyTheme(changes.enabled.newValue);
            }
          });

          chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg.action === 'toggleDark') {
              const isActive = document.body.classList.toggle('dark-reader-active');
              chrome.storage.local.set({ enabled: isActive });
              sendResponse({ enabled: isActive });
            }
          });
        })();
      `,
      "popup.html": `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 18px;
              background: #1e1e24;
              color: #f1f1f1;
              width: 100%;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 16px;
            }
            .title {
              font-size: 17px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .switch-container {
              display: flex;
              align-items: center;
              justify-content: space-between;
              background: #2b2b36;
              padding: 12px 16px;
              border-radius: 12px;
              margin-bottom: 14px;
            }
            .switch {
              position: relative;
              display: inline-block;
              width: 48px;
              height: 26px;
            }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider {
              position: absolute;
              cursor: pointer;
              top: 0; left: 0; right: 0; bottom: 0;
              background-color: #555;
              transition: .3s;
              border-radius: 26px;
            }
            .slider:before {
              position: absolute;
              content: "";
              height: 20px; width: 20px;
              left: 3px; bottom: 3px;
              background-color: white;
              transition: .3s;
              border-radius: 50%;
            }
            input:checked + .slider { background-color: #6366f1; }
            input:checked + .slider:before { transform: translateX(22px); }
            .info-badge {
              font-size: 13px;
              color: #a0a0b0;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">🌙 Dark Reader Mobile</div>
            <span style="font-size: 12px; color: #818cf8; background: #312e81; padding: 2px 8px; border-radius: 10px;">v1.2</span>
          </div>
          <div class="switch-container">
            <span style="font-weight: 500;">Enable Night Mode</span>
            <label class="switch">
              <input type="checkbox" id="toggleSwitch" checked>
              <span class="slider"></span>
            </label>
          </div>
          <div class="info-badge">
            Instant OLED dark mode applied to all active web tabs with high contrast text protection.
          </div>
          <script>
            const toggle = document.getElementById('toggleSwitch');
            chrome.storage.local.get({ enabled: true }, (res) => {
              toggle.checked = res.enabled;
            });
            toggle.addEventListener('change', () => {
              chrome.storage.local.set({ enabled: toggle.checked });
              chrome.runtime.sendMessage({ action: 'toggleDark', enabled: toggle.checked });
            });
          </script>
        </body>
        </html>
      `
    }
  },

  {
    id: "ext_ad_cleaner",
    manifest: {
      manifest_version: 3,
      name: "Ad & Overlay Cleaner",
      version: "2.0.4",
      description: "Blocks annoying mobile banners, floating sticky videos, and cookie consent popups.",
      action: {
        default_popup: "popup.html",
        default_title: "Ad & Overlay Cleaner",
        default_icon: "icon.png"
      },
      permissions: ["storage", "activeTab"],
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["cleaner.js"],
          run_at: "document_idle"
        }
      ]
    },
    files: {
      "icon.png": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444'><path d='M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z'/></svg>",
      "cleaner.js": `
        (function() {
          let blockedCount = 0;
          const badSelectors = [
            '.ad-container', '.advertisement', '.banner-ad', '.cookie-banner',
            '.newsletter-popup', '#cookie-notice', '[id*="google_ads"]',
            '.sticky-ad', '.floating-ad', '.modal-backdrop'
          ];

          function sweep() {
            badSelectors.forEach(sel => {
              document.querySelectorAll(sel).forEach(el => {
                el.style.display = 'none';
                el.remove();
                blockedCount++;
              });
            });

            chrome.action.setBadgeText({ text: blockedCount > 0 ? String(blockedCount) : '' });
            chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
            chrome.storage.local.set({ blockedToday: blockedCount });
          }

          sweep();
          setInterval(sweep, 2000);
        })();
      `,
      "popup.html": `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 18px;
              background: #0f172a;
              color: #f8fafc;
              box-sizing: border-box;
            }
            .stat-box {
              background: #1e293b;
              border-radius: 14px;
              padding: 20px;
              text-align: center;
              border: 1px solid #334155;
              margin-bottom: 14px;
            }
            .count {
              font-size: 38px;
              font-weight: 800;
              color: #f87171;
            }
            .label {
              font-size: 13px;
              color: #94a3b8;
              margin-top: 4px;
            }
            .btn {
              width: 100%;
              background: #ef4444;
              color: white;
              border: none;
              padding: 12px;
              border-radius: 10px;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <span style="font-size: 20px;">🛡️</span>
            <span style="font-weight: 700; font-size: 16px;">Shield & Ad Cleaner</span>
          </div>
          <div class="stat-box">
            <div class="count" id="statCount">14</div>
            <div class="label">Annoying items blocked on this page</div>
          </div>
          <button class="btn" id="cleanNowBtn">Force Deep Clean Page</button>
          <script>
            chrome.storage.local.get({ blockedToday: 14 }, (res) => {
              document.getElementById('statCount').innerText = res.blockedToday || '0';
            });
            document.getElementById('cleanNowBtn').addEventListener('click', () => {
              chrome.tabs.executeScript(null, { code: 'document.querySelectorAll(".ad, .banner").forEach(e => e.remove());' });
              document.getElementById('statCount').innerText = '18';
            });
          </script>
        </body>
        </html>
      `
    }
  },

  {
    id: "ext_web3_wallet",
    manifest: {
      manifest_version: 3,
      name: "Web3 Mobile Wallet",
      version: "1.0.0",
      description: "Injects window.ethereum provider to connect and interact with dApps right on your phone.",
      action: {
        default_popup: "popup.html",
        default_title: "Web3 Mobile Wallet",
        default_icon: "icon.png"
      },
      permissions: ["storage", "activeTab"],
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["inpage.js"],
          run_at: "document_start"
        }
      ]
    },
    files: {
      "icon.png": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f59e0b'><path d='M12 1L3 11l9 5 9-5-9-10zm0 14.8L3 12.3 12 23l9-10.7-9 3.5z'/></svg>",
      "inpage.js": `
        // Injects window.ethereum mock for mobile dApps
        (function() {
          window.ethereum = {
            isMetaMask: true,
            chainId: '0x1',
            selectedAddress: '0x71C...a49',
            request: async function({ method, params }) {
              console.log('Mobile Web3 request:', method, params);
              if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
                return ['0x71C250A6bA34B2FE6692ff8110D49a21Ef748a49'];
              }
              if (method === 'eth_chainId') return '0x1';
              return null;
            }
          };
          window.dispatchEvent(new Event('ethereum#initialized'));
        })();
      `,
      "popup.html": `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 16px;
              background: #18191c;
              color: white;
              box-sizing: border-box;
            }
            .account-pill {
              display: inline-block;
              background: #2a2b30;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 13px;
              color: #a1a1aa;
              margin-bottom: 16px;
            }
            .balance-box {
              text-align: center;
              margin: 16px 0;
            }
            .balance {
              font-size: 32px;
              font-weight: 700;
            }
            .fiat {
              font-size: 14px;
              color: #71717a;
            }
            .actions {
              display: flex;
              gap: 12px;
              margin-top: 20px;
            }
            .action-btn {
              flex: 1;
              background: #f59e0b;
              color: #18191c;
              font-weight: 700;
              border: none;
              padding: 10px;
              border-radius: 12px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="account-pill">🦊 0x71C...a49</div>
            <span style="font-size:12px; color:#10b981; font-weight:600;">● Ethereum Mainnet</span>
          </div>
          <div class="balance-box">
            <div class="balance">2.45 ETH</div>
            <div class="fiat">$6,842.10 USD</div>
          </div>
          <div class="actions">
            <button class="action-btn">Send</button>
            <button class="action-btn" style="background:#27272a; color:white;">Receive</button>
            <button class="action-btn" style="background:#27272a; color:white;">Swap</button>
          </div>
        </body>
        </html>
      `
    }
  },

  {
    id: "ext_page_notes",
    manifest: {
      manifest_version: 3,
      name: "Page Notes & Highlighter",
      version: "1.0.2",
      description: "Take quick sticky notes and highlight paragraphs on any webpage directly on mobile.",
      action: {
        default_popup: "popup.html",
        default_title: "Page Notes",
        default_icon: "icon.png"
      },
      permissions: ["storage", "activeTab"]
    },
    files: {
      "icon.png": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310b981'><path d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/></svg>",
      "popup.html": `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 16px;
              background: #fff;
              color: #1e293b;
              box-sizing: border-box;
            }
            textarea {
              width: 100%;
              height: 120px;
              padding: 10px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              box-sizing: border-box;
              font-family: inherit;
              font-size: 14px;
              resize: none;
            }
            .save-btn {
              margin-top: 10px;
              width: 100%;
              background: #10b981;
              color: white;
              border: none;
              padding: 10px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <h4 style="margin: 0 0 10px 0;">📝 Page Note</h4>
          <textarea id="noteInput" placeholder="Write thoughts or research notes for this page..."></textarea>
          <button class="save-btn" id="saveBtn">Save Note</button>
          <script>
            const input = document.getElementById('noteInput');
            chrome.tabs.query({ active: true }, (tabs) => {
              const url = (tabs && tabs[0] && tabs[0].url) || 'default';
              chrome.storage.local.get({ [url]: '' }, (res) => {
                input.value = res[url] || '';
              });
              document.getElementById('saveBtn').addEventListener('click', () => {
                chrome.storage.local.set({ [url]: input.value }, () => {
                  document.getElementById('saveBtn').innerText = 'Saved! ✓';
                  setTimeout(() => { document.getElementById('saveBtn').innerText = 'Save Note'; }, 1500);
                });
              });
            });
          </script>
        </body>
        </html>
      `
    }
  }
];

window.SAMPLE_EXTENSIONS = SAMPLE_EXTENSIONS;
