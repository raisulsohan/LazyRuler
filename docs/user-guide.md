# LazyRuler User Guide

LazyRuler draws Photoshop-style rulers along the top and left of any web page, lets you pull guides out of them, and measures elements and distances in CSS pixels. This guide covers every feature of version 1.0.1.

## Contents

1. [Install](#install)
2. [Turn the ruler on and off](#turn-the-ruler-on-and-off)
3. [Read the rulers](#read-the-rulers)
4. [Guides](#guides)
5. [Snapping](#snapping)
6. [Measure](#measure)
7. [Display modes](#display-modes)
8. [The HUD](#the-hud)
9. [Keyboard shortcuts](#keyboard-shortcuts)
10. [What is saved](#what-is-saved)
11. [Troubleshooting](#troubleshooting)
12. [Known limits](#known-limits)

## Install

LazyRuler is loaded as an unpacked extension. There is no build step.

1. Download the repository as a ZIP and unzip it somewhere permanent, or clone it. The browser loads the files from that folder, so do not move or delete it afterwards.
2. Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the `LazyRuler` folder, the one that contains `manifest.json`.
5. Optional: pin the LazyRuler icon to the toolbar from the extensions menu.

The extension works on `http://`, `https://` and `file://` pages. For `file://` pages, open the extension's **Details** page and turn on **Allow access to file URLs**. Browser pages such as `chrome://extensions`, the Chrome Web Store and Chrome's built-in PDF viewer cannot be scripted by any extension, so the toggle does nothing there.

Tabs that were already open before you installed or reloaded the extension do not need a refresh: the first toggle injects the scripts on demand.

## Turn the ruler on and off

Any of these toggles the overlay in the current tab:

| Action | How |
|---|---|
| Keyboard | `Alt+R` (change it at `chrome://extensions/shortcuts`) |
| Toolbar | Click the LazyRuler icon |
| HUD | Click **✕** in the bottom-right panel |

The overlay is per tab and is not restored after a page reload: reload the page and the ruler is off until you toggle it again. Your guides are not lost. They are read back from storage the next time you turn the ruler on.

## Read the rulers

- Each ruler is a 22 px bar. There is a tick every 10 px, a longer tick every 50 px and a number every 100 px.
- Numbers are **document coordinates**: 0 is the top-left corner of the page, not of the window. Scroll down 300 px and the top edge of the window reads 300.
- A thin accent-coloured line in each ruler follows the mouse pointer.
- Units are CSS pixels, the same units DevTools shows. On a high-DPI screen the rulers render crisply, but the numbers are still CSS px.

## Guides

**Create a guide.** Press the mouse button on the top ruler and drag downward to pull out a horizontal guide. Press on the left ruler and drag rightward for a vertical guide. A click on a ruler that does not move more than 2 px leaves no guide behind.

**See its position.** While you drag a guide, and whenever you hover over one, a small label shows its document coordinate in px.

**Move a guide.** Drag it. The grab zone is about 5 px either side of the line, so you do not need pixel-perfect aim.

**Delete a guide.** Any of:

- double-click it;
- drag it back onto the ruler it came from (it turns red before you release);
- click **Clear** in the HUD to delete every guide on the current site.

**Hide guides.** `Ctrl+;` or the **Hide** button hides all guides without deleting them. Press again, or click **Show**, to bring them back. Pulling a new guide out of a ruler while guides are hidden un-hides them.

**Lock guides.** `Ctrl+Alt+;` or the **Lock** button. Locked guides are dimmed and stop catching the mouse, so you cannot move or delete them by accident, and no new guides can be pulled out while the lock is on.

Guides are pinned to the page content, so they scroll with it and stay put when the window is resized.

## Snapping

While you drag a guide it snaps, within 6 px, to the edges of the elements currently on screen:

| Guide | Snaps to |
|---|---|
| Vertical | Left edge, right edge and horizontal centre of each element |
| Horizontal | Top edge, bottom edge and vertical middle of each element |

Both also snap to 0, the page edge. A snapped guide and its label turn pink so you can see that it has locked on.

Hold **Shift** while dragging to place the guide freely.

The snap targets are collected when the drag starts, from the elements visible in the window at that moment (up to the first 5000 elements on the page).

## Measure

Hold **Alt** to enter measure mode. The pointer becomes a crosshair and the overlay takes over the mouse until you release Alt.

**Inspect an element.** Move the pointer over anything on the page. The element is outlined and a label shows its tag, its id or first class name, and its size, for example `div.card  220 × 120`.

**Measure a distance.** With Alt held, press the mouse button and drag. A line is drawn from the start point to the pointer, with dashed horizontal and vertical legs, and a label shows `Δx × Δy · distance px`. Release the mouse button to finish.

- A finished measurement stays on screen after you release Alt, so you can read it or take a screenshot.
- Releasing Alt in the middle of a drag cancels that measurement.
- Press **Esc** to clear the measurement and the hover outline.

Because the overlay captures the mouse while Alt is held, clicks made in measure mode do not reach the page.

## Display modes

The **Mode** button in the HUD cycles through three modes. The mode is saved globally, so every site opens in the mode you chose last.

| Button label | Mode | What it does |
|---|---|---|
| **Over** | Overlay (default) | The rulers float on top of the page. The 22 px strips along the top and left cover whatever is under them. |
| **Push** | Push | The page is shifted 22 px down and 22 px right so nothing sits under the rulers. Boxes anchored to the window, such as fixed headers, fixed sidebars and sticky bars, are moved out from under the rulers as well, and ones with a set width or height are trimmed so they still fit. The page returns to normal when you switch mode or close the ruler. |
| **Auto** | Auto-hide | The rulers slide out of view. Move the pointer within 30 px of the top or left window edge and they slide in; move away and they retract after 300 ms. They stay visible while you are dragging a guide. Guides, measurement and the HUD keep working while the rulers are hidden. |

## The HUD

The small panel in the bottom-right corner, from left to right:

- **Guide count**: how many guides exist on this site.
- **Hint**: `Alt = measure · Shift = no snap`.
- **Made by Raisul Sohan**: link to the author's site.
- **Mode**: cycles Overlay → Push → Auto-hide. Lit in any mode other than Overlay.
- **Lock**: locks or unlocks guides. Lit while locked.
- **Hide / Show**: hides or shows guides. Lit while hidden.
- **Clear**: deletes every guide on this site.
- **✕**: turns the ruler off.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Alt+R` | Toggle the ruler (browser-level shortcut, changeable at `chrome://extensions/shortcuts`) |
| `Alt` (hold) | Measure mode |
| `Alt` + drag | Measure a distance |
| `Shift` (hold while dragging) | Disable snapping |
| `Ctrl+;` | Hide / show guides |
| `Ctrl+Alt+;` | Lock / unlock guides |
| `Esc` | Clear the current measurement and hover outline |
| Double-click a guide | Delete it |

Every shortcut except `Alt+R` works only while the ruler is on.

## What is saved

Everything is stored locally with `chrome.storage.local`. Nothing is sent anywhere.

| What | Scope | Saved when |
|---|---|---|
| Guides (axis and position of each) | Per origin: scheme + host + port, for example `https://example.com`. `https://app.example.com` and `http://example.com` are different origins with their own guides. | 200 ms after any change, and when the ruler is turned off |
| Display mode | Global | When you press **Mode** |

Not saved: whether guides are hidden or locked. Both reset to visible and unlocked when the ruler is turned on.

**Clear** removes the guides for the current site from storage. Uninstalling the extension removes all of its data.

## Troubleshooting

**`Alt+R` does nothing.**

- You are on a browser page (`chrome://…`, the Web Store, a PDF in Chrome's viewer) or on a page that belongs to another extension. Extensions cannot run there.
- Another extension or the browser owns the shortcut. Check and change it at `chrome://extensions/shortcuts`.
- On a `file://` page, **Allow access to file URLs** is off in the extension's Details.

**My guides disappeared.**

- Guides are stored per origin. A different subdomain, port or protocol is a different origin with its own set.
- **Clear** was pressed. It deletes the site's guides permanently.

**A guide will not move or delete.** Guides are locked: the **Lock** button is lit. Press it or `Ctrl+Alt+;`.

**Clicks are not reaching the page.** You are holding Alt. Release it to leave measure mode.

**The guide keeps jumping while I drag.** It is snapping to a nearby edge. Hold Shift while dragging.

**The numbers do not match DevTools.**

- Page zoom is not 100%. LazyRuler reads CSS pixels at the current zoom; reset zoom with `Ctrl+0`.
- You are comparing a document coordinate with a viewport coordinate. Subtract the scroll offset.

**Push mode leaves something under a ruler.** Push mode moves fixed and sticky boxes by changing their top and left offsets. A box placed some other way, for example by a script that sets its position on every frame, can stay put. Auto-hide always works, since it hides the rulers instead.

**I reloaded the extension and the ruler stopped responding.** Reloading the extension at `chrome://extensions` disconnects the overlay from storage. Reload the page and toggle the ruler again. Guides saved before the reload are kept.

## Known limits

- Runs in the top frame only. Guides and measurements do not extend into iframes, and elements inside an iframe are not snap targets.
- Page zoom is not compensated: at zoom levels other than 100% the ruler reads CSS pixels, not device pixels.
- Elements inside shadow DOM are seen as their host element, both for snapping and for the measure hover.
- Snapping considers at most the first 5000 elements of the page.
- Push mode recognises `position: fixed` boxes and `position: sticky` boxes that stick to the window. A box positioned by a script on every frame, or a sticky box inside a scrolling panel, is left as it is.
