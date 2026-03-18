async function renderWarrantyDetail(container, { id, backTo = 'warranty', backParams = {} } = {}) {
  const editing = !!id;
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let claim = {}, sites = [], units = [];
  try {
    [sites, units] = await Promise.all([API.sites.list(), API.units.list()]);
    if (editing) claim = await API.warranty.get(id);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
    return;
  }

  const back = () => navigate(backTo, backParams);
  const statusColors = {
    submitted: '#3b82f6', in_review: '#f97316',
    approved: '#22c55e', denied: '#ef4444', closed: '#64748b',
  };

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Warranty</button>
        <div>
          <h1 style="margin:0">${editing ? (escHtml(claim.astea_request_id||'Warranty Claim')) : 'New Warranty Claim'}</h1>
          ${editing ? (() => {
            const c = statusColors[claim.status] || '#64748b';
            return `<div class="page-subtitle"><span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:99px;padding:1px 10px;font-size:12px;font-weight:600">${escHtml(claim.status||'submitted')}</span></div>`;
          })() : ''}
        </div>
      </div>
      ${editing ? `<button class="btn btn-sm" id="delete-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete Claim</button>` : ''}
    </div>

    <form id="warranty-form" style="max-width:900px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Claim Details</div>
        <div class="form-grid">
          <div class="form-group"><label>Site *</label>
            <select name="site_id" required>
              <option value="">— Select Site —</option>
              ${sites.map(s => `<option value="${s.id}" ${s.id===claim.site_id?'selected':''}>${escHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Unit</label>
            <select name="unit_id">
              <option value="">— No specific unit —</option>
              ${units.map(u => `<option value="${u.id}" ${u.id===claim.unit_id?'selected':''}>${escHtml(serial(u))} – ${escHtml(u.unit_type||'')}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full"><label>Astea Request ID</label>
            <input name="astea_request_id" placeholder="CS260317XXXX@@1" value="${escHtml(claim.astea_request_id||'')}"/>
          </div>
          <div class="form-group full"><label>Description *</label>
            <textarea name="description" required rows="4" placeholder="Describe the warranty issue…">${escHtml(claim.description||'')}</textarea>
          </div>
        </div>
      </div>

      ${editing ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Status & Resolution</div>
        <div class="form-grid">
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
            <textarea name="resolution" rows="4">${escHtml(claim.resolution||'')}</textarea>
          </div>
        </div>
      </div>` : ''}

      <div class="form-actions" style="padding:0 0 32px">
        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Submit Claim'}</button>
      </div>
    </form>`;

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('cancel-btn').addEventListener('click', back);

  if (editing) {
    document.getElementById('delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this warranty claim? This cannot be undone.')) return;
      try { await API.warranty.delete(id); toast('Claim deleted'); navigate('warranty'); }
      catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  document.getElementById('warranty-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) { await API.warranty.update(id, data); toast('Claim updated'); }
      else { await API.warranty.create(data); toast('Warranty claim submitted'); }
      navigate('warranty');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
