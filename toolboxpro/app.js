'use strict';

/* ─────────────────────────────────────────
   Custom Cursor & Fluid Animation
───────────────────────────────────────── */
const cursorDot = document.getElementById('cursor-dot');
const cursorOutline = document.getElementById('cursor-outline');
const fluidCanvas = document.getElementById('fluid-canvas');
let fluidCtx = fluidCanvas ? fluidCanvas.getContext('2d') : null;
let fluidParticles = [];

if (fluidCanvas) {
  const resizeCanvas = () => {
    fluidCanvas.width = window.innerWidth;
    fluidCanvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

function addFluid(x, y) {
  if (!fluidCtx || !window.matchMedia('(pointer: fine)').matches) return;
  fluidParticles.push({
    x: x, y: y,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    life: 1,
    size: Math.random() * 15 + 8
  });
}

function updateFluid() {
  if (!fluidCtx) return;
  if (fluidParticles.length === 0) return;
  fluidCtx.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);
  for (let i = 0; i < fluidParticles.length; i++) {
    let p = fluidParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    p.size *= 0.95;
    
    fluidCtx.beginPath();
    fluidCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    fluidCtx.fillStyle = `rgba(91, 79, 255, ${p.life * 0.4})`;
    fluidCtx.fill();
  }
  fluidParticles = fluidParticles.filter(p => p.life > 0);
  if (fluidParticles.length === 0) {
    fluidCtx.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);
  }
}

if (cursorOutline) {
  let mouseX = 0;
  let mouseY = 0;
  let dotX = 0;
  let dotY = 0;
  let outlineX = 0;
  let outlineY = 0;
  let isTouch = false;

  window.addEventListener('touchstart', () => {
    isTouch = true;
  }, { passive: true });

  window.addEventListener('mousemove', (e) => {
    if (isTouch) return;
    mouseX = e.clientX;
    mouseY = e.clientY;
    addFluid(mouseX, mouseY); // Trail on mouse move too!

    
    // Check if hovering over interactive elements
    const target = e.target;
    const isInteractive = target.closest('a, button, input, select, textarea, [role="button"], [tabindex="0"]');
    if (isInteractive) {
      cursorOutline.classList.add('hover');
    } else {
      cursorOutline.classList.remove('hover');
    }
  });

  let currentAngle = 0;

  const animateCursor = () => {
    // Fast follow for dot
    dotX += (mouseX - dotX) * 0.6;
    dotY += (mouseY - dotY) * 0.6;
    
    const dx = mouseX - outlineX;
    const dy = mouseY - outlineY;
    
    // Smooth, slightly delayed follow for outline
    outlineX += dx * 0.15;
    outlineY += dy * 0.15;
    
    // Calculate angle for fish to point towards movement
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      // SVG points right by default.
      const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      // Smooth rotation (handling wrap-around)
      let diff = targetAngle - currentAngle;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      currentAngle += diff * 0.15;
    }
    
    if (cursorDot) cursorDot.style.transform = `translate(calc(${dotX}px - 50%), calc(${dotY}px - 50%))`;
    cursorOutline.style.transform = `translate(calc(${outlineX}px - 50%), calc(${outlineY}px - 50%)) rotate(${currentAngle}deg)`;
    
    updateFluid();
    requestAnimationFrame(animateCursor);
  };
  
  // Start animation loop
  requestAnimationFrame(animateCursor);
}

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
  'photoresize','imgtopdf','pdfmerge','pdfcompress','qrcode'
]);

/** Max file size accepted by image tools: 25 MB */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** Allowed MIME types for image tools */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg','image/png','image/webp','image/gif','image/bmp', 'image/jpg', 'image/svg+xml'
]);


/* ─────────────────────────────────────────
   Tool Registry
───────────────────────────────────────── */
const TOOLS = [
  { id: 'age',         name: 'Age Calculator',             icon: '🎂', cat: 'utility', desc: 'Calculate your exact age from your date of birth.' },
  { id: 'emi',         name: 'EMI Calculator',              icon: '💰', cat: 'finance', desc: 'Calculate monthly EMI, interest and total payment.' },
  { id: 'percentage',  name: 'Percentage Calculator',       icon: '％', cat: 'math',    desc: 'Find percentage, increase and decrease quickly.' },
  { id: 'gst',         name: 'GST Calculator',              icon: '🧾', cat: 'finance', desc: 'Add or remove GST from any amount.' },
  { id: 'unit',        name: 'Unit Converter',              icon: '📏', cat: 'utility', desc: 'Convert length, weight and temperature.' },
  { id: 'bmi',         name: 'BMI Calculator',              icon: '⚖️',  cat: 'utility', desc: 'Check BMI using your height and weight.' },
  { id: 'discount',    name: 'Discount Calculator',         icon: '🏷️',  cat: 'finance', desc: 'Calculate sale price and savings.' },
  { id: 'tip',         name: 'Tip Calculator',              icon: '🍽️',  cat: 'finance', desc: 'Calculate tip and split a bill.' },
  { id: 'ratio',       name: 'Ratio Calculator',            icon: '🔢', cat: 'math',    desc: 'Simplify and calculate ratios.' },
  { id: 'number',      name: 'Number Converter',            icon: '🔁', cat: 'math',    desc: 'Convert numbers between common formats.' },
  { id: 'date',        name: 'Date Difference',             icon: '📅', cat: 'utility', desc: 'Find the number of days between two dates.' },
  { id: 'salary',      name: 'Salary Calculator',           icon: '💵', cat: 'finance', desc: 'Estimate monthly and annual salary breakdown.' },
  { id: 'pdfmerge',    name: 'PDF Merger',                  icon: '📑', cat: 'pdf',     desc: 'Merge multiple PDF files in your preferred order.' },
  { id: 'imgcompress', name: 'Image Compressor',           icon: '🗜️', cat: 'image',   desc: 'Compress JPG, PNG & WebP images with custom quality & before/after preview.' },
  { id: 'photoresize', name: 'Photo & Signature Resizer',   icon: '✍️', cat: 'image',   desc: 'Resize photos & signatures to exact px dimensions or target KB file size.' },
  { id: 'imgresize',   name: 'Image Resizer',              icon: '🖼️', cat: 'image',   desc: 'Resize images to exact dimensions or by percentage.' },
  { id: 'imgtopdf',    name: 'Image to PDF Converter',      icon: '📄', cat: 'pdf',     desc: 'Convert multiple images into a PDF with A4/Letter size & margins.' },
  { id: 'pdfcompress', name: 'PDF Compressor',             icon: '🗜️', cat: 'pdf',     desc: 'Compress PDF files directly in your browser.' },
  { id: 'qrcode',      name: 'QR Code Generator',          icon: '📱', cat: 'utility', desc: 'Generate custom QR codes for URLs, text, Wi-Fi & email.' },
];

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
const searchDropdown = document.getElementById('search-dropdown');

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
  themeBtn.textContent = dark ? '☀' : '☾';
  themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  try { localStorage.setItem('tbp-theme', dark ? 'dark' : 'light'); } catch (_) {}
}

