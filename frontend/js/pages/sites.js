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

  async function loadSites() {
    try {
      sites = await API.sites.list();
      renderTable(sites);
    } catch (e) { toast('Error loading sites: ' + e.message, 'error'); }
  }

  function renderTable(data) {
    const tbody = document.getElementById('sites-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text3)">No sites yet</td></tr>'; return; }
    tbody.innerHTML = data.map(s => `<tr>
      <td><a onclick="navigate('site-detail',{id:'${s.id}'})" style="cursor:pointer">${escHtml(s.name)}</a></td>
      <td>${escHtml([s.city, s.state].filter(Boolean).join(', ') || '—')}</td>
      <td style="font-size:12px">${escHtml([s.shipping_address_street, s.shipping_address_city].filter(Boolean).join(', ') || '—')}</td>
      <td style="font-size:12px">${escHtml(s.customer_contact_phone || s.customer_contact_email || '—')}</td>
      <td style="font-size:12px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.access_requirements || '—')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-primary" onclick="navigate('site-detail',{id:'${s.id}'})">Open</button>
        <button class="btn btn-sm btn-secondary" onclick="editSite('${s.id}')" style="margin-left:4px">Edit</button>
        <button class="btn btn-sm btn-secondary" onclick="printSiteReport('${s.id}')" style="margin-left:4px">🖨</button>
      </td>
    </tr>`).join('');
  }

  // Search
  document.getElementById('site-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderTable(sites.filter(s => (s.name||'').toLowerCase().includes(q) || (s.city||'').toLowerCase().includes(q)));
  });

  document.getElementById('add-site-btn').addEventListener('click', () => showSiteForm(null, loadSites));

  window.showSiteDetail = (id) => {
    const site = sites.find(s => s.id === id);
    if (!site) return;
    openModal(site.name, `
      <div class="grid-2" style="gap:12px">
        <div><div class="section-title">Site Address</div>
          <div style="color:var(--text2)">${escHtml([site.address, site.city, site.state, site.zip_code].filter(Boolean).join(', ') || '—')}</div>
        </div>
        <div><div class="section-title">Shipping Address</div>
          <div style="color:var(--text2)">${escHtml([site.shipping_address_street, site.shipping_address_city, site.shipping_address_state, site.shipping_address_zip].filter(Boolean).join(', ') || '—')}</div>
        </div>
        <div><div class="section-title">Access Requirements</div>
          <div style="color:var(--text2);white-space:pre-wrap">${escHtml(site.access_requirements || '—')}</div>
        </div>
        <div><div class="section-title">Required Paperwork</div>
          <div style="color:var(--text2);white-space:pre-wrap">${escHtml(site.required_paperwork || '—')}</div>
        </div>
        <div class="full"><div class="section-title">Orientation Info</div>
          <div style="color:var(--text2);white-space:pre-wrap">${escHtml(site.orientation_info || '—')}</div>
        </div>
        <div><div class="section-title">Contact Phone</div><div style="color:var(--text2)">${escHtml(site.customer_contact_phone || '—')}</div></div>
        <div><div class="section-title">Contact Email</div><div style="color:var(--text2)">${escHtml(site.customer_contact_email || '—')}</div></div>
        ${site.notes ? `<div class="full"><div class="section-title">Notes</div><div style="color:var(--text2);white-space:pre-wrap">${escHtml(site.notes)}</div></div>` : ''}
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="editSite('${site.id}');closeModal()">Edit</button>
        <button class="btn btn-secondary" onclick="printSiteReport('${site.id}')">🖨 Print Report</button>
        <button class="btn btn-primary" onclick="navigate('units');closeModal()">View Units</button>
      </div>`);
  };

  window.editSite = (id) => {
    const site = sites.find(s => s.id === id) || {};
    showSiteForm(site, loadSites);
  };

  await loadSites();
}

function showSiteForm(site, onSave) {
  const editing = !!site?.id;
  openModal(editing ? 'Edit Site' : 'New Site', `
    <form id="site-form">
      <div class="form-grid">
        <div class="form-group full"><label>Site Name *</label><input name="name" required value="${escHtml(site?.name||'')}" /></div>
        <div class="section-title full" style="margin:0">Site Address</div>
        <div class="form-group full"><label>Street</label><input name="address" value="${escHtml(site?.address||'')}"/></div>
        <div class="form-group"><label>City</label><input name="city" value="${escHtml(site?.city||'')}"/></div>
        <div class="form-group"><label>State</label><input name="state" value="${escHtml(site?.state||'')}"/></div>
        <div class="form-group"><label>Zip</label><input name="zip_code" value="${escHtml(site?.zip_code||'')}"/></div>
        <div class="section-title full" style="margin:0">Shipping Address</div>
        <div class="form-group full"><label>Street</label><input name="shipping_address_street" value="${escHtml(site?.shipping_address_street||'')}"/></div>
        <div class="form-group"><label>City</label><input name="shipping_address_city" value="${escHtml(site?.shipping_address_city||'')}"/></div>
        <div class="form-group"><label>State</label><input name="shipping_address_state" value="${escHtml(site?.shipping_address_state||'')}"/></div>
        <div class="form-group"><label>Zip</label><input name="shipping_address_zip" value="${escHtml(site?.shipping_address_zip||'')}"/></div>
        <div class="section-title full" style="margin:0">Site Info</div>
        <div class="form-group full"><label>Access Requirements</label><textarea name="access_requirements">${escHtml(site?.access_requirements||'')}</textarea></div>
        <div class="form-group full"><label>Required Paperwork</label><textarea name="required_paperwork">${escHtml(site?.required_paperwork||'')}</textarea></div>
        <div class="form-group full"><label>Orientation / Safety Info</label><textarea name="orientation_info">${escHtml(site?.orientation_info||'')}</textarea></div>
        <div class="form-group"><label>Contact Phone</label><input name="customer_contact_phone" value="${escHtml(site?.customer_contact_phone||'')}"/></div>
        <div class="form-group"><label>Contact Email</label><input name="customer_contact_email" value="${escHtml(site?.customer_contact_email||'')}"/></div>
        <div class="form-group full"><label>Notes</label><textarea name="notes">${escHtml(site?.notes||'')}</textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Site'}</button>
      </div>
    </form>`);

  document.getElementById('site-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    // Remove empty strings → null
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) await API.sites.update(site.id, data);
      else await API.sites.create(data);
      toast(editing ? 'Site updated' : 'Site created');
      closeModal();
      onSave();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
