# LazyRuler Developer Guide

How the extension is put together, how the pieces talk to each other, and how to work on it. Read the [user guide](user-guide.md) first if you have not used the extension yet.

## Contents

1. [Overview](#overview)
2. [File map](#file-map)
3. [Boot and toggle flow](#boot-and-toggle-flow)
4. [The overlay](#the-overlay)
5. [Working on it](#working-on-it)
6. [Permissions](#permissions)

## Overview

LazyRuler is a Manifest V3 extension written in plain JavaScript and CSS. There is no build step, no bundler and no dependency: the files in `src/` are loaded as they are.

Two parts run at different times:

- A **service worker** (`src/background.js`) that reacts to the toolbar button and the `Alt+R` command and tells the page to toggle.
- Four **content scripts** (`src/store.js`, `src/snap.js`, `src/overlay.js`, `src/content.js`), declared in the manifest for every `http`, `https` and `file` page at `document_idle`, top frame only. They do nothing visible until they receive a toggle message.

## File map

```
manifest.json               MV3 manifest: permissions, command, content scripts, web-accessible CSS
src/background.js           service worker: toolbar click + Alt+R, on-demand injection
src/content.js              page bootstrap: owns the one overlay instance, answers messages
src/overlay.js              RulerOverlay class: rulers, guides, snapping, measure, display modes, HUD
src/overlay.css             overlay styles, scoped to the shadow root
src/store.js                chrome.storage.local wrapper: guides per origin, global display mode
src/snap.js                 edge collection and nearest-edge search
dev/sandbox.html            runs the overlay outside the extension with a stubbed chrome.* API
icons/                      16, 32, 48 and 128 px icons
CHROME_WEB_STORE_GUIDE.md   store listing text, permission justifications, packaging steps
PRIVACY.md                  privacy policy linked from the store listing
CHANGELOG.md                version history
docs/                       this guide and the user guide
```

## Boot and toggle flow

1. The manifest injects the four content scripts into every page. Each file guards against a second load through flags on a shared namespace, `window.__RFB` (`ns.booted`, `ns.store`, `ns.collectEdges`, `ns.RulerOverlay`), so injecting them twice is harmless.
2. `content.js` registers a `chrome.runtime.onMessage` listener and waits.
3. When the toolbar icon is clicked or `Alt+R` is pressed, `background.js` sends `{ type: 'RFB_TOGGLE' }` to the active tab.
4. If the tab has no listener (it was open before the extension was installed or reloaded), `sendMessage` rejects. The worker then runs `chrome.scripting.executeScript` with the same four files and sends the message again. This is the only reason the `scripting` permission exists.
5. `content.js` creates a `RulerOverlay`, or destroys the existing one, and replies `{ active: boolean }`.

Tabs whose URL does not match `^https?:|^file:` are ignored by the worker.

### Messages

All messages go to the content script of a tab. Each reply is `{ active: boolean }`.

| `type` | Effect |
|---|---|
| `RFB_TOGGLE` | Turn the overlay on if off, off if on |
| `RFB_ON` | Turn on (no-op if already on) |
| `RFB_OFF` | Turn off (no-op if already off) |
| `RFB_STATE` | Reply with the current state only |

Only `RFB_TOGGLE` is sent today. The others exist for scripts or future UI that want explicit control.

## The overlay

`RulerOverlay` (in `src/overlay.js`) builds a `<rfb-overlay>` element, appends it to `<html>` and gives it an open shadow root, so page CSS cannot reach the overlay and overlay CSS cannot leak out. The host gets inline `position: fixed; inset: 0; z-index: 2147483647; pointer-events: none`, all `!important`, so it covers the viewport but lets the mouse through by default. Individual layers opt back in to pointer events.

The stylesheet is loaded with a `<link>` to `src/overlay.css`, which is why that file is listed under `web_accessible_resources`.

Layers inside the shadow root, bottom to top:

| Element | Class | Purpose | Pointer events |
|---|---|---|---|
| `div` | `.rfb-catch` | Full-viewport catch layer for measure mode and drags | Only while `.rfb--measure` or `.rfb--dragging` is set on `.rfb` |
| `div` | `.rfb-guides` | Container for guide elements | Guides yes, container no. `.is-hidden` hides them, `.is-locked` dims and disables them |
| `div` | `.rfb-measure` | Hover outline, hover label, SVG measurement line, distance label | No |
| `canvas` × 2 | `.rfb-ruler--top`, `.rfb-ruler--left` | The rulers | Yes (drag source for new guides) |
| `div` | `.rfb-corner` | 22 × 22 corner square | Yes |
| `div` | `.rfb-hud` | Bottom-right control panel | Yes |

### Rendering

Every visual update goes through `scheduleDraw()`, which coalesces calls into one `requestAnimationFrame` and then runs:

1. `_drawRulers()`: clears and repaints both canvases at `devicePixelRatio`, drawing ticks in document coordinates offset by the current scroll, labels every 100 px, and the cursor line. Colours are read from the CSS custom properties on `.rfb` (`--rfb-bar`, `--rfb-tick`, `--rfb-text`, `--rfb-accent`) with `getComputedStyle`, so changing the theme in `overlay.css` also changes the canvases.
2. `_positionGuides()`: moves each guide element with a `transform: translate` of `pos − scroll`, updates its label and toggles `.is-active`, `.is-snapped` and `.is-deleting`.
3. `_renderMeasure()`: positions the hover box and label, and the SVG line with its dashed legs and the distance label.

`scroll`, `resize` and `mousemove` all call `scheduleDraw()`. `resize()` also resizes the canvases and the SVG viewBox.

### Guides

A guide is a plain object `{ id, axis: 'h' | 'v', pos }` where `pos` is a document coordinate in CSS px. `this.guides` is the source of truth; `_syncGuideEls()` rebuilds the DOM from it and `this.guideEls` maps each id to `{ node, label }`.

Drag lifecycle:

1. `mousedown` on a ruler canvas calls `_startNewGuide(e, axis)`, which creates a guide at the pointer and calls `_beginDrag(guide, e, isNew = true)`. `mousedown` on an existing guide calls `_beginDrag(guide, e, false)`. Both bail out while locked or for non-primary buttons.
2. `_beginDrag` stores the drag state (start point, `moved`, `leftRuler`, `willDelete`, `snapped`, snap `targets`), adds `.rfb--dragging` and attaches capturing `mousemove` / `mouseup` listeners on `window`.
3. `_dragMove` updates `pos`, applies snapping unless Shift is held, and tracks whether the pointer has left the ruler strip (`screenPos >= RULER`) and then come back (`willDelete`). `MOVE_SLOP` (2 px) decides whether the gesture counts as a drag.
4. `_dragEnd` removes the guide if `willDelete`, or if it was new and never moved (a plain click). Otherwise it re-syncs, updates the HUD and persists.

Double-click on a guide removes it unless locked.

### Snapping

`src/snap.js` exposes two pure functions on the namespace:

- `collectEdges(axis, exclude)` walks `document.body.getElementsByTagName('*')` up to `MAX_ELEMENTS` (5000), skips the overlay host and elements smaller than 1 px or outside the viewport, and returns the document coordinates of the three relevant edges per element (left, right, centre for a vertical guide; top, bottom, middle for a horizontal one), plus 0.
- `nearestEdge(targets, pos, threshold)` returns the closest target within `threshold` px, or `null`.

Targets are computed once per drag in `_beginDrag`, so a very large page costs one DOM walk per drag, not one per mouse move. `SNAP` is 6 px.

### Measure mode

A `keydown` with `altKey` turns measure mode on. A `keyup` of Alt, any `keyup` without Alt, and window `blur` turn it off. The mode toggles `.rfb--measure`, which gives `.rfb-catch` pointer events and a crosshair cursor.

- Hover: `_elementAt(x, y)` uses `document.elementsFromPoint` and returns the first element that is neither the overlay host nor `<html>`. `describe(node)` builds the `tag#id` / `tag.class` label.
- Distance: `_measureStart` records `{ from, to, done: false }` in document coordinates; `_measureHover` updates `to` while the button is down; a capturing `mouseup` on `window` sets `done`. Leaving measure mode discards an unfinished measurement and keeps a finished one; `Esc` clears both.

### Display modes

`MODE_CYCLE` is `['overlay', 'push', 'autohide']`; `cycleMode()` applies the next one and saves it. `_applyMode(mode)` first tears down the previous mode, then:

- **push**: `_applyPush()` records the root element's inline `margin-top` / `margin-left` and sets both to `22px !important`. `_removePush()` restores them. (The `_origPadding*` fields are recorded but not used.)
- **autohide**: adds `.rfb--autohide`. `_checkAutoHide()` runs on every mouse move and toggles `.rfb--ruler-visible` when the pointer is within `EDGE` (30 px) of the top or left edge, or while dragging, with a `HIDE_DELAY` (300 ms) timer before hiding. The slide is a CSS transition on the ruler canvases and the corner.
- **overlay**: nothing to set up.

`destroy()` removes the push margins if push was active.

### Persistence

`src/store.js` wraps `chrome.storage.local`:

| Key | Value | Written by |
|---|---|---|
| `guides::<origin>` | `Array<{ id, axis, pos }>` | `save()`, 200 ms after the last change (`_persist()`), and from `destroy()` |
| `rfb_display_mode` | `'overlay'`, `'push'` or `'autohide'` | `saveMode()` from `cycleMode()` |

Every call is wrapped in `try/catch` because `chrome.storage` throws once the extension has been reloaded and the content script's context is invalidated. In that case guides stay in memory for the life of the page.

### Teardown

`destroy()` removes all window listeners, cancels the pending frame and timers, saves guides, restores push margins and removes the host element. `content.js` then drops its reference, so the next toggle builds a fresh overlay.

## Working on it

### Load unpacked

Load the repository folder at `chrome://extensions` with Developer mode on. After editing `src/*.js` or `overlay.css`, click the reload icon on the extension card and reload the page you are testing on. Pages that were open during the reload keep a dead copy of the old script, so reloading them is required.

### The dev sandbox

`dev/sandbox.html` runs the overlay outside the extension so you can iterate without reloading anything. It stubs just enough of `chrome.*`: `runtime.getURL` resolves to `../<path>` and `storage.local` is an in-memory object. Open it straight from disk (`file:///…/dev/sandbox.html`) or through any static server, for example:

```bash
npx serve .
```

and then visit `/dev/sandbox.html`. The page contains three deliberately misaligned cards to snap and measure against, and exposes the instance as `window.overlay`.

Guides in the sandbox live only for that page load.

### Debugging in a real page

Content scripts run in the extension's isolated world. In DevTools, switch the console's context dropdown from `top` to **LazyRuler** to reach `window.__RFB` and the `RulerOverlay` class. `chrome.storage.local.get(null)` from that context shows the saved guides and mode.

The service worker has its own console: click **service worker** on the extension's card at `chrome://extensions`.

### Conventions

- The `RFB` / `rfb-` prefix is kept from the original name, *Ruler for Browser*. It is the namespace on `window`, the message prefix and the CSS class prefix.
- Geometry constants live at the top of `overlay.js`: `RULER` (22 px bar thickness), `SNAP` (6 px), `MOVE_SLOP` (2 px). `--rfb-size` in `overlay.css` must match `RULER`.
- Keep the files dependency-free and loadable in the fixed order `store → snap → overlay → content`. `background.js` lists the same order for on-demand injection.

### Releasing

1. Bump `version` in `manifest.json` and in `CHROME_WEB_STORE_GUIDE.md`.
2. Add the changes to `CHANGELOG.md`.
3. Zip `manifest.json`, `icons/` and `src/` only (not `dev/`, the docs or `.git`), as described in `CHROME_WEB_STORE_GUIDE.md`.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Guides per origin and the display mode |
| `scripting` | On-demand injection into tabs that were open before install or reload |
| `host_permissions: <all_urls>` | The rulers must be able to appear on any page the user chooses |
| `web_accessible_resources: src/overlay.css` | The shadow root loads the stylesheet by URL |

No network requests are made, and no page content is read beyond element geometry.
