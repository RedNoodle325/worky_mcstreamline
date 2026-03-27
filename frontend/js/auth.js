// JWT-based auth. Token stored in localStorage so login persists across sessions.
const AUTH_TOKEN_KEY = 'worky_auth_token';
const AUTH_USER_KEY  = 'worky_auth_user';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function getAuthUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'); } catch { return null; }
}

function isAuthenticated() {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

function saveAuth(token, email, displayName) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ email, displayName }));
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function logout() {
  clearAuth();
  showLoginPage();
}

// ── Login page ────────────────────────────────────────────────────────────────

function showLoginPage(message = '') {
  const app     = document.getElementById('app');
  const sidebar = document.querySelector('.sidebar');
  if (app) app.style.display = 'none';
  if (sidebar) sidebar.style.display = 'none';

  let loginEl = document.getElementById('login-page');
  if (!loginEl) {
    loginEl = document.createElement('div');
    loginEl.id = 'login-page';
    document.body.appendChild(loginEl);
  }

  loginEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg1,#0f172a);z-index:9999';
  loginEl.innerHTML = `
    <div style="background:var(--bg2,#1e293b);border:1px solid var(--border,#334155);border-radius:16px;padding:40px;width:100%;max-width:380px;box-shadow:0 20px 60px #0006">
      <div style="text-align:center;margin-bottom:32px">
        <img src="/img/logos/munters.png" alt="Munters" style="height:36px;margin-bottom:16px">
        <div style="font-size:20px;font-weight:700;color:var(--text,#f1f5f9)">PM Dashboard</div>
        <div style="font-size:13px;color:var(--text3,#64748b);margin-top:4px">Sign in to continue</div>
      </div>
      ${message ? `<div style="background:#dc262622;border:1px solid #dc262644;color:#f87171;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px">${message}</div>` : ''}
      <form id="login-form">
        <div style="margin-bottom:14px">
          <label style="font-size:12px;font-weight:600;color:var(--text2,#94a3b8);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px">Email</label>
          <input id="login-email" type="email" autocomplete="email" required
            style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--bg3,#0f172a);border:1px solid var(--border,#334155);border-radius:8px;color:var(--text,#f1f5f9);font-size:14px"
            placeholder="you@munters.com"/>
        </div>
        <div style="margin-bottom:24px">
          <label style="font-size:12px;font-weight:600;color:var(--text2,#94a3b8);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px">Password</label>
          <input id="login-password" type="password" autocomplete="current-password" required
            style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--bg3,#0f172a);border:1px solid var(--border,#334155);border-radius:8px;color:var(--text,#f1f5f9);font-size:14px"
            placeholder="••••••••"/>
        </div>
        <button type="submit" id="login-submit"
          style="width:100%;padding:11px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
          Sign In
        </button>
      </form>
    </div>`;

  loginEl.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn      = document.getElementById('login-submit');
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    btn.textContent = 'Signing in…';
    btn.disabled = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Invalid email or password');
      }
      const data = await res.json();
      saveAuth(data.token, data.email, data.display_name);
      loginEl.remove();
      if (app) app.style.display = '';
      if (sidebar) sidebar.style.display = '';
      applyAuthState();
      if (typeof initApp === 'function') initApp();
    } catch (err) {
      showLoginPage(err.message);
    }
  });

  setTimeout(() => document.getElementById('login-email')?.focus(), 50);
}

// ── First-run setup ───────────────────────────────────────────────────────────

