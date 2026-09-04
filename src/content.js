// Bootstrap: owns the single overlay instance for this page.
(() => {
  const ns = (window.__RFB = window.__RFB || {});
  if (ns.booted) return;
  ns.booted = true;

  let overlay = null;

  const off = () => {
    if (!overlay) return;
    overlay.destroy();
    overlay = null;
  };

  const on = () => {
    if (overlay) return;
    overlay = new ns.RulerOverlay(off);
  };

  const toggle = () => {
    if (overlay) off();
    else on();
    return !!overlay;
  };

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case 'RFB_TOGGLE':
        sendResponse({ active: toggle() });
        break;
      case 'RFB_ON':
        on();
        sendResponse({ active: true });
        break;
      case 'RFB_OFF':
        off();
        sendResponse({ active: false });
        break;
      case 'RFB_STATE':
        sendResponse({ active: !!overlay });
        break;
    }
  });
})();
