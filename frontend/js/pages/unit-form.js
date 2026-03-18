async function renderUnitForm(container, { id, siteId, backTo = 'units', backParams = {} } = {}) {
  const editing = !!id;
  container.innerHTML = '<div style="color:var(--text2);padding:40px;text-align:center">Loading…</div>';

  let unit = {}, sites = [];
  try {
    [sites] = await Promise.all([API.sites.list()]);
    if (editing) unit = await API.units.get(id);
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red);padding:40px">Error: ${escHtml(e.message)}</div>`;
    return;
  }

  // Pre-select siteId if coming from a site page
  const preselectedSite = siteId || unit.site_id || '';
  const back = () => navigate(backTo, backParams);

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
        <div>
          <h1 style="margin:0">${editing ? `Edit Unit ${escHtml(serial(unit))}` : 'New Unit'}</h1>
          ${editing ? `<div class="page-subtitle">${unitTypeBadge(unit.unit_type)} ${escHtml(unit.model||'')}</div>` : ''}
        </div>
      </div>
      ${editing ? `<button class="btn btn-sm" id="delete-unit-btn" style="background:var(--red)22;color:var(--red);border:1px solid var(--red)44">Delete Unit</button>` : ''}
    </div>

    <form id="unit-form" style="max-width:900px">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Unit Identification</div>
        <div class="form-grid">
          <div class="form-group"><label>Job Number *</label><input name="job_number" required value="${escHtml(unit.job_number||'')}" ${editing?'readonly style="opacity:.6"':''}/></div>
          <div class="form-group"><label>Line Number *</label><input name="line_number" type="number" required value="${unit.line_number||''}" ${editing?'readonly style="opacity:.6"':''}/></div>
          <div class="form-group full"><label>Site *</label>
            <select name="site_id" required>
              <option value="">— Select Site —</option>
              ${sites.map(s => `<option value="${s.id}" ${s.id===preselectedSite?'selected':''}>${escHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Unit Type *</label>
            <select name="unit_type" required>
              <option value="">— Select Type —</option>
              <option value="chiller" ${unit.unit_type==='chiller'?'selected':''}>Chiller</option>
              <option value="air_handler" ${unit.unit_type==='air_handler'?'selected':''}>Air Handler</option>
              <option value="indirect_cooling" ${unit.unit_type==='indirect_cooling'?'selected':''}>Indirect Cooling</option>
              <option value="indirect_evaporative" ${unit.unit_type==='indirect_evaporative'?'selected':''}>Indirect Evaporative</option>
              <option value="sycool" ${unit.unit_type==='sycool'?'selected':''}>SyCool</option>
            </select>
          </div>
          <div class="form-group"><label>Commission Level</label>
            <select name="commission_level">
              <option value="none" ${(unit.commission_level||'none')==='none'?'selected':''}>None</option>
              <option value="L1" ${unit.commission_level==='L1'?'selected':''}>L1</option>
              <option value="L2" ${unit.commission_level==='L2'?'selected':''}>L2</option>
              <option value="L3" ${unit.commission_level==='L3'?'selected':''}>L3</option>
              <option value="L4" ${unit.commission_level==='L4'?'selected':''}>L4</option>
              <option value="L5" ${unit.commission_level==='L5'?'selected':''}>L5</option>
              <option value="complete" ${unit.commission_level==='complete'?'selected':''}>Complete</option>
            </select>
          </div>
          <div class="form-group full"><label>Model</label><input name="model" value="${escHtml(unit.model||'')}" placeholder="e.g. AHU-5000"/></div>
          <div class="form-group full"><label>Description</label><input name="description" value="${escHtml(unit.description||'')}"/></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Warranty</div>
        <div class="form-grid">
          <div class="form-group"><label>Warranty Start</label><input type="date" name="warranty_start_date" value="${unit.warranty_start_date||''}"/></div>
          <div class="form-group"><label>Warranty End</label><input type="date" name="warranty_end_date" value="${unit.warranty_end_date||''}"/></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:16px">Notes</div>
        <div class="form-grid">
          <div class="form-group full"><textarea name="notes" rows="4">${escHtml(unit.notes||'')}</textarea></div>
        </div>
      </div>

      <div class="form-actions" style="padding:0 0 32px">
        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Unit'}</button>
      </div>
    </form>`;

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('cancel-btn').addEventListener('click', back);

  if (editing) {
    document.getElementById('delete-unit-btn').addEventListener('click', async () => {
      if (!confirm(`Delete unit ${serial(unit)}? This cannot be undone.`)) return;
      try {
        await API.units.delete(id);
        toast('Unit deleted');
        navigate(backTo, backParams);
      } catch (e) { toast('Error: ' + e.message, 'error'); }
    });
  }

  document.getElementById('unit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (!editing) data.line_number = parseInt(data.line_number);
    Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
    try {
      if (editing) {
        await API.units.update(id, data);
        toast('Unit updated');
        navigate('unit-detail', { id, backTo, backParams });
      } else {
        const created = await API.units.create(data);
        toast('Unit created');
        navigate('unit-detail', { id: created.id, backTo: data.site_id ? 'site-detail' : 'units', backParams: data.site_id ? { id: data.site_id } : {} });
      }
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  });
}
