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
    try {
      contractors = await API.contractors.list();
      renderTable(contractors);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function renderTable(data) {
    const tbody = document.getElementById('contractors-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text3)">No contractors</td></tr>'; return; }
    tbody.innerHTML = data.map(c => `<tr>
      <td><strong style="color:var(--text)">${escHtml(c.company_name)}</strong></td>
      <td>${escHtml(c.contact_name || '—')}</td>
      <td>${escHtml(c.phone || '—')}</td>
      <td>${escHtml(c.email || '—')}</td>
      <td>${escHtml(c.region || '—')}</td>
      <td>
        <span class="badge ${c.is_active ? 'badge-resolved' : 'badge-closed'}">${c.is_active ? 'Active' : 'Inactive'}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editContractor('${c.id}')">Edit</button>
        <button class="btn btn-sm btn-secondary" onclick="toggleContractorActive('${c.id}',${!c.is_active})">
          ${c.is_active ? 'Deactivate' : 'Activate'}
        </button>
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

  document.getElementById('add-contractor-btn').addEventListener('click', () => showContractorForm(null, load));

  window.editContractor = (id) => {
    const c = contractors.find(x => x.id === id);
    if (c) showContractorForm(c, load);
  };

  window.toggleContractorActive = async (id, active) => {
    try {
      await API.contractors.update(id, { is_active: active });
      toast(`Contractor ${active ? 'activated' : 'deactivated'}`);
      load();
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  await load();
}

function showContractorForm(c, onSave) {
  const editing = !!c?.id;
  openModal(editing ? 'Edit Contractor' : 'Add Contractor', `
    <form id="contractor-form">
      <div class="form-grid">
        <div class="form-group full"><label>Company Name *</label><input name="company_name" required value="${escHtml(c?.company_name||'')}"/></div>
        <div class="form-group"><label>Contact Name</label><input name="contact_name" value="${escHtml(c?.contact_name||'')}"/></div>
        <div class="form-group"><label>Region / Area</label><input name="region" value="${escHtml(c?.region||'')}"/></div>
        <div class="form-group"><label>Phone</label><input name="phone" type="tel" value="${escHtml(c?.phone||'')}"/></div>
        <div class="form-group"><label>Email</label><input name="email" type="email" value="${escHtml(c?.email||'')}"/></div>
        <div class="form-group full"><label>Specialties (comma-separated)</label>
          <input name="specialties_text" placeholder="HVAC, chillers, electrical…" value=""/>
        </div>
        <div class="form-group full"><label>Notes</label><textarea name="notes">${escHtml(c?.notes||'')}</textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save' : 'Add Contractor'}</button>
      </div>
    </form>`);

  document.getElementById('contractor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const specialties = data.specialties_text ? data.specialties_text.split(',').map(s => s.trim()).filter(Boolean) : [];
    delete data.specialties_text;
    data.specialties = specialties;
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) await API.contractors.update(c.id, data);
      else await API.contractors.create(data);
      toast(editing ? 'Contractor updated' : 'Contractor added');
      closeModal(); onSave();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