// Restore saved theme or respect system preference
(function initTheme() {
  let saved;
  try { saved = localStorage.getItem('tbp-theme'); } catch (_) {}
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || (!saved && prefersDark));
})();

themeBtn.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark')));

/* ─────────────────────────────────────────
   Grid Rendering
───────────────────────────────────────── */
function render() {
  if (!grid) return;
  const q = search ? search.value.toLowerCase().trim() : '';
  const list = TOOLS.filter(t =>
    (category === 'all' || t.cat === category) &&
    (t.name + ' ' + t.desc).toLowerCase().includes(q)
  );

  grid.innerHTML = list.map((t, idx) => `
    <article
      class="tool reveal"
      data-reveal="fade-up"
      style="transition-delay: ${(idx % 8) * 80}ms;"
      role="listitem"
      tabindex="0"
      data-id="${t.id}"
      data-cat="${t.cat}"
      aria-label="Open ${t.name}"
    >
      <div class="tool-icon" aria-hidden="true">${t.icon}</div>
      <h3>${t.name}</h3>
      <p>${t.desc}</p>
      <span class="tool-arrow" aria-hidden="true">Open tool →</span>
    </article>
  `).join('');

  if (count) count.textContent = `${list.length} tool${list.length !== 1 ? 's' : ''}`;
  if (empty) empty.classList.toggle('hidden', list.length > 0);

  // Attach click + keyboard handlers to each card
  grid.querySelectorAll('.tool').forEach(card => {
    card.addEventListener('click', () => openTool(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTool(card.dataset.id); }
    });
  });

  // Re-observe newly rendered cards for scroll reveal
  if (typeof observeRevealElements === 'function') {
    observeRevealElements(grid);
  }
}

/* ─────────────────────────────────────────
   Search & Filter with Interactive Live Dropdown
───────────────────────────────────────── */
let activeSearchIndex = -1;

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
  const safeText = escapeHtml(text);
  return safeText.replace(regex, '<mark class="search-match-highlight">$1</mark>');
}

function closeSearchDropdown() {
  if (!searchDropdown) return;
  searchDropdown.classList.add('hidden');
  searchDropdown.innerHTML = '';
  activeSearchIndex = -1;
  if (search) search.setAttribute('aria-expanded', 'false');
}

function updateSearchDropdown() {
  if (!search || !searchDropdown) return;
  const q = search.value.trim().toLowerCase();

  if (!q) {
    closeSearchDropdown();
    return;
  }

  const matchingTools = TOOLS.filter(t =>
    (t.name + ' ' + t.desc).toLowerCase().includes(q)
  );

  activeSearchIndex = -1;
  search.setAttribute('aria-expanded', 'true');

  if (matchingTools.length === 0) {
    searchDropdown.innerHTML = `
      <div class="search-empty-state" role="status">
        <span aria-hidden="true">🔍</span>
        No tools match "<strong>${escapeHtml(q)}</strong>". Try checking all categories below.
      </div>
    `;
    searchDropdown.classList.remove('hidden');
    return;
  }

  searchDropdown.innerHTML = matchingTools.map((tool, idx) => `
    <div
      class="search-item"
      role="option"
      id="search-opt-${idx}"
      data-id="${tool.id}"
      data-index="${idx}"
      tabindex="-1"
      aria-selected="false"
    >
      <div class="search-item-icon" aria-hidden="true">${tool.icon}</div>
      <div class="search-item-text">
        <span class="search-item-title">${highlightMatch(tool.name, q)}</span>
        <span class="search-item-desc">${highlightMatch(tool.desc, q)}</span>
      </div>
      <span class="search-item-cat">${escapeHtml(tool.cat)}</span>
    </div>
  `).join('');

  searchDropdown.classList.remove('hidden');

  // Attach click handler to each item in dropdown
  searchDropdown.querySelectorAll('.search-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      // Use mousedown to trigger before input blur
      e.preventDefault();
      const toolId = item.dataset.id;
      closeSearchDropdown();
      if (search) search.blur();
      openTool(toolId);
    });
  });
}

function selectDropdownItem(newIndex) {
  if (!searchDropdown || searchDropdown.classList.contains('hidden')) return;
  const items = searchDropdown.querySelectorAll('.search-item');
  if (items.length === 0) return;

  items.forEach(el => {
    el.classList.remove('is-selected');
    el.setAttribute('aria-selected', 'false');
  });

  if (newIndex >= 0 && newIndex < items.length) {
    activeSearchIndex = newIndex;
    const target = items[activeSearchIndex];
    target.classList.add('is-selected');
    target.setAttribute('aria-selected', 'true');
    target.scrollIntoView({ block: 'nearest' });
    search.setAttribute('aria-activedescendant', target.id);
  } else {
    activeSearchIndex = -1;
    search.removeAttribute('aria-activedescendant');
  }
}

