async function renderSites(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Sites</h1><div class="page-subtitle">Customer sites and locations</div></div>
      <button class="btn btn-primary" id="add-site-btn">+ New Site</button>
    </div>
    <div class="card">
      <div class="toolbar">
        <div class="search-bar"><input id="site-search" placeholder="Search sites…" /></div>
        <div class="toolbar-spacer"></div>
      </div>
      <div class="table-wrap">
        <table id="sites-table">
          <thead><tr>
            <th>Site Name</th><th>City, State</th><th>Shipping Address</th>
            <th>Contact</th><th>Access Req</th><th>Actions</th>
          </tr></thead>
          <tbody id="sites-body"><tr><td colspan="6" style="color:var(--text3)">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  let sites = [];

  async function load() {
    try { sites = await API.sites.list(); renderTable(sites); }
    catch (e) { toast('Error loading sites: ' + e.message, 'error'); }
  }

  function renderTable(data) {
    const tbody = document.getElementById('sites-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text3)">No sites yet</td></tr>'; return; }
    tbody.innerHTML = data.map(s => `<tr>
      <td><a onclick="navigate('site-detail',{id:'${s.id}'})" style="cursor:pointer;font-weight:500">${escHtml(s.name)}</a></td>
      <td>${escHtml([s.city, s.state].filter(Boolean).join(', ') || '—')}</td>
      <td style="font-size:12px">${escHtml([s.shipping_address_street, s.shipping_address_city].filter(Boolean).join(', ') || '—')}</td>
      <td style="font-size:12px">${escHtml(s.customer_contact_phone || s.customer_contact_email || '—')}</td>
      <td style="font-size:12px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.access_requirements || '—')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-primary" onclick="navigate('site-detail',{id:'${s.id}'})">Open</button>
        <button class="btn btn-sm btn-secondary" onclick="navigate('site-form',{id:'${s.id}',backTo:'sites'})" style="margin-left:4px">Edit</button>
        <button class="btn btn-sm btn-secondary" onclick="deleteSite('${s.id}','${escHtml(s.name)}')" style="margin-left:4px;color:var(--red)">Delete</button>
      </td>
    </tr>`).join('');
  }

  document.getElementById('site-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderTable(sites.filter(s => (s.name||'').toLowerCase().includes(q) || (s.city||'').toLowerCase().includes(q)));
  });

  document.getElementById('add-site-btn').addEventListener('click', () => navigate('site-form', { backTo: 'sites' }));

  window.deleteSite = async (id, name) => {
    if (!confirm(`Delete site "${name}"? This cannot be undone.`)) return;
    try { await API.sites.delete(id); toast('Site deleted'); await load(); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  await load();
}
