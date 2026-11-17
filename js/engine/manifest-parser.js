/**
 * ManifestParser: Normalizes Manifest V2 and V3 specifications for execution
 */
class ManifestParser {
  static parse(rawJson) {
    let manifest;
    try {
      manifest = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    } catch (e) {
      throw new Error(`Invalid manifest.json: ${e.message}`);
    }

    if (!manifest.name) throw new Error("Manifest missing required 'name' field");
    if (!manifest.version) throw new Error("Manifest missing required 'version' field");

    const manifestVersion = manifest.manifest_version || 2;

    // Normalize Action / Browser Action
    const actionConfig = manifest.action || manifest.browser_action || manifest.page_action || {};
    const defaultPopup = actionConfig.default_popup || '';
    const defaultTitle = actionConfig.default_title || manifest.name || '';
    const defaultIcon = actionConfig.default_icon || manifest.icons || {};

    // Normalize Icons
    let iconPath = '';
    if (typeof defaultIcon === 'string') {
      iconPath = defaultIcon;
    } else if (typeof defaultIcon === 'object') {
      iconPath = defaultIcon['128'] || defaultIcon['64'] || defaultIcon['48'] || defaultIcon['32'] || defaultIcon['16'] || Object.values(defaultIcon)[0] || '';
    }

    // Normalize Background Scripts / Service Worker
    const background = [];
    if (manifest.background) {
      if (manifest.background.service_worker) {
        background.push(manifest.background.service_worker);
      } else if (Array.isArray(manifest.background.scripts)) {
        background.push(...manifest.background.scripts);
      }
    }

    // Normalize Content Scripts
    const contentScripts = [];
    if (Array.isArray(manifest.content_scripts)) {
      manifest.content_scripts.forEach(cs => {
        contentScripts.push({
          matches: cs.matches || ['<all_urls>'],
          excludeMatches: cs.exclude_matches || [],
          js: cs.js || [],
          css: cs.css || [],
          runAt: cs.run_at || 'document_idle',
          allFrames: !!cs.all_frames
        });
      });
    }

    return {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description || '',
      manifestVersion: manifestVersion,
      permissions: manifest.permissions || [],
      hostPermissions: manifest.host_permissions || [],
      action: {
        popup: defaultPopup,
        title: defaultTitle,
        icon: iconPath
      },
      icons: manifest.icons || {},
      iconUrl: iconPath,
      backgroundScripts: background,
      contentScripts: contentScripts,
      webAccessibleResources: manifest.web_accessible_resources || [],
      raw: manifest
    };
  }

  /**
   * Tests if a URL matches a Chrome extension match pattern (e.g. *://*/*, https://google.com/*)
   */
  static matchesUrl(pattern, targetUrl) {
    if (pattern === '<all_urls>' || pattern === '*://*/*') return true;

    try {
      const url = new URL(targetUrl);
      // Pattern format: scheme://host/path
      const parts = pattern.match(/^(\*|http|https|file|ftp):\/\/(\*|\*\.[^/]+|[^/]+)(\/.*)$/);
      if (!parts) return false;

      const [, scheme, host, path] = parts;

      // Check scheme
      if (scheme !== '*' && url.protocol.replace(':', '') !== scheme) {
        return false;
      }

      // Check host
      if (host !== '*') {
        if (host.startsWith('*.')) {
          const baseDomain = host.slice(2);
          if (url.hostname !== baseDomain && !url.hostname.endsWith('.' + baseDomain)) {
            return false;
          }
        } else if (url.hostname !== host) {
          return false;
        }
      }

      // Check path regex
      const pathRegex = new RegExp('^' + path.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return pathRegex.test(url.pathname);
    } catch {
      return false;
    }
  }
}

window.ManifestParser = ManifestParser;
