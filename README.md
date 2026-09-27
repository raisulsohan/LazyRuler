# LazyRuler

Photoshop-style rulers, guides and measurement on top of any web page.

Drag a guide out of the ruler bar, let it snap to the edge of a real element, and see
instantly whether two things line up.

## Install (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → pick this folder.
4. Open any page and press **Alt+R**, or click the extension icon.

## Using it

| Action | How |
|---|---|
| Toggle the overlay | `Alt+R` or the toolbar icon |
| New horizontal guide | Drag down from the **top** ruler |
| New vertical guide | Drag right from the **left** ruler |
| Move a guide | Drag it |
| Delete a guide | Double-click it, or drag it back onto its ruler |
| Disable snapping | Hold `Shift` while dragging |
| Measure | Hold `Alt` — hover highlights an element with its size; drag for a distance readout |
| Clear a measurement | `Esc` |
| Hide / show guides | `Ctrl+;` |
| Lock guides | `Ctrl+Alt+;` (guides stop capturing the mouse) |
| Delete every guide | **Clear** in the corner HUD |
| Switch display mode | **Mode** button in the HUD (cycles Overlay → Push → Auto-hide) |

### Display modes

| Mode | Behaviour |
|---|---|
| **Overlay** (default) | Rulers float on top of the page, exactly as before. |
| **Push** | The page content is shifted 22 px down and right so nothing is hidden beneath the rulers. |
| **Auto-hide** | Rulers are hidden until you move your cursor near the top or left edge of the viewport; they slide in smoothly and retract when you move away. |

Your chosen mode is saved globally (all sites share it) and restored on reload.

Guides snap to the left / right / centre of any on-screen element (vertical guides) or the
top / bottom / middle (horizontal guides), within 6px.

Coordinates are **document** coordinates, so guides stay pinned to the content as you
scroll, and they are saved per origin — reload the site and your guides come back.

## Layout

```
manifest.json      MV3 manifest
icons/             Extension icons (16, 32, 48, 128)
src/background.js  service worker: toolbar click + Alt+R, injects on demand
src/content.js     owns the single overlay instance per page
src/overlay.js     rulers, guides, measurement, modes (inside shadow root)
src/overlay.css    overlay styles, scoped to shadow root
src/store.js       per-origin guide persistence & mode settings
src/snap.js        element-edge collection + nearest-edge search
PRIVACY.md         Chrome Web Store compliant privacy policy
CHANGELOG.md       version history
docs/              user guide and developer guide
```

## Known limits

- Runs in the top frame only — guides do not extend into cross-origin iframes.
- Page zoom is not compensated: at zoom levels other than 100% the ruler reads CSS pixels, not device pixels.

## Documentation

- [User guide](docs/user-guide.md) — every feature, shortcut and display mode, with troubleshooting and known limits.
- [Developer guide](docs/developer-guide.md) — how the overlay, snapping, measurement and storage work, and how to work on the code.
- [Changelog](CHANGELOG.md) — what changed in each version.

## Privacy Policy

**LazyRuler** operates with a strict privacy-first policy. It does not collect, track, or share any personal data or browsing activity. All guides and preferences are stored strictly on your local browser.

Read the complete [Privacy Policy](PRIVACY.md) (or on GitHub: [https://github.com/raisulsohan/LazyRuler/blob/main/PRIVACY.md](https://github.com/raisulsohan/LazyRuler/blob/main/PRIVACY.md)).

## Author & Contributor

Made by [Raisul Sohan](https://raisulsohan.com)

## License

[MIT](LICENSE) © [Raisul Sohan](https://raisulsohan.com)
