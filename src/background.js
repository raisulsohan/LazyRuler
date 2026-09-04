// Service worker: turns the overlay on/off in the active tab.
// The content script is declared in the manifest, but pages that were already
// open when the extension was installed/reloaded have no script in them yet,
// so we inject on demand as a fallback.

const CONTENT_FILES = [
  'src/store.js',
  'src/snap.js',
  'src/overlay.js',
  'src/content.js'
];

const INJECTABLE = /^https?:|^file:/;

async function toggleInTab(tab) {
  if (!tab || !tab.id || !INJECTABLE.test(tab.url || '')) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'RFB_TOGGLE' });
  } catch {
    // No receiver in that tab yet — inject, then toggle.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: CONTENT_FILES
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'RFB_TOGGLE' });
    } catch (err) {
      console.warn('[Ruler] could not attach to tab', err);
    }
  }
}

chrome.action.onClicked.addListener(toggleInTab);

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'toggle-ruler') return;
  const target = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  toggleInTab(target);
});
