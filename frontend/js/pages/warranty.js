async function renderWarranty(container) {
  container.innerHTML = `
    <div class="page-header">
      <div><h1>Warranty Claims</h1><div class="page-subtitle">Track warranty submissions &amp; resolutions</div></div>
      <button class="btn btn-primary" id="add-warranty-btn">+ New Claim</button>
    </div>
    <div class="card">
      <div class="toolbar">
        <select id="warranty-status-filter" style="width:180px">
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="closed">Closed</option>
        </select>
        <div class="toolbar-spacer"></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Claim Date</th><th>Site</th><th>Unit</th><th>Astea ID</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="warranty-body"><tr><td colspan="7" style="color:var(--text3)">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  let claims = [], sites = [], units = [];

  async function load() {
    try {
      [claims, sites, units] = await Promise.all([API.warranty.list(), API.sites.list(), API.units.list()]);
      renderTable(claims);
    } catch (e) { toast('Error: ' + e.message, 'error'); }
  }

  function siteName(id) { return sites.find(s => s.id === id)?.name || '—'; }
  function unitSerial(id) { const u = units.find(u => u.id === id); return u ? serial(u) : '—'; }

  const statusColors = {
    submitted: 'badge-open', in_review: 'badge-parts_ordered',
    approved: 'badge-resolved', denied: 'badge-closed', closed: 'badge-closed',
  };

  function renderTable(data) {
    const tbody = document.getElementById('warranty-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text3)">No claims</td></tr>'; return; }
    tbody.innerHTML = data.map(c => `<tr>
      <td style="font-size:12px">${fmt(c.claim_date)}</td>
      <td>${escHtml(siteName(c.site_id))}</td>
      <td style="font-family:monospace;font-size:12px">${escHtml(unitSerial(c.unit_id))}</td>
      <td style="font-family:monospace;font-size:12px">${escHtml(c.astea_request_id||'—')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.description)}</td>
      <td><span class="badge ${statusColors[c.status]||'badge-open'}">${escHtml(c.status||'submitted')}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editWarrantyClaim('${c.id}')">Update</button>
      </td>
    </tr>`).join('');
  }

  document.getElementById('warranty-status-filter').addEventListener('change', e => {
    const v = e.target.value;
    renderTable(v ? claims.filter(c => c.status === v) : claims);
  });

  document.getElementById('add-warranty-btn').addEventListener('click', () => showWarrantyForm(null, sites, units, load));

  window.editWarrantyClaim = (id) => {
    const c = claims.find(x => x.id === id);
    if (c) showWarrantyUpdateForm(c, load);
  };

  await load();
}

function showWarrantyForm(claim, sites, units, onSave) {
  openModal('New Warranty Claim', `
    <form id="warranty-form">
      <div class="form-grid">
        <div class="form-group"><label>Site *</label>
          <select name="site_id" required>
            <option value="">— Select Site —</option>
            ${sites.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Unit *</label>
          <select name="unit_id" required>
            <option value="">— Select Unit —</option>
            ${units.map(u => `<option value="${u.id}">${escHtml(serial(u))} – ${escHtml(u.unit_type||'')}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full"><label>Astea Request ID</label>
          <input name="astea_request_id" placeholder="CS260317XXXX@@1"/>
        </div>
        <div class="form-group full"><label>Description *</label>
          <textarea name="description" required placeholder="Describe the warranty issue…"></textarea>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Submit Claim</button>
      </div>
    </form>`);

  document.getElementById('warranty-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      await API.warranty.create(data);
      toast('Warranty claim submitted');
      closeModal(); onSave();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}

function showWarrantyUpdateForm(claim, onSave) {
  openModal('Update Warranty Claim', `
    <form id="warranty-update-form">
      <div class="form-grid">
        <div class="form-group full"><label>Astea Request ID</label>
          <input name="astea_request_id" value="${escHtml(claim.astea_request_id||'')}"/>
        </div>
        <div class="form-group"><label>Status</label>
          <select name="status">
            <option value="submitted" ${claim.status==='submitted'?'selected':''}>Submitted</option>
            <option value="in_review" ${claim.status==='in_review'?'selected':''}>In Review</option>
            <option value="approved" ${claim.status==='approved'?'selected':''}>Approved</option>
            <option value="denied" ${claim.status==='denied'?'selected':''}>Denied</option>
            <option value="closed" ${claim.status==='closed'?'selected':''}>Closed</option>
          </select>
        </div>
        <div class="form-group"><label>Closed Date</label>
          <input type="date" name="closed_date" value="${claim.closed_date||''}"/>
        </div>
        <div class="form-group full"><label>Resolution Notes</label>
          <textarea name="resolution">${escHtml(claim.resolution||'')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);

  document.getElementById('warranty-update-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      await API.warranty.update(claim.id, data);
      toast('Warranty claim updated');
      closeModal(); onSave();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
