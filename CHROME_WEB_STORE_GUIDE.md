# Chrome Web Store Submission Guide for LazyRuler

This document contains everything you need to fill out the Chrome Web Store Developer Dashboard when publishing **LazyRuler**.

---

## 1. Extension Details

- **Name:** LazyRuler
- **Version:** 1.0.0
- **Short Description (under 132 characters):**
  > Photoshop-style rulers, draggable guides and on-page measurement for any web page.
- **Category:** Developer Tools (or Productivity)
- **Language:** English

### Detailed Description (for Store Listing):
`markdown
LazyRuler brings Photoshop and Figma style rulers, draggable guides, and instant pixel measurement right into your browser on any web page.

Perfect for front-end developers, UI/UX designers, and QA engineers who need to verify element alignments, spacing, paddings, and dimensions accurately.

KEY FEATURES:
* Top and Left Rulers: Pixel-accurate rulers pinned to your viewport.
* Draggable Guides: Drag horizontal guides from the top ruler, or vertical guides from the left ruler.
* Smart Edge Snapping: Guides automatically snap to the edges and centers of nearby HTML elements within 6px (hold Shift to disable).
* 3 Display Modes:
  - Overlay: Classic floating rulers.
  - Push: Automatically shifts page content 22px down and right so headers/admin bars are never covered!
  - Auto-hide: Rulers stay hidden until you hover near the viewport edges.
* Instant Measurement: Hold Alt and hover over elements to see dimensions (W x H) or drag to measure exact distances.
* Per-Origin Persistence: Saved guides remain intact when you refresh the page.
* Non-Intrusive & Isolated: Built with Shadow DOM so it never interferes with the host website's CSS.
* Completely Private: No telemetry, no ads, no analytics, no external network requests.

KEYBOARD SHORTCUTS:
* Alt + R: Toggle the ruler overlay on/off
* Ctrl + ; : Hide / Show guides
* Ctrl + Alt + ; : Lock / Unlock guides
* Esc: Clear measurement
* Shift (while dragging): Disable edge snapping
* Double-click a guide: Delete the guide

Made by Raisul Sohan (https://raisulsohan.com).
`

---

## 2. Privacy & Permission Justifications

When submitting, Chrome Web Store requires you to declare why you use each permission:

### Single Purpose:
> To provide draggable rulers, alignment guides, and dimension measurement tools directly on web pages for web design and development.

### Permission Justifications:
- **storage**:
  > Used solely to store the user's guide coordinates and display mode preference locally on their device via chrome.storage.local. No data is sent to external servers.
- **scripting**:
  > Used exclusively to inject the ruler overlay when the user presses Alt+R or clicks the toolbar action button on tabs that were already opened before the extension was installed or reloaded.
- **Host Permissions (<all_urls> / all sites)**:
  > Required so users can open rulers and measure elements on any website they choose to inspect while developing or designing web pages.

### Data Usage Declarations:
- Do you collect any personal information? **No**
- Does the extension transmit data to remote servers? **No**
- Privacy Policy URL:
  https://github.com/raisulsohan/LazyRuler/blob/main/PRIVACY.md

---

## 3. How to Zip for Upload

Select the following files and folders and zip them (DO NOT zip the parent folder itself, zip the contents):
- manifest.json
- icons/
- src/

*(Exclude .git, .gitignore, dev, markdown files, etc.)*

You can directly upload the resulting .zip file to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
