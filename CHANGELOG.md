# Changelog

All notable changes to LazyRuler are listed here. Version numbers follow the `version` field in `manifest.json`.

## [1.0.0] — 2026-09-04

First release, published as **Ruler for Browser**.

On 2026-09-17 the extension was renamed to **LazyRuler**. The version number did not change. The rename updated the manifest name, the docs, the store listing and the repository links, and added the *Made by Raisul Sohan* credit link to the HUD.

### Added

- Top and left rulers drawn on canvas in document coordinates, with a line that follows the pointer.
- Draggable horizontal and vertical guides pulled out of the rulers, with position labels.
- Snapping to the edges and centres of on-screen elements within 6 px; Shift disables it.
- Guide deletion by double-click, by dragging back onto the ruler, or all at once with **Clear**.
- Hide/show guides (`Ctrl+;`) and lock guides (`Ctrl+Alt+;`).
- Measure mode: hold Alt to outline any element with its size, or Alt-drag for a distance readout; Esc clears.
- Display modes: Overlay, Push (page shifted 22 px) and Auto-hide (rulers slide in near the window edges), saved globally.
- Guides saved per origin in `chrome.storage.local` and restored on the next visit.
- HUD with guide count, mode, lock, hide, clear and close buttons.
- `Alt+R` command and toolbar toggle, with on-demand injection into tabs opened before install.
- Dev sandbox (`dev/sandbox.html`) for running the overlay outside the extension.
- MIT license, privacy policy and Chrome Web Store submission guide.
