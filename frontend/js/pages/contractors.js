async function renderContractors(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Contractors</h1><div class="page-subtitle">Field contractors by region</div></div>
      <button class="btn btn-primary" id="add-contractor-btn">+ Add Contractor</button>
    </div>
    <div class="card">
      <div class="toolbar">
        <div class="search-bar"><input id="contractor-search" placeholder="Company, region…"/></div>
        <div class="toolbar-spacer"></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Contact</th><th>Phone</th><th>Email</th><th>Region</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="contractors-body"><tr><td colspan="7" style="color:var(--text3)">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  let contractors = [];

  async function load() {
    try { contractors = await API.contractors.list(); renderTable(contractors); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function renderTable(data) {
    const tbody = document.getElementById('contractors-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text3)">No contractors</td></tr>'; return; }
    tbody.innerHTML = data.map(c => `<tr>
      <td><a onclick="navigate('contractor-detail',{id:'${c.id}'})" style="cursor:pointer;font-weight:500">${escHtml(c.company_name)}</a></td>
      <td>${escHtml(c.contact_name || '—')}</td>
      <td>${escHtml(c.phone || '—')}</td>
      <td>${escHtml(c.email || '—')}</td>
      <td>${escHtml(c.region || '—')}</td>
      <td><span class="badge ${c.is_active ? 'badge-resolved' : 'badge-closed'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-primary" onclick="navigate('contractor-detail',{id:'${c.id}'})">Open</button>
        <button class="btn btn-sm btn-secondary" onclick="toggleActive('${c.id}',${!c.is_active})" style="margin-left:4px">${c.is_active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn btn-sm btn-secondary" onclick="deleteContractor('${c.id}','${escHtml(c.company_name)}')" style="margin-left:4px;color:var(--red)">Delete</button>
      </td>
    </tr>`).join('');
  }

  document.getElementById('contractor-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderTable(contractors.filter(c =>
      (c.company_name||'').toLowerCase().includes(q) ||
      (c.region||'').toLowerCase().includes(q) ||
      (c.contact_name||'').toLowerCase().includes(q)
    ));
  });

  document.getElementById('add-contractor-btn').addEventListener('click', () => navigate('contractor-detail', { backTo: 'contractors' }));

  window.toggleActive = async (id, active) => {
    try { await API.contractors.update(id, { is_active: active }); toast(`Contractor ${active ? 'activated' : 'deactivated'}`); await load(); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  window.deleteContractor = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await API.contractors.delete(id); toast('Contractor deleted'); await load(); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  await load();
}
