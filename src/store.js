// Per-origin persistence for guides.
(() => {
  const ns = (window.__RFB = window.__RFB || {});
  if (ns.store) return;

  const key = () => `guides::${location.origin}`;

  ns.store = {
    async load() {
      try {
        const k = key();
        const bag = await chrome.storage.local.get(k);
        const list = bag[k];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },

    async save(guides) {
      try {
        await chrome.storage.local.set({ [key()]: guides });
      } catch {
        /* storage unavailable (e.g. extension reloaded) — guides stay in memory */
      }
    },

    async clear() {
      try {
        await chrome.storage.local.remove(key());
      } catch {
        /* ignore */
      }
    },

    async loadMode() {
      try {
        const bag = await chrome.storage.local.get('rfb_display_mode');
        const m = bag.rfb_display_mode;
        return (m === 'push' || m === 'autohide') ? m : 'overlay';
      } catch {
        return 'overlay';
      }
    },

    async saveMode(mode) {
      try {
        await chrome.storage.local.set({ rfb_display_mode: mode });
      } catch {
        /* storage unavailable */
      }
    }
  };
})();
