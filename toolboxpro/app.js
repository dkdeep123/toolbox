'use strict';

/* ─────────────────────────────────────────
   Tool Registry
───────────────────────────────────────── */
const TOOLS = [
  { id: 'age',        name: 'Age Calculator',        icon: '🎂', cat: 'utility', desc: 'Calculate your exact age from your date of birth.' },
  { id: 'emi',        name: 'EMI Calculator',         icon: '💰', cat: 'finance', desc: 'Calculate monthly EMI, interest and total payment.' },
  { id: 'percentage', name: 'Percentage Calculator',  icon: '％', cat: 'math',    desc: 'Find percentage, increase and decrease quickly.' },
  { id: 'gst',        name: 'GST Calculator',         icon: '🧾', cat: 'finance', desc: 'Add or remove GST from any amount.' },
  { id: 'unit',       name: 'Unit Converter',         icon: '📏', cat: 'utility', desc: 'Convert length, weight and temperature.' },
  { id: 'bmi',        name: 'BMI Calculator',         icon: '⚖️',  cat: 'utility', desc: 'Check BMI using your height and weight.' },
  { id: 'discount',   name: 'Discount Calculator',    icon: '🏷️',  cat: 'finance', desc: 'Calculate sale price and savings.' },
  { id: 'tip',        name: 'Tip Calculator',         icon: '🍽️',  cat: 'finance', desc: 'Calculate tip and split a bill.' },
  { id: 'ratio',      name: 'Ratio Calculator',       icon: '🔢', cat: 'math',    desc: 'Simplify and calculate ratios.' },
  { id: 'number',     name: 'Number Converter',       icon: '🔁', cat: 'math',    desc: 'Convert numbers between common formats.' },
  { id: 'date',       name: 'Date Difference',        icon: '📅', cat: 'utility', desc: 'Find the number of days between two dates.' },
  { id: 'salary',     name: 'Salary Calculator',      icon: '💵', cat: 'finance', desc: 'Estimate monthly and annual salary breakdown.' },
];

/* ─────────────────────────────────────────
   DOM References
───────────────────────────────────────── */
const grid    = document.getElementById('grid');
const search  = document.getElementById('search');
const count   = document.getElementById('count');
const empty   = document.getElementById('empty');
const modal   = document.getElementById('modal');
const modalBox = modal.querySelector('.modal-box');
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
  const q = search.value.toLowerCase().trim();
  const list = TOOLS.filter(t =>
    (category === 'all' || t.cat === category) &&
    (t.name + ' ' + t.desc).toLowerCase().includes(q)
  );

  grid.innerHTML = list.map(t => `
    <article
      class="tool"
      role="listitem"
      tabindex="0"
      data-id="${t.id}"
      aria-label="Open ${t.name}"
    >
      <div class="tool-icon" aria-hidden="true">${t.icon}</div>
      <h3>${t.name}</h3>
      <p>${t.desc}</p>
      <span class="tool-arrow" aria-hidden="true">Open tool →</span>
    </article>
  `).join('');

  count.textContent = `${list.length} tool${list.length !== 1 ? 's' : ''}`;
  empty.classList.toggle('hidden', list.length > 0);

  // Attach click + keyboard handlers to each card
  grid.querySelectorAll('.tool').forEach(card => {
    card.addEventListener('click', () => openTool(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTool(card.dataset.id); }
    });
  });
}

/* ─────────────────────────────────────────
   Search & Filter
───────────────────────────────────────── */
search.addEventListener('input', render);

// Keyboard shortcut ⌘K / Ctrl+K
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
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

/* ─────────────────────────────────────────
   Modal
───────────────────────────────────────── */
function openTool(id) {
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;

  previousFocus = document.activeElement;
  content.innerHTML = buildForm(id, tool);
  modal.classList.remove('hidden');
  modal.removeAttribute('aria-hidden');

  // Set modal title for screen readers
  const heading = content.querySelector('h2');
  if (heading) {
    heading.id = 'modal-title';
    modal.setAttribute('aria-labelledby', 'modal-title');
  }

  // Focus first interactive element
  requestAnimationFrame(() => {
    const first = modalBox.querySelector('input, button, select, [tabindex="0"]');
    if (first) first.focus();
  });

  trapFocus(modalBox);

  // Wire up Enter key for inputs inside the form
  modalBox.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const calcBtn = modalBox.querySelector('button.primary');
        if (calcBtn) calcBtn.click();
      }
    });
  });
}

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  if (previousFocus) previousFocus.focus();
}

document.getElementById('close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

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
   Clipboard Copy
───────────────────────────────────────── */
function copyResult(text) {
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
  res.innerHTML = `
    ${html}
    <button class="copy-btn" aria-label="Copy result" title="Copy result">Copy</button>
  `;
  res.classList.remove('hidden');
  res.querySelector('.copy-btn').addEventListener('click', () => copyResult(plainText || res.innerText.replace('Copy', '').trim()));
}

function showError(msg) {
  const res = document.getElementById('res');
  res.innerHTML = `<span style="color:var(--danger);font-size:14px;font-weight:500">⚠ ${msg}</span>`;
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

/* ─────────────────────────────────────────
   PWA Service Worker Registration
───────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed silently (dev env, non-https, etc.)
    });
  });
}

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
render();