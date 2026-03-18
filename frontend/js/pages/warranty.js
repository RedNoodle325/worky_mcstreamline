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
    submitted: '#3b82f6', in_review: '#f97316',
    approved: '#22c55e', denied: '#ef4444', closed: '#64748b',
  };

  function renderTable(data) {
    const tbody = document.getElementById('warranty-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text3)">No claims</td></tr>'; return; }
    tbody.innerHTML = data.map(c => {
      const col = statusColors[c.status] || '#64748b';
      return `<tr>
        <td style="font-size:12px">${fmt(c.claim_date)}</td>
        <td>${escHtml(siteName(c.site_id))}</td>
        <td style="font-family:monospace;font-size:12px">${escHtml(unitSerial(c.unit_id))}</td>
        <td style="font-family:monospace;font-size:12px">${escHtml(c.astea_request_id||'—')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.description)}</td>
        <td><span style="background:${col}22;color:${col};border:1px solid ${col}44;border-radius:99px;padding:1px 10px;font-size:11px;font-weight:600">${escHtml(c.status||'submitted')}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm btn-primary" onclick="navigate('warranty-detail',{id:'${c.id}',backTo:'warranty'})">Open</button>
          <button class="btn btn-sm btn-secondary" onclick="deleteClaim('${c.id}')" style="margin-left:4px;color:var(--red)">Delete</button>
        </td>
      </tr>`;
    }).join('');
  }

  document.getElementById('warranty-status-filter').addEventListener('change', e => {
    const v = e.target.value;
    renderTable(v ? claims.filter(c => c.status === v) : claims);
  });

  document.getElementById('add-warranty-btn').addEventListener('click', () => navigate('warranty-detail', { backTo: 'warranty' }));

  window.deleteClaim = async (id) => {
    if (!confirm('Delete this warranty claim? This cannot be undone.')) return;
    try { await API.warranty.delete(id); toast('Claim deleted'); await load(); }
    catch (e) { toast('Error: ' + e.message, 'error'); }
  };

  await load();
}