if (search) {
  search.addEventListener('input', () => {
    render();
    updateSearchDropdown();
  });

  search.addEventListener('focus', () => {
    if (search.value.trim().length > 0) {
      updateSearchDropdown();
    }
  });

  search.addEventListener('blur', () => {
    // Delay slightly so clicks on items register
    setTimeout(closeSearchDropdown, 200);
  });

  search.addEventListener('search', () => {
    render();
    updateSearchDropdown();
  });

  search.addEventListener('keydown', e => {
    if (searchDropdown && !searchDropdown.classList.contains('hidden')) {
      const items = searchDropdown.querySelectorAll('.search-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = activeSearchIndex + 1 >= items.length ? 0 : activeSearchIndex + 1;
        selectDropdownItem(next);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeSearchIndex - 1 < 0 ? items.length - 1 : activeSearchIndex - 1;
        selectDropdownItem(prev);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSearchIndex >= 0 && activeSearchIndex < items.length) {
          const selectedId = items[activeSearchIndex].dataset.id;
          closeSearchDropdown();
          search.blur();
          openTool(selectedId);
          return;
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearchDropdown();
        return;
      }
    }

    // Default Enter key: open top filtered tool if dropdown wasn't navigated
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = search.value.toLowerCase().trim();
      const list = TOOLS.filter(t =>
        (category === 'all' || t.cat === category) &&
        (t.name + ' ' + t.desc).toLowerCase().includes(q)
      );
      if (list.length > 0) {
        closeSearchDropdown();
        openTool(list[0].id);
      }
    }
  });
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  if (search && !search.contains(e.target) && searchDropdown && !searchDropdown.contains(e.target)) {
    closeSearchDropdown();
  }
});

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

