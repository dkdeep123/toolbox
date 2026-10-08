# ToolBoxPro

> Free online calculators and everyday tools — fast, mobile-friendly, no sign-up required.

## Run locally

```bash
# Any static server works. Python example:
python -m http.server 8000
# Then open http://localhost:8000/toolboxpro/
```

> **Note:** The PWA Service Worker requires HTTPS (or `localhost`) to register.

---

## Production checklist

### ✅ Already done
- [x] Full SEO meta stack (title, description, keywords, canonical)
- [x] Open Graph + Twitter Card tags
- [x] JSON-LD structured data (WebSite + ItemList)
- [x] `sitemap.xml` + `robots.txt`
- [x] PWA manifest (`manifest.json`) + Service Worker (`sw.js`) — cache-first offline support
- [x] Resource hints: `preconnect`, `preload`
- [x] Accessibility: skip-link, ARIA roles/labels, live regions, focus trap in modal, keyboard nav
- [x] Focus-visible ring + reduced-motion media query
- [x] System dark-mode detection + `localStorage` persistence
- [x] Input validation with error highlighting + error messages
- [x] Enter-key submit in all forms
- [x] Copy-to-clipboard on every result
- [x] Toast notifications
- [x] Improved calculators: accurate age (y/m/d), rich unit converter (length/weight/temp), salary estimate
- [x] `defer` on script tag (non-blocking load)
- [x] `'use strict'` mode

### ⬜ Before going live
- [ ] **Replace domain** — update `https://toolboxpro.in/` across `sitemap.xml`, `robots.txt`, `index.html` (canonical + OG/Twitter URLs), and `sw.js`
- [ ] **PWA icons** — add `icons/icon-192.png` and `icons/icon-512.png` (192×192 and 512×512)
- [ ] **OG image** — add `og-image.png` (1200×630 px) to root
- [ ] **Analytics** — uncomment and configure the GA4 snippet in `<head>`; also add to Search Console
- [ ] **AdSense** — replace `.ad-slot` placeholder with approved `<ins class="adsbygoogle">` code
- [ ] **Legal pages** — create `privacy.html`, `terms.html`, `contact.html`
- [ ] **HTTPS** — deploy on HTTPS host (Cloudflare Pages, Vercel, Netlify, Firebase Hosting, etc.)
- [ ] **Submit sitemap** — `https://toolboxpro.in/sitemap.xml` → Google Search Console
- [ ] **Cache headers** — set `Cache-Control: max-age=31536000, immutable` for versioned CSS/JS assets

---

## File structure

```
toolboxpro/
├── index.html      ← Semantic HTML, full SEO, ARIA, PWA
├── styles.css      ← Design system, dark mode, animations, a11y
├── app.js          ← Tool logic, validation, PWA registration
├── manifest.json   ← PWA manifest
├── sw.js           ← Service Worker (cache-first)
├── robots.txt      ← Crawler rules
├── sitemap.xml     ← 14 URLs for Google indexing
└── icons/          ← Add icon-192.png, icon-512.png
```
