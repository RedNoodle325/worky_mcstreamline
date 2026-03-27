// ── App Router ────────────────────────────────────────────────────────────
const PAGES = {
  dashboard:           renderDashboard,
  sites:               renderSites,
  tickets:             renderTickets,
  issues:              renderIssues,
  'service-tickets':   renderServiceTickets,
  contacts:            renderContacts,
  notes:               renderNotes,
  todos:               renderTodos,
  'site-detail':       renderSiteDetail,
  'site-form':         renderSiteForm,
  'unit-detail':       renderUnitDetail,
  'unit-form':         renderUnitForm,
  'ticket-detail':     renderTicketDetail,
  'contractor-detail': renderContractorDetail,
  'campaign-detail':   renderCampaignDetail,
  schedule:            renderSchedule,
  msow:                renderMSOW,
};

// Map sub-pages to their parent nav item for active highlighting
const PAGE_NAV = {
  'site-detail':       'sites',
  'site-form':         'sites',
  'unit-detail':       'sites',
  'unit-form':         'sites',
  'ticket-detail':     'issues',
  'contractor-detail': 'contacts',
  'campaign-detail':   'sites',
};

let currentPage = 'dashboard';
let currentParams = {};

const WRITE_PAGES = new Set(['site-form', 'unit-form']);

async function navigate(page, params = {}) {
  // Form pages require authentication — silently block if not logged in
  if (WRITE_PAGES.has(page) && !isAuthenticated()) {
    return;
  }

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

// ── Edit mode ─────────────────────────────────────────────────────────────
function isEditMode() {
  return localStorage.getItem('munters-edit-mode') !== 'off';
}

function toggleEditMode() {
  localStorage.setItem('munters-edit-mode', isEditMode() ? 'off' : 'on');
  applyEditMode();
  toast(isEditMode() ? 'Edit mode on' : 'View mode — edits disabled');
}

function applyEditMode() {
  const editing = isEditMode() && isAuthenticated();
  document.body.classList.toggle('read-only', !editing);
  const btn   = document.getElementById('edit-mode-btn');
  const icon  = document.getElementById('edit-mode-icon');
  const label = document.getElementById('edit-mode-label');
  if (btn)   btn.style.display   = isAuthenticated() ? '' : 'none';
  if (icon)  icon.textContent    = editing ? '✏️' : '👁';
  if (label) label.textContent   = editing ? 'Editing' : 'View Mode';
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
function initApp() {
  applyAuthState();
  applyEditMode();
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme before auth check so login page looks right
  const savedTheme = localStorage.getItem('munters-theme') || 'dark';
  applyTheme(savedTheme);
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
      // Close sidebar on mobile after nav
      closeMobileSidebar();
    });
  });

  // Mobile sidebar toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function openMobileSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    sidebarOverlay?.classList.add('open');
  }
  function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    sidebarOverlay?.classList.remove('open');
  }
  window.closeMobileSidebar = closeMobileSidebar;

  mobileMenuBtn?.addEventListener('click', openMobileSidebar);
  sidebarCloseBtn?.addEventListener('click', closeMobileSidebar);
  sidebarOverlay?.addEventListener('click', closeMobileSidebar);

  // Logout button
  document.getElementById('auth-logout-btn')?.addEventListener('click', () => logout());

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Bootstrap auth — shows login/setup page if not authenticated
  const authed = await bootstrapAuth();
  if (authed) initApp();
});