/* ─────────────────────────────────────────
   Modal
───────────────────────────────────────── */
function openTool(id) {
  // Validate id against known allowlist to prevent prototype pollution / unexpected renders
  if (!ALLOWED_TOOL_IDS.has(id)) return;
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;

  previousFocus = document.activeElement;
  content.innerHTML = buildForm(id, tool);
  if (modal) {
    modal.classList.remove('hidden');
    modal.removeAttribute('aria-hidden');
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
}

function closeModal() {
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  try {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  } catch (_) {}
  if (previousFocus) previousFocus.focus();
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
function copyResult(text, btnElement = null) {
  // Rate-limit: one copy per 1 s to prevent spam
  const now = Date.now();
  if (now - _copyLastMs < 1000) return;
  _copyLastMs = now;

  if (!navigator.clipboard) {
    showToast('⚠️ Clipboard not available');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast('✓ Copied to clipboard!');
    if (btnElement) {
      btnElement.classList.add('copied');
      const originalText = btnElement.textContent;
      btnElement.textContent = '✓ Copied!';
      setTimeout(() => {
        btnElement.classList.remove('copied');
        btnElement.textContent = originalText;
      }, 1800);
    }
  });
}

/* ─────────────────────────────────────────
   Result Renderer
───────────────────────────────────────── */
function showResult(html, plainText) {
  const res = document.getElementById('res');
  res.innerHTML = `
    ${html}
    <button class="copy-btn" aria-label="Copy result" title="Copy result">Copy</button>
  `;
  res.classList.remove('hidden');
  const btn = res.querySelector('.copy-btn');
  btn.addEventListener('click', () => copyResult(plainText || res.innerText.replace('Copy', '').trim(), btn));
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

    emi: `
      <h2>💰 EMI Calculator</h2>
      <div class="form">
        <div><label for="loan">Loan amount (₹)</label><input id="loan" type="number" min="1" placeholder="500000" aria-required="true"/></div>
        <div><label for="rate">Annual interest rate (%)</label><input id="rate" type="number" step="0.1" min="0.1" placeholder="8.5" aria-required="true"/></div>
        <div><label for="years">Tenure (years)</label><input id="years" type="number" min="1" placeholder="5" aria-required="true"/></div>
        <button class="primary" type="button" onclick="calcEmi()">Calculate EMI</button>
        <div id="res" class="result hidden"></div>
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
      <h2>📏 Unit Converter</h2>
      <div class="form">
        <div><label for="unit_val">Value</label><input id="unit_val" type="number" placeholder="10" aria-required="true"/></div>
        <div><label for="unit_from">From</label>
          <select id="unit_from" aria-required="true">
            <optgroup label="Length"><option value="m">Meters</option><option value="km">Kilometers</option><option value="ft">Feet</option><option value="in">Inches</option><option value="mi">Miles</option></optgroup>
            <optgroup label="Weight"><option value="kg">Kilograms</option><option value="g">Grams</option><option value="lb">Pounds</option><option value="oz">Ounces</option></optgroup>
            <optgroup label="Temperature"><option value="c">Celsius</option><option value="f">Fahrenheit</option><option value="k">Kelvin</option></optgroup>
          </select>
        </div>
        <div><label for="unit_to">To</label>
          <select id="unit_to" aria-required="true">
            <optgroup label="Length"><option value="ft">Feet</option><option value="m">Meters</option><option value="km">Kilometers</option><option value="in">Inches</option><option value="mi">Miles</option></optgroup>
            <optgroup label="Weight"><option value="lb">Pounds</option><option value="kg">Kilograms</option><option value="g">Grams</option><option value="oz">Ounces</option></optgroup>
            <optgroup label="Temperature"><option value="f">Fahrenheit</option><option value="c">Celsius</option><option value="k">Kelvin</option></optgroup>
          </select>
        </div>
        <button class="primary" type="button" onclick="calcUnit()">Convert</button>
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
      <p>Reduce image file size while preserving visual quality. Fully processed in your browser — zero server uploads.</p>
      <div class="form">
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
          <p>Drag &amp; drop an image here<br><small>or click to browse</small></p>
          <p class="drop-formats">Supports JPG, JPEG, PNG, WebP</p>
        </div>
        <input id="ic-file" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" aria-hidden="true" onchange="icLoadFile(this.files[0])"/>
        <div id="ic-preview-wrap" class="img-preview-wrap hidden">
          <div class="img-preview-pair">
            <div class="img-preview-panel">
              <div class="img-preview-label">Original</div>
              <img id="ic-orig-img" alt="Original image preview" />
              <div id="ic-orig-info" class="img-info"></div>
            </div>
            <div class="img-preview-panel">
              <div class="img-preview-label">Compressed</div>
              <img id="ic-comp-img" alt="Compressed image preview" />
              <div id="ic-comp-info" class="img-info"></div>
            </div>
          </div>
          <div class="img-slider-wrap">
            <label for="ic-quality" class="img-slider-label">
              Quality: <span id="ic-quality-val">80</span>%
            </label>
            <input id="ic-quality" type="range" min="5" max="100" value="80" class="img-slider" oninput="icUpdateQuality(this.value)" aria-label="Compression quality"/>
            <div class="img-slider-ticks"><span>Maximum Compression</span><span>Balanced</span><span>Highest Quality</span></div>
          </div>
          <div class="img-format-row">
            <label for="ic-format">Output format</label>
            <select id="ic-format" onchange="icCompress()" aria-label="Output image format">
              <option value="image/jpeg">JPEG / JPG</option>
              <option value="image/webp">WebP</option>
              <option value="image/png">PNG</option>
            </select>
          </div>
          <button class="primary" type="button" id="ic-download-btn" onclick="icDownload()">⬇ Download Compressed Image</button>
          <button class="secondary-btn" type="button" onclick="icReset()">↩ Choose Another Image</button>
          <p class="info-note">💡 <strong>Note:</strong> Compression results vary based on image content and format. Lossless formats like PNG may have higher file sizes with photorealistic scenes.</p>
        </div>
      </div>`,

    /* Tool 3: Photo & Signature Resizer */
    photoresize: `
      <h2>✍️ Photo &amp; Signature Resizer</h2>
      <p>Resize photos and signatures to custom dimensions or target file size in KB for exam portals, jobs, and IDs.</p>
      <div class="form">
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

          <label style="margin-top:10px;">Configurable Presets (Common Indian Exam Guidelines):</label>
          <div class="presets-container">
            <button class="preset-chip" type="button" onclick="prApplyPreset('passport')">Passport Photo (200x230, ~50KB)</button>
            <button class="preset-chip" type="button" onclick="prApplyPreset('signature')">Signature (140x60, ~20KB)</button>
            <button class="preset-chip" type="button" onclick="prApplyPreset('ssc_photo')">SSC Photo (100x120, ~40KB)</button>
            <button class="preset-chip" type="button" onclick="prApplyPreset('upsc_photo')">UPSC Photo (350x350, ~100KB)</button>
            <button class="preset-chip" type="button" onclick="prApplyPreset('thumb')">Thumb Impression (140x140, ~30KB)</button>
          </div>
          <p style="font-size:11px; color:var(--muted); margin-bottom:12px;">* Presets are configurable references; please verify official notification guidelines for your specific exam.</p>

          <div class="resize-dim-row">
            <div>
              <label for="pr-w">Width (px)</label>
              <input id="pr-w" type="number" min="10" placeholder="200" aria-required="true" oninput="prSyncDim('w')"/>
            </div>
            <div class="resize-lock" id="pr-lock-btn" onclick="prToggleLock()" title="Lock aspect ratio" aria-label="Lock aspect ratio" role="button" tabindex="0" onkeydown="if(event.key==='Enter')prToggleLock()">
              🔒
            </div>
            <div>
              <label for="pr-h">Height (px)</label>
              <input id="pr-h" type="number" min="10" placeholder="230" aria-required="true" oninput="prSyncDim('h')"/>
            </div>
          </div>

          <div class="tool-options-grid">
            <div>
              <label for="pr-max-kb">Target Max Size (KB, optional)</label>
              <input id="pr-max-kb" type="number" min="5" max="2048" placeholder="e.g. 50" aria-label="Target file size in KB"/>
            </div>
            <div>
              <label for="pr-format">Format</label>
              <select id="pr-format">
                <option value="image/jpeg">JPG / JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
          </div>

          <button class="primary" type="button" onclick="prResize()">Generate Resized Photo/Signature</button>

          <div id="pr-preview-wrap" class="img-preview-wrap hidden" style="margin-top:16px;">
            <div class="img-preview-panel" style="margin: 0 auto; max-width: 320px; text-align: center;">
              <div class="img-preview-label">Output Preview</div>
              <img id="pr-out-img" alt="Resized output preview" style="max-height:180px; margin:0 auto;" />
              <div id="pr-out-info" class="img-info" style="margin-top:8px; font-weight:600;"></div>
            </div>
            <button class="primary" type="button" id="pr-download-btn" onclick="prDownload()">⬇ Download File</button>
          </div>
          <button class="secondary-btn" type="button" onclick="prReset()" style="margin-top:8px;">↩ Choose Another File</button>
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
      <h2>🖼️ Image Resizer</h2>
      <p>Resize images to exact pixel dimensions or by percentage — no quality loss for PNG. Works entirely in your browser.</p>
      <div class="form">
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
          <div class="drop-icon" aria-hidden="true">📂</div>
          <p>Drag &amp; drop an image here<br><small>or click to browse</small></p>
          <p class="drop-formats">Supports JPEG, PNG, WebP, GIF, BMP</p>
        </div>
        <input id="ir-file" type="file" accept="image/*" class="sr-only" aria-hidden="true" onchange="irLoadFile(this.files[0])"/>
        <div id="ir-controls" class="hidden">
          <div id="ir-orig-info" class="img-orig-info"></div>
          <div class="resize-mode-tabs" role="group" aria-label="Resize mode">
            <button id="ir-tab-px" class="resize-tab active" type="button" onclick="irSwitchMode('px')" aria-pressed="true">Pixels</button>
            <button id="ir-tab-pct" class="resize-tab" type="button" onclick="irSwitchMode('pct')" aria-pressed="false">Percentage</button>
          </div>
          <div id="ir-px-mode">
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
            <label for="ir-pct">Scale (%)</label>
            <input id="ir-pct" type="number" min="1" max="1000" value="50" placeholder="50" aria-required="true"/>
          </div>
          <div class="img-format-row">
            <label for="ir-format">Output format</label>
            <select id="ir-format" aria-label="Output image format">
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>
          <button class="primary" type="button" onclick="irResize()">Resize Image</button>
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
        </div>
      </div>`,

    pdfcompress: `
      <h2>🗜️ PDF Compressor</h2>
      <p>Reduce PDF file size. Note: Client-side compression works best for text-heavy or unoptimized PDFs.</p>
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
          <p>Drag &amp; drop a PDF here<br><small>or click to browse</small></p>
          <p class="drop-formats">Supports PDF</p>
        </div>
        <input id="pc-file" type="file" accept="application/pdf" class="sr-only" aria-hidden="true" onchange="pcLoadFile(this.files[0])"/>
        
        <div id="pc-preview-wrap" class="img-preview-wrap hidden">
          <div class="img-preview-panel" style="margin: 0 auto; width: 100%;">
             <div id="pc-info" class="img-info" style="margin-bottom: 1rem; font-size: 1.1em; color: var(--text);"></div>
          </div>
          <button class="primary" type="button" id="pc-compress-btn" onclick="pcCompress()">🗜️ Compress PDF</button>
          <button class="primary" type="button" id="pc-download-btn" style="display:none" onclick="pcDownload()">⬇ Download Compressed PDF</button>
          <button class="secondary-btn" type="button" onclick="pcReset()">↩ Choose Another PDF</button>
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

function calcEmi() {
  safeCalc(() => {
    const p = getPositive('loan', 'loan amount');
    const r = getPositive('rate', 'interest rate') / 1200;
    const n = getPositive('years', 'tenure') * 12;
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - p;
    const plain = `EMI ₹${emi.toFixed(0)}/month — Total ₹${total.toFixed(0)} — Interest ₹${interest.toFixed(0)}`;
    showResult(
      `₹${fmt(emi.toFixed(0))} <small>/ month<br>Total: ₹${fmt(total.toFixed(0))} &nbsp;|&nbsp; Interest: ₹${fmt(interest.toFixed(0))}</small>`,
      plain
    );
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

/* Unit conversion table — all values in SI base units */
const UNIT_TO_SI = {
  // Length (SI: meters)
  m: 1, km: 1000, ft: 0.3048, 'in': 0.0254, mi: 1609.344,
  // Weight (SI: kilograms)
  kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495,
  // Temperature handled separately
  c: null, f: null, k: null,
};

function toSI(val, unit) {
  if (unit === 'c') return val;
  if (unit === 'f') return (val - 32) * 5 / 9;
  if (unit === 'k') return val - 273.15;
  return val * UNIT_TO_SI[unit];
}

function fromSI(val, unit) {
  if (unit === 'c') return val;
  if (unit === 'f') return val * 9 / 5 + 32;
  if (unit === 'k') return val + 273.15;
  return val / UNIT_TO_SI[unit];
}

const TEMP_UNITS = new Set(['c', 'f', 'k']);
const LEN_UNITS  = new Set(['m', 'km', 'ft', 'in', 'mi']);
const WGHT_UNITS = new Set(['kg', 'g', 'lb', 'oz']);

const UNIT_LABELS = { m:'m', km:'km', ft:'ft', 'in':'in', mi:'mi', kg:'kg', g:'g', lb:'lb', oz:'oz', c:'°C', f:'°F', k:'K' };

function unitGroup(u) {
  if (TEMP_UNITS.has(u)) return 'temp';
  if (LEN_UNITS.has(u)) return 'length';
  if (WGHT_UNITS.has(u)) return 'weight';
  return null;
}

function calcUnit() {
  safeCalc(() => {
    const val = getNum('unit_val', 'value');
    const from = document.getElementById('unit_from').value;
    const to   = document.getElementById('unit_to').value;
    if (unitGroup(from) !== unitGroup(to)) return showError('Cannot convert between different unit types (e.g. length ↔ weight).');
    const si = toSI(val, from);
    const result = fromSI(si, to);
    const plain = `${val} ${UNIT_LABELS[from]} = ${+result.toFixed(6)} ${UNIT_LABELS[to]}`;
    showResult(`${val} ${UNIT_LABELS[from]} = <b>${+result.toFixed(6)}</b> ${UNIT_LABELS[to]}`, plain);
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
let _icImg = null;      // HTMLImageElement
let _icOrigFile = null; // original File object
let _icCompBlob = null; // latest compressed Blob

function icHandleDrop(e) {
  e.preventDefault();
  document.getElementById('ic-drop').classList.remove('drag-over');
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
      document.getElementById('ic-orig-info').textContent =
        `${img.naturalWidth} × ${img.naturalHeight}px — ${fmtBytes(file.size)}`;
      // Auto-detect format
      const fmt = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      document.getElementById('ic-format').value = fmt;
      icCompress();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function icUpdateQuality(val) {
  document.getElementById('ic-quality-val').textContent = val;
  icCompress();
}

function icCompress() {
  if (!_icImg) return;
  const quality = parseInt(document.getElementById('ic-quality').value, 10) / 100;
  const format  = document.getElementById('ic-format').value;
  const canvas  = document.createElement('canvas');
  canvas.width  = _icImg.naturalWidth;
  canvas.height = _icImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(_icImg, 0, 0);
  
  canvas.toBlob((blob) => {
    if (!blob) {
      showToast('⚠️ Could not generate image in this format.');
      return;
    }
    _icCompBlob = blob;
    const url = URL.createObjectURL(blob);
    const compImg = document.getElementById('ic-comp-img');
    if (compImg._prevUrl) URL.revokeObjectURL(compImg._prevUrl);
    compImg._prevUrl = url;
    compImg.src = url;
    const savings = ((_icOrigFile.size - blob.size) / _icOrigFile.size * 100);
    const isSmaller = savings > 0;
    document.getElementById('ic-comp-info').innerHTML =
      `${_icImg.naturalWidth} × ${_icImg.naturalHeight}px — ${fmtBytes(blob.size)}
       <span class="img-savings ${isSmaller ? 'positive' : 'negative'}">
         ${isSmaller ? '↓ ' + savings.toFixed(1) + '% smaller' : '↑ ' + Math.abs(savings).toFixed(1) + '% larger'}
       </span>`;
    document.getElementById('ic-download-btn').style.display = 'block';
  }, format, format === 'image/png' ? undefined : quality);
}

function icDownload() {
  if (!_icCompBlob) return;
  const format = document.getElementById('ic-format').value;
  let ext = 'jpg';
  if (format === 'image/png') ext = 'png';
  if (format === 'image/webp') ext = 'webp';
  const origName = _icOrigFile ? _icOrigFile.name.replace(/\.[^.]+$/, '') : 'image';
  const a = document.createElement('a');
  const url = URL.createObjectURL(_icCompBlob);
  a.href = url;
  a.download = `${origName}-compressed.${ext}`;
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
  _icImg = null; _icOrigFile = null;
  document.getElementById('ic-drop').classList.remove('hidden');
  document.getElementById('ic-preview-wrap').classList.add('hidden');
  document.getElementById('ic-file').value = '';
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
let _prOutBlob = null;
let _prLocked = true;

function prHandleDrop(e) {
  e.preventDefault();
  document.getElementById('pr-drop').classList.remove('drag-over');
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
      document.getElementById('pr-drop').classList.add('hidden');
      document.getElementById('pr-controls').classList.remove('hidden');
      document.getElementById('pr-orig-info').innerHTML =
        `<strong>${escapeHtml(file.name)}</strong>: ${img.naturalWidth} × ${img.naturalHeight}px (${fmtBytes(file.size)})`;
      document.getElementById('pr-w').value = img.naturalWidth;
      document.getElementById('pr-h').value = img.naturalHeight;
      document.getElementById('pr-preview-wrap').classList.add('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function prToggleLock() {
  _prLocked = !_prLocked;
  const btn = document.getElementById('pr-lock-btn');
  btn.textContent = _prLocked ? '🔒' : '🔓';
  btn.title = _prLocked ? 'Lock aspect ratio' : 'Unlock aspect ratio';
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

function prApplyPreset(type) {
  if (!_prImg) {
    showToast('Please upload an image first.');
    return;
  }
  _prLocked = false;
  document.getElementById('pr-lock-btn').textContent = '🔓';

  if (type === 'passport') {
    document.getElementById('pr-w').value = 200;
    document.getElementById('pr-h').value = 230;
    document.getElementById('pr-max-kb').value = 50;
  } else if (type === 'signature') {
    document.getElementById('pr-w').value = 140;
    document.getElementById('pr-h').value = 60;
    document.getElementById('pr-max-kb').value = 20;
  } else if (type === 'ssc_photo') {
    document.getElementById('pr-w').value = 100;
    document.getElementById('pr-h').value = 120;
    document.getElementById('pr-max-kb').value = 40;
  } else if (type === 'upsc_photo') {
    document.getElementById('pr-w').value = 350;
    document.getElementById('pr-h').value = 350;
    document.getElementById('pr-max-kb').value = 100;
  } else if (type === 'thumb') {
    document.getElementById('pr-w').value = 140;
    document.getElementById('pr-h').value = 140;
    document.getElementById('pr-max-kb').value = 30;
  }
  showToast('Applied preset dimensions!');
}

async function prResize() {
  if (!_prImg) {
    showToast('Please upload an image first.');
    return;
  }
  const w = parseInt(document.getElementById('pr-w').value, 10);
  const h = parseInt(document.getElementById('pr-h').value, 10);
  if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
    showToast('Please enter valid positive width and height.');
    return;
  }

  const targetKb = parseFloat(document.getElementById('pr-max-kb').value);
  const format = document.getElementById('pr-format').value;

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

  async function getBlobAtQuality(q) {
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), format, format === 'image/png' ? undefined : q);
    });
  }

  let finalBlob;
  if (!isNaN(targetKb) && targetKb > 0 && format === 'image/jpeg') {
    // Binary search for target file size
    let minQ = 0.05, maxQ = 0.98;
    let bestBlob = await getBlobAtQuality(minQ);
    for (let iter = 0; iter < 6; iter++) {
      const midQ = (minQ + maxQ) / 2;
      const b = await getBlobAtQuality(midQ);
      if (b.size / 1024 <= targetKb) {
        bestBlob = b;
        minQ = midQ; // try to get higher quality that fits
      } else {
        maxQ = midQ;
      }
    }
    finalBlob = bestBlob;
  } else {
    finalBlob = await getBlobAtQuality(0.92);
  }

  _prOutBlob = finalBlob;
  const url = URL.createObjectURL(finalBlob);
  const outImg = document.getElementById('pr-out-img');
  if (outImg._prevUrl) URL.revokeObjectURL(outImg._prevUrl);
  outImg._prevUrl = url;
  outImg.src = url;

  const kbSize = (finalBlob.size / 1024).toFixed(1);
  document.getElementById('pr-out-info').textContent =
    `Output: ${w} × ${h}px — ${kbSize} KB (${finalBlob.size} bytes)`;
  document.getElementById('pr-preview-wrap').classList.remove('hidden');
  showToast('✓ Photo/Signature generated!');
}

function prDownload() {
  if (!_prOutBlob) return;
  const format = document.getElementById('pr-format').value;
  const ext = format === 'image/png' ? 'png' : 'jpg';
  const origName = _prOrigFile ? _prOrigFile.name.replace(/\.[^.]+$/, '') : 'photo';
  const a = document.createElement('a');
  const url = URL.createObjectURL(_prOutBlob);
  a.href = url;
  a.download = `${origName}-${document.getElementById('pr-w').value}x${document.getElementById('pr-h').value}.${ext}`;
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
  document.getElementById('pr-drop').classList.remove('hidden');
  document.getElementById('pr-controls').classList.add('hidden');
  document.getElementById('pr-file').value = '';
}

/* ─────────────────────────────────────────
   Tool 4: Multi-Image to PDF Converter
───────────────────────────────────────── */
let _i2pFiles = [];

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

    doc.save(`images-${Date.now()}.pdf`);
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
   PDF Compressor Functions
───────────────────────────────────────── */
let pcCurrentFile = null;
let pcCompressedBlob = null;

function pcHandleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    pcLoadFile(e.dataTransfer.files[0]);
  }
}

function pcLoadFile(file) {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    return showError('Please select a valid PDF file.');
  }
  pcCurrentFile = file;
  pcCompressedBlob = null;
  
  document.getElementById('pc-drop').classList.add('hidden');
  const wrap = document.getElementById('pc-preview-wrap');
  wrap.classList.remove('hidden');
  
  const mb = (file.size / (1024*1024)).toFixed(2);
  document.getElementById('pc-info').innerHTML = `<strong>${escapeHtml(file.name)}</strong><br>Original Size: ${mb} MB`;
  
  document.getElementById('pc-compress-btn').style.display = 'block';
  document.getElementById('pc-compress-btn').textContent = '🗜️ Compress PDF';
  document.getElementById('pc-compress-btn').disabled = false;
  document.getElementById('pc-download-btn').style.display = 'none';
  
  const res = document.getElementById('res');
  if(res) res.classList.add('hidden');
}

function pcReset() {
  pcCurrentFile = null;
  pcCompressedBlob = null;
  document.getElementById('pc-drop').classList.remove('hidden');
  document.getElementById('pc-preview-wrap').classList.add('hidden');
  document.getElementById('pc-file').value = '';
}

async function pcCompress() {
  if (!pcCurrentFile) return;
  const btn = document.getElementById('pc-compress-btn');
  btn.disabled = true;
  btn.textContent = 'Compressing... Please wait';
  
  try {
    if (!window.PDFLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    const arrayBuffer = await pcCurrentFile.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    // Save with useObjectStreams to compress structure
    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    
    pcCompressedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const origMb = (pcCurrentFile.size / (1024*1024)).toFixed(2);
    const compMb = (pcCompressedBlob.size / (1024*1024)).toFixed(2);
    
    let savedPct = ((1 - (pcCompressedBlob.size / pcCurrentFile.size)) * 100).toFixed(1);
    if (savedPct < 0) savedPct = 0; 
    
    document.getElementById('pc-info').innerHTML = `
      <strong>${escapeHtml(pcCurrentFile.name)}</strong><br>
      Original Size: ${origMb} MB<br>
      Compressed Size: ${compMb} MB <span style="color:var(--primary)">(Saved ${savedPct}%)</span>
    `;
    
    btn.style.display = 'none';
    document.getElementById('pc-download-btn').style.display = 'block';
    showToast('PDF compressed successfully!');
    
  } catch (err) {
    console.error(err);
    btn.textContent = '🗜️ Compress PDF';
    btn.disabled = false;
    showError('Failed to compress PDF. It might be encrypted or corrupted.');
  }
}

function pcDownload() {
  if (!pcCompressedBlob || !pcCurrentFile) return;
  const url = URL.createObjectURL(pcCompressedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pcCurrentFile.name.replace(/\.[^/.]+$/, "") + "_compressed.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────
   PWA Service Worker Registration
───────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // SW registration failed silently (dev env, non-https, etc.)
    });
  });
}

/* ─────────────────────────────────────────
   Inverted Semicircular Rotating Tool Carousel
───────────────────────────────────────── */
function initHeroCarousel() {
  const showcase = document.getElementById('hero-carousel-showcase');
  const cardsTrack = document.getElementById('carousel-cards-track');

  if (!showcase || !cardsTrack) return;

  const totalTools = TOOLS.length;
  if (totalTools === 0) return;

  // Build card elements from TOOLS registry
  cardsTrack.innerHTML = TOOLS.map((tool, idx) => `
    <article
      class="carousel-card"
      role="listitem"
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
      <span class="card-badge" aria-hidden="true">Launch ↗</span>
    </article>
  `).join('');

  const cardElements = Array.from(cardsTrack.querySelectorAll('.carousel-card'));

  // Wire up card click & keyboard handlers
  cardElements.forEach((card, idx) => {
    const toolId = card.dataset.id;
    card.addEventListener('click', (e) => {
      if (hasDragged) return; // Prevent triggering click after drag gesture
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
  });

  // Geometry state: Keep both ends pinned to the extreme right side
  let width = showcase.clientWidth || 500;
  let height = showcase.clientHeight || 520;
  let Xc = width + 20; // Anchor center slightly past the right edge so ends hug extreme right
  let Yc = height / 2;
  let Rx = 360;
  let Ry = 230;
  const maxAngleRad = 78 * Math.PI / 180; // 78 degrees in radians

  function updateGeometry() {
    width = showcase.clientWidth || 500;
    height = showcase.clientHeight || 520;

    if (width < 440) {
      // Mobile: Keep top and bottom ends at extreme right
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
      // Desktop: Curve inwards towards center-left, both ends on extreme right
      Xc = width + 25;
      Yc = height / 2;
      Rx = Math.max(280, Math.min(370, width - 100));
      Ry = Math.max(200, Math.min(240, height / 2 - 25));
    }
  }

  updateGeometry();

  // ResizeObserver or window resize
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

  // Angular mapping for relative tool offsets
  function getAngleForDiff(diff) {
    const half = totalTools / 2;
    const u = diff / half; // ranges [-1, +1]
    return Math.sign(u) * Math.pow(Math.abs(u), 0.86) * maxAngleRad;
  }

  function renderCarousel(continuousPos) {
    const half = totalTools / 2;

    for (let i = 0; i < totalTools; i++) {
      const card = cardElements[i];
      let diff = (i - continuousPos) % totalTools;
      if (diff < -half) diff += totalTools;
      if (diff > half) diff -= totalTools;

      const angle = getAngleForDiff(diff);
      const absDiff = Math.abs(diff);

      // Coordinates along the invisible semicircular trajectory
      const cardX = Xc - Rx * Math.cos(angle);
      const cardY = Yc + Ry * Math.sin(angle);

      // Scaling: active center spotlight is larger (1.18), inactive cards taper down
      let scale;
      if (absDiff <= 1) {
        scale = 1.18 - absDiff * (1.18 - 0.84);
      } else {
        scale = 0.84 - ((absDiff - 1) / (half - 1)) * (0.84 - 0.66);
      }

      // Opacity: active card is bright (1.0), inactive cards are dimmed, ends fade cleanly
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

  // Animation controller: Continuously rotates through tools every ~2 seconds with smooth 400ms transition
  let currentStep = 0;
  let targetStep = 0;
  let currentContinuousPos = 0;
  let transitionStart = 0;
  let isTransitioning = false;
  let isPaused = false;
  let timerId = null;
  const INTERVAL_MS = 2000; // ~2 seconds per tool with brief pause
  const TRANSITION_MS = 400; // smooth 400ms transition between cards

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

  // ── Drag & Swipe Functionality ──
  let isDragging = false;
  let startY = 0;
  let startContinuousPos = 0;
  let hasDragged = false;

  function onPointerDown(e) {
    // Only respond to primary mouse button or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDragging = true;
    hasDragged = false;
    isPaused = true;
    isTransitioning = false;
    clearTimeout(timerId);
    startY = e.clientY;
    startContinuousPos = currentContinuousPos;
    showcase.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    if (Math.abs(deltaY) > 5) {
      hasDragged = true;
    }
    // Mapping vertical drag distance to carousel step movement
    const stepDelta = -deltaY / 65;
    currentContinuousPos = (startContinuousPos + stepDelta) % totalTools;
    if (currentContinuousPos < 0) currentContinuousPos += totalTools;
    renderCarousel(currentContinuousPos);
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    try { showcase.releasePointerCapture(e.pointerId); } catch (_) {}

    // Snap to the closest tool
    const nearestStep = Math.round(currentContinuousPos) % totalTools;
    currentStep = nearestStep < 0 ? nearestStep + totalTools : nearestStep;
    targetStep = currentStep;
    isTransitioning = true;
    transitionStart = performance.now();

    // Resume rotation after a brief interaction buffer
    setTimeout(() => {
      hasDragged = false;
      isPaused = false;
      scheduleNext(INTERVAL_MS);
    }, 150);
  }

  showcase.addEventListener('pointerdown', onPointerDown);
  showcase.addEventListener('pointermove', onPointerMove);
  showcase.addEventListener('pointerup', onPointerUp);
  showcase.addEventListener('pointercancel', onPointerUp);

  // prefers-reduced-motion check
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    renderCarousel(0);
  } else {
    renderCarousel(0);
    scheduleNext();
    requestAnimationFrame(animationLoop);
  }

  // Pause on mouse hover, resume on mouse leave
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

  // Keyboard focus: pause when focus enters, resume when focus leaves
  showcase.addEventListener('focusin', () => {
    isPaused = true;
    clearTimeout(timerId);
  });

  showcase.addEventListener('focusout', () => {
    isPaused = false;
    if (!isTransitioning && !isDragging) scheduleNext();
  });

  // Visibility change: save resources when tab is hidden
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
render();
initHeroCarousel();
initScrollReveal();

/* ── Deep Link / Route Handler ── */
const SLUG_TO_TOOL = {
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
  'image-compressor': 'imgcompress',
  'image-resizer': 'imgresize',
  'photo-resizer': 'photoresize',
  'photo-and-signature-resizer': 'photoresize',
  'image-to-pdf': 'imgtopdf',
  'pdf-merger': 'pdfmerge',
  'pdf-compressor': 'pdfcompress',
  'qr-code-generator': 'qrcode',
};

(function checkRoute() {
  const autoTool = content && content.dataset.tool;
  if (autoTool && ALLOWED_TOOL_IDS.has(autoTool)) {
    openTool(autoTool);
    return;
  }
  const path = window.location.pathname.replace(/^\/|\/$/g, '').replace(/\.html$/, '');
  const hash = window.location.hash.replace('#', '');
  const toolId = SLUG_TO_TOOL[path] || SLUG_TO_TOOL[hash] || (ALLOWED_TOOL_IDS.has(hash) ? hash : null);
  if (toolId) {
    openTool(toolId);
  }
})();