function showSetupPage() {
  const app     = document.getElementById('app');
  const sidebar = document.querySelector('.sidebar');
  if (app) app.style.display = 'none';
  if (sidebar) sidebar.style.display = 'none';

  let el = document.getElementById('setup-page');
  if (!el) { el = document.createElement('div'); el.id = 'setup-page'; document.body.appendChild(el); }

  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg1,#0f172a);z-index:9999';
  el.innerHTML = `
    <div style="background:var(--bg2,#1e293b);border:1px solid var(--border,#334155);border-radius:16px;padding:40px;width:100%;max-width:400px;box-shadow:0 20px 60px #0006">
      <div style="text-align:center;margin-bottom:28px">
        <img src="/img/logos/munters.png" alt="Munters" style="height:36px;margin-bottom:14px">
        <div style="font-size:18px;font-weight:700;color:var(--text,#f1f5f9)">Create Your Account</div>
        <div style="font-size:13px;color:var(--text3,#64748b);margin-top:4px">First-time setup — this screen won't appear again</div>
      </div>
      <div id="setup-error"></div>
      <form id="setup-form">
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--text2,#94a3b8);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px">Your Name</label>
          <input id="setup-name" type="text" autocomplete="name"
            style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--bg3,#0f172a);border:1px solid var(--border,#334155);border-radius:8px;color:var(--text,#f1f5f9);font-size:14px"
            placeholder="Zak Klinedinst"/>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--text2,#94a3b8);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px">Email</label>
          <input id="setup-email" type="email" autocomplete="email" required
            style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--bg3,#0f172a);border:1px solid var(--border,#334155);border-radius:8px;color:var(--text,#f1f5f9);font-size:14px"
            placeholder="you@munters.com"/>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--text2,#94a3b8);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px">Password</label>
          <input id="setup-password" type="password" autocomplete="new-password" required
            style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--bg3,#0f172a);border:1px solid var(--border,#334155);border-radius:8px;color:var(--text,#f1f5f9);font-size:14px"
            placeholder="Min. 8 characters"/>
        </div>
        <div style="margin-bottom:24px">
          <label style="font-size:12px;font-weight:600;color:var(--text2,#94a3b8);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px">Confirm Password</label>
          <input id="setup-password2" type="password" autocomplete="new-password" required
            style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--bg3,#0f172a);border:1px solid var(--border,#334155);border-radius:8px;color:var(--text,#f1f5f9);font-size:14px"
            placeholder="••••••••"/>
        </div>
        <button type="submit" id="setup-submit"
          style="width:100%;padding:11px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
          Create Account
        </button>
      </form>
    </div>`;

  el.querySelector('#setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('setup-name').value.trim();
    const email = document.getElementById('setup-email').value.trim();
    const pw1   = document.getElementById('setup-password').value;
    const pw2   = document.getElementById('setup-password2').value;
    const errEl = document.getElementById('setup-error');
    const btn   = document.getElementById('setup-submit');

    if (pw1 !== pw2) {
      errEl.innerHTML = `<div style="background:#dc262622;border:1px solid #dc262644;color:#f87171;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px">Passwords don't match</div>`;
      return;
    }
    btn.textContent = 'Creating account…';
    btn.disabled = true;
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw1, display_name: name || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Setup failed');
      }
      const data = await res.json();
      saveAuth(data.token, data.email, data.display_name);
      el.remove();
      if (app) app.style.display = '';
      if (sidebar) sidebar.style.display = '';
      applyAuthState();
      if (typeof initApp === 'function') initApp();
    } catch (err) {
      errEl.innerHTML = `<div style="background:#dc262622;border:1px solid #dc262644;color:#f87171;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px">${err.message}</div>`;
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  });
  setTimeout(() => document.getElementById('setup-name')?.focus(), 50);
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function applyAuthState() {
  const authed = isAuthenticated();
  const user   = getAuthUser();
  // Show/hide sidebar auth buttons
  const loginBtn  = document.getElementById('auth-login-btn');
  const logoutBtn = document.getElementById('auth-logout-btn');
  const userEl    = document.getElementById('auth-user-display');
  if (loginBtn)  loginBtn.style.display  = authed ? 'none' : '';
  if (logoutBtn) logoutBtn.style.display = authed ? '' : 'none';
  if (userEl) userEl.textContent = user?.displayName || user?.email || 'Sign Out';
  // Wire login button click
  if (loginBtn) loginBtn.onclick = () => showLoginPage();
  // Edit mode applies read-only class
  if (typeof applyEditMode === 'function') applyEditMode();
  else document.body.classList.toggle('read-only', !authed);
}

// Legacy alias
function showLoginModal() {
  return new Promise((resolve, reject) => {
    if (isAuthenticated()) { resolve(); return; }
    // Replace with full login page; can't easily resolve promise, so just redirect
    showLoginPage();
    reject(new Error('redirected to login'));
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrapAuth() {
  if (isAuthenticated()) {
    applyAuthState();
    return true;
  }
  // Check if first-run (no users exist yet)
  try {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    });
    // 400 = setup endpoint reachable, validation failed (no users yet → show setup)
    // 401 = "Setup already complete" → show login
    if (res.status === 400) { showSetupPage(); return false; }
  } catch { /* network error — fall through to login */ }
  showLoginPage();
  return false;
}
