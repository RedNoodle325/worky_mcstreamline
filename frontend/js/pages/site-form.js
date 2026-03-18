async function renderSiteForm(container, { id, backTo = 'sites', backParams = {} } = {}) {
  const editing = !!id;
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let site = {};
  if (editing) {
    try { site = await API.sites.get(id); }
    catch (e) { container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`; return; }
  }

  const back = () => navigate(backTo, backParams);

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
        <div>
          <h1 style="margin:0">${editing ? 'Edit Site' : 'New Site'}</h1>
          ${editing ? `<div class="page-subtitle">${escHtml(site.name || '')}</div>` : ''}
        </div>
      </div>
      ${editing ? `<button class="btn btn-sm" id="delete-site-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete Site</button>` : ''}
    </div>

    <form id="site-form" style="max-width:900px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Basic Info</div>
        <div class="form-grid">
          <div class="form-group full"><label>Site Name *</label><input name="name" required value="${escHtml(site.name||'')}" placeholder="e.g. Reno Data Center"/></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Site Address</div>
        <div class="form-grid">
          <div class="form-group full"><label>Street</label><input name="address" value="${escHtml(site.address||'')}"/></div>
          <div class="form-group"><label>City</label><input name="city" value="${escHtml(site.city||'')}"/></div>
          <div class="form-group"><label>State</label><input name="state" value="${escHtml(site.state||'')}"/></div>
          <div class="form-group"><label>Zip</label><input name="zip_code" value="${escHtml(site.zip_code||'')}"/></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Shipping Address</div>
        <div class="form-grid">
          <div class="form-group full"><label>Street</label><input name="shipping_address_street" value="${escHtml(site.shipping_address_street||'')}"/></div>
          <div class="form-group"><label>City</label><input name="shipping_address_city" value="${escHtml(site.shipping_address_city||'')}"/></div>
          <div class="form-group"><label>State</label><input name="shipping_address_state" value="${escHtml(site.shipping_address_state||'')}"/></div>
          <div class="form-group"><label>Zip</label><input name="shipping_address_zip" value="${escHtml(site.shipping_address_zip||'')}"/></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Site Requirements</div>
        <div class="form-grid">
          <div class="form-group full"><label>Access Requirements</label><textarea name="access_requirements" rows="3">${escHtml(site.access_requirements||'')}</textarea></div>
          <div class="form-group full"><label>Required Paperwork / Permits</label><textarea name="required_paperwork" rows="3">${escHtml(site.required_paperwork||'')}</textarea></div>
          <div class="form-group full"><label>Orientation / Safety Info</label><textarea name="orientation_info" rows="3">${escHtml(site.orientation_info||'')}</textarea></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Primary Contact</div>
        <div class="form-grid">
          <div class="form-group"><label>Phone</label><input name="customer_contact_phone" value="${escHtml(site.customer_contact_phone||'')}"/></div>
          <div class="form-group"><label>Email</label><input name="customer_contact_email" type="email" value="${escHtml(site.customer_contact_email||'')}"/></div>
          <div class="form-group full"><label>Notes</label><textarea name="notes" rows="3">${escHtml(site.notes||'')}</textarea></div>
        </div>
      </div>

      <div class="form-actions" style="padding:0 0 32px">
        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Site'}</button>
      </div>
    </form>`;

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('cancel-btn').addEventListener('click', back);

  if (editing) {
    document.getElementById('delete-site-btn').addEventListener('click', async () => {
      if (!confirm(`Delete site "${site.name}"? This cannot be undone.`)) return;
      try {
        await API.sites.delete(id);
        toast('Site deleted');
        navigate('sites');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  document.getElementById('site-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) {
        await API.sites.update(id, data);
        toast('Site updated');
        navigate('site-detail', { id });
      } else {
        const created = await API.sites.create(data);
        toast('Site created');
        navigate('site-detail', { id: created.id });
      }
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
