// ── App Router ────────────────────────────────────────────────────────────
const PAGES = {
  dashboard:           renderDashboard,
  sites:               renderSites,
  tickets:             renderTickets,
  contacts:            renderContacts,
  'site-detail':       renderSiteDetail,
  'site-form':         renderSiteForm,
  'unit-detail':       renderUnitDetail,
  'unit-form':         renderUnitForm,
  'ticket-detail':     renderTicketDetail,
  'contractor-detail': renderContractorDetail,
};

// Map sub-pages to their parent nav item for active highlighting
const PAGE_NAV = {
  'site-detail':       'sites',
  'site-form':         'sites',
  'unit-detail':       'sites',
  'unit-form':         'sites',
  'ticket-detail':     'tickets',
  'contractor-detail': 'contacts',
};

let currentPage = 'dashboard';
let currentParams = {};

function navigate(page, params = {}) {
  currentPage = page;
  currentParams = params;

  // Update nav — highlight parent section for sub-pages
  const navPage = PAGE_NAV[page] || page;
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === navPage);
  });

  // Render page
  const container = document.getElementById('page-container');
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';
  const fn = PAGES[page];
  if (fn) fn(container, params);
}

// ── Modal helpers ─────────────────────────────────────────────────────────
function openModal(title, html, onSubmit) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');

  if (onSubmit) {
    const form = document.getElementById('modal-body').querySelector('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await onSubmit(form);
      });
    }
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

// ── Toast helpers ─────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Utility helpers ───────────────────────────────────────────────────────
function unitTypeBadge(t) {
  const labels = {
    chiller: 'Chiller',
    air_handler: 'Air Handler',
    indirect_cooling: 'Indirect Cooling',
    indirect_evaporative: 'Indirect Evap',
    sycool: 'SyCool',
  };
  return `<span class="badge type-${t || ''}">${labels[t] || t || '—'}</span>`;
}

function statusBadge(s) {
  const labels = {
    open: 'Open',
    parts_ordered: 'Parts Ordered',
    tech_dispatched: 'Tech Dispatched',
    on_site: 'On Site',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return `<span class="badge badge-${s || 'open'}">${labels[s] || s || 'Open'}</span>`;
}

function commissionBadge(level) {
  const colors = { none: '#64748b', L1: '#60a5fa', L2: '#818cf8', L3: '#c084fc', L4: '#f472b6', L5: '#4ade80', complete: '#22c55e' };
  const c = colors[level] || '#64748b';
  return `<span style="color:${c};font-weight:600">${level || 'none'}</span>`;
}

function serial(unit) {
  if (unit.job_number && unit.line_number != null) return `${unit.job_number}-${unit.line_number}`;
  return unit.serial_number || '—';
}

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString();
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Theme ──────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon) icon.textContent = theme === 'light' ? '☾' : '☀';
  if (label) label.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const savedTheme = localStorage.getItem('munters-theme') || 'dark';
  applyTheme(savedTheme);
  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('munters-theme', next);
  });

  // Nav click handlers
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.page);
    });
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Load dashboard
  navigate('dashboard');
});
