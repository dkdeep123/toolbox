'use strict';

/* ─────────────────────────────────────────
   Security Utilities
───────────────────────────────────────── */
/**
 * Escape a string for safe insertion into HTML context.
 * Prevents XSS from any user-supplied or computed text.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Allowed tool IDs — validated before any innerHTML render. */
const ALLOWED_TOOL_IDS = new Set([
  'age','emi','percentage','gst','unit','bmi','discount',
  'tip','ratio','number','date','salary','imgcompress','imgresize',
  'photoresize','imgtopdf','pdfmerge','pdfcompress','qrcode','videoshorts','sip','compound',
  'fd','ppf','lumpsum','wordcount','password','caseconverter','base64','jsonformat','colorpicker','markdown',
  'scientific'
]);

/** Max file size accepted by image tools: 25 MB */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** Allowed MIME types for image tools */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg','image/png','image/webp','image/gif','image/bmp', 'image/jpg', 'image/svg+xml'
]);


/* ─────────────────────────────────────────
   Tool Registry (Structured with Image & PDF First)
───────────────────────────────────────── */
const TOOLS = [
  // ── Image Tools ──
  { id: 'imgcompress', name: 'Image Compressor',           icon: '🗜️', iconName: 'image-compress', cat: 'image',   desc: 'Compress JPG, PNG & WebP images with custom quality & live preview.' },
  { id: 'imgresize',   name: 'Image Resizer',              icon: '🖼️', iconName: 'image-resize',   cat: 'image',   desc: 'Resize images to exact dimensions or percentage with aspect ratio lock.' },
  { id: 'photoresize', name: 'Photo & Signature Resizer',   icon: '✍️', iconName: 'photo-signature',cat: 'image',   desc: 'Resize photos & signatures to exact px dimensions or target KB file size.' },
  { id: 'videoshorts', name: 'Video to Shorts Splitter', icon: '🎬', iconName: 'video-shorts', cat: 'image',   desc: 'Auto-split videos into 15s/30s/60s viral 9:16 vertical Shorts & Reels with blurred background or crop.' },
  { id: 'imgtopdf',    name: 'Image to PDF Converter',      icon: '📄', iconName: 'image-to-pdf',   cat: 'image',   desc: 'Convert multiple images into a clean PDF with custom page size & margins.' },

  // ── PDF Tools ──
  { id: 'pdfmerge',    name: 'PDF Merger',                  icon: '📑', iconName: 'pdf-merge',      cat: 'pdf',     desc: 'Merge multiple PDF files in your preferred sequence in seconds.' },
  { id: 'pdfcompress', name: 'PDF Compressor',             icon: '🗜️', iconName: 'pdf-compress',   cat: 'pdf',     desc: 'Compress and optimize PDF file sizes directly in your browser.' },

  // ── Finance Tools ──
  { id: 'sip',         name: 'SIP Calculator',              icon: '📈', iconName: 'sip',            cat: 'finance', desc: 'Calculate mutual fund SIP maturity wealth, interest gain, and investment growth.' },
  { id: 'emi',         name: 'EMI Calculator',              icon: '💰', iconName: 'emi',            cat: 'finance', desc: 'Calculate monthly loan EMI with Reducing Balance vs Flat Rate comparison & amortisation schedule.' },
  { id: 'compound',    name: 'Compound Interest Calculator',icon: '💹', iconName: 'compound',       cat: 'finance', desc: 'Calculate compound interest, future wealth maturity, and annual growth with flexible compounding frequencies.' },
  { id: 'fd',          name: 'Fixed Deposit (FD) Calculator', icon: '🏦', iconName: 'fd',           cat: 'finance', desc: 'Calculate bank FD maturity value, quarterly compound interest, and milestone returns.' },
  { id: 'ppf',         name: 'PPF Calculator',              icon: '🛡️', iconName: 'ppf',           cat: 'finance', desc: 'Calculate 15-year Public Provident Fund maturity wealth, tax-free interest, and Section 80C returns.' },
  { id: 'lumpsum',     name: 'Lump Sum Calculator',         icon: '💰', iconName: 'lumpsum',       cat: 'finance', desc: 'Calculate mutual fund lump sum investment growth, wealth created, and compounding returns.' },
  { id: 'gst',         name: 'GST Calculator',              icon: '🧾', iconName: 'gst',            cat: 'finance', desc: 'Add or subtract GST from any amount with standard tax slabs.' },
  { id: 'salary',      name: 'Salary Calculator',           icon: '💵', iconName: 'salary',         cat: 'finance', desc: 'Calculate in-hand monthly salary and annual take-home deductions.' },
  { id: 'discount',    name: 'Discount Calculator',         icon: '🏷️', iconName: 'discount',       cat: 'finance', desc: 'Find discounted final prices, savings amount, and percentage off.' },
  { id: 'tip',         name: 'Tip Calculator',              icon: '🍽️', iconName: 'tip',            cat: 'finance', desc: 'Calculate tip percentages and split restaurant bills evenly.' },

  // ── Math Tools ──
  { id: 'percentage',  name: 'Percentage Calculator',       icon: '％', iconName: 'percentage',     cat: 'math',    desc: 'Compute percentage differences, increases, decreases, and fractions.' },
  { id: 'ratio',       name: 'Ratio Calculator',            icon: '🔢', iconName: 'ratio',          cat: 'math',    desc: 'Simplify mathematical ratios and compute proportional values.' },
  { id: 'number',      name: 'Number Converter',            icon: '🔁', iconName: 'number',         cat: 'math',    desc: 'Convert numbers across decimal, binary, hex, and roman numerals.' },
  { id: 'scientific',  name: 'Scientific Calculator',       icon: '🧮', iconName: 'scientific',     cat: 'math',    desc: 'Advanced scientific calculator with trigonometry, logarithms, powers, roots, factorials, and constants.' },

  // ── Utility Tools ──
  { id: 'wordcount',   name: 'Word & Character Counter',    icon: '📝', iconName: 'wordcount',      cat: 'utility', desc: 'Count words, characters, sentences, paragraphs, reading time, and social media limits.' },
  { id: 'password',    name: 'Password Generator',         icon: '🔐', iconName: 'password',       cat: 'utility', desc: 'Generate strong, cryptographically secure passwords with custom length & entropy score.' },
  { id: 'caseconverter',name: 'Text Case Converter',        icon: '🔤', iconName: 'caseconverter',  cat: 'utility', desc: 'Convert text to UPPERCASE, lowercase, Title Case, camelCase, snake_case, and kebab-case.' },
  { id: 'base64',      name: 'Base64 Encoder & Decoder',   icon: '🔄', iconName: 'base64',         cat: 'utility', desc: 'Encode and decode UTF-8 text and strings to and from standard or URL-safe Base64.' },
  { id: 'jsonformat',  name: 'JSON Formatter & Validator',  icon: '✨', iconName: 'jsonformat',     cat: 'utility', desc: 'Beautify, indent, minify, and validate JSON data with instant syntax error detection.' },
  { id: 'colorpicker', name: 'Color Picker & Converter',   icon: '🎨', iconName: 'colorpicker',    cat: 'utility', desc: 'Pick colors, convert between HEX, RGB, HSL, CMYK, and check WCAG contrast accessibility.' },
  { id: 'markdown',    name: 'Markdown to HTML Previewer',  icon: '📑', iconName: 'markdown',       cat: 'utility', desc: 'Live Markdown text editor with real-time rendered HTML preview and one-click export.' },
  { id: 'age',         name: 'Age Calculator',             icon: '🎂', iconName: 'age',            cat: 'utility', desc: 'Calculate exact chronological age in years, months, and days.' },
  { id: 'unit',        name: 'Unit Converter',              icon: '📏', iconName: 'unit',           cat: 'utility', desc: 'Convert length, mass, temperature, speed, data storage, and lab units.' },
  { id: 'date',        name: 'Date Difference',             icon: '📅', iconName: 'date',           cat: 'utility', desc: 'Compute exact day, week, and month intervals between two dates.' },
  { id: 'bmi',         name: 'BMI Calculator',              icon: '⚖️',  iconName: 'bmi',            cat: 'utility', desc: 'Assess body mass index according to standard health categories.' },
  { id: 'qrcode',      name: 'QR Code Generator',          icon: '📱', iconName: 'qrcode',         cat: 'utility', desc: 'Create custom QR codes for URLs, Wi-Fi networks, text, and contacts.' },
];

/* Category display metadata for sectional organization */
const CATEGORIES = [
  { id: 'image',   name: 'Image Tools',   desc: 'Resize, compress and convert images effortlessly.' },
  { id: 'pdf',     name: 'PDF Tools',     desc: 'Merge, compress and organize PDF documents privately.' },
  { id: 'finance', name: 'Finance Tools', desc: 'Calculators for loans, taxes, salary and commercial savings.' },
  { id: 'math',    name: 'Math Tools',    desc: 'Solve percentages, ratios, and numeric conversions.' },
  { id: 'utility', name: 'Utility Tools', desc: 'Everyday utilities for dates, units, QR codes and calculations.' }
];

/* Clean SaaS Outline SVG Icons & Tool Logos */
function getToolSvgIcon(iconName) {
  switch (iconName) {
    case 'video-shorts':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="5" y="2" width="14" height="20" rx="3" stroke-width="2"/>
        <polygon points="10 8 16 12 10 16" fill="var(--accent)" stroke="var(--accent)" stroke-width="1.5"/>
        <line x1="5" y1="6" x2="19" y2="6" stroke-width="1.5" stroke-dasharray="2 2"/>
        <line x1="5" y1="18" x2="19" y2="18" stroke-width="1.5" stroke-dasharray="2 2"/>
      </svg>`;
    case 'image-compress':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <path d="M21 15l-5-5L5 21"/>
        <path d="M12 7v5m-2-2l2 2 2-2" stroke="var(--accent)" stroke-width="2.2"/>
        <path d="M12 17v-4m-2 2l2-2 2 2" stroke="var(--accent)" stroke-width="2.2"/>
      </svg>`;
    case 'image-resize':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M15 3h6v6"/>
        <path d="M9 21H3v-6"/>
        <path d="M21 3l-7.5 7.5"/>
        <path d="M3 21l7.5-7.5"/>
        <rect x="7" y="7" width="10" height="10" rx="2" stroke-dasharray="2 2" stroke-width="1.8"/>
      </svg>`;
    case 'photo-signature':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 18.5 3 20l1.5-4L16.5 3.5z"/>
        <path d="M15 5l4 4"/>
        <path d="M3 22c2-1 4-1 6-1s4 1 6 1 4-1 6-1" stroke-width="1.8"/>
      </svg>`;
    case 'image-to-pdf':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <rect x="7" y="11" width="10" height="7" rx="1.5" stroke-width="1.8"/>
        <circle cx="10" cy="13.5" r="1" fill="currentColor"/>
        <polyline points="7 17 11 14 17 17"/>
      </svg>`;
    case 'pdf-merge':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M8 2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
        <path d="M4 8v12a2 2 0 0 0 2 2h10"/>
        <path d="M12 7v6m-3-3l3 3 3-3" stroke="var(--accent)" stroke-width="2.2"/>
      </svg>`;
    case 'pdf-compress':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M12 11v6m-2.5-2.5L12 17l2.5-2.5" stroke="var(--accent)" stroke-width="2.2"/>
        <path d="M9 11h6" stroke-width="1.5"/>
      </svg>`;
    case 'sip':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M3 3v18h18"/>
        <path d="M18.5 8.5L12.5 14.5L9 11L3.5 16.5" stroke="var(--accent)" stroke-width="2.2"/>
        <polyline points="14 8.5 18.5 8.5 18.5 13" stroke="var(--accent)" stroke-width="2.2"/>
        <circle cx="18.5" cy="8.5" r="1.5" fill="var(--accent)"/>
      </svg>`;
    case 'compound':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M3 3v18h18"/>
        <path d="M4 17c4-1 8-5 11-10 2-3 4-4 6-4" stroke="var(--accent)" stroke-width="2.2"/>
        <circle cx="21" cy="3" r="1.5" fill="var(--accent)"/>
        <path d="M7 14h.01M11 11h.01M15 7h.01" stroke="currentColor" stroke-width="3"/>
      </svg>`;
    case 'emi':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="2" y="4" width="20" height="16" rx="3" stroke-width="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
        <rect x="6" y="14" width="3.5" height="2.5" rx="0.5" fill="currentColor"/>
        <line x1="13" y1="15" x2="18" y2="15" stroke-width="2"/>
        <circle cx="18" cy="7" r="1.2" fill="currentColor"/>
      </svg>`;
    case 'gst':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M4 2v20l2.5-1.5 2.5 1.5 2.5-1.5 2.5 1.5 2.5-1.5 2.5 1.5 2.5-1.5 2.5 1.5V2l-2.5 1.5L16.5 2 14 3.5 11.5 2 9 3.5 6.5 2 4 3.5z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="16" y2="11"/>
        <line x1="8" y1="15" x2="13" y2="15"/>
      </svg>`;
    case 'salary':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="2" y="6" width="20" height="13" rx="2.5"/>
        <circle cx="12" cy="12.5" r="2.5" stroke="var(--accent)" stroke-width="2.2"/>
        <path d="M6 10h.01M18 15h.01"/>
        <line x1="12" y1="2" x2="12" y2="4"/>
      </svg>`;
    case 'discount':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <circle cx="7" cy="7" r="2" fill="currentColor"/>
        <line x1="10.5" y1="13.5" x2="14.5" y2="17.5" stroke-width="2"/>
        <circle cx="11.5" cy="16.5" r="0.8" fill="currentColor"/>
        <circle cx="13.5" cy="14.5" r="0.8" fill="currentColor"/>
      </svg>`;
    case 'tip':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="2" x2="6" y2="5"/>
        <line x1="10" y1="2" x2="10" y2="5"/>
        <line x1="14" y1="2" x2="14" y2="5"/>
      </svg>`;
    case 'percentage':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <line x1="19" y1="5" x2="5" y2="19" stroke-width="2.5"/>
        <circle cx="6.5" cy="6.5" r="2.8" stroke="var(--accent)" stroke-width="2.2"/>
        <circle cx="17.5" cy="17.5" r="2.8" stroke="var(--accent)" stroke-width="2.2"/>
      </svg>`;
    case 'ratio':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <circle cx="9" cy="12" r="2" fill="currentColor"/>
        <circle cx="15" cy="12" r="2" fill="currentColor"/>
      </svg>`;
    case 'number':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        <text x="9" y="15" font-size="7" font-weight="bold" fill="currentColor" stroke="none">10</text>
      </svg>`;
    case 'scientific':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="3" y="2" width="18" height="20" rx="3" stroke-width="2"/>
        <rect x="6" y="5" width="12" height="4" rx="1" fill="none" stroke-width="1.8"/>
        <path d="M7 13h2M8 12v2" stroke="var(--accent)" stroke-width="1.8"/>
        <path d="M14 13h3" stroke-width="1.8"/>
        <path d="M7 17l3 3M10 17l-3 3" stroke-width="1.8"/>
        <path d="M14 17h3M14 20h3" stroke="var(--accent)" stroke-width="1.8"/>
      </svg>`;
    case 'age':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>
        <line x1="8" y1="11" x2="8" y2="7"/>
        <line x1="12" y1="11" x2="12" y2="7"/>
        <line x1="16" y1="11" x2="16" y2="7"/>
        <circle cx="8" cy="4.5" r="1" fill="currentColor"/>
        <circle cx="12" cy="4.5" r="1" fill="currentColor"/>
        <circle cx="16" cy="4.5" r="1" fill="currentColor"/>
      </svg>`;
    case 'unit':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M21.3 8.7 8.7 21.3c-.4.4-1 .4-1.4 0l-4.6-4.6c-.4-.4-.4-1 0-1.4L15.3 2.7c.4-.4 1-.4 1.4 0l4.6 4.6c.4.4.4 1 0 1.4z"/>
        <line x1="7.5" y1="10.5" x2="9.5" y2="12.5"/>
        <line x1="10.5" y1="7.5" x2="13" y2="10"/>
        <line x1="13.5" y1="4.5" x2="16" y2="7"/>
      </svg>`;
    case 'date':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="3" y="4" width="18" height="18" rx="3"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="8" cy="14" r="1" fill="currentColor"/>
        <circle cx="12" cy="14" r="1" fill="currentColor"/>
        <circle cx="16" cy="14" r="1" fill="currentColor"/>
        <circle cx="8" cy="18" r="1" fill="currentColor"/>
        <circle cx="12" cy="18" r="1" fill="currentColor"/>
      </svg>`;
    case 'bmi':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="M7 21h10"/>
        <path d="M12 3v18"/>
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
      </svg>`;
    case 'qrcode':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="5.5" y="5.5" width="2" height="2" fill="currentColor"/>
        <rect x="16.5" y="5.5" width="2" height="2" fill="currentColor"/>
        <rect x="5.5" y="16.5" width="2" height="2" fill="currentColor"/>
        <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
        <rect x="18" y="18" width="3" height="3" fill="currentColor"/>
        <rect x="14" y="18" width="3" height="3"/>
        <rect x="18" y="14" width="3" height="3"/>
      </svg>`;
    case 'fd':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M3 21h18"/>
        <path d="M3 10h18"/>
        <path d="M12 3l9 4H3l9-4z"/>
        <path d="M5 10v8"/>
        <path d="M9 10v8"/>
        <path d="M15 10v8"/>
        <path d="M19 10v8"/>
      </svg>`;
    case 'ppf':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4" stroke="var(--accent)" stroke-width="2.2"/>
      </svg>`;
    case 'lumpsum':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v10"/>
        <path d="M9 10h6a2 2 0 0 1 0 4H9"/>
        <path d="M15 14l3 4" stroke="var(--accent)" stroke-width="2.2"/>
      </svg>`;
    case 'wordcount':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>`;
    case 'password':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="12" cy="16" r="1.5" fill="var(--accent)"/>
        <path d="M12 17.5V19"/>
      </svg>`;
    case 'caseconverter':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M3 17l4-9 4 9"/>
        <path d="M4.5 14h5"/>
        <path d="M15 11v6a2 2 0 0 0 4 0v-6"/>
        <path d="M19 14h-4"/>
        <path d="M14 7l3-3 3 3" stroke="var(--accent)" stroke-width="2"/>
      </svg>`;
    case 'base64':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <polyline points="16 3 21 3 21 8"/>
        <line x1="4" y1="20" x2="21" y2="3"/>
        <polyline points="21 16 21 21 16 21"/>
        <line x1="15" y1="15" x2="21" y2="21"/>
        <polyline points="8 21 3 21 3 16"/>
        <line x1="3" y1="21" x2="9" y2="15"/>
      </svg>`;
    case 'jsonformat':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <path d="M7 4a3 3 0 0 0-3 3v2a3 3 0 0 1-3 3 3 3 0 0 1 3 3v2a3 3 0 0 0 3 3"/>
        <path d="M17 4a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3 3 3 0 0 0-3 3v2a3 3 0 0 1-3 3"/>
        <circle cx="12" cy="12" r="1.5" fill="var(--accent)"/>
      </svg>`;
    case 'colorpicker':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3a9 9 0 0 1 9 9c0 3-2 5-4 5h-2a2 2 0 0 0-2 2c0 1.1-.9 2-2 2a9 9 0 0 1-1-18z"/>
        <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="7.5" r="1.5" fill="currentColor"/>
        <circle cx="16.5" cy="10.5" r="1.5" fill="currentColor"/>
      </svg>`;
    case 'markdown':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M6 16V8l3.5 4L13 8v8"/>
        <path d="M18 10l-2.5 3.5h5L18 10z" fill="var(--accent)"/>
        <path d="M18 13.5V16"/>
      </svg>`;
    default:
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`;
  }
}

/* ─────────────────────────────────────────
   DOM References
───────────────────────────────────────── */
const grid    = document.getElementById('grid');
const search  = document.getElementById('search');
const count   = document.getElementById('count');
const empty   = document.getElementById('empty');
const modal   = document.getElementById('modal');
const modalBox = modal ? modal.querySelector('.modal-box') : null;
const content = document.getElementById('toolContent');
const themeBtn = document.getElementById('theme');
const toast   = document.getElementById('toast');

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let category = 'all';
let toastTimer = null;
let previousFocus = null; // for restoring focus on modal close

/* ─────────────────────────────────────────
   Theme
───────────────────────────────────────── */
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  if (themeBtn) {
    themeBtn.textContent = dark ? '☀' : '☾';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  try { localStorage.setItem('tbp-theme', dark ? 'dark' : 'light'); } catch (_) {}
}

// Restore saved theme: Default to Light mode on open ("default me lite mode or ambient me rhne do jb khulta h")
(function initTheme() {
  let saved;
  try { saved = localStorage.getItem('tbp-theme'); } catch (_) {}
  // Default to light mode (dark is only applied if explicitly saved as 'dark' by user)
  applyTheme(saved === 'dark');
})();

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    themeBtn.classList.remove('theme-spin');
    void themeBtn.offsetWidth;
    themeBtn.classList.add('theme-spin');
    applyTheme(!document.body.classList.contains('dark'));
  });
}

const TOOL_BADGES = {
  'sip': { label: '⭐ Popular', cls: 'badge-hot' },
  'compound': { label: '✨ Growth', cls: 'badge-finance' },
  'videoshorts': { label: '🔥 AI Viral', cls: 'badge-hot' },
  'imgcompress': { label: '🔥 Popular', cls: 'badge-hot' },
  'photoresize': { label: 'Govt Forms', cls: 'badge-gov' },
  'imgtopdf':    { label: 'PDF Export', cls: 'badge-instant' },
  'pdfmerge':    { label: '⚡ Instant', cls: 'badge-instant' },
  'pdfcompress': { label: 'High Ratio', cls: 'badge-hot' },
  'emi':         { label: 'Loans', cls: 'badge-finance' },
  'gst':         { label: 'India Tax', cls: 'badge-tax' },
  'salary':      { label: 'In-Hand', cls: 'badge-finance' },
  'qrcode':      { label: '🔒 Private', cls: 'badge-priv' },
  'unit':        { label: '50+ Units', cls: 'badge-util' },
  'age':         { label: 'Exact Y/M/D', cls: 'badge-util' },
};
const TOOL_ID_TO_SLUG = {
  'videoshorts': 'video-to-shorts',
  'imgcompress': 'image-compressor',
  'imgresize':   'image-resizer',
  'photoresize': 'photo-resizer',
  'imgtopdf':    'image-to-pdf',
  'pdfmerge':    'pdf-merger',
  'pdfcompress': 'pdf-compressor',
  'emi':         'emi-calculator',
  'gst':         'gst-calculator',
  'salary':      'salary-calculator',
  'discount':    'discount-calculator',
  'tip':         'tip-calculator',
  'percentage':  'percentage-calculator',
  'ratio':       'ratio-calculator',
  'number':      'number-converter',
  'age':         'age-calculator',
  'unit':        'unit-converter',
  'date':        'date-difference-calculator',
  'bmi':         'bmi-calculator',
  'qrcode':      'qr-code-generator'
};

/* ─────────────────────────────────────────
   Grid & Category Section Rendering
───────────────────────────────────────── */
function buildToolCardHtml(t, idx) {
  const toolSlug = TOOL_ID_TO_SLUG[t.id] || t.id;
  return `
    <a
      href="${toolSlug}"
      class="tool reveal"
      data-reveal="fade-up"
      style="transition-delay: ${(idx % 8) * 35}ms;"

      data-id="${t.id}"
      data-cat="${t.cat}"
      aria-label="Open ${escapeHtml(t.name)}"
    >
      <div class="tool-top">
        <div class="tool-icon" aria-hidden="true">${getToolSvgIcon(t.iconName)}</div>
        <div class="tool-top-badges">
          ${(TOOL_BADGES[t.id] ? `<span class="tool-feat-badge ${TOOL_BADGES[t.id].cls}">${TOOL_BADGES[t.id].label}</span>` : '')}
          <span class="tool-cat-badge">${escapeHtml(t.cat.toUpperCase())}</span>
        </div>
      </div>
      <div class="tool-body">
        <h3 class="tool-name">${escapeHtml(t.name)}</h3>
        <p class="tool-desc">${escapeHtml(t.desc)}</p>
      </div>
      <div class="tool-footer">
        <span class="tool-action-btn">
          <span>Open Tool</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </span>
      </div>
    </a>
  `;
}

function render() {
  if (!grid) return;
  const q = search ? search.value.toLowerCase().trim() : '';

  if (category === 'all' && !q) {
    // Structured layout: Image -> PDF -> Finance -> Math -> Utility sections
    let totalCount = 0;
    const sectionsHtml = CATEGORIES.map(cat => {
      const catTools = TOOLS.filter(t => t.cat === cat.id);
      totalCount += catTools.length;
      return `
        <div class="category-block" data-category="${cat.id}">
          <div class="category-head">
            <div>
              <h3 class="category-title">${cat.name}</h3>
              <p class="category-desc">${cat.desc}</p>
            </div>
            <div class="category-meta">
              <span class="category-count">${catTools.length} tools</span>
              <button type="button" class="category-view-all" data-target-cat="${cat.id}">View all →</button>
            </div>
          </div>
          <div class="tool-grid">
            ${catTools.map((t, idx) => buildToolCardHtml(t, idx)).join('')}
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = sectionsHtml;
    if (count) count.textContent = `${totalCount} tools`;
    if (empty) empty.classList.add('hidden');

    // Wire up "View all" links
    grid.querySelectorAll('.category-view-all').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetCat = btn.dataset.targetCat;
        const chip = document.querySelector(`.chip[data-cat="${targetCat}"]`);
        if (chip) chip.click();
      });
    });
  } else {
    // Filtered by specific category or search query
    const list = TOOLS.filter(t =>
      (category === 'all' || t.cat === category) &&
      (t.name + ' ' + t.desc).toLowerCase().includes(q)
    );

    grid.innerHTML = `
      <div class="tool-grid">
        ${list.map((t, idx) => buildToolCardHtml(t, idx)).join('')}
      </div>
    `;

    if (count) count.textContent = `${list.length} tool${list.length !== 1 ? 's' : ''}`;
    if (empty) empty.classList.toggle('hidden', list.length > 0);
  }

  // Attach click + keyboard handlers to each card
  grid.querySelectorAll('.tool').forEach(card => {
    card.addEventListener('click', e => {
      // Allow user to open in new tab with Cmd/Ctrl/middle-click
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.which === 2 || e.button === 1) return;
      e.preventDefault();
      openTool(card.dataset.id);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTool(card.dataset.id);
      }
    });
  });

  // Re-observe newly rendered cards for scroll reveal
  if (typeof observeRevealElements === 'function') {
    observeRevealElements(grid);
    if (typeof initMouseSpotlightGlow === 'function') initMouseSpotlightGlow();
initHeroInteractiveDemo();
initHeroPreviewCards();
initQuickSearchButtons();
function initHeroPreviewCards() {
  document.querySelectorAll('.preview-card, .preview-mini-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (e.target.closest('#hero-loan-slider') || e.target.closest('input')) return;
      const toolId = card.dataset.id;
      if (toolId && ALLOWED_TOOL_IDS.has(toolId)) {
        openTool(toolId);
      }
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('#hero-loan-slider') || e.target.closest('input')) return;
        const toolId = card.dataset.id;
        if (toolId && ALLOWED_TOOL_IDS.has(toolId)) {
          e.preventDefault();
          openTool(toolId);
        }
      }
    });
  });
}

function initQuickSearchButtons() {
  document.querySelectorAll('.quick button').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.query;
      if (search && q) {
        search.value = q;
        render();
        const toolsSec = document.getElementById('tools');
        if (toolsSec) {
          toolsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

  }
}

/* ─────────────────────────────────────────
   Search & Interactive Suggestions Dropdown
───────────────────────────────────────── */
const searchDropdown = document.getElementById('search-dropdown');
let activeDropdownIndex = -1;
let currentMatchingTools = [];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

function updateSearchDropdown() {
  if (!searchDropdown || !search) return;
  const q = search.value.trim().toLowerCase();

  if (!q) {
    searchDropdown.innerHTML = '';
    searchDropdown.classList.add('hidden');
    currentMatchingTools = [];
    activeDropdownIndex = -1;
    return;
  }

  currentMatchingTools = TOOLS.filter(t =>
    (t.name + ' ' + t.desc).toLowerCase().includes(q)
  );

  activeDropdownIndex = -1;

  if (currentMatchingTools.length === 0) {
    searchDropdown.innerHTML = `
      <div class="search-empty-state" role="status">
        <span class="search-empty-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </span>
        <div>No matching tools found for "<strong>${escapeHtml(q)}</strong>"</div>
      </div>
    `;
    searchDropdown.classList.remove('hidden');
    return;
  }

  searchDropdown.innerHTML = currentMatchingTools.slice(0, 7).map((tool, idx) => {
    const toolSlug = TOOL_ID_TO_SLUG[tool.id] || tool.id;
    return `
    <a
      href="${toolSlug}"
      class="search-item"
      role="option"
      tabindex="-1"
      data-id="${tool.id}"
      data-index="${idx}"
      id="search-opt-${idx}"
    >
      <div class="search-item-icon" aria-hidden="true">${getToolSvgIcon(tool.iconName)}</div>
      <div class="search-item-info">
        <div class="search-item-title">${highlightMatch(tool.name, q)}</div>
        <div class="search-item-desc">${highlightMatch(tool.desc, q)}</div>
      </div>
      <span class="tool-arrow" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
      </span>
    </a>
  `;
  }).join('');

  searchDropdown.classList.remove('hidden');

  searchDropdown.querySelectorAll('.search-item').forEach((item, idx) => {
    item.addEventListener('mouseenter', () => {
      setDropdownActiveIndex(idx);
    });
    item.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.which === 2 || e.button === 1) return;
      e.preventDefault();
      closeSearchDropdown();
      openTool(item.dataset.id);
    });
  });
}

function setDropdownActiveIndex(idx) {
  activeDropdownIndex = idx;
  const items = searchDropdown ? searchDropdown.querySelectorAll('.search-item') : [];
  items.forEach((item, i) => {
    const isSel = i === activeDropdownIndex;
    item.classList.toggle('is-selected', isSel);
    if (isSel) {
      item.setAttribute('aria-selected', 'true');
      search.setAttribute('aria-activedescendant', item.id);
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.removeAttribute('aria-selected');
    }
  });
  if (activeDropdownIndex === -1 && search) {
    search.removeAttribute('aria-activedescendant');
  }
}

function closeSearchDropdown() {
  if (searchDropdown) {
    searchDropdown.classList.add('hidden');
    searchDropdown.innerHTML = '';
  }
  activeDropdownIndex = -1;
  currentMatchingTools = [];
  if (search) search.removeAttribute('aria-activedescendant');
}

if (search) {
  search.addEventListener('input', () => {
    render();
    updateSearchDropdown();
  });
  search.addEventListener('search', () => {
    render();
    updateSearchDropdown();
  });
  search.addEventListener('focus', () => {
    if (search.value.trim().length > 0) {
      updateSearchDropdown();
    }
  });

  search.addEventListener('keydown', e => {
    const items = searchDropdown ? searchDropdown.querySelectorAll('.search-item') : [];
    const count = items.length;

    if (e.key === 'ArrowDown') {
      if (count > 0) {
        e.preventDefault();
        const next = (activeDropdownIndex + 1) % count;
        setDropdownActiveIndex(next);
      }
    } else if (e.key === 'ArrowUp') {
      if (count > 0) {
        e.preventDefault();
        const prev = activeDropdownIndex <= 0 ? count - 1 : activeDropdownIndex - 1;
        setDropdownActiveIndex(prev);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeDropdownIndex >= 0 && activeDropdownIndex < currentMatchingTools.length) {
        const selected = currentMatchingTools[activeDropdownIndex];
        closeSearchDropdown();
        openTool(selected.id);
        return;
      }
      const q = search.value.toLowerCase().trim();
      const list = TOOLS.filter(t =>
        (category === 'all' || t.cat === category) &&
        (t.name + ' ' + t.desc).toLowerCase().includes(q)
      );
      if (list.length > 0) {
        closeSearchDropdown();
        openTool(list[0].id);
      }
    } else if (e.key === 'Escape') {
      if (searchDropdown && !searchDropdown.classList.contains('hidden')) {
        e.preventDefault();
        closeSearchDropdown();
      }
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) {
      closeSearchDropdown();
    }
  });
}

// Keyboard shortcut ⌘K / Ctrl+K
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && search) {
    e.preventDefault();
    search.focus();
    search.select();
  }
  // Escape: close modal
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

// Category chips
document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => {
      x.classList.remove('active');
      x.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    category = btn.dataset.cat;
    render();
  });
});

// Quick search pills
document.querySelectorAll('.quick button').forEach(btn => {
  btn.addEventListener('click', () => {
    search.value = btn.dataset.query;
    document.getElementById('tools').scrollIntoView({ behavior: 'smooth' });
    render();
    search.focus();
  });
});

// Bind popular tools
document.querySelectorAll('.popular-grid article').forEach(card => {
  card.addEventListener('click', () => openTool(card.dataset.id));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTool(card.dataset.id); }
  });
});

// Bind hero live preview widget cards
document.querySelectorAll('.hero-preview-widget [data-id]').forEach(card => {
  card.addEventListener('click', () => openTool(card.dataset.id));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTool(card.dataset.id); }
  });
});

/* ─────────────────────────────────────────
   Modal
───────────────────────────────────────── */
let isClosingModal = false;

function openTool(id) {
  // Validate id against known allowlist to prevent prototype pollution / unexpected renders
  if (!ALLOWED_TOOL_IDS.has(id)) return;
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;

  isClosingModal = false;
  previousFocus = document.activeElement;
  content.innerHTML = buildForm(id, tool);
  if (modal) {
    modal.classList.remove('modal-closing');
    modal.classList.remove('hidden');
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('modal-open');
  }

  // Set modal or card title for screen readers
  const heading = content.querySelector('h2');
  if (heading && modal) {
    heading.id = 'modal-title';
    modal.setAttribute('aria-labelledby', 'modal-title');
  }

  // Focus first interactive element
  requestAnimationFrame(() => {
    const root = modalBox || content;
    const first = root.querySelector('input, button, select, [tabindex="0"]');
    if (first && modal) first.focus();
  });

  if (modalBox) trapFocus(modalBox);

  // Wire up Enter key for inputs inside the form
  const formRoot = modalBox || content;
  formRoot.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const calcBtn = formRoot.querySelector('button.primary');
        if (calcBtn) calcBtn.click();
      }
    });
  });

  // Specialized Tool Initialization
  if (id === 'unit') {
    if (typeof onUnitCatChange === 'function') {
      onUnitCatChange();
    }
  }
  if (id === 'imgcompress') {
    if (typeof icInit === 'function') icInit();
  }
  if (id === 'photoresize') {
    if (typeof prApplyGovtPreset === 'function') prApplyGovtPreset();
  }
  if (id === 'imgresize') {
    if (typeof irApplyGovtPreset === 'function') irApplyGovtPreset();
  }
  if (id === 'sip') {
    if (typeof calcSip === 'function') calcSip();
  }
  if (id === 'emi') {
    _emiMode = 'flat';
    if (typeof calcEmi === 'function') calcEmi();
  }
  if (id === 'compound') {
    if (typeof calcCompound === 'function') calcCompound();
  }
  if (id === 'fd') {
    if (typeof calcFd === 'function') calcFd();
  }
  if (id === 'ppf') {
    if (typeof calcPpf === 'function') calcPpf();
  }
  if (id === 'lumpsum') {
    if (typeof calcLumpsum === 'function') calcLumpsum();
  }
  if (id === 'wordcount') {
    if (typeof calcWordCount === 'function') calcWordCount();
  }
  if (id === 'password') {
    if (typeof genPassword === 'function') genPassword();
  }
  if (id === 'colorpicker') {
    if (typeof initColorPicker === 'function') initColorPicker();
  }
  if (id === 'markdown') {
    if (typeof renderMarkdown === 'function') renderMarkdown();
  }
  if (id === 'scientific') {
    if (typeof scInit === 'function') scInit();
  }
}

function closeModal() {
  if (!modal || modal.classList.contains('hidden') || isClosingModal) return;
  isClosingModal = true;
  modal.classList.add('modal-closing');

  // Smooth exit animation
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('modal-closing');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    isClosingModal = false;
    if (previousFocus) previousFocus.focus();
  }, 220);

  try {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  } catch (_) {}
}

const closeBtn = document.getElementById('close');
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (modal) {
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}

/* Focus trap for modal */
function trapFocus(container) {
  const focusable = () => [...container.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )];

  function handler(e) {
    if (e.key !== 'Tab') return;
    const els = focusable();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Remove old handler first (in case modal reopened)
  modal.removeEventListener('keydown', modal._trapHandler);
  modal._trapHandler = handler;
  modal.addEventListener('keydown', handler);
}

/* ─────────────────────────────────────────
   Toast
───────────────────────────────────────── */
function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ─────────────────────────────────────────
   Clipboard Copy (rate-limited)
───────────────────────────────────────── */
let _copyLastMs = 0;
function copyResult(text) {
  // Rate-limit: one copy per 1 s to prevent spam
  const now = Date.now();
  if (now - _copyLastMs < 1000) return;
  _copyLastMs = now;

  if (!navigator.clipboard) {
    showToast('⚠️ Clipboard not available');
    return;
  }
  navigator.clipboard.writeText(text).then(() => showToast('✓ Copied to clipboard!'));
}

/* ─────────────────────────────────────────
   Result Renderer
───────────────────────────────────────── */
function showResult(html, plainText) {
  const res = document.getElementById('res');
  const currentUrl = window.location.href.split('#')[0];
  const shareMsg = encodeURIComponent((plainText ? plainText + '\n\n' : '') + 'Calculated using ToolBoxPro: ' + currentUrl);
  res.innerHTML = `
    <div class="res-top-bar">
      <span class="res-badge">Result</span>
      <div class="res-actions">
        <a href="https://api.whatsapp.com/send?text=${shareMsg}" target="_blank" rel="noopener noreferrer" class="res-share-btn" aria-label="Share on WhatsApp" title="Share result on WhatsApp">💬 Share</a>
        <button type="button" class="copy-btn" aria-label="Copy result" title="Copy result">Copy</button>
      </div>
    </div>
    <div class="res-body">
      ${html}
    </div>
  `;
  res.classList.remove('hidden');
  const copyBtn = res.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    copyBtn.classList.add('copied');
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.textContent = 'Copy';
    }, 1500);
    const bodyEl = res.querySelector('.res-body');
    const fallbackText = bodyEl ? bodyEl.innerText.trim() : res.innerText.replace('✓ Copied!', '').replace('Copy', '').replace('💬 Share', '').replace('Result', '').trim();
    copyResult(plainText || fallbackText);
  });
}

function showError(msg) {
  const res = document.getElementById('res');
  // escapeHtml prevents XSS if msg ever contains user-supplied content
  res.innerHTML = `<span style="color:var(--danger);font-size:14px;font-weight:500">⚠ ${escapeHtml(msg)}</span>`;
  res.classList.remove('hidden');
}

/* ─────────────────────────────────────────
   Validation Helpers
───────────────────────────────────────── */
function getNum(id, label) {
  const el = document.getElementById(id);
  el.classList.remove('error');
  const v = parseFloat(el.value);
  if (isNaN(v) || el.value.trim() === '') {
    el.classList.add('error');
    el.focus();
    throw new Error(`Please enter a valid ${label}.`);
  }
  return v;
}

function getPositive(id, label) {
  const v = getNum(id, label);
  if (v <= 0) {
    document.getElementById(id).classList.add('error');
    throw new Error(`${label} must be greater than zero.`);
  }
  return v;
}

function getDate(id, label) {
  const el = document.getElementById(id);
  el.classList.remove('error');
  const d = new Date(el.value);
  if (!el.value || isNaN(d)) {
    el.classList.add('error');
    el.focus();
    throw new Error(`Please select a valid ${label}.`);
  }
  return d;
}

/* ─────────────────────────────────────────
   Form Templates
───────────────────────────────────────── */
function buildForm(id) {
  const forms = {
    age: `
      <h2>🎂 Age Calculator</h2>
      <p>Enter your date of birth to find your exact age.</p>
      <div class="form">
        <div><label for="dob">Date of birth</label><input id="dob" type="date" max="${new Date().toISOString().split('T')[0]}" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcAge()">Calculate Age</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    sip: `
      <h2>📈 SIP Calculator</h2>
      <p>Calculate future maturity value of monthly mutual fund investments and estimated wealth gained.</p>
      <div class="form sip-calc-form">
        <!-- Monthly Investment -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="sip_amount">Monthly Investment (₹)</label>
            <span class="sip-val-display" id="sip_amount_val">₹5,000</span>
          </div>
          <input id="sip_amount" type="number" min="500" max="10000000" step="500" value="5000" placeholder="5000" oninput="sipSyncInput('amount')" aria-required="true"/>
          <input id="sip_amount_range" type="range" min="500" max="100000" step="500" value="5000" oninput="sipSyncRange('amount')" aria-label="Monthly investment slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="sipSetAmount(1000)">₹1,000</button>
            <button type="button" class="preset-chip" onclick="sipSetAmount(2500)">₹2,500</button>
            <button type="button" class="preset-chip" onclick="sipSetAmount(5000)">₹5,000</button>
            <button type="button" class="preset-chip" onclick="sipSetAmount(10000)">₹10,000</button>
            <button type="button" class="preset-chip" onclick="sipSetAmount(25000)">₹25,000</button>
          </div>
        </div>

        <!-- Expected Return Rate (%) -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="sip_rate">Expected Annual Return Rate (p.a. %)</label>
            <span class="sip-val-display" id="sip_rate_val">12%</span>
          </div>
          <input id="sip_rate" type="number" min="1" max="50" step="0.5" value="12" placeholder="12" oninput="sipSyncInput('rate')" aria-required="true"/>
          <input id="sip_rate_range" type="range" min="1" max="30" step="0.5" value="12" oninput="sipSyncRange('rate')" aria-label="Expected return rate slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="sipSetRate(8)">8% (Conservative)</button>
            <button type="button" class="preset-chip" onclick="sipSetRate(12)">12% (Equity Fund)</button>
            <button type="button" class="preset-chip" onclick="sipSetRate(15)">15% (High Growth)</button>
          </div>
        </div>

        <!-- Time Period (Years) -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="sip_years">Investment Time Period (Years)</label>
            <span class="sip-val-display" id="sip_years_val">10 Yrs</span>
          </div>
          <input id="sip_years" type="number" min="1" max="40" step="1" value="10" placeholder="10" oninput="sipSyncInput('years')" aria-required="true"/>
          <input id="sip_years_range" type="range" min="1" max="35" step="1" value="10" oninput="sipSyncRange('years')" aria-label="Tenure slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="sipSetYears(3)">3 Yrs</button>
            <button type="button" class="preset-chip" onclick="sipSetYears(5)">5 Yrs</button>
            <button type="button" class="preset-chip" onclick="sipSetYears(10)">10 Yrs</button>
            <button type="button" class="preset-chip" onclick="sipSetYears(15)">15 Yrs</button>
            <button type="button" class="preset-chip" onclick="sipSetYears(20)">20 Yrs</button>
          </div>
        </div>

        <button class="primary" type="button" onclick="calcSip()">📊 Calculate SIP Wealth</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    emi: `
      <h2>💰 Loan EMI Calculator</h2>
      <p>Calculate monthly EMI with instant comparison between <strong>Flat Rate</strong> (Car / NBFC / Personal) and <strong>Reducing Balance</strong> (Bank Standard).</p>
      <div class="form sip-calc-form">
        <!-- Mode Tabs: Flat Rate vs Reducing Balance -->
        <div class="ic-mode-nav" role="tablist" aria-label="EMI calculation method">
          <button type="button" class="ic-mode-tab is-active" id="emi-tab-flat" onclick="emiSetMode('flat')" role="tab" aria-selected="true">
            <span class="tab-label">📊 Flat Rate</span>
            <span class="tab-desc">Car / NBFC</span>
          </button>
          <button type="button" class="ic-mode-tab" id="emi-tab-reducing" onclick="emiSetMode('reducing')" role="tab" aria-selected="false">
            <span class="tab-label">📉 Reducing Balance</span>
            <span class="tab-desc">Bank Standard</span>
          </button>
        </div>

        <!-- Loan Amount -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="loan">Loan Amount (₹)</label>
            <span class="sip-val-display" id="loan_val">₹5,00,000</span>
          </div>
          <input id="loan" type="number" min="10000" max="100000000" step="10000" value="500000" placeholder="500000" oninput="emiSyncInput('loan')" aria-required="true"/>
          <input id="loan_range" type="range" min="50000" max="10000000" step="25000" value="500000" oninput="emiSyncRange('loan')" aria-label="Loan amount slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="emiSetLoan(100000)">₹1 Lakh</button>
            <button type="button" class="preset-chip" onclick="emiSetLoan(500000)">₹5 Lakh</button>
            <button type="button" class="preset-chip" onclick="emiSetLoan(1000000)">₹10 Lakh</button>
            <button type="button" class="preset-chip" onclick="emiSetLoan(2500000)">₹25 Lakh</button>
            <button type="button" class="preset-chip" onclick="emiSetLoan(5000000)">₹50 Lakh</button>
          </div>
        </div>

        <!-- Interest Rate -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="rate">Annual Interest Rate (% p.a.)</label>
            <span class="sip-val-display" id="rate_val">8.5%</span>
          </div>
          <input id="rate" type="number" step="0.1" min="1" max="50" value="8.5" placeholder="8.5" oninput="emiSyncInput('rate')" aria-required="true"/>
          <input id="rate_range" type="range" min="5" max="25" step="0.1" value="8.5" oninput="emiSyncRange('rate')" aria-label="Interest rate slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="emiSetRate(8.0)">8.0%</button>
            <button type="button" class="preset-chip" onclick="emiSetRate(8.5)">8.5% (Home)</button>
            <button type="button" class="preset-chip" onclick="emiSetRate(9.5)">9.5% (Car)</button>
            <button type="button" class="preset-chip" onclick="emiSetRate(11.0)">11.0% (Personal)</button>
            <button type="button" class="preset-chip" onclick="emiSetRate(14.0)">14.0%</button>
          </div>
        </div>

        <!-- Tenure -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="years">Loan Tenure (Years)</label>
            <span class="sip-val-display" id="years_val">5 Yrs</span>
          </div>
          <input id="years" type="number" min="1" max="40" step="1" value="5" placeholder="5" oninput="emiSyncInput('years')" aria-required="true"/>
          <input id="years_range" type="range" min="1" max="30" step="1" value="5" oninput="emiSyncRange('years')" aria-label="Tenure slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="emiSetYears(1)">1 Yr</button>
            <button type="button" class="preset-chip" onclick="emiSetYears(3)">3 Yrs</button>
            <button type="button" class="preset-chip" onclick="emiSetYears(5)">5 Yrs</button>
            <button type="button" class="preset-chip" onclick="emiSetYears(10)">10 Yrs</button>
            <button type="button" class="preset-chip" onclick="emiSetYears(20)">20 Yrs</button>
          </div>
        </div>

        <button class="primary" type="button" onclick="calcEmi()">Calculate EMI</button>
        <div id="res" class="result"></div>
      </div>`,

    compound: `
      <h2>💹 Compound Interest Calculator</h2>
      <p>Calculate future wealth maturity, total compound interest, and growth comparison with simple interest across different compounding frequencies.</p>
      <div class="form sip-calc-form">
        <!-- Principal Investment -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="ci_principal">Initial Principal Amount (₹)</label>
            <span class="sip-val-display" id="ci_principal_val">₹1,00,000</span>
          </div>
          <input id="ci_principal" type="number" min="1000" max="100000000" step="5000" value="100000" placeholder="100000" oninput="ciSyncInput('principal')" aria-required="true"/>
          <input id="ci_principal_range" type="range" min="5000" max="5000000" step="5000" value="100000" oninput="ciSyncRange('principal')" aria-label="Principal slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="ciSetPrincipal(25000)">₹25,000</button>
            <button type="button" class="preset-chip" onclick="ciSetPrincipal(50000)">₹50,000</button>
            <button type="button" class="preset-chip" onclick="ciSetPrincipal(100000)">₹1 Lakh</button>
            <button type="button" class="preset-chip" onclick="ciSetPrincipal(500000)">₹5 Lakh</button>
            <button type="button" class="preset-chip" onclick="ciSetPrincipal(1000000)">₹10 Lakh</button>
          </div>
        </div>

        <!-- Interest Rate -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="ci_rate">Annual Interest Rate (% p.a.)</label>
            <span class="sip-val-display" id="ci_rate_val">8.5%</span>
          </div>
          <input id="ci_rate" type="number" step="0.1" min="0.5" max="50" value="8.5" placeholder="8.5" oninput="ciSyncInput('rate')" aria-required="true"/>
          <input id="ci_rate_range" type="range" min="1" max="30" step="0.1" value="8.5" oninput="ciSyncRange('rate')" aria-label="Interest rate slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="ciSetRate(6.5)">6.5% (Bank FD)</button>
            <button type="button" class="preset-chip" onclick="ciSetRate(7.1)">7.1% (PPF)</button>
            <button type="button" class="preset-chip" onclick="ciSetRate(8.5)">8.5% (Bonds)</button>
            <button type="button" class="preset-chip" onclick="ciSetRate(12.0)">12% (Mutual Fund)</button>
            <button type="button" class="preset-chip" onclick="ciSetRate(15.0)">15%</button>
          </div>
        </div>

        <!-- Tenure -->
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="ci_years">Time Period (Years)</label>
            <span class="sip-val-display" id="ci_years_val">10 Yrs</span>
          </div>
          <input id="ci_years" type="number" min="1" max="50" step="1" value="10" placeholder="10" oninput="ciSyncInput('years')" aria-required="true"/>
          <input id="ci_years_range" type="range" min="1" max="40" step="1" value="10" oninput="ciSyncRange('years')" aria-label="Years slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="ciSetYears(1)">1 Yr</button>
            <button type="button" class="preset-chip" onclick="ciSetYears(3)">3 Yrs</button>
            <button type="button" class="preset-chip" onclick="ciSetYears(5)">5 Yrs</button>
            <button type="button" class="preset-chip" onclick="ciSetYears(10)">10 Yrs</button>
            <button type="button" class="preset-chip" onclick="ciSetYears(20)">20 Yrs</button>
          </div>
        </div>

        <!-- Compounding Frequency -->
        <div class="sip-input-group">
          <label for="ci_freq" style="font-weight:600; font-size:13.5px; color:var(--text);">Compounding Frequency</label>
          <select id="ci_freq" class="form-select" onchange="calcCompound()" aria-label="Compounding Frequency" style="padding:8px 12px; border-radius:8px; border:1px solid var(--line); background:var(--surface); color:var(--text); font-weight:600;">
            <option value="1">Annually / Yearly (1 time/year)</option>
            <option value="2">Semi-Annually / Half-Yearly (2 times/year)</option>
            <option value="4" selected>Quarterly (4 times/year - Bank FD &amp; PPF)</option>
            <option value="12">Monthly (12 times/year)</option>
            <option value="365">Daily (365 times/year)</option>
          </select>
        </div>

        <button class="primary" type="button" onclick="calcCompound()">Calculate Compounding Growth</button>
        <div id="res" class="result"></div>
      </div>`,

    percentage: `
      <h2>％ Percentage Calculator</h2>
      <div class="form">
        <div><label for="pct_x">Percentage (%)</label><input id="pct_x" type="number" placeholder="20" aria-required="true"/></div>
        <div><label for="pct_y">Of what number</label><input id="pct_y" type="number" placeholder="500" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcPct()">Calculate</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    gst: `
      <h2>🧾 GST Calculator</h2>
      <div class="form">
        <div><label for="gst_amount">Amount (₹)</label><input id="gst_amount" type="number" min="0" placeholder="1000" aria-required="true"/></div>
        <div><label for="gst_rate">GST rate (%)</label>
          <select id="gst_rate" aria-required="true">
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18" selected>18%</option>
            <option value="28">28%</option>
          </select>
        </div>
        <button class="primary" type="button" onclick="calcGst()">Calculate GST</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    bmi: `
      <h2>⚖️ BMI Calculator</h2>
      <div class="form">
        <div><label for="weight">Weight (kg)</label><input id="weight" type="number" min="1" placeholder="60" aria-required="true"/></div>
        <div><label for="height_cm">Height (cm)</label><input id="height_cm" type="number" min="1" placeholder="170" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcBmi()">Calculate BMI</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    discount: `
      <h2>🏷️ Discount Calculator</h2>
      <div class="form">
        <div><label for="orig_price">Original price (₹)</label><input id="orig_price" type="number" min="0" placeholder="2000" aria-required="true"/></div>
        <div><label for="disc_pct">Discount (%)</label><input id="disc_pct" type="number" min="0" max="100" placeholder="20" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcDiscount()">Calculate</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    tip: `
      <h2>🍽️ Tip Calculator</h2>
      <div class="form">
        <div><label for="bill">Bill amount (₹)</label><input id="bill" type="number" min="0" placeholder="1000" aria-required="true"/></div>
        <div><label for="tiprate">Tip percentage (%)</label><input id="tiprate" type="number" value="10" min="0" aria-required="true"/></div>
        <div><label for="people">Number of people</label><input id="people" type="number" value="1" min="1" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcTip()">Calculate Tip</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    unit: `
      <h2>🔬 Advanced Scientific Unit Converter</h2>
      <p>Convert units across chemical, physical, laboratory, digital, health, and engineering standards.</p>
      <div class="form unit-advanced-form">
        <div>
          <label for="unit_cat">Category</label>
          <select id="unit_cat" aria-label="Select Unit Category" onchange="onUnitCatChange()">
            <option value="substance">Amount of Substance (mol, mmol, µmol…)</option>
            <option value="molar_conc">Molar Concentration (mol/L, mmol/L…)</option>
            <option value="mass_conc">Mass Concentration & Laboratory (g/L, mg/dL…)</option>
            <option value="mass">Mass & Weight (kg, g, lb, oz, stone, tonne…)</option>
            <option value="length">Length & Distance (m, km, cm, mm, µm, nm, ft, mi, nmi…)</option>
            <option value="area">Area (m², km², ha, acre, sq ft…)</option>
            <option value="volume">Volume & Laboratory Capacity (m³, L, mL, µL, nL, gal…)</option>
            <option value="temp">Temperature (Celsius, Fahrenheit, Kelvin, Rankine)</option>
            <option value="time">Time (s, ms, µs, ns, min, hr, day)</option>
            <option value="speed">Speed & Velocity (m/s, km/h, mph, knots, ft/s)</option>
            <option value="pressure">Pressure (Pa, kPa, MPa, bar, atm, PSI, mmHg, torr)</option>
            <option value="energy">Energy & Work (J, kJ, cal, kcal, Wh, kWh, eV)</option>
            <option value="power">Power (W, kW, MW, hp)</option>
            <option value="electricity">Electricity & Electromagnetism (V, A, Ω, C, F, H, T…)</option>
            <option value="density">Density (kg/m³, g/cm³, g/mL)</option>
            <option value="flow_rate">Flow Rate (L/min, mL/min, µL/min)</option>
            <option value="molar_mass">Molar Mass (g/mol, kg/mol)</option>
            <option value="parts_fraction">Fraction / Trace (ppm, ppb, %, ‰)</option>
            <option value="storage_dec">Digital Storage - Decimal (B, KB, MB, GB, TB, PB)</option>
            <option value="storage_bin">Digital Storage - Binary (B, KiB, MiB, GiB, TiB, PiB)</option>
            <option value="frequency">Frequency (Hz, kHz, MHz, GHz)</option>
            <option value="angle">Angle (Degree, Radian, Gradian, Arcmin, Arcsec)</option>
            <option value="blood_glucose">Blood Glucose (mg/dL ↔ mmol/L)</option>
          </select>
        </div>

        <div>
          <label for="unit_val">Value to Convert</label>
          <input id="unit_val" type="number" step="any" placeholder="1" value="1" aria-required="true" oninput="calcUnit()"/>
        </div>

        <div class="unit-selectors-row">
          <div class="unit-select-col">
            <label for="unit_from">From Unit</label>
            <select id="unit_from" aria-required="true" onchange="calcUnit()"></select>
          </div>
          <button type="button" class="unit-swap-btn" onclick="swapUnits()" title="Swap From and To units" aria-label="Swap units">⇄</button>
          <div class="unit-select-col">
            <label for="unit_to">To Unit</label>
            <select id="unit_to" aria-required="true" onchange="calcUnit()"></select>
          </div>
        </div>

        <button class="primary" type="button" onclick="calcUnit()">Convert</button>
        <div id="unit-note" class="unit-note hidden"></div>
        <div id="res" class="result hidden"></div>
      </div>`,

    ratio: `
      <h2>🔢 Ratio Calculator</h2>
      <div class="form">
        <div><label for="ratio_a">First number</label><input id="ratio_a" type="number" placeholder="20" aria-required="true"/></div>
        <div><label for="ratio_b">Second number</label><input id="ratio_b" type="number" placeholder="30" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcRatio()">Simplify</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    number: `
      <h2>🔁 Number Converter</h2>
      <div class="form">
        <div><label for="num_dec">Decimal number</label><input id="num_dec" type="number" placeholder="42" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcNumber()">Convert</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    scientific: `
      <h2>🧮 Scientific Calculator</h2>
      <p>Advanced in-browser scientific calculator with trigonometry, roots, powers, logarithms, and factorials. 100% private &amp; instant.</p>
      <div class="sc-calc-wrap">
        <div class="sc-toolbar">
          <div class="sc-btn-group">
            <button type="button" id="sc_angle_btn" class="sc-btn sc-btn-fn" onclick="scToggleAngle()" style="padding: 0 14px; height: 32px; font-weight:700;">DEG</button>
            <span id="sc_mem_indicator" style="font-size:12px; font-weight:700; color:var(--accent); align-self:center; display:none; padding-left:4px;">[M]</span>
          </div>
          <div class="sc-btn-group">
            <button type="button" class="sc-btn" onclick="scCopyResult()" title="Copy Result" style="padding: 0 12px; height: 32px; gap:4px; font-size:13px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
            </button>
          </div>
        </div>

        <div class="sc-screen">
          <div class="sc-screen-top">
            <span id="sc_mode_badge">DEG</span>
            <span id="sc_mem_badge"></span>
          </div>
          <div id="sc_history" class="sc-history" aria-live="polite"></div>
          <input type="text" id="sc_display" class="sc-display" value="0" readonly aria-label="Calculator display"/>
        </div>

        <div class="sc-keypad">
          <!-- Row 1: Memory & Clear -->
          <button type="button" class="sc-btn sc-btn-fn" onclick="scMem('MC')" title="Memory Clear">MC</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scMem('MR')" title="Memory Recall">MR</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scMem('M+')" title="Memory Add">M+</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scMem('M-')" title="Memory Subtract">M−</button>
          <button type="button" class="sc-btn sc-btn-clear" onclick="scClear()" title="Clear All">C</button>

          <!-- Row 2: Basic Trig & Logs -->
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('sin(')">sin</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('cos(')">cos</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('tan(')">tan</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('log(')" title="Log base 10">log</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('ln(')" title="Natural log">ln</button>

          <!-- Row 3: Inverse Trig, Root & Power -->
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('asin(')" title="Arcsine">sin⁻¹</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('acos(')" title="Arccosine">cos⁻¹</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('atan(')" title="Arctangent">tan⁻¹</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('sqrt(')" title="Square root">√</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress('^')" title="Power x^y">xʸ</button>

          <!-- Row 4: Constants, Factorial & Backspace -->
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress('^2')" title="Square x²">x²</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress('!')" title="Factorial n!">n!</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress('π')" title="Pi (3.14159...)">π</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress('e')" title="Euler's number (2.71828...)">e</button>
          <button type="button" class="sc-btn sc-btn-clear" onclick="scBackspace()" title="Backspace">⌫</button>

          <!-- Row 5: Parentheses, Modulo & Divide -->
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress('(')">(</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress(')')">)</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scPress('%')" title="Percentage / Modulo">%</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('abs(')" title="Absolute value">|x|</button>
          <button type="button" class="sc-btn sc-btn-op" onclick="scPress('/')">÷</button>

          <!-- Row 6: 7 8 9 Reciprocal Multiply -->
          <button type="button" class="sc-btn" onclick="scPress('7')">7</button>
          <button type="button" class="sc-btn" onclick="scPress('8')">8</button>
          <button type="button" class="sc-btn" onclick="scPress('9')">9</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('1/(')" title="Reciprocal">1/x</button>
          <button type="button" class="sc-btn sc-btn-op" onclick="scPress('*')">×</button>

          <!-- Row 7: 4 5 6 10^x Subtract -->
          <button type="button" class="sc-btn" onclick="scPress('4')">4</button>
          <button type="button" class="sc-btn" onclick="scPress('5')">5</button>
          <button type="button" class="sc-btn" onclick="scPress('6')">6</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scFunc('10^(')" title="10 to power of x">10ˣ</button>
          <button type="button" class="sc-btn sc-btn-op" onclick="scPress('-')">−</button>

          <!-- Row 8: 1 2 3 +/- Add -->
          <button type="button" class="sc-btn" onclick="scPress('1')">1</button>
          <button type="button" class="sc-btn" onclick="scPress('2')">2</button>
          <button type="button" class="sc-btn" onclick="scPress('3')">3</button>
          <button type="button" class="sc-btn sc-btn-fn" onclick="scToggleSign()" title="Toggle Sign">±</button>
          <button type="button" class="sc-btn sc-btn-op" onclick="scPress('+')">+</button>

          <!-- Row 9: 0 00 . = -->
          <button type="button" class="sc-btn" onclick="scPress('0')">0</button>
          <button type="button" class="sc-btn" onclick="scPress('00')">00</button>
          <button type="button" class="sc-btn" onclick="scPress('.')">.</button>
          <button type="button" class="sc-btn sc-btn-eq" style="grid-column: span 2;" onclick="scEquals()">=</button>
        </div>
      </div>`,

    date: `
      <h2>📅 Date Difference</h2>
      <div class="form">
        <div><label for="date_from">Start date</label><input id="date_from" type="date" aria-required="true"/></div>
        <div><label for="date_to">End date</label><input id="date_to" type="date" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcDate()">Calculate</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    salary: `
      <h2>💵 Salary Calculator</h2>
      <div class="form">
        <div><label for="ctc">Annual CTC (₹)</label><input id="ctc" type="number" min="1" placeholder="600000" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcSalary()">Calculate</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    /* Tool 1: PDF Merger */
    pdfmerge: `
      <h2>📑 PDF Merger</h2>
      <p>Combine multiple PDF documents into a single organized file. Works 100% locally in your browser.</p>
      <div class="form">
        <div
          id="pm-drop"
          class="img-drop-zone"
          role="button"
          tabindex="0"
          aria-label="Drop PDF files here or click to select"
          onclick="document.getElementById('pm-file').value=''; document.getElementById('pm-file').click()"
          onkeydown="if(event.key==='Enter'||event.key===' '){document.getElementById('pm-file').value='';document.getElementById('pm-file').click()}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="pmHandleDrop(event)"
        >
          <div class="drop-icon" aria-hidden="true">📑</div>
          <p>Drag &amp; drop PDF files here<br><small>or click to select multiple files</small></p>
          <p class="drop-formats">Select 2 or more PDF documents</p>
        </div>
        <input id="pm-file" type="file" accept="application/pdf" multiple class="sr-only" aria-hidden="true" onchange="pmAddFiles(this.files)"/>
        
        <div id="pm-controls" class="hidden">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <label style="margin:0; font-weight:700;">Files to Merge (<span id="pm-count">0</span>):</label>
            <button class="preset-chip" type="button" onclick="document.getElementById('pm-file').click()">+ Add More PDFs</button>
          </div>
          <div id="pm-queue" class="file-queue"></div>
          
          <div id="pm-status" class="info-note hidden"></div>
          <button class="primary" type="button" id="pm-merge-btn" onclick="pmMerge()">Merge PDFs</button>
          <button class="primary" type="button" id="pm-download-btn" style="display:none;" onclick="pmDownload()">⬇ Download Merged PDF</button>
          <button class="secondary-btn" type="button" onclick="pmReset()">↩ Clear All Files</button>
        </div>
        <p class="info-note">🔒 <strong>Privacy note:</strong> All PDF merging is executed client-side inside your browser via WebAssembly/JS. No files are uploaded to any server.</p>
      </div>`,

        /* Tool 2: Image Compressor */
    imgcompress: `
      <h2>🗜️ Image Compressor</h2>
      <p>Compress JPG, PNG &amp; WebP images with live before-and-after preview. Fast, free &amp; 100% private in-browser.</p>
      <div class="form">
        <!-- Mode Tabs -->
        <div class="ic-mode-nav" role="tablist" aria-label="Compression modes">
          <button type="button" class="ic-mode-tab is-active" id="ic-tab-manual" onclick="icSetMode('manual')" role="tab" aria-selected="true">
            ⚡ Quick Compress
          </button>
          <button type="button" class="ic-mode-tab" id="ic-tab-target" onclick="icSetMode('target')" role="tab" aria-selected="false">
            🎯 Target Size (KB)
          </button>
          <button type="button" class="ic-mode-tab" id="ic-tab-govt" onclick="icSetMode('govt')" role="tab" aria-selected="false">
            🏛️ Govt Exam Presets
          </button>
        </div>

        <!-- Custom Target KB Box (Shown when Target tab is active) -->
        <div id="ic-target-panel" class="ic-target-panel hidden">
          <div class="ic-target-input-wrap">
            <label for="ic-target-kb" style="font-weight:600; font-size:13px; color:var(--text);">Target Maximum File Size:</label>
            <div class="ic-input-with-unit" style="margin-top:6px;">
              <input type="number" id="ic-target-kb" min="5" max="10000" value="50" placeholder="50" oninput="icCompress()"/>
              <span class="ic-unit-badge">KB</span>
            </div>
          </div>
          <div class="ic-quick-chips">
            <span>Quick Sizes:</span>
            <button type="button" class="chip-btn" onclick="icSetTargetKb(20)">&lt;20 KB (Signature)</button>
            <button type="button" class="chip-btn active" id="ic-chip-50" onclick="icSetTargetKb(50)">&lt;50 KB (Photo)</button>
            <button type="button" class="chip-btn" onclick="icSetTargetKb(100)">&lt;100 KB</button>
            <button type="button" class="chip-btn" onclick="icSetTargetKb(200)">&lt;200 KB</button>
            <button type="button" class="chip-btn" onclick="icSetTargetKb(500)">&lt;500 KB</button>
          </div>
        </div>

        <!-- Govt Exam Selector (Shown when Govt tab is active) -->
        <div id="ic-govt-panel" class="ic-govt-card hidden">
          <div class="ic-govt-row">
            <div class="ic-select-wrap">
              <label for="ic-exam-select" class="control-label">Exam / Portal</label>
              <select id="ic-exam-select" class="form-select" onchange="icApplyGovtPreset()" aria-label="Select Exam Portal">
                <option value="ssc" selected>SSC (CGL, CHSL, MTS, GD, Steno)</option>
                <option value="rrb">RRB Railway (NTPC, ALP, Tech, JE, Group D)</option>
                <option value="jee">NTA JEE Main &amp; Advanced</option>
                <option value="neet">NTA NEET UG (Medical)</option>
                <option value="upsc">UPSC (Civil Services, NDA, CDS, OTR)</option>
                <option value="ibps">IBPS / SBI (Bank PO, Clerk, SO)</option>
                <option value="gate">GATE (IIT M.Tech / PSU)</option>
                <option value="cat">CAT (IIM MBA Entrance)</option>
                <option value="ctet">CTET / State TET (CBSE)</option>
                <option value="cuet">CUET (UG / PG Entrance)</option>
                <option value="police">Police &amp; State PSC Exams</option>
                <option value="passport">Indian Passport &amp; Visa Form</option>
              </select>
            </div>
            <div class="ic-select-wrap">
              <label for="ic-type-select" class="control-label">Document Type</label>
              <select id="ic-type-select" class="form-select" onchange="icApplyGovtPreset()" aria-label="Select Document Type">
                <option value="photo" selected>📸 Passport Size Photo</option>
                <option value="postcard">🖼️ Postcard Size Photo (4"×6" - NEET UG)</option>
                <option value="sig">✍️ Signature</option>
                <option value="thumb">🖐️ Left Thumb Impression</option>
                <option value="neet_thumb">👐 All 10 Fingers &amp; Thumbs (NEET UG)</option>
                <option value="decl">📝 Hand-Written Declaration (IBPS/SBI)</option>
                <option value="doc">📄 Certificate / Marksheet Proof</option>
              </select>
            </div>
          </div>

          <!-- Official Guideline Banner -->
          <div class="ic-guideline-box" id="ic-guideline-box">
            <div class="ic-guide-badge" id="ic-guide-badge">SSC Requirements</div>
            <div class="ic-guide-specs" id="ic-guide-specs">
              <span>File Size: <strong>20 KB – 50 KB</strong></span> • 
              <span>Dimensions: <strong>3.5cm × 4.5cm</strong> (200 × 230 px)</span> • 
              <span>Format: <strong>JPG / JPEG</strong></span>
            </div>
          </div>

          <!-- Auto Dimensions Option -->
          <div class="ic-opt-row">
            <label class="ic-checkbox-wrap">
              <input type="checkbox" id="ic-auto-dim" checked onchange="icCompress()"/>
              <span>Auto-resize to official dimensions (<strong id="ic-dim-label">200 × 230 px</strong>)</span>
            </label>
          </div>
        </div>

        <!-- Drop Zone (Hero element - Clean & Prominent) -->
        <div
          id="ic-drop"
          class="img-drop-zone"
          role="button"
          tabindex="0"
          aria-label="Drop image here or click to select"
          onclick="document.getElementById('ic-file').value=''; document.getElementById('ic-file').click()"
          onkeydown="if(event.key==='Enter'||event.key===' '){document.getElementById('ic-file').value='';document.getElementById('ic-file').click()}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="icHandleDrop(event)"
        >
          <div class="drop-icon" aria-hidden="true">📂</div>
          <p style="font-size:16px; font-weight:600; margin:4px 0 2px 0;">Drag &amp; drop your image here<br><small style="font-size:13px; font-weight:400; color:var(--muted);">or click to browse from device</small></p>
          <p class="drop-formats" style="margin-top:8px;">Supports JPG, JPEG, PNG, WebP &bull; Max 25 MB &bull; 100% In-Browser Privacy</p>
        </div>
        <input id="ic-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" class="sr-only" aria-hidden="true" onchange="icLoadFile(this.files[0])"/>

        <!-- Preview and Output Area -->
        <div id="ic-preview-wrap" class="img-preview-wrap hidden">
          <div class="img-preview-pair">
            <div class="img-preview-panel">
              <div class="img-preview-label">Original Image</div>
              <img id="ic-orig-img" alt="Original image preview" />
              <div id="ic-orig-info" class="img-info"></div>
            </div>
            <div class="img-preview-panel">
              <div class="img-preview-label">Compressed Output</div>
              <img id="ic-comp-img" alt="Compressed image preview" />
              <div id="ic-comp-info" class="img-info"></div>
            </div>
          </div>

          <!-- Official Portal Compliance Status Banner -->
          <div id="ic-compliance-banner" class="ic-compliance-banner hidden"></div>

          <!-- Quick Controls (Visible in Quick Compress / Manual mode) -->
          <div id="ic-manual-controls" class="ic-manual-controls" style="background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:14px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="control-label" style="font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.04em;">Compression Level:</span>
              </div>
              <div class="ic-quick-chips">
                <button type="button" class="chip-btn ic-preset-chip active" data-quality="70" onclick="icSetQualityPreset(70)">⚡ Balanced (70%)</button>
                <button type="button" class="chip-btn ic-preset-chip" data-quality="85" onclick="icSetQualityPreset(85)">🌟 High Quality (85%)</button>
                <button type="button" class="chip-btn ic-preset-chip" data-quality="40" onclick="icSetQualityPreset(40)">🗜️ Max Compression (40%)</button>
              </div>
            </div>

            <div class="img-slider-wrap">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <label for="ic-quality" class="img-slider-label" style="margin:0;">
                  Quality: <strong id="ic-quality-val" style="color:var(--accent); font-size:15px;">70</strong>%
                </label>
                <span style="font-size:12px; color:var(--muted);">Adjust for exact size</span>
              </div>
              <input id="ic-quality" type="range" min="5" max="100" value="70" class="img-slider" oninput="icUpdateQuality(this.value)" aria-label="Compression quality"/>
              <div class="img-slider-ticks"><span>Smallest Size (10%)</span><span>Balanced (70%)</span><span>Crisp Quality (95%)</span></div>
            </div>

            <div class="img-format-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px; border-top:1px solid var(--line); padding-top:12px;">
              <label for="ic-format" style="font-size:13px; font-weight:600; margin:0;">Output Format:</label>
              <select id="ic-format" class="form-select" onchange="icCompress()" aria-label="Output image format" style="width:auto; min-width:140px; padding:6px 12px; border-radius:8px; border:1px solid var(--line); background:var(--surface); color:var(--text); font-weight:600;">
                <option value="image/jpeg" selected>JPEG / JPG</option>
                <option value="image/webp">WebP (Modern)</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
          </div>

          <button class="primary" type="button" id="ic-download-btn" onclick="icDownload()" style="font-size:15px; font-weight:700; padding:12px 20px;">⬇ Download Compressed Image</button>
          <button class="secondary-btn" type="button" onclick="icReset()">↩ Choose Another Image</button>
          <p class="info-note" id="ic-note-text">🔒 <strong>100% In-Browser Privacy:</strong> Your photos are compressed directly on your device. Zero images are ever uploaded to any cloud or server.</p>
        </div>
      </div>`,

        /* Tool 3: Photo & Signature Resizer */
    photoresize: `
      <h2>✍️ Photo &amp; Signature Resizer</h2>
      <p>Resize, crop, and compress passport photos and signatures to official Government Exam portal specifications (SSC, RRB, UPSC, IBPS, State PSC, Police).</p>
      <div class="form">
        <!-- Mode Tabs -->
        <div class="ic-mode-nav" role="tablist" aria-label="Resizer mode">
          <button type="button" class="ic-mode-tab active" id="pr-tab-govt" role="tab" aria-selected="true" onclick="prSetMode('govt')">
            <span class="tab-badge">Govt Exam</span> SSC / RRB / UPSC
          </button>
          <button type="button" class="ic-mode-tab" id="pr-tab-custom" role="tab" aria-selected="false" onclick="prSetMode('custom')">
            📐 Custom Dimensions
          </button>
        </div>

        <!-- Govt Exam Card -->
        <div id="pr-govt-panel" class="ic-govt-card">
          <div class="ic-govt-row">
            <div class="ic-select-wrap">
              <label for="pr-exam-select" class="control-label">🏛️ Exam / Portal</label>
              <select id="pr-exam-select" class="form-select" onchange="prApplyGovtPreset()" aria-label="Select Exam Portal">
                <option value="ssc" selected>SSC (CGL, CHSL, MTS, GD, Steno)</option>
                <option value="rrb">RRB Railway (NTPC, ALP, Tech, JE, Group D)</option>
                <option value="jee">NTA JEE Main &amp; Advanced</option>
                <option value="neet">NTA NEET UG (Medical)</option>
                <option value="upsc">UPSC (Civil Services, NDA, CDS, OTR)</option>
                <option value="ibps">IBPS / SBI (Bank PO, Clerk, SO)</option>
                <option value="gate">GATE (IIT M.Tech / PSU)</option>
                <option value="cat">CAT (IIM MBA Entrance)</option>
                <option value="ctet">CTET / State TET (CBSE)</option>
                <option value="cuet">CUET (UG / PG Entrance)</option>
                <option value="police">Police &amp; State PSC (UP, Bihar, MP, Delhi)</option>
                <option value="passport">Indian Passport &amp; Visa Application</option>
              </select>
            </div>
            <div class="ic-select-wrap">
              <label for="pr-type-select" class="control-label">📋 Document Type</label>
              <select id="pr-type-select" class="form-select" onchange="prApplyGovtPreset()" aria-label="Select Document Type">
                <option value="photo" selected>📸 Passport Size Photo</option>
                <option value="postcard">🖼️ Postcard Size Photo (4"×6" - NEET UG)</option>
                <option value="sig">✍️ Signature</option>
                <option value="thumb">🖐️ Left Thumb Impression</option>
                <option value="neet_thumb">👐 All 10 Fingers &amp; Thumbs (NEET UG)</option>
                <option value="decl">📝 Hand-Written Declaration (IBPS/SBI)</option>
                <option value="doc">📄 Certificate / Marksheet Proof</option>
              </select>
            </div>
          </div>

          <!-- Official Portal Guidelines -->
          <div id="pr-guideline-box" class="ic-guideline-box">
            <div class="ic-guide-badge" id="pr-guide-badge">SSC • Official Requirement</div>
            <div class="ic-guide-specs" id="pr-guide-specs">
              <span class="ic-spec-chip">📦 20 KB – 50 KB</span>
              <span class="ic-spec-chip">📏 200 × 230 px (3.5 × 4.5 cm)</span>
              <span class="ic-spec-chip">📄 JPG / JPEG only</span>
            </div>
            <div class="ic-guide-note" id="pr-guide-note">
              Light background, 80% face coverage, clear signature on white paper with black/blue ink.
            </div>
          </div>
        </div>

        <div
          id="pr-drop"
          class="img-drop-zone"
          role="button"
          tabindex="0"
          aria-label="Drop photo or signature here or click to select"
          onclick="document.getElementById('pr-file').value=''; document.getElementById('pr-file').click()"
          onkeydown="if(event.key==='Enter'||event.key===' '){document.getElementById('pr-file').value='';document.getElementById('pr-file').click()}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="prHandleDrop(event)"
        >
          <div class="drop-icon" aria-hidden="true">✍️</div>
          <p>Drag &amp; drop photo or signature here<br><small>or click to browse</small></p>
          <p class="drop-formats">Supports JPG, JPEG, PNG, WebP</p>
        </div>
        <input id="pr-file" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" aria-hidden="true" onchange="prLoadFile(this.files[0])"/>

        <div id="pr-controls" class="hidden">
          <div id="pr-orig-info" class="img-orig-info"></div>

          <div class="resize-dim-row">
            <div>
              <label for="pr-w">Width (px)</label>
              <input id="pr-w" type="number" min="10" placeholder="200" aria-required="true" oninput="prSyncDim('w')"/>
            </div>
            <div class="resize-lock" id="pr-lock-btn" onclick="prToggleLock()" title="Lock aspect ratio" aria-label="Lock aspect ratio" role="button" tabindex="0" onkeydown="if(event.key==='Enter')prToggleLock()">
              🔓
            </div>
            <div>
              <label for="pr-h">Height (px)</label>
              <input id="pr-h" type="number" min="10" placeholder="230" aria-required="true" oninput="prSyncDim('h')"/>
            </div>
          </div>

          <div class="tool-options-grid">
            <div>
              <label for="pr-max-kb">Target Max Size (KB)</label>
              <div class="ic-input-with-unit">
                <input id="pr-max-kb" type="number" min="5" max="2048" placeholder="50" value="50" aria-label="Target file size in KB"/>
                <span class="ic-unit-badge">KB</span>
              </div>
              <div class="ic-quick-chips" style="margin-top:6px;">
                <span>Quick Limits:</span>
                <button type="button" class="chip-btn" onclick="document.getElementById('pr-max-kb').value=20">20 KB (Sig)</button>
                <button type="button" class="chip-btn" onclick="document.getElementById('pr-max-kb').value=50">50 KB (Photo)</button>
                <button type="button" class="chip-btn" onclick="document.getElementById('pr-max-kb').value=100">100 KB</button>
                <button type="button" class="chip-btn" onclick="document.getElementById('pr-max-kb').value=300">300 KB (UPSC)</button>
              </div>
            </div>
            <div>
              <label for="pr-format">Format</label>
              <select id="pr-format" class="form-select">
                <option value="image/jpeg" selected>JPG / JPEG (Govt Standard)</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
          </div>

          <button class="primary" type="button" id="pr-generate-btn" onclick="prResize()">Generate Resized Photo/Signature</button>

          <!-- Official Portal Compliance Banner -->
          <div id="pr-compliance-banner" class="ic-compliance-banner hidden"></div>

          <div id="pr-preview-wrap" class="img-preview-wrap hidden" style="margin-top:16px;">
            <div class="img-preview-panel" style="margin: 0 auto; max-width: 340px; text-align: center;">
              <div class="img-preview-label">Output Preview</div>
              <img id="pr-out-img" alt="Resized output preview" style="max-height:200px; margin:0 auto; object-fit:contain; border-radius:6px; border:1px solid var(--line);" />
              <div id="pr-out-info" class="img-info" style="margin-top:8px; font-weight:600;"></div>
            </div>
            <button class="primary" type="button" id="pr-download-btn" onclick="prDownload()">⬇ Download File</button>
          </div>
          <button class="secondary-btn" type="button" onclick="prReset()" style="margin-top:8px;">↩ Choose Another File</button>
          <p class="info-note" style="margin-top:12px;">🔒 <strong>100% In-Browser:</strong> Your photos &amp; signatures never leave your device.</p>
        </div>
      </div>`,

    /* Tool 4: Image to PDF */
    imgtopdf: `
      <h2>📄 Image to PDF Converter</h2>
      <p>Convert multiple images into a single clean PDF with customizable page sizes, orientations, and margins.</p>
      <div class="form">
        <div
          id="i2p-drop"
          class="img-drop-zone"
          role="button"
          tabindex="0"
          aria-label="Drop images here or click to select"
          onclick="document.getElementById('i2p-file').value=''; document.getElementById('i2p-file').click()"
          onkeydown="if(event.key==='Enter'||event.key===' '){document.getElementById('i2p-file').value='';document.getElementById('i2p-file').click()}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="i2pHandleDrop(event)"
        >
          <div class="drop-icon" aria-hidden="true">📂</div>
          <p>Drag &amp; drop images here<br><small>or click to select multiple files</small></p>
          <p class="drop-formats">Supports JPG, PNG, WebP (Add multiple images)</p>
        </div>
        <input id="i2p-file" type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" aria-hidden="true" onchange="i2pAddFiles(this.files)"/>

        <div id="i2p-controls" class="hidden">
          <!-- Govt Exam & Certificate Presets Bar -->
          <div class="ic-govt-card" style="padding:12px 14px; margin-bottom:12px;">
            <label class="control-label" style="font-size:11.5px; font-weight:700; color:var(--muted); text-transform:uppercase;">🏛️ Quick Presets for Govt Exams &amp; Applications:</label>
            <div class="ic-quick-chips" style="margin-top:6px;">
              <button type="button" class="chip-btn" onclick="i2pApplyPreset('neet_jee')">NEET / JEE Marksheet (&lt;300 KB A4)</button>
              <button type="button" class="chip-btn" onclick="i2pApplyPreset('ssc')">SSC / State PSC Doc (A4, 10mm)</button>
              <button type="button" class="chip-btn" onclick="i2pApplyPreset('rrb')">RRB Travel Pass (&lt;500 KB A4)</button>
              <button type="button" class="chip-btn" onclick="i2pApplyPreset('upsc')">UPSC Certificate (A4, 5mm)</button>
              <button type="button" class="chip-btn" onclick="i2pApplyPreset('gate_cat')">GATE / CAT Degree (A4, 5mm)</button>
              <button type="button" class="chip-btn" onclick="i2pApplyPreset('idcard')">ID Card / Marksheet (Fit to Page)</button>
              <button type="button" class="chip-btn" onclick="i2pApplyPreset('fullbleed')">Full Bleed (No Margin)</button>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <label style="margin:0; font-weight:700;">Pages Queue (<span id="i2p-count">0</span> images):</label>
            <button class="preset-chip" type="button" onclick="document.getElementById('i2p-file').click()">+ Add More Images</button>
          </div>
          <div id="i2p-queue" class="file-queue"></div>

          <div class="tool-options-grid">
            <div>
              <label for="i2p-page-size">Page Size</label>
              <select id="i2p-page-size">
                <option value="a4" selected>A4 (210 x 297 mm)</option>
                <option value="letter">Letter (8.5 x 11 in)</option>
                <option value="fit">Fit to Image Size</option>
              </select>
            </div>
            <div>
              <label for="i2p-orientation">Orientation</label>
              <select id="i2p-orientation">
                <option value="auto" selected>Auto (Based on image)</option>
                <option value="p">Portrait</option>
                <option value="l">Landscape</option>
              </select>
            </div>
            <div>
              <label for="i2p-margin">Margins</label>
              <select id="i2p-margin">
                <option value="0">No Margin (Full Bleed)</option>
                <option value="5">Small (5mm)</option>
                <option value="12" selected>Standard (12mm)</option>
              </select>
            </div>
          </div>

          <button class="primary" type="button" id="i2p-download-btn" onclick="i2pConvert()">⬇ Convert &amp; Download PDF</button>
          <button class="secondary-btn" type="button" onclick="i2pReset()">↩ Clear All Images</button>
        </div>
      </div>`,

    /* Tool 5: QR Code Generator */
    qrcode: `
      <h2>📱 QR Code Generator</h2>
      <p>Create high-resolution QR codes for websites, plain text, email, and Wi-Fi credentials. No internet connection needed.</p>
      <div class="form">
        <div class="qr-tabs" role="tablist">
          <button class="qr-tab active" type="button" role="tab" onclick="qrSwitchType('url')" id="qr-tab-url">URL</button>
          <button class="qr-tab" type="button" role="tab" onclick="qrSwitchType('text')" id="qr-tab-text">Text</button>
          <button class="qr-tab" type="button" role="tab" onclick="qrSwitchType('wifi')" id="qr-tab-wifi">Wi-Fi</button>
          <button class="qr-tab" type="button" role="tab" onclick="qrSwitchType('email')" id="qr-tab-email">Email</button>
        </div>

        <div id="qr-input-url">
          <label for="qr-url">Website URL</label>
          <input id="qr-url" type="url" placeholder="https://example.com" value="https://toolboxpro.in" oninput="qrGenerate()"/>
        </div>

        <div id="qr-input-text" class="hidden">
          <label for="qr-text">Plain Text</label>
          <textarea id="qr-text" rows="3" style="width:100%; border:1px solid var(--line); border-radius:var(--radius-sm); padding:10px; font-family:inherit; background:var(--bg); color:var(--text);" placeholder="Enter any text or note..." oninput="qrGenerate()"></textarea>
        </div>

        <div id="qr-input-wifi" class="hidden">
          <div style="display:grid; gap:10px;">
            <div>
              <label for="qr-wifi-ssid">Network Name (SSID)</label>
              <input id="qr-wifi-ssid" type="text" placeholder="MyWiFiNetwork" oninput="qrGenerate()"/>
            </div>
            <div>
              <label for="qr-wifi-pass">Password</label>
              <input id="qr-wifi-pass" type="text" placeholder="Network password" oninput="qrGenerate()"/>
            </div>
            <div>
              <label for="qr-wifi-auth">Security Type</label>
              <select id="qr-wifi-auth" onchange="qrGenerate()">
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (Open)</option>
              </select>
            </div>
          </div>
        </div>

        <div id="qr-input-email" class="hidden">
          <div style="display:grid; gap:10px;">
            <div>
              <label for="qr-email-addr">Email Address</label>
              <input id="qr-email-addr" type="email" placeholder="contact@example.com" oninput="qrGenerate()"/>
            </div>
            <div>
              <label for="qr-email-sub">Subject</label>
              <input id="qr-email-sub" type="text" placeholder="Inquiry" oninput="qrGenerate()"/>
            </div>
            <div>
              <label for="qr-email-body">Body</label>
              <input id="qr-email-body" type="text" placeholder="Hello..." oninput="qrGenerate()"/>
            </div>
          </div>
        </div>

        <div class="tool-options-grid">
          <div>
            <label for="qr-size">Size</label>
            <select id="qr-size" onchange="qrGenerate()">
              <option value="160">Small (160px)</option>
              <option value="240" selected>Medium (240px)</option>
              <option value="360">Large (360px)</option>
              <option value="480">Extra Large (480px)</option>
            </select>
          </div>
          <div>
            <label for="qr-ecl">Error Correction</label>
            <select id="qr-ecl" onchange="qrGenerate()">
              <option value="L">Level L (~7% recovery)</option>
              <option value="M" selected>Level M (~15% recovery)</option>
              <option value="Q">Level Q (~25% recovery)</option>
              <option value="H">Level H (~30% recovery)</option>
            </select>
          </div>
        </div>

        <div class="qr-preview-container">
          <div id="qr-output" aria-label="Generated QR Code"></div>
        </div>

        <div class="qr-download-row">
          <button class="primary" type="button" onclick="qrDownload('png')">⬇ Download PNG</button>
          <button class="secondary-btn" type="button" onclick="qrDownload('svg')">⬇ Download SVG</button>
        </div>
      </div>`,

    imgresize: `
      <h2>📐 Image Resizer</h2>
      <p>Resize images by official Govt Exam presets (SSC, RRB, UPSC, IBPS), custom pixel dimensions, or percentage scale.</p>
      <div class="form">
        <!-- Mode Tabs -->
        <div class="ic-mode-nav" role="tablist" aria-label="Resize mode">
          <button type="button" class="ic-mode-tab active" id="ir-tab-govt" role="tab" aria-selected="true" onclick="irSwitchMode('govt')">
            <span class="tab-badge">Govt Exam</span> SSC / RRB / UPSC
          </button>
          <button type="button" class="ic-mode-tab" id="ir-tab-px" role="tab" aria-selected="false" onclick="irSwitchMode('px')">
            Exact Pixels (px)
          </button>
          <button type="button" class="ic-mode-tab" id="ir-tab-pct" role="tab" aria-selected="false" onclick="irSwitchMode('pct')">
            Percentage (%)
          </button>
        </div>

        <!-- Govt Exam Panel -->
        <div id="ir-govt-panel" class="ic-govt-card">
          <div class="ic-govt-row">
            <div class="ic-select-wrap">
              <label for="ir-exam-select" class="control-label">🏛️ Exam / Portal</label>
              <select id="ir-exam-select" class="form-select" onchange="irApplyGovtPreset()" aria-label="Select Exam Portal">
                <option value="ssc" selected>SSC (CGL, CHSL, MTS, GD, Steno)</option>
                <option value="rrb">RRB Railway (NTPC, ALP, Tech, JE, Group D)</option>
                <option value="jee">NTA JEE Main &amp; Advanced</option>
                <option value="neet">NTA NEET UG (Medical)</option>
                <option value="upsc">UPSC (Civil Services, NDA, CDS, OTR)</option>
                <option value="ibps">IBPS / SBI (Bank PO, Clerk, SO)</option>
                <option value="gate">GATE (IIT M.Tech / PSU)</option>
                <option value="cat">CAT (IIM MBA Entrance)</option>
                <option value="ctet">CTET / State TET (CBSE)</option>
                <option value="cuet">CUET (UG / PG Entrance)</option>
                <option value="police">Police &amp; State PSC</option>
                <option value="passport">Passport Seva / Visa</option>
              </select>
            </div>
            <div class="ic-select-wrap">
              <label for="ir-type-select" class="control-label">📋 Document Type</label>
              <select id="ir-type-select" class="form-select" onchange="irApplyGovtPreset()" aria-label="Select Document Type">
                <option value="photo" selected>📸 Passport Size Photo</option>
                <option value="postcard">🖼️ Postcard Size Photo (4"×6" - NEET UG)</option>
                <option value="sig">✍️ Signature</option>
                <option value="thumb">🖐️ Left Thumb Impression</option>
                <option value="neet_thumb">👐 All 10 Fingers &amp; Thumbs (NEET UG)</option>
                <option value="decl">📝 Hand-Written Declaration (IBPS/SBI)</option>
                <option value="doc">📄 Certificate / Marksheet Proof</option>
              </select>
            </div>
          </div>
          <div id="ir-guideline-box" class="ic-guideline-box">
            <div class="ic-guide-badge" id="ir-guide-badge">SSC • Official Requirement</div>
            <div class="ic-guide-specs" id="ir-guide-specs">
              <span class="ic-spec-chip">📏 200 × 230 px (3.5 × 4.5 cm)</span>
              <span class="ic-spec-chip">📦 20 KB – 50 KB</span>
              <span class="ic-spec-chip">📄 JPG</span>
            </div>
          </div>
        </div>

        <div
          id="ir-drop"
          class="img-drop-zone"
          role="button"
          tabindex="0"
          aria-label="Drop image here or click to select"
          onclick="document.getElementById('ir-file').value=''; document.getElementById('ir-file').click()"
          onkeydown="if(event.key==='Enter'||event.key===' '){document.getElementById('ir-file').value='';document.getElementById('ir-file').click()}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="irHandleDrop(event)"
        >
          <div class="drop-icon" aria-hidden="true">📐</div>
          <p>Drag &amp; drop an image here<br><small>or click to browse</small></p>
          <p class="drop-formats">Supports JPEG, PNG, WebP, GIF, BMP</p>
        </div>
        <input id="ir-file" type="file" accept="image/*" class="sr-only" aria-hidden="true" onchange="irLoadFile(this.files[0])"/>

        <div id="ir-controls" class="hidden">
          <div id="ir-orig-info" class="img-orig-info"></div>

          <div id="ir-dim-wrap">
            <div class="resize-dim-row">
              <div>
                <label for="ir-w">Width (px)</label>
                <input id="ir-w" type="number" min="1" placeholder="800" aria-required="true" oninput="irSyncDim('w')"/>
              </div>
              <div class="resize-lock" id="ir-lock-btn" onclick="irToggleLock()" title="Lock aspect ratio" aria-label="Lock aspect ratio" role="button" tabindex="0" onkeydown="if(event.key==='Enter')irToggleLock()">
                🔒
              </div>
              <div>
                <label for="ir-h">Height (px)</label>
                <input id="ir-h" type="number" min="1" placeholder="600" aria-required="true" oninput="irSyncDim('h')"/>
              </div>
            </div>
          </div>

          <div id="ir-pct-mode" class="hidden">
            <label for="ir-pct">Scale Percentage (%)</label>
            <input id="ir-pct" type="number" min="1" max="1000" value="50" placeholder="50" oninput="irSyncPct()"/>
          </div>

          <div class="tool-options-grid">
            <div>
              <label for="ir-max-kb">Target Max KB (optional)</label>
              <div class="ic-input-with-unit">
                <input id="ir-max-kb" type="number" min="5" max="10000" placeholder="Auto" aria-label="Target file size in KB"/>
                <span class="ic-unit-badge">KB</span>
              </div>
            </div>
            <div>
              <label for="ir-format">Output format</label>
              <select id="ir-format" class="form-select" aria-label="Output image format">
                <option value="image/jpeg" selected>JPEG / JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
          </div>

          <button class="primary" type="button" onclick="irResize()">Resize Image</button>

          <!-- Compliance Banner -->
          <div id="ir-compliance-banner" class="ic-compliance-banner hidden"></div>

          <div id="ir-preview-wrap" class="img-preview-wrap hidden">
            <div class="img-preview-pair">
              <div class="img-preview-panel">
                <div class="img-preview-label">Original</div>
                <img id="ir-orig-img" alt="Original image preview" />
                <div id="ir-orig-info2" class="img-info"></div>
              </div>
              <div class="img-preview-panel">
                <div class="img-preview-label">Resized</div>
                <img id="ir-out-img" alt="Resized image preview" />
                <div id="ir-out-info" class="img-info"></div>
              </div>
            </div>
            <button class="primary" type="button" id="ir-download-btn" onclick="irDownload()">⬇ Download Resized Image</button>
          </div>
          <button class="secondary-btn" type="button" onclick="irReset()">↩ Choose Another Image</button>
          <p class="info-note" style="margin-top:12px;">🔒 <strong>100% In-Browser:</strong> Your images are processed on your device only.</p>
        </div>
      </div>`,

    pdfcompress: `
      <h2>🗜️ PDF Compressor</h2>
      <p>Compress PDF documents directly in your browser. Choose an exact custom target size (KB) or select a government exam preset (&lt;100 KB, &lt;200 KB, &lt;300 KB, &lt;500 KB, &lt;1 MB) to guarantee approval.</p>
      <div class="form">
        <div
          id="pc-drop"
          class="img-drop-zone"
          role="button"
          tabindex="0"
          aria-label="Drop PDF here or click to select"
          onclick="document.getElementById('pc-file').value=''; document.getElementById('pc-file').click()"
          onkeydown="if(event.key==='Enter'||event.key===' '){document.getElementById('pc-file').value='';document.getElementById('pc-file').click()}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="pcHandleDrop(event)"
        >
          <div class="drop-icon" aria-hidden="true">📂</div>
          <p>Drag &amp; drop a PDF here<br><small>or click to browse (up to 50MB)</small></p>
          <p class="drop-formats">Supports PDF &bull; 100% Client-Side Privacy &bull; Never Uploaded</p>
        </div>
        <input id="pc-file" type="file" accept="application/pdf" class="sr-only" aria-hidden="true" onchange="pcLoadFile(this.files[0])"/>
        
        <!-- Target File Size Control Card -->
        <div class="ic-govt-card" style="padding:14px 16px; margin-top:14px; margin-bottom:14px; background:var(--surface); border:1px solid var(--border); border-radius:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <label for="pc-target-kb" class="control-label" style="font-size:13px; font-weight:700; color:var(--text); margin:0;">
              🎯 Target Max Size (Custom KB):
            </label>
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <input type="number" id="pc-target-kb" min="20" max="50000" step="10" value="200" style="width:105px; padding:6px 10px; font-weight:700; font-size:14px; text-align:right; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text);" oninput="pcOnCustomTargetChange()"/>
              <span style="font-weight:700; font-size:13px; color:var(--muted);">KB</span>
            </div>
          </div>

          <label class="control-label" style="font-size:11.5px; font-weight:700; color:var(--muted); text-transform:uppercase; display:block; margin-bottom:6px;">
            🏛️ Quick Exam &amp; Portal Presets:
          </label>
          <div class="ic-quick-chips" style="display:flex; flex-wrap:wrap; gap:6px;">
            <button type="button" class="chip-btn" id="pc-chip-100" onclick="pcSetTarget(100)">&lt;100 KB (Strict Portals)</button>
            <button type="button" class="chip-btn active" id="pc-chip-200" onclick="pcSetTarget(200)">&lt;200 KB (UPSC / SSC OTR)</button>
            <button type="button" class="chip-btn" id="pc-chip-300" onclick="pcSetTarget(300)">&lt;300 KB (NTA NEET / JEE)</button>
            <button type="button" class="chip-btn" id="pc-chip-500" onclick="pcSetTarget(500)">&lt;500 KB (GATE / RRB / CAT)</button>
            <button type="button" class="chip-btn" id="pc-chip-1024" onclick="pcSetTarget(1024)">&lt;1 MB (College &amp; Job Portals)</button>
          </div>
          <p style="font-size:11.5px; color:var(--muted); margin:8px 0 0 0;">
            ⚡ <strong>Adaptive Target Guarantee:</strong> Multi-page scans and documents will be compressed to strictly stay under this exact limit.
          </p>
        </div>

        <div id="pc-preview-wrap" class="img-preview-wrap hidden">
          <div class="img-preview-panel" style="margin: 0 auto; width: 100%;">
             <div id="pc-info" class="img-info" style="margin-bottom: 1rem; font-size: 1.05em; color: var(--text);"></div>
             <div id="pc-status" style="display:none; margin-bottom:1rem; padding:10px 14px; border-radius:8px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); font-size:13px; color:var(--text);"></div>
          </div>
          <button class="primary" type="button" id="pc-compress-btn" onclick="pcCompress()">🗜️ Compress PDF to &lt;200 KB</button>
          <button class="primary" type="button" id="pc-download-btn" style="display:none" onclick="pcDownload()">⬇ Download Compressed PDF</button>
          <button class="secondary-btn" type="button" onclick="pcReset()">↩ Choose Another PDF</button>
        </div>
      </div>`,

    videoshorts: `
      <h2>🎬 Video to Shorts Splitter &amp; 9:16 Maker</h2>
      <p>Convert long horizontal videos into viral 9:16 vertical YouTube Shorts, Instagram Reels &amp; TikTok clips. Split by duration with podcast-style blurred background, smart center crop, or viral headline hooks.</p>
      <div class="form">
        <!-- Input Tabs -->
        <div class="ic-mode-nav vs-mode-nav" role="tablist" aria-label="Input mode">
          <button type="button" class="ic-mode-tab active" id="vs-tab-file" role="tab" aria-selected="true" onclick="vsSwitchTab('file')">
            <span class="tab-badge">Fast &amp; 100% Private</span> 📁 Upload Video File
          </button>
          <button type="button" class="ic-mode-tab" id="vs-tab-yt" role="tab" aria-selected="false" onclick="vsSwitchTab('yt')">
            🔗 YouTube Video Link Guide
          </button>
        </div>

        <!-- Tab 1: Video File Upload Dropzone -->
        <div id="vs-file-panel">
          <div
            id="vs-drop"
            class="img-drop-zone"
            role="button"
            tabindex="0"
            aria-label="Drop video file here or click to select"
            onclick="document.getElementById('vs-file').value=''; document.getElementById('vs-file').click()"
            onkeydown="if(event.key==='Enter'||event.key===' '){document.getElementById('vs-file').value='';document.getElementById('vs-file').click()}"
            ondragover="event.preventDefault();this.classList.add('drag-over')"
            ondragleave="this.classList.remove('drag-over')"
            ondrop="vsHandleDrop(event)"
          >
            <div class="drop-icon" aria-hidden="true">🎬</div>
            <p>Drag &amp; drop your video recording here<br><small>or click to browse from device</small></p>
            <p class="drop-formats">Supports MP4, WebM, MOV, MKV • Up to 500 MB • 100% In-Browser Privacy</p>
          </div>
          <input id="vs-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*" class="sr-only" aria-hidden="true" onchange="vsLoadFile(this.files[0])"/>
        </div>

        <!-- Tab 2: YouTube URL Guide Panel -->
        <div id="vs-yt-panel" class="hidden">
          <div class="ic-govt-card" style="padding:16px;">
            <label for="vs-yt-input" class="control-label" style="font-weight:700;">🔗 Paste YouTube Video URL</label>
            <div style="display:flex; gap:8px; margin-top:8px;">
              <input id="vs-yt-input" type="url" placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..." class="form-input" oninput="vsHandleYtInput(this.value)" style="flex:1;"/>
              <button class="primary" type="button" onclick="vsPasteYtUrl()" style="white-space:nowrap; padding:0 14px;">📋 Paste</button>
            </div>
            
            <div id="vs-yt-preview" class="hidden" style="margin-top:14px; padding:12px; border-radius:10px; background:var(--surface); border:1px solid var(--line);">
              <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                <img id="vs-yt-thumb" src="" alt="YouTube Thumbnail" style="width:120px; height:68px; object-fit:cover; border-radius:6px; background:#000;"/>
                <div style="flex:1; min-width:200px;">
                  <strong id="vs-yt-title" style="display:block; font-size:13.5px; color:var(--text); margin-bottom:4px;">YouTube Video Identified</strong>
                  <span id="vs-yt-id-badge" style="font-size:12px; color:var(--muted); font-family:monospace;"></span>
                </div>
              </div>
            </div>

            <div class="vs-info-callout" style="margin-top:14px; margin-bottom:0;">
              <div class="vs-info-icon">💡</div>
              <div>
                <strong>How to turn your YouTube video into Shorts:</strong>
                <p>Due to YouTube's CORS security policy and Google AdSense rules, browsers cannot directly rip video streams without a file. Download your video from <strong>YouTube Studio</strong> (or your video files) as MP4, then click below to upload it:</p>
                <button type="button" class="primary" style="margin-top:10px; padding:8px 16px; font-size:13px;" onclick="vsSwitchTab('file'); document.getElementById('vs-file').click();">📁 Upload Downloaded Video File Now</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Loaded Video Config Panel -->
        <div id="vs-controls" class="hidden">
          <div id="vs-orig-info" class="img-orig-info"></div>

          <!-- Video Preview -->
          <div class="vs-preview-container">
            <video id="vs-video-preview" controls playsinline preload="metadata"></video>
          </div>

          <!-- 1. Duration Slicing Selection -->
          <div class="vs-config-section">
            <label class="control-label" style="font-weight:700; font-size:13px;">⏱️ Slicing Duration per Short:</label>
            <div class="vs-chips-grid">
              <div class="vs-chip" id="vs-dur-15" onclick="vsSetDuration('15')">
                <span class="vs-chip-title">15 Seconds</span>
                <span class="vs-chip-desc">Fast Hook / TikTok</span>
              </div>
              <div class="vs-chip active" id="vs-dur-30" onclick="vsSetDuration('30')">
                <span class="vs-chip-title">30 Seconds ⭐</span>
                <span class="vs-chip-desc">Reels &amp; Shorts Best</span>
              </div>
              <div class="vs-chip" id="vs-dur-60" onclick="vsSetDuration('60')">
                <span class="vs-chip-title">60 Seconds</span>
                <span class="vs-chip-desc">Full 1-Min Deep Dive</span>
              </div>
              <div class="vs-chip" id="vs-dur-custom" onclick="vsSetDuration('custom')">
                <span class="vs-chip-title">Custom Sec</span>
                <span class="vs-chip-desc">Set custom length</span>
              </div>
            </div>
            
            <div id="vs-custom-dur-wrap" class="hidden" style="margin-top:8px;">
              <label for="vs-custom-sec" style="font-size:12px; color:var(--muted);">Clip Length (seconds, 5 to 180s):</label>
              <input id="vs-custom-sec" type="number" min="5" max="180" value="45" oninput="vsUpdateSplitEstimate()"/>
            </div>
          </div>

          <!-- 2. Trim Range (Optional) -->
          <div class="vs-config-section">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label class="control-label" style="font-weight:700; font-size:13px;">✂️ Video Trim Range (Optional):</label>
              <button type="button" class="chip-btn" id="vs-trim-toggle" onclick="vsToggleTrim()" style="font-size:11.5px; padding:3px 8px;">Custom Range: Off</button>
            </div>
            <div id="vs-trim-inputs" class="hidden" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:6px;">
              <div>
                <label for="vs-trim-start" style="font-size:12px; color:var(--muted);">Start Time (mm:ss or sec)</label>
                <input id="vs-trim-start" type="text" placeholder="00:00" value="00:00" onchange="vsUpdateSplitEstimate()"/>
              </div>
              <div>
                <label for="vs-trim-end" style="font-size:12px; color:var(--muted);">End Time (mm:ss or sec)</label>
                <input id="vs-trim-end" type="text" placeholder="End of video" onchange="vsUpdateSplitEstimate()"/>
              </div>
            </div>
          </div>

          <!-- 3. Framing Style (9:16 Vertical) -->
          <div class="vs-config-section">
            <label class="control-label" style="font-weight:700; font-size:13px;">📱 9:16 Vertical Framing Style:</label>
            <div class="vs-framing-grid">
              <div class="vs-frame-card active" id="vs-frame-blur" onclick="vsSetFraming('blur')">
                <span class="vs-frame-icon">🪄</span>
                <span class="vs-frame-name">Blurred Background</span>
                <span class="vs-frame-desc">Centers 16:9 video with soft blurred background. #1 for Podcasts &amp; Tutorials.</span>
              </div>
              <div class="vs-frame-card" id="vs-frame-crop" onclick="vsSetFraming('crop')">
                <span class="vs-frame-icon">✂️</span>
                <span class="vs-frame-name">Center Crop 9:16</span>
                <span class="vs-frame-desc">Fills entire 9:16 vertical screen by zooming center. Best for single-speaker videos.</span>
              </div>
              <div class="vs-frame-card" id="vs-frame-fit" onclick="vsSetFraming('fit')">
                <span class="vs-frame-icon">⬛</span>
                <span class="vs-frame-name">Fit Black Bars</span>
                <span class="vs-frame-desc">Letterbox fit with clean top/bottom black borders. Zero content cropped.</span>
              </div>
              <div class="vs-frame-card" id="vs-frame-original" onclick="vsSetFraming('original')">
                <span class="vs-frame-icon">📐</span>
                <span class="vs-frame-name">Original Ratio</span>
                <span class="vs-frame-desc">Keeps original video dimensions. Slices only duration without re-framing.</span>
              </div>
            </div>
          </div>

          <!-- 4. Viral Hook / Headline Overlay (Optional) -->
          <div class="vs-config-section">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label class="control-label" style="font-weight:700; font-size:13px;">🔥 Viral Hook / Headline Overlay:</label>
              <button type="button" class="chip-btn" id="vs-overlay-toggle" onclick="vsToggleOverlay()" style="font-size:11.5px; padding:3px 8px;">Hook Text: Off</button>
            </div>
            <div id="vs-overlay-inputs" class="hidden" style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
              <input id="vs-overlay-text" type="text" placeholder="e.g. Wait for the end 😱 or Part {i} 🔥" class="form-input" style="font-size:13px;"/>
              <div style="display:flex; gap:10px; font-size:12px; color:var(--muted); align-items:center;">
                <span>Use <code>{i}</code> to automatically insert Short number (Part 1, Part 2...).</span>
              </div>
            </div>
          </div>

          <!-- 5. Resolution & Max Parts Options -->
          <div class="tool-options-grid">
            <div>
              <label for="vs-resolution">Output Quality</label>
              <select id="vs-resolution" class="form-select">
                <option value="1080" selected>1080 × 1920 (Full HD • Best Quality)</option>
                <option value="720">720 × 1280 (HD • Fast Export)</option>
              </select>
            </div>
            <div>
              <label for="vs-max-parts">Max Shorts to Generate</label>
              <select id="vs-max-parts" class="form-select" onchange="vsUpdateSplitEstimate()">
                <option value="all" selected>All possible Shorts</option>
                <option value="3">First 3 Shorts</option>
                <option value="5">First 5 Shorts</option>
                <option value="10">First 10 Shorts</option>
              </select>
            </div>
          </div>

          <!-- Dynamic Estimate -->
          <div id="vs-estimate-box" class="vs-estimate-banner">
            🎬 Calculating split parts...
          </div>

          <!-- Action Buttons -->
          <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
            <button class="primary vs-generate-btn" id="vs-start-btn" type="button" onclick="vsStartSplitting()" style="flex:1; min-width:200px; padding:12px 18px; font-size:15px; font-weight:700;">
              🚀 Generate 9:16 Shorts Now
            </button>
            <button class="secondary-btn" type="button" onclick="vsReset()" style="padding:12px 16px;">
              ↩ Choose Another Video
            </button>
          </div>
        </div>

        <!-- In-Progress Rendering Box -->
        <div id="vs-progress-wrap" class="vs-progress-wrap hidden">
          <div class="vs-progress-header">
            <span id="vs-progress-status">Preparing video renderer...</span>
            <span id="vs-progress-pct">0%</span>
          </div>
          <div class="vs-progress-track">
            <div id="vs-progress-bar" class="vs-progress-bar" style="width:0%;"></div>
          </div>
          
          <div class="vs-live-canvas-wrap">
            <div class="vs-canvas-label">🔴 Live 9:16 Render Preview:</div>
            <canvas id="vs-canvas"></canvas>
          </div>

          <div style="text-align:center; margin-top:14px;">
            <button type="button" class="secondary-btn" onclick="vsCancelSplitting()" style="padding:8px 18px; font-size:13px;">
              ⏹ Cancel Splitting
            </button>
          </div>
        </div>

        <!-- Completed Output Gallery -->
        <div id="vs-results-wrap" class="vs-results-wrap hidden">
          <div class="vs-results-header">
            <div>
              <h3 id="vs-results-title">🎉 Generated Viral Shorts!</h3>
              <p id="vs-results-sub">All Shorts are ready in 9:16 vertical format for YouTube Shorts, Instagram Reels &amp; TikTok.</p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="primary" type="button" id="vs-btn-zip" onclick="vsDownloadAllZip()" style="padding:9px 15px; font-size:13px; background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff;">
                📦 Download All as ZIP
              </button>
              <button class="secondary-btn" type="button" onclick="vsDownloadAll()" style="padding:9px 15px; font-size:13px;">
                ⬇ Download All (Sequential)
              </button>
              <button class="secondary-btn" type="button" onclick="vsReset()" style="padding:9px 15px; font-size:13px;">
                ↩ Process Another
              </button>
            </div>
          </div>

          <div id="vs-shorts-grid" class="vs-shorts-grid"></div>
        </div>

        <p class="info-note" style="margin-top:16px;">
          🔒 <strong>100% Client-Side Privacy:</strong> Your video is sliced and framed directly inside your browser. No files are ever sent to an external server or cloud.
        </p>
      </div>`,

    fd: `
      <h2>🏦 Fixed Deposit (FD) Calculator</h2>
      <p>Calculate total maturity wealth, quarterly compound interest earned, and milestone returns with Indian Bank standard rules.</p>
      <div class="form sip-calc-form">
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="fd_principal">Total Deposit Amount (₹)</label>
            <span class="sip-val-display" id="fd_principal_val">₹1,00,000</span>
          </div>
          <input id="fd_principal" type="number" min="1000" max="50000000" step="5000" value="100000" placeholder="100000" oninput="fdSyncInput('principal')" aria-required="true"/>
          <input id="fd_principal_range" type="range" min="5000" max="2500000" step="5000" value="100000" oninput="fdSyncRange('principal')" aria-label="Deposit amount slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="fdSetPrincipal(25000)">₹25,000</button>
            <button type="button" class="preset-chip" onclick="fdSetPrincipal(50000)">₹50,000</button>
            <button type="button" class="preset-chip" onclick="fdSetPrincipal(100000)">₹1 Lakh</button>
            <button type="button" class="preset-chip" onclick="fdSetPrincipal(500000)">₹5 Lakh</button>
            <button type="button" class="preset-chip" onclick="fdSetPrincipal(1000000)">₹10 Lakh</button>
          </div>
        </div>

        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="fd_rate">Annual Interest Rate (p.a. %)</label>
            <span class="sip-val-display" id="fd_rate_val">7.1%</span>
          </div>
          <input id="fd_rate" type="number" min="1" max="20" step="0.1" value="7.1" placeholder="7.1" oninput="fdSyncInput('rate')" aria-required="true"/>
          <input id="fd_rate_range" type="range" min="3" max="12" step="0.1" value="7.1" oninput="fdSyncRange('rate')" aria-label="Interest rate slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="fdSetRate(6.5)">6.5% (Regular)</button>
            <button type="button" class="preset-chip" onclick="fdSetRate(7.1)">7.1% (SBI/HDFC Standard)</button>
            <button type="button" class="preset-chip" onclick="fdSetRate(7.6)">7.6% (Senior Citizen)</button>
            <button type="button" class="preset-chip" onclick="fdSetRate(8.2)">8.2% (Small Finance Bank)</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="sip-input-group">
            <label for="fd_years">Tenure (Years)</label>
            <input id="fd_years" type="number" min="0" max="30" step="1" value="3" placeholder="3" oninput="calcFd()" aria-required="true"/>
          </div>
          <div class="sip-input-group">
            <label for="fd_months">Tenure (Months)</label>
            <input id="fd_months" type="number" min="0" max="11" step="1" value="0" placeholder="0" oninput="calcFd()"/>
          </div>
        </div>

        <div class="sip-input-group">
          <label for="fd_freq">Compounding Frequency</label>
          <select id="fd_freq" onchange="calcFd()">
            <option value="4" selected>Quarterly (Standard Bank Rule)</option>
            <option value="12">Monthly</option>
            <option value="2">Half-Yearly</option>
            <option value="1">Annually</option>
            <option value="simple">Simple Interest (Payout)</option>
          </select>
        </div>

        <button class="primary" type="button" onclick="calcFd()">🏦 Calculate FD Maturity</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    ppf: `
      <h2>🛡️ PPF Calculator (Public Provident Fund)</h2>
      <p>Calculate 15-year PPF maturity wealth, government-guaranteed tax-free interest, and Section 80C tax savings.</p>
      <div class="form sip-calc-form">
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="ppf_deposit">Annual Yearly Deposit (₹)</label>
            <span class="sip-val-display" id="ppf_deposit_val">₹1,50,000</span>
          </div>
          <input id="ppf_deposit" type="number" min="500" max="150000" step="500" value="150000" placeholder="150000" oninput="ppfSyncInput()" aria-required="true"/>
          <input id="ppf_deposit_range" type="range" min="500" max="150000" step="500" value="150000" oninput="ppfSyncRange()" aria-label="Yearly deposit slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="ppfSetDeposit(12000)">₹12,000 (₹1k/mo)</button>
            <button type="button" class="preset-chip" onclick="ppfSetDeposit(30000)">₹30,000</button>
            <button type="button" class="preset-chip" onclick="ppfSetDeposit(60000)">₹60,000 (₹5k/mo)</button>
            <button type="button" class="preset-chip" onclick="ppfSetDeposit(100000)">₹1,00,000</button>
            <button type="button" class="preset-chip" onclick="ppfSetDeposit(150000)">₹1,50,000 (Max 80C)</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="sip-input-group">
            <label for="ppf_rate">Govt Interest Rate (p.a. %)</label>
            <input id="ppf_rate" type="number" min="1" max="15" step="0.1" value="7.1" placeholder="7.1" oninput="calcPpf()" aria-required="true"/>
          </div>
          <div class="sip-input-group">
            <label for="ppf_tenure">Tenure Duration</label>
            <select id="ppf_tenure" onchange="calcPpf()">
              <option value="15" selected>15 Years (Standard Lock-in)</option>
              <option value="20">20 Years (1 Block Extension)</option>
              <option value="25">25 Years (2 Block Extensions)</option>
            </select>
          </div>
        </div>

        <button class="primary" type="button" onclick="calcPpf()">🛡️ Calculate PPF Returns</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    lumpsum: `
      <h2>💰 Lump Sum Investment Calculator</h2>
      <p>Estimate the growth of your one-time mutual fund investment with power of compounding and long-term milestones.</p>
      <div class="form sip-calc-form">
        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="ls_amount">Total One-Time Investment (₹)</label>
            <span class="sip-val-display" id="ls_amount_val">₹1,00,000</span>
          </div>
          <input id="ls_amount" type="number" min="5000" max="100000000" step="5000" value="100000" placeholder="100000" oninput="lsSyncInput('amount')" aria-required="true"/>
          <input id="ls_amount_range" type="range" min="5000" max="2500000" step="5000" value="100000" oninput="lsSyncRange('amount')" aria-label="Investment amount slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="lsSetAmount(25000)">₹25,000</button>
            <button type="button" class="preset-chip" onclick="lsSetAmount(50000)">₹50,000</button>
            <button type="button" class="preset-chip" onclick="lsSetAmount(100000)">₹1 Lakh</button>
            <button type="button" class="preset-chip" onclick="lsSetAmount(500000)">₹5 Lakh</button>
            <button type="button" class="preset-chip" onclick="lsSetAmount(1000000)">₹10 Lakh</button>
          </div>
        </div>

        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="ls_rate">Expected Annual Return Rate (p.a. %)</label>
            <span class="sip-val-display" id="ls_rate_val">12%</span>
          </div>
          <input id="ls_rate" type="number" min="1" max="50" step="0.5" value="12" placeholder="12" oninput="lsSyncInput('rate')" aria-required="true"/>
          <input id="ls_rate_range" type="range" min="1" max="30" step="0.5" value="12" oninput="lsSyncRange('rate')" aria-label="Return rate slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="lsSetRate(8)">8% (Debt / FD)</button>
            <button type="button" class="preset-chip" onclick="lsSetRate(12)">12% (Nifty Index)</button>
            <button type="button" class="preset-chip" onclick="lsSetRate(15)">15% (Aggressive Equity)</button>
          </div>
        </div>

        <div class="sip-input-group">
          <div class="sip-label-row">
            <label for="ls_years">Investment Time Period (Years)</label>
            <span class="sip-val-display" id="ls_years_val">10 Yrs</span>
          </div>
          <input id="ls_years" type="number" min="1" max="40" step="1" value="10" placeholder="10" oninput="lsSyncInput('years')" aria-required="true"/>
          <input id="ls_years_range" type="range" min="1" max="35" step="1" value="10" oninput="lsSyncRange('years')" aria-label="Tenure slider"/>
          <div class="ic-quick-chips">
            <button type="button" class="preset-chip" onclick="lsSetYears(3)">3 Yrs</button>
            <button type="button" class="preset-chip" onclick="lsSetYears(5)">5 Yrs</button>
            <button type="button" class="preset-chip" onclick="lsSetYears(10)">10 Yrs</button>
            <button type="button" class="preset-chip" onclick="lsSetYears(15)">15 Yrs</button>
            <button type="button" class="preset-chip" onclick="lsSetYears(20)">20 Yrs</button>
          </div>
        </div>

        <button class="primary" type="button" onclick="calcLumpsum()">💰 Calculate Lump Sum Wealth</button>
        <div id="res" class="result hidden"></div>
      </div>`,

    wordcount: `
      <h2>📝 Word & Character Counter</h2>
      <p>Live word counter, character counter, sentence analyzer, reading time, and social media post limits.</p>
      <div class="form">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label for="wc_input">Your Text Content</label>
            <div style="display:flex; gap:8px;">
              <button type="button" class="preset-chip" onclick="wcLoadSample()">Sample Text</button>
              <button type="button" class="preset-chip" onclick="wcClear()">Clear</button>
            </div>
          </div>
          <textarea id="wc_input" rows="8" placeholder="Type or paste your text here..." oninput="calcWordCount()" style="width:100%; box-sizing:border-box;"></textarea>
        </div>

        <!-- Live Statistics Counter Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-top:12px;">
          <div class="sip-stat-box" style="padding:10px; text-align:center;">
            <span class="sip-stat-label">Words</span>
            <span class="sip-stat-val text-green" id="wc_words">0</span>
          </div>
          <div class="sip-stat-box" style="padding:10px; text-align:center;">
            <span class="sip-stat-label">Characters</span>
            <span class="sip-stat-val" id="wc_chars">0</span>
          </div>
          <div class="sip-stat-box" style="padding:10px; text-align:center;">
            <span class="sip-stat-label">No Spaces</span>
            <span class="sip-stat-val" id="wc_chars_nospace">0</span>
          </div>
          <div class="sip-stat-box" style="padding:10px; text-align:center;">
            <span class="sip-stat-label">Sentences</span>
            <span class="sip-stat-val" id="wc_sentences">0</span>
          </div>
          <div class="sip-stat-box" style="padding:10px; text-align:center;">
            <span class="sip-stat-label">Paragraphs</span>
            <span class="sip-stat-val" id="wc_paragraphs">0</span>
          </div>
        </div>

        <!-- Reading & Speaking Time -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
          <div class="sip-stat-box" style="padding:10px;">
            <span class="sip-stat-label">📖 Reading Time</span>
            <span class="sip-stat-val" style="font-size:16px;" id="wc_reading_time">&lt; 1 min</span>
          </div>
          <div class="sip-stat-box" style="padding:10px;">
            <span class="sip-stat-label">🎙️ Speaking Time</span>
            <span class="sip-stat-val" style="font-size:16px;" id="wc_speaking_time">&lt; 1 min</span>
          </div>
        </div>

        <!-- Social Media Limits -->
        <div class="sip-milestones" style="margin-top:12px;">
          <div class="sip-milestones-title">Social Media Character Limits:</div>
          <div class="sip-milestones-grid">
            <div class="sip-m-card"><strong>X / Twitter (280)</strong><span id="wc_twitter">280 left</span></div>
            <div class="sip-m-card"><strong>Instagram (2,200)</strong><span id="wc_insta">2200 left</span></div>
            <div class="sip-m-card"><strong>LinkedIn (3,000)</strong><span id="wc_linkedin">3000 left</span></div>
          </div>
        </div>

        <div style="margin-top:14px; display:flex; gap:10px;">
          <button class="primary" type="button" onclick="wcCopyText()">📋 Copy Text</button>
        </div>
      </div>`,

    password: `
      <h2>🔐 Strong Password Generator</h2>
      <p>Generate highly secure, randomized passwords using client-side cryptographic randomness (CSPRNG).</p>
      <div class="form">
        <!-- Generated Password Display -->
        <div style="display:flex; gap:8px; align-items:center;">
          <input id="pw_output" type="text" readonly style="font-family:monospace; font-size:18px; font-weight:700; letter-spacing:1px; flex:1;" aria-label="Generated password"/>
          <button type="button" class="icon-btn" onclick="genPassword()" title="Generate new password" style="width:44px; height:44px; font-size:20px;">🎲</button>
          <button type="button" class="primary" onclick="pwCopy()" style="padding:0 18px; height:44px;">📋 Copy</button>
        </div>

        <!-- Strength Meter Bar -->
        <div style="margin-top:10px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; font-weight:600;">
            <span>Password Strength: <strong id="pw_strength_text" style="color:#10b981;">Strong</strong></span>
            <span id="pw_entropy" style="opacity:0.8;">72 bits</span>
          </div>
          <div style="height:6px; background:var(--border, #e2e8f0); border-radius:3px; overflow:hidden;">
            <div id="pw_strength_bar" style="height:100%; width:80%; background:#10b981; transition:width 0.3s, background 0.3s;"></div>
          </div>
        </div>

        <!-- Length Slider -->
        <div class="sip-input-group" style="margin-top:14px;">
          <div class="sip-label-row">
            <label for="pw_length">Password Length: <span id="pw_len_val" style="color:var(--accent); font-weight:700;">16</span> characters</label>
          </div>
          <input id="pw_length" type="range" min="6" max="64" step="1" value="16" oninput="document.getElementById('pw_len_val').textContent = this.value; genPassword();" aria-label="Password length slider"/>
        </div>

        <!-- Options Checkboxes -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="pw_upper" checked onchange="genPassword()"/> Uppercase (A-Z)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="pw_lower" checked onchange="genPassword()"/> Lowercase (a-z)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="pw_nums" checked onchange="genPassword()"/> Numbers (0-9)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="pw_syms" checked onchange="genPassword()"/> Symbols (!@#$%)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; grid-column: span 2;">
            <input type="checkbox" id="pw_exc_ambig" onchange="genPassword()"/> Avoid ambiguous characters (0, O, o, 1, l, I)
          </label>
        </div>

        <!-- Quick Presets -->
        <div class="ic-quick-chips" style="margin-top:14px;">
          <button type="button" class="preset-chip" onclick="pwPreset(4, false, false, true, false)">4-Digit PIN</button>
          <button type="button" class="preset-chip" onclick="pwPreset(6, false, false, true, false)">6-Digit PIN</button>
          <button type="button" class="preset-chip" onclick="pwPreset(12, true, true, true, false)">Memorable (12)</button>
          <button type="button" class="preset-chip" onclick="pwPreset(16, true, true, true, true)">Standard (16)</button>
          <button type="button" class="preset-chip" onclick="pwPreset(32, true, true, true, true)">Maximum (32)</button>
        </div>
      </div>`,

    caseconverter: `
      <h2>🔤 Text Case Converter</h2>
      <p>Transform text casing instantly across sentence case, UPPERCASE, lowercase, Title Case, camelCase, snake_case, and more.</p>
      <div class="form">
        <textarea id="cc_input" rows="7" placeholder="Type or paste your text here to convert casing..." style="width:100%; box-sizing:border-box;"></textarea>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-top:4px; opacity:0.8;">
          <span>Length: <strong id="cc_chars">0</strong> characters</span>
          <button type="button" class="preset-chip" onclick="ccClear()">Clear</button>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;">
          <button type="button" class="primary" onclick="convertCase('sentence')">Sentence case</button>
          <button type="button" class="primary" onclick="convertCase('lower')">lower case</button>
          <button type="button" class="primary" onclick="convertCase('upper')">UPPER CASE</button>
          <button type="button" class="primary" onclick="convertCase('title')">Title Case</button>
          <button type="button" class="secondary-btn" onclick="convertCase('camel')">camelCase</button>
          <button type="button" class="secondary-btn" onclick="convertCase('pascal')">PascalCase</button>
          <button type="button" class="secondary-btn" onclick="convertCase('snake')">snake_case</button>
          <button type="button" class="secondary-btn" onclick="convertCase('kebab')">kebab-case</button>
          <button type="button" class="secondary-btn" onclick="convertCase('inverse')">InVeRsE cAsE</button>
        </div>

        <div style="display:flex; gap:10px; margin-top:14px;">
          <button type="button" class="primary" onclick="ccCopy()">📋 Copy Text</button>
          <button type="button" class="secondary-btn" onclick="ccDownload()">⬇ Download .txt</button>
        </div>
      </div>`,

    base64: `
      <h2>🔄 Base64 Encoder & Decoder</h2>
      <p>Encode plain text into Base64 or decode Base64 strings back to clean text with full UTF-8 &amp; emoji support.</p>
      <div class="form">
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
            <input type="checkbox" id="b64_urlsafe"/> URL-Safe Base64 (RFC 4648)
          </label>
        </div>

        <label for="b64_input">Input Text or Base64 String</label>
        <textarea id="b64_input" rows="5" placeholder="Enter text to encode or Base64 string to decode..." style="width:100%; box-sizing:border-box;"></textarea>

        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="primary" type="button" onclick="convertBase64('encode')">🔒 Encode to Base64</button>
          <button class="secondary-btn" type="button" onclick="convertBase64('decode')">🔓 Decode from Base64</button>
          <button class="preset-chip" type="button" onclick="b64Clear()">Clear</button>
        </div>

        <label for="b64_output" style="margin-top:14px; display:block;">Output Result</label>
        <textarea id="b64_output" rows="5" readonly placeholder="Result will appear here..." style="width:100%; box-sizing:border-box; font-family:monospace;"></textarea>

        <div style="margin-top:10px;">
          <button class="primary" type="button" onclick="b64Copy()">📋 Copy Output</button>
        </div>
      </div>`,

    jsonformat: `
      <h2>✨ JSON Formatter & Validator</h2>
      <p>Beautify, indent, validate syntax, and minify JSON data with instant error line detection.</p>
      <div class="form">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label for="json_input">JSON Input</label>
          <div style="display:flex; gap:8px;">
            <button type="button" class="preset-chip" onclick="jsonLoadSample()">Load Sample</button>
            <button type="button" class="preset-chip" onclick="document.getElementById('json_input').value=''; document.getElementById('json_output').value='';">Clear</button>
          </div>
        </div>
        <textarea id="json_input" rows="7" placeholder="Paste unformatted or raw JSON here..." style="width:100%; box-sizing:border-box; font-family:monospace; font-size:13px;"></textarea>

        <div id="json_status" class="json-status-banner" style="margin-top:8px; display:none;"></div>

        <div style="display:flex; gap:10px; align-items:center; margin-top:10px; flex-wrap:wrap;">
          <label for="json_indent" style="font-size:13px;">Indent:</label>
          <select id="json_indent" style="width:auto; padding:6px 10px;">
            <option value="2" selected>2 Spaces</option>
            <option value="4">4 Spaces</option>
          </select>
          <button class="primary" type="button" onclick="formatJson('format')">✨ Beautify JSON</button>
          <button class="secondary-btn" type="button" onclick="formatJson('minify')">📦 Minify JSON</button>
          <button class="secondary-btn" type="button" onclick="formatJson('validate')">✓ Validate Syntax</button>
        </div>

        <label for="json_output" style="margin-top:14px; display:block;">Formatted JSON Output</label>
        <textarea id="json_output" rows="8" readonly placeholder="Formatted output will appear here..." style="width:100%; box-sizing:border-box; font-family:monospace; font-size:13px;"></textarea>

        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="primary" type="button" onclick="jsonCopy()">📋 Copy JSON</button>
          <button class="secondary-btn" type="button" onclick="jsonDownload()">⬇ Download .json</button>
        </div>
      </div>`,

    colorpicker: `
      <h2>🎨 Color Picker & Converter</h2>
      <p>Pick colors, convert between HEX, RGB, HSL, and CMYK formats, and check WCAG accessibility contrast ratios.</p>
      <div class="form">
        <!-- Interactive Color Wheel & Preview Swatch -->
        <div style="display:flex; gap:16px; align-items:center; margin-bottom:14px; flex-wrap:wrap;">
          <input type="color" id="cp_wheel" value="#5b4fff" oninput="updateColorPicker(this.value)" style="width:64px; height:64px; border:none; border-radius:12px; cursor:pointer;" aria-label="Color wheel picker"/>
          <div id="cp_preview" style="width:64px; height:64px; border-radius:12px; border:2px solid var(--border, #e2e8f0); background-color:#5b4fff; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
          <div>
            <label for="cp_hex">HEX Code</label>
            <input type="text" id="cp_hex" value="#5B4FFF" maxlength="7" oninput="updateColorPicker(this.value)" style="font-family:monospace; font-weight:700; width:130px; text-transform:uppercase;"/>
          </div>
        </div>

        <!-- Color Format Conversion Rows -->
        <div style="display:grid; grid-template-columns: 1fr; gap:10px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="width:55px; font-weight:700; font-size:13px;">HEX:</span>
            <input type="text" id="cp_val_hex" readonly value="#5B4FFF" style="flex:1; font-family:monospace;"/>
            <button type="button" class="preset-chip" onclick="colorCopy('hex')">Copy</button>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="width:55px; font-weight:700; font-size:13px;">RGB:</span>
            <input type="text" id="cp_val_rgb" readonly value="rgb(91, 79, 255)" style="flex:1; font-family:monospace;"/>
            <button type="button" class="preset-chip" onclick="colorCopy('rgb')">Copy</button>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="width:55px; font-weight:700; font-size:13px;">HSL:</span>
            <input type="text" id="cp_val_hsl" readonly value="hsl(244, 100%, 65%)" style="flex:1; font-family:monospace;"/>
            <button type="button" class="preset-chip" onclick="colorCopy('hsl')">Copy</button>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="width:55px; font-weight:700; font-size:13px;">CMYK:</span>
            <input type="text" id="cp_val_cmyk" readonly value="cmyk(64%, 69%, 0%, 0%)" style="flex:1; font-family:monospace;"/>
            <button type="button" class="preset-chip" onclick="colorCopy('cmyk')">Copy</button>
          </div>
        </div>

        <!-- WCAG Contrast Check -->
        <div class="sip-milestones" style="margin-top:14px;">
          <div class="sip-milestones-title">WCAG Contrast Accessibility:</div>
          <div class="sip-milestones-grid">
            <div class="sip-m-card"><strong>Against White Text</strong><span id="cp_contrast_white">4.82:1 ✓ Pass</span></div>
            <div class="sip-m-card"><strong>Against Black Text</strong><span id="cp_contrast_black">4.36:1 ✓ Pass</span></div>
          </div>
        </div>
      </div>`,

    markdown: `
      <h2>📑 Markdown to HTML Previewer</h2>
      <p>Live Markdown text editor with real-time rendered HTML preview and one-click code copy.</p>
      <div class="form">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label for="md_input">Markdown Source</label>
          <div style="display:flex; gap:8px;">
            <button type="button" class="preset-chip" onclick="mdLoadSample()">Sample Template</button>
            <button type="button" class="preset-chip" onclick="document.getElementById('md_input').value=''; renderMarkdown();">Clear</button>
          </div>
        </div>
        <textarea id="md_input" rows="8" placeholder="Type Markdown here... (# Heading, **bold**, *italic*, - list)" oninput="renderMarkdown()" style="width:100%; box-sizing:border-box; font-family:monospace;"></textarea>

        <label style="margin-top:14px; display:block;">Live Rendered HTML Preview</label>
        <div id="md_preview" style="min-height:120px; padding:14px; border:1px solid var(--border, #e2e8f0); border-radius:8px; background:var(--card-bg, #ffffff); margin-top:4px;"></div>

        <input type="hidden" id="md_html_code"/>
        <div style="display:flex; gap:10px; margin-top:14px;">
          <button class="primary" type="button" onclick="mdCopyHtml()">📋 Copy HTML Code</button>
        </div>
      </div>`,

  };

  const tool = TOOLS.find(t => t.id === id);
  return forms[id] || `<h2>${tool ? tool.name : 'Tool'}</h2><p>This tool is coming soon. Check back later!</p>`;
}

/* ─────────────────────────────────────────
   Calculator Functions
───────────────────────────────────────── */
function safeCalc(fn) {
  try { fn(); } catch (err) { showError(err.message); }
}

function calcAge() {
  safeCalc(() => {
    const dob = getDate('dob', 'date of birth');
    const now = new Date();
    if (dob > now) return showError('Date of birth cannot be in the future.');
    let y = now.getFullYear() - dob.getFullYear();
    let m = now.getMonth() - dob.getMonth();
    let d = now.getDate() - dob.getDate();
    if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const text = `${y} years, ${m} months, ${d} days`;
    showResult(`${text}`, text);
  });
}

function calcSip() {
  safeCalc(() => {
    const p = getPositive('sip_amount', 'Monthly Investment');
    const r = getPositive('sip_rate', 'Expected Return Rate');
    const y = getPositive('sip_years', 'Investment Period');

    const i = r / (12 * 100);
    const n = y * 12;

    // Formula: M = P * [((1 + i)^n - 1) / i] * (1 + i)
    const maturity = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const invested = p * n;
    const gain = maturity - invested;

    const investedPct = ((invested / maturity) * 100).toFixed(1);
    const gainPct = (100 - parseFloat(investedPct)).toFixed(1);

    function getM(years) {
      const mn = years * 12;
      return p * ((Math.pow(1 + i, mn) - 1) / i) * (1 + i);
    }
    const m5 = getM(5);
    const m10 = getM(10);
    const m15 = getM(15);
    const m20 = getM(20);

    const html = `
      <div class="sip-result-card">
        <div class="sip-maturity-hero">
          <div class="sip-maturity-label">Expected Maturity Value (Total Wealth)</div>
          <div class="sip-maturity-amount">₹${fmt(maturity.toFixed(0))}</div>
        </div>

        <div class="sip-stats-grid">
          <div class="sip-stat-box">
            <span class="sip-stat-label">💰 Total Invested</span>
            <span class="sip-stat-val">₹${fmt(invested.toFixed(0))}</span>
            <span class="sip-stat-pct">(${investedPct}% of total)</span>
          </div>
          <div class="sip-stat-box highlight">
            <span class="sip-stat-label">📈 Wealth Gain (Returns)</span>
            <span class="sip-stat-val text-green">+₹${fmt(gain.toFixed(0))}</span>
            <span class="sip-stat-pct">(${gainPct}% of total)</span>
          </div>
        </div>

        <div class="sip-bar-wrap" title="Invested ${investedPct}% | Returns ${gainPct}%">
          <div class="sip-bar-invested" style="width: ${investedPct}%"></div>
          <div class="sip-bar-gain" style="width: ${gainPct}%"></div>
        </div>
        <div class="sip-bar-legend">
          <span><span class="dot dot-invested"></span> Invested: ₹${fmt(invested.toFixed(0))}</span>
          <span><span class="dot dot-gain"></span> Wealth Gain: ₹${fmt(gain.toFixed(0))}</span>
        </div>

        <div class="sip-milestones">
          <div class="sip-milestones-title">Milestone Projections at ${r}% Annual Return:</div>
          <div class="sip-milestones-grid">
            <div class="sip-m-card"><strong>5 Yrs</strong><span>₹${fmt(m5.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>10 Yrs</strong><span>₹${fmt(m10.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>15 Yrs</strong><span>₹${fmt(m15.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>20 Yrs</strong><span>₹${fmt(m20.toFixed(0))}</span></div>
          </div>
        </div>
      </div>
    `;

    const plain = `SIP Maturity: ₹${fmt(maturity.toFixed(0))} (Invested: ₹${fmt(invested.toFixed(0))}, Wealth Gain: ₹${fmt(gain.toFixed(0))}) for ₹${fmt(p)}/month over ${y} years at ${r}% p.a.`;

    showResult(html, plain);
  });
}

function sipSyncInput(field) {
  const inp = document.getElementById(`sip_${field}`);
  const rng = document.getElementById(`sip_${field}_range`);
  const lbl = document.getElementById(`sip_${field}_val`);
  if (!inp) return;
  const val = parseFloat(inp.value) || 0;
  if (rng) rng.value = val;
  if (lbl) {
    if (field === 'amount') lbl.textContent = `₹${fmt(val)}`;
    else if (field === 'rate') lbl.textContent = `${val}%`;
    else if (field === 'years') lbl.textContent = `${val} Yrs`;
  }
  calcSip();
}

function sipSyncRange(field) {
  const inp = document.getElementById(`sip_${field}`);
  const rng = document.getElementById(`sip_${field}_range`);
  const lbl = document.getElementById(`sip_${field}_val`);
  if (!rng) return;
  const val = parseFloat(rng.value) || 0;
  if (inp) inp.value = val;
  if (lbl) {
    if (field === 'amount') lbl.textContent = `₹${fmt(val)}`;
    else if (field === 'rate') lbl.textContent = `${val}%`;
    else if (field === 'years') lbl.textContent = `${val} Yrs`;
  }
  calcSip();
}

function sipSetAmount(amount) {
  const inp = document.getElementById('sip_amount');
  const rng = document.getElementById('sip_amount_range');
  const lbl = document.getElementById('sip_amount_val');
  if (inp) inp.value = amount;
  if (rng) rng.value = amount;
  if (lbl) lbl.textContent = `₹${fmt(amount)}`;
  calcSip();
}

function sipSetRate(rate) {
  const inp = document.getElementById('sip_rate');
  const rng = document.getElementById('sip_rate_range');
  const lbl = document.getElementById('sip_rate_val');
  if (inp) inp.value = rate;
  if (rng) rng.value = rate;
  if (lbl) lbl.textContent = `${rate}%`;
  calcSip();
}

function sipSetYears(years) {
  const inp = document.getElementById('sip_years');
  const rng = document.getElementById('sip_years_range');
  const lbl = document.getElementById('sip_years_val');
  if (inp) inp.value = years;
  if (rng) rng.value = years;
  if (lbl) lbl.textContent = `${years} Yrs`;
  calcSip();
}

/* ─────────────────────────────────────────
   EMI Calculator Functions (Reducing Balance vs Flat Rate)
───────────────────────────────────────── */
let _emiMode = 'flat'; // 'flat' (default car/NBFC) or 'reducing' (bank standard)

function emiSetMode(mode) {
  _emiMode = mode;
  document.querySelectorAll('#modal [id^="emi-tab-"], #toolContent [id^="emi-tab-"]').forEach(t => {
    t.classList.remove('active', 'is-active');
    t.setAttribute('aria-selected', 'false');
  });
  const tab = document.getElementById(`emi-tab-${mode}`);
  if (tab) {
    tab.classList.add('active', 'is-active');
    tab.setAttribute('aria-selected', 'true');
  }
  calcEmi();
}

function emiSyncInput(field) {
  const inp = document.getElementById(field);
  const rng = document.getElementById(`${field}_range`);
  const lbl = document.getElementById(`${field}_val`);
  if (!inp) return;
  const val = parseFloat(inp.value) || 0;
  if (rng) rng.value = val;
  if (lbl) {
    if (field === 'loan') lbl.textContent = `₹${fmt(val)}`;
    else if (field === 'rate') lbl.textContent = `${val}%`;
    else if (field === 'years') lbl.textContent = `${val} Yrs`;
  }
  calcEmi();
}

function emiSyncRange(field) {
  const inp = document.getElementById(field);
  const rng = document.getElementById(`${field}_range`);
  const lbl = document.getElementById(`${field}_val`);
  if (!rng) return;
  const val = parseFloat(rng.value) || 0;
  if (inp) inp.value = val;
  if (lbl) {
    if (field === 'loan') lbl.textContent = `₹${fmt(val)}`;
    else if (field === 'rate') lbl.textContent = `${val}%`;
    else if (field === 'years') lbl.textContent = `${val} Yrs`;
  }
  calcEmi();
}

function emiSetLoan(amount) {
  const inp = document.getElementById('loan');
  const rng = document.getElementById('loan_range');
  const lbl = document.getElementById('loan_val');
  if (inp) inp.value = amount;
  if (rng) rng.value = amount;
  if (lbl) lbl.textContent = `₹${fmt(amount)}`;
  calcEmi();
}

function emiSetRate(rate) {
  const inp = document.getElementById('rate');
  const rng = document.getElementById('rate_range');
  const lbl = document.getElementById('rate_val');
  if (inp) inp.value = rate;
  if (rng) rng.value = rate;
  if (lbl) lbl.textContent = `${rate}%`;
  calcEmi();
}

function emiSetYears(years) {
  const inp = document.getElementById('years');
  const rng = document.getElementById('years_range');
  const lbl = document.getElementById('years_val');
  if (inp) inp.value = years;
  if (rng) rng.value = years;
  if (lbl) lbl.textContent = `${years} Yrs`;
  calcEmi();
}

function findEffectiveReducingRate(principal, monthlyEmi, months) {
  let low = 0.00001; // monthly rate
  let high = 0.5;    // 600% annual max
  for (let iter = 0; iter < 45; iter++) {
    const mid = (low + high) / 2;
    const pv = (monthlyEmi * (1 - Math.pow(1 + mid, -months))) / mid;
    if (pv > principal) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 12 * 100;
}

function calcEmi() {
  safeCalc(() => {
    const p = getPositive('loan', 'loan amount');
    const r = getPositive('rate', 'interest rate');
    const y = getPositive('years', 'tenure');
    const n = y * 12;

    let emi, total, interest;
    let eqFlat = 0;
    let effReducing = 0;
    let alertHtml = '';
    let rowsHtml = '';

    if (_emiMode === 'flat') {
      // Flat Rate: Interest = (P * R * Y) / 100
      interest = (p * r * y) / 100;
      total = p + interest;
      emi = total / n;
      effReducing = findEffectiveReducingRate(p, emi, n);

      // What standard reducing balance would charge at same R:
      const r_monthly = (r / 1200);
      const emi_red = p * r_monthly * Math.pow(1 + r_monthly, n) / (Math.pow(1 + r_monthly, n) - 1);
      const red_interest = (emi_red * n) - p;
      const extraInterest = interest - red_interest;

      alertHtml = `
        <div class="fin-alert-card warn">
          ⚠️ <strong>Flat Rate Reality Check:</strong> An <strong>${r}% Flat Rate</strong> is actually equivalent to a <strong>${effReducing.toFixed(2)}% Reducing Balance APR</strong>! You are paying approximately <strong>₹${fmt(extraInterest.toFixed(0))} EXTRA interest</strong> compared to a bank reducing balance loan.
        </div>
      `;

      // Flat amortization schedule
      const annualP = p / y;
      const annualI = interest / y;
      let bal = p;
      for (let yr = 1; yr <= y; yr++) {
        const opening = bal;
        const closing = Math.max(0, bal - annualP);
        bal = closing;
        rowsHtml += `<tr><td>Year ${yr}</td><td>₹${fmt(opening.toFixed(0))}</td><td>₹${fmt(annualP.toFixed(0))}</td><td>₹${fmt(annualI.toFixed(0))}</td><td>₹${fmt(closing.toFixed(0))}</td></tr>`;
      }
    } else {
      // Reducing Balance Rate (Standard Bank)
      const r_monthly = r / 1200;
      emi = p * r_monthly * Math.pow(1 + r_monthly, n) / (Math.pow(1 + r_monthly, n) - 1);
      total = emi * n;
      interest = total - p;
      eqFlat = (interest * 100) / (p * y);

      alertHtml = `
        <div class="fin-alert-card info">
          💡 <strong>Bank Standard Advantage:</strong> Interest reduces every month as principal is repaid. Your <strong>${r}% reducing rate</strong> is equivalent to an ultra-low effective flat rate of <strong>~${eqFlat.toFixed(2)}% flat p.a.</strong>
        </div>
      `;

      // Reducing amortization schedule
      let bal = p;
      for (let yr = 1; yr <= y; yr++) {
        const opening = bal;
        let yrP = 0, yrI = 0;
        for (let m = 0; m < 12; m++) {
          const mI = bal * r_monthly;
          const mP = Math.min(bal, emi - mI);
          bal = Math.max(0, bal - mP);
          yrP += mP;
          yrI += mI;
        }
        rowsHtml += `<tr><td>Year ${yr}</td><td>₹${fmt(opening.toFixed(0))}</td><td>₹${fmt(yrP.toFixed(0))}</td><td>₹${fmt(yrI.toFixed(0))}</td><td>₹${fmt(bal.toFixed(0))}</td></tr>`;
      }
    }

    const principalPct = ((p / total) * 100).toFixed(1);
    const interestPct = (100 - parseFloat(principalPct)).toFixed(1);

    const html = `
      <div class="sip-result-card">
        <div class="sip-maturity-hero">
          <div class="sip-maturity-label">${_emiMode === 'flat' ? '📊 Flat Rate Monthly EMI' : '📉 Reducing Balance Monthly EMI'}</div>
          <div class="sip-maturity-amount">₹${fmt(emi.toFixed(0))} <small style="font-size:16px; font-weight:600; color:var(--muted);">/ month</small></div>
        </div>

        <div class="sip-stats-grid">
          <div class="sip-stat-box">
            <span class="sip-stat-label">💰 Principal Loan Amount</span>
            <span class="sip-stat-val">₹${fmt(p.toFixed(0))}</span>
            <span class="sip-stat-pct">(${principalPct}% of total)</span>
          </div>
          <div class="sip-stat-box highlight">
            <span class="sip-stat-label">📈 Total Interest Payable</span>
            <span class="sip-stat-val" style="color:var(--accent);">₹${fmt(interest.toFixed(0))}</span>
            <span class="sip-stat-pct">(${interestPct}% of total)</span>
          </div>
        </div>

        <div class="sip-stat-box" style="margin-bottom:12px; text-align:center;">
          <span class="sip-stat-label">💳 Total Amount Payable (Principal + Interest)</span>
          <span class="sip-stat-val" style="font-size:20px; font-weight:800;">₹${fmt(total.toFixed(0))}</span>
        </div>

        <div class="sip-bar-wrap" title="Principal ${principalPct}% | Interest ${interestPct}%">
          <div class="sip-bar-invested" style="width: ${principalPct}%"></div>
          <div class="sip-bar-gain" style="width: ${interestPct}%; background:#f59e0b;"></div>
        </div>
        <div class="sip-bar-legend">
          <span><span class="dot dot-invested"></span> Principal: ₹${fmt(p.toFixed(0))}</span>
          <span><span class="dot" style="background:#f59e0b;"></span> Total Interest: ₹${fmt(interest.toFixed(0))}</span>
        </div>

        ${alertHtml}

        <details class="fin-toggle-details">
          <summary>📑 View Year-by-Year Amortization Schedule (${y} Years)</summary>
          <div class="fin-table-hint">← Swipe sideways to view all columns →</div>
          <div class="fin-table-wrap">
            <table class="fin-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Opening Bal</th>
                  <th>Principal Paid</th>
                  <th>Interest Paid</th>
                  <th>Closing Bal</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    `;

    const plain = `Monthly EMI: ₹${fmt(emi.toFixed(0))}, Total Interest: ₹${fmt(interest.toFixed(0))}, Total Payable: ₹${fmt(total.toFixed(0))} for loan ₹${fmt(p)} at ${r}% over ${y} years (${_emiMode === 'flat' ? 'Flat Rate' : 'Reducing Balance'}).`;

    showResult(html, plain);
  });
}

/* ─────────────────────────────────────────
   Compound Interest Calculator Functions
───────────────────────────────────────── */
function ciSyncInput(field) {
  const inp = document.getElementById(`ci_${field}`);
  const rng = document.getElementById(`ci_${field}_range`);
  const lbl = document.getElementById(`ci_${field}_val`);
  if (!inp) return;
  const val = parseFloat(inp.value) || 0;
  if (rng) rng.value = val;
  if (lbl) {
    if (field === 'principal') lbl.textContent = `₹${fmt(val)}`;
    else if (field === 'rate') lbl.textContent = `${val}%`;
    else if (field === 'years') lbl.textContent = `${val} Yrs`;
  }
  calcCompound();
}

function ciSyncRange(field) {
  const inp = document.getElementById(`ci_${field}`);
  const rng = document.getElementById(`ci_${field}_range`);
  const lbl = document.getElementById(`ci_${field}_val`);
  if (!rng) return;
  const val = parseFloat(rng.value) || 0;
  if (inp) inp.value = val;
  if (lbl) {
    if (field === 'principal') lbl.textContent = `₹${fmt(val)}`;
    else if (field === 'rate') lbl.textContent = `${val}%`;
    else if (field === 'years') lbl.textContent = `${val} Yrs`;
  }
  calcCompound();
}

function ciSetPrincipal(amount) {
  const inp = document.getElementById('ci_principal');
  const rng = document.getElementById('ci_principal_range');
  const lbl = document.getElementById('ci_principal_val');
  if (inp) inp.value = amount;
  if (rng) rng.value = amount;
  if (lbl) lbl.textContent = `₹${fmt(amount)}`;
  calcCompound();
}

function ciSetRate(rate) {
  const inp = document.getElementById('ci_rate');
  const rng = document.getElementById('ci_rate_range');
  const lbl = document.getElementById('ci_rate_val');
  if (inp) inp.value = rate;
  if (rng) rng.value = rate;
  if (lbl) lbl.textContent = `${rate}%`;
  calcCompound();
}

function ciSetYears(years) {
  const inp = document.getElementById('ci_years');
  const rng = document.getElementById('ci_years_range');
  const lbl = document.getElementById('ci_years_val');
  if (inp) inp.value = years;
  if (rng) rng.value = years;
  if (lbl) lbl.textContent = `${years} Yrs`;
  calcCompound();
}

function calcCompound() {
  safeCalc(() => {
    const p = getPositive('ci_principal', 'Principal Amount');
    const r = getPositive('ci_rate', 'Interest Rate');
    const y = getPositive('ci_years', 'Time Period');
    const freqEl = document.getElementById('ci_freq');
    const n = freqEl ? parseFloat(freqEl.value) || 4 : 4; // default quarterly

    // Formula: A = P * (1 + R / (100 * n))^(n * t)
    const ratePerPeriod = r / (100 * n);
    const totalPeriods = n * y;
    const maturity = p * Math.pow(1 + ratePerPeriod, totalPeriods);
    const ci = maturity - p;

    // Simple interest comparison
    const si = (p * r * y) / 100;
    const ciAdvantage = Math.max(0, ci - si);

    const principalPct = ((p / maturity) * 100).toFixed(1);
    const gainPct = (100 - parseFloat(principalPct)).toFixed(1);

    function getMaturityForYears(t) {
      return p * Math.pow(1 + ratePerPeriod, n * t);
    }

    const m1 = getMaturityForYears(1);
    const m3 = getMaturityForYears(3);
    const m5 = getMaturityForYears(5);
    const m10 = getMaturityForYears(10);

    // Year-by-year table rows
    let tableRows = '';
    let prevBal = p;
    for (let yr = 1; yr <= Math.min(y, 30); yr++) {
      const curBal = getMaturityForYears(yr);
      const yrGain = curBal - prevBal;
      const totalGain = curBal - p;
      prevBal = curBal;
      tableRows += `<tr><td>Year ${yr}</td><td>₹${fmt(p.toFixed(0))}</td><td>₹${fmt(yrGain.toFixed(0))}</td><td>+₹${fmt(totalGain.toFixed(0))}</td><td>₹${fmt(curBal.toFixed(0))}</td></tr>`;
    }

    const freqName = n === 1 ? 'Annually' : n === 2 ? 'Half-Yearly' : n === 4 ? 'Quarterly' : n === 12 ? 'Monthly' : 'Daily';

    const html = `
      <div class="sip-result-card">
        <div class="sip-maturity-hero">
          <div class="sip-maturity-label">Future Maturity Value (Total Wealth)</div>
          <div class="sip-maturity-amount">₹${fmt(maturity.toFixed(0))}</div>
        </div>

        <div class="sip-stats-grid">
          <div class="sip-stat-box">
            <span class="sip-stat-label">💰 Principal Invested</span>
            <span class="sip-stat-val">₹${fmt(p.toFixed(0))}</span>
            <span class="sip-stat-pct">(${principalPct}% of total)</span>
          </div>
          <div class="sip-stat-box highlight">
            <span class="sip-stat-label">📈 Total Compound Interest</span>
            <span class="sip-stat-val text-green">+₹${fmt(ci.toFixed(0))}</span>
            <span class="sip-stat-pct">(${gainPct}% of total)</span>
          </div>
        </div>

        <div class="sip-bar-wrap" title="Principal ${principalPct}% | Returns ${gainPct}%">
          <div class="sip-bar-invested" style="width: ${principalPct}%"></div>
          <div class="sip-bar-gain" style="width: ${gainPct}%"></div>
        </div>
        <div class="sip-bar-legend">
          <span><span class="dot dot-invested"></span> Principal: ₹${fmt(p.toFixed(0))}</span>
          <span><span class="dot dot-gain"></span> Total Returns: ₹${fmt(ci.toFixed(0))}</span>
        </div>

        <div class="fin-alert-card success">
          🚀 <strong>The Power of ${freqName} Compounding:</strong> Compounding earned you <strong>₹${fmt(ciAdvantage.toFixed(0))} MORE</strong> (+₹${((ciAdvantage / (si || 1)) * 100).toFixed(1)}%) than Simple Interest (₹${fmt(si.toFixed(0))}) over ${y} years!
        </div>

        <div class="sip-milestones">
          <div class="sip-milestones-title">Growth Milestones at ${r}% (${freqName} Compounding):</div>
          <div class="sip-milestones-grid">
            <div class="sip-m-card"><strong>1 Yr</strong><span>₹${fmt(m1.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>3 Yrs</strong><span>₹${fmt(m3.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>5 Yrs</strong><span>₹${fmt(m5.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>10 Yrs</strong><span>₹${fmt(m10.toFixed(0))}</span></div>
          </div>
        </div>

        <details class="fin-toggle-details">
          <summary>📑 View Year-by-Year Growth Table (${Math.min(y, 30)} Years)</summary>
          <div class="fin-table-hint">← Swipe sideways to view all columns →</div>
          <div class="fin-table-wrap">
            <table class="fin-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Principal</th>
                  <th>Annual Gain</th>
                  <th>Total Gain</th>
                  <th>Maturity Balance</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    `;

    const plain = `Compound Interest Maturity: ₹${fmt(maturity.toFixed(0))} (Principal: ₹${fmt(p.toFixed(0))}, Interest: ₹${fmt(ci.toFixed(0))}) at ${r}% compounded ${freqName} over ${y} years. (+${fmt(ciAdvantage.toFixed(0))} more than Simple Interest)`;

    showResult(html, plain);
  });
}

function calcPct() {
  safeCalc(() => {
    const x = getNum('pct_x', 'percentage');
    const y = getNum('pct_y', 'number');
    const result = (x * y / 100).toFixed(2);
    showResult(`${result}`, `${x}% of ${y} = ${result}`);
  });
}

function calcGst() {
  safeCalc(() => {
    const amount = getPositive('gst_amount', 'amount');
    const rate = parseFloat(document.getElementById('gst_rate').value);
    const gstAmt = amount * rate / 100;
    const total = amount + gstAmt;
    const plain = `GST ₹${gstAmt.toFixed(2)} | Total ₹${total.toFixed(2)}`;
    showResult(
      `GST: ₹${gstAmt.toFixed(2)} <small>Total (incl. GST): ₹${total.toFixed(2)}</small>`,
      plain
    );
  });
}

function calcBmi() {
  safeCalc(() => {
    const w = getPositive('weight', 'weight');
    const h = getPositive('height_cm', 'height') / 100;
    const bmi = w / (h * h);
    let cat;
    if (bmi < 18.5) cat = 'Underweight';
    else if (bmi < 25) cat = 'Normal weight ✓';
    else if (bmi < 30) cat = 'Overweight';
    else cat = 'Obese';
    const plain = `BMI ${bmi.toFixed(1)} — ${cat}`;
    showResult(`BMI ${bmi.toFixed(1)} <small>${cat}</small>`, plain);
  });
}

function calcDiscount() {
  safeCalc(() => {
    const p = getPositive('orig_price', 'price');
    const d = getNum('disc_pct', 'discount');
    if (d < 0 || d > 100) return showError('Discount must be between 0 and 100.');
    const saving = p * d / 100;
    const final = p - saving;
    const plain = `Pay ₹${final.toFixed(2)} — You save ₹${saving.toFixed(2)}`;
    showResult(`Pay ₹${final.toFixed(2)} <small>You save ₹${saving.toFixed(2)} (${d}% off)</small>`, plain);
  });
}

function calcTip() {
  safeCalc(() => {
    const b = getPositive('bill', 'bill amount');
    const t = getNum('tiprate', 'tip percentage');
    const n = Math.max(1, getNum('people', 'number of people'));
    const tipAmt = b * t / 100;
    const perPerson = (b + tipAmt) / n;
    const plain = `Tip ₹${tipAmt.toFixed(2)} | ₹${perPerson.toFixed(2)} per person`;
    showResult(`Tip: ₹${tipAmt.toFixed(2)} <small>₹${perPerson.toFixed(2)} per person (total ₹${(b + tipAmt).toFixed(2)})</small>`, plain);
  });
}

/* ─────────────────────────────────────────
   Advanced Scientific Unit Converter
   Categories: Substance, Molar/Mass Concentration,
   Mass, Length, Area, Volume, Temp, Time, Speed,
   Pressure, Energy, Power, Electricity, Density,
   Flow Rate, Molar Mass, Trace/Fraction, Digital Storage,
   Frequency, Angles, and Health (Glucose).
───────────────────────────────────────── */
const SCIENTIFIC_UNITS = {
  substance: {
    name: 'Amount of Substance',
    base: 'mol',
    units: {
      kmol: { name: 'Kilomole (kmol)', factor: 1e3, symbol: 'kmol' },
      mol:  { name: 'Mole (mol)', factor: 1, symbol: 'mol' },
      mmol: { name: 'Millimole (mmol)', factor: 1e-3, symbol: 'mmol' },
      umol: { name: 'Micromole (µmol)', factor: 1e-6, symbol: 'µmol' },
      nmol: { name: 'Nanomole (nmol)', factor: 1e-9, symbol: 'nmol' },
      pmol: { name: 'Picomole (pmol)', factor: 1e-12, symbol: 'pmol' }
    },
    defaultFrom: 'mol',
    defaultTo: 'mmol'
  },
  molar_conc: {
    name: 'Molar Concentration',
    base: 'mol_L',
    note: 'Concentration of solute per unit volume of solution.',
    units: {
      mol_L:  { name: 'Mole per litre (mol/L or M)', factor: 1, symbol: 'mol/L' },
      mmol_L: { name: 'Millimole per litre (mmol/L or mM)', factor: 1e-3, symbol: 'mmol/L' },
      umol_L: { name: 'Micromole per litre (µmol/L or µM)', factor: 1e-6, symbol: 'µmol/L' },
      nmol_L: { name: 'Nanomole per litre (nmol/L or nM)', factor: 1e-9, symbol: 'nmol/L' },
      mol_m3: { name: 'Mole per cubic metre (mol/m³ = mmol/L)', factor: 1e-3, symbol: 'mol/m³' }
    },
    defaultFrom: 'mol_L',
    defaultTo: 'mmol_L'
  },
  mass_conc: {
    name: 'Mass Concentration & Laboratory',
    base: 'g_L',
    units: {
      g_L:   { name: 'Gram per litre (g/L)', factor: 1, symbol: 'g/L' },
      mg_L:  { name: 'Milligram per litre (mg/L)', factor: 1e-3, symbol: 'mg/L' },
      ug_L:  { name: 'Microgram per litre (µg/L)', factor: 1e-6, symbol: 'µg/L' },
      mg_mL: { name: 'Milligram per millilitre (mg/mL = g/L)', factor: 1, symbol: 'mg/mL' },
      mg_dL: { name: 'Milligram per decilitre (mg/dL)', factor: 1e-2, symbol: 'mg/dL' },
      ug_mL: { name: 'Microgram per millilitre (µg/mL)', factor: 1e-3, symbol: 'µg/mL' }
    },
    defaultFrom: 'g_L',
    defaultTo: 'mg_dL'
  },
  mass: {
    name: 'Mass & Weight',
    base: 'kg',
    units: {
      tonne:  { name: 'Metric Tonne (t)', factor: 1000, symbol: 't' },
      kg:     { name: 'Kilogram (kg)', factor: 1, symbol: 'kg' },
      g:      { name: 'Gram (g)', factor: 1e-3, symbol: 'g' },
      mg:     { name: 'Milligram (mg)', factor: 1e-6, symbol: 'mg' },
      ug:     { name: 'Microgram (µg)', factor: 1e-9, symbol: 'µg' },
      ng:     { name: 'Nanogram (ng)', factor: 1e-12, symbol: 'ng' },
      lb:     { name: 'Pound (lb)', factor: 0.45359237, symbol: 'lb' },
      oz:     { name: 'Ounce (oz)', factor: 0.028349523125, symbol: 'oz' },
      stone:  { name: 'Stone (st)', factor: 6.35029318, symbol: 'st' },
      us_ton: { name: 'US Short Ton (ton)', factor: 907.18474, symbol: 'ton' }
    },
    defaultFrom: 'kg',
    defaultTo: 'g'
  },
  length: {
    name: 'Length & Distance',
    base: 'm',
    units: {
      km:  { name: 'Kilometre (km)', factor: 1000, symbol: 'km' },
      m:   { name: 'Metre (m)', factor: 1, symbol: 'm' },
      cm:  { name: 'Centimetre (cm)', factor: 0.01, symbol: 'cm' },
      mm:  { name: 'Millimetre (mm)', factor: 1e-3, symbol: 'mm' },
      um:  { name: 'Micrometre (µm)', factor: 1e-6, symbol: 'µm' },
      nm:  { name: 'Nanometre (nm)', factor: 1e-9, symbol: 'nm' },
      mi:  { name: 'Mile (mi)', factor: 1609.344, symbol: 'mi' },
      yd:  { name: 'Yard (yd)', factor: 0.9144, symbol: 'yd' },
      ft:  { name: 'Foot (ft)', factor: 0.3048, symbol: 'ft' },
      in:  { name: 'Inch (in)', factor: 0.0254, symbol: 'in' },
      nmi: { name: 'Nautical Mile (nmi)', factor: 1852, symbol: 'nmi' }
    },
    defaultFrom: 'm',
    defaultTo: 'cm'
  },
  area: {
    name: 'Area',
    base: 'm2',
    units: {
      km2:   { name: 'Square Kilometre (km²)', factor: 1e6, symbol: 'km²' },
      ha:    { name: 'Hectare (ha)', factor: 1e4, symbol: 'ha' },
      acre:  { name: 'Acre (ac)', factor: 4046.8564224, symbol: 'acre' },
      m2:    { name: 'Square Metre (m²)', factor: 1, symbol: 'm²' },
      sq_ft: { name: 'Square Foot (sq ft)', factor: 0.09290304, symbol: 'sq ft' },
      cm2:   { name: 'Square Centimetre (cm²)', factor: 1e-4, symbol: 'cm²' },
      mm2:   { name: 'Square Millimetre (mm²)', factor: 1e-6, symbol: 'mm²' }
    },
    defaultFrom: 'm2',
    defaultTo: 'sq_ft'
  },
  volume: {
    name: 'Volume & Laboratory Capacity',
    base: 'L',
    units: {
      m3:    { name: 'Cubic Metre (m³)', factor: 1000, symbol: 'm³' },
      L:     { name: 'Litre (L)', factor: 1, symbol: 'L' },
      dL:    { name: 'Decilitre (dL)', factor: 0.1, symbol: 'dL' },
      mL:    { name: 'Millilitre (mL)', factor: 1e-3, symbol: 'mL' },
      uL:    { name: 'Microlitre (µL)', factor: 1e-6, symbol: 'µL' },
      nL:    { name: 'Nanolitre (nL)', factor: 1e-9, symbol: 'nL' },
      gal:   { name: 'US Gallon (gal)', factor: 3.785411784, symbol: 'gal' },
      qt:    { name: 'US Quart (qt)', factor: 0.946352946, symbol: 'qt' },
      pt:    { name: 'US Pint (pt)', factor: 0.473176473, symbol: 'pt' },
      cup:   { name: 'US Cup (cup)', factor: 0.24, symbol: 'cup' },
      fl_oz: { name: 'US Fluid Ounce (fl oz)', factor: 0.0295735295625, symbol: 'fl oz' }
    },
    defaultFrom: 'L',
    defaultTo: 'mL'
  },
  temp: {
    name: 'Temperature',
    special: true,
    units: {
      c: { name: 'Celsius (°C)', symbol: '°C' },
      f: { name: 'Fahrenheit (°F)', symbol: '°F' },
      k: { name: 'Kelvin (K)', symbol: 'K' },
      r: { name: 'Rankine (°R)', symbol: '°R' }
    },
    defaultFrom: 'c',
    defaultTo: 'f'
  },
  time: {
    name: 'Time',
    base: 's',
    units: {
      day: { name: 'Day (d)', factor: 86400, symbol: 'd' },
      hr:  { name: 'Hour (h)', factor: 3600, symbol: 'h' },
      min: { name: 'Minute (min)', factor: 60, symbol: 'min' },
      s:   { name: 'Second (s)', factor: 1, symbol: 's' },
      ms:  { name: 'Millisecond (ms)', factor: 1e-3, symbol: 'ms' },
      us:  { name: 'Microsecond (µs)', factor: 1e-6, symbol: 'µs' },
      ns:  { name: 'Nanosecond (ns)', factor: 1e-9, symbol: 'ns' }
    },
    defaultFrom: 's',
    defaultTo: 'ms'
  },
  speed: {
    name: 'Speed & Velocity',
    base: 'm_s',
    units: {
      m_s:  { name: 'Metres per second (m/s)', factor: 1, symbol: 'm/s' },
      km_h: { name: 'Kilometres per hour (km/h)', factor: 1 / 3.6, symbol: 'km/h' },
      mph:  { name: 'Miles per hour (mph)', factor: 0.44704, symbol: 'mph' },
      knot: { name: 'Knot (kn = nmi/h)', factor: 1852 / 3600, symbol: 'kn' },
      ft_s: { name: 'Feet per second (ft/s)', factor: 0.3048, symbol: 'ft/s' }
    },
    defaultFrom: 'km_h',
    defaultTo: 'm_s'
  },
  pressure: {
    name: 'Pressure',
    base: 'Pa',
    units: {
      MPa:  { name: 'Megapascal (MPa)', factor: 1e6, symbol: 'MPa' },
      bar:  { name: 'Bar (bar)', factor: 1e5, symbol: 'bar' },
      atm:  { name: 'Standard Atmosphere (atm)', factor: 101325, symbol: 'atm' },
      kPa:  { name: 'Kilopascal (kPa)', factor: 1e3, symbol: 'kPa' },
      psi:  { name: 'Pounds per square inch (PSI)', factor: 6894.757, symbol: 'psi' },
      mbar: { name: 'Millibar (mbar)', factor: 100, symbol: 'mbar' },
      torr: { name: 'Torr / mmHg (torr)', factor: 133.322368, symbol: 'torr' },
      Pa:   { name: 'Pascal (Pa)', factor: 1, symbol: 'Pa' }
    },
    defaultFrom: 'bar',
    defaultTo: 'psi'
  },
  energy: {
    name: 'Energy & Work',
    base: 'J',
    units: {
      kWh:  { name: 'Kilowatt-hour (kWh)', factor: 3.6e6, symbol: 'kWh' },
      Wh:   { name: 'Watt-hour (Wh)', factor: 3600, symbol: 'Wh' },
      kJ:   { name: 'Kilojoule (kJ)', factor: 1000, symbol: 'kJ' },
      J:    { name: 'Joule (J)', factor: 1, symbol: 'J' },
      kcal: { name: 'Kilocalorie (kcal or food Cal)', factor: 4184, symbol: 'kcal' },
      cal:  { name: 'Calorie (cal)', factor: 4.184, symbol: 'cal' },
      eV:   { name: 'Electronvolt (eV)', factor: 1.602176634e-19, symbol: 'eV' }
    },
    defaultFrom: 'kJ',
    defaultTo: 'kcal'
  },
  power: {
    name: 'Power',
    base: 'W',
    units: {
      MW: { name: 'Megawatt (MW)', factor: 1e6, symbol: 'MW' },
      kW: { name: 'Kilowatt (kW)', factor: 1e3, symbol: 'kW' },
      hp: { name: 'Mechanical Horsepower (hp)', factor: 745.699872, symbol: 'hp' },
      W:  { name: 'Watt (W)', factor: 1, symbol: 'W' }
    },
    defaultFrom: 'kW',
    defaultTo: 'hp'
  },
  electricity: {
    name: 'Electricity & Electromagnetism',
    base: 'si',
    note: 'Grouped electromagnetic dimensions (V, A, Ω, C, F, H, T).',
    units: {
      V:    { name: 'Volt (V) [Voltage]', factor: 1, symbol: 'V', type: 'volt' },
      mV:   { name: 'Millivolt (mV)', factor: 1e-3, symbol: 'mV', type: 'volt' },
      A:    { name: 'Ampere (A) [Current]', factor: 1, symbol: 'A', type: 'current' },
      mA:   { name: 'Milliampere (mA)', factor: 1e-3, symbol: 'mA', type: 'current' },
      uA:   { name: 'Microampere (µA)', factor: 1e-6, symbol: 'µA', type: 'current' },
      Mohm: { name: 'Mega-ohm (MΩ) [Resistance]', factor: 1e6, symbol: 'MΩ', type: 'res' },
      kohm: { name: 'Kilo-ohm (kΩ)', factor: 1e3, symbol: 'kΩ', type: 'res' },
      ohm:  { name: 'Ohm (Ω)', factor: 1, symbol: 'Ω', type: 'res' },
      C:    { name: 'Coulomb (C) [Electric Charge]', factor: 1, symbol: 'C', type: 'charge' },
      F:    { name: 'Farad (F) [Capacitance]', factor: 1, symbol: 'F', type: 'cap' },
      uF:   { name: 'Microfarad (µF)', factor: 1e-6, symbol: 'µF', type: 'cap' },
      nF:   { name: 'Nanofarad (nF)', factor: 1e-9, symbol: 'nF', type: 'cap' },
      H:    { name: 'Henry (H) [Inductance]', factor: 1, symbol: 'H', type: 'ind' },
      T:    { name: 'Tesla (T) [Magnetic Field]', factor: 1, symbol: 'T', type: 'mag' }
    },
    defaultFrom: 'V',
    defaultTo: 'mV'
  },
  density: {
    name: 'Density',
    base: 'kg_m3',
    units: {
      g_cm3: { name: 'Gram per cubic centimetre (g/cm³ = 1000 kg/m³)', factor: 1000, symbol: 'g/cm³' },
      g_mL:  { name: 'Gram per millilitre (g/mL)', factor: 1000, symbol: 'g/mL' },
      kg_m3: { name: 'Kilogram per cubic metre (kg/m³)', factor: 1, symbol: 'kg/m³' }
    },
    defaultFrom: 'g_cm3',
    defaultTo: 'kg_m3'
  },
  flow_rate: {
    name: 'Flow Rate (Volumetric)',
    base: 'L_min',
    units: {
      L_min:  { name: 'Litre per minute (L/min)', factor: 1, symbol: 'L/min' },
      mL_min: { name: 'Millilitre per minute (mL/min)', factor: 1e-3, symbol: 'mL/min' },
      uL_min: { name: 'Microlitre per minute (µL/min)', factor: 1e-6, symbol: 'µL/min' }
    },
    defaultFrom: 'L_min',
    defaultTo: 'mL_min'
  },
  molar_mass: {
    name: 'Molar Mass',
    base: 'g_mol',
    units: {
      kg_mol: { name: 'Kilogram per mole (kg/mol)', factor: 1000, symbol: 'kg/mol' },
      g_mol:  { name: 'Gram per mole (g/mol)', factor: 1, symbol: 'g/mol' }
    },
    defaultFrom: 'g_mol',
    defaultTo: 'kg_mol'
  },
  parts_fraction: {
    name: 'Fraction & Trace Concentrations',
    base: 'ratio',
    note: 'Assumption: In dilute aqueous solutions at 20°C (density ≈ 1.0 g/mL), 1 ppm ≈ 1 mg/L and 1 ppb ≈ 1 µg/L.',
    units: {
      pct:      { name: 'Percentage (%)', factor: 0.01, symbol: '%' },
      permille: { name: 'Parts per thousand (‰)', factor: 0.001, symbol: '‰' },
      ppm:      { name: 'Parts per million (ppm, 10⁻⁶)', factor: 1e-6, symbol: 'ppm' },
      ppb:      { name: 'Parts per billion (ppb, 10⁻⁹)', factor: 1e-9, symbol: 'ppb' }
    },
    defaultFrom: 'ppm',
    defaultTo: 'ppb'
  },
  storage_dec: {
    name: 'Digital Storage (Decimal Base 1000 - SI)',
    base: 'byte',
    note: 'International System of Units (SI standard used by storage disk manufacturers): 1 KB = 1000 Bytes.',
    units: {
      PB:   { name: 'Petabyte (PB - 10¹⁵ Bytes)', factor: 1e15, symbol: 'PB' },
      TB:   { name: 'Terabyte (TB - 10¹² Bytes)', factor: 1e12, symbol: 'TB' },
      GB:   { name: 'Gigabyte (GB - 10⁹ Bytes)', factor: 1e9, symbol: 'GB' },
      MB:   { name: 'Megabyte (MB - 10⁶ Bytes)', factor: 1e6, symbol: 'MB' },
      KB:   { name: 'Kilobyte (KB - 10³ Bytes)', factor: 1000, symbol: 'KB' },
      byte: { name: 'Byte (B)', factor: 1, symbol: 'B' },
      bit:  { name: 'Bit (b)', factor: 0.125, symbol: 'bit' }
    },
    defaultFrom: 'GB',
    defaultTo: 'MB'
  },
  storage_bin: {
    name: 'Digital Storage (Binary Base 1024 - IEC)',
    base: 'byte',
    note: 'International Electrotechnical Commission (IEC standard used in OS/RAM memory): 1 KiB = 1024 Bytes.',
    units: {
      PiB:  { name: 'Pebibyte (PiB - 1024⁵ Bytes)', factor: Math.pow(1024, 5), symbol: 'PiB' },
      TiB:  { name: 'Tebibyte (TiB - 1024⁴ Bytes)', factor: Math.pow(1024, 4), symbol: 'TiB' },
      GiB:  { name: 'Gibibyte (GiB - 1024³ Bytes)', factor: Math.pow(1024, 3), symbol: 'GiB' },
      MiB:  { name: 'Mebibyte (MiB - 1024² Bytes)', factor: Math.pow(1024, 2), symbol: 'MiB' },
      KiB:  { name: 'Kibibyte (KiB - 1024 Bytes)', factor: 1024, symbol: 'KiB' },
      byte: { name: 'Byte (B)', factor: 1, symbol: 'B' },
      bit:  { name: 'Bit (b)', factor: 0.125, symbol: 'bit' }
    },
    defaultFrom: 'GiB',
    defaultTo: 'MiB'
  },
  frequency: {
    name: 'Frequency',
    base: 'Hz',
    units: {
      GHz: { name: 'Gigahertz (GHz)', factor: 1e9, symbol: 'GHz' },
      MHz: { name: 'Megahertz (MHz)', factor: 1e6, symbol: 'MHz' },
      kHz: { name: 'Kilohertz (kHz)', factor: 1e3, symbol: 'kHz' },
      Hz:  { name: 'Hertz (Hz)', factor: 1, symbol: 'Hz' }
    },
    defaultFrom: 'MHz',
    defaultTo: 'kHz'
  },
  angle: {
    name: 'Angle',
    base: 'rad',
    units: {
      deg:    { name: 'Degree (°)', factor: Math.PI / 180, symbol: '°' },
      rad:    { name: 'Radian (rad)', factor: 1, symbol: 'rad' },
      grad:   { name: 'Gradian (grad)', factor: Math.PI / 200, symbol: 'grad' },
      arcmin: { name: 'Arcminute (arcmin / ′)', factor: Math.PI / 10800, symbol: '′' },
      arcsec: { name: 'Arcsecond (arcsec / ″)', factor: Math.PI / 648000, symbol: '″' }
    },
    defaultFrom: 'deg',
    defaultTo: 'rad'
  },
  blood_glucose: {
    name: 'Blood Glucose Concentration',
    base: 'mg_dL',
    note: 'Clinical Factor: Glucose has a molecular mass of ~180.16 g/mol. Formula: 1 mmol/L = 18.0182 mg/dL (or mg/dL ÷ 18.0182 = mmol/L).',
    units: {
      mg_dL:  { name: 'Milligrams per decilitre (mg/dL - US/India standard)', factor: 1, symbol: 'mg/dL' },
      mmol_L: { name: 'Millimoles per litre (mmol/L - International/UK/Canada standard)', factor: 18.0182, symbol: 'mmol/L' }
    },
    defaultFrom: 'mg_dL',
    defaultTo: 'mmol_L'
  }
};

/** Populate unit dropdowns when user switches category */
function onUnitCatChange() {
  const catSelect = document.getElementById('unit_cat');
  const fromSelect = document.getElementById('unit_from');
  const toSelect = document.getElementById('unit_to');
  const noteEl = document.getElementById('unit-note');
  if (!catSelect || !fromSelect || !toSelect) return;

  const catKey = catSelect.value;
  const category = SCIENTIFIC_UNITS[catKey];
  if (!category) return;

  // Build options
  let opts = '';
  for (const [k, u] of Object.entries(category.units)) {
    opts += `<option value="${k}">${u.name}</option>`;
  }
  fromSelect.innerHTML = opts;
  toSelect.innerHTML = opts;

  if (category.defaultFrom && category.units[category.defaultFrom]) {
    fromSelect.value = category.defaultFrom;
  }
  if (category.defaultTo && category.units[category.defaultTo]) {
    toSelect.value = category.defaultTo;
  }

  // Display scientific assumption note if present
  if (noteEl) {
    if (category.note) {
      noteEl.innerHTML = `<span class="unit-note-icon">ℹ️</span> <span>${category.note}</span>`;
      noteEl.classList.remove('hidden');
    } else {
      noteEl.innerHTML = '';
      noteEl.classList.add('hidden');
    }
  }

  calcUnit();
}

/** Swap From and To dropdown values */
function swapUnits() {
  const fromSelect = document.getElementById('unit_from');
  const toSelect = document.getElementById('unit_to');
  if (!fromSelect || !toSelect) return;
  const tmp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = tmp;
  calcUnit();
}

/** Format scientific values cleanly with dynamic precision or scientific notation */
function formatScientificResult(val) {
  if (val === 0) return '0';
  const abs = Math.abs(val);
  if (abs >= 1e9 || abs < 1e-5) {
    return val.toExponential(6).replace(/e\+?/, ' × 10^');
  }
  // Remove floating point noise
  const rounded = parseFloat(val.toPrecision(8));
  return String(rounded);
}

/** Main calculation function for Scientific Converter */
function calcUnit() {
  safeCalc(() => {
    const valInput = document.getElementById('unit_val');
    const catSelect = document.getElementById('unit_cat');
    const fromSelect = document.getElementById('unit_from');
    const toSelect = document.getElementById('unit_to');

    if (!valInput || !catSelect || !fromSelect || !toSelect) return;

    const val = parseFloat(valInput.value);
    if (isNaN(val)) return showError('Please enter a valid numeric value.');

    const catKey = catSelect.value;
    const category = SCIENTIFIC_UNITS[catKey];
    if (!category) return showError('Invalid category selected.');

    const fromKey = fromSelect.value;
    const toKey = toSelect.value;
    const fromUnit = category.units[fromKey];
    const toUnit = category.units[toKey];

    if (!fromUnit || !toUnit) return showError('Invalid units selected.');

    let converted;

    // Special: Temperature conversions (Celsius, Fahrenheit, Kelvin, Rankine)
    if (catKey === 'temp') {
      let kelvin;
      if (fromKey === 'c') kelvin = val + 273.15;
      else if (fromKey === 'f') kelvin = (val - 32) * (5 / 9) + 273.15;
      else if (fromKey === 'k') kelvin = val;
      else if (fromKey === 'r') kelvin = val * (5 / 9);

      if (toKey === 'c') converted = kelvin - 273.15;
      else if (toKey === 'f') converted = (kelvin - 273.15) * (9 / 5) + 32;
      else if (toKey === 'k') converted = kelvin;
      else if (toKey === 'r') converted = kelvin * (9 / 5);
    }
    // Electricity cross-type check (ensure user isn't converting Amperes to Volts directly)
    else if (catKey === 'electricity') {
      if (fromUnit.type !== toUnit.type) {
        return showError(`Cannot convert directly between different electrical dimensions (${fromUnit.name} ↔ ${toUnit.name}).`);
      }
      converted = (val * fromUnit.factor) / toUnit.factor;
    }
    // Standard factor conversion
    else {
      converted = (val * fromUnit.factor) / toUnit.factor;
    }

    const formatted = formatScientificResult(converted);
    const fromSym = fromUnit.symbol || fromKey;
    const toSym = toUnit.symbol || toKey;

    const plain = `${val} ${fromSym} = ${formatted} ${toSym}`;
    const html = `
      <div class="unit-result-box">
        <div class="unit-result-primary">
          <span class="unit-res-val">${val}</span> <span class="unit-res-sym">${fromSym}</span>
          <span class="unit-res-eq">=</span>
          <span class="unit-res-val bold-accent">${formatted}</span> <span class="unit-res-sym">${toSym}</span>
        </div>
        <div class="unit-result-desc">
          ${fromUnit.name} ➔ ${toUnit.name}
        </div>
      </div>
    `;

    showResult(html, plain);
  });
}

function gcd(a, b) {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function calcRatio() {
  safeCalc(() => {
    const a = getPositive('ratio_a', 'first number');
    const b = getPositive('ratio_b', 'second number');
    const g = gcd(a, b);
    const plain = `${a / g} : ${b / g}`;
    showResult(plain, plain);
  });
}

function calcNumber() {
  safeCalc(() => {
    const n = getNum('num_dec', 'decimal number');
    if (!Number.isInteger(n)) return showError('Please enter a whole number.');
    const plain = `Binary: ${n.toString(2)} | Octal: ${n.toString(8)} | Hex: ${n.toString(16).toUpperCase()}`;
    showResult(
      `Binary: ${n.toString(2)} <small>Octal: ${n.toString(8)} &nbsp;|&nbsp; Hex: ${n.toString(16).toUpperCase()}</small>`,
      plain
    );
  });
}

function calcDate() {
  safeCalc(() => {
    const d1 = getDate('date_from', 'start date');
    const d2 = getDate('date_to', 'end date');
    const ms = Math.abs(d2 - d1);
    const days  = Math.round(ms / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.round(days / 30.44);
    const plain = `${days} days (${weeks} weeks, ~${months} months)`;
    showResult(`${days} days <small>${weeks} weeks &nbsp;|&nbsp; ~${months} months</small>`, plain);
  });
}

function calcSalary() {
  safeCalc(() => {
    const ctc = getPositive('ctc', 'annual CTC');
    const monthly = ctc / 12;
    // Rough HRA / PF deductions estimate (simplified)
    const pf = Math.min(21600, monthly * 0.12); // 12% of basic, capped
    const inHandApprox = monthly - pf;
    const plain = `₹${fmt(monthly.toFixed(0))}/month CTC | ~₹${fmt(inHandApprox.toFixed(0))} in-hand (approx.)`;
    showResult(
      `₹${fmt(monthly.toFixed(0))} <small>/ month (CTC)<br>Est. in-hand: ~₹${fmt(inHandApprox.toFixed(0))} &nbsp;|&nbsp; Annual: ₹${fmt(ctc.toLocaleString('en-IN'))}</small>`,
      plain
    );
  });
}

/* ─────────────────────────────────────────
   Fixed Deposit (FD) Calculator
───────────────────────────────────────── */
function calcFd() {
  safeCalc(() => {
    const p = getPositive('fd_principal', 'Deposit Amount');
    const r = getPositive('fd_rate', 'Interest Rate');
    const y = getNum('fd_years', 'Tenure Years') || 0;
    const m = getNum('fd_months', 'Tenure Months') || 0;
    const t = y + (m / 12);
    if (t <= 0) return showError('Tenure must be greater than 0 months.');

    const freqSelect = document.getElementById('fd_freq');
    const freqVal = freqSelect ? freqSelect.value : '4';
    let maturity = 0;
    let interest = 0;

    if (freqVal === 'simple') {
      interest = (p * r * t) / 100;
      maturity = p + interest;
    } else {
      const n = parseFloat(freqVal); // 4 = quarterly (bank std), 12 = monthly, 2 = half-yearly, 1 = yearly
      maturity = p * Math.pow(1 + (r / (100 * n)), n * t);
      interest = maturity - p;
    }

    const principalPct = ((p / maturity) * 100).toFixed(1);
    const interestPct = (100 - parseFloat(principalPct)).toFixed(1);

    function getFdM(yr) {
      const n = (freqVal === 'simple') ? 1 : parseFloat(freqVal);
      return (freqVal === 'simple') ? p + (p * r * yr) / 100 : p * Math.pow(1 + (r / (100 * n)), n * yr);
    }
    const m1 = getFdM(1);
    const m3 = getFdM(3);
    const m5 = getFdM(5);

    const html = `
      <div class="sip-result-card">
        <div class="sip-maturity-hero">
          <div class="sip-maturity-label">Total FD Maturity Amount</div>
          <div class="sip-maturity-amount">₹${fmt(maturity.toFixed(0))}</div>
        </div>
        <div class="sip-stats-grid">
          <div class="sip-stat-box">
            <span class="sip-stat-label">💰 Principal Deposit</span>
            <span class="sip-stat-val">₹${fmt(p.toFixed(0))}</span>
            <span class="sip-stat-pct">(${principalPct}% of total)</span>
          </div>
          <div class="sip-stat-box highlight">
            <span class="sip-stat-label">📈 Total Interest Earned</span>
            <span class="sip-stat-val text-green">+₹${fmt(interest.toFixed(0))}</span>
            <span class="sip-stat-pct">(${interestPct}% of total)</span>
          </div>
        </div>
        <div class="sip-bar-wrap" title="Principal ${principalPct}% | Interest ${interestPct}%">
          <div class="sip-bar-invested" style="width: ${principalPct}%"></div>
          <div class="sip-bar-gain" style="width: ${interestPct}%"></div>
        </div>
        <div class="sip-bar-legend">
          <span><span class="dot dot-invested"></span> Principal: ₹${fmt(p.toFixed(0))}</span>
          <span><span class="dot dot-gain"></span> Interest: ₹${fmt(interest.toFixed(0))}</span>
        </div>
        <div class="sip-milestones">
          <div class="sip-milestones-title">FD Growth Milestones:</div>
          <div class="sip-milestones-grid">
            <div class="sip-m-card"><strong>1 Year</strong><span>₹${fmt(m1.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>3 Years</strong><span>₹${fmt(m3.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>5 Years</strong><span>₹${fmt(m5.toFixed(0))}</span></div>
          </div>
        </div>
      </div>
    `;
    const plain = `FD Maturity: ₹${fmt(maturity.toFixed(0))} (Principal: ₹${fmt(p.toFixed(0))}, Interest: ₹${fmt(interest.toFixed(0))}) at ${r}% p.a. for ${t.toFixed(1)} years`;
    showResult(html, plain);
  });
}

function fdSyncInput(field) {
  const inp = document.getElementById(`fd_${field}`);
  const rng = document.getElementById(`fd_${field}_range`);
  const lbl = document.getElementById(`fd_${field}_val`);
  if (!inp) return;
  const val = parseFloat(inp.value) || 0;
  if (rng && rng.max && val <= parseFloat(rng.max)) rng.value = val;
  if (lbl) {
    lbl.textContent = field === 'rate' ? `${val}%` : `₹${fmt(val)}`;
  }
  calcFd();
}

function fdSyncRange(field) {
  const inp = document.getElementById(`fd_${field}`);
  const rng = document.getElementById(`fd_${field}_range`);
  const lbl = document.getElementById(`fd_${field}_val`);
  if (!rng || !inp) return;
  inp.value = rng.value;
  if (lbl) {
    lbl.textContent = field === 'rate' ? `${rng.value}%` : `₹${fmt(rng.value)}`;
  }
  calcFd();
}

function fdSetPrincipal(val) {
  const inp = document.getElementById('fd_principal');
  if (inp) { inp.value = val; fdSyncInput('principal'); }
}

function fdSetRate(val) {
  const inp = document.getElementById('fd_rate');
  if (inp) { inp.value = val; fdSyncInput('rate'); }
}

/* ─────────────────────────────────────────
   Public Provident Fund (PPF) Calculator
───────────────────────────────────────── */
function calcPpf() {
  safeCalc(() => {
    const deposit = getPositive('ppf_deposit', 'Yearly Deposit');
    if (deposit > 150000) return showError('Maximum annual PPF deposit is ₹1,50,000 under Section 80C.');
    const r = getPositive('ppf_rate', 'PPF Interest Rate');
    const tenureSelect = document.getElementById('ppf_tenure');
    const tenure = tenureSelect ? (parseInt(tenureSelect.value, 10) || 15) : 15;

    let balance = 0;
    let totalInvested = 0;

    for (let yr = 1; yr <= tenure; yr++) {
      const openBal = balance;
      totalInvested += deposit;
      const interest = (openBal + deposit) * (r / 100);
      balance = openBal + deposit + interest;
    }

    const totalInterest = balance - totalInvested;
    const invPct = ((totalInvested / balance) * 100).toFixed(1);
    const intPct = (100 - parseFloat(invPct)).toFixed(1);

    const html = `
      <div class="sip-result-card">
        <div class="sip-maturity-hero">
          <div class="sip-maturity-label">Tax-Free PPF Maturity Wealth (${tenure} Years)</div>
          <div class="sip-maturity-amount">₹${fmt(balance.toFixed(0))}</div>
        </div>
        <div class="sip-stats-grid">
          <div class="sip-stat-box">
            <span class="sip-stat-label">💰 Total Investment</span>
            <span class="sip-stat-val">₹${fmt(totalInvested.toFixed(0))}</span>
            <span class="sip-stat-pct">(${invPct}% of total)</span>
          </div>
          <div class="sip-stat-box highlight">
            <span class="sip-stat-label">🛡️ Tax-Free Interest Earned</span>
            <span class="sip-stat-val text-green">+₹${fmt(totalInterest.toFixed(0))}</span>
            <span class="sip-stat-pct">(${intPct}% of total)</span>
          </div>
        </div>
        <div class="sip-bar-wrap" title="Invested ${invPct}% | Interest ${intPct}%">
          <div class="sip-bar-invested" style="width: ${invPct}%"></div>
          <div class="sip-bar-gain" style="width: ${intPct}%"></div>
        </div>
        <div class="sip-bar-legend">
          <span><span class="dot dot-invested"></span> Principal: ₹${fmt(totalInvested.toFixed(0))}</span>
          <span><span class="dot dot-gain"></span> Total Interest: ₹${fmt(totalInterest.toFixed(0))}</span>
        </div>
        <p style="font-size:12px; margin-top:8px; opacity:0.8; text-align:center;">🔒 <strong>EEE Tax Exemption:</strong> PPF is completely exempt from tax on deposit, interest, and maturity under Section 80C.</p>
      </div>
    `;
    const plain = `PPF Maturity: ₹${fmt(balance.toFixed(0))} (Invested: ₹${fmt(totalInvested.toFixed(0))}, Tax-Free Interest: ₹${fmt(totalInterest.toFixed(0))}) over ${tenure} years at ${r}%`;
    showResult(html, plain);
  });
}

function ppfSyncInput() {
  const inp = document.getElementById('ppf_deposit');
  const rng = document.getElementById('ppf_deposit_range');
  const lbl = document.getElementById('ppf_deposit_val');
  if (!inp) return;
  const val = parseFloat(inp.value) || 0;
  if (rng) rng.value = val;
  if (lbl) lbl.textContent = `₹${fmt(val)}`;
  calcPpf();
}

function ppfSyncRange() {
  const inp = document.getElementById('ppf_deposit');
  const rng = document.getElementById('ppf_deposit_range');
  const lbl = document.getElementById('ppf_deposit_val');
  if (!rng || !inp) return;
  inp.value = rng.value;
  if (lbl) lbl.textContent = `₹${fmt(rng.value)}`;
  calcPpf();
}

function ppfSetDeposit(val) {
  const inp = document.getElementById('ppf_deposit');
  if (inp) { inp.value = val; ppfSyncInput(); }
}

/* ─────────────────────────────────────────
   Lump Sum Investment Calculator
───────────────────────────────────────── */
function calcLumpsum() {
  safeCalc(() => {
    const p = getPositive('ls_amount', 'One-time Investment');
    const r = getPositive('ls_rate', 'Expected Return Rate');
    const y = getPositive('ls_years', 'Investment Period');

    const maturity = p * Math.pow(1 + (r / 100), y);
    const gain = maturity - p;

    const investedPct = ((p / maturity) * 100).toFixed(1);
    const gainPct = (100 - parseFloat(investedPct)).toFixed(1);

    function getLsM(yr) {
      return p * Math.pow(1 + (r / 100), yr);
    }
    const m5 = getLsM(5);
    const m10 = getLsM(10);
    const m15 = getLsM(15);
    const m20 = getLsM(20);

    const html = `
      <div class="sip-result-card">
        <div class="sip-maturity-hero">
          <div class="sip-maturity-label">Total Lumpsum Wealth (Maturity Value)</div>
          <div class="sip-maturity-amount">₹${fmt(maturity.toFixed(0))}</div>
        </div>
        <div class="sip-stats-grid">
          <div class="sip-stat-box">
            <span class="sip-stat-label">💰 Initial Investment</span>
            <span class="sip-stat-val">₹${fmt(p.toFixed(0))}</span>
            <span class="sip-stat-pct">(${investedPct}% of total)</span>
          </div>
          <div class="sip-stat-box highlight">
            <span class="sip-stat-label">📈 Wealth Gain (Returns)</span>
            <span class="sip-stat-val text-green">+₹${fmt(gain.toFixed(0))}</span>
            <span class="sip-stat-pct">(${gainPct}% of total)</span>
          </div>
        </div>
        <div class="sip-bar-wrap" title="Invested ${investedPct}% | Returns ${gainPct}%">
          <div class="sip-bar-invested" style="width: ${investedPct}%"></div>
          <div class="sip-bar-gain" style="width: ${gainPct}%"></div>
        </div>
        <div class="sip-bar-legend">
          <span><span class="dot dot-invested"></span> Principal: ₹${fmt(p.toFixed(0))}</span>
          <span><span class="dot dot-gain"></span> Returns: ₹${fmt(gain.toFixed(0))}</span>
        </div>
        <div class="sip-milestones">
          <div class="sip-milestones-title">Lumpsum Growth Milestones at ${r}%:</div>
          <div class="sip-milestones-grid">
            <div class="sip-m-card"><strong>5 Yrs</strong><span>₹${fmt(m5.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>10 Yrs</strong><span>₹${fmt(m10.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>15 Yrs</strong><span>₹${fmt(m15.toFixed(0))}</span></div>
            <div class="sip-m-card"><strong>20 Yrs</strong><span>₹${fmt(m20.toFixed(0))}</span></div>
          </div>
        </div>
      </div>
    `;
    const plain = `Lumpsum Maturity: ₹${fmt(maturity.toFixed(0))} (Invested: ₹${fmt(p.toFixed(0))}, Wealth Gain: ₹${fmt(gain.toFixed(0))}) for ${y} years at ${r}% p.a.`;
    showResult(html, plain);
  });
}

function lsSyncInput(field) {
  const inp = document.getElementById(`ls_${field}`);
  const rng = document.getElementById(`ls_${field}_range`);
  const lbl = document.getElementById(`ls_${field}_val`);
  if (!inp) return;
  const val = parseFloat(inp.value) || 0;
  if (rng && rng.max && val <= parseFloat(rng.max)) rng.value = val;
  if (lbl) {
    lbl.textContent = field === 'years' ? `${val} Yrs` : (field === 'rate' ? `${val}%` : `₹${fmt(val)}`);
  }
  calcLumpsum();
}

function lsSyncRange(field) {
  const inp = document.getElementById(`ls_${field}`);
  const rng = document.getElementById(`ls_${field}_range`);
  const lbl = document.getElementById(`ls_${field}_val`);
  if (!rng || !inp) return;
  inp.value = rng.value;
  if (lbl) {
    lbl.textContent = field === 'years' ? `${rng.value} Yrs` : (field === 'rate' ? `${rng.value}%` : `₹${fmt(rng.value)}`);
  }
  calcLumpsum();
}

function lsSetAmount(val) {
  const inp = document.getElementById('ls_amount');
  if (inp) { inp.value = val; lsSyncInput('amount'); }
}

function lsSetRate(val) {
  const inp = document.getElementById('ls_rate');
  if (inp) { inp.value = val; lsSyncInput('rate'); }
}

function lsSetYears(val) {
  const inp = document.getElementById('ls_years');
  if (inp) { inp.value = val; lsSyncInput('years'); }
}

/* ─────────────────────────────────────────
   Word & Character Counter
───────────────────────────────────────── */
function calcWordCount() {
  const el = document.getElementById('wc_input');
  if (!el) return;
  const text = el.value || '';

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charsWithSpaces = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const sentences = text.trim() ? (text.match(/[^.!?]+[.!?]+/g) || [text]).filter(s => s.trim().length > 0).length : 0;
  const paragraphs = text.trim() ? text.split(/\n+/).filter(p => p.trim().length > 0).length : 0;

  const readingTimeMin = Math.ceil(words / 200);
  const speakingTimeMin = Math.ceil(words / 130);

  const twitterLeft = 280 - charsWithSpaces;
  const instaLeft = 2200 - charsWithSpaces;
  const linkedInLeft = 3000 - charsWithSpaces;

  const setT = (id, val) => {
    const node = document.getElementById(id);
    if (node) node.textContent = val;
  };

  setT('wc_words', fmt(words));
  setT('wc_chars', fmt(charsWithSpaces));
  setT('wc_chars_nospace', fmt(charsNoSpaces));
  setT('wc_sentences', fmt(sentences));
  setT('wc_paragraphs', fmt(paragraphs));
  setT('wc_reading_time', readingTimeMin <= 1 ? '~1 min' : `~${readingTimeMin} mins`);
  setT('wc_speaking_time', speakingTimeMin <= 1 ? '~1 min' : `~${speakingTimeMin} mins`);
  setT('wc_twitter', twitterLeft >= 0 ? `${twitterLeft} left` : `${Math.abs(twitterLeft)} over!`);
  setT('wc_insta', instaLeft >= 0 ? `${instaLeft} left` : `${Math.abs(instaLeft)} over!`);
  setT('wc_linkedin', linkedInLeft >= 0 ? `${linkedInLeft} left` : `${Math.abs(linkedInLeft)} over!`);
}

function wcLoadSample() {
  const el = document.getElementById('wc_input');
  if (el) {
    el.value = "ToolBoxPro is an all-in-one suite of privacy-first online tools designed for developers, creators, students, and professionals. All conversions, calculations, and file operations happen 100% locally inside your web browser. No files, passwords, or sensitive documents are ever uploaded to an external cloud server.";
    calcWordCount();
  }
}

function wcClear() {
  const el = document.getElementById('wc_input');
  if (el) { el.value = ''; calcWordCount(); }
}

function wcCopyText() {
  const el = document.getElementById('wc_input');
  if (el && el.value) {
    navigator.clipboard.writeText(el.value).then(() => {
      showToast('Text copied to clipboard!');
    }).catch(() => {});
  }
}

/* ─────────────────────────────────────────
   Strong Password Generator
───────────────────────────────────────── */
function genPassword() {
  const lenEl = document.getElementById('pw_length');
  const len = lenEl ? parseInt(lenEl.value, 10) : 16;
  const incUpper = document.getElementById('pw_upper')?.checked ?? true;
  const incLower = document.getElementById('pw_lower')?.checked ?? true;
  const incNumbers = document.getElementById('pw_nums')?.checked ?? true;
  const incSymbols = document.getElementById('pw_syms')?.checked ?? true;
  const excAmbiguous = document.getElementById('pw_exc_ambig')?.checked ?? false;

  let upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  let numChars = '0123456789';
  let symChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (excAmbiguous) {
    upperChars = upperChars.replace(/[IO]/g, '');
    lowerChars = lowerChars.replace(/[lo]/g, '');
    numChars = numChars.replace(/[01]/g, '');
  }

  let charset = '';
  const guaranteed = [];

  if (incUpper) { charset += upperChars; guaranteed.push(upperChars[Math.floor(Math.random() * upperChars.length)]); }
  if (incLower) { charset += lowerChars; guaranteed.push(lowerChars[Math.floor(Math.random() * lowerChars.length)]); }
  if (incNumbers) { charset += numChars; guaranteed.push(numChars[Math.floor(Math.random() * numChars.length)]); }
  if (incSymbols) { charset += symChars; guaranteed.push(symChars[Math.floor(Math.random() * symChars.length)]); }

  if (!charset) {
    showError('Please select at least one character type.');
    return;
  }

  const arr = new Uint32Array(len);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 1000000000);
  }

  let password = [];
  for (let i = 0; i < guaranteed.length; i++) {
    password.push(guaranteed[i]);
  }
  for (let i = guaranteed.length; i < len; i++) {
    password.push(charset[arr[i] % charset.length]);
  }

  for (let i = password.length - 1; i > 0; i--) {
    const j = arr[i] % (i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  const resultPw = password.join('');

  const poolSize = charset.length;
  const entropy = Math.round(len * (Math.log(poolSize) / Math.log(2)));

  const out = document.getElementById('pw_output');
  if (out) out.value = resultPw;

  const entropyLabel = document.getElementById('pw_entropy');
  const strengthBar = document.getElementById('pw_strength_bar');
  const strengthText = document.getElementById('pw_strength_text');

  if (entropyLabel) entropyLabel.textContent = `${entropy} bits`;
  if (strengthBar && strengthText) {
    if (entropy < 36) {
      strengthBar.style.width = '25%';
      strengthBar.style.background = '#ef4444';
      strengthText.textContent = 'Weak';
      strengthText.style.color = '#ef4444';
    } else if (entropy < 60) {
      strengthBar.style.width = '55%';
      strengthBar.style.background = '#f59e0b';
      strengthText.textContent = 'Moderate';
      strengthText.style.color = '#f59e0b';
    } else if (entropy < 85) {
      strengthBar.style.width = '80%';
      strengthBar.style.background = '#10b981';
      strengthText.textContent = 'Strong';
      strengthText.style.color = '#10b981';
    } else {
      strengthBar.style.width = '100%';
      strengthBar.style.background = '#8b5cf6';
      strengthText.textContent = 'Military-Grade';
      strengthText.style.color = '#8b5cf6';
    }
  }
}

function pwCopy() {
  const el = document.getElementById('pw_output');
  if (el && el.value) {
    navigator.clipboard.writeText(el.value).then(() => {
      showToast('Password copied securely!');
    }).catch(() => {});
  }
}

function pwPreset(length, upper, lower, nums, syms) {
  const lenInput = document.getElementById('pw_length');
  const lenVal = document.getElementById('pw_len_val');
  if (lenInput) lenInput.value = length;
  if (lenVal) lenVal.textContent = length;

  const setC = (id, val) => { const node = document.getElementById(id); if (node) node.checked = val; };
  setC('pw_upper', upper);
  setC('pw_lower', lower);
  setC('pw_nums', nums);
  setC('pw_syms', syms);
  genPassword();
}

/* ─────────────────────────────────────────
   Text Case Converter
───────────────────────────────────────── */
function convertCase(mode) {
  const inp = document.getElementById('cc_input');
  if (!inp) return;
  const str = inp.value;
  if (!str) return;

  let res = str;
  if (mode === 'upper') {
    res = str.toUpperCase();
  } else if (mode === 'lower') {
    res = str.toLowerCase();
  } else if (mode === 'sentence') {
    res = str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
  } else if (mode === 'title') {
    res = str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  } else if (mode === 'camel') {
    res = str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    res = res.charAt(0).toLowerCase() + res.slice(1);
  } else if (mode === 'pascal') {
    res = str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    res = res.charAt(0).toUpperCase() + res.slice(1);
  } else if (mode === 'snake') {
    res = str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  } else if (mode === 'kebab') {
    res = str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  } else if (mode === 'inverse') {
    res = str.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
  }

  inp.value = res;
  const charSpan = document.getElementById('cc_chars');
  if (charSpan) charSpan.textContent = res.length;
}

function ccCopy() {
  const inp = document.getElementById('cc_input');
  if (inp && inp.value) {
    navigator.clipboard.writeText(inp.value).then(() => {
      showToast('Converted text copied!');
    }).catch(() => {});
  }
}

function ccDownload() {
  const inp = document.getElementById('cc_input');
  if (!inp || !inp.value) return;
  const blob = new Blob([inp.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'converted-text.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function ccClear() {
  const inp = document.getElementById('cc_input');
  if (inp) {
    inp.value = '';
    const charSpan = document.getElementById('cc_chars');
    if (charSpan) charSpan.textContent = '0';
  }
}

/* ─────────────────────────────────────────
   Base64 Encoder & Decoder
───────────────────────────────────────── */
function convertBase64(mode) {
  const inp = document.getElementById('b64_input');
  const out = document.getElementById('b64_output');
  if (!inp || !out) return;
  const str = inp.value;
  const urlSafe = document.getElementById('b64_urlsafe')?.checked;

  try {
    if (mode === 'encode') {
      let encoded = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
      if (urlSafe) {
        encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      out.value = encoded;
    } else {
      let cleanStr = str.trim();
      if (urlSafe) {
        cleanStr = cleanStr.replace(/-/g, '+').replace(/_/g, '/');
        while (cleanStr.length % 4) cleanStr += '=';
      }
      const decoded = decodeURIComponent(Array.prototype.map.call(atob(cleanStr), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      out.value = decoded;
    }
  } catch (e) {
    showError('Invalid text or Base64 format: ' + e.message);
  }
}

function b64Copy() {
  const out = document.getElementById('b64_output');
  if (out && out.value) {
    navigator.clipboard.writeText(out.value).then(() => {
      showToast('Base64 result copied!');
    }).catch(() => {});
  }
}

function b64Clear() {
  const inp = document.getElementById('b64_input');
  const out = document.getElementById('b64_output');
  if (inp) inp.value = '';
  if (out) out.value = '';
}

/* ─────────────────────────────────────────
   JSON Formatter & Validator
───────────────────────────────────────── */
function formatJson(mode) {
  const inp = document.getElementById('json_input');
  const out = document.getElementById('json_output');
  const banner = document.getElementById('json_status');
  if (!inp) return;
  const str = inp.value.trim();
  if (!str) {
    showError('Please enter JSON text to format.');
    return;
  }

  try {
    const parsed = JSON.parse(str);
    const space = mode === 'minify' ? 0 : (parseInt(document.getElementById('json_indent')?.value, 10) || 2);
    const formatted = space === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, space);
    if (out) out.value = formatted;
    if (banner) {
      banner.style.display = 'block';
      banner.style.padding = '8px 12px';
      banner.style.borderRadius = '6px';
      banner.style.background = 'rgba(16, 185, 129, 0.15)';
      banner.style.border = '1px solid #10b981';
      banner.style.color = '#10b981';
      banner.innerHTML = `✓ Valid JSON &nbsp;|&nbsp; Size: ${fmtBytes(new Blob([formatted]).size)} &nbsp;|&nbsp; Keys: ${Object.keys(parsed).length}`;
    }
    if (mode === 'validate') {
      showToast('JSON syntax is valid!');
    }
  } catch (err) {
    if (banner) {
      banner.style.display = 'block';
      banner.style.padding = '8px 12px';
      banner.style.borderRadius = '6px';
      banner.style.background = 'rgba(239, 68, 68, 0.15)';
      banner.style.border = '1px solid #ef4444';
      banner.style.color = '#ef4444';
      banner.innerHTML = `✕ Invalid JSON: ${err.message}`;
    }
    showError(`Invalid JSON: ${err.message}`);
  }
}

function jsonCopy() {
  const out = document.getElementById('json_output');
  if (out && out.value) {
    navigator.clipboard.writeText(out.value).then(() => {
      showToast('JSON copied to clipboard!');
    }).catch(() => {});
  }
}

function jsonDownload() {
  const out = document.getElementById('json_output');
  if (!out || !out.value) return;
  const blob = new Blob([out.value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'formatted.json';
  a.click();
  URL.revokeObjectURL(url);
}

function jsonLoadSample() {
  const inp = document.getElementById('json_input');
  if (inp) {
    inp.value = JSON.stringify({
      appName: "ToolBoxPro",
      version: "2.0.0",
      isPrivate: true,
      features: ["image", "pdf", "finance", "utility"],
      userStats: { activeTools: 32, totalConversions: 154200 }
    }, null, 2);
    formatJson('format');
  }
}

/* ─────────────────────────────────────────
   Color Picker & Converter
───────────────────────────────────────── */
function initColorPicker() {
  updateColorPicker('#5B4FFF');
}

function updateColorPicker(hex) {
  if (!hex) return;
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

  const colorInput = document.getElementById('cp_wheel');
  const hexInput = document.getElementById('cp_hex');
  if (colorInput) colorInput.value = hex;
  if (hexInput && hexInput !== document.activeElement) hexInput.value = hex.toUpperCase();

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  let c = 0, m = 0, y = 0, k = 1 - Math.max(rn, gn, bn);
  if (k < 1) {
    c = Math.round(((1 - rn - k) / (1 - k)) * 100);
    m = Math.round(((1 - gn - k) / (1 - k)) * 100);
    y = Math.round(((1 - bn - k) / (1 - k)) * 100);
  }
  k = Math.round(k * 100);

  const setV = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setV('cp_val_hex', hex.toUpperCase());
  setV('cp_val_rgb', `rgb(${r}, ${g}, ${b})`);
  setV('cp_val_hsl', `hsl(${h}, ${s}%, ${l}%)`);
  setV('cp_val_cmyk', `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`);

  const preview = document.getElementById('cp_preview');
  if (preview) preview.style.backgroundColor = hex;

  const sRGB = [rn, gn, bn].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  const contrastWhite = (1.05 / (lum + 0.05)).toFixed(2);
  const contrastBlack = ((lum + 0.05) / 0.05).toFixed(2);

  const whiteEl = document.getElementById('cp_contrast_white');
  const blackEl = document.getElementById('cp_contrast_black');
  if (whiteEl) whiteEl.textContent = `${contrastWhite}:1 ${contrastWhite >= 4.5 ? '✓ Pass' : '✕ Fail'}`;
  if (blackEl) blackEl.textContent = `${contrastBlack}:1 ${contrastBlack >= 4.5 ? '✓ Pass' : '✕ Fail'}`;
}

function colorCopy(type) {
  const el = document.getElementById(`cp_val_${type}`);
  if (el && el.value) {
    navigator.clipboard.writeText(el.value).then(() => {
      showToast(`${type.toUpperCase()} color copied!`);
    }).catch(() => {});
  }
}

/* ─────────────────────────────────────────
   Markdown to HTML Previewer
───────────────────────────────────────── */
function renderMarkdown() {
  const inp = document.getElementById('md_input');
  const out = document.getElementById('md_preview');
  const codeOut = document.getElementById('md_html_code');
  if (!inp) return;
  const src = inp.value;

  let html = src
    .replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (m, lang, code) => `<pre style="background:var(--border,#f1f5f9); padding:10px; border-radius:6px; overflow-x:auto;"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code style="background:var(--border,#f1f5f9); padding:2px 6px; border-radius:4px;">$1</code>')
    .replace(/^#### (.*$)/gim, '<h4 style="margin:12px 0 6px;">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 style="margin:14px 0 6px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="margin:16px 0 8px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="margin:18px 0 10px;">$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote style="border-left:3px solid var(--accent); margin:10px 0; padding-left:12px; color:var(--text-sub);">$1</blockquote>')
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent);">$1</a>')
    .replace(/^\s*[\*\-]\s+(.*$)/gim, '<li style="margin-left:20px;">$1</li>')
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;">');

  html = `<div class="md-rendered-content"><p style="margin:8px 0;">${html}</p></div>`;

  if (out) out.innerHTML = html;
  if (codeOut) codeOut.value = html;
}

function mdLoadSample() {
  const inp = document.getElementById('md_input');
  if (inp) {
    inp.value = `# Welcome to ToolBoxPro Markdown Editor
This is a **live client-side** previewer with *instant HTML generation*.

### Key Highlights:
- **Zero latency**: Everything parses right in your browser.
- **Privacy first**: No cloud upload.
- Supports \`inline code\` and code blocks.

> "Simplicity is the soul of efficiency."

Check out [ToolBoxPro Home](https://toolboxpro.in/) for 30+ everyday utilities!`;
    renderMarkdown();
  }
}

function mdCopyHtml() {
  const codeOut = document.getElementById('md_html_code');
  if (codeOut && codeOut.value) {
    navigator.clipboard.writeText(codeOut.value).then(() => {
      showToast('Rendered HTML copied!');
    }).catch(() => {});
  }
}

/* ─────────────────────────────────────────
   Utilities
───────────────────────────────────────── */
function fmt(n) {
  return Number(n).toLocaleString('en-IN');
}

function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* ─────────────────────────────────────────
   Image Compressor
───────────────────────────────────────── */




/* ─────────────────────────────────────────
   Official Govt Exam Presets (SSC, RRB, UPSC, IBPS/SBI, JEE, NEET, GATE, CAT, CTET, etc.)
───────────────────────────────────────── */
const GOVT_EXAM_PRESETS = {
  // ── SSC (Staff Selection Commission: CGL, CHSL, MTS, GD, Steno, CPO) ──
  'ssc_photo': {
    name: 'SSC Photo (Live & Upload)',
    portal: 'SSC',
    minKb: 20,
    maxKb: 50,
    targetKb: 35,
    w: 200,
    h: 230,
    format: 'image/jpeg',
    specs: '20 KB – 50 KB • 3.5cm × 4.5cm (200×230 px) • JPG / JPEG',
    defaultFilename: 'SSC_Photo',
    note: 'Plain white or light background. 80% face coverage. No caps, dark glasses, or masks.'
  },
  'ssc_sig': {
    name: 'SSC Signature',
    portal: 'SSC',
    minKb: 10,
    maxKb: 20,
    targetKb: 15,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '10 KB – 20 KB • 4.0cm × 2.0cm (140×60 px) • JPG / JPEG',
    defaultFilename: 'SSC_Signature',
    note: 'Black or dark blue ink on white paper. Running handwriting only (NO CAPITAL LETTERS).'
  },
  'ssc_thumb': {
    name: 'SSC Left Thumb',
    portal: 'SSC',
    minKb: 10,
    maxKb: 30,
    targetKb: 20,
    w: 140,
    h: 140,
    format: 'image/jpeg',
    specs: '10 KB – 30 KB • 140×140 px • JPG / JPEG',
    defaultFilename: 'SSC_Thumb'
  },
  'ssc_decl': {
    name: 'SSC Certificate / Document',
    portal: 'SSC',
    minKb: 20,
    maxKb: 100,
    targetKb: 60,
    w: 600,
    h: 400,
    format: 'image/jpeg',
    specs: '20 KB – 100 KB • JPG / JPEG',
    defaultFilename: 'SSC_Doc'
  },
  'ssc_doc': {
    name: 'SSC Certificate / Document',
    portal: 'SSC',
    minKb: 20,
    maxKb: 100,
    targetKb: 60,
    w: 600,
    h: 400,
    format: 'image/jpeg',
    specs: '20 KB – 100 KB • JPG / JPEG',
    defaultFilename: 'SSC_Doc'
  },

  // ── RRB Railway (NTPC, ALP, Technician, JE, Group D) - Official CEN Verified ──
  'rrb_photo': {
    name: 'RRB Railway Photo',
    portal: 'RRB Railway (NTPC, ALP, Tech, JE)',
    minKb: 30, // Official CEN rule: 30 KB to 70 KB strictly enforced on rrbapply.gov.in
    maxKb: 70,
    targetKb: 50,
    w: 240,
    h: 320,
    format: 'image/jpeg',
    specs: '30 KB – 70 KB • 35mm × 45mm (240×320 px) • JPG / JPEG',
    defaultFilename: 'RRB_Photo',
    note: 'Official CEN rule: 30 KB to 70 KB strictly. Plain white/light background. Dark clothing recommended.'
  },
  'rrb_sig': {
    name: 'RRB Railway Signature',
    portal: 'RRB Railway (NTPC, ALP, Tech, JE)',
    minKb: 30, // Official CEN rule: 30 KB to 70 KB strictly enforced
    maxKb: 70,
    targetKb: 45,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '30 KB – 70 KB • 50mm × 20mm (140×60 px) • JPG / JPEG',
    defaultFilename: 'RRB_Signature',
    note: 'Official CEN rule: 30 KB to 70 KB strictly. Black/blue ink on white paper. Running cursive hand only (NO block letters).'
  },
  'rrb_thumb': {
    name: 'RRB Thumb Impression',
    portal: 'RRB Railway',
    minKb: 10,
    maxKb: 50,
    targetKb: 30,
    w: 140,
    h: 140,
    format: 'image/jpeg',
    specs: '10 KB – 50 KB • 140×140 px • JPG / JPEG',
    defaultFilename: 'RRB_Thumb'
  },
  'rrb_decl': {
    name: 'RRB Document / Travel Pass',
    portal: 'RRB Railway',
    minKb: 30,
    maxKb: 100,
    targetKb: 65,
    w: 600,
    h: 400,
    format: 'image/jpeg',
    specs: '30 KB – 100 KB • JPG / JPEG',
    defaultFilename: 'RRB_Doc'
  },
  'rrb_doc': {
    name: 'RRB Document / Travel Pass',
    portal: 'RRB Railway',
    minKb: 30,
    maxKb: 100,
    targetKb: 65,
    w: 600,
    h: 400,
    format: 'image/jpeg',
    specs: '30 KB – 100 KB • JPG / JPEG',
    defaultFilename: 'RRB_Doc'
  },

  // ── UPSC (Civil Services, NDA, CDS, OTR) - Official Portal Verified ──
  'upsc_photo': {
    name: 'UPSC Photo (OTR & Exam)',
    portal: 'UPSC',
    minKb: 20,
    maxKb: 300,
    targetKb: 100,
    w: 350,
    h: 350,
    format: 'image/jpeg',
    specs: '20 KB – 300 KB • Min 350×350 px (1:1 Square) • JPG / JPEG',
    defaultFilename: 'UPSC_Photo',
    note: 'Face must cover ~75% of photo. Plain white background. Name & Date of Photo printed at bottom.'
  },
  'upsc_sig': {
    name: 'UPSC Signature (Triple Sig Rule)',
    portal: 'UPSC',
    minKb: 20,
    maxKb: 100, // UPSC OTR strictly 20 KB to 100 KB
    targetKb: 60,
    w: 350,
    h: 350,
    format: 'image/jpeg',
    specs: '20 KB – 100 KB • 350×350 px to 500×500 px • JPG / JPEG',
    defaultFilename: 'UPSC_Signature',
    note: 'UPSC Triple Signature: Sign three times vertically on white paper with black ink and scan as one image.'
  },
  'upsc_thumb': {
    name: 'UPSC Thumb Impression',
    portal: 'UPSC',
    minKb: 20,
    maxKb: 300,
    targetKb: 80,
    w: 350,
    h: 350,
    format: 'image/jpeg',
    specs: '20 KB – 300 KB • 350×350 px • JPG / JPEG',
    defaultFilename: 'UPSC_Thumb'
  },
  'upsc_decl': {
    name: 'UPSC Certificate / Document',
    portal: 'UPSC',
    minKb: 20,
    maxKb: 300,
    targetKb: 120,
    w: 700,
    h: 500,
    format: 'image/jpeg',
    specs: '20 KB – 300 KB • JPG / JPEG',
    defaultFilename: 'UPSC_Doc'
  },
  'upsc_doc': {
    name: 'UPSC Certificate / Document',
    portal: 'UPSC',
    minKb: 20,
    maxKb: 300,
    targetKb: 120,
    w: 700,
    h: 500,
    format: 'image/jpeg',
    specs: '20 KB – 300 KB • JPG / JPEG',
    defaultFilename: 'UPSC_Doc'
  },

  // ── IBPS / SBI (Bank PO, Clerk, SO, RRB) - Official IBPS Verified ──
  'ibps_photo': {
    name: 'IBPS / SBI Photo',
    portal: 'IBPS / SBI Bank',
    minKb: 20,
    maxKb: 50,
    targetKb: 35,
    w: 200,
    h: 230,
    format: 'image/jpeg',
    specs: '20 KB – 50 KB • 200×230 px (3.5cm × 4.5cm) • JPG / JPEG',
    defaultFilename: 'IBPS_Photo',
    note: 'Recent color picture. Light/white background. Even lighting, no red eye.'
  },
  'ibps_sig': {
    name: 'IBPS / SBI Signature',
    portal: 'IBPS / SBI Bank',
    minKb: 10,
    maxKb: 20,
    targetKb: 15,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '10 KB – 20 KB • 140×60 px • JPG / JPEG',
    defaultFilename: 'IBPS_Signature',
    note: 'Must sign with BLACK INK only on white paper. Capital letters will lead to rejection.'
  },
  'ibps_thumb': {
    name: 'IBPS Left Thumb Impression',
    portal: 'IBPS / SBI Bank',
    minKb: 20,
    maxKb: 50,
    targetKb: 35,
    w: 240,
    h: 240,
    format: 'image/jpeg',
    specs: '20 KB – 50 KB • 240×240 px (3cm × 3cm at 200 DPI) • JPG / JPEG',
    defaultFilename: 'IBPS_Thumb',
    note: 'Stamped with black or blue ink on white paper. Clean impression without smudges.'
  },
  'ibps_decl': {
    name: 'IBPS Hand-Written Declaration',
    portal: 'IBPS / SBI Bank',
    minKb: 50,
    maxKb: 100,
    targetKb: 75,
    w: 800,
    h: 400,
    format: 'image/jpeg',
    specs: '50 KB – 100 KB • 800×400 px (10cm × 5cm at 200 DPI) • JPG / JPEG',
    defaultFilename: 'IBPS_Declaration',
    note: 'Must be written by candidate in English with BLACK INK on white paper. CAPITAL LETTERS not accepted.'
  },
  'ibps_doc': {
    name: 'IBPS Hand-Written Declaration / Doc',
    portal: 'IBPS / SBI Bank',
    minKb: 50,
    maxKb: 100,
    targetKb: 75,
    w: 800,
    h: 400,
    format: 'image/jpeg',
    specs: '50 KB – 100 KB • 800×400 px • JPG / JPEG',
    defaultFilename: 'IBPS_Declaration'
  },

  // ── NTA JEE Main & Advanced (National Testing Agency / IIT JEE) ──
  'jee_photo': {
    name: 'JEE Main Passport Photo',
    portal: 'NTA JEE Main & Advanced',
    minKb: 10,
    maxKb: 200,
    targetKb: 80,
    w: 350,
    h: 450,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 3.5cm × 4.5cm (350×450 px) • JPG / JPEG',
    defaultFilename: 'JEE_Main_Photo',
    note: 'White background, 80% face coverage with visible ears. Spectacles allowed only if used regularly.'
  },
  'jee_sig': {
    name: 'JEE Main Signature',
    portal: 'NTA JEE Main & Advanced',
    minKb: 4,
    maxKb: 30,
    targetKb: 18,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '4 KB – 30 KB • 3.5cm × 1.5cm (140×60 px) • JPG / JPEG',
    defaultFilename: 'JEE_Main_Signature',
    note: 'Must sign with black ballpoint ink on white paper in running hand. DO NOT sign in capital letters.'
  },
  'jee_thumb': {
    name: 'JEE Main Left Thumb Impression',
    portal: 'NTA JEE Main & Advanced',
    minKb: 10,
    maxKb: 200,
    targetKb: 60,
    w: 400,
    h: 300,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 400×300 px • JPG / JPEG',
    defaultFilename: 'JEE_Main_Thumb',
    note: 'Blue or black ink pad impression on white paper without smudges.'
  },
  'jee_decl': {
    name: 'JEE Main Marksheet / Category Proof',
    portal: 'NTA JEE Main & Advanced',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'JEE_Main_Certificate'
  },
  'jee_doc': {
    name: 'JEE Main Marksheet / Category Proof',
    portal: 'NTA JEE Main & Advanced',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'JEE_Main_Certificate'
  },

  // ── NTA NEET UG (Medical Entrance) - Official Information Bulletin ──
  'neet_photo': {
    name: 'NEET UG Passport Photo',
    portal: 'NTA NEET UG',
    minKb: 10,
    maxKb: 200,
    targetKb: 80,
    w: 350,
    h: 450,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 3.5cm × 4.5cm (350×450 px) • JPG / JPEG',
    defaultFilename: 'NEET_Passport_Photo',
    note: 'White background, 80% face coverage with visible ears. Name of candidate & date of taking photo printed at bottom.'
  },
  'neet_postcard': {
    name: 'NEET UG Postcard Photo (4"×6")',
    portal: 'NTA NEET UG',
    minKb: 10,
    maxKb: 200,
    targetKb: 120,
    w: 1200,
    h: 1800,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 4" × 6" Postcard Size (1200×1800 px) • JPG / JPEG',
    defaultFilename: 'NEET_Postcard_4x6_Photo',
    note: 'Mandatory 4"×6" postcard size for exam day verification. White background with Candidate Name & Date of Photo printed.'
  },
  'neet_sig': {
    name: 'NEET UG Signature',
    portal: 'NTA NEET UG',
    minKb: 4,
    maxKb: 30,
    targetKb: 18,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '4 KB – 30 KB • 140×60 px • JPG / JPEG',
    defaultFilename: 'NEET_Signature',
    note: 'Candidate must sign with black ink pen on white paper in running handwriting (NOT CAPITAL LETTERS).'
  },
  'neet_thumb': {
    name: 'NEET UG Left Thumb Impression',
    portal: 'NTA NEET UG',
    minKb: 10,
    maxKb: 200,
    targetKb: 70,
    w: 400,
    h: 300,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 400×300 px • JPG / JPEG',
    defaultFilename: 'NEET_Thumb'
  },
  'neet_neet_thumb': {
    name: 'NEET UG All Fingers & Thumbs Impression',
    portal: 'NTA NEET UG',
    minKb: 10,
    maxKb: 200,
    targetKb: 80,
    w: 600,
    h: 400,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 600×400 px (Horizontal) • JPG / JPEG',
    defaultFilename: 'NEET_Fingers_Thumbs_Impression',
    note: 'Both hands all 10 fingers & thumbs impressions on white paper with blue/black ink.'
  },
  'neet_decl': {
    name: 'NEET UG Certificate / 10th Marksheet',
    portal: 'NTA NEET UG',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'NEET_Certificate'
  },
  'neet_doc': {
    name: 'NEET UG Certificate / 10th Marksheet',
    portal: 'NTA NEET UG',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'NEET_Certificate'
  },

  // ── GATE (IIT M.Tech / PSU Recruitment) ──
  'gate_photo': {
    name: 'GATE Photo (IIT)',
    portal: 'GATE (IIT)',
    minKb: 5,
    maxKb: 200,
    targetKb: 75,
    w: 480,
    h: 640,
    format: 'image/jpeg',
    specs: '5 KB – 200 KB • 480×640 px (3.5cm × 4.5cm) • JPG / JPEG',
    defaultFilename: 'GATE_Photo',
    note: 'Plain white background, 60%–70% face area. Clear frontal face with both ears visible.'
  },
  'gate_sig': {
    name: 'GATE Signature (IIT)',
    portal: 'GATE (IIT)',
    minKb: 3,
    maxKb: 200,
    targetKb: 50,
    w: 560,
    h: 160,
    format: 'image/jpeg',
    specs: '3 KB – 200 KB • 560×160 px (Ratio ~3.5:1) • JPG / JPEG',
    defaultFilename: 'GATE_Signature',
    note: 'Aspect ratio must be between 1:2.75 and 1:3.75. Black or dark blue ink.'
  },
  'gate_thumb': {
    name: 'GATE Thumb Impression',
    portal: 'GATE (IIT)',
    minKb: 5,
    maxKb: 200,
    targetKb: 50,
    w: 240,
    h: 240,
    format: 'image/jpeg',
    specs: '5 KB – 200 KB • 240×240 px • JPG / JPEG',
    defaultFilename: 'GATE_Thumb'
  },
  'gate_decl': {
    name: 'GATE Eligibility / Category Certificate',
    portal: 'GATE (IIT)',
    minKb: 10,
    maxKb: 500,
    targetKb: 200,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '10 KB – 500 KB • PDF / JPG',
    defaultFilename: 'GATE_Certificate'
  },
  'gate_doc': {
    name: 'GATE Eligibility / Category Certificate',
    portal: 'GATE (IIT)',
    minKb: 10,
    maxKb: 500,
    targetKb: 200,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '10 KB – 500 KB • PDF / JPG',
    defaultFilename: 'GATE_Certificate'
  },

  // ── CAT (IIM MBA Entrance) ──
  'cat_photo': {
    name: 'CAT Photo (IIM)',
    portal: 'CAT (IIM)',
    minKb: 10,
    maxKb: 80,
    targetKb: 50,
    w: 413,
    h: 531,
    format: 'image/jpeg',
    specs: '10 KB – 80 KB • 35mm × 45mm (413×531 px at 300 DPI) • JPG / JPEG',
    defaultFilename: 'CAT_Photo',
    note: 'White background. Photo must not be more than six months old.'
  },
  'cat_sig': {
    name: 'CAT Signature (IIM)',
    portal: 'CAT (IIM)',
    minKb: 10,
    maxKb: 80,
    targetKb: 40,
    w: 280,
    h: 120,
    format: 'image/jpeg',
    specs: '10 KB – 80 KB • 80mm × 35mm (280×120 px) • JPG / JPEG',
    defaultFilename: 'CAT_Signature',
    note: 'Signature on white paper with black ink.'
  },
  'cat_thumb': {
    name: 'CAT Thumb Impression',
    portal: 'CAT (IIM)',
    minKb: 10,
    maxKb: 80,
    targetKb: 40,
    w: 240,
    h: 240,
    format: 'image/jpeg',
    specs: '10 KB – 80 KB • 240×240 px • JPG / JPEG',
    defaultFilename: 'CAT_Thumb'
  },
  'cat_decl': {
    name: 'CAT Category / PwD Certificate',
    portal: 'CAT (IIM)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • PDF / JPG',
    defaultFilename: 'CAT_Certificate'
  },
  'cat_doc': {
    name: 'CAT Category / PwD Certificate',
    portal: 'CAT (IIM)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • PDF / JPG',
    defaultFilename: 'CAT_Certificate'
  },

  // ── CTET / State TET (CBSE Teacher Eligibility Test) ──
  'ctet_photo': {
    name: 'CTET / State TET Photo',
    portal: 'CTET (CBSE)',
    minKb: 10,
    maxKb: 100,
    targetKb: 50,
    w: 200,
    h: 230,
    format: 'image/jpeg',
    specs: '10 KB – 100 KB • 3.5cm × 4.5cm (200×230 px) • JPG / JPEG',
    defaultFilename: 'CTET_Photo',
    note: 'Recent color photo with white background. Both ears visible.'
  },
  'ctet_sig': {
    name: 'CTET / State TET Signature',
    portal: 'CTET (CBSE)',
    minKb: 3,
    maxKb: 30,
    targetKb: 15,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '3 KB – 30 KB • 3.5cm × 1.5cm (140×60 px) • JPG / JPEG',
    defaultFilename: 'CTET_Signature',
    note: 'Candidate must sign with running handwriting (NOT CAPITAL LETTERS).'
  },
  'ctet_thumb': {
    name: 'CTET Thumb Impression',
    portal: 'CTET (CBSE)',
    minKb: 10,
    maxKb: 50,
    targetKb: 30,
    w: 140,
    h: 140,
    format: 'image/jpeg',
    specs: '10 KB – 50 KB • 140×140 px • JPG / JPEG',
    defaultFilename: 'CTET_Thumb'
  },
  'ctet_decl': {
    name: 'CTET Marksheet / B.Ed Certificate',
    portal: 'CTET (CBSE)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • PDF / JPG',
    defaultFilename: 'CTET_Certificate'
  },
  'ctet_doc': {
    name: 'CTET Marksheet / B.Ed Certificate',
    portal: 'CTET (CBSE)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • PDF / JPG',
    defaultFilename: 'CTET_Certificate'
  },

  // ── CUET (UG / PG University Entrance) ──
  'cuet_photo': {
    name: 'CUET Photo',
    portal: 'CUET (NTA)',
    minKb: 10,
    maxKb: 200,
    targetKb: 80,
    w: 350,
    h: 450,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 3.5cm × 4.5cm • JPG / JPEG',
    defaultFilename: 'CUET_Photo',
    note: 'White background, 80% face coverage with visible ears.'
  },
  'cuet_sig': {
    name: 'CUET Signature',
    portal: 'CUET (NTA)',
    minKb: 4,
    maxKb: 30,
    targetKb: 18,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '4 KB – 30 KB • 140×60 px • JPG / JPEG',
    defaultFilename: 'CUET_Signature',
    note: 'Signed with black ink on white paper in running handwriting.'
  },
  'cuet_thumb': {
    name: 'CUET Thumb Impression',
    portal: 'CUET (NTA)',
    minKb: 10,
    maxKb: 200,
    targetKb: 70,
    w: 400,
    h: 300,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 400×300 px • JPG / JPEG',
    defaultFilename: 'CUET_Thumb'
  },
  'cuet_decl': {
    name: 'CUET Category / Marksheet Document',
    portal: 'CUET (NTA)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'CUET_Doc'
  },
  'cuet_doc': {
    name: 'CUET Category / Marksheet Document',
    portal: 'CUET (NTA)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'CUET_Doc'
  },

  // ── Police & State PSC (UP Police, Bihar BPSC/Police, MP, Rajasthan, Delhi) ──
  'police_photo': {
    name: 'Police / State PSC Photo',
    portal: 'State Govt / Police',
    minKb: 20,
    maxKb: 50,
    targetKb: 35,
    w: 200,
    h: 230,
    format: 'image/jpeg',
    specs: '20 KB – 50 KB • 200×230 px (3.5cm × 4.5cm) • JPG / JPEG',
    defaultFilename: 'Govt_Photo',
    note: 'Plain light/white background. Full front view.'
  },
  'police_sig': {
    name: 'Police / State PSC Signature',
    portal: 'State Govt / Police',
    minKb: 5,
    maxKb: 20,
    targetKb: 12,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '5 KB – 20 KB • 140×60 px • JPG / JPEG',
    defaultFilename: 'Govt_Signature',
    note: 'Signed in running hand on white paper with black or blue ink.'
  },
  'police_thumb': {
    name: 'Thumb Impression',
    portal: 'State Govt / Police',
    minKb: 10,
    maxKb: 50,
    targetKb: 25,
    w: 140,
    h: 140,
    format: 'image/jpeg',
    specs: '10 KB – 50 KB • 140×140 px • JPG / JPEG',
    defaultFilename: 'Govt_Thumb'
  },
  'police_decl': {
    name: 'State PSC Document',
    portal: 'State Govt / Police',
    minKb: 20,
    maxKb: 100,
    targetKb: 60,
    w: 600,
    h: 400,
    format: 'image/jpeg',
    specs: '20 KB – 100 KB • JPG / JPEG',
    defaultFilename: 'State_Doc'
  },
  'police_doc': {
    name: 'State PSC Document',
    portal: 'State Govt / Police',
    minKb: 20,
    maxKb: 100,
    targetKb: 60,
    w: 600,
    h: 400,
    format: 'image/jpeg',
    specs: '20 KB – 100 KB • JPG / JPEG',
    defaultFilename: 'State_Doc'
  },

  // ── Indian Passport & Visa ──
  'passport_photo': {
    name: 'Indian Passport Photo',
    portal: 'Passport Seva / Visa',
    minKb: 20,
    maxKb: 100,
    targetKb: 50,
    w: 413,
    h: 531,
    format: 'image/jpeg',
    specs: '20 KB – 100 KB (up to 200 KB) • 3.5cm × 4.5cm (413×531 px at 300 DPI) • JPG / JPEG',
    defaultFilename: 'Passport_Photo',
    note: 'White background. Head occupies 68% to 70%. Neutral expression, both ears visible.'
  },
  'passport_sig': {
    name: 'Passport Signature',
    portal: 'Passport Seva / Visa',
    minKb: 10,
    maxKb: 50,
    targetKb: 25,
    w: 280,
    h: 120,
    format: 'image/jpeg',
    specs: '10 KB – 50 KB • 280×120 px • JPG / JPEG',
    defaultFilename: 'Passport_Signature'
  },
  'passport_thumb': {
    name: 'Passport Thumb Impression',
    portal: 'Passport Seva / Visa',
    minKb: 10,
    maxKb: 50,
    targetKb: 25,
    w: 200,
    h: 200,
    format: 'image/jpeg',
    specs: '10 KB – 50 KB • 200×200 px • JPG / JPEG',
    defaultFilename: 'Passport_Thumb'
  },
  'passport_decl': {
    name: 'Passport Supporting Document',
    portal: 'Passport Seva',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1000,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'Passport_Doc'
  },
  'passport_doc': {
    name: 'Passport Supporting Document',
    portal: 'Passport Seva',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1000,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'Passport_Doc'
  },

  // ── Backward compatibility aliases ──
  'nta_photo': {
    name: 'NTA Photo (NEET / JEE / CUET)',
    portal: 'NTA (NEET, JEE, CUET)',
    minKb: 10,
    maxKb: 200,
    targetKb: 80,
    w: 350,
    h: 450,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • 3.5cm × 4.5cm • JPG / JPEG',
    defaultFilename: 'NTA_Photo',
    note: 'White background. 80% face coverage, ears visible.'
  },
  'nta_sig': {
    name: 'NTA Signature',
    portal: 'NTA (NEET, JEE, CUET)',
    minKb: 4,
    maxKb: 30,
    targetKb: 18,
    w: 140,
    h: 60,
    format: 'image/jpeg',
    specs: '4 KB – 30 KB • 140×60 px • JPG / JPEG',
    defaultFilename: 'NTA_Signature'
  },
  'nta_thumb': {
    name: 'NTA Finger & Thumb Impression',
    portal: 'NTA (NEET / JEE)',
    minKb: 10,
    maxKb: 200,
    targetKb: 70,
    w: 400,
    h: 300,
    format: 'image/jpeg',
    specs: '10 KB – 200 KB • Left & right fingers/thumb • JPG / JPEG',
    defaultFilename: 'NTA_Thumb_Impression'
  },
  'nta_decl': {
    name: 'NTA Category / Marksheet Document',
    portal: 'NTA (NEET, JEE, CUET)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'NTA_Doc'
  },
  'nta_doc': {
    name: 'NTA Category / Marksheet Document',
    portal: 'NTA (NEET, JEE, CUET)',
    minKb: 50,
    maxKb: 300,
    targetKb: 150,
    w: 800,
    h: 1100,
    format: 'image/jpeg',
    specs: '50 KB – 300 KB • JPG / PDF',
    defaultFilename: 'NTA_Doc'
  }
};

/** Helper to retrieve the most accurate preset with intelligent fallbacks */
function getGovtPreset(exam, type) {
  const key = `${exam}_${type}`;
  if (GOVT_EXAM_PRESETS[key]) return GOVT_EXAM_PRESETS[key];
  if (type === 'neet_thumb' && GOVT_EXAM_PRESETS[`${exam}_thumb`]) return GOVT_EXAM_PRESETS[`${exam}_thumb`];
  if (type === 'postcard' && GOVT_EXAM_PRESETS[`${exam}_photo`]) return GOVT_EXAM_PRESETS[`${exam}_photo`];
  if (GOVT_EXAM_PRESETS[`${exam}_${type}`]) return GOVT_EXAM_PRESETS[`${exam}_${type}`];
  if (GOVT_EXAM_PRESETS[`${exam}_doc`]) return GOVT_EXAM_PRESETS[`${exam}_doc`];
  if (GOVT_EXAM_PRESETS[`${exam}_decl`]) return GOVT_EXAM_PRESETS[`${exam}_decl`];
  if (GOVT_EXAM_PRESETS[`${exam}_photo`]) return GOVT_EXAM_PRESETS[`${exam}_photo`];
  if (GOVT_EXAM_PRESETS[`ssc_${type}`]) return GOVT_EXAM_PRESETS[`ssc_${type}`];
  return GOVT_EXAM_PRESETS['ssc_photo'];
}

let _icImg = null;
let _icOrigFile = null;
let _icCompBlob = null;
let _icMode = 'manual'; // default mode: 'manual' (Quick Compress), 'target', or 'govt'
let _icCurrentPreset = null;
let _icCompFilename = 'compressed-image.jpg';

function icInit() {
  _icMode = 'manual';
  _icImg = null;
  _icOrigFile = null;
  _icCompBlob = null;
  _icCurrentPreset = null;
  icSetMode('manual');
}

function icSetMode(mode) {
  _icMode = mode;
  document.querySelectorAll('.ic-mode-tab').forEach(t => {
    t.classList.remove('active', 'is-active');
    t.setAttribute('aria-selected', 'false');
  });
  const tab = document.getElementById(`ic-tab-${mode}`);
  if (tab) {
    tab.classList.add('active', 'is-active');
    tab.setAttribute('aria-selected', 'true');
  }

  const govtPanel = document.getElementById('ic-govt-panel');
  const targetPanel = document.getElementById('ic-target-panel');
  const manualControls = document.getElementById('ic-manual-controls');

  if (govtPanel) govtPanel.classList.toggle('hidden', mode !== 'govt');
  if (targetPanel) targetPanel.classList.toggle('hidden', mode !== 'target');
  if (manualControls) manualControls.classList.toggle('hidden', mode !== 'manual');

  if (mode === 'govt') {
    icApplyGovtPreset();
  } else if (_icImg) {
    icCompress();
  }
}

function icApplyGovtPreset() {
  const examEl = document.getElementById('ic-exam-select');
  const typeEl = document.getElementById('ic-type-select');
  if (!examEl || !typeEl) return;

  const preset = getGovtPreset(examEl.value, typeEl.value);
  _icCurrentPreset = preset;

  const badge = document.getElementById('ic-guide-badge');
  const specs = document.getElementById('ic-guide-specs');
  const dimLabel = document.getElementById('ic-dim-label');

  if (badge) badge.textContent = `${preset.portal} • ${preset.name}`;
  if (specs) {
    let specsHtml = `<span>Allowed File Size: <strong>${preset.minKb} KB – ${preset.maxKb} KB</strong></span> • <span>Dimensions: <strong>${preset.w} × ${preset.h} px</strong></span> • <span>Format: <strong>JPG / JPEG</strong></span>`;
    if (preset.note) {
      specsHtml += `<div style="margin-top:8px; font-size:12px; color:var(--text); background:var(--surface); padding:6px 10px; border-radius:6px; border:1px solid var(--line); line-height:1.4;">📌 <strong>Official Guideline:</strong> ${preset.note}</div>`;
    }
    specs.innerHTML = specsHtml;
  }
  if (dimLabel) dimLabel.textContent = `${preset.w} × ${preset.h} px`;

  if (_icImg) icCompress();
}

function icSetTargetKb(kb) {
  const inp = document.getElementById('ic-target-kb');
  if (inp) inp.value = kb;

  document.querySelectorAll('#ic-target-panel .chip-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.includes(String(kb)));
  });

  if (_icMode !== 'target') {
    icSetMode('target');
  } else if (_icImg) {
    icCompress();
  }
}

function icSetQualityPreset(q) {
  const slider = document.getElementById('ic-quality');
  if (slider) slider.value = q;
  const qVal = document.getElementById('ic-quality-val');
  if (qVal) qVal.textContent = q;

  document.querySelectorAll('.ic-preset-chip').forEach(c => {
    const chipQ = c.getAttribute('data-quality');
    c.classList.toggle('active', chipQ === String(q));
  });

  if (_icMode !== 'manual') {
    icSetMode('manual');
  } else if (_icImg) {
    icCompress();
  }
}

function icUpdateQuality(val) {
  const qVal = document.getElementById('ic-quality-val');
  if (qVal) qVal.textContent = val;

  document.querySelectorAll('.ic-preset-chip').forEach(c => {
    const chipQ = c.getAttribute('data-quality');
    c.classList.toggle('active', chipQ === String(val));
  });

  if (_icMode !== 'manual') {
    icSetMode('manual');
  } else if (_icImg) {
    icCompress();
  }
}

function icHandleDrop(e) {
  e.preventDefault();
  const dropZone = document.getElementById('ic-drop');
  if (dropZone) dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const isImg = file.type.startsWith('image/') || (file.name && /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name));
  if (!isImg) {
    showToast('⚠️ Unsupported file type. Please use JPEG, PNG, WebP, GIF, or BMP.');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showToast(`⚠️ File too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).`);
    return;
  }
  icLoadFile(file);
}

function icLoadFile(file) {
  if (!file) return;
  const isImg = file.type.startsWith('image/') || (file.name && /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name));
  if (!isImg) {
    showToast('⚠️ Unsupported file type.');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showToast(`⚠️ File too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).`);
    return;
  }
  _icOrigFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      _icImg = img;
      document.getElementById('ic-drop').classList.add('hidden');
      document.getElementById('ic-preview-wrap').classList.remove('hidden');
      document.getElementById('ic-orig-img').src = e.target.result;
      document.getElementById('ic-orig-info').innerHTML =
        `<strong>${img.naturalWidth} × ${img.naturalHeight}px</strong> — <span>${fmtBytes(file.size)}</span>`;

      if (_icMode === 'govt') {
        icApplyGovtPreset();
      } else {
        const fmt = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        if (document.getElementById('ic-format')) document.getElementById('ic-format').value = fmt;
        icCompress();
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function icCompress() {
  if (!_icImg) return;

  let targetW = _icImg.naturalWidth;
  let targetH = _icImg.naturalHeight;
  let format = 'image/jpeg';
  let targetMinKb = null;
  let targetMaxKb = null;

  if (_icMode === 'govt') {
    if (!_icCurrentPreset) {
      const examEl = document.getElementById('ic-exam-select');
      const typeEl = document.getElementById('ic-type-select');
      _icCurrentPreset = getGovtPreset(examEl ? examEl.value : 'ssc', typeEl ? typeEl.value : 'photo');
    }
    const autoDim = document.getElementById('ic-auto-dim');
    if (!autoDim || autoDim.checked) {
      targetW = _icCurrentPreset.w;
      targetH = _icCurrentPreset.h;
    }
    format = 'image/jpeg';
    targetMinKb = _icCurrentPreset.minKb;
    targetMaxKb = _icCurrentPreset.maxKb;
  } else if (_icMode === 'target') {
    const targetKbInput = document.getElementById('ic-target-kb');
    targetMaxKb = parseFloat(targetKbInput ? targetKbInput.value : 50) || 50;
    format = 'image/jpeg';
  } else {
    // Manual slider mode
    format = document.getElementById('ic-format') ? document.getElementById('ic-format').value : 'image/jpeg';
  }

  // Draw on Canvas with smooth scaling
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  } else {
    ctx.clearRect(0, 0, targetW, targetH);
  }

  ctx.drawImage(_icImg, 0, 0, targetW, targetH);

  function getBlob(q) {
    return new Promise(resolve => {
      canvas.toBlob(resolve, format, format === 'image/png' ? undefined : q);
    });
  }

  let finalBlob;

  if (_icMode === 'govt' || _icMode === 'target') {
    // Binary search for ideal target file size
    let minQ = 0.05, maxQ = 0.98;
    let bestBlob = await getBlob(0.8);
    const targetCap = targetMaxKb || 50;

    for (let iter = 0; iter < 7; iter++) {
      const midQ = (minQ + maxQ) / 2;
      const b = await getBlob(midQ);
      if (!b) break;
      const kb = b.size / 1024;

      if (kb <= targetCap) {
        bestBlob = b;
        minQ = midQ; // try to get highest quality within cap
      } else {
        maxQ = midQ;
      }
    }
    finalBlob = bestBlob;
  } else {
    const qualityEl = document.getElementById('ic-quality');
    const quality = parseInt(qualityEl ? qualityEl.value : 70, 10) / 100;
    finalBlob = await getBlob(quality);
  }

  if (!finalBlob) return;
  _icCompBlob = finalBlob;

  const url = URL.createObjectURL(finalBlob);
  const compImg = document.getElementById('ic-comp-img');
  if (compImg._prevUrl) URL.revokeObjectURL(compImg._prevUrl);
  compImg._prevUrl = url;
  compImg.src = url;

  const finalKb = (finalBlob.size / 1024).toFixed(1);
  const savings = ((_icOrigFile.size - finalBlob.size) / _icOrigFile.size * 100);
  const isSmaller = savings > 0;

  document.getElementById('ic-comp-info').innerHTML =
    `<strong>${targetW} × ${targetH}px</strong> — <strong>${finalKb} KB</strong>
     <span class="img-savings ${isSmaller ? 'positive' : 'negative'}">
       ${isSmaller ? '↓ ' + savings.toFixed(1) + '% smaller' : '↑ ' + Math.abs(savings).toFixed(1) + '% larger'}
     </span>`;

  // Portal Compliance Banner
  const compBanner = document.getElementById('ic-compliance-banner');
  if (compBanner) {
    if (_icMode === 'govt' && _icCurrentPreset) {
      const kbNum = finalBlob.size / 1024;
      const isCompliant = kbNum >= _icCurrentPreset.minKb && kbNum <= _icCurrentPreset.maxKb;
      compBanner.className = `ic-compliance-banner ${isCompliant ? 'success' : 'warn'}`;
      compBanner.innerHTML = isCompliant
        ? `✅ <strong>Portal Ready:</strong> ${finalKb} KB satisfies official ${_icCurrentPreset.portal} requirements (${_icCurrentPreset.minKb}–${_icCurrentPreset.maxKb} KB • ${targetW}×${targetH}px)`
        : `⚠️ <strong>Notice:</strong> Output is ${finalKb} KB (Official portal range: ${_icCurrentPreset.minKb}–${_icCurrentPreset.maxKb} KB).`;
      compBanner.classList.remove('hidden');
    } else if (_icMode === 'target') {
      const kbNum = finalBlob.size / 1024;
      const isUnder = kbNum <= (targetMaxKb || 50);
      compBanner.className = `ic-compliance-banner ${isUnder ? 'pass' : 'warn'}`;
      compBanner.innerHTML = `🎯 <strong>Target Check:</strong> Output is ${finalKb} KB (Target: ≤ ${targetMaxKb} KB)`;
      compBanner.classList.remove('hidden');
    } else {
      compBanner.classList.add('hidden');
    }
  }

  // Set smart download filename
  const origName = _icOrigFile ? _icOrigFile.name.replace(/\.[^.]+$/, '') : 'image';
  if (_icMode === 'govt' && _icCurrentPreset) {
    _icCompFilename = `${_icCurrentPreset.defaultFilename}_${finalKb}KB.jpg`;
  } else if (_icMode === 'target') {
    _icCompFilename = `${origName}_${finalKb}KB.jpg`;
  } else {
    let ext = 'jpg';
    if (format === 'image/png') ext = 'png';
    if (format === 'image/webp') ext = 'webp';
    _icCompFilename = `${origName}-compressed.${ext}`;
  }

  const downloadBtn = document.getElementById('ic-download-btn');
  if (downloadBtn) {
    downloadBtn.style.display = 'block';
    downloadBtn.textContent = `⬇ Download Compressed Image (${finalKb} KB)`;
  }
}

function icDownload() {
  if (!_icCompBlob) return;
  const a = document.createElement('a');
  const url = URL.createObjectURL(_icCompBlob);
  a.href = url;
  a.download = _icCompFilename || 'compressed-image.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('✓ Image downloaded!');
}

function icReset() {
  if (_icCompBlob) _icCompBlob = null;
  const compImg = document.getElementById('ic-comp-img');
  if (compImg && compImg._prevUrl) URL.revokeObjectURL(compImg._prevUrl);
  _icImg = null;
  _icOrigFile = null;
  const dropZone = document.getElementById('ic-drop');
  if (dropZone) dropZone.classList.remove('hidden');
  const prevWrap = document.getElementById('ic-preview-wrap');
  if (prevWrap) prevWrap.classList.add('hidden');
  const fileInp = document.getElementById('ic-file');
  if (fileInp) fileInp.value = '';
}


/* ─────────────────────────────────────────
   Tool 1: PDF Merger Functions
───────────────────────────────────────── */
let _pmFiles = [];
let _pmMergedBlob = null;

function pmHandleDrop(e) {
  e.preventDefault();
  document.getElementById('pm-drop').classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    pmAddFiles(e.dataTransfer.files);
  }
}

function pmAddFiles(fileList) {
  if (!fileList || !fileList.length) return;
  let added = 0;
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if (f.type === 'application/pdf' || (f.name && f.name.toLowerCase().endsWith('.pdf'))) {
      if (f.size > 50 * 1024 * 1024) {
        showToast(`⚠️ ${f.name} exceeds max 50MB limit.`);
        continue;
      }
      _pmFiles.push(f);
      added++;
    } else {
      showToast(`⚠️ Skipping "${f.name}": Only PDF files are supported.`);
    }
  }
  if (_pmFiles.length > 0) {
    document.getElementById('pm-drop').classList.add('hidden');
    document.getElementById('pm-controls').classList.remove('hidden');
    pmRenderQueue();
  }
  document.getElementById('pm-file').value = '';
}

function pmRenderQueue() {
  const container = document.getElementById('pm-queue');
  const countEl = document.getElementById('pm-count');
  countEl.textContent = _pmFiles.length;

  if (_pmFiles.length === 0) {
    pmReset();
    return;
  }

  container.innerHTML = _pmFiles.map((file, idx) => `
    <div class="file-item" data-idx="${idx}">
      <div class="file-item-left">
        <span class="file-item-num">${idx + 1}</span>
        <div class="file-item-info">
          <span class="file-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <span class="file-item-size">${fmtBytes(file.size)}</span>
        </div>
      </div>
      <div class="file-item-actions">
        <button class="btn-mini" type="button" onclick="pmMoveFile(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move up" aria-label="Move file up">▲</button>
        <button class="btn-mini" type="button" onclick="pmMoveFile(${idx}, 1)" ${idx === _pmFiles.length - 1 ? 'disabled' : ''} title="Move down" aria-label="Move file down">▼</button>
        <button class="btn-mini danger" type="button" onclick="pmRemoveFile(${idx})" title="Remove file" aria-label="Remove file">✕</button>
      </div>
    </div>
  `).join('');

  document.getElementById('pm-merge-btn').style.display = 'block';
  document.getElementById('pm-download-btn').style.display = 'none';
  const statusEl = document.getElementById('pm-status');
  statusEl.classList.add('hidden');
  statusEl.textContent = '';
}

function pmMoveFile(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= _pmFiles.length) return;
  const temp = _pmFiles[idx];
  _pmFiles[idx] = _pmFiles[target];
  _pmFiles[target] = temp;
  pmRenderQueue();
}

function pmRemoveFile(idx) {
  _pmFiles.splice(idx, 1);
  pmRenderQueue();
}

async function pmMerge() {
  if (_pmFiles.length < 2) {
    showToast('⚠️ Please upload at least 2 PDF files to merge.');
    return;
  }
  const btn = document.getElementById('pm-merge-btn');
  const statusEl = document.getElementById('pm-status');
  btn.disabled = true;
  btn.textContent = '⏳ Merging PDFs in browser...';
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'Initializing PDF-Lib engine...';

  try {
    if (!window.PDFLib) {
      statusEl.textContent = 'Loading local PDF-Lib library...';
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'pdf-lib.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load PDF-Lib'));
        document.head.appendChild(s);
      });
    }

    const { PDFDocument } = window.PDFLib;
    const mergedDoc = await PDFDocument.create();

    for (let i = 0; i < _pmFiles.length; i++) {
      const file = _pmFiles[i];
      statusEl.textContent = `Processing file ${i + 1} of ${_pmFiles.length}: "${file.name}"...`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    statusEl.textContent = 'Generating final merged PDF...';
    const mergedBytes = await mergedDoc.save({ useObjectStreams: true });
    _pmMergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });

    btn.style.display = 'none';
    btn.disabled = false;
    btn.textContent = 'Merge PDFs';
    document.getElementById('pm-download-btn').style.display = 'block';
    statusEl.textContent = `✓ Successfully merged ${_pmFiles.length} files (${fmtBytes(_pmMergedBlob.size)})! Ready to download.`;
    showToast('✓ PDF merged successfully!');
  } catch (err) {
    console.error('PDF Merge Error:', err);
    btn.disabled = false;
    btn.textContent = 'Merge PDFs';
    statusEl.textContent = `⚠️ Error merging PDFs: ${err.message || 'Check if any PDF is password-protected.'}`;
    showToast('⚠️ Failed to merge PDFs.');
  }
}

function pmDownload() {
  if (!_pmMergedBlob) return;
  const a = document.createElement('a');
  const url = URL.createObjectURL(_pmMergedBlob);
  a.href = url;
  a.download = `merged-document-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('✓ Merged PDF downloaded!');
}

function pmReset() {
  _pmFiles = [];
  _pmMergedBlob = null;
  document.getElementById('pm-drop').classList.remove('hidden');
  document.getElementById('pm-controls').classList.add('hidden');
  document.getElementById('pm-file').value = '';
}

/* ─────────────────────────────────────────
   Tool 3: Photo & Signature Resizer
───────────────────────────────────────── */
let _prImg = null;
let _prOrigFile = null;
let _prLocked = false;
let _prMode = 'govt'; // 'govt' or 'custom'
let _prCurrentPreset = null;
let _prOutBlob = null;
let _prOutFilename = 'resized-photo.jpg';

function prSetMode(mode) {
  _prMode = mode;
  document.querySelectorAll('#modal [id^="pr-tab-"], #toolContent [id^="pr-tab-"]').forEach(t => {
    t.classList.remove('active', 'is-active');
    t.setAttribute('aria-selected', 'false');
  });
  const tab = document.getElementById(`pr-tab-${mode}`);
  if (tab) {
    tab.classList.add('active', 'is-active');
    tab.setAttribute('aria-selected', 'true');
  }
  const govtPanel = document.getElementById('pr-govt-panel');
  if (govtPanel) govtPanel.classList.toggle('hidden', mode !== 'govt');

  if (mode === 'govt') {
    prApplyGovtPreset();
  }
}

function prApplyGovtPreset() {
  const examEl = document.getElementById('pr-exam-select');
  const typeEl = document.getElementById('pr-type-select');
  if (!examEl || !typeEl) return;

  const preset = getGovtPreset(examEl.value, typeEl.value);
  _prCurrentPreset = preset;

  const badge = document.getElementById('pr-guide-badge');
  const specs = document.getElementById('pr-guide-specs');
  const wInput = document.getElementById('pr-w');
  const hInput = document.getElementById('pr-h');
  const kbInput = document.getElementById('pr-max-kb');
  const fmtSelect = document.getElementById('pr-format');

  if (badge) badge.textContent = `${preset.portal} • ${preset.name}`;
  if (specs) {
    let html = `
      <span class="ic-spec-chip">📦 ${preset.minKb} KB – ${preset.maxKb} KB</span>
      <span class="ic-spec-chip">📏 ${preset.w} × ${preset.h} px</span>
      <span class="ic-spec-chip">📄 JPG</span>
    `;
    if (preset.note) {
      html += `<div style="margin-top:8px; font-size:12px; color:var(--text); background:var(--surface); padding:6px 10px; border-radius:6px; border:1px solid var(--line); line-height:1.4;">📌 <strong>Official Guideline:</strong> ${preset.note}</div>`;
    }
    specs.innerHTML = html;
  }
  if (wInput) wInput.value = preset.w;
  if (hInput) hInput.value = preset.h;
  if (kbInput) kbInput.value = preset.maxKb;
  if (fmtSelect) fmtSelect.value = 'image/jpeg';

  _prLocked = false;
  const lockBtn = document.getElementById('pr-lock-btn');
  if (lockBtn) lockBtn.textContent = '🔓';

  if (_prImg) {
    prResize();
  }
}

function prHandleDrop(e) {
  e.preventDefault();
  const dropZone = document.getElementById('pr-drop');
  if (dropZone) dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Please upload an image file (JPG, PNG, WebP).');
    return;
  }
  prLoadFile(file);
}

function prLoadFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Please select a valid photo or signature image.');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showToast(`⚠️ File too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).`);
    return;
  }
  _prOrigFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      _prImg = img;
      const dropZone = document.getElementById('pr-drop');
      const controls = document.getElementById('pr-controls');
      const origInfo = document.getElementById('pr-orig-info');

      if (dropZone) dropZone.classList.add('hidden');
      if (controls) controls.classList.remove('hidden');
      if (origInfo) {
        origInfo.innerHTML = `<strong>${escapeHtml(file.name)}</strong>: ${img.naturalWidth} × ${img.naturalHeight}px (${fmtBytes(file.size)})`;
      }

      if (_prMode === 'govt') {
        prApplyGovtPreset();
      } else {
        const wInp = document.getElementById('pr-w');
        const hInp = document.getElementById('pr-h');
        if (wInp) wInp.value = img.naturalWidth;
        if (hInp) hInp.value = img.naturalHeight;
        prResize();
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function prToggleLock() {
  _prLocked = !_prLocked;
  const btn = document.getElementById('pr-lock-btn');
  if (btn) {
    btn.textContent = _prLocked ? '🔒' : '🔓';
    btn.title = _prLocked ? 'Lock aspect ratio' : 'Unlock aspect ratio';
  }
}

function prSyncDim(changed) {
  if (!_prLocked || !_prImg) return;
  const aspect = _prImg.naturalWidth / _prImg.naturalHeight;
  if (changed === 'w') {
    const w = parseFloat(document.getElementById('pr-w').value);
    if (!isNaN(w) && w > 0) document.getElementById('pr-h').value = Math.round(w / aspect);
  } else {
    const h = parseFloat(document.getElementById('pr-h').value);
    if (!isNaN(h) && h > 0) document.getElementById('pr-w').value = Math.round(h * aspect);
  }
}

async function prResize() {
  if (!_prImg) {
    showToast('⚠️ Please upload an image first.');
    return;
  }
  const w = parseInt(document.getElementById('pr-w').value, 10);
  const h = parseInt(document.getElementById('pr-h').value, 10);
  if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
    showToast('⚠️ Please enter valid positive width and height.');
    return;
  }

  const targetKb = parseFloat(document.getElementById('pr-max-kb').value);
  const format = document.getElementById('pr-format') ? document.getElementById('pr-format').value : 'image/jpeg';

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }
  ctx.drawImage(_prImg, 0, 0, w, h);

  function getBlob(q) {
    return new Promise(resolve => {
      canvas.toBlob(resolve, format, format === 'image/png' ? undefined : q);
    });
  }

  let finalBlob;
  if (!isNaN(targetKb) && targetKb > 0 && format === 'image/jpeg') {
    let minQ = 0.05, maxQ = 0.98;
    let bestBlob = await getBlob(minQ);
    for (let iter = 0; iter < 7; iter++) {
      const midQ = (minQ + maxQ) / 2;
      const b = await getBlob(midQ);
      if (!b) break;
      if (b.size / 1024 <= targetKb) {
        bestBlob = b;
        minQ = midQ;
      } else {
        maxQ = midQ;
      }
    }
    finalBlob = bestBlob;
  } else {
    finalBlob = await getBlob(0.92);
  }

  if (!finalBlob) return;
  _prOutBlob = finalBlob;
  const url = URL.createObjectURL(finalBlob);
  const outImg = document.getElementById('pr-out-img');
  if (outImg._prevUrl) URL.revokeObjectURL(outImg._prevUrl);
  outImg._prevUrl = url;
  outImg.src = url;

  const finalKb = (finalBlob.size / 1024).toFixed(1);
  const infoEl = document.getElementById('pr-out-info');
  if (infoEl) {
    infoEl.innerHTML = `<strong>${w} × ${h}px</strong> — <strong>${finalKb} KB</strong> (${finalBlob.size.toLocaleString()} bytes)`;
  }

  // Compliance Banner
  const compBanner = document.getElementById('pr-compliance-banner');
  if (compBanner) {
    if (_prMode === 'govt' && _prCurrentPreset) {
      const kbNum = finalBlob.size / 1024;
      const isCompliant = kbNum >= _prCurrentPreset.minKb && kbNum <= _prCurrentPreset.maxKb;
      compBanner.className = `ic-compliance-banner ${isCompliant ? 'success' : 'warn'}`;
      compBanner.innerHTML = isCompliant
        ? `✅ <strong>Portal Ready:</strong> ${finalKb} KB satisfies official ${_prCurrentPreset.portal} requirements (${_prCurrentPreset.minKb}–${_prCurrentPreset.maxKb} KB • ${w}×${h}px)`
        : `⚠️ <strong>Notice:</strong> Output is ${finalKb} KB (Official portal range: ${_prCurrentPreset.minKb}–${_prCurrentPreset.maxKb} KB).`;
      compBanner.classList.remove('hidden');
    } else {
      compBanner.classList.add('hidden');
    }
  }

  // Smart Filename
  const origName = _prOrigFile ? _prOrigFile.name.replace(/\.[^.]+$/, '') : 'photo';
  if (_prMode === 'govt' && _prCurrentPreset) {
    _prOutFilename = `${_prCurrentPreset.defaultFilename}_${finalKb}KB.jpg`;
  } else {
    const ext = format === 'image/png' ? 'png' : 'jpg';
    _prOutFilename = `${origName}-${w}x${h}.${ext}`;
  }

  const downloadBtn = document.getElementById('pr-download-btn');
  if (downloadBtn) {
    downloadBtn.textContent = `⬇ Download ${_prOutFilename}`;
  }

  document.getElementById('pr-preview-wrap').classList.remove('hidden');
  showToast('✓ Resized photo/signature generated!');
}

function prDownload() {
  if (!_prOutBlob) return;
  const a = document.createElement('a');
  const url = URL.createObjectURL(_prOutBlob);
  a.href = url;
  a.download = _prOutFilename || 'resized-photo.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('✓ Download complete!');
}

function prReset() {
  _prImg = null;
  _prOrigFile = null;
  _prOutBlob = null;
  const outImg = document.getElementById('pr-out-img');
  if (outImg && outImg._prevUrl) URL.revokeObjectURL(outImg._prevUrl);
  const dropZone = document.getElementById('pr-drop');
  const controls = document.getElementById('pr-controls');
  const fileInp = document.getElementById('pr-file');
  if (dropZone) dropZone.classList.remove('hidden');
  if (controls) controls.classList.add('hidden');
  if (fileInp) fileInp.value = '';
}

/* ─────────────────────────────────────────
   Tool 2: Image Resizer Implementation
───────────────────────────────────────── */
let _irImg = null;
let _irOrigFile = null;
let _irLocked = true;
let _irMode = 'govt'; // 'govt', 'px', 'pct'
let _irCurrentPreset = null;
let _irOutBlob = null;
let _irOutFilename = 'resized-image.jpg';

function irSwitchMode(mode) {
  _irMode = mode;
  document.querySelectorAll('#modal [id^="ir-tab-"], #toolContent [id^="ir-tab-"]').forEach(t => {
    t.classList.remove('active', 'is-active');
    t.setAttribute('aria-selected', 'false');
  });
  const tab = document.getElementById(`ir-tab-${mode}`);
  if (tab) {
    tab.classList.add('active', 'is-active');
    tab.setAttribute('aria-selected', 'true');
  }

  const govtPanel = document.getElementById('ir-govt-panel');
  const dimWrap = document.getElementById('ir-dim-wrap');
  const pctMode = document.getElementById('ir-pct-mode');

  if (govtPanel) govtPanel.classList.toggle('hidden', mode !== 'govt');
  if (dimWrap) dimWrap.classList.toggle('hidden', mode === 'pct');
  if (pctMode) pctMode.classList.toggle('hidden', mode !== 'pct');

  if (mode === 'govt') {
    irApplyGovtPreset();
  } else if (_irImg) {
    if (mode === 'pct') {
      irSyncPct();
    } else {
      irResize();
    }
  }
}

function irApplyGovtPreset() {
  const examEl = document.getElementById('ir-exam-select');
  const typeEl = document.getElementById('ir-type-select');
  if (!examEl || !typeEl) return;

  const preset = getGovtPreset(examEl.value, typeEl.value);
  _irCurrentPreset = preset;

  const badge = document.getElementById('ir-guide-badge');
  const specs = document.getElementById('ir-guide-specs');
  const wInput = document.getElementById('ir-w');
  const hInput = document.getElementById('ir-h');
  const kbInput = document.getElementById('ir-max-kb');
  const fmtSelect = document.getElementById('ir-format');

  if (badge) badge.textContent = `${preset.portal} • ${preset.name}`;
  if (specs) {
    let html = `
      <span class="ic-spec-chip">📏 ${preset.w} × ${preset.h} px</span>
      <span class="ic-spec-chip">📦 ${preset.minKb} KB – ${preset.maxKb} KB</span>
      <span class="ic-spec-chip">📄 JPG</span>
    `;
    if (preset.note) {
      html += `<div style="margin-top:8px; font-size:12px; color:var(--text); background:var(--surface); padding:6px 10px; border-radius:6px; border:1px solid var(--line); line-height:1.4;">📌 <strong>Official Guideline:</strong> ${preset.note}</div>`;
    }
    specs.innerHTML = html;
  }
  if (wInput) wInput.value = preset.w;
  if (hInput) hInput.value = preset.h;
  if (kbInput) kbInput.value = preset.maxKb;
  if (fmtSelect) fmtSelect.value = 'image/jpeg';

  _irLocked = false;
  const lockBtn = document.getElementById('ir-lock-btn');
  if (lockBtn) lockBtn.textContent = '🔓';

  if (_irImg) {
    irResize();
  }
}

function irHandleDrop(e) {
  e.preventDefault();
  const dropZone = document.getElementById('ir-drop');
  if (dropZone) dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Please upload an image file (JPG, PNG, WebP).');
    return;
  }
  irLoadFile(file);
}

function irLoadFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Please select a valid image file.');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showToast(`⚠️ File too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).`);
    return;
  }
  _irOrigFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      _irImg = img;
      const dropZone = document.getElementById('ir-drop');
      const controls = document.getElementById('ir-controls');
      const origInfo = document.getElementById('ir-orig-info');
      const origInfo2 = document.getElementById('ir-orig-info2');
      const origImg = document.getElementById('ir-orig-img');

      if (dropZone) dropZone.classList.add('hidden');
      if (controls) controls.classList.remove('hidden');
      if (origInfo) {
        origInfo.innerHTML = `<strong>${escapeHtml(file.name)}</strong>: ${img.naturalWidth} × ${img.naturalHeight}px (${fmtBytes(file.size)})`;
      }
      if (origInfo2) {
        origInfo2.textContent = `${img.naturalWidth} × ${img.naturalHeight}px (${fmtBytes(file.size)})`;
      }
      if (origImg) origImg.src = e.target.result;

      if (_irMode === 'govt') {
        irApplyGovtPreset();
      } else {
        const wInp = document.getElementById('ir-w');
        const hInp = document.getElementById('ir-h');
        if (wInp) wInp.value = img.naturalWidth;
        if (hInp) hInp.value = img.naturalHeight;
        irResize();
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function irToggleLock() {
  _irLocked = !_irLocked;
  const btn = document.getElementById('ir-lock-btn');
  if (btn) {
    btn.textContent = _irLocked ? '🔒' : '🔓';
    btn.title = _irLocked ? 'Lock aspect ratio' : 'Unlock aspect ratio';
  }
}

function irSyncDim(changed) {
  if (!_irLocked || !_irImg) return;
  const aspect = _irImg.naturalWidth / _irImg.naturalHeight;
  if (changed === 'w') {
    const w = parseFloat(document.getElementById('ir-w').value);
    if (!isNaN(w) && w > 0) document.getElementById('ir-h').value = Math.round(w / aspect);
  } else {
    const h = parseFloat(document.getElementById('ir-h').value);
    if (!isNaN(h) && h > 0) document.getElementById('ir-w').value = Math.round(h * aspect);
  }
}

function irSyncPct() {
  if (!_irImg) return;
  const pct = parseFloat(document.getElementById('ir-pct').value) || 100;
  const w = Math.round(_irImg.naturalWidth * (pct / 100));
  const h = Math.round(_irImg.naturalHeight * (pct / 100));
  const wInp = document.getElementById('ir-w');
  const hInp = document.getElementById('ir-h');
  if (wInp) wInp.value = Math.max(1, w);
  if (hInp) hInp.value = Math.max(1, h);
  irResize();
}

async function irResize() {
  if (!_irImg) return;
  const w = parseInt(document.getElementById('ir-w').value, 10);
  const h = parseInt(document.getElementById('ir-h').value, 10);
  if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
    showToast('⚠️ Please enter valid positive width and height.');
    return;
  }

  const targetKb = parseFloat(document.getElementById('ir-max-kb').value);
  const format = document.getElementById('ir-format') ? document.getElementById('ir-format').value : 'image/jpeg';

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }
  ctx.drawImage(_irImg, 0, 0, w, h);

  function getBlob(q) {
    return new Promise(resolve => {
      canvas.toBlob(resolve, format, format === 'image/png' ? undefined : q);
    });
  }

  let finalBlob;
  if (!isNaN(targetKb) && targetKb > 0 && format === 'image/jpeg') {
    let minQ = 0.05, maxQ = 0.98;
    let bestBlob = await getBlob(minQ);
    for (let iter = 0; iter < 7; iter++) {
      const midQ = (minQ + maxQ) / 2;
      const b = await getBlob(midQ);
      if (!b) break;
      if (b.size / 1024 <= targetKb) {
        bestBlob = b;
        minQ = midQ;
      } else {
        maxQ = midQ;
      }
    }
    finalBlob = bestBlob;
  } else {
    finalBlob = await getBlob(0.92);
  }

  if (!finalBlob) return;
  _irOutBlob = finalBlob;
  const url = URL.createObjectURL(finalBlob);
  const outImg = document.getElementById('ir-out-img');
  if (outImg._prevUrl) URL.revokeObjectURL(outImg._prevUrl);
  outImg._prevUrl = url;
  outImg.src = url;

  const finalKb = (finalBlob.size / 1024).toFixed(1);
  const outInfo = document.getElementById('ir-out-info');
  if (outInfo) {
    outInfo.innerHTML = `<strong>${w} × ${h}px</strong> — <strong>${finalKb} KB</strong>`;
  }

  // Compliance Banner
  const compBanner = document.getElementById('ir-compliance-banner');
  if (compBanner) {
    if (_irMode === 'govt' && _irCurrentPreset) {
      const kbNum = finalBlob.size / 1024;
      const isCompliant = kbNum >= _irCurrentPreset.minKb && kbNum <= _irCurrentPreset.maxKb;
      compBanner.className = `ic-compliance-banner ${isCompliant ? 'success' : 'warn'}`;
      compBanner.innerHTML = isCompliant
        ? `✅ <strong>Portal Ready:</strong> ${finalKb} KB satisfies official ${_irCurrentPreset.portal} requirements (${_irCurrentPreset.minKb}–${_irCurrentPreset.maxKb} KB • ${w}×${h}px)`
        : `⚠️ <strong>Notice:</strong> Output is ${finalKb} KB (Official portal range: ${_irCurrentPreset.minKb}–${_irCurrentPreset.maxKb} KB).`;
      compBanner.classList.remove('hidden');
    } else {
      compBanner.classList.add('hidden');
    }
  }

  // Smart Filename
  const origName = _irOrigFile ? _irOrigFile.name.replace(/\.[^.]+$/, '') : 'resized-image';
  if (_irMode === 'govt' && _irCurrentPreset) {
    _irOutFilename = `${_irCurrentPreset.defaultFilename}_${w}x${h}_${finalKb}KB.jpg`;
  } else {
    let ext = 'jpg';
    if (format === 'image/png') ext = 'png';
    if (format === 'image/webp') ext = 'webp';
    _irOutFilename = `${origName}-${w}x${h}.${ext}`;
  }

  const downloadBtn = document.getElementById('ir-download-btn');
  if (downloadBtn) {
    downloadBtn.textContent = `⬇ Download ${_irOutFilename}`;
  }

  const previewWrap = document.getElementById('ir-preview-wrap');
  if (previewWrap) previewWrap.classList.remove('hidden');
}

function irDownload() {
  if (!_irOutBlob) return;
  const a = document.createElement('a');
  const url = URL.createObjectURL(_irOutBlob);
  a.href = url;
  a.download = _irOutFilename || 'resized-image.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('✓ Resized image downloaded!');
}

function irReset() {
  _irImg = null;
  _irOrigFile = null;
  _irOutBlob = null;
  const outImg = document.getElementById('ir-out-img');
  if (outImg && outImg._prevUrl) URL.revokeObjectURL(outImg._prevUrl);
  const dropZone = document.getElementById('ir-drop');
  const controls = document.getElementById('ir-controls');
  const fileInp = document.getElementById('ir-file');
  if (dropZone) dropZone.classList.remove('hidden');
  if (controls) controls.classList.add('hidden');
  if (fileInp) fileInp.value = '';
}

/* ─────────────────────────────────────────
   Tool 4: Multi-Image to PDF Converter
───────────────────────────────────────── */
let _i2pFiles = [];
let _i2pCustomFilename = 'converted-document.pdf';

function i2pApplyPreset(type) {
  const sizeSelect = document.getElementById('i2p-page-size');
  const orientSelect = document.getElementById('i2p-orientation');
  const marginSelect = document.getElementById('i2p-margin');

  if (type === 'neet_jee') {
    if (sizeSelect) sizeSelect.value = 'a4';
    if (orientSelect) orientSelect.value = 'p';
    if (marginSelect) marginSelect.value = '5';
    _i2pCustomFilename = 'NEET_JEE_Document.pdf';
    showToast('Applied NTA NEET & JEE Marksheet Preset (A4 Portrait, 5mm margins, target <300 KB)');
  } else if (type === 'ssc') {
    if (sizeSelect) sizeSelect.value = 'a4';
    if (orientSelect) orientSelect.value = 'p';
    if (marginSelect) marginSelect.value = '12';
    _i2pCustomFilename = 'SSC_Document.pdf';
    showToast('Applied SSC / State PSC Document Preset (A4 Portrait, 12mm margins)');
  } else if (type === 'rrb') {
    if (sizeSelect) sizeSelect.value = 'a4';
    if (orientSelect) orientSelect.value = 'p';
    if (marginSelect) marginSelect.value = '5';
    _i2pCustomFilename = 'RRB_Travel_Pass.pdf';
    showToast('Applied RRB Railway Travel Pass Preset (A4 Portrait, target <500 KB)');
  } else if (type === 'upsc') {
    if (sizeSelect) sizeSelect.value = 'a4';
    if (orientSelect) orientSelect.value = 'p';
    if (marginSelect) marginSelect.value = '5';
    _i2pCustomFilename = 'UPSC_Certificate.pdf';
    showToast('Applied UPSC Certificate Preset (A4 Portrait, 5mm margins, target <300 KB)');
  } else if (type === 'gate_cat') {
    if (sizeSelect) sizeSelect.value = 'a4';
    if (orientSelect) orientSelect.value = 'p';
    if (marginSelect) marginSelect.value = '5';
    _i2pCustomFilename = 'GATE_CAT_Certificate.pdf';
    showToast('Applied GATE & CAT Certificate Preset (A4 Portrait, 5mm margins)');
  } else if (type === 'idcard') {
    if (sizeSelect) sizeSelect.value = 'fit';
    if (orientSelect) orientSelect.value = 'auto';
    if (marginSelect) marginSelect.value = '0';
    _i2pCustomFilename = 'ID_Card_Document.pdf';
    showToast('Applied ID Card / Marksheet Fit Preset');
  } else if (type === 'fullbleed') {
    if (sizeSelect) sizeSelect.value = 'a4';
    if (orientSelect) orientSelect.value = 'p';
    if (marginSelect) marginSelect.value = '0';
    _i2pCustomFilename = 'Document_FullBleed.pdf';
    showToast('Applied Full Bleed Preset (No Margins)');
  }
}

function i2pHandleDrop(e) {
  e.preventDefault();
  document.getElementById('i2p-drop').classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    i2pAddFiles(e.dataTransfer.files);
  }
}

function i2pAddFiles(fileList) {
  if (!fileList || !fileList.length) return;
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if (f.type.startsWith('image/')) {
      _i2pFiles.push({ file: f, url: URL.createObjectURL(f) });
    } else {
      showToast(`Skipped non-image file "${f.name}".`);
    }
  }
  if (_i2pFiles.length > 0) {
    document.getElementById('i2p-drop').classList.add('hidden');
    document.getElementById('i2p-controls').classList.remove('hidden');
    i2pRenderQueue();
  }
  document.getElementById('i2p-file').value = '';
}

function i2pRenderQueue() {
  const container = document.getElementById('i2p-queue');
  document.getElementById('i2p-count').textContent = _i2pFiles.length;

  if (_i2pFiles.length === 0) {
    i2pReset();
    return;
  }

  container.innerHTML = _i2pFiles.map((item, idx) => `
    <div class="file-item">
      <div class="file-item-left">
        <span class="file-item-num">${idx + 1}</span>
        <img src="${item.url}" alt="" style="width:32px; height:32px; object-fit:cover; border-radius:4px; border:1px solid var(--line);" />
        <div class="file-item-info">
          <span class="file-item-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span>
          <span class="file-item-size">${fmtBytes(item.file.size)}</span>
        </div>
      </div>
      <div class="file-item-actions">
        <button class="btn-mini" type="button" onclick="i2pMove(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move up" aria-label="Move page up">▲</button>
        <button class="btn-mini" type="button" onclick="i2pMove(${idx}, 1)" ${idx === _i2pFiles.length - 1 ? 'disabled' : ''} title="Move down" aria-label="Move page down">▼</button>
        <button class="btn-mini danger" type="button" onclick="i2pRemove(${idx})" title="Remove page" aria-label="Remove page">✕</button>
      </div>
    </div>
  `).join('');
}

function i2pMove(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= _i2pFiles.length) return;
  const temp = _i2pFiles[idx];
  _i2pFiles[idx] = _i2pFiles[target];
  _i2pFiles[target] = temp;
  i2pRenderQueue();
}

function i2pRemove(idx) {
  URL.revokeObjectURL(_i2pFiles[idx].url);
  _i2pFiles.splice(idx, 1);
  i2pRenderQueue();
}

async function i2pConvert() {
  if (!_i2pFiles.length) {
    showToast('Please upload at least one image.');
    return;
  }
  const btn = document.getElementById('i2p-download-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating PDF...';

  try {
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const { jsPDF } = window.jspdf;
    const pageSizeOpt = document.getElementById('i2p-page-size').value; // 'a4', 'letter', 'fit'
    const orientOpt = document.getElementById('i2p-orientation').value;  // 'auto', 'p', 'l'
    const marginMm = parseFloat(document.getElementById('i2p-margin').value) || 0;

    let doc = null;

    for (let i = 0; i < _i2pFiles.length; i++) {
      const item = _i2pFiles[i];
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = item.url;
      });

      const imgAspect = img.naturalWidth / img.naturalHeight;
      let pageW, pageH, orient;

      if (pageSizeOpt === 'fit') {
        // Convert px to mm at ~72dpi
        pageW = Math.max(50, img.naturalWidth * 0.264583 + marginMm * 2);
        pageH = Math.max(50, img.naturalHeight * 0.264583 + marginMm * 2);
        orient = pageW >= pageH ? 'l' : 'p';
      } else {
        const baseDims = pageSizeOpt === 'letter' ? [215.9, 279.4] : [210, 297]; // [W, H]
        if (orientOpt === 'auto') {
          orient = imgAspect > 1 ? 'l' : 'p';
        } else {
          orient = orientOpt;
        }
        pageW = orient === 'l' ? baseDims[1] : baseDims[0];
        pageH = orient === 'l' ? baseDims[0] : baseDims[1];
      }

      if (i === 0) {
        doc = new jsPDF({
          orientation: orient,
          unit: 'mm',
          format: pageSizeOpt === 'fit' ? [pageW, pageH] : (pageSizeOpt === 'letter' ? 'letter' : 'a4')
        });
      } else {
        doc.addPage(pageSizeOpt === 'fit' ? [pageW, pageH] : (pageSizeOpt === 'letter' ? 'letter' : 'a4'), orient);
      }

      // Calculate fit inside page margins
      const availW = Math.max(10, pageW - marginMm * 2);
      const availH = Math.max(10, pageH - marginMm * 2);
      let renderW = availW;
      let renderH = availH;
               
      if (imgAspect > (availW / availH)) {
        renderH = renderW / imgAspect;
      } else {
        renderW = renderH * imgAspect;
      }

      const x = marginMm + (availW - renderW) / 2;
      const y = marginMm + (availH - renderH) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      doc.addImage(imgData, 'JPEG', x, y, renderW, renderH);
    }

    doc.save(_i2pCustomFilename || `document-${Date.now()}.pdf`);
    showToast('✓ PDF converted & downloaded!');
  } catch (err) {
    console.error('Image to PDF error:', err);
    showToast('⚠️ Error creating PDF: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Convert & Download PDF';
  }
}

function i2pReset() {
  _i2pFiles.forEach(item => URL.revokeObjectURL(item.url));
  _i2pFiles = [];
  document.getElementById('i2p-drop').classList.remove('hidden');
  document.getElementById('i2p-controls').classList.add('hidden');
  document.getElementById('i2p-file').value = '';
}

/* ─────────────────────────────────────────
   Tool 5: QR Code Generator
───────────────────────────────────────── */
let _qrType = 'url';
let _qrCodeInstance = null;

function qrSwitchType(type) {
  _qrType = type;
  ['url', 'text', 'wifi', 'email'].forEach(t => {
    document.getElementById(`qr-input-${t}`).classList.toggle('hidden', t !== type);
    const tab = document.getElementById(`qr-tab-${t}`);
    if (tab) tab.classList.toggle('active', t === type);
  });
  qrGenerate();
}

function qrGetPayload() {
  if (_qrType === 'url') {
    return document.getElementById('qr-url').value.trim();
  }
  if (_qrType === 'text') {
    return document.getElementById('qr-text').value.trim();
  }
  if (_qrType === 'wifi') {
    const ssid = document.getElementById('qr-wifi-ssid').value.trim();
    const pass = document.getElementById('qr-wifi-pass').value.trim();
    const auth = document.getElementById('qr-wifi-auth').value;
    if (!ssid) return '';
    return `WIFI:S:${ssid};T:${auth};P:${pass};;`;
  }
  if (_qrType === 'email') {
    const addr = document.getElementById('qr-email-addr').value.trim();
    const sub = document.getElementById('qr-email-sub').value.trim();
    const body = document.getElementById('qr-email-body').value.trim();
    if (!addr) return '';
    return `mailto:${addr}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
  }
  return '';
}

async function qrGenerate() {
  const container = document.getElementById('qr-output');
  if (!container) return;
  const payload = qrGetPayload();

  if (!payload) {
    container.innerHTML = '<span style="color:var(--muted); font-size:13px;">Please enter content above to generate QR code.</span>';
    return;
  }

  if (!window.QRCode) {
    container.innerHTML = '<span style="color:var(--muted); font-size:13px;">Loading QR generator library...</span>';
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'qrcode.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    } catch (_) {
      container.innerHTML = '<span style="color:var(--danger); font-size:13px;">Failed to load QR library.</span>';
      return;
    }
  }

  container.innerHTML = '';
  const size = parseInt(document.getElementById('qr-size').value, 10) || 240;
  const eclStr = document.getElementById('qr-ecl').value;
  const ecl = QRCode.CorrectLevel[eclStr] || QRCode.CorrectLevel.M;

  try {
    _qrCodeInstance = new QRCode(container, {
      text: payload,
      width: size,
      height: size,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: ecl,
      useSVG: false
    });
  } catch (err) {
    console.error('QR generation error:', err);
    container.innerHTML = `<span style="color:var(--danger); font-size:12px;">Data too long for this error-correction level. Try lowering error correction.</span>`;
  }
}

function qrDownload(format) {
  const container = document.getElementById('qr-output');
  if (!container) return;
  const canvas = container.querySelector('canvas');
  const img = container.querySelector('img');

  if (format === 'png') {
    let dataUrl;
    if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
    } else if (img && img.src) {
      dataUrl = img.src;
    }
    if (!dataUrl) {
      showToast('⚠️ No QR code available to download.');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('✓ QR code PNG downloaded!');
  } else if (format === 'svg') {
    // Generate clean SVG representation from canvas pixels
    if (!canvas) {
      showToast('⚠️ SVG export requires rendered canvas.');
      return;
    }
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height).data;

    let rects = '';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const a = imgData[i + 3];
        // Dark pixels
        if (a > 128 && (r + g + b) / 3 < 128) {
          rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="#0f172a"/>`;
        }
      }
    }

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast('✓ QR code SVG downloaded!');
  }
}

/* ─────────────────────────────────────────
   PDF Compressor Functions (Custom KB Adaptive Engine)
───────────────────────────────────────── */
let pcCurrentFile = null;
let pcCompressedBlob = null;
let pcOutputFileName = '';
let _pcTargetKb = 200;

function pcHandleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    pcLoadFile(e.dataTransfer.files[0]);
  }
}

function pcUpdateChipSelection(targetKb) {
  const chips = [100, 200, 300, 500, 1024];
  chips.forEach(val => {
    const chip = document.getElementById(`pc-chip-${val}`);
    if (chip) {
      if (val === targetKb) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    }
  });
}

function pcSetTarget(kb) {
  _pcTargetKb = parseInt(kb, 10);
  const input = document.getElementById('pc-target-kb');
  if (input) input.value = _pcTargetKb;
  pcUpdateChipSelection(_pcTargetKb);
  
  const compressBtn = document.getElementById('pc-compress-btn');
  if (compressBtn) {
    compressBtn.textContent = `🗜️ Compress PDF to <${_pcTargetKb} KB`;
  }
  
  showToast(`Target limit set to <${_pcTargetKb} KB`);
  if (pcCurrentFile && document.getElementById('pc-preview-wrap') && !document.getElementById('pc-preview-wrap').classList.contains('hidden')) {
    if (compressBtn) {
      compressBtn.style.display = 'block';
      compressBtn.disabled = false;
    }
    const dlBtn = document.getElementById('pc-download-btn');
    if (dlBtn) dlBtn.style.display = 'none';
  }
}

function pcOnCustomTargetChange() {
  const input = document.getElementById('pc-target-kb');
  if (!input) return;
  const val = parseInt(input.value, 10);
  if (!isNaN(val) && val > 0) {
    _pcTargetKb = val;
    pcUpdateChipSelection(_pcTargetKb);
    const compressBtn = document.getElementById('pc-compress-btn');
    if (compressBtn) {
      compressBtn.textContent = `🗜️ Compress PDF to <${_pcTargetKb} KB`;
      compressBtn.style.display = 'block';
      compressBtn.disabled = false;
    }
    const dlBtn = document.getElementById('pc-download-btn');
    if (dlBtn) dlBtn.style.display = 'none';
  }
}

function pcLoadFile(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return showError('Please select a valid PDF file.');
  }
  pcCurrentFile = file;
  pcCompressedBlob = null;
  pcOutputFileName = '';
  
  const input = document.getElementById('pc-target-kb');
  if (input) {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val > 0) _pcTargetKb = val;
  }
  if (!_pcTargetKb) _pcTargetKb = 200;
  
  document.getElementById('pc-drop').classList.add('hidden');
  const wrap = document.getElementById('pc-preview-wrap');
  wrap.classList.remove('hidden');
  
  const origKb = (file.size / 1024).toFixed(1);
  const origMb = (file.size / (1024*1024)).toFixed(2);
  const sizeText = file.size >= 1024 * 1024 ? `${origMb} MB (${origKb} KB)` : `${origKb} KB`;
  
  document.getElementById('pc-info').innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <div>
        <div style="font-weight:700; font-size:15px; color:var(--text);">${escapeHtml(file.name)}</div>
        <div style="font-size:13px; color:var(--muted); margin-top:2px;">Original Size: <strong>${sizeText}</strong></div>
      </div>
      <div style="font-size:12px; padding:4px 8px; border-radius:6px; background:var(--surface); border:1px solid var(--border);">
        Target: <strong>&lt;${_pcTargetKb} KB</strong>
      </div>
    </div>
  `;
  
  const statusEl = document.getElementById('pc-status');
  if (statusEl) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
  }
  
  const btn = document.getElementById('pc-compress-btn');
  btn.style.display = 'block';
  btn.textContent = `🗜️ Compress PDF to <${_pcTargetKb} KB`;
  btn.disabled = false;
  
  const dlBtn = document.getElementById('pc-download-btn');
  if (dlBtn) dlBtn.style.display = 'none';
  
  const res = document.getElementById('res');
  if (res) res.classList.add('hidden');
}

function pcReset() {
  pcCurrentFile = null;
  pcCompressedBlob = null;
  pcOutputFileName = '';
  document.getElementById('pc-drop').classList.remove('hidden');
  document.getElementById('pc-preview-wrap').classList.add('hidden');
  document.getElementById('pc-file').value = '';
  const statusEl = document.getElementById('pc-status');
  if (statusEl) {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
  }
}

async function ensurePdfLib() {
  if (window.PDFLib) return window.PDFLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'pdf-lib.min.js';
    s.onload = resolve;
    s.onerror = () => {
      const fb = document.createElement('script');
      fb.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
      fb.onload = resolve;
      fb.onerror = () => reject(new Error('Failed to load PDF engine'));
      document.head.appendChild(fb);
    };
    document.head.appendChild(s);
  });
  return window.PDFLib;
}

async function ensurePdfJs() {
  if (window.pdfjsLib) {
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.js', window.location.href).href;
    }
    return window.pdfjsLib;
  }
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'pdf.min.js';
    s.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.js', window.location.href).href;
      }
      resolve();
    };
    s.onerror = () => {
      const fb = document.createElement('script');
      fb.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      fb.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        resolve();
      };
      fb.onerror = () => reject(new Error('Failed to load PDF renderer'));
      document.head.appendChild(fb);
    };
    document.head.appendChild(s);
  });
  return window.pdfjsLib;
}

async function pcCompress() {
  if (!pcCurrentFile) return;
  const btn = document.getElementById('pc-compress-btn');
  const statusEl = document.getElementById('pc-status');
  btn.disabled = true;
  btn.textContent = '⏳ Processing... Please wait';
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = '<strong>Initializing engine...</strong> Analyzing document structure.';
  }

  try {
    const input = document.getElementById('pc-target-kb');
    let targetKb = _pcTargetKb || 200;
    if (input) {
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val > 0) targetKb = val;
    }
    const targetBytes = targetKb * 1024;
    const origSize = pcCurrentFile.size;

    await ensurePdfLib();
    const arrayBuffer = await pcCurrentFile.arrayBuffer();

    // Case 1: Original file is already <= targetBytes
    if (origSize <= targetBytes) {
      let useDocBytes = null;
      try {
        const testDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const savedBytes = await testDoc.save({ useObjectStreams: true });
        if (savedBytes.length < origSize) {
          useDocBytes = savedBytes;
        }
      } catch (e) {
        // preserve original
      }

      const finalBytes = useDocBytes || new Uint8Array(arrayBuffer);
      pcCompressedBlob = new Blob([finalBytes], { type: 'application/pdf' });
      pcDisplayResult(origSize, pcCompressedBlob.size, targetKb, 'original_compliant');
      return;
    }

    // Case 2: Fast structural stream compression (Preserve 100% crisp vector text & fonts)
    if (statusEl) statusEl.innerHTML = '<strong>Checking stream optimization...</strong>';
    try {
      const origDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const structBytes = await origDoc.save({ useObjectStreams: true });
      if (structBytes.length <= targetBytes) {
        pcCompressedBlob = new Blob([structBytes], { type: 'application/pdf' });
        pcDisplayResult(origSize, pcCompressedBlob.size, targetKb, 'lossless_stream');
        return;
      }
    } catch (e) {
      console.warn('Structural stream pass skipped or unapplicable:', e);
    }

    // Case 3: Adaptive Multi-Page Raster Re-compression (For Scanned marksheets, photos, large PDFs)
    if (statusEl) statusEl.innerHTML = '<strong>Scanned / heavy elements detected.</strong> Initializing PDF renderer...';
    await ensurePdfJs();

    const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfJsDoc = await loadingTask.promise;
    const numPages = pdfJsDoc.numPages;

    if (statusEl) {
      statusEl.innerHTML = `<strong>Document loaded:</strong> ${numPages} page(s). Calculating optimal resolution for &lt;${targetKb} KB...`;
    }

    // Overhead for PDF container in pdf-lib is ~3-8 KB
    const containerOverhead = Math.min(8000, Math.floor(targetBytes * 0.06));
    const imagePayloadBudget = Math.max(8000, targetBytes - containerOverhead);
    const perPageBudget = Math.floor(imagePayloadBudget / numPages);

    let initialScale = 1.35;
    if (perPageBudget < 35 * 1024) initialScale = 0.95;
    else if (perPageBudget < 70 * 1024) initialScale = 1.15;
    else if (perPageBudget > 200 * 1024) initialScale = 1.8;

    async function renderPage(pageNum, scale) {
      const page = await pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      return { canvas, widthPt: viewport.width / scale, heightPt: viewport.height / scale };
    }

    function canvasToJpegBytes(canvas, quality) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      const binaryStr = atob(base64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    }

    async function getBestPageImage(pageNum, budget) {
      let curScale = initialScale;
      let rendered = await renderPage(pageNum, curScale);

      let lowQ = 0.20;
      let highQ = 0.88;
      let bestBytes = null;
      let iterations = 0;

      while (iterations < 5) {
        iterations++;
        const testQ = (lowQ + highQ) / 2;
        const testBytes = canvasToJpegBytes(rendered.canvas, testQ);

        if (testBytes.length <= budget) {
          bestBytes = testBytes;
          lowQ = testQ + 0.05;
        } else {
          highQ = testQ - 0.05;
        }
      }

      if (!bestBytes || bestBytes.length > budget) {
        while (curScale > 0.40) {
          curScale *= 0.78;
          rendered = await renderPage(pageNum, curScale);
          const testBytes = canvasToJpegBytes(rendered.canvas, 0.40);
          if (testBytes.length <= budget || curScale <= 0.45) {
            bestBytes = testBytes;
            break;
          }
        }
      }

      if (!bestBytes) {
        bestBytes = canvasToJpegBytes(rendered.canvas, 0.25);
      }

      return {
        bytes: bestBytes,
        widthPt: rendered.widthPt,
        heightPt: rendered.heightPt
      };
    }

    const pageResults = [];
    for (let p = 1; p <= numPages; p++) {
      if (statusEl) {
        statusEl.innerHTML = `<strong>Optimizing page ${p} of ${numPages}...</strong> Fitting strictly under target budget.`;
      }
      const pageData = await getBestPageImage(p, perPageBudget);
      pageResults.push(pageData);
    }

    if (statusEl) {
      statusEl.innerHTML = `<strong>Assembling final PDF...</strong> Compiling ${numPages} page(s).`;
    }

    const newDoc = await PDFLib.PDFDocument.create();
    for (let i = 0; i < pageResults.length; i++) {
      const pData = pageResults[i];
      const embeddedImg = await newDoc.embedJpg(pData.bytes);
      const newPage = newDoc.addPage([pData.widthPt, pData.heightPt]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: pData.widthPt,
        height: pData.heightPt
      });
    }

    let finalPdfBytes = await newDoc.save({ useObjectStreams: true });

    // Safety fallback: if finalPdfBytes slightly exceeds targetBytes due to stream packaging
    if (finalPdfBytes.length > targetBytes && initialScale > 0.6) {
      if (statusEl) {
        statusEl.innerHTML = '<strong>Fine-tuning to guarantee under target limit...</strong>';
      }
      const tighterBudget = Math.floor(perPageBudget * (targetBytes / finalPdfBytes.length) * 0.92);
      const tighterPages = [];
      for (let p = 1; p <= numPages; p++) {
        const tighterData = await getBestPageImage(p, tighterBudget);
        tighterPages.push(tighterData);
      }
      const retryDoc = await PDFLib.PDFDocument.create();
      for (let i = 0; i < tighterPages.length; i++) {
        const pData = tighterPages[i];
        const embeddedImg = await retryDoc.embedJpg(pData.bytes);
        const newPage = retryDoc.addPage([pData.widthPt, pData.heightPt]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pData.widthPt,
          height: pData.heightPt
        });
      }
      finalPdfBytes = await retryDoc.save({ useObjectStreams: true });
    }

    pcCompressedBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    pcDisplayResult(origSize, pcCompressedBlob.size, targetKb, 'adaptive_scanned');

  } catch (err) {
    console.error('PDF compression error:', err);
    btn.textContent = `🗜️ Compress PDF to <${_pcTargetKb || 200} KB`;
    btn.disabled = false;
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `<span style="color:#ef4444;">⚠️ Compression failed: ${escapeHtml(err.message || 'File might be password-protected or unsupported.')}</span>`;
    }
    showError('Failed to compress PDF. Please verify the document is not password-protected.');
  }
}

function pcDisplayResult(origBytes, compBytes, targetKb, mode) {
  const btn = document.getElementById('pc-compress-btn');
  const dlBtn = document.getElementById('pc-download-btn');
  const statusEl = document.getElementById('pc-status');
  
  if (btn) btn.style.display = 'none';
  if (statusEl) statusEl.style.display = 'none';
  
  const origKb = (origBytes / 1024).toFixed(1);
  const compKb = (compBytes / 1024).toFixed(1);
  const origMb = (origBytes / (1024 * 1024)).toFixed(2);
  const compMb = (compBytes / (1024 * 1024)).toFixed(2);
  
  let savedPct = ((1 - (compBytes / origBytes)) * 100).toFixed(1);
  if (savedPct < 0) savedPct = '0.0';
  
  const compKbNum = parseFloat(compKb);
  let badgeHtml = '';
  if (compKbNum <= targetKb) {
    badgeHtml = `
      <div style="margin-top:10px; padding:10px 14px; border-radius:8px; background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.35); font-size:13px; font-weight:700; color:#16a34a; display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">✅</span>
        <span>Guaranteed Portal Pass: <strong>${compKb} KB</strong> is strictly under your &lt;${targetKb} KB limit!</span>
      </div>`;
  } else {
    badgeHtml = `
      <div style="margin-top:10px; padding:10px 14px; border-radius:8px; background:rgba(234,179,8,0.12); border:1px solid rgba(234,179,8,0.35); font-size:13px; color:#ca8a04; display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">ℹ️</span>
        <span>Compressed to <strong>${compKb} KB</strong> (Target was &lt;${targetKb} KB). Maximum readable compression reached.</span>
      </div>`;
  }
  
  let methodNote = '';
  if (mode === 'original_compliant') {
    methodNote = '<div style="font-size:11.5px; color:var(--muted); margin-top:6px;">Original file was already under your target threshold. Full 100% native quality preserved.</div>';
  } else if (mode === 'lossless_stream') {
    methodNote = '<div style="font-size:11.5px; color:var(--muted); margin-top:6px;">Lossless stream compression applied. 100% sharp vector text and fonts preserved.</div>';
  } else {
    methodNote = '<div style="font-size:11.5px; color:var(--muted); margin-top:6px;">Intelligent multi-page adaptive compression applied for scanned certificates and documents.</div>';
  }

  const baseName = pcCurrentFile.name.replace(/\.[^/.]+$/, "");
  pcOutputFileName = `${baseName}_${Math.round(compKbNum)}KB.pdf`;

  document.getElementById('pc-info').innerHTML = `
    <div style="font-weight:700; font-size:15px; color:var(--text); margin-bottom:6px;">${escapeHtml(pcCurrentFile.name)}</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0; padding:10px 12px; background:var(--surface); border-radius:8px; border:1px solid var(--border); font-size:13px;">
      <div>
        <span style="color:var(--muted); font-size:11px; text-transform:uppercase; display:block;">Original Size</span>
        <strong>${origBytes >= 1024*1024 ? origMb + ' MB' : origKb + ' KB'}</strong>
      </div>
      <div>
        <span style="color:var(--muted); font-size:11px; text-transform:uppercase; display:block;">Compressed Size</span>
        <strong style="color:var(--primary);">${compBytes >= 1024*1024 ? compMb + ' MB' : compKb + ' KB'}</strong>
        <span style="font-size:11px; color:#16a34a; font-weight:700;">(-${savedPct}%)</span>
      </div>
    </div>
    ${badgeHtml}
    ${methodNote}
  `;
  
  if (dlBtn) {
    dlBtn.style.display = 'block';
    dlBtn.textContent = `⬇ Download Compressed PDF (${Math.round(compKbNum)} KB)`;
  }
  showToast(`PDF compressed to ${compKb} KB!`);
}

function pcDownload() {
  if (!pcCompressedBlob || !pcCurrentFile) return;
  const url = URL.createObjectURL(pcCompressedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pcOutputFileName || (pcCurrentFile.name.replace(/\.[^/.]+$/, "") + "_compressed.pdf");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────
   PWA Service Worker Registration & Native App Install
───────────────────────────────────────── */
let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // SW registration failed silently (dev env, non-https, etc.)
    });
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showPwaInstallButton();
});

function showPwaInstallButton() {
  if (document.getElementById('pwa-install-btn')) return;
  const navActions = document.querySelector('.nav-actions') || document.querySelector('.nav nav');
  if (!navActions) return;
  const btn = document.createElement('button');
  btn.id = 'pwa-install-btn';
  btn.className = 'pwa-install-btn';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Install ToolBoxPro App');
  btn.innerHTML = '📲 <span class="pwa-text">Install App</span>';
  btn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      btn.remove();
    }
    deferredInstallPrompt = null;
  });
  navActions.prepend(btn);
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.remove();
});

/* ── Viral Copy & Embed Helpers ── */
function copyToolLink(url, btn) {
  const targetUrl = url || window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(targetUrl).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Link Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    });
  }
}

function copyEmbedCode(btn) {
  const parent = btn.closest('.embed-code-content') || btn.parentElement;
  const codeEl = parent ? parent.querySelector('code') : null;
  if (codeEl && navigator.clipboard) {
    navigator.clipboard.writeText(codeEl.innerText).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Embed Code Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    });
  }
}

/* ─────────────────────────────────────────
   Inverted Semicircular Rotating Tool Carousel (Isolated Scroll & Mechanical Tick)
───────────────────────────────────────── */
function initHeroCarousel() {
  const showcase = document.getElementById('hero-carousel-showcase');
  const cardsTrack = document.getElementById('carousel-cards-track');
  const soundBtn = document.getElementById('carousel-sound-btn');

  if (!showcase || !cardsTrack) return;

  const totalTools = TOOLS.length;
  if (totalTools === 0) return;

  // ── Web Audio API Mechanical Tick Generator ──
  let audioCtx = null;
  let isSoundMuted = false;
  try {
    isSoundMuted = localStorage.getItem('tbp-carousel-sound') === 'muted';
  } catch (_) {}

  function updateSoundBtnUI() {
    if (!soundBtn) return;
    const icon = soundBtn.querySelector('.sound-icon');
    const label = soundBtn.querySelector('.sound-label');
    if (isSoundMuted) {
      soundBtn.classList.add('is-muted');
      if (icon) icon.textContent = '🔇';
      if (label) label.textContent = 'Muted';
      soundBtn.setAttribute('aria-label', 'Unmute carousel sound');
    } else {
      soundBtn.classList.remove('is-muted');
      if (icon) icon.textContent = '🔊';
      if (label) label.textContent = 'Sound On';
      soundBtn.setAttribute('aria-label', 'Mute carousel sound');
    }
  }
  updateSoundBtnUI();

  if (soundBtn) {
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isSoundMuted = !isSoundMuted;
      try {
        localStorage.setItem('tbp-carousel-sound', isSoundMuted ? 'muted' : 'active');
      } catch (_) {}
      updateSoundBtnUI();
      if (!isSoundMuted) {
        initAudio();
        playTickSound();
      }
    });
  }

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  let lastTickTime = 0;
  function playTickSound() {
    if (isSoundMuted) return;
    const now = performance.now();
    // Prevent overlapping bursts
    if (now - lastTickTime < 70) return;
    lastTickTime = now;

    try {
      initAudio();
      if (!audioCtx || audioCtx.state !== 'running') return;

      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.024);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, t);
      filter.Q.setValueAtTime(2.5, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.03);
    } catch (_) {
      // Audio autoplay restrictions or unsupported
    }
  }

  // Build card elements from TOOLS registry
  cardsTrack.innerHTML = TOOLS.map((tool, idx) => `
    <article
      class="carousel-card"

      tabindex="0"
      data-id="${tool.id}"
      data-index="${idx}"
      aria-label="Open ${escapeHtml(tool.name)}"
    >
      <div class="card-icon-wrap" aria-hidden="true">${tool.icon}</div>
      <div class="card-info">
        <strong class="card-title">${escapeHtml(tool.name)}</strong>
        <span class="card-desc">${escapeHtml(tool.desc)}</span>
      </div>
      <button class="card-badge" type="button" aria-label="Launch ${escapeHtml(tool.name)}">Launch ↗</button>
    </article>
  `).join('');

  const cardElements = Array.from(cardsTrack.querySelectorAll('.carousel-card'));

  // Wire up card click & keyboard handlers
  cardElements.forEach((card, idx) => {
    const toolId = card.dataset.id;
    card.addEventListener('click', (e) => {
      if (hasDragged) return; // Prevent triggering click after gesture
      e.preventDefault();
      currentStep = idx;
      renderCarousel(currentStep);
      openTool(toolId);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        currentStep = idx;
        renderCarousel(currentStep);
        openTool(toolId);
      }
    });

    const badge = card.querySelector('.card-badge');
    if (badge) {
      badge.addEventListener('click', (e) => {
        if (hasDragged) return;
        e.preventDefault();
        e.stopPropagation();
        openTool(toolId);
      });
    }
  });

  // Geometry state: Keep both ends pinned to the extreme right side
  let width = showcase.clientWidth || 500;
  let height = showcase.clientHeight || 520;
  let Xc = width + 20;
  let Yc = height / 2;
  let Rx = 360;
  let Ry = 230;
  const maxAngleRad = 78 * Math.PI / 180;

  function updateGeometry() {
    width = showcase.clientWidth || 500;
    height = showcase.clientHeight || 520;

    if (width < 440) {
      // Mobile
      Xc = width + 10;
      Yc = height / 2;
      Rx = Math.max(160, Math.min(230, width - 75));
      Ry = Math.max(130, Math.min(160, height / 2 - 20));
    } else if (width < 768) {
      // Tablet
      Xc = width + 15;
      Yc = height / 2;
      Rx = Math.max(220, Math.min(310, width - 90));
      Ry = Math.max(170, Math.min(210, height / 2 - 25));
    } else {
      // Desktop
      Xc = width + 25;
      Yc = height / 2;
      Rx = Math.max(280, Math.min(370, width - 100));
      Ry = Math.max(200, Math.min(240, height / 2 - 25));
    }
  }

  updateGeometry();

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      updateGeometry();
      renderCarousel(currentContinuousPos);
    });
    ro.observe(showcase);
  } else {
    window.addEventListener('resize', () => {
      updateGeometry();
      renderCarousel(currentContinuousPos);
    });
  }

  function getAngleForDiff(diff) {
    const half = totalTools / 2;
    const u = diff / half;
    return Math.sign(u) * Math.pow(Math.abs(u), 0.86) * maxAngleRad;
  }

  let lastActiveIndex = -1;

  function renderCarousel(continuousPos) {
    const half = totalTools / 2;
    const centerIndex = Math.round(continuousPos) % totalTools;
    const normalizedCenter = centerIndex < 0 ? centerIndex + totalTools : centerIndex;

    if (normalizedCenter !== lastActiveIndex) {
      if (lastActiveIndex !== -1) {
        playTickSound();
      }
      lastActiveIndex = normalizedCenter;
    }

    for (let i = 0; i < totalTools; i++) {
      const card = cardElements[i];
      let diff = (i - continuousPos) % totalTools;
      if (diff < -half) diff += totalTools;
      if (diff > half) diff -= totalTools;

      const angle = getAngleForDiff(diff);
      const absDiff = Math.abs(diff);

      const cardX = Xc - Rx * Math.cos(angle);
      const cardY = Yc + Ry * Math.sin(angle);

      let scale;
      if (absDiff <= 1) {
        scale = 1.18 - absDiff * (1.18 - 0.84);
      } else {
        scale = 0.84 - ((absDiff - 1) / (half - 1)) * (0.84 - 0.66);
      }

      let opacity;
      if (absDiff <= 0.6) {
        opacity = 1.0;
      } else if (absDiff <= 2) {
        opacity = 0.88 - (absDiff - 0.6) * 0.12;
      } else if (absDiff <= half - 1) {
        opacity = 0.72 - ((absDiff - 2) / (half - 3)) * 0.32;
      } else {
        opacity = Math.max(0, 0.40 * (1 - (absDiff - (half - 1))));
      }

      const zIndex = Math.max(1, Math.round(30 - absDiff * 3));
      const isActive = absDiff < 0.45;

      card.style.transform = `translate3d(${cardX.toFixed(1)}px, ${cardY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.zIndex = zIndex;

      if (isActive) {
        if (!card.classList.contains('is-active')) {
          card.classList.add('is-active');
          card.setAttribute('aria-current', 'true');
        }
      } else {
        if (card.classList.contains('is-active')) {
          card.classList.remove('is-active');
          card.removeAttribute('aria-current');
        }
      }
    }
  }

  // Animation controller
  let currentStep = 0;
  let targetStep = 0;
  let currentContinuousPos = 0;
  let transitionStart = 0;
  let isTransitioning = false;
  let isPaused = false;
  let timerId = null;
  const INTERVAL_MS = 2200;
  const TRANSITION_MS = 400;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function advanceStep() {
    if (isPaused || isTransitioning || isDragging) return;
    isTransitioning = true;
    transitionStart = performance.now();
    targetStep = (currentStep + 1) % totalTools;
  }

  function scheduleNext(delay = INTERVAL_MS) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      if (!isPaused && !isDragging) {
        advanceStep();
      }
    }, delay);
  }

  function animationLoop(timestamp) {
    if (isTransitioning) {
      const elapsed = timestamp - transitionStart;
      const progress = Math.min(1, elapsed / TRANSITION_MS);
      const eased = easeInOutCubic(progress);

      currentContinuousPos = (currentStep + eased) % totalTools;
      renderCarousel(currentContinuousPos);

      if (progress >= 1) {
        isTransitioning = false;
        currentStep = targetStep;
        currentContinuousPos = currentStep;
        renderCarousel(currentStep);
        scheduleNext();
      }
    }

    requestAnimationFrame(animationLoop);
  }

  // ── Drag & Isolated Swipe Functionality ──
  let isDragging = false;
  let startY = 0;
  let startX = 0;
  let startContinuousPos = 0;
  let hasDragged = false;
  let touchScrollLock = false; // true when gesture is confirmed vertical and handled by carousel

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    initAudio();
    isDragging = true;
    hasDragged = false;
    touchScrollLock = false;
    isPaused = true;
    isTransitioning = false;
    clearTimeout(timerId);
    startY = e.clientY;
    startX = e.clientX;
    startContinuousPos = currentContinuousPos;
    try { showcase.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const deltaX = e.clientX - startX;

    // Detect if this is a deliberate vertical gesture
    if (Math.abs(deltaY) > 6 && Math.abs(deltaY) > Math.abs(deltaX)) {
      hasDragged = true;
      touchScrollLock = true;
    }

    if (hasDragged) {
      const stepDelta = -deltaY / 65;
      let nextPos = startContinuousPos + stepDelta;
      
      // Enforce boundary limits [0, totalTools - 1] to avoid trapping user
      if (nextPos < 0) {
        nextPos = 0;
      } else if (nextPos > totalTools - 1) {
        nextPos = totalTools - 1;
      }

      currentContinuousPos = nextPos;
      renderCarousel(currentContinuousPos);
    }
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    touchScrollLock = false;
    try { showcase.releasePointerCapture(e.pointerId); } catch (_) {}

    const nearestStep = Math.max(0, Math.min(totalTools - 1, Math.round(currentContinuousPos)));
    currentStep = nearestStep;
    targetStep = currentStep;
    isTransitioning = true;
    transitionStart = performance.now();

    setTimeout(() => {
      hasDragged = false;
      isPaused = false;
      scheduleNext(INTERVAL_MS);
    }, 180);
  }

  showcase.addEventListener('pointerdown', onPointerDown);
  showcase.addEventListener('pointermove', onPointerMove);
  showcase.addEventListener('pointerup', onPointerUp);
  showcase.addEventListener('pointercancel', onPointerUp);

  // ── Touch Gesture Interceptor: Only cancel native scroll when active inside carousel bounds ──
  showcase.addEventListener('touchmove', (e) => {
    if (!touchScrollLock || !e.cancelable) return;

    if (e.touches && e.touches.length > 0) {
      const currentTouchY = e.touches[0].clientY;
      const touchDeltaY = currentTouchY - startY;

      // When dragging down at top boundary (first item), or dragging up at bottom boundary (last item),
      // allow normal page scrolling instead of trapping the user.
      if (currentContinuousPos <= 0.05 && touchDeltaY > 0) {
        return; // Allow page to scroll down
      }
      if (currentContinuousPos >= totalTools - 1 - 0.05 && touchDeltaY < 0) {
        return; // Allow page to scroll up
      }
    }

    // Carousel is actively consuming vertical swipe: keep page stationary
    e.preventDefault();
  }, { passive: false });

  // ── Isolated Scrolling: Wheel & Trackpad Interceptor ──
  // ONLY the tools carousel scrolls when cursor/pointer is inside this area.
  // When carousel reaches the first or last tool, allow normal page scrolling in that direction.
  let wheelAccumulator = 0;
  let wheelSnapTimer = null;

  showcase.addEventListener('wheel', (e) => {
    const delta = e.deltaY !== undefined ? e.deltaY : e.detail;
    if (!delta) return;

    // Boundary check:
    // If scrolling up (delta < 0) and already at the first item (<= 0.05), allow outer page to scroll up.
    if (delta < 0 && currentContinuousPos <= 0.05) {
      return;
    }
    // If scrolling down (delta > 0) and already at the last item (>= totalTools - 1 - 0.05), allow outer page to scroll down.
    if (delta > 0 && currentContinuousPos >= totalTools - 1 - 0.05) {
      return;
    }

    // Carousel consumes the wheel event: keep main webpage stationary
    e.preventDefault();
    e.stopPropagation();
    initAudio();

    isPaused = true;
    isTransitioning = false;
    clearTimeout(timerId);
    clearTimeout(wheelSnapTimer);

    wheelAccumulator += delta;

    // Smooth movement mapping
    const stepDelta = (delta / 120) * 0.45;
    let nextPos = currentContinuousPos + stepDelta;
    if (nextPos < 0) nextPos = 0;
    if (nextPos > totalTools - 1) nextPos = totalTools - 1;
    currentContinuousPos = nextPos;
    renderCarousel(currentContinuousPos);

    // Debounce snap to closest tool
    wheelSnapTimer = setTimeout(() => {
      const nearestStep = Math.max(0, Math.min(totalTools - 1, Math.round(currentContinuousPos)));
      currentStep = nearestStep;
      targetStep = currentStep;
      isTransitioning = true;
      transitionStart = performance.now();
      wheelAccumulator = 0;

      setTimeout(() => {
        isPaused = false;
        scheduleNext(INTERVAL_MS);
      }, 300);
    }, 120);
  }, { passive: false });

  // prefers-reduced-motion check
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    renderCarousel(0);
  } else {
    renderCarousel(0);
    scheduleNext();
    requestAnimationFrame(animationLoop);
  }

  // Hover and Focus pause
  showcase.addEventListener('mouseenter', () => {
    if (!isDragging) {
      isPaused = true;
      clearTimeout(timerId);
    }
  });

  showcase.addEventListener('mouseleave', () => {
    if (!isDragging) {
      isPaused = false;
      if (!isTransitioning) {
        scheduleNext();
      }
    }
  });

  showcase.addEventListener('focusin', () => {
    isPaused = true;
    clearTimeout(timerId);
  });

  showcase.addEventListener('focusout', () => {
    isPaused = false;
    if (!isTransitioning && !isDragging) scheduleNext();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isPaused = true;
      clearTimeout(timerId);
    } else {
      isPaused = false;
      if (!isTransitioning && !isDragging) scheduleNext();
    }
  });
}

/* ─────────────────────────────────────────
   Scroll-Triggered Reveal Animations (Tasteskill.dev inspired)
───────────────────────────────────────── */
let revealObserver = null;

function observeRevealElements(container = document) {
  if (!('IntersectionObserver' in window)) {
    // Fallback: gracefully reveal everything if IntersectionObserver is not supported
    container.querySelectorAll('.reveal').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Reduced motion: reveal immediately without animations
    container.querySelectorAll('.reveal').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -45px 0px', // Trigger cleanly as element comes into view
      threshold: 0.08
    });
  }

  const elements = container.querySelectorAll('.reveal:not(.is-revealed)');
  elements.forEach(el => revealObserver.observe(el));
}

function initScrollReveal() {
  // Stagger popular cards dynamically
  document.querySelectorAll('.popular-grid .popular-card').forEach((card, idx) => {
    card.style.transitionDelay = `${idx * 110}ms`;
  });

  observeRevealElements(document);
}

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
initWebsiteOpenAnimation();
render();
initHeroCarousel();
initScrollReveal();
initHeroInteractiveDemo();
initDynamicRotatingText();
initDynamicSearchPlaceholder();
initMouseSpotlightGlow();
initCookieConsent();

/* ─────────────────────────────────────────
   Interactive Delight & Visual Engagement
───────────────────────────────────────── */
function initHeroInteractiveDemo() {
  const slider = document.getElementById('hero-loan-slider');
  const loanDisplay = document.getElementById('hero-loan-display');
  const emiDisplay = document.getElementById('hero-emi-display');
  if (!slider || !loanDisplay || !emiDisplay) return;

  function updateHeroEmi() {
    const P = parseFloat(slider.value) || 1000000;
    loanDisplay.textContent = `₹ ${P.toLocaleString('en-IN')}`;
    const r = 8.5 / 12 / 100;
    const n = 120;
    const emi = Math.round(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
    emiDisplay.textContent = `₹ ${emi.toLocaleString('en-IN')} /mo`;
  }

  slider.addEventListener('input', updateHeroEmi);
  slider.addEventListener('change', updateHeroEmi);
}

function initDynamicRotatingText() {
  const textEl = document.getElementById('dynamicText');
  if (!textEl) return;

  const phrases = [
    'Fast Everyday Tasks',
    'Image Compression',
    'Merging & Shrinking PDFs',
    'Loan EMI & GST Math',
    'Custom QR Codes',
    'Photo & Signature Resizing',
    'Scientific Unit Math'
  ];
  let idx = 0;

  setInterval(() => {
    textEl.classList.add('is-fading');
    setTimeout(() => {
      idx = (idx + 1) % phrases.length;
      textEl.textContent = phrases[idx];
      textEl.classList.remove('is-fading');
    }, 320);
  }, 2800);
}

function initDynamicSearchPlaceholder() {
  const searchInput = document.getElementById('search');
  if (!searchInput) return;

  const placeholders = [
    'Search a tool, e.g. Image, EMI, GST, PDF, Age…',
    'e.g. Compress 5MB JPG photo to 100KB…',
    'e.g. Calculate home loan EMI & interest…',
    'e.g. Merge multiple PDF files together…',
    'e.g. Add 18% GST to total amount…',
    'e.g. Photo & signature resizer for exam forms…',
    'e.g. Generate Wi-Fi or UPI QR Code…'
  ];
  let pIdx = 0;

  setInterval(() => {
    if (document.activeElement === searchInput || searchInput.value.trim().length > 0) return;
    pIdx = (pIdx + 1) % placeholders.length;
    searchInput.setAttribute('placeholder', placeholders[pIdx]);
  }, 3200);
}

function initMouseSpotlightGlow() {
  const cards = document.querySelectorAll('.tool, .preview-card, .popular article');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/* ─────────────────────────────────────────
   Tool: Video to Shorts Splitter & 9:16 Maker
───────────────────────────────────────── */
let _vsFile = null;
let _vsVideo = null;
let _vsDuration = 0;
let _vsChunkDur = 30; // default 30s
let _vsFraming = 'blur'; // 'blur', 'crop', 'fit', 'original'
let _vsIsCancelling = false;
let _vsGeneratedShorts = [];
let _vsAudioCtx = null;
let _vsAudioSource = null;
let _vsAudioDest = null;
let _vsTrimCustom = false;
let _vsOverlayCustom = false;

function vsSwitchTab(tab) {
  const fileTab = document.getElementById('vs-tab-file');
  const ytTab = document.getElementById('vs-tab-yt');
  const filePanel = document.getElementById('vs-file-panel');
  const ytPanel = document.getElementById('vs-yt-panel');

  if (tab === 'file') {
    if (fileTab) { fileTab.classList.add('active'); fileTab.setAttribute('aria-selected', 'true'); }
    if (ytTab) { ytTab.classList.remove('active'); ytTab.setAttribute('aria-selected', 'false'); }
    if (filePanel) filePanel.classList.remove('hidden');
    if (ytPanel) ytPanel.classList.add('hidden');
  } else {
    if (fileTab) { fileTab.classList.remove('active'); fileTab.setAttribute('aria-selected', 'false'); }
    if (ytTab) { ytTab.classList.add('active'); ytTab.setAttribute('aria-selected', 'true'); }
    if (filePanel) filePanel.classList.add('hidden');
    if (ytPanel) ytPanel.classList.remove('hidden');
  }
}

function vsHandleYtInput(val) {
  if (!val) {
    const preview = document.getElementById('vs-yt-preview');
    if (preview) preview.classList.add('hidden');
    return;
  }
  const m = val.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([\w-]{11})/i);
  const preview = document.getElementById('vs-yt-preview');
  const thumb = document.getElementById('vs-yt-thumb');
  const badge = document.getElementById('vs-yt-id-badge');

  if (m && m[1]) {
    const id = m[1];
    if (thumb) thumb.src = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    if (badge) badge.textContent = `Video ID: ${id} • Ready for Shorts Conversion`;
    if (preview) preview.classList.remove('hidden');
  } else {
    if (preview) preview.classList.add('hidden');
  }
}

async function vsPasteYtUrl() {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      const inp = document.getElementById('vs-yt-input');
      if (inp) {
        inp.value = text.trim();
        vsHandleYtInput(inp.value);
        showToast('✓ Pasted link from clipboard');
      }
    } else {
      showToast('⚠️ Please paste manually (Ctrl+V)');
    }
  } catch (err) {
    showToast('⚠️ Please paste manually (Ctrl+V)');
  }
}

function vsToggleTrim() {
  _vsTrimCustom = !_vsTrimCustom;
  const wrap = document.getElementById('vs-trim-inputs');
  const btn = document.getElementById('vs-trim-toggle');
  if (wrap) {
    wrap.classList.toggle('hidden', !_vsTrimCustom);
  }
  if (btn) {
    btn.textContent = _vsTrimCustom ? 'Custom Range: ON' : 'Custom Range: Off';
    btn.classList.toggle('active', _vsTrimCustom);
  }
  vsUpdateSplitEstimate();
}

function vsToggleOverlay() {
  _vsOverlayCustom = !_vsOverlayCustom;
  const wrap = document.getElementById('vs-overlay-inputs');
  const btn = document.getElementById('vs-overlay-toggle');
  if (wrap) {
    wrap.classList.toggle('hidden', !_vsOverlayCustom);
  }
  if (btn) {
    btn.textContent = _vsOverlayCustom ? 'Hook Text: ON' : 'Hook Text: Off';
    btn.classList.toggle('active', _vsOverlayCustom);
  }
}

function vsParseTime(str) {
  if (!str) return 0;
  str = String(str).trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 2) {
      return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
    } else if (parts.length === 3) {
      return (parseFloat(parts[0]) || 0) * 3600 + (parseFloat(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
    }
  }
  return parseFloat(str) || 0;
}

function vsHandleDrop(e) {
  e.preventDefault();
  const dropZone = document.getElementById('vs-drop');
  if (dropZone) dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv|m4v|avi)$/i.test(file.name)) {
    showToast('⚠️ Please upload a valid video file (MP4, WebM, MOV, MKV).');
    return;
  }
  vsLoadFile(file);
}

function vsLoadFile(file) {
  if (!file) return;
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv|m4v|avi)$/i.test(file.name)) {
    showToast('⚠️ Please upload a valid video file.');
    return;
  }
  _vsFile = file;
  _vsGeneratedShorts.forEach(s => URL.revokeObjectURL(s.url));
  _vsGeneratedShorts = [];

  const dropZone = document.getElementById('vs-drop');
  const controls = document.getElementById('vs-controls');
  const origInfo = document.getElementById('vs-orig-info');
  const previewVideo = document.getElementById('vs-video-preview');
  const resultsWrap = document.getElementById('vs-results-wrap');
  const progressWrap = document.getElementById('vs-progress-wrap');

  if (dropZone) dropZone.classList.add('hidden');
  if (controls) controls.classList.remove('hidden');
  if (resultsWrap) resultsWrap.classList.add('hidden');
  if (progressWrap) progressWrap.classList.add('hidden');

  if (!_vsVideo) {
    _vsVideo = document.createElement('video');
    _vsVideo.playsInline = true;
    _vsVideo.crossOrigin = 'anonymous';
    _vsVideo.muted = false;
  }

  const url = URL.createObjectURL(file);
  _vsVideo.src = url;
  if (previewVideo) {
    previewVideo.src = url;
  }

  _vsVideo.onloadedmetadata = () => {
    _vsDuration = _vsVideo.duration;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    if (origInfo) {
      origInfo.innerHTML = `<strong>${escapeHtml(file.name)}</strong>: ${vsFmtDuration(_vsDuration)} • ${_vsVideo.videoWidth} × ${_vsVideo.videoHeight}px (${sizeMb} MB)`;
    }
    const trimEndInp = document.getElementById('vs-trim-end');
    if (trimEndInp && !trimEndInp.value) {
      trimEndInp.placeholder = vsFmtDuration(_vsDuration);
    }
    vsUpdateSplitEstimate();
  };

  _vsVideo.onerror = () => {
    showToast('⚠️ Could not decode video format in browser.');
  };
}

function vsSetDuration(dur) {
  document.querySelectorAll('#vs-controls [id^="vs-dur-"]').forEach(btn => btn.classList.remove('active'));
  const targetBtn = document.getElementById(`vs-dur-${dur}`);
  if (targetBtn) targetBtn.classList.add('active');

  const customWrap = document.getElementById('vs-custom-dur-wrap');
  if (dur === 'custom') {
    if (customWrap) customWrap.classList.remove('hidden');
    const customInp = document.getElementById('vs-custom-sec');
    _vsChunkDur = parseFloat(customInp ? customInp.value : 45) || 45;
  } else {
    if (customWrap) customWrap.classList.add('hidden');
    _vsChunkDur = parseInt(dur, 10);
  }
  vsUpdateSplitEstimate();
}

function vsSetFraming(mode) {
  _vsFraming = mode;
  document.querySelectorAll('#vs-controls [id^="vs-frame-"]').forEach(card => card.classList.remove('active'));
  const activeCard = document.getElementById(`vs-frame-${mode}`);
  if (activeCard) activeCard.classList.add('active');
}

function vsFmtDuration(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function vsUpdateSplitEstimate() {
  if (!_vsDuration || _vsDuration <= 0) return;

  const customWrap = document.getElementById('vs-custom-dur-wrap');
  let chunk = _vsChunkDur;
  if (customWrap && !customWrap.classList.contains('hidden')) {
    const customInp = document.getElementById('vs-custom-sec');
    chunk = parseFloat(customInp ? customInp.value : 45) || 45;
    _vsChunkDur = chunk;
  }

  let startSec = 0;
  let endSec = _vsDuration;
  if (_vsTrimCustom) {
    const startInp = document.getElementById('vs-trim-start');
    const endInp = document.getElementById('vs-trim-end');
    if (startInp && startInp.value) startSec = vsParseTime(startInp.value);
    if (endInp && endInp.value) endSec = vsParseTime(endInp.value) || _vsDuration;
  }
  startSec = Math.max(0, Math.min(startSec, _vsDuration));
  endSec = Math.max(startSec + 1, Math.min(endSec, _vsDuration));
  const span = endSec - startSec;

  const maxSelect = document.getElementById('vs-max-parts');
  const maxChoice = maxSelect ? maxSelect.value : 'all';

  const totalPossible = Math.max(1, Math.ceil(span / chunk));
  const willCreate = maxChoice === 'all' ? totalPossible : Math.min(totalPossible, parseInt(maxChoice, 10));

  const estimateBox = document.getElementById('vs-estimate-box');
  if (estimateBox) {
    const trimText = _vsTrimCustom ? ` (Trimmed: ${vsFmtDuration(startSec)} - ${vsFmtDuration(endSec)})` : '';
    estimateBox.innerHTML = `🎬 This <strong>${vsFmtDuration(span)}</strong> segment${trimText} will produce <strong>${willCreate} Shorts</strong> (~${Math.round(chunk)}s each) in vertical 9:16 format.`;
  }
}

function vsCancelSplitting() {
  _vsIsCancelling = true;
  if (_vsVideo) _vsVideo.pause();
  const progressWrap = document.getElementById('vs-progress-wrap');
  const startBtn = document.getElementById('vs-start-btn');
  if (progressWrap) progressWrap.classList.add('hidden');
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.style.display = 'block';
  }
  showToast('Splitting cancelled.');
}

async function vsSeekTo(video, targetTime) {
  return new Promise(resolve => {
    let resolved = false;
    const onSeek = () => {
      if (!resolved) {
        resolved = true;
        video.removeEventListener('seeked', onSeek);
        resolve();
      }
    };
    video.addEventListener('seeked', onSeek);
    video.currentTime = targetTime;
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        video.removeEventListener('seeked', onSeek);
        resolve();
      }
    }, 1500);
  });
}

async function vsStartSplitting() {
  if (!_vsFile || !_vsVideo || !_vsDuration) {
    showToast('⚠️ Please upload a video first.');
    return;
  }

  _vsIsCancelling = false;
  _vsGeneratedShorts.forEach(s => URL.revokeObjectURL(s.url));
  _vsGeneratedShorts = [];

  const startBtn = document.getElementById('vs-start-btn');
  const progressWrap = document.getElementById('vs-progress-wrap');
  const resultsWrap = document.getElementById('vs-results-wrap');
  const statusEl = document.getElementById('vs-progress-status');
  const pctEl = document.getElementById('vs-progress-pct');
  const barEl = document.getElementById('vs-progress-bar');
  const liveCanvas = document.getElementById('vs-canvas');

  if (startBtn) {
    startBtn.disabled = true;
    startBtn.style.display = 'none';
  }
  if (progressWrap) progressWrap.classList.remove('hidden');
  if (resultsWrap) resultsWrap.classList.add('hidden');

  const chunkDur = _vsChunkDur || 30;
  let startSec = 0;
  let endSec = _vsDuration;
  if (_vsTrimCustom) {
    const startInp = document.getElementById('vs-trim-start');
    const endInp = document.getElementById('vs-trim-end');
    if (startInp && startInp.value) startSec = vsParseTime(startInp.value);
    if (endInp && endInp.value) endSec = vsParseTime(endInp.value) || _vsDuration;
  }
  startSec = Math.max(0, Math.min(startSec, _vsDuration));
  endSec = Math.max(startSec + 1, Math.min(endSec, _vsDuration));

  const maxChoice = document.getElementById('vs-max-parts') ? document.getElementById('vs-max-parts').value : 'all';
  const totalPossible = Math.ceil((endSec - startSec) / chunkDur);
  const countToMake = maxChoice === 'all' ? totalPossible : Math.min(totalPossible, parseInt(maxChoice, 10));

  const parts = [];
  for (let i = 0; i < countToMake; i++) {
    const s = startSec + (i * chunkDur);
    const e = Math.min(startSec + ((i + 1) * chunkDur), endSec);
    if ((e - s) >= 1.5) {
      parts.push({ index: i + 1, start: s, end: e });
    }
  }

  if (parts.length === 0) {
    showToast('⚠️ Video duration too short for selected chunk duration.');
    if (startBtn) { startBtn.disabled = false; startBtn.style.display = 'block'; }
    if (progressWrap) progressWrap.classList.add('hidden');
    return;
  }

  // Hook Text
  let overlayText = '';
  if (_vsOverlayCustom) {
    const overlayInp = document.getElementById('vs-overlay-text');
    overlayText = overlayInp ? overlayInp.value.trim() : '';
  }

  // Target Resolution
  const resChoice = document.getElementById('vs-resolution') ? document.getElementById('vs-resolution').value : '1080';
  let targetW = resChoice === '720' ? 720 : 1080;
  let targetH = resChoice === '720' ? 1280 : 1920;
  if (_vsFraming === 'original') {
    targetW = _vsVideo.videoWidth || 1280;
    targetH = _vsVideo.videoHeight || 720;
  }

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = targetW;
  renderCanvas.height = targetH;
  const ctx = renderCanvas.getContext('2d');

  if (liveCanvas) {
    liveCanvas.width = 360;
    liveCanvas.height = 640;
  }
  const liveCtx = liveCanvas ? liveCanvas.getContext('2d') : null;

  // Codec probing
  let mimeType = 'video/webm;codecs=vp9,opus';
  let fileExt = 'webm';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
      fileExt = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
      fileExt = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
      fileExt = 'webm';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
      fileExt = 'webm';
    }
  }

  // Audio setup via AudioContext
  let audioTracks = [];
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && !_vsAudioCtx) {
      _vsAudioCtx = new AC();
      _vsAudioSource = _vsAudioCtx.createMediaElementSource(_vsVideo);
      _vsAudioDest = _vsAudioCtx.createMediaStreamDestination();
      _vsAudioSource.connect(_vsAudioDest);
    }
    if (_vsAudioCtx && _vsAudioCtx.state === 'suspended') {
      await _vsAudioCtx.resume();
    }
    if (_vsAudioDest) {
      audioTracks = _vsAudioDest.stream.getAudioTracks();
    }
  } catch (err) {
    console.warn('Audio capture note:', err);
  }

  if (!audioTracks.length) {
    try {
      const s = _vsVideo.captureStream ? _vsVideo.captureStream() : (_vsVideo.mozCaptureStream ? _vsVideo.mozCaptureStream() : null);
      if (s && s.getAudioTracks().length) {
        audioTracks = s.getAudioTracks();
      }
    } catch (_) {}
  }

  const baseName = _vsFile.name.replace(/\.[^.]+$/, '');

  for (let pIdx = 0; pIdx < parts.length; pIdx++) {
    if (_vsIsCancelling) break;

    const part = parts[pIdx];
    if (statusEl) {
      statusEl.textContent = `Processing Short ${part.index} of ${parts.length} (${vsFmtDuration(part.start)} - ${vsFmtDuration(part.end)})...`;
    }

    await vsSeekTo(_vsVideo, part.start);
    if (_vsIsCancelling) break;

    const canvasStream = renderCanvas.captureStream(30);
    const videoTracks = canvasStream.getVideoTracks();
    const combinedTracks = audioTracks.length > 0 ? [...videoTracks, ...audioTracks] : [...videoTracks];
    const combinedStream = new MediaStream(combinedTracks);

    const chunks = [];
    let recorder;
    try {
      recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4000000 });
    } catch (e) {
      recorder = new MediaRecorder(combinedStream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const recordPromise = new Promise(resolve => {
      recorder.onstop = () => resolve();
    });

    recorder.start(100);

    try {
      if (_vsAudioCtx && _vsAudioCtx.state === 'suspended') {
        await _vsAudioCtx.resume();
      }
      await _vsVideo.play();
    } catch (_) {}

    // Frame rendering loop
    const vW = _vsVideo.videoWidth || targetW;
    const vH = _vsVideo.videoHeight || targetH;

    await new Promise(resolve => {
      function renderFrame() {
        if (_vsIsCancelling || _vsVideo.currentTime >= (part.end - 0.05) || _vsVideo.ended) {
          resolve();
          return;
        }

        // 1. Draw to render canvas based on framing mode
        if (_vsFraming === 'blur') {
          // Blurred background
          ctx.save();
          ctx.filter = 'blur(28px) brightness(0.65)';
          const scaleBg = Math.max(targetW / vW, targetH / vH);
          const bgW = vW * scaleBg;
          const bgH = vH * scaleBg;
          ctx.drawImage(_vsVideo, (targetW - bgW) / 2, (targetH - bgH) / 2, bgW, bgH);
          ctx.restore();

          // Foreground center fit
          const scaleFg = Math.min(targetW / vW, targetH / vH);
          const fgW = vW * scaleFg;
          const fgH = vH * scaleFg;
          ctx.drawImage(_vsVideo, (targetW - fgW) / 2, (targetH - fgH) / 2, fgW, fgH);
        } else if (_vsFraming === 'crop') {
          // Fill 9:16 completely
          const scale = Math.max(targetW / vW, targetH / vH);
          const w = vW * scale;
          const h = vH * scale;
          ctx.drawImage(_vsVideo, (targetW - w) / 2, (targetH - h) / 2, w, h);
        } else if (_vsFraming === 'fit') {
          // Letterbox black
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetW, targetH);
          const scale = Math.min(targetW / vW, targetH / vH);
          const w = vW * scale;
          const h = vH * scale;
          ctx.drawImage(_vsVideo, (targetW - w) / 2, (targetH - h) / 2, w, h);
        } else {
          // Original ratio
          ctx.drawImage(_vsVideo, 0, 0, targetW, targetH);
        }

        // Optional Viral Hook Overlay
        if (overlayText) {
          const textToDraw = overlayText.replace(/\{i\}/gi, part.index);
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const fontSize = Math.round(targetW * 0.052);
          ctx.font = `bold ${fontSize}px sans-serif`;
          const textMetrics = ctx.measureText(textToDraw);
          const textWidth = textMetrics.width;
          const paddingH = 24;
          const paddingV = 14;
          const boxW = Math.min(targetW - 40, textWidth + paddingH * 2);
          const boxH = fontSize + paddingV * 2;
          const boxX = (targetW - boxW) / 2;
          const boxY = Math.round(targetH * 0.12);

          // High contrast dark rounded box
          ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxW, boxH, 12);
          } else {
            ctx.rect(boxX, boxY, boxW, boxH);
          }
          ctx.fill();

          // Gold border
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Hook Text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(textToDraw, targetW / 2, boxY + boxH / 2);
          ctx.restore();
        }

        // Live Mini Preview
        if (liveCtx && liveCanvas) {
          liveCtx.drawImage(renderCanvas, 0, 0, liveCanvas.width, liveCanvas.height);
        }

        // Progress calc
        const partProgress = Math.min(1, Math.max(0, (_vsVideo.currentTime - part.start) / (part.end - part.start)));
        const overallPct = Math.round(((pIdx + partProgress) / parts.length) * 100);
        if (barEl) barEl.style.width = `${overallPct}%`;
        if (pctEl) pctEl.textContent = `${overallPct}%`;

        requestAnimationFrame(renderFrame);
      }
      renderFrame();
    });

    _vsVideo.pause();
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    await recordPromise;

    if (_vsIsCancelling) break;

    const partBlob = new Blob(chunks, { type: mimeType });
    const partUrl = URL.createObjectURL(partBlob);
    const partDurSec = Math.round(part.end - part.start);
    const shortFilename = `${baseName}_Short_Part${part.index}_${partDurSec}s.${fileExt}`;

    _vsGeneratedShorts.push({
      index: part.index,
      startSec: part.start,
      endSec: part.end,
      blob: partBlob,
      url: partUrl,
      filename: shortFilename
    });
  }

  if (progressWrap) progressWrap.classList.add('hidden');
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.style.display = 'block';
  }

  if (_vsIsCancelling || _vsGeneratedShorts.length === 0) {
    return;
  }

  // Render Output Gallery
  const gridEl = document.getElementById('vs-shorts-grid');
  const resultsTitle = document.getElementById('vs-results-title');
  const resultsSub = document.getElementById('vs-results-sub');

  if (resultsTitle) {
    resultsTitle.textContent = `🎉 Generated ${_vsGeneratedShorts.length} Viral Shorts!`;
  }
  if (resultsSub) {
    resultsSub.textContent = `Each short is sliced to 9:16 vertical format and ready for YouTube Shorts, Reels & TikTok.`;
  }

  if (gridEl) {
    gridEl.innerHTML = _vsGeneratedShorts.map((item, idx) => `
      <div class="vs-short-card">
        <div class="vs-short-badge">
          <span>Short #${item.index}</span>
          <span>${vsFmtDuration(item.startSec)} - ${vsFmtDuration(item.endSec)}</span>
        </div>
        <div class="vs-short-player-wrap">
          <video src="${item.url}" controls playsinline loop preload="metadata"></video>
        </div>
        <div class="vs-short-info">
          <strong>${escapeHtml(item.filename)}</strong>
          <span style="font-size:11.5px; color:var(--muted);">${(item.blob.size / (1024 * 1024)).toFixed(1)} MB</span>
          <button class="primary vs-card-dl-btn" type="button" onclick="vsDownloadOne(${idx})">⬇ Download Part #${item.index}</button>
        </div>
      </div>
    `).join('');
  }

  if (resultsWrap) resultsWrap.classList.remove('hidden');
  showToast(`✓ All ${_vsGeneratedShorts.length} Shorts generated successfully!`);
}

function vsDownloadOne(idx) {
  const item = _vsGeneratedShorts[idx];
  if (!item) return;
  const a = document.createElement('a');
  a.href = item.url;
  a.download = item.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`✓ Downloading Part #${item.index}`);
}

function vsDownloadAll() {
  if (!_vsGeneratedShorts.length) return;
  showToast(`Downloading ${_vsGeneratedShorts.length} Shorts sequentially...`);
  _vsGeneratedShorts.forEach((item, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, i * 450);
  });
}

async function vsDownloadAllZip() {
  if (!_vsGeneratedShorts.length) return;
  const zipBtn = document.getElementById('vs-btn-zip');
  const origText = zipBtn ? zipBtn.textContent : '';
  if (zipBtn) {
    zipBtn.disabled = true;
    zipBtn.textContent = '⏳ Packaging ZIP...';
  }
  showToast('📦 Creating ZIP archive of all Shorts...');

  try {
    if (typeof JSZip === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
      });
    }

    const zip = new JSZip();
    const folder = zip.folder('ToolboxPro_Shorts') || zip;
    _vsGeneratedShorts.forEach((item) => {
      folder.file(item.filename, item.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      if (zipBtn) zipBtn.textContent = `⏳ Packaging ZIP (${Math.round(metadata.percent)}%)...`;
    });

    const zipUrl = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = zipUrl;
    const baseName = _vsFile ? _vsFile.name.replace(/\.[^.]+$/, '') : 'ToolboxPro';
    a.download = `${baseName}_All_Shorts_9x16.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
    showToast('✓ ZIP downloaded successfully!');
  } catch (err) {
    console.warn('ZIP creation error, falling back to sequential download:', err);
    showToast('⚠️ ZIP packaging unavailable, downloading files individually...');
    vsDownloadAll();
  } finally {
    if (zipBtn) {
      zipBtn.disabled = false;
      zipBtn.textContent = origText;
    }
  }
}

function vsReset() {
  _vsIsCancelling = true;
  if (_vsVideo) {
    _vsVideo.pause();
    _vsVideo.src = '';
  }
  _vsGeneratedShorts.forEach(s => URL.revokeObjectURL(s.url));
  _vsGeneratedShorts = [];
  _vsFile = null;
  _vsDuration = 0;

  const dropZone = document.getElementById('vs-drop');
  const controls = document.getElementById('vs-controls');
  const progressWrap = document.getElementById('vs-progress-wrap');
  const resultsWrap = document.getElementById('vs-results-wrap');
  const fileInp = document.getElementById('vs-file');
  const previewVideo = document.getElementById('vs-video-preview');

  if (dropZone) dropZone.classList.remove('hidden');
  if (controls) controls.classList.add('hidden');
  if (progressWrap) progressWrap.classList.add('hidden');
  if (resultsWrap) resultsWrap.classList.add('hidden');
  if (fileInp) fileInp.value = '';
  if (previewVideo) previewVideo.src = '';
}

/* ─────────────────────────────────────────
   Scientific Calculator Engine
───────────────────────────────────────── */
let _scState = {
  expr: '',
  memory: 0,
  mode: 'DEG',
  justEvaluated: false
};
let _scKeyBound = false;

function scFactorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function scCleanNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'Error';
  if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
  const rounded = Math.round(num * 1e12) / 1e12;
  if (Math.abs(rounded) < 1e-12 && rounded !== 0) {
    return rounded.toExponential(6);
  }
  if (Math.abs(rounded) >= 1e14 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
    return rounded.toExponential(8).replace(/\.?0+e/, 'e');
  }
  let str = rounded.toString();
  if (str.includes('.') && !str.includes('e')) {
    str = str.replace(/0+$/, '').replace(/\.$/, '');
  }
  return str;
}

function scEvaluate(rawExpr, angleMode = 'DEG') {
  if (!rawExpr || !rawExpr.trim()) return '0';
  let expr = rawExpr.trim();

  // Replace visual math symbols
  expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  expr = expr.replace(/π/g, '(Math.PI)');
  expr = expr.replace(/\be\b/g, '(Math.E)');
  expr = expr.replace(/\^/g, '**');

  // Replace factorial ! -> fact(...)
  let prev;
  do {
    prev = expr;
    expr = expr.replace(/(\d+(?:\.\d+)?|\([^()]+\))!/g, 'fact($1)');
  } while (expr !== prev);

  // Percent: if followed by op or end, divide by 100
  expr = expr.replace(/(\d+(?:\.\d+)?)%(?=[+\-*/)]|$)/g, '($1/100)');

  // Implicit multiplication: 2( -> 2*(, )3 -> )*3, 2sin -> 2*sin, etc.
  expr = expr.replace(/(\d)(\()/g, '$1*$2');
  expr = expr.replace(/(\))(\d)/g, '$1*$2');
  expr = expr.replace(/(\))(\()/g, '$1*$2');
  expr = expr.replace(/(\d)(sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs|fact)/g, '$1*$2');
  expr = expr.replace(/(Math\.PI|Math\.E)(\d)/g, '$1*$2');
  expr = expr.replace(/(\d)(Math\.PI|Math\.E)/g, '$1*$2');

  // Whitelist check
  const sanitized = expr.replace(/sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs|fact|Math\.PI|Math\.E/g, '');
  if (!/^[0-9+\-*/%.()*\s]+$/.test(sanitized)) {
    throw new Error('Invalid mathematical expression');
  }

  const isDeg = angleMode === 'DEG';
  const toRad = x => (x * Math.PI) / 180;
  const toDeg = x => (x * 180) / Math.PI;

  const sinFn = x => {
    if (isDeg) {
      const norm = ((x % 360) + 360) % 360;
      if (norm === 0 || norm === 180) return 0;
      if (norm === 90) return 1;
      if (norm === 270) return -1;
      return Math.sin(toRad(norm));
    }
    return Math.sin(x);
  };

  const cosFn = x => {
    if (isDeg) {
      const norm = ((x % 360) + 360) % 360;
      if (norm === 90 || norm === 270) return 0;
      if (norm === 0) return 1;
      if (norm === 180) return -1;
      return Math.cos(toRad(norm));
    }
    return Math.cos(x);
  };

  const tanFn = x => {
    if (isDeg) {
      const norm = ((x % 360) + 360) % 360;
      if (norm === 90 || norm === 270) return NaN;
      if (norm === 0 || norm === 180) return 0;
      if (norm === 45 || norm === 225) return 1;
      if (norm === 135 || norm === 315) return -1;
      return Math.tan(toRad(norm));
    }
    return Math.tan(x);
  };

  const asinFn = x => {
    const v = Math.asin(x);
    return isDeg ? toDeg(v) : v;
  };
  const acosFn = x => {
    const v = Math.acos(x);
    return isDeg ? toDeg(v) : v;
  };
  const atanFn = x => {
    const v = Math.atan(x);
    return isDeg ? toDeg(v) : v;
  };
  const logFn = x => Math.log10(x);
  const lnFn = x => Math.log(x);
  const sqrtFn = x => Math.sqrt(x);
  const absFn = x => Math.abs(x);
  const factFn = x => scFactorial(x);

  const fn = new Function(
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'abs', 'fact',
    `return (${expr});`
  );
  const val = fn(sinFn, cosFn, tanFn, asinFn, acosFn, atanFn, logFn, lnFn, sqrtFn, absFn, factFn);
  return scCleanNumber(val);
}

function scUpdateDisplay() {
  const disp = document.getElementById('sc_display');
  if (disp) {
    disp.value = _scState.expr || '0';
  }
  const modeBadge = document.getElementById('sc_mode_badge');
  if (modeBadge) modeBadge.textContent = _scState.mode;

  const angleBtn = document.getElementById('sc_angle_btn');
  if (angleBtn) angleBtn.textContent = _scState.mode;

  const memBadge = document.getElementById('sc_mem_badge');
  const memInd = document.getElementById('sc_mem_indicator');
  if (_scState.memory !== 0) {
    if (memBadge) memBadge.textContent = `M: ${_scState.memory}`;
    if (memInd) memInd.style.display = 'inline-block';
  } else {
    if (memBadge) memBadge.textContent = '';
    if (memInd) memInd.style.display = 'none';
  }
}

function scInit() {
  _scState.expr = '';
  _scState.justEvaluated = false;
  scUpdateDisplay();

  if (!_scKeyBound) {
    _scKeyBound = true;
    window.addEventListener('keydown', (e) => {
      const disp = document.getElementById('sc_display');
      if (!disp) return;

      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') && document.activeElement !== disp) {
        return;
      }

      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        scPress(key);
      } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '%' || key === '^' || key === '(' || key === ')' || key === '.') {
        e.preventDefault();
        scPress(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        scEquals();
      } else if (key === 'Backspace') {
        e.preventDefault();
        scBackspace();
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        e.preventDefault();
        scClear();
      }
    });
  }
}

function scPress(val) {
  if (_scState.justEvaluated) {
    if (['+', '-', '*', '/', '^', '%'].includes(val)) {
      // Continue chaining calculation
    } else {
      _scState.expr = '';
    }
    _scState.justEvaluated = false;
  }
  _scState.expr += val;
  scUpdateDisplay();
}

function scFunc(fnName) {
  if (_scState.justEvaluated) {
    _scState.expr = '';
    _scState.justEvaluated = false;
  }
  _scState.expr += fnName;
  scUpdateDisplay();
}

function scClear() {
  _scState.expr = '';
  _scState.justEvaluated = false;
  const hist = document.getElementById('sc_history');
  if (hist) hist.textContent = '';
  scUpdateDisplay();
}

function scBackspace() {
  if (_scState.justEvaluated) {
    _scState.justEvaluated = false;
  }
  const multiCharTokens = ['asin(', 'acos(', 'atan(', 'sqrt(', 'fact(', 'sin(', 'cos(', 'tan(', 'log(', 'abs(', 'ln(', '10^('];
  let removed = false;
  for (const tok of multiCharTokens) {
    if (_scState.expr.endsWith(tok)) {
      _scState.expr = _scState.expr.slice(0, -tok.length);
      removed = true;
      break;
    }
  }
  if (!removed && _scState.expr.length > 0) {
    _scState.expr = _scState.expr.slice(0, -1);
  }
  scUpdateDisplay();
}

function scToggleSign() {
  if (!_scState.expr) return;
  if (/^-?\d+(\.\d+)?$/.test(_scState.expr)) {
    if (_scState.expr.startsWith('-')) {
      _scState.expr = _scState.expr.slice(1);
    } else {
      _scState.expr = '-' + _scState.expr;
    }
  } else {
    _scState.expr = `-(${_scState.expr})`;
  }
  scUpdateDisplay();
}

function scToggleAngle() {
  _scState.mode = _scState.mode === 'DEG' ? 'RAD' : 'DEG';
  scUpdateDisplay();
  showToast(`Angle Mode: ${_scState.mode}`);
}

function scMem(action) {
  try {
    let currentVal = 0;
    if (_scState.expr) {
      const evalRes = scEvaluate(_scState.expr, _scState.mode);
      if (evalRes !== 'Error') currentVal = parseFloat(evalRes) || 0;
    }
    if (action === 'MC') {
      _scState.memory = 0;
      showToast('Memory Cleared (MC)');
    } else if (action === 'MR') {
      scPress(_scState.memory.toString());
      showToast(`Recalled Memory: ${_scState.memory}`);
    } else if (action === 'M+') {
      _scState.memory = Math.round((_scState.memory + currentVal) * 1e12) / 1e12;
      showToast(`Added to Memory: ${_scState.memory}`);
    } else if (action === 'M-') {
      _scState.memory = Math.round((_scState.memory - currentVal) * 1e12) / 1e12;
      showToast(`Subtracted from Memory: ${_scState.memory}`);
    }
    scUpdateDisplay();
  } catch (err) {
    showToast('Memory operation error');
  }
}

function scEquals() {
  if (!_scState.expr || !_scState.expr.trim()) return;

  // Auto-balance open parentheses
  let openCount = (_scState.expr.match(/\(/g) || []).length;
  let closeCount = (_scState.expr.match(/\)/g) || []).length;
  while (openCount > closeCount) {
    _scState.expr += ')';
    closeCount++;
  }

  const hist = document.getElementById('sc_history');
  const prevExpr = _scState.expr;

  try {
    const res = scEvaluate(_scState.expr, _scState.mode);
    if (hist) hist.textContent = `${prevExpr} =`;
    const disp = document.getElementById('sc_display');
    if (disp) disp.value = res;
    _scState.expr = res === 'Error' ? '' : res;
    _scState.justEvaluated = true;
  } catch (err) {
    if (hist) hist.textContent = `${prevExpr} =`;
    const disp = document.getElementById('sc_display');
    if (disp) disp.value = 'Error';
    _scState.expr = '';
    _scState.justEvaluated = true;
  }
}

function scCopyResult() {
  const disp = document.getElementById('sc_display');
  const val = disp ? disp.value : '';
  if (!val || val === '0' || val === 'Error') {
    showToast('No result to copy');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(val).then(() => {
      showToast('✓ Result copied to clipboard!');
    }).catch(() => {
      showToast(`Copied: ${val}`);
    });
  } else {
    showToast(`Result: ${val}`);
  }
}

/* ── Deep Link / Route Handler ── */
const SLUG_TO_TOOL = {
  'compound-interest-calculator': 'compound',
  'compound-calculator': 'compound',
  'compound-interest': 'compound',
  'sip-calculator': 'sip',
  'sip': 'sip',
  'mutual-fund-sip-calculator': 'sip',
  'emi-calculator': 'emi',
  'gst-calculator': 'gst',
  'age-calculator': 'age',
  'percentage-calculator': 'percentage',
  'bmi-calculator': 'bmi',
  'unit-converter': 'unit',
  'discount-calculator': 'discount',
  'tip-calculator': 'tip',
  'salary-calculator': 'salary',
  'date-difference-calculator': 'date',
  'ratio-calculator': 'ratio',
  'number-converter': 'number',
  'video-to-shorts': 'videoshorts',
  'video-shorts-splitter': 'videoshorts',
  'video-shorts': 'videoshorts',
  'image-compressor': 'imgcompress',
  'image-resizer': 'imgresize',
  'photo-resizer': 'photoresize',
  'photo-and-signature-resizer': 'photoresize',
  'image-to-pdf': 'imgtopdf',
  'pdf-merger': 'pdfmerge',
  'pdf-compressor': 'pdfcompress',
  'qr-code-generator': 'qrcode',
  'fixed-deposit-calculator': 'fd',
  'fd-calculator': 'fd',
  'fd': 'fd',
  'ppf-calculator': 'ppf',
  'public-provident-fund-calculator': 'ppf',
  'ppf': 'ppf',
  'lumpsum-calculator': 'lumpsum',
  'lump-sum-calculator': 'lumpsum',
  'lumpsum': 'lumpsum',
  'word-counter': 'wordcount',
  'character-counter': 'wordcount',
  'word-and-character-counter': 'wordcount',
  'wordcount': 'wordcount',
  'password-generator': 'password',
  'strong-password-generator': 'password',
  'password': 'password',
  'case-converter': 'caseconverter',
  'text-case-converter': 'caseconverter',
  'caseconverter': 'caseconverter',
  'base64-encode-decode': 'base64',
  'base64-converter': 'base64',
  'base64': 'base64',
  'json-formatter': 'jsonformat',
  'json-validator': 'jsonformat',
  'jsonformat': 'jsonformat',
  'color-picker': 'colorpicker',
  'color-converter': 'colorpicker',
  'colorpicker': 'colorpicker',
  'markdown-previewer': 'markdown',
  'markdown-to-html': 'markdown',
  'markdown': 'markdown',
  'scientific-calculator': 'scientific',
  'scientific': 'scientific',
};

(function checkRoute() {
  // A. Standalone Tool Page: Auto-scroll tool to top of screen
  const autoTool = content && content.dataset.tool;
  if (autoTool && ALLOWED_TOOL_IDS.has(autoTool)) {
    openTool(autoTool);
    requestAnimationFrame(() => {
      const embedCard = document.querySelector('.tool-embed-card') || content;
      if (embedCard) {
        const topPos = embedCard.getBoundingClientRect().top + window.pageYOffset - 14;
        window.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
      }
    });
    return;
  }

  // B. URL Search Params (?tool=... or ?t=... or ?q=...)
  const params = new URLSearchParams(window.location.search);
  const qParam = params.get('q') || params.get('query');
  const toolParam = params.get('tool') || params.get('t');

  if (toolParam) {
    const matchedId = SLUG_TO_TOOL[toolParam] || (ALLOWED_TOOL_IDS.has(toolParam) ? toolParam : null);
    if (matchedId) {
      openTool(matchedId);
      return;
    }
  }

  if (qParam && search) {
    search.value = qParam;
    render();
    const toolsSec = document.getElementById('tools');
    if (toolsSec) {
      toolsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // C. Path or Hash (e.g. /video-to-shorts or #photoresize)
  const path = window.location.pathname.replace(/^\/|\/$/g, '').replace(/\.html$/, '');
  const hash = window.location.hash.replace('#', '');
  const toolId = SLUG_TO_TOOL[path] || SLUG_TO_TOOL[hash] || (ALLOWED_TOOL_IDS.has(hash) ? hash : null);
  if (toolId) {
    openTool(toolId);
  }
})();

/* ─────────────────────────────────────────
   Website Open / Page Entrance Animation
───────────────────────────────────────── */
function initWebsiteOpenAnimation() {
  let beam = document.getElementById('site-open-beam');
  if (!beam) {
    beam = document.createElement('div');
    beam.id = 'site-open-beam';
    beam.setAttribute('aria-hidden', 'true');
    document.body.prepend(beam);
  }
  document.body.classList.add('page-opening');

  // Staggered high-speed loader beam (Linear / GitHub style)
  requestAnimationFrame(() => {
    beam.style.width = '38%';
    setTimeout(() => {
      beam.style.width = '78%';
      setTimeout(() => {
        beam.classList.add('beam-complete');
        setTimeout(() => {
          document.body.classList.remove('page-opening');
          if (beam && beam.parentNode) beam.remove();
        }, 500);
      }, 160);
    }, 120);
  });

  // Smooth internal route transition on link click
  document.querySelectorAll('a[href^="/"]:not([target="_blank"]):not([href^="/#"])').forEach(link => {
    link.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
      const href = link.getAttribute('href');
      if (!href || href === '/' || href.startsWith('/#')) return;
      document.body.classList.add('page-leaving');
    });
  });
}

/* ─────────────────────────────────────────
   Cookie Consent Banner (AdSense & GDPR Compliance)
───────────────────────────────────────── */
function initCookieConsent() {
  if (typeof localStorage === 'undefined' || localStorage.getItem('tb_cookie_consent')) return;
  const banner = document.createElement('div');
  banner.id = 'tb-cookie-banner';
  banner.className = 'tb-cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie and Privacy Notice');
  banner.innerHTML = `
    <div class="tb-cookie-content">
      <div class="tb-cookie-icon" aria-hidden="true">🍪</div>
      <div class="tb-cookie-text">
        <strong>Privacy &amp; Cookie Choices:</strong> We use essential local storage to remember your visual preferences. Our advertising partners (including Google AdSense) may use cookies to serve relevant ads to keep our tools free. See our <a href="/privacy" style="color:var(--accent); text-decoration:underline;">Privacy Policy</a>.
      </div>
      <div class="tb-cookie-actions">
        <button type="button" class="tb-cookie-btn tb-cookie-accept" onclick="tbAcceptCookies()">Accept All</button>
        <button type="button" class="tb-cookie-btn tb-cookie-decline" onclick="tbDeclineCookies()">Necessary Only</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
}

function tbAcceptCookies() {
  try { localStorage.setItem('tb_cookie_consent', 'accepted'); } catch (_) {}
  const b = document.getElementById('tb-cookie-banner');
  if (b) b.remove();
}

function tbDeclineCookies() {
  try { localStorage.setItem('tb_cookie_consent', 'declined'); } catch (_) {}
  const b = document.getElementById('tb-cookie-banner');
  if (b) b.remove();
}
