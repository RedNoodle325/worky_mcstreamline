async function renderContractorDetail(container, { id, backTo = 'contractors', backParams = {} } = {}) {
  const editing = !!id;
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let c = {};
  if (editing) {
    try { c = await API.contractors.get(id); }
    catch (e) { container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`; return; }
  }

  const back = () => navigate(backTo, backParams);

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Contractors</button>
        <div>
          <h1 style="margin:0">${editing ? escHtml(c.company_name||'Contractor') : 'New Contractor'}</h1>
          ${editing ? `<div class="page-subtitle">${escHtml(c.region||'')} ${c.is_active ? '<span style="color:var(--green)">● Active</span>' : '<span style="color:var(--text3)">● Inactive</span>'}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px">
        ${editing ? `
          <button class="btn btn-sm btn-secondary" id="toggle-active-btn">${c.is_active ? 'Deactivate' : 'Activate'}</button>
          <button class="btn btn-sm" id="delete-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete</button>
        ` : ''}
      </div>
    </div>

    <form id="contractor-form" style="max-width:900px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Company Info</div>
        <div class="form-grid">
          <div class="form-group full"><label>Company Name *</label>
            <input name="company_name" required value="${escHtml(c.company_name||'')}"/>
          </div>
          <div class="form-group"><label>Contact Name</label>
            <input name="contact_name" value="${escHtml(c.contact_name||'')}"/>
          </div>
          <div class="form-group"><label>Region / Area</label>
            <input name="region" value="${escHtml(c.region||'')}"/>
          </div>
          <div class="form-group"><label>Phone</label>
            <input name="phone" type="tel" value="${escHtml(c.phone||'')}"/>
          </div>
          <div class="form-group"><label>Email</label>
            <input name="email" type="email" value="${escHtml(c.email||'')}"/>
          </div>
          <div class="form-group full"><label>Specialties (comma-separated)</label>
            <input name="specialties_text" placeholder="HVAC, chillers, electrical…"
              value="${escHtml(Array.isArray(c.specialties) ? c.specialties.join(', ') : (c.specialties||''))}"/>
          </div>
          <div class="form-group full"><label>Notes</label>
            <textarea name="notes" rows="4">${escHtml(c.notes||'')}</textarea>
          </div>
        </div>
      </div>

      <div class="form-actions" style="padding:0 0 32px">
        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Add Contractor'}</button>
      </div>
    </form>`;

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('cancel-btn').addEventListener('click', back);

  if (editing) {
    document.getElementById('toggle-active-btn').addEventListener('click', async () => {
      try {
        await API.contractors.update(id, { is_active: !c.is_active });
        toast(`Contractor ${!c.is_active ? 'activated' : 'deactivated'}`);
        navigate('contractors');
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });

    document.getElementById('delete-btn').addEventListener('click', async () => {
      if (!confirm(`Delete "${c.company_name}"? This cannot be undone.`)) return;
      try { await API.contractors.delete(id); toast('Contractor deleted'); navigate('contractors'); }
      catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  document.getElementById('contractor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const specialties = data.specialties_text ? data.specialties_text.split(',').map(s => s.trim()).filter(Boolean) : [];
    delete data.specialties_text;
    data.specialties = specialties;
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) { await API.contractors.update(id, data); toast('Contractor updated'); }
      else { await API.contractors.create(data); toast('Contractor added'); }
      navigate('contractors');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
