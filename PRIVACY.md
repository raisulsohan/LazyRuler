# Privacy Policy for LazyRuler

**Last updated:** September 4, 2026

**Developer:** Raisul Sohan  
**Website:** [https://raisulsohan.com](https://raisulsohan.com)  
**Repository:** [https://github.com/raisulsohan/LazyRuler](https://github.com/raisulsohan/LazyRuler)

---

## 1. Overview

**LazyRuler** is an open-source browser extension designed for web designers and developers to measure elements, align layouts, and place draggable guides directly on web pages. 

We strongly respect your privacy. This extension operates with a **strict privacy-first model** and does **not** collect, store, track, transmit, or sell any personal data or browsing activity.

---

## 2. Information Collection and Use

- **No Personal Data:** We do not collect names, email addresses, IP addresses, location data, or credentials.
- **No Browsing History:** We do not monitor, log, or transmit the websites you visit or the content of the pages you inspect.
- **No Analytics or Trackers:** There are no third-party trackers, telemetry, advertising SDKs, or analytics services embedded in this extension.
- **No Remote Code:** All scripts, stylesheets, and assets are bundled locally within the extension. The extension executes zero remote code.

---

## 3. Data Stored Locally on Your Device

The extension only stores non-sensitive configuration data locally on your computer via the standard chrome.storage.local API:

1. **Guide Coordinates:** Draggable guide positions (X and Y coordinates) saved per website domain so your guides remain available when you revisit or reload that page.
2. **Display Mode Preference:** Your selected layout mode (Overlay, Push, or Auto-hide).

> [!NOTE]
> All stored data resides solely within your local browser storage. It is never transmitted across the network or shared with anyone. Clearing your browser data or uninstalling the extension immediately deletes all saved guides and settings.

---

## 4. Permissions Justification

In compliance with Google Chrome Web Store Single-Purpose and Minimal Permissions policies, here is why each permission is requested:

| Permission | Purpose |
|---|---|
| storage | Used exclusively to save ruler guide positions and user interface preferences locally on your device. |
| scripting | Used exclusively to inject the ruler overlay when you press Alt+R or click the toolbar icon on pages that were already loaded prior to installing or reloading the extension. |
| host_permissions (<all_urls>) | Required solely to allow the ruler, measurement overlay, and draggable guides to render on any webpage you choose to inspect. The extension does not read, scrape, or extract any website content. |

---

## 5. Third-Party Services

This extension does not integrate with, communicate with, or transfer data to any third-party services, APIs, or servers.

---

## 6. Changes to This Privacy Policy

If any changes are made to this Privacy Policy, the updated version will be published in this repository with a revised Last updated date.

---

## 7. Contact & Support

If you have any questions, inquiries, or feedback regarding this Privacy Policy, please contact:

- **Developer:** Raisul Sohan
- **Website:** [https://raisulsohan.com](https://raisulsohan.com)
- **GitHub:** [https://github.com/raisulsohan](https://github.com/raisulsohan)

---

Made by [Raisul Sohan](https://raisulsohan.com)